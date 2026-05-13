import type { Vec3 } from "../core/vector";
import {
  resolveScenePath,
  type ScenePathCurveMode,
  type ScenePathPoint,
  type ScenePathRepeater,
  type ScenePathRoadSettings
} from "../document/paths";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";

import { deriveSplineRepeaterInstances } from "./spline-repeaters";
import {
  isDistanceInSplineCorridorClipIntervals,
  type SplineCorridorPathClipIntervalMap
} from "./spline-corridor-clips";

export interface SplineCorridorColliderPathPointLike {
  id?: string;
  pointId?: string;
  position: Vec3;
}

export interface SplineCorridorColliderPathLike {
  id: string;
  visible: boolean;
  enabled: boolean;
  loop: boolean;
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
  road: ScenePathRoadSettings;
  repeaters: readonly ScenePathRepeater[];
  points: readonly SplineCorridorColliderPathPointLike[];
}

export interface SplineCorridorBoxCollider {
  kind: "box";
  source: "splineCorridor";
  colliderId: string;
  pathId: string;
  repeaterId?: string;
  assetId?: string;
  edgeSide?: "left" | "right";
  position: Vec3;
  rotationDegrees: Vec3;
  center: Vec3;
  size: Vec3;
  worldBounds: {
    min: Vec3;
    max: Vec3;
  };
}

const MIN_COLLIDER_SIZE = 0.05;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizePathPoint(
  point: SplineCorridorColliderPathPointLike,
  index: number
): ScenePathPoint {
  return {
    id: point.id ?? point.pointId ?? `spline-collider-point-${index}`,
    position: cloneVec3(point.position)
  };
}

function normalizeHorizontal(vector: Vec3): Vec3 | null {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= 1e-8) {
    return null;
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

function rotateY(point: Vec3, yawRadians: number): Vec3 {
  const sin = Math.sin(yawRadians);
  const cos = Math.cos(yawRadians);

  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos
  };
}

function computeBoxWorldBounds(options: {
  position: Vec3;
  yawDegrees: number;
  center: Vec3;
  size: Vec3;
}): { min: Vec3; max: Vec3 } {
  const yawRadians = (options.yawDegrees * Math.PI) / 180;
  const halfSize = {
    x: options.size.x * 0.5,
    y: options.size.y * 0.5,
    z: options.size.z * 0.5
  };
  const min = {
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
    z: Number.POSITIVE_INFINITY
  };
  const max = {
    x: Number.NEGATIVE_INFINITY,
    y: Number.NEGATIVE_INFINITY,
    z: Number.NEGATIVE_INFINITY
  };

  for (const x of [-halfSize.x, halfSize.x]) {
    for (const y of [-halfSize.y, halfSize.y]) {
      for (const z of [-halfSize.z, halfSize.z]) {
        const localCorner = {
          x: options.center.x + x,
          y: options.center.y + y,
          z: options.center.z + z
        };
        const rotatedCorner = rotateY(localCorner, yawRadians);
        const worldCorner = {
          x: options.position.x + rotatedCorner.x,
          y: options.position.y + rotatedCorner.y,
          z: options.position.z + rotatedCorner.z
        };

        min.x = Math.min(min.x, worldCorner.x);
        min.y = Math.min(min.y, worldCorner.y);
        min.z = Math.min(min.z, worldCorner.z);
        max.x = Math.max(max.x, worldCorner.x);
        max.y = Math.max(max.y, worldCorner.y);
        max.z = Math.max(max.z, worldCorner.z);
      }
    }
  }

  return { min, max };
}

function createBoxCollider(options: {
  colliderId: string;
  pathId: string;
  repeaterId?: string;
  assetId?: string;
  edgeSide?: "left" | "right";
  position: Vec3;
  yawDegrees: number;
  center: Vec3;
  size: Vec3;
}): SplineCorridorBoxCollider {
  const size = {
    x: Math.max(MIN_COLLIDER_SIZE, options.size.x),
    y: Math.max(MIN_COLLIDER_SIZE, options.size.y),
    z: Math.max(MIN_COLLIDER_SIZE, options.size.z)
  };

  return {
    kind: "box",
    source: "splineCorridor",
    colliderId: options.colliderId,
    pathId: options.pathId,
    repeaterId: options.repeaterId,
    assetId: options.assetId,
    edgeSide: options.edgeSide,
    position: cloneVec3(options.position),
    rotationDegrees: {
      x: 0,
      y: options.yawDegrees,
      z: 0
    },
    center: cloneVec3(options.center),
    size,
    worldBounds: computeBoxWorldBounds({
      position: options.position,
      yawDegrees: options.yawDegrees,
      center: options.center,
      size
    })
  };
}

