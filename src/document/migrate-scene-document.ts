import {
  createStarterMaterialRegistry,
  type MaterialDef
} from "../materials/starter-material-library";
import {
  createModelInstanceCollisionSettings,
  createModelInstance,
  isModelInstanceCollisionMode,
  normalizeModelInstanceName,
  DEFAULT_MODEL_INSTANCE_ENABLED,
  DEFAULT_MODEL_INSTANCE_VISIBLE,
  type ModelInstanceCollisionSettings,
  type ModelInstance
} from "../assets/model-instances";
import {
  isProjectAssetKind,
  type AudioAssetMetadata,
  type ImageAssetMetadata,
  type ModelAssetMetadata,
  type ProjectAssetBoundingBox,
  type ProjectAssetRecord
} from "../assets/project-assets";
import {
  DEFAULT_PLAYER_START_GAMEPAD_BINDINGS,
  DEFAULT_PLAYER_START_KEYBOARD_BINDINGS,
  createNpcAlwaysPresence,
  createNpcEntity,
  createNpcColliderSettings,
  createNpcTimeWindowPresence,
  createPlayerStartColliderSettings,
  createPlayerStartInputBindings,
  createPlayerStartMovementTemplate,
  createInteractableEntity,
  isNpcPresenceMode,
  normalizeEntityName,
  createPointLightEntity,
  createPlayerStartEntity,
  createSceneEntryEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity,
  DEFAULT_ENTITY_ENABLED,
  DEFAULT_ENTITY_VISIBLE,
  isPlayerStartColliderMode,
  isPlayerStartGamepadActionBinding,
  isPlayerStartGamepadCameraLookBinding,
  isPlayerStartGamepadBinding,
  isPlayerStartKeyboardBindingCode,
  isPlayerStartMovementTemplateKind,
  isPlayerStartNavigationMode,
  type EntityInstance,
  type NpcPresence,
  type PlayerStartGamepadActionBinding,
  type PlayerStartGamepadBinding,
  type PlayerStartGamepadCameraLookBinding,
  type PlayerStartMovementTemplateKind
} from "../entities/entity-instances";
import {
  createFollowActorPathControlEffect,
  createActorControlTargetRef,
  createActiveSceneControlTargetRef,
  createEntityControlTargetRef,
  createInteractionControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createPlayActorAnimationControlEffect,
  createPlayModelAnimationControlEffect,
  createPlaySoundControlEffect,
  createProjectGlobalControlTargetRef,
  createSetAmbientLightColorControlEffect,
  createSetAmbientLightIntensityControlEffect,
  createSetActorPresenceControlEffect,
  createSetInteractionEnabledControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightColorControlEffect,
  createSetLightIntensityControlEffect,
  createSetModelInstanceVisibleControlEffect,
  createSetSoundVolumeControlEffect,
  createSetSunLightColorControlEffect,
  createSetSunLightIntensityControlEffect,
  createSoundEmitterControlTargetRef,
  createStopModelAnimationControlEffect,
  createStopSoundControlEffect,
  isActorPathProgressMode,
  isControlEntityTargetKind,
  isControlInteractionTargetKind,
  type ControlEffect,
  type ControlTargetRef
} from "../controls/control-surface";
import {
  createControlInteractionLink,
  createPlayAnimationInteractionLink,
  createRunSequenceInteractionLink,
  createPlaySoundInteractionLink,
  createStopAnimationInteractionLink,
  createStopSoundInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink,
  isInteractionTriggerKind,
  type InteractionLink
} from "../interactions/interaction-links";
import {
  BOX_VERTEX_IDS,
  WEDGE_FACE_IDS,
  WEDGE_VERTEX_IDS,
  MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
  createBoxBrush,
  createConeBrush,
  createDefaultRadialPrismBrushGeometry,
  createDefaultConeBrushGeometry,
  createDefaultBoxBrushGeometry,
  createDefaultBoxBrushFogSettings,
  createDefaultBoxBrushLightSettings,
  createDefaultBoxBrushWaterSettings,
  createDefaultTorusBrushGeometry,
  createDefaultWedgeBrushGeometry,
  createDefaultFaceUvState,
  createRadialPrismBrush,
  createTorusBrush,
  createWedgeBrush,
  DEFAULT_BOX_BRUSH_ENABLED,
  DEFAULT_BOX_BRUSH_ROTATION_DEGREES,
  DEFAULT_BOX_BRUSH_VISIBLE,
  DEFAULT_WEDGE_BRUSH_ROTATION_DEGREES,
  getConeFaceIds,
  getConeVertexIds,
  getRadialPrismFaceIds,
  getRadialPrismVertexIds,
  getTorusFaceIds,
  getTorusVertexIds,
  isBoxBrushVolumeMode,
  isBoxBrushLightFalloffMode,
  isFaceUvRotationQuarterTurns,
  normalizeConeSideCount,
  normalizeRadialPrismSideCount,
  normalizeTorusMajorSegmentCount,
  normalizeTorusTubeSegmentCount,
  normalizeBrushName,
  type BoxBrushVolumeSettings,
  type BoxBrushFaces,
  type BrushFace,
  type FaceUvState,
  type WhiteboxFaceId,
  type WhiteboxVertexId
} from "./brushes";
import {
  BOX_BRUSH_SCENE_DOCUMENT_VERSION,
  ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION,
  AUTHORED_TERRAIN_COLLISION_SCENE_DOCUMENT_VERSION,
  AUTHORED_TERRAIN_FOUNDATION_SCENE_DOCUMENT_VERSION,
  AUTHORED_TERRAIN_PAINT_SCENE_DOCUMENT_VERSION,
  AUTHORED_OBJECT_STATE_SCENE_DOCUMENT_VERSION,
  CONTROL_SURFACE_FOUNDATION_SCENE_DOCUMENT_VERSION,
  DEFAULT_PROJECT_NAME,
  DEFAULT_PROJECT_SCENE_ID,
  SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION,
  ENTITY_NAMES_SCENE_DOCUMENT_VERSION,
  ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION,
  FACE_MATERIALS_SCENE_DOCUMENT_VERSION,
  FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION,
  FOUNDATION_SCENE_DOCUMENT_VERSION,
  IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
  LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION,
  MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION,
  MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION,
  PLAYER_START_AIR_DIRECTION_CONTROL_SCENE_DOCUMENT_VERSION,
  PLAYER_START_MOVEMENT_TEMPLATE_SCENE_DOCUMENT_VERSION,
  PROJECT_TIME_SYSTEM_SCENE_DOCUMENT_VERSION,
  PROJECT_TIME_DAY_NIGHT_PROFILE_SCENE_DOCUMENT_VERSION,
  PROJECT_TIME_NIGHT_BACKGROUND_SCENE_DOCUMENT_VERSION,
  PLAYER_START_AIR_CONTROL_SCENE_DOCUMENT_VERSION,
  PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION,
  PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION,
  PLAYER_START_PAUSE_BINDINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION,
  PATH_FOUNDATION_SCENE_DOCUMENT_VERSION,
  PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION,
  SCHEDULER_ACTOR_ROUTINE_EFFECTS_SCENE_DOCUMENT_VERSION,
  EXPANDED_CONTROL_SURFACE_SCENE_DOCUMENT_VERSION,
  FOLLOW_ACTOR_PATH_SMOOTH_SCENE_DOCUMENT_VERSION,
  NPC_DIALOGUE_REFERENCE_SCENE_DOCUMENT_VERSION,
  PROJECT_DIALOGUE_LIBRARY_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_CLIPS_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_EFFECTS_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_LIBRARY_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_TIMING_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_UNIFIED_VISIBILITY_SCENE_DOCUMENT_VERSION,
  RUNNER_V1_SCENE_DOCUMENT_VERSION,
  SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION,
  SCENE_TRANSITION_SEQUENCE_EFFECTS_SCENE_DOCUMENT_VERSION,
  SCHEDULER_CONTROL_EFFECTS_SCENE_DOCUMENT_VERSION,
  SHADER_SKY_SCENE_DOCUMENT_VERSION,
  SHADER_SKY_HORIZON_HEIGHT_SCENE_DOCUMENT_VERSION,
  SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION,
  STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION,
  PROJECT_NAME_SCENE_DOCUMENT_VERSION,
  NPC_COLLIDER_SCENE_DOCUMENT_VERSION,
  NPC_ENTITY_FOUNDATION_SCENE_DOCUMENT_VERSION,
  NPC_PRESENCE_SCENE_DOCUMENT_VERSION,
  WHITEBOX_BOX_LIGHT_VOLUME_SCENE_DOCUMENT_VERSION,
  CELESTIAL_BODY_OVERLAY_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  STATIC_SIMPLE_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
  TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION,
  RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
  WATER_SURFACE_DISPLACEMENT_SCENE_DOCUMENT_VERSION,
  DAWN_DUSK_BACKGROUND_IMAGE_SCENE_DOCUMENT_VERSION,
  WHITEBOX_PRIMITIVES_SCENE_DOCUMENT_VERSION,
  WHITEBOX_BEVEL_SCENE_DOCUMENT_VERSION,
  WHITEBOX_BOX_VOLUME_SCENE_DOCUMENT_VERSION,
  WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION,
  WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION,
  WORLD_TIME_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  cloneSceneEditorPreferences,
  createDefaultSceneEditorPreferences,
  createDefaultSceneLoadingScreenSettings,
  createProjectDocumentFromSceneDocument,
  type ProjectDocument,
  type SceneEditorPanelPreferences,
  type SceneEditorPreferences,
  type ProjectScene,
  type SceneLoadingScreenSettings,
  type SceneDocument
} from "./scene-document";
import {
  createEmptyProjectDialogueLibrary,
  createProjectDialogue,
  createProjectDialogueLine,
  type ProjectDialogue,
  type ProjectDialogueLibrary
} from "../dialogues/project-dialogues";
import {
  createEmptyProjectSequenceLibrary,
  createProjectSequence,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";
import { type SequenceClip } from "../sequencer/project-sequence-steps";
import {
  createScenePath,
  createScenePathPoint,
  type ScenePath,
  type ScenePathPoint
} from "./paths";
import {
  createTerrain,
  normalizeTerrainCellSize,
  normalizeTerrainName,
  normalizeTerrainSampleCount,
  type Terrain
} from "./terrains";
import {
  createDefaultProjectTimeSettings,
  normalizeProjectStartDayNumber,
  normalizeTimeOfDayHours,
  type ProjectTimeSettings
} from "./project-time-settings";
import {
  createEmptyProjectScheduler,
  createProjectScheduleEveryDaySelection,
  createProjectScheduleRoutine,
  type ProjectScheduler
} from "../scheduler/project-scheduler";
import {
  cloneWorldBackgroundSettings,
  createDefaultWorldTimeOfDaySettings,
  createDefaultWorldTimePhaseProfile,
  createDefaultWorldShaderSkySettings,
  DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY,
  isAdvancedRenderingWaterReflectionMode,
  createDefaultAdvancedRenderingSettings,
  isBoxVolumeRenderPath,
  isAdvancedRenderingShadowMapSize,
  isAdvancedRenderingShadowType,
  isAdvancedRenderingToneMappingMode,
  isWorldBackgroundMode,
  isWorldShaderSkyPresetId,
  type WorldShaderSkySettings,
  type AdvancedRenderingSettings,
  type WorldBackgroundSettings,
  type WorldTimeOfDaySettings,
  type WorldTimePhaseProfile,
  type WorldSettings
} from "./world-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function expectNonNegativeFiniteNumber(value: unknown, label: string): number {
  const numberValue = expectFiniteNumber(value, label);

  if (numberValue < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return numberValue;
}

function expectPositiveFiniteNumber(value: unknown, label: string): number {
  const numberValue = expectFiniteNumber(value, label);

  if (numberValue <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return numberValue;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  return value;
}

function readOptionalSceneLoadingText(
  value: unknown,
  label: string
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = expectString(value, label).trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function readOptionalDialogueResourceId(
  value: unknown,
  label: string
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const dialogueId = expectString(value, label).trim();
  return dialogueId.length === 0 ? null : dialogueId;
}

function readNpcDialogues(
  value: unknown,
  label: string,
  _legacyProjectDialogues: ProjectDialogueLibrary
): ProjectDialogue[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value.map((dialogueValue, dialogueIndex) => {
    if (!isRecord(dialogueValue)) {
      throw new Error(`${label}.${dialogueIndex} must be an object.`);
    }

    const linesValue = dialogueValue.lines;

    if (!Array.isArray(linesValue)) {
      throw new Error(`${label}.${dialogueIndex}.lines must be an array.`);
    }

    return createProjectDialogue({
      id: expectString(dialogueValue.id, `${label}.${dialogueIndex}.id`),
      title: expectString(
        dialogueValue.title,
        `${label}.${dialogueIndex}.title`
      ),
      lines: linesValue.map((lineValue, lineIndex) => {
        if (!isRecord(lineValue)) {
          throw new Error(
            `${label}.${dialogueIndex}.lines.${lineIndex} must be an object.`
          );
        }

        return createProjectDialogueLine({
          id: expectString(
            lineValue.id,
            `${label}.${dialogueIndex}.lines.${lineIndex}.id`
          ),
          text: expectString(
            lineValue.text,
            `${label}.${dialogueIndex}.lines.${lineIndex}.text`
          )
        });
      })
    });
  });
}

function readSceneLoadingScreen(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): SceneLoadingScreenSettings {
  if (value === undefined && options.allowMissing) {
    return createDefaultSceneLoadingScreenSettings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    colorHex: expectString(value.colorHex, `${label}.colorHex`),
    headline: readOptionalSceneLoadingText(value.headline, `${label}.headline`),
    description: readOptionalSceneLoadingText(
      value.description,
      `${label}.description`
    )
  };
}

function readSceneEditorPanelPreferences(
  value: unknown,
  label: string
): SceneEditorPanelPreferences {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const viewMode = expectString(value.viewMode, `${label}.viewMode`);
  const displayMode = expectString(value.displayMode, `${label}.displayMode`);

  if (
    viewMode !== "perspective" &&
    viewMode !== "top" &&
    viewMode !== "front" &&
    viewMode !== "side"
  ) {
    throw new Error(
      `${label}.viewMode must be a supported viewport view mode.`
    );
  }

  if (
    displayMode !== "normal" &&
    displayMode !== "authoring" &&
    displayMode !== "wireframe"
  ) {
    throw new Error(
      `${label}.displayMode must be a supported viewport display mode.`
    );
  }

  return {
    viewMode,
    displayMode
  };
}

function readSceneEditorPreferences(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): SceneEditorPreferences {
  if (value === undefined && options.allowMissing) {
    return createDefaultSceneEditorPreferences();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const whiteboxSelectionMode = expectString(
    value.whiteboxSelectionMode,
    `${label}.whiteboxSelectionMode`
  );
  const viewportLayoutMode = expectString(
    value.viewportLayoutMode,
    `${label}.viewportLayoutMode`
  );
  const activeViewportPanelId = expectString(
    value.activeViewportPanelId,
    `${label}.activeViewportPanelId`
  );

  if (
    whiteboxSelectionMode !== "object" &&
    whiteboxSelectionMode !== "face" &&
    whiteboxSelectionMode !== "edge" &&
    whiteboxSelectionMode !== "vertex"
  ) {
    throw new Error(
      `${label}.whiteboxSelectionMode must be a supported whitebox selection mode.`
    );
  }

  if (viewportLayoutMode !== "single" && viewportLayoutMode !== "quad") {
    throw new Error(
      `${label}.viewportLayoutMode must be a supported viewport layout mode.`
    );
  }

  if (
    activeViewportPanelId !== "topLeft" &&
    activeViewportPanelId !== "topRight" &&
    activeViewportPanelId !== "bottomLeft" &&
    activeViewportPanelId !== "bottomRight"
  ) {
    throw new Error(
      `${label}.activeViewportPanelId must be a supported viewport panel id.`
    );
  }

  const defaultPreferences = createDefaultSceneEditorPreferences();

  return cloneSceneEditorPreferences({
    whiteboxSelectionMode,
    whiteboxSnapEnabled: expectBoolean(
      value.whiteboxSnapEnabled,
      `${label}.whiteboxSnapEnabled`
    ),
    whiteboxSnapStep: expectPositiveFiniteNumber(
      value.whiteboxSnapStep,
      `${label}.whiteboxSnapStep`
    ),
    viewportGridVisible: expectBoolean(
      value.viewportGridVisible,
      `${label}.viewportGridVisible`
    ),
    viewportLayoutMode,
    activeViewportPanelId,
    viewportQuadSplit: isRecord(value.viewportQuadSplit)
      ? {
          x: expectFiniteNumber(
            value.viewportQuadSplit.x,
            `${label}.viewportQuadSplit.x`
          ),
          y: expectFiniteNumber(
            value.viewportQuadSplit.y,
            `${label}.viewportQuadSplit.y`
          )
        }
      : { ...defaultPreferences.viewportQuadSplit },
    viewportPanels: isRecord(value.viewportPanels)
      ? {
          topLeft: readSceneEditorPanelPreferences(
            value.viewportPanels.topLeft,
            `${label}.viewportPanels.topLeft`
          ),
          topRight: readSceneEditorPanelPreferences(
            value.viewportPanels.topRight,
            `${label}.viewportPanels.topRight`
          ),
          bottomLeft: readSceneEditorPanelPreferences(
            value.viewportPanels.bottomLeft,
            `${label}.viewportPanels.bottomLeft`
          ),
          bottomRight: readSceneEditorPanelPreferences(
            value.viewportPanels.bottomRight,
            `${label}.viewportPanels.bottomRight`
          )
        }
      : defaultPreferences.viewportPanels
  });
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

function expectStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new Error(`${label} must be a string array.`);
  }

  return [...value];
}

function expectHexColor(value: unknown, label: string): string {
  const normalizedValue = expectString(value, label);

  if (!/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
    throw new Error(`${label} must use #RRGGBB format.`);
  }

  return normalizedValue;
}

function expectLiteralString<T extends string>(
  value: unknown,
  expectedValue: T,
  label: string
): T {
  if (value !== expectedValue) {
    throw new Error(`${label} must be ${expectedValue}.`);
  }

  return expectedValue;
}

function readOptionalBoolean(
  value: unknown,
  label: string,
  fallback: boolean
): boolean {
  if (value === undefined) {
    return fallback;
  }

  return expectBoolean(value, label);
}

function readOptionalFiniteNumber(
  value: unknown,
  label: string,
  fallback: number
): number {
  if (value === undefined) {
    return fallback;
  }

  return expectFiniteNumber(value, label);
}

function readOptionalNonNegativeFiniteNumber(
  value: unknown,
  label: string,
  fallback: number
): number {
  if (value === undefined) {
    return fallback;
  }

  return expectNonNegativeFiniteNumber(value, label);
}

function readOptionalPositiveFiniteNumber(
  value: unknown,
  label: string,
  fallback: number
): number {
  if (value === undefined) {
    return fallback;
  }

  return expectPositiveFiniteNumber(value, label);
}

function readOptionalPositiveInteger(
  value: unknown,
  label: string,
  fallback: number
): number {
  if (value === undefined) {
    return fallback;
  }

  const integerValue = expectFiniteNumber(value, label);

  if (!Number.isInteger(integerValue) || integerValue <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return integerValue;
}

function readOptionalPositiveIntegerWithMax(
  value: unknown,
  label: string,
  fallback: number,
  max: number
): number {
  return Math.min(readOptionalPositiveInteger(value, label, fallback), max);
}

function readOptionalAllowedValue<T>(
  value: unknown,
  label: string,
  fallback: T,
  guard: (candidate: unknown) => candidate is T
): T {
  if (value === undefined) {
    return fallback;
  }

  if (!guard(value)) {
    throw new Error(`${label} must be a supported value.`);
  }

  return value;
}

function readAdvancedRenderingSettings(
  value: unknown
): AdvancedRenderingSettings {
  const defaults = createDefaultAdvancedRenderingSettings();

  if (value === undefined) {
    return defaults;
  }

  if (!isRecord(value)) {
    throw new Error("world.advancedRendering must be an object.");
  }

  if (value.shadows !== undefined && !isRecord(value.shadows)) {
    throw new Error("world.advancedRendering.shadows must be an object.");
  }

  if (
    value.ambientOcclusion !== undefined &&
    !isRecord(value.ambientOcclusion)
  ) {
    throw new Error(
      "world.advancedRendering.ambientOcclusion must be an object."
    );
  }

  if (value.bloom !== undefined && !isRecord(value.bloom)) {
    throw new Error("world.advancedRendering.bloom must be an object.");
  }

  if (value.toneMapping !== undefined && !isRecord(value.toneMapping)) {
    throw new Error("world.advancedRendering.toneMapping must be an object.");
  }

  if (value.depthOfField !== undefined && !isRecord(value.depthOfField)) {
    throw new Error("world.advancedRendering.depthOfField must be an object.");
  }

  if (value.whiteboxBevel !== undefined && !isRecord(value.whiteboxBevel)) {
    throw new Error("world.advancedRendering.whiteboxBevel must be an object.");
  }

  const shadows = value.shadows as Record<string, unknown> | undefined;
  const ambientOcclusion = value.ambientOcclusion as
    | Record<string, unknown>
    | undefined;
  const bloom = value.bloom as Record<string, unknown> | undefined;
  const toneMapping = value.toneMapping as Record<string, unknown> | undefined;
  const depthOfField = value.depthOfField as
    | Record<string, unknown>
    | undefined;
  const whiteboxBevel = value.whiteboxBevel as
    | Record<string, unknown>
    | undefined;

  const shadowsMapSize = readOptionalAllowedValue(
    shadows?.mapSize,
    "world.advancedRendering.shadows.mapSize",
    defaults.shadows.mapSize,
    isAdvancedRenderingShadowMapSize
  );
  const shadowsType = readOptionalAllowedValue(
    shadows?.type,
    "world.advancedRendering.shadows.type",
    defaults.shadows.type,
    isAdvancedRenderingShadowType
  );
  const toneMappingMode = readOptionalAllowedValue(
    toneMapping?.mode,
    "world.advancedRendering.toneMapping.mode",
    defaults.toneMapping.mode,
    isAdvancedRenderingToneMappingMode
  );
  const fogPath = readOptionalAllowedValue(
    value.fogPath,
    "world.advancedRendering.fogPath",
    defaults.fogPath,
    isBoxVolumeRenderPath
  );
  const waterPath = readOptionalAllowedValue(
    value.waterPath,
    "world.advancedRendering.waterPath",
    defaults.waterPath,
    isBoxVolumeRenderPath
  );
  const waterReflectionMode = readOptionalAllowedValue(
    value.waterReflectionMode,
    "world.advancedRendering.waterReflectionMode",
    defaults.waterReflectionMode,
    isAdvancedRenderingWaterReflectionMode
  );

  return {
    enabled: readOptionalBoolean(
      value.enabled,
      "world.advancedRendering.enabled",
      defaults.enabled
    ),
    shadows: {
      enabled: readOptionalBoolean(
        shadows?.enabled,
        "world.advancedRendering.shadows.enabled",
        defaults.shadows.enabled
      ),
      mapSize: shadowsMapSize,
      type: shadowsType,
      bias: readOptionalFiniteNumber(
        shadows?.bias,
        "world.advancedRendering.shadows.bias",
        defaults.shadows.bias
      )
    },
    ambientOcclusion: {
      enabled: readOptionalBoolean(
        ambientOcclusion?.enabled,
        "world.advancedRendering.ambientOcclusion.enabled",
        defaults.ambientOcclusion.enabled
      ),
      intensity: readOptionalNonNegativeFiniteNumber(
        ambientOcclusion?.intensity,
        "world.advancedRendering.ambientOcclusion.intensity",
        defaults.ambientOcclusion.intensity
      ),
      radius: readOptionalNonNegativeFiniteNumber(
        ambientOcclusion?.radius,
        "world.advancedRendering.ambientOcclusion.radius",
        defaults.ambientOcclusion.radius
      ),
      samples: readOptionalPositiveInteger(
        ambientOcclusion?.samples,
        "world.advancedRendering.ambientOcclusion.samples",
        defaults.ambientOcclusion.samples
      )
    },
    bloom: {
      enabled: readOptionalBoolean(
        bloom?.enabled,
        "world.advancedRendering.bloom.enabled",
        defaults.bloom.enabled
      ),
      intensity: readOptionalNonNegativeFiniteNumber(
        bloom?.intensity,
        "world.advancedRendering.bloom.intensity",
        defaults.bloom.intensity
      ),
      threshold: readOptionalNonNegativeFiniteNumber(
        bloom?.threshold,
        "world.advancedRendering.bloom.threshold",
        defaults.bloom.threshold
      ),
      radius: readOptionalNonNegativeFiniteNumber(
        bloom?.radius,
        "world.advancedRendering.bloom.radius",
        defaults.bloom.radius
      )
    },
    toneMapping: {
      mode: toneMappingMode,
      exposure: readOptionalFiniteNumber(
        toneMapping?.exposure,
        "world.advancedRendering.toneMapping.exposure",
        defaults.toneMapping.exposure
      )
    },
    depthOfField: {
      enabled: readOptionalBoolean(
        depthOfField?.enabled,
        "world.advancedRendering.depthOfField.enabled",
        defaults.depthOfField.enabled
      ),
      focusDistance: readOptionalNonNegativeFiniteNumber(
        depthOfField?.focusDistance,
        "world.advancedRendering.depthOfField.focusDistance",
        defaults.depthOfField.focusDistance
      ),
      focalLength: readOptionalNonNegativeFiniteNumber(
        depthOfField?.focalLength,
        "world.advancedRendering.depthOfField.focalLength",
        defaults.depthOfField.focalLength
      ),
      bokehScale: readOptionalNonNegativeFiniteNumber(
        depthOfField?.bokehScale,
        "world.advancedRendering.depthOfField.bokehScale",
        defaults.depthOfField.bokehScale
      )
    },
    whiteboxBevel: {
      enabled: readOptionalBoolean(
        whiteboxBevel?.enabled,
        "world.advancedRendering.whiteboxBevel.enabled",
        defaults.whiteboxBevel.enabled
      ),
      edgeWidth: readOptionalNonNegativeFiniteNumber(
        whiteboxBevel?.edgeWidth,
        "world.advancedRendering.whiteboxBevel.edgeWidth",
        defaults.whiteboxBevel.edgeWidth
      ),
      normalStrength: readOptionalNonNegativeFiniteNumber(
        whiteboxBevel?.normalStrength,
        "world.advancedRendering.whiteboxBevel.normalStrength",
        defaults.whiteboxBevel.normalStrength
      )
    },
    fogPath,
    waterPath,
    waterReflectionMode
  };
}

function readProjectTimeSettings(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): ProjectTimeSettings {
  if (value === undefined && options.allowMissing) {
    return createDefaultProjectTimeSettings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const defaults = createDefaultProjectTimeSettings();

  return {
    startDayNumber: normalizeProjectStartDayNumber(
      readOptionalPositiveFiniteNumber(
        value.startDayNumber,
        `${label}.startDayNumber`,
        defaults.startDayNumber
      )
    ),
    startTimeOfDayHours: normalizeTimeOfDayHours(
      readOptionalFiniteNumber(
        value.startTimeOfDayHours,
        `${label}.startTimeOfDayHours`,
        defaults.startTimeOfDayHours
      )
    ),
    dayLengthMinutes: readOptionalPositiveFiniteNumber(
      value.dayLengthMinutes,
      `${label}.dayLengthMinutes`,
      defaults.dayLengthMinutes
    ),
    sunriseTimeOfDayHours: normalizeTimeOfDayHours(
      readOptionalFiniteNumber(
        value.sunriseTimeOfDayHours,
        `${label}.sunriseTimeOfDayHours`,
        defaults.sunriseTimeOfDayHours
      )
    ),
    sunsetTimeOfDayHours: normalizeTimeOfDayHours(
      readOptionalFiniteNumber(
        value.sunsetTimeOfDayHours,
        `${label}.sunsetTimeOfDayHours`,
        defaults.sunsetTimeOfDayHours
      )
    ),
    dawnDurationHours: readOptionalPositiveFiniteNumber(
      value.dawnDurationHours,
      `${label}.dawnDurationHours`,
      defaults.dawnDurationHours
    ),
    duskDurationHours: readOptionalPositiveFiniteNumber(
      value.duskDurationHours,
      `${label}.duskDurationHours`,
      defaults.duskDurationHours
    )
  };
}

function expectOptionalString(
  value: unknown,
  label: string
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return expectString(value, label);
}

function readProjectAssetBoundingBox(
  value: unknown,
  label: string
): ProjectAssetBoundingBox {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    min: readVec3(value.min, `${label}.min`),
    max: readVec3(value.max, `${label}.max`),
    size: readVec3(value.size, `${label}.size`)
  };
}

function readOptionalBrushName(
  value: unknown,
  label: string
): string | undefined {
  return normalizeBrushName(expectOptionalString(value, label));
}

function readOptionalEntityName(
  value: unknown,
  label: string
): string | undefined {
  return normalizeEntityName(expectOptionalString(value, label));
}

function readBoxBrushVolumeSettings(
  value: unknown,
  label: string
): BoxBrushVolumeSettings {
  if (value === undefined) {
    return {
      mode: "none"
    };
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const mode = readOptionalAllowedValue(
    value.mode,
    `${label}.mode`,
    "none",
    isBoxBrushVolumeMode
  );

  if (mode === "none") {
    return {
      mode: "none"
    };
  }

  if (mode === "water") {
    const defaults = createDefaultBoxBrushWaterSettings();

    if (value.water !== undefined && !isRecord(value.water)) {
      throw new Error(`${label}.water must be an object.`);
    }

    const water = (value.water ?? {}) as Record<string, unknown>;

    return {
      mode: "water",
      water: {
        colorHex:
          water.colorHex === undefined
            ? defaults.colorHex
            : expectHexColor(water.colorHex, `${label}.water.colorHex`),
        surfaceOpacity: readOptionalNonNegativeFiniteNumber(
          water.surfaceOpacity,
          `${label}.water.surfaceOpacity`,
          defaults.surfaceOpacity
        ),
        waveStrength: readOptionalNonNegativeFiniteNumber(
          water.waveStrength,
          `${label}.water.waveStrength`,
          defaults.waveStrength
        ),
        foamContactLimit: readOptionalPositiveIntegerWithMax(
          water.foamContactLimit,
          `${label}.water.foamContactLimit`,
          defaults.foamContactLimit,
          MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT
        ),
        surfaceDisplacementEnabled: readOptionalBoolean(
          water.surfaceDisplacementEnabled,
          `${label}.water.surfaceDisplacementEnabled`,
          defaults.surfaceDisplacementEnabled
        )
      }
    };
  }

  if (mode === "fog") {
    const defaults = createDefaultBoxBrushFogSettings();

    if (value.fog !== undefined && !isRecord(value.fog)) {
      throw new Error(`${label}.fog must be an object.`);
    }

    const fog = (value.fog ?? {}) as Record<string, unknown>;

    return {
      mode: "fog",
      fog: {
        colorHex:
          fog.colorHex === undefined
            ? defaults.colorHex
            : expectHexColor(fog.colorHex, `${label}.fog.colorHex`),
        density: readOptionalNonNegativeFiniteNumber(
          fog.density,
          `${label}.fog.density`,
          defaults.density
        ),
        padding: readOptionalNonNegativeFiniteNumber(
          fog.padding,
          `${label}.fog.padding`,
          defaults.padding
        )
      }
    };
  }

  const defaults = createDefaultBoxBrushLightSettings();

  if (value.light !== undefined && !isRecord(value.light)) {
    throw new Error(`${label}.light must be an object.`);
  }

  const light = (value.light ?? {}) as Record<string, unknown>;

  return {
    mode: "light",
    light: {
      colorHex:
        light.colorHex === undefined
          ? defaults.colorHex
          : expectHexColor(light.colorHex, `${label}.light.colorHex`),
      intensity: readOptionalNonNegativeFiniteNumber(
        light.intensity,
        `${label}.light.intensity`,
        defaults.intensity
      ),
      padding: readOptionalNonNegativeFiniteNumber(
        light.padding,
        `${label}.light.padding`,
        defaults.padding
      ),
      falloff: readOptionalAllowedValue(
        light.falloff,
        `${label}.light.falloff`,
        defaults.falloff,
        isBoxBrushLightFalloffMode
      )
    }
  };
}

function expectEmptyCollection<T extends Record<string, unknown>>(
  value: unknown,
  label: string
): T {
  if (value === undefined) {
    return {} as T;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (Object.keys(value).length > 0) {
    throw new Error(`${label} must be empty.`);
  }

  return value as T;
}

function readModelAssetMetadata(
  value: unknown,
  label: string
): ModelAssetMetadata {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const format = expectString(value.format, `${label}.format`);

  if (format !== "glb" && format !== "gltf") {
    throw new Error(`${label}.format must be glb or gltf.`);
  }

  const sceneName =
    value.sceneName === null
      ? null
      : (expectOptionalString(value.sceneName, `${label}.sceneName`) ?? null);

  return {
    kind: "model",
    format,
    sceneName,
    nodeCount: expectNonNegativeFiniteNumber(
      value.nodeCount,
      `${label}.nodeCount`
    ),
    meshCount: expectNonNegativeFiniteNumber(
      value.meshCount,
      `${label}.meshCount`
    ),
    materialNames: expectStringArray(
      value.materialNames,
      `${label}.materialNames`
    ),
    textureNames: expectStringArray(
      value.textureNames,
      `${label}.textureNames`
    ),
    animationNames: expectStringArray(
      value.animationNames,
      `${label}.animationNames`
    ),
    boundingBox:
      value.boundingBox === null
        ? null
        : readProjectAssetBoundingBox(
            value.boundingBox,
            `${label}.boundingBox`
          ),
    warnings: expectStringArray(value.warnings, `${label}.warnings`)
  };
}

function readImageAssetMetadata(
  value: unknown,
  label: string
): ImageAssetMetadata {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    kind: "image",
    width: expectPositiveFiniteNumber(value.width, `${label}.width`),
    height: expectPositiveFiniteNumber(value.height, `${label}.height`),
    hasAlpha: expectBoolean(value.hasAlpha, `${label}.hasAlpha`),
    warnings: expectStringArray(value.warnings, `${label}.warnings`)
  };
}

function readAudioAssetMetadata(
  value: unknown,
  label: string
): AudioAssetMetadata {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    kind: "audio",
    durationSeconds:
      value.durationSeconds === null
        ? null
        : expectNonNegativeFiniteNumber(
            value.durationSeconds,
            `${label}.durationSeconds`
          ),
    channelCount:
      value.channelCount === null
        ? null
        : expectPositiveFiniteNumber(
            value.channelCount,
            `${label}.channelCount`
          ),
    sampleRateHz:
      value.sampleRateHz === null
        ? null
        : expectPositiveFiniteNumber(
            value.sampleRateHz,
            `${label}.sampleRateHz`
          ),
    warnings: expectStringArray(value.warnings, `${label}.warnings`)
  };
}

function readProjectAsset(value: unknown, label: string): ProjectAssetRecord {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = value.kind;

  if (!isProjectAssetKind(kind)) {
    throw new Error(`${label}.kind must be model, image, or audio.`);
  }

  const id = expectString(value.id, `${label}.id`);
  const sourceName = expectString(value.sourceName, `${label}.sourceName`);
  const mimeType = expectString(value.mimeType, `${label}.mimeType`);
  const storageKey = expectString(value.storageKey, `${label}.storageKey`);
  const byteLength = expectPositiveFiniteNumber(
    value.byteLength,
    `${label}.byteLength`
  );

  switch (kind) {
    case "model":
      return {
        id,
        kind,
        sourceName,
        mimeType,
        storageKey,
        byteLength,
        metadata: readModelAssetMetadata(value.metadata, `${label}.metadata`)
      };
    case "image":
      return {
        id,
        kind,
        sourceName,
        mimeType,
        storageKey,
        byteLength,
        metadata: readImageAssetMetadata(value.metadata, `${label}.metadata`)
      };
    case "audio":
      return {
        id,
        kind,
        sourceName,
        mimeType,
        storageKey,
        byteLength,
        metadata: readAudioAssetMetadata(value.metadata, `${label}.metadata`)
      };
  }
}

function readAssets(value: unknown): SceneDocument["assets"] {
  if (!isRecord(value)) {
    throw new Error("assets must be a record.");
  }

  const assets: SceneDocument["assets"] = {};

  for (const [assetId, assetValue] of Object.entries(value)) {
    const asset = readProjectAsset(assetValue, `assets.${assetId}`);

    if (asset.id !== assetId) {
      throw new Error(`assets.${assetId}.id must match the registry key.`);
    }

    assets[assetId] = asset;
  }

  return assets;
}

function readModelInstanceCollisionSettings(
  value: unknown,
  label: string
): ModelInstanceCollisionSettings {
  if (value === undefined) {
    return createModelInstanceCollisionSettings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const mode = readOptionalAllowedValue(
    value.mode,
    `${label}.mode`,
    "none",
    isModelInstanceCollisionMode
  );

  return createModelInstanceCollisionSettings({
    mode,
    visible: readOptionalBoolean(value.visible, `${label}.visible`, false)
  });
}

function readPlayerStartColliderSettings(value: unknown, label: string) {
  if (value === undefined) {
    return createPlayerStartColliderSettings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const mode = readOptionalAllowedValue(
    value.mode,
    `${label}.mode`,
    "capsule",
    (candidate): candidate is "capsule" | "box" | "none" =>
      typeof candidate === "string" && isPlayerStartColliderMode(candidate)
  );

  return createPlayerStartColliderSettings({
    mode,
    eyeHeight:
      value.eyeHeight === undefined
        ? undefined
        : expectPositiveFiniteNumber(value.eyeHeight, `${label}.eyeHeight`),
    capsuleRadius:
      value.capsuleRadius === undefined
        ? undefined
        : expectPositiveFiniteNumber(
            value.capsuleRadius,
            `${label}.capsuleRadius`
          ),
    capsuleHeight:
      value.capsuleHeight === undefined
        ? undefined
        : expectPositiveFiniteNumber(
            value.capsuleHeight,
            `${label}.capsuleHeight`
          ),
    boxSize:
      value.boxSize === undefined
        ? undefined
        : readVec3(value.boxSize, `${label}.boxSize`)
  });
}

function readNpcColliderSettings(value: unknown, label: string) {
  if (value === undefined) {
    return createNpcColliderSettings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const mode = readOptionalAllowedValue(
    value.mode,
    `${label}.mode`,
    "capsule",
    (candidate): candidate is "capsule" | "box" | "none" =>
      typeof candidate === "string" && isPlayerStartColliderMode(candidate)
  );

  return createNpcColliderSettings({
    mode,
    eyeHeight:
      value.eyeHeight === undefined
        ? undefined
        : expectPositiveFiniteNumber(value.eyeHeight, `${label}.eyeHeight`),
    capsuleRadius:
      value.capsuleRadius === undefined
        ? undefined
        : expectPositiveFiniteNumber(
            value.capsuleRadius,
            `${label}.capsuleRadius`
          ),
    capsuleHeight:
      value.capsuleHeight === undefined
        ? undefined
        : expectPositiveFiniteNumber(
            value.capsuleHeight,
            `${label}.capsuleHeight`
          ),
    boxSize:
      value.boxSize === undefined
        ? undefined
        : readVec3(value.boxSize, `${label}.boxSize`)
  });
}

function readPlayerStartNavigationMode(value: unknown, label: string) {
  return readOptionalAllowedValue(
    value,
    label,
    "firstPerson",
    (candidate): candidate is "firstPerson" | "thirdPerson" =>
      typeof candidate === "string" && isPlayerStartNavigationMode(candidate)
  );
}

function readPlayerStartKeyboardBindingCode(
  value: unknown,
  label: string,
  fallback: (typeof DEFAULT_PLAYER_START_KEYBOARD_BINDINGS)[keyof typeof DEFAULT_PLAYER_START_KEYBOARD_BINDINGS]
) {
  return readOptionalAllowedValue(
    value,
    label,
    fallback,
    (candidate): candidate is typeof fallback =>
      typeof candidate === "string" &&
      isPlayerStartKeyboardBindingCode(candidate)
  );
}

function readPlayerStartGamepadBinding(
  value: unknown,
  label: string,
  fallback: PlayerStartGamepadBinding
): PlayerStartGamepadBinding {
  return readOptionalAllowedValue<PlayerStartGamepadBinding>(
    value,
    label,
    fallback,
    (candidate): candidate is typeof fallback =>
      typeof candidate === "string" && isPlayerStartGamepadBinding(candidate)
  );
}

function readPlayerStartGamepadActionBinding(
  value: unknown,
  label: string,
  fallback: PlayerStartGamepadActionBinding
): PlayerStartGamepadActionBinding {
  return readOptionalAllowedValue<PlayerStartGamepadActionBinding>(
    value,
    label,
    fallback,
    (candidate): candidate is typeof fallback =>
      typeof candidate === "string" &&
      isPlayerStartGamepadActionBinding(candidate)
  );
}

function readPlayerStartGamepadCameraLookBinding(
  value: unknown,
  label: string,
  fallback: PlayerStartGamepadCameraLookBinding
): PlayerStartGamepadCameraLookBinding {
  return readOptionalAllowedValue<PlayerStartGamepadCameraLookBinding>(
    value,
    label,
    fallback,
    (candidate): candidate is typeof fallback =>
      typeof candidate === "string" &&
      isPlayerStartGamepadCameraLookBinding(candidate)
  );
}

function readPlayerStartInputBindings(value: unknown, label: string) {
  if (value === undefined) {
    return createPlayerStartInputBindings();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const keyboard = value.keyboard;
  const gamepad = value.gamepad;

  if (keyboard !== undefined && !isRecord(keyboard)) {
    throw new Error(`${label}.keyboard must be an object.`);
  }

  if (gamepad !== undefined && !isRecord(gamepad)) {
    throw new Error(`${label}.gamepad must be an object.`);
  }

  return createPlayerStartInputBindings({
    keyboard: {
      moveForward: readPlayerStartKeyboardBindingCode(
        keyboard?.moveForward,
        `${label}.keyboard.moveForward`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveForward
      ),
      moveBackward: readPlayerStartKeyboardBindingCode(
        keyboard?.moveBackward,
        `${label}.keyboard.moveBackward`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveBackward
      ),
      moveLeft: readPlayerStartKeyboardBindingCode(
        keyboard?.moveLeft,
        `${label}.keyboard.moveLeft`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveLeft
      ),
      moveRight: readPlayerStartKeyboardBindingCode(
        keyboard?.moveRight,
        `${label}.keyboard.moveRight`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveRight
      ),
      jump: readPlayerStartKeyboardBindingCode(
        keyboard?.jump,
        `${label}.keyboard.jump`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.jump
      ),
      sprint: readPlayerStartKeyboardBindingCode(
        keyboard?.sprint,
        `${label}.keyboard.sprint`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.sprint
      ),
      crouch: readPlayerStartKeyboardBindingCode(
        keyboard?.crouch,
        `${label}.keyboard.crouch`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.crouch
      ),
      pauseTime: readPlayerStartKeyboardBindingCode(
        keyboard?.pauseTime,
        `${label}.keyboard.pauseTime`,
        DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.pauseTime
      )
    },
    gamepad: {
      moveForward: readPlayerStartGamepadBinding(
        gamepad?.moveForward,
        `${label}.gamepad.moveForward`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveForward
      ),
      moveBackward: readPlayerStartGamepadBinding(
        gamepad?.moveBackward,
        `${label}.gamepad.moveBackward`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveBackward
      ),
      moveLeft: readPlayerStartGamepadBinding(
        gamepad?.moveLeft,
        `${label}.gamepad.moveLeft`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveLeft
      ),
      moveRight: readPlayerStartGamepadBinding(
        gamepad?.moveRight,
        `${label}.gamepad.moveRight`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveRight
      ),
      jump: readPlayerStartGamepadActionBinding(
        gamepad?.jump,
        `${label}.gamepad.jump`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.jump
      ),
      sprint: readPlayerStartGamepadActionBinding(
        gamepad?.sprint,
        `${label}.gamepad.sprint`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.sprint
      ),
      crouch: readPlayerStartGamepadActionBinding(
        gamepad?.crouch,
        `${label}.gamepad.crouch`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.crouch
      ),
      pauseTime: readPlayerStartGamepadActionBinding(
        gamepad?.pauseTime,
        `${label}.gamepad.pauseTime`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.pauseTime
      ),
      cameraLook: readPlayerStartGamepadCameraLookBinding(
        gamepad?.cameraLook,
        `${label}.gamepad.cameraLook`,
        DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.cameraLook
      )
    }
  });
}

function readPlayerStartMovementTemplate(value: unknown, label: string) {
  if (value === undefined) {
    return createPlayerStartMovementTemplate();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = readOptionalAllowedValue(
    value.kind,
    `${label}.kind`,
    "default",
    (candidate): candidate is PlayerStartMovementTemplateKind =>
      typeof candidate === "string" &&
      isPlayerStartMovementTemplateKind(candidate)
  );
  const preset = createPlayerStartMovementTemplate({ kind });
  const capabilities = value.capabilities;
  const jump = value.jump;
  const sprint = value.sprint;
  const crouch = value.crouch;

  if (capabilities !== undefined && !isRecord(capabilities)) {
    throw new Error(`${label}.capabilities must be an object.`);
  }

  if (jump !== undefined && !isRecord(jump)) {
    throw new Error(`${label}.jump must be an object.`);
  }

  if (sprint !== undefined && !isRecord(sprint)) {
    throw new Error(`${label}.sprint must be an object.`);
  }

  if (crouch !== undefined && !isRecord(crouch)) {
    throw new Error(`${label}.crouch must be an object.`);
  }

  return createPlayerStartMovementTemplate({
    kind,
    moveSpeed:
      value.moveSpeed === undefined
        ? undefined
        : expectPositiveFiniteNumber(value.moveSpeed, `${label}.moveSpeed`),
    maxSpeed:
      value.maxSpeed === undefined
        ? preset.maxSpeed
        : expectNonNegativeFiniteNumber(value.maxSpeed, `${label}.maxSpeed`),
    maxStepHeight:
      value.maxStepHeight === undefined
        ? preset.maxStepHeight
        : expectNonNegativeFiniteNumber(
            value.maxStepHeight,
            `${label}.maxStepHeight`
          ),
    capabilities: {
      jump: readOptionalBoolean(
        capabilities?.jump,
        `${label}.capabilities.jump`,
        preset.capabilities.jump
      ),
      sprint: readOptionalBoolean(
        capabilities?.sprint,
        `${label}.capabilities.sprint`,
        preset.capabilities.sprint
      ),
      crouch: readOptionalBoolean(
        capabilities?.crouch,
        `${label}.capabilities.crouch`,
        preset.capabilities.crouch
      )
    },
    jump: {
      speed:
        jump?.speed === undefined
          ? preset.jump.speed
          : expectPositiveFiniteNumber(jump.speed, `${label}.jump.speed`),
      bufferMs:
        jump?.bufferMs === undefined
          ? preset.jump.bufferMs
          : expectNonNegativeFiniteNumber(
              jump.bufferMs,
              `${label}.jump.bufferMs`
            ),
      coyoteTimeMs:
        jump?.coyoteTimeMs === undefined
          ? preset.jump.coyoteTimeMs
          : expectNonNegativeFiniteNumber(
              jump.coyoteTimeMs,
              `${label}.jump.coyoteTimeMs`
            ),
      variableHeight: readOptionalBoolean(
        jump?.variableHeight,
        `${label}.jump.variableHeight`,
        preset.jump.variableHeight
      ),
      moveWhileJumping: readOptionalBoolean(
        jump?.moveWhileJumping,
        `${label}.jump.moveWhileJumping`,
        preset.jump.moveWhileJumping
      ),
      moveWhileFalling: readOptionalBoolean(
        jump?.moveWhileFalling,
        `${label}.jump.moveWhileFalling`,
        preset.jump.moveWhileFalling
      ),
      directionOnly: readOptionalBoolean(
        jump?.directionOnly,
        `${label}.jump.directionOnly`,
        preset.jump.directionOnly
      ),
      maxHoldMs:
        jump?.maxHoldMs === undefined
          ? preset.jump.maxHoldMs
          : expectPositiveFiniteNumber(
              jump.maxHoldMs,
              `${label}.jump.maxHoldMs`
            ),
      bunnyHop: readOptionalBoolean(
        jump?.bunnyHop,
        `${label}.jump.bunnyHop`,
        preset.jump.bunnyHop
      ),
      bunnyHopBoost:
        jump?.bunnyHopBoost === undefined
          ? preset.jump.bunnyHopBoost
          : expectNonNegativeFiniteNumber(
              jump.bunnyHopBoost,
              `${label}.jump.bunnyHopBoost`
            )
    },
    sprint: {
      speedMultiplier:
        sprint?.speedMultiplier === undefined
          ? preset.sprint.speedMultiplier
          : expectPositiveFiniteNumber(
              sprint.speedMultiplier,
              `${label}.sprint.speedMultiplier`
            )
    },
    crouch: {
      speedMultiplier:
        crouch?.speedMultiplier === undefined
          ? preset.crouch.speedMultiplier
          : expectPositiveFiniteNumber(
              crouch.speedMultiplier,
              `${label}.crouch.speedMultiplier`
            )
    }
  });
}

function readModelInstance(
  value: unknown,
  label: string,
  assets: SceneDocument["assets"]
): ModelInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const assetId = expectString(value.assetId, `${label}.assetId`);
  const asset = assets[assetId];

  if (asset === undefined) {
    throw new Error(`${label}.assetId references missing asset ${assetId}.`);
  }

  if (asset.kind !== "model") {
    throw new Error(`${label}.assetId must reference a model asset.`);
  }

  return createModelInstance({
    id: expectString(value.id, `${label}.id`),
    assetId,
    name: normalizeModelInstanceName(
      expectOptionalString(value.name, `${label}.name`)
    ),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_MODEL_INSTANCE_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_MODEL_INSTANCE_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    rotationDegrees: readVec3(
      value.rotationDegrees,
      `${label}.rotationDegrees`
    ),
    scale: readVec3(value.scale, `${label}.scale`),
    collision: readModelInstanceCollisionSettings(
      value.collision,
      `${label}.collision`
    ),
    animationClipName: (() => {
      const raw = expectOptionalString(
        value.animationClipName,
        `${label}.animationClipName`
      );
      if (raw === undefined) return undefined;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    })(),
    animationAutoplay:
      value.animationAutoplay === undefined
        ? undefined
        : expectBoolean(value.animationAutoplay, `${label}.animationAutoplay`)
  });
}

function readModelInstances(
  value: unknown,
  assets: SceneDocument["assets"]
): SceneDocument["modelInstances"] {
  if (!isRecord(value)) {
    throw new Error("modelInstances must be a record.");
  }

  const modelInstances: SceneDocument["modelInstances"] = {};

  for (const [modelInstanceId, modelInstanceValue] of Object.entries(value)) {
    const modelInstance = readModelInstance(
      modelInstanceValue,
      `modelInstances.${modelInstanceId}`,
      assets
    );

    if (modelInstance.id !== modelInstanceId) {
      throw new Error(
        `modelInstances.${modelInstanceId}.id must match the registry key.`
      );
    }

    modelInstances[modelInstanceId] = modelInstance;
  }

  return modelInstances;
}

function readTerrain(value: unknown, label: string): Terrain {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const sampleCountX = normalizeTerrainSampleCount(
    expectFiniteNumber(value.sampleCountX, `${label}.sampleCountX`),
    `${label}.sampleCountX`
  );
  const sampleCountZ = normalizeTerrainSampleCount(
    expectFiniteNumber(value.sampleCountZ, `${label}.sampleCountZ`),
    `${label}.sampleCountZ`
  );
  const cellSize = normalizeTerrainCellSize(
    expectFiniteNumber(value.cellSize, `${label}.cellSize`)
  );
  if (!Array.isArray(value.heights)) {
    throw new Error(`${label}.heights must be an array.`);
  }

  const heights = value.heights.map((heightValue, index) =>
    expectFiniteNumber(heightValue, `${label}.heights.${index}`)
  );
  const layers =
    value.layers === undefined
      ? undefined
      : (() => {
          if (
            !Array.isArray(value.layers) ||
            value.layers.some((layer) => !isRecord(layer))
          ) {
            throw new Error(
              `${label}.layers must be an array of layer objects.`
            );
          }

          return value.layers.map((layerValue, layerIndex) => ({
            materialId:
              layerValue.materialId === undefined ||
              layerValue.materialId === null
                ? null
                : expectString(
                    layerValue.materialId,
                    `${label}.layers.${layerIndex}.materialId`
                  )
          }));
        })();
  const paintWeights =
    value.paintWeights === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(value.paintWeights)) {
            throw new Error(`${label}.paintWeights must be an array.`);
          }

          return value.paintWeights.map((paintWeight, index) =>
            expectFiniteNumber(paintWeight, `${label}.paintWeights.${index}`)
          );
        })();

  return createTerrain({
    id: expectString(value.id, `${label}.id`),
    name: normalizeTerrainName(
      expectOptionalString(value.name, `${label}.name`)
    ),
    visible: expectBoolean(value.visible, `${label}.visible`),
    enabled: expectBoolean(value.enabled, `${label}.enabled`),
    collisionEnabled:
      value.collisionEnabled === undefined
        ? undefined
        : expectBoolean(value.collisionEnabled, `${label}.collisionEnabled`),
    position: readVec3(value.position, `${label}.position`),
    sampleCountX,
    sampleCountZ,
    cellSize,
    heights,
    layers,
    paintWeights
  });
}

function readTerrains(value: unknown): SceneDocument["terrains"] {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error("terrains must be a record.");
  }

  const terrains: SceneDocument["terrains"] = {};

  for (const [terrainId, terrainValue] of Object.entries(value)) {
    const terrain = readTerrain(terrainValue, `terrains.${terrainId}`);

    if (terrain.id !== terrainId) {
      throw new Error(`terrains.${terrainId}.id must match the registry key.`);
    }

    terrains[terrainId] = terrain;
  }

  return terrains;
}

function readVec2(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    x: expectFiniteNumber(value.x, `${label}.x`),
    y: expectFiniteNumber(value.y, `${label}.y`)
  };
}

function readVec3(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    x: expectFiniteNumber(value.x, `${label}.x`),
    y: expectFiniteNumber(value.y, `${label}.y`),
    z: expectFiniteNumber(value.z, `${label}.z`)
  };
}

function readOptionalVec3(
  value: unknown,
  label: string,
  fallback: { x: number; y: number; z: number }
) {
  if (value === undefined) {
    return {
      x: fallback.x,
      y: fallback.y,
      z: fallback.z
    };
  }

  return readVec3(value, label);
}

function assertNonZeroVec3(
  vector: { x: number; y: number; z: number },
  label: string
) {
  if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
    throw new Error(`${label} must not be the zero vector.`);
  }
}

function readMaterialRegistry(
  value: unknown,
  label: string,
  options: { allowLegacyStarterPatterns: boolean }
): SceneDocument["materials"] {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  const materials: SceneDocument["materials"] = {};
  const starterRegistry = createStarterMaterialRegistry();

  for (const [materialId, materialValue] of Object.entries(value)) {
    if (!isRecord(materialValue)) {
      throw new Error(`${label}.${materialId} must be an object.`);
    }

    if (
      options.allowLegacyStarterPatterns &&
      materialValue.pattern !== undefined
    ) {
      const legacyMaterialId = expectString(
        materialValue.id,
        `${label}.${materialId}.id`
      );

      if (legacyMaterialId !== materialId) {
        throw new Error(
          `${label}.${materialId}.id must match the registry key.`
        );
      }

      if (starterRegistry[materialId] === undefined) {
        throw new Error(
          `${label}.${materialId} is not a supported legacy starter material id.`
        );
      }

      materials[materialId] = starterRegistry[materialId];
      continue;
    }

    const workflow = expectString(
      materialValue.workflow,
      `${label}.${materialId}.workflow`
    );

    if (
      workflow !== "roughness-only" &&
      workflow !== "metallic-roughness" &&
      workflow !== "specular-roughness"
    ) {
      throw new Error(
        `${label}.${materialId}.workflow must be a supported material workflow.`
      );
    }

    const previewImageName = expectString(
      materialValue.previewImageName,
      `${label}.${materialId}.previewImageName`
    );

    if (
      previewImageName !== "preview.webp" &&
      previewImageName !== "preview_sphere.webp"
    ) {
      throw new Error(
        `${label}.${materialId}.previewImageName must be preview.webp or preview_sphere.webp.`
      );
    }

    const sizeCmValue = materialValue.sizeCm;

    if (!isRecord(sizeCmValue)) {
      throw new Error(`${label}.${materialId}.sizeCm must be an object.`);
    }

    const material: MaterialDef = {
      id: expectString(materialValue.id, `${label}.${materialId}.id`),
      name: expectString(materialValue.name, `${label}.${materialId}.name`),
      assetFolder: expectString(
        materialValue.assetFolder,
        `${label}.${materialId}.assetFolder`
      ),
      workflow,
      previewImageName,
      sizeCm: {
        width: expectPositiveFiniteNumber(
          sizeCmValue.width,
          `${label}.${materialId}.sizeCm.width`
        ),
        height: expectPositiveFiniteNumber(
          sizeCmValue.height,
          `${label}.${materialId}.sizeCm.height`
        )
      },
      swatchColorHex: expectHexColor(
        materialValue.swatchColorHex,
        `${label}.${materialId}.swatchColorHex`
      ),
      tags: expectStringArray(materialValue.tags, `${label}.${materialId}.tags`)
    };

    if (material.id !== materialId) {
      throw new Error(`${label}.${materialId}.id must match the registry key.`);
    }

    materials[materialId] = material;
  }

  return materials;
}

function readFaceUvState(value: unknown, label: string): FaceUvState {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const rotationQuarterTurns = expectFiniteNumber(
    value.rotationQuarterTurns,
    `${label}.rotationQuarterTurns`
  );

  if (!isFaceUvRotationQuarterTurns(rotationQuarterTurns)) {
    throw new Error(`${label}.rotationQuarterTurns must be 0, 1, 2, or 3.`);
  }

  const scale = readVec2(value.scale, `${label}.scale`);

  if (scale.x <= 0 || scale.y <= 0) {
    throw new Error(`${label}.scale values must remain positive.`);
  }

  return {
    offset: readVec2(value.offset, `${label}.offset`),
    scale,
    rotationQuarterTurns,
    flipU: expectBoolean(value.flipU, `${label}.flipU`),
    flipV: expectBoolean(value.flipV, `${label}.flipV`)
  };
}

function readBrushFace(
  value: unknown,
  label: string,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): BrushFace {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const materialId = value.materialId;

  if (
    materialId !== null &&
    materialId !== undefined &&
    typeof materialId !== "string"
  ) {
    throw new Error(`${label}.materialId must be a string or null.`);
  }

  if (
    materialId !== null &&
    materialId !== undefined &&
    materials[materialId] === undefined
  ) {
    throw new Error(
      `${label}.materialId references missing material ${materialId}.`
    );
  }

  return {
    materialId: materialId ?? null,
    uv:
      value.uv === undefined && allowMissingUvState
        ? createDefaultFaceUvState()
        : readFaceUvState(value.uv, `${label}.uv`)
  };
}

function readBoxBrushFaces(
  value: unknown,
  label: string,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): BoxBrushFaces {
  return readBrushFaces(value, label, materials, allowMissingUvState, [
    "posX",
    "negX",
    "posY",
    "negY",
    "posZ",
    "negZ"
  ]) as BoxBrushFaces;
}

function readBrushFaces(
  value: unknown,
  label: string,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean,
  faceIds: readonly WhiteboxFaceId[]
) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const supportedFaceIds = new Set(faceIds);
  const extraFaceKeys = Object.keys(value).filter(
    (faceId) => !supportedFaceIds.has(faceId)
  );

  if (extraFaceKeys.length > 0) {
    throw new Error(
      `${label} contains unsupported face ids: ${extraFaceKeys.join(", ")}.`
    );
  }

  return Object.fromEntries(
    faceIds.map((faceId) => [
      faceId,
      readBrushFace(
        value[faceId],
        `${label}.${faceId}`,
        materials,
        allowMissingUvState
      )
    ])
  );
}

