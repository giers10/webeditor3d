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
  path: ResolvedScenePath,
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
  path: ResolvedScenePath,
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
  path: ResolvedScenePath,
  progress: number
): Vec3 {
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

export function sampleScenePathPosition(
  path: Pick<ScenePath, "loop" | "points">,
  progress: number
): Vec3 {
  return sampleResolvedScenePathPosition(resolveScenePath(path), progress);
}

export function sampleResolvedScenePathTangent(
  path: ResolvedScenePath,
  progress: number
): Vec3 {
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
  progress: number
): Vec3 {
  return sampleResolvedScenePathTangent(resolveScenePath(path), progress);
}
