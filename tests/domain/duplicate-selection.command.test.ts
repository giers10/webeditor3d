import { describe, expect, it } from "vitest";

import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";
import { createEditorStore } from "../../src/app/editor-store";
import { createDuplicateSelectionCommand } from "../../src/commands/duplicate-selection-command";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createTriggerVolumeEntity } from "../../src/entities/entity-instances";

const modelAsset = {
  id: "asset-model-duplicate",
  kind: "model",
  sourceName: "duplicate-fixture.gltf",
  mimeType: "model/gltf+json",
  storageKey: createProjectAssetStorageKey("asset-model-duplicate"),
  byteLength: 64,
  metadata: {
    kind: "model",
    format: "gltf",
    sceneName: "Duplicate Fixture",
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: {
      min: {
        x: 0,
        y: 0,
        z: 0
      },
      max: {
        x: 1,
        y: 1,
        z: 1
      },
      size: {
        x: 1,
        y: 1,
        z: 1
      }
    },
    warnings: []
  }
} satisfies ModelAssetRecord;

describe("duplicate selection command", () => {
  it("duplicates one selected whitebox solid with a fresh id and supports undo/redo", () => {
    const sourceBrush = createBoxBrush({
      id: "brush-source",
      center: {
        x: 2,
        y: 1,
        z: -3
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Duplicate Brush" }),
        brushes: {
          [sourceBrush.id]: sourceBrush
        }
      }
    });

    store.setSelection({
      kind: "brushes",
      ids: [sourceBrush.id]
    });
    store.executeCommand(createDuplicateSelectionCommand());

    const selection = store.getState().selection;

    expect(selection.kind).toBe("brushes");
    if (selection.kind !== "brushes") {
      throw new Error("Expected duplicated brush selection.");
    }

    expect(selection.ids).toHaveLength(1);
    expect(selection.ids[0]).not.toBe(sourceBrush.id);

    const duplicatedBrush = store.getState().document.brushes[selection.ids[0]];
    expect(duplicatedBrush).toBeDefined();
    expect(duplicatedBrush.center).toEqual({
      x: sourceBrush.center.x + 1,
      y: sourceBrush.center.y,
      z: sourceBrush.center.z + 1
    });
    expect(duplicatedBrush.faces).toEqual(sourceBrush.faces);

    expect(store.undo()).toBe(true);
    expect(Object.keys(store.getState().document.brushes)).toEqual([sourceBrush.id]);

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [duplicatedBrush.id]
    });
    expect(store.getState().document.brushes[duplicatedBrush.id]).toEqual(duplicatedBrush);
  });

  it("duplicates one selected model instance without duplicating its asset", () => {
    const sourceModelInstance = createModelInstance({
      id: "model-instance-source",
      assetId: modelAsset.id,
      position: {
        x: -4,
        y: 2,
        z: 5
      },
      rotationDegrees: {
        x: 0,
        y: 25,
        z: 0
      },
      scale: {
        x: 1.5,
        y: 1.5,
        z: 1.5
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Duplicate Model Instance" }),
        assets: {
          [modelAsset.id]: modelAsset
        },
        modelInstances: {
          [sourceModelInstance.id]: sourceModelInstance
        }
      }
    });

    store.setSelection({
      kind: "modelInstances",
      ids: [sourceModelInstance.id]
    });
    store.executeCommand(createDuplicateSelectionCommand());

    const selection = store.getState().selection;

    expect(selection.kind).toBe("modelInstances");
    if (selection.kind !== "modelInstances") {
      throw new Error("Expected duplicated model instance selection.");
    }

    const duplicatedModelInstanceId = selection.ids[0];
    expect(duplicatedModelInstanceId).not.toBe(sourceModelInstance.id);

    const duplicatedModelInstance = store.getState().document.modelInstances[duplicatedModelInstanceId];
    expect(duplicatedModelInstance.assetId).toBe(sourceModelInstance.assetId);
    expect(duplicatedModelInstance.position).toEqual({
      x: sourceModelInstance.position.x + 1,
      y: sourceModelInstance.position.y,
      z: sourceModelInstance.position.z + 1
    });
    expect(store.getState().document.assets[modelAsset.id]).toEqual(modelAsset);
    expect(Object.keys(store.getState().document.assets)).toHaveLength(1);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.modelInstances[sourceModelInstance.id]).toEqual(sourceModelInstance);
    expect(store.getState().document.modelInstances[duplicatedModelInstanceId]).toBeUndefined();

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "modelInstances",
      ids: [duplicatedModelInstanceId]
    });
  });

  it("duplicates one selected entity with a fresh id and selects the duplicate", () => {
    const sourceEntity = createTriggerVolumeEntity({
      id: "entity-source-trigger",
      position: {
        x: 8,
        y: 1,
        z: -2
      },
      size: {
        x: 4,
        y: 3,
        z: 2
      },
      triggerOnEnter: false,
      triggerOnExit: true
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Duplicate Entity" }),
        entities: {
          [sourceEntity.id]: sourceEntity
        }
      }
    });

    store.setSelection({
      kind: "entities",
      ids: [sourceEntity.id]
    });
    store.executeCommand(createDuplicateSelectionCommand());

    const selection = store.getState().selection;

    expect(selection.kind).toBe("entities");
    if (selection.kind !== "entities") {
      throw new Error("Expected duplicated entity selection.");
    }

    expect(selection.ids).toHaveLength(1);
    expect(selection.ids[0]).not.toBe(sourceEntity.id);

    const duplicatedEntity = store.getState().document.entities[selection.ids[0]];
    expect(duplicatedEntity).toBeDefined();
    expect(duplicatedEntity.kind).toBe(sourceEntity.kind);
    expect(duplicatedEntity.position).toEqual({
      x: sourceEntity.position.x + 1,
      y: sourceEntity.position.y,
      z: sourceEntity.position.z + 1
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.entities[sourceEntity.id]).toEqual(sourceEntity);

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "entities",
      ids: [duplicatedEntity.id]
    });
  });

  it("duplicates multiple selected whitebox solids in one operation", () => {
    const sourceBrushA = createBoxBrush({
      id: "brush-source-a",
      center: {
        x: 0,
        y: 1,
        z: 0
      }
    });
    const sourceBrushB = createBoxBrush({
      id: "brush-source-b",
      center: {
        x: 6,
        y: 2,
        z: -4
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Duplicate Multi" }),
        brushes: {
          [sourceBrushA.id]: sourceBrushA,
          [sourceBrushB.id]: sourceBrushB
        }
      }
    });

    store.setSelection({
      kind: "brushes",
      ids: [sourceBrushA.id, sourceBrushB.id]
    });
    store.executeCommand(createDuplicateSelectionCommand());

    const selection = store.getState().selection;

    expect(selection.kind).toBe("brushes");
    if (selection.kind !== "brushes") {
      throw new Error("Expected duplicated multi-brush selection.");
    }

    expect(selection.ids).toHaveLength(2);
    expect(new Set(selection.ids).size).toBe(2);
    expect(selection.ids).not.toEqual([sourceBrushA.id, sourceBrushB.id]);

    const duplicatedBrushA = store.getState().document.brushes[selection.ids[0]];
    const duplicatedBrushB = store.getState().document.brushes[selection.ids[1]];

    expect(duplicatedBrushA.center).toEqual({
      x: sourceBrushA.center.x + 1,
      y: sourceBrushA.center.y,
      z: sourceBrushA.center.z + 1
    });
    expect(duplicatedBrushB.center).toEqual({
      x: sourceBrushB.center.x + 1,
      y: sourceBrushB.center.y,
      z: sourceBrushB.center.z + 1
    });

    expect(store.undo()).toBe(true);
    expect(Object.keys(store.getState().document.brushes).sort()).toEqual([sourceBrushA.id, sourceBrushB.id]);

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [duplicatedBrushA.id, duplicatedBrushB.id]
    });
  });
});
