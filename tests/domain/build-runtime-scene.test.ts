import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

describe("buildRuntimeSceneFromDocument", () => {
  it("builds runtime brush data, colliders, and an authored player spawn from the document", () => {
    const brush = createBoxBrush({
      id: "brush-room-floor",
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      size: {
        x: 8,
        y: 1,
        z: 8
      }
    });
    brush.faces.posY.materialId = "starter-concrete-checker";

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90
    });

    const document = {
      ...createEmptySceneDocument({ name: "Runtime Slice" }),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const runtimeScene = buildRuntimeSceneFromDocument(document);

    expect(runtimeScene.brushes).toHaveLength(1);
    expect(runtimeScene.brushes[0].faces.posY.material?.id).toBe("starter-concrete-checker");
    expect(runtimeScene.colliders).toEqual([
      {
        kind: "box",
        brushId: "brush-room-floor",
        min: {
          x: -4,
          y: -1,
          z: -4
        },
        max: {
          x: 4,
          y: 0,
          z: 4
        }
      }
    ]);
    expect(runtimeScene.sceneBounds).toEqual({
      min: {
        x: -4,
        y: -1,
        z: -4
      },
      max: {
        x: 4,
        y: 0,
        z: 4
      },
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      size: {
        x: 8,
        y: 1,
        z: 8
      }
    });
    expect(runtimeScene.playerStart).toEqual({
      entityId: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90
    });
    expect(runtimeScene.spawn).toEqual({
      source: "playerStart",
      entityId: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90
    });
  });

  it("builds a deterministic fallback spawn when no PlayerStart is authored", () => {
    const brush = createBoxBrush({
      id: "brush-room-wall",
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 6,
        y: 2,
        z: 6
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Fallback Runtime Scene" }),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(runtimeScene.playerStart).toBeNull();
    expect(runtimeScene.spawn).toEqual({
      source: "fallback",
      entityId: null,
      position: {
        x: 0,
        y: 2.1,
        z: 6
      },
      yawDegrees: 180
    });
  });

  it("blocks first-person runtime builds when PlayerStart is missing", () => {
    expect(() =>
      buildRuntimeSceneFromDocument(createEmptySceneDocument({ name: "Missing Player Start" }), {
        navigationMode: "firstPerson"
      })
    ).toThrow("First-person run requires an authored Player Start");
  });
});
