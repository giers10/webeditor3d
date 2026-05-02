import type { Vec3 } from "../core/vector";
import {
  getTerrainBounds,
  getTerrainFoliageMask,
  getTerrainFootprintDepth,
  getTerrainFootprintWidth,
  getTerrainHeightAtSample,
  isTerrainFoliageMaskEmpty,
  sampleTerrainFoliageMaskAtWorldPosition,
  type Terrain
} from "../document/terrains";
import { BUNDLED_FOLIAGE_PROTOTYPE_REGISTRY } from "./bundled-foliage-manifest";
import type {
  FoliageLayer,
  FoliageLayerRegistry,
  FoliagePrototype,
  FoliagePrototypeRegistry
} from "./foliage";

export interface FoliageScatterColorTint {
  r: number;
  g: number;
  b: number;
}

export interface DerivedFoliageInstance {
  terrainId: string;
  layerId: string;
  prototypeId: string;
  position: Vec3;
  normal: Vec3;
  yawRadians: number;
  scale: number;
  colorTint: FoliageScatterColorTint;
  windPhase: number;
  windStrength: number;
  lodBias: number;
  alignToNormal: number;
  cullDistance: number;
}

export interface DerivedFoliageScatterChunk {
  id: string;
  terrainId: string;
  layerId: string;
  chunkX: number;
  chunkZ: number;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  instances: DerivedFoliageInstance[];
}

export interface FoliageScatterResult {
  chunks: DerivedFoliageScatterChunk[];
  instanceCount: number;
}

export type FoliageScatterPrototypeSource =
  | FoliagePrototypeRegistry
  | readonly FoliagePrototype[];

export interface FoliageScatterGenerationOptions {
  foliageLayers: FoliageLayerRegistry;
  foliagePrototypes?: FoliagePrototypeRegistry;
  bundledFoliagePrototypes?: FoliageScatterPrototypeSource;
  chunkSizeMeters?: number;
  maxInstancesPerChunk?: number;
}

export interface GenerateFoliageScatterForTerrainOptions
  extends FoliageScatterGenerationOptions {
  terrain: Terrain;
}

export interface GenerateFoliageScatterForSceneOptions
  extends FoliageScatterGenerationOptions {
  terrains: Record<string, Terrain>;
}

interface WeightedFoliagePrototype {
  prototype: FoliagePrototype;
  cumulativeWeight: number;
}

interface WeightedFoliagePrototypeSet {
  prototypes: WeightedFoliagePrototype[];
  totalWeight: number;
}

export const DEFAULT_FOLIAGE_SCATTER_CHUNK_SIZE_METERS = 16;
export const DEFAULT_MAX_FOLIAGE_SCATTER_INSTANCES_PER_CHUNK = 512;

const HASH_OFFSET_BASIS = 2166136261;
const HASH_PRIME = 16777619;
const UINT32_MAX_PLUS_ONE = 4294967296;
const FULL_TURN_RADIANS = Math.PI * 2;
const RADIANS_TO_DEGREES = 180 / Math.PI;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function smoothstep(alpha: number): number {
  return alpha * alpha * (3 - 2 * alpha);
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 0) {
    return { x: 0, y: 1, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function hashString(value: string): number {
  let hash = HASH_OFFSET_BASIS;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, HASH_PRIME);
  }

  return hash >>> 0;
}

function hashParts(parts: readonly unknown[]): number {
  return hashString(parts.map((part) => String(part)).join("|"));
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / UINT32_MAX_PLUS_ONE;
  };
}

