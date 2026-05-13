import { describe, expect, it } from "vitest";

import {
  createTerrainFoliageBlockerMask,
  createTerrainFoliageMask,
  getTerrainBounds,
  getTerrainFoliageBlockerMaskValueAtSample,
  getTerrainFoliageMask,
  getTerrainFoliageMaskValueAtSample,
  getTerrainFootprintDepth,
  getTerrainFootprintWidth,
  getTerrainHeightAtSample,
  getTerrainPaintWeightSampleOffset,
  createTerrainWithAddedLayer,
  createTerrainWithRemovedLayer,
  sampleTerrainHeightAtLocalPosition,
  sampleTerrainFoliageBlockerMaskAtWorldPosition,
  sampleTerrainFoliageMaskAtWorldPosition,
  updateTerrainBoundsCacheAfterHeightPatch,
  resizeTerrainGrid,
  createTerrain
} from "../../src/document/terrains";

function createIndexedHeights(
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  return Array.from({ length: sampleCountX * sampleCountZ }, (_, index) => {
    const sampleX = index % sampleCountX;
    const sampleZ = Math.floor(index / sampleCountX);

    return sampleX + sampleZ * 10;
  });
}

function createIndexedPaintWeights(
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  const paintWeights: number[] = [];

  for (let sampleZ = 0; sampleZ < sampleCountZ; sampleZ += 1) {
    for (let sampleX = 0; sampleX < sampleCountX; sampleX += 1) {
      paintWeights.push(
        sampleX * 0.01 + sampleZ * 0.02,
        sampleX * 0.03,
        sampleZ * 0.04
      );
    }
  }

  return paintWeights;
}

function createIndexedMaskValues(
  sampleCountX: number,
  sampleCountZ: number
): number[] {
  const sampleCount = sampleCountX * sampleCountZ;

  return Array.from({ length: sampleCount }, (_, index) => index / sampleCount);
}

