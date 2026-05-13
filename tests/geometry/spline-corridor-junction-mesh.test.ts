import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";
import {
  buildSplineCorridorJunctionFootprint,
  isSplineCorridorJunctionFootprintRoadMouthEdge,
  sampleSplineCorridorJunctionFootprintInfluence
} from "../../src/geometry/spline-corridor-junction-footprint";
import {
  buildSplineCorridorJunctionEdgeMeshData,
  buildSplineCorridorJunctionMeshGeometry,
  resolveSplineCorridorJunctionRoadEdgeSeams
} from "../../src/geometry/spline-corridor-junction-mesh";

function createRoadPath(
  id: string,
  points: Array<{ x: number; y?: number; z: number }>
) {
  return createScenePath({
    id,
    road: {
      enabled: true,
      width: 2,
      shoulderWidth: 1,
      heightOffset: 0.1
    },
    points: points.map((point, index) => ({
      id: `${id}-point-${index}`,
      position: {
        x: point.x,
        y: point.y ?? 0,
        z: point.z
      }
    }))
  });
}

describe("spline corridor junction mesh generation", () => {
  it("builds a connection-shaped footprint from clipped corridor boundaries", () => {
    const pathA = createRoadPath("path-junction-footprint-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-junction-footprint-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-footprint",
      center: { x: 5, y: 0, z: 0 },
      radius: 3,
      connections: [
        {
          pathId: pathA.id,
          progress: 0.5,
          clipDistance: 2
        },
        {
          pathId: pathB.id,
          progress: 0.5,
          clipDistance: 2
        }
      ]
    });

    const footprint = buildSplineCorridorJunctionFootprint({
      junction,
      paths: [pathA, pathB]
    });

    expect(footprint).not.toBeNull();
    expect(footprint?.points).toHaveLength(8);
    expect(footprint?.bounds).toEqual({
      minX: 3,
      maxX: 7,
      minZ: -2,
      maxZ: 2
    });
  });

  it("builds junction fill geometry from the connection footprint instead of a circle", () => {
    const pathA = createRoadPath("path-junction-mesh-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-junction-mesh-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-mesh",
      center: { x: 5, y: 0, z: 0 },
      radius: 3,
      connections: [
        {
          pathId: pathA.id,
          progress: 0.5,
          clipDistance: 2
        },
        {
          pathId: pathB.id,
          progress: 0.5,
          clipDistance: 2
        }
      ]
    });

    const geometry = buildSplineCorridorJunctionMeshGeometry({
      junction,
      paths: [pathA, pathB]
    });
    const positionAttribute = geometry?.getAttribute("position");

    expect(positionAttribute?.count).toBe(9);
    expect(Array.from(positionAttribute?.array ?? [])).toEqual(
      expect.arrayContaining([
        3,
        expect.closeTo(0.1, 5),
        -1,
        7,
        expect.closeTo(0.1, 5),
        1,
        4,
        expect.closeTo(0.1, 5),
        -2,
        6,
        expect.closeTo(0.1, 5),
        2
      ])
    );
  });

  it("builds junction perimeter edges with exact road-mouth seam rows", () => {
    const pathA = createScenePath({
      id: "path-junction-edge-a",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 1,
        heightOffset: 0.1,
        edges: {
          left: {
            enabled: true,
            collisionEnabled: false,
            kind: "curb",
            width: 0.4,
            height: 0.2,
            materialId: "curb-material"
          }
        }
      },
      points: [
        {
          id: "path-junction-edge-a-start",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-junction-edge-a-end",
          position: { x: 10, y: 0, z: 0 }
        }
      ]
    });
    const pathB = createRoadPath("path-junction-edge-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-edge",
      center: { x: 5, y: 0, z: 0 },
      radius: 3,
      edge: {
        enabled: true,
        collisionEnabled: false,
        kind: "curb",
        width: 0.4,
        height: 0.2,
        materialId: "curb-material"
      },
      connections: [
        {
          pathId: pathA.id,
          progress: 0.5,
          clipDistance: 2
        },
        {
          pathId: pathB.id,
          progress: 0.5,
          clipDistance: 2
        }
      ]
    });

    const meshData = buildSplineCorridorJunctionEdgeMeshData({
      junction,
      paths: [pathA, pathB],
      edge: junction.edge
    });
    const footprint = buildSplineCorridorJunctionFootprint({
      junction,
      paths: [pathA, pathB]
    });

    if (footprint === null) {
      throw new Error("Expected a junction footprint.");
    }

    const roadMouthSegmentCount = footprint.points.filter((point, index) =>
      isSplineCorridorJunctionFootprintRoadMouthEdge(
        point,
        footprint.points[(index + 1) % footprint.points.length]!
      )
    ).length;

    expect(junction.edge.materialId).toBe("curb-material");
    expect(roadMouthSegmentCount).toBe(4);
    expect(meshData?.footprintPointCount).toBe(8);
    expect(meshData?.profileVertexCount).toBe(4);
    expect(meshData?.positions).toHaveLength(8 * 4 * 3);
    expect(meshData?.indices).toHaveLength(4 * 3 * 6 + 8 * 2 * 3);
    const firstProfile = Array.from(meshData!.positions.slice(0, 12));
    const firstProfileWidth = Math.hypot(
      firstProfile[6]! - firstProfile[3]!,
      firstProfile[8]! - firstProfile[5]!
    );
    const profileRows = Array.from(
      { length: meshData!.positions.length / 12 },
      (_, index) => Array.from(meshData!.positions.slice(index * 12, index * 12 + 12))
    );

    expect(firstProfileWidth).toBeGreaterThan(0.4);
    expect(profileRows).toEqual(
      expect.arrayContaining([
        [
          3,
          expect.closeTo(0.1, 5),
          -1,
          3,
          expect.closeTo(0.3, 5),
          -1,
          expect.closeTo(2.8343145, 5),
          expect.closeTo(0.3, 5),
          expect.closeTo(-1.4, 5),
          expect.closeTo(2.8343145, 5),
          expect.closeTo(0.1, 5),
          expect.closeTo(-1.4, 5)
        ],
        [
          4,
          expect.closeTo(0.1, 5),
          -2,
          4,
          expect.closeTo(0.3, 5),
          -2,
          expect.closeTo(3.6, 5),
          expect.closeTo(0.3, 5),
          -2,
          expect.closeTo(3.6, 5),
          expect.closeTo(0.1, 5),
          -2
        ]
      ])
    );

    const seamsByPath = resolveSplineCorridorJunctionRoadEdgeSeams({
      junctions: [junction],
      paths: [pathA, pathB]
    });
    const pathASeams = seamsByPath.get(pathA.id) ?? [];

    expect(pathASeams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pathId: pathA.id,
          side: "left",
          distance: 3,
          outerOffset: {
            x: expect.closeTo(-0.1656854, 5),
            z: expect.closeTo(0.4, 5)
          }
        }),
        expect.objectContaining({
          pathId: pathA.id,
          side: "right",
          distance: 3,
          outerOffset: {
            x: expect.closeTo(-0.1656854, 5),
            z: expect.closeTo(-0.4, 5)
          }
        })
      ])
    );
  });

  it("samples full terrain influence inside the connection footprint and falloff outside it", () => {
    const pathA = createRoadPath("path-junction-influence-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-junction-influence-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-influence",
      center: { x: 5, y: 0, z: 0 },
      radius: 3,
      connections: [
        {
          pathId: pathA.id,
          progress: 0.5,
          clipDistance: 2
        },
        {
          pathId: pathB.id,
          progress: 0.5,
          clipDistance: 2
        }
      ]
    });
    const footprint = buildSplineCorridorJunctionFootprint({
      junction,
      paths: [pathA, pathB]
    });

    if (footprint === null) {
      throw new Error("Expected a junction footprint.");
    }

    expect(
      sampleSplineCorridorJunctionFootprintInfluence({
        footprint,
        x: 5,
        z: 0,
        falloffDistance: 1
      })
    ).toBe(1);
    expect(
      sampleSplineCorridorJunctionFootprintInfluence({
        footprint,
        x: 2.5,
        z: 0,
        falloffDistance: 1
      })
    ).toBeGreaterThan(0);
    expect(
      sampleSplineCorridorJunctionFootprintInfluence({
        footprint,
        x: 1,
        z: 0,
        falloffDistance: 1
      })
    ).toBe(0);
  });
});