function hashGridCoordinate(seed: number, gridX: number, gridZ: number): number {
  let hash = seed >>> 0;
  hash ^= Math.imul(gridX | 0, 374761393);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= Math.imul(gridZ | 0, 668265263);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489917);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function sampleValueNoise(
  worldX: number,
  worldZ: number,
  scale: number,
  seed: number
): number {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }

  const noiseX = worldX / scale;
  const noiseZ = worldZ / scale;
  const minX = Math.floor(noiseX);
  const minZ = Math.floor(noiseZ);
  const maxX = minX + 1;
  const maxZ = minZ + 1;
  const blendX = smoothstep(noiseX - minX);
  const blendZ = smoothstep(noiseZ - minZ);
  const value00 = hashGridCoordinate(seed, minX, minZ) / 0xffffffff;
  const value10 = hashGridCoordinate(seed, maxX, minZ) / 0xffffffff;
  const value01 = hashGridCoordinate(seed, minX, maxZ) / 0xffffffff;
  const value11 = hashGridCoordinate(seed, maxX, maxZ) / 0xffffffff;

  return lerp(
    lerp(value00, value10, blendX),
    lerp(value01, value11, blendX),
    blendZ
  );
}

function normalizeChunkSize(chunkSizeMeters: number | undefined): number {
  if (!Number.isFinite(chunkSizeMeters) || chunkSizeMeters === undefined) {
    return DEFAULT_FOLIAGE_SCATTER_CHUNK_SIZE_METERS;
  }

  return chunkSizeMeters > 0
    ? chunkSizeMeters
    : DEFAULT_FOLIAGE_SCATTER_CHUNK_SIZE_METERS;
}

function normalizeMaxInstancesPerChunk(
  maxInstancesPerChunk: number | undefined
): number {
  if (
    maxInstancesPerChunk === undefined ||
    !Number.isFinite(maxInstancesPerChunk)
  ) {
    return DEFAULT_MAX_FOLIAGE_SCATTER_INSTANCES_PER_CHUNK;
  }

  return Math.max(0, Math.floor(maxInstancesPerChunk));
}

function sourceToRegistry(
  source: FoliageScatterPrototypeSource
): FoliagePrototypeRegistry {
  if (Array.isArray(source)) {
    return Object.fromEntries(
      source.map((prototype) => [prototype.id, prototype])
    );
  }

  return { ...source };
}

export function createFoliageScatterPrototypeRegistry(options: {
  foliagePrototypes?: FoliagePrototypeRegistry;
  bundledFoliagePrototypes?: FoliageScatterPrototypeSource;
} = {}): FoliagePrototypeRegistry {
  const bundledRegistry = sourceToRegistry(
    options.bundledFoliagePrototypes ?? BUNDLED_FOLIAGE_PROTOTYPE_REGISTRY
  );

  return {
    ...bundledRegistry,
    ...(options.foliagePrototypes ?? {})
  };
}

function createWeightedPrototypeSet(
  layer: FoliageLayer,
  prototypeRegistry: FoliagePrototypeRegistry
): WeightedFoliagePrototypeSet {
  const prototypes: WeightedFoliagePrototype[] = [];
  const seenPrototypeIds = new Set<string>();
  let totalWeight = 0;

  for (const prototypeId of layer.prototypeIds) {
    if (seenPrototypeIds.has(prototypeId)) {
      continue;
    }

    seenPrototypeIds.add(prototypeId);

    const prototype = prototypeRegistry[prototypeId];

    if (prototype === undefined || prototype.densityWeight <= 0) {
      continue;
    }

    totalWeight += prototype.densityWeight;
    prototypes.push({
      prototype,
      cumulativeWeight: totalWeight
    });
  }

  return {
    prototypes,
    totalWeight
  };
}

function choosePrototype(
  prototypeSet: WeightedFoliagePrototypeSet,
  random: () => number
): FoliagePrototype | null {
  if (prototypeSet.totalWeight <= 0 || prototypeSet.prototypes.length === 0) {
    return null;
  }

  const targetWeight = random() * prototypeSet.totalWeight;

  for (const entry of prototypeSet.prototypes) {
    if (targetWeight < entry.cumulativeWeight) {
      return entry.prototype;
    }
  }

  return (
    prototypeSet.prototypes[prototypeSet.prototypes.length - 1]?.prototype ??
    null
  );
}

