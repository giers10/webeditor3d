import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";

export interface TerrainLayer {
  materialId: string | null;
}

export interface Terrain {
  id: string;
  kind: "terrain";
  name?: string;
  visible: boolean;
  enabled: boolean;
  collisionEnabled: boolean;
  position: Vec3;
  sampleCountX: number;
  sampleCountZ: number;
  cellSize: number;
  heights: number[];
  layers: TerrainLayer[];
  paintWeights: number[];
}

export interface TerrainHeightPatchEntry {
  index: number;
  before: number;
  after: number;
}

interface TerrainBoundsCacheEntry {
  heights: number[];
  position: Vec3;
  sampleCountX: number;
  sampleCountZ: number;
  cellSize: number;
  minHeight: number;
  maxHeight: number;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
}

export const DEFAULT_TERRAIN_VISIBLE = true;
export const DEFAULT_TERRAIN_ENABLED = true;
export const DEFAULT_TERRAIN_COLLISION_ENABLED = true;
export const MIN_TERRAIN_SAMPLE_COUNT = 2;
export const DEFAULT_TERRAIN_SAMPLE_COUNT_X = 9;
export const DEFAULT_TERRAIN_SAMPLE_COUNT_Z = 9;
export const DEFAULT_TERRAIN_CELL_SIZE = 1;
export const DEFAULT_TERRAIN_HEIGHT = 0;
export const TERRAIN_LAYER_COUNT = 4;
export const DEFAULT_TERRAIN_LAYER_MATERIAL_IDS = [
  "patchy_grass_ground_250x250",
  "patchy_weedy_dirt_ground_300x300",
  "ground_sand_300x300",
  "concrete_wall_cladding_250x250"
] as const;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function cloneTerrainBounds(bounds: { min: Vec3; max: Vec3 }): {
  min: Vec3;
  max: Vec3;
} {
  return {
    min: cloneVec3(bounds.min),
    max: cloneVec3(bounds.max)
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function assertFiniteVec3(vector: Vec3, label: string) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} must be finite on every axis.`);
  }
}

export function normalizeTerrainName(
  name: string | null | undefined
): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

export function normalizeTerrainSampleCount(
  value: number,
  label: string
): number {
  if (!Number.isInteger(value) || value < MIN_TERRAIN_SAMPLE_COUNT) {
    throw new Error(
      `${label} must be an integer greater than or equal to ${MIN_TERRAIN_SAMPLE_COUNT}.`
    );
  }

  return value;
}

export function normalizeTerrainCellSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Terrain cell size must be a positive finite number.");
  }

  return value;
}

function normalizeTerrainLayerMaterialId(
  value: string | null | undefined,
  label: string
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a string or null.`);
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function normalizeTerrainCollisionEnabled(value: boolean): boolean {
  if (typeof value !== "boolean") {
    throw new Error("Terrain collisionEnabled must be a boolean.");
  }

  return value;
}

export function getTerrainLayerLabel(layerIndex: number): string {
  if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= TERRAIN_LAYER_COUNT) {
    throw new Error(`Terrain layer index ${layerIndex} is out of range.`);
  }

  return layerIndex === 0 ? "Base Layer" : `Layer ${layerIndex + 1}`;
}

export function createDefaultTerrainLayers(): TerrainLayer[] {
  return Array.from({ length: TERRAIN_LAYER_COUNT }, (_, layerIndex) => ({
    materialId: DEFAULT_TERRAIN_LAYER_MATERIAL_IDS[layerIndex] ?? null
  }));
}

export function cloneTerrainLayers(
  layers: readonly TerrainLayer[]
): TerrainLayer[] {
  return layers.map((layer, layerIndex) => ({
    materialId: normalizeTerrainLayerMaterialId(
      layer.materialId,
      `Terrain layer ${layerIndex}`
    )
  }));
}

function normalizeTerrainLayers(
  layers: readonly TerrainLayer[] | undefined
): TerrainLayer[] {
  if (layers === undefined) {
    return createDefaultTerrainLayers();
  }

  if (layers.length !== TERRAIN_LAYER_COUNT) {
    throw new Error(
      `Terrain layers must contain exactly ${TERRAIN_LAYER_COUNT} layer slots.`
    );
  }

  return layers.map((layer, layerIndex) => {
    if (typeof layer !== "object" || layer === null) {
      throw new Error(`Terrain layer ${layerIndex} must be an object.`);
    }

    return {
      materialId: normalizeTerrainLayerMaterialId(
        layer.materialId,
        `Terrain layer ${layerIndex}.materialId`
      )
    };
  });
}

