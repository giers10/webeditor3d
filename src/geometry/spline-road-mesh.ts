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
import type {
  SplineCorridorPathClipInterval,
  SplineCorridorRoadEdgeSeam
} from "../spline-corridor/spline-corridor-clips";

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

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
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

function interpolateStation(
  start: RoadStation,
  end: RoadStation,
  distance: number
): RoadStation {
  const length = end.distance - start.distance;
  const alpha = length <= 1e-8 ? 0 : (distance - start.distance) / length;

  return {
    center: {
      x: lerp(start.center.x, end.center.x, alpha),
      y: lerp(start.center.y, end.center.y, alpha),
      z: lerp(start.center.z, end.center.z, alpha)
    },
    distance,
    tangent: cloneVec3(start.tangent)
  };
}

function subtractClipIntervalsFromRange(
  startDistance: number,
  endDistance: number,
  clipIntervals: readonly SplineCorridorPathClipInterval[]
): Array<{ startDistance: number; endDistance: number }> {
  let ranges = [{ startDistance, endDistance }];

  for (const clipInterval of clipIntervals) {
    const nextRanges: typeof ranges = [];

    for (const range of ranges) {
      if (
        clipInterval.endDistance <= range.startDistance ||
        clipInterval.startDistance >= range.endDistance
      ) {
        nextRanges.push(range);
        continue;
      }

      if (clipInterval.startDistance > range.startDistance) {
        nextRanges.push({
          startDistance: range.startDistance,
          endDistance: Math.min(clipInterval.startDistance, range.endDistance)
        });
      }

      if (clipInterval.endDistance < range.endDistance) {
        nextRanges.push({
          startDistance: Math.max(clipInterval.endDistance, range.startDistance),
          endDistance: range.endDistance
        });
      }
    }

    ranges = nextRanges;
  }

  return ranges.filter(
    (range) => range.endDistance - range.startDistance > 1e-8
  );
}

function buildVisibleRoadStationRuns(
  stations: readonly RoadStation[],
  clipIntervals: readonly SplineCorridorPathClipInterval[]
): RoadStation[][] {
  if (clipIntervals.length === 0) {
    return [[...stations]];
  }

  const runs: RoadStation[][] = [];
  let currentRun: RoadStation[] = [];

  for (let index = 0; index < stations.length - 1; index += 1) {
    const start = stations[index]!;
    const end = stations[index + 1]!;

    if (end.distance - start.distance <= 1e-8) {
      continue;
    }

    const visibleRanges = subtractClipIntervalsFromRange(
      start.distance,
      end.distance,
      clipIntervals
    );

    for (const range of visibleRanges) {
      const rangeStart = interpolateStation(start, end, range.startDistance);
      const rangeEnd = interpolateStation(start, end, range.endDistance);
      const previous = currentRun[currentRun.length - 1];

      if (
        previous === undefined ||
        Math.abs(previous.distance - rangeStart.distance) > 1e-6
      ) {
        if (currentRun.length >= 2) {
          runs.push(currentRun);
        }
        currentRun = [rangeStart];
      }

      currentRun.push(rangeEnd);
    }
  }

  if (currentRun.length >= 2) {
    runs.push(currentRun);
  }

  return runs;
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
        { offset: outerOffset, heightOffset: edgeHeight },
        { offset: outerOffset, heightOffset: 0 }
      ];
    case "ditch": {
      const middleOffset = (innerOffset + outerOffset) * 0.5;

      return [
        { offset: innerOffset, heightOffset: 0 },
        { offset: middleOffset, heightOffset: -edgeHeight },
        { offset: outerOffset, heightOffset: 0 }
      ];
    }
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
  vertexOffset: number;
  stationCount: number;
  capStart: boolean;
  capEnd: boolean;
}) {
  if (options.profileVertexCount < 3 || options.stationCount < 2) {
    return;
  }

  const lastRow =
    options.vertexOffset + (options.stationCount - 1) * options.profileVertexCount;

  for (let index = 1; index < options.profileVertexCount - 1; index += 1) {
    if (options.capStart) {
      // Start cap faces backward along the spline.
      options.indices.push(
        options.vertexOffset,
        options.vertexOffset + index + 1,
        options.vertexOffset + index
      );
    }

    if (options.capEnd) {
      // End caps face forward, but clipped junction ends stay open for junction edge handoff.
      options.indices.push(lastRow, lastRow + index, lastRow + index + 1);
    }
  }
}

function isClipBoundaryDistance(
  distance: number,
  clipIntervals: readonly SplineCorridorPathClipInterval[]
): boolean {
  return clipIntervals.some(
    (clipInterval) =>
      Math.abs(distance - clipInterval.startDistance) <= 1e-6 ||
      Math.abs(distance - clipInterval.endDistance) <= 1e-6
  );
}

function findRoadEdgeSeam(options: {
  distance: number;
  side: ScenePathRoadEdgeSide;
  seams: readonly SplineCorridorRoadEdgeSeam[];
}): SplineCorridorRoadEdgeSeam | null {
  return (
    options.seams.find(
      (seam) =>
        seam.side === options.side &&
        Math.abs(seam.distance - options.distance) <= 1e-6
    ) ?? null
  );
}

