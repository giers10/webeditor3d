import { BufferGeometry, Float32BufferAttribute } from "three";

import type { Vec3 } from "../core/vector";
import type { ScenePathRoadEdgeSettings } from "../document/paths";
import type { SplineCorridorJunction } from "../document/spline-corridor-junctions";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";
import {
  buildSplineCorridorJunctionFootprint,
  type SplineCorridorJunctionFootprint,
  type SplineCorridorJunctionFootprintPoint,
  type SplineCorridorJunctionFootprintPathLike
} from "./spline-corridor-junction-footprint";

export type SplineCorridorJunctionMeshPathLike =
  SplineCorridorJunctionFootprintPathLike;

export interface SplineCorridorJunctionEdgeMeshData {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  footprintPointCount: number;
  profileVertexCount: number;
}

interface JunctionEdgeProfilePoint {
  offsetRatio: number;
  heightOffset: number;
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

export function resolveSplineCorridorJunctionEdgeSettings<
  TPath extends SplineCorridorJunctionMeshPathLike
>(options: {
  junction: SplineCorridorJunction;
  paths: readonly TPath[];
}): TPath["road"]["edges"]["left"] | TPath["road"]["edges"]["right"] | null {
  const sides = ["left", "right"] as const;
  const enabledEdges: Array<
    TPath["road"]["edges"]["left"] | TPath["road"]["edges"]["right"]
  > = [];

  for (const connection of options.junction.connections) {
    const path =
      options.paths.find((candidate) => candidate.id === connection.pathId) ??
      null;

    if (path === null || !path.road.enabled) {
      continue;
    }

    for (const side of sides) {
      const edge = path.road.edges[side];

      if (edge.enabled && edge.width > 0) {
        enabledEdges.push(edge);
      }
    }
  }

  return (
    enabledEdges.find((edge) => edge.kind !== "softShoulder") ??
    enabledEdges[0] ??
    null
  );
}

function buildJunctionEdgeProfile(
  edge: ScenePathRoadEdgeSettings
): JunctionEdgeProfilePoint[] {
  switch (edge.kind) {
    case "curb":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 0, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "bank":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 1, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "ditch":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 0.5, heightOffset: -edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "softShoulder":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 1, heightOffset: 0 }
      ];
  }
}

function normalizeXZ(vector: { x: number; z: number }): { x: number; z: number } {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= 1e-8) {
    return {
      x: 1,
      z: 0
    };
  }

  return {
    x: vector.x / length,
    z: vector.z / length
  };
}

function getOutwardSegmentNormal(
  start: SplineCorridorJunctionFootprintPoint,
  end: SplineCorridorJunctionFootprintPoint
): { x: number; z: number } {
  const direction = normalizeXZ({
    x: end.x - start.x,
    z: end.z - start.z
  });

  // Footprints are generated counter-clockwise, so the right-hand normal is outward.
  return {
    x: direction.z,
    z: -direction.x
  };
}

function getMiteredOutwardOffset(options: {
  footprint: SplineCorridorJunctionFootprint;
  pointIndex: number;
  edgeWidth: number;
}): { x: number; z: number } {
  const points = options.footprint.points;
  const previous = points[(options.pointIndex - 1 + points.length) % points.length]!;
  const current = points[options.pointIndex]!;
  const next = points[(options.pointIndex + 1) % points.length]!;
  const previousNormal = getOutwardSegmentNormal(previous, current);
  const nextNormal = getOutwardSegmentNormal(current, next);
  const miter = normalizeXZ({
    x: previousNormal.x + nextNormal.x,
    z: previousNormal.z + nextNormal.z
  });
  const scale = Math.min(
    3,
    Math.max(1, 1 / Math.max(0.25, miter.x * nextNormal.x + miter.z * nextNormal.z))
  );

  return {
    x: miter.x * options.edgeWidth * scale,
    z: miter.z * options.edgeWidth * scale
  };
}

function getPerimeterDistances(
  points: readonly SplineCorridorJunctionFootprintPoint[]
): number[] {
  const distances = [0];

  for (let index = 1; index <= points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index % points.length]!;
    const previousDistance = distances[index - 1]!;

    distances.push(
      previousDistance + Math.hypot(current.x - previous.x, current.z - previous.z)
    );
  }

  return distances;
}

export function buildSplineCorridorJunctionEdgeMeshData(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  edge: ScenePathRoadEdgeSettings;
  terrains?: readonly Terrain[];
}): SplineCorridorJunctionEdgeMeshData | null {
  if (!options.edge.enabled || options.edge.width <= 0) {
    return null;
  }

  const terrains = options.terrains ?? [];
  const footprint = buildSplineCorridorJunctionFootprint({
    junction: options.junction,
    paths: options.paths,
    terrains
  });

  if (footprint === null || footprint.points.length < 3) {
    return null;
  }

  const conformToTerrain = shouldConformToTerrain({
    junction: options.junction,
    paths: options.paths
  });
  const profile = buildJunctionEdgeProfile(options.edge);

  if (profile.length < 2) {
    return null;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const perimeterDistances = getPerimeterDistances(footprint.points);
  const profileLastIndex = Math.max(1, profile.length - 1);

  function resolveBaseY(
    point: SplineCorridorJunctionFootprintPoint,
    x: number,
    z: number
  ): number {
    const terrainWorldY = conformToTerrain
      ? sampleHighestTerrainWorldY(terrains, {
          x,
          y: point.fallbackY,
          z
        })
      : null;

    return terrainWorldY === null
      ? point.fallbackY
      : terrainWorldY + point.heightOffset;
  }

  for (let pointIndex = 0; pointIndex <= footprint.points.length; pointIndex += 1) {
    const wrappedPointIndex = pointIndex % footprint.points.length;
    const point = footprint.points[wrappedPointIndex]!;
    const outwardOffset = getMiteredOutwardOffset({
      footprint,
      pointIndex: wrappedPointIndex,
      edgeWidth: options.edge.width
    });

    for (let profileIndex = 0; profileIndex < profile.length; profileIndex += 1) {
      const profilePoint = profile[profileIndex]!;
      const x = point.x + outwardOffset.x * profilePoint.offsetRatio;
      const z = point.z + outwardOffset.z * profilePoint.offsetRatio;
      const y = resolveBaseY(point, x, z) + profilePoint.heightOffset;

      positions.push(x, y, z);
      uvs.push(perimeterDistances[pointIndex]!, profileIndex / profileLastIndex);
    }
  }

  for (let pointIndex = 0; pointIndex < footprint.points.length; pointIndex += 1) {
    const currentRow = pointIndex * profile.length;
    const nextRow = currentRow + profile.length;

    for (let profileIndex = 0; profileIndex < profile.length - 1; profileIndex += 1) {
      const current = currentRow + profileIndex;
      const currentNext = current + 1;
      const next = nextRow + profileIndex;
      const nextNext = next + 1;

      indices.push(current, currentNext, next, next, currentNext, nextNext);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    footprintPointCount: footprint.points.length,
    profileVertexCount: profile.length
  };
}

export function buildSplineCorridorJunctionEdgeMeshGeometry(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  edge: ScenePathRoadEdgeSettings;
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const meshData = buildSplineCorridorJunctionEdgeMeshData(options);

  if (meshData === null) {
    return null;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(meshData.positions, 3)
  );
  geometry.setAttribute("uv", new Float32BufferAttribute(meshData.uvs, 2));
  geometry.setIndex([...meshData.indices]);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
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
