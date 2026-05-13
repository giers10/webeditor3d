import type { Vec3 } from "../core/vector";
import {
  createScenePathRoadEdgeSettings,
  resolveScenePath,
  sampleResolvedScenePathPosition,
  type ResolvedScenePath,
  type ResolvedScenePathSegment,
  type ScenePath,
  type ScenePathRoadEdgeSettings
} from "../document/paths";
import {
  createSplineCorridorJunction,
  getSplineCorridorJunctions,
  type SplineCorridorJunction,
  type SplineCorridorJunctionRegistry
} from "../document/spline-corridor-junctions";
import type { Terrain } from "../document/terrains";

import {
  mergeSplineCorridorPathClipIntervals,
  type SplineCorridorPathClipIntervalMap
} from "./spline-corridor-clips";

export interface SplineCorridorJunctionCandidateConnection {
  pathId: string;
  progress: number;
  clipDistance: number;
}

export interface SplineCorridorJunctionCandidate {
  id: string;
  center: Vec3;
  radius: number;
  materialId: string | null;
  edge: ScenePathRoadEdgeSettings;
  connections: SplineCorridorJunctionCandidateConnection[];
}

interface ResolvedRoadPath {
  path: ScenePath;
  resolved: ResolvedScenePath;
}

const MAX_VERTICAL_JUNCTION_DELTA = 2;
const ENDPOINT_JOIN_DISTANCE = 0.5;
const CANDIDATE_DEDUPE_DISTANCE = 0.6;
const EPSILON = 1e-6;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function getRoadInfluenceRadius(path: ScenePath): number {
  return path.road.width * 0.5 + path.road.shoulderWidth;
}

function getCandidateRadius(paths: readonly ScenePath[]): number {
  return Math.max(
    1.5,
    ...paths.map((path) => getRoadInfluenceRadius(path) * 1.15)
  );
}

function getCandidateEdge(paths: readonly ScenePath[]): ScenePathRoadEdgeSettings {
  const edges = paths.flatMap((path) => [
    path.road.edges.left,
    path.road.edges.right
  ]);
  const inheritedEdge =
    edges.find((edge) => edge.enabled && edge.kind !== "softShoulder") ??
    edges.find((edge) => edge.enabled) ??
    null;

  if (inheritedEdge === null) {
    return createScenePathRoadEdgeSettings();
  }

  return createScenePathRoadEdgeSettings(inheritedEdge);
}

function createCandidateId(
  connections: readonly SplineCorridorJunctionCandidateConnection[]
): string {
  return connections
    .map(
      (connection) =>
        `${connection.pathId}@${Math.round(connection.progress * 10000)}`
    )
    .sort()
    .join("|");
}

function distanceXZ(left: Vec3, right: Vec3): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function interpolateSegmentPosition(
  segment: ResolvedScenePathSegment,
  alpha: number
): Vec3 {
  return {
    x: lerp(segment.start.x, segment.end.x, alpha),
    y: lerp(segment.start.y, segment.end.y, alpha),
    z: lerp(segment.start.z, segment.end.z, alpha)
  };
}

function resolveSegmentProgress(
  path: ResolvedScenePath,
  segment: ResolvedScenePathSegment,
  alpha: number
): number {
  if (path.totalLength <= EPSILON) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      (segment.distanceStart + segment.length * alpha) / path.totalLength
    )
  );
}

