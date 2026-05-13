import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";
import {
  createSplineCorridorJunctionFromCandidate,
  detectSplineCorridorJunctionCandidates,
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
});

