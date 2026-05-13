import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createTerrain } from "../../src/document/terrains";
import { deriveSplineCorridorBoxColliders } from "../../src/spline-corridor/spline-corridor-colliders";

describe("spline corridor colliders", () => {
  it("derives simple box colliders for collision-enabled repeaters", () => {
    const path = createScenePath({
      id: "path-repeater-collision",
      repeaters: [
        {
          id: "repeater-fence-collision",
          assetId: "fence_segment_wood_2m",
          collisionEnabled: true,
          placement: "center",
          spacing: 2,
          terrainConform: false,
          randomScale: 0,
          randomYawDegrees: 0
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

    const colliders = deriveSplineCorridorBoxColliders({ paths: [path] });

    expect(colliders).toHaveLength(3);
    expect(colliders[0]).toMatchObject({
      kind: "box",
      source: "splineCorridor",
      pathId: path.id,
      repeaterId: "repeater-fence-collision",
      assetId: "fence_segment_wood_2m",
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 90, z: 0 },
      center: { x: 0, y: 0.565, z: 0 },
      size: { x: 0.14, y: 1.13, z: 2.04 }
    });
  });

  it("derives terrain-conformed curb edge box colliders", () => {
    const terrain = createTerrain({
      id: "terrain-corridor-collision",
      position: { x: 0, y: 1, z: 0 },
      sampleCountX: 2,
      sampleCountZ: 2,
      cellSize: 4,
      heights: [1, 1, 1, 1]
    });
    const path = createScenePath({
      id: "path-curb-collision",
      road: {
        enabled: true,
        width: 2,
        heightOffset: 0.05,
        terrainConform: true,
        edges: {
          left: {
            enabled: true,
            collisionEnabled: true,
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
          position: { x: 0, y: 10, z: 0 }
        },
        {
          id: "point-b",
          position: { x: 4, y: 10, z: 0 }
        }
      ]
    });

    const colliders = deriveSplineCorridorBoxColliders({
      paths: [path],
      terrains: [terrain]
    });

    expect(colliders).toEqual([
      expect.objectContaining({
        pathId: path.id,
        edgeSide: "left",
        position: { x: 2, y: 2.15, z: 1.2 },
        rotationDegrees: { x: 0, y: 90, z: 0 },
        center: { x: 0, y: 0, z: 0 },
        size: { x: 0.4, y: 0.2, z: 4 }
      })
    ]);
  });
});
