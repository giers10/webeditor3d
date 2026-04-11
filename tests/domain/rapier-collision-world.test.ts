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

  it("blocks motion against static-simple boxified wall colliders derived from open meshes", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-static-simple-wall",
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
    const wallGeometry = new PlaneGeometry(4, 4, 4, 4);
    wallGeometry.rotateY(Math.PI * 0.5);
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-static-simple-wall", wallGeometry);
    const wallInstance = createModelInstance({
      id: "model-instance-static-simple-wall",
      assetId: asset.id,
      position: {
        x: 2,
        y: 2,
        z: 0
      },
      collision: {
        mode: "static-simple",
        visible: true
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Static Simple Wall Collision Scene" }),
        assets: {
          [asset.id]: asset
        },
        brushes: {
          [floorBrush.id]: floorBrush
        },
        modelInstances: {
          [wallInstance.id]: wallInstance
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

      expect(blocked.collidedAxes.x).toBe(true);
      expect(blocked.feetPosition.x).toBeLessThan(1.8);
      expect(blocked.feetPosition.y).toBeLessThan(0.02);
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
      expect(blocked.feetPosition.z).toBeGreaterThan(0.25);
      expect(blocked.feetPosition.z).toBeLessThan(1.25);
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

  it("does not climb a wall when repeatedly walking into it from the ground", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-repeat-wall-walk",
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
      id: "brush-repeat-wall-walk",
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
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Repeat Wall Walk Scene" }),
      brushes: {
        [floorBrush.id]: floorBrush,
        [wallBrush.id]: wallBrush
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(
      runtimeScene.colliders,
      runtimeScene.playerCollider
    );

    try {
      let feetPosition = {
        x: 0,
        y: 0,
        z: 0
      };

      for (let index = 0; index < 12; index += 1) {
        const moved = collisionWorld.resolveFirstPersonMotion(
          feetPosition,
          {
            x: 0.3,
            y: 0,
            z: 0
          },
          runtimeScene.playerCollider
        );

        feetPosition = moved.feetPosition;
      }

      expect(feetPosition.y).toBeLessThan(0.05);
      expect(feetPosition.x).toBeLessThan(0.75);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("does not autostep onto a ledge while airborne without floor support", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-airborne-ledge",
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
    const ledgeBrush = createBoxBrush({
      id: "brush-airborne-ledge",
      center: {
        x: 1.2,
        y: 0.35,
        z: 0
      },
      size: {
        x: 0.4,
        y: 0.7,
        z: 4
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Airborne Ledge Collision Scene" }),
      brushes: {
        [floorBrush.id]: floorBrush,
        [ledgeBrush.id]: ledgeBrush
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(
      runtimeScene.colliders,
      runtimeScene.playerCollider
    );

    try {
      const airborne = collisionWorld.resolveFirstPersonMotion(
        {
          x: 0,
          y: 0.45,
          z: 0
        },
        {
          x: 2,
          y: -0.05,
          z: 0
        },
        runtimeScene.playerCollider
      );

      expect(airborne.grounded).toBe(false);
      expect(airborne.feetPosition.y).toBeLessThan(0.55);
      expect(airborne.feetPosition.x).toBeLessThan(0.95);
      expect(airborne.collidedAxes.x).toBe(true);
    } finally {
      collisionWorld.dispose();
    }
  });

  it("keeps falling smoothly when airborne input pushes into a wall", async () => {
    const floorBrush = createBoxBrush({
      id: "brush-floor-airborne-wall-fall",
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
      id: "brush-airborne-fall-wall",
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
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Airborne Wall Fall Scene" }),
      brushes: {
        [floorBrush.id]: floorBrush,
        [wallBrush.id]: wallBrush
      }
    });
    const collisionWorld = await RapierCollisionWorld.create(
      runtimeScene.colliders,
      runtimeScene.playerCollider
    );

    try {
      const start = {
        x: 0.2,
        y: 1.2,
        z: 0
      };
      const fallingOnly = collisionWorld.resolveFirstPersonMotion(
        start,
        {
          x: 0,
          y: -0.2,
          z: 0
        },
        runtimeScene.playerCollider
      );
      const againstWall = collisionWorld.resolveFirstPersonMotion(
        start,
        {
          x: 0.6,
          y: -0.2,
          z: 0
        },
        runtimeScene.playerCollider
      );

      expect(againstWall.collidedAxes.x).toBe(true);
      expect(againstWall.feetPosition.y).toBeCloseTo(fallingOnly.feetPosition.y, 5);
      expect(againstWall.feetPosition.y).toBeLessThan(start.y - 0.15);
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

  it("treats only gentle ramps as walkable ground", async () => {
    const walkableSlopeAngle = Math.PI / 6;
    const steepSlopeAngle = Math.PI / 3;
    const walkableGeometry = new PlaneGeometry(8, 8, 1, 1);
    const steepGeometry = new PlaneGeometry(8, 8, 1, 1);

    walkableGeometry.rotateX(-Math.PI / 2 - walkableSlopeAngle);
    steepGeometry.rotateX(-Math.PI / 2 - steepSlopeAngle);

    const walkableAssetFixture = createFixtureLoadedModelAssetFromGeometry(
      "asset-model-walkable-slope",
      walkableGeometry
    );
    const steepAssetFixture = createFixtureLoadedModelAssetFromGeometry(
      "asset-model-steep-slope",
      steepGeometry
    );
    const walkableSlope = createModelInstance({
      id: "model-instance-walkable-slope",
      assetId: walkableAssetFixture.asset.id,
      position: {
        x: -6,
        y: 4 * Math.sin(walkableSlopeAngle),
        z: 4 * Math.cos(walkableSlopeAngle)
      },
      collision: {
        mode: "static",
        visible: true
      }
    });
    const steepSlope = createModelInstance({
      id: "model-instance-steep-slope",
      assetId: steepAssetFixture.asset.id,
      position: {
        x: 6,
        y: 4 * Math.sin(steepSlopeAngle),
        z: 4 * Math.cos(steepSlopeAngle)
      },
      collision: {
        mode: "static",
        visible: true
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Slope Walkability Scene" }),
        assets: {
          [walkableAssetFixture.asset.id]: walkableAssetFixture.asset,
          [steepAssetFixture.asset.id]: steepAssetFixture.asset
        },
        modelInstances: {
          [walkableSlope.id]: walkableSlope,
          [steepSlope.id]: steepSlope
        }
      },
      {
        loadedModelAssets: {
          [walkableAssetFixture.asset.id]: walkableAssetFixture.loadedAsset,
          [steepAssetFixture.asset.id]: steepAssetFixture.loadedAsset
        }
      }
    );
    const collisionWorld = await RapierCollisionWorld.create(
      runtimeScene.colliders,
      runtimeScene.playerCollider
    );

    try {
      const walkableProbe = collisionWorld.probePlayerGround(
        {
          x: -6,
          y: Math.tan(walkableSlopeAngle) * 2 + 0.05,
          z: 2
        },
        runtimeScene.playerCollider,
        0.2
      );
      const steepProbe = collisionWorld.probePlayerGround(
        {
          x: 6,
          y: Math.tan(steepSlopeAngle) * 2 + 0.05,
          z: 2
        },
        runtimeScene.playerCollider,
        0.2
      );

      expect(walkableProbe.grounded).toBe(true);
      expect(walkableProbe.slopeDegrees ?? 0).toBeGreaterThan(25);
      expect(walkableProbe.slopeDegrees ?? 0).toBeLessThan(35);
      expect(steepProbe.grounded).toBe(false);
      expect(steepProbe.slopeDegrees ?? 0).toBeGreaterThan(55);
      expect(steepProbe.slopeDegrees ?? 0).toBeLessThan(65);
    } finally {
      collisionWorld.dispose();
    }
  });
});
