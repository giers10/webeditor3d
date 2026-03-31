import type { Vec3 } from "../core/vector";

export const DEFAULT_GRID_SIZE = 1;

function assertGridSize(gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    throw new Error("Grid size must be a positive finite number.");
  }

  return gridSize;
}

export function snapValueToGrid(value: number, gridSize = DEFAULT_GRID_SIZE): number {
  const step = assertGridSize(gridSize);

  if (!Number.isFinite(value)) {
    throw new Error("Grid-snapped values must be finite numbers.");
  }

  return Math.round(value / step) * step;
}

function snapPositiveSizeValue(value: number, gridSize: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Box brush size values must be finite numbers.");
  }

  const snappedSize = Math.round(Math.abs(value) / gridSize) * gridSize;
  return snappedSize > 0 ? snappedSize : gridSize;
}

export function snapVec3ToGrid(vector: Vec3, gridSize = DEFAULT_GRID_SIZE): Vec3 {
  return {
    x: snapValueToGrid(vector.x, gridSize),
    y: snapValueToGrid(vector.y, gridSize),
    z: snapValueToGrid(vector.z, gridSize)
  };
}

export function snapPositiveSizeToGrid(size: Vec3, gridSize = DEFAULT_GRID_SIZE): Vec3 {
  const step = assertGridSize(gridSize);

  return {
    x: snapPositiveSizeValue(size.x, step),
    y: snapPositiveSizeValue(size.y, step),
    z: snapPositiveSizeValue(size.z, step)
  };
}