describe("terrain grid resizing", () => {
  it("changes Cell Size from 1m to 0.5m by increasing resolution and preserving footprint", () => {
    const terrain = createTerrain({
      id: "terrain-cell-size-resolution",
      sampleCountX: 9,
      sampleCountZ: 9,
      cellSize: 1,
      heights: createIndexedHeights(9, 9)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 0.5
    });

    expect(resizedTerrain.sampleCountX).toBe(17);
    expect(resizedTerrain.sampleCountZ).toBe(17);
    expect(resizedTerrain.cellSize).toBe(0.5);
    expect(getTerrainFootprintWidth(resizedTerrain)).toBe(8);
    expect(getTerrainFootprintDepth(resizedTerrain)).toBe(8);
    expect(resizedTerrain.position).toEqual(terrain.position);
  });

  it("preserves terrain heights at representative local positions when Cell Size changes", () => {
    const terrain = createTerrain({
      id: "terrain-cell-size-height-preserve",
      sampleCountX: 9,
      sampleCountZ: 9,
      cellSize: 1,
      heights: createIndexedHeights(9, 9)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 0.5
    });

    expect(sampleTerrainHeightAtLocalPosition(resizedTerrain, 2.5, 3.5)).toBeCloseTo(
      sampleTerrainHeightAtLocalPosition(terrain, 2.5, 3.5) ?? 0
    );
    expect(sampleTerrainHeightAtLocalPosition(resizedTerrain, 6, 1)).toBeCloseTo(
      sampleTerrainHeightAtLocalPosition(terrain, 6, 1) ?? 0
    );
  });

  it("preserves paint weights at representative local positions when Cell Size changes", () => {
    const terrain = createTerrain({
      id: "terrain-cell-size-paint-preserve",
      sampleCountX: 9,
      sampleCountZ: 9,
      cellSize: 1,
      paintWeights: createIndexedPaintWeights(9, 9)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 0.5
    });
    const originalOffset = getTerrainPaintWeightSampleOffset(terrain, 4, 2);
    const resizedOffset = getTerrainPaintWeightSampleOffset(resizedTerrain, 8, 4);

    expect(resizedTerrain.paintWeights[resizedOffset]).toBeCloseTo(
      terrain.paintWeights[originalOffset] ?? 0
    );
    expect(resizedTerrain.paintWeights[resizedOffset + 1]).toBeCloseTo(
      terrain.paintWeights[originalOffset + 1] ?? 0
    );
    expect(resizedTerrain.paintWeights[resizedOffset + 2]).toBeCloseTo(
      terrain.paintWeights[originalOffset + 2] ?? 0
    );
  });

  it("increases Samples X/Z by extending terrain instead of stretching existing data", () => {
    const terrain = createTerrain({
      id: "terrain-samples-extend",
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: createIndexedHeights(3, 3)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: terrain.cellSize
    });

    expect(resizedTerrain.position).toEqual(terrain.position);
    expect(resizedTerrain.cellSize).toBe(1);
    expect(getTerrainFootprintWidth(resizedTerrain)).toBe(4);
    expect(getTerrainFootprintDepth(resizedTerrain)).toBe(4);
    expect(getTerrainHeightAtSample(resizedTerrain, 0, 0)).toBe(0);
    expect(getTerrainHeightAtSample(resizedTerrain, 1, 1)).toBe(11);
    expect(getTerrainHeightAtSample(resizedTerrain, 2, 2)).toBe(22);
  });

  it("extends west and south when those cardinal resize directions are selected", () => {
    const terrain = createTerrain({
      id: "terrain-samples-extend-west-south",
      position: { x: 10, y: 0, z: 20 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: createIndexedHeights(3, 3)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: terrain.cellSize,
      resizeDirectionX: "west",
      resizeDirectionZ: "south"
    });

    expect(resizedTerrain.position).toEqual({ x: 8, y: 0, z: 18 });
    expect(getTerrainHeightAtSample(resizedTerrain, 2, 2)).toBe(0);
    expect(getTerrainHeightAtSample(resizedTerrain, 4, 4)).toBe(22);
    expect(getTerrainHeightAtSample(resizedTerrain, 0, 2)).toBe(0);
    expect(getTerrainHeightAtSample(resizedTerrain, 2, 0)).toBe(0);
  });

  it("decreases Samples X/Z by cropping terrain instead of squashing existing data", () => {
    const terrain = createTerrain({
      id: "terrain-samples-crop",
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1,
      heights: createIndexedHeights(5, 5)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: terrain.cellSize
    });

    expect(resizedTerrain.position).toEqual(terrain.position);
    expect(resizedTerrain.cellSize).toBe(1);
    expect(getTerrainFootprintWidth(resizedTerrain)).toBe(2);
    expect(getTerrainFootprintDepth(resizedTerrain)).toBe(2);
    expect(getTerrainHeightAtSample(resizedTerrain, 0, 0)).toBe(0);
    expect(getTerrainHeightAtSample(resizedTerrain, 1, 1)).toBe(11);
    expect(getTerrainHeightAtSample(resizedTerrain, 2, 2)).toBe(22);
  });

  it("crops west and south when those cardinal resize directions are selected", () => {
    const terrain = createTerrain({
      id: "terrain-samples-crop-west-south",
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1,
      heights: createIndexedHeights(5, 5)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: terrain.cellSize,
      resizeDirectionX: "west",
      resizeDirectionZ: "south"
    });

    expect(resizedTerrain.position).toEqual({
      x: terrain.position.x + 2,
      y: terrain.position.y,
      z: terrain.position.z + 2
    });
    expect(getTerrainHeightAtSample(resizedTerrain, 0, 0)).toBe(22);
    expect(getTerrainHeightAtSample(resizedTerrain, 1, 1)).toBe(33);
    expect(getTerrainHeightAtSample(resizedTerrain, 2, 2)).toBe(44);
  });

  it("fills newly extended height samples from the nearest existing edge height", () => {
    const terrain = createTerrain({
      id: "terrain-samples-edge-fill",
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: createIndexedHeights(3, 3)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: terrain.cellSize
    });

    expect(getTerrainHeightAtSample(resizedTerrain, 4, 1)).toBe(12);
    expect(getTerrainHeightAtSample(resizedTerrain, 1, 4)).toBe(21);
    expect(getTerrainHeightAtSample(resizedTerrain, 4, 4)).toBe(22);
  });

  it("preserves paint weights at the same world positions with west and south resizing", () => {
    const terrain = createTerrain({
      id: "terrain-samples-paint-west-south",
      position: { x: 10, y: 0, z: 20 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      paintWeights: createIndexedPaintWeights(3, 3)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: terrain.cellSize,
      resizeDirectionX: "west",
      resizeDirectionZ: "south"
    });
    const originalOffset = getTerrainPaintWeightSampleOffset(terrain, 1, 1);
    const resizedOffset = getTerrainPaintWeightSampleOffset(resizedTerrain, 3, 3);

    expect(resizedTerrain.paintWeights[resizedOffset]).toBeCloseTo(
      terrain.paintWeights[originalOffset] ?? 0
    );
    expect(resizedTerrain.paintWeights[resizedOffset + 1]).toBeCloseTo(
      terrain.paintWeights[originalOffset + 1] ?? 0
    );
    expect(resizedTerrain.paintWeights[resizedOffset + 2]).toBeCloseTo(
      terrain.paintWeights[originalOffset + 2] ?? 0
    );
  });

  it("keeps foliage masks and blocker masks valid after cell-size and sample-count edits", () => {
    const foliageLayerId = "foliage-layer-resize-valid";
    const terrain = createTerrain({
      id: "terrain-masks-resize-valid",
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      foliageMasks: {
        [foliageLayerId]: createTerrainFoliageMask({
          layerId: foliageLayerId,
          resolutionX: 3,
          resolutionZ: 3,
          values: createIndexedMaskValues(3, 3)
        })
      },
      foliageBlockerMask: createTerrainFoliageBlockerMask({
        resolutionX: 3,
        resolutionZ: 3,
        values: createIndexedMaskValues(3, 3)
      })
    });

    const resolutionChangedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 0.5
    });
    const extendedTerrain = resizeTerrainGrid(resolutionChangedTerrain, {
      sampleCountX: 6,
      sampleCountZ: 4,
      cellSize: resolutionChangedTerrain.cellSize,
      resizeDirectionX: "west",
      resizeDirectionZ: "south"
    });
    const resizedMask = getTerrainFoliageMask(extendedTerrain, foliageLayerId);

    expect(resizedMask?.resolutionX).toBe(extendedTerrain.sampleCountX);
    expect(resizedMask?.resolutionZ).toBe(extendedTerrain.sampleCountZ);
    expect(resizedMask?.values).toHaveLength(
      extendedTerrain.sampleCountX * extendedTerrain.sampleCountZ
    );
    expect(extendedTerrain.foliageBlockerMask.resolutionX).toBe(
      extendedTerrain.sampleCountX
    );
    expect(extendedTerrain.foliageBlockerMask.resolutionZ).toBe(
      extendedTerrain.sampleCountZ
    );
    expect(extendedTerrain.foliageBlockerMask.values).toHaveLength(
      extendedTerrain.sampleCountX * extendedTerrain.sampleCountZ
    );
    expect(resizedMask?.values.every((value) => Number.isFinite(value))).toBe(
      true
    );
    expect(
      extendedTerrain.foliageBlockerMask.values.every((value) =>
        Number.isFinite(value)
      )
    ).toBe(true);
  });

  it("chooses deterministic sample counts for non-divisible footprint and cell-size edits", () => {
    const terrain = createTerrain({
      id: "terrain-cell-size-non-divisible",
      sampleCountX: 9,
      sampleCountZ: 9,
      cellSize: 1,
      heights: createIndexedHeights(9, 9)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 3
    });

    expect(resizedTerrain.cellSize).toBe(3);
    expect(resizedTerrain.sampleCountX).toBe(4);
    expect(resizedTerrain.sampleCountZ).toBe(4);
    expect(getTerrainFootprintWidth(resizedTerrain)).toBe(9);
    expect(getTerrainFootprintDepth(resizedTerrain)).toBe(9);
    expect(resizedTerrain.position).toEqual(terrain.position);
  });

  it("uses cardinal directions for non-divisible footprint and cell-size edits", () => {
    const terrain = createTerrain({
      id: "terrain-cell-size-non-divisible-west-south",
      sampleCountX: 9,
      sampleCountZ: 9,
      cellSize: 1,
      heights: createIndexedHeights(9, 9)
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: terrain.sampleCountX,
      sampleCountZ: terrain.sampleCountZ,
      cellSize: 3,
      resizeDirectionX: "west",
      resizeDirectionZ: "south"
    });

    expect(resizedTerrain.cellSize).toBe(3);
    expect(resizedTerrain.sampleCountX).toBe(4);
    expect(resizedTerrain.sampleCountZ).toBe(4);
    expect(getTerrainFootprintWidth(resizedTerrain)).toBe(9);
    expect(getTerrainFootprintDepth(resizedTerrain)).toBe(9);
    expect(resizedTerrain.position).toEqual({
      x: terrain.position.x - 1,
      y: terrain.position.y,
      z: terrain.position.z - 1
    });
  });
});