export function buildSplineRoadMeshData(options: {
  path: SplineRoadPathLike;
  terrains?: readonly Terrain[];
  clipIntervals?: readonly SplineCorridorPathClipInterval[];
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
  const stationRuns = buildVisibleRoadStationRuns(
    stations,
    options.clipIntervals ?? []
  );
  let stationCount = 0;

  for (const run of stationRuns) {
    const runVertexOffset = positions.length / 3;

    for (let index = 0; index < run.length; index += 1) {
      const station = run[index]!;
      const tangent = resolveStationTangent(run, index);

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

    for (let index = 0; index < run.length - 1; index += 1) {
      const left = runVertexOffset + index * 2;
      const right = left + 1;
      const nextLeft = left + 2;
      const nextRight = left + 3;

      indices.push(left, right, nextLeft, nextLeft, right, nextRight);
    }

    stationCount += run.length;
  }

  if (positions.length === 0) {
    return null;
  }

  return {
    pathId: path.id,
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    stationCount,
    totalLength: stations[stations.length - 1]?.distance ?? 0
  };
}

export function buildSplineRoadMeshGeometry(options: {
  path: SplineRoadPathLike;
  terrains?: readonly Terrain[];
  clipIntervals?: readonly SplineCorridorPathClipInterval[];
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
  clipIntervals?: readonly SplineCorridorPathClipInterval[];
  junctionEdgeSeams?: readonly SplineCorridorRoadEdgeSeam[];
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
  const edgeClipIntervals = options.clipIntervals ?? [];
  const stationRuns = buildVisibleRoadStationRuns(stations, edgeClipIntervals);
  let stationCount = 0;

  for (const run of stationRuns) {
    const runVertexOffset = positions.length / 3;

    for (let stationIndex = 0; stationIndex < run.length; stationIndex += 1) {
      const station = run[stationIndex]!;
      const tangent = resolveStationTangent(run, stationIndex);

      if (tangent === null) {
        return null;
      }

      const leftDirection = {
        x: -tangent.z,
        y: 0,
        z: tangent.x
      };
      const sideSign = side === "left" ? 1 : -1;
      const innerOffset = sideSign * path.road.width * 0.5;
      const seam = findRoadEdgeSeam({
        distance: station.distance,
        side,
        seams: options.junctionEdgeSeams ?? []
      });
      const seamInnerPoint =
        seam === null
          ? null
          : addVec3(station.center, {
              x: leftDirection.x * innerOffset,
              y: 0,
              z: leftDirection.z * innerOffset
            });

      for (let profileIndex = 0; profileIndex < profile.length; profileIndex += 1) {
        const profilePoint = profile[profileIndex]!;
        const profileOffsetRatio =
          edge.width <= 1e-8
            ? 0
            : (profilePoint.offset - innerOffset) / (sideSign * edge.width);
        const edgePoint =
          seam === null || seamInnerPoint === null
            ? addVec3(station.center, {
                x: leftDirection.x * profilePoint.offset,
                y: 0,
                z: leftDirection.z * profilePoint.offset
              })
            : {
                x: seamInnerPoint.x + seam.outerOffset.x * profileOffsetRatio,
                y: seamInnerPoint.y,
                z: seamInnerPoint.z + seam.outerOffset.z * profileOffsetRatio
              };
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

    for (let stationIndex = 0; stationIndex < run.length - 1; stationIndex += 1) {
      const currentRow = runVertexOffset + stationIndex * profile.length;
      const nextRow = currentRow + profile.length;

      for (let profileIndex = 0; profileIndex < profile.length - 1; profileIndex += 1) {
        const current = currentRow + profileIndex;
        const currentNext = current + 1;
        const next = nextRow + profileIndex;
        const nextNext = next + 1;

        indices.push(current, currentNext, next, next, currentNext, nextNext);
      }
    }

    if (edge.kind !== "softShoulder") {
      addEdgeProfileCaps({
        indices,
        profileVertexCount: profile.length,
        vertexOffset: runVertexOffset,
        stationCount: run.length,
        capStart: !isClipBoundaryDistance(run[0]!.distance, edgeClipIntervals),
        capEnd: !isClipBoundaryDistance(
          run[run.length - 1]!.distance,
          edgeClipIntervals
        )
      });
    }

    stationCount += run.length;
  }

  if (positions.length === 0) {
    return null;
  }

  return {
    pathId: path.id,
    side,
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    stationCount,
    totalLength: stations[stations.length - 1]?.distance ?? 0
  };
}

export function buildSplineRoadEdgeMeshGeometry(options: {
  path: SplineRoadPathLike;
  side: ScenePathRoadEdgeSide;
  terrains?: readonly Terrain[];
  clipIntervals?: readonly SplineCorridorPathClipInterval[];
}): BufferGeometry | null {
  const meshData = buildSplineRoadEdgeMeshData(options);

  if (meshData === null) {
    return null;
  }

  return createGeometryFromMeshData(meshData);
}
