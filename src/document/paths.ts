import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";

export interface ScenePathPoint {
  id: string;
  position: Vec3;
}

export interface ScenePath {
  id: string;
  kind: "path";
  name?: string;
  visible: boolean;
  enabled: boolean;
  loop: boolean;
  points: ScenePathPoint[];
}

export interface ResolvedScenePathSegment {
  index: number;
  startPointId: string;
  endPointId: string;
  start: Vec3;
  end: Vec3;
  length: number;
  distanceStart: number;
  distanceEnd: number;
  tangent: Vec3;
}

export interface ResolvedScenePath {
  loop: boolean;
  points: ScenePathPoint[];
  segments: ResolvedScenePathSegment[];
  totalLength: number;
}

export interface ResolvedScenePathProjectionSource {
  loop: boolean;
  points: Array<{
    position: Vec3;
  }>;
  segments: Array<
    Pick<
      ResolvedScenePathSegment,
      | "index"
      | "start"
      | "end"
      | "length"
      | "distanceStart"
      | "distanceEnd"
      | "tangent"
    >
  >;
  totalLength: number;
}

export interface ResolvedScenePathNearestPoint {
  progress: number;
  distance: number;
  distanceAlongPath: number;
  segmentIndex: number | null;
  position: Vec3;
  tangent: Vec3;
}

export interface ProjectedWorldSegmentPoint {
  progress: number;
  distance: number;
  position: Vec3;
}

export interface MappedScenePathProgressBetweenWorldPoints {
  trackProgress: number;
  railProgress: number;
  projectedTrackPosition: Vec3;
}

interface PathPointLike {
  position: Vec3;
}

interface ResolvedPathSegmentLike {
  start: Vec3;
  end: Vec3;
  length: number;
  distanceStart: number;
  distanceEnd: number;
  tangent: Vec3;
}

interface ResolvedPathLike<
  TPoint extends PathPointLike = ScenePathPoint,
  TSegment extends ResolvedPathSegmentLike = ResolvedScenePathSegment
> {
  loop: boolean;
  points: TPoint[];
  segments: TSegment[];
  totalLength: number;
}

interface SmoothedPathSample {
  distance: number;
  position: Vec3;
  tangent: Vec3;
}

export const DEFAULT_SCENE_PATH_VISIBLE = true;
export const DEFAULT_SCENE_PATH_ENABLED = true;
export const DEFAULT_SCENE_PATH_LOOP = false;
export const MIN_SCENE_PATH_POINT_COUNT = 2;