function resolveSegmentIntersectionXZ(
  left: ResolvedScenePathSegment,
  right: ResolvedScenePathSegment
): { leftAlpha: number; rightAlpha: number; position: Vec3 } | null {
  const pX = left.start.x;
  const pZ = left.start.z;
  const rX = left.end.x - left.start.x;
  const rZ = left.end.z - left.start.z;
  const qX = right.start.x;
  const qZ = right.start.z;
  const sX = right.end.x - right.start.x;
  const sZ = right.end.z - right.start.z;
  const denominator = rX * sZ - rZ * sX;

  if (Math.abs(denominator) <= EPSILON) {
    return null;
  }

  const qMinusPX = qX - pX;
  const qMinusPZ = qZ - pZ;
  const leftAlpha = (qMinusPX * sZ - qMinusPZ * sX) / denominator;
  const rightAlpha = (qMinusPX * rZ - qMinusPZ * rX) / denominator;

  if (
    leftAlpha < -EPSILON ||
    leftAlpha > 1 + EPSILON ||
    rightAlpha < -EPSILON ||
    rightAlpha > 1 + EPSILON
  ) {
    return null;
  }

  const clampedLeftAlpha = Math.min(1, Math.max(0, leftAlpha));

  return {
    leftAlpha: clampedLeftAlpha,
    rightAlpha: Math.min(1, Math.max(0, rightAlpha)),
    position: interpolateSegmentPosition(left, clampedLeftAlpha)
  };
}

function areSamePathSegmentsAdjacent(options: {
  path: ResolvedScenePath;
  left: ResolvedScenePathSegment;
  right: ResolvedScenePathSegment;
}): boolean {
  const indexDelta = Math.abs(options.left.index - options.right.index);

  if (indexDelta <= 1) {
    return true;
  }

  return (
    options.path.loop &&
    indexDelta === Math.max(0, options.path.segments.length - 1)
  );
}

function createCandidateFromConnections(options: {
  center: Vec3;
  paths: readonly ScenePath[];
  connections: readonly Omit<
    SplineCorridorJunctionCandidateConnection,
    "clipDistance"
  >[];
}): SplineCorridorJunctionCandidate {
  const radius = getCandidateRadius(options.paths);
  const connections = options.connections.map((connection) => ({
    ...connection,
    clipDistance: radius
  }));

  return {
    id: createCandidateId(connections),
    center: cloneVec3(options.center),
    radius,
    materialId:
      options.paths.find((path) => path.road.materialId !== null)?.road
        .materialId ?? null,
    edge: getCandidateEdge(options.paths),
    connections
  };
}

function resolveRoadPaths(options: {
  paths: readonly ScenePath[];
  terrains?: readonly Terrain[];
}): ResolvedRoadPath[] {
  const terrains = options.terrains ?? [];

  return options.paths
    .filter((path) => path.enabled && path.visible && path.road.enabled)
    .map((path) => ({
      path,
      resolved: resolveScenePath(path, { terrains })
    }))
    .filter((path) => path.resolved.totalLength > EPSILON);
}

function candidateCoveredByExistingJunction(options: {
  candidate: SplineCorridorJunctionCandidate;
  existingJunctions: readonly SplineCorridorJunction[];
  resolvedPaths: ReadonlyMap<string, ResolvedRoadPath>;
}): boolean {
  return options.existingJunctions.some((junction) => {
    let coveredConnections = 0;

    for (const candidateConnection of options.candidate.connections) {
      const resolvedPath = options.resolvedPaths.get(candidateConnection.pathId);

      if (resolvedPath === undefined) {
        continue;
      }

      const matchingConnection = junction.connections.find((connection) => {
        if (connection.pathId !== candidateConnection.pathId) {
          return false;
        }

        const distanceDelta =
          Math.abs(connection.progress - candidateConnection.progress) *
          resolvedPath.resolved.totalLength;

        return (
          distanceDelta <=
          Math.max(connection.clipDistance, candidateConnection.clipDistance)
        );
      });

      if (matchingConnection !== undefined) {
        coveredConnections += 1;
      }
    }

    return coveredConnections >= Math.min(2, options.candidate.connections.length);
  });
}

