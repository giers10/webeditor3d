import type { Vec3 } from "../core/vector";

import type { RuntimeBoxCollider } from "./runtime-scene-build";

export interface FirstPersonPlayerShape {
  radius: number;
  height: number;
  eyeHeight: number;
}

export interface ResolvedPlayerMotion {
  feetPosition: Vec3;
  grounded: boolean;
  collidedAxes: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
}

export const FIRST_PERSON_PLAYER_SHAPE: FirstPersonPlayerShape = {
  radius: 0.3,
  height: 1.8,
  eyeHeight: 1.6
};

type Axis = "x" | "y" | "z";

interface RuntimeAabb {
  min: Vec3;
  max: Vec3;
}

function createPlayerAabb(feetPosition: Vec3, shape: FirstPersonPlayerShape): RuntimeAabb {
  return {
    min: {
      x: feetPosition.x - shape.radius,
      y: feetPosition.y,
      z: feetPosition.z - shape.radius
    },
    max: {
      x: feetPosition.x + shape.radius,
      y: feetPosition.y + shape.height,
      z: feetPosition.z + shape.radius
    }
  };
}

function rangesOverlap(minA: number, maxA: number, minB: number, maxB: number): boolean {
  return minA < maxB && maxA > minB;
}

function resolveAxis(
  axis: Axis,
  nextFeetPosition: Vec3,
  delta: number,
  shape: FirstPersonPlayerShape,
  colliders: RuntimeBoxCollider[]
): { collided: boolean; grounded: boolean } {
  if (delta === 0) {
    return {
      collided: false,
      grounded: false
    };
  }

  nextFeetPosition[axis] += delta;

  let collided = false;
  let grounded = false;

  for (const collider of colliders) {
    const playerAabb = createPlayerAabb(nextFeetPosition, shape);
    const overlapsOtherAxes =
      axis === "x"
        ? rangesOverlap(playerAabb.min.y, playerAabb.max.y, collider.min.y, collider.max.y) &&
          rangesOverlap(playerAabb.min.z, playerAabb.max.z, collider.min.z, collider.max.z)
        : axis === "y"
          ? rangesOverlap(playerAabb.min.x, playerAabb.max.x, collider.min.x, collider.max.x) &&
            rangesOverlap(playerAabb.min.z, playerAabb.max.z, collider.min.z, collider.max.z)
          : rangesOverlap(playerAabb.min.x, playerAabb.max.x, collider.min.x, collider.max.x) &&
            rangesOverlap(playerAabb.min.y, playerAabb.max.y, collider.min.y, collider.max.y);

    if (!overlapsOtherAxes) {
      continue;
    }

    switch (axis) {
      case "x":
        if (delta > 0 && playerAabb.max.x > collider.min.x && playerAabb.min.x < collider.min.x) {
          nextFeetPosition.x = collider.min.x - shape.radius;
          collided = true;
        } else if (delta < 0 && playerAabb.min.x < collider.max.x && playerAabb.max.x > collider.max.x) {
          nextFeetPosition.x = collider.max.x + shape.radius;
          collided = true;
        }
        break;
      case "y":
        if (delta > 0 && playerAabb.max.y > collider.min.y && playerAabb.min.y < collider.min.y) {
          nextFeetPosition.y = collider.min.y - shape.height;
          collided = true;
        } else if (delta < 0 && playerAabb.min.y < collider.max.y && playerAabb.max.y > collider.max.y) {
          nextFeetPosition.y = collider.max.y;
          collided = true;
          grounded = true;
        }
        break;
      case "z":
        if (delta > 0 && playerAabb.max.z > collider.min.z && playerAabb.min.z < collider.min.z) {
          nextFeetPosition.z = collider.min.z - shape.radius;
          collided = true;
        } else if (delta < 0 && playerAabb.min.z < collider.max.z && playerAabb.max.z > collider.max.z) {
          nextFeetPosition.z = collider.max.z + shape.radius;
          collided = true;
        }
        break;
    }
  }

  return {
    collided,
    grounded
  };
}

export function resolveFirstPersonMotion(
  feetPosition: Vec3,
  motion: Vec3,
  shape: FirstPersonPlayerShape,
  colliders: RuntimeBoxCollider[]
): ResolvedPlayerMotion {
  const nextFeetPosition = {
    ...feetPosition
  };

  const xResolution = resolveAxis("x", nextFeetPosition, motion.x, shape, colliders);
  const zResolution = resolveAxis("z", nextFeetPosition, motion.z, shape, colliders);
  const yResolution = resolveAxis("y", nextFeetPosition, motion.y, shape, colliders);

  return {
    feetPosition: nextFeetPosition,
    grounded: yResolution.grounded,
    collidedAxes: {
      x: xResolution.collided,
      y: yResolution.collided,
      z: zResolution.collided
    }
  };
}
