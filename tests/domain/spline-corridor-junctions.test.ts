import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";
import {
  createSplineCorridorJunctionFromCandidate,
  detectSplineCorridorJunctionCandidates,
  reattachSplineCorridorJunctionsToPaths,
  resolveSplineCorridorJunctionClipIntervals
} from "../../src/spline-corridor/spline-corridor-junctions";

function createRoadPath(
  id: string,
  points: Array<{ x: number; y?: number; z: number }>
) {
  return createScenePath({
    id,
    road: {
      enabled: true,
      width: 2,
      shoulderWidth: 1
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

describe("spline corridor junctions", () => {
  it("detects crossing road candidates without shared control points", () => {
    const pathA = createRoadPath("path-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);

    const candidates = detectSplineCorridorJunctionCandidates({
      paths: [pathA, pathB]
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.center).toMatchObject({ x: 5, y: 0, z: 0 });
    expect(candidates[0]?.connections.map((connection) => connection.pathId)).toEqual([
      "path-a",
      "path-b"
    ]);
  });

  it("inherits a candidate junction edge profile from connected road edges", () => {
    const pathA = createScenePath({
      id: "path-edge-candidate-a",
      road: {
        enabled: true,
        edges: {
          left: {
            enabled: true,
            collisionEnabled: true,
            kind: "bank",
            width: 0.8,
            height: 0.3,
            materialId: "edge-material"
          }
        }
      },
      points: [
        {
          id: "path-edge-candidate-a-start",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-edge-candidate-a-end",
          position: { x: 10, y: 0, z: 0 }
        }
      ]
    });
    const pathB = createRoadPath("path-edge-candidate-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const [candidate] = detectSplineCorridorJunctionCandidates({
      paths: [pathA, pathB]
    });

    if (candidate === undefined) {
      throw new Error("Expected a candidate.");
    }

    const junction = createSplineCorridorJunctionFromCandidate(candidate);

    expect(candidate.edge).toMatchObject({
      enabled: true,
      collisionEnabled: true,
      kind: "bank",
      width: 0.8,
      height: 0.3,
      materialId: "edge-material"
    });
    expect(junction.edge).toEqual(candidate.edge);
  });

  it("detects self-intersections on non-adjacent spline segments", () => {
    const path = createRoadPath("path-self", [
      { x: 0, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
      { x: 10, z: 0 }
    ]);

    const candidates = detectSplineCorridorJunctionCandidates({
      paths: [path]
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pathId: "path-self" }),
        expect.objectContaining({ pathId: "path-self" })
      ])
    );
  });

  it("rejects crossings with a large vertical gap", () => {
    const lower = createRoadPath("path-lower", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const upper = createRoadPath("path-upper", [
      { x: 5, y: 4, z: -5 },
      { x: 5, y: 4, z: 5 }
    ]);

    expect(
      detectSplineCorridorJunctionCandidates({ paths: [lower, upper] })
    ).toHaveLength(0);
  });

  it("detects near endpoint joins", () => {
    const pathA = createRoadPath("path-end-a", [
      { x: 0, z: 0 },
      { x: 5, z: 0 }
    ]);
    const pathB = createRoadPath("path-end-b", [
      { x: 5.2, z: 0 },
      { x: 9, z: 0 }
    ]);

    const candidates = detectSplineCorridorJunctionCandidates({
      paths: [pathA, pathB]
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.center.x).toBeCloseTo(5.1);
  });

  it("dedupes candidates covered by persisted junctions", () => {
    const pathA = createRoadPath("path-existing-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-existing-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const [candidate] = detectSplineCorridorJunctionCandidates({
      paths: [pathA, pathB]
    });

    if (candidate === undefined) {
      throw new Error("Expected candidate.");
    }

    const junction = createSplineCorridorJunctionFromCandidate(candidate);

    expect(
      detectSplineCorridorJunctionCandidates({
        paths: [pathA, pathB],
        junctions: {
          [junction.id]: junction
        }
      })
    ).toHaveLength(0);
  });

  it("resolves clip intervals from accepted junctions", () => {
    const path = createRoadPath("path-clip", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-clip",
      center: { x: 5, y: 0, z: 0 },
      radius: 1.5,
      connections: [
        {
          pathId: path.id,
          progress: 0.5,
          clipDistance: 2
        },
        {
          pathId: path.id,
          progress: 0.8,
          clipDistance: 1
        }
      ]
    });

    const intervals = resolveSplineCorridorJunctionClipIntervals({
      paths: [path],
      junctions: [junction]
    }).get(path.id);

    expect(intervals).toEqual([
      expect.objectContaining({
        junctionId: "junction-clip",
        startDistance: 3,
        endDistance: 9
      })
    ]);
  });

  it("reattaches persisted junctions to moved crossing paths", () => {
    const pathA = createRoadPath("path-reattach-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-reattach-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const movedPathA = createRoadPath("path-reattach-a", [
      { x: 0, z: 2 },
      { x: 10, z: 2 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-reattach",
      center: { x: 5, y: 0, z: 0 },
      connections: [
        { id: "connection-a", pathId: pathA.id, progress: 0.5, clipDistance: 2 },
        { id: "connection-b", pathId: pathB.id, progress: 0.5, clipDistance: 2 }
      ]
    });

    const nextJunctions = reattachSplineCorridorJunctionsToPaths({
      paths: [movedPathA, pathB],
      junctions: {
        [junction.id]: junction
      },
      changedPathIds: [pathA.id]
    });
    const nextJunction = nextJunctions[junction.id];
    const movedPathConnection = nextJunction?.connections.find(
      (connection) => connection.pathId === movedPathA.id
    );
    const stationaryPathConnection = nextJunction?.connections.find(
      (connection) => connection.pathId === pathB.id
    );

    expect(nextJunction?.center).toMatchObject({
      x: expect.closeTo(5, 5),
      y: expect.closeTo(0, 5),
      z: expect.closeTo(2, 5)
    });
    expect(movedPathConnection?.id).toBe("connection-a");
    expect(movedPathConnection?.progress).toBeCloseTo(0.5);
    expect(stationaryPathConnection?.id).toBe("connection-b");
    expect(stationaryPathConnection?.progress).toBeCloseTo(0.7);
    expect(stationaryPathConnection?.clipDistance).toBe(2);
  });

  it("reprojects persisted junction connections when no new crossing candidate exists", () => {
    const pathA = createRoadPath("path-reattach-fallback-a", [
      { x: 0, z: 0 },
      { x: 10, z: 0 }
    ]);
    const pathB = createRoadPath("path-reattach-fallback-b", [
      { x: 5, z: -5 },
      { x: 5, z: 5 }
    ]);
    const movedPathA = createRoadPath("path-reattach-fallback-a", [
      { x: 0, z: 8 },
      { x: 10, z: 8 }
    ]);
    const junction = createSplineCorridorJunction({
      id: "junction-reattach-fallback",
      center: { x: 5, y: 0, z: 0 },
      connections: [
        { pathId: pathA.id, progress: 0.5, clipDistance: 2 },
        { pathId: pathB.id, progress: 0.5, clipDistance: 2 }
      ]
    });

    const nextJunction = reattachSplineCorridorJunctionsToPaths({
      paths: [movedPathA, pathB],
      junctions: {
        [junction.id]: junction
      },
      changedPathIds: [pathA.id]
    })[junction.id];

    expect(nextJunction?.center).toMatchObject({
      x: expect.closeTo(5, 5),
      y: expect.closeTo(0, 5),
      z: expect.closeTo(4, 5)
    });
    expect(
      nextJunction?.connections.find((connection) => connection.pathId === pathA.id)
        ?.progress
    ).toBeCloseTo(0.5);
    expect(
      nextJunction?.connections.find((connection) => connection.pathId === pathB.id)
        ?.progress
    ).toBeCloseTo(0.5);
  });
});