function readBoxBrushGeometry(
  value: unknown,
  label: string,
  size: { x: number; y: number; z: number }
) {
  return readBrushGeometry(
    value,
    label,
    createDefaultBoxBrushGeometry(size),
    BOX_VERTEX_IDS
  );
}

function readBrushGeometry<T extends { vertices: Record<string, unknown> }>(
  value: unknown,
  label: string,
  fallbackGeometry: T,
  vertexIds: readonly WhiteboxVertexId[]
): T {
  if (value === undefined) {
    return fallbackGeometry;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!isRecord(value.vertices)) {
    throw new Error(`${label}.vertices must be an object.`);
  }

  const vertices = value.vertices;

  const extraVertexKeys = Object.keys(vertices).filter(
    (vertexId) => !vertexIds.includes(vertexId as WhiteboxVertexId)
  );

  if (extraVertexKeys.length > 0) {
    throw new Error(
      `${label}.vertices contains unsupported vertex ids: ${extraVertexKeys.join(", ")}.`
    );
  }

  return {
    vertices: Object.fromEntries(
      vertexIds.map((vertexId) => [
        vertexId,
        readVec3(vertices[vertexId], `${label}.vertices.${vertexId}`)
      ])
    ) as T["vertices"]
  } as T;
}

function readBrushes(
  value: unknown,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): SceneDocument["brushes"] {
  if (!isRecord(value)) {
    throw new Error("brushes must be a record.");
  }

  const brushes: SceneDocument["brushes"] = {};

  for (const [brushId, brushValue] of Object.entries(value)) {
    if (!isRecord(brushValue)) {
      throw new Error(`brushes.${brushId} must be an object.`);
    }

    const kind = brushValue.kind;

    const center = readVec3(brushValue.center, `brushes.${brushId}.center`);
    const size = readVec3(brushValue.size, `brushes.${brushId}.size`);

    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      throw new Error(`brushes.${brushId}.size values must be positive.`);
    }

    const sharedBrushFields = {
      id: expectString(brushValue.id, `brushes.${brushId}.id`),
      name: readOptionalBrushName(brushValue.name, `brushes.${brushId}.name`),
      visible: readOptionalBoolean(
        brushValue.visible,
        `brushes.${brushId}.visible`,
        DEFAULT_BOX_BRUSH_VISIBLE
      ),
      enabled: readOptionalBoolean(
        brushValue.enabled,
        `brushes.${brushId}.enabled`,
        DEFAULT_BOX_BRUSH_ENABLED
      ),
      center,
      rotationDegrees: readOptionalVec3(
        brushValue.rotationDegrees,
        `brushes.${brushId}.rotationDegrees`,
        DEFAULT_BOX_BRUSH_ROTATION_DEGREES
      ),
      size,
      volume: readBoxBrushVolumeSettings(
        brushValue.volume,
        `brushes.${brushId}.volume`
      ),
      layerId: expectOptionalString(
        brushValue.layerId,
        `brushes.${brushId}.layerId`
      ),
      groupId: expectOptionalString(
        brushValue.groupId,
        `brushes.${brushId}.groupId`
      )
    };

    if (kind === "box") {
      brushes[brushId] = createBoxBrush({
        ...sharedBrushFields,
        geometry: readBoxBrushGeometry(
          brushValue.geometry,
          `brushes.${brushId}.geometry`,
          size
        ),
        faces: readBoxBrushFaces(
          brushValue.faces,
          `brushes.${brushId}.faces`,
          materials,
          allowMissingUvState
        )
      });
      continue;
    }

    if (kind === "wedge") {
      brushes[brushId] = createWedgeBrush({
        ...sharedBrushFields,
        rotationDegrees:
          brushValue.rotationDegrees === undefined
            ? DEFAULT_WEDGE_BRUSH_ROTATION_DEGREES
            : sharedBrushFields.rotationDegrees,
        geometry: readBrushGeometry(
          brushValue.geometry,
          `brushes.${brushId}.geometry`,
          createDefaultWedgeBrushGeometry(size),
          WEDGE_VERTEX_IDS
        ),
        faces: readBrushFaces(
          brushValue.faces,
          `brushes.${brushId}.faces`,
          materials,
          allowMissingUvState,
          WEDGE_FACE_IDS
        ) as ReturnType<typeof createWedgeBrush>["faces"]
      });
      continue;
    }

    if (kind === "radialPrism") {
      const sideCount = normalizeRadialPrismSideCount(
        expectFiniteNumber(brushValue.sideCount, `brushes.${brushId}.sideCount`)
      );

      brushes[brushId] = createRadialPrismBrush({
        ...sharedBrushFields,
        sideCount,
        geometry: readBrushGeometry(
          brushValue.geometry,
          `brushes.${brushId}.geometry`,
          createDefaultRadialPrismBrushGeometry(size, sideCount),
          getRadialPrismVertexIds(sideCount)
        ),
        faces: readBrushFaces(
          brushValue.faces,
          `brushes.${brushId}.faces`,
          materials,
          allowMissingUvState,
          getRadialPrismFaceIds(sideCount)
        ) as ReturnType<typeof createRadialPrismBrush>["faces"]
      });
      continue;
    }

    if (kind === "cone") {
      const sideCount = normalizeConeSideCount(
        expectFiniteNumber(brushValue.sideCount, `brushes.${brushId}.sideCount`)
      );

      brushes[brushId] = createConeBrush({
        ...sharedBrushFields,
        sideCount,
        geometry: readBrushGeometry(
          brushValue.geometry,
          `brushes.${brushId}.geometry`,
          createDefaultConeBrushGeometry(size, sideCount),
          getConeVertexIds(sideCount)
        ),
        faces: readBrushFaces(
          brushValue.faces,
          `brushes.${brushId}.faces`,
          materials,
          allowMissingUvState,
          getConeFaceIds(sideCount)
        ) as ReturnType<typeof createConeBrush>["faces"]
      });
      continue;
    }

    if (kind === "torus") {
      const majorSegmentCount = normalizeTorusMajorSegmentCount(
        expectFiniteNumber(
          brushValue.majorSegmentCount,
          `brushes.${brushId}.majorSegmentCount`
        )
      );
      const tubeSegmentCount = normalizeTorusTubeSegmentCount(
        expectFiniteNumber(
          brushValue.tubeSegmentCount,
          `brushes.${brushId}.tubeSegmentCount`
        )
      );

      brushes[brushId] = createTorusBrush({
        ...sharedBrushFields,
        majorSegmentCount,
        tubeSegmentCount,
        geometry: readBrushGeometry(
          brushValue.geometry,
          `brushes.${brushId}.geometry`,
          createDefaultTorusBrushGeometry(
            size,
            majorSegmentCount,
            tubeSegmentCount
          ),
          getTorusVertexIds(majorSegmentCount, tubeSegmentCount)
        ),
        faces: readBrushFaces(
          brushValue.faces,
          `brushes.${brushId}.faces`,
          materials,
          allowMissingUvState,
          getTorusFaceIds(majorSegmentCount, tubeSegmentCount)
        ) as ReturnType<typeof createTorusBrush>["faces"]
      });
      continue;
    }

    throw new Error(
      `brushes.${brushId}.kind must be box, wedge, radialPrism, cone, or torus.`
    );
  }

  return brushes;
}

