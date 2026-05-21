import { BufferAttribute, BufferGeometry } from "three";

import type { Vec3 } from "../core/vector";
import {
  getTerrainFoliageMask,
  getTerrainFoliageBlockerMaskValueAtSample,
  getTerrainFoliageMaskValueAtSample,
  getTerrainHeightAtSample,
  getTerrainSampleLayerWeights,
  TERRAIN_SHADER_LAYER_COUNT,
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
  0xff4d4d, 0xffa53d, 0xffe66d, 0x4ee06f, 0x4ba3ff
] as const;
const TERRAIN_LOD_DISTANCE_MULTIPLIERS = [0.75, 1.5, 3, 6] as const;
const TERRAIN_LOD_HYSTERESIS_RATIO = 0.16;

interface TerrainMeshBuildOptions {
  foliageMaskLayerId?: string | null;
  foliageBlockerMask?: boolean;
}

interface TerrainLodSamplePoint {
  sampleX: number;
  sampleZ: number;
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

function setTerrainLayerWeightAttributes(
  geometry: BufferGeometry,
  layerWeights: Float32Array
) {
  const vertexCount = layerWeights.length / TERRAIN_SHADER_LAYER_COUNT;
  const firstWeights = new Float32Array(vertexCount * 4);
  const secondWeights = new Float32Array(vertexCount * 4);

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const sourceOffset = vertexIndex * TERRAIN_SHADER_LAYER_COUNT;
    const targetOffset = vertexIndex * 4;

    firstWeights[targetOffset] = layerWeights[sourceOffset] ?? 0;
    firstWeights[targetOffset + 1] = layerWeights[sourceOffset + 1] ?? 0;
    firstWeights[targetOffset + 2] = layerWeights[sourceOffset + 2] ?? 0;
    firstWeights[targetOffset + 3] = layerWeights[sourceOffset + 3] ?? 0;
    secondWeights[targetOffset] = layerWeights[sourceOffset + 4] ?? 0;
    secondWeights[targetOffset + 1] = layerWeights[sourceOffset + 5] ?? 0;
    secondWeights[targetOffset + 2] = layerWeights[sourceOffset + 6] ?? 0;
    secondWeights[targetOffset + 3] = layerWeights[sourceOffset + 7] ?? 0;
  }

  geometry.setAttribute(
    "terrainLayerWeights0",
    new BufferAttribute(firstWeights, 4)
  );
  geometry.setAttribute(
    "terrainLayerWeights1",
    new BufferAttribute(secondWeights, 4)
  );
  geometry.setAttribute(
    "terrainLayerWeights",
    new BufferAttribute(firstWeights, 4)
  );
}

