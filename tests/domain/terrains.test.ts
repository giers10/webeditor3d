import { describe, expect, it } from "vitest";

import {
  createTerrainFoliageBlockerMask,
  createTerrainFoliageMask,
  getTerrainBounds,
  getTerrainFoliageBlockerMaskValueAtSample,
  getTerrainFoliageMask,
  getTerrainFoliageMaskValueAtSample,
  getTerrainPaintWeightSampleOffset,
  sampleTerrainFoliageBlockerMaskAtWorldPosition,
  sampleTerrainFoliageMaskAtWorldPosition,
  updateTerrainBoundsCacheAfterHeightPatch,
  resizeTerrainGrid,
  createTerrain
} from "../../src/document/terrains";

describe("terrain grid resizing", () => {
  it("keeps terrain centered while bilinearly resampling heights and paint weights", () => {
    const foliageLayerId = "foliage-layer-resample";
    const terrain = createTerrain({
      id: "terrain-resample-main",
      position: {
        x: 0,
        y: 1,
        z: 0
      },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 1,
      heights: [0, 2, 4, 6],
      paintWeights: [
        0,
        0,
        0,
        0.6,
        0,
        0,
        0,
        0.5,
        0,
        0,
        0,
        0.25
      ],
      foliageMasks: {
        [foliageLayerId]: createTerrainFoliageMask({
          layerId: foliageLayerId,
          resolutionX: 2,
          resolutionZ: 2,
          values: [0, 1, 0, 0.5]
        })
      },
      foliageBlockerMask: createTerrainFoliageBlockerMask({
        resolutionX: 2,
        resolutionZ: 2,
        values: [0, 0.25, 0.5, 1]
      })
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1
    });
    const centerOffset = getTerrainPaintWeightSampleOffset(resizedTerrain, 1, 1);
    const resizedMask = getTerrainFoliageMask(resizedTerrain, foliageLayerId);

    expect(resizedTerrain.position).toEqual({
      x: -0.5,
      y: 1,
      z: -0.5
    });
    expect(resizedTerrain.sampleCountX).toBe(3);
    expect(resizedTerrain.sampleCountZ).toBe(3);
    expect(resizedTerrain.heights[4]).toBeCloseTo(3);
    expect(resizedTerrain.paintWeights[centerOffset]).toBeCloseTo(0.15);
    expect(resizedTerrain.paintWeights[centerOffset + 1]).toBeCloseTo(0.125);
    expect(resizedTerrain.paintWeights[centerOffset + 2]).toBeCloseTo(0.0625);
    expect(resizedMask?.resolutionX).toBe(3);
    expect(resizedMask?.resolutionZ).toBe(3);
    expect(resizedMask?.values[4]).toBeCloseTo(0.375);
    expect(resizedTerrain.foliageBlockerMask.resolutionX).toBe(3);
    expect(resizedTerrain.foliageBlockerMask.resolutionZ).toBe(3);
    expect(resizedTerrain.foliageBlockerMask.values[4]).toBeCloseTo(0.4375);
    expect(terrain.position).toEqual({
      x: 0,
      y: 1,
      z: 0
    });
    expect(terrain.heights).toEqual([0, 2, 4, 6]);
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