function buildRepeaterColliders(options: {
  path: SplineCorridorColliderPathLike;
  terrains: readonly Terrain[];
  clipIntervalsByPath?: SplineCorridorPathClipIntervalMap;
}): SplineCorridorBoxCollider[] {
  const collisionRepeaterIds = new Set(
    options.path.repeaters
      .filter((repeater) => repeater.collisionEnabled)
      .map((repeater) => repeater.id)
  );

  if (collisionRepeaterIds.size === 0) {
    return [];
  }

  return deriveSplineRepeaterInstances({
    path: options.path,
    terrains: options.terrains,
    clipIntervals: options.clipIntervalsByPath?.get(options.path.id)
  })
    .filter((instance) => collisionRepeaterIds.has(instance.repeaterId))
    .map((instance, index) => {
      const size = {
        x: instance.asset.dimensions.widthX * instance.scale,
        y: instance.asset.dimensions.heightY * instance.scale,
        z: instance.asset.dimensions.lengthZ * instance.scale
      };

      return createBoxCollider({
        colliderId: `${instance.pathId}:${instance.repeaterId}:${index}:box`,
        pathId: instance.pathId,
        repeaterId: instance.repeaterId,
        assetId: instance.asset.id,
        position: instance.position,
        yawDegrees: instance.yawDegrees,
        center: {
          x: 0,
          y: size.y * 0.5,
          z: 0
        },
        size
      });
    });
}

function buildRoadEdgeColliders(options: {
  path: SplineCorridorColliderPathLike;
  terrains: readonly Terrain[];
  clipIntervalsByPath?: SplineCorridorPathClipIntervalMap;
}): SplineCorridorBoxCollider[] {
  const { path, terrains } = options;

  if (!path.enabled || !path.visible || !path.road.enabled) {
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

  const colliders: SplineCorridorBoxCollider[] = [];
  const roadHalfWidth = path.road.width * 0.5;
  const clipIntervals = options.clipIntervalsByPath?.get(path.id);

  for (const side of ["left", "right"] as const) {
    const edge = path.road.edges[side];

    if (!edge.enabled || !edge.collisionEnabled) {
      continue;
    }

    const sideSign = side === "left" ? 1 : -1;
    const offset = sideSign * (roadHalfWidth + edge.width * 0.5);
    const boxHeight = Math.max(MIN_COLLIDER_SIZE, edge.height);

    resolvedPath.segments.forEach((segment, segmentIndex) => {
      if (segment.length <= 1e-8) {
        return;
      }

      const midpointDistance =
        segment.distanceStart + (segment.distanceEnd - segment.distanceStart) * 0.5;

      if (isDistanceInSplineCorridorClipIntervals(midpointDistance, clipIntervals)) {
        return;
      }

      const tangent = normalizeHorizontal(segment.tangent);

      if (tangent === null) {
        return;
      }

      const left = {
        x: -tangent.z,
        y: 0,
        z: tangent.x
      };
      const midpoint = {
        x: (segment.start.x + segment.end.x) * 0.5,
        y: (segment.start.y + segment.end.y) * 0.5,
        z: (segment.start.z + segment.end.z) * 0.5
      };
      const basePosition = {
        x: midpoint.x + left.x * offset,
        y: midpoint.y,
        z: midpoint.z + left.z * offset
      };
      const terrainWorldY = path.road.terrainConform
        ? sampleHighestTerrainWorldY(terrains, basePosition)
        : null;
      const yawDegrees = (Math.atan2(tangent.x, tangent.z) * 180) / Math.PI;

      colliders.push(
        createBoxCollider({
          colliderId: `${path.id}:road-edge:${side}:${segmentIndex}:box`,
          pathId: path.id,
          edgeSide: side,
          position: {
            x: basePosition.x,
            y:
              (terrainWorldY ?? basePosition.y) +
              path.road.heightOffset +
              boxHeight * 0.5,
            z: basePosition.z
          },
          yawDegrees,
          center: {
            x: 0,
            y: 0,
            z: 0
          },
          size: {
            x: edge.width,
            y: boxHeight,
            z: segment.length
          }
        })
      );
    });
  }

  return colliders;
}

export function deriveSplineCorridorBoxColliders(options: {
  paths: readonly SplineCorridorColliderPathLike[];
  terrains?: readonly Terrain[];
  clipIntervalsByPath?: SplineCorridorPathClipIntervalMap;
}): SplineCorridorBoxCollider[] {
  const terrains = options.terrains ?? [];

  return options.paths.flatMap((path) => [
    ...buildRoadEdgeColliders({
      path,
      terrains,
      clipIntervalsByPath: options.clipIntervalsByPath
    }),
    ...buildRepeaterColliders({
      path,
      terrains,
      clipIntervalsByPath: options.clipIntervalsByPath
    })
  ]);
}
