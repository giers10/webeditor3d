import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";

export interface Terrain {
  id: string;
  kind: "terrain";
  name?: string;
  visible: boolean;
  enabled: boolean;
  position: Vec3;
  sampleCountX: number;
  sampleCountZ: number;
  cellSize: number;
  heights: number[];
}

export const DEFAULT_TERRAIN_VISIBLE = true;
export const DEFAULT_TERRAIN_ENABLED = true;
export const MIN_TERRAIN_SAMPLE_COUNT = 2;
export const DEFAULT_TERRAIN_SAMPLE_COUNT_X = 9;
export const DEFAULT_TERRAIN_SAMPLE_COUNT_Z = 9;
export const DEFAULT_TERRAIN_CELL_SIZE = 1;
export const DEFAULT_TERRAIN_HEIGHT = 0;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function assertFiniteVec3(vector: Vec3, label: string) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} must be finite on every axis.`);
  }
}

export function normalizeTerrainName(
  name: string | null | undefined
): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

export function normalizeTerrainSampleCount(
  value: number,
  label: string
): number {
  if (!Number.isInteger(value) || value < MIN_TERRAIN_SAMPLE_COUNT) {
    throw new Error(
      `${label} must be an integer greater than or equal to ${MIN_TERRAIN_SAMPLE_COUNT}.`
    );
  }

  return value;
}

export function normalizeTerrainCellSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Terrain cell size must be a positive finite number.");
  }

  return value;
}

export function createFlatTerrainHeights(
  sampleCountX: number,
  sampleCountZ: number,
  height = DEFAULT_TERRAIN_HEIGHT
): number[] {
  const normalizedSampleCountX = normalizeTerrainSampleCount(
    sampleCountX,
    "Terrain sampleCountX"
  );
  const normalizedSampleCountZ = normalizeTerrainSampleCount(
    sampleCountZ,
    "Terrain sampleCountZ"
  );

  if (!Number.isFinite(height)) {
    throw new Error("Terrain height samples must be finite.");
  }

  return new Array(normalizedSampleCountX * normalizedSampleCountZ).fill(height);
}

export function getTerrainSampleIndex(
  terrain: Pick<Terrain, "sampleCountX" | "sampleCountZ">,
  sampleX: number,
  sampleZ: number
): number {
  if (
    !Number.isInteger(sampleX) ||
    sampleX < 0 ||
    sampleX >= terrain.sampleCountX
  ) {
    throw new Error(`Terrain sampleX ${sampleX} is out of range.`);
  }

  if (
    !Number.isInteger(sampleZ) ||
    sampleZ < 0 ||
    sampleZ >= terrain.sampleCountZ
  ) {
    throw new Error(`Terrain sampleZ ${sampleZ} is out of range.`);
  }

  return sampleZ * terrain.sampleCountX + sampleX;
}

export function getTerrainHeightAtSample(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): number {
  return terrain.heights[getTerrainSampleIndex(terrain, sampleX, sampleZ)] ?? 0;
}

export function getTerrainWorldSamplePosition(
  terrain: Terrain,
  sampleX: number,
  sampleZ: number
): Vec3 {
  return {
    x: terrain.position.x + sampleX * terrain.cellSize,
    y: terrain.position.y + getTerrainHeightAtSample(terrain, sampleX, sampleZ),
    z: terrain.position.z + sampleZ * terrain.cellSize
  };
}

export function getTerrainBounds(terrain: Terrain): { min: Vec3; max: Vec3 } {
  const width = (terrain.sampleCountX - 1) * terrain.cellSize;
  const depth = (terrain.sampleCountZ - 1) * terrain.cellSize;
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (const height of terrain.heights) {
    minHeight = Math.min(minHeight, height);
    maxHeight = Math.max(maxHeight, height);
  }

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight)) {
    minHeight = 0;
    maxHeight = 0;
  }

  return {
    min: {
      x: terrain.position.x,
      y: terrain.position.y + minHeight,
      z: terrain.position.z
    },
    max: {
      x: terrain.position.x + width,
      y: terrain.position.y + maxHeight,
      z: terrain.position.z + depth
    }
  };
}

function createDefaultTerrainPosition(
  sampleCountX: number,
  sampleCountZ: number,
  cellSize: number
): Vec3 {
  return {
    x: -((sampleCountX - 1) * cellSize) * 0.5,
    y: 0,
    z: -((sampleCountZ - 1) * cellSize) * 0.5
  };
}

export function createTerrain(
  overrides: Partial<
    Pick<
      Terrain,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "position"
      | "sampleCountX"
      | "sampleCountZ"
      | "cellSize"
      | "heights"
    >
  > = {}
): Terrain {
  const sampleCountX = normalizeTerrainSampleCount(
    overrides.sampleCountX ?? DEFAULT_TERRAIN_SAMPLE_COUNT_X,
    "Terrain sampleCountX"
  );
  const sampleCountZ = normalizeTerrainSampleCount(
    overrides.sampleCountZ ?? DEFAULT_TERRAIN_SAMPLE_COUNT_Z,
    "Terrain sampleCountZ"
  );
  const cellSize = normalizeTerrainCellSize(
    overrides.cellSize ?? DEFAULT_TERRAIN_CELL_SIZE
  );
  const position = cloneVec3(
    overrides.position ??
      createDefaultTerrainPosition(sampleCountX, sampleCountZ, cellSize)
  );
  const heights =
    overrides.heights !== undefined
      ? [...overrides.heights]
      : createFlatTerrainHeights(sampleCountX, sampleCountZ);
  const visible = overrides.visible ?? DEFAULT_TERRAIN_VISIBLE;
  const enabled = overrides.enabled ?? DEFAULT_TERRAIN_ENABLED;

  assertFiniteVec3(position, "Terrain position");

  if (typeof visible !== "boolean") {
    throw new Error("Terrain visible must be a boolean.");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("Terrain enabled must be a boolean.");
  }

  if (heights.length !== sampleCountX * sampleCountZ) {
    throw new Error(
      `Terrain heights must contain exactly ${sampleCountX * sampleCountZ} samples.`
    );
  }

  if (heights.some((height) => !Number.isFinite(height))) {
    throw new Error("Terrain heights must remain finite.");
  }

  return {
    id: overrides.id ?? createOpaqueId("terrain"),
    kind: "terrain",
    name: normalizeTerrainName(overrides.name),
    visible,
    enabled,
    position,
    sampleCountX,
    sampleCountZ,
    cellSize,
    heights
  };
}

export function cloneTerrain(terrain: Terrain): Terrain {
  return createTerrain(terrain);
}

export function areTerrainsEqual(left: Terrain, right: Terrain): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.name === right.name &&
    left.visible === right.visible &&
    left.enabled === right.enabled &&
    areVec3Equal(left.position, right.position) &&
    left.sampleCountX === right.sampleCountX &&
    left.sampleCountZ === right.sampleCountZ &&
    left.cellSize === right.cellSize &&
    left.heights.length === right.heights.length &&
    left.heights.every((height, index) => height === right.heights[index])
  );
}

export function compareTerrains(left: Terrain, right: Terrain): number {
  const leftName = left.name ?? "";
  const rightName = right.name ?? "";

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return left.id.localeCompare(right.id);
}

export function getTerrains(terrains: Record<string, Terrain>): Terrain[] {
  return Object.values(terrains).sort(compareTerrains);
}

export function getTerrainKindLabel(): string {
  return "Terrain";
}
