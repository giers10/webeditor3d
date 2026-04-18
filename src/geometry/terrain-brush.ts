import type { Vec3 } from "../core/vector";
import type {
  TerrainBrushSettings,
  TerrainBrushTool
} from "../core/terrain-brush";
import {
  createTerrain,
  getTerrainHeightAtSample,
  getTerrainSampleIndex,
  type Terrain
} from "../document/terrains";

export interface TerrainBrushPoint {
  x: number;
  z: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function getTerrainBrushWeight(
  distance: number,
  radius: number,
  falloff: number
): number {
  if (!Number.isFinite(radius) || radius <= 0) {
    return 0;
  }

  if (distance >= radius) {
    return 0;
  }

  const normalizedDistance = clamp01(distance / radius);
  const baseWeight = 1 - normalizedDistance;
  const exponent = 1 + clamp01(falloff) * 3;
  return Math.pow(baseWeight, exponent);
}

export function sampleTerrainHeightAtWorldPosition(
  terrain: Terrain,
  worldX: number,
  worldZ: number,
  clampToBounds = false
): number | null {
  const sampleSpaceX = (worldX - terrain.position.x) / terrain.cellSize;
  const sampleSpaceZ = (worldZ - terrain.position.z) / terrain.cellSize;
  const maxSampleX = terrain.sampleCountX - 1;
  const maxSampleZ = terrain.sampleCountZ - 1;

  if (!clampToBounds) {
    if (
      sampleSpaceX < 0 ||
      sampleSpaceX > maxSampleX ||
      sampleSpaceZ < 0 ||
      sampleSpaceZ > maxSampleZ
    ) {
      return null;
    }
  }

  const clampedSampleX = clamp(sampleSpaceX, 0, maxSampleX);
  const clampedSampleZ = clamp(sampleSpaceZ, 0, maxSampleZ);
  const x0 = Math.floor(clampedSampleX);
  const z0 = Math.floor(clampedSampleZ);
  const x1 = Math.min(maxSampleX, x0 + 1);
  const z1 = Math.min(maxSampleZ, z0 + 1);
  const tx = clampedSampleX - x0;
  const tz = clampedSampleZ - z0;
  const top = lerp(
    getTerrainHeightAtSample(terrain, x0, z0),
    getTerrainHeightAtSample(terrain, x1, z0),
    tx
  );
  const bottom = lerp(
    getTerrainHeightAtSample(terrain, x0, z1),
    getTerrainHeightAtSample(terrain, x1, z1),
    tx
  );

  return lerp(top, bottom, tz);
}

export function createTerrainBrushPreviewPoints(
  terrain: Terrain,
  center: TerrainBrushPoint,
  radius: number,
  segmentCount = 36,
  heightOffset = 0.06
): Vec3[] {
  const points: Vec3[] = [];
  const minX = terrain.position.x;
  const minZ = terrain.position.z;
  const maxX =
    terrain.position.x + (terrain.sampleCountX - 1) * terrain.cellSize;
  const maxZ =
    terrain.position.z + (terrain.sampleCountZ - 1) * terrain.cellSize;

  for (let segmentIndex = 0; segmentIndex <= segmentCount; segmentIndex += 1) {
    const angle = (segmentIndex / segmentCount) * Math.PI * 2;
    const unclampedX = center.x + Math.cos(angle) * radius;
    const unclampedZ = center.z + Math.sin(angle) * radius;
    const worldX = clamp(unclampedX, minX, maxX);
    const worldZ = clamp(unclampedZ, minZ, maxZ);
    const height =
      sampleTerrainHeightAtWorldPosition(terrain, worldX, worldZ, true) ?? 0;

    points.push({
      x: worldX,
      y: terrain.position.y + height + heightOffset,
      z: worldZ
    });
  }

  return points;
}

function getTerrainSmoothTargetHeight(
  terrain: Terrain,
  sourceHeights: readonly number[],
  sampleX: number,
  sampleZ: number
): number {
  let total = 0;
  let count = 0;

  for (
    let neighborZ = Math.max(0, sampleZ - 1);
    neighborZ <= Math.min(terrain.sampleCountZ - 1, sampleZ + 1);
    neighborZ += 1
  ) {
    for (
      let neighborX = Math.max(0, sampleX - 1);
      neighborX <= Math.min(terrain.sampleCountX - 1, sampleX + 1);
      neighborX += 1
    ) {
      total +=
        sourceHeights[getTerrainSampleIndex(terrain, neighborX, neighborZ)] ?? 0;
      count += 1;
    }
  }

  return count === 0
    ? sourceHeights[getTerrainSampleIndex(terrain, sampleX, sampleZ)] ?? 0
    : total / count;
}

export function applyTerrainBrushStamp(options: {
  terrain: Terrain;
  center: TerrainBrushPoint;
  settings: TerrainBrushSettings;
  tool: TerrainBrushTool;
  referenceHeight?: number | null;
}): Terrain {
  const { terrain, center, settings, tool, referenceHeight = null } = options;
  const { radius, strength, falloff } = settings;
  const minSampleX = Math.max(
    0,
    Math.floor((center.x - terrain.position.x - radius) / terrain.cellSize)
  );
  const maxSampleX = Math.min(
    terrain.sampleCountX - 1,
    Math.ceil((center.x - terrain.position.x + radius) / terrain.cellSize)
  );
  const minSampleZ = Math.max(
    0,
    Math.floor((center.z - terrain.position.z - radius) / terrain.cellSize)
  );
  const maxSampleZ = Math.min(
    terrain.sampleCountZ - 1,
    Math.ceil((center.z - terrain.position.z + radius) / terrain.cellSize)
  );
  const sourceHeights = terrain.heights;
  const nextHeights = [...sourceHeights];
  const smoothingStrength = clamp01(strength);
  let changed = false;

  for (let sampleZ = minSampleZ; sampleZ <= maxSampleZ; sampleZ += 1) {
    for (let sampleX = minSampleX; sampleX <= maxSampleX; sampleX += 1) {
      const worldX = terrain.position.x + sampleX * terrain.cellSize;
      const worldZ = terrain.position.z + sampleZ * terrain.cellSize;
      const distance = Math.hypot(worldX - center.x, worldZ - center.z);
      const weight = getTerrainBrushWeight(distance, radius, falloff);

      if (weight <= 0) {
        continue;
      }

      const sampleIndex = getTerrainSampleIndex(terrain, sampleX, sampleZ);
      const currentHeight = sourceHeights[sampleIndex] ?? 0;
      let nextHeight = currentHeight;

      switch (tool) {
        case "raise":
          nextHeight = currentHeight + strength * weight;
          break;
        case "lower":
          nextHeight = currentHeight - strength * weight;
          break;
        case "smooth": {
          const smoothTargetHeight = getTerrainSmoothTargetHeight(
            terrain,
            sourceHeights,
            sampleX,
            sampleZ
          );
          nextHeight = lerp(
            currentHeight,
            smoothTargetHeight,
            clamp01(smoothingStrength * weight)
          );
          break;
        }
        case "flatten":
          if (referenceHeight === null || !Number.isFinite(referenceHeight)) {
            throw new Error(
              "Flatten terrain brush stamps require a finite reference height."
            );
          }

          nextHeight = lerp(
            currentHeight,
            referenceHeight,
            clamp01(smoothingStrength * weight)
          );
          break;
      }

      if (nextHeight !== currentHeight) {
        nextHeights[sampleIndex] = nextHeight;
        changed = true;
      }
    }
  }

  return changed ? createTerrain({ ...terrain, heights: nextHeights }) : terrain;
}

export function getTerrainBrushStrokeSpacing(
  terrain: Terrain,
  settings: TerrainBrushSettings
): number {
  return Math.max(terrain.cellSize * 0.5, settings.radius * 0.25);
}
