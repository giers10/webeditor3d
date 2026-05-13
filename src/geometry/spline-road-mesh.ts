import { BufferGeometry, Float32BufferAttribute } from "three";

import type { Vec3 } from "../core/vector";
import {
  resolveScenePath,
  type ScenePathCurveMode,
  type ScenePathRoadEdgeSettings,
  type ScenePathRoadEdgeSide,
  type ScenePathPoint,
  type ScenePathRoadSettings
} from "../document/paths";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";

export interface SplineRoadPathPointLike {
  id?: string;
  pointId?: string;
  position: Vec3;
}

export interface SplineRoadPathLike {
  id: string;
  loop: boolean;
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
  road: ScenePathRoadSettings;
  points: readonly SplineRoadPathPointLike[];
}

export interface SplineRoadMeshData {
  pathId: string;
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  stationCount: number;
  totalLength: number;
}

export interface SplineRoadEdgeMeshData extends SplineRoadMeshData {
  side: ScenePathRoadEdgeSide;
}

interface RoadStation {
  center: Vec3;
  distance: number;
  tangent: Vec3;
}

interface EdgeProfilePoint {
  offset: number;
  heightOffset: number;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizeHorizontalVector(vector: Vec3): Vec3 | null {
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

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function normalizePathPoint(
  point: SplineRoadPathPointLike,
  index: number
): ScenePathPoint {
  return {
    id: point.id ?? point.pointId ?? `road-point-${index}`,
    position: cloneVec3(point.position)
  };
}

function sampleHighestTerrainWorldY(
  terrains: readonly Terrain[],
  point: Vec3
): number | null {
  let highestWorldY: number | null = null;

  for (const terrain of terrains) {
    const terrainHeight = sampleTerrainHeightAtWorldPosition(
      terrain,
      point.x,
      point.z,
      false
    );

    if (terrainHeight === null) {
      continue;
    }

    const worldY = terrain.position.y + terrainHeight;

    if (highestWorldY === null || worldY > highestWorldY) {
      highestWorldY = worldY;
    }
  }

  return highestWorldY;
}

function resolveRoadVertexPosition(options: {
  path: SplineRoadPathLike;
  terrains: readonly Terrain[];
  point: Vec3;
  fallbackY: number;
}): Vec3 {
  const terrainWorldY = options.path.road.terrainConform
    ? sampleHighestTerrainWorldY(options.terrains, options.point)
    : null;

  return {
    x: options.point.x,
    y: (terrainWorldY ?? options.fallbackY) + options.path.road.heightOffset,
    z: options.point.z
  };
}

function resolveStationTangent(
  stations: readonly RoadStation[],
  index: number
): Vec3 | null {
  const previousStation = stations[index - 1] ?? null;
  const currentStation = stations[index];
  const nextStation = stations[index + 1] ?? null;

  if (currentStation === undefined) {
    return null;
  }

  if (previousStation !== null && nextStation !== null) {
    return (
      normalizeHorizontalVector(
        subtractVec3(nextStation.center, previousStation.center)
      ) ??
      normalizeHorizontalVector(
        addVec3(previousStation.tangent, nextStation.tangent)
      )
    );
  }

  return normalizeHorizontalVector(currentStation.tangent);
}

function buildRoadStations(
  path: SplineRoadPathLike,
  terrains: readonly Terrain[]
): RoadStation[] {
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
  const stations: RoadStation[] = [];

  for (const segment of resolvedPath.segments) {
    if (segment.length <= 1e-8) {
      continue;
    }

    if (stations.length === 0) {
      stations.push({
        center: cloneVec3(segment.start),
        distance: segment.distanceStart,
        tangent: cloneVec3(segment.tangent)
      });
    }

    stations.push({
      center: cloneVec3(segment.end),
      distance: segment.distanceEnd,
      tangent: cloneVec3(segment.tangent)
    });
  }

  return stations;
}

function createGeometryFromMeshData(meshData: SplineRoadMeshData) {
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

function buildEdgeProfile(options: {
  edge: ScenePathRoadEdgeSettings;
  side: ScenePathRoadEdgeSide;
  roadHalfWidth: number;
}): EdgeProfilePoint[] {
  const sideSign = options.side === "left" ? 1 : -1;
  const innerOffset = sideSign * options.roadHalfWidth;
  const outerOffset = sideSign * (options.roadHalfWidth + options.edge.width);
  const edgeHeight = options.edge.height;

  switch (options.edge.kind) {
    case "curb":
      return [
        { offset: innerOffset, heightOffset: 0 },
        { offset: innerOffset, heightOffset: edgeHeight },
        { offset: outerOffset, heightOffset: edgeHeight },
        { offset: outerOffset, heightOffset: 0 }
      ];
    case "bank":
      return [
        { offset: innerOffset, heightOffset: 0 },
        { offset: outerOffset, heightOffset: edgeHeight }
      ];
    case "ditch":
      return [
        { offset: innerOffset, heightOffset: 0 },
        { offset: outerOffset, heightOffset: -edgeHeight }
      ];
    case "softShoulder":
      return [
        { offset: innerOffset, heightOffset: 0 },
        { offset: outerOffset, heightOffset: 0 }
      ];
  }
}

function addEdgeProfileCaps(options: {
  indices: number[];
  profileVertexCount: number;
  stationCount: number;
}) {
  if (options.profileVertexCount < 3 || options.stationCount < 2) {
    return;
  }

  const lastRow = (options.stationCount - 1) * options.profileVertexCount;

  for (let index = 1; index < options.profileVertexCount - 1; index += 1) {
    // Start cap faces backward along the spline; end cap faces forward.
    options.indices.push(0, index + 1, index);
    options.indices.push(lastRow, lastRow + index, lastRow + index + 1);
  }
}

export function buildSplineRoadMeshData(options: {
  path: SplineRoadPathLike;
  terrains?: readonly Terrain[];
}): SplineRoadMeshData | null {
  const { path } = options;
  const terrains = options.terrains ?? [];
  const stations = buildRoadStations(path, terrains);

  if (!path.road.enabled || path.road.width <= 0 || stations.length < 2) {
    return null;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfWidth = path.road.width * 0.5;

  for (let index = 0; index < stations.length; index += 1) {
    const station = stations[index]!;
    const tangent = resolveStationTangent(stations, index);

    if (tangent === null) {
      return null;
    }

    const perpendicular = {
      x: -tangent.z * halfWidth,
      y: 0,
      z: tangent.x * halfWidth
    };
    const left = resolveRoadVertexPosition({
      path,
      terrains,
      point: addVec3(station.center, perpendicular),
      fallbackY: station.center.y
    });
    const right = resolveRoadVertexPosition({
      path,
      terrains,
      point: subtractVec3(station.center, perpendicular),
      fallbackY: station.center.y
    });

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, station.distance, 1, station.distance);
  }

  for (let index = 0; index < stations.length - 1; index += 1) {
    const left = index * 2;
    const right = left + 1;
    const nextLeft = left + 2;
    const nextRight = left + 3;

    indices.push(left, right, nextLeft, nextLeft, right, nextRight);
  }

  return {
    pathId: path.id,
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    stationCount: stations.length,
    totalLength: stations[stations.length - 1]?.distance ?? 0
  };
}

export function buildSplineRoadMeshGeometry(options: {
  path: SplineRoadPathLike;
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const meshData = buildSplineRoadMeshData(options);

  if (meshData === null) {
    return null;
  }

  return createGeometryFromMeshData(meshData);
}

export function buildSplineRoadEdgeMeshData(options: {
  path: SplineRoadPathLike;
  side: ScenePathRoadEdgeSide;
  terrains?: readonly Terrain[];
}): SplineRoadEdgeMeshData | null {
  const { path, side } = options;
  const edge = path.road.edges[side];
  const terrains = options.terrains ?? [];
  const stations = buildRoadStations(path, terrains);

  if (
    !path.road.enabled ||
    !edge.enabled ||
    edge.width <= 0 ||
    path.road.width <= 0 ||
    stations.length < 2
  ) {
    return null;
  }

  const profile = buildEdgeProfile({
    edge,
    side,
    roadHalfWidth: path.road.width * 0.5
  });

  if (profile.length < 2) {
    return null;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const profileLastIndex = Math.max(1, profile.length - 1);

  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    const station = stations[stationIndex]!;
    const tangent = resolveStationTangent(stations, stationIndex);

    if (tangent === null) {
      return null;
    }

    const leftDirection = {
      x: -tangent.z,
      y: 0,
      z: tangent.x
    };

    for (let profileIndex = 0; profileIndex < profile.length; profileIndex += 1) {
      const profilePoint = profile[profileIndex]!;
      const edgePoint = addVec3(station.center, {
        x: leftDirection.x * profilePoint.offset,
        y: 0,
        z: leftDirection.z * profilePoint.offset
      });
      const vertex = resolveRoadVertexPosition({
        path,
        terrains,
        point: edgePoint,
        fallbackY: station.center.y
      });

      positions.push(
        vertex.x,
        vertex.y + profilePoint.heightOffset,
        vertex.z
      );
      uvs.push(profileIndex / profileLastIndex, station.distance);
    }
  }

  for (let stationIndex = 0; stationIndex < stations.length - 1; stationIndex += 1) {
    const currentRow = stationIndex * profile.length;
    const nextRow = currentRow + profile.length;

    for (let profileIndex = 0; profileIndex < profile.length - 1; profileIndex += 1) {
      const current = currentRow + profileIndex;
      const currentNext = current + 1;
      const next = nextRow + profileIndex;
      const nextNext = next + 1;

      indices.push(current, currentNext, next, next, currentNext, nextNext);
    }
  }

  if (edge.kind === "curb") {
    addEdgeProfileCaps({
      indices,
      profileVertexCount: profile.length,
      stationCount: stations.length
    });
  }

  return {
    pathId: path.id,
    side,
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    stationCount: stations.length,
    totalLength: stations[stations.length - 1]?.distance ?? 0
  };
}

export function buildSplineRoadEdgeMeshGeometry(options: {
  path: SplineRoadPathLike;
  side: ScenePathRoadEdgeSide;
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const meshData = buildSplineRoadEdgeMeshData(options);

  if (meshData === null) {
    return null;
  }

  return createGeometryFromMeshData(meshData);
}
