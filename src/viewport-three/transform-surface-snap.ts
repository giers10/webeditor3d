import {
  Euler,
  Matrix3,
  Quaternion,
  Vector3,
  type Object3D
} from "three";

import type { ProjectAssetBoundingBox } from "../assets/project-assets";
import type { TransformPreview } from "../core/transform-session";
import type { Vec3 } from "../core/vector";
import type { BrushGeometry } from "../document/brushes";
import { transformBrushLocalPointToWorld } from "../geometry/whitebox-brush";

export const SURFACE_SNAP_OFFSET = 0.01;

export interface SurfaceSnapHit {
  object: Object3D;
  point: Vec3;
  normal: Vec3;
}

export interface SurfaceSnapIntersectionLike {
  object: Object3D;
  point: {
    x: number;
    y: number;
    z: number;
  };
  face?:
    | {
        normal?: {
          x: number;
          y: number;
          z: number;
        };
      }
    | null
    | undefined;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.sqrt(dotVec3(vector, vector));

  if (length <= 1e-8) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function toVector3(vector: Vec3): Vector3 {
  return new Vector3(vector.x, vector.y, vector.z);
}

function fromVector3(vector: { x: number; y: number; z: number }): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function getDefaultModelBoundingBox(): ProjectAssetBoundingBox {
  return {
    min: { x: -0.5, y: -0.5, z: -0.5 },
    max: { x: 0.5, y: 0.5, z: 0.5 },
    size: { x: 1, y: 1, z: 1 }
  };
}

export function createBrushSurfaceSnapSupportPoints(brush: {
  center: Vec3;
  rotationDegrees: Vec3;
  geometry: BrushGeometry;
}): Vec3[] {
  return Object.values(brush.geometry.vertices).map((vertex) =>
    transformBrushLocalPointToWorld(brush, vertex)
  );
}

export function createAxisAlignedBoxSurfaceSnapSupportPoints(
  center: Vec3,
  size: Vec3
): Vec3[] {
  const halfSize = {
    x: size.x * 0.5,
    y: size.y * 0.5,
    z: size.z * 0.5
  };

  return [
    { x: -halfSize.x, y: -halfSize.y, z: -halfSize.z },
    { x: halfSize.x, y: -halfSize.y, z: -halfSize.z },
    { x: -halfSize.x, y: halfSize.y, z: -halfSize.z },
    { x: halfSize.x, y: halfSize.y, z: -halfSize.z },
    { x: -halfSize.x, y: -halfSize.y, z: halfSize.z },
    { x: halfSize.x, y: -halfSize.y, z: halfSize.z },
    { x: -halfSize.x, y: halfSize.y, z: halfSize.z },
    { x: halfSize.x, y: halfSize.y, z: halfSize.z }
  ].map((offset) => addVec3(center, offset));
}

export function createModelBoundingBoxSurfaceSnapSupportPoints(options: {
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  boundingBox: ProjectAssetBoundingBox | null;
}): Vec3[] {
  const boundingBox = options.boundingBox ?? getDefaultModelBoundingBox();
  const rotation = new Quaternion().setFromEuler(
    new Euler(
      (options.rotationDegrees.x * Math.PI) / 180,
      (options.rotationDegrees.y * Math.PI) / 180,
      (options.rotationDegrees.z * Math.PI) / 180,
      "XYZ"
    )
  );

  return [
    { x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.min.z },
    { x: boundingBox.max.x, y: boundingBox.min.y, z: boundingBox.min.z },
    { x: boundingBox.min.x, y: boundingBox.max.y, z: boundingBox.min.z },
    { x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.min.z },
    { x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.max.z },
    { x: boundingBox.max.x, y: boundingBox.min.y, z: boundingBox.max.z },
    { x: boundingBox.min.x, y: boundingBox.max.y, z: boundingBox.max.z },
    { x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.max.z }
  ].map((corner) => {
    const rotatedCorner = new Vector3(
      corner.x * options.scale.x,
      corner.y * options.scale.y,
      corner.z * options.scale.z
    ).applyQuaternion(rotation);

    return {
      x: options.position.x + rotatedCorner.x,
      y: options.position.y + rotatedCorner.y,
      z: options.position.z + rotatedCorner.z
    };
  });
}

export function findSurfaceSnapSupportPoint(
  candidatePoints: readonly Vec3[],
  normal: Vec3
): Vec3 | null {
  if (candidatePoints.length === 0) {
    return null;
  }

  let supportPoint = candidatePoints[0];
  let supportDot = dotVec3(supportPoint, normal);

  for (const candidatePoint of candidatePoints.slice(1)) {
    const candidateDot = dotVec3(candidatePoint, normal);

    if (candidateDot < supportDot) {
      supportPoint = candidatePoint;
      supportDot = candidateDot;
    }
  }

  return cloneVec3(supportPoint);
}

export function projectOntoAxis(vector: Vec3, axis: Vec3): Vec3 {
  const normalizedAxis = normalizeVec3(axis);

  if (dotVec3(normalizedAxis, normalizedAxis) <= 1e-8) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  return scaleVec3(normalizedAxis, dotVec3(vector, normalizedAxis));
}

export function computeSurfaceSnapDelta(options: {
  supportPoints: readonly Vec3[];
  hit: SurfaceSnapHit | null;
  axisVector?: Vec3 | null;
  surfaceOffset?: number;
}): Vec3 | null {
  if (options.hit === null) {
    return null;
  }

  const supportPoint = findSurfaceSnapSupportPoint(
    options.supportPoints,
    options.hit.normal
  );

  if (supportPoint === null) {
    return null;
  }

  const desiredPoint = addVec3(
    options.hit.point,
    scaleVec3(options.hit.normal, options.surfaceOffset ?? SURFACE_SNAP_OFFSET)
  );
  const delta = subtractVec3(desiredPoint, supportPoint);

  return options.axisVector === null || options.axisVector === undefined
    ? delta
    : projectOntoAxis(delta, options.axisVector);
}

export function applyRigidDeltaToTransformPreview(
  preview: TransformPreview,
  delta: Vec3
): TransformPreview {
  switch (preview.kind) {
    case "brush":
      return {
        ...preview,
        center: addVec3(preview.center, delta)
      };
    case "brushes":
      return {
        ...preview,
        pivot: addVec3(preview.pivot, delta),
        items: preview.items.map((item) => ({
          ...item,
          center: addVec3(item.center, delta)
        }))
      };
    case "modelInstance":
      return {
        ...preview,
        position: addVec3(preview.position, delta)
      };
    case "modelInstances":
      return {
        ...preview,
        pivot: addVec3(preview.pivot, delta),
        items: preview.items.map((item) => ({
          ...item,
          position: addVec3(item.position, delta)
        }))
      };
    case "entity":
      return {
        ...preview,
        position: addVec3(preview.position, delta)
      };
    case "entities":
      return {
        ...preview,
        pivot: addVec3(preview.pivot, delta),
        items: preview.items.map((item) => ({
          ...item,
          position: addVec3(item.position, delta)
        }))
      };
    case "pathPoint":
      return {
        ...preview,
        position: addVec3(preview.position, delta)
      };
  }
}

export function getSurfaceSnapHitWorldNormal(
  hit: SurfaceSnapIntersectionLike,
  rayDirection: Vec3
): Vec3 | null {
  const localNormal = hit.face?.normal;

  if (localNormal === undefined || localNormal === null) {
    return null;
  }

  const worldNormal = toVector3(fromVector3(localNormal))
    .applyMatrix3(new Matrix3().getNormalMatrix(hit.object.matrixWorld))
    .normalize();

  if (worldNormal.lengthSq() <= 1e-8) {
    return null;
  }

  return dotVec3(fromVector3(worldNormal), normalizeVec3(rayDirection)) < 0
    ? fromVector3(worldNormal)
    : null;
}

export function resolveSurfaceSnapHitFromIntersections(options: {
  hits: readonly SurfaceSnapIntersectionLike[];
  rayDirection: Vec3;
  isObjectExcluded?(object: Object3D): boolean;
}): SurfaceSnapHit | null {
  for (const hit of options.hits) {
    if (hit.object.userData.nonPickable === true) {
      continue;
    }

    if (options.isObjectExcluded?.(hit.object) === true) {
      continue;
    }

    const normal = getSurfaceSnapHitWorldNormal(hit, options.rayDirection);

    if (normal === null) {
      continue;
    }

    return {
      object: hit.object,
      point: cloneVec3(fromVector3(hit.point)),
      normal
    };
  }

  return null;
}
