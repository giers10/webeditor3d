import { BufferAttribute, BufferGeometry } from "three";

import type { Vec3 } from "../core/vector";
import {
  getTerrainFoliageMask,
  getTerrainFoliageMaskValueAtSample,
  getTerrainHeightAtSample,
  getTerrainSampleLayerWeights,
  TERRAIN_LAYER_COUNT,
  type Terrain
} from "../document/terrains";

export type TerrainCellDiagonal = "forward" | "backward";

export interface TerrainCellTriangulation {
  cellX: number;
  cellZ: number;
  diagonal: TerrainCellDiagonal;
}

export interface DerivedTerrainMeshData {
  geometry: BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  layerWeights: Float32Array;
  foliageMaskWeights: Float32Array;
  indices: Uint32Array;
  cellTriangulation: TerrainCellTriangulation[];
  localBounds: {
    min: Vec3;
    max: Vec3;
  };
}

export const TERRAIN_LOD_CHUNK_SIZE_CELLS = 64;
export const TERRAIN_LOD_STRIDES = [1, 2, 4, 8, 16] as const;
export const TERRAIN_LOD_DEBUG_COLORS = [
  0xff4d4d,
  0xffa53d,
  0xffe66d,
  0x4ee06f,
  0x4ba3ff
] as const;
const TERRAIN_LOD_DISTANCE_MULTIPLIERS = [0.75, 1.5, 3, 6] as const;
const TERRAIN_LOD_HYSTERESIS_RATIO = 0.16;

interface TerrainMeshBuildOptions {
  foliageMaskLayerId?: string | null;
}

export interface TerrainLodLevelMeshData {
  level: number;
  stride: number;
  geometry: BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  layerWeights: Float32Array;
  foliageMaskWeights: Float32Array;
  indices: Uint32Array;
  skirtVertexCount: number;
}

export interface TerrainLodChunkMeshData {
  chunkX: number;
  chunkZ: number;
  startSampleX: number;
  startSampleZ: number;
  endSampleX: number;
  endSampleZ: number;
  cellCountX: number;
  cellCountZ: number;
  levels: TerrainLodLevelMeshData[];
  localBounds: {
    min: Vec3;
    max: Vec3;
  };
  localCenter: Vec3;
  diagonal: number;
}

export interface DerivedTerrainLodMeshData {
  chunkSizeCells: number;
  chunks: TerrainLodChunkMeshData[];
  localBounds: {
    min: Vec3;
    max: Vec3;
  };
}

function createEmptyLocalBounds(): { min: Vec3; max: Vec3 } {
  return {
    min: {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      z: Number.POSITIVE_INFINITY
    },
    max: {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
      z: Number.NEGATIVE_INFINITY
    }
  };
}

function includePointInBounds(bounds: { min: Vec3; max: Vec3 }, point: Vec3) {
  bounds.min.x = Math.min(bounds.min.x, point.x);
  bounds.min.y = Math.min(bounds.min.y, point.y);
  bounds.min.z = Math.min(bounds.min.z, point.z);
  bounds.max.x = Math.max(bounds.max.x, point.x);
  bounds.max.y = Math.max(bounds.max.y, point.y);
  bounds.max.z = Math.max(bounds.max.z, point.z);
}

function cloneBounds(bounds: { min: Vec3; max: Vec3 }): {
  min: Vec3;
  max: Vec3;
} {
  return {
    min: {
      x: bounds.min.x,
      y: bounds.min.y,
      z: bounds.min.z
    },
    max: {
      x: bounds.max.x,
      y: bounds.max.y,
      z: bounds.max.z
    }
  };
}

function chooseCellDiagonal(
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number
): TerrainCellDiagonal {
  return Math.abs(topLeft - bottomRight) <= Math.abs(topRight - bottomLeft)
    ? "forward"
    : "backward";
}

function pushCellIndices(
  indices: number[],
  cellTriangulation: TerrainCellTriangulation[],
  cellX: number,
  cellZ: number,
  diagonal: TerrainCellDiagonal,
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number
) {
  cellTriangulation.push({
    cellX,
    cellZ,
    diagonal
  });

  if (diagonal === "forward") {
    indices.push(topLeft, bottomLeft, bottomRight);
    indices.push(topLeft, bottomRight, topRight);
    return;
  }

  indices.push(topLeft, bottomLeft, topRight);
  indices.push(topRight, bottomLeft, bottomRight);
}

