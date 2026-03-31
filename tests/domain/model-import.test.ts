import path from "node:path";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { importModelAssetFromFile, importModelAssetFromFiles, loadModelAssetFromStorage } from "../../src/assets/gltf-model-import";
import { createInMemoryProjectAssetStorage } from "../../src/assets/project-asset-storage";

const tinyGlbFixturePath = path.resolve(process.cwd(), "fixtures/assets/tiny-triangle.glb");
const externalTriangleGltfPath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/scene.gltf");
const externalTriangleBinPath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/triangle.bin");

function createTestFile(bytes: Uint8Array | Buffer, name: string, type: string): File {
  return Object.assign(new Blob([bytes], { type }), {
    name,
    lastModified: Date.now(),
    webkitRelativePath: ""
  }) as File;
}

describe("model import", () => {
  it("imports and reloads a tiny GLB fixture", async () => {
    const storage = createInMemoryProjectAssetStorage();
    const fileBytes = await readFile(tinyGlbFixturePath);
    const file = createTestFile(fileBytes, "tiny-triangle.glb", "model/gltf-binary");

    const importedModel = await importModelAssetFromFile(file, storage);

    expect(importedModel.asset.mimeType).toBe("model/gltf-binary");
    expect(importedModel.asset.metadata.format).toBe("glb");
    expect(importedModel.asset.byteLength).toBe(fileBytes.byteLength);
    expect(importedModel.modelInstance.assetId).toBe(importedModel.asset.id);

    const storedAsset = await storage.getAsset(importedModel.asset.storageKey);

    expect(Object.keys(storedAsset?.files ?? {})).toEqual(["tiny-triangle.glb"]);

    const reloadedAsset = await loadModelAssetFromStorage(storage, importedModel.asset);

    expect(reloadedAsset.metadata.format).toBe("glb");
    expect(reloadedAsset.template.children.length).toBeGreaterThan(0);
  });

  it("imports and reloads a gltf fixture with external resources", async () => {
    const storage = createInMemoryProjectAssetStorage();
    const gltfBytes = await readFile(externalTriangleGltfPath);
    const binBytes = await readFile(externalTriangleBinPath);

    const importedModel = await importModelAssetFromFiles(
      [
        createTestFile(binBytes, "triangle.bin", "application/octet-stream"),
        createTestFile(gltfBytes, "scene.gltf", "model/gltf+json")
      ],
      storage
    );

    expect(importedModel.asset.mimeType).toBe("model/gltf+json");
    expect(importedModel.asset.metadata.format).toBe("gltf");
    expect(importedModel.asset.byteLength).toBe(gltfBytes.byteLength + binBytes.byteLength);

    const storedAsset = await storage.getAsset(importedModel.asset.storageKey);

    expect(Object.keys(storedAsset?.files ?? {}).sort()).toEqual(["scene.gltf", "triangle.bin"]);

    const reloadedAsset = await loadModelAssetFromStorage(storage, importedModel.asset);

    expect(reloadedAsset.metadata.meshCount).toBe(1);
    expect(reloadedAsset.template.children.length).toBeGreaterThan(0);
  });
});
