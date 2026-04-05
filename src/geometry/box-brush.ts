import { Euler, MathUtils, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import { type BoxBrush } from "../document/brushes";
import { getBoxBrushLocalVertexPosition } from "./box-brush-mesh";

export interface BoxBrushBounds {
  min: Vec3;
  max: Vec3;
}

export function getBoxBrushHalfSize(brush: BoxBrush): Vec3 {
  return {
    x: brush.size.x * 0.5,
    y: brush.size.y * 0.5,
    z: brush.size.z * 0.5
  };
}

export function getBoxBrushBounds(brush: BoxBrush): BoxBrushBounds {
  const corners = getBoxBrushCornerPositions(brush);
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

export function getBoxBrushCornerPositions(brush: BoxBrush): Vec3[] {
  const rotation = new Euler(
    MathUtils.degToRad(brush.rotationDegrees.x),
    MathUtils.degToRad(brush.rotationDegrees.y),
    MathUtils.degToRad(brush.rotationDegrees.z),
    "XYZ"
  );
  const offsets = [
    "negX_negY_negZ",
    "posX_negY_negZ",
    "negX_posY_negZ",
    "posX_posY_negZ",
    "negX_negY_posZ",
    "posX_negY_posZ",
    "negX_posY_posZ",
    "posX_posY_posZ"
  ].map((vertexId) => {
    const localVertex = getBoxBrushLocalVertexPosition(brush, vertexId as keyof BoxBrush["geometry"]["vertices"] & never);
    return new Vector3(localVertex.x, localVertex.y, localVertex.z);
  });

  return offsets.map((offset) => {
    const rotatedOffset = offset.clone().applyEuler(rotation);

    return {
      x: brush.center.x + rotatedOffset.x,
      y: brush.center.y + rotatedOffset.y,
      z: brush.center.z + rotatedOffset.z
    };
  });
}
