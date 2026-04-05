import { Euler, MathUtils, Quaternion, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import {
  BOX_FACE_IDS,
  type BoxBrush,
  type BoxEdgeId,
  type BoxFaceId,
  type BoxVertexId
} from "../document/brushes";
import { getBoxBrushFaceVertexIds, getBoxBrushLocalVertexPosition } from "./box-brush-mesh";

type Sign = -1 | 1;

interface BoxVertexSigns {
  x: Sign;
  y: Sign;
  z: Sign;
}

type BoxAxis = "x" | "y" | "z";

interface BoxFaceTransformMeta {
  axis: BoxAxis;
  sign: Sign;
}

interface BoxEdgeTransformMeta {
  axis: BoxAxis;
  signs: {
    x: Sign | null;
    y: Sign | null;
    z: Sign | null;
  };
}

const BOX_VERTEX_SIGNS: Record<BoxVertexId, BoxVertexSigns> = {
  negX_negY_negZ: { x: -1, y: -1, z: -1 },
  posX_negY_negZ: { x: 1, y: -1, z: -1 },
  negX_posY_negZ: { x: -1, y: 1, z: -1 },
  posX_posY_negZ: { x: 1, y: 1, z: -1 },
  negX_negY_posZ: { x: -1, y: -1, z: 1 },
  posX_negY_posZ: { x: 1, y: -1, z: 1 },
  negX_posY_posZ: { x: -1, y: 1, z: 1 },
  posX_posY_posZ: { x: 1, y: 1, z: 1 }
};

const BOX_FACE_TRANSFORM_META: Record<BoxFaceId, BoxFaceTransformMeta> = {
  posX: { axis: "x", sign: 1 },
  negX: { axis: "x", sign: -1 },
  posY: { axis: "y", sign: 1 },
  negY: { axis: "y", sign: -1 },
  posZ: { axis: "z", sign: 1 },
  negZ: { axis: "z", sign: -1 }
};

const BOX_EDGE_TRANSFORM_META: Record<BoxEdgeId, BoxEdgeTransformMeta> = {
  edgeX_negY_negZ: {
    axis: "x",
    signs: { x: null, y: -1, z: -1 }
  },
  edgeX_posY_negZ: {
    axis: "x",
    signs: { x: null, y: 1, z: -1 }
  },
  edgeX_negY_posZ: {
    axis: "x",
    signs: { x: null, y: -1, z: 1 }
  },
  edgeX_posY_posZ: {
    axis: "x",
    signs: { x: null, y: 1, z: 1 }
  },
  edgeY_negX_negZ: {
    axis: "y",
    signs: { x: -1, y: null, z: -1 }
  },
  edgeY_posX_negZ: {
    axis: "y",
    signs: { x: 1, y: null, z: -1 }
  },
  edgeY_negX_posZ: {
    axis: "y",
    signs: { x: -1, y: null, z: 1 }
  },
  edgeY_posX_posZ: {
    axis: "y",
    signs: { x: 1, y: null, z: 1 }
  },
  edgeZ_negX_negY: {
    axis: "z",
    signs: { x: -1, y: -1, z: null }
  },
  edgeZ_posX_negY: {
    axis: "z",
    signs: { x: 1, y: -1, z: null }
  },
  edgeZ_negX_posY: {
    axis: "z",
    signs: { x: -1, y: 1, z: null }
  },
  edgeZ_posX_posY: {
    axis: "z",
    signs: { x: 1, y: 1, z: null }
  }
};

const BOX_EDGE_VERTEX_IDS: Record<BoxEdgeId, { start: BoxVertexId; end: BoxVertexId }> = {
  edgeX_negY_negZ: { start: "negX_negY_negZ", end: "posX_negY_negZ" },
  edgeX_posY_negZ: { start: "negX_posY_negZ", end: "posX_posY_negZ" },
  edgeX_negY_posZ: { start: "negX_negY_posZ", end: "posX_negY_posZ" },
  edgeX_posY_posZ: { start: "negX_posY_posZ", end: "posX_posY_posZ" },
  edgeY_negX_negZ: { start: "negX_negY_negZ", end: "negX_posY_negZ" },
  edgeY_posX_negZ: { start: "posX_negY_negZ", end: "posX_posY_negZ" },
  edgeY_negX_posZ: { start: "negX_negY_posZ", end: "negX_posY_posZ" },
  edgeY_posX_posZ: { start: "posX_negY_posZ", end: "posX_posY_posZ" },
  edgeZ_negX_negY: { start: "negX_negY_negZ", end: "negX_negY_posZ" },
  edgeZ_posX_negY: { start: "posX_negY_negZ", end: "posX_negY_posZ" },
  edgeZ_negX_posY: { start: "negX_posY_negZ", end: "negX_posY_posZ" },
  edgeZ_posX_posY: { start: "posX_posY_negZ", end: "posX_posY_posZ" }
};

export interface BoxBrushEdgeWorldSegment {
  id: BoxEdgeId;
  start: Vec3;
  end: Vec3;
  center: Vec3;
}

function createBrushRotationEuler(brush: BoxBrush): Euler {
  return new Euler(
    MathUtils.degToRad(brush.rotationDegrees.x),
    MathUtils.degToRad(brush.rotationDegrees.y),
    MathUtils.degToRad(brush.rotationDegrees.z),
    "XYZ"
  );
}

export function transformBoxBrushWorldVectorToLocal(brush: BoxBrush, worldVector: Vec3): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const inverseRotation = new Quaternion().setFromEuler(rotation).invert();
  const localVector = new Vector3(worldVector.x, worldVector.y, worldVector.z).applyQuaternion(inverseRotation);

  return {
    x: localVector.x,
    y: localVector.y,
    z: localVector.z
  };
}

