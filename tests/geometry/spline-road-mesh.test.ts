import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createTerrain } from "../../src/document/terrains";
import {
  buildSplineRoadEdgeMeshData,
  buildSplineRoadMeshData
} from "../../src/geometry/spline-road-mesh";

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

  it("splits road strips around accepted junction clip intervals", () => {
    const path = createScenePath({
      id: "path-road-mesh-clipped",
      road: {
        enabled: true,
        width: 2
      },
      points: [
        {
          id: "path-road-mesh-clipped-a",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-road-mesh-clipped-b",
          position: { x: 10, y: 0, z: 0 }
        }
      ]
    });

    const mesh = buildSplineRoadMeshData({
      path,
      clipIntervals: [
        {
          junctionId: "junction-road-mesh-clipped",
          startDistance: 4,
          endDistance: 6
        }
      ]
    });

    expect(mesh?.stationCount).toBe(4);
    expect(Array.from(mesh?.indices ?? [])).toHaveLength(12);
    expect(Array.from(mesh?.positions ?? [])).toEqual(
      expect.arrayContaining([4, 6])
    );
  });

  it("clips and caps road edge meshes around junction intervals", () => {
    const path = createScenePath({
      id: "path-road-edge-clipped",
      road: {
        enabled: true,
        width: 2,
        edges: {
          left: {
            enabled: true,
            collisionEnabled: false,
            kind: "curb",
            width: 0.35,
            height: 0.12,
            materialId: null
          }
        }
      },
      points: [
        {
          id: "path-road-edge-clipped-a",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-road-edge-clipped-b",
          position: { x: 10, y: 0, z: 0 }
        }
      ]
    });

    const mesh = buildSplineRoadEdgeMeshData({
      path,
      side: "left",
      clipIntervals: [
        {
          junctionId: "junction-road-edge-clipped",
          startDistance: 4,
          endDistance: 6
        }
      ]
    });

    expect(mesh?.stationCount).toBe(4);
    expect(Array.from(mesh?.indices ?? []).length).toBeGreaterThan(24);
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

  it("builds raised curb edge profile meshes per side", () => {
    const path = createScenePath({
      id: "path-road-edge-curb",
      road: {
        enabled: true,
        width: 2,
        heightOffset: 0.05,
        terrainConform: false,
        edges: {
          left: {
            enabled: true,
            collisionEnabled: false,
            kind: "curb",
            width: 0.4,
            height: 0.2,
            materialId: null
          }
        }
      },
      points: [
        {
          id: "point-a",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "point-b",
          position: { x: 2, y: 0, z: 0 }
        }
      ]
    });

    const meshData = buildSplineRoadEdgeMeshData({
      path,
      side: "left"
    });

    expect(meshData).not.toBeNull();
    expect(meshData?.stationCount).toBe(2);
    expect(Array.from(meshData!.positions.slice(0, 12))).toEqual([
      0,
      expect.closeTo(0.05, 5),
      1,
      0,
      expect.closeTo(0.25, 5),
      1,
      0,
      expect.closeTo(0.25, 5),
      expect.closeTo(1.4, 5),
      0,
      expect.closeTo(0.05, 5),
      expect.closeTo(1.4, 5)
    ]);
    expect(Array.from(meshData!.indices)).toEqual([
      0,
      1,
      4,
      4,
      1,
      5,
      1,
      2,
      5,
      5,
      2,
      6,
      2,
      3,
      6,
      6,
      3,
      7,
      0,
      2,
      1,
      4,
      5,
      6,
      0,
      3,
      2,
      4,
      6,
      7
    ]);
  });

  it("builds bank and ditch edge profiles as capped triangular cross-sections", () => {
    const createPathWithEdgeKind = (kind: "bank" | "ditch") =>
      createScenePath({
        id: `path-road-edge-${kind}`,
        road: {
          enabled: true,
          width: 2,
          heightOffset: 0.05,
          terrainConform: false,
          edges: {
            left: {
              enabled: true,
              collisionEnabled: false,
              kind,
              width: 0.6,
              height: 0.3,
              materialId: null
            }
          }
        },
        points: [
          {
            id: "point-a",
            position: { x: 0, y: 0, z: 0 }
          },
          {
            id: "point-b",
            position: { x: 2, y: 0, z: 0 }
          }
        ]
      });
    const bankMeshData = buildSplineRoadEdgeMeshData({
      path: createPathWithEdgeKind("bank"),
      side: "left"
    });
    const ditchMeshData = buildSplineRoadEdgeMeshData({
      path: createPathWithEdgeKind("ditch"),
      side: "left"
    });

    expect(bankMeshData).not.toBeNull();
    expect(ditchMeshData).not.toBeNull();
    expect(bankMeshData!.positions).toHaveLength(18);
    expect(ditchMeshData!.positions).toHaveLength(18);
    expect(bankMeshData!.indices).toHaveLength(18);
    expect(ditchMeshData!.indices).toHaveLength(18);
    expect(Array.from(bankMeshData!.positions.slice(0, 9))).toEqual([
      0,
      expect.closeTo(0.05, 5),
      1,
      0,
      expect.closeTo(0.35, 5),
      expect.closeTo(1.6, 5),
      0,
      expect.closeTo(0.05, 5),
      expect.closeTo(1.6, 5)
    ]);
    expect(Array.from(ditchMeshData!.positions.slice(0, 9))).toEqual([
      0,
      expect.closeTo(0.05, 5),
      1,
      0,
      expect.closeTo(-0.25, 5),
      expect.closeTo(1.3, 5),
      0,
      expect.closeTo(0.05, 5),
      expect.closeTo(1.6, 5)
    ]);
  });
});
