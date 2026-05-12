import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "./terrains";

export interface ScenePathPoint {
  id: string;
  position: Vec3;
}

export type ScenePathCurveMode = "linear" | "catmullRom";

export interface ScenePathRoadSettings {
  enabled: boolean;
  width: number;
  shoulderWidth: number;
  falloff: number;
  heightOffset: number;
  terrainConform: boolean;
  materialId: string | null;
}

export interface ScenePath {
  id: string;
  kind: "path";
  name?: string;
  visible: boolean;
  enabled: boolean;
  loop: boolean;
  curveMode: ScenePathCurveMode;
  sampledResolution: number;
  glueToTerrain: boolean;
  terrainOffset: number;
  road: ScenePathRoadSettings;
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
  curveMode: ScenePathCurveMode;
  sampledResolution: number;
  glueToTerrain: boolean;
  terrainOffset: number;
  points: ScenePathPoint[];
  segments: ResolvedScenePathSegment[];
  totalLength: number;
}

export interface ResolvedScenePathProjectionSource {
  loop: boolean;
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
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
  curveMode?: ScenePathCurveMode;
  sampledResolution?: number;
  glueToTerrain?: boolean;
  terrainOffset?: number;
  points: TPoint[];
  segments: TSegment[];
  totalLength: number;
}

interface SmoothedPathSample {
  distance: number;
  position: Vec3;
  tangent: Vec3;
}

export interface ResolveScenePathOptions {
  terrains?: readonly Terrain[];
}

export const DEFAULT_SCENE_PATH_VISIBLE = true;
export const DEFAULT_SCENE_PATH_ENABLED = true;
export const DEFAULT_SCENE_PATH_LOOP = false;
export const DEFAULT_SCENE_PATH_CURVE_MODE: ScenePathCurveMode = "linear";
export const DEFAULT_SCENE_PATH_SAMPLED_RESOLUTION = 12;
export const DEFAULT_SCENE_PATH_GLUE_TO_TERRAIN = false;
export const DEFAULT_SCENE_PATH_TERRAIN_OFFSET = 0;
export const DEFAULT_SCENE_PATH_ROAD_ENABLED = false;
export const DEFAULT_SCENE_PATH_ROAD_WIDTH = 2;
export const DEFAULT_SCENE_PATH_ROAD_SHOULDER_WIDTH = 1;
export const DEFAULT_SCENE_PATH_ROAD_FALLOFF = 0.5;
export const DEFAULT_SCENE_PATH_ROAD_HEIGHT_OFFSET = 0.03;
export const DEFAULT_SCENE_PATH_ROAD_TERRAIN_CONFORM = true;
export const DEFAULT_SCENE_PATH_ROAD_MATERIAL_ID = null;
export const MIN_SCENE_PATH_ROAD_WIDTH = 0.1;
export const MAX_SCENE_PATH_ROAD_WIDTH = 100;
export const MIN_SCENE_PATH_ROAD_SHOULDER_WIDTH = 0;
export const MAX_SCENE_PATH_ROAD_SHOULDER_WIDTH = 100;
export const MIN_SCENE_PATH_ROAD_FALLOFF = 0;
export const MAX_SCENE_PATH_ROAD_FALLOFF = 1;
export const MIN_SCENE_PATH_SAMPLED_RESOLUTION = 1;
export const MAX_SCENE_PATH_SAMPLED_RESOLUTION = 64;
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

export function isScenePathCurveMode(
  value: unknown
): value is ScenePathCurveMode {
  return value === "linear" || value === "catmullRom";
}

export function normalizeScenePathSampledResolution(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error("Path sampled resolution must be a finite integer.");
  }

  if (value < MIN_SCENE_PATH_SAMPLED_RESOLUTION) {
    return MIN_SCENE_PATH_SAMPLED_RESOLUTION;
  }

  if (value > MAX_SCENE_PATH_SAMPLED_RESOLUTION) {
    return MAX_SCENE_PATH_SAMPLED_RESOLUTION;
  }

  return value;
}