function sampleTerrainHeightAtWorldPosition(
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
  const minSampleX = Math.floor(clampedSampleX);
  const minSampleZ = Math.floor(clampedSampleZ);
  const maxX = Math.min(maxSampleX, minSampleX + 1);
  const maxZ = Math.min(maxSampleZ, minSampleZ + 1);
  const blendX = clampedSampleX - minSampleX;
  const blendZ = clampedSampleZ - minSampleZ;
  const height00 = getTerrainHeightAtSample(terrain, minSampleX, minSampleZ);
  const height10 = getTerrainHeightAtSample(terrain, maxX, minSampleZ);
  const height01 = getTerrainHeightAtSample(terrain, minSampleX, maxZ);
  const height11 = getTerrainHeightAtSample(terrain, maxX, maxZ);

  return lerp(
    lerp(height00, height10, blendX),
    lerp(height01, height11, blendX),
    blendZ
  );
}

export function sampleFoliageScatterTerrainNormal(
  terrain: Terrain,
  worldX: number,
  worldZ: number
): Vec3 {
  const step = Math.max(terrain.cellSize, 0.0001);
  const leftHeight =
    sampleTerrainHeightAtWorldPosition(terrain, worldX - step, worldZ, true) ??
    0;
  const rightHeight =
    sampleTerrainHeightAtWorldPosition(terrain, worldX + step, worldZ, true) ??
    0;
  const backHeight =
    sampleTerrainHeightAtWorldPosition(terrain, worldX, worldZ - step, true) ??
    0;
  const forwardHeight =
    sampleTerrainHeightAtWorldPosition(terrain, worldX, worldZ + step, true) ??
    0;

  return normalizeVec3({
    x: leftHeight - rightHeight,
    y: step * 2,
    z: backHeight - forwardHeight
  });
}

export function sampleFoliageScatterTerrainSurface(
  terrain: Terrain,
  worldX: number,
  worldZ: number
): { position: Vec3; normal: Vec3 } | null {
  const height = sampleTerrainHeightAtWorldPosition(
    terrain,
    worldX,
    worldZ,
    false
  );

  if (height === null) {
    return null;
  }

  return {
    position: {
      x: worldX,
      y: terrain.position.y + height,
      z: worldZ
    },
    normal: sampleFoliageScatterTerrainNormal(terrain, worldX, worldZ)
  };
}

function getSlopeDegrees(normal: Vec3): number {
  return Math.acos(clamp(normal.y, -1, 1)) * RADIANS_TO_DEGREES;
}

function shouldAcceptSlope(layer: FoliageLayer, normal: Vec3): boolean {
  const slopeDegrees = getSlopeDegrees(normal);
  return (
    slopeDegrees >= layer.minSlopeDegrees &&
    slopeDegrees <= layer.maxSlopeDegrees
  );
}

function createColorTint(
  layer: FoliageLayer,
  prototype: FoliagePrototype,
  random: () => number
): FoliageScatterColorTint {
  const variation = clamp01(
    Math.max(layer.colorVariation, prototype.colorVariation)
  );
  const leafShift = (random() * 2 - 1) * variation;
  const stemShift = (random() * 2 - 1) * variation * 0.5;

  return {
    r: clamp(1 + stemShift, 0, 2),
    g: clamp(1 + leafShift, 0, 2),
    b: clamp(1 + stemShift, 0, 2)
  };
}

function createDerivedFoliageInstance(options: {
  terrain: Terrain;
  layer: FoliageLayer;
  prototype: FoliagePrototype;
  position: Vec3;
  normal: Vec3;
  random: () => number;
}): DerivedFoliageInstance {
  const { terrain, layer, prototype, position, normal, random } = options;
  const prototypeScale = lerp(
    prototype.minScale,
    prototype.maxScale,
    random()
  );
  const layerScale = lerp(layer.minScale, layer.maxScale, random());

  return {
    terrainId: terrain.id,
    layerId: layer.id,
    prototypeId: prototype.id,
    position,
    normal,
    yawRadians: prototype.randomYaw ? random() * FULL_TURN_RADIANS : 0,
    scale: prototypeScale * layerScale,
    colorTint: createColorTint(layer, prototype, random),
    windPhase:
      random() * FULL_TURN_RADIANS * clamp01(prototype.windPhaseRandomness),
    windStrength: prototype.windStrength,
    lodBias: random() - 0.5,
    alignToNormal: clamp01(layer.alignToNormal * prototype.alignToNormal),
    cullDistance: prototype.defaultCullDistance
  };
}