export function createFlatTerrainHeights(
  sampleCountX: number,
  sampleCountZ: number,
  height = DEFAULT_TERRAIN_HEIGHT
): number[] {
  const normalizedSampleCountX = normalizeTerrainSampleCount(
    sampleCountX,
    "Terrain sampleCountX"
  );
  const normalizedSampleCountZ = normalizeTerrainSampleCount(
    sampleCountZ,
    "Terrain sampleCountZ"
  );

  if (!Number.isFinite(height)) {
    throw new Error("Terrain height samples must be finite.");
  }

  return new Array(normalizedSampleCountX * normalizedSampleCountZ).fill(height);
}

export function createFlatTerrainPaintWeights(
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  const normalizedSampleCountX = normalizeTerrainSampleCount(
    sampleCountX,
    "Terrain sampleCountX"
  );
  const normalizedSampleCountZ = normalizeTerrainSampleCount(
    sampleCountZ,
    "Terrain sampleCountZ"
  );

  return new Array(
    normalizedSampleCountX *
      normalizedSampleCountZ *
      (TERRAIN_LAYER_COUNT - 1)
  ).fill(0);
}

export function getTerrainSampleIndex(
  terrain: Pick<Terrain, "sampleCountX" | "sampleCountZ">,
  sampleX: number,
  sampleZ: number
): number {
  if (
    !Number.isInteger(sampleX) ||
    sampleX < 0 ||
    sampleX >= terrain.sampleCountX
  ) {
    throw new Error(`Terrain sampleX ${sampleX} is out of range.`);
  }

  if (
    !Number.isInteger(sampleZ) ||
    sampleZ < 0 ||
    sampleZ >= terrain.sampleCountZ
  ) {
    throw new Error(`Terrain sampleZ ${sampleZ} is out of range.`);
  }

  return sampleZ * terrain.sampleCountX + sampleX;
}

export function getTerrainPaintWeightSampleOffset(
  terrain: Pick<Terrain, "sampleCountX" | "sampleCountZ">,
  sampleX: number,
  sampleZ: number
): number {
  return getTerrainSampleIndex(terrain, sampleX, sampleZ) * (TERRAIN_LAYER_COUNT - 1);
}

export function getTerrainHeightAtSample(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): number {
  return terrain.heights[getTerrainSampleIndex(terrain, sampleX, sampleZ)] ?? 0;
}

function normalizeTerrainPaintWeights(
  sampleCountX: number,
  sampleCountZ: number,
  paintWeights: readonly number[] | undefined
): number[] {
  const expectedLength =
    sampleCountX * sampleCountZ * (TERRAIN_LAYER_COUNT - 1);
  const normalizedPaintWeights =
    paintWeights === undefined
      ? createFlatTerrainPaintWeights(sampleCountX, sampleCountZ)
      : [...paintWeights];

  if (normalizedPaintWeights.length !== expectedLength) {
    throw new Error(
      `Terrain paint weights must contain exactly ${expectedLength} values.`
    );
  }

  for (
    let sampleIndex = 0;
    sampleIndex < sampleCountX * sampleCountZ;
    sampleIndex += 1
  ) {
    const offset = sampleIndex * (TERRAIN_LAYER_COUNT - 1);
    let weightSum = 0;

    for (
      let layerOffset = 0;
      layerOffset < TERRAIN_LAYER_COUNT - 1;
      layerOffset += 1
    ) {
      const value = normalizedPaintWeights[offset + layerOffset];

      if (!Number.isFinite(value)) {
        throw new Error("Terrain paint weights must remain finite.");
      }

      const clampedValue = Math.min(1, Math.max(0, value));
      normalizedPaintWeights[offset + layerOffset] = clampedValue;
      weightSum += clampedValue;
    }

    if (weightSum <= 1) {
      continue;
    }

    const scale = 1 / weightSum;

    for (
      let layerOffset = 0;
      layerOffset < TERRAIN_LAYER_COUNT - 1;
      layerOffset += 1
    ) {
      normalizedPaintWeights[offset + layerOffset] *= scale;
    }
  }

  return normalizedPaintWeights;
}

