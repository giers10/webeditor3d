import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";
import { createCommitTransformSessionCommand } from "../../src/commands/commit-transform-session-command";
import {
  createTransformSession,
  resolveTransformTarget,
  supportsTransformOperation
} from "../../src/core/transform-session";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";

const modelAsset = {
  id: "asset-model-transform-fixture",
  kind: "model",
  sourceName: "transform-fixture.glb",
  mimeType: "model/gltf-binary",
  storageKey: createProjectAssetStorageKey("asset-model-transform-fixture"),
  byteLength: 64,
  metadata: {
    kind: "model",
    format: "glb",
    sceneName: "Transform Fixture",
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: {
      min: {
        x: -0.5,
        y: 0,
        z: -0.5
      },
      max: {
        x: 0.5,
        y: 1,
        z: 0.5
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

describe("transform session commit commands", () => {
  it("resolves a selected brush face to the whole brush transform target", () => {
    const brush = createBoxBrush({
      id: "brush-main"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    const resolved = resolveTransformTarget(document, {
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });

    expect(resolved.target).toMatchObject({
      kind: "brush",
      brushId: brush.id,
      initialCenter: brush.center
    });
    expect(resolved.target).not.toBeNull();
    expect(supportsTransformOperation(resolved.target as NonNullable<typeof resolved.target>, "translate")).toBe(true);
    expect(supportsTransformOperation(resolved.target as NonNullable<typeof resolved.target>, "rotate")).toBe(false);
    expect(supportsTransformOperation(resolved.target as NonNullable<typeof resolved.target>, "scale")).toBe(false);
  });

  it("commits a model instance translate/rotate/scale transform with undo and redo", () => {
    const modelInstance = createModelInstance({
      id: "model-instance-main",
      assetId: modelAsset.id,
      position: {
        x: 0,
        y: 1,
        z: 0
      },
      rotationDegrees: {
        x: 0,
        y: 0,
        z: 0
      },
      scale: {
        x: 1,
        y: 1,
        z: 1
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Transform Fixture" }),
        assets: {
          [modelAsset.id]: modelAsset
        },
        modelInstances: {
          [modelInstance.id]: modelInstance
        }
      }
    });
    const target = resolveTransformTarget(store.getState().document, {
      kind: "modelInstances",
      ids: [modelInstance.id]
    }).target;

    if (target === null || target.kind !== "modelInstance") {
      throw new Error("Expected a model instance transform target.");
    }

    const session = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "scale",
      target
    });

    session.preview = {
      kind: "modelInstance",
      position: {
        x: 4,
        y: 1,
        z: -2
      },
      rotationDegrees: {
        x: 0,
        y: 90,
        z: 0
      },
      scale: {
        x: 1.5,
        y: 2,
        z: 1.5
      }
    };

    store.executeCommand(createCommitTransformSessionCommand(store.getState().document, session));

    expect(store.getState().document.modelInstances[modelInstance.id]).toMatchObject({
      position: {
        x: 4,
        y: 1,
        z: -2
      },
      rotationDegrees: {
        x: 0,
        y: 90,
        z: 0
      },
      scale: {
        x: 1.5,
        y: 2,
        z: 1.5
      }
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.modelInstances[modelInstance.id]).toEqual(modelInstance);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.modelInstances[modelInstance.id]).toMatchObject({
      position: {
        x: 4,
        y: 1,
        z: -2
      },
      rotationDegrees: {
        x: 0,
        y: 90,
        z: 0
      },
      scale: {
        x: 1.5,
        y: 2,
        z: 1.5
      }
    });
  });

  it("commits a rotatable entity transform with undo and redo", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      yawDegrees: 0
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Entity Transform Fixture" }),
        entities: {
          [playerStart.id]: playerStart
        }
      }
    });
    const target = resolveTransformTarget(store.getState().document, {
      kind: "entities",
      ids: [playerStart.id]
    }).target;

    if (target === null || target.kind !== "entity") {
      throw new Error("Expected an entity transform target.");
    }

    const session = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "rotate",
      target
    });

    session.preview = {
      kind: "entity",
      position: {
        x: 6,
        y: 0,
        z: -4
      },
      rotation: {
        kind: "yaw",
        yawDegrees: 90
      }
    };

    store.executeCommand(createCommitTransformSessionCommand(store.getState().document, session));

    expect(store.getState().document.entities[playerStart.id]).toMatchObject({
      position: {
        x: 6,
        y: 0,
        z: -4
      },
      yawDegrees: 90
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.entities[playerStart.id]).toEqual(playerStart);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.entities[playerStart.id]).toMatchObject({
      position: {
        x: 6,
        y: 0,
        z: -4
      },
      yawDegrees: 90
    });
  });
});
