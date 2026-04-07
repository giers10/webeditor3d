import {
  DoubleSide,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4
} from "three";

import type { Vec3 } from "../core/vector";
import { MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT } from "../document/brushes";

export interface WaterContactBounds {
  min: Vec3;
  max: Vec3;
}

export interface WaterContactOrientedBox {
  kind: "orientedBox";
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
}

export interface WaterContactTriangleMesh {
  kind: "triangleMesh";
  vertices: Float32Array;
  indices: Uint32Array;
  mergeProfile?: "default" | "aggressive";
  transform?: {
    position: Vec3;
    rotationDegrees: Vec3;
    scale: Vec3;
  };
}

export type WaterContactSource = WaterContactBounds | WaterContactOrientedBox | WaterContactTriangleMesh;

export type WaterContactPatchShape = "box" | "segment";

export interface WaterContactPatch {
  shape: WaterContactPatchShape;
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  axisX: number;
  axisZ: number;
}

export interface WaterMaterialResult {
  material: MeshBasicMaterial | ShaderMaterial;
  animationUniform: { value: number } | null;
  contactPatchesUniform: { value: Vector4[] } | null;
  contactPatchAxesUniform: { value: Vector2[] } | null;
  contactPatchShapesUniform: { value: number[] } | null;
  reflectionTextureUniform: { value: Texture | null } | null;
  reflectionMatrixUniform: { value: Matrix4 } | null;
  reflectionEnabledUniform: { value: number } | null;
}

interface WaterMaterialReflectionOptions {
  texture: Texture | null;
  enabled: boolean;
  strength?: number;
}

interface WaterMaterialOptions {
  colorHex: string;
  surfaceOpacity: number;
  waveStrength: number;
  surfaceDisplacementEnabled?: boolean;
  opacity: number;
  quality: boolean;
  wireframe: boolean;
  isTopFace: boolean;
  time: number;
  halfSize: {
    x: number;
    z: number;
  };
  contactPatches?: WaterContactPatch[];
  reflection?: WaterMaterialReflectionOptions;
}

interface OrientedWaterVolume {
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
}

interface TriangleMeshSegmentSample {
  patch: WaterContactPatch;
  normal: Vector3;
}

const MAX_WATER_CONTACT_PATCHES = MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT;
const WATER_CONTACT_EPSILON = 1e-4;

function createBoundsCorners(bounds: WaterContactBounds) {
  return [
    new Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
  ];
}

function createOrientedBoxCorners(box: WaterContactOrientedBox) {
  const halfSize = {
    x: box.size.x * 0.5,
    y: box.size.y * 0.5,
    z: box.size.z * 0.5
  };
  const rotation = new Quaternion().setFromEuler(
    new Euler((box.rotationDegrees.x * Math.PI) / 180, (box.rotationDegrees.y * Math.PI) / 180, (box.rotationDegrees.z * Math.PI) / 180, "XYZ")
  );

  return [
    new Vector3(-halfSize.x, -halfSize.y, -halfSize.z),
    new Vector3(-halfSize.x, -halfSize.y, halfSize.z),
    new Vector3(-halfSize.x, halfSize.y, -halfSize.z),
    new Vector3(-halfSize.x, halfSize.y, halfSize.z),
    new Vector3(halfSize.x, -halfSize.y, -halfSize.z),
    new Vector3(halfSize.x, -halfSize.y, halfSize.z),
    new Vector3(halfSize.x, halfSize.y, -halfSize.z),
    new Vector3(halfSize.x, halfSize.y, halfSize.z)
  ].map((corner) => corner.applyQuaternion(rotation).add(new Vector3(box.center.x, box.center.y, box.center.z)));
}

function createRotationQuaternion(rotationDegrees: Vec3) {
  return new Quaternion().setFromEuler(
    new Euler((rotationDegrees.x * Math.PI) / 180, (rotationDegrees.y * Math.PI) / 180, (rotationDegrees.z * Math.PI) / 180, "XYZ")
  );
}

function createInverseVolumeRotation(rotationDegrees: Vec3) {
  return createRotationQuaternion(rotationDegrees).invert();
}

function cross2d(origin: Vector2, pointA: Vector2, pointB: Vector2) {
  return (pointA.x - origin.x) * (pointB.y - origin.y) - (pointA.y - origin.y) * (pointB.x - origin.x);
}

function buildConvexHull(points: Vector2[]) {
  const sortedPoints = [...points]
    .map((point) => point.clone())
    .sort((left, right) => (left.x === right.x ? left.y - right.y : left.x - right.x));
  const uniquePoints: Vector2[] = [];

  for (const point of sortedPoints) {
    const lastPoint = uniquePoints.at(-1);
    if (lastPoint === undefined || Math.abs(point.x - lastPoint.x) > WATER_CONTACT_EPSILON || Math.abs(point.y - lastPoint.y) > WATER_CONTACT_EPSILON) {
      uniquePoints.push(point);
    }
  }

  if (uniquePoints.length <= 2) {
    return uniquePoints;
  }

  const lowerHull: Vector2[] = [];

  for (const point of uniquePoints) {
    while (lowerHull.length >= 2 && cross2d(lowerHull[lowerHull.length - 2], lowerHull[lowerHull.length - 1], point) <= WATER_CONTACT_EPSILON) {
      lowerHull.pop();
    }

    lowerHull.push(point);
  }

  const upperHull: Vector2[] = [];

  for (let index = uniquePoints.length - 1; index >= 0; index -= 1) {
    const point = uniquePoints[index];
    if (point === undefined) {
      continue;
    }

    while (upperHull.length >= 2 && cross2d(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], point) <= WATER_CONTACT_EPSILON) {
      upperHull.pop();
    }

    upperHull.push(point);
  }

  lowerHull.pop();
  upperHull.pop();
  return [...lowerHull, ...upperHull];
}