describe("terrain material layers", () => {
  it("adds a layer by expanding compact paint weights with zero influence", () => {
    const terrain = createTerrain({
      id: "terrain-add-layer",
      sampleCountX: 2,
      sampleCountZ: 2,
      paintWeights: [
        0.2,
        0.3,
        0.1,
        0.4,
        0.1,
        0,
        0,
        0.5,
        0,
        0.25,
        0.25,
        0.25
      ]
    });

    const nextTerrain = createTerrainWithAddedLayer(terrain, "road-material");
    const firstSampleOffset = getTerrainPaintWeightSampleOffset(
      nextTerrain,
      0,
      0
    );
    const secondSampleOffset = getTerrainPaintWeightSampleOffset(
      nextTerrain,
      1,
      0
    );

    expect(nextTerrain.layers).toHaveLength(5);
    expect(nextTerrain.layers[4]).toEqual({ materialId: "road-material" });
    expect(nextTerrain.paintWeights.slice(firstSampleOffset, firstSampleOffset + 4)).toEqual([
      0.2,
      0.3,
      0.1,
      0
    ]);
    expect(nextTerrain.paintWeights.slice(secondSampleOffset, secondSampleOffset + 4)).toEqual([
      0.4,
      0.1,
      0,
      0
    ]);
  });

  it("removes non-base layers by compacting explicit weights", () => {
    const terrain = createTerrainWithAddedLayer(
      createTerrain({
        id: "terrain-remove-layer",
        sampleCountX: 2,
        sampleCountZ: 2,
        paintWeights: [
          0.2,
          0.3,
          0.1,
          0.4,
          0.1,
          0,
          0,
          0.5,
          0,
          0.25,
          0.25,
          0.25
        ]
      }),
      "fifth-material"
    );

    const nextTerrain = createTerrainWithRemovedLayer(terrain, 2);

    expect(nextTerrain.layers).toHaveLength(4);
    expect(nextTerrain.paintWeights).toEqual([
      0.2,
      0.1,
      0,
      0.4,
      0,
      0,
      0,
      0,
      0,
      0.25,
      0.25,
      0
    ]);
  });
});

