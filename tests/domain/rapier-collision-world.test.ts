import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";

import { createModelInstance } from "../../src/assets/model-instances";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { FIRST_PERSON_PLAYER_SHAPE } from "../../src/runtime-three/player-collision";
import { RapierCollisionWorld } from "../../src/runtime-three/rapier-collision-world";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";

describe("RapierCollisionWorld", () => {
  it("resolves first-person motion against brush and imported model colliders in one query path", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor",
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      size: {
        x: 10,
        y: 1,
        z: 10
      }
    });
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-crate", new BoxGeometry(1, 1, 1));
    const crateInstance = createModelInstance({
      id: "model-instance-crate",
      assetId: asset.id,
      position: {
        x: 2,
        y: 0.5,
        z: 0
      },
      collision: {
        mode: "static",
        visible: true
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Brush And Model Collision Scene" }),
        assets: {
          [asset.id]: asset
        },
        brushes: {
          [floorBrush.id]: floorBrush
        },
        modelInstances: {
          [crateInstance.id]: crateInstance
        }
      },
      {
        loadedModelAssets: {
          [asset.id]: loadedAsset
        }
      }
    );
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, FIRST_PERSON_PLAYER_SHAPE);

    try {
      const landing = collisionWorld.resolveFirstPersonMotion(
        {
          x: 0,
          y: 2,
          z: 0
        },
        {
          x: 0,
          y: -3,
          z: 0
        },
        FIRST_PERSON_PLAYER_SHAPE
      );

      expect(landing.grounded).toBe(true);
      expect(landing.feetPosition.y).toBeCloseTo(0, 4);

      const blocked = collisionWorld.resolveFirstPersonMotion(
        {
          x: 0,
          y: 0,
          z: 0
        },
        {
          x: 3,
          y: 0,
          z: 0
        },
        FIRST_PERSON_PLAYER_SHAPE
      );

      expect(blocked.feetPosition.x).toBeLessThan(1.21);
      expect(blocked.feetPosition.y).toBeCloseTo(0, 4);
      expect(blocked.collidedAxes.x).toBe(true);
    } finally {
      collisionWorld.dispose();
    }
  });
});
