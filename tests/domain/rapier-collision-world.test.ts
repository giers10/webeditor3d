import { describe, expect, it } from "vitest";
import { BoxGeometry, PlaneGeometry } from "three";

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
      expect(landing.feetPosition.y).toBeLessThan(0.02);

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
      expect(blocked.feetPosition.y).toBeLessThan(0.02);
      expect(blocked.collidedAxes.x).toBe(true);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("initializes and resolves first-person motion against terrain heightfield colliders", async () => {
    const terrainGeometry = new PlaneGeometry(8, 8, 4, 4);
    terrainGeometry.rotateX(-Math.PI / 2);
    const positionAttribute = terrainGeometry.getAttribute("position");

    for (let index = 0; index < positionAttribute.count; index += 1) {
      const x = positionAttribute.getX(index);
      const z = positionAttribute.getZ(index);
      positionAttribute.setY(index, 2 + x * 0.25 + z * 0.75);
    }

    positionAttribute.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-terrain", terrainGeometry);
    const terrainInstance = createModelInstance({
      id: "model-instance-terrain",
      assetId: asset.id,
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      collision: {
        mode: "terrain",
        visible: true
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Terrain Collision Scene" }),
        assets: {
          [asset.id]: asset
        },
        modelInstances: {
          [terrainInstance.id]: terrainInstance
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
      const highLanding = collisionWorld.resolveFirstPersonMotion(
        {
          x: -2,
          y: 6,
          z: 2
        },
        {
          x: 0,
          y: -8,
          z: 0
        },
        FIRST_PERSON_PLAYER_SHAPE
      );
      const lowLanding = collisionWorld.resolveFirstPersonMotion(
        {
          x: 2,
          y: 6,
          z: -2
        },
        {
          x: 0,
          y: -8,
          z: 0
        },
        FIRST_PERSON_PLAYER_SHAPE
      );

      expect(highLanding.grounded).toBe(true);
      expect(highLanding.feetPosition.y).toBeGreaterThan(2.9);
      expect(highLanding.feetPosition.y).toBeLessThan(3.1);
      expect(lowLanding.grounded).toBe(true);
      expect(lowLanding.feetPosition.y).toBeGreaterThan(0.9);
      expect(lowLanding.feetPosition.y).toBeLessThan(1.1);

      const traversed = collisionWorld.resolveFirstPersonMotion(
        highLanding.feetPosition,
        {
          x: -1,
          y: 0,
          z: 0
        },
        FIRST_PERSON_PLAYER_SHAPE
      );

      expect(traversed.feetPosition.x).toBeLessThan(-2.5);
      expect(traversed.feetPosition.y).toBeLessThan(highLanding.feetPosition.y);
      expect(traversed.collidedAxes.x).toBe(false);
    } finally {
      collisionWorld.dispose();
    }
  });
});