function readWorldBackgroundSettings(
  value: unknown,
  label: string,
  options: {
    allowMissing?: boolean;
    allowShader?: boolean;
    defaultValue?: WorldBackgroundSettings;
  } = {}
): WorldBackgroundSettings {
  if (value === undefined) {
    if (options.allowMissing && options.defaultValue !== undefined) {
      return cloneWorldBackgroundSettings(options.defaultValue);
    }

    throw new Error(`${label} must be an object.`);
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const backgroundMode = expectString(value.mode, `${label}.mode`);

  if (!isWorldBackgroundMode(backgroundMode)) {
    throw new Error(`${label}.mode must be a supported background mode.`);
  }

  if (backgroundMode === "shader" && options.allowShader === false) {
    throw new Error(`${label}.mode must not use a shader background here.`);
  }

  if (backgroundMode === "solid") {
    return {
      mode: "solid",
      colorHex: expectHexColor(value.colorHex, `${label}.colorHex`)
    };
  }

  if (backgroundMode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: expectHexColor(value.topColorHex, `${label}.topColorHex`),
      bottomColorHex: expectHexColor(
        value.bottomColorHex,
        `${label}.bottomColorHex`
      )
    };
  }

  if (backgroundMode === "shader") {
    return {
      mode: "shader"
    };
  }

  return {
    mode: "image",
    assetId: expectString(value.assetId, `${label}.assetId`),
    environmentIntensity:
      typeof value.environmentIntensity === "number" &&
      isFinite(value.environmentIntensity) &&
      value.environmentIntensity >= 0
        ? value.environmentIntensity
        : 0.5
  };
}

