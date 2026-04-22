import type { Vec3 } from "../core/vector";
import type { BoxBrushLightFalloffMode } from "../document/brushes";

const MAX_LIGHT_VOLUME_POINT_LIGHTS = 4;
const MIN_SPLIT_HALF_EXTENT = 0.65;
const MIN_LIGHT_DISTANCE = 0.75;

const POSITION_FACTORS: Record<BoxBrushLightFalloffMode, number> = {
  linear: 0.45,
  smoothstep: 0.7
};

const DISTANCE_SCALES: Record<BoxBrushLightFalloffMode, number> = {
  linear: 1,
  smoothstep: 1.1
};

const DISTANCE_PADDING_SCALES: Record<BoxBrushLightFalloffMode, number> = {
  linear: 0.5,
  smoothstep: 0.35
};

const DECAY_BY_FALLOFF: Record<BoxBrushLightFalloffMode, number> = {
  linear: 1.4,
  smoothstep: 2
};

type Vec3Axis = keyof Vec3;

export interface DerivedLightVolumePointLight {
  localPosition: Vec3;
  intensity: number;
  distance: number;
  decay: number;
}

function createVec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function getHalfSize(size: Vec3): Vec3 {
  return createVec3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
}

function getInnerHalfSize(halfSize: Vec3, padding: number): Vec3 {
  return createVec3(
    Math.max(0, halfSize.x - padding),
    Math.max(0, halfSize.y - padding),
    Math.max(0, halfSize.z - padding)
  );
}

function getAxisOffsets(
  halfExtent: number,
  split: boolean,
  positionFactor: number
): number[] {
  if (!split || halfExtent <= 0) {
    return [0];
  }

  const offset = halfExtent * positionFactor;
  return [-offset, offset];
}

export function deriveBoxLightVolumePointLights(options: {
  size: Vec3;
  intensity: number;
  padding: number;
  falloff: BoxBrushLightFalloffMode;
}): DerivedLightVolumePointLight[] {
  if (options.intensity <= 0) {
    return [];
  }

  const halfSize = getHalfSize(options.size);
  const innerHalfSize = getInnerHalfSize(
    halfSize,
    Math.max(0, options.padding)
  );
  const axisOrder = (["x", "y", "z"] as Vec3Axis[]).sort(
    (left, right) => innerHalfSize[right] - innerHalfSize[left]
  );
  const splitAxes: Record<Vec3Axis, boolean> = {
    x: false,
    y: false,
    z: false
  };
  let lightCount = 1;

  for (const axis of axisOrder) {
    if (lightCount >= MAX_LIGHT_VOLUME_POINT_LIGHTS) {
      break;
    }

    if (innerHalfSize[axis] < MIN_SPLIT_HALF_EXTENT) {
      continue;
    }

    splitAxes[axis] = true;
    lightCount *= 2;
  }

  const positionFactor = POSITION_FACTORS[options.falloff];
  const offsetX = getAxisOffsets(innerHalfSize.x, splitAxes.x, positionFactor);
  const offsetY = getAxisOffsets(innerHalfSize.y, splitAxes.y, positionFactor);
  const offsetZ = getAxisOffsets(innerHalfSize.z, splitAxes.z, positionFactor);
  const perLightIntensity = options.intensity / Math.sqrt(lightCount);
  const halfDiagonal = Math.sqrt(
    halfSize.x * halfSize.x +
      halfSize.y * halfSize.y +
      halfSize.z * halfSize.z
  );
  const distance = Math.max(
    MIN_LIGHT_DISTANCE,
    halfDiagonal * DISTANCE_SCALES[options.falloff] -
      Math.max(0, options.padding) *
        DISTANCE_PADDING_SCALES[options.falloff]
  );
  const decay = DECAY_BY_FALLOFF[options.falloff];
  const lights: DerivedLightVolumePointLight[] = [];

  for (const x of offsetX) {
    for (const y of offsetY) {
      for (const z of offsetZ) {
        lights.push({
          localPosition: createVec3(x, y, z),
          intensity: perLightIntensity,
          distance,
          decay
        });
      }
    }
  }

  return lights;
}
