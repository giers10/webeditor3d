import type { Brush } from "./brushes";
import type { ModelInstance } from "../assets/model-instances";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EntityInstance } from "../entities/entity-instances";
import type { InteractionLink } from "../interactions/interaction-links";
import { cloneMaterialRegistry, createStarterMaterialRegistry, type MaterialDef } from "../materials/starter-material-library";
import { createDefaultWorldSettings, type WorldSettings } from "./world-settings";

export const SCENE_DOCUMENT_VERSION = 11 as const;
export const LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION = 10 as const;
export const MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION = 9 as const;
export const FOUNDATION_SCENE_DOCUMENT_VERSION = 1 as const;
export const BOX_BRUSH_SCENE_DOCUMENT_VERSION = 2 as const;
export const FACE_MATERIALS_SCENE_DOCUMENT_VERSION = 3 as const;
export const RUNNER_V1_SCENE_DOCUMENT_VERSION = 4 as const;
export const FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION = 5 as const;
export const WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION = 6 as const;
export const ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION = 7 as const;
export const TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION = 8 as const;

export interface SceneDocument {
  version: typeof SCENE_DOCUMENT_VERSION;
  name: string;
  world: WorldSettings;
  materials: Record<string, MaterialDef>;
  textures: Record<string, never>;
  assets: Record<string, ProjectAssetRecord>;
  brushes: Record<string, Brush>;
  modelInstances: Record<string, ModelInstance>;
  entities: Record<string, EntityInstance>;
  interactionLinks: Record<string, InteractionLink>;
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
  WorldImageBackgroundSettings,
  WorldSolidBackgroundSettings,
  WorldSettings,
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
