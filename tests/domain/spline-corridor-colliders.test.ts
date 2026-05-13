import { describe, expect, it } from "vitest";

import { createScenePath } from "../../src/document/paths";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";
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

  it("derives box colliders for collision-enabled junction edges while skipping road mouths", () => {
    const pathA = createScenePath({
      id: "path-junction-collision-a",
      road: {
        enabled: true,
        width: 2
      },
      points: [
        {
          id: "path-junction-collision-a-start",
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: "path-junction-collision-a-end",
          position: { x: 10, y: 0, z: 0 }
        }
      ]
    });
    const pathB = createScenePath({
      id: "path-junction-collision-b",
      road: {
        enabled: true,
        width: 2
      },
      points: [
        {
          id: "path-junction-collision-b-start",
          position: { x: 5, y: 0, z: -5 }
        },
        {
          id: "path-junction-collision-b-end",
          position: { x: 5, y: 0, z: 5 }
        }
      ]
    });
    const junction = createSplineCorridorJunction({
      id: "junction-collision",
      center: { x: 5, y: 0, z: 0 },
      radius: 3,
      edge: {
        enabled: true,
        collisionEnabled: true,
        kind: "curb",
        width: 0.4,
        height: 0.2,
        materialId: null
      },
      connections: [
        { pathId: pathA.id, progress: 0.5, clipDistance: 2 },
        { pathId: pathB.id, progress: 0.5, clipDistance: 2 }
      ]
    });

    const colliders = deriveSplineCorridorBoxColliders({
      paths: [pathA, pathB],
      junctions: [junction]
    });

    expect(colliders).toHaveLength(4);
    expect(colliders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          junctionId: junction.id,
          edgeSide: "junction",
          size: expect.objectContaining({ x: 0.4, y: 0.2 })
        })
      ])
    );
  });
});