function pushPaddedTerrainLayerWeights(
  target: number[],
  sampleLayerWeights: readonly number[]
) {
  for (
    let layerIndex = 0;
    layerIndex < TERRAIN_SHADER_LAYER_COUNT;
    layerIndex += 1
  ) {
    target.push(sampleLayerWeights[layerIndex] ?? 0);
  }
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
  terrain: Terrain,
  options: TerrainMeshBuildOptions = {}
): DerivedTerrainMeshData {
  const vertexCount = terrain.sampleCountX * terrain.sampleCountZ;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const layerWeights = new Float32Array(
    vertexCount * TERRAIN_SHADER_LAYER_COUNT
  );
  const foliageMaskWeights = new Float32Array(vertexCount);
  const foliageMask =
    options.foliageMaskLayerId === undefined ||
    options.foliageMaskLayerId === null
      ? null
      : getTerrainFoliageMask(terrain, options.foliageMaskLayerId);
  const localBounds = createEmptyLocalBounds();
  let vertexOffset = 0;
  let uvOffset = 0;
  let layerWeightOffset = 0;
  let foliageMaskWeightOffset = 0;

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
        layerIndex < TERRAIN_SHADER_LAYER_COUNT;
        layerIndex += 1
      ) {
        layerWeights[layerWeightOffset + layerIndex] =
          sampleLayerWeights[layerIndex] ?? 0;
      }
      layerWeightOffset += TERRAIN_SHADER_LAYER_COUNT;
      foliageMaskWeights[foliageMaskWeightOffset] =
        options.foliageBlockerMask === true
          ? getTerrainFoliageBlockerMaskValueAtSample(
              terrain.foliageBlockerMask,
              sampleX,
              sampleZ
            )
          : foliageMask === null
            ? 0
            : getTerrainFoliageMaskValueAtSample(foliageMask, sampleX, sampleZ);
      foliageMaskWeightOffset += 1;
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
  setTerrainLayerWeightAttributes(geometry, layerWeights);
  geometry.setAttribute(
    "terrainFoliageMask",
    new BufferAttribute(foliageMaskWeights, 1)
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
    foliageMaskWeights,
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

function clampSampleCoordinate(value: number, maxSample: number): number {
  return Math.min(maxSample, Math.max(0, value));
}

function interpolateScalar(
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number,
  tx: number,
  tz: number
): number {
  const top = topLeft + (topRight - topLeft) * tx;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * tx;

  return top + (bottom - top) * tz;
}

function sampleTerrainScalarAtSamplePosition(
  terrain: Pick<Terrain, "sampleCountX" | "sampleCountZ">,
  sampleX: number,
  sampleZ: number,
  sampleValue: (sampleX: number, sampleZ: number) => number
): number {
  const clampedSampleX = clampSampleCoordinate(
    sampleX,
    terrain.sampleCountX - 1
  );
  const clampedSampleZ = clampSampleCoordinate(
    sampleZ,
    terrain.sampleCountZ - 1
  );
  const sampleX0 = Math.floor(clampedSampleX);
  const sampleZ0 = Math.floor(clampedSampleZ);
  const sampleX1 = Math.min(sampleX0 + 1, terrain.sampleCountX - 1);
  const sampleZ1 = Math.min(sampleZ0 + 1, terrain.sampleCountZ - 1);
  const tx = sampleX1 === sampleX0 ? 0 : clampedSampleX - sampleX0;
  const tz = sampleZ1 === sampleZ0 ? 0 : clampedSampleZ - sampleZ0;

  return interpolateScalar(
    sampleValue(sampleX0, sampleZ0),
    sampleValue(sampleX1, sampleZ0),
    sampleValue(sampleX0, sampleZ1),
    sampleValue(sampleX1, sampleZ1),
    tx,
    tz
  );
}

function sampleTerrainHeightAtSamplePosition(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): number {
  return sampleTerrainScalarAtSamplePosition(
    terrain,
    sampleX,
    sampleZ,
    (x, z) => getTerrainHeightAtSample(terrain, x, z)
  );
}

function sampleTerrainLayerWeightsAtSamplePosition(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): number[] {
  const layerWeights = new Array<number>(terrain.layers.length).fill(0);

  for (
    let layerIndex = 0;
    layerIndex < terrain.layers.length;
    layerIndex += 1
  ) {
    layerWeights[layerIndex] = sampleTerrainScalarAtSamplePosition(
      terrain,
      sampleX,
      sampleZ,
      (x, z) => getTerrainSampleLayerWeights(terrain, x, z)[layerIndex] ?? 0
    );
  }

  return layerWeights;
}

function sampleTerrainFoliageWeightAtSamplePosition(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  options: TerrainMeshBuildOptions
): number {
  const foliageMask =
    options.foliageMaskLayerId === undefined ||
    options.foliageMaskLayerId === null
      ? null
      : getTerrainFoliageMask(terrain, options.foliageMaskLayerId);

  if (options.foliageBlockerMask === true) {
    return sampleTerrainScalarAtSamplePosition(
      terrain,
      sampleX,
      sampleZ,
      (x, z) =>
        getTerrainFoliageBlockerMaskValueAtSample(
          terrain.foliageBlockerMask,
          x,
          z
        )
    );
  }

  if (foliageMask === null) {
    return 0;
  }

  return sampleTerrainScalarAtSamplePosition(
    terrain,
    sampleX,
    sampleZ,
    (x, z) => getTerrainFoliageMaskValueAtSample(foliageMask, x, z)
  );
}

function pushTerrainLodNormal(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  normals: number[]
) {
  const leftSampleX = clampSampleCoordinate(
    sampleX - 1,
    terrain.sampleCountX - 1
  );
  const rightSampleX = clampSampleCoordinate(
    sampleX + 1,
    terrain.sampleCountX - 1
  );
  const bottomSampleZ = clampSampleCoordinate(
    sampleZ - 1,
    terrain.sampleCountZ - 1
  );
  const topSampleZ = clampSampleCoordinate(
    sampleZ + 1,
    terrain.sampleCountZ - 1
  );
  const dxDenominator = Math.max(
    (rightSampleX - leftSampleX) * terrain.cellSize,
    Number.EPSILON
  );
  const dzDenominator = Math.max(
    (topSampleZ - bottomSampleZ) * terrain.cellSize,
    Number.EPSILON
  );
  const slopeX =
    (sampleTerrainHeightAtSamplePosition(terrain, rightSampleX, sampleZ) -
      sampleTerrainHeightAtSamplePosition(terrain, leftSampleX, sampleZ)) /
    dxDenominator;
  const slopeZ =
    (sampleTerrainHeightAtSamplePosition(terrain, sampleX, topSampleZ) -
      sampleTerrainHeightAtSamplePosition(terrain, sampleX, bottomSampleZ)) /
    dzDenominator;
  const normalX = -slopeX;
  const normalY = 1;
  const normalZ = -slopeZ;
  const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;

  normals.push(
    normalX / normalLength,
    normalY / normalLength,
    normalZ / normalLength
  );
}

function pushTerrainLodVertex(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  yOffset: number,
  positions: number[],
  uvs: number[],
  layerWeights: number[],
  foliageMaskWeights: number[],
  normals: number[],
  options: TerrainMeshBuildOptions
) {
  const localX = sampleX * terrain.cellSize;
  const localY =
    sampleTerrainHeightAtSamplePosition(terrain, sampleX, sampleZ) + yOffset;
  const localZ = sampleZ * terrain.cellSize;
  const sampleLayerWeights = sampleTerrainLayerWeightsAtSamplePosition(
    terrain,
    sampleX,
    sampleZ
  );

  positions.push(localX, localY, localZ);
  uvs.push(terrain.position.x + localX, terrain.position.z + localZ);

  pushPaddedTerrainLayerWeights(layerWeights, sampleLayerWeights);
  foliageMaskWeights.push(
    sampleTerrainFoliageWeightAtSamplePosition(
      terrain,
      sampleX,
      sampleZ,
      options
    )
  );
  pushTerrainLodNormal(terrain, sampleX, sampleZ, normals);
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
  foliageMaskWeights: number[],
  normals: number[],
  indices: number[],
  options: TerrainMeshBuildOptions
) {
  const topStart = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    startSampleX,
    startSampleZ,
    0,
    positions,
    uvs,
    layerWeights,
    foliageMaskWeights,
    normals,
    options
  );
  const topEnd = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    endSampleX,
    endSampleZ,
    0,
    positions,
    uvs,
    layerWeights,
    foliageMaskWeights,
    normals,
    options
  );
  const bottomStart = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    startSampleX,
    startSampleZ,
    -skirtDepth,
    positions,
    uvs,
    layerWeights,
    foliageMaskWeights,
    normals,
    options
  );
  const bottomEnd = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    endSampleX,
    endSampleZ,
    -skirtDepth,
    positions,
    uvs,
    layerWeights,
    foliageMaskWeights,
    normals,
    options
  );

  indices.push(topStart, bottomStart, bottomEnd);
  indices.push(topStart, bottomEnd, topEnd);
}

