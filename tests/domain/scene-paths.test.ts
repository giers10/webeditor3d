import { describe, expect, it } from "vitest";

import {
  createScenePath,
  getScenePathLength,
  resolveNearestPointOnResolvedScenePath,
  resolveScenePath,
  sampleResolvedScenePathPosition,
  sampleResolvedScenePathTangent,
  sampleScenePathPosition,
  sampleScenePathTangent
} from "../../src/document/paths";

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
});