export function getTerrainSampleLayerWeights(
  terrain: Pick<Terrain, "sampleCountX" | "sampleCountZ" | "paintWeights">,
  sampleX: number,
  sampleZ: number
): [number, number, number, number] {
  const offset = getTerrainPaintWeightSampleOffset(terrain, sampleX, sampleZ);
  const layer1 = terrain.paintWeights[offset] ?? 0;
  const layer2 = terrain.paintWeights[offset + 1] ?? 0;
  const layer3 = terrain.paintWeights[offset + 2] ?? 0;
  const baseLayer = Math.max(0, 1 - (layer1 + layer2 + layer3));
  const weightSum = baseLayer + layer1 + layer2 + layer3;

  if (weightSum <= 0) {
    return [1, 0, 0, 0];
  }

  return [
    baseLayer / weightSum,
    layer1 / weightSum,
    layer2 / weightSum,
    layer3 / weightSum
  ];
}

export function getTerrainWorldSamplePosition(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): Vec3 {
  return {
    x: terrain.position.x + sampleX * terrain.cellSize,
    y: terrain.position.y + getTerrainHeightAtSample(terrain, sampleX, sampleZ),
    z: terrain.position.z + sampleZ * terrain.cellSize
  };
}

export function getTerrainFootprintWidth(
  terrain: Pick<Terrain, "sampleCountX" | "cellSize">
): number {
  return (terrain.sampleCountX - 1) * terrain.cellSize;
}

export function getTerrainFootprintDepth(
  terrain: Pick<Terrain, "sampleCountZ" | "cellSize">
): number {
  return (terrain.sampleCountZ - 1) * terrain.cellSize;
}

const terrainBoundsCache = new WeakMap<Terrain, TerrainBoundsCacheEntry>();

function createTerrainBoundsCacheEntry(
  terrain: Terrain,
  minHeight: number,
  maxHeight: number
): TerrainBoundsCacheEntry {
  const width = getTerrainFootprintWidth(terrain);
  const depth = getTerrainFootprintDepth(terrain);
  const bounds = {
    min: {
      x: terrain.position.x,
      y: terrain.position.y + minHeight,
      z: terrain.position.z
    },
    max: {
      x: terrain.position.x + width,
      y: terrain.position.y + maxHeight,
      z: terrain.position.z + depth
    }
  };

  return {
    heights: terrain.heights,
    position: cloneVec3(terrain.position),
    sampleCountX: terrain.sampleCountX,
    sampleCountZ: terrain.sampleCountZ,
    cellSize: terrain.cellSize,
    minHeight,
    maxHeight,
    bounds
  };
}

function isTerrainBoundsCacheEntryCurrent(
  terrain: Terrain,
  entry: TerrainBoundsCacheEntry
): boolean {
  return (
    entry.heights === terrain.heights &&
    entry.sampleCountX === terrain.sampleCountX &&
    entry.sampleCountZ === terrain.sampleCountZ &&
    entry.cellSize === terrain.cellSize &&
    areVec3Equal(entry.position, terrain.position)
  );
}

export function invalidateTerrainBoundsCache(terrain: Terrain) {
  terrainBoundsCache.delete(terrain);
}

export function updateTerrainBoundsCacheAfterHeightPatch(
  terrain: Terrain,
  patch: readonly TerrainHeightPatchEntry[]
) {
  if (patch.length === 0) {
    return;
  }

  const cachedEntry = terrainBoundsCache.get(terrain);

  if (
    cachedEntry === undefined ||
    !isTerrainBoundsCacheEntryCurrent(terrain, cachedEntry)
  ) {
    return;
  }

  let minHeight = cachedEntry.minHeight;
  let maxHeight = cachedEntry.maxHeight;
  let requiresRescan = false;

  for (const entry of patch) {
    if (
      !Number.isInteger(entry.index) ||
      entry.index < 0 ||
      entry.index >= terrain.heights.length ||
      !Number.isFinite(entry.before) ||
      !Number.isFinite(entry.after)
    ) {
      requiresRescan = true;
      break;
    }

    if (entry.before === minHeight && entry.after > entry.before) {
      requiresRescan = true;
      break;
    }

    if (entry.before === maxHeight && entry.after < entry.before) {
      requiresRescan = true;
      break;
    }

    minHeight = Math.min(minHeight, entry.after);
    maxHeight = Math.max(maxHeight, entry.after);
  }

  if (requiresRescan) {
    invalidateTerrainBoundsCache(terrain);
    return;
  }

  terrainBoundsCache.set(
    terrain,
    createTerrainBoundsCacheEntry(terrain, minHeight, maxHeight)
  );
}