function createTerrainLodVertexKey(
  sampleX: number,
  sampleZ: number,
  yOffset: number
): string {
  return `${sampleX.toFixed(6)}:${sampleZ.toFixed(6)}:${yOffset.toFixed(6)}`;
}

function getOrCreateTerrainLodVertex(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  yOffset: number,
  vertexIndices: Map<string, number>,
  positions: number[],
  uvs: number[],
  layerWeights: number[],
  foliageMaskWeights: number[],
  normals: number[],
  options: TerrainMeshBuildOptions
): number {
  const key = createTerrainLodVertexKey(sampleX, sampleZ, yOffset);
  const existingIndex = vertexIndices.get(key);

  if (existingIndex !== undefined) {
    return existingIndex;
  }

  const nextIndex = positions.length / 3;
  pushTerrainLodVertex(
    terrain,
    sampleX,
    sampleZ,
    yOffset,
    positions,
    uvs,
    layerWeights,
    foliageMaskWeights,
    normals,
    options
  );
  vertexIndices.set(key, nextIndex);
  return nextIndex;
}

function areTerrainLodSamplePointsEqual(
  left: TerrainLodSamplePoint,
  right: TerrainLodSamplePoint
): boolean {
  return left.sampleX === right.sampleX && left.sampleZ === right.sampleZ;
}

