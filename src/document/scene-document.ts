import { createOpaqueId } from "../core/ids";
import type { Brush } from "./brushes";
import type { ModelInstance } from "../assets/model-instances";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EntityInstance } from "../entities/entity-instances";
import type { InteractionLink } from "../interactions/interaction-links";
import {
  cloneMaterialRegistry,
  createStarterMaterialRegistry,
  type MaterialDef
} from "../materials/starter-material-library";
import {
  createDefaultWorldSettings,
  type WorldSettings
} from "./world-settings";

export const SCENE_DOCUMENT_VERSION = 23 as const;
export const MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION = 22 as const;
export const WATER_SURFACE_DISPLACEMENT_SCENE_DOCUMENT_VERSION = 21 as const;
export const WHITEBOX_BOX_VOLUME_SCENE_DOCUMENT_VERSION = 20 as const;
export const WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION = 19 as const;
export const WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION = 18 as const;
export const PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION =
  17 as const;
export const IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION = 16 as const;
export const ENTITY_NAMES_SCENE_DOCUMENT_VERSION = 15 as const;
export const SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION = 13 as const;
export const ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION = 12 as const;
export const LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION = 10 as const;
export const MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION = 9 as const;
export const FOUNDATION_SCENE_DOCUMENT_VERSION = 1 as const;
export const BOX_BRUSH_SCENE_DOCUMENT_VERSION = 2 as const;
export const FACE_MATERIALS_SCENE_DOCUMENT_VERSION = 3 as const;
export const RUNNER_V1_SCENE_DOCUMENT_VERSION = 4 as const;
export const FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION = 5 as const;
export const WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION = 6 as const;
export const ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION = 7 as const;
export const TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION =
  8 as const;
export const RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION = 23 as const;

export const DEFAULT_PROJECT_SCENE_ID = "scene-main" as const;

export interface SceneLoadingScreenSettings {
  colorHex: string;
  headline: string | null;
  description: string | null;
}

export interface ProjectScene {
  id: string;
  name: string;
  loadingScreen: SceneLoadingScreenSettings;
  world: WorldSettings;
  brushes: Record<string, Brush>;
  modelInstances: Record<string, ModelInstance>;
  entities: Record<string, EntityInstance>;
  interactionLinks: Record<string, InteractionLink>;
}

export interface ProjectDocument {
  version: typeof SCENE_DOCUMENT_VERSION;
  activeSceneId: string;
  scenes: Record<string, ProjectScene>;
  materials: Record<string, MaterialDef>;
  textures: Record<string, never>;
  assets: Record<string, ProjectAssetRecord>;
}

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

export function createEmptySceneDocument(
  overrides: Partial<Pick<SceneDocument, "name" | "world" | "materials">> = {}
): SceneDocument {
  return {
    version: SCENE_DOCUMENT_VERSION,
    name: overrides.name ?? "Untitled Scene",
    world: overrides.world ?? createDefaultWorldSettings(),
    materials: cloneMaterialRegistry(
      overrides.materials ?? createStarterMaterialRegistry()
    ),
    textures: {},
    assets: {},
    brushes: {},
    modelInstances: {},
    entities: {},
    interactionLinks: {}
  };
}

export function createEmptyProjectScene(
  overrides: Partial<
    Pick<ProjectScene, "id" | "name" | "loadingScreen" | "world">
  > = {}
): ProjectScene {
  return {
    id: overrides.id ?? createOpaqueId("scene"),
    name: overrides.name ?? "Untitled Scene",
    loadingScreen: cloneSceneLoadingScreenSettings(
      overrides.loadingScreen ?? createDefaultSceneLoadingScreenSettings()
    ),
    world: overrides.world ?? createDefaultWorldSettings(),
    brushes: {},
    modelInstances: {},
    entities: {},
    interactionLinks: {}
  };
}