function isDuplicateCandidate(
  candidate: SplineCorridorJunctionCandidate,
  existingCandidates: readonly SplineCorridorJunctionCandidate[]
): boolean {
  return existingCandidates.some((existingCandidate) => {
    if (distanceXZ(candidate.center, existingCandidate.center) > CANDIDATE_DEDUPE_DISTANCE) {
      return false;
    }

    const candidatePaths = new Set(
      candidate.connections.map((connection) => connection.pathId)
    );
    const sharedPathCount = existingCandidate.connections.filter((connection) =>
      candidatePaths.has(connection.pathId)
    ).length;

    return sharedPathCount >= 2;
  });
}

function addCandidate(
  candidates: SplineCorridorJunctionCandidate[],
  candidate: SplineCorridorJunctionCandidate
) {
  if (!isDuplicateCandidate(candidate, candidates)) {
    candidates.push(candidate);
  }
}

function addIntersectionCandidates(
  candidates: SplineCorridorJunctionCandidate[],
  resolvedPaths: readonly ResolvedRoadPath[]
) {
  for (let leftPathIndex = 0; leftPathIndex < resolvedPaths.length; leftPathIndex += 1) {
    const leftPath = resolvedPaths[leftPathIndex]!;

    for (let rightPathIndex = leftPathIndex; rightPathIndex < resolvedPaths.length; rightPathIndex += 1) {
      const rightPath = resolvedPaths[rightPathIndex]!;
      const samePath = leftPath.path.id === rightPath.path.id;

      for (const leftSegment of leftPath.resolved.segments) {
        for (const rightSegment of rightPath.resolved.segments) {
          if (samePath) {
            if (leftSegment.index >= rightSegment.index) {
              continue;
            }

            if (
              areSamePathSegmentsAdjacent({
                path: leftPath.resolved,
                left: leftSegment,
                right: rightSegment
              })
            ) {
              continue;
            }
          }

          const intersection = resolveSegmentIntersectionXZ(
            leftSegment,
            rightSegment
          );

          if (intersection === null) {
            continue;
          }

          const leftPosition = interpolateSegmentPosition(
            leftSegment,
            intersection.leftAlpha
          );
          const rightPosition = interpolateSegmentPosition(
            rightSegment,
            intersection.rightAlpha
          );

          if (
            Math.abs(leftPosition.y - rightPosition.y) >
            MAX_VERTICAL_JUNCTION_DELTA
          ) {
            continue;
          }

          const leftProgress = resolveSegmentProgress(
            leftPath.resolved,
            leftSegment,
            intersection.leftAlpha
          );
          const rightProgress = resolveSegmentProgress(
            rightPath.resolved,
            rightSegment,
            intersection.rightAlpha
          );
          addCandidate(
            candidates,
            createCandidateFromConnections({
              center: {
                x: intersection.position.x,
                y: (leftPosition.y + rightPosition.y) * 0.5,
                z: intersection.position.z
              },
              paths: samePath
                ? [leftPath.path]
                : [leftPath.path, rightPath.path],
              connections: [
                {
                  pathId: leftPath.path.id,
                  progress: leftProgress
                },
                {
                  pathId: rightPath.path.id,
                  progress: rightProgress
                }
              ]
            })
          );
        }
      }
    }
  }
}

function getEndpointConnections(path: ResolvedRoadPath) {
  const first = sampleResolvedScenePathPosition(path.resolved, 0);
  const last = sampleResolvedScenePathPosition(path.resolved, 1);

  return [
    {
      path,
      progress: 0,
      position: first
    },
    {
      path,
      progress: 1,
      position: last
    }
  ];
}

