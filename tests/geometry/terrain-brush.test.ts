import { describe, expect, it } from "vitest";

import { createDefaultTerrainBrushSettings } from "../../src/core/terrain-brush";
import {
  createTerrain,
  getTerrainFoliageMask,
  getTerrainSampleLayerWeights
} from "../../src/document/terrains";
import {
  applyTerrainBrushStampInPlace,
  applyTerrainBrushStamp,
  createTerrainBrushPatchFromTerrains,
  getTerrainBrushWeight,
  sampleTerrainHeightAtWorldPosition
} from "../../src/geometry/terrain-brush";

describe("terrain brush geometry", () => {
  it("samples terrain height across the regular XZ grid", () => {
    const terrain = createTerrain({
      id: "terrain-sample-height",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 2,
      heights: [0, 2, 4, 6]
    });

    expect(sampleTerrainHeightAtWorldPosition(terrain, 1, 1)).toBe(3);
  });

  it("raises and lowers height samples with radial falloff", () => {
    const terrain = createTerrain({
      id: "terrain-sculpt",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: new Array(9).fill(0)
    });
    const settings = {
      ...createDefaultTerrainBrushSettings(),
      radius: 1.2,
      strength: 0.5,
      falloff: 0.5
    };
    const raisedTerrain = applyTerrainBrushStamp({
      terrain,
      center: { x: 1, z: 1 },
      settings,
      tool: "raise"
    });
    const loweredTerrain = applyTerrainBrushStamp({
      terrain: raisedTerrain,
      center: { x: 1, z: 1 },
      settings,
      tool: "lower"
    });

    expect(raisedTerrain.heights[4]).toBeCloseTo(0.5);
    expect(raisedTerrain.heights[0]).toBe(0);
    expect(loweredTerrain.heights[4]).toBeCloseTo(0);
  });

  it("smooths sharp spikes toward neighboring heights", () => {
    const terrain = createTerrain({
      id: "terrain-smooth",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: [0, 0, 0, 0, 10, 0, 0, 0, 0]
    });

    const smoothedTerrain = applyTerrainBrushStamp({
      terrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 1.5,
        strength: 1,
        falloff: 0
      },
      tool: "smooth"
    });

    expect(smoothedTerrain.heights[4]).toBeLessThan(10);
    expect(smoothedTerrain.heights[4]).toBeCloseTo(10 / 9);
  });

  it("flattens toward the stroke-start reference height", () => {
    const terrain = createTerrain({
      id: "terrain-flatten",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: [0, 0, 0, 0, 4, 0, 0, 0, 0]
    });

    const flattenedTerrain = applyTerrainBrushStamp({
      terrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 1.2,
        strength: 0.5,
        falloff: 0
      },
      tool: "flatten",
      referenceHeight: 2
    });

    expect(flattenedTerrain.heights[4]).toBeCloseTo(3);
  });

  it("returns zero influence outside the brush radius", () => {
    expect(getTerrainBrushWeight(2, 1, 0.5)).toBe(0);
  });

  it("can stamp terrain in place and report dirty sample bounds", () => {
    const terrain = createTerrain({
      id: "terrain-stamp-in-place",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1,
      heights: new Array(25).fill(0)
    });
    const originalHeights = terrain.heights;
    const originalPaintWeights = terrain.paintWeights;

    const result = applyTerrainBrushStampInPlace({
      terrain,
      center: { x: 2, z: 2 },
      settings: {
        radius: 0.6,
        strength: 0.5,
        falloff: 0
      },
      tool: "raise"
    });

    expect(result.changed).toBe(true);
    expect(result.dirtyBounds).toEqual({
      minSampleX: 2,
      maxSampleX: 2,
      minSampleZ: 2,
      maxSampleZ: 2
    });
    expect(result.heightSampleIndices).toEqual([12]);
    expect(result.paintWeightIndices).toEqual([]);
    expect(result.foliageMaskValueIndices).toEqual([]);
    expect(terrain.heights).toBe(originalHeights);
    expect(terrain.paintWeights).toBe(originalPaintWeights);
    expect(terrain.heights[2 + 2 * 5]).toBeCloseTo(0.5);
  });

  it("creates sparse terrain brush patches from exact changed indices", () => {
    const before = createTerrain({
      id: "terrain-sparse-patch",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 4,
      sampleCountZ: 4,
      cellSize: 1,
      heights: new Array(16).fill(0)
    });
    const after = createTerrain(before);

    after.heights[5] = 2;
    after.heights[15] = 9;
    after.paintWeights[45] = 0.4;

    const patch = createTerrainBrushPatchFromTerrains({
      before,
      after,
      heightSampleIndices: [5, 15, 5],
      paintWeightIndices: [45]
    });

    expect(patch.heightSamples).toEqual([
      {
        index: 5,
        before: 0,
        after: 2
      },
      {
        index: 15,
        before: 0,
        after: 9
      }
    ]);
    expect(patch.paintWeights).toEqual([
      {
        index: 45,
        before: 0,
        after: 0.4
      }
    ]);
    expect(patch.foliageMaskValues).toEqual([]);
  });

  it("paints and erases foliage mask density for a foliage layer", () => {
    const foliageLayerId = "foliage-layer-brush";
    const terrain = createTerrain({
      id: "terrain-foliage-brush",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1
    });

    const paintedTerrain = applyTerrainBrushStamp({
      terrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 0.6,
        strength: 0.5,
        falloff: 0
      },
      tool: "foliagePaint",
      foliageLayerId
    });
    const paintedMask = getTerrainFoliageMask(paintedTerrain, foliageLayerId);

    expect(paintedMask?.values[4]).toBeCloseTo(0.5);

    const erasedTerrain = applyTerrainBrushStamp({
      terrain: paintedTerrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 0.6,
        strength: 0.5,
        falloff: 0
      },
      tool: "foliageErase",
      foliageLayerId
    });
    const erasedMask = getTerrainFoliageMask(erasedTerrain, foliageLayerId);

    expect(erasedMask?.values[4]).toBeCloseTo(0.25);

    const patch = createTerrainBrushPatchFromTerrains({
      before: terrain,
      after: paintedTerrain,
      heightSampleIndices: [],
      paintWeightIndices: [],
      foliageMaskValueIndices: [{ layerId: foliageLayerId, index: 4 }]
    });

    expect(patch.foliageMaskValues).toEqual([
      {
        layerId: foliageLayerId,
        index: 4,
        before: 0,
        after: 0.5
      }
    ]);
  });

  it("paints terrain layer weights toward the active layer while preserving a normalized blend", () => {
    const terrain = createTerrain({
      id: "terrain-paint",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1
    });

    const paintedTerrain = applyTerrainBrushStamp({
      terrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 1.2,
        strength: 0.5,
        falloff: 0
      },
      tool: "paint",
      layerIndex: 2
    });

    const paintedWeights = getTerrainSampleLayerWeights(paintedTerrain, 1, 1);

    expect(paintedWeights[2]).toBeCloseTo(0.5);
    expect(
      paintedWeights[0] +
        paintedWeights[1] +
        paintedWeights[2] +
        paintedWeights[3]
    ).toBeCloseTo(1);

    const repaintedBaseTerrain = applyTerrainBrushStamp({
      terrain: paintedTerrain,
      center: { x: 1, z: 1 },
      settings: {
        radius: 1.2,
        strength: 0.5,
        falloff: 0
      },
      tool: "paint",
      layerIndex: 0
    });

    const baseWeights = getTerrainSampleLayerWeights(repaintedBaseTerrain, 1, 1);
    expect(baseWeights[0]).toBeGreaterThan(paintedWeights[0]);
    expect(baseWeights[2]).toBeLessThan(paintedWeights[2]);
  });
});
