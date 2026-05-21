import { describe, expect, it } from "vitest";

import {
  createTerrain,
  getTerrainHeightAtSample,
  type Terrain
} from "../../src/document/terrains";
import {
  buildTerrainDerivedMeshData,
  buildTerrainLodChunkMeshData,
  buildTerrainLodMeshData,
  type TerrainLodLevelMeshData,
  resolveTerrainLodLevelIndex,
  resolveTerrainLodLevelIndexWithHysteresis
} from "../../src/geometry/terrain-mesh";

function createJaggedTerrainHeights(
  sampleCountX: number,
  sampleCountZ: number
) {
  return Array.from({ length: sampleCountX * sampleCountZ }, (_, index) => {
    const sampleX = index % sampleCountX;
    const sampleZ = Math.floor(index / sampleCountX);

    return (
      ((sampleX * 17 + sampleZ * 31) % 13) -
      6 +
      (sampleX % 2 === 0 ? 0.35 : -0.2) +
      (sampleZ % 3 === 0 ? 0.5 : -0.15)
    );
  });
}

function collectTopEdgeKeys(options: {
  terrain: Terrain;
  level: TerrainLodLevelMeshData;
  axis: "x" | "z";
  sampleCoordinate: number;
}): string[] {
  const keys = new Set<string>();
  const coordinateOffset = options.axis === "x" ? 0 : 2;
  const varyingOffset = options.axis === "x" ? 2 : 0;
  const epsilon = 1e-5;

  for (
    let positionOffset = 0;
    positionOffset < options.level.positions.length;
    positionOffset += 3
  ) {
    const sampleCoordinate =
      options.level.positions[positionOffset + coordinateOffset]! /
      options.terrain.cellSize;

    if (Math.abs(sampleCoordinate - options.sampleCoordinate) > epsilon) {
      continue;
    }

    const varyingSample =
      options.level.positions[positionOffset + varyingOffset]! /
      options.terrain.cellSize;
    const roundedVaryingSample = Math.round(varyingSample);

    if (Math.abs(varyingSample - roundedVaryingSample) > epsilon) {
      continue;
    }

    const sampleX =
      options.axis === "x" ? options.sampleCoordinate : roundedVaryingSample;
    const sampleZ =
      options.axis === "x" ? roundedVaryingSample : options.sampleCoordinate;
    const expectedHeight = getTerrainHeightAtSample(
      options.terrain,
      sampleX,
      sampleZ
    );
    const height = options.level.positions[positionOffset + 1]!;

    if (Math.abs(height - expectedHeight) > epsilon) {
      continue;
    }

    keys.add(`${roundedVaryingSample}:${height.toFixed(6)}`);
  }

  return [...keys].sort(
    (left, right) => Number(left.split(":")[0]) - Number(right.split(":")[0])
  );
}