export function buildTerrainDerivedMeshData(
  terrain: Terrain
): DerivedTerrainMeshData {
  const vertexCount = terrain.sampleCountX * terrain.sampleCountZ;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const layerWeights = new Float32Array(vertexCount * TERRAIN_LAYER_COUNT);
  const localBounds = createEmptyLocalBounds();
  let vertexOffset = 0;
  let uvOffset = 0;
  let layerWeightOffset = 0;

  for (let sampleZ = 0; sampleZ < terrain.sampleCountZ; sampleZ += 1) {
    for (let sampleX = 0; sampleX < terrain.sampleCountX; sampleX += 1) {
      const localX = sampleX * terrain.cellSize;
      const localY = getTerrainHeightAtSample(terrain, sampleX, sampleZ);
      const sampleLayerWeights = getTerrainSampleLayerWeights(
        terrain,
        sampleX,
        sampleZ
      );
      const localZ = sampleZ * terrain.cellSize;
      positions[vertexOffset] = localX;
      positions[vertexOffset + 1] = localY;
      positions[vertexOffset + 2] = localZ;
      vertexOffset += 3;

      localBounds.min.x = Math.min(localBounds.min.x, localX);
      localBounds.min.y = Math.min(localBounds.min.y, localY);
      localBounds.min.z = Math.min(localBounds.min.z, localZ);
      localBounds.max.x = Math.max(localBounds.max.x, localX);
      localBounds.max.y = Math.max(localBounds.max.y, localY);
      localBounds.max.z = Math.max(localBounds.max.z, localZ);

      uvs[uvOffset] = terrain.position.x + localX;
      uvs[uvOffset + 1] = terrain.position.z + localZ;
      uvOffset += 2;

      for (
        let layerIndex = 0;
        layerIndex < TERRAIN_LAYER_COUNT;
        layerIndex += 1
      ) {
        layerWeights[layerWeightOffset + layerIndex] =
          sampleLayerWeights[layerIndex];
      }
      layerWeightOffset += TERRAIN_LAYER_COUNT;
    }
  }

  const indexValues: number[] = [];
  const cellTriangulation: TerrainCellTriangulation[] = [];

  for (let cellZ = 0; cellZ < terrain.sampleCountZ - 1; cellZ += 1) {
    for (let cellX = 0; cellX < terrain.sampleCountX - 1; cellX += 1) {
      const topLeft = cellZ * terrain.sampleCountX + cellX;
      const topRight = topLeft + 1;
      const bottomLeft = (cellZ + 1) * terrain.sampleCountX + cellX;
      const bottomRight = bottomLeft + 1;
      const diagonal = chooseCellDiagonal(
        getTerrainHeightAtSample(terrain, cellX, cellZ),
        getTerrainHeightAtSample(terrain, cellX + 1, cellZ),
        getTerrainHeightAtSample(terrain, cellX, cellZ + 1),
        getTerrainHeightAtSample(terrain, cellX + 1, cellZ + 1)
      );

      pushCellIndices(
        indexValues,
        cellTriangulation,
        cellX,
        cellZ,
        diagonal,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      );
    }
  }

  const indices = new Uint32Array(indexValues);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "terrainLayerWeights",
    new BufferAttribute(layerWeights, TERRAIN_LAYER_COUNT)
  );
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const normalAttribute = geometry.getAttribute("normal");
  const normals = new Float32Array(normalAttribute.array.length);
  normals.set(normalAttribute.array as ArrayLike<number>);

  return {
    geometry,
    positions,
    normals,
    uvs,
    layerWeights,
    indices,
    cellTriangulation,
    localBounds
  };
}

function createLodSampleCoordinates(
  startSample: number,
  endSample: number,
  stride: number
): number[] {
  if (startSample === endSample) {
    return [startSample];
  }

  const coordinates: number[] = [];

  for (
    let sample = startSample;
    sample <= endSample;
    sample += Math.max(1, stride)
  ) {
    coordinates.push(sample);
  }

  if (coordinates[coordinates.length - 1] !== endSample) {
    coordinates.push(endSample);
  }

  return coordinates;
}

function getUsefulTerrainLodStrides(cellCountX: number, cellCountZ: number) {
  const strides: number[] = [];
  let previousSignature = "";

  for (const stride of TERRAIN_LOD_STRIDES) {
    const xCount = createLodSampleCoordinates(0, cellCountX, stride).length;
    const zCount = createLodSampleCoordinates(0, cellCountZ, stride).length;
    const signature = `${xCount}:${zCount}`;

    if (signature === previousSignature) {
      continue;
    }

    strides.push(stride);
    previousSignature = signature;
  }

  return strides;
}

