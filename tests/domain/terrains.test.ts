import { describe, expect, it } from "vitest";

import {
  getTerrainBounds,
  getTerrainPaintWeightSampleOffset,
  updateTerrainBoundsCacheAfterHeightPatch,
  resizeTerrainGrid,
  createTerrain
} from "../../src/document/terrains";

describe("terrain grid resizing", () => {
  it("keeps terrain centered while bilinearly resampling heights and paint weights", () => {
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
      ]
    });

    const resizedTerrain = resizeTerrainGrid(terrain, {
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1
    });
    const centerOffset = getTerrainPaintWeightSampleOffset(resizedTerrain, 1, 1);

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
    expect(terrain.position).toEqual({
      x: 0,
      y: 1,
      z: 0
    });
    expect(terrain.heights).toEqual([0, 2, 4, 6]);
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
