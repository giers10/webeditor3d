import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createTerrain } from "../../src/document/terrains";
import { buildSplineRoadMeshData } from "../../src/geometry/spline-road-mesh";

describe("spline road mesh generation", () => {
  it("builds a continuous road strip with arc-length UVs", () => {
    const path = createScenePath({
      id: "path-road-mesh-straight",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 1,
        falloff: 0.5,
        heightOffset: 0.1,
        terrainConform: false,
        materialId: null
      },
      points: [
        {
          id: "point-a",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "point-b",
          position: { x: 4, y: 0, z: 0 }
        }
      ]
    });

    const meshData = buildSplineRoadMeshData({ path });

    expect(meshData).not.toBeNull();
    expect(meshData?.stationCount).toBe(2);
    expect(meshData?.totalLength).toBe(4);
    expect(Array.from(meshData!.positions)).toEqual([
      0,
      expect.closeTo(0.1, 5),
      1,
      0,
      expect.closeTo(0.1, 5),
      -1,
      4,
      expect.closeTo(0.1, 5),
      1,
      4,
      expect.closeTo(0.1, 5),
      -1
    ]);
    expect(Array.from(meshData!.uvs)).toEqual([0, 0, 1, 0, 0, 4, 1, 4]);
    expect(Array.from(meshData!.indices)).toEqual([0, 1, 2, 2, 1, 3]);
  });

  it("conforms road edge vertices to terrain when enabled", () => {
    const terrain = createTerrain({
      id: "terrain-road-mesh-conform",
      position: { x: 0, y: 1, z: 0 },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: [
        0,
        0,
        0,
        1,
        1,
        1,
        2,
        2,
        2
      ]
    });
    const path = createScenePath({
      id: "path-road-mesh-conform",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 0,
        falloff: 0,
        heightOffset: 0.25,
        terrainConform: true,
        materialId: null
      },
      points: [
        {
          id: "point-a",
          position: { x: 0, y: 10, z: 1 }
        },
        {
          id: "point-b",
          position: { x: 2, y: 10, z: 1 }
        }
      ]
    });

    const meshData = buildSplineRoadMeshData({
      path,
      terrains: [terrain]
    });

    expect(meshData).not.toBeNull();
    expect(meshData!.positions[1]).toBe(3.25);
    expect(meshData!.positions[4]).toBe(1.25);
    expect(meshData!.positions[7]).toBe(3.25);
    expect(meshData!.positions[10]).toBe(1.25);
  });
});
