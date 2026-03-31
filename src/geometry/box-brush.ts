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
  const halfSize = getBoxBrushHalfSize(brush);

  return {
    min: {
      x: brush.center.x - halfSize.x,
      y: brush.center.y - halfSize.y,
      z: brush.center.z - halfSize.z
    },
    max: {
      x: brush.center.x + halfSize.x,
      y: brush.center.y + halfSize.y,
      z: brush.center.z + halfSize.z
    }
  };
}

export function getBoxBrushCornerPositions(brush: BoxBrush): Vec3[] {
  const bounds = getBoxBrushBounds(brush);

  return [
    { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
    { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z },
    { x: bounds.min.x, y: bounds.max.y, z: bounds.min.z },
    { x: bounds.max.x, y: bounds.max.y, z: bounds.min.z },
    { x: bounds.min.x, y: bounds.min.y, z: bounds.max.z },
    { x: bounds.max.x, y: bounds.min.y, z: bounds.max.z },
    { x: bounds.min.x, y: bounds.max.y, z: bounds.max.z },
    { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
  ];
}