function pushTerrainLodBoundaryPoint(
  points: TerrainLodSamplePoint[],
  point: TerrainLodSamplePoint
) {
  const previous = points[points.length - 1];

  if (
    previous !== undefined &&
    areTerrainLodSamplePointsEqual(previous, point)
  ) {
    return;
  }

  points.push(point);
}

function pushTerrainLodBoundarySegment(
  points: TerrainLodSamplePoint[],
  from: TerrainLodSamplePoint,
  to: TerrainLodSamplePoint,
  dense: boolean
) {
  const deltaX = to.sampleX - from.sampleX;
  const deltaZ = to.sampleZ - from.sampleZ;
  const stepCount = dense ? Math.max(Math.abs(deltaX), Math.abs(deltaZ)) : 1;

  if (points.length === 0) {
    pushTerrainLodBoundaryPoint(points, from);
  }

  for (let step = 1; step <= stepCount; step += 1) {
    const t = step / stepCount;

    pushTerrainLodBoundaryPoint(points, {
      sampleX: from.sampleX + deltaX * t,
      sampleZ: from.sampleZ + deltaZ * t
    });
  }
}

function createTerrainLodCellBoundaryPoints(
  startSampleX: number,
  startSampleZ: number,
  endSampleX: number,
  endSampleZ: number,
  cellStartSampleX: number,
  cellStartSampleZ: number,
  cellEndSampleX: number,
  cellEndSampleZ: number
): TerrainLodSamplePoint[] {
  const points: TerrainLodSamplePoint[] = [];

  pushTerrainLodBoundarySegment(
    points,
    { sampleX: cellStartSampleX, sampleZ: cellStartSampleZ },
    { sampleX: cellStartSampleX, sampleZ: cellEndSampleZ },
    cellStartSampleX === startSampleX
  );
  pushTerrainLodBoundarySegment(
    points,
    { sampleX: cellStartSampleX, sampleZ: cellEndSampleZ },
    { sampleX: cellEndSampleX, sampleZ: cellEndSampleZ },
    cellEndSampleZ === endSampleZ
  );
  pushTerrainLodBoundarySegment(
    points,
    { sampleX: cellEndSampleX, sampleZ: cellEndSampleZ },
    { sampleX: cellEndSampleX, sampleZ: cellStartSampleZ },
    cellEndSampleX === endSampleX
  );
  pushTerrainLodBoundarySegment(
    points,
    { sampleX: cellEndSampleX, sampleZ: cellStartSampleZ },
    { sampleX: cellStartSampleX, sampleZ: cellStartSampleZ },
    cellStartSampleZ === startSampleZ
  );

  const first = points[0];
  const last = points[points.length - 1];

  if (
    first !== undefined &&
    last !== undefined &&
    areTerrainLodSamplePointsEqual(first, last)
  ) {
    points.pop();
  }

  return points;
}

