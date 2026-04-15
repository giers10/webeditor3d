import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import { createDeleteSelectionCommand } from "../../src/commands/delete-selection-command";
import { createEmptySceneDocument } from "../../src/document/scene-document";

const modelAsset = {
  id: "asset-model-delete",
  kind: "model",
  sourceName: "delete-fixture.glb",
  mimeType: "model/gltf-binary",
  storageKey: createProjectAssetStorageKey("asset-model-delete"),
  byteLength: 64,
  metadata: {
    kind: "model",
    format: "glb",
    sceneName: "Delete Fixture",
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: null,
    warnings: []
  }
} satisfies ModelAssetRecord;

describe("delete selection command", () => {
  it("deletes same-kind selections in one undoable batch action", () => {
    const modelInstanceA = createModelInstance({
      id: "model-instance-delete-a",
      assetId: modelAsset.id,
      position: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    const modelInstanceB = createModelInstance({
      id: "model-instance-delete-b",
      assetId: modelAsset.id,
      position: {
        x: 4,
        y: 1,
        z: -2
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Delete Multi Fixture" }),
        assets: {
          [modelAsset.id]: modelAsset
        },
        modelInstances: {
          [modelInstanceA.id]: modelInstanceA,
          [modelInstanceB.id]: modelInstanceB
        }
      }
    });
    const selection = {
      kind: "modelInstances" as const,
      ids: [modelInstanceA.id, modelInstanceB.id]
    };

    store.setSelection(selection);
    store.executeCommand(createDeleteSelectionCommand(selection));

    expect(store.getState().document.modelInstances[modelInstanceA.id]).toBeUndefined();
    expect(store.getState().document.modelInstances[modelInstanceB.id]).toBeUndefined();
    expect(store.getState().selection).toEqual({
      kind: "none"
    });
    expect(store.getState().activeSelectionId).toBeNull();

    expect(store.undo()).toBe(true);
    expect(store.getState().document.modelInstances[modelInstanceA.id]).toEqual(
      modelInstanceA
    );
    expect(store.getState().document.modelInstances[modelInstanceB.id]).toEqual(
      modelInstanceB
    );
    expect(store.getState().selection).toEqual(selection);
    expect(store.getState().activeSelectionId).toBe(modelInstanceB.id);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.modelInstances[modelInstanceA.id]).toBeUndefined();
    expect(store.getState().document.modelInstances[modelInstanceB.id]).toBeUndefined();
  });
});