function generateChunkInstances(options: {
  terrain: Terrain;
  layer: FoliageLayer;
  prototypeSet: WeightedFoliagePrototypeSet;
  chunkX: number;
  chunkZ: number;
  minWorldX: number;
  maxWorldX: number;
  minWorldZ: number;
  maxWorldZ: number;
  candidateCount: number;
}): DerivedFoliageInstance[] {
  const {
    terrain,
    layer,
    prototypeSet,
    chunkX,
    chunkZ,
    minWorldX,
    maxWorldX,
    minWorldZ,
    maxWorldZ,
    candidateCount
  } = options;
  const random = createSeededRandom(
    hashParts([terrain.id, layer.id, layer.seed, chunkX, chunkZ])
  );
  const noiseSeed = hashParts(["foliage-noise", terrain.id, layer.id, layer.seed]);
  const instances: DerivedFoliageInstance[] = [];

  for (
    let candidateIndex = 0;
    candidateIndex < candidateCount;
    candidateIndex += 1
  ) {
    const worldX = lerp(minWorldX, maxWorldX, random());
    const worldZ = lerp(minWorldZ, maxWorldZ, random());
    const maskValue =
      sampleTerrainFoliageMaskAtWorldPosition(
        terrain,
        layer.id,
        worldX,
        worldZ,
        false
      ) ?? 0;

    if (maskValue <= 0) {
      continue;
    }

    const noiseValue = sampleValueNoise(
      worldX,
      worldZ,
      layer.noiseScale,
      noiseSeed
    );

    if (noiseValue < layer.noiseThreshold) {
      continue;
    }

    const noiseInfluence = lerp(1, noiseValue, layer.noiseStrength);
    const acceptanceProbability = clamp01(maskValue * noiseInfluence);

    if (random() > acceptanceProbability) {
      continue;
    }

    const surface = sampleFoliageScatterTerrainSurface(
      terrain,
      worldX,
      worldZ
    );

    if (surface === null || !shouldAcceptSlope(layer, surface.normal)) {
      continue;
    }

    const prototype = choosePrototype(prototypeSet, random);

    if (prototype === null) {
      continue;
    }

    instances.push(
      createDerivedFoliageInstance({
        terrain,
        layer,
        prototype,
        position: surface.position,
        normal: surface.normal,
        random
      })
    );
  }

  return instances;
}

