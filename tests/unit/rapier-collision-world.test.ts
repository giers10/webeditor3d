import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { RapierCollisionWorld } from "../../src/runtime-three/rapier-collision-world";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

describe("RapierCollisionWorld", () => {
  it("clamps a third-person camera boom before it clips through world geometry", async () => {
    const wall = createBoxBrush({
      id: "brush-third-person-camera-wall",
      center: {
        x: 0,
        y: 1.5,
        z: -2.25
      },
      size: {
        x: 6,
        y: 3,
        z: 0.5
      }
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-third-person",
      navigationMode: "thirdPerson"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Third Person Camera Collision" }),
      brushes: {
        [wall.id]: wall
      },
      entities: {
        [playerStart.id]: playerStart
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(
      runtimeScene.colliders,
      runtimeScene.playerCollider
    );

    try {
      const desiredCameraPosition = {
        x: 0,
        y: 1.5,
        z: -4
      };
      const resolvedCameraPosition =
        collisionWorld.resolveThirdPersonCameraCollision(
          {
            x: 0,
            y: 1.5,
            z: 0
          },
          desiredCameraPosition,
          0.2
        );

      expect(resolvedCameraPosition.z).toBeGreaterThan(desiredCameraPosition.z);
      expect(resolvedCameraPosition.z).toBeGreaterThan(-2.05);
      expect(resolvedCameraPosition.z).toBeLessThan(-1.6);
    } finally {
      collisionWorld.dispose();
    }
  });
});