export function normalizeScenePathTerrainOffset(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Path terrain offset must be a finite number.");
  }

  return value;
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

function catmullRomVec3(
  previous: Vec3,
  start: Vec3,
  end: Vec3,
  next: Vec3,
  t: number
): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x:
      0.5 *
      (2 * start.x +
        (-previous.x + end.x) * t +
        (2 * previous.x - 5 * start.x + 4 * end.x - next.x) * t2 +
        (-previous.x + 3 * start.x - 3 * end.x + next.x) * t3),
    y:
      0.5 *
      (2 * start.y +
        (-previous.y + end.y) * t +
        (2 * previous.y - 5 * start.y + 4 * end.y - next.y) * t2 +
        (-previous.y + 3 * start.y - 3 * end.y + next.y) * t3),
    z:
      0.5 *
      (2 * start.z +
        (-previous.z + end.z) * t +
        (2 * previous.z - 5 * start.z + 4 * end.z - next.z) * t2 +
        (-previous.z + 3 * start.z - 3 * end.z + next.z) * t3)
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
    Pick<
      ScenePath,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "loop"
      | "curveMode"
      | "sampledResolution"
      | "glueToTerrain"
      | "terrainOffset"
      | "points"
    >
  > = {}
): ScenePath {
  const points =
    overrides.points === undefined
      ? createDefaultScenePathPoints()
      : overrides.points.map(cloneScenePathPoint);
  const visible = overrides.visible ?? DEFAULT_SCENE_PATH_VISIBLE;
  const enabled = overrides.enabled ?? DEFAULT_SCENE_PATH_ENABLED;
  const loop = overrides.loop ?? DEFAULT_SCENE_PATH_LOOP;
  const curveMode = overrides.curveMode ?? DEFAULT_SCENE_PATH_CURVE_MODE;
  const sampledResolution = normalizeScenePathSampledResolution(
    overrides.sampledResolution ?? DEFAULT_SCENE_PATH_SAMPLED_RESOLUTION
  );
  const glueToTerrain =
    overrides.glueToTerrain ?? DEFAULT_SCENE_PATH_GLUE_TO_TERRAIN;
  const terrainOffset = normalizeScenePathTerrainOffset(
    overrides.terrainOffset ?? DEFAULT_SCENE_PATH_TERRAIN_OFFSET
  );

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

  if (!isScenePathCurveMode(curveMode)) {
    throw new Error("Path curve mode must be linear or catmullRom.");
  }

  if (typeof glueToTerrain !== "boolean") {
    throw new Error("Path glue to terrain must be a boolean.");
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
    curveMode,
    sampledResolution,
    glueToTerrain,
    terrainOffset,
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
    left.curveMode === right.curveMode &&
    left.sampledResolution === right.sampledResolution &&
    left.glueToTerrain === right.glueToTerrain &&
    left.terrainOffset === right.terrainOffset &&
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

function createResolvedPathSegment(
  options: {
    index: number;
    startPointId: string;
    endPointId: string;
    start: Vec3;
    end: Vec3;
  },
  distanceStart: number
): ResolvedScenePathSegment {
  const delta = subtractVec3(options.end, options.start);
  const length = Math.hypot(delta.x, delta.y, delta.z);

  return {
    index: options.index,
    startPointId: options.startPointId,
    endPointId: options.endPointId,
    start: cloneVec3(options.start),
    end: cloneVec3(options.end),
    length,
    distanceStart,
    distanceEnd: distanceStart + length,
    tangent: normalizeDelta(delta)
  };
}

function sampleHighestTerrainWorldY(
  terrains: readonly Terrain[] | undefined,
  position: Vec3,
  terrainOffset: number
): number | null {
  if (terrains === undefined || terrains.length === 0) {
    return null;
  }

  let highestWorldY: number | null = null;

  for (const terrain of terrains) {
    const terrainHeight = sampleTerrainHeightAtWorldPosition(
      terrain,
      position.x,
      position.z,
      false
    );

    if (terrainHeight === null) {
      continue;
    }

    const worldY = terrain.position.y + terrainHeight + terrainOffset;

    if (highestWorldY === null || worldY > highestWorldY) {
      highestWorldY = worldY;
    }
  }

  return highestWorldY;
}

function applyTerrainGlueToPosition(
  position: Vec3,
  options: ResolveScenePathOptions,
  terrainOffset: number
): Vec3 {
  const terrainWorldY = sampleHighestTerrainWorldY(
    options.terrains,
    position,
    terrainOffset
  );

  return {
    x: position.x,
    y: terrainWorldY ?? position.y,
    z: position.z
  };
}

function applyTerrainGlueToPoint(
  point: ScenePathPoint,
  options: ResolveScenePathOptions,
  terrainOffset: number
): ScenePathPoint {
  return {
    ...point,
    position: applyTerrainGlueToPosition(point.position, options, terrainOffset)
  };
}

function applyTerrainGlueToSegments(
  segments: ResolvedScenePathSegment[],
  options: ResolveScenePathOptions,
  terrainOffset: number
): ResolvedScenePathSegment[] {
  let totalLength = 0;

  return segments.map((segment, index) => {
    const nextSegment = createResolvedPathSegment(
      {
        index,
        startPointId: segment.startPointId,
        endPointId: segment.endPointId,
        start: applyTerrainGlueToPosition(
          segment.start,
          options,
          terrainOffset
        ),
        end: applyTerrainGlueToPosition(segment.end, options, terrainOffset)
      },
      totalLength
    );

    totalLength = nextSegment.distanceEnd;
    return nextSegment;
  });
}

function buildLinearResolvedPathSegments(
  points: ScenePathPoint[],
  loop: boolean
): ResolvedScenePathSegment[] {
  const segmentPairs = points.slice(1).map((point, index) => ({
    start: points[index]!,
    end: point
  }));

  if (loop && points.length > 1) {
    segmentPairs.push({
      start: points[points.length - 1]!,
      end: points[0]!
    });
  }

  let totalLength = 0;

  return segmentPairs.map(({ start, end }, index) => {
    const segment = createResolvedPathSegment(
      {
        index,
        startPointId: start.id,
        endPointId: end.id,
        start: start.position,
        end: end.position
      },
      totalLength
    );

    totalLength = segment.distanceEnd;
    return segment;
  });
}

function buildCatmullRomResolvedPathSegments(
  points: ScenePathPoint[],
  loop: boolean,
  sampledResolution: number
): ResolvedScenePathSegment[] {
  if (points.length < 3) {
    return buildLinearResolvedPathSegments(points, loop);
  }

  const sourceSegmentCount = loop ? points.length : points.length - 1;
  const segments: ResolvedScenePathSegment[] = [];
  let totalLength = 0;

  for (
    let sourceSegmentIndex = 0;
    sourceSegmentIndex < sourceSegmentCount;
    sourceSegmentIndex += 1
  ) {
    const startIndex = sourceSegmentIndex;
    const endIndex = (sourceSegmentIndex + 1) % points.length;
    const previousIndex = loop
      ? (sourceSegmentIndex - 1 + points.length) % points.length
      : Math.max(0, sourceSegmentIndex - 1);
    const nextIndex = loop
      ? (sourceSegmentIndex + 2) % points.length
      : Math.min(points.length - 1, sourceSegmentIndex + 2);
    const previous = points[previousIndex]!;
    const start = points[startIndex]!;
    const end = points[endIndex]!;
    const next = points[nextIndex]!;

    for (let sampleIndex = 0; sampleIndex < sampledResolution; sampleIndex += 1) {
      const sampleStart = catmullRomVec3(
        previous.position,
        start.position,
        end.position,
        next.position,
        sampleIndex / sampledResolution
      );
      const sampleEnd = catmullRomVec3(
        previous.position,
        start.position,
        end.position,
        next.position,
        (sampleIndex + 1) / sampledResolution
      );
      const segment = createResolvedPathSegment(
        {
          index: segments.length,
          startPointId: start.id,
          endPointId: end.id,
          start: sampleStart,
          end: sampleEnd
        },
        totalLength
      );

      totalLength = segment.distanceEnd;
      segments.push(segment);
    }
  }

  return segments;
}

export function resolveScenePath(
  path: Pick<ScenePath, "loop" | "points"> &
    Partial<
      Pick<
        ScenePath,
        "curveMode" | "sampledResolution" | "glueToTerrain" | "terrainOffset"
      >
    >,
  options: ResolveScenePathOptions = {}
): ResolvedScenePath {
  const authoredPoints = path.points.map(cloneScenePathPoint);
  const curveMode = path.curveMode ?? DEFAULT_SCENE_PATH_CURVE_MODE;
  const sampledResolution = normalizeScenePathSampledResolution(
    path.sampledResolution ?? DEFAULT_SCENE_PATH_SAMPLED_RESOLUTION
  );
  const glueToTerrain =
    path.glueToTerrain ?? DEFAULT_SCENE_PATH_GLUE_TO_TERRAIN;
  const terrainOffset = normalizeScenePathTerrainOffset(
    path.terrainOffset ?? DEFAULT_SCENE_PATH_TERRAIN_OFFSET
  );
  const authoredSegments =
    curveMode === "catmullRom"
      ? buildCatmullRomResolvedPathSegments(
          authoredPoints,
          path.loop,
          sampledResolution
        )
      : buildLinearResolvedPathSegments(authoredPoints, path.loop);
  const points = glueToTerrain
    ? authoredPoints.map((point) =>
        applyTerrainGlueToPoint(point, options, terrainOffset)
      )
    : authoredPoints;
  const segments = glueToTerrain
    ? applyTerrainGlueToSegments(authoredSegments, options, terrainOffset)
    : authoredSegments;
  const totalLength = segments.at(-1)?.distanceEnd ?? 0;

  return {
    loop: path.loop,
    curveMode,
    sampledResolution,
    glueToTerrain,
    terrainOffset,
    points,
    segments,
    totalLength
  };
}

export function getScenePathLength(
  path: Pick<ScenePath, "loop" | "points"> &
    Partial<
      Pick<
        ScenePath,
        "curveMode" | "sampledResolution" | "glueToTerrain" | "terrainOffset"
      >
    >,
  options: ResolveScenePathOptions = {}
): number {
  return resolveScenePath(path, options).totalLength;
}

export function sampleResolvedScenePathPosition(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  if (options.smooth && path.curveMode !== "catmullRom") {
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
  path: Pick<ScenePath, "loop" | "points"> &
    Partial<
      Pick<
        ScenePath,
        "curveMode" | "sampledResolution" | "glueToTerrain" | "terrainOffset"
      >
    >,
  progress: number,
  options: { smooth?: boolean; terrains?: readonly Terrain[] } = {}
): Vec3 {
  return sampleResolvedScenePathPosition(
    resolveScenePath(path, { terrains: options.terrains }),
    progress,
    options
  );
}

export function sampleResolvedScenePathTangent(
  path: ResolvedPathLike<PathPointLike, ResolvedPathSegmentLike>,
  progress: number,
  options: { smooth?: boolean } = {}
): Vec3 {
  if (options.smooth && path.curveMode !== "catmullRom") {
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
  path: Pick<ScenePath, "loop" | "points"> &
    Partial<
      Pick<
        ScenePath,
        "curveMode" | "sampledResolution" | "glueToTerrain" | "terrainOffset"
      >
    >,
  progress: number,
  options: { smooth?: boolean; terrains?: readonly Terrain[] } = {}
): Vec3 {
  return sampleResolvedScenePathTangent(
    resolveScenePath(path, { terrains: options.terrains }),
    progress,
    options
  );
}
