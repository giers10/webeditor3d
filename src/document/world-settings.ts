import { DEFAULT_SUN_DIRECTION, type Vec3 } from "../core/vector";

export type WorldBackgroundMode = "solid" | "verticalGradient" | "image";

export const ADVANCED_RENDERING_SHADOW_MAP_SIZES = [512, 1024, 2048, 4096] as const;
export const ADVANCED_RENDERING_SHADOW_TYPES = ["basic", "pcf", "pcfSoft"] as const;
export const ADVANCED_RENDERING_TONE_MAPPING_MODES = ["none", "linear", "reinhard", "cineon", "acesFilmic"] as const;
export const BOX_VOLUME_RENDER_PATHS = ["performance", "quality"] as const;
export const ADVANCED_RENDERING_WATER_REFLECTION_MODES = ["none", "world", "all"] as const;

export type AdvancedRenderingShadowMapSize = (typeof ADVANCED_RENDERING_SHADOW_MAP_SIZES)[number];
export type AdvancedRenderingShadowType = (typeof ADVANCED_RENDERING_SHADOW_TYPES)[number];
export type AdvancedRenderingToneMappingMode = (typeof ADVANCED_RENDERING_TONE_MAPPING_MODES)[number];
export type BoxVolumeRenderPath = (typeof BOX_VOLUME_RENDER_PATHS)[number];
export type AdvancedRenderingWaterReflectionMode = (typeof ADVANCED_RENDERING_WATER_REFLECTION_MODES)[number];

export interface WorldSolidBackgroundSettings {
  mode: "solid";
  colorHex: string;
}

export interface WorldVerticalGradientBackgroundSettings {
  mode: "verticalGradient";
  topColorHex: string;
  bottomColorHex: string;
}

export interface WorldImageBackgroundSettings {
  mode: "image";
  assetId: string;
  environmentIntensity: number;
}

export type WorldBackgroundSettings =
  | WorldSolidBackgroundSettings
  | WorldVerticalGradientBackgroundSettings
  | WorldImageBackgroundSettings;

export interface WorldAmbientLightSettings {
  colorHex: string;
  intensity: number;
}

export interface WorldSunLightSettings {
  colorHex: string;
  intensity: number;
  direction: Vec3;
}

export interface AdvancedRenderingShadowsSettings {
  enabled: boolean;
  mapSize: AdvancedRenderingShadowMapSize;
  type: AdvancedRenderingShadowType;
  bias: number;
}

export interface AdvancedRenderingAmbientOcclusionSettings {
  enabled: boolean;
  intensity: number;
  radius: number;
  samples: number;
}

export interface AdvancedRenderingBloomSettings {
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
}

export interface AdvancedRenderingToneMappingSettings {
  mode: AdvancedRenderingToneMappingMode;
  exposure: number;
}

export interface AdvancedRenderingDepthOfFieldSettings {
  enabled: boolean;
  focusDistance: number;
  focalLength: number;
  bokehScale: number;
}

export interface AdvancedRenderingWhiteboxBevelSettings {
  enabled: boolean;
  edgeWidth: number;
  normalStrength: number;
}

export interface AdvancedRenderingSettings {
  enabled: boolean;
  shadows: AdvancedRenderingShadowsSettings;
  ambientOcclusion: AdvancedRenderingAmbientOcclusionSettings;
  bloom: AdvancedRenderingBloomSettings;
  toneMapping: AdvancedRenderingToneMappingSettings;
  depthOfField: AdvancedRenderingDepthOfFieldSettings;
  whiteboxBevel: AdvancedRenderingWhiteboxBevelSettings;
  fogPath: BoxVolumeRenderPath;
  waterPath: BoxVolumeRenderPath;
  waterReflectionMode: AdvancedRenderingWaterReflectionMode;
}

export interface WorldSettings {
  background: WorldBackgroundSettings;
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
  advancedRendering: AdvancedRenderingSettings;
}

const DEFAULT_SOLID_BACKGROUND_COLOR = "#2f3947";
const DEFAULT_GRADIENT_TOP_COLOR = DEFAULT_SOLID_BACKGROUND_COLOR;
const DEFAULT_GRADIENT_BOTTOM_COLOR = "#141a22";
const DEFAULT_ADVANCED_RENDERING_SHADOW_MAP_SIZE: AdvancedRenderingShadowMapSize = 2048;
const DEFAULT_ADVANCED_RENDERING_SHADOW_TYPE: AdvancedRenderingShadowType = "pcfSoft";
const DEFAULT_ADVANCED_RENDERING_SHADOW_BIAS = -0.0005;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_INTENSITY = 1;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_RADIUS = 0.5;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_SAMPLES = 8;
const DEFAULT_ADVANCED_RENDERING_BLOOM_INTENSITY = 0.75;
const DEFAULT_ADVANCED_RENDERING_BLOOM_THRESHOLD = 0.85;
const DEFAULT_ADVANCED_RENDERING_BLOOM_RADIUS = 0.35;
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_MODE: AdvancedRenderingToneMappingMode = "acesFilmic";
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_EXPOSURE = 1;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCUS_DISTANCE = 10;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCAL_LENGTH = 0.03;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_BOKEH_SCALE = 1.5;
const DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_EDGE_WIDTH = 0.14;
const DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_NORMAL_STRENGTH = 0.75;
const DEFAULT_BOX_VOLUME_RENDER_PATH: BoxVolumeRenderPath = "performance";
const DEFAULT_ADVANCED_RENDERING_WATER_REFLECTION_MODE: AdvancedRenderingWaterReflectionMode = "none";

export function isAdvancedRenderingShadowMapSize(value: unknown): value is AdvancedRenderingShadowMapSize {
  return ADVANCED_RENDERING_SHADOW_MAP_SIZES.includes(value as AdvancedRenderingShadowMapSize);
}

export function isAdvancedRenderingShadowType(value: unknown): value is AdvancedRenderingShadowType {
  return ADVANCED_RENDERING_SHADOW_TYPES.includes(value as AdvancedRenderingShadowType);
}

export function isAdvancedRenderingToneMappingMode(value: unknown): value is AdvancedRenderingToneMappingMode {
  return ADVANCED_RENDERING_TONE_MAPPING_MODES.includes(value as AdvancedRenderingToneMappingMode);
}

export function isBoxVolumeRenderPath(value: unknown): value is BoxVolumeRenderPath {
  return BOX_VOLUME_RENDER_PATHS.includes(value as BoxVolumeRenderPath);
}

export function isAdvancedRenderingWaterReflectionMode(value: unknown): value is AdvancedRenderingWaterReflectionMode {
  return ADVANCED_RENDERING_WATER_REFLECTION_MODES.includes(value as AdvancedRenderingWaterReflectionMode);
}

export function createDefaultAdvancedRenderingSettings(): AdvancedRenderingSettings {
  return {
    enabled: false,
    shadows: {
      enabled: false,
      mapSize: DEFAULT_ADVANCED_RENDERING_SHADOW_MAP_SIZE,
      type: DEFAULT_ADVANCED_RENDERING_SHADOW_TYPE,
      bias: DEFAULT_ADVANCED_RENDERING_SHADOW_BIAS
    },
    ambientOcclusion: {
      enabled: false,
      intensity: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_INTENSITY,
      radius: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_RADIUS,
      samples: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_SAMPLES
    },
    bloom: {
      enabled: false,
      intensity: DEFAULT_ADVANCED_RENDERING_BLOOM_INTENSITY,
      threshold: DEFAULT_ADVANCED_RENDERING_BLOOM_THRESHOLD,
      radius: DEFAULT_ADVANCED_RENDERING_BLOOM_RADIUS
    },
    toneMapping: {
      mode: DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_MODE,
      exposure: DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_EXPOSURE
    },
    depthOfField: {
      enabled: false,
      focusDistance: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCUS_DISTANCE,
      focalLength: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCAL_LENGTH,
      bokehScale: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_BOKEH_SCALE
    },
    whiteboxBevel: {
      enabled: false,
      edgeWidth: DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_EDGE_WIDTH,
      normalStrength: DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_NORMAL_STRENGTH
    },
    fogPath: DEFAULT_BOX_VOLUME_RENDER_PATH,
    waterPath: DEFAULT_BOX_VOLUME_RENDER_PATH,
    waterReflectionMode: DEFAULT_ADVANCED_RENDERING_WATER_REFLECTION_MODE
  };
}

export function createDefaultWorldSettings(): WorldSettings {
  return {
    background: {
      mode: "solid",
      colorHex: DEFAULT_SOLID_BACKGROUND_COLOR
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
    },
    advancedRendering: createDefaultAdvancedRenderingSettings()
  };
}

export function isHexColorString(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function isWorldBackgroundMode(value: unknown): value is WorldBackgroundMode {
  return value === "solid" || value === "verticalGradient" || value === "image";
}

export function cloneWorldBackgroundSettings(background: WorldBackgroundSettings): WorldBackgroundSettings {
  if (background.mode === "solid") {
    return {
      mode: "solid",
      colorHex: background.colorHex
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    mode: "image",
    assetId: background.assetId,
    environmentIntensity: background.environmentIntensity
  };
}

export function cloneWorldSettings(world: WorldSettings): WorldSettings {
  return {
    background: cloneWorldBackgroundSettings(world.background),
    ambientLight: {
      ...world.ambientLight
    },
    sunLight: {
      ...world.sunLight,
      direction: {
        ...world.sunLight.direction
      }
    },
    advancedRendering: cloneAdvancedRenderingSettings(world.advancedRendering)
  };
}

export function cloneAdvancedRenderingSettings(settings: AdvancedRenderingSettings): AdvancedRenderingSettings {
  return {
    enabled: settings.enabled,
    shadows: {
      ...settings.shadows
    },
    ambientOcclusion: {
      ...settings.ambientOcclusion
    },
    bloom: {
      ...settings.bloom
    },
    toneMapping: {
      ...settings.toneMapping
    },
    depthOfField: {
      ...settings.depthOfField
    },
    whiteboxBevel: {
      ...settings.whiteboxBevel
    },
    fogPath: settings.fogPath,
    waterPath: settings.waterPath,
    waterReflectionMode: settings.waterReflectionMode
  };
}

export function areWorldBackgroundSettingsEqual(left: WorldBackgroundSettings, right: WorldBackgroundSettings): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "solid" && right.mode === "solid") {
    return left.colorHex === right.colorHex;
  }

  if (left.mode === "verticalGradient" && right.mode === "verticalGradient") {
    return left.topColorHex === right.topColorHex && left.bottomColorHex === right.bottomColorHex;
  }

  return left.mode === "image" && right.mode === "image" && left.assetId === right.assetId && left.environmentIntensity === right.environmentIntensity;
}

