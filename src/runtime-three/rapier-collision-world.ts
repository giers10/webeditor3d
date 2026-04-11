import RAPIER from "@dimforge/rapier3d-compat";
import { Euler, MathUtils, Quaternion } from "three";

import type { Vec3 } from "../core/vector";
import type {
  GeneratedModelBoxCollider,
  GeneratedModelCollider,
  GeneratedModelCompoundCollider,
  GeneratedModelHeightfieldCollider,
  GeneratedModelTriMeshCollider
} from "../geometry/model-instance-collider-generation";

import type {
  FirstPersonPlayerShape,
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "./player-collision";
import { getFirstPersonPlayerShapeSignature } from "./player-collision";
import type { RuntimeBrushTriMeshCollider, RuntimeSceneCollider } from "./runtime-scene-build";

const CHARACTER_CONTROLLER_OFFSET = 0.01;
const CHARACTER_CONTROLLER_SNAP_TO_GROUND_DISTANCE = 0.2;
const AUTOSTEP_MIN_WIDTH_FACTOR = 0.4285714286;
const COLLISION_EPSILON = 1e-5;
const CAMERA_COLLISION_EPSILON = 1e-3;
const MAX_WALKABLE_SLOPE_RADIANS = Math.PI * 0.25;
const GROUND_NORMAL_Y_THRESHOLD = Math.cos(MAX_WALKABLE_SLOPE_RADIANS);
const IDENTITY_ROTATION = {
  x: 0,
  y: 0,
  z: 0,
  w: 1
};

let rapierInitPromise: Promise<typeof RAPIER> | null = null;

function componentScale(vector: Vec3, scale: Vec3): Vec3 {
  return {
    x: vector.x * scale.x,
    y: vector.y * scale.y,
    z: vector.z * scale.z
  };
}

function createRapierQuaternion(rotationDegrees: Vec3): RAPIER.Rotation {
  const quaternion = new Quaternion().setFromEuler(
    new Euler(
      MathUtils.degToRad(rotationDegrees.x),
      MathUtils.degToRad(rotationDegrees.y),
      MathUtils.degToRad(rotationDegrees.z),
      "XYZ"
    )
  );

  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  };
}

function scaleVertices(vertices: Float32Array, scale: Vec3): Float32Array {
  const scaledVertices = new Float32Array(vertices.length);

  for (let index = 0; index < vertices.length; index += 3) {
    scaledVertices[index] = vertices[index] * scale.x;
    scaledVertices[index + 1] = vertices[index + 1] * scale.y;
    scaledVertices[index + 2] = vertices[index + 2] * scale.z;
  }

  return scaledVertices;
}

function scaleBoundsCenter(bounds: { min: Vec3; max: Vec3 }, scale: Vec3): Vec3 {
  return {
    x: ((bounds.min.x + bounds.max.x) * 0.5) * scale.x,
    y: ((bounds.min.y + bounds.max.y) * 0.5) * scale.y,
    z: ((bounds.min.z + bounds.max.z) * 0.5) * scale.z
  };
}

function createRapierHeightfieldHeights(collider: GeneratedModelHeightfieldCollider): Float32Array {
  const heights = new Float32Array(collider.heights.length);

  // Rapier's heightfield samples are column-major, with the Z axis varying
  // fastest inside each X column. Our generated collider stores X-major rows
  // for easier editor/debug mesh reconstruction, so transpose here.
  for (let zIndex = 0; zIndex < collider.cols; zIndex += 1) {
    for (let xIndex = 0; xIndex < collider.rows; xIndex += 1) {
      heights[zIndex + xIndex * collider.cols] = collider.heights[xIndex + zIndex * collider.rows];
    }
  }

  return heights;
}

function createFixedBodyForModelCollider(world: RAPIER.World, collider: GeneratedModelCollider): RAPIER.RigidBody {
  return world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(collider.transform.position.x, collider.transform.position.y, collider.transform.position.z)
      .setRotation(createRapierQuaternion(collider.transform.rotationDegrees))
  );
}

function attachBrushCollider(world: RAPIER.World, collider: RuntimeBrushTriMeshCollider) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(collider.center.x, collider.center.y, collider.center.z)
      .setRotation(createRapierQuaternion(collider.rotationDegrees))
  );

  world.createCollider(RAPIER.ColliderDesc.trimesh(collider.vertices, collider.indices), body);
}

function attachSimpleModelCollider(world: RAPIER.World, collider: GeneratedModelBoxCollider) {
  const body = createFixedBodyForModelCollider(world, collider);
  const scaledCenter = componentScale(collider.center, collider.transform.scale);
  const scaledHalfExtents = componentScale(
    {
      x: collider.size.x * 0.5,
      y: collider.size.y * 0.5,
      z: collider.size.z * 0.5
    },
    collider.transform.scale
  );

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(scaledHalfExtents.x, scaledHalfExtents.y, scaledHalfExtents.z).setTranslation(
      scaledCenter.x,
      scaledCenter.y,
      scaledCenter.z
    ),
    body
  );
}

