import type { Vec3 } from "../core/vector";

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
  collidedAxes: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
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