function clipPolygonAgainstVerticalBoundary(polygon: Vector2[], limit: number, keepGreater: boolean) {
  if (polygon.length === 0) {
    return [];
  }

  const clipped: Vector2[] = [];
  let previousPoint = polygon[polygon.length - 1] ?? null;

  if (previousPoint === null) {
    return [];
  }

  let previousInside = keepGreater ? previousPoint.x >= limit - WATER_CONTACT_EPSILON : previousPoint.x <= limit + WATER_CONTACT_EPSILON;

  for (const point of polygon) {
    const inside = keepGreater ? point.x >= limit - WATER_CONTACT_EPSILON : point.x <= limit + WATER_CONTACT_EPSILON;

    if (inside !== previousInside) {
      const deltaX = point.x - previousPoint.x;
      if (Math.abs(deltaX) > WATER_CONTACT_EPSILON) {
        const interpolation = (limit - previousPoint.x) / deltaX;
        clipped.push(new Vector2(limit, previousPoint.y + (point.y - previousPoint.y) * interpolation));
      }
    }

    if (inside) {
      clipped.push(point.clone());
    }

    previousPoint = point;
    previousInside = inside;
  }

  return clipped;
}

function clipPolygonAgainstHorizontalBoundary(polygon: Vector2[], limit: number, keepGreater: boolean) {
  if (polygon.length === 0) {
    return [];
  }

  const clipped: Vector2[] = [];
  let previousPoint = polygon[polygon.length - 1] ?? null;

  if (previousPoint === null) {
    return [];
  }

  let previousInside = keepGreater ? previousPoint.y >= limit - WATER_CONTACT_EPSILON : previousPoint.y <= limit + WATER_CONTACT_EPSILON;

  for (const point of polygon) {
    const inside = keepGreater ? point.y >= limit - WATER_CONTACT_EPSILON : point.y <= limit + WATER_CONTACT_EPSILON;

    if (inside !== previousInside) {
      const deltaY = point.y - previousPoint.y;
      if (Math.abs(deltaY) > WATER_CONTACT_EPSILON) {
        const interpolation = (limit - previousPoint.y) / deltaY;
        clipped.push(new Vector2(previousPoint.x + (point.x - previousPoint.x) * interpolation, limit));
      }
    }

    if (inside) {
      clipped.push(point.clone());
    }

    previousPoint = point;
    previousInside = inside;
  }

  return clipped;
}

function clipPolygonToRectangle(polygon: Vector2[], minX: number, maxX: number, minZ: number, maxZ: number) {
  let clippedPolygon = polygon;
  clippedPolygon = clipPolygonAgainstVerticalBoundary(clippedPolygon, minX, true);
  clippedPolygon = clipPolygonAgainstVerticalBoundary(clippedPolygon, maxX, false);
  clippedPolygon = clipPolygonAgainstHorizontalBoundary(clippedPolygon, minZ, true);
  clippedPolygon = clipPolygonAgainstHorizontalBoundary(clippedPolygon, maxZ, false);
  return clippedPolygon;
}

function clipPolygonAgainstPlane3d(
  polygon: Vector3[],
  signedDistance: (point: Vector3) => number
) {
  if (polygon.length === 0) {
    return [];
  }

  const clipped: Vector3[] = [];
  let previousPoint = polygon[polygon.length - 1] ?? null;

  if (previousPoint === null) {
    return [];
  }

  let previousDistance = signedDistance(previousPoint);
  let previousInside = previousDistance >= -WATER_CONTACT_EPSILON;

  for (const point of polygon) {
    const distance = signedDistance(point);
    const inside = distance >= -WATER_CONTACT_EPSILON;

    if (inside !== previousInside) {
      const interpolation = previousDistance / (previousDistance - distance);
      clipped.push(previousPoint.clone().lerp(point, interpolation));
    }

    if (inside) {
      clipped.push(point.clone());
    }

    previousPoint = point;
    previousDistance = distance;
    previousInside = inside;
  }

  return clipped;
}

function clipPolygonToContactVolume(polygon: Vector3[], halfX: number, minY: number, maxY: number, halfZ: number) {
  let clippedPolygon = polygon;
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.x + halfX);
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => halfX - point.x);
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.y - minY);
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => maxY - point.y);
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.z + halfZ);
  clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => halfZ - point.z);
  return clippedPolygon;
}

function calculatePolygonArea(polygon: Vector2[]) {
  if (polygon.length < 3) {
    return 0;
  }

  let doubledArea = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const point = polygon[index];
    const nextPoint = polygon[(index + 1) % polygon.length];
    if (point === undefined || nextPoint === undefined) {
      continue;
    }

    doubledArea += point.x * nextPoint.y - nextPoint.x * point.y;
  }

  return Math.abs(doubledArea) * 0.5;
}