function attachStaticModelCollider(world: RAPIER.World, collider: GeneratedModelTriMeshCollider) {
  const body = createFixedBodyForModelCollider(world, collider);
  world.createCollider(RAPIER.ColliderDesc.trimesh(scaleVertices(collider.vertices, collider.transform.scale), collider.indices), body);
}

function attachTerrainModelCollider(world: RAPIER.World, collider: GeneratedModelHeightfieldCollider) {
  if (collider.rows < 2 || collider.cols < 2) {
    throw new Error(`Terrain collider ${collider.instanceId} must have at least a 2x2 height sample grid.`);
  }

  const body = createFixedBodyForModelCollider(world, collider);
  const center = scaleBoundsCenter(
    {
      min: {
        x: collider.minX,
        y: 0,
        z: collider.minZ
      },
      max: {
        x: collider.maxX,
        y: 0,
        z: collider.maxZ
      }
    },
    collider.transform.scale
  );
  const rowSubdivisions = collider.rows - 1;
  const colSubdivisions = collider.cols - 1;

  world.createCollider(
    // Rapier expects the number of grid subdivisions here, while our generated
    // collider stores the sampled height grid dimensions.
    RAPIER.ColliderDesc.heightfield(rowSubdivisions, colSubdivisions, createRapierHeightfieldHeights(collider), {
      x: (collider.maxX - collider.minX) * collider.transform.scale.x,
      y: collider.transform.scale.y,
      z: (collider.maxZ - collider.minZ) * collider.transform.scale.z
    }).setTranslation(center.x, center.y, center.z),
    body
  );
}

function attachDynamicModelCollider(world: RAPIER.World, collider: GeneratedModelCompoundCollider) {
  const body = createFixedBodyForModelCollider(world, collider);

  for (const piece of collider.pieces) {
    if (piece.kind === "convexHull") {
      const scaledPoints = scaleVertices(piece.points, collider.transform.scale);
      const descriptor = RAPIER.ColliderDesc.convexHull(scaledPoints);

      if (descriptor === null) {
        throw new Error(`Dynamic collider piece ${piece.id} could not form a valid convex hull.`);
      }

      world.createCollider(descriptor, body);
      continue;
    }

    const scaledCenter = componentScale(piece.center, collider.transform.scale);
    const scaledHalfExtents = componentScale(
      {
        x: piece.size.x * 0.5,
        y: piece.size.y * 0.5,
        z: piece.size.z * 0.5
      },
      collider.transform.scale
    );

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(scaledHalfExtents.x, scaledHalfExtents.y, scaledHalfExtents.z).setTranslation(
        scaledCenter.x,
        scaledCenter.y,
        scaledCenter.z
      ),
      body
    );
  }
}

function attachModelCollider(world: RAPIER.World, collider: GeneratedModelCollider) {
  switch (collider.kind) {
    case "box":
      attachSimpleModelCollider(world, collider);
      break;
    case "trimesh":
      attachStaticModelCollider(world, collider);
      break;
    case "heightfield":
      attachTerrainModelCollider(world, collider);
      break;
    case "compound":
      attachDynamicModelCollider(world, collider);
      break;
  }
}

function feetPositionToColliderCenter(feetPosition: Vec3, shape: FirstPersonPlayerShape): Vec3 {
  switch (shape.mode) {
    case "capsule": {
      const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);

      return {
        x: feetPosition.x,
        y: feetPosition.y + shape.radius + cylindricalHalfHeight,
        z: feetPosition.z
      };
    }
    case "box":
      return {
        x: feetPosition.x,
        y: feetPosition.y + shape.size.y * 0.5,
        z: feetPosition.z
      };
    case "none":
      return {
        ...feetPosition
      };
  }
}

function colliderCenterToFeetPosition(center: Vec3, shape: FirstPersonPlayerShape): Vec3 {
  switch (shape.mode) {
    case "capsule": {
      const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);

      return {
        x: center.x,
        y: center.y - (shape.radius + cylindricalHalfHeight),
        z: center.z
      };
    }
    case "box":
      return {
        x: center.x,
        y: center.y - shape.size.y * 0.5,
        z: center.z
      };
    case "none":
      return {
        ...center
      };
  }
}

function createPlayerCollider(world: RAPIER.World, rapier: typeof RAPIER, playerShape: FirstPersonPlayerShape): RAPIER.Collider | null {
  switch (playerShape.mode) {
    case "capsule":
      return world.createCollider(
        rapier.ColliderDesc.capsule(Math.max(0, (playerShape.height - playerShape.radius * 2) * 0.5), playerShape.radius)
      );
    case "box":
      return world.createCollider(
        rapier.ColliderDesc.cuboid(playerShape.size.x * 0.5, playerShape.size.y * 0.5, playerShape.size.z * 0.5)
      );
    case "none":
      return null;
  }
}

