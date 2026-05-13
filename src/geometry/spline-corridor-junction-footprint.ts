import type { Vec3 } from "../core/vector";
import {
  resolveScenePath,
  sampleResolvedScenePathPosition,
  sampleResolvedScenePathTangent,
  type ScenePathCurveMode,
  type ScenePathRoadEdgeSide,
  type ScenePathPoint,
  type ScenePathRoadSettings
} from "../document/paths";
import type {
  SplineCorridorJunction,
  SplineCorridorJunctionShapeMode
} from "../document/spline-corridor-junctions";
import type { Terrain } from "../document/terrains";

export interface SplineCorridorJunctionFootprintPathLike {
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

export interface SplineCorridorJunctionFootprintPoint {
  x: number;
  z: number;
  fallbackY: number;
  heightOffset: number;
  connectionBoundaryKey: string | null;
  connectionPathId?: string;
  connectionDistance?: number;
  connectionSide?: ScenePathRoadEdgeSide;
  connectionOutwardAxis?: { x: number; z: number };
}

export interface SplineCorridorJunctionFootprint {
  center: SplineCorridorJunctionFootprintPoint;
  points: SplineCorridorJunctionFootprintPoint[];
  forwardAxis: { x: number; z: number };
  rightAxis: { x: number; z: number };
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

const CIRCLE_FALLBACK_SEGMENTS = 32;
const CURVE_CORNER_SEGMENTS = 6;
const EPSILON = 1e-6;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizePathPoint(
  point: SplineCorridorJunctionFootprintPathLike["points"][number],
  index: number
): ScenePathPoint {
  return {
    id: point.id ?? point.pointId ?? `junction-path-point-${index}`,
    position: cloneVec3(point.position)
  };
}

function resolveJunctionPath(
  path: SplineCorridorJunctionFootprintPathLike,
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

function normalizeHorizontalVector(vector: Vec3): { x: number; z: number } | null {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= EPSILON) {
    return null;
  }

  return {
    x: vector.x / length,
    z: vector.z / length
  };
}

function getConnectionHeightOffset(
  path: SplineCorridorJunctionFootprintPathLike
): number {
  return path.road.heightOffset;
}

function createFootprintPoint(options: {
  position: Vec3;
  leftAxis: { x: number; z: number };
  offset: number;
  heightOffset: number;
  connectionBoundaryKey: string;
  connectionPathId: string;
  connectionDistance: number;
  connectionSide: ScenePathRoadEdgeSide;
  connectionOutwardAxis: { x: number; z: number };
}): SplineCorridorJunctionFootprintPoint {
  return {
    x: options.position.x + options.leftAxis.x * options.offset,
    z: options.position.z + options.leftAxis.z * options.offset,
    fallbackY: options.position.y + options.heightOffset,
    heightOffset: options.heightOffset,
    connectionBoundaryKey: options.connectionBoundaryKey,
    connectionPathId: options.connectionPathId,
    connectionDistance: options.connectionDistance,
    connectionSide: options.connectionSide,
    connectionOutwardAxis: options.connectionOutwardAxis
  };
}

function createConnectionBoundaryKey(options: {
  pathId: string;
  distance: number;
}): string {
  return `${options.pathId}:${Math.round(options.distance * 100000)}`;
}

function addConnectionBoundaryPoints(options: {
  points: SplineCorridorJunctionFootprintPoint[];
  path: SplineCorridorJunctionFootprintPathLike;
  progress: number;
  clipDistance: number;
  terrains: readonly Terrain[];
}): { forwardAxis: { x: number; z: number }; fallbackY: number } | null {
  const resolvedPath = resolveJunctionPath(options.path, options.terrains);

  if (resolvedPath.totalLength <= EPSILON) {
    return null;
  }

  const centerDistance = Math.min(
    resolvedPath.totalLength,
    Math.max(0, options.progress * resolvedPath.totalLength)
  );
  const distances = [
    Math.max(0, centerDistance - options.clipDistance),
    Math.min(resolvedPath.totalLength, centerDistance + options.clipDistance)
  ].filter((distance, index, values) => {
    const atPathStart = distance <= EPSILON && centerDistance <= EPSILON;
    const atPathEnd =
      distance >= resolvedPath.totalLength - EPSILON &&
      centerDistance >= resolvedPath.totalLength - EPSILON;

    if (atPathStart || atPathEnd) {
      return false;
    }

    return index === 0 || Math.abs(distance - values[index - 1]!) > EPSILON;
  });
  const centerProgress =
    resolvedPath.totalLength <= EPSILON
      ? 0
      : centerDistance / resolvedPath.totalLength;
  const centerPosition = sampleResolvedScenePathPosition(
    resolvedPath,
    centerProgress
  );
  const centerTangent = sampleResolvedScenePathTangent(
    resolvedPath,
    centerProgress
  );
  const forwardAxis = normalizeHorizontalVector(centerTangent);

  if (forwardAxis === null) {
    return null;
  }

  const heightOffset = getConnectionHeightOffset(options.path);
  const halfWidth = Math.max(0.05, options.path.road.width * 0.5);
  const boundaryDistances = distances.length === 0 ? [centerDistance] : distances;

  for (const distance of boundaryDistances) {
    const progress =
      resolvedPath.totalLength <= EPSILON
        ? 0
        : Math.min(1, Math.max(0, distance / resolvedPath.totalLength));
    const position = sampleResolvedScenePathPosition(resolvedPath, progress);
    const tangent =
      normalizeHorizontalVector(
        sampleResolvedScenePathTangent(resolvedPath, progress)
      ) ?? forwardAxis;
    const localLeftAxis = {
      x: -tangent.z,
      z: tangent.x
    };
    const connectionBoundaryKey = createConnectionBoundaryKey({
      pathId: options.path.id,
      distance
    });

    options.points.push(
      createFootprintPoint({
        position,
        leftAxis: localLeftAxis,
        offset: halfWidth,
        heightOffset,
        connectionBoundaryKey,
        connectionPathId: options.path.id,
        connectionDistance: distance,
        connectionSide: "left",
        connectionOutwardAxis: localLeftAxis
      }),
      createFootprintPoint({
        position,
        leftAxis: localLeftAxis,
        offset: -halfWidth,
        heightOffset,
        connectionBoundaryKey,
        connectionPathId: options.path.id,
        connectionDistance: distance,
        connectionSide: "right",
        connectionOutwardAxis: {
          x: -localLeftAxis.x,
          z: -localLeftAxis.z
        }
      })
    );
  }

  return {
    forwardAxis,
    fallbackY: centerPosition.y + heightOffset
  };
}

function crossXZ(
  origin: SplineCorridorJunctionFootprintPoint,
  left: SplineCorridorJunctionFootprintPoint,
  right: SplineCorridorJunctionFootprintPoint
): number {
  return (
    (left.x - origin.x) * (right.z - origin.z) -
    (left.z - origin.z) * (right.x - origin.x)
  );
}

function dedupePoints(
  points: readonly SplineCorridorJunctionFootprintPoint[]
): SplineCorridorJunctionFootprintPoint[] {
  const deduped: SplineCorridorJunctionFootprintPoint[] = [];

  for (const point of points) {
    const existing = deduped.find(
      (candidate) =>
        Math.hypot(candidate.x - point.x, candidate.z - point.z) <= EPSILON
    );

    if (existing === undefined) {
      deduped.push(point);
      continue;
    }

    existing.fallbackY = (existing.fallbackY + point.fallbackY) * 0.5;
    existing.heightOffset = (existing.heightOffset + point.heightOffset) * 0.5;
    const keepsConnection =
      existing.connectionBoundaryKey === point.connectionBoundaryKey &&
      existing.connectionPathId === point.connectionPathId &&
      existing.connectionSide === point.connectionSide;

    if (!keepsConnection) {
      existing.connectionBoundaryKey = null;
      delete existing.connectionPathId;
      delete existing.connectionDistance;
      delete existing.connectionSide;
      delete existing.connectionOutwardAxis;
    }
  }

  return deduped;
}

function computeConvexHull(
  points: readonly SplineCorridorJunctionFootprintPoint[]
): SplineCorridorJunctionFootprintPoint[] {
  const sorted = dedupePoints(points).sort((left, right) =>
    left.x === right.x ? left.z - right.z : left.x - right.x
  );

  if (sorted.length <= 3) {
    return sorted;
  }

  const lower: SplineCorridorJunctionFootprintPoint[] = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      crossXZ(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <=
        EPSILON
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: SplineCorridorJunctionFootprintPoint[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]!;
    while (
      upper.length >= 2 &&
      crossXZ(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <=
        EPSILON
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function getBounds(points: readonly SplineCorridorJunctionFootprintPoint[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY
    }
  );
}

function getRoadBoundaryTangent(
  point: SplineCorridorJunctionFootprintPoint
): { x: number; z: number } | null {
  if (point.connectionOutwardAxis === undefined) {
    return null;
  }

  return {
    x: -point.connectionOutwardAxis.z,
    z: point.connectionOutwardAxis.x
  };
}

function resolveRoadBoundaryCornerPoint(options: {
  start: SplineCorridorJunctionFootprintPoint;
  end: SplineCorridorJunctionFootprintPoint;
}): { x: number; z: number } | null {
  const startTangent = getRoadBoundaryTangent(options.start);
  const endTangent = getRoadBoundaryTangent(options.end);

  if (startTangent === null || endTangent === null) {
    return null;
  }

  const denominator =
    startTangent.x * endTangent.z - startTangent.z * endTangent.x;

  if (Math.abs(denominator) <= EPSILON) {
    return null;
  }

  const deltaX = options.end.x - options.start.x;
  const deltaZ = options.end.z - options.start.z;
  const startDistance =
    (deltaX * endTangent.z - deltaZ * endTangent.x) / denominator;
  const corner = {
    x: options.start.x + startTangent.x * startDistance,
    z: options.start.z + startTangent.z * startDistance
  };

  if (!Number.isFinite(corner.x) || !Number.isFinite(corner.z)) {
    return null;
  }

  return corner;
}

function createShapedFootprintPoint(options: {
  start: SplineCorridorJunctionFootprintPoint;
  end: SplineCorridorJunctionFootprintPoint;
  x: number;
  z: number;
  t: number;
}): SplineCorridorJunctionFootprintPoint {
  return {
    x: options.x,
    z: options.z,
    fallbackY:
      options.start.fallbackY +
      (options.end.fallbackY - options.start.fallbackY) * options.t,
    heightOffset:
      options.start.heightOffset +
      (options.end.heightOffset - options.start.heightOffset) * options.t,
    connectionBoundaryKey: null
  };
}

function quadraticBezier(
  start: number,
  control: number,
  end: number,
  t: number
): number {
  const inverse = 1 - t;

  return inverse * inverse * start + 2 * inverse * t * control + t * t * end;
}

function appendShapedCornerPoints(options: {
  points: SplineCorridorJunctionFootprintPoint[];
  start: SplineCorridorJunctionFootprintPoint;
  end: SplineCorridorJunctionFootprintPoint;
  shapeMode: SplineCorridorJunctionShapeMode;
}) {
  if (
    options.shapeMode === "straight" ||
    isSplineCorridorJunctionFootprintRoadMouthEdge(options.start, options.end)
  ) {
    return;
  }

  const corner = resolveRoadBoundaryCornerPoint({
    start: options.start,
    end: options.end
  });

  if (corner === null) {
    return;
  }

  if (options.shapeMode === "corner") {
    options.points.push(
      createShapedFootprintPoint({
        start: options.start,
        end: options.end,
        x: corner.x,
        z: corner.z,
        t: 0.5
      })
    );
    return;
  }

  for (let step = 1; step < CURVE_CORNER_SEGMENTS; step += 1) {
    const t = step / CURVE_CORNER_SEGMENTS;

    options.points.push(
      createShapedFootprintPoint({
        start: options.start,
        end: options.end,
        x: quadraticBezier(options.start.x, corner.x, options.end.x, t),
        z: quadraticBezier(options.start.z, corner.z, options.end.z, t),
        t
      })
    );
  }
}

function buildShapedFootprintPoints(options: {
  points: readonly SplineCorridorJunctionFootprintPoint[];
  shapeMode: SplineCorridorJunctionShapeMode;
}): SplineCorridorJunctionFootprintPoint[] {
  if (options.shapeMode === "straight" || options.points.length < 3) {
    return [...options.points];
  }

  const shaped: SplineCorridorJunctionFootprintPoint[] = [];

  for (let index = 0; index < options.points.length; index += 1) {
    const start = options.points[index]!;
    const end = options.points[(index + 1) % options.points.length]!;

    shaped.push(start);
    appendShapedCornerPoints({
      points: shaped,
      start,
      end,
      shapeMode: options.shapeMode
    });
  }

  return shaped;
}

function isPointInsidePolygonXZ(
  x: number,
  z: number,
  polygon: readonly SplineCorridorJunctionFootprintPoint[]
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index]!;
    const previous = polygon[previousIndex]!;
    const intersects =
      current.z > z !== previous.z > z &&
      x <
        ((previous.x - current.x) * (z - current.z)) /
          (previous.z - current.z) +
          current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function buildCircularFootprint(options: {
  junction: SplineCorridorJunction;
  fallbackY: number;
  heightOffset: number;
  forwardAxis: { x: number; z: number };
}): SplineCorridorJunctionFootprint {
  const points: SplineCorridorJunctionFootprintPoint[] = [];

  for (let index = 0; index < CIRCLE_FALLBACK_SEGMENTS; index += 1) {
    const angle = (index / CIRCLE_FALLBACK_SEGMENTS) * Math.PI * 2;
    points.push({
      x: options.junction.center.x + Math.cos(angle) * options.junction.radius,
      z: options.junction.center.z + Math.sin(angle) * options.junction.radius,
      fallbackY: options.fallbackY,
      heightOffset: options.heightOffset,
      connectionBoundaryKey: null
    });
  }

  const bounds = getBounds(points);
  const rightAxis = {
    x: -options.forwardAxis.z,
    z: options.forwardAxis.x
  };

  return {
    center: {
      x: options.junction.center.x,
      z: options.junction.center.z,
      fallbackY: options.fallbackY,
      heightOffset: options.heightOffset,
      connectionBoundaryKey: null
    },
    points,
    forwardAxis: options.forwardAxis,
    rightAxis,
    bounds
  };
}

export function buildSplineCorridorJunctionFootprint(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionFootprintPathLike[];
  terrains?: readonly Terrain[];
  includeHidden?: boolean;
}): SplineCorridorJunctionFootprint | null {
  const { junction, paths } = options;
  const terrains = options.terrains ?? [];

  if (
    !junction.enabled ||
    (!junction.visible && options.includeHidden !== true) ||
    junction.radius <= 0
  ) {
    return null;
  }

  const points: SplineCorridorJunctionFootprintPoint[] = [];
  const fallbackYs: number[] = [];
  const heightOffsets: number[] = [];
  const forwardAxes: Array<{ x: number; z: number }> = [];

  for (const connection of junction.connections) {
    const path =
      paths.find((candidate) => candidate.id === connection.pathId) ?? null;

    if (path === null || !path.road.enabled) {
      continue;
    }

    const boundary = addConnectionBoundaryPoints({
      points,
      path,
      progress: connection.progress,
      clipDistance: connection.clipDistance,
      terrains
    });

    if (boundary === null) {
      continue;
    }

    fallbackYs.push(boundary.fallbackY);
    heightOffsets.push(path.road.heightOffset);
    forwardAxes.push(boundary.forwardAxis);
  }

  const fallbackY =
    fallbackYs.length === 0
      ? junction.center.y
      : fallbackYs.reduce((sum, value) => sum + value, 0) / fallbackYs.length;
  const heightOffset =
    heightOffsets.length === 0
      ? 0
      : heightOffsets.reduce((sum, value) => sum + value, 0) /
        heightOffsets.length;
  const forwardAxis = forwardAxes[0] ?? { x: 1, z: 0 };
  const hull = computeConvexHull(points);
  const shapedHull = buildShapedFootprintPoints({
    points: hull,
    shapeMode: junction.shapeMode
  });
  const centerPoint = {
    x: junction.center.x,
    z: junction.center.z,
    fallbackY,
    heightOffset,
    connectionBoundaryKey: null
  };

  if (hull.length < 3 || !isPointInsidePolygonXZ(centerPoint.x, centerPoint.z, hull)) {
    return buildCircularFootprint({
      junction,
      fallbackY,
      heightOffset,
      forwardAxis
    });
  }

  return {
    center: centerPoint,
    points: shapedHull,
    forwardAxis,
    rightAxis: {
      x: -forwardAxis.z,
      z: forwardAxis.x
    },
    bounds: getBounds(shapedHull)
  };
}

export function isSplineCorridorJunctionFootprintRoadMouthEdge(
  start: SplineCorridorJunctionFootprintPoint,
  end: SplineCorridorJunctionFootprintPoint
): boolean {
  return (
    start.connectionBoundaryKey !== null &&
    start.connectionBoundaryKey === end.connectionBoundaryKey
  );
}

function getDistanceToSegmentXZ(options: {
  x: number;
  z: number;
  start: SplineCorridorJunctionFootprintPoint;
  end: SplineCorridorJunctionFootprintPoint;
}): number {
  const deltaX = options.end.x - options.start.x;
  const deltaZ = options.end.z - options.start.z;
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
  const t =
    lengthSquared <= EPSILON
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((options.x - options.start.x) * deltaX +
              (options.z - options.start.z) * deltaZ) /
              lengthSquared
          )
        );
  const projectedX = options.start.x + deltaX * t;
  const projectedZ = options.start.z + deltaZ * t;

  return Math.hypot(options.x - projectedX, options.z - projectedZ);
}

export function sampleSplineCorridorJunctionFootprintInfluence(options: {
  footprint: SplineCorridorJunctionFootprint;
  x: number;
  z: number;
  falloffDistance: number;
}): number {
  if (isPointInsidePolygonXZ(options.x, options.z, options.footprint.points)) {
    return 1;
  }

  const falloffDistance = Math.max(0.001, options.falloffDistance);
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < options.footprint.points.length; index += 1) {
    const start = options.footprint.points[index]!;
    const end =
      options.footprint.points[(index + 1) % options.footprint.points.length]!;
    nearestDistance = Math.min(
      nearestDistance,
      getDistanceToSegmentXZ({
        x: options.x,
        z: options.z,
        start,
        end
      })
    );
  }

  if (nearestDistance > falloffDistance) {
    return 0;
  }

  const progress = Math.min(1, Math.max(0, nearestDistance / falloffDistance));
  return Math.pow(1 - progress, 2);
}
