import path from "node:path";
import { readFile } from "node:fs/promises";

import { strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAudioAssetFromStorage } from "../../src/assets/audio-assets";
import { loadModelAssetFromStorage, importModelAssetFromFiles } from "../../src/assets/gltf-model-import";
import { loadImageAssetFromStorage } from "../../src/assets/image-assets";
import { createModelInstance } from "../../src/assets/model-instances";
import { createInMemoryProjectAssetStorage, type ProjectAssetStorage } from "../../src/assets/project-asset-storage";
import { createProjectAssetStorageKey, type AudioAssetRecord, type ImageAssetRecord } from "../../src/assets/project-assets";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  loadProjectPackage,
  PROJECT_PACKAGE_SCENE_PATH,
  saveProjectPackage
} from "../../src/serialization/project-package";
import { serializeSceneDocument } from "../../src/serialization/scene-document-json";

const tinyGlbFixturePath = path.resolve(process.cwd(), "fixtures/assets/tiny-triangle.glb");
const externalTriangleGltfPath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/scene.gltf");
const externalTriangleBinPath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/triangle.bin");

function createTestFile(bytes: Uint8Array | Buffer, name: string, type: string): File {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  return {
    name,
    type,
    lastModified: Date.now(),
    size: arrayBuffer.byteLength,
    webkitRelativePath: "",
    arrayBuffer: async () => arrayBuffer.slice(0)
  } as File;
}

