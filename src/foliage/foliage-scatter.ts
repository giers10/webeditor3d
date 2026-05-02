import type { Vec3 } from "../core/vector";
import type { Terrain } from "../document/terrains";
import {
  getTerrainBounds,
  getTerrainFootprintDepth,
  getTerrainFootprintWidth,
  sampleTerrainFoliageMaskAtWorldPosition
} from "../document/terrains";
import { sampleTerrainHeightAtWorldPosition } from "../geometry/terrain-brush";

import { BUNDLED_FOLIAGE_PROTOTYPE_REGISTRY } from "./bundled-foliage-manifest";
import type {
  FoliageLayer,
  FoliageLayerRegistry,
  FoliagePrototype,
  FoliagePrototypeRegistry
} from "./foliage";

export interface DerivedFoliageInstance {
  terrainId: string;
  layerId: string;
  prototypeId: string;
  position: Vec3;
  normal: Vec3;
  yawRadians: number;
  scale: number;
  colorTint: Vec3;
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

export interface DerivedFoliageScatter {
  chunks: DerivedFoliageScatterChunk[];
  instanceCount: number;
}

export interface GenerateFoliageScatterOptions {
  chunkSizeMeters?: number;
  maxInstancesPerChunk?: number;
}

export interface GenerateFoliageScatterForTerrainOptions
  extends GenerateFoliageScatterOptions {
  terrain: Terrain;
  foliageLayers: FoliageLayerRegistry;
  foliagePrototypes?: FoliagePrototypeRegistry;
  bundledFoliagePrototypes?:
    | FoliagePrototypeRegistry
    | readonly FoliagePrototype[];
}

export interface GenerateFoliageScatterForSceneOptions
  extends GenerateFoliageScatterOptions {
  terrains: Record<string, Terrain>;
  foliageLayers: FoliageLayerRegistry;
  foliagePrototypes?: FoliagePrototypeRegistry;
  bundledFoliagePrototypes?:
    | FoliagePrototypeRegistry
    | readonly FoliagePrototype[];
}

interface WeightedFoliagePrototype {
  prototype: FoliagePrototype;
  weight: number;
}

interface TerrainChunkFootprint {
  chunkX: number;
  chunkZ: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  area: number;
}

const TAU = Math.PI * 2;

export const DEFAULT_FOLIAGE_SCATTER_CHUNK_SIZE_METERS = 16;
export const DEFAULT_MAX_FOLIAGE_SCATTER_INSTANCES_PER_CHUNK = 512;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function normalizeVector(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 0.000001) {
    return {
      x: 0,
      y: 1,
      z: 0
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mixUint32(left: number, right: number): number {
  let value = (left ^ right) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  value = Math.imul(value ^ (value >>> 13), 3266489909);
  return (value ^ (value >>> 16)) >>> 0;
}

function createSeededRandom(seed: string): () => number {
  let state = hashStringToUint32(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashGridNoise(seed: number, x: number, z: number): number {
  const mixedX = mixUint32(seed, x >>> 0);
  const mixedZ = mixUint32(mixedX, z >>> 0);
  return mixedZ / 4294967295;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function sampleValueNoise2d(
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
  const x0 = Math.floor(noiseX);
  const z0 = Math.floor(noiseZ);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(noiseX - x0);
  const tz = smoothstep(noiseZ - z0);
  const top = lerp(
    hashGridNoise(seed, x0, z0),
    hashGridNoise(seed, x1, z0),
    tx
  );
  const bottom = lerp(
    hashGridNoise(seed, x0, z1),
    hashGridNoise(seed, x1, z1),
    tx
  );

  return lerp(top, bottom, tz);
}

function createPrototypeRegistry(
  projectPrototypes: FoliagePrototypeRegistry = {},
  bundledPrototypes:
    | FoliagePrototypeRegistry
    | readonly FoliagePrototype[] = BUNDLED_FOLIAGE_PROTOTYPE_REGISTRY
): FoliagePrototypeRegistry {
  const bundledRegistry = Array.isArray(bundledPrototypes)
    ? Object.fromEntries(
        bundledPrototypes.map((prototype) => [prototype.id, prototype])
      )
    : bundledPrototypes;

  return {
    ...bundledRegistry,
    ...projectPrototypes
  };
}

function resolveLayerWeightedPrototypes(
  layer: FoliageLayer,
  prototypes: FoliagePrototypeRegistry
): WeightedFoliagePrototype[] {
  const seenPrototypeIds = new Set<string>();
  const weightedPrototypes: WeightedFoliagePrototype[] = [];

  for (const prototypeId of layer.prototypeIds) {
    if (seenPrototypeIds.has(prototypeId)) {
      continue;
    }

    seenPrototypeIds.add(prototypeId);
    const prototype = prototypes[prototypeId];
    const weight = prototype?.densityWeight ?? 0;

    if (
      prototype === undefined ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      continue;
    }

    weightedPrototypes.push({
      prototype,
      weight
    });
  }

  return weightedPrototypes;
}

function chooseWeightedPrototype(
  weightedPrototypes: readonly WeightedFoliagePrototype[],
  random: () => number
): FoliagePrototype | null {
  const totalWeight = weightedPrototypes.reduce(
    (sum, entry) => sum + entry.weight,
    0
  );

  if (totalWeight <= 0) {
    return null;
  }

  let cursor = random() * totalWeight;

  for (const entry of weightedPrototypes) {
    cursor -= entry.weight;

    if (cursor <= 0) {
      return entry.prototype;
    }
  }

  return weightedPrototypes[weightedPrototypes.length - 1]?.prototype ?? null;
}

function getChunkFootprints(
  terrain: Terrain,
  chunkSizeMeters: number
): TerrainChunkFootprint[] {
  const width = getTerrainFootprintWidth(terrain);
  const depth = getTerrainFootprintDepth(terrain);
  const chunkCountX = Math.max(1, Math.ceil(width / chunkSizeMeters));
  const chunkCountZ = Math.max(1, Math.ceil(depth / chunkSizeMeters));
  const chunks: TerrainChunkFootprint[] = [];

  for (let chunkZ = 0; chunkZ < chunkCountZ; chunkZ += 1) {
    const minZ = terrain.position.z + chunkZ * chunkSizeMeters;
    const maxZ = Math.min(
      terrain.position.z + depth,
      minZ + chunkSizeMeters
    );

    for (let chunkX = 0; chunkX < chunkCountX; chunkX += 1) {
      const minX = terrain.position.x + chunkX * chunkSizeMeters;
      const maxX = Math.min(
        terrain.position.x + width,
        minX + chunkSizeMeters
      );
      const area = Math.max(0, maxX - minX) * Math.max(0, maxZ - minZ);

      if (area <= 0) {
        continue;
      }

      chunks.push({
        chunkX,
        chunkZ,
        minX,
        maxX,
        minZ,
        maxZ,
        area
      });
    }
  }

  return chunks;
}

export function sampleTerrainNormalAtWorldPosition(
  terrain: Terrain,
  worldX: number,
  worldZ: number
): Vec3 {
  const step = Math.max(terrain.cellSize, 0.0001);
  const left =
    sampleTerrainHeightAtWorldPosition(terrain, worldX - step, worldZ, true) ??
    0;
  const right =
    sampleTerrainHeightAtWorldPosition(terrain, worldX + step, worldZ, true) ??
    0;
  const down =
    sampleTerrainHeightAtWorldPosition(terrain, worldX, worldZ - step, true) ??
    0;
  const up =
    sampleTerrainHeightAtWorldPosition(terrain, worldX, worldZ + step, true) ??
    0;

  return normalizeVector({
    x: left - right,
    y: 2 * step,
    z: down - up
  });
}

function getSlopeDegreesFromNormal(normal: Vec3): number {
  return (
    (Math.acos(clamp(normal.y, -1, 1)) * 180) /
    Math.PI
  );
}

function getLayerMaskInfluence(
  terrain: Terrain,
  layer: FoliageLayer,
  worldX: number,
  worldZ: number
): number {
  const maskValue =
    sampleTerrainFoliageMaskAtWorldPosition(
      terrain,
      layer.id,
      worldX,
      worldZ
    ) ?? 0;

  if (maskValue <= 0) {
    return 0;
  }

  const noiseSeed = hashStringToUint32(`${layer.id}:${layer.seed}:noise`);
  const noiseValue = sampleValueNoise2d(
    worldX,
    worldZ,
    layer.noiseScale,
    noiseSeed
  );

  if (noiseValue < layer.noiseThreshold) {
    return 0;
  }

  const noiseInfluence = lerp(1, noiseValue, clamp01(layer.noiseStrength));
  return clamp01(maskValue * noiseInfluence);
}

function createChunkBounds(
  terrain: Terrain,
  chunk: TerrainChunkFootprint
): { min: Vec3; max: Vec3 } {
  const terrainBounds = getTerrainBounds(terrain);

  return {
    min: {
      x: chunk.minX,
      y: terrainBounds.min.y,
      z: chunk.minZ
    },
    max: {
      x: chunk.maxX,
      y: terrainBounds.max.y,
      z: chunk.maxZ
    }
  };
}

function createFoliageInstance(options: {
  terrain: Terrain;
  layer: FoliageLayer;
  prototype: FoliagePrototype;
  worldX: number;
  worldZ: number;
  random: () => number;
}): DerivedFoliageInstance | null {
  const height = sampleTerrainHeightAtWorldPosition(
    options.terrain,
    options.worldX,
    options.worldZ
  );

  if (height === null) {
    return null;
  }

  const normal = sampleTerrainNormalAtWorldPosition(
    options.terrain,
    options.worldX,
    options.worldZ
  );
  const slopeDegrees = getSlopeDegreesFromNormal(normal);

  if (
    slopeDegrees < options.layer.minSlopeDegrees ||
    slopeDegrees > options.layer.maxSlopeDegrees
  ) {
    return null;
  }

  const layerScale = lerp(
    Math.min(options.layer.minScale, options.layer.maxScale),
    Math.max(options.layer.minScale, options.layer.maxScale),
    options.random()
  );
  const prototypeScale = lerp(
    Math.min(options.prototype.minScale, options.prototype.maxScale),
    Math.max(options.prototype.minScale, options.prototype.maxScale),
    options.random()
  );
  const colorVariation = clamp01(
    Math.max(options.layer.colorVariation, options.prototype.colorVariation)
  );
  const createTintChannel = () =>
    clamp(1 + (options.random() * 2 - 1) * colorVariation, 0, 2);

  return {
    terrainId: options.terrain.id,
    layerId: options.layer.id,
    prototypeId: options.prototype.id,
    position: {
      x: options.worldX,
      y: options.terrain.position.y + height,
      z: options.worldZ
    },
    normal,
    yawRadians: options.prototype.randomYaw ? options.random() * TAU : 0,
    scale: layerScale * prototypeScale,
    colorTint: {
      x: createTintChannel(),
      y: createTintChannel(),
      z: createTintChannel()
    },
    windPhase:
      options.random() * TAU * clamp01(options.prototype.windPhaseRandomness),
    windStrength: options.prototype.windStrength,
    lodBias: (options.random() * 2 - 1) * 0.5,
    alignToNormal: clamp01(options.layer.alignToNormal),
    cullDistance: options.prototype.defaultCullDistance
  };
}

function generateFoliageScatterChunk(options: {
  terrain: Terrain;
  layer: FoliageLayer;
  chunk: TerrainChunkFootprint;
  weightedPrototypes: readonly WeightedFoliagePrototype[];
  maxInstancesPerChunk: number;
}): DerivedFoliageScatterChunk | null {
  const candidateCount = Math.min(
    options.maxInstancesPerChunk,
    Math.ceil(options.chunk.area * Math.max(0, options.layer.density))
  );

  if (candidateCount <= 0) {
    return null;
  }

  const random = createSeededRandom(
    [
      "foliage-scatter-v1",
      options.terrain.id,
      options.layer.id,
      String(options.layer.seed),
      String(options.chunk.chunkX),
      String(options.chunk.chunkZ)
    ].join(":")
  );
  const instances: DerivedFoliageInstance[] = [];

  for (
    let candidateIndex = 0;
    candidateIndex < candidateCount &&
    instances.length < options.maxInstancesPerChunk;
    candidateIndex += 1
  ) {
    const worldX = lerp(options.chunk.minX, options.chunk.maxX, random());
    const worldZ = lerp(options.chunk.minZ, options.chunk.maxZ, random());
    const maskInfluence = getLayerMaskInfluence(
      options.terrain,
      options.layer,
      worldX,
      worldZ
    );

    if (maskInfluence <= 0 || random() > maskInfluence) {
      continue;
    }

    const prototype = chooseWeightedPrototype(
      options.weightedPrototypes,
      random
    );

    if (prototype === null) {
      continue;
    }

    const instance = createFoliageInstance({
      terrain: options.terrain,
      layer: options.layer,
      prototype,
      worldX,
      worldZ,
      random
    });

    if (instance !== null) {
      instances.push(instance);
    }
  }

  if (instances.length === 0) {
    return null;
  }

  return {
    id: `${options.terrain.id}:${options.layer.id}:${options.chunk.chunkX}:${options.chunk.chunkZ}`,
    terrainId: options.terrain.id,
    layerId: options.layer.id,
    chunkX: options.chunk.chunkX,
    chunkZ: options.chunk.chunkZ,
    bounds: createChunkBounds(options.terrain, options.chunk),
    instances
  };
}

export function generateFoliageScatterForTerrain(
  options: GenerateFoliageScatterForTerrainOptions
): DerivedFoliageScatter {
  const chunkSizeMeters = Math.max(
    0.1,
    options.chunkSizeMeters ?? DEFAULT_FOLIAGE_SCATTER_CHUNK_SIZE_METERS
  );
  const maxInstancesPerChunk = Math.max(
    0,
    Math.floor(
      options.maxInstancesPerChunk ??
        DEFAULT_MAX_FOLIAGE_SCATTER_INSTANCES_PER_CHUNK
    )
  );
  const prototypes = createPrototypeRegistry(
    options.foliagePrototypes,
    options.bundledFoliagePrototypes
  );
  const chunks: DerivedFoliageScatterChunk[] = [];

  for (const layer of Object.values(options.foliageLayers).sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    if (!layer.enabled || options.terrain.foliageMasks[layer.id] === undefined) {
      continue;
    }

    const weightedPrototypes = resolveLayerWeightedPrototypes(layer, prototypes);

    if (weightedPrototypes.length === 0) {
      continue;
    }

    for (const chunk of getChunkFootprints(options.terrain, chunkSizeMeters)) {
      const scatterChunk = generateFoliageScatterChunk({
        terrain: options.terrain,
        layer,
        chunk,
        weightedPrototypes,
        maxInstancesPerChunk
      });

      if (scatterChunk !== null) {
        chunks.push(scatterChunk);
      }
    }
  }

  return {
    chunks,
    instanceCount: chunks.reduce(
      (sum, chunk) => sum + chunk.instances.length,
      0
    )
  };
}

export function generateFoliageScatterForScene(
  options: GenerateFoliageScatterForSceneOptions
): DerivedFoliageScatter {
  const chunks: DerivedFoliageScatterChunk[] = [];

  for (const terrain of Object.values(options.terrains).sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    const terrainScatter = generateFoliageScatterForTerrain({
      terrain,
      foliageLayers: options.foliageLayers,
      foliagePrototypes: options.foliagePrototypes,
      bundledFoliagePrototypes: options.bundledFoliagePrototypes,
      chunkSizeMeters: options.chunkSizeMeters,
      maxInstancesPerChunk: options.maxInstancesPerChunk
    });

    chunks.push(...terrainScatter.chunks);
  }

  return {
    chunks,
    instanceCount: chunks.reduce(
      (sum, chunk) => sum + chunk.instances.length,
      0
    )
  };
}