function buildTerrainChunkSourceBounds(
  terrain: Terrain,
  startSampleX: number,
  startSampleZ: number,
  endSampleX: number,
  endSampleZ: number
) {
  const localBounds = createEmptyLocalBounds();

  for (let sampleZ = startSampleZ; sampleZ <= endSampleZ; sampleZ += 1) {
    for (let sampleX = startSampleX; sampleX <= endSampleX; sampleX += 1) {
      includePointInBounds(localBounds, {
        x: sampleX * terrain.cellSize,
        y: getTerrainHeightAtSample(terrain, sampleX, sampleZ),
        z: sampleZ * terrain.cellSize
      });
    }
  }

  return localBounds;
}

function pushTerrainLodVertex(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  yOffset: number,
  positions: number[],
  uvs: number[],
  layerWeights: number[]
) {
  const localX = sampleX * terrain.cellSize;
  const localY = getTerrainHeightAtSample(terrain, sampleX, sampleZ) + yOffset;
  const localZ = sampleZ * terrain.cellSize;
  const sampleLayerWeights = getTerrainSampleLayerWeights(
    terrain,
    sampleX,
    sampleZ
  );

  positions.push(localX, localY, localZ);
  uvs.push(terrain.position.x + localX, terrain.position.z + localZ);

  for (const weight of sampleLayerWeights) {
    layerWeights.push(weight);
  }
}

function pushTerrainLodSkirtSegment(
  terrain: Terrain,
  startSampleX: number,
  startSampleZ: number,
  endSampleX: number,
  endSampleZ: number,
  skirtDepth: number,
  positions: number[],
  uvs: number[],
  layerWeights: number[],
  indices: number[]
) {
  const topStart = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    startSampleX,
    startSampleZ,
    0,
    positions,
    uvs,
    layerWeights
  );
  const topEnd = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    endSampleX,
    endSampleZ,
    0,
    positions,
    uvs,
    layerWeights
  );
  const bottomStart = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    startSampleX,
    startSampleZ,
    -skirtDepth,
    positions,
    uvs,
    layerWeights
  );
  const bottomEnd = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    endSampleX,
    endSampleZ,
    -skirtDepth,
    positions,
    uvs,
    layerWeights
  );

  indices.push(topStart, bottomStart, bottomEnd);
  indices.push(topStart, bottomEnd, topEnd);
}