function createPlayerQueryShape(
  shape: FirstPersonPlayerShape
): RAPIER.Shape | null {
  switch (shape.mode) {
    case "capsule":
      return new RAPIER.Capsule(
        Math.max(0, (shape.height - shape.radius * 2) * 0.5),
        shape.radius
      );
    case "box":
      return new RAPIER.Cuboid(
        shape.size.x * 0.5,
        shape.size.y * 0.5,
        shape.size.z * 0.5
      );
    case "none":
      return null;
  }
}

function toVec3(vector: RAPIER.Vector): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

export async function initializeRapierCollisionWorld(): Promise<typeof RAPIER> {
  rapierInitPromise ??= RAPIER.init().then(() => RAPIER);
  return rapierInitPromise;
}

export class RapierCollisionWorld {
  static async create(
    colliders: RuntimeSceneCollider[],
    playerShape: FirstPersonPlayerShape,
    options: {
      maxStepHeight?: number;
    } = {}
  ): Promise<RapierCollisionWorld> {
    const rapier = await initializeRapierCollisionWorld();
    const world = new rapier.World({
      x: 0,
      y: 0,
      z: 0
    });

    for (const collider of colliders) {
      if (collider.source === "brush") {
        attachBrushCollider(world, collider);
        continue;
      }

      attachModelCollider(world, collider);
    }

    const playerCollider = createPlayerCollider(world, rapier, playerShape);
    const characterController = playerCollider === null ? null : world.createCharacterController(CHARACTER_CONTROLLER_OFFSET);
    const maxStepHeight = Math.max(0, options.maxStepHeight ?? 0.35);

    if (characterController !== null) {
      characterController.setUp({ x: 0, y: 1, z: 0 });
      characterController.setSlideEnabled(true);
      characterController.enableSnapToGround(
        Math.max(CHARACTER_CONTROLLER_SNAP_TO_GROUND_DISTANCE, maxStepHeight)
      );

      if (maxStepHeight > COLLISION_EPSILON) {
        characterController.enableAutostep(
          maxStepHeight,
          maxStepHeight * AUTOSTEP_MIN_WIDTH_FACTOR,
          false
        );
      }

      characterController.setMaxSlopeClimbAngle(MAX_WALKABLE_SLOPE_RADIANS);
      characterController.setMinSlopeSlideAngle(Math.PI * 0.5);
    }

    world.step();

    return new RapierCollisionWorld(
      world,
      characterController,
      playerCollider,
      playerShape.mode === "none"
        ? null
        : getFirstPersonPlayerShapeSignature(playerShape)
    );
  }

  private constructor(
    private readonly world: RAPIER.World,
    private readonly characterController: RAPIER.KinematicCharacterController | null,
    private readonly playerCollider: RAPIER.Collider | null,
    private currentPlayerShapeSignature: string | null
  ) {}

  private syncPlayerColliderShape(shape: FirstPersonPlayerShape) {
    if (this.playerCollider === null || shape.mode === "none") {
      return;
    }

    const nextSignature = getFirstPersonPlayerShapeSignature(shape);

    if (this.currentPlayerShapeSignature === nextSignature) {
      return;
    }

    switch (shape.mode) {
      case "capsule":
        this.playerCollider.setRadius(shape.radius);
        this.playerCollider.setHalfHeight(
          Math.max(0, (shape.height - shape.radius * 2) * 0.5)
        );
        break;
      case "box":
        this.playerCollider.setHalfExtents({
          x: shape.size.x * 0.5,
          y: shape.size.y * 0.5,
          z: shape.size.z * 0.5
        });
        break;
    }

    this.currentPlayerShapeSignature = nextSignature;
  }