function createPatchFromProjectedPoints(projectedPoints: Vector2[], preferredAxis: Vector2 | null, minimumThickness: number): WaterContactPatch | null {
  const hull = buildConvexHull(projectedPoints);

  if (hull.length === 0) {
    return null;
  }

  const primaryAxis = preferredAxis !== null && preferredAxis.lengthSq() > WATER_CONTACT_EPSILON ? preferredAxis.clone().normalize() : new Vector2(1, 0);

  if (preferredAxis === null || preferredAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
    let longestSegmentLength = 0;

    for (let index = 0; index < hull.length; index += 1) {
      const startPoint = hull[index];
      const endPoint = hull[(index + 1) % hull.length];

      if (startPoint === undefined || endPoint === undefined) {
        continue;
      }

      const segment = endPoint.clone().sub(startPoint);
      const segmentLength = segment.lengthSq();

      if (segmentLength > longestSegmentLength) {
        longestSegmentLength = segmentLength;
        primaryAxis.copy(segment.normalize());
      }
    }
  }

  if (primaryAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
    return null;
  }

  const secondaryAxis = new Vector2(-primaryAxis.y, primaryAxis.x);
  let minPrimary = Number.POSITIVE_INFINITY;
  let maxPrimary = Number.NEGATIVE_INFINITY;
  let minSecondary = Number.POSITIVE_INFINITY;
  let maxSecondary = Number.NEGATIVE_INFINITY;

  for (const point of hull) {
    const primaryDistance = point.dot(primaryAxis);
    const secondaryDistance = point.dot(secondaryAxis);
    minPrimary = Math.min(minPrimary, primaryDistance);
    maxPrimary = Math.max(maxPrimary, primaryDistance);
    minSecondary = Math.min(minSecondary, secondaryDistance);
    maxSecondary = Math.max(maxSecondary, secondaryDistance);
  }

  const halfWidth = (maxPrimary - minPrimary) * 0.5;
  let halfDepth = (maxSecondary - minSecondary) * 0.5;

  if (halfWidth <= WATER_CONTACT_EPSILON) {
    return null;
  }

  if (halfDepth <= WATER_CONTACT_EPSILON || calculatePolygonArea(hull) <= WATER_CONTACT_EPSILON) {
    halfDepth = Math.max(halfDepth, minimumThickness);
  }

  if (halfDepth <= WATER_CONTACT_EPSILON) {
    return null;
  }

  const patchCenterPrimary = (minPrimary + maxPrimary) * 0.5;
  const patchCenterSecondary = (minSecondary + maxSecondary) * 0.5;

  return {
    shape: "box",
    x: primaryAxis.x * patchCenterPrimary + secondaryAxis.x * patchCenterSecondary,
    z: primaryAxis.y * patchCenterPrimary + secondaryAxis.y * patchCenterSecondary,
    halfWidth,
    halfDepth,
    axisX: primaryAxis.x,
    axisZ: primaryAxis.y
  };
}

function computeTriangleNormal(pointA: Vector3, pointB: Vector3, pointC: Vector3) {
  const edgeAB = pointB.clone().sub(pointA);
  const edgeAC = pointC.clone().sub(pointA);
  const normal = edgeAB.cross(edgeAC);

  if (normal.lengthSq() <= WATER_CONTACT_EPSILON) {
    return null;
  }

  return normal.normalize();
}

function createSegmentPatchFromEndpoints(startPoint: Vector2, endPoint: Vector2, radius: number): WaterContactPatch | null {
  const axis = endPoint.clone().sub(startPoint);
  const length = axis.length();

  if (length <= WATER_CONTACT_EPSILON) {
    return null;
  }

  axis.divideScalar(length);
  const center = startPoint.clone().add(endPoint).multiplyScalar(0.5);

  return {
    shape: "segment",
    x: center.x,
    z: center.y,
    halfWidth: length * 0.5,
    halfDepth: Math.max(radius, WATER_CONTACT_EPSILON),
    axisX: axis.x,
    axisZ: axis.y
  };
}

function addUniqueProjectedPoint(points: Vector2[], point: Vector2) {
  const alreadyExists = points.some(
    (candidate) => Math.abs(candidate.x - point.x) <= WATER_CONTACT_EPSILON && Math.abs(candidate.y - point.y) <= WATER_CONTACT_EPSILON
  );

  if (!alreadyExists) {
    points.push(point);
  }
}

function createWaterlineSegmentFromPolygon(polygon: Vector3[], surfaceY: number) {
  if (polygon.length < 2) {
    return null;
  }

  const intersectionPoints: Vector2[] = [];
  let previousPoint = polygon[polygon.length - 1] ?? null;

  if (previousPoint === null) {
    return null;
  }

  for (const point of polygon) {
    const previousDelta = previousPoint.y - surfaceY;
    const delta = point.y - surfaceY;
    const previousOnPlane = Math.abs(previousDelta) <= WATER_CONTACT_EPSILON;
    const onPlane = Math.abs(delta) <= WATER_CONTACT_EPSILON;

    if (previousOnPlane && onPlane) {
      addUniqueProjectedPoint(intersectionPoints, new Vector2(previousPoint.x, previousPoint.z));
      addUniqueProjectedPoint(intersectionPoints, new Vector2(point.x, point.z));
    } else if (previousOnPlane) {
      addUniqueProjectedPoint(intersectionPoints, new Vector2(previousPoint.x, previousPoint.z));
    } else if (onPlane) {
      addUniqueProjectedPoint(intersectionPoints, new Vector2(point.x, point.z));
    } else if ((previousDelta < 0 && delta > 0) || (previousDelta > 0 && delta < 0)) {
      const interpolation = (surfaceY - previousPoint.y) / (point.y - previousPoint.y);
      addUniqueProjectedPoint(
        intersectionPoints,
        new Vector2(previousPoint.x + (point.x - previousPoint.x) * interpolation, previousPoint.z + (point.z - previousPoint.z) * interpolation)
      );
    }

    previousPoint = point;
  }

  if (intersectionPoints.length < 2) {
    return null;
  }

  let startPoint = intersectionPoints[0] ?? null;
  let endPoint = intersectionPoints[1] ?? null;
  let longestDistanceSquared = -1;

  for (let startIndex = 0; startIndex < intersectionPoints.length; startIndex += 1) {
    for (let endIndex = startIndex + 1; endIndex < intersectionPoints.length; endIndex += 1) {
      const candidateStart = intersectionPoints[startIndex];
      const candidateEnd = intersectionPoints[endIndex];
      if (candidateStart === undefined || candidateEnd === undefined) {
        continue;
      }

      const distanceSquared = candidateStart.distanceToSquared(candidateEnd);
      if (distanceSquared > longestDistanceSquared) {
        longestDistanceSquared = distanceSquared;
        startPoint = candidateStart;
        endPoint = candidateEnd;
      }
    }
  }

  if (startPoint === null || endPoint === null || longestDistanceSquared <= WATER_CONTACT_EPSILON) {
    return null;
  }

  return [startPoint.clone(), endPoint.clone()] as const;
}

