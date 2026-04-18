import { describe, expect, it } from "vitest";

import { createTerrain } from "../../src/document/terrains";
import { buildTerrainDerivedMeshData } from "../../src/geometry/terrain-mesh";

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
});