describe("terrain foliage blocker masks", () => {
  it("creates, clones, normalizes, and samples blocker mask values", () => {
    const terrain = createTerrain({
      id: "terrain-foliage-blocker-mask-sample",
      position: { x: 10, y: 0, z: 20 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 2,
      foliageBlockerMask: createTerrainFoliageBlockerMask({
        resolutionX: 2,
        resolutionZ: 2,
        values: [0, 1.2, -1, 0.5]
      })
    });
    const clonedTerrain = createTerrain(terrain);

    expect(terrain.foliageBlockerMask.values).toEqual([0, 1, 0, 0.5]);
    expect(clonedTerrain.foliageBlockerMask).toEqual(
      terrain.foliageBlockerMask
    );
    expect(clonedTerrain.foliageBlockerMask).not.toBe(
      terrain.foliageBlockerMask
    );
    expect(
      getTerrainFoliageBlockerMaskValueAtSample(
        terrain.foliageBlockerMask,
        1,
        1
      )
    ).toBe(0.5);
    expect(
      sampleTerrainFoliageBlockerMaskAtWorldPosition(terrain, 11, 21)
    ).toBeCloseTo(0.375);
    expect(
      sampleTerrainFoliageBlockerMaskAtWorldPosition(terrain, 99, 99)
    ).toBeNull();
  });
});

describe("terrain foliage masks", () => {
  it("creates, clones, normalizes, and samples foliage mask values", () => {
    const foliageLayerId = "foliage-layer-sample";
    const terrain = createTerrain({
      id: "terrain-foliage-mask-sample",
      position: { x: 10, y: 0, z: 20 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 2,
      foliageMasks: {
        [foliageLayerId]: createTerrainFoliageMask({
          layerId: foliageLayerId,
          resolutionX: 2,
          resolutionZ: 2,
          values: [0, 1.2, -1, 0.5]
        })
      }
    });
    const clonedTerrain = createTerrain(terrain);
    const mask = getTerrainFoliageMask(terrain, foliageLayerId);

    expect(mask).not.toBeNull();
    expect(mask?.values).toEqual([0, 1, 0, 0.5]);
    expect(clonedTerrain.foliageMasks[foliageLayerId]).toEqual(mask);
    expect(clonedTerrain.foliageMasks[foliageLayerId]).not.toBe(mask);
    expect(getTerrainFoliageMaskValueAtSample(mask!, 1, 1)).toBe(0.5);
    expect(
      sampleTerrainFoliageMaskAtWorldPosition(
        terrain,
        foliageLayerId,
        11,
        21
      )
    ).toBeCloseTo(0.375);
    expect(
      sampleTerrainFoliageMaskAtWorldPosition(
        terrain,
        "missing-layer",
        11,
        21
      )
    ).toBe(0);
    expect(
      sampleTerrainFoliageMaskAtWorldPosition(
        terrain,
        foliageLayerId,
        99,
        99
      )
    ).toBeNull();
  });
});

describe("terrain bounds cache", () => {
  it("updates cached bounds after in-place height patches", () => {
    const terrain = createTerrain({
      id: "terrain-bounds-cache-grow",
      position: { x: 0, y: 1, z: 0 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 1,
      heights: [0, 1, 2, 3]
    });

    expect(getTerrainBounds(terrain).max.y).toBe(4);

    terrain.heights[0] = -5;
    terrain.heights[1] = 6;
    updateTerrainBoundsCacheAfterHeightPatch(terrain, [
      { index: 0, before: 0, after: -5 },
      { index: 1, before: 1, after: 6 }
    ]);

    expect(getTerrainBounds(terrain)).toEqual({
      min: { x: 0, y: -4, z: 0 },
      max: { x: 1, y: 7, z: 1 }
    });
  });

  it("rescans cached bounds when the previous extremum is reduced", () => {
    const terrain = createTerrain({
      id: "terrain-bounds-cache-rescan",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 1,
      heights: [0, 1, 2, 3]
    });

    expect(getTerrainBounds(terrain).max.y).toBe(3);

    terrain.heights[3] = 0.5;
    updateTerrainBoundsCacheAfterHeightPatch(terrain, [
      { index: 3, before: 3, after: 0.5 }
    ]);

    expect(getTerrainBounds(terrain).max.y).toBe(2);
  });
});