export function transformBoxBrushLocalPointToWorld(brush: BoxBrush, localPoint: Vec3): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const rotatedOffset = new Vector3(localPoint.x, localPoint.y, localPoint.z).applyEuler(rotation);

  return {
    x: brush.center.x + rotatedOffset.x,
    y: brush.center.y + rotatedOffset.y,
    z: brush.center.z + rotatedOffset.z
  };
}

export function getBoxBrushFaceTransformMeta(faceId: BoxFaceId): BoxFaceTransformMeta {
  return BOX_FACE_TRANSFORM_META[faceId];
}

export function getBoxBrushEdgeTransformMeta(edgeId: BoxEdgeId): BoxEdgeTransformMeta {
  return BOX_EDGE_TRANSFORM_META[edgeId];
}

export function getBoxBrushVertexSigns(vertexId: BoxVertexId): BoxVertexSigns {
  return BOX_VERTEX_SIGNS[vertexId];
}

export function getBoxBrushFaceWorldCenter(brush: BoxBrush, faceId: BoxFaceId): Vec3 {
  const faceVertexIds = getBoxBrushFaceVertexIds(faceId);
  const localCenter = faceVertexIds.reduce(
    (accumulator, vertexId) => {
      const vertex = getBoxBrushLocalVertexPosition(brush, vertexId);
      return {
        x: accumulator.x + vertex.x * 0.25,
        y: accumulator.y + vertex.y * 0.25,
        z: accumulator.z + vertex.z * 0.25
      };
    },
    { x: 0, y: 0, z: 0 }
  );

  return transformBoxBrushLocalPointToWorld(brush, localCenter);
}

export function getBoxBrushFaceAxis(faceId: BoxFaceId): BoxAxis {
  return BOX_FACE_TRANSFORM_META[faceId].axis;
}

export function getBoxBrushEdgeAxis(edgeId: BoxEdgeId): BoxAxis {
  return BOX_EDGE_TRANSFORM_META[edgeId].axis;
}

export function getBoxBrushFaceIdsForAxis(axis: BoxAxis): BoxFaceId[] {
  return BOX_FACE_IDS.filter((faceId) => BOX_FACE_TRANSFORM_META[faceId].axis === axis);
}

export function getBoxBrushVertexLocalPosition(brush: BoxBrush, vertexId: BoxVertexId): Vec3 {
  return getBoxBrushLocalVertexPosition(brush, vertexId);
}

export function getBoxBrushVertexWorldPosition(brush: BoxBrush, vertexId: BoxVertexId): Vec3 {
  return transformBoxBrushLocalPointToWorld(brush, getBoxBrushVertexLocalPosition(brush, vertexId));
}

export function getBoxBrushEdgeWorldSegment(brush: BoxBrush, edgeId: BoxEdgeId): BoxBrushEdgeWorldSegment {
  const vertexIds = BOX_EDGE_VERTEX_IDS[edgeId];
  const start = getBoxBrushVertexWorldPosition(brush, vertexIds.start);
  const end = getBoxBrushVertexWorldPosition(brush, vertexIds.end);

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
