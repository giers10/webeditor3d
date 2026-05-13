import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createTerrain } from "../../src/document/terrains";
import { deriveSplineRepeaterInstances } from "../../src/spline-corridor/spline-repeaters";

describe("spline repeaters", () => {
  it("places bundled corridor assets along paths without requiring roads", () => {
    const path = createScenePath({
      id: "path-repeater-no-road",
      road: {
        enabled: false
      },
      repeaters: [
        {
          id: "repeater-fence",
          assetId: "fence_segment_wood_2m",
          placement: "left",
          offset: 1,
          spacing: 2,
          startInset: 0,
          endInset: 0,
          scale: 1,
          randomScale: 0,
          randomYawDegrees: 0,
          yawOffsetDegrees: 0,
          terrainConform: false,
          heightOffset: 0,
          alignToSpline: true,
          seed: 7
        }
      ],
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

    const instances = deriveSplineRepeaterInstances({ path });

    expect(instances).toHaveLength(3);
    expect(instances.map((instance) => instance.position)).toEqual([
      { x: 0, y: 0, z: 1 },
      { x: 2, y: 0, z: 1 },
      { x: 4, y: 0, z: 1 }
    ]);
    expect(instances.map((instance) => instance.yawDegrees)).toEqual([
      90,
      90,
      90
    ]);
  });

  it("skips repeater instances inside junction clip intervals", () => {
    const path = createScenePath({
      id: "path-repeater-clipped",
      repeaters: [
        {
          id: "repeater-clipped",
          assetId: "fence_segment_wood_2m",
          spacing: 2,
          placement: "center"
        }
      ],
      points: [
        {
          id: "path-repeater-clipped-a",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-repeater-clipped-b",
          position: { x: 0, y: 0, z: 10 }
        }
      ]
    });

    const instances = deriveSplineRepeaterInstances({
      path,
      clipIntervals: [
        {
          junctionId: "junction-repeater-clipped",
          startDistance: 4,
          endDistance: 6
        }
      ]
    });

    expect(instances.map((instance) => instance.distanceAlongPath)).toEqual([
      0, 2, 8, 10
    ]);
  });

  it("deterministically applies terrain conforming and random variation", () => {
    const terrain = createTerrain({
      id: "terrain-repeater",
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
      id: "path-repeater-terrain",
      repeaters: [
        {
          id: "repeater-rocks",
          assetId: "edge_small_rocks_a_2m",
          placement: "right",
          offset: 1,
          spacing: 2,
          randomScale: 0.2,
          randomYawDegrees: 10,
          terrainConform: true,
          heightOffset: 0.25,
          seed: 3
        }
      ],
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

    const first = deriveSplineRepeaterInstances({
      path,
      terrains: [terrain]
    });
    const second = deriveSplineRepeaterInstances({
      path,
      terrains: [terrain]
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first[0]?.position.y).toBe(1.25);
    expect(first[1]?.position.y).toBe(1.25);
    expect(first[0]?.scale).not.toBe(1);
    expect(first[0]?.yawDegrees).not.toBe(90);
  });
});
