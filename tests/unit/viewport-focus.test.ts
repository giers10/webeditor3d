import { describe, expect, it } from "vitest";

import { createModelInstance } from "../../src/assets/model-instances";
import { createBoxBrush } from "../../src/document/brushes";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPointLightEntity, createPlayerStartEntity, createSpotLightEntity, createTriggerVolumeEntity } from "../../src/entities/entity-instances";
import { resolveViewportFocusTarget } from "../../src/viewport-three/viewport-focus";

describe("resolveViewportFocusTarget", () => {
  it("frames the selected brush", () => {
    const brush = createBoxBrush({
      id: "brush-room",
      center: {
        x: 3,
        y: 2,
        z: -1
      },
      size: {
        x: 6,
        y: 4,
        z: 2
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(
      resolveViewportFocusTarget(document, {
        kind: "brushes",
        ids: [brush.id]
      })
    ).toEqual({
      center: {
        x: 3,
        y: 2,
        z: -1
      },
      radius: Math.hypot(6, 4, 2) * 0.5
    });
  });

  it("frames rotated whitebox boxes around their authored center with a stable object radius", () => {
    const brush = createBoxBrush({
      id: "brush-rotated-room",
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.75
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      size: {
        x: 2,
        y: 2,
        z: 4
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(
      resolveViewportFocusTarget(document, {
        kind: "brushes",
        ids: [brush.id]
      })
    ).toEqual({
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.75
      },
      radius: Math.hypot(2, 2, 4) * 0.5
    });
  });

  it("frames the owning brush when a face is selected", () => {
    const brush = createBoxBrush({
      id: "brush-face-room"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });

    expect(focusTarget?.center).toEqual(brush.center);
    expect(focusTarget?.radius).toBe(Math.hypot(2, 2, 2) * 0.5);
  });

  it("frames the selected Player Start helper", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 90
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "entities",
      ids: [playerStart.id]
    });

    expect(focusTarget?.center).toEqual({
      x: 4,
      y: 0.3,
      z: -2
    });
    expect(focusTarget?.radius).toBeGreaterThan(0.6);
  });

  it("frames the selected Point Light helper", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      position: {
        x: 2,
        y: 3,
        z: -1
      },
      distance: 8
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [pointLight.id]: pointLight
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "entities",
      ids: [pointLight.id]
    });

    expect(focusTarget).toEqual({
      center: {
        x: 2,
        y: 3,
        z: -1
      },
      radius: 8
    });
  });

  it("frames the selected Path around its authored point bounds", () => {
    const path = createScenePath({
      id: "path-focus",
      points: [
        {
          id: "point-a",
          position: {
            x: -2,
            y: 0,
            z: 1
          }
        },
        {
          id: "point-b",
          position: {
            x: 4,
            y: 2,
            z: 3
          }
        }
      ]
    });
    const document = {
      ...createEmptySceneDocument(),
      paths: {
        [path.id]: path
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "paths",
      ids: [path.id]
    });

    expect(focusTarget).toEqual({
      center: {
        x: 1,
        y: 1,
        z: 2
      },
      radius: Math.hypot(6, 2, 2) * 0.5
    });
  });

  it("frames a selected Path Point tightly around its authored position", () => {
    const path = createScenePath({
      id: "path-point-focus",
      points: [
        {
          id: "point-focus-a",
          position: {
            x: -2,
            y: 0,
            z: 1
          }
        },
        {
          id: "point-focus-b",
          position: {
            x: 4,
            y: 2,
            z: 3
          }
        }
      ]
    });
    const document = {
      ...createEmptySceneDocument(),
      paths: {
        [path.id]: path
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(focusTarget).toEqual({
      center: {
        x: 4,
        y: 2,
        z: 3
      },
      radius: 0.5
    });
  });

  it("frames the selected Spot Light helper", () => {
    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-main",
      position: {
        x: -2,
        y: 4,
        z: 1
      },
      distance: 12
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [spotLight.id]: spotLight
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "entities",
      ids: [spotLight.id]
    });

    expect(focusTarget).toEqual({
      center: {
        x: -2,
        y: 4,
        z: 1
      },
      radius: 12
    });
  });

  it("frames a selected Trigger Volume around its authored bounds", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main",
      position: {
        x: 3,
        y: 2,
        z: -1
      },
      size: {
        x: 4,
        y: 6,
        z: 2
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [triggerVolume.id]: triggerVolume
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "entities",
      ids: [triggerVolume.id]
    });

    expect(focusTarget).toEqual({
      center: {
        x: 3,
        y: 2,
        z: -1
      },
      radius: Math.hypot(2, 3, 1)
    });
  });

  it("frames multiple selected model instances around their combined authored bounds", () => {
    const modelInstanceA = createModelInstance({
      id: "model-focus-a",
      assetId: "asset-model-focus",
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      scale: {
        x: 2,
        y: 2,
        z: 2
      }
    });
    const modelInstanceB = createModelInstance({
      id: "model-focus-b",
      assetId: "asset-model-focus",
      position: {
        x: 6,
        y: 0,
        z: 0
      },
      scale: {
        x: 2,
        y: 2,
        z: 2
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      modelInstances: {
        [modelInstanceA.id]: modelInstanceA,
        [modelInstanceB.id]: modelInstanceB
      }
    };

    expect(
      resolveViewportFocusTarget(document, {
        kind: "modelInstances",
        ids: [modelInstanceA.id, modelInstanceB.id]
      })
    ).toEqual({
      center: {
        x: 3,
        y: 0,
        z: 0
      },
      radius: Math.hypot(8, 2, 2) * 0.5
    });
  });

  it("frames the authored scene when nothing is selected and returns null when the scene is empty", () => {
    const brush = createBoxBrush({
      id: "brush-room"
    });
    const populatedDocument = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(resolveViewportFocusTarget(populatedDocument, { kind: "none" })).toEqual({
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      radius: Math.hypot(2, 2, 2) * 0.5
    });
    expect(resolveViewportFocusTarget(createEmptySceneDocument(), { kind: "none" })).toBeNull();
  });
});