export function createEmptyProjectDocument(
  overrides: Partial<
    Pick<ProjectDocument, "activeSceneId" | "materials" | "textures" | "assets">
  > & {
    sceneId?: string;
    sceneName?: string;
    world?: WorldSettings;
  } = {}
): ProjectDocument {
  const initialScene = createEmptyProjectScene({
    id:
      overrides.sceneId ?? overrides.activeSceneId ?? DEFAULT_PROJECT_SCENE_ID,
    name: overrides.sceneName,
    world: overrides.world
  });

  return {
    version: SCENE_DOCUMENT_VERSION,
    activeSceneId: initialScene.id,
    scenes: {
      [initialScene.id]: initialScene
    },
    materials: cloneMaterialRegistry(
      overrides.materials ?? createStarterMaterialRegistry()
    ),
    textures: overrides.textures ?? {},
    assets: overrides.assets ?? {}
  };
}

export function getProjectScene(
  projectDocument: ProjectDocument,
  sceneId = projectDocument.activeSceneId
): ProjectScene {
  const scene = projectDocument.scenes[sceneId];

  if (scene === undefined) {
    throw new Error(`Project scene ${sceneId} does not exist.`);
  }

  return scene;
}

export function createSceneDocumentFromProject(
  projectDocument: ProjectDocument,
  sceneId = projectDocument.activeSceneId
): SceneDocument {
  const scene = getProjectScene(projectDocument, sceneId);

  return {
    version: projectDocument.version,
    name: scene.name,
    world: scene.world,
    materials: projectDocument.materials,
    textures: projectDocument.textures,
    assets: projectDocument.assets,
    brushes: scene.brushes,
    modelInstances: scene.modelInstances,
    entities: scene.entities,
    interactionLinks: scene.interactionLinks
  };
}

export function createProjectDocumentFromSceneDocument(
  sceneDocument: SceneDocument,
  sceneId = DEFAULT_PROJECT_SCENE_ID
): ProjectDocument {
  return {
    version: SCENE_DOCUMENT_VERSION,
    activeSceneId: sceneId,
    scenes: {
      [sceneId]: {
        id: sceneId,
        name: sceneDocument.name,
        loadingScreen: createDefaultSceneLoadingScreenSettings(),
        world: sceneDocument.world,
        brushes: sceneDocument.brushes,
        modelInstances: sceneDocument.modelInstances,
        entities: sceneDocument.entities,
        interactionLinks: sceneDocument.interactionLinks
      }
    },
    materials: sceneDocument.materials,
    textures: sceneDocument.textures,
    assets: sceneDocument.assets
  };
}

export function applySceneDocumentToProject(
  projectDocument: ProjectDocument,
  sceneId: string,
  sceneDocument: SceneDocument
): ProjectDocument {
  const previousScene = getProjectScene(projectDocument, sceneId);

  return {
    ...projectDocument,
    version: SCENE_DOCUMENT_VERSION,
    materials: sceneDocument.materials,
    textures: sceneDocument.textures,
    assets: sceneDocument.assets,
    scenes: {
      ...projectDocument.scenes,
      [sceneId]: {
        ...previousScene,
        name: sceneDocument.name,
        world: sceneDocument.world,
        brushes: sceneDocument.brushes,
        modelInstances: sceneDocument.modelInstances,
        entities: sceneDocument.entities,
        interactionLinks: sceneDocument.interactionLinks
      }
    }
  };
}

export function createDefaultSceneLoadingScreenSettings(): SceneLoadingScreenSettings {
  return {
    colorHex: "#0d1117",
    headline: null,
    description: null
  };
}

export function cloneSceneLoadingScreenSettings(
  settings: SceneLoadingScreenSettings
): SceneLoadingScreenSettings {
  return {
    colorHex: settings.colorHex,
    headline: settings.headline,
    description: settings.description
  };
}

export function areSceneLoadingScreenSettingsEqual(
  left: SceneLoadingScreenSettings,
  right: SceneLoadingScreenSettings
): boolean {
  return (
    left.colorHex === right.colorHex &&
    left.headline === right.headline &&
    left.description === right.description
  );
}