export function getTerrainBounds(terrain: Terrain): { min: Vec3; max: Vec3 } {
  const cachedEntry = terrainBoundsCache.get(terrain);

  if (
    cachedEntry !== undefined &&
    isTerrainBoundsCacheEntryCurrent(terrain, cachedEntry)
  ) {
    return cloneTerrainBounds(cachedEntry.bounds);
  }

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (const height of terrain.heights) {
    minHeight = Math.min(minHeight, height);
    maxHeight = Math.max(maxHeight, height);
  }

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight)) {
    minHeight = 0;
    maxHeight = 0;
  }

  const nextEntry = createTerrainBoundsCacheEntry(
    terrain,
    minHeight,
    maxHeight
  );
  terrainBoundsCache.set(terrain, nextEntry);

  return cloneTerrainBounds(nextEntry.bounds);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function sampleTerrainHeightAtGridCoordinate(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): number {
  const clampedSampleX = clamp(sampleX, 0, terrain.sampleCountX - 1);
  const clampedSampleZ = clamp(sampleZ, 0, terrain.sampleCountZ - 1);
  const minSampleX = Math.floor(clampedSampleX);
  const maxSampleX = Math.min(terrain.sampleCountX - 1, minSampleX + 1);
  const minSampleZ = Math.floor(clampedSampleZ);
  const maxSampleZ = Math.min(terrain.sampleCountZ - 1, minSampleZ + 1);
  const blendX = clampedSampleX - minSampleX;
  const blendZ = clampedSampleZ - minSampleZ;
  const height00 = getTerrainHeightAtSample(terrain, minSampleX, minSampleZ);
  const height10 = getTerrainHeightAtSample(terrain, maxSampleX, minSampleZ);
  const height01 = getTerrainHeightAtSample(terrain, minSampleX, maxSampleZ);
  const height11 = getTerrainHeightAtSample(terrain, maxSampleX, maxSampleZ);

  return lerp(
    lerp(height00, height10, blendX),
    lerp(height01, height11, blendX),
    blendZ
  );
}

function getStoredTerrainPaintWeightAtSample(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  layerOffset: number
): number {
  const offset = getTerrainPaintWeightSampleOffset(terrain, sampleX, sampleZ);
  return terrain.paintWeights[offset + layerOffset] ?? 0;
}

function sampleTerrainPaintWeightAtGridCoordinate(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number,
  layerOffset: number
): number {
  const clampedSampleX = clamp(sampleX, 0, terrain.sampleCountX - 1);
  const clampedSampleZ = clamp(sampleZ, 0, terrain.sampleCountZ - 1);
  const minSampleX = Math.floor(clampedSampleX);
  const maxSampleX = Math.min(terrain.sampleCountX - 1, minSampleX + 1);
  const minSampleZ = Math.floor(clampedSampleZ);
  const maxSampleZ = Math.min(terrain.sampleCountZ - 1, minSampleZ + 1);
  const blendX = clampedSampleX - minSampleX;
  const blendZ = clampedSampleZ - minSampleZ;
  const weight00 = getStoredTerrainPaintWeightAtSample(
    terrain,
    minSampleX,
    minSampleZ,
    layerOffset
  );
  const weight10 = getStoredTerrainPaintWeightAtSample(
    terrain,
    maxSampleX,
    minSampleZ,
    layerOffset
  );
  const weight01 = getStoredTerrainPaintWeightAtSample(
    terrain,
    minSampleX,
    maxSampleZ,
    layerOffset
  );
  const weight11 = getStoredTerrainPaintWeightAtSample(
    terrain,
    maxSampleX,
    maxSampleZ,
    layerOffset
  );

  return lerp(
    lerp(weight00, weight10, blendX),
    lerp(weight01, weight11, blendX),
    blendZ
  );
}

