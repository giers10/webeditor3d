import { describe, expect, it } from "vitest";
import { BoxGeometry, PlaneGeometry } from "three";

import { createModelInstance } from "../../src/assets/model-instances";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
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
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, runtimeScene.playerCollider);

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
        runtimeScene.playerCollider
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
        runtimeScene.playerCollider
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
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, runtimeScene.playerCollider);

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
        runtimeScene.playerCollider
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
        runtimeScene.playerCollider
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
        runtimeScene.playerCollider
      );

      expect(traversed.feetPosition.x).toBeLessThan(-2.5);
      expect(traversed.collidedAxes.x).toBe(false);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("resolves motion against freely rotated whitebox box colliders", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-rotated-wall",
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
    const wallBrush = createBoxBrush({
      id: "brush-wall-rotated",
      center: {
        x: 1.2,
        y: 1,
        z: 0
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      size: {
        x: 0.4,
        y: 2,
        z: 4
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Rotated Brush Collision Scene" }),
      brushes: {
        [floorBrush.id]: floorBrush,
        [wallBrush.id]: wallBrush
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, runtimeScene.playerCollider);

    try {
      const blocked = collisionWorld.resolveFirstPersonMotion(
        {
          x: 0,
          y: 0,
          z: 0
        },
        {
          x: 2,
          y: 0,
          z: 0
        },
        runtimeScene.playerCollider
      );

      expect(blocked.collidedAxes.x).toBe(true);
      expect(blocked.feetPosition.x).toBeLessThan(1.3);
      expect(blocked.feetPosition.z).toBeCloseTo(0, 5);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("uses the authored Player Start box collider in the Rapier motion path", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-box-player",
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
    const wallBrush = createBoxBrush({
      id: "brush-wall-box-player",
      center: {
        x: 1.2,
        y: 1,
        z: 0
      },
      size: {
        x: 0.4,
        y: 2,
        z: 4
      }
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-box",
      collider: {
        mode: "box",
        eyeHeight: 1.4,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.8,
          y: 1.6,
          z: 0.8
        }
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Box Player Collider Scene" }),
      brushes: {
        [floorBrush.id]: floorBrush,
        [wallBrush.id]: wallBrush
      },
      entities: {
        [playerStart.id]: playerStart
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, runtimeScene.playerCollider);

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
        runtimeScene.playerCollider
      );

      expect(landing.grounded).toBe(true);
      expect(landing.feetPosition.y).toBeLessThan(0.02);

      const blocked = collisionWorld.resolveFirstPersonMotion(
        landing.feetPosition,
        {
          x: 2,
          y: 0,
          z: 0
        },
        runtimeScene.playerCollider
      );

      expect(blocked.collidedAxes.x).toBe(true);
      expect(blocked.feetPosition.x).toBeLessThan(0.61);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("supports authored Player Start collision mode none without world clipping", async () => {
    const wallBrush = createBoxBrush({
      id: "brush-wall-no-collision",
      center: {
        x: 0.5,
        y: 1,
        z: 0
      },
      size: {
        x: 0.4,
        y: 2,
        z: 4
      }
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-none",
      collider: {
        mode: "none",
        eyeHeight: 1.6,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.6,
          y: 1.8,
          z: 0.6
        }
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "No Collision Player Scene" }),
      brushes: {
        [wallBrush.id]: wallBrush
      },
      entities: {
        [playerStart.id]: playerStart
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(runtimeScene.colliders, runtimeScene.playerCollider);

    try {
      const moved = collisionWorld.resolveFirstPersonMotion(
        {
          x: 0,
          y: 0,
          z: 0
        },
        {
          x: 2,
          y: 0,
          z: 0
        },
        runtimeScene.playerCollider
      );

      expect(moved.collidedAxes.x).toBe(false);
      expect(moved.feetPosition.x).toBe(2);
      expect(moved.feetPosition.y).toBe(0);
    } finally {
      collisionWorld.dispose();
    }
  });
});