function createSegmentEndpoints(patch: WaterContactPatch) {
  const axis = new Vector2(patch.axisX, patch.axisZ);
  if (axis.lengthSq() <= WATER_CONTACT_EPSILON) {
    axis.set(1, 0);
  } else {
    axis.normalize();
  }

  const center = new Vector2(patch.x, patch.z);
  const offset = axis.clone().multiplyScalar(patch.halfWidth);

  return [center.clone().sub(offset), center.clone().add(offset)] as const;
}

function measureSegmentExtentsInBasis(points: readonly Vector2[], radius: number, axis: Vector2) {
  const perpendicularAxis = new Vector2(-axis.y, axis.x);
  let minPrimary = Number.POSITIVE_INFINITY;
  let maxPrimary = Number.NEGATIVE_INFINITY;
  let minSecondary = Number.POSITIVE_INFINITY;
  let maxSecondary = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const primaryDistance = point.dot(axis);
    const secondaryDistance = point.dot(perpendicularAxis);
    minPrimary = Math.min(minPrimary, primaryDistance);
    maxPrimary = Math.max(maxPrimary, primaryDistance);
    minSecondary = Math.min(minSecondary, secondaryDistance);
    maxSecondary = Math.max(maxSecondary, secondaryDistance);
  }

  return {
    minPrimary,
    maxPrimary,
    minSecondary: minSecondary - radius,
    maxSecondary: maxSecondary + radius
  };
}

function createSegmentPatchFromCluster(cluster: {
  axis: Vector2;
  endpoints: Vector2[];
  maxRadius: number;
  extents: ReturnType<typeof measureSegmentExtentsInBasis>;
}): WaterContactPatch | null {
  const axis = cluster.axis.clone();

  if (axis.lengthSq() <= WATER_CONTACT_EPSILON) {
    axis.set(1, 0);
  } else {
    axis.normalize();
  }

  const perpendicularAxis = new Vector2(-axis.y, axis.x);
  const halfWidth = (cluster.extents.maxPrimary - cluster.extents.minPrimary) * 0.5;
  const halfDepth = Math.max(cluster.maxRadius, (cluster.extents.maxSecondary - cluster.extents.minSecondary) * 0.5);

  if (halfWidth <= WATER_CONTACT_EPSILON || halfDepth <= WATER_CONTACT_EPSILON) {
    return null;
  }

  const centerPrimary = (cluster.extents.minPrimary + cluster.extents.maxPrimary) * 0.5;
  const centerSecondary = (cluster.extents.minSecondary + cluster.extents.maxSecondary) * 0.5;

  return {
    shape: "segment",
    x: axis.x * centerPrimary + perpendicularAxis.x * centerSecondary,
    z: axis.y * centerPrimary + perpendicularAxis.y * centerSecondary,
    halfWidth,
    halfDepth,
    axisX: axis.x,
    axisZ: axis.y
  };
}

function getTriangleMeshMergeSettings(mergeProfile: WaterContactTriangleMesh["mergeProfile"], minimumThickness: number) {
  if (mergeProfile === "aggressive") {
    return {
      axisAlignment: 0.88,
      normalAlignment: 0.9,
      minimumPrimaryGap: Math.max(0.26, minimumThickness * 2.8),
      minimumSecondaryGap: Math.max(0.18, minimumThickness * 2.2),
      primaryGapScale: 0.34,
      secondaryGapScale: 0.55
    };
  }

  return {
    axisAlignment: 0.95,
    normalAlignment: 0.97,
    minimumPrimaryGap: Math.max(0.04, minimumThickness),
    minimumSecondaryGap: Math.max(0.05, minimumThickness * 1.1),
    primaryGapScale: 0.06,
    secondaryGapScale: 0.12
  };
}

function mergeTriangleMeshContactPatches(rawPatches: TriangleMeshSegmentSample[], minimumThickness: number, mergeProfile: WaterContactTriangleMesh["mergeProfile"]) {
  const mergeSettings = getTriangleMeshMergeSettings(mergeProfile, minimumThickness);
  const clusters: Array<{
    axis: Vector2;
    normal: Vector3;
    endpoints: Vector2[];
    maxRadius: number;
    extents: ReturnType<typeof measureSegmentExtentsInBasis>;
  }> = [];

  for (const rawPatch of rawPatches) {
    const patchAxis = new Vector2(rawPatch.patch.axisX, rawPatch.patch.axisZ);
    if (patchAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
      patchAxis.set(1, 0);
    } else {
      patchAxis.normalize();
    }

    const patchEndpoints = createSegmentEndpoints(rawPatch.patch);

    let merged = false;

    for (const cluster of clusters) {
      const alignment = Math.abs(cluster.axis.dot(patchAxis));
      if (alignment < mergeSettings.axisAlignment) {
        continue;
      }

      const normalAlignment = Math.abs(cluster.normal.dot(rawPatch.normal));
      if (normalAlignment < mergeSettings.normalAlignment) {
        continue;
      }

      const patchExtents = measureSegmentExtentsInBasis(patchEndpoints, rawPatch.patch.halfDepth, cluster.axis);
      const primaryGap = Math.max(0, Math.max(cluster.extents.minPrimary - patchExtents.maxPrimary, patchExtents.minPrimary - cluster.extents.maxPrimary));
      const secondaryGap = Math.max(0, Math.max(cluster.extents.minSecondary - patchExtents.maxSecondary, patchExtents.minSecondary - cluster.extents.maxSecondary));
      const clusterPrimarySpan = cluster.extents.maxPrimary - cluster.extents.minPrimary;
      const clusterSecondarySpan = cluster.extents.maxSecondary - cluster.extents.minSecondary;
      const allowedPrimaryGap = Math.max(
        mergeSettings.minimumPrimaryGap,
        Math.max(rawPatch.patch.halfWidth, clusterPrimarySpan) * mergeSettings.primaryGapScale
      );
      const allowedSecondaryGap = Math.max(
        mergeSettings.minimumSecondaryGap,
        Math.max(rawPatch.patch.halfDepth, clusterSecondarySpan) * mergeSettings.secondaryGapScale
      );

      if (primaryGap > allowedPrimaryGap || secondaryGap > allowedSecondaryGap) {
        continue;
      }

      cluster.endpoints.push(...patchEndpoints.map((point) => point.clone()));
      cluster.maxRadius = Math.max(cluster.maxRadius, rawPatch.patch.halfDepth);
      cluster.extents = measureSegmentExtentsInBasis(cluster.endpoints, cluster.maxRadius, cluster.axis);
      merged = true;
      break;
    }

    if (!merged) {
      clusters.push({
        axis: patchAxis,
        normal: rawPatch.normal.clone(),
        endpoints: patchEndpoints.map((point) => point.clone()),
        maxRadius: rawPatch.patch.halfDepth,
        extents: measureSegmentExtentsInBasis(patchEndpoints, rawPatch.patch.halfDepth, patchAxis)
      });
    }
  }

  return clusters
    .map((cluster) => createSegmentPatchFromCluster(cluster))
    .filter((patch): patch is WaterContactPatch => patch !== null);
}

