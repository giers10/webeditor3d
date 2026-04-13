import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import { createCommitTransformSessionCommand } from "../../src/commands/commit-transform-session-command";
import {
  createTransformSession,
  resolveTransformTarget,
  supportsLocalTransformAxisConstraint,
  supportsTransformAxisConstraint,
  supportsTransformOperation
} from "../../src/core/transform-session";
import {
  cloneBoxBrushGeometry,
  createBoxBrush
} from "../../src/document/brushes";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { getBoxBrushLocalVertexPosition } from "../../src/geometry/box-brush-mesh";

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
  it("resolves component transform targets in matching mode and enforces operation support", () => {
    const brush = createBoxBrush({
      id: "brush-main"
    });
    const path = createScenePath({
      id: "path-main",
      points: [
        {
          id: "path-point-a",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 2,
            y: 1,
            z: 0
          }
        }
      ]
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      paths: {
        [path.id]: path
      }
    };

    const faceWrongModeResolved = resolveTransformTarget(document, {
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });
    const faceResolved = resolveTransformTarget(
      document,
      {
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posZ"
      },
      "face"
    );
    const edgeResolved = resolveTransformTarget(
      document,
      {
        kind: "brushEdge",
        brushId: brush.id,
        edgeId: "edgeX_posY_negZ"
      },
      "edge"
    );
    const vertexResolved = resolveTransformTarget(
      document,
      {
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_negZ"
      },
      "vertex"
    );
    const faceModeBrushResolved = resolveTransformTarget(
      document,
      {
        kind: "brushes",
        ids: [brush.id]
      },
      "face"
    );
    const objectResolved = resolveTransformTarget(document, {
      kind: "brushes",
      ids: [brush.id]
    });
    const pathObjectResolved = resolveTransformTarget(document, {
      kind: "paths",
      ids: [path.id]
    });
    const pathPointResolved = resolveTransformTarget(document, {
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(faceWrongModeResolved.target).toBeNull();
    expect(faceWrongModeResolved.message).toContain("Face mode");
    expect(faceResolved.target).toMatchObject({
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });
    expect(edgeResolved.target).toMatchObject({
      kind: "brushEdge",
      brushId: brush.id,
      edgeId: "edgeX_posY_negZ"
    });
    expect(vertexResolved.target).toMatchObject({
      kind: "brushVertex",
      brushId: brush.id,
      vertexId: "posX_posY_negZ"
    });
    expect(faceModeBrushResolved.target).toBeNull();
    expect(faceModeBrushResolved.message).toContain("Object mode");
    expect(objectResolved.target).toMatchObject({
      kind: "brush",
      brushId: brush.id,
      initialCenter: brush.center,
      initialRotationDegrees: brush.rotationDegrees,
      initialSize: brush.size
    });
    expect(pathObjectResolved.target).toBeNull();
    expect(pathObjectResolved.message).toContain("path point");
    expect(pathPointResolved.target).toMatchObject({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id,
      initialPosition: path.points[1].position
    });
    expect(objectResolved.target).not.toBeNull();
    expect(
      supportsTransformOperation(
        objectResolved.target as NonNullable<typeof objectResolved.target>,
        "translate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        objectResolved.target as NonNullable<typeof objectResolved.target>,
        "rotate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        objectResolved.target as NonNullable<typeof objectResolved.target>,
        "scale"
      )
    ).toBe(true);

    expect(
      supportsTransformOperation(
        faceResolved.target as NonNullable<typeof faceResolved.target>,
        "translate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        faceResolved.target as NonNullable<typeof faceResolved.target>,
        "rotate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        faceResolved.target as NonNullable<typeof faceResolved.target>,
        "scale"
      )
    ).toBe(true);

    expect(
      supportsTransformOperation(
        vertexResolved.target as NonNullable<typeof vertexResolved.target>,
        "translate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        vertexResolved.target as NonNullable<typeof vertexResolved.target>,
        "rotate"
      )
    ).toBe(false);
    expect(
      supportsTransformOperation(
        vertexResolved.target as NonNullable<typeof vertexResolved.target>,
        "scale"
      )
    ).toBe(false);

    expect(
      supportsTransformOperation(
        pathPointResolved.target as NonNullable<typeof pathPointResolved.target>,
        "translate"
      )
    ).toBe(true);
    expect(
      supportsTransformOperation(
        pathPointResolved.target as NonNullable<typeof pathPointResolved.target>,
        "rotate"
      )
    ).toBe(false);
    expect(
      supportsTransformOperation(
        pathPointResolved.target as NonNullable<typeof pathPointResolved.target>,
        "scale"
      )
    ).toBe(false);
  });

  it("applies axis-constraint rules across object and component transform sessions", () => {
    const brush = createBoxBrush({
      id: "brush-axis-rules"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    const faceTarget = resolveTransformTarget(
      document,
      {
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posX"
      },
      "face"
    ).target;
    const edgeTarget = resolveTransformTarget(
      document,
      {
        kind: "brushEdge",
        brushId: brush.id,
        edgeId: "edgeY_posX_posZ"
      },
      "edge"
    ).target;
    const vertexTarget = resolveTransformTarget(
      document,
      {
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      },
      "vertex"
    ).target;

    if (faceTarget === null || faceTarget.kind !== "brushFace") {
      throw new Error("Expected a face transform target.");
    }

    if (edgeTarget === null || edgeTarget.kind !== "brushEdge") {
      throw new Error("Expected an edge transform target.");
    }

    if (vertexTarget === null || vertexTarget.kind !== "brushVertex") {
      throw new Error("Expected a vertex transform target.");
    }

    const faceRotateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "rotate",
      target: faceTarget
    });
    const edgeScaleSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "scale",
      target: edgeTarget
    });
    const vertexTranslateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target: vertexTarget
    });

    expect(supportsTransformAxisConstraint(faceRotateSession, "x")).toBe(true);
    expect(supportsTransformAxisConstraint(faceRotateSession, "y")).toBe(false);
    expect(supportsTransformAxisConstraint(faceRotateSession, "z")).toBe(false);

    expect(supportsTransformAxisConstraint(edgeScaleSession, "x")).toBe(true);
    expect(supportsTransformAxisConstraint(edgeScaleSession, "y")).toBe(false);
    expect(supportsTransformAxisConstraint(edgeScaleSession, "z")).toBe(true);

    expect(supportsTransformAxisConstraint(vertexTranslateSession, "x")).toBe(
      true
    );
    expect(supportsTransformAxisConstraint(vertexTranslateSession, "y")).toBe(
      true
    );
    expect(supportsTransformAxisConstraint(vertexTranslateSession, "z")).toBe(
      true
    );
  });

  it("only enables local axis toggling on supported transform targets", () => {
    const brush = createBoxBrush({
      id: "brush-local-axis"
    });
    const path = createScenePath({
      id: "path-local-axis",
      points: [
        {
          id: "path-local-point-a",
          position: {
            x: -2,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-local-point-b",
          position: {
            x: 1,
            y: 0,
            z: 3
          }
        }
      ]
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-local-axis-player",
      position: {
        x: 1,
        y: 0,
        z: 1
      },
      yawDegrees: 45
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      paths: {
        [path.id]: path
      },
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const brushTarget = resolveTransformTarget(document, {
      kind: "brushes",
      ids: [brush.id]
    }).target;
    const faceTarget = resolveTransformTarget(
      document,
      {
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posX"
      },
      "face"
    ).target;
    const entityTarget = resolveTransformTarget(document, {
      kind: "entities",
      ids: [playerStart.id]
    }).target;
    const pathPointTarget = resolveTransformTarget(document, {
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[0].id
    }).target;

    if (brushTarget === null || brushTarget.kind !== "brush") {
      throw new Error("Expected a brush transform target.");
    }

    if (faceTarget === null || faceTarget.kind !== "brushFace") {
      throw new Error("Expected a face transform target.");
    }

    if (entityTarget === null || entityTarget.kind !== "entity") {
      throw new Error("Expected an entity transform target.");
    }

    if (pathPointTarget === null || pathPointTarget.kind !== "pathPoint") {
      throw new Error("Expected a path point transform target.");
    }

    const brushTranslateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target: brushTarget
    });
    const brushScaleSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "scale",
      target: brushTarget
    });
    const faceRotateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "rotate",
      target: faceTarget
    });
    const entityTranslateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target: entityTarget
    });
    const pathPointTranslateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target: pathPointTarget
    });

    expect(
      supportsLocalTransformAxisConstraint(brushTranslateSession, "z")
    ).toBe(true);
    expect(supportsLocalTransformAxisConstraint(brushScaleSession, "z")).toBe(
      false
    );
    expect(supportsLocalTransformAxisConstraint(faceRotateSession, "x")).toBe(
      false
    );
    expect(
      supportsLocalTransformAxisConstraint(entityTranslateSession, "x")
    ).toBe(true);
    expect(
      supportsTransformAxisConstraint(pathPointTranslateSession, "z")
    ).toBe(true);
    expect(
      supportsLocalTransformAxisConstraint(pathPointTranslateSession, "z")
    ).toBe(false);
  });

  it("commits translated path points through the shared transform command path", () => {
    const path = createScenePath({
      id: "path-transform-main",
      points: [
        {
          id: "path-transform-point-a",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-transform-point-b",
          position: {
            x: 1,
            y: 0,
            z: 1
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Path Transform Fixture" }),
        paths: {
          [path.id]: path
        }
      }
    });
    const target = resolveTransformTarget(store.getState().document, {
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    }).target;

    if (target === null || target.kind !== "pathPoint") {
      throw new Error("Expected a path point transform target.");
    }

    const translateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target
    });

    translateSession.preview = {
      kind: "pathPoint",
      position: {
        x: 4,
        y: 2,
        z: -3
      }
    };

    store.executeCommand(
      createCommitTransformSessionCommand(
        store.getState().document,
        translateSession
      )
    );

    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual({
      x: 4,
      y: 2,
      z: -3
    });
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual(path.points[1].position);

    expect(store.redo()).toBe(true);
    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual({
      x: 4,
      y: 2,
      z: -3
    });
  });

  it("commits whitebox box rotate and scale transforms with undo and redo", () => {
    const brush = createBoxBrush({
      id: "brush-transform-main",
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.75
      },
      size: {
        x: 2.5,
        y: 2,
        z: 4
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Brush Transform Fixture" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });
    const target = resolveTransformTarget(store.getState().document, {
      kind: "brushes",
      ids: [brush.id]
    }).target;

    if (target === null || target.kind !== "brush") {
      throw new Error("Expected a whitebox box transform target.");
    }

    const rotateSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "rotate",
      target
    });

    rotateSession.preview = {
      kind: "brush",
      center: {
        ...brush.center
      },
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        ...brush.size
      },
      geometry: target.initialGeometry
    };

    store.executeCommand(
      createCommitTransformSessionCommand(
        store.getState().document,
        rotateSession
      )
    );

    expect(store.getState().document.brushes[brush.id].rotationDegrees).toEqual(
      {
        x: 0,
        y: 37.5,
        z: 12.5
      }
    );

    const scaleTarget = resolveTransformTarget(store.getState().document, {
      kind: "brushes",
      ids: [brush.id]
    }).target;

    if (scaleTarget === null || scaleTarget.kind !== "brush") {
      throw new Error(
        "Expected a whitebox box transform target after rotation."
      );
    }

    const scaleSession = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "scale",
      target: scaleTarget
    });

    scaleSession.preview = {
      kind: "brush",
      center: {
        ...brush.center
      },
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        x: 3.25,
        y: 1.75,
        z: 5.5
      },
      geometry: scaleTarget.initialGeometry
    };

    store.executeCommand(
      createCommitTransformSessionCommand(
        store.getState().document,
        scaleSession
      )
    );

    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        x: 3.25,
        y: 1.75,
        z: 5.5
      }
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        x: 2.5,
        y: 2,
        z: 4
      }
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toEqual(brush);

    expect(store.redo()).toBe(true);
    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        x: 3.25,
        y: 1.75,
        z: 5.5
      }
    });
  });

  it("commits a face transform preview and restores it through undo/redo", () => {
    const brush = createBoxBrush({
      id: "brush-face-transform",
      center: { x: 0, y: 1, z: 0 },
      size: { x: 2, y: 2, z: 2 }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Face Transform Fixture" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });
    const target = resolveTransformTarget(
      store.getState().document,
      {
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posX"
      },
      "face"
    ).target;

    if (target === null || target.kind !== "brushFace") {
      throw new Error("Expected a whitebox face transform target.");
    }

    const session = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target
    });

    session.preview = {
      kind: "brush",
      center: { x: 0.5, y: 1, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      size: { x: 3, y: 2, z: 2 },
      geometry: createBoxBrush({ size: { x: 3, y: 2, z: 2 } }).geometry
    };

    store.executeCommand(
      createCommitTransformSessionCommand(store.getState().document, session)
    );

    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      center: { x: 0.5, y: 1, z: 0 },
      size: { x: 3, y: 2, z: 2 }
    });
    expect(store.getState().selection).toEqual({
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posX"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toEqual(brush);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      center: { x: 0.5, y: 1, z: 0 },
      size: { x: 3, y: 2, z: 2 }
    });
  });

  it("commits a vertex transform preview and preserves vertex selection through undo/redo", () => {
    const brush = createBoxBrush({
      id: "brush-vertex-transform",
      center: { x: 0, y: 1, z: 0 },
      size: { x: 2, y: 2, z: 2 }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Vertex Transform Fixture" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });
    const target = resolveTransformTarget(
      store.getState().document,
      {
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      },
      "vertex"
    ).target;

    if (target === null || target.kind !== "brushVertex") {
      throw new Error("Expected a whitebox vertex transform target.");
    }

    const session = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target
    });

    session.preview = {
      kind: "brush",
      center: { x: 0.5, y: 1.5, z: 0.5 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      size: { x: 3, y: 3, z: 3 },
      geometry: createBoxBrush({ size: { x: 3, y: 3, z: 3 } }).geometry
    };

    store.executeCommand(
      createCommitTransformSessionCommand(store.getState().document, session)
    );

    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      center: { x: 0.5, y: 1.5, z: 0.5 },
      size: { x: 3, y: 3, z: 3 }
    });
    expect(store.getState().selection).toEqual({
      kind: "brushVertex",
      brushId: brush.id,
      vertexId: "posX_posY_posZ"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toEqual(brush);
    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "brushVertex",
      brushId: brush.id,
      vertexId: "posX_posY_posZ"
    });
  });

  it("commits deformed vertex geometry without forcing all vertices onto box extents", () => {
    const brush = createBoxBrush({
      id: "brush-vertex-deform",
      center: { x: 0, y: 0, z: 0 },
      size: { x: 2, y: 2, z: 2 }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Vertex Deform Fixture" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });
    const target = resolveTransformTarget(
      store.getState().document,
      {
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      },
      "vertex"
    ).target;

    if (target === null || target.kind !== "brushVertex") {
      throw new Error("Expected a whitebox vertex transform target.");
    }

    const deformedGeometry = cloneBoxBrushGeometry(target.initialGeometry);
    deformedGeometry.vertices.posX_posY_posZ = {
      ...deformedGeometry.vertices.posX_posY_posZ,
      x: deformedGeometry.vertices.posX_posY_posZ.x + 1
    };

    const session = createTransformSession({
      source: "keyboard",
      sourcePanelId: "topLeft",
      operation: "translate",
      target
    });

    session.preview = {
      kind: "brush",
      center: { ...target.initialCenter },
      rotationDegrees: { ...target.initialRotationDegrees },
      size: { ...target.initialSize },
      geometry: deformedGeometry
    };

    store.executeCommand(
      createCommitTransformSessionCommand(store.getState().document, session)
    );

    const committedBrush = store.getState().document.brushes[brush.id];
    expect(
      getBoxBrushLocalVertexPosition(committedBrush, "posX_posY_posZ").x
    ).toBe(2);
    expect(
      getBoxBrushLocalVertexPosition(committedBrush, "posX_posY_negZ").x
    ).toBe(1);
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

    store.executeCommand(
      createCommitTransformSessionCommand(store.getState().document, session)
    );

    expect(
      store.getState().document.modelInstances[modelInstance.id]
    ).toMatchObject({
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
    expect(store.getState().document.modelInstances[modelInstance.id]).toEqual(
      modelInstance
    );

    expect(store.redo()).toBe(true);
    expect(
      store.getState().document.modelInstances[modelInstance.id]
    ).toMatchObject({
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

    store.executeCommand(
      createCommitTransformSessionCommand(store.getState().document, session)
    );

    expect(store.getState().document.entities[playerStart.id]).toMatchObject({
      position: {
        x: 6,
        y: 0,
        z: -4
      },
      yawDegrees: 90
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.entities[playerStart.id]).toEqual(
      playerStart
    );

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
