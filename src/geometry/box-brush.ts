import { Euler, MathUtils, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import type { BoxBrush } from "../document/brushes";

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
  const halfSize = getBoxBrushHalfSize(brush);
  const rotation = new Euler(
    MathUtils.degToRad(brush.rotationDegrees.x),
    MathUtils.degToRad(brush.rotationDegrees.y),
    MathUtils.degToRad(brush.rotationDegrees.z),
    "XYZ"
  );
  const offsets = [
    new Vector3(-halfSize.x, -halfSize.y, -halfSize.z),
    new Vector3(halfSize.x, -halfSize.y, -halfSize.z),
    new Vector3(-halfSize.x, halfSize.y, -halfSize.z),
    new Vector3(halfSize.x, halfSize.y, -halfSize.z),
    new Vector3(-halfSize.x, -halfSize.y, halfSize.z),
    new Vector3(halfSize.x, -halfSize.y, halfSize.z),
    new Vector3(-halfSize.x, halfSize.y, halfSize.z),
    new Vector3(halfSize.x, halfSize.y, halfSize.z)
  ];

  return offsets.map((offset) => {
    const rotatedOffset = offset.clone().applyEuler(rotation);

    return {
      x: brush.center.x + rotatedOffset.x,
      y: brush.center.y + rotatedOffset.y,
      z: brush.center.z + rotatedOffset.z
    };
  });
}