function appendTriangleMeshContactPatches(
  patches: WaterContactPatch[],
  source: WaterContactTriangleMesh,
  volume: OrientedWaterVolume,
  inverseRotation: Quaternion,
  halfX: number,
  surfaceY: number,
  surfaceBand: number,
  halfZ: number
) {
  const position = new Vector3(
    source.transform?.position.x ?? 0,
    source.transform?.position.y ?? 0,
    source.transform?.position.z ?? 0
  );
  const rotation = source.transform !== undefined ? createRotationQuaternion(source.transform.rotationDegrees) : null;
  const scale = new Vector3(
    source.transform?.scale.x ?? 1,
    source.transform?.scale.y ?? 1,
    source.transform?.scale.z ?? 1
  );
  const bandMinimumThickness = Math.max(0.08, Math.min(0.22, surfaceBand * 0.45));
  const triangleVertices = [new Vector3(), new Vector3(), new Vector3()];
  const rawPatches: TriangleMeshSegmentSample[] = [];

  for (let indexOffset = 0; indexOffset <= source.indices.length - 3; indexOffset += 3) {
    const polygon: Vector3[] = [];

    for (let cornerIndex = 0; cornerIndex < 3; cornerIndex += 1) {
      const vertexIndex = source.indices[indexOffset + cornerIndex] ?? 0;
      const vertex = triangleVertices[cornerIndex] ?? new Vector3();
      vertex.set(source.vertices[vertexIndex * 3] ?? 0, source.vertices[vertexIndex * 3 + 1] ?? 0, source.vertices[vertexIndex * 3 + 2] ?? 0);
      vertex.multiply(scale);
      if (rotation !== null) {
        vertex.applyQuaternion(rotation);
      }
      vertex.add(position);
      vertex.x -= volume.center.x;
      vertex.y -= volume.center.y;
      vertex.z -= volume.center.z;
      vertex.applyQuaternion(inverseRotation);
      polygon.push(vertex.clone());
    }

    const triangleNormal = computeTriangleNormal(polygon[0] ?? new Vector3(), polygon[1] ?? new Vector3(), polygon[2] ?? new Vector3());
    if (triangleNormal === null) {
      continue;
    }

    const clippedPolygon = clipPolygonToContactVolume(polygon, halfX, surfaceY - surfaceBand, surfaceY + surfaceBand, halfZ);
    const waterlineSegment = createWaterlineSegmentFromPolygon(clippedPolygon, surfaceY);

    if (waterlineSegment === null) {
      continue;
    }

    const preferredAxis = waterlineSegment[1].clone().sub(waterlineSegment[0]);
    if (preferredAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
      continue;
    }

    const patch = createSegmentPatchFromEndpoints(waterlineSegment[0], waterlineSegment[1], bandMinimumThickness);

    if (patch !== null) {
      rawPatches.push({
        patch,
        normal: triangleNormal
      });
    }
  }

  patches.push(...mergeTriangleMeshContactPatches(rawPatches, bandMinimumThickness, source.mergeProfile));
}