function generateFoliageScatterForTerrainWithRegistry(options: {
  terrain: Terrain;
  foliageLayers: FoliageLayerRegistry;
  prototypeRegistry: FoliagePrototypeRegistry;
  chunkSizeMeters: number;
  maxInstancesPerChunk: number;
}): FoliageScatterResult {
  const {
    terrain,
    foliageLayers,
    prototypeRegistry,
    chunkSizeMeters,
    maxInstancesPerChunk
  } = options;
  const chunks: DerivedFoliageScatterChunk[] = [];

  if (!terrain.enabled || maxInstancesPerChunk <= 0) {
    return {
      chunks,
      instanceCount: 0
    };
  }

  const terrainWidth = getTerrainFootprintWidth(terrain);
  const terrainDepth = getTerrainFootprintDepth(terrain);
  const chunkCountX = Math.ceil(terrainWidth / chunkSizeMeters);
  const chunkCountZ = Math.ceil(terrainDepth / chunkSizeMeters);
  const terrainBounds = getTerrainBounds(terrain);
  let instanceCount = 0;

  for (const layerId of Object.keys(foliageLayers).sort()) {
    const layer = foliageLayers[layerId];

    if (
      layer === undefined ||
      !layer.enabled ||
      layer.density <= 0 ||
      !Number.isFinite(layer.density)
    ) {
      continue;
    }

    const mask = getTerrainFoliageMask(terrain, layer.id);

    if (mask === null || isTerrainFoliageMaskEmpty(mask)) {
      continue;
    }

    const prototypeSet = createWeightedPrototypeSet(layer, prototypeRegistry);

    if (prototypeSet.totalWeight <= 0) {
      continue;
    }

    for (let chunkZ = 0; chunkZ < chunkCountZ; chunkZ += 1) {
      const localMinZ = chunkZ * chunkSizeMeters;
      const localMaxZ = Math.min(terrainDepth, localMinZ + chunkSizeMeters);

      for (let chunkX = 0; chunkX < chunkCountX; chunkX += 1) {
        const localMinX = chunkX * chunkSizeMeters;
        const localMaxX = Math.min(terrainWidth, localMinX + chunkSizeMeters);
        const chunkArea = Math.max(
          0,
          (localMaxX - localMinX) * (localMaxZ - localMinZ)
        );
        const candidateCount = Math.min(
          maxInstancesPerChunk,
          Math.ceil(chunkArea * layer.density)
        );

        if (candidateCount <= 0) {
          continue;
        }

        const minWorldX = terrain.position.x + localMinX;
        const maxWorldX = terrain.position.x + localMaxX;
        const minWorldZ = terrain.position.z + localMinZ;
        const maxWorldZ = terrain.position.z + localMaxZ;
        const instances = generateChunkInstances({
          terrain,
          layer,
          prototypeSet,
          chunkX,
          chunkZ,
          minWorldX,
          maxWorldX,
          minWorldZ,
          maxWorldZ,
          candidateCount
        });

        if (instances.length === 0) {
          continue;
        }

        chunks.push({
          id: `${terrain.id}:${layer.id}:${chunkX}:${chunkZ}`,
          terrainId: terrain.id,
          layerId: layer.id,
          chunkX,
          chunkZ,
          bounds: {
            min: {
              x: minWorldX,
              y: terrainBounds.min.y,
              z: minWorldZ
            },
            max: {
              x: maxWorldX,
              y: terrainBounds.max.y,
              z: maxWorldZ
            }
          },
          instances
        });
        instanceCount += instances.length;
      }
    }
  }

  return {
    chunks,
    instanceCount
  };
}

export function generateFoliageScatterForTerrain(
  options: GenerateFoliageScatterForTerrainOptions
): FoliageScatterResult {
  const prototypeRegistry = createFoliageScatterPrototypeRegistry({
    foliagePrototypes: options.foliagePrototypes,
    bundledFoliagePrototypes: options.bundledFoliagePrototypes
  });

  return generateFoliageScatterForTerrainWithRegistry({
    terrain: options.terrain,
    foliageLayers: options.foliageLayers,
    prototypeRegistry,
    chunkSizeMeters: normalizeChunkSize(options.chunkSizeMeters),
    maxInstancesPerChunk: normalizeMaxInstancesPerChunk(
      options.maxInstancesPerChunk
    )
  });
}

export function generateFoliageScatterForScene(
  options: GenerateFoliageScatterForSceneOptions
): FoliageScatterResult {
  const prototypeRegistry = createFoliageScatterPrototypeRegistry({
    foliagePrototypes: options.foliagePrototypes,
    bundledFoliagePrototypes: options.bundledFoliagePrototypes
  });
  const chunkSizeMeters = normalizeChunkSize(options.chunkSizeMeters);
  const maxInstancesPerChunk = normalizeMaxInstancesPerChunk(
    options.maxInstancesPerChunk
  );
  const chunks: DerivedFoliageScatterChunk[] = [];
  let instanceCount = 0;

  for (const terrainId of Object.keys(options.terrains).sort()) {
    const terrain = options.terrains[terrainId];

    if (terrain === undefined) {
      continue;
    }

    const result = generateFoliageScatterForTerrainWithRegistry({
      terrain,
      foliageLayers: options.foliageLayers,
      prototypeRegistry,
      chunkSizeMeters,
      maxInstancesPerChunk
    });

    chunks.push(...result.chunks);
    instanceCount += result.instanceCount;
  }

  return {
    chunks,
    instanceCount
  };
}