function buildTerrainLodLevelMeshData(
  terrain: Terrain,
  startSampleX: number,
  startSampleZ: number,
  endSampleX: number,
  endSampleZ: number,
  level: number,
  stride: number
): TerrainLodLevelMeshData {
  const sampleXs = createLodSampleCoordinates(
    startSampleX,
    endSampleX,
    stride
  );
  const sampleZs = createLodSampleCoordinates(
    startSampleZ,
    endSampleZ,
    stride
  );
  const positions: number[] = [];
  const uvs: number[] = [];
  const layerWeights: number[] = [];
  const indices: number[] = [];

  for (const sampleZ of sampleZs) {
    for (const sampleX of sampleXs) {
      pushTerrainLodVertex(
        terrain,
        sampleX,
        sampleZ,
        0,
        positions,
        uvs,
        layerWeights
      );
    }
  }

  const sampleCountX = sampleXs.length;

  for (let zIndex = 0; zIndex < sampleZs.length - 1; zIndex += 1) {
    for (let xIndex = 0; xIndex < sampleXs.length - 1; xIndex += 1) {
      const topLeft = zIndex * sampleCountX + xIndex;
      const topRight = topLeft + 1;
      const bottomLeft = (zIndex + 1) * sampleCountX + xIndex;
      const bottomRight = bottomLeft + 1;
      const sampleX = sampleXs[xIndex]!;
      const nextSampleX = sampleXs[xIndex + 1]!;
      const sampleZ = sampleZs[zIndex]!;
      const nextSampleZ = sampleZs[zIndex + 1]!;
      const diagonal = chooseCellDiagonal(
        getTerrainHeightAtSample(terrain, sampleX, sampleZ),
        getTerrainHeightAtSample(terrain, nextSampleX, sampleZ),
        getTerrainHeightAtSample(terrain, sampleX, nextSampleZ),
        getTerrainHeightAtSample(terrain, nextSampleX, nextSampleZ)
      );

      if (diagonal === "forward") {
        indices.push(topLeft, bottomLeft, bottomRight);
        indices.push(topLeft, bottomRight, topRight);
      } else {
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }
  }

  const skirtStartVertexCount = positions.length / 3;
  const skirtDepth = Math.max(terrain.cellSize * stride * 1.5, 0.5);

  for (let xIndex = 0; xIndex < sampleXs.length - 1; xIndex += 1) {
    pushTerrainLodSkirtSegment(
      terrain,
      sampleXs[xIndex]!,
      startSampleZ,
      sampleXs[xIndex + 1]!,
      startSampleZ,
      skirtDepth,
      positions,
      uvs,
      layerWeights,
      indices
    );
    pushTerrainLodSkirtSegment(
      terrain,
      sampleXs[xIndex + 1]!,
      endSampleZ,
      sampleXs[xIndex]!,
      endSampleZ,
      skirtDepth,
      positions,
      uvs,
      layerWeights,
      indices
    );
  }

  for (let zIndex = 0; zIndex < sampleZs.length - 1; zIndex += 1) {
    pushTerrainLodSkirtSegment(
      terrain,
      startSampleX,
      sampleZs[zIndex + 1]!,
      startSampleX,
      sampleZs[zIndex]!,
      skirtDepth,
      positions,
      uvs,
      layerWeights,
      indices
    );
    pushTerrainLodSkirtSegment(
      terrain,
      endSampleX,
      sampleZs[zIndex]!,
      endSampleX,
      sampleZs[zIndex + 1]!,
      skirtDepth,
      positions,
      uvs,
      layerWeights,
      indices
    );
  }

  const typedPositions = new Float32Array(positions);
  const typedUvs = new Float32Array(uvs);
  const typedLayerWeights = new Float32Array(layerWeights);
  const typedIndices = new Uint32Array(indices);
  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new BufferAttribute(typedPositions, 3));
  geometry.setAttribute("uv", new BufferAttribute(typedUvs, 2));
  geometry.setAttribute(
    "terrainLayerWeights",
    new BufferAttribute(typedLayerWeights, TERRAIN_LAYER_COUNT)
  );
  geometry.setIndex(new BufferAttribute(typedIndices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const normalAttribute = geometry.getAttribute("normal");
  const normals = new Float32Array(normalAttribute.array.length);
  normals.set(normalAttribute.array as ArrayLike<number>);

  return {
    level,
    stride,
    geometry,
    positions: typedPositions,
    normals,
    uvs: typedUvs,
    layerWeights: typedLayerWeights,
    indices: typedIndices,
    skirtVertexCount: typedPositions.length / 3 - skirtStartVertexCount
  };
}

export function buildTerrainLodMeshData(
  terrain: Terrain,
  chunkSizeCells = TERRAIN_LOD_CHUNK_SIZE_CELLS
): DerivedTerrainLodMeshData {
  const chunks: TerrainLodChunkMeshData[] = [];
  const localBounds = createEmptyLocalBounds();
  const maxCellX = terrain.sampleCountX - 1;
  const maxCellZ = terrain.sampleCountZ - 1;

  for (
    let startSampleZ = 0, chunkZ = 0;
    startSampleZ < maxCellZ;
    startSampleZ += chunkSizeCells, chunkZ += 1
  ) {
    for (
      let startSampleX = 0, chunkX = 0;
      startSampleX < maxCellX;
      startSampleX += chunkSizeCells, chunkX += 1
    ) {
      const chunk = buildTerrainLodChunkMeshData(
        terrain,
        startSampleX,
        startSampleZ,
        chunkSizeCells
      );

      if (chunk === null) {
        continue;
      }

      includePointInBounds(localBounds, chunk.localBounds.min);
      includePointInBounds(localBounds, chunk.localBounds.max);

      chunks.push({
        ...chunk,
        chunkX,
        chunkZ
      });
    }
  }

  return {
    chunkSizeCells,
    chunks,
    localBounds: cloneBounds(localBounds)
  };
}

export function buildTerrainLodChunkMeshData(
  terrain: Terrain,
  startSampleX: number,
  startSampleZ: number,
  chunkSizeCells = TERRAIN_LOD_CHUNK_SIZE_CELLS
): TerrainLodChunkMeshData | null {
  const maxCellX = terrain.sampleCountX - 1;
  const maxCellZ = terrain.sampleCountZ - 1;

  if (
    startSampleX < 0 ||
    startSampleZ < 0 ||
    startSampleX >= maxCellX ||
    startSampleZ >= maxCellZ
  ) {
    return null;
  }

  const endSampleX = Math.min(startSampleX + chunkSizeCells, maxCellX);
  const endSampleZ = Math.min(startSampleZ + chunkSizeCells, maxCellZ);
  const cellCountX = endSampleX - startSampleX;
  const cellCountZ = endSampleZ - startSampleZ;
  const chunkBounds = buildTerrainChunkSourceBounds(
    terrain,
    startSampleX,
    startSampleZ,
    endSampleX,
    endSampleZ
  );
  const strides = getUsefulTerrainLodStrides(cellCountX, cellCountZ);
  const levels = strides.map((stride, level) =>
    buildTerrainLodLevelMeshData(
      terrain,
      startSampleX,
      startSampleZ,
      endSampleX,
      endSampleZ,
      level,
      stride
    )
  );
  const localCenter = {
    x: (chunkBounds.min.x + chunkBounds.max.x) * 0.5,
    y: (chunkBounds.min.y + chunkBounds.max.y) * 0.5,
    z: (chunkBounds.min.z + chunkBounds.max.z) * 0.5
  };
  const diagonal = Math.hypot(
    chunkBounds.max.x - chunkBounds.min.x,
    chunkBounds.max.y - chunkBounds.min.y,
    chunkBounds.max.z - chunkBounds.min.z
  );

  return {
    chunkX: Math.floor(startSampleX / chunkSizeCells),
    chunkZ: Math.floor(startSampleZ / chunkSizeCells),
    startSampleX,
    startSampleZ,
    endSampleX,
    endSampleZ,
    cellCountX,
    cellCountZ,
    levels,
    localBounds: cloneBounds(chunkBounds),
    localCenter,
    diagonal
  };
}

export function resolveTerrainLodLevelIndex(options: {
  levelCount: number;
  chunkDiagonal: number;
  cameraPosition: Vec3;
  chunkWorldCenter: Vec3;
  perspective: boolean;
}): number {
  if (options.levelCount <= 1) {
    return 0;
  }

  if (!options.perspective) {
    return Math.min(2, options.levelCount - 1);
  }

  const distance = Math.hypot(
    options.cameraPosition.x - options.chunkWorldCenter.x,
    options.cameraPosition.y - options.chunkWorldCenter.y,
    options.cameraPosition.z - options.chunkWorldCenter.z
  );
  const baseDistance = Math.max(options.chunkDiagonal, 1);

  for (
    let thresholdIndex = 0;
    thresholdIndex < TERRAIN_LOD_DISTANCE_MULTIPLIERS.length;
    thresholdIndex += 1
  ) {
    if (
      distance <
      baseDistance * TERRAIN_LOD_DISTANCE_MULTIPLIERS[thresholdIndex]!
    ) {
      return Math.min(thresholdIndex, options.levelCount - 1);
    }
  }

  return options.levelCount - 1;
}

export function resolveTerrainLodLevelIndexWithHysteresis(options: {
  levelCount: number;
  activeLevelIndex: number;
  chunkDiagonal: number;
  cameraPosition: Vec3;
  chunkWorldCenter: Vec3;
  perspective: boolean;
}): number {
  if (options.levelCount <= 1 || !options.perspective) {
    return resolveTerrainLodLevelIndex(options);
  }

  const activeLevelIndex = Math.min(
    Math.max(0, Math.trunc(options.activeLevelIndex)),
    options.levelCount - 1
  );
  const distance = Math.hypot(
    options.cameraPosition.x - options.chunkWorldCenter.x,
    options.cameraPosition.y - options.chunkWorldCenter.y,
    options.cameraPosition.z - options.chunkWorldCenter.z
  );
  const baseDistance = Math.max(options.chunkDiagonal, 1);
  const normalizedDistance = distance / baseDistance;
  const lowerBoundary =
    activeLevelIndex <= 0
      ? Number.NEGATIVE_INFINITY
      : TERRAIN_LOD_DISTANCE_MULTIPLIERS[activeLevelIndex - 1] ??
        TERRAIN_LOD_DISTANCE_MULTIPLIERS[
          TERRAIN_LOD_DISTANCE_MULTIPLIERS.length - 1
        ]!;
  const upperBoundary =
    activeLevelIndex >= options.levelCount - 1
      ? Number.POSITIVE_INFINITY
      : TERRAIN_LOD_DISTANCE_MULTIPLIERS[activeLevelIndex] ??
        TERRAIN_LOD_DISTANCE_MULTIPLIERS[
          TERRAIN_LOD_DISTANCE_MULTIPLIERS.length - 1
        ]!;

  if (
    normalizedDistance >
    upperBoundary * (1 + TERRAIN_LOD_HYSTERESIS_RATIO)
  ) {
    return Math.min(activeLevelIndex + 1, options.levelCount - 1);
  }

  if (
    normalizedDistance <
    lowerBoundary * (1 - TERRAIN_LOD_HYSTERESIS_RATIO)
  ) {
    return Math.max(activeLevelIndex - 1, 0);
  }

  return activeLevelIndex;
}