export function collectWaterContactPatches(volume: OrientedWaterVolume, contactBounds: WaterContactSource[], patchLimit = MAX_WATER_CONTACT_PATCHES): WaterContactPatch[] {
  const inverseRotation = createInverseVolumeRotation(volume.rotationDegrees);
  const halfX = Math.max(volume.size.x * 0.5, WATER_CONTACT_EPSILON);
  const halfY = Math.max(volume.size.y * 0.5, WATER_CONTACT_EPSILON);
  const halfZ = Math.max(volume.size.z * 0.5, WATER_CONTACT_EPSILON);
  const surfaceY = halfY;
  const surfaceBand = Math.max(0.18, Math.min(0.55, volume.size.y * 0.2));
  const localPoint = new Vector3();
  const patches: WaterContactPatch[] = [];

  for (const source of contactBounds) {
    if ("kind" in source && source.kind === "triangleMesh") {
      appendTriangleMeshContactPatches(patches, source, volume, inverseRotation, halfX, surfaceY, surfaceBand, halfZ);
      continue;
    }

    const corners = "kind" in source ? createOrientedBoxCorners(source) : createBoundsCorners(source);
    const localCorners: Vector3[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
      localPoint.copy(corner);
      localPoint.x -= volume.center.x;
      localPoint.y -= volume.center.y;
      localPoint.z -= volume.center.z;
      localPoint.applyQuaternion(inverseRotation);
      localCorners.push(localPoint.clone());
      minX = Math.min(minX, localPoint.x);
      minY = Math.min(minY, localPoint.y);
      minZ = Math.min(minZ, localPoint.z);
      maxX = Math.max(maxX, localPoint.x);
      maxY = Math.max(maxY, localPoint.y);
      maxZ = Math.max(maxZ, localPoint.z);
    }

    if (maxX <= -halfX || minX >= halfX || maxZ <= -halfZ || minZ >= halfZ) {
      continue;
    }

    if (maxY < surfaceY - surfaceBand || minY > surfaceY + surfaceBand) {
      continue;
    }

    const clippedFootprint = clipPolygonToRectangle(
      buildConvexHull(localCorners.map((corner) => new Vector2(corner.x, corner.z))),
      -halfX,
      halfX,
      -halfZ,
      halfZ
    );

    if (calculatePolygonArea(clippedFootprint) <= WATER_CONTACT_EPSILON) {
      continue;
    }

    const verticalDistance = Math.min(Math.abs(surfaceY - minY), Math.abs(maxY - surfaceY));

    if (1 - Math.min(verticalDistance / surfaceBand, 1) <= WATER_CONTACT_EPSILON) {
      continue;
    }

    let preferredAxis: Vector2 | null = null;

    if ("kind" in source) {
      const sourceRotation = createRotationQuaternion(source.rotationDegrees);
      const projectedSourceX = new Vector2(
        new Vector3(1, 0, 0).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).x,
        new Vector3(1, 0, 0).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).z
      );
      const projectedSourceZ = new Vector2(
        new Vector3(0, 0, 1).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).x,
        new Vector3(0, 0, 1).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).z
      );
      const nextPrimaryAxis = projectedSourceX.lengthSq() >= projectedSourceZ.lengthSq() ? projectedSourceX : projectedSourceZ;

      if (nextPrimaryAxis.lengthSq() > WATER_CONTACT_EPSILON) {
        preferredAxis = nextPrimaryAxis.normalize();
      }
    }

    const patch = createPatchFromProjectedPoints(clippedFootprint, preferredAxis, Math.max(0.08, Math.min(0.18, surfaceBand * 0.4)));

    if (patch !== null) {
      patches.push(patch);
    }
  }

  const clampedPatchLimit = Math.max(1, Math.min(patchLimit, MAX_WATER_CONTACT_PATCHES));

  return patches
    .sort((left, right) => right.halfWidth * right.halfDepth - left.halfWidth * left.halfDepth)
    .slice(0, clampedPatchLimit);
}

export function createWaterContactPatchUniformValue(contactPatches?: WaterContactPatch[]): Vector4[] {
  return Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
    const patch = contactPatches?.[index];
    return new Vector4(patch?.x ?? 0, patch?.z ?? 0, patch?.halfWidth ?? 0, patch?.halfDepth ?? 0);
  });
}

export function createWaterContactPatchAxisUniformValue(contactPatches?: WaterContactPatch[]): Vector2[] {
  return Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
    const patch = contactPatches?.[index];
    return new Vector2(patch?.axisX ?? 1, patch?.axisZ ?? 0);
  });
}

export function createWaterContactPatchShapeUniformValue(contactPatches?: WaterContactPatch[]): number[] {
  return Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
    const patch = contactPatches?.[index];
    return patch?.shape === "segment" ? 1 : 0;
  });
}