function addEndpointJoinCandidates(
  candidates: SplineCorridorJunctionCandidate[],
  resolvedPaths: readonly ResolvedRoadPath[]
) {
  const endpoints = resolvedPaths.flatMap(getEndpointConnections);

  for (let leftIndex = 0; leftIndex < endpoints.length; leftIndex += 1) {
    const left = endpoints[leftIndex]!;

    for (let rightIndex = leftIndex + 1; rightIndex < endpoints.length; rightIndex += 1) {
      const right = endpoints[rightIndex]!;

      if (left.path.path.id === right.path.path.id) {
        continue;
      }

      if (distanceXZ(left.position, right.position) > ENDPOINT_JOIN_DISTANCE) {
        continue;
      }

      if (
        Math.abs(left.position.y - right.position.y) >
        MAX_VERTICAL_JUNCTION_DELTA
      ) {
        continue;
      }

      addCandidate(
        candidates,
        createCandidateFromConnections({
          center: {
            x: (left.position.x + right.position.x) * 0.5,
            y: (left.position.y + right.position.y) * 0.5,
            z: (left.position.z + right.position.z) * 0.5
          },
          paths: [left.path.path, right.path.path],
          connections: [
            {
              pathId: left.path.path.id,
              progress: left.progress
            },
            {
              pathId: right.path.path.id,
              progress: right.progress
            }
          ]
        })
      );
    }
  }
}

export function detectSplineCorridorJunctionCandidates(options: {
  paths: readonly ScenePath[];
  junctions?: SplineCorridorJunctionRegistry;
  terrains?: readonly Terrain[];
}): SplineCorridorJunctionCandidate[] {
  const resolvedPaths = resolveRoadPaths(options);
  const resolvedPathMap = new Map(
    resolvedPaths.map((path) => [path.path.id, path])
  );
  const candidates: SplineCorridorJunctionCandidate[] = [];

  addIntersectionCandidates(candidates, resolvedPaths);
  addEndpointJoinCandidates(candidates, resolvedPaths);

  const existingJunctions = getSplineCorridorJunctions(options.junctions ?? {});

  return candidates.filter(
    (candidate) =>
      !candidateCoveredByExistingJunction({
        candidate,
        existingJunctions,
        resolvedPaths: resolvedPathMap
      })
  );
}

export function createSplineCorridorJunctionFromCandidate(
  candidate: SplineCorridorJunctionCandidate
): SplineCorridorJunction {
  return createSplineCorridorJunction({
    center: candidate.center,
    radius: candidate.radius,
    materialId: candidate.materialId,
    edge: candidate.edge,
    connections: candidate.connections
  });
}

export function resolveSplineCorridorJunctionClipIntervals(options: {
  paths: readonly ScenePath[];
  junctions: readonly SplineCorridorJunction[];
  terrains?: readonly Terrain[];
}): SplineCorridorPathClipIntervalMap {
  const resolvedPaths = new Map(
    resolveRoadPaths({
      paths: options.paths,
      terrains: options.terrains
    }).map((path) => [path.path.id, path])
  );
  const intervalsByPath: SplineCorridorPathClipIntervalMap = new Map();

  for (const junction of options.junctions) {
    if (!junction.enabled) {
      continue;
    }

    for (const connection of junction.connections) {
      const resolvedPath = resolvedPaths.get(connection.pathId);

      if (resolvedPath === undefined) {
        continue;
      }

      const centerDistance =
        connection.progress * resolvedPath.resolved.totalLength;
      const interval = {
        junctionId: junction.id,
        startDistance: Math.max(0, centerDistance - connection.clipDistance),
        endDistance: Math.min(
          resolvedPath.resolved.totalLength,
          centerDistance + connection.clipDistance
        )
      };
      const intervals = intervalsByPath.get(connection.pathId) ?? [];

      intervals.push(interval);
      intervalsByPath.set(connection.pathId, intervals);
    }
  }

  for (const [pathId, intervals] of intervalsByPath) {
    intervalsByPath.set(pathId, mergeSplineCorridorPathClipIntervals(intervals));
  }

  return intervalsByPath;
}

export function getSplineCorridorJunctionsConnectedToPath(options: {
  junctions: SplineCorridorJunctionRegistry;
  pathId: string;
}): SplineCorridorJunction[] {
  return getSplineCorridorJunctions(options.junctions).filter((junction) =>
    junction.connections.some((connection) => connection.pathId === options.pathId)
  );
}