function buildTerrainLodLevelMeshData(
  terrain: Terrain,
  startSampleX: number,
  startSampleZ: number,
  endSampleX: number,
  endSampleZ: number,
  level: number,
  stride: number,
  options: TerrainMeshBuildOptions
): TerrainLodLevelMeshData {
  const sampleXs = createLodSampleCoordinates(startSampleX, endSampleX, stride);
  const sampleZs = createLodSampleCoordinates(startSampleZ, endSampleZ, stride);
  const positions: number[] = [];
  const uvs: number[] = [];
  const layerWeights: number[] = [];
  const foliageMaskWeights: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const vertexIndices = new Map<string, number>();

  for (let zIndex = 0; zIndex < sampleZs.length - 1; zIndex += 1) {
    for (let xIndex = 0; xIndex < sampleXs.length - 1; xIndex += 1) {
      const sampleX = sampleXs[xIndex]!;
      const nextSampleX = sampleXs[xIndex + 1]!;
      const sampleZ = sampleZs[zIndex]!;
      const nextSampleZ = sampleZs[zIndex + 1]!;
      const boundaryPoints = createTerrainLodCellBoundaryPoints(
        startSampleX,
        startSampleZ,
        endSampleX,
        endSampleZ,
        sampleX,
        sampleZ,
        nextSampleX,
        nextSampleZ
      );

      if (boundaryPoints.length > 4) {
        const centerIndex = getOrCreateTerrainLodVertex(
          terrain,
          (sampleX + nextSampleX) * 0.5,
          (sampleZ + nextSampleZ) * 0.5,
          0,
          vertexIndices,
          positions,
          uvs,
          layerWeights,
          foliageMaskWeights,
          normals,
          options
        );

        for (
          let boundaryIndex = 0;
          boundaryIndex < boundaryPoints.length;
          boundaryIndex += 1
        ) {
          const currentPoint = boundaryPoints[boundaryIndex]!;
          const nextPoint =
            boundaryPoints[(boundaryIndex + 1) % boundaryPoints.length]!;
          const currentIndex = getOrCreateTerrainLodVertex(
            terrain,
            currentPoint.sampleX,
            currentPoint.sampleZ,
            0,
            vertexIndices,
            positions,
            uvs,
            layerWeights,
            foliageMaskWeights,
            normals,
            options
          );
          const nextIndex = getOrCreateTerrainLodVertex(
            terrain,
            nextPoint.sampleX,
            nextPoint.sampleZ,
            0,
            vertexIndices,
            positions,
            uvs,
            layerWeights,
            foliageMaskWeights,
            normals,
            options
          );

          indices.push(centerIndex, currentIndex, nextIndex);
        }

        continue;
      }

      const topLeft = getOrCreateTerrainLodVertex(
        terrain,
        sampleX,
        sampleZ,
        0,
        vertexIndices,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        options
      );
      const topRight = getOrCreateTerrainLodVertex(
        terrain,
        nextSampleX,
        sampleZ,
        0,
        vertexIndices,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        options
      );
      const bottomLeft = getOrCreateTerrainLodVertex(
        terrain,
        sampleX,
        nextSampleZ,
        0,
        vertexIndices,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        options
      );
      const bottomRight = getOrCreateTerrainLodVertex(
        terrain,
        nextSampleX,
        nextSampleZ,
        0,
        vertexIndices,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        options
      );
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
  const terrainEndSampleX = terrain.sampleCountX - 1;
  const terrainEndSampleZ = terrain.sampleCountZ - 1;

  if (startSampleZ === 0) {
    for (let sampleX = startSampleX; sampleX < endSampleX; sampleX += 1) {
      pushTerrainLodSkirtSegment(
        terrain,
        sampleX,
        startSampleZ,
        sampleX + 1,
        startSampleZ,
        skirtDepth,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        indices,
        options
      );
    }
  }

  if (endSampleZ === terrainEndSampleZ) {
    for (let sampleX = startSampleX; sampleX < endSampleX; sampleX += 1) {
      pushTerrainLodSkirtSegment(
        terrain,
        sampleX + 1,
        endSampleZ,
        sampleX,
        endSampleZ,
        skirtDepth,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        indices,
        options
      );
    }
  }

  if (startSampleX === 0) {
    for (let sampleZ = startSampleZ; sampleZ < endSampleZ; sampleZ += 1) {
      pushTerrainLodSkirtSegment(
        terrain,
        startSampleX,
        sampleZ + 1,
        startSampleX,
        sampleZ,
        skirtDepth,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        indices,
        options
      );
    }
  }

  if (endSampleX === terrainEndSampleX) {
    for (let sampleZ = startSampleZ; sampleZ < endSampleZ; sampleZ += 1) {
      pushTerrainLodSkirtSegment(
        terrain,
        endSampleX,
        sampleZ,
        endSampleX,
        sampleZ + 1,
        skirtDepth,
        positions,
        uvs,
        layerWeights,
        foliageMaskWeights,
        normals,
        indices,
        options
      );
    }
  }

  const typedPositions = new Float32Array(positions);
  const typedUvs = new Float32Array(uvs);
  const typedLayerWeights = new Float32Array(layerWeights);
  const typedFoliageMaskWeights = new Float32Array(foliageMaskWeights);
  const typedNormals = new Float32Array(normals);
  const typedIndices = new Uint32Array(indices);
  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new BufferAttribute(typedPositions, 3));
  geometry.setAttribute("normal", new BufferAttribute(typedNormals, 3));
  geometry.setAttribute("uv", new BufferAttribute(typedUvs, 2));
  setTerrainLayerWeightAttributes(geometry, typedLayerWeights);
  geometry.setAttribute(
    "terrainFoliageMask",
    new BufferAttribute(typedFoliageMaskWeights, 1)
  );
  geometry.setIndex(new BufferAttribute(typedIndices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    level,
    stride,
    geometry,
    positions: typedPositions,
    normals: typedNormals,
    uvs: typedUvs,
    layerWeights: typedLayerWeights,
    foliageMaskWeights: typedFoliageMaskWeights,
    indices: typedIndices,
    skirtVertexCount: typedPositions.length / 3 - skirtStartVertexCount
  };
}

export function buildTerrainLodMeshData(
  terrain: Terrain,
  options: TerrainMeshBuildOptions = {},
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
        chunkSizeCells,
        options
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
  chunkSizeCells = TERRAIN_LOD_CHUNK_SIZE_CELLS,
  options: TerrainMeshBuildOptions = {}
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
      stride,
      options
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
      : (TERRAIN_LOD_DISTANCE_MULTIPLIERS[activeLevelIndex - 1] ??
        TERRAIN_LOD_DISTANCE_MULTIPLIERS[
          TERRAIN_LOD_DISTANCE_MULTIPLIERS.length - 1
        ]!);
  const upperBoundary =
    activeLevelIndex >= options.levelCount - 1
      ? Number.POSITIVE_INFINITY
      : (TERRAIN_LOD_DISTANCE_MULTIPLIERS[activeLevelIndex] ??
        TERRAIN_LOD_DISTANCE_MULTIPLIERS[
          TERRAIN_LOD_DISTANCE_MULTIPLIERS.length - 1
        ]!);

  if (normalizedDistance > upperBoundary * (1 + TERRAIN_LOD_HYSTERESIS_RATIO)) {
    return Math.min(activeLevelIndex + 1, options.levelCount - 1);
  }

  if (normalizedDistance < lowerBoundary * (1 - TERRAIN_LOD_HYSTERESIS_RATIO)) {
    return Math.max(activeLevelIndex - 1, 0);
  }

  return activeLevelIndex;
}