function readWorldShaderSkySettings(
  value: unknown,
  label: string,
  dayBackground: WorldBackgroundSettings
): WorldShaderSkySettings {
  const defaults = createDefaultWorldShaderSkySettings(dayBackground);

  if (value === undefined) {
    return defaults;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const celestial =
    value.celestial === undefined
      ? {}
      : isRecord(value.celestial)
        ? value.celestial
        : (() => {
            throw new Error(`${label}.celestial must be an object.`);
          })();
  const stars =
    value.stars === undefined
      ? {}
      : isRecord(value.stars)
        ? value.stars
        : (() => {
            throw new Error(`${label}.stars must be an object.`);
          })();
  const clouds =
    value.clouds === undefined
      ? {}
      : isRecord(value.clouds)
        ? value.clouds
        : (() => {
            throw new Error(`${label}.clouds must be an object.`);
          })();
  const presetId = value.presetId ?? defaults.presetId;

  if (!isWorldShaderSkyPresetId(presetId)) {
    throw new Error(`${label}.presetId must be a supported shader sky preset.`);
  }

  return {
    presetId,
    dayTopColorHex: expectHexColor(
      value.dayTopColorHex ?? defaults.dayTopColorHex,
      `${label}.dayTopColorHex`
    ),
    dayBottomColorHex: expectHexColor(
      value.dayBottomColorHex ?? defaults.dayBottomColorHex,
      `${label}.dayBottomColorHex`
    ),
    horizonHeight: readOptionalFiniteNumber(
      value.horizonHeight,
      `${label}.horizonHeight`,
      defaults.horizonHeight
    ),
    celestial: {
      sunDiscSizeDegrees: readOptionalPositiveFiniteNumber(
        celestial.sunDiscSizeDegrees,
        `${label}.celestial.sunDiscSizeDegrees`,
        defaults.celestial.sunDiscSizeDegrees
      ),
      moonDiscSizeDegrees: readOptionalPositiveFiniteNumber(
        celestial.moonDiscSizeDegrees,
        `${label}.celestial.moonDiscSizeDegrees`,
        defaults.celestial.moonDiscSizeDegrees
      )
    },
    stars: {
      density: readOptionalNonNegativeFiniteNumber(
        stars.density,
        `${label}.stars.density`,
        defaults.stars.density
      ),
      brightness: readOptionalNonNegativeFiniteNumber(
        stars.brightness,
        `${label}.stars.brightness`,
        defaults.stars.brightness
      ),
      horizonFadeOffset: readOptionalFiniteNumber(
        stars.horizonFadeOffset,
        `${label}.stars.horizonFadeOffset`,
        defaults.stars.horizonFadeOffset
      )
    },
    clouds: {
      coverage: readOptionalNonNegativeFiniteNumber(
        clouds.coverage,
        `${label}.clouds.coverage`,
        defaults.clouds.coverage
      ),
      density: readOptionalNonNegativeFiniteNumber(
        clouds.density,
        `${label}.clouds.density`,
        defaults.clouds.density
      ),
      softness: readOptionalNonNegativeFiniteNumber(
        clouds.softness,
        `${label}.clouds.softness`,
        defaults.clouds.softness
      ),
      scale: readOptionalPositiveFiniteNumber(
        clouds.scale,
        `${label}.clouds.scale`,
        defaults.clouds.scale
      ),
      height: readOptionalFiniteNumber(
        clouds.height,
        `${label}.clouds.height`,
        defaults.clouds.height
      ),
      heightVariation: readOptionalNonNegativeFiniteNumber(
        clouds.heightVariation,
        `${label}.clouds.heightVariation`,
        defaults.clouds.heightVariation
      ),
      tintHex: expectHexColor(
        clouds.tintHex ?? defaults.clouds.tintHex,
        `${label}.clouds.tintHex`
      ),
      opacity: readOptionalNonNegativeFiniteNumber(
        clouds.opacity,
        `${label}.clouds.opacity`,
        defaults.clouds.opacity
      ),
      opacityRandomness: readOptionalNonNegativeFiniteNumber(
        clouds.opacityRandomness,
        `${label}.clouds.opacityRandomness`,
        defaults.clouds.opacityRandomness
      ),
      driftSpeed: readOptionalNonNegativeFiniteNumber(
        clouds.driftSpeed,
        `${label}.clouds.driftSpeed`,
        defaults.clouds.driftSpeed
      ),
      driftDirectionDegrees: readOptionalFiniteNumber(
        clouds.driftDirectionDegrees,
        `${label}.clouds.driftDirectionDegrees`,
        defaults.clouds.driftDirectionDegrees
      )
    }
  };
}

function readWorldTimePhaseProfile(
  value: unknown,
  label: string,
  phase: "dawn" | "dusk" | "night"
): WorldTimePhaseProfile {
  const defaults = createDefaultWorldTimePhaseProfile(phase);

  if (value === undefined) {
    return defaults;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const skyTopColorHex = expectHexColor(
    value.skyTopColorHex ?? defaults.skyTopColorHex,
    `${label}.skyTopColorHex`
  );
  const skyBottomColorHex = expectHexColor(
    value.skyBottomColorHex ?? defaults.skyBottomColorHex,
    `${label}.skyBottomColorHex`
  );
  const fallbackBackground: WorldBackgroundSettings = {
    mode: "verticalGradient",
    topColorHex: skyTopColorHex,
    bottomColorHex: skyBottomColorHex
  };

  return {
    background: readWorldBackgroundSettings(
      value.background,
      `${label}.background`,
      {
        allowMissing: true,
        allowShader: false,
        defaultValue: fallbackBackground
      }
    ),
    skyTopColorHex,
    skyBottomColorHex,
    ambientColorHex: expectHexColor(
      value.ambientColorHex ?? defaults.ambientColorHex,
      `${label}.ambientColorHex`
    ),
    ambientIntensityFactor: readOptionalNonNegativeFiniteNumber(
      value.ambientIntensityFactor,
      `${label}.ambientIntensityFactor`,
      defaults.ambientIntensityFactor
    ),
    lightColorHex: expectHexColor(
      value.lightColorHex ?? defaults.lightColorHex,
      `${label}.lightColorHex`
    ),
    lightIntensityFactor: readOptionalNonNegativeFiniteNumber(
      value.lightIntensityFactor,
      `${label}.lightIntensityFactor`,
      defaults.lightIntensityFactor
    )
  };
}

function readLegacyWorldTimeOfDaySettings(
  value: unknown,
  label: string
): WorldTimeOfDaySettings {
  const defaults = createDefaultWorldTimeOfDaySettings();

  if (!isRecord(value)) {
    return defaults;
  }

  const dawn = readWorldTimePhaseProfile(value.dawn, `${label}.dawn`, "dawn");
  const dusk = readWorldTimePhaseProfile(value.dusk, `${label}.dusk`, "dusk");
  const nightProfile = readWorldTimePhaseProfile(
    value.night,
    `${label}.night`,
    "night"
  );

  let nightBackground: WorldBackgroundSettings = {
    mode: "verticalGradient",
    topColorHex: nightProfile.skyTopColorHex,
    bottomColorHex: nightProfile.skyBottomColorHex
  };

  if (isRecord(value.nightBackground)) {
    const legacyNightBackground = value.nightBackground;
    const assetId =
      typeof legacyNightBackground.assetId === "string"
        ? legacyNightBackground.assetId.trim()
        : "";

    if (assetId.length > 0) {
      nightBackground = {
        mode: "image",
        assetId,
        environmentIntensity:
          typeof legacyNightBackground.environmentIntensity === "number" &&
          isFinite(legacyNightBackground.environmentIntensity) &&
          legacyNightBackground.environmentIntensity >= 0
            ? legacyNightBackground.environmentIntensity
            : DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY
      };
    }
  }

  return {
    dawn: {
      ...dawn,
      background: cloneWorldBackgroundSettings(dawn.background)
    },
    dusk: {
      ...dusk,
      background: cloneWorldBackgroundSettings(dusk.background)
    },
    night: {
      background: nightBackground,
      ambientColorHex: nightProfile.ambientColorHex,
      ambientIntensityFactor: nightProfile.ambientIntensityFactor,
      lightColorHex: nightProfile.lightColorHex,
      lightIntensityFactor: nightProfile.lightIntensityFactor
    }
  };
}

function readWorldTimeOfDaySettings(
  value: unknown,
  label: string,
  options: { legacyProjectTimeValue?: unknown } = {}
): WorldTimeOfDaySettings {
  const defaults = createDefaultWorldTimeOfDaySettings();

  if (value === undefined) {
    if (options.legacyProjectTimeValue !== undefined) {
      return readLegacyWorldTimeOfDaySettings(
        options.legacyProjectTimeValue,
        "time"
      );
    }

    return defaults;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const nightDefaults = defaults.night;
  const nightValue = value.night;

  return {
    dawn: readWorldTimePhaseProfile(value.dawn, `${label}.dawn`, "dawn"),
    dusk: readWorldTimePhaseProfile(value.dusk, `${label}.dusk`, "dusk"),
    night: {
      background: readWorldBackgroundSettings(
        isRecord(nightValue) ? nightValue.background : undefined,
        `${label}.night.background`,
        {
          allowMissing: true,
          allowShader: false,
          defaultValue: nightDefaults.background
        }
      ),
      ambientColorHex: expectHexColor(
        isRecord(nightValue)
          ? (nightValue.ambientColorHex ?? nightDefaults.ambientColorHex)
          : nightDefaults.ambientColorHex,
        `${label}.night.ambientColorHex`
      ),
      ambientIntensityFactor: readOptionalNonNegativeFiniteNumber(
        isRecord(nightValue) ? nightValue.ambientIntensityFactor : undefined,
        `${label}.night.ambientIntensityFactor`,
        nightDefaults.ambientIntensityFactor
      ),
      lightColorHex: expectHexColor(
        isRecord(nightValue)
          ? (nightValue.lightColorHex ?? nightDefaults.lightColorHex)
          : nightDefaults.lightColorHex,
        `${label}.night.lightColorHex`
      ),
      lightIntensityFactor: readOptionalNonNegativeFiniteNumber(
        isRecord(nightValue) ? nightValue.lightIntensityFactor : undefined,
        `${label}.night.lightIntensityFactor`,
        nightDefaults.lightIntensityFactor
      )
    }
  };
}

function readWorldSettings(
  value: unknown,
  options: { legacyProjectTimeValue?: unknown } = {}
): WorldSettings {
  if (!isRecord(value)) {
    throw new Error("world must be an object.");
  }

  const background = value.background;
  const ambientLight = value.ambientLight;
  const sunLight = value.sunLight;

  if (!isRecord(background)) {
    throw new Error("world.background must be an object.");
  }

  if (!isRecord(ambientLight)) {
    throw new Error("world.ambientLight must be an object.");
  }

  if (!isRecord(sunLight)) {
    throw new Error("world.sunLight must be an object.");
  }

  const direction = readVec3(sunLight.direction, "world.sunLight.direction");
  assertNonZeroVec3(direction, "world.sunLight.direction");

  const resolvedBackground = readWorldBackgroundSettings(
    background,
    "world.background"
  );

  return {
    projectTimeLightingEnabled: readOptionalBoolean(
      value.projectTimeLightingEnabled,
      "world.projectTimeLightingEnabled",
      true
    ),
    showCelestialBodies: readOptionalBoolean(
      value.showCelestialBodies,
      "world.showCelestialBodies",
      false
    ),
    background: resolvedBackground,
    shaderSky: readWorldShaderSkySettings(
      value.shaderSky,
      "world.shaderSky",
      resolvedBackground
    ),
    ambientLight: {
      colorHex: expectHexColor(
        ambientLight.colorHex,
        "world.ambientLight.colorHex"
      ),
      intensity: expectNonNegativeFiniteNumber(
        ambientLight.intensity,
        "world.ambientLight.intensity"
      )
    },
    sunLight: {
      colorHex: expectHexColor(sunLight.colorHex, "world.sunLight.colorHex"),
      intensity: expectNonNegativeFiniteNumber(
        sunLight.intensity,
        "world.sunLight.intensity"
      ),
      direction
    },
    timeOfDay: readWorldTimeOfDaySettings(value.timeOfDay, "world.timeOfDay", {
      legacyProjectTimeValue: options.legacyProjectTimeValue
    }),
    advancedRendering: readAdvancedRenderingSettings(value.advancedRendering)
  };
}

function readPointLightEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "pointLight", `${label}.kind`);
  const entity = createPointLightEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    colorHex: expectHexColor(value.colorHex, `${label}.colorHex`),
    intensity: expectNonNegativeFiniteNumber(
      value.intensity,
      `${label}.intensity`
    ),
    distance: expectPositiveFiniteNumber(value.distance, `${label}.distance`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be pointLight.`);
  }

  return entity;
}

function readSpotLightEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "spotLight", `${label}.kind`);
  const entity = createSpotLightEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    direction: readVec3(value.direction, `${label}.direction`),
    colorHex: expectHexColor(value.colorHex, `${label}.colorHex`),
    intensity: expectNonNegativeFiniteNumber(
      value.intensity,
      `${label}.intensity`
    ),
    distance: expectPositiveFiniteNumber(value.distance, `${label}.distance`),
    angleDegrees: expectFiniteNumber(
      value.angleDegrees,
      `${label}.angleDegrees`
    )
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be spotLight.`);
  }

  return entity;
}

function readPlayerStartEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "playerStart", `${label}.kind`);
  const entity = createPlayerStartEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`),
    navigationMode: readPlayerStartNavigationMode(
      value.navigationMode,
      `${label}.navigationMode`
    ),
    movementTemplate: readPlayerStartMovementTemplate(
      value.movementTemplate,
      `${label}.movementTemplate`
    ),
    inputBindings: readPlayerStartInputBindings(
      value.inputBindings,
      `${label}.inputBindings`
    ),
    collider: readPlayerStartColliderSettings(
      value.collider,
      `${label}.collider`
    )
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be playerStart.`);
  }

  return entity;
}

function readSoundEmitterEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "soundEmitter", `${label}.kind`);
  const entity = createSoundEmitterEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    audioAssetId:
      value.audioAssetId === undefined || value.audioAssetId === null
        ? undefined
        : expectString(value.audioAssetId, `${label}.audioAssetId`),
    volume: expectNonNegativeFiniteNumber(value.volume, `${label}.volume`),
    refDistance: expectPositiveFiniteNumber(
      value.refDistance,
      `${label}.refDistance`
    ),
    maxDistance: expectPositiveFiniteNumber(
      value.maxDistance,
      `${label}.maxDistance`
    ),
    autoplay: expectBoolean(value.autoplay, `${label}.autoplay`),
    loop: expectBoolean(value.loop, `${label}.loop`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be soundEmitter.`);
  }

  return entity;
}

function readLegacySoundEmitterEntity(
  value: unknown,
  label: string
): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "soundEmitter", `${label}.kind`);
  const radius = expectPositiveFiniteNumber(value.radius, `${label}.radius`);
  const entity = createSoundEmitterEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    refDistance: radius,
    maxDistance: radius,
    volume: expectNonNegativeFiniteNumber(value.gain, `${label}.gain`),
    autoplay: expectBoolean(value.autoplay, `${label}.autoplay`),
    loop: expectBoolean(value.loop, `${label}.loop`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be soundEmitter.`);
  }

  return entity;
}