  resolveFirstPersonMotion(feetPosition: Vec3, motion: Vec3, shape: FirstPersonPlayerShape): ResolvedPlayerMotion {
    if (this.playerCollider === null || this.characterController === null || shape.mode === "none") {
      return {
        feetPosition: {
          x: feetPosition.x + motion.x,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: false,
        collisionCount: 0,
        groundCollisionNormal: null,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      };
    }

    this.syncPlayerColliderShape(shape);

    const currentCenter = feetPositionToColliderCenter(feetPosition, shape);
    this.playerCollider.setTranslation(currentCenter);
    const snapToGroundWasEnabled = this.characterController.snapToGroundEnabled();

    if (motion.y > COLLISION_EPSILON && snapToGroundWasEnabled) {
      this.characterController.disableSnapToGround();
    }

    this.characterController.computeColliderMovement(this.playerCollider, motion);

    if (snapToGroundWasEnabled) {
      this.characterController.enableSnapToGround(
        CHARACTER_CONTROLLER_SNAP_TO_GROUND_DISTANCE
      );
    }

    const correctedMovement = this.characterController.computedMovement();
    const collidedAxes = {
      x: Math.abs(correctedMovement.x - motion.x) > COLLISION_EPSILON,
      y: Math.abs(correctedMovement.y - motion.y) > COLLISION_EPSILON,
      z: Math.abs(correctedMovement.z - motion.z) > COLLISION_EPSILON
    };
    const nextCenter = {
      x: currentCenter.x + correctedMovement.x,
      y: currentCenter.y + correctedMovement.y,
      z: currentCenter.z + correctedMovement.z
    };
    const collisionCount = this.characterController.numComputedCollisions();
    let groundCollisionNormal: Vec3 | null = null;

    for (let index = 0; index < collisionCount; index += 1) {
      const collision = this.characterController.computedCollision(index);

      if (
        collision === null ||
        collision.normal1.y < GROUND_NORMAL_Y_THRESHOLD ||
        (groundCollisionNormal !== null &&
          collision.normal1.y <= groundCollisionNormal.y)
      ) {
        continue;
      }

      groundCollisionNormal = toVec3(collision.normal1);
    }

    this.playerCollider.setTranslation(nextCenter);

    return {
      feetPosition: colliderCenterToFeetPosition(nextCenter, shape),
      grounded:
        this.characterController.computedGrounded() ||
        groundCollisionNormal !== null ||
        (motion.y < 0 && collidedAxes.y),
      collisionCount,
      groundCollisionNormal,
      collidedAxes
    };
  }

  probePlayerGround(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape,
    maxDistance: number
  ): PlayerGroundProbeResult {
    if (
      this.playerCollider === null ||
      shape.mode === "none" ||
      maxDistance <= COLLISION_EPSILON
    ) {
      return {
        grounded: false,
        distance: null,
        normal: null,
        slopeDegrees: null
      };
    }

    this.syncPlayerColliderShape(shape);

    const hit = this.world.castShape(
      feetPositionToColliderCenter(feetPosition, shape),
      IDENTITY_ROTATION,
      {
        x: 0,
        y: -maxDistance,
        z: 0
      },
      this.playerCollider.shape,
      0,
      1,
      true,
      undefined,
      undefined,
      this.playerCollider
    );

    if (hit === null) {
      return {
        grounded: false,
        distance: null,
        normal: null,
        slopeDegrees: null
      };
    }

    const normal = toVec3(hit.normal1);

    return {
      grounded: normal.y >= GROUND_NORMAL_Y_THRESHOLD,
      distance: maxDistance * hit.time_of_impact,
      normal,
      slopeDegrees:
        (Math.acos(Math.max(-1, Math.min(1, normal.y))) * 180) / Math.PI
    };
  }

  canOccupyPlayerShape(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape
  ): boolean {
    if (shape.mode === "none") {
      return true;
    }

    const queryShape = createPlayerQueryShape(shape);

    if (queryShape === null) {
      return true;
    }

    let intersects = false;

    this.world.intersectionsWithShape(
      feetPositionToColliderCenter(feetPosition, shape),
      IDENTITY_ROTATION,
      queryShape,
      () => {
        intersects = true;
        return false;
      },
      undefined,
      undefined,
      this.playerCollider ?? undefined
    );

    return !intersects;
  }

  resolveThirdPersonCameraCollision(
    pivot: Vec3,
    desiredCameraPosition: Vec3,
    radius: number
  ): Vec3 {
    const delta = {
      x: desiredCameraPosition.x - pivot.x,
      y: desiredCameraPosition.y - pivot.y,
      z: desiredCameraPosition.z - pivot.z
    };
    const distance = Math.hypot(delta.x, delta.y, delta.z);

    if (distance <= COLLISION_EPSILON) {
      return { ...desiredCameraPosition };
    }

    const hit = this.world.castShape(
      pivot,
      IDENTITY_ROTATION,
      delta,
      new RAPIER.Ball(radius),
      0,
      1,
      true,
      undefined,
      undefined,
      this.playerCollider ?? undefined
    );

    if (hit === null) {
      return { ...desiredCameraPosition };
    }

    const safeToi = Math.max(
      0,
      hit.time_of_impact - CAMERA_COLLISION_EPSILON / distance
    );

    return {
      x: pivot.x + delta.x * safeToi,
      y: pivot.y + delta.y * safeToi,
      z: pivot.z + delta.z * safeToi
    };
  }

  dispose() {
    if (this.characterController !== null) {
      this.world.removeCharacterController(this.characterController);
    }
    this.world.free();
  }
}