export function areWorldSettingsEqual(left: WorldSettings, right: WorldSettings): boolean {
  return (
    areWorldBackgroundSettingsEqual(left.background, right.background) &&
    left.ambientLight.colorHex === right.ambientLight.colorHex &&
    left.ambientLight.intensity === right.ambientLight.intensity &&
    left.sunLight.colorHex === right.sunLight.colorHex &&
    left.sunLight.intensity === right.sunLight.intensity &&
    left.sunLight.direction.x === right.sunLight.direction.x &&
    left.sunLight.direction.y === right.sunLight.direction.y &&
    left.sunLight.direction.z === right.sunLight.direction.z &&
    areAdvancedRenderingSettingsEqual(left.advancedRendering, right.advancedRendering)
  );
}

export function areAdvancedRenderingSettingsEqual(left: AdvancedRenderingSettings, right: AdvancedRenderingSettings): boolean {
  return (
    left.enabled === right.enabled &&
    left.shadows.enabled === right.shadows.enabled &&
    left.shadows.mapSize === right.shadows.mapSize &&
    left.shadows.type === right.shadows.type &&
    left.shadows.bias === right.shadows.bias &&
    left.ambientOcclusion.enabled === right.ambientOcclusion.enabled &&
    left.ambientOcclusion.intensity === right.ambientOcclusion.intensity &&
    left.ambientOcclusion.radius === right.ambientOcclusion.radius &&
    left.ambientOcclusion.samples === right.ambientOcclusion.samples &&
    left.bloom.enabled === right.bloom.enabled &&
    left.bloom.intensity === right.bloom.intensity &&
    left.bloom.threshold === right.bloom.threshold &&
    left.bloom.radius === right.bloom.radius &&
    left.toneMapping.mode === right.toneMapping.mode &&
    left.toneMapping.exposure === right.toneMapping.exposure &&
    left.depthOfField.enabled === right.depthOfField.enabled &&
    left.depthOfField.focusDistance === right.depthOfField.focusDistance &&
    left.depthOfField.focalLength === right.depthOfField.focalLength &&
    left.depthOfField.bokehScale === right.depthOfField.bokehScale &&
    left.whiteboxBevel.enabled === right.whiteboxBevel.enabled &&
    left.whiteboxBevel.edgeWidth === right.whiteboxBevel.edgeWidth &&
    left.whiteboxBevel.normalStrength === right.whiteboxBevel.normalStrength &&
    left.fogPath === right.fogPath &&
    left.waterPath === right.waterPath &&
    left.waterReflectionMode === right.waterReflectionMode
  );
}

export function changeWorldBackgroundMode(
  background: WorldBackgroundSettings,
  mode: WorldBackgroundMode,
  imageAssetId?: string
): WorldBackgroundSettings {
  if (mode === "image") {
    if (imageAssetId === undefined || imageAssetId.trim().length === 0) {
      if (background.mode === "image") {
        return cloneWorldBackgroundSettings(background);
      }

      throw new Error("An image asset must be selected to use an image background.");
    }

    return {
      mode: "image",
      assetId: imageAssetId,
      environmentIntensity: background.mode === "image" ? background.environmentIntensity : 0.5
    };
  }

  if (background.mode === mode) {
    return cloneWorldBackgroundSettings(background);
  }

  if (mode === "solid") {
    return {
      mode: "solid",
      colorHex:
        background.mode === "solid"
          ? background.colorHex
          : background.mode === "verticalGradient"
            ? background.topColorHex
            : DEFAULT_SOLID_BACKGROUND_COLOR
    };
  }

  if (background.mode === "solid") {
    return {
      mode: "verticalGradient",
      topColorHex: background.colorHex,
      bottomColorHex: DEFAULT_GRADIENT_BOTTOM_COLOR
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    mode: "verticalGradient",
    topColorHex: DEFAULT_GRADIENT_TOP_COLOR,
    bottomColorHex: DEFAULT_GRADIENT_BOTTOM_COLOR
  };
}
