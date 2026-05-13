import {
  getTerrainFootprintDepth,
  getTerrainFootprintWidth,
  MIN_TERRAIN_SAMPLE_COUNT,
  resizeTerrainGrid,
  type Terrain,
  type TerrainGridResizeDirectionX,
  type TerrainGridResizeDirectionZ
} from "../document/terrains";

export type TerrainGridResizeSide = "east" | "west" | "north" | "south";

export interface TerrainGridResizeDirections {
  resizeDirectionX?: TerrainGridResizeDirectionX;
  resizeDirectionZ?: TerrainGridResizeDirectionZ;
}

export function getTerrainGridResizeDirectionsForSide(
  side: TerrainGridResizeSide
): TerrainGridResizeDirections {
  switch (side) {
    case "east":
      return { resizeDirectionX: "east" };
    case "west":
      return { resizeDirectionX: "west" };
    case "north":
      return { resizeDirectionZ: "north" };
    case "south":
      return { resizeDirectionZ: "south" };
  }
}

export function resolveTerrainGridResizeSideFromLocalPosition(
  terrain: Terrain,
  localX: number,
  localZ: number,
  threshold: number
): TerrainGridResizeSide | null {
  const width = getTerrainFootprintWidth(terrain);
  const depth = getTerrainFootprintDepth(terrain);

  if (
    localX < 0 ||
    localX > width ||
    localZ < 0 ||
    localZ > depth ||
    threshold <= 0
  ) {
    return null;
  }

  const edgeDistances: Array<{
    side: TerrainGridResizeSide;
    distance: number;
  }> = [
    { side: "west", distance: localX },
    { side: "east", distance: width - localX },
    { side: "south", distance: localZ },
    { side: "north", distance: depth - localZ }
  ];
  const candidates = edgeDistances.filter(
    (candidate) => candidate.distance <= threshold
  );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => left.distance - right.distance);
  return candidates[0]?.side ?? null;
}

export function resizeTerrainGridFromBorderDrag(
  terrain: Terrain,
  side: TerrainGridResizeSide,
  outwardDragDistance: number
): Terrain {
  const sampleDelta = Math.round(outwardDragDistance / terrain.cellSize);
  const directions = getTerrainGridResizeDirectionsForSide(side);

  return resizeTerrainGrid(terrain, {
    sampleCountX:
      side === "east" || side === "west"
        ? Math.max(MIN_TERRAIN_SAMPLE_COUNT, terrain.sampleCountX + sampleDelta)
        : terrain.sampleCountX,
    sampleCountZ:
      side === "north" || side === "south"
        ? Math.max(MIN_TERRAIN_SAMPLE_COUNT, terrain.sampleCountZ + sampleDelta)
        : terrain.sampleCountZ,
    cellSize: terrain.cellSize,
    ...directions
  });
}
