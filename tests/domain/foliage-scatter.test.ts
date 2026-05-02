import { describe, expect, it } from "vitest";

import {
  createTerrain,
  createTerrainFoliageMask,
  type Terrain
} from "../../src/document/terrains";
import {
  generateFoliageScatterForScene,
  generateFoliageScatterForTerrain,
  sampleFoliageScatterTerrainNormal,
  type FoliageScatterResult
} from "../../src/foliage/foliage-scatter";
import { BUNDLED_FOLIAGE_PROTOTYPES } from "../../src/foliage/bundled-foliage-manifest";
import {
  createFoliageLayer,
  createFoliagePrototype,
  type FoliageLayer,
  type FoliagePrototype,
  type FoliagePrototypeRegistry
} from "../../src/foliage/foliage";
import { sampleTerrainHeightAtWorldPosition } from "../../src/geometry/terrain-brush";

const TEST_LAYER_ID = "foliage-layer-scatter";
const TEST_PROTOTYPE_ID = "foliage-prototype-scatter";
const TEST_LODS = BUNDLED_FOLIAGE_PROTOTYPES[0]!.lods;

function createTestPrototype(
  overrides: Partial<FoliagePrototype> = {}
): FoliagePrototype {
  return createFoliagePrototype({
    id: overrides.id ?? TEST_PROTOTYPE_ID,
    label: overrides.label ?? "Scatter Prototype",
    category: overrides.category ?? "grass",
    lods: overrides.lods ?? TEST_LODS,
    minScale: overrides.minScale ?? 1,
    maxScale: overrides.maxScale ?? 1,
    randomYaw: overrides.randomYaw ?? true,
    alignToNormal: overrides.alignToNormal ?? 1,
    densityWeight: overrides.densityWeight ?? 1,
    colorVariation: overrides.colorVariation ?? 0,
    windStrength: overrides.windStrength ?? 0,
    windPhaseRandomness: overrides.windPhaseRandomness ?? 0,
    defaultCullDistance: overrides.defaultCullDistance ?? 100
  });
}

function createPrototypeRegistry(
  prototypes: readonly FoliagePrototype[] = [createTestPrototype()]
): FoliagePrototypeRegistry {
  return Object.fromEntries(
    prototypes.map((prototype) => [prototype.id, prototype])
  );
}

function createTestLayer(overrides: Partial<FoliageLayer> = {}): FoliageLayer {
  return createFoliageLayer({
    id: overrides.id ?? TEST_LAYER_ID,
    name: overrides.name ?? "Scatter Layer",
    prototypeIds: overrides.prototypeIds ?? [TEST_PROTOTYPE_ID],
    density: overrides.density ?? 1,
    minScale: overrides.minScale ?? 1,
    maxScale: overrides.maxScale ?? 1,
    minSlopeDegrees: overrides.minSlopeDegrees ?? 0,
    maxSlopeDegrees: overrides.maxSlopeDegrees ?? 90,
    alignToNormal: overrides.alignToNormal ?? 1,
    noiseScale: overrides.noiseScale ?? 8,
    noiseStrength: overrides.noiseStrength ?? 0,
    noiseThreshold: overrides.noiseThreshold ?? 0,
    colorVariation: overrides.colorVariation ?? 0,
    seed: overrides.seed ?? 7,
    enabled: overrides.enabled ?? true
  });
}

function createMaskedTerrain(options: {
  id?: string;
  layerId?: string;
  sampleCountX?: number;
  sampleCountZ?: number;
  cellSize?: number;
  maskValue?: number;
  maskValues?: readonly number[];
  includeMask?: boolean;
  position?: Terrain["position"];
  heights?: readonly number[];
} = {}): Terrain {
  const sampleCountX = options.sampleCountX ?? 17;
  const sampleCountZ = options.sampleCountZ ?? 17;
  const layerId = options.layerId ?? TEST_LAYER_ID;
  const sampleCount = sampleCountX * sampleCountZ;
  const maskValues =
    options.maskValues ??
    new Array<number>(sampleCount).fill(options.maskValue ?? 1);

  return createTerrain({
    id: options.id ?? "terrain-scatter",
    position: options.position ?? { x: 0, y: 0, z: 0 },
    sampleCountX,
    sampleCountZ,
    cellSize: options.cellSize ?? 1,
    heights:
      options.heights !== undefined
        ? [...options.heights]
        : new Array<number>(sampleCount).fill(0),
    foliageMasks:
      options.includeMask === false
        ? {}
        : {
            [layerId]: createTerrainFoliageMask({
              layerId,
              resolutionX: sampleCountX,
              resolutionZ: sampleCountZ,
              values: maskValues
            })
          }
  });
}

