import RAPIER from "@dimforge/rapier3d-compat";
import { Euler, MathUtils, Quaternion, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import type {
  GeneratedModelBoxCollider,
  GeneratedModelCollider,
  GeneratedModelCompoundCollider,
  GeneratedModelHeightfieldCollider,
  GeneratedModelTriMeshCollider
} from "../geometry/model-instance-collider-generation";

import type { FirstPersonPlayerShape, ResolvedPlayerMotion } from "./player-collision";
import type { RuntimeBoxCollider, RuntimeSceneCollider } from "./runtime-scene-build";

const CHARACTER_CONTROLLER_OFFSET = 0.01;
const COLLISION_EPSILON = 1e-5;

let rapierInitPromise: Promise<typeof RAPIER> | null = null;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

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

function createFixedBodyForModelCollider(world: RAPIER.World, collider: GeneratedModelCollider): RAPIER.RigidBody {
  return world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(collider.transform.position.x, collider.transform.position.y, collider.transform.position.z)
      .setRotation(createRapierQuaternion(collider.transform.rotationDegrees))
  );
}

function attachBrushCollider(world: RAPIER.World, collider: RuntimeBoxCollider) {
  const center = {
    x: (collider.min.x + collider.max.x) * 0.5,
    y: (collider.min.y + collider.max.y) * 0.5,
    z: (collider.min.z + collider.max.z) * 0.5
  };
  const halfExtents = {
    x: (collider.max.x - collider.min.x) * 0.5,
    y: (collider.max.y - collider.min.y) * 0.5,
    z: (collider.max.z - collider.min.z) * 0.5
  };

  world.createCollider(RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z).setTranslation(center.x, center.y, center.z));
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

  world.createCollider(
    RAPIER.ColliderDesc.heightfield(collider.rows, collider.cols, collider.heights, {
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
    const scaledPoints = scaleVertices(piece.points, collider.transform.scale);
    const descriptor = RAPIER.ColliderDesc.convexHull(scaledPoints);

    if (descriptor === null) {
      throw new Error(`Dynamic collider piece ${piece.id} could not form a valid convex hull.`);
    }

    world.createCollider(descriptor, body);
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
  const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);

  return {
    x: feetPosition.x,
    y: feetPosition.y + shape.radius + cylindricalHalfHeight,
    z: feetPosition.z
  };
}

function colliderCenterToFeetPosition(center: Vec3, shape: FirstPersonPlayerShape): Vec3 {
  const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);

  return {
    x: center.x,
    y: center.y - (shape.radius + cylindricalHalfHeight),
    z: center.z
  };
}

export async function initializeRapierCollisionWorld(): Promise<typeof RAPIER> {
  rapierInitPromise ??= RAPIER.init().then(() => RAPIER);
  return rapierInitPromise;
}

export class RapierCollisionWorld {
  static async create(colliders: RuntimeSceneCollider[], playerShape: FirstPersonPlayerShape): Promise<RapierCollisionWorld> {
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

    const playerCollider = world.createCollider(
      rapier.ColliderDesc.capsule(Math.max(0, (playerShape.height - playerShape.radius * 2) * 0.5), playerShape.radius)
    );
    const characterController = world.createCharacterController(CHARACTER_CONTROLLER_OFFSET);

    characterController.setUp({ x: 0, y: 1, z: 0 });
    characterController.setSlideEnabled(true);
    characterController.enableSnapToGround(0.2);
    characterController.enableAutostep(0.35, 0.15, false);
    characterController.setMaxSlopeClimbAngle(Math.PI * 0.45);
    characterController.setMinSlopeSlideAngle(Math.PI * 0.5);

    return new RapierCollisionWorld(world, characterController, playerCollider);
  }

  private constructor(
    private readonly world: RAPIER.World,
    private readonly characterController: RAPIER.KinematicCharacterController,
    private readonly playerCollider: RAPIER.Collider
  ) {}

  resolveFirstPersonMotion(feetPosition: Vec3, motion: Vec3, shape: FirstPersonPlayerShape): ResolvedPlayerMotion {
    const currentCenter = feetPositionToColliderCenter(feetPosition, shape);
    this.playerCollider.setTranslation(currentCenter);
    this.characterController.computeColliderMovement(this.playerCollider, motion);

    const correctedMovement = this.characterController.computedMovement();
    const nextCenter = {
      x: currentCenter.x + correctedMovement.x,
      y: currentCenter.y + correctedMovement.y,
      z: currentCenter.z + correctedMovement.z
    };

    this.playerCollider.setTranslation(nextCenter);

    return {
      feetPosition: colliderCenterToFeetPosition(nextCenter, shape),
      grounded: this.characterController.computedGrounded(),
      collidedAxes: {
        x: Math.abs(correctedMovement.x - motion.x) > COLLISION_EPSILON,
        y: Math.abs(correctedMovement.y - motion.y) > COLLISION_EPSILON,
        z: Math.abs(correctedMovement.z - motion.z) > COLLISION_EPSILON
      }
    };
  }

  dispose() {
    this.world.removeCharacterController(this.characterController);
    this.world.free();
  }
}
