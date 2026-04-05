import { cloneMaterialRegistry, createStarterMaterialRegistry } from "../materials/starter-material-library";
import { createDefaultWorldSettings } from "./world-settings";
export const SCENE_DOCUMENT_VERSION = 18;
export const WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION = 18;
export const PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION = 17;
export const IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION = 16;
export const ENTITY_NAMES_SCENE_DOCUMENT_VERSION = 15;
export const SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION = 13;
export const ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION = 12;
export const LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION = 10;
export const MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION = 9;
export const FOUNDATION_SCENE_DOCUMENT_VERSION = 1;
export const BOX_BRUSH_SCENE_DOCUMENT_VERSION = 2;
export const FACE_MATERIALS_SCENE_DOCUMENT_VERSION = 3;
export const RUNNER_V1_SCENE_DOCUMENT_VERSION = 4;
export const FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION = 5;
export const WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION = 6;
export const ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION = 7;
export const TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION = 8;
export function createEmptySceneDocument(overrides = {}) {
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
