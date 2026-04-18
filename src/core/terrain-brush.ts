import type { Terrain } from "../document/terrains";

export type TerrainBrushTool = "raise" | "lower" | "smooth" | "flatten";

export interface TerrainBrushSettings {
  radius: number;
  strength: number;
  falloff: number;
}

export interface ArmedTerrainBrushState extends TerrainBrushSettings {
  terrainId: string;
  tool: TerrainBrushTool;
}

export interface TerrainBrushStrokeCommit {
  terrain: Terrain;
  commandLabel: string;
  tool: TerrainBrushTool;
}

export const DEFAULT_TERRAIN_BRUSH_RADIUS = 2;
export const DEFAULT_TERRAIN_BRUSH_STRENGTH = 0.35;
export const DEFAULT_TERRAIN_BRUSH_FALLOFF = 0.6;
export const MIN_TERRAIN_BRUSH_RADIUS = 0.25;
export const MAX_TERRAIN_BRUSH_RADIUS = 12;
export const MIN_TERRAIN_BRUSH_STRENGTH = 0.05;
export const MAX_TERRAIN_BRUSH_STRENGTH = 1;
export const MIN_TERRAIN_BRUSH_FALLOFF = 0;
export const MAX_TERRAIN_BRUSH_FALLOFF = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampTerrainBrushRadius(radius: number): number {
  if (!Number.isFinite(radius)) {
    return DEFAULT_TERRAIN_BRUSH_RADIUS;
  }

  return clamp(radius, MIN_TERRAIN_BRUSH_RADIUS, MAX_TERRAIN_BRUSH_RADIUS);
}

export function clampTerrainBrushStrength(strength: number): number {
  if (!Number.isFinite(strength)) {
    return DEFAULT_TERRAIN_BRUSH_STRENGTH;
  }

  return clamp(
    strength,
    MIN_TERRAIN_BRUSH_STRENGTH,
    MAX_TERRAIN_BRUSH_STRENGTH
  );
}

export function clampTerrainBrushFalloff(falloff: number): number {
  if (!Number.isFinite(falloff)) {
    return DEFAULT_TERRAIN_BRUSH_FALLOFF;
  }

  return clamp(
    falloff,
    MIN_TERRAIN_BRUSH_FALLOFF,
    MAX_TERRAIN_BRUSH_FALLOFF
  );
}

export function createDefaultTerrainBrushSettings(): TerrainBrushSettings {
  return {
    radius: DEFAULT_TERRAIN_BRUSH_RADIUS,
    strength: DEFAULT_TERRAIN_BRUSH_STRENGTH,
    falloff: DEFAULT_TERRAIN_BRUSH_FALLOFF
  };
}

export function getTerrainBrushToolLabel(tool: TerrainBrushTool): string {
  switch (tool) {
    case "raise":
      return "Raise";
    case "lower":
      return "Lower";
    case "smooth":
      return "Smooth";
    case "flatten":
      return "Flatten";
  }
}

export function getTerrainBrushCommandLabel(tool: TerrainBrushTool): string {
  return `${getTerrainBrushToolLabel(tool)} terrain`;
}
