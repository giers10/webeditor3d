import { describe, expect, it } from "vitest";

import { createTerrain } from "../../src/document/terrains";
import {
  buildTerrainDerivedMeshData,
  buildTerrainLodMeshData,
  resolveTerrainLodLevelIndex
} from "../../src/geometry/terrain-mesh";

describe("terrain mesh generation", () => {
  it("chooses the forward diagonal when the opposite-corner height delta is smaller", () => {
    const terrain = createTerrain({
      sampleCountX: 2,
      sampleCountZ: 2,
      heights: [0, 3, 1, 0]
    });
    const derivedMesh = buildTerrainDerivedMeshData(terrain);

    expect(derivedMesh.cellTriangulation).toEqual([
      {
        cellX: 0,
        cellZ: 0,
        diagonal: "forward"
      }
    ]);
    expect(Array.from(derivedMesh.indices)).toEqual([0, 2, 3, 0, 3, 1]);
  });

  it("chooses the backward diagonal when that split better matches the local slope", () => {
    const terrain = createTerrain({
      sampleCountX: 2,
      sampleCountZ: 2,
      heights: [0, 0, 0, 3]
    });
    const derivedMesh = buildTerrainDerivedMeshData(terrain);

    expect(derivedMesh.cellTriangulation).toEqual([
      {
        cellX: 0,
        cellZ: 0,
        diagonal: "backward"
      }
    ]);
    expect(Array.from(derivedMesh.indices)).toEqual([0, 2, 1, 1, 2, 3]);
  });

  it("derives UVs from world XZ positions instead of triangle-local stretch", () => {
    const terrain = createTerrain({
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 2,
      position: {
        x: 10,
        y: 4,
        z: -6
      },
      heights: [0, 1, 2, 3]
    });
    const derivedMesh = buildTerrainDerivedMeshData(terrain);

    expect(Array.from(derivedMesh.uvs)).toEqual([10, -6, 12, -6, 10, -4, 12, -4]);
  });

  it("derives full per-vertex layer weights from the compact terrain paint data", () => {
    const terrain = createTerrain({
      sampleCountX: 2,
      sampleCountZ: 2,
      paintWeights: [
        0.2,
        0.3,
        0.1,
        0,
        0.5,
        0,
        0.1,
        0.1,
        0.1,
        0.25,
        0.25,
        0.25
      ]
    });

    const derivedMesh = buildTerrainDerivedMeshData(terrain);

    expect(Array.from(derivedMesh.layerWeights)).toEqual([
      expect.closeTo(0.4, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.5, 5),
      expect.closeTo(0, 5),
      expect.closeTo(0.5, 5),
      expect.closeTo(0, 5),
      expect.closeTo(0.7, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5)
    ]);
  });

  it("chunks terrain LoD data across non-multiple-of-64 terrain edges", () => {
    const terrain = createTerrain({
      sampleCountX: 130,
      sampleCountZ: 70
    });

    const lodMesh = buildTerrainLodMeshData(terrain);

    expect(lodMesh.chunks).toHaveLength(6);
    expect(lodMesh.chunks[0]).toMatchObject({
      chunkX: 0,
      chunkZ: 0,
      startSampleX: 0,
      startSampleZ: 0,
      endSampleX: 64,
      endSampleZ: 64
    });
    expect(lodMesh.chunks.at(-1)).toMatchObject({
      chunkX: 2,
      chunkZ: 1,
      startSampleX: 128,
      startSampleZ: 64,
      endSampleX: 129,
      endSampleZ: 69
    });
  });

  it("generates smaller terrain LoD levels as stride increases", () => {
    const terrain = createTerrain({
      sampleCountX: 65,
      sampleCountZ: 65
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;

    expect(chunk).toBeDefined();
    expect(chunk!.levels.map((level) => level.stride)).toEqual([
      1,
      2,
      4,
      8,
      16
    ]);

    const vertexCounts = chunk!.levels.map(
      (level) => level.positions.length / 3
    );

    for (let index = 1; index < vertexCounts.length; index += 1) {
      expect(vertexCounts[index]).toBeLessThan(vertexCounts[index - 1]!);
    }
  });

  it("keeps terrain LoD chunk bounds covering source heights", () => {
    const heights = new Array(17 * 17).fill(0);
    heights[8 * 17 + 8] = 12;
    heights[16 * 17 + 16] = -4;
    const terrain = createTerrain({
      sampleCountX: 17,
      sampleCountZ: 17,
      heights
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;

    expect(chunk!.localBounds.min.y).toBeLessThanOrEqual(-4);
    expect(chunk!.localBounds.max.y).toBeGreaterThanOrEqual(12);
  });

  it("keeps terrain LoD layer weights normalized for render blending", () => {
    const terrain = createTerrain({
      sampleCountX: 5,
      sampleCountZ: 5,
      paintWeights: Array.from({ length: 5 * 5 * 3 }, (_, index) =>
        index % 3 === 0 ? 0.2 : index % 3 === 1 ? 0.3 : 0.1
      )
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;
    const [level] = chunk!.levels;

    for (
      let offset = 0;
      offset < level!.layerWeights.length;
      offset += 4
    ) {
      const sum =
        level!.layerWeights[offset]! +
        level!.layerWeights[offset + 1]! +
        level!.layerWeights[offset + 2]! +
        level!.layerWeights[offset + 3]!;

      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("adds terrain LoD skirt vertices to hide hard-switch edge cracks", () => {
    const terrain = createTerrain({
      sampleCountX: 9,
      sampleCountZ: 9
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;
    const [level] = chunk!.levels;

    expect(level!.skirtVertexCount).toBeGreaterThan(0);
    expect(level!.positions.length / 3).toBeGreaterThan(9 * 9);
  });

  it("selects coarser terrain LoD levels as perspective distance increases", () => {
    const levelCount = 5;
    const chunkDiagonal = 100;
    const chunkWorldCenter = { x: 0, y: 0, z: 0 };

    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 150 },
        perspective: true
      })
    ).toBe(0);
    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 900 },
        perspective: true
      })
    ).toBe(3);
    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 2000 },
        perspective: true
      })
    ).toBe(4);
  });
});
