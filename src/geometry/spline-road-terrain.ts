import type { TerrainBrushPatch } from "../core/terrain-brush";
import {
  resolveScenePath,
  type ResolvedScenePath,
  type ResolvedScenePathSegment,
  type ScenePath
} from "../document/paths";
import {
  createTerrain,
  getTerrainFoliageMaskSampleIndex,
  getTerrainHeightAtSample,
  getTerrainPaintWeightSampleOffset,
  getTerrainSampleIndex,
  getTerrainSampleLayerWeights,
  getTerrainStoredPaintWeightCount,
  type Terrain
} from "../document/terrains";
import { createTerrainBrushPatchFromTerrains } from "./terrain-brush";

interface RoadProjection {
  distance: number;
  y: number;
}

interface RoadBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function createTerrainConformPath(path: ScenePath): ScenePath {
  return path.road.terrainConform
    ? {
        ...path,
        glueToTerrain: true,
        terrainOffset: path.glueToTerrain ? path.terrainOffset : 0
      }
    : path;
}

function getRoadInfluence(distance: number, path: ScenePath): number {
  const halfWidth = path.road.width * 0.5;

  if (distance <= halfWidth) {
    return 1;
  }

  if (path.road.shoulderWidth <= 0) {
    return 0;
  }

  const shoulderProgress = (distance - halfWidth) / path.road.shoulderWidth;

  if (shoulderProgress >= 1) {
    return 0;
  }

  const exponent = 1 + path.road.falloff * 3;
  return Math.pow(1 - clamp(shoulderProgress, 0, 1), exponent);
}

function projectWorldPointOntoSegmentXZ(
  segment: ResolvedScenePathSegment,
  worldX: number,
  worldZ: number
): RoadProjection {
  const deltaX = segment.end.x - segment.start.x;
  const deltaZ = segment.end.z - segment.start.z;
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
  const t =
    lengthSquared <= 1e-8
      ? 0
      : clamp(
          ((worldX - segment.start.x) * deltaX +
            (worldZ - segment.start.z) * deltaZ) /
            lengthSquared,
          0,
          1
        );
  const projectedX = segment.start.x + deltaX * t;
  const projectedZ = segment.start.z + deltaZ * t;

  return {
    distance: Math.hypot(worldX - projectedX, worldZ - projectedZ),
    y: lerp(segment.start.y, segment.end.y, t)
  };
}

function projectWorldPointOntoRoadXZ(
  path: ResolvedScenePath,
  worldX: number,
  worldZ: number
): RoadProjection | null {
  let nearestProjection: RoadProjection | null = null;

  for (const segment of path.segments) {
    const projection = projectWorldPointOntoSegmentXZ(segment, worldX, worldZ);

    if (
      nearestProjection === null ||
      projection.distance < nearestProjection.distance
    ) {
      nearestProjection = projection;
    }
  }

  return nearestProjection;
}

function getRoadBounds(path: ResolvedScenePath, radius: number): RoadBounds | null {
  if (path.segments.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const segment of path.segments) {
    minX = Math.min(minX, segment.start.x, segment.end.x);
    maxX = Math.max(maxX, segment.start.x, segment.end.x);
    minZ = Math.min(minZ, segment.start.z, segment.end.z);
    maxZ = Math.max(maxZ, segment.start.z, segment.end.z);
  }

  return {
    minX: minX - radius,
    maxX: maxX + radius,
    minZ: minZ - radius,
    maxZ: maxZ + radius
  };
}

function getTerrainSampleBoundsForRoad(
  terrain: Terrain,
  bounds: RoadBounds
): { minSampleX: number; maxSampleX: number; minSampleZ: number; maxSampleZ: number } | null {
  const minSampleX = Math.max(
    0,
    Math.floor((bounds.minX - terrain.position.x) / terrain.cellSize)
  );
  const maxSampleX = Math.min(
    terrain.sampleCountX - 1,
    Math.ceil((bounds.maxX - terrain.position.x) / terrain.cellSize)
  );
  const minSampleZ = Math.max(
    0,
    Math.floor((bounds.minZ - terrain.position.z) / terrain.cellSize)
  );
  const maxSampleZ = Math.min(
    terrain.sampleCountZ - 1,
    Math.ceil((bounds.maxZ - terrain.position.z) / terrain.cellSize)
  );

  return minSampleX > maxSampleX || minSampleZ > maxSampleZ
    ? null
    : {
        minSampleX,
        maxSampleX,
        minSampleZ,
        maxSampleZ
      };
}

function getRoadPaintLayerIndex(path: ScenePath, terrain: Terrain): number | null {
  if (path.road.materialId === null) {
    return null;
  }

  const layerIndex = terrain.layers.findIndex(
    (layer) => layer.materialId === path.road.materialId
  );

  return layerIndex === -1 ? null : layerIndex;
}

function createRoadTargetWeights(
  terrain: Terrain,
  layerIndex: number
): number[] {
  return terrain.layers.map((_, currentLayerIndex) =>
    currentLayerIndex === layerIndex ? 1 : 0
  );
}

