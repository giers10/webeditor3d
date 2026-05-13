import { BufferGeometry, Float32BufferAttribute } from "three";

import type { Vec3 } from "../core/vector";
import type { SplineCorridorJunction } from "../document/spline-corridor-junctions";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";
import {
  buildSplineCorridorJunctionFootprint,
  type SplineCorridorJunctionFootprintPathLike
} from "./spline-corridor-junction-footprint";

export type SplineCorridorJunctionMeshPathLike =
  SplineCorridorJunctionFootprintPathLike;

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
  const footprint = buildSplineCorridorJunctionFootprint({
    junction,
    paths,
    terrains
  });

  if (footprint === null) {
    return null;
  }

  const resolvedFootprint = footprint;
  const conformToTerrain = shouldConformToTerrain({ junction, paths });
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function resolveY(position: Vec3, fallbackY: number, heightOffset: number): number {
    const terrainWorldY = conformToTerrain
      ? sampleHighestTerrainWorldY(terrains, position)
      : null;

    return terrainWorldY === null ? fallbackY : terrainWorldY + heightOffset;
  }

  function pushUv(x: number, z: number) {
    const deltaX = x - resolvedFootprint.center.x;
    const deltaZ = z - resolvedFootprint.center.z;
    uvs.push(
      deltaX * resolvedFootprint.rightAxis.x +
        deltaZ * resolvedFootprint.rightAxis.z,
      deltaX * resolvedFootprint.forwardAxis.x +
        deltaZ * resolvedFootprint.forwardAxis.z
    );
  }

  positions.push(
    resolvedFootprint.center.x,
    resolveY(
      {
        x: resolvedFootprint.center.x,
        y: junction.center.y,
        z: resolvedFootprint.center.z
      },
      resolvedFootprint.center.fallbackY,
      resolvedFootprint.center.heightOffset
    ),
    resolvedFootprint.center.z
  );
  pushUv(resolvedFootprint.center.x, resolvedFootprint.center.z);

  for (const point of resolvedFootprint.points) {
    positions.push(
      point.x,
      resolveY(
        {
          x: point.x,
          y: point.fallbackY,
          z: point.z
        },
        point.fallbackY,
        point.heightOffset
      ),
      point.z
    );
    pushUv(point.x, point.z);
  }

  for (let index = 0; index < resolvedFootprint.points.length; index += 1) {
    const current = index + 1;
    const next =
      index === resolvedFootprint.points.length - 1 ? 1 : current + 1;

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