function collectLoweredEdgeVertexCount(options: {
  terrain: Terrain;
  level: TerrainLodLevelMeshData;
  axis: "x" | "z";
  sampleCoordinate: number;
}): number {
  const coordinateOffset = options.axis === "x" ? 0 : 2;
  const varyingOffset = options.axis === "x" ? 2 : 0;
  const epsilon = 1e-5;
  let count = 0;

  for (
    let positionOffset = 0;
    positionOffset < options.level.positions.length;
    positionOffset += 3
  ) {
    const sampleCoordinate =
      options.level.positions[positionOffset + coordinateOffset]! /
      options.terrain.cellSize;

    if (Math.abs(sampleCoordinate - options.sampleCoordinate) > epsilon) {
      continue;
    }

    const varyingSample =
      options.level.positions[positionOffset + varyingOffset]! /
      options.terrain.cellSize;
    const roundedVaryingSample = Math.round(varyingSample);
    const maxVaryingSample =
      options.axis === "x"
        ? options.terrain.sampleCountZ - 1
        : options.terrain.sampleCountX - 1;

    if (Math.abs(varyingSample - roundedVaryingSample) > epsilon) {
      continue;
    }

    if (
      roundedVaryingSample === 0 ||
      roundedVaryingSample === maxVaryingSample
    ) {
      continue;
    }

    const sampleX =
      options.axis === "x" ? options.sampleCoordinate : roundedVaryingSample;
    const sampleZ =
      options.axis === "x" ? roundedVaryingSample : options.sampleCoordinate;
    const expectedHeight = getTerrainHeightAtSample(
      options.terrain,
      sampleX,
      sampleZ
    );
    const height = options.level.positions[positionOffset + 1]!;

    if (height < expectedHeight - epsilon) {
      count += 1;
    }
  }

  return count;
}

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

    expect(Array.from(derivedMesh.uvs)).toEqual([
      10, -6, 12, -6, 10, -4, 12, -4
    ]);
  });

  it("derives full per-vertex layer weights from the compact terrain paint data", () => {
    const terrain = createTerrain({
      sampleCountX: 2,
      sampleCountZ: 2,
      paintWeights: [0.2, 0.3, 0.1, 0, 0.5, 0, 0.1, 0.1, 0.1, 0.25, 0.25, 0.25]
    });

    const derivedMesh = buildTerrainDerivedMeshData(terrain);

    expect(Array.from(derivedMesh.layerWeights)).toEqual([
      expect.closeTo(0.4, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
      expect.closeTo(0.1, 5),
      0,
      0,
      0,
      0,
      expect.closeTo(0.5, 5),
      expect.closeTo(0, 5),
      expect.closeTo(0.5, 5),
      expect.closeTo(0, 5),
      0,
      0,
      0,
      0,
      expect.closeTo(0.7, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.1, 5),
      expect.closeTo(0.1, 5),
      0,
      0,
      0,
      0,
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(0.25, 5),
      0,
      0,
      0,
      0
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

  it("can rebuild one terrain LoD chunk from its starting sample", () => {
    const terrain = createTerrain({
      sampleCountX: 130,
      sampleCountZ: 70
    });

    const chunk = buildTerrainLodChunkMeshData(terrain, 64, 0);

    expect(chunk).toMatchObject({
      chunkX: 1,
      chunkZ: 0,
      startSampleX: 64,
      startSampleZ: 0,
      endSampleX: 128,
      endSampleZ: 64
    });
    expect(chunk?.levels.length).toBeGreaterThan(1);
  });

  it("generates smaller terrain LoD levels as stride increases", () => {
    const terrain = createTerrain({
      sampleCountX: 65,
      sampleCountZ: 65
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;

    expect(chunk).toBeDefined();
    expect(chunk!.levels.map((level) => level.stride)).toEqual([
      1, 2, 4, 8, 16
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

    for (let offset = 0; offset < level!.layerWeights.length; offset += 8) {
      const sum =
        level!.layerWeights[offset]! +
        level!.layerWeights[offset + 1]! +
        level!.layerWeights[offset + 2]! +
        level!.layerWeights[offset + 3]! +
        level!.layerWeights[offset + 4]! +
        level!.layerWeights[offset + 5]! +
        level!.layerWeights[offset + 6]! +
        level!.layerWeights[offset + 7]!;

      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("adds terrain LoD skirt vertices on terrain perimeter edges", () => {
    const terrain = createTerrain({
      sampleCountX: 9,
      sampleCountZ: 9
    });

    const [chunk] = buildTerrainLodMeshData(terrain).chunks;
    const [level] = chunk!.levels;

    expect(level!.skirtVertexCount).toBeGreaterThan(0);
    expect(level!.positions.length / 3).toBeGreaterThan(9 * 9);
  });

  it("keeps shared terrain LoD chunk borders at full source resolution for every level", () => {
    const terrain = createTerrain({
      sampleCountX: 129,
      sampleCountZ: 129,
      heights: createJaggedTerrainHeights(129, 129)
    });
    const lodMesh = buildTerrainLodMeshData(terrain);
    const westChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 0 && chunk.chunkZ === 0
    );
    const eastChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 1 && chunk.chunkZ === 0
    );
    const southChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 0 && chunk.chunkZ === 0
    );
    const northChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 0 && chunk.chunkZ === 1
    );

    expect(westChunk).toBeDefined();
    expect(eastChunk).toBeDefined();
    expect(southChunk).toBeDefined();
    expect(northChunk).toBeDefined();

    const expectedVerticalEdge = Array.from({ length: 65 }, (_, sampleZ) => {
      const height = getTerrainHeightAtSample(terrain, 64, sampleZ);

      return `${sampleZ}:${height.toFixed(6)}`;
    });
    const expectedHorizontalEdge = Array.from({ length: 65 }, (_, sampleX) => {
      const height = getTerrainHeightAtSample(terrain, sampleX, 64);

      return `${sampleX}:${height.toFixed(6)}`;
    });

    for (const level of westChunk!.levels) {
      expect(
        collectTopEdgeKeys({
          terrain,
          level,
          axis: "x",
          sampleCoordinate: 64
        })
      ).toEqual(expectedVerticalEdge);
    }

    for (const level of eastChunk!.levels) {
      expect(
        collectTopEdgeKeys({
          terrain,
          level,
          axis: "x",
          sampleCoordinate: 64
        })
      ).toEqual(expectedVerticalEdge);
    }

    for (const level of southChunk!.levels) {
      expect(
        collectTopEdgeKeys({
          terrain,
          level,
          axis: "z",
          sampleCoordinate: 64
        })
      ).toEqual(expectedHorizontalEdge);
    }

    for (const level of northChunk!.levels) {
      expect(
        collectTopEdgeKeys({
          terrain,
          level,
          axis: "z",
          sampleCoordinate: 64
        })
      ).toEqual(expectedHorizontalEdge);
    }
  });

  it("does not add vertical terrain LoD skirts on shared chunk borders", () => {
    const terrain = createTerrain({
      sampleCountX: 129,
      sampleCountZ: 65,
      heights: createJaggedTerrainHeights(129, 65)
    });
    const lodMesh = buildTerrainLodMeshData(terrain);
    const westChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 0 && chunk.chunkZ === 0
    );
    const eastChunk = lodMesh.chunks.find(
      (chunk) => chunk.chunkX === 1 && chunk.chunkZ === 0
    );

    expect(westChunk).toBeDefined();
    expect(eastChunk).toBeDefined();

    for (const level of [...westChunk!.levels, ...eastChunk!.levels]) {
      expect(
        collectLoweredEdgeVertexCount({
          terrain,
          level,
          axis: "x",
          sampleCoordinate: 64
        })
      ).toBe(0);
    }
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
        cameraPosition: { x: 0, y: 0, z: 50 },
        perspective: true
      })
    ).toBe(0);
    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 120 },
        perspective: true
      })
    ).toBe(1);
    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 250 },
        perspective: true
      })
    ).toBe(2);
    expect(
      resolveTerrainLodLevelIndex({
        levelCount,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 500 },
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

  it("keeps terrain LoD stable near distance thresholds", () => {
    const levelCount = 5;
    const chunkDiagonal = 100;
    const chunkWorldCenter = { x: 0, y: 0, z: 0 };

    expect(
      resolveTerrainLodLevelIndexWithHysteresis({
        levelCount,
        activeLevelIndex: 0,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 80 },
        perspective: true
      })
    ).toBe(0);
    expect(
      resolveTerrainLodLevelIndexWithHysteresis({
        levelCount,
        activeLevelIndex: 0,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 90 },
        perspective: true
      })
    ).toBe(1);
    expect(
      resolveTerrainLodLevelIndexWithHysteresis({
        levelCount,
        activeLevelIndex: 1,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 132 },
        perspective: true
      })
    ).toBe(1);
    expect(
      resolveTerrainLodLevelIndexWithHysteresis({
        levelCount,
        activeLevelIndex: 1,
        chunkDiagonal,
        chunkWorldCenter,
        cameraPosition: { x: 0, y: 0, z: 60 },
        perspective: true
      })
    ).toBe(0);
  });
});