export function createWaterMaterial(options: WaterMaterialOptions): WaterMaterialResult {
  if (options.wireframe) {
    return {
      material: new MeshBasicMaterial({
        color: options.colorHex,
        wireframe: true,
        transparent: true,
        opacity: Math.min(1, options.opacity + 0.2),
        depthWrite: false
      }),
      animationUniform: null,
      contactPatchesUniform: null,
      contactPatchAxesUniform: null,
      contactPatchShapesUniform: null,
      reflectionTextureUniform: null,
      reflectionMatrixUniform: null,
      reflectionEnabledUniform: null
    };
  }

  if (!options.quality) {
    return {
      material: new MeshBasicMaterial({
        color: options.colorHex,
        transparent: true,
        opacity: options.opacity,
        depthWrite: false
      }),
      animationUniform: null,
      contactPatchesUniform: null,
      contactPatchAxesUniform: null,
      contactPatchShapesUniform: null,
      reflectionTextureUniform: null,
      reflectionMatrixUniform: null,
      reflectionEnabledUniform: null
    };
  }

  const animationUniform = { value: options.time };
  const halfSize = new Vector2(Math.max(options.halfSize.x, WATER_CONTACT_EPSILON), Math.max(options.halfSize.z, WATER_CONTACT_EPSILON));
  const contactPatchesUniform = { value: createWaterContactPatchUniformValue(options.contactPatches) };
  const contactPatchAxesUniform = { value: createWaterContactPatchAxisUniformValue(options.contactPatches) };
  const contactPatchShapesUniform = { value: createWaterContactPatchShapeUniformValue(options.contactPatches) };
  const reflectionTextureUniform = { value: options.reflection?.texture ?? null };
  const reflectionMatrixUniform = { value: new Matrix4() };
  const reflectionEnabledUniform = {
    value:
      options.reflection?.enabled === true && options.reflection?.texture !== null
        ? Math.max(0, Math.min(1, options.reflection?.strength ?? 0.36))
        : 0
  };
  const surfaceDisplacementEnabledUniform = {
    value: options.surfaceDisplacementEnabled === true ? 1 : 0
  };
  const waveStrength = Math.max(0, options.waveStrength);
  const clampedOpacity = Math.max(0.14, Math.min(1, options.opacity));
  const topFaceFlag = options.isTopFace ? 1 : 0;
  const hex = options.colorHex.replace("#", "");
  const cr = parseInt(hex.substring(0, 2), 16) / 255;
  const cg = parseInt(hex.substring(2, 4), 16) / 255;
  const cb = parseInt(hex.substring(4, 6), 16) / 255;

  const vertexShader = /* glsl */ `
    uniform float time;
    uniform float waveStrength;
    uniform float isTopFace;
    uniform float surfaceDisplacementEnabled;
    uniform mat4 reflectionMatrix;

    varying vec2 vLocalSurfaceUv;
    varying vec3 vWaveNormal;
    varying vec3 vViewDir;
    varying vec4 vReflectionCoord;
    #include <fog_pars_vertex>

    void main() {
      vec3 transformedPosition = position;
      vLocalSurfaceUv = position.xz;
      vWaveNormal = vec3(0.0, 1.0, 0.0);
      vReflectionCoord = vec4(0.0);

      if (isTopFace > 0.5) {
        vec2 dirA = normalize(vec2(0.92, 0.38));
        vec2 dirB = normalize(vec2(-0.34, 0.94));
        vec2 dirC = normalize(vec2(0.58, -0.81));
        float phaseA = dot(vLocalSurfaceUv, dirA) / 2.3 + time * 0.92;
        float phaseB = dot(vLocalSurfaceUv, dirB) / 1.45 - time * 1.08;
        float phaseC = dot(vLocalSurfaceUv, dirC) / 0.82 + time * 1.42;
        float waveA = sin(phaseA) * 0.55;
        float waveB = sin(phaseB) * 0.30;
        float waveC = sin(phaseC) * 0.15;
        float combinedWave = waveA + waveB + waveC;

        vec2 slope =
          dirA * (cos(phaseA) / 2.3) * 0.55 +
          dirB * (cos(phaseB) / 1.45) * 0.30 +
          dirC * (cos(phaseC) / 0.82) * 0.15;
        vWaveNormal = normalize(vec3(-slope.x * (0.3 + waveStrength * 0.7), 1.0, -slope.y * (0.3 + waveStrength * 0.7)));

        if (surfaceDisplacementEnabled > 0.5) {
          transformedPosition.y += combinedWave * (0.035 + waveStrength * 0.09);
        }
      }

      vec4 worldPos = modelMatrix * vec4(transformedPosition, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      vReflectionCoord = reflectionMatrix * worldPos;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec3 waterColor;
    uniform float surfaceOpacity;
    uniform float waveStrength;
    uniform float time;
    uniform float isTopFace;
    uniform vec2 halfSize;
    uniform vec4 contactPatches[${MAX_WATER_CONTACT_PATCHES}];
    uniform vec2 contactPatchAxes[${MAX_WATER_CONTACT_PATCHES}];
    uniform float contactPatchShapes[${MAX_WATER_CONTACT_PATCHES}];
    uniform sampler2D reflectionTexture;
    uniform float reflectionEnabled;

    varying vec2 vLocalSurfaceUv;
    varying vec3 vWaveNormal;
    varying vec3 vViewDir;
    varying vec4 vReflectionCoord;
    #include <fog_pars_fragment>

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int octave = 0; octave < 4; octave += 1) {
        value += noise(p) * amplitude;
        p = p * 2.02 + vec2(17.1, 11.7);
        amplitude *= 0.5;
      }

      return value;
    }

    float signedDistanceToRegion(vec2 point, vec2 center, vec2 axis, vec2 halfExtents) {
      vec2 patchPerpendicular = vec2(-axis.y, axis.x);
      vec2 patchLocalUv = vec2(dot(point - center, axis), dot(point - center, patchPerpendicular));
      vec2 regionDelta = abs(patchLocalUv) - halfExtents;
      vec2 outsideDelta = max(regionDelta, 0.0);
      float outsideDistance = length(outsideDelta);
      float insideDistance = min(max(regionDelta.x, regionDelta.y), 0.0);
      return outsideDistance + insideDistance;
    }

    float distanceToSegmentBand(vec2 point, vec2 center, vec2 axis, float halfLength) {
      float along = clamp(dot(point - center, axis), -halfLength, halfLength);
      vec2 closestPoint = center + axis * along;
      return distance(point, closestPoint);
    }

    void main() {
      vec3 normal = normalize(vWaveNormal);
      vec3 viewDir = normalize(vViewDir);
      float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 2.8);

      float largeWave = fbm(vLocalSurfaceUv * 0.42 + vec2(time * 0.06, -time * 0.04));
      float mediumWave = fbm(vLocalSurfaceUv * 0.95 + normal.xz * 0.55 + vec2(-time * 0.11, time * 0.09));
      float microWave = noise(vLocalSurfaceUv * 3.6 + normal.xz * 1.6 + vec2(time * 0.24, -time * 0.19));
      float caustics = fbm(vLocalSurfaceUv * 1.8 + normal.xz * 1.2 + vec2(time * 0.16, -time * 0.14));
      caustics *= fbm(vLocalSurfaceUv * 2.7 - normal.xz * 1.4 + vec2(-time * 0.21, time * 0.18));

      vec3 deepTint = waterColor * vec3(0.52, 0.66, 0.78);
      vec3 shallowTint = mix(waterColor, vec3(0.72, 0.9, 1.0), 0.2 + fresnel * 0.24);
      float contactFoam = 0.0;
      float contactRipple = 0.0;
      float contactSheen = 0.0;
      float reflectionMask = 0.0;
      vec3 reflectionColor = vec3(0.0);
      vec2 foamDrift = vec2(
        sin(time * 0.52 + vLocalSurfaceUv.y * 1.15),
        cos(time * 0.46 + vLocalSurfaceUv.x * 1.08)
      ) * (0.06 + waveStrength * 0.12);
      vec2 foamUv = vLocalSurfaceUv + foamDrift + normal.xz * (0.08 + waveStrength * 0.14);

      float edgeDistance = min(halfSize.x - abs(vLocalSurfaceUv.x), halfSize.y - abs(vLocalSurfaceUv.y));
      float edgeBand = max(0.22, min(halfSize.x, halfSize.y) * 0.12);
      float edgeFoam = isTopFace > 0.5 ? 1.0 - smoothstep(0.0, edgeBand, edgeDistance) : 0.0;

      if (isTopFace > 0.5) {
        for (int patchIndex = 0; patchIndex < ${MAX_WATER_CONTACT_PATCHES}; patchIndex += 1) {
          vec4 patchData = contactPatches[patchIndex];
          if (patchData.z <= 0.0 || patchData.w <= 0.0) {
            continue;
          }

          vec2 patchAxis = contactPatchAxes[patchIndex];
          if (dot(patchAxis, patchAxis) <= 0.0) {
            patchAxis = vec2(1.0, 0.0);
          } else {
            patchAxis = normalize(patchAxis);
          }

          float alongDistance = dot(foamUv - patchData.xy, patchAxis);
          float contactBody = 0.0;
          float ripple = 0.0;
          float normalizedDistance = 1.0;
          float tangentNoise = noise(vec2(alongDistance * 0.45 + float(patchIndex) * 7.13, time * 0.12));

          if (contactPatchShapes[patchIndex] > 0.5) {
            float segmentRadius = max(patchData.w * mix(0.82, 1.18, tangentNoise), 0.05);
            float segmentDistance = distanceToSegmentBand(foamUv, patchData.xy, patchAxis, patchData.z);
            normalizedDistance = segmentDistance / segmentRadius;
            contactBody = 1.0 - smoothstep(0.0, 1.0, normalizedDistance);
            ripple = (sin(normalizedDistance * 11.0 - time * 3.2 + alongDistance * 0.48) * 0.5 + 0.5) * exp(-normalizedDistance * 1.9);
          } else {
            float boundaryScale = max(min(patchData.z, patchData.w), 0.18) * mix(0.86, 1.14, tangentNoise);
            float signedDistance = signedDistanceToRegion(foamUv, patchData.xy, patchAxis, patchData.zw);
            normalizedDistance = abs(signedDistance) / max(boundaryScale, 0.05);
            contactBody = 1.0 - smoothstep(0.0, 1.0, normalizedDistance);
            ripple = (sin(normalizedDistance * 13.0 - time * 3.2 + alongDistance * 0.35) * 0.5 + 0.5) * exp(-normalizedDistance * 2.6);
          }

          float wakeNoise = noise(foamUv * 3.4 + vec2(time * 0.34, -time * 0.28));
          float foamFlow = fbm(foamUv * 1.95 + vec2(time * 0.22, -time * 0.18));
          float foamField = max(contactBody * (0.42 + foamFlow * 0.18), ripple * (0.68 + wakeNoise * 0.32));
          contactFoam = max(contactFoam, foamField);
          contactRipple = max(contactRipple, ripple);
          contactSheen = max(contactSheen, contactBody);
        }
      }

      float refraction = (largeWave - 0.5) * 0.18 + (mediumWave - 0.5) * 0.14 + (microWave - 0.5) * 0.08 + contactRipple * 0.06;
      float glints = smoothstep(0.78, 0.97, fbm(vLocalSurfaceUv * 4.8 + normal.xz * 2.2 + vec2(time * 0.38, -time * 0.31))) * (0.14 + fresnel * 0.28);
      vec3 color = mix(deepTint, shallowTint, clamp(0.46 + refraction + fresnel * 0.24 + caustics * 0.08, 0.05, 0.98));

      if (isTopFace > 0.5 && reflectionEnabled > 0.0 && vReflectionCoord.w > 0.0) {
        vec2 reflectionUv = vReflectionCoord.xy / vReflectionCoord.w;
        reflectionUv += normal.xz * (0.01 + waveStrength * 0.012) + vec2((microWave - 0.5) * 0.018, (mediumWave - 0.5) * 0.015);
        if (reflectionUv.x >= 0.0 && reflectionUv.x <= 1.0 && reflectionUv.y >= 0.0 && reflectionUv.y <= 1.0) {
          vec4 reflectionSample = texture2D(reflectionTexture, clamp(reflectionUv, vec2(0.001), vec2(0.999)));
          if (reflectionSample.a > 0.001) {
            reflectionColor = mix(reflectionSample.rgb, shallowTint, 0.32);
            reflectionMask = reflectionEnabled * reflectionSample.a * clamp(0.08 + fresnel * 0.72 + glints * 0.18, 0.0, 0.62);
          }
        }
      }

      float foam = clamp(max(edgeFoam * 0.48, contactFoam) * (0.52 + waveStrength * 0.8) + caustics * 0.08 + glints * 0.06, 0.0, 0.84);
      vec3 specular = vec3(pow(max(0.0, dot(reflect(-viewDir, normal), normalize(vec3(0.25, 0.88, 0.35)))), 18.0)) * (0.14 + fresnel * 0.56 + caustics * 0.14 + contactSheen * 0.12);

      color = mix(color, mix(reflectionColor, color, 0.42), reflectionMask);
      color = mix(color, vec3(0.97, 0.99, 1.0), foam);
      color += specular;
      color += vec3(0.05, 0.08, 0.12) * fresnel;
      color += vec3(0.02, 0.05, 0.08) * caustics;

      float alpha = isTopFace > 0.5
        ? clamp(surfaceOpacity + fresnel * 0.18 + foam * 0.16 + contactRipple * 0.08, 0.32, 0.92)
        : clamp(surfaceOpacity * 0.72 + refraction * 0.08 + caustics * 0.04, 0.16, 0.7);

      gl_FragColor = vec4(color, alpha);
      #include <fog_fragment>
    }
  `;

  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      time: animationUniform,
      waterColor: { value: [cr, cg, cb] },
      surfaceOpacity: { value: clampedOpacity },
      waveStrength: { value: waveStrength },
      isTopFace: { value: topFaceFlag },
      surfaceDisplacementEnabled: surfaceDisplacementEnabledUniform,
      halfSize: { value: halfSize },
      contactPatches: contactPatchesUniform,
      contactPatchAxes: contactPatchAxesUniform,
      contactPatchShapes: contactPatchShapesUniform,
      reflectionTexture: reflectionTextureUniform,
      reflectionMatrix: reflectionMatrixUniform,
      reflectionEnabled: reflectionEnabledUniform
    }
  ]);

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: DoubleSide
  });

  return {
    material,
    animationUniform,
    contactPatchesUniform,
    contactPatchAxesUniform,
    contactPatchShapesUniform,
    reflectionTextureUniform,
    reflectionMatrixUniform,
    reflectionEnabledUniform
  };
}