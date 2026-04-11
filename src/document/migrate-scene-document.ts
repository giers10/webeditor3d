import {
  createStarterMaterialRegistry,
  type MaterialDef,
  type MaterialPattern
} from "../materials/starter-material-library";
import {
  createModelInstanceCollisionSettings,
  createModelInstance,
  isModelInstanceCollisionMode,
  normalizeModelInstanceName,
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
  DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
  DEFAULT_PLAYER_START_GAMEPAD_BINDINGS,
  DEFAULT_PLAYER_START_KEYBOARD_BINDINGS,
  createPlayerStartColliderSettings,
  createPlayerStartInputBindings,
  createPlayerStartMovementTemplate,
  createInteractableEntity,
  normalizeEntityName,
  createPointLightEntity,
  createPlayerStartEntity,
  createSceneEntryEntity,
  createSceneExitEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity,
  isPlayerStartColliderMode,
  isPlayerStartGamepadCameraLookBinding,
  isPlayerStartGamepadBinding,
  isPlayerStartKeyboardBindingCode,
  isPlayerStartMovementTemplateKind,
  isPlayerStartNavigationMode,
  type EntityInstance,
  type PlayerStartGamepadBinding,
  type PlayerStartGamepadCameraLookBinding,
  type PlayerStartMovementTemplateKind
} from "../entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
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
  MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
  createBoxBrush,
  createDefaultBoxBrushGeometry,
  createDefaultBoxBrushFogSettings,
  createDefaultBoxBrushWaterSettings,
  createDefaultFaceUvState,
  DEFAULT_BOX_BRUSH_ROTATION_DEGREES,
  isBoxBrushVolumeMode,
  isBoxFaceId,
  isFaceUvRotationQuarterTurns,
  normalizeBrushName,
  type BoxBrushVolumeSettings,
  type BoxBrushFaces,
  type BrushFace,
  type FaceUvState
} from "./brushes";
import {
  BOX_BRUSH_SCENE_DOCUMENT_VERSION,
  ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION,
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
  PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION,
  PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION,
  PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION,
  RUNNER_V1_SCENE_DOCUMENT_VERSION,
  SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION,
  SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION,
  PROJECT_NAME_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  STATIC_SIMPLE_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
  TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION,
  RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
  WATER_SURFACE_DISPLACEMENT_SCENE_DOCUMENT_VERSION,
  WHITEBOX_BOX_VOLUME_SCENE_DOCUMENT_VERSION,
  WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION,
  WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION,
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
  isAdvancedRenderingWaterReflectionMode,
  createDefaultAdvancedRenderingSettings,
  isBoxVolumeRenderPath,
  isAdvancedRenderingShadowMapSize,
  isAdvancedRenderingShadowType,
  isAdvancedRenderingToneMappingMode,
  isWorldBackgroundMode,
  type AdvancedRenderingSettings,
  type WorldBackgroundSettings,
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
    throw new Error(`${label}.viewMode must be a supported viewport view mode.`);
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

  const shadows = value.shadows as Record<string, unknown> | undefined;
  const ambientOcclusion = value.ambientOcclusion as
    | Record<string, unknown>
    | undefined;
  const bloom = value.bloom as Record<string, unknown> | undefined;
  const toneMapping = value.toneMapping as Record<string, unknown> | undefined;
  const depthOfField = value.depthOfField as
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
    fogPath,
    waterPath,
    waterReflectionMode
  };
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

function expectOptionalString(
  value: unknown,
  label: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectString(value, label);
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

function expectEmptyCollection(
  value: unknown,
  label: string
): Record<string, never> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  if (Object.keys(value).length > 0) {
    throw new Error(`${label} must be empty in the current schema.`);
  }

  return {};
}

function readProjectAssetBoundingBox(
  value: unknown,
  label: string
): ProjectAssetBoundingBox {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const min = readVec3(value.min, `${label}.min`);
  const max = readVec3(value.max, `${label}.max`);
  const size = readVec3(value.size, `${label}.size`);

  if (size.x < 0 || size.y < 0 || size.z < 0) {
    throw new Error(`${label}.size values must remain zero or greater.`);
  }

  return {
    min,
    max,
    size
  };
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
      typeof candidate === "string" && isPlayerStartKeyboardBindingCode(candidate)
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
  const capabilities = value.capabilities;

  if (capabilities !== undefined && !isRecord(capabilities)) {
    throw new Error(`${label}.capabilities must be an object.`);
  }

  return createPlayerStartMovementTemplate({
    kind,
    moveSpeed:
      value.moveSpeed === undefined
        ? undefined
        : expectPositiveFiniteNumber(value.moveSpeed, `${label}.moveSpeed`),
    capabilities: {
      jump: readOptionalBoolean(
        capabilities?.jump,
        `${label}.capabilities.jump`,
        DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES.jump
      ),
      sprint: readOptionalBoolean(
        capabilities?.sprint,
        `${label}.capabilities.sprint`,
        DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES.sprint
      ),
      crouch: readOptionalBoolean(
        capabilities?.crouch,
        `${label}.capabilities.crouch`,
        DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES.crouch
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

function expectMaterialPattern(value: unknown, label: string): MaterialPattern {
  if (
    value !== "grid" &&
    value !== "checker" &&
    value !== "stripes" &&
    value !== "diamond"
  ) {
    throw new Error(`${label} must be a supported starter material pattern.`);
  }

  return value;
}

function readMaterialRegistry(
  value: unknown,
  label: string
): SceneDocument["materials"] {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  const materials: SceneDocument["materials"] = {};

  for (const [materialId, materialValue] of Object.entries(value)) {
    if (!isRecord(materialValue)) {
      throw new Error(`${label}.${materialId} must be an object.`);
    }

    const material: MaterialDef = {
      id: expectString(materialValue.id, `${label}.${materialId}.id`),
      name: expectString(materialValue.name, `${label}.${materialId}.name`),
      baseColorHex: expectHexColor(
        materialValue.baseColorHex,
        `${label}.${materialId}.baseColorHex`
      ),
      accentColorHex: expectHexColor(
        materialValue.accentColorHex,
        `${label}.${materialId}.accentColorHex`
      ),
      pattern: expectMaterialPattern(
        materialValue.pattern,
        `${label}.${materialId}.pattern`
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
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const extraFaceKeys = Object.keys(value).filter(
    (faceId) => !isBoxFaceId(faceId)
  );

  if (extraFaceKeys.length > 0) {
    throw new Error(
      `${label} contains unsupported face ids: ${extraFaceKeys.join(", ")}.`
    );
  }

  return {
    posX: readBrushFace(
      value.posX,
      `${label}.posX`,
      materials,
      allowMissingUvState
    ),
    negX: readBrushFace(
      value.negX,
      `${label}.negX`,
      materials,
      allowMissingUvState
    ),
    posY: readBrushFace(
      value.posY,
      `${label}.posY`,
      materials,
      allowMissingUvState
    ),
    negY: readBrushFace(
      value.negY,
      `${label}.negY`,
      materials,
      allowMissingUvState
    ),
    posZ: readBrushFace(
      value.posZ,
      `${label}.posZ`,
      materials,
      allowMissingUvState
    ),
    negZ: readBrushFace(
      value.negZ,
      `${label}.negZ`,
      materials,
      allowMissingUvState
    )
  };
}

function readBoxBrushGeometry(
  value: unknown,
  label: string,
  size: { x: number; y: number; z: number }
) {
  if (value === undefined) {
    return createDefaultBoxBrushGeometry(size);
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!isRecord(value.vertices)) {
    throw new Error(`${label}.vertices must be an object.`);
  }

  const extraVertexKeys = Object.keys(value.vertices).filter(
    (vertexId) =>
      !BOX_VERTEX_IDS.includes(vertexId as (typeof BOX_VERTEX_IDS)[number])
  );

  if (extraVertexKeys.length > 0) {
    throw new Error(
      `${label}.vertices contains unsupported vertex ids: ${extraVertexKeys.join(", ")}.`
    );
  }

  return {
    vertices: {
      negX_negY_negZ: readVec3(
        value.vertices.negX_negY_negZ,
        `${label}.vertices.negX_negY_negZ`
      ),
      posX_negY_negZ: readVec3(
        value.vertices.posX_negY_negZ,
        `${label}.vertices.posX_negY_negZ`
      ),
      negX_posY_negZ: readVec3(
        value.vertices.negX_posY_negZ,
        `${label}.vertices.negX_posY_negZ`
      ),
      posX_posY_negZ: readVec3(
        value.vertices.posX_posY_negZ,
        `${label}.vertices.posX_posY_negZ`
      ),
      negX_negY_posZ: readVec3(
        value.vertices.negX_negY_posZ,
        `${label}.vertices.negX_negY_posZ`
      ),
      posX_negY_posZ: readVec3(
        value.vertices.posX_negY_posZ,
        `${label}.vertices.posX_negY_posZ`
      ),
      negX_posY_posZ: readVec3(
        value.vertices.negX_posY_posZ,
        `${label}.vertices.negX_posY_posZ`
      ),
      posX_posY_posZ: readVec3(
        value.vertices.posX_posY_posZ,
        `${label}.vertices.posX_posY_posZ`
      )
    }
  };
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

    if (brushValue.kind !== "box") {
      throw new Error(`brushes.${brushId}.kind must be box.`);
    }

    const center = readVec3(brushValue.center, `brushes.${brushId}.center`);
    const size = readVec3(brushValue.size, `brushes.${brushId}.size`);

    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      throw new Error(`brushes.${brushId}.size values must be positive.`);
    }

    brushes[brushId] = createBoxBrush({
      id: expectString(brushValue.id, `brushes.${brushId}.id`),
      name: readOptionalBrushName(brushValue.name, `brushes.${brushId}.name`),
      center,
      rotationDegrees: readOptionalVec3(
        brushValue.rotationDegrees,
        `brushes.${brushId}.rotationDegrees`,
        DEFAULT_BOX_BRUSH_ROTATION_DEGREES
      ),
      size,
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
      ),
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
    });
  }

  return brushes;
}

function readWorldSettings(value: unknown): WorldSettings {
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

  const backgroundMode = expectString(background.mode, "world.background.mode");
  let resolvedBackground: WorldBackgroundSettings;

  if (!isWorldBackgroundMode(backgroundMode)) {
    throw new Error(
      "world.background.mode must be a supported background mode."
    );
  }

  if (backgroundMode === "solid") {
    resolvedBackground = {
      mode: "solid",
      colorHex: expectHexColor(background.colorHex, "world.background.colorHex")
    };
  } else if (backgroundMode === "verticalGradient") {
    resolvedBackground = {
      mode: "verticalGradient",
      topColorHex: expectHexColor(
        background.topColorHex,
        "world.background.topColorHex"
      ),
      bottomColorHex: expectHexColor(
        background.bottomColorHex,
        "world.background.bottomColorHex"
      )
    };
  } else {
    resolvedBackground = {
      mode: "image",
      assetId: expectString(background.assetId, "world.background.assetId"),
      // Default to 0.5 for documents saved before environmentIntensity was added
      environmentIntensity:
        typeof background.environmentIntensity === "number" &&
        isFinite(background.environmentIntensity) &&
        background.environmentIntensity >= 0
          ? background.environmentIntensity
          : 0.5
    };
  }

  return {
    background: resolvedBackground,
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
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`),
    navigationMode: readPlayerStartNavigationMode(
      value.navigationMode,
      `${label}.navigationMode`
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
  const entity = createInteractableEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    position: readVec3(value.position, `${label}.position`),
    radius: expectPositiveFiniteNumber(value.radius, `${label}.radius`),
    prompt: expectString(value.prompt, `${label}.prompt`),
    enabled: expectBoolean(value.enabled, `${label}.enabled`)
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
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be sceneEntry.`);
  }

  return entity;
}

function readSceneExitEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "sceneExit", `${label}.kind`);
  const entity = createSceneExitEntity({
    id: expectString(value.id, `${label}.id`),
    name: readOptionalEntityName(value.name, `${label}.name`),
    position: readVec3(value.position, `${label}.position`),
    radius: expectPositiveFiniteNumber(value.radius, `${label}.radius`),
    prompt: expectString(value.prompt, `${label}.prompt`),
    enabled: expectBoolean(value.enabled, `${label}.enabled`),
    targetSceneId: expectString(value.targetSceneId, `${label}.targetSceneId`),
    targetEntryEntityId: expectString(
      value.targetEntryEntityId,
      `${label}.targetEntryEntityId`
    )
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be sceneExit.`);
  }

  return entity;
}

function readEntityInstance(
  value: unknown,
  label: string,
  options: { legacySoundEmitter: boolean }
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
    case "sceneExit":
      return readSceneExitEntity(value, label);
    default:
      throw new Error(`${label}.kind must be a supported entity type.`);
  }
}

function readEntities(
  value: unknown,
  options: { legacySoundEmitter: boolean }
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
    default:
      throw new Error(`${label}.type must be a supported interaction action.`);
  }
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

export function migrateSceneDocument(source: unknown): SceneDocument {
  if (!isRecord(source)) {
    throw new Error("Scene document must be a JSON object.");
  }

  if (source.version === FOUNDATION_SCENE_DOCUMENT_VERSION) {
    expectEmptyCollection(source.materials, "materials");
    expectEmptyCollection(source.brushes, "brushes");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials: createStarterMaterialRegistry(),
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: {},
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
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, true),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
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
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: expectEmptyCollection(
        source.modelInstances,
        "modelInstances"
      ),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: true }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v11 → v12: animation fields added to model instances and interaction links
  // readModelInstance now reads animationClipName/animationAutoplay as optional (defaulting to undefined)
  // so no special handling is needed beyond routing through the same readers
  if (source.version === 11) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (source.version === SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v16 -> v18: Player Start collider settings landed before whitebox box rotation.
  if (source.version === IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v17 -> v18: box-based whitebox solids gained authored object rotation.
  if (
    source.version === PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION
  ) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v15 -> v16: model instances gained authored collider settings.
  if (source.version === ENTITY_NAMES_SCENE_DOCUMENT_VERSION) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  // v14 -> v15: entities gained an optional authored name field.
  if (source.version === 14) {
    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets,
      brushes: readBrushes(source.brushes, materials, false),
      modelInstances: readModelInstances(source.modelInstances, assets),
      entities: readEntities(source.entities, { legacySoundEmitter: false }),
      interactionLinks: readInteractionLinks(source.interactionLinks)
    };
  }

  if (
    source.version !== SCENE_DOCUMENT_VERSION &&
    source.version !== SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION &&
    source.version !== PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION &&
    source.version !== SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION &&
    source.version !== RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION &&
    source.version !== MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION &&
    source.version !== WATER_SURFACE_DISPLACEMENT_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_BOX_VOLUME_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_FLOAT_TRANSFORM_SCENE_DOCUMENT_VERSION &&
    source.version !== WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION
  ) {
    throw new Error(
      `Unsupported scene document version: ${String(source.version)}.`
    );
  }

  const materials = readMaterialRegistry(source.materials, "materials");
  const assets = readAssets(source.assets);

  return {
    version: SCENE_DOCUMENT_VERSION,
    name: expectString(source.name, "name"),
    world: readWorldSettings(source.world),
    materials,
    textures: expectEmptyCollection(source.textures, "textures"),
    assets,
    brushes: readBrushes(source.brushes, materials, false),
    modelInstances: readModelInstances(source.modelInstances, assets),
    entities: readEntities(source.entities, { legacySoundEmitter: false }),
    interactionLinks: readInteractionLinks(source.interactionLinks)
  };
}

function readProjectScene(
  value: unknown,
  label: string,
  materials: Record<string, MaterialDef>,
  assets: Record<string, ProjectAssetRecord>,
  options: {
    allowMissingLoadingScreen: boolean;
    allowMissingEditorPreferences: boolean;
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
    world: readWorldSettings(value.world),
    brushes: readBrushes(value.brushes, materials, false),
    modelInstances: readModelInstances(value.modelInstances, assets),
    entities: readEntities(value.entities, { legacySoundEmitter: false }),
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

    const materials = readMaterialRegistry(source.materials, "materials");
    const assets = readAssets(source.assets);
    const scenes: Record<string, ProjectScene> = {};
    const allowMissingLoadingScreen =
      source.version === MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION;
    const allowMissingProjectName =
      source.version < PROJECT_NAME_SCENE_DOCUMENT_VERSION;
    const allowMissingEditorPreferences =
      source.version < SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION;

    for (const [sceneKey, sceneValue] of Object.entries(source.scenes)) {
      scenes[sceneKey] = readProjectScene(
        sceneValue,
        `scenes.${sceneKey}`,
        materials,
        assets,
        {
          allowMissingLoadingScreen,
          allowMissingEditorPreferences
        }
      );
    }

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: readProjectName(source.name, "name", {
        allowMissing: allowMissingProjectName
      }),
      activeSceneId: expectString(source.activeSceneId, "activeSceneId"),
      scenes,
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets
    };
  }

  return createProjectDocumentFromSceneDocument(
    migrateSceneDocument(source),
    DEFAULT_PROJECT_SCENE_ID
  );
}