function applyRoadPaintWeights(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  layerIndex: number,
  influence: number,
  changedPaintWeightIndices: Set<number>
) {
  const currentWeights = getTerrainSampleLayerWeights(terrain, sampleX, sampleZ);
  const targetWeights = createRoadTargetWeights(terrain, layerIndex);
  const offset = getTerrainPaintWeightSampleOffset(terrain, sampleX, sampleZ);
  const storedWeightCount = getTerrainStoredPaintWeightCount(
    terrain.layers.length
  );

  for (let layerOffset = 0; layerOffset < storedWeightCount; layerOffset += 1) {
    const paintWeightIndex = offset + layerOffset;
    const currentWeight = currentWeights[layerOffset + 1] ?? 0;
    const nextWeight = lerp(
      currentWeight,
      targetWeights[layerOffset + 1] ?? 0,
      influence
    );

    if (terrain.paintWeights[paintWeightIndex] === nextWeight) {
      continue;
    }

    terrain.paintWeights[paintWeightIndex] = nextWeight;
    changedPaintWeightIndices.add(paintWeightIndex);
  }
}

export function createSplineRoadTerrainPatch(options: {
  path: ScenePath;
  terrain: Terrain;
}): TerrainBrushPatch | null {
  const { path, terrain } = options;

  if (!path.road.enabled) {
    return null;
  }

  const resolvedPath = resolveScenePath(createTerrainConformPath(path), {
    terrains: [terrain]
  });
  const influenceRadius = path.road.width * 0.5 + path.road.shoulderWidth;
  const roadBounds = getRoadBounds(resolvedPath, influenceRadius);

  if (roadBounds === null) {
    return null;
  }

  const sampleBounds = getTerrainSampleBoundsForRoad(terrain, roadBounds);

  if (sampleBounds === null) {
    return null;
  }

  const nextTerrain = createTerrain(terrain);
  const changedHeightIndices = new Set<number>();
  const changedPaintWeightIndices = new Set<number>();
  const changedFoliageBlockerIndices = new Set<number>();
  const roadPaintLayerIndex = getRoadPaintLayerIndex(path, nextTerrain);

  for (
    let sampleZ = sampleBounds.minSampleZ;
    sampleZ <= sampleBounds.maxSampleZ;
    sampleZ += 1
  ) {
    for (
      let sampleX = sampleBounds.minSampleX;
      sampleX <= sampleBounds.maxSampleX;
      sampleX += 1
    ) {
      const worldX = terrain.position.x + sampleX * terrain.cellSize;
      const worldZ = terrain.position.z + sampleZ * terrain.cellSize;
      const projection = projectWorldPointOntoRoadXZ(
        resolvedPath,
        worldX,
        worldZ
      );

      if (projection === null) {
        continue;
      }

      const influence = getRoadInfluence(projection.distance, path);

      if (influence <= 0) {
        continue;
      }

      const sampleIndex = getTerrainSampleIndex(terrain, sampleX, sampleZ);
      const currentHeight = getTerrainHeightAtSample(
        nextTerrain,
        sampleX,
        sampleZ
      );
      const targetHeight =
        projection.y + path.road.heightOffset - terrain.position.y;
      const nextHeight = lerp(currentHeight, targetHeight, influence);

      if (nextHeight !== currentHeight) {
        nextTerrain.heights[sampleIndex] = nextHeight;
        changedHeightIndices.add(sampleIndex);
      }

      if (roadPaintLayerIndex !== null) {
        applyRoadPaintWeights(
          nextTerrain,
          sampleX,
          sampleZ,
          roadPaintLayerIndex,
          influence,
          changedPaintWeightIndices
        );
      }

      const blockerIndex = getTerrainFoliageMaskSampleIndex(
        nextTerrain.foliageBlockerMask,
        sampleX,
        sampleZ
      );
      const currentBlocker =
        nextTerrain.foliageBlockerMask.values[blockerIndex] ?? 0;
      const nextBlocker = Math.max(currentBlocker, influence);

      if (nextBlocker !== currentBlocker) {
        nextTerrain.foliageBlockerMask.values[blockerIndex] = nextBlocker;
        changedFoliageBlockerIndices.add(blockerIndex);
      }
    }
  }

  const patch = createTerrainBrushPatchFromTerrains({
    before: terrain,
    after: nextTerrain,
    heightSampleIndices: changedHeightIndices,
    paintWeightIndices: changedPaintWeightIndices,
    foliageBlockerMaskValueIndices: changedFoliageBlockerIndices
  });

  return patch.heightSamples.length === 0 &&
    patch.paintWeights.length === 0 &&
    patch.foliageBlockerMaskValues.length === 0
    ? null
    : patch;
}

export function createSplineRoadTerrainPatches(options: {
  path: ScenePath;
  terrains: readonly Terrain[];
}): TerrainBrushPatch[] {
  return options.terrains
    .filter((terrain) => terrain.enabled)
    .map((terrain) =>
      createSplineRoadTerrainPatch({
        path: options.path,
        terrain
      })
    )
    .filter((patch): patch is TerrainBrushPatch => patch !== null);
}
