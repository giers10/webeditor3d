import type { Vec3 } from "../core/vector";

const CROUCHED_HEIGHT_FACTOR = 0.6;
const CROUCHED_EYE_HEIGHT_FACTOR = 0.68;
const MIN_CAPSULE_CROUCH_CLEARANCE = 0.2;
const MIN_BOX_CROUCH_HEIGHT = 0.9;
const MIN_EYE_CLEARANCE = 0.12;

export type FirstPersonPlayerShape =
  | {
      mode: "capsule";
      radius: number;
      height: number;
      eyeHeight: number;
    }
  | {
      mode: "box";
      size: Vec3;
      eyeHeight: number;
    }
  | {
      mode: "none";
      eyeHeight: number;
    };

export interface ResolvedPlayerMotion {
  feetPosition: Vec3;
  grounded: boolean;
  collisionCount: number;
  groundCollisionNormal: Vec3 | null;
  collidedAxes: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
}

export interface PlayerGroundProbeResult {
  grounded: boolean;
  distance: number | null;
  normal: Vec3 | null;
  slopeDegrees: number | null;
}

export const FIRST_PERSON_PLAYER_SHAPE: FirstPersonPlayerShape = {
  mode: "capsule",
  radius: 0.3,
  height: 1.8,
  eyeHeight: 1.6
};

export function getFirstPersonPlayerEyeHeight(shape: FirstPersonPlayerShape): number {
  return shape.eyeHeight;
}

export function getFirstPersonPlayerHeight(shape: FirstPersonPlayerShape): number | null {
  switch (shape.mode) {
    case "capsule":
      return shape.height;
    case "box":
      return shape.size.y;
    case "none":
      return null;
  }
}

export function cloneFirstPersonPlayerShape(
  shape: FirstPersonPlayerShape
): FirstPersonPlayerShape {
  switch (shape.mode) {
    case "capsule":
      return {
        mode: "capsule",
        radius: shape.radius,
        height: shape.height,
        eyeHeight: shape.eyeHeight
      };
    case "box":
      return {
        mode: "box",
        size: {
          x: shape.size.x,
          y: shape.size.y,
          z: shape.size.z
        },
        eyeHeight: shape.eyeHeight
      };
    case "none":
      return {
        mode: "none",
        eyeHeight: shape.eyeHeight
      };
  }
}

export function createCrouchedFirstPersonPlayerShape(
  shape: FirstPersonPlayerShape
): FirstPersonPlayerShape {
  switch (shape.mode) {
    case "capsule": {
      const crouchedHeight = Math.max(
        shape.radius * 2 + MIN_CAPSULE_CROUCH_CLEARANCE,
        shape.height * CROUCHED_HEIGHT_FACTOR
      );

      return {
        mode: "capsule",
        radius: shape.radius,
        height: crouchedHeight,
        eyeHeight: Math.max(
          shape.radius + MIN_EYE_CLEARANCE,
          Math.min(
            crouchedHeight - MIN_EYE_CLEARANCE,
            shape.eyeHeight * CROUCHED_EYE_HEIGHT_FACTOR
          )
        )
      };
    }
    case "box": {
      const crouchedHeight = Math.max(
        MIN_BOX_CROUCH_HEIGHT,
        shape.size.y * CROUCHED_HEIGHT_FACTOR
      );

      return {
        mode: "box",
        size: {
          x: shape.size.x,
          y: crouchedHeight,
          z: shape.size.z
        },
        eyeHeight: Math.max(
          MIN_EYE_CLEARANCE,
          Math.min(
            crouchedHeight - MIN_EYE_CLEARANCE,
            shape.eyeHeight * CROUCHED_EYE_HEIGHT_FACTOR
          )
        )
      };
    }
    case "none":
      return cloneFirstPersonPlayerShape(shape);
  }
}

export function getFirstPersonPlayerShapeSignature(
  shape: FirstPersonPlayerShape
): string {
  switch (shape.mode) {
    case "capsule":
      return `capsule:${shape.radius}:${shape.height}:${shape.eyeHeight}`;
    case "box":
      return `box:${shape.size.x}:${shape.size.y}:${shape.size.z}:${shape.eyeHeight}`;
    case "none":
      return `none:${shape.eyeHeight}`;
  }
}
