export const DEFAULT_GRID_SIZE = 1;
function assertGridSize(gridSize) {
    if (!Number.isFinite(gridSize) || gridSize <= 0) {
        throw new Error("Grid size must be a positive finite number.");
    }
    return gridSize;
}
export function snapValueToGrid(value, gridSize = DEFAULT_GRID_SIZE) {
    const step = assertGridSize(gridSize);
    if (!Number.isFinite(value)) {
        throw new Error("Grid-snapped values must be finite numbers.");
    }
    return Math.round(value / step) * step;
}
function snapPositiveSizeValue(value, gridSize) {
    if (!Number.isFinite(value)) {
        throw new Error("Box brush size values must be finite numbers.");
    }
    const snappedSize = Math.round(Math.abs(value) / gridSize) * gridSize;
    return snappedSize > 0 ? snappedSize : gridSize;
}
export function snapVec3ToGrid(vector, gridSize = DEFAULT_GRID_SIZE) {
    return {
        x: snapValueToGrid(vector.x, gridSize),
        y: snapValueToGrid(vector.y, gridSize),
        z: snapValueToGrid(vector.z, gridSize)
    };
}
export function snapPositiveSizeToGrid(size, gridSize = DEFAULT_GRID_SIZE) {
    const step = assertGridSize(gridSize);
    return {
        x: snapPositiveSizeValue(size.x, step),
        y: snapPositiveSizeValue(size.y, step),
        z: snapPositiveSizeValue(size.z, step)
    };
}
