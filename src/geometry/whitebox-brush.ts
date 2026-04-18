import { Euler, MathUtils, Quaternion, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import type {
  Brush,
  BrushGeometry,
  WhiteboxEdgeId,
  WhiteboxFaceId,
  WhiteboxVertexId
} from "../document/brushes";
import {
  getBrushEdgeVertexIds,
  getBrushFaceVertexIds,
  getBrushVertexIds
} from "./whitebox-topology";

export interface WhiteboxBounds {
  min: Vec3;
  max: Vec3;
}

export interface WhiteboxEdgeWorldSegment {
  id: WhiteboxEdgeId;
  start: Vec3;
  end: Vec3;
  center: Vec3;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function createBrushRotationEuler(brush: { rotationDegrees: Vec3 }): Euler {
  return new Euler(
    MathUtils.degToRad(brush.rotationDegrees.x),
    MathUtils.degToRad(brush.rotationDegrees.y),
    MathUtils.degToRad(brush.rotationDegrees.z),
    "XYZ"
  );
}

export function getBrushLocalVertexPosition(
  brush: { geometry: BrushGeometry },
  vertexId: WhiteboxVertexId
): Vec3 {
  const vertex = brush.geometry.vertices[vertexId];

  if (vertex === undefined) {
    throw new Error(`Whitebox vertex ${vertexId} does not exist on this brush.`);
  }

  return cloneVec3(vertex);
}

export function transformBrushWorldVectorToLocal(
  brush: { rotationDegrees: Vec3 },
  worldVector: Vec3
): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const inverseRotation = new Quaternion().setFromEuler(rotation).invert();
  const localVector = new Vector3(
    worldVector.x,
    worldVector.y,
    worldVector.z
  ).applyQuaternion(inverseRotation);

  return {
    x: localVector.x,
    y: localVector.y,
    z: localVector.z
  };
}

export function transformBrushWorldPointToLocal(
  brush: { center: Vec3; rotationDegrees: Vec3 },
  worldPoint: Vec3
): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const inverseRotation = new Quaternion().setFromEuler(rotation).invert();
  const localPoint = new Vector3(
    worldPoint.x - brush.center.x,
    worldPoint.y - brush.center.y,
    worldPoint.z - brush.center.z
  ).applyQuaternion(inverseRotation);

  return {
    x: localPoint.x,
    y: localPoint.y,
    z: localPoint.z
  };
}

export function transformBrushLocalPointToWorld(
  brush: { center: Vec3; rotationDegrees: Vec3 },
  localPoint: Vec3
): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const rotatedOffset = new Vector3(
    localPoint.x,
    localPoint.y,
    localPoint.z
  ).applyEuler(rotation);

  return {
    x: brush.center.x + rotatedOffset.x,
    y: brush.center.y + rotatedOffset.y,
    z: brush.center.z + rotatedOffset.z
  };
}

export function getBrushVertexWorldPosition(
  brush: { center: Vec3; rotationDegrees: Vec3; geometry: BrushGeometry },
  vertexId: WhiteboxVertexId
): Vec3 {
  return transformBrushLocalPointToWorld(
    brush,
    getBrushLocalVertexPosition(brush, vertexId)
  );
}

export function getBrushFaceWorldCenter(
  brush: Brush,
  faceId: WhiteboxFaceId
): Vec3 {
  const vertexIds = getBrushFaceVertexIds(brush, faceId);
  const weight = 1 / vertexIds.length;
  const localCenter = vertexIds.reduce(
    (accumulator, vertexId) => {
      const vertex = getBrushLocalVertexPosition(brush, vertexId);

      return {
        x: accumulator.x + vertex.x * weight,
        y: accumulator.y + vertex.y * weight,
        z: accumulator.z + vertex.z * weight
      };
    },
    {
      x: 0,
      y: 0,
      z: 0
    }
  );

  return transformBrushLocalPointToWorld(brush, localCenter);
}