function generateForFixture(options: {
  terrain?: Terrain;
  layer?: FoliageLayer;
  prototypes?: readonly FoliagePrototype[];
  chunkSizeMeters?: number;
  maxInstancesPerChunk?: number;
} = {}): FoliageScatterResult {
  const layer = options.layer ?? createTestLayer();

  return generateFoliageScatterForTerrain({
    terrain: options.terrain ?? createMaskedTerrain({ layerId: layer.id }),
    foliageLayers: {
      [layer.id]: layer
    },
    foliagePrototypes: createPrototypeRegistry(options.prototypes),
    bundledFoliagePrototypes: {},
    chunkSizeMeters: options.chunkSizeMeters,
    maxInstancesPerChunk: options.maxInstancesPerChunk
  });
}

function flattenInstancePrototypeIds(result: FoliageScatterResult): string[] {
  return result.chunks.flatMap((chunk) =>
    chunk.instances.map((instance) => instance.prototypeId)
  );
}

function createSlopedHeights(
  sampleCountX: number,
  sampleCountZ: number,
  heightAtSample: (sampleX: number, sampleZ: number) => number
): number[] {
  const heights: number[] = [];

  for (let sampleZ = 0; sampleZ < sampleCountZ; sampleZ += 1) {
    for (let sampleX = 0; sampleX < sampleCountX; sampleX += 1) {
      heights.push(heightAtSample(sampleX, sampleZ));
    }
  }

  return heights;
}