function createTerrainPositionFromCenter(
  center: Vec3,
  sampleCountX: number,
  sampleCountZ: number,
  cellSize: number
): Vec3 {
  return {
    x: center.x - ((sampleCountX - 1) * cellSize) * 0.5,
    y: center.y,
    z: center.z - ((sampleCountZ - 1) * cellSize) * 0.5
  };
}

function getTerrainFootprintCenter(terrain: Terrain): Vec3 {
  return {
    x: terrain.position.x + getTerrainFootprintWidth(terrain) * 0.5,
    y: terrain.position.y,
    z: terrain.position.z + getTerrainFootprintDepth(terrain) * 0.5
  };
}

function createResampledTerrainHeights(
  terrain: Terrain,
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  const heights = new Array<number>(sampleCountX * sampleCountZ);

  for (let sampleZ = 0; sampleZ < sampleCountZ; sampleZ += 1) {
    const normalizedSampleZ =
      sampleCountZ === 1 ? 0 : sampleZ / (sampleCountZ - 1);
    const sourceSampleZ = normalizedSampleZ * (terrain.sampleCountZ - 1);

    for (let sampleX = 0; sampleX < sampleCountX; sampleX += 1) {
      const normalizedSampleX =
        sampleCountX === 1 ? 0 : sampleX / (sampleCountX - 1);
      const sourceSampleX = normalizedSampleX * (terrain.sampleCountX - 1);

      heights[sampleZ * sampleCountX + sampleX] =
        sampleTerrainHeightAtGridCoordinate(
          terrain,
          sourceSampleX,
          sourceSampleZ
        );
    }
  }

  return heights;
}

function createResampledTerrainPaintWeights(
  terrain: Terrain,
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  const paintWeights = new Array<number>(
    sampleCountX * sampleCountZ * (TERRAIN_LAYER_COUNT - 1)
  );

  for (let sampleZ = 0; sampleZ < sampleCountZ; sampleZ += 1) {
    const normalizedSampleZ =
      sampleCountZ === 1 ? 0 : sampleZ / (sampleCountZ - 1);
    const sourceSampleZ = normalizedSampleZ * (terrain.sampleCountZ - 1);

    for (let sampleX = 0; sampleX < sampleCountX; sampleX += 1) {
      const normalizedSampleX =
        sampleCountX === 1 ? 0 : sampleX / (sampleCountX - 1);
      const sourceSampleX = normalizedSampleX * (terrain.sampleCountX - 1);
      const offset =
        (sampleZ * sampleCountX + sampleX) * (TERRAIN_LAYER_COUNT - 1);

      for (
        let layerOffset = 0;
        layerOffset < TERRAIN_LAYER_COUNT - 1;
        layerOffset += 1
      ) {
        paintWeights[offset + layerOffset] =
          sampleTerrainPaintWeightAtGridCoordinate(
            terrain,
            sourceSampleX,
            sourceSampleZ,
            layerOffset
          );
      }
    }
  }

  return paintWeights;
}

export function resizeTerrainGrid(
  terrain: Terrain,
  options: Pick<Terrain, "sampleCountX" | "sampleCountZ" | "cellSize"> & {
    preserveCenter?: boolean;
  }
): Terrain {
  const sampleCountX = normalizeTerrainSampleCount(
    options.sampleCountX,
    "Terrain sampleCountX"
  );
  const sampleCountZ = normalizeTerrainSampleCount(
    options.sampleCountZ,
    "Terrain sampleCountZ"
  );
  const cellSize = normalizeTerrainCellSize(options.cellSize);
  const preserveCenter = options.preserveCenter ?? true;
  const nextPosition = preserveCenter
    ? createTerrainPositionFromCenter(
        getTerrainFootprintCenter(terrain),
        sampleCountX,
        sampleCountZ,
        cellSize
      )
    : cloneVec3(terrain.position);

  return createTerrain({
    ...terrain,
    position: nextPosition,
    sampleCountX,
    sampleCountZ,
    cellSize,
    heights: createResampledTerrainHeights(terrain, sampleCountX, sampleCountZ),
    paintWeights: createResampledTerrainPaintWeights(
      terrain,
      sampleCountX,
      sampleCountZ
    )
  });
}

