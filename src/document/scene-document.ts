import { DEFAULT_SUN_DIRECTION, type Vec3 } from "../core/vector";
import type { Brush } from "./brushes";

export const SCENE_DOCUMENT_VERSION = 2 as const;
export const FOUNDATION_SCENE_DOCUMENT_VERSION = 1 as const;

export interface WorldBackgroundSettings {
  mode: "solid";
  colorHex: string;
}

export interface WorldAmbientLightSettings {
  colorHex: string;
  intensity: number;
}

export interface WorldSunLightSettings {
  colorHex: string;
  intensity: number;
  direction: Vec3;
}

export interface WorldSettings {
  background: WorldBackgroundSettings;
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
}

export interface SceneDocument {
  version: typeof SCENE_DOCUMENT_VERSION;
  name: string;
  world: WorldSettings;
  materials: Record<string, never>;
  textures: Record<string, never>;
  assets: Record<string, never>;
  brushes: Record<string, Brush>;
  modelInstances: Record<string, never>;
  entities: Record<string, never>;
  interactionLinks: Record<string, never>;
}

export function createDefaultWorldSettings(): WorldSettings {
  return {
    background: {
      mode: "solid",
      colorHex: "#2f3947"
    },
    ambientLight: {
      colorHex: "#f7f1e8",
      intensity: 1
    },
    sunLight: {
      colorHex: "#fff1d5",
      intensity: 1.75,
      direction: {
        ...DEFAULT_SUN_DIRECTION
      }
    }
  };
}

export function createEmptySceneDocument(overrides: Partial<Pick<SceneDocument, "name" | "world">> = {}): SceneDocument {
  return {
    version: SCENE_DOCUMENT_VERSION,
    name: overrides.name ?? "Untitled Scene",
    world: overrides.world ?? createDefaultWorldSettings(),
    materials: {},
    textures: {},
    assets: {},
    brushes: {},
    modelInstances: {},
    entities: {},
    interactionLinks: {}
  };
}