describe("foliage scatter generation", () => {
  it("generates deterministic chunks and instances for the same inputs", () => {
    const first = generateForFixture();
    const second = generateForFixture();

    expect(first.instanceCount).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it("changes deterministic distribution when the layer seed changes", () => {
    const seedSeven = generateForFixture({
      layer: createTestLayer({ seed: 7 })
    });
    const seedEight = generateForFixture({
      layer: createTestLayer({ seed: 8 })
    });

    expect(seedSeven.instanceCount).toBeGreaterThan(0);
    expect(seedEight.instanceCount).toBeGreaterThan(0);
    expect(seedEight.chunks).not.toEqual(seedSeven.chunks);
  });

  it("does not generate instances for absent or zero foliage masks", () => {
    const layer = createTestLayer();
    const absentMask = generateForFixture({
      layer,
      terrain: createMaskedTerrain({
        layerId: layer.id,
        includeMask: false
      })
    });
    const zeroMask = generateForFixture({
      layer,
      terrain: createMaskedTerrain({
        layerId: layer.id,
        maskValue: 0
      })
    });

    expect(absentMask).toEqual({ chunks: [], instanceCount: 0 });
    expect(zeroMask).toEqual({ chunks: [], instanceCount: 0 });
  });

  it("uses painted mask density to affect generated instance counts", () => {
    const fullMask = generateForFixture({
      terrain: createMaskedTerrain({ maskValue: 1 }),
      maxInstancesPerChunk: 1024
    });
    const quarterMask = generateForFixture({
      terrain: createMaskedTerrain({ maskValue: 0.25 }),
      maxInstancesPerChunk: 1024
    });

    expect(fullMask.instanceCount).toBeGreaterThan(quarterMask.instanceCount);
    expect(quarterMask.instanceCount).toBeGreaterThan(0);
  });

  it("uses layer density to affect generated instance counts", () => {
    const lowDensity = generateForFixture({
      layer: createTestLayer({ density: 0.5 }),
      maxInstancesPerChunk: 1024
    });
    const highDensity = generateForFixture({
      layer: createTestLayer({ density: 2 }),
      maxInstancesPerChunk: 1024
    });

    expect(highDensity.instanceCount).toBeGreaterThan(
      lowDensity.instanceCount
    );
  });

  it("filters samples by terrain slope", () => {
    const flatExcluded = generateForFixture({
      layer: createTestLayer({
        minSlopeDegrees: 10,
        maxSlopeDegrees: 90
      })
    });
    const steepTerrain = createMaskedTerrain({
      heights: createSlopedHeights(17, 17, (sampleX) => sampleX * 2)
    });
    const steepExcluded = generateForFixture({
      terrain: steepTerrain,
      layer: createTestLayer({
        minSlopeDegrees: 0,
        maxSlopeDegrees: 20
      })
    });
    const steepIncluded = generateForFixture({
      terrain: steepTerrain,
      layer: createTestLayer({
        minSlopeDegrees: 30,
        maxSlopeDegrees: 80
      })
    });

    expect(flatExcluded.instanceCount).toBe(0);
    expect(steepExcluded.instanceCount).toBe(0);
    expect(steepIncluded.instanceCount).toBeGreaterThan(0);
  });

  it("uses prototype density weights for deterministic prototype selection", () => {
    const ignoredPrototype = createTestPrototype({
      id: "foliage-prototype-ignored",
      label: "Ignored",
      densityWeight: 0
    });
    const selectedPrototype = createTestPrototype({
      id: "foliage-prototype-selected",
      label: "Selected",
      densityWeight: 1
    });
    const result = generateForFixture({
      prototypes: [ignoredPrototype, selectedPrototype],
      layer: createTestLayer({
        prototypeIds: [ignoredPrototype.id, selectedPrototype.id]
      })
    });

    expect(result.instanceCount).toBeGreaterThan(0);
    expect(new Set(flattenInstancePrototypeIds(result))).toEqual(
      new Set([selectedPrototype.id])
    );
  });

  it("places generated instances on the sampled terrain height", () => {
    const terrain = createMaskedTerrain({
      position: { x: 5, y: 2, z: -3 },
      heights: createSlopedHeights(
        17,
        17,
        (sampleX, sampleZ) => sampleX * 0.5 + sampleZ * 0.25
      )
    });
    const result = generateForFixture({ terrain });

    expect(result.instanceCount).toBeGreaterThan(0);

    for (const chunk of result.chunks) {
      for (const instance of chunk.instances) {
        const sampledHeight = sampleTerrainHeightAtWorldPosition(
          terrain,
          instance.position.x,
          instance.position.z,
          true
        );

        expect(sampledHeight).not.toBeNull();
        expect(instance.position.y).toBeCloseTo(
          terrain.position.y + sampledHeight!,
          6
        );
      }
    }
  });

  it("generates normalized upward terrain normals", () => {
    const terrain = createMaskedTerrain({
      heights: createSlopedHeights(
        17,
        17,
        (sampleX, sampleZ) => sampleX * 0.5 + sampleZ * 0.25
      )
    });
    const result = generateForFixture({ terrain });

    expect(result.instanceCount).toBeGreaterThan(0);

    for (const chunk of result.chunks) {
      for (const instance of chunk.instances) {
        const length = Math.hypot(
          instance.normal.x,
          instance.normal.y,
          instance.normal.z
        );

        expect(length).toBeCloseTo(1, 6);
        expect(instance.normal.y).toBeGreaterThan(0);
      }
    }

    expect(sampleFoliageScatterTerrainNormal(terrain, 2, 2).y).toBeGreaterThan(
      0
    );
  });

  it("emits deterministic chunk bounds for terrain/layer chunks", () => {
    const result = generateForFixture({
      terrain: createMaskedTerrain({
        sampleCountX: 33,
        sampleCountZ: 33,
        maskValue: 1
      }),
      chunkSizeMeters: 16,
      maxInstancesPerChunk: 1024
    });

    expect(result.chunks).toHaveLength(4);
    expect(
      result.chunks.map((chunk) => ({
        chunkX: chunk.chunkX,
        chunkZ: chunk.chunkZ,
        bounds: chunk.bounds
      }))
    ).toEqual([
      {
        chunkX: 0,
        chunkZ: 0,
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 16, y: 0, z: 16 }
        }
      },
      {
        chunkX: 1,
        chunkZ: 0,
        bounds: {
          min: { x: 16, y: 0, z: 0 },
          max: { x: 32, y: 0, z: 16 }
        }
      },
      {
        chunkX: 0,
        chunkZ: 1,
        bounds: {
          min: { x: 0, y: 0, z: 16 },
          max: { x: 16, y: 0, z: 32 }
        }
      },
      {
        chunkX: 1,
        chunkZ: 1,
        bounds: {
          min: { x: 16, y: 0, z: 16 },
          max: { x: 32, y: 0, z: 32 }
        }
      }
    ]);
  });

  it("generates a whole-scene scatter result from terrain and layer registries", () => {
    const layer = createTestLayer();
    const result = generateFoliageScatterForScene({
      terrains: {
        "terrain-b": createMaskedTerrain({ id: "terrain-b", layerId: layer.id }),
        "terrain-a": createMaskedTerrain({ id: "terrain-a", layerId: layer.id })
      },
      foliageLayers: {
        [layer.id]: layer
      },
      foliagePrototypes: createPrototypeRegistry(),
      bundledFoliagePrototypes: {}
    });

    expect(result.instanceCount).toBeGreaterThan(0);
    expect(result.chunks[0]?.terrainId).toBe("terrain-a");
  });
});