function createDefaultTerrainPosition(
  sampleCountX: number,
  sampleCountZ: number,
  cellSize: number
): Vec3 {
  return {
    x: -((sampleCountX - 1) * cellSize) * 0.5,
    y: 0,
    z: -((sampleCountZ - 1) * cellSize) * 0.5
  };
}

export function createTerrain(
  overrides: Partial<
    Pick<
      Terrain,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "collisionEnabled"
      | "position"
      | "sampleCountX"
      | "sampleCountZ"
      | "cellSize"
      | "heights"
      | "layers"
      | "paintWeights"
    >
  > = {}
): Terrain {
  const sampleCountX = normalizeTerrainSampleCount(
    overrides.sampleCountX ?? DEFAULT_TERRAIN_SAMPLE_COUNT_X,
    "Terrain sampleCountX"
  );
  const sampleCountZ = normalizeTerrainSampleCount(
    overrides.sampleCountZ ?? DEFAULT_TERRAIN_SAMPLE_COUNT_Z,
    "Terrain sampleCountZ"
  );
  const cellSize = normalizeTerrainCellSize(
    overrides.cellSize ?? DEFAULT_TERRAIN_CELL_SIZE
  );
  const position = cloneVec3(
    overrides.position ??
      createDefaultTerrainPosition(sampleCountX, sampleCountZ, cellSize)
  );
  const heights =
    overrides.heights !== undefined
      ? [...overrides.heights]
      : createFlatTerrainHeights(sampleCountX, sampleCountZ);
  const layers = normalizeTerrainLayers(overrides.layers);
  const paintWeights = normalizeTerrainPaintWeights(
    sampleCountX,
    sampleCountZ,
    overrides.paintWeights
  );
  const visible = overrides.visible ?? DEFAULT_TERRAIN_VISIBLE;
  const enabled = overrides.enabled ?? DEFAULT_TERRAIN_ENABLED;
  const collisionEnabled = normalizeTerrainCollisionEnabled(
    overrides.collisionEnabled ?? DEFAULT_TERRAIN_COLLISION_ENABLED
  );

  assertFiniteVec3(position, "Terrain position");

  if (typeof visible !== "boolean") {
    throw new Error("Terrain visible must be a boolean.");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("Terrain enabled must be a boolean.");
  }

  if (heights.length !== sampleCountX * sampleCountZ) {
    throw new Error(
      `Terrain heights must contain exactly ${sampleCountX * sampleCountZ} samples.`
    );
  }

  if (heights.some((height) => !Number.isFinite(height))) {
    throw new Error("Terrain heights must remain finite.");
  }

  return {
    id: overrides.id ?? createOpaqueId("terrain"),
    kind: "terrain",
    name: normalizeTerrainName(overrides.name),
    visible,
    enabled,
    collisionEnabled,
    position,
    sampleCountX,
    sampleCountZ,
    cellSize,
    heights,
    layers,
    paintWeights
  };
}

export function cloneTerrain(terrain: Terrain): Terrain {
  return createTerrain(terrain);
}

export function areTerrainsEqual(left: Terrain, right: Terrain): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.name === right.name &&
    left.visible === right.visible &&
    left.enabled === right.enabled &&
    left.collisionEnabled === right.collisionEnabled &&
    areVec3Equal(left.position, right.position) &&
    left.sampleCountX === right.sampleCountX &&
    left.sampleCountZ === right.sampleCountZ &&
    left.cellSize === right.cellSize &&
    left.heights.length === right.heights.length &&
    left.heights.every((height, index) => height === right.heights[index]) &&
    left.layers.length === right.layers.length &&
    left.layers.every(
      (layer, index) => layer.materialId === right.layers[index]?.materialId
    ) &&
    left.paintWeights.length === right.paintWeights.length &&
    left.paintWeights.every(
      (weight, index) => weight === right.paintWeights[index]
    )
  );
}

export function compareTerrains(left: Terrain, right: Terrain): number {
  const leftName = left.name ?? "";
  const rightName = right.name ?? "";

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return left.id.localeCompare(right.id);
}

export function getTerrains(terrains: Record<string, Terrain>): Terrain[] {
  return Object.values(terrains).sort(compareTerrains);
}

export function getTerrainKindLabel(): string {
  return "Terrain";
}