const DEFAULT_SCENE_PATH_POINT_POSITIONS: ReadonlyArray<Vec3> = [
  {
    x: -1,
    y: 0,
    z: 0
  },
  {
    x: 1,
    y: 0,
    z: 0
  }
];

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function assertFiniteVec3(vector: Vec3, label: string) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} must remain finite on every axis.`);
  }
}

function normalizeDelta(delta: Vec3): Vec3 {
  const length = Math.hypot(delta.x, delta.y, delta.z);

  if (length <= 0) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  return {
    x: delta.x / length,
    y: delta.y / length,
    z: delta.z / length
  };
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function getVec3Distance(left: Vec3, right: Vec3): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    throw new Error("Path progress must be a finite number.");
  }

  if (progress <= 0) {
    return 0;
  }

  if (progress >= 1) {
    return 1;
  }

  return progress;
}

function resolvePathSegmentSample(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number
): { segmentIndex: number | null; distance: number } {
  if (path.segments.length === 0 || path.totalLength <= 0) {
    return {
      segmentIndex: null,
      distance: 0
    };
  }

  const distance = clampProgress(progress) * path.totalLength;

  if (distance >= path.totalLength) {
    return {
      segmentIndex: path.segments.length - 1,
      distance
    };
  }

  const segmentIndex = path.segments.findIndex(
    (segment) => distance <= segment.distanceEnd
  );

  return {
    segmentIndex: segmentIndex === -1 ? path.segments.length - 1 : segmentIndex,
    distance
  };
}

function findNonZeroSegmentTangent(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  index: number
): Vec3 {
  for (let candidateIndex = index; candidateIndex < path.segments.length; candidateIndex += 1) {
    const candidate = path.segments[candidateIndex];

    if (candidate !== undefined && candidate.length > 0) {
      return cloneVec3(candidate.tangent);
    }
  }

  for (let candidateIndex = index - 1; candidateIndex >= 0; candidateIndex -= 1) {
    const candidate = path.segments[candidateIndex];

    if (candidate !== undefined && candidate.length > 0) {
      return cloneVec3(candidate.tangent);
    }
  }

  return {
    x: 0,
    y: 0,
    z: 0
  };
}

const SMOOTH_PATH_CORNER_CUTTING_PASSES = 3;

function lerpVec3(start: Vec3, end: Vec3, t: number): Vec3 {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t
  };
}

function buildSmoothedPolylinePoints(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>
): Vec3[] {
  let points = path.points.map((point) => cloneVec3(point.position));

  for (
    let passIndex = 0;
    passIndex < SMOOTH_PATH_CORNER_CUTTING_PASSES;
    passIndex += 1
  ) {
    if (points.length < 2) {
      return points;
    }

    const refined: Vec3[] = [];

    if (path.loop) {
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
        const start = points[pointIndex]!;
        const end = points[(pointIndex + 1) % points.length]!;

        refined.push(lerpVec3(start, end, 0.25));
        refined.push(lerpVec3(start, end, 0.75));
      }
    } else {
      refined.push(cloneVec3(points[0]!));

      for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
        const start = points[pointIndex]!;
        const end = points[pointIndex + 1]!;

        refined.push(lerpVec3(start, end, 0.25));
        refined.push(lerpVec3(start, end, 0.75));
      }

      refined.push(cloneVec3(points[points.length - 1]!));
    }

    points = refined;
  }

  return points;
}

function buildSmoothedPathSamples(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>
): SmoothedPathSample[] {
  if (path.points.length === 0) {
    return [
      {
        distance: 0,
        position: {
          x: 0,
          y: 0,
          z: 0
        },
        tangent: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    ];
  }

  if (path.points.length < 3 || path.totalLength <= 0) {
    return path.points.map((point, index) => ({
      distance:
        index === 0
          ? 0
          : path.segments[Math.min(index - 1, path.segments.length - 1)]?.distanceEnd ?? 0,
      position: cloneVec3(point.position),
      tangent:
        index < path.segments.length
          ? cloneVec3(path.segments[index]!.tangent)
          : cloneVec3(path.segments[path.segments.length - 1]?.tangent ?? { x: 0, y: 0, z: 0 })
    }));
  }

  const samples: SmoothedPathSample[] = [];
  const points = buildSmoothedPolylinePoints(path);
  const segmentCount = path.loop ? points.length : points.length - 1;
  let cumulativeDistance = 0;
  let previousPosition = cloneVec3(points[0]!);

  samples.push({
    distance: 0,
    position: previousPosition,
    tangent: {
      x: 0,
      y: 0,
      z: 0
    }
  });

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const nextPosition = cloneVec3(
      points[(segmentIndex + 1) % points.length]!
    );
    cumulativeDistance += getVec3Distance(previousPosition, nextPosition);

    samples.push({
      distance: cumulativeDistance,
      position: nextPosition,
      tangent: normalizeDelta(subtractVec3(nextPosition, previousPosition))
    });

    previousPosition = nextPosition;
  }

  return samples;
}

function sampleSmoothedPath(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number
): { position: Vec3; tangent: Vec3 } {
  const samples = buildSmoothedPathSamples(path);

  if (samples.length === 0) {
    return {
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      tangent: {
        x: 0,
        y: 0,
        z: 0
      }
    };
  }

  const totalDistance = samples[samples.length - 1]!.distance;

  if (totalDistance <= 0) {
    return {
      position: cloneVec3(samples[0]!.position),
      tangent: cloneVec3(samples[0]!.tangent)
    };
  }

  const targetDistance = clampProgress(progress) * totalDistance;

  if (targetDistance >= totalDistance) {
    return {
      position: cloneVec3(samples[samples.length - 1]!.position),
      tangent: cloneVec3(samples[samples.length - 1]!.tangent)
    };
  }

  const sampleIndex = samples.findIndex(
    (sample) => sample.distance >= targetDistance
  );

  if (sampleIndex <= 0) {
    return {
      position: cloneVec3(samples[0]!.position),
      tangent: cloneVec3(samples[0]!.tangent)
    };
  }

  const previousSample = samples[sampleIndex - 1]!;
  const nextSample = samples[sampleIndex]!;
  const spanDistance = nextSample.distance - previousSample.distance;
  const t =
    spanDistance <= 0
      ? 0
      : (targetDistance - previousSample.distance) / spanDistance;
  const position = {
    x:
      previousSample.position.x +
      (nextSample.position.x - previousSample.position.x) * t,
    y:
      previousSample.position.y +
      (nextSample.position.y - previousSample.position.y) * t,
    z:
      previousSample.position.z +
      (nextSample.position.z - previousSample.position.z) * t
  };

  return {
    position,
    tangent: normalizeDelta(subtractVec3(nextSample.position, previousSample.position))
  };
}

export function normalizeScenePathName(
  name: string | null | undefined
): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

export function createScenePathPoint(
  overrides: Partial<Pick<ScenePathPoint, "id" | "position">> = {}
): ScenePathPoint {
  const position = cloneVec3(
    overrides.position ?? {
      x: 0,
      y: 0,
      z: 0
    }
  );

  assertFiniteVec3(position, "Path point position");

  return {
    id: overrides.id ?? createOpaqueId("path-point"),
    position
  };
}

export function cloneScenePathPoint(point: ScenePathPoint): ScenePathPoint {
  return createScenePathPoint(point);
}

export function createDefaultScenePathPoints(anchor?: Vec3): ScenePathPoint[] {
  return DEFAULT_SCENE_PATH_POINT_POSITIONS.map((position) =>
    createScenePathPoint({
      position: {
        x: position.x + (anchor?.x ?? 0),
        y: position.y + (anchor?.y ?? 0),
        z: position.z + (anchor?.z ?? 0)
      }
    })
  );
}

export function createScenePath(
  overrides: Partial<
    Pick<ScenePath, "id" | "name" | "visible" | "enabled" | "loop" | "points">
  > = {}
): ScenePath {
  const points =
    overrides.points === undefined
      ? createDefaultScenePathPoints()
      : overrides.points.map(cloneScenePathPoint);
  const visible = overrides.visible ?? DEFAULT_SCENE_PATH_VISIBLE;
  const enabled = overrides.enabled ?? DEFAULT_SCENE_PATH_ENABLED;
  const loop = overrides.loop ?? DEFAULT_SCENE_PATH_LOOP;

  if (points.length < MIN_SCENE_PATH_POINT_COUNT) {
    throw new Error(
      `Paths must define at least ${MIN_SCENE_PATH_POINT_COUNT} points.`
    );
  }

  if (typeof visible !== "boolean") {
    throw new Error("Path visible must be a boolean.");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("Path enabled must be a boolean.");
  }

  if (typeof loop !== "boolean") {
    throw new Error("Path loop must be a boolean.");
  }

  const seenPointIds = new Set<string>();

  for (const point of points) {
    if (point.id.trim().length === 0) {
      throw new Error("Path point ids must be non-empty strings.");
    }

    if (seenPointIds.has(point.id)) {
      throw new Error(`Duplicate path point id ${point.id}.`);
    }

    seenPointIds.add(point.id);
  }

  return {
    id: overrides.id ?? createOpaqueId("path"),
    kind: "path",
    name: normalizeScenePathName(overrides.name),
    visible,
    enabled,
    loop,
    points
  };
}

export function cloneScenePath(path: ScenePath): ScenePath {
  return createScenePath(path);
}

export function areScenePathsEqual(left: ScenePath, right: ScenePath): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.name === right.name &&
    left.visible === right.visible &&
    left.enabled === right.enabled &&
    left.loop === right.loop &&
    left.points.length === right.points.length &&
    left.points.every(
      (point, index) =>
        point.id === right.points[index]?.id &&
        areVec3Equal(point.position, right.points[index].position)
    )
  );
}

export function compareScenePaths(left: ScenePath, right: ScenePath): number {
  const leftName = left.name ?? "";
  const rightName = right.name ?? "";

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return left.id.localeCompare(right.id);
}

export function getScenePaths(paths: Record<string, ScenePath>): ScenePath[] {
  return Object.values(paths).sort(compareScenePaths);
}

export function getScenePathLabel(path: ScenePath, index: number): string {
  return path.name ?? `Path ${index + 1}`;
}

export function getScenePathPointIndex(
  path: Pick<ScenePath, "points">,
  pointId: string
): number {
  return path.points.findIndex((point) => point.id === pointId);
}

export function getScenePathPoint(
  path: Pick<ScenePath, "points">,
  pointId: string
): ScenePathPoint | null {
  const pointIndex = getScenePathPointIndex(path, pointId);
  return pointIndex === -1 ? null : cloneScenePathPoint(path.points[pointIndex]);
}

export function createAppendedScenePathPoint(path: ScenePath): ScenePathPoint {
  const lastPoint = path.points.at(-1);
  const previousPoint =
    path.points.length > 1 ? path.points[path.points.length - 2] : null;

  if (lastPoint === undefined) {
    return createScenePathPoint();
  }

  if (previousPoint === null) {
    return createScenePathPoint({
      position: {
        x: lastPoint.position.x + 1,
        y: lastPoint.position.y,
        z: lastPoint.position.z
      }
    });
  }

  const delta = {
    x: lastPoint.position.x - previousPoint.position.x,
    y: lastPoint.position.y - previousPoint.position.y,
    z: lastPoint.position.z - previousPoint.position.z
  };
  const offset =
    delta.x === 0 && delta.y === 0 && delta.z === 0
      ? {
          x: 1,
          y: 0,
          z: 0
        }
      : delta;

  return createScenePathPoint({
    position: {
      x: lastPoint.position.x + offset.x,
      y: lastPoint.position.y + offset.y,
      z: lastPoint.position.z + offset.z
    }
  });
}

export function resolveScenePath(path: Pick<ScenePath, "loop" | "points">): ResolvedScenePath {
  const points = path.points.map(cloneScenePathPoint);
  const segmentPairs = points.slice(1).map((point, index) => ({
    start: points[index],
    end: point
  }));

  if (path.loop && points.length > 1) {
    segmentPairs.push({
      start: points[points.length - 1],
      end: points[0]
    });
  }

  let totalLength = 0;
  const segments = segmentPairs.map(({ start, end }, index) => {
    const delta = {
      x: end.position.x - start.position.x,
      y: end.position.y - start.position.y,
      z: end.position.z - start.position.z
    };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    const segment: ResolvedScenePathSegment = {
      index,
      startPointId: start.id,
      endPointId: end.id,
      start: cloneVec3(start.position),
      end: cloneVec3(end.position),
      length,
      distanceStart: totalLength,
      distanceEnd: totalLength + length,
      tangent: normalizeDelta(delta)
    };

    totalLength += length;
    return segment;
  });

  return {
    loop: path.loop,
    points,
    segments,
    totalLength
  };
}

export function getScenePathLength(path: Pick<ScenePath, "loop" | "points">): number {
  return resolveScenePath(path).totalLength;
}

export function sampleResolvedScenePathPosition(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  if (options.smooth) {
    return sampleSmoothedPath(path, progress).position;
  }

  if (path.points.length === 0) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  const { segmentIndex, distance } = resolvePathSegmentSample(path, progress);

  if (segmentIndex === null) {
    return cloneVec3(path.points[0].position);
  }

  const segment = path.segments[segmentIndex];

  if (segment.length <= 0) {
    return cloneVec3(segment.start);
  }

  const localDistance = Math.min(
    segment.length,
    Math.max(0, distance - segment.distanceStart)
  );
  const t = localDistance / segment.length;

  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * t,
    y: segment.start.y + (segment.end.y - segment.start.y) * t,
    z: segment.start.z + (segment.end.z - segment.start.z) * t
  };
}

export function projectWorldPointOntoSegment(
  point: Vec3,
  start: Vec3,
  end: Vec3
): ProjectedWorldSegmentPoint {
  assertFiniteVec3(point, "Projected world point");
  assertFiniteVec3(start, "Projected segment start");
  assertFiniteVec3(end, "Projected segment end");

  const delta = subtractVec3(end, start);
  const lengthSquared =
    delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;
  const pointOffset = subtractVec3(point, start);
  const unclampedT =
    lengthSquared <= 1e-8
      ? 0
      : (pointOffset.x * delta.x +
          pointOffset.y * delta.y +
          pointOffset.z * delta.z) /
        lengthSquared;
  const progress = clampProgress(unclampedT);
  const position = {
    x: start.x + delta.x * progress,
    y: start.y + delta.y * progress,
    z: start.z + delta.z * progress
  };

  return {
    progress,
    distance: getVec3Distance(position, point),
    position
  };
}

export function mapWorldPointToScenePathProgressBetweenPoints(options: {
  point: Vec3;
  trackStartPoint: Vec3;
  trackEndPoint: Vec3;
  railStartProgress: number;
  railEndProgress: number;
}): MappedScenePathProgressBetweenWorldPoints {
  const projectedTrackPoint = projectWorldPointOntoSegment(
    options.point,
    options.trackStartPoint,
    options.trackEndPoint
  );
  const railProgress = clampProgress(
    options.railStartProgress +
      (options.railEndProgress - options.railStartProgress) *
        projectedTrackPoint.progress
  );

  return {
    trackProgress: projectedTrackPoint.progress,
    railProgress,
    projectedTrackPosition: projectedTrackPoint.position
  };
}

export function resolveNearestPointOnResolvedScenePath(
  path: ResolvedScenePathProjectionSource,
  point: Vec3
): ResolvedScenePathNearestPoint {
  assertFiniteVec3(point, "Nearest path query point");

  if (path.points.length === 0) {
    return {
      progress: 0,
      distance: Math.hypot(point.x, point.y, point.z),
      distanceAlongPath: 0,
      segmentIndex: null,
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      tangent: {
        x: 0,
        y: 0,
        z: 0
      }
    };
  }

  if (path.segments.length === 0 || path.totalLength <= 0) {
    const firstPoint = path.points[0]!.position;
    return {
      progress: 0,
      distance: getVec3Distance(firstPoint, point),
      distanceAlongPath: 0,
      segmentIndex: null,
      position: cloneVec3(firstPoint),
      tangent: {
        x: 0,
        y: 0,
        z: 0
      }
    };
  }

  let nearestSample: ResolvedScenePathNearestPoint | null = null;

  for (const segment of path.segments) {
    const delta = subtractVec3(segment.end, segment.start);
    const lengthSquared =
      delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;
    const pointOffset = subtractVec3(point, segment.start);
    const unclampedT =
      lengthSquared <= 1e-8
        ? 0
        : (pointOffset.x * delta.x +
            pointOffset.y * delta.y +
            pointOffset.z * delta.z) /
          lengthSquared;
    const t = Math.min(1, Math.max(0, unclampedT));
    const position = {
      x: segment.start.x + delta.x * t,
      y: segment.start.y + delta.y * t,
      z: segment.start.z + delta.z * t
    };
    const distanceAlongPath = segment.distanceStart + segment.length * t;
    const progress = clampProgress(distanceAlongPath / path.totalLength);
    const distance = getVec3Distance(position, point);
    const tangent =
      segment.length > 1e-8
        ? cloneVec3(segment.tangent)
        : findNonZeroSegmentTangent(
            path as ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
            segment.index
          );
    const candidate: ResolvedScenePathNearestPoint = {
      progress,
      distance,
      distanceAlongPath,
      segmentIndex: segment.index,
      position,
      tangent
    };

    if (
      nearestSample === null ||
      candidate.distance < nearestSample.distance - 1e-8 ||
      (Math.abs(candidate.distance - nearestSample.distance) <= 1e-8 &&
        candidate.progress < nearestSample.progress)
    ) {
      nearestSample = candidate;
    }
  }

  return nearestSample!;
}

export function sampleScenePathPosition(
  path: Pick<ScenePath, "loop" | "points">,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  return sampleResolvedScenePathPosition(resolveScenePath(path), progress, options);
}

export function sampleResolvedScenePathTangent(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  if (options.smooth) {
    return sampleSmoothedPath(path, progress).tangent;
  }

  const { segmentIndex } = resolvePathSegmentSample(path, progress);

  if (segmentIndex === null) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  return findNonZeroSegmentTangent(path, segmentIndex);
}

export function sampleScenePathTangent(
  path: Pick<ScenePath, "loop" | "points">,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  return sampleResolvedScenePathTangent(resolveScenePath(path), progress, options);
}