export function getBrushEdgeWorldSegment(
  brush: Brush,
  edgeId: WhiteboxEdgeId
): WhiteboxEdgeWorldSegment {
  const [startId, endId] = getBrushEdgeVertexIds(brush, edgeId);
  const start = getBrushVertexWorldPosition(brush, startId);
  const end = getBrushVertexWorldPosition(brush, endId);

  return {
    id: edgeId,
    start,
    end,
    center: {
      x: (start.x + end.x) * 0.5,
      y: (start.y + end.y) * 0.5,
      z: (start.z + end.z) * 0.5
    }
  };
}

export function getBrushBounds(brush: Brush): WhiteboxBounds {
  const corners = getBrushVertexIds(brush).map((vertexId) =>
    getBrushVertexWorldPosition(brush, vertexId)
  );
  const firstCorner = corners[0];
  const min = { ...firstCorner };
  const max = { ...firstCorner };

  for (const corner of corners.slice(1)) {
    min.x = Math.min(min.x, corner.x);
    min.y = Math.min(min.y, corner.y);
    min.z = Math.min(min.z, corner.z);
    max.x = Math.max(max.x, corner.x);
    max.y = Math.max(max.y, corner.y);
    max.z = Math.max(max.z, corner.z);
  }

  return {
    min,
    max
  };
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function crossVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function getVectorLength(vector: Vec3): number {
  return Math.sqrt(dotVec3(vector, vector));
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = getVectorLength(vector);

  if (length <= 1e-8) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function getDominantAxis(vector: Vec3): "x" | "y" | "z" {
  const absolute = {
    x: Math.abs(vector.x),
    y: Math.abs(vector.y),
    z: Math.abs(vector.z)
  };

  if (absolute.x >= absolute.y && absolute.x >= absolute.z) {
    return "x";
  }

  if (absolute.y >= absolute.z) {
    return "y";
  }

  return "z";
}

export function getBrushFaceNormal(
  brush: Brush,
  faceId: WhiteboxFaceId
): Vec3 {
  const vertexIds = getBrushFaceVertexIds(brush, faceId);
  const vertices = vertexIds.map((vertexId) =>
    getBrushLocalVertexPosition(brush, vertexId)
  );

  let normal = { x: 0, y: 0, z: 0 };

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }

  return normalizeVec3(normal);
}

export function getBrushFaceAxis(
  brush: Brush,
  faceId: WhiteboxFaceId
): "x" | "y" | "z" {
  return getDominantAxis(getBrushFaceNormal(brush, faceId));
}

export function getBrushEdgeAxis(
  brush: Brush,
  edgeId: WhiteboxEdgeId
): "x" | "y" | "z" {
  const [startId, endId] = getBrushEdgeVertexIds(brush, edgeId);
  const start = getBrushLocalVertexPosition(brush, startId);
  const end = getBrushLocalVertexPosition(brush, endId);

  return getDominantAxis(subtractVec3(end, start));
}

export function getBrushEdgeScaleAxes(
  brush: Brush,
  edgeId: WhiteboxEdgeId
): Array<"x" | "y" | "z"> {
  const edgeAxis = getBrushEdgeAxis(brush, edgeId);
  return (["x", "y", "z"] as const).filter((axis) => axis !== edgeAxis);
}

export function getBrushFaceBasis(
  brush: Brush,
  faceId: WhiteboxFaceId
): { origin: Vec3; uAxis: Vec3; vAxis: Vec3 } {
  const vertexIds = getBrushFaceVertexIds(brush, faceId);
  const vertices = vertexIds.map((vertexId) =>
    getBrushLocalVertexPosition(brush, vertexId)
  );
  const origin = vertices[0];
  const firstEdge = normalizeVec3(subtractVec3(vertices[1], origin));
  const normal = getBrushFaceNormal(brush, faceId);
  const vAxis = normalizeVec3(crossVec3(normal, firstEdge));

  return {
    origin,
    uAxis: firstEdge,
    vAxis
  };
}
