import { BufferGeometry, Float32BufferAttribute } from "three";

import type { Vec3 } from "../core/vector";
import {
  resolveScenePath,
  sampleResolvedScenePathPosition,
  type ScenePathCurveMode,
  type ScenePathPoint,
  type ScenePathRoadSettings
} from "../document/paths";
import type { SplineCorridorJunction } from "../document/spline-corridor-junctions";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";

export interface SplineCorridorJunctionMeshPathLike {
  id: string;
  loop: boolean;
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
  road: ScenePathRoadSettings;
  points: ReadonlyArray<{
    id?: string;
    pointId?: string;
    position: Vec3;
  }>;
}

const JUNCTION_SEGMENTS = 32;

function normalizePathPoint(
  point: SplineCorridorJunctionMeshPathLike["points"][number],
  index: number
): ScenePathPoint {
  return {
    id: point.id ?? point.pointId ?? `junction-path-point-${index}`,
    position: {
      x: point.position.x,
      y: point.position.y,
      z: point.position.z
    }
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

function resolveJunctionPath(
  path: SplineCorridorJunctionMeshPathLike,
  terrains: readonly Terrain[]
) {
  return resolveScenePath(
    {
      loop: path.loop,
      curveMode: path.curveMode,
      sampledResolution: path.sampledResolution,
      glueToTerrain: path.glueToTerrain,
      terrainOffset: path.terrainOffset,
      points: path.points.map(normalizePathPoint)
    },
    { terrains }
  );
}

function resolveFallbackY(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  terrains: readonly Terrain[];
}): number {
  const sampledPositions = options.junction.connections
    .map((connection) => {
      const path =
        options.paths.find((candidate) => candidate.id === connection.pathId) ??
        null;

      if (path === null) {
        return null;
      }

      const resolvedPath = resolveJunctionPath(path, options.terrains);
      return sampleResolvedScenePathPosition(resolvedPath, connection.progress);
    })
    .filter((position): position is Vec3 => position !== null);

  if (sampledPositions.length === 0) {
    return options.junction.center.y;
  }

  return (
    sampledPositions.reduce((sum, position) => sum + position.y, 0) /
    sampledPositions.length
  );
}

function shouldConformToTerrain(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
}): boolean {
  return options.junction.connections.some((connection) => {
    const path =
      options.paths.find((candidate) => candidate.id === connection.pathId) ??
      null;

    return path?.road.terrainConform ?? false;
  });
}

export function buildSplineCorridorJunctionMeshGeometry(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const { junction, paths } = options;
  const terrains = options.terrains ?? [];

  if (!junction.enabled || !junction.visible || junction.radius <= 0) {
    return null;
  }

  const conformToTerrain = shouldConformToTerrain({ junction, paths });
  const fallbackY = resolveFallbackY({ junction, paths, terrains });
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function resolveY(position: Vec3): number {
    const terrainWorldY = conformToTerrain
      ? sampleHighestTerrainWorldY(terrains, position)
      : null;

    return terrainWorldY ?? fallbackY;
  }

  positions.push(junction.center.x, resolveY(junction.center), junction.center.z);
  uvs.push(0.5, 0.5);

  for (let index = 0; index < JUNCTION_SEGMENTS; index += 1) {
    const angle = (index / JUNCTION_SEGMENTS) * Math.PI * 2;
    const position = {
      x: junction.center.x + Math.cos(angle) * junction.radius,
      y: junction.center.y,
      z: junction.center.z + Math.sin(angle) * junction.radius
    };

    positions.push(position.x, resolveY(position), position.z);
    uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
  }

  for (let index = 0; index < JUNCTION_SEGMENTS; index += 1) {
    const current = index + 1;
    const next = index === JUNCTION_SEGMENTS - 1 ? 1 : current + 1;

    indices.push(0, current, next);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
