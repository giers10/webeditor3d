import { describe, expect, it } from "vitest";

import {
  createScenePath,
  getScenePathLength,
  mapWorldPointToScenePathProgressBetweenPoints,
  resolveNearestPointOnResolvedScenePath,
  resolveScenePath,
  sampleResolvedScenePathPosition,
  sampleResolvedScenePathTangent,
  sampleScenePathPosition,
  sampleScenePathTangent
} from "../../src/document/paths";
import { createTerrain } from "../../src/document/terrains";

describe("scene paths", () => {
  it("resolves linear segments and samples position and tangent by progress", () => {
    const path = createScenePath({
      id: "path-open",
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 0,
            y: 0,
            z: 3
          }
        },
        {
          id: "point-c",
          position: {
            x: 4,
            y: 0,
            z: 3
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path);

    expect(getScenePathLength(path)).toBe(7);
    expect(resolvedPath.totalLength).toBe(7);
    expect(resolvedPath.segments).toHaveLength(2);
    expect(sampleScenePathPosition(path, 0)).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
    expect(sampleScenePathTangent(path, 0)).toEqual({
      x: 0,
      y: 0,
      z: 1
    });
    expect(sampleResolvedScenePathPosition(resolvedPath, 0.5)).toEqual({
      x: 0.5,
      y: 0,
      z: 3
    });
    expect(sampleResolvedScenePathTangent(resolvedPath, 0.5)).toEqual({
      x: 1,
      y: 0,
      z: 0
    });
    expect(sampleScenePathPosition(path, 1)).toEqual({
      x: 4,
      y: 0,
      z: 3
    });
  });

  it("supports looped paths and wraps progress 1 back to the first point", () => {
    const path = createScenePath({
      id: "path-loop",
      loop: true,
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 2,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-c",
          position: {
            x: 2,
            y: 0,
            z: 2
          }
        },
        {
          id: "point-d",
          position: {
            x: 0,
            y: 0,
            z: 2
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path);

    expect(resolvedPath.segments).toHaveLength(4);
    expect(resolvedPath.totalLength).toBe(8);
    expect(sampleResolvedScenePathPosition(resolvedPath, 1)).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
    expect(sampleResolvedScenePathTangent(resolvedPath, 1)).toEqual({
      x: 0,
      y: 0,
      z: -1
    });
  });

  it("can smooth followed paths into rounded corners", () => {
    const path = createScenePath({
      id: "path-smooth-corner",
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 0,
            y: 0,
            z: 3
          }
        },
        {
          id: "point-c",
          position: {
            x: 4,
            y: 0,
            z: 3
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path);
    const smoothedPosition = sampleResolvedScenePathPosition(resolvedPath, 0.5, {
      smooth: true
    });
    const smoothedTangent = sampleResolvedScenePathTangent(resolvedPath, 0.5, {
      smooth: true
    });

    expect(smoothedPosition).not.toEqual({
      x: 0.5,
      y: 0,
      z: 3
    });
    expect(smoothedPosition.x).toBeGreaterThan(0);
    expect(smoothedPosition.z).toBeLessThan(3);
    expect(smoothedTangent.x).toBeGreaterThan(0);
    expect(smoothedTangent.z).toBeGreaterThan(0);
  });

  it("resolves Catmull-Rom spline paths into sampled arc-length segments", () => {
    const path = createScenePath({
      id: "path-spline-corner",
      curveMode: "catmullRom",
      sampledResolution: 8,
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 0,
            y: 0,
            z: 3
          }
        },
        {
          id: "point-c",
          position: {
            x: 4,
            y: 0,
            z: 3
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path);
    const midpoint = sampleScenePathPosition(path, 0.5);
    const nearest = resolveNearestPointOnResolvedScenePath(resolvedPath, {
      x: 0.5,
      y: 0,
      z: 3.5
    });

    expect(resolvedPath.curveMode).toBe("catmullRom");
    expect(resolvedPath.sampledResolution).toBe(8);
    expect(resolvedPath.segments).toHaveLength(16);
    expect(resolvedPath.totalLength).toBeGreaterThan(0);
    expect(midpoint).not.toEqual({
      x: 0.5,
      y: 0,
      z: 3
    });
    expect(nearest.segmentIndex).not.toBeNull();
    expect(nearest.progress).toBeGreaterThan(0);
    expect(nearest.progress).toBeLessThan(1);
    expect(nearest.distanceAlongPath).toBeGreaterThan(0);
  });

  it("can resolve spline samples glued to terrain without rewriting authored points", () => {
    const terrain = createTerrain({
      id: "terrain-path-glue",
      position: {
        x: 0,
        y: 10,
        z: 0
      },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      heights: [0, 1, 2, 0, 1, 2, 0, 1, 2]
    });
    const path = createScenePath({
      id: "path-glued",
      curveMode: "catmullRom",
      sampledResolution: 4,
      glueToTerrain: true,
      terrainOffset: 0.25,
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 100,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 1,
            y: 100,
            z: 1
          }
        },
        {
          id: "point-c",
          position: {
            x: 2,
            y: 100,
            z: 2
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path, { terrains: [terrain] });

    expect(path.points[0]?.position.y).toBe(100);
    expect(resolvedPath.points[0]?.position.y).toBe(10.25);
    expect(resolvedPath.points[1]?.position.y).toBe(11.25);
    expect(resolvedPath.points[2]?.position.y).toBe(12.25);
    expect(resolvedPath.segments.every((segment) => segment.start.y < 20)).toBe(
      true
    );
    expect(
      sampleScenePathPosition(path, 0.5, { terrains: [terrain] }).y
    ).toBeCloseTo(11.25);
  });

  it("projects world points onto the nearest resolved path segment and returns progress", () => {
    const path = createScenePath({
      id: "path-nearest-point",
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 0,
            y: 0,
            z: 4
          }
        },
        {
          id: "point-c",
          position: {
            x: 6,
            y: 0,
            z: 4
          }
        }
      ]
    });
    const resolvedPath = resolveScenePath(path);

    expect(
      resolveNearestPointOnResolvedScenePath(resolvedPath, {
        x: 2,
        y: 0,
        z: 5
      })
    ).toEqual({
      progress: 0.6,
      distance: 1,
      distanceAlongPath: 6,
      segmentIndex: 1,
      position: {
        x: 2,
        y: 0,
        z: 4
      },
      tangent: {
        x: 1,
        y: 0,
        z: 0
      }
    });
  });

  it("maps world points between authored track points into clamped rail progress", () => {
    expect(
      mapWorldPointToScenePathProgressBetweenPoints({
        point: {
          x: 12,
          y: 1,
          z: 2
        },
        trackStartPoint: {
          x: 0,
          y: 1,
          z: 2
        },
        trackEndPoint: {
          x: 10,
          y: 1,
          z: 2
        },
        railStartProgress: 0.25,
        railEndProgress: 0.75
      })
    ).toEqual({
      trackProgress: 1,
      railProgress: 0.75,
      projectedTrackPosition: {
        x: 10,
        y: 1,
        z: 2
      }
    });
  });
});