function readTriggerVolumeEntity(
  value: unknown,
  label: string
): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(
    value.kind,
    "triggerVolume",
    `${label}.kind`
  );
  const size = readVec3(value.size, `${label}.size`);

  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    throw new Error(`${label}.size values must be positive.`);
  }

  const entity = createTriggerVolumeEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    size,
    triggerOnEnter: expectBoolean(
      value.triggerOnEnter,
      `${label}.triggerOnEnter`
    ),
    triggerOnExit: expectBoolean(value.triggerOnExit, `${label}.triggerOnExit`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be triggerVolume.`);
  }

  return entity;
}

function readTeleportTargetEntity(
  value: unknown,
  label: string
): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(
    value.kind,
    "teleportTarget",
    `${label}.kind`
  );
  const entity = createTeleportTargetEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be teleportTarget.`);
  }

  return entity;
}

function readInteractableEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "interactable", `${label}.kind`);
  const interactionEnabled =
    value.interactionEnabled === undefined
      ? expectBoolean(value.enabled, `${label}.enabled`)
      : expectBoolean(value.interactionEnabled, `${label}.interactionEnabled`);
  const entity = createInteractableEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled:
      value.interactionEnabled === undefined
        ? DEFAULT_ENTITY_ENABLED
        : readOptionalBoolean(
            value.enabled,
            `${label}.enabled`,
            DEFAULT_ENTITY_ENABLED
          ),
    position: readVec3(value.position, `${label}.position`),
    radius: expectPositiveFiniteNumber(value.radius, `${label}.radius`),
    prompt: expectString(value.prompt, `${label}.prompt`),
    interactionEnabled
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be interactable.`);
  }

  return entity;
}

function readSceneEntryEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "sceneEntry", `${label}.kind`);
  const entity = createSceneEntryEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be sceneEntry.`);
  }

  return entity;
}

function readNpcEntity(
  value: unknown,
  label: string,
  legacyProjectDialogues: ProjectDialogueLibrary
): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "npc", `${label}.kind`);
  const dialogueId = readOptionalDialogueResourceId(
    value.dialogueId,
    `${label}.dialogueId`
  );
  const dialogues =
    value.dialogues === undefined
      ? dialogueId === null
        ? []
        : (() => {
            const legacyDialogue =
              legacyProjectDialogues.dialogues[dialogueId] ?? null;
            return legacyDialogue === null ? [] : [legacyDialogue];
          })()
      : readNpcDialogues(
          value.dialogues,
          `${label}.dialogues`,
          legacyProjectDialogues
        );
  const entity = createNpcEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    visible: readOptionalBoolean(
      value.visible,
      `${label}.visible`,
      DEFAULT_ENTITY_VISIBLE
    ),
    enabled: readOptionalBoolean(
      value.enabled,
      `${label}.enabled`,
      DEFAULT_ENTITY_ENABLED
    ),
    position: readVec3(value.position, `${label}.position`),
    actorId: expectString(value.actorId, `${label}.actorId`),
    presence: readNpcPresence(value.presence, `${label}.presence`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`),
    modelAssetId:
      value.modelAssetId === undefined || value.modelAssetId === null
        ? undefined
        : expectString(value.modelAssetId, `${label}.modelAssetId`),
    dialogues,
    defaultDialogueId:
      value.defaultDialogueId === undefined
        ? dialogueId
        : readOptionalDialogueResourceId(
            value.defaultDialogueId,
            `${label}.defaultDialogueId`
          ),
    collider: readNpcColliderSettings(value.collider, `${label}.collider`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be npc.`);
  }

  return entity;
}

function readNpcPresence(value: unknown, label: string): NpcPresence {
  if (value === undefined) {
    return createNpcAlwaysPresence();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const mode = expectString(value.mode, `${label}.mode`);

  if (!isNpcPresenceMode(mode)) {
    throw new Error(`${label}.mode must be always or timeWindow.`);
  }

  switch (mode) {
    case "always":
      return createNpcAlwaysPresence();
    case "timeWindow":
      return createNpcTimeWindowPresence({
        startHour: expectFiniteNumber(value.startHour, `${label}.startHour`),
        endHour: expectFiniteNumber(value.endHour, `${label}.endHour`)
      });
  }
}

function readEntityInstance(
  value: unknown,
  label: string,
  options: {
    legacySoundEmitter: boolean;
    legacyProjectDialogues?: ProjectDialogueLibrary;
  }
): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  switch (value.kind) {
    case "pointLight":
      return readPointLightEntity(value, label);
    case "spotLight":
      return readSpotLightEntity(value, label);
    case "playerStart":
      return readPlayerStartEntity(value, label);
    case "sceneEntry":
      return readSceneEntryEntity(value, label);
    case "npc":
      return readNpcEntity(
        value,
        label,
        options.legacyProjectDialogues ?? createEmptyProjectDialogueLibrary()
      );
    case "soundEmitter":
      return options.legacySoundEmitter
        ? readLegacySoundEmitterEntity(value, label)
        : readSoundEmitterEntity(value, label);
    case "triggerVolume":
      return readTriggerVolumeEntity(value, label);
    case "teleportTarget":
      return readTeleportTargetEntity(value, label);
    case "interactable":
      return readInteractableEntity(value, label);
    default:
      throw new Error(`${label}.kind must be a supported entity type.`);
  }
}

function readEntities(
  value: unknown,
  options: {
    legacySoundEmitter: boolean;
    legacyProjectDialogues?: ProjectDialogueLibrary;
  }
): SceneDocument["entities"] {
  if (!isRecord(value)) {
    throw new Error("entities must be a record.");
  }

  const entities: SceneDocument["entities"] = {};

  for (const [entityId, entityValue] of Object.entries(value)) {
    if (!isRecord(entityValue)) {
      throw new Error(`entities.${entityId} must be an object.`);
    }

    const entity = readEntityInstance(
      entityValue,
      `entities.${entityId}`,
      options
    );

    if (entity.id !== entityId) {
      throw new Error(`entities.${entityId}.id must match the registry key.`);
    }

    entities[entityId] = entity;
  }

  return entities;
}

function readControlTargetRef(value: unknown, label: string): ControlTargetRef {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectString(value.kind, `${label}.kind`);

  switch (kind) {
    case "actor":
      return createActorControlTargetRef(
        expectString(value.actorId, `${label}.actorId`)
      );
    case "entity": {
      const entityKind = expectString(value.entityKind, `${label}.entityKind`);

      if (!isControlEntityTargetKind(entityKind)) {
        throw new Error(
          `${label}.entityKind must be a supported control entity kind.`
        );
      }

      return createEntityControlTargetRef(
        entityKind,
        expectString(value.entityId, `${label}.entityId`)
      );
    }
    case "interaction": {
      const interactionKind = expectString(
        value.interactionKind,
        `${label}.interactionKind`
      );

      if (!isControlInteractionTargetKind(interactionKind)) {
        throw new Error(
          `${label}.interactionKind must be a supported control interaction kind.`
        );
      }

      return createInteractionControlTargetRef(
        interactionKind,
        expectString(value.entityId, `${label}.entityId`)
      );
    }
    case "scene":
      expectLiteralString(value.scope, "activeScene", `${label}.scope`);
      return createActiveSceneControlTargetRef();
    case "global":
      expectLiteralString(value.scope, "project", `${label}.scope`);
      return createProjectGlobalControlTargetRef();
    case "modelInstance":
      return createModelInstanceControlTargetRef(
        expectString(value.modelInstanceId, `${label}.modelInstanceId`)
      );
    default:
      throw new Error(`${label}.kind must be a supported control target kind.`);
  }
}

function readControlEffect(value: unknown, label: string): ControlEffect {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const type = expectString(value.type, `${label}.type`);

  switch (type) {
    case "setActorPresence":
      return createSetActorPresenceControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActorControlTargetRef>,
        active: expectBoolean(value.active, `${label}.active`)
      });
    case "playActorAnimation":
      return createPlayActorAnimationControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActorControlTargetRef>,
        clipName: expectString(value.clipName, `${label}.clipName`),
        loop:
          value.loop === undefined
            ? undefined
            : expectBoolean(value.loop, `${label}.loop`)
      });
    case "followActorPath": {
      const progressMode = expectString(
        value.progressMode,
        `${label}.progressMode`
      );

      if (!isActorPathProgressMode(progressMode)) {
        throw new Error(
          `${label}.progressMode must be a supported actor path progress mode.`
        );
      }

      return createFollowActorPathControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActorControlTargetRef>,
        pathId: expectString(value.pathId, `${label}.pathId`),
        speed: expectPositiveFiniteNumber(value.speed, `${label}.speed`),
        loop: expectBoolean(value.loop, `${label}.loop`),
        smoothPath:
          value.smoothPath === undefined
            ? true
            : expectBoolean(value.smoothPath, `${label}.smoothPath`),
        progressMode
      });
    }
    case "playModelAnimation":
      return createPlayModelAnimationControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createModelInstanceControlTargetRef>,
        clipName: expectString(value.clipName, `${label}.clipName`),
        loop:
          value.loop === undefined
            ? undefined
            : expectBoolean(value.loop, `${label}.loop`)
      });
    case "stopModelAnimation":
      return createStopModelAnimationControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createModelInstanceControlTargetRef>
      });
    case "setModelInstanceVisible":
      return createSetModelInstanceVisibleControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createModelInstanceControlTargetRef>,
        visible: expectBoolean(value.visible, `${label}.visible`)
      });
    case "playSound":
      return createPlaySoundControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createSoundEmitterControlTargetRef>
      });
    case "stopSound":
      return createStopSoundControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createSoundEmitterControlTargetRef>
      });
    case "setSoundVolume":
      return createSetSoundVolumeControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createSoundEmitterControlTargetRef>,
        volume: expectNonNegativeFiniteNumber(value.volume, `${label}.volume`)
      });
    case "setInteractionEnabled":
      return createSetInteractionEnabledControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createInteractionControlTargetRef>,
        enabled: expectBoolean(value.enabled, `${label}.enabled`)
      });
    case "setLightEnabled":
      return createSetLightEnabledControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createLightControlTargetRef>,
        enabled: expectBoolean(value.enabled, `${label}.enabled`)
      });
    case "setLightIntensity":
      return createSetLightIntensityControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createLightControlTargetRef>,
        intensity: expectNonNegativeFiniteNumber(
          value.intensity,
          `${label}.intensity`
        )
      });
    case "setLightColor":
      return createSetLightColorControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createLightControlTargetRef>,
        colorHex: expectString(value.colorHex, `${label}.colorHex`)
      });
    case "setAmbientLightIntensity":
      return createSetAmbientLightIntensityControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActiveSceneControlTargetRef>,
        intensity: expectNonNegativeFiniteNumber(
          value.intensity,
          `${label}.intensity`
        )
      });
    case "setAmbientLightColor":
      return createSetAmbientLightColorControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActiveSceneControlTargetRef>,
        colorHex: expectString(value.colorHex, `${label}.colorHex`)
      });
    case "setSunLightIntensity":
      return createSetSunLightIntensityControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActiveSceneControlTargetRef>,
        intensity: expectNonNegativeFiniteNumber(
          value.intensity,
          `${label}.intensity`
        )
      });
    case "setSunLightColor":
      return createSetSunLightColorControlEffect({
        target: readControlTargetRef(
          value.target,
          `${label}.target`
        ) as ReturnType<typeof createActiveSceneControlTargetRef>,
        colorHex: expectString(value.colorHex, `${label}.colorHex`)
      });
    default:
      throw new Error(`${label}.type must be a supported control effect.`);
  }
}

