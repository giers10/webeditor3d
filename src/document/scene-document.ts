import type { Brush } from "./brushes";
import type { EntityInstance } from "../entities/entity-instances";
import { cloneMaterialRegistry, createStarterMaterialRegistry, type MaterialDef } from "../materials/starter-material-library";
import { createDefaultWorldSettings, type WorldSettings } from "./world-settings";

export const SCENE_DOCUMENT_VERSION = 6 as const;
export const FOUNDATION_SCENE_DOCUMENT_VERSION = 1 as const;
export const BOX_BRUSH_SCENE_DOCUMENT_VERSION = 2 as const;
export const FACE_MATERIALS_SCENE_DOCUMENT_VERSION = 3 as const;
export const RUNNER_V1_SCENE_DOCUMENT_VERSION = 4 as const;
export const FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION = 5 as const;

export interface SceneDocument {
  version: typeof SCENE_DOCUMENT_VERSION;
  name: string;
  world: WorldSettings;
  materials: Record<string, MaterialDef>;
  textures: Record<string, never>;
  assets: Record<string, never>;
  brushes: Record<string, Brush>;
  modelInstances: Record<string, never>;
  entities: Record<string, EntityInstance>;
  interactionLinks: Record<string, never>;
}

export function createEmptySceneDocument(overrides: Partial<Pick<SceneDocument, "name" | "world" | "materials">> = {}): SceneDocument {
  return {
    version: SCENE_DOCUMENT_VERSION,
    name: overrides.name ?? "Untitled Scene",
    world: overrides.world ?? createDefaultWorldSettings(),
    materials: cloneMaterialRegistry(overrides.materials ?? createStarterMaterialRegistry()),
    textures: {},
    assets: {},
    brushes: {},
    modelInstances: {},
    entities: {},
    interactionLinks: {}
  };
}

export type {
  WorldAmbientLightSettings,
  WorldBackgroundMode,
  WorldBackgroundSettings,
  WorldSolidBackgroundSettings,
  WorldSunLightSettings,
  WorldVerticalGradientBackgroundSettings
} from "./world-settings";

export {
  areWorldSettingsEqual,
  changeWorldBackgroundMode,
  cloneWorldBackgroundSettings,
  cloneWorldSettings,
  createDefaultWorldSettings,
  isHexColorString
} from "./world-settings";
