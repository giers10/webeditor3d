import { Euler, MathUtils, Quaternion, Vector3 } from "three";

import type { Vec3 } from "../core/vector";

import type { PlayerStartActionInputState } from "./player-input-bindings";
import {
  getFirstPersonPlayerEyeHeight,
  type FirstPersonPlayerShape
} from "./player-collision";
import type {
  RuntimeBrushColliderFace,
  RuntimeBrushTriMeshCollider,
  RuntimeSceneDefinition
} from "./runtime-scene-build";

export const CLIMB_INPUT_ACTIVE_THRESHOLD = 0.5;
export const CLIMB_AUTO_LATCH_INPUT_THRESHOLD = 0.25;
export const CLIMB_AUTO_LATCH_MIN_INTO_SURFACE_DOT = 0.35;
export const CLIMB_SPEED_METERS_PER_SECOND = 2.4;
export const CLIMB_DETECT_DISTANCE_METERS = 0.85;
export const CLIMB_KEEP_DISTANCE_METERS = 1.05;
export const CLIMB_WALL_MAX_ABS_NORMAL_Y = 0.35;
const CLIMB_MIN_FACING_DOT = 0.35;
const VECTOR_EPSILON = 1e-6;

export interface RuntimePlayerClimbSurface {
  brushId: string;
  faceId: string;
  point: Vec3;
  normal: Vec3;
  distance: number;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function crossVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function lengthVec3(vector: Vec3): number {
  return Math.sqrt(dotVec3(vector, vector));
}

function normalizeVec3(vector: Vec3): Vec3 | null {
  const length = lengthVec3(vector);

  if (length <= VECTOR_EPSILON) {
    return null;
  }

  return scaleVec3(vector, 1 / length);
}

function projectOntoPlane(vector: Vec3, normal: Vec3): Vec3 {
  return subtractVec3(vector, scaleVec3(normal, dotVec3(vector, normal)));
}

function rotateVec3(vector: Vec3, rotationDegrees: Vec3): Vec3 {
  const rotated = new Vector3(vector.x, vector.y, vector.z).applyQuaternion(
    new Quaternion().setFromEuler(
      new Euler(
        MathUtils.degToRad(rotationDegrees.x),
        MathUtils.degToRad(rotationDegrees.y),
        MathUtils.degToRad(rotationDegrees.z),
        "XYZ"
      )
    )
  );

  return {
    x: rotated.x,
    y: rotated.y,
    z: rotated.z
  };
}

function transformLocalPointToWorld(
  point: Vec3,
  collider: RuntimeBrushTriMeshCollider
): Vec3 {
  return addVec3(rotateVec3(point, collider.rotationDegrees), collider.center);
}

function transformLocalVectorToWorld(
  vector: Vec3,
  collider: RuntimeBrushTriMeshCollider
): Vec3 {
  return normalizeVec3(rotateVec3(vector, collider.rotationDegrees)) ?? {
    x: 0,
    y: 0,
    z: 1
  };
}

function resolveClimbProbeOrigin(
  feetPosition: Vec3,
  shape: FirstPersonPlayerShape
): Vec3 {
  return {
    x: feetPosition.x,
    y: feetPosition.y + getFirstPersonPlayerEyeHeight(shape) * 0.55,
    z: feetPosition.z
  };
}

function isPointInTriangle(point: Vec3, a: Vec3, b: Vec3, c: Vec3): boolean {
  const v0 = subtractVec3(c, a);
  const v1 = subtractVec3(b, a);
  const v2 = subtractVec3(point, a);
  const dot00 = dotVec3(v0, v0);
  const dot01 = dotVec3(v0, v1);
  const dot02 = dotVec3(v0, v2);
  const dot11 = dotVec3(v1, v1);
  const dot12 = dotVec3(v1, v2);
  const denominator = dot00 * dot11 - dot01 * dot01;

  if (Math.abs(denominator) <= VECTOR_EPSILON) {
    return false;
  }

  const inverseDenominator = 1 / denominator;
  const u = (dot11 * dot02 - dot01 * dot12) * inverseDenominator;
  const v = (dot00 * dot12 - dot01 * dot02) * inverseDenominator;

  return u >= -VECTOR_EPSILON && v >= -VECTOR_EPSILON && u + v <= 1 + VECTOR_EPSILON;
}

function isPointOnFace(
  point: Vec3,
  face: RuntimeBrushColliderFace,
  worldVertices: Vec3[]
): boolean {
  return face.triangles.some((triangle) =>
    isPointInTriangle(
      point,
      worldVertices[triangle[0]],
      worldVertices[triangle[1]],
      worldVertices[triangle[2]]
    )
  );
}

export function isClimbableWallNormal(normal: Vec3): boolean {
  const normalizedNormal = normalizeVec3(normal);

  return (
    normalizedNormal !== null &&
    Math.abs(normalizedNormal.y) <= CLIMB_WALL_MAX_ABS_NORMAL_Y
  );
}

export function shouldEnterClimbing(options: {
  climbInput: number;
  movementIntoSurface: boolean;
  surface: RuntimePlayerClimbSurface | null;
  jumpPressed: boolean;
}): boolean {
  return (
    options.surface !== null &&
    !options.jumpPressed &&
    (options.climbInput > CLIMB_INPUT_ACTIVE_THRESHOLD ||
      options.movementIntoSurface)
  );
}

export function shouldExitClimbing(options: {
  surface: RuntimePlayerClimbSurface | null;
  jumpPressed: boolean;
}): boolean {
  return options.surface === null || options.jumpPressed;
}

export function resolveClimbPlanarInputDirection(
  input: PlayerStartActionInputState,
  movementYawRadians: number
): { direction: Vec3 | null; inputMagnitude: number } {
  const inputX = input.moveRight - input.moveLeft;
  const inputZ = input.moveForward - input.moveBackward;
  const rawMagnitude = Math.hypot(inputX, inputZ);
  const inputMagnitude = Math.min(1, rawMagnitude);

  if (rawMagnitude <= VECTOR_EPSILON) {
    return {
      direction: null,
      inputMagnitude
    };
  }

  const normalizedInputX = inputX / rawMagnitude;
  const normalizedInputZ = inputZ / rawMagnitude;
  const forwardX = Math.sin(movementYawRadians);
  const forwardZ = Math.cos(movementYawRadians);
  const rightX = -Math.cos(movementYawRadians);
  const rightZ = Math.sin(movementYawRadians);
  const directionX =
    forwardX * normalizedInputZ + rightX * normalizedInputX;
  const directionZ =
    forwardZ * normalizedInputZ + rightZ * normalizedInputX;
  const directionMagnitude = Math.hypot(directionX, directionZ);

  if (directionMagnitude <= VECTOR_EPSILON) {
    return {
      direction: null,
      inputMagnitude
    };
  }

  return {
    direction: {
      x: directionX / directionMagnitude,
      y: 0,
      z: directionZ / directionMagnitude
    },
    inputMagnitude
  };
}

export function isClimbMovementIntoSurface(options: {
  input: PlayerStartActionInputState;
  movementYawRadians: number;
  surface: RuntimePlayerClimbSurface | null;
}): boolean {
  if (options.surface === null) {
    return false;
  }

  const inputDirection = resolveClimbPlanarInputDirection(
    options.input,
    options.movementYawRadians
  );

  if (
    inputDirection.direction === null ||
    inputDirection.inputMagnitude < CLIMB_AUTO_LATCH_INPUT_THRESHOLD
  ) {
    return false;
  }

  const normal = normalizeVec3(options.surface.normal);

  return (
    normal !== null &&
    dotVec3(inputDirection.direction, normal) <=
      -CLIMB_AUTO_LATCH_MIN_INTO_SURFACE_DOT
  );
}

export function computeClimbPlaneMovement(options: {
  normal: Vec3;
  input: PlayerStartActionInputState;
  speedMetersPerSecond?: number;
  dt: number;
}): { motion: Vec3; inputMagnitude: number } {
  const normal = normalizeVec3(options.normal);

  if (normal === null || options.dt <= 0) {
    return {
      motion: {
        x: 0,
        y: 0,
        z: 0
      },
      inputMagnitude: 0
    };
  }

  const up =
    normalizeVec3(projectOntoPlane({ x: 0, y: 1, z: 0 }, normal)) ?? {
      x: 0,
      y: 1,
      z: 0
    };
  const right =
    normalizeVec3(crossVec3(up, normal)) ?? {
      x: 1,
      y: 0,
      z: 0
    };
  const inputX = options.input.moveRight - options.input.moveLeft;
  const inputY = options.input.moveForward - options.input.moveBackward;
  const rawMagnitude = Math.hypot(inputX, inputY);
  const inputMagnitude = Math.min(1, rawMagnitude);

  if (rawMagnitude <= VECTOR_EPSILON) {
    return {
      motion: {
        x: 0,
        y: 0,
        z: 0
      },
      inputMagnitude
    };
  }

  const speed = options.speedMetersPerSecond ?? CLIMB_SPEED_METERS_PER_SECOND;
  const distance = Math.max(0, speed) * options.dt;
  const normalizedX = inputX / rawMagnitude;
  const normalizedY = inputY / rawMagnitude;
  const direction = addVec3(
    scaleVec3(right, normalizedX),
    scaleVec3(up, normalizedY)
  );

  return {
    motion: scaleVec3(direction, distance),
    inputMagnitude
  };
}

export function resolvePlayerClimbSurface(options: {
  runtimeScene: RuntimeSceneDefinition;
  feetPosition: Vec3;
  facingDirection: Vec3;
  shape: FirstPersonPlayerShape;
  previousSurface?: RuntimePlayerClimbSurface | null;
}): RuntimePlayerClimbSurface | null {
  const rayDirection = normalizeVec3(options.facingDirection);

  if (rayDirection === null || options.shape.mode === "none") {
    return null;
  }

  const probeOrigin = resolveClimbProbeOrigin(
    options.feetPosition,
    options.shape
  );
  const maxDistance =
    options.previousSurface === null || options.previousSurface === undefined
      ? CLIMB_DETECT_DISTANCE_METERS
      : CLIMB_KEEP_DISTANCE_METERS;
  let bestSurface: RuntimePlayerClimbSurface | null = null;

  for (const collider of options.runtimeScene.staticColliders) {
    if (collider.source !== "brush") {
      continue;
    }

    for (const face of collider.faces) {
      if (!face.climbable) {
        continue;
      }

      const normal = transformLocalVectorToWorld(face.normal, collider);

      if (!isClimbableWallNormal(normal)) {
        continue;
      }

      const facingDot = dotVec3(rayDirection, normal);

      if (facingDot >= -CLIMB_MIN_FACING_DOT) {
        continue;
      }

      const worldVertices = face.vertices.map((vertex) =>
        transformLocalPointToWorld(vertex, collider)
      );
      const planePoint = worldVertices[0];
      const distance =
        dotVec3(subtractVec3(planePoint, probeOrigin), normal) / facingDot;

      if (distance < 0 || distance > maxDistance) {
        continue;
      }

      const point = addVec3(probeOrigin, scaleVec3(rayDirection, distance));

      if (!isPointOnFace(point, face, worldVertices)) {
        continue;
      }

      const candidate: RuntimePlayerClimbSurface = {
        brushId: collider.brushId,
        faceId: face.faceId,
        point,
        normal,
        distance
      };

      if (
        bestSurface === null ||
        candidate.distance < bestSurface.distance ||
        (options.previousSurface !== null &&
          options.previousSurface !== undefined &&
          candidate.brushId === options.previousSurface.brushId &&
          candidate.faceId === options.previousSurface.faceId)
      ) {
        bestSurface = candidate;
      }
    }
  }

  return bestSurface === null
    ? null
    : {
        ...bestSurface,
        point: cloneVec3(bestSurface.point),
        normal: cloneVec3(bestSurface.normal)
      };
}