function readInteractionAction(
  value: unknown,
  label: string
): InteractionLink["action"] {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  switch (value.type) {
    case "teleportPlayer":
      return createTeleportPlayerInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetEntityId: expectString(
          value.targetEntityId,
          `${label}.targetEntityId`
        )
      }).action;
    case "toggleVisibility":
      return createToggleVisibilityInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetBrushId: expectString(
          value.targetBrushId,
          `${label}.targetBrushId`
        ),
        visible:
          value.visible === undefined
            ? undefined
            : expectBoolean(value.visible, `${label}.visible`)
      }).action;
    case "playAnimation": {
      const targetModelInstanceId = expectString(
        value.targetModelInstanceId,
        `${label}.targetModelInstanceId`
      );
      if (targetModelInstanceId.trim().length === 0) {
        throw new Error(`${label}.targetModelInstanceId must be non-empty.`);
      }
      const clipName = expectString(value.clipName, `${label}.clipName`);
      if (clipName.trim().length === 0) {
        throw new Error(`${label}.clipName must be non-empty.`);
      }
      return createPlayAnimationInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetModelInstanceId,
        clipName,
        loop:
          value.loop === undefined
            ? undefined
            : expectBoolean(value.loop, `${label}.loop`)
      }).action;
    }
    case "stopAnimation": {
      const targetModelInstanceId = expectString(
        value.targetModelInstanceId,
        `${label}.targetModelInstanceId`
      );
      if (targetModelInstanceId.trim().length === 0) {
        throw new Error(`${label}.targetModelInstanceId must be non-empty.`);
      }
      return createStopAnimationInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetModelInstanceId
      }).action;
    }
    case "playSound": {
      const targetSoundEmitterId = expectString(
        value.targetSoundEmitterId,
        `${label}.targetSoundEmitterId`
      );
      if (targetSoundEmitterId.trim().length === 0) {
        throw new Error(`${label}.targetSoundEmitterId must be non-empty.`);
      }
      return createPlaySoundInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetSoundEmitterId
      }).action;
    }
    case "stopSound": {
      const targetSoundEmitterId = expectString(
        value.targetSoundEmitterId,
        `${label}.targetSoundEmitterId`
      );
      if (targetSoundEmitterId.trim().length === 0) {
        throw new Error(`${label}.targetSoundEmitterId must be non-empty.`);
      }
      return createStopSoundInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        targetSoundEmitterId
      }).action;
    }
    case "runSequence": {
      const sequenceId = expectString(value.sequenceId, `${label}.sequenceId`);

      if (sequenceId.trim().length === 0) {
        throw new Error(`${label}.sequenceId must be non-empty.`);
      }

      return createRunSequenceInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        sequenceId
      }).action;
    }
    case "control":
      return createControlInteractionLink({
        sourceEntityId: "interaction-source-placeholder",
        effect: readControlEffect(value.effect, `${label}.effect`)
      }).action;
    default:
      throw new Error(`${label}.type must be a supported interaction action.`);
  }
}

function readProjectScheduler(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): ProjectScheduler {
  if (value === undefined && options.allowMissing) {
    return createEmptyProjectScheduler();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const routinesValue = value.routines;

  if (!isRecord(routinesValue)) {
    throw new Error(`${label}.routines must be an object.`);
  }

  const routines = Object.fromEntries(
    Object.entries(routinesValue).map(([routineId, routineValue]) => {
      if (!isRecord(routineValue)) {
        throw new Error(`${label}.routines.${routineId} must be an object.`);
      }

      const target = readControlTargetRef(
        routineValue.target,
        `${label}.routines.${routineId}.target`
      );
      const effects = Array.isArray(routineValue.effects)
        ? routineValue.effects.map((effectValue, effectIndex) =>
            readControlEffect(
              effectValue,
              `${label}.routines.${routineId}.effects.${effectIndex}`
            )
          )
        : routineValue.effect === undefined
          ? undefined
          : [
              readControlEffect(
                routineValue.effect,
                `${label}.routines.${routineId}.effect`
              )
            ];

      return [
        routineId,
        createProjectScheduleRoutine({
          id: expectString(
            routineValue.id,
            `${label}.routines.${routineId}.id`
          ),
          title: expectString(
            routineValue.title,
            `${label}.routines.${routineId}.title`
          ),
          enabled: readOptionalBoolean(
            routineValue.enabled,
            `${label}.routines.${routineId}.enabled`,
            true
          ),
          target: target as ReturnType<typeof createActorControlTargetRef>,
          sequenceId:
            routineValue.sequenceId === undefined ||
            routineValue.sequenceId === null
              ? null
              : expectString(
                  routineValue.sequenceId,
                  `${label}.routines.${routineId}.sequenceId`
                ),
          days:
            routineValue.days === undefined
              ? createProjectScheduleEveryDaySelection()
              : (() => {
                  if (!isRecord(routineValue.days)) {
                    throw new Error(
                      `${label}.routines.${routineId}.days must be an object.`
                    );
                  }

                  const mode = expectString(
                    routineValue.days.mode,
                    `${label}.routines.${routineId}.days.mode`
                  );

                  if (mode === "everyDay") {
                    return createProjectScheduleEveryDaySelection();
                  }

                  if (mode !== "selectedDays") {
                    throw new Error(
                      `${label}.routines.${routineId}.days.mode must be everyDay or selectedDays.`
                    );
                  }

                  return {
                    mode: "selectedDays" as const,
                    days: expectStringArray(
                      routineValue.days.days,
                      `${label}.routines.${routineId}.days.days`
                    ).map((day) => {
                      switch (day) {
                        case "monday":
                        case "tuesday":
                        case "wednesday":
                        case "thursday":
                        case "friday":
                        case "saturday":
                        case "sunday":
                          return day;
                        default:
                          throw new Error(
                            `${label}.routines.${routineId}.days.days must only contain supported weekdays.`
                          );
                      }
                    })
                  };
                })(),
          startHour: expectFiniteNumber(
            routineValue.startHour,
            `${label}.routines.${routineId}.startHour`
          ),
          endHour: expectFiniteNumber(
            routineValue.endHour,
            `${label}.routines.${routineId}.endHour`
          ),
          priority: readOptionalFiniteNumber(
            routineValue.priority,
            `${label}.routines.${routineId}.priority`,
            0
          ),
          effects
        })
      ];
    })
  );

  return {
    routines
  };
}

function readProjectDialogueLibrary(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): ProjectDialogueLibrary {
  if (value === undefined) {
    if (options.allowMissing) {
      return createEmptyProjectDialogueLibrary();
    }

    return createEmptyProjectDialogueLibrary();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!isRecord(value.dialogues)) {
    throw new Error(`${label}.dialogues must be an object.`);
  }

  const dialogues: ProjectDialogueLibrary["dialogues"] = {};

  for (const [dialogueKey, dialogueValue] of Object.entries(value.dialogues)) {
    if (!isRecord(dialogueValue)) {
      throw new Error(`${label}.dialogues.${dialogueKey} must be an object.`);
    }

    const linesValue = dialogueValue.lines;

    if (!Array.isArray(linesValue)) {
      throw new Error(
        `${label}.dialogues.${dialogueKey}.lines must be an array.`
      );
    }

    dialogues[dialogueKey] = createProjectDialogue({
      id: expectString(
        dialogueValue.id,
        `${label}.dialogues.${dialogueKey}.id`
      ),
      title: expectString(
        dialogueValue.title,
        `${label}.dialogues.${dialogueKey}.title`
      ),
      lines: linesValue.map((lineValue, lineIndex) => {
        if (!isRecord(lineValue)) {
          throw new Error(
            `${label}.dialogues.${dialogueKey}.lines.${lineIndex} must be an object.`
          );
        }

        return createProjectDialogueLine({
          id: expectString(
            lineValue.id,
            `${label}.dialogues.${dialogueKey}.lines.${lineIndex}.id`
          ),
          text: expectString(
            lineValue.text,
            `${label}.dialogues.${dialogueKey}.lines.${lineIndex}.text`
          )
        });
      })
    });
  }

  return {
    dialogues
  };
}

function readProjectSequenceEffect(
  value: unknown,
  label: string
): SequenceClip {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const type = expectString(value.type, `${label}.type`);
  const stepClass = expectString(value.stepClass, `${label}.stepClass`);

  if (stepClass !== "held" && stepClass !== "impulse") {
    throw new Error(`${label}.stepClass must be held or impulse.`);
  }

  switch (type) {
    case "controlEffect":
      return {
        stepClass,
        type: "controlEffect",
        effect: readControlEffect(value.effect, `${label}.effect`)
      };
    case "makeNpcTalk":
      if (stepClass !== "impulse") {
        throw new Error(
          `${label}.makeNpcTalk effects must use the impulse class.`
        );
      }

      return {
        stepClass: "impulse",
        type: "makeNpcTalk",
        npcEntityId: expectString(value.npcEntityId, `${label}.npcEntityId`),
        dialogueId: readOptionalDialogueResourceId(
          value.dialogueId,
          `${label}.dialogueId`
        )
      };
    case "teleportPlayer":
      if (stepClass !== "impulse") {
        throw new Error(
          `${label}.teleportPlayer effects must use the impulse class.`
        );
      }

      return {
        stepClass: "impulse",
        type: "teleportPlayer",
        targetEntityId: expectString(
          value.targetEntityId,
          `${label}.targetEntityId`
        )
      };
    case "startSceneTransition":
      if (stepClass !== "impulse") {
        throw new Error(
          `${label}.startSceneTransition effects must use the impulse class.`
        );
      }

      return {
        stepClass: "impulse",
        type: "startSceneTransition",
        targetSceneId: expectString(
          value.targetSceneId,
          `${label}.targetSceneId`
        ),
        targetEntryEntityId: expectString(
          value.targetEntryEntityId,
          `${label}.targetEntryEntityId`
        )
      };
    case "toggleVisibility":
    case "setVisibility": {
      const isLegacyToggle = value.type === "toggleVisibility";

      if (stepClass !== "impulse") {
        throw new Error(
          `${label}.${String(value.type)} effects must use the impulse class.`
        );
      }

      if (isLegacyToggle) {
        const visible =
          value.visible === undefined
            ? undefined
            : expectBoolean(value.visible, `${label}.visible`);

        return {
          stepClass: "impulse",
          type: "setVisibility",
          target: {
            kind: "brush",
            brushId: expectString(value.targetBrushId, `${label}.targetBrushId`)
          },
          mode: visible === undefined ? "toggle" : visible ? "show" : "hide"
        };
      }

      if (!isRecord(value.target)) {
        throw new Error(`${label}.target must be an object.`);
      }

      const targetKind = expectString(
        value.target.kind,
        `${label}.target.kind`
      );

      if (targetKind !== "brush" && targetKind !== "modelInstance") {
        throw new Error(`${label}.target.kind must be brush or modelInstance.`);
      }

      const mode = expectString(value.mode, `${label}.mode`);

      if (mode !== "toggle" && mode !== "show" && mode !== "hide") {
        throw new Error(`${label}.mode must be toggle, show, or hide.`);
      }

      return {
        stepClass: "impulse",
        type: "setVisibility",
        target:
          targetKind === "brush"
            ? {
                kind: "brush",
                brushId: expectString(
                  value.target.brushId,
                  `${label}.target.brushId`
                )
              }
            : {
                kind: "modelInstance",
                modelInstanceId: expectString(
                  value.target.modelInstanceId,
                  `${label}.target.modelInstanceId`
                )
              },
        mode
      };
    }
    default:
      throw new Error(`${label}.type must be a supported sequence effect.`);
  }
}

function readProjectSequenceLibrary(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): ProjectSequenceLibrary {
  if (value === undefined) {
    if (options.allowMissing) {
      return createEmptyProjectSequenceLibrary();
    }

    return createEmptyProjectSequenceLibrary();
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!isRecord(value.sequences)) {
    throw new Error(`${label}.sequences must be an object.`);
  }

  const sequences: ProjectSequenceLibrary["sequences"] = {};

  for (const [sequenceKey, sequenceValue] of Object.entries(value.sequences)) {
    if (!isRecord(sequenceValue)) {
      throw new Error(`${label}.sequences.${sequenceKey} must be an object.`);
    }

    const effectsValue = Array.isArray(sequenceValue.effects)
      ? sequenceValue.effects
      : Array.isArray(sequenceValue.clips)
        ? sequenceValue.clips
        : sequenceValue.steps;

    if (!Array.isArray(effectsValue)) {
      throw new Error(
        `${label}.sequences.${sequenceKey}.effects must be an array.`
      );
    }

    sequences[sequenceKey] = createProjectSequence({
      id: expectString(
        sequenceValue.id,
        `${label}.sequences.${sequenceKey}.id`
      ),
      title: expectString(
        sequenceValue.title,
        `${label}.sequences.${sequenceKey}.title`
      ),
      effects: effectsValue.map((effectValue, effectIndex) =>
        readProjectSequenceEffect(
          effectValue,
          `${label}.sequences.${sequenceKey}.effects.${effectIndex}`
        )
      )
    });
  }

  return {
    sequences
  };
}

function migrateLegacySceneNpcPresenceToScheduler(
  document: SceneDocument
): SceneDocument {
  let nextScheduler = createEmptyProjectScheduler();
  let nextEntities = document.entities;
  let migrated = false;

  for (const [entityId, entity] of Object.entries(document.entities)) {
    if (entity.kind !== "npc" || entity.presence.mode !== "timeWindow") {
      continue;
    }

    if (!migrated) {
      nextScheduler = readProjectScheduler(document.scheduler, "scheduler", {
        allowMissing: true
      });
      nextEntities = {
        ...document.entities
      };
      migrated = true;
    }

    nextScheduler.routines[`schedule-routine-${entityId}`] =
      createProjectScheduleRoutine({
        id: `schedule-routine-${entityId}`,
        title: entity.name?.trim() || entity.actorId,
        target: createActorControlTargetRef(entity.actorId),
        days: createProjectScheduleEveryDaySelection(),
        startHour: entity.presence.startHour,
        endHour: entity.presence.endHour,
        priority: 0,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(entity.actorId),
          active: true
        })
      });
    nextEntities[entityId] = createNpcEntity({
      ...entity,
      presence: createNpcAlwaysPresence()
    });
  }

  if (!migrated) {
    return {
      ...document,
      scheduler: readProjectScheduler(document.scheduler, "scheduler", {
        allowMissing: true
      })
    };
  }

  return {
    ...document,
    scheduler: nextScheduler,
    entities: nextEntities
  };
}

