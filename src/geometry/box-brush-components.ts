import { Euler, MathUtils, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import {
  type BoxBrush,
  type BoxEdgeId,
  type BoxVertexId
} from "../document/brushes";
import { getBoxBrushHalfSize } from "./box-brush";

type Sign = -1 | 1;

interface BoxVertexSigns {
  x: Sign;
  y: Sign;
  z: Sign;
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

export function transformBoxBrushLocalPointToWorld(brush: BoxBrush, localPoint: Vec3): Vec3 {
  const rotation = createBrushRotationEuler(brush);
  const rotatedOffset = new Vector3(localPoint.x, localPoint.y, localPoint.z).applyEuler(rotation);

  return {
    x: brush.center.x + rotatedOffset.x,
    y: brush.center.y + rotatedOffset.y,
    z: brush.center.z + rotatedOffset.z
  };
}

export function getBoxBrushVertexLocalPosition(brush: BoxBrush, vertexId: BoxVertexId): Vec3 {
  const halfSize = getBoxBrushHalfSize(brush);
  const signs = BOX_VERTEX_SIGNS[vertexId];

  return {
    x: signs.x * halfSize.x,
    y: signs.y * halfSize.y,
    z: signs.z * halfSize.z
  };
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