describe("project package serialization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("round-trips an asset-free scene through a .we3d package", async () => {
    const document = createEmptySceneDocument({ name: "Portable Empty Scene" });

    const packageBytes = await saveProjectPackage(document, null);
    const restoredDocument = await loadProjectPackage(packageBytes, null);

    expect(restoredDocument).toEqual(document);
  });

  it("round-trips bundled model, image, and audio assets through project storage", async () => {
    const glbBytes = await readFile(tinyGlbFixturePath);
    const storage = createInMemoryProjectAssetStorage();
    const importedModel = await importModelAssetFromFiles(
      [createTestFile(glbBytes, "tiny-triangle.glb", "model/gltf-binary")],
      storage
    );

    const imageAsset = {
      id: "asset-image-panorama",
      kind: "image",
      sourceName: "panorama.svg",
      mimeType: "image/svg+xml",
      storageKey: createProjectAssetStorageKey("asset-image-panorama"),
      byteLength: 118,
      metadata: {
        kind: "image",
        width: 1024,
        height: 512,
        hasAlpha: false,
        warnings: []
      }
    } satisfies ImageAssetRecord;
    const audioAsset = {
      id: "asset-audio-loop",
      kind: "audio",
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-loop"),
      byteLength: 4,
      metadata: {
        kind: "audio",
        durationSeconds: 2.5,
        channelCount: 2,
        sampleRateHz: 44100,
        warnings: []
      }
    } satisfies AudioAssetRecord;

    await storage.putAsset(imageAsset.storageKey, {
      files: {
        [imageAsset.sourceName]: {
          bytes: strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"512\"></svg>").buffer,
          mimeType: imageAsset.mimeType
        }
      }
    });
    await storage.putAsset(audioAsset.storageKey, {
      files: {
        [audioAsset.sourceName]: {
          bytes: new Uint8Array([1, 2, 3, 4]).buffer,
          mimeType: audioAsset.mimeType
        }
      }
    });

    const imageLoadListeners = new WeakMap<object, { load?: () => void; error?: () => void }>();
    const mockImageWidth = 1024;
    const mockImageHeight = 512;

    class MockImage {
      decoding = "async";
      naturalWidth = mockImageWidth;
      naturalHeight = mockImageHeight;
      width = mockImageWidth;
      height = mockImageHeight;

      addEventListener(type: "load" | "error", listener: () => void) {
        const listeners = imageLoadListeners.get(this) ?? {};
        listeners[type] = listener;
        imageLoadListeners.set(this, listeners);
      }

      set src(_value: string) {
        imageLoadListeners.get(this)?.load?.();
      }
    }

    class MockAudioContext {
      async decodeAudioData(_bytes: ArrayBuffer): Promise<AudioBuffer> {
        return {
          duration: 2.5,
          numberOfChannels: 2,
          sampleRate: 44100
        } as AudioBuffer;
      }

      async close(): Promise<void> {}
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("webkitAudioContext", MockAudioContext);

    const document = {
      ...createEmptySceneDocument({ name: "Portable Asset Scene" }),
      assets: {
        [importedModel.asset.id]: importedModel.asset,
        [imageAsset.id]: imageAsset,
        [audioAsset.id]: audioAsset
      },
      modelInstances: {
        [importedModel.modelInstance.id]: createModelInstance({
          ...importedModel.modelInstance,
          id: "model-instance-portable"
        })
      }
    };

    const packageBytes = await saveProjectPackage(document, storage);
    const restoredStorage = createInMemoryProjectAssetStorage();
    const restoredDocument = await loadProjectPackage(packageBytes, restoredStorage);

    expect(restoredDocument).toEqual(document);

    const restoredModel = await loadModelAssetFromStorage(restoredStorage, importedModel.asset);
    const restoredImage = await loadImageAssetFromStorage(restoredStorage, imageAsset);
    const restoredAudio = await loadAudioAssetFromStorage(restoredStorage, audioAsset);

    expect(restoredModel.metadata.format).toBe("glb");
    expect(restoredModel.template.children.length).toBeGreaterThan(0);
    expect(restoredImage.metadata.width).toBe(imageAsset.metadata.width);
    expect(restoredAudio.metadata.durationSeconds).toBe(audioAsset.metadata.durationSeconds);
  });

  it("preserves multi-file gltf asset bundles inside the packaged assets directory", async () => {
    const gltfBytes = await readFile(externalTriangleGltfPath);
    const binBytes = await readFile(externalTriangleBinPath);
    const storage = createInMemoryProjectAssetStorage();
    const importedModel = await importModelAssetFromFiles(
      [
        createTestFile(binBytes, "triangle.bin", "application/octet-stream"),
        createTestFile(gltfBytes, "scene.gltf", "model/gltf+json")
      ],
      storage
    );
    const document = {
      ...createEmptySceneDocument({ name: "Portable Multi-file Scene" }),
      assets: {
        [importedModel.asset.id]: importedModel.asset
      }
    };

    const packageBytes = await saveProjectPackage(document, storage);
    const packageEntries = unzipSync(packageBytes);

    expect(Object.keys(packageEntries).sort()).toEqual([
      PROJECT_PACKAGE_SCENE_PATH,
      `assets/${importedModel.asset.id}/scene.gltf`,
      `assets/${importedModel.asset.id}/triangle.bin`
    ]);

    const restoredStorage = createInMemoryProjectAssetStorage();

    await loadProjectPackage(packageBytes, restoredStorage);

    const restoredModel = await loadModelAssetFromStorage(restoredStorage, importedModel.asset);

    expect(restoredModel.metadata.format).toBe("gltf");
    expect(restoredModel.template.children.length).toBeGreaterThan(0);
  });

  it("fails project save when the document references an asset missing from storage", async () => {
    const storage = createInMemoryProjectAssetStorage();
    const imageAsset = {
      id: "asset-image-missing",
      kind: "image",
      sourceName: "missing.png",
      mimeType: "image/png",
      storageKey: createProjectAssetStorageKey("asset-image-missing"),
      byteLength: 16,
      metadata: {
        kind: "image",
        width: 8,
        height: 8,
        hasAlpha: true,
        warnings: []
      }
    } satisfies ImageAssetRecord;
    const document = {
      ...createEmptySceneDocument({ name: "Broken Portable Scene" }),
      assets: {
        [imageAsset.id]: imageAsset
      }
    };

    await expect(saveProjectPackage(document, storage)).rejects.toThrow("Missing stored binary data for image asset missing.png.");
  });

  it("fails project load when scene.json is missing", async () => {
    const packageBytes = zipSync({
      "assets/readme.txt": strToU8("not a project")
    });

    await expect(loadProjectPackage(packageBytes, null)).rejects.toThrow("project package is missing scene.json");
  });

  it("fails project load when a declared asset has no packaged files", async () => {
    const imageAsset = {
      id: "asset-image-missing-package",
      kind: "image",
      sourceName: "missing.svg",
      mimeType: "image/svg+xml",
      storageKey: createProjectAssetStorageKey("asset-image-missing-package"),
      byteLength: 64,
      metadata: {
        kind: "image",
        width: 64,
        height: 64,
        hasAlpha: false,
        warnings: []
      }
    } satisfies ImageAssetRecord;
    const document = {
      ...createEmptySceneDocument({ name: "Incomplete Portable Scene" }),
      assets: {
        [imageAsset.id]: imageAsset
      }
    };
    const packageBytes = zipSync({
      [PROJECT_PACKAGE_SCENE_PATH]: strToU8(serializeSceneDocument(document))
    });

    await expect(loadProjectPackage(packageBytes, createInMemoryProjectAssetStorage())).rejects.toThrow(
      "project package is missing bundled files for image asset missing.svg"
    );
  });

  it("allows loading an asset-free package without project asset storage", async () => {
    const document = createEmptySceneDocument({ name: "Portable Scene Without Storage" });
    const packageBytes = await saveProjectPackage(document, createInMemoryProjectAssetStorage());

    await expect(loadProjectPackage(packageBytes, null as ProjectAssetStorage | null)).resolves.toEqual(document);
  });
});
