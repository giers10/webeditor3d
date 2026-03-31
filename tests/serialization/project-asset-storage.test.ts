import { describe, expect, it } from "vitest";

import { createProjectAssetStorageKey } from "../../src/assets/project-assets";
import { createInMemoryProjectAssetStorage } from "../../src/assets/project-asset-storage";

describe("project asset storage", () => {
  it("stores, clones, and deletes binary asset file packages", async () => {
    const storage = createInMemoryProjectAssetStorage();
    const storageKey = createProjectAssetStorageKey("asset-model-triangle");
    const bytes = new Uint8Array([0, 1, 2, 3, 4]).buffer;
    const sidecarBytes = new Uint8Array([9, 8, 7]).buffer;

    await storage.putAsset(storageKey, {
      files: {
        "tiny-triangle.gltf": {
          bytes,
          mimeType: "model/gltf+json"
        },
        "triangle.bin": {
          bytes: sidecarBytes,
          mimeType: "application/octet-stream"
        }
      }
    });

    const loadedAsset = await storage.getAsset(storageKey);

    expect(loadedAsset).not.toBeNull();
    expect(Object.keys(loadedAsset?.files ?? {})).toEqual(["tiny-triangle.gltf", "triangle.bin"]);
    expect(Array.from(new Uint8Array(loadedAsset?.files["tiny-triangle.gltf"]?.bytes ?? new ArrayBuffer(0)))).toEqual([0, 1, 2, 3, 4]);
    expect(Array.from(new Uint8Array(loadedAsset?.files["triangle.bin"]?.bytes ?? new ArrayBuffer(0)))).toEqual([9, 8, 7]);

    await storage.deleteAsset(storageKey);

    await expect(storage.getAsset(storageKey)).resolves.toBeNull();
  });
});
