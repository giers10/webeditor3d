import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import {
  createScenePathRoadEdgeSettings,
  type ScenePathRoadEdgeSettings
} from "./paths";

export type SplineCorridorJunctionTerrainMode =
  | "none"
  | "paintOnly"
  | "flattenAndPaint";

export interface SplineCorridorJunctionConnection {
  id: string;
  pathId: string;
  progress: number;
  clipDistance: number;
}

export interface SplineCorridorJunction {
  id: string;
  kind: "splineCorridorJunction";
  name?: string;
  visible: boolean;
  enabled: boolean;
  center: Vec3;
  radius: number;
  materialId: string | null;
  terrainMode: SplineCorridorJunctionTerrainMode;
  edge: ScenePathRoadEdgeSettings;
  connections: SplineCorridorJunctionConnection[];
}

export type SplineCorridorJunctionRegistry = Record<
  string,
  SplineCorridorJunction
>;

export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_VISIBLE = true;
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_ENABLED = true;
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_RADIUS = 1.5;
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE = 1.5;
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_MATERIAL_ID = null;
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_TERRAIN_MODE: SplineCorridorJunctionTerrainMode =
  "flattenAndPaint";
export const DEFAULT_SPLINE_CORRIDOR_JUNCTION_EDGE_ENABLED = false;
export const MIN_SPLINE_CORRIDOR_JUNCTION_RADIUS = 0.05;
export const MAX_SPLINE_CORRIDOR_JUNCTION_RADIUS = 500;
export const MIN_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE = 0.05;
export const MAX_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE = 500;
export const SPLINE_CORRIDOR_JUNCTION_TERRAIN_MODES = [
  "none",
  "paintOnly",
  "flattenAndPaint"
] as const satisfies readonly SplineCorridorJunctionTerrainMode[];

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizePositiveFiniteNumber(
  value: number,
  min: number,
  max: number,
  label: string
): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }

  if (value < min || value > max) {
    throw new Error(`${label} must be from ${min} to ${max}.`);
  }

  return value;
}

export function isSplineCorridorJunctionTerrainMode(
  value: unknown
): value is SplineCorridorJunctionTerrainMode {
  return SPLINE_CORRIDOR_JUNCTION_TERRAIN_MODES.includes(
    value as SplineCorridorJunctionTerrainMode
  );
}

export function normalizeSplineCorridorJunctionRadius(value: number): number {
  return normalizePositiveFiniteNumber(
    value,
    MIN_SPLINE_CORRIDOR_JUNCTION_RADIUS,
    MAX_SPLINE_CORRIDOR_JUNCTION_RADIUS,
    "Spline corridor junction radius"
  );
}

export function normalizeSplineCorridorJunctionClipDistance(
  value: number
): number {
  return normalizePositiveFiniteNumber(
    value,
    MIN_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE,
    MAX_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE,
    "Spline corridor junction clip distance"
  );
}

export function normalizeSplineCorridorJunctionMaterialId(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  return value;
}

export function normalizeSplineCorridorJunctionName(
  value: string | undefined
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

export function normalizeSplineCorridorJunctionTerrainMode(
  value: unknown
): SplineCorridorJunctionTerrainMode {
  if (isSplineCorridorJunctionTerrainMode(value)) {
    return value;
  }

  throw new Error(
    "Spline corridor junction terrain mode must be none, paintOnly, or flattenAndPaint."
  );
}

export function createSplineCorridorJunctionConnection(
  overrides: Partial<SplineCorridorJunctionConnection> & {
    pathId: string;
  }
): SplineCorridorJunctionConnection {
  if (overrides.pathId.trim().length === 0) {
    throw new Error("Spline corridor junction connection path id is required.");
  }

  return {
    id: overrides.id ?? createOpaqueId("spline_junction_connection"),
    pathId: overrides.pathId,
    progress:
      overrides.progress === undefined
        ? 0
        : Math.min(1, Math.max(0, overrides.progress)),
    clipDistance: normalizeSplineCorridorJunctionClipDistance(
      overrides.clipDistance ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_CLIP_DISTANCE
    )
  };
}

export function createSplineCorridorJunction(
  overrides: Partial<
    Omit<SplineCorridorJunction, "kind" | "connections">
  > & {
    connections: Array<
      Partial<SplineCorridorJunctionConnection> & { pathId: string }
    >;
  }
): SplineCorridorJunction {
  if (overrides.connections.length < 2) {
    throw new Error("Spline corridor junctions require at least two connections.");
  }

  return {
    id: overrides.id ?? createOpaqueId("spline_junction"),
    kind: "splineCorridorJunction",
    name: normalizeSplineCorridorJunctionName(overrides.name),
    visible: overrides.visible ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_VISIBLE,
    enabled: overrides.enabled ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_ENABLED,
    center:
      overrides.center === undefined
        ? { x: 0, y: 0, z: 0 }
        : cloneVec3(overrides.center),
    radius: normalizeSplineCorridorJunctionRadius(
      overrides.radius ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_RADIUS
    ),
    materialId: normalizeSplineCorridorJunctionMaterialId(
      overrides.materialId ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_MATERIAL_ID
    ),
    terrainMode:
      overrides.terrainMode === undefined
        ? DEFAULT_SPLINE_CORRIDOR_JUNCTION_TERRAIN_MODE
        : normalizeSplineCorridorJunctionTerrainMode(overrides.terrainMode),
    edge: createScenePathRoadEdgeSettings({
      enabled:
        overrides.edge?.enabled ?? DEFAULT_SPLINE_CORRIDOR_JUNCTION_EDGE_ENABLED,
      collisionEnabled: overrides.edge?.collisionEnabled,
      kind: overrides.edge?.kind,
      width: overrides.edge?.width,
      height: overrides.edge?.height,
      materialId: overrides.edge?.materialId
    }),
    connections: overrides.connections.map(
      createSplineCorridorJunctionConnection
    )
  };
}

export function cloneSplineCorridorJunction(
  junction: SplineCorridorJunction
): SplineCorridorJunction {
  return createSplineCorridorJunction(junction);
}

export function getSplineCorridorJunctions(
  junctions: SplineCorridorJunctionRegistry
): SplineCorridorJunction[] {
  return Object.values(junctions).sort((left, right) =>
    (left.name ?? left.id).localeCompare(right.name ?? right.id)
  );
}
