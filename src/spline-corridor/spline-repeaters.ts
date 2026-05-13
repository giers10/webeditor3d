import type { Vec3 } from "../core/vector";
import {
  resolveScenePath,
  sampleResolvedScenePathPosition,
  sampleResolvedScenePathTangent,
  type ScenePathCurveMode,
  type ScenePathPoint,
  type ScenePathRepeater
} from "../document/paths";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";

import {
  BUNDLED_SPLINE_CORRIDOR_ASSET_REGISTRY,
  type BundledSplineCorridorAsset
} from "./bundled-spline-corridor-assets";

export interface SplineRepeaterPathPointLike {
  id?: string;
  pointId?: string;
  position: Vec3;
}

export interface SplineRepeaterPathLike {
  id: string;
  visible: boolean;
  enabled: boolean;
  loop: boolean;
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
  repeaters: readonly ScenePathRepeater[];
  points: readonly SplineRepeaterPathPointLike[];
}

export interface SplineRepeaterInstance {
  pathId: string;
  repeaterId: string;
  asset: BundledSplineCorridorAsset;
  position: Vec3;
  yawDegrees: number;
  scale: number;
  distanceAlongPath: number;
}

const MAX_REPEATER_INSTANCES_PER_RULE = 2000;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizePathPoint(
  point: SplineRepeaterPathPointLike,
  index: number
): ScenePathPoint {
  return {
    id: point.id ?? point.pointId ?? `repeater-point-${index}`,
    position: cloneVec3(point.position)
  };
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomUnit(seed: string): number {
  let value = hashString(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

function randomSigned(seed: string): number {
  return randomUnit(seed) * 2 - 1;
}

function normalizeHorizontal(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= 1e-8) {
    return {
      x: 0,
      y: 0,
      z: 1
    };
  }

  return {
    x: vector.x / length,
    y: 0,
    z: vector.z / length
  };
}

function sampleHighestTerrainWorldY(
  terrains: readonly Terrain[],
  position: Vec3
): number | null {
  let highestWorldY: number | null = null;

  for (const terrain of terrains) {
    const height = sampleTerrainHeightAtWorldPosition(
      terrain,
      position.x,
      position.z,
      false
    );

    if (height === null) {
      continue;
    }

    const worldY = terrain.position.y + height;

    if (highestWorldY === null || worldY > highestWorldY) {
      highestWorldY = worldY;
    }
  }

  return highestWorldY;
}

function resolvePlacementOffset(repeater: ScenePathRepeater): number {
  switch (repeater.placement) {
    case "center":
      return 0;
    case "left":
      return repeater.offset;
    case "right":
      return -repeater.offset;
  }
}

export function deriveSplineRepeaterInstances(options: {
  path: SplineRepeaterPathLike;
  terrains?: readonly Terrain[];
}): SplineRepeaterInstance[] {
  const { path } = options;
  const terrains = options.terrains ?? [];

  if (!path.enabled || !path.visible || path.repeaters.length === 0) {
    return [];
  }

  const resolvedPath = resolveScenePath(
    {
      loop: path.loop,
      curveMode: path.curveMode,
      sampledResolution: path.sampledResolution,
      glueToTerrain: path.glueToTerrain,
      terrainOffset: path.terrainOffset,
      points: path.points.map(normalizePathPoint)
    },
    {
      terrains
    }
  );

  if (resolvedPath.totalLength <= 0) {
    return [];
  }

  const instances: SplineRepeaterInstance[] = [];

  for (const repeater of path.repeaters) {
    if (!repeater.enabled) {
      continue;
    }

    const asset = BUNDLED_SPLINE_CORRIDOR_ASSET_REGISTRY[repeater.assetId];

    if (asset === undefined) {
      continue;
    }

    const startDistance = Math.min(
      resolvedPath.totalLength,
      repeater.startInset
    );
    const endDistance = Math.max(
      startDistance,
      resolvedPath.totalLength - repeater.endInset
    );
    const maxInstanceCount = Math.min(
      MAX_REPEATER_INSTANCES_PER_RULE,
      Math.floor((endDistance - startDistance) / repeater.spacing) + 1
    );

    for (let index = 0; index < maxInstanceCount; index += 1) {
      const distance = startDistance + index * repeater.spacing;

      if (distance > endDistance + 1e-6) {
        break;
      }

      const progress = distance / resolvedPath.totalLength;
      const center = sampleResolvedScenePathPosition(resolvedPath, progress);
      const tangent = normalizeHorizontal(
        sampleResolvedScenePathTangent(resolvedPath, progress)
      );
      const left = {
        x: -tangent.z,
        y: 0,
        z: tangent.x
      };
      const offset = resolvePlacementOffset(repeater);
      const position = {
        x: center.x + left.x * offset,
        y: center.y,
        z: center.z + left.z * offset
      };
      const terrainWorldY = repeater.terrainConform
        ? sampleHighestTerrainWorldY(terrains, position)
        : null;
      const randomKey = `${path.id}:${repeater.id}:${repeater.seed}:${index}`;
      const yawJitter =
        randomSigned(`${randomKey}:yaw`) * repeater.randomYawDegrees;
      const scaleJitter =
        1 + randomSigned(`${randomKey}:scale`) * repeater.randomScale;

      instances.push({
        pathId: path.id,
        repeaterId: repeater.id,
        asset,
        position: {
          x: position.x,
          y: (terrainWorldY ?? position.y) + repeater.heightOffset,
          z: position.z
        },
        yawDegrees:
          (repeater.alignToSpline
            ? (Math.atan2(tangent.x, tangent.z) * 180) / Math.PI
            : 0) +
          repeater.yawOffsetDegrees +
          yawJitter,
        scale: repeater.scale * scaleJitter,
        distanceAlongPath: distance
      });
    }
  }

  return instances;
}
