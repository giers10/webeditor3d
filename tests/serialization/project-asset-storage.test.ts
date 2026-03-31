import { describe, expect, it } from "vitest";

import { createProjectAssetStorageKey } from "../../src/assets/project-assets";
import { createInMemoryProjectAssetStorage } from "../../src/assets/project-asset-storage";

describe("project asset storage", () => {
  it("stores, clones, and deletes binary asset payloads", async () => {
    const storage = createInMemoryProjectAssetStorage();
    const storageKey = createProjectAssetStorageKey("asset-model-triangle");
    const bytes = new Uint8Array([0, 1, 2, 3, 4]).buffer;

    await storage.putAsset(storageKey, {
      bytes,
      mimeType: "model/gltf+json"
    });

    const loadedAsset = await storage.getAsset(storageKey);

    expect(loadedAsset).not.toBeNull();
    expect(loadedAsset?.mimeType).toBe("model/gltf+json");
    expect(Array.from(new Uint8Array(loadedAsset?.bytes ?? new ArrayBuffer(0)))).toEqual([0, 1, 2, 3, 4]);

    await storage.deleteAsset(storageKey);

    await expect(storage.getAsset(storageKey)).resolves.toBeNull();
  });
});
