import { describe, expect, it } from "vitest";

import { createTerrain } from "../../src/document/terrains";
import {
  resizeTerrainGridFromBorderDrag,
  resolveTerrainGridResizeSideFromLocalPosition
} from "../../src/viewport-three/terrain-grid-resize-controls";

describe("terrain grid resize viewport controls", () => {
  it("resolves cardinal sides from local border hover positions", () => {
    const terrain = createTerrain({
      id: "terrain-grid-hover-sides",
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1
    });

    expect(resolveTerrainGridResizeSideFromLocalPosition(terrain, 0.1, 2, 0.25)).toBe(
      "west"
    );
    expect(resolveTerrainGridResizeSideFromLocalPosition(terrain, 3.9, 2, 0.25)).toBe(
      "east"
    );
    expect(resolveTerrainGridResizeSideFromLocalPosition(terrain, 2, 0.1, 0.25)).toBe(
      "south"
    );
    expect(resolveTerrainGridResizeSideFromLocalPosition(terrain, 2, 3.9, 0.25)).toBe(
      "north"
    );
    expect(resolveTerrainGridResizeSideFromLocalPosition(terrain, 2, 2, 0.25)).toBeNull();
  });

  it("drags east and north borders by rounded cell deltas", () => {
    const terrain = createTerrain({
      id: "terrain-grid-drag-east-north",
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1
    });

    const eastResized = resizeTerrainGridFromBorderDrag(terrain, "east", 1.6);
    const northResized = resizeTerrainGridFromBorderDrag(terrain, "north", -1.2);

    expect(eastResized.sampleCountX).toBe(7);
    expect(eastResized.sampleCountZ).toBe(5);
    expect(eastResized.position).toEqual(terrain.position);
    expect(northResized.sampleCountX).toBe(5);
    expect(northResized.sampleCountZ).toBe(4);
    expect(northResized.position).toEqual(terrain.position);
  });

  it("drags west and south borders by moving the terrain origin", () => {
    const terrain = createTerrain({
      id: "terrain-grid-drag-west-south",
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1
    });

    const westResized = resizeTerrainGridFromBorderDrag(terrain, "west", 2);
    const southResized = resizeTerrainGridFromBorderDrag(terrain, "south", -2);

    expect(westResized.sampleCountX).toBe(7);
    expect(westResized.position.x).toBe(terrain.position.x - 2);
    expect(southResized.sampleCountZ).toBe(3);
    expect(southResized.position.z).toBe(terrain.position.z + 2);
  });
});