function migrateLegacyProjectNpcPresenceToScheduler(
  document: ProjectDocument
): ProjectDocument {
  let nextScheduler = readProjectScheduler(document.scheduler, "scheduler", {
    allowMissing: true
  });
  let nextScenes = document.scenes;
  let migrated = false;

  for (const [sceneId, scene] of Object.entries(document.scenes)) {
    let nextEntities = scene.entities;
    let sceneChanged = false;

    for (const [entityId, entity] of Object.entries(scene.entities)) {
      if (entity.kind !== "npc" || entity.presence.mode !== "timeWindow") {
        continue;
      }

      if (!migrated) {
        nextScenes = {
          ...document.scenes
        };
        migrated = true;
      }

      if (!sceneChanged) {
        nextEntities = {
          ...scene.entities
        };
        sceneChanged = true;
      }

      nextScheduler.routines[`schedule-routine-${sceneId}-${entityId}`] =
        createProjectScheduleRoutine({
          id: `schedule-routine-${sceneId}-${entityId}`,
          title: entity.name?.trim() || entity.actorId,
          target: createActorControlTargetRef(entity.actorId),
          days: createProjectScheduleEveryDaySelection(),
          startHour: entity.presence.startHour,
          endHour: entity.presence.endHour,
          priority: 0,
          effect: createSetActorPresenceControlEffect({
            target: createActorControlTargetRef(entity.actorId),
            active: true
          })
        });
      nextEntities[entityId] = createNpcEntity({
        ...entity,
        presence: createNpcAlwaysPresence()
      });
    }

    if (sceneChanged) {
      nextScenes[sceneId] = {
        ...scene,
        entities: nextEntities
      };
    }
  }

  return {
    ...document,
    scheduler: nextScheduler,
    scenes: nextScenes
  };
}

function readInteractionLink(value: unknown, label: string): InteractionLink {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const trigger = expectString(value.trigger, `${label}.trigger`);

  if (!isInteractionTriggerKind(trigger)) {
    throw new Error(
      `${label}.trigger must be a supported interaction trigger.`
    );
  }

  const action = readInteractionAction(value.action, `${label}.action`);

  switch (action.type) {
    case "teleportPlayer":
      return createTeleportPlayerInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetEntityId: action.targetEntityId
      });
    case "toggleVisibility":
      return createToggleVisibilityInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetBrushId: action.targetBrushId,
        visible: action.visible
      });
    case "playAnimation":
      return createPlayAnimationInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetModelInstanceId: action.targetModelInstanceId,
        clipName: action.clipName,
        loop: action.loop
      });
    case "stopAnimation":
      return createStopAnimationInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetModelInstanceId: action.targetModelInstanceId
      });
    case "playSound":
      return createPlaySoundInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetSoundEmitterId: action.targetSoundEmitterId
      });
    case "stopSound":
      return createStopSoundInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        targetSoundEmitterId: action.targetSoundEmitterId
      });
    case "runSequence":
      return createRunSequenceInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        sequenceId: action.sequenceId
      });
    case "control":
      return createControlInteractionLink({
        id: expectString(value.id, `${label}.id`),
        sourceEntityId: expectString(
          value.sourceEntityId,
          `${label}.sourceEntityId`
        ),
        trigger,
        effect: action.effect
      });
  }
}

function readInteractionLinks(
  value: unknown
): SceneDocument["interactionLinks"] {
  if (!isRecord(value)) {
    throw new Error("interactionLinks must be a record.");
  }

  const interactionLinks: SceneDocument["interactionLinks"] = {};

  for (const [linkId, linkValue] of Object.entries(value)) {
    const interactionLink = readInteractionLink(
      linkValue,
      `interactionLinks.${linkId}`
    );

    if (interactionLink.id !== linkId) {
      throw new Error(
        `interactionLinks.${linkId}.id must match the registry key.`
      );
    }

    interactionLinks[linkId] = interactionLink;
  }

  return interactionLinks;
}

function readScenePathPointValue(
  value: unknown,
  label: string
): ScenePathPoint {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return createScenePathPoint({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`)
  });
}

function readScenePathValue(value: unknown, label: string): ScenePath {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!Array.isArray(value.points)) {
    throw new Error(`${label}.points must be an array.`);
  }

  return createScenePath({
    id: expectString(value.id, `${label}.id`),
    name:
      value.name === undefined
        ? undefined
        : expectString(value.name, `${label}.name`),
    visible: expectBoolean(value.visible, `${label}.visible`),
    enabled: expectBoolean(value.enabled, `${label}.enabled`),
    loop: expectBoolean(value.loop, `${label}.loop`),
    points: value.points.map((pointValue, index) =>
      readScenePathPointValue(pointValue, `${label}.points.${index}`)
    )
  });
}

function readScenePaths(value: unknown): SceneDocument["paths"] {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error("paths must be a record.");
  }

  const paths: SceneDocument["paths"] = {};

  for (const [pathId, pathValue] of Object.entries(value)) {
    const path = readScenePathValue(pathValue, `paths.${pathId}`);

    if (path.id !== pathId) {
      throw new Error(`paths.${pathId}.id must match the registry key.`);
    }

    paths[pathId] = path;
  }

  return paths;
}

export function migrateSceneDocument(source: unknown): SceneDocument {
  if (!isRecord(source)) {
    throw new Error("Scene document must be a JSON object.");
  }

  if (source.version === FOUNDATION_SCENE_DOCUMENT_VERSION) {
    expectEmptyCollection(source.materials, "materials");
    expectEmptyCollection(source.brushes, "brushes");

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials: createStarterMaterialRegistry(),
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: {},
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === BOX_BRUSH_SCENE_DOCUMENT_VERSION) {
    expectEmptyCollection(source.materials, "materials");
    const materials = createStarterMaterialRegistry();

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, true),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === FACE_MATERIALS_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === RUNNER_V1_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (source.version === ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: expectEmptyCollection(
        source.interactionLinks,
        "interactionLinks"
      )
    };
  }

  if (
    source.version === TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION
  ) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: true }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v11 → v12: animation fields added to model instances and interaction links
  // readModelInstance now reads animationClipName/animationAutoplay as optional (defaulting to undefined)
  // so no special handling is needed beyond routing through the same readers
  if (source.version === 11) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v16 -> v18: Player Start collider settings landed before whitebox box rotation.
  if (source.version === IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v17 -> v18: box-based whitebox solids gained authored object rotation.
  if (
    source.version === PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION
  ) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v15 -> v16: model instances gained authored collider settings.
  if (source.version === ENTITY_NAMES_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v14 -> v15: entities gained an optional authored name field.
  if (source.version === 14) {
    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);

    return {
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptyProjectScheduler(),
      sequences: createEmptyProjectSequenceLibrary(),
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      terrains: {},
      paths: {},
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (
    source.version !== SCENE_DOCUMENT_VERSION &&
    source.version !== PATH_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== NPC_PRESENCE_SCENE_DOCUMENT_VERSION &&
    source.version !== NPC_ENTITY_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== WORLD_TIME_ENVIRONMENT_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_TIME_NIGHT_BACKGROUND_SCENE_DOCUMENT_VERSION &&
    source.version !== 33 &&
    source.version !== AUTHORED_OBJECT_STATE_SCENE_DOCUMENT_VERSION &&
    source.version !==
      PLAYER_START_AIR_DIRECTION_CONTROL_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_AIR_CONTROL_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_MOVEMENT_TEMPLATE_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_NAME_SCENE_DOCUMENT_VERSION &&
    source.version !== STATIC_SIMPLE_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION &&
    source.version !== SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION &&
    source.version !==
      PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION &&
    source.version !== SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION &&
    source.version !== RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION &&
    source.version !== MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_TIME_DAY_NIGHT_PROFILE_SCENE_DOCUMENT_VERSION &&
    source.version !== WATER_SURFACE_DISPLACEMENT_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_BEVEL_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_PRIMITIVES_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_BOX_VOLUME_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION &&
    source.version !== NPC_COLLIDER_SCENE_DOCUMENT_VERSION &&
    source.version !== CONTROL_SURFACE_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== EXPANDED_CONTROL_SURFACE_SCENE_DOCUMENT_VERSION &&
    source.version !== SCHEDULER_CONTROL_EFFECTS_SCENE_DOCUMENT_VERSION &&
    source.version !== SCHEDULER_ACTOR_ROUTINE_EFFECTS_SCENE_DOCUMENT_VERSION &&
    source.version !== NPC_DIALOGUE_REFERENCE_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_DIALOGUE_LIBRARY_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_PAUSE_BINDINGS_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_SEQUENCE_LIBRARY_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_SEQUENCE_CLIPS_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_SEQUENCE_TIMING_SCENE_DOCUMENT_VERSION &&
    source.version !== PROJECT_SEQUENCE_EFFECTS_SCENE_DOCUMENT_VERSION &&
    source.version !==
      PROJECT_SEQUENCE_UNIFIED_VISIBILITY_SCENE_DOCUMENT_VERSION &&
    source.version !==
      SCENE_TRANSITION_SEQUENCE_EFFECTS_SCENE_DOCUMENT_VERSION &&
    source.version !== AUTHORED_TERRAIN_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== AUTHORED_TERRAIN_PAINT_SCENE_DOCUMENT_VERSION &&
    source.version !== AUTHORED_TERRAIN_COLLISION_SCENE_DOCUMENT_VERSION &&
    source.version !== DAWN_DUSK_BACKGROUND_IMAGE_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_BOX_LIGHT_VOLUME_SCENE_DOCUMENT_VERSION &&
    source.version !== CELESTIAL_BODY_OVERLAY_SCENE_DOCUMENT_VERSION &&
    source.version !== SHADER_SKY_SCENE_DOCUMENT_VERSION &&
    source.version !== SHADER_SKY_HORIZON_HEIGHT_SCENE_DOCUMENT_VERSION &&
    source.version !== SCENE_DOCUMENT_VERSION &&
    source.version !== FOLLOW_ACTOR_PATH_SMOOTH_SCENE_DOCUMENT_VERSION
  ) {
    throw new Error(
      `Unsupported scene document version: ${String(source.version)}.`
    );
  }

  const materials = readMaterialRegistry(source.materials, "materials", {
    allowLegacyStarterPatterns:
      source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
  });
  const assets = readAssets(source.assets);
  const legacyDialogues = readProjectDialogueLibrary(
    source.dialogues,
    "dialogues",
    {
      allowMissing: true
    }
  );

  const migratedDocument: SceneDocument = {
    version: SCENE_DOCUMENT_VERSION,
    name: expectString(source.name, "name"),
    time: readProjectTimeSettings(source.time, "time", {
      allowMissing: source.version < PROJECT_TIME_SYSTEM_SCENE_DOCUMENT_VERSION
    }),
    scheduler: readProjectScheduler(source.scheduler, "scheduler", {
      allowMissing:
        source.version < PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION
    }),
    sequences: readProjectSequenceLibrary(source.sequences, "sequences", {
      allowMissing:
        source.version < PROJECT_SEQUENCE_LIBRARY_SCENE_DOCUMENT_VERSION
    }),
    world: readWorldSettings(source.world, {
      legacyProjectTimeValue:
        source.version < SCENE_DOCUMENT_VERSION ? source.time : undefined
    }),
    materials,
    textures: expectEmptyCollection(source.textures, "textures"),
    assets,
    brushes: readBrushes(source.brushes, materials, false),
    terrains: readTerrains(source.terrains),
    paths: readScenePaths(source.paths),
    modelInstances: readModelInstances(source.modelInstances, assets),
    entities: readEntities(source.entities, {
      legacySoundEmitter: false,
      legacyProjectDialogues: legacyDialogues
    }),
    interactionLinks: readInteractionLinks(source.interactionLinks)
  };

  return source.version < PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION
    ? migrateLegacySceneNpcPresenceToScheduler(migratedDocument)
    : migratedDocument;
}

function readProjectScene(
  value: unknown,
  label: string,
  materials: Record<string, MaterialDef>,
  assets: Record<string, ProjectAssetRecord>,
  options: {
    allowMissingLoadingScreen: boolean;
    allowMissingEditorPreferences: boolean;
    legacyProjectTimeValue?: unknown;
    legacyProjectDialogues?: ProjectDialogueLibrary;
  }
): ProjectScene {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    id: expectString(value.id, `${label}.id`),
    name: expectString(value.name, `${label}.name`),
    loadingScreen: readSceneLoadingScreen(
      value.loadingScreen,
      `${label}.loadingScreen`,
      {
        allowMissing: options.allowMissingLoadingScreen
      }
    ),
    editorPreferences: readSceneEditorPreferences(
      value.editorPreferences,
      `${label}.editorPreferences`,
      {
        allowMissing: options.allowMissingEditorPreferences
      }
    ),
    world: readWorldSettings(value.world, {
      legacyProjectTimeValue: options.legacyProjectTimeValue
    }),
    brushes: readBrushes(value.brushes, materials, false),
    terrains: readTerrains(value.terrains),
    paths: readScenePaths(value.paths),
    modelInstances: readModelInstances(value.modelInstances, assets),
    entities: readEntities(value.entities, {
      legacySoundEmitter: false,
      legacyProjectDialogues: options.legacyProjectDialogues
    }),
    interactionLinks: readInteractionLinks(value.interactionLinks)
  };
}

function isProjectDocumentVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    value <= SCENE_DOCUMENT_VERSION
  );
}

function readProjectName(
  value: unknown,
  label: string,
  options: { allowMissing: boolean }
): string {
  if (value === undefined && options.allowMissing) {
    return DEFAULT_PROJECT_NAME;
  }

  return expectString(value, label);
}

export function migrateProjectDocument(source: unknown): ProjectDocument {
  if (!isRecord(source)) {
    throw new Error("Project document must be a JSON object.");
  }

  if (isProjectDocumentVersion(source.version)) {
    if (!isRecord(source.scenes)) {
      throw new Error("scenes must be an object.");
    }

    const materials = readMaterialRegistry(source.materials, "materials", {
      allowLegacyStarterPatterns:
        source.version < STARTER_PBR_MATERIAL_LIBRARY_SCENE_DOCUMENT_VERSION
    });
    const assets = readAssets(source.assets);
    const scenes: Record<string, ProjectScene> = {};
    const allowMissingLoadingScreen =
      source.version === MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION;
    const allowMissingProjectName =
      source.version < PROJECT_NAME_SCENE_DOCUMENT_VERSION;
    const allowMissingEditorPreferences =
      source.version < SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION;
    const allowMissingTimeSettings =
      source.version < PROJECT_TIME_SYSTEM_SCENE_DOCUMENT_VERSION;
    const legacyDialogues = readProjectDialogueLibrary(
      source.dialogues,
      "dialogues",
      {
        allowMissing: true
      }
    );

    for (const [sceneKey, sceneValue] of Object.entries(source.scenes)) {
      scenes[sceneKey] = readProjectScene(
        sceneValue,
        `scenes.${sceneKey}`,
        materials,
        assets,
        {
          allowMissingLoadingScreen,
          allowMissingEditorPreferences,
          legacyProjectTimeValue:
            source.version < SCENE_DOCUMENT_VERSION ? source.time : undefined,
          legacyProjectDialogues: legacyDialogues
        }
      );
    }

    const migratedDocument: ProjectDocument = {
      version: SCENE_DOCUMENT_VERSION,
      name: readProjectName(source.name, "name", {
        allowMissing: allowMissingProjectName
      }),
      time: readProjectTimeSettings(source.time, "time", {
        allowMissing: allowMissingTimeSettings
      }),
      scheduler: readProjectScheduler(source.scheduler, "scheduler", {
        allowMissing:
          source.version < PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION
      }),
      sequences: readProjectSequenceLibrary(source.sequences, "sequences", {
        allowMissing:
          source.version < PROJECT_SEQUENCE_LIBRARY_SCENE_DOCUMENT_VERSION
      }),
      activeSceneId: expectString(source.activeSceneId, "activeSceneId"),
      scenes,
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets
    };

    return source.version < PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION
      ? migrateLegacyProjectNpcPresenceToScheduler(migratedDocument)
      : migratedDocument;
  }

  return createProjectDocumentFromSceneDocument(
    migrateSceneDocument(source),
    DEFAULT_PROJECT_SCENE_ID
  );
}
