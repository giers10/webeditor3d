import { DEFAULT_SUN_DIRECTION, type Vec3 } from "../core/vector";

export const WORLD_SHADER_SKY_PRESET_IDS = ["defaultSky"] as const;

export type WorldBackgroundMode =
  | "solid"
  | "verticalGradient"
  | "image"
  | "shader";
export type WorldTimePhase = "dawn" | "dusk" | "night";
export type WorldShaderSkyPresetId =
  (typeof WORLD_SHADER_SKY_PRESET_IDS)[number];

export const ADVANCED_RENDERING_SHADOW_MAP_SIZES = [
  512, 1024, 2048, 4096
] as const;
export const ADVANCED_RENDERING_SHADOW_TYPES = [
  "basic",
  "pcf",
  "pcfSoft"
] as const;
export const ADVANCED_RENDERING_TONE_MAPPING_MODES = [
  "none",
  "linear",
  "reinhard",
  "cineon",
  "acesFilmic"
] as const;
export const BOX_VOLUME_RENDER_PATHS = ["performance", "quality"] as const;
export const ADVANCED_RENDERING_WATER_REFLECTION_MODES = [
  "none",
  "world",
  "all"
] as const;

export type AdvancedRenderingShadowMapSize =
  (typeof ADVANCED_RENDERING_SHADOW_MAP_SIZES)[number];
export type AdvancedRenderingShadowType =
  (typeof ADVANCED_RENDERING_SHADOW_TYPES)[number];
export type AdvancedRenderingToneMappingMode =
  (typeof ADVANCED_RENDERING_TONE_MAPPING_MODES)[number];
export type BoxVolumeRenderPath = (typeof BOX_VOLUME_RENDER_PATHS)[number];
export type AdvancedRenderingWaterReflectionMode =
  (typeof ADVANCED_RENDERING_WATER_REFLECTION_MODES)[number];

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

export interface WorldShaderBackgroundSettings {
  mode: "shader";
}

export type WorldBackgroundSettings =
  | WorldSolidBackgroundSettings
  | WorldVerticalGradientBackgroundSettings
  | WorldImageBackgroundSettings
  | WorldShaderBackgroundSettings;

export interface WorldAmbientLightSettings {
  colorHex: string;
  intensity: number;
}

export interface WorldSunLightSettings {
  colorHex: string;
  intensity: number;
  direction: Vec3;
}

export interface WorldCelestialOrbitSettings {
  azimuthDegrees: number;
  peakAltitudeDegrees: number;
}

export interface WorldCelestialOrbitAuthoringSettings {
  sun: WorldCelestialOrbitSettings;
  moon: WorldCelestialOrbitSettings;
}

export interface WorldTimePhaseProfile {
  background: WorldBackgroundSettings;
  skyTopColorHex: string;
  skyBottomColorHex: string;
  ambientColorHex: string;
  ambientIntensityFactor: number;
  lightColorHex: string;
  lightIntensityFactor: number;
}

export interface WorldNightEnvironmentSettings {
  background: WorldBackgroundSettings;
  ambientColorHex: string;
  ambientIntensityFactor: number;
  lightColorHex: string;
  lightIntensityFactor: number;
}

export interface WorldTimeOfDaySettings {
  dawn: WorldTimePhaseProfile;
  dusk: WorldTimePhaseProfile;
  night: WorldNightEnvironmentSettings;
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

export interface WorldShaderSkyCelestialSettings {
  sunDiscSizeDegrees: number;
  moonDiscSizeDegrees: number;
}

export interface WorldShaderSkyStarSettings {
  density: number;
  brightness: number;
  horizonFadeOffset: number;
}

export interface WorldShaderSkyCloudSettings {
  coverage: number;
  density: number;
  softness: number;
  scale: number;
  height: number;
  heightVariation: number;
  tintHex: string;
  opacity: number;
  opacityRandomness: number;
  driftSpeed: number;
  driftDirectionDegrees: number;
}

export interface WorldShaderSkySettings {
  presetId: WorldShaderSkyPresetId;
  dayTopColorHex: string;
  dayBottomColorHex: string;
  horizonHeight: number;
  celestial: WorldShaderSkyCelestialSettings;
  stars: WorldShaderSkyStarSettings;
  clouds: WorldShaderSkyCloudSettings;
}

export interface WorldSettings {
  projectTimeLightingEnabled: boolean;
  showCelestialBodies: boolean;
  background: WorldBackgroundSettings;
  shaderSky: WorldShaderSkySettings;
  celestialOrbits: WorldCelestialOrbitAuthoringSettings;
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
  timeOfDay: WorldTimeOfDaySettings;
  advancedRendering: AdvancedRenderingSettings;
}

const DEFAULT_SOLID_BACKGROUND_COLOR = "#2f3947";
const DEFAULT_GRADIENT_TOP_COLOR = DEFAULT_SOLID_BACKGROUND_COLOR;
const DEFAULT_GRADIENT_BOTTOM_COLOR = "#141a22";
export const DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY = 0.35 as const;
export const DEFAULT_TIME_PHASE_IMAGE_ENVIRONMENT_INTENSITY = 0.5 as const;
const DEFAULT_ADVANCED_RENDERING_SHADOW_MAP_SIZE: AdvancedRenderingShadowMapSize = 2048;
const DEFAULT_ADVANCED_RENDERING_SHADOW_TYPE: AdvancedRenderingShadowType =
  "pcfSoft";
const DEFAULT_ADVANCED_RENDERING_SHADOW_BIAS = -0.0005;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_INTENSITY = 1;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_RADIUS = 0.5;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_SAMPLES = 8;
const DEFAULT_ADVANCED_RENDERING_BLOOM_INTENSITY = 0.75;
const DEFAULT_ADVANCED_RENDERING_BLOOM_THRESHOLD = 0.85;
const DEFAULT_ADVANCED_RENDERING_BLOOM_RADIUS = 0.35;
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_MODE: AdvancedRenderingToneMappingMode =
  "acesFilmic";
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_EXPOSURE = 1;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCUS_DISTANCE = 10;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCAL_LENGTH = 0.03;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_BOKEH_SCALE = 1.5;
const DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_EDGE_WIDTH = 0.14;
const DEFAULT_ADVANCED_RENDERING_WHITEBOX_BEVEL_NORMAL_STRENGTH = 0.75;
const DEFAULT_BOX_VOLUME_RENDER_PATH: BoxVolumeRenderPath = "performance";
const DEFAULT_ADVANCED_RENDERING_WATER_REFLECTION_MODE: AdvancedRenderingWaterReflectionMode =
  "none";
const DEFAULT_SHADER_SKY_DAY_TOP_COLOR = "#5f8fd3";
const DEFAULT_SHADER_SKY_DAY_BOTTOM_COLOR = "#d8eeff";
const DEFAULT_SHADER_SKY_HORIZON_HEIGHT = 0;
const DEFAULT_SHADER_SKY_SUN_DISC_SIZE_DEGREES = 2.6;
const DEFAULT_SHADER_SKY_MOON_DISC_SIZE_DEGREES = 1.8;
const DEFAULT_SHADER_SKY_STAR_DENSITY = 0.55;
const DEFAULT_SHADER_SKY_STAR_BRIGHTNESS = 0.85;
const DEFAULT_SHADER_SKY_STAR_HORIZON_FADE_OFFSET = 0;
const DEFAULT_SHADER_SKY_CLOUD_COVERAGE = 0.58;
const DEFAULT_SHADER_SKY_CLOUD_DENSITY = 0.62;
const DEFAULT_SHADER_SKY_CLOUD_SOFTNESS = 0.42;
const DEFAULT_SHADER_SKY_CLOUD_SCALE = 1.35;
const DEFAULT_SHADER_SKY_CLOUD_HEIGHT = 0.62;
const DEFAULT_SHADER_SKY_CLOUD_HEIGHT_VARIATION = 0.22;
const DEFAULT_SHADER_SKY_CLOUD_TINT = "#f7f1ea";
const DEFAULT_SHADER_SKY_CLOUD_OPACITY = 0.68;
const DEFAULT_SHADER_SKY_CLOUD_OPACITY_RANDOMNESS = 0.24;
const DEFAULT_SHADER_SKY_CLOUD_DRIFT_SPEED = 0.025;
const DEFAULT_SHADER_SKY_CLOUD_DRIFT_DIRECTION_DEGREES = 18;
const MIN_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES = 0.1;
const MAX_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES = 89.9;

function resolveShaderSkyDayGradient(
  background: WorldBackgroundSettings | null = null
): {
  topColorHex: string;
  bottomColorHex: string;
} {
  if (background?.mode === "solid") {
    return {
      topColorHex: background.colorHex,
      bottomColorHex: background.colorHex
    };
  }

  if (background?.mode === "verticalGradient") {
    return {
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    topColorHex: DEFAULT_SHADER_SKY_DAY_TOP_COLOR,
    bottomColorHex: DEFAULT_SHADER_SKY_DAY_BOTTOM_COLOR
  };
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 1e-6) {
    return {
      ...DEFAULT_SUN_DIRECTION
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;

  return normalized < 0 ? normalized + 360 : normalized;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveLegacyCelestialPeakDirection(direction: Vec3): Vec3 {
  const normalizedDirection = normalizeVec3(direction);

  if (normalizedDirection.y >= 0.2) {
    return normalizedDirection;
  }

  return normalizeVec3({
    x: normalizedDirection.x,
    y: Math.abs(normalizedDirection.y) + 0.35,
    z: normalizedDirection.z
  });
}

export function createWorldCelestialOrbitSettingsFromPeakDirection(
  direction: Vec3
): WorldCelestialOrbitSettings {
  const peakDirection = resolveLegacyCelestialPeakDirection(direction);

  return {
    azimuthDegrees: normalizeDegrees(
      (Math.atan2(peakDirection.z, peakDirection.x) * 180) / Math.PI
    ),
    peakAltitudeDegrees: clamp(
      (Math.asin(clamp(peakDirection.y, -1, 1)) * 180) / Math.PI,
      MIN_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES,
      MAX_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES
    )
  };
}

export function resolveWorldCelestialOrbitPeakDirection(
  orbit: WorldCelestialOrbitSettings
): Vec3 {
  const azimuthRadians =
    (normalizeDegrees(orbit.azimuthDegrees) * Math.PI) / 180;
  const altitudeRadians =
    (clamp(
      orbit.peakAltitudeDegrees,
      MIN_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES,
      MAX_WORLD_CELESTIAL_PEAK_ALTITUDE_DEGREES
    ) *
      Math.PI) /
    180;
  const horizontalLength = Math.cos(altitudeRadians);

  return normalizeVec3({
    x: Math.cos(azimuthRadians) * horizontalLength,
    y: Math.sin(altitudeRadians),
    z: Math.sin(azimuthRadians) * horizontalLength
  });
}

export function createDefaultWorldCelestialOrbitAuthoringSettings(
  sunDirection: Vec3 = DEFAULT_SUN_DIRECTION
): WorldCelestialOrbitAuthoringSettings {
  const sunOrbit =
    createWorldCelestialOrbitSettingsFromPeakDirection(sunDirection);

  return {
    sun: {
      ...sunOrbit
    },
    moon: {
      ...sunOrbit
    }
  };
}

export function cloneWorldCelestialOrbitAuthoringSettings(
  settings: WorldCelestialOrbitAuthoringSettings
): WorldCelestialOrbitAuthoringSettings {
  return {
    sun: {
      ...settings.sun
    },
    moon: {
      ...settings.moon
    }
  };
}

export function isAdvancedRenderingShadowMapSize(
  value: unknown
): value is AdvancedRenderingShadowMapSize {
  return ADVANCED_RENDERING_SHADOW_MAP_SIZES.includes(
    value as AdvancedRenderingShadowMapSize
  );
}

export function isAdvancedRenderingShadowType(
  value: unknown
): value is AdvancedRenderingShadowType {
  return ADVANCED_RENDERING_SHADOW_TYPES.includes(
    value as AdvancedRenderingShadowType
  );
}

export function isAdvancedRenderingToneMappingMode(
  value: unknown
): value is AdvancedRenderingToneMappingMode {
  return ADVANCED_RENDERING_TONE_MAPPING_MODES.includes(
    value as AdvancedRenderingToneMappingMode
  );
}

export function isBoxVolumeRenderPath(
  value: unknown
): value is BoxVolumeRenderPath {
  return BOX_VOLUME_RENDER_PATHS.includes(value as BoxVolumeRenderPath);
}

export function isAdvancedRenderingWaterReflectionMode(
  value: unknown
): value is AdvancedRenderingWaterReflectionMode {
  return ADVANCED_RENDERING_WATER_REFLECTION_MODES.includes(
    value as AdvancedRenderingWaterReflectionMode
  );
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

export function isWorldShaderSkyPresetId(
  value: unknown
): value is WorldShaderSkyPresetId {
  return WORLD_SHADER_SKY_PRESET_IDS.includes(value as WorldShaderSkyPresetId);
}

export function createDefaultWorldShaderSkySettings(
  background: WorldBackgroundSettings | null = null
): WorldShaderSkySettings {
  const dayGradient = resolveShaderSkyDayGradient(background);

  return {
    presetId: "defaultSky",
    dayTopColorHex: dayGradient.topColorHex,
    dayBottomColorHex: dayGradient.bottomColorHex,
    horizonHeight: DEFAULT_SHADER_SKY_HORIZON_HEIGHT,
    celestial: {
      sunDiscSizeDegrees: DEFAULT_SHADER_SKY_SUN_DISC_SIZE_DEGREES,
      moonDiscSizeDegrees: DEFAULT_SHADER_SKY_MOON_DISC_SIZE_DEGREES
    },
    stars: {
      density: DEFAULT_SHADER_SKY_STAR_DENSITY,
      brightness: DEFAULT_SHADER_SKY_STAR_BRIGHTNESS,
      horizonFadeOffset: DEFAULT_SHADER_SKY_STAR_HORIZON_FADE_OFFSET
    },
    clouds: {
      coverage: DEFAULT_SHADER_SKY_CLOUD_COVERAGE,
      density: DEFAULT_SHADER_SKY_CLOUD_DENSITY,
      softness: DEFAULT_SHADER_SKY_CLOUD_SOFTNESS,
      scale: DEFAULT_SHADER_SKY_CLOUD_SCALE,
      height: DEFAULT_SHADER_SKY_CLOUD_HEIGHT,
      heightVariation: DEFAULT_SHADER_SKY_CLOUD_HEIGHT_VARIATION,
      tintHex: DEFAULT_SHADER_SKY_CLOUD_TINT,
      opacity: DEFAULT_SHADER_SKY_CLOUD_OPACITY,
      opacityRandomness: DEFAULT_SHADER_SKY_CLOUD_OPACITY_RANDOMNESS,
      driftSpeed: DEFAULT_SHADER_SKY_CLOUD_DRIFT_SPEED,
      driftDirectionDegrees: DEFAULT_SHADER_SKY_CLOUD_DRIFT_DIRECTION_DEGREES
    }
  };
}

export function cloneWorldShaderSkySettings(
  settings: WorldShaderSkySettings
): WorldShaderSkySettings {
  return {
    presetId: settings.presetId,
    dayTopColorHex: settings.dayTopColorHex,
    dayBottomColorHex: settings.dayBottomColorHex,
    horizonHeight: settings.horizonHeight,
    celestial: {
      ...settings.celestial
    },
    stars: {
      ...settings.stars
    },
    clouds: {
      ...settings.clouds
    }
  };
}

export function syncWorldShaderSkyDayGradientToBackground(
  settings: WorldShaderSkySettings,
  background: WorldBackgroundSettings
): WorldShaderSkySettings {
  const dayGradient = resolveShaderSkyDayGradient(background);

  return {
    ...cloneWorldShaderSkySettings(settings),
    dayTopColorHex: dayGradient.topColorHex,
    dayBottomColorHex: dayGradient.bottomColorHex
  };
}

export function createDefaultWorldTimePhaseProfile(
  phase: WorldTimePhase
): WorldTimePhaseProfile {
  switch (phase) {
    case "dawn":
      return {
        background: {
          mode: "verticalGradient",
          topColorHex: "#5877b2",
          bottomColorHex: "#f6a66f"
        },
        skyTopColorHex: "#5877b2",
        skyBottomColorHex: "#f6a66f",
        ambientColorHex: "#ffd7b0",
        ambientIntensityFactor: 0.72,
        lightColorHex: "#ffc98d",
        lightIntensityFactor: 0.78
      };
    case "dusk":
      return {
        background: {
          mode: "verticalGradient",
          topColorHex: "#304076",
          bottomColorHex: "#f08b5b"
        },
        skyTopColorHex: "#304076",
        skyBottomColorHex: "#f08b5b",
        ambientColorHex: "#f0b69a",
        ambientIntensityFactor: 0.6,
        lightColorHex: "#ffae7d",
        lightIntensityFactor: 0.66
      };
    case "night":
      return {
        background: {
          mode: "verticalGradient",
          topColorHex: "#081120",
          bottomColorHex: "#1a2438"
        },
        skyTopColorHex: "#081120",
        skyBottomColorHex: "#1a2438",
        ambientColorHex: "#1d2d45",
        ambientIntensityFactor: 0.24,
        lightColorHex: "#99b5ff",
        lightIntensityFactor: 0.16
      };
  }
}

export function createDefaultWorldTimeOfDaySettings(): WorldTimeOfDaySettings {
  const nightProfile = createDefaultWorldTimePhaseProfile("night");

  return {
    dawn: createDefaultWorldTimePhaseProfile("dawn"),
    dusk: createDefaultWorldTimePhaseProfile("dusk"),
    night: {
      background: {
        mode: "verticalGradient",
        topColorHex: nightProfile.skyTopColorHex,
        bottomColorHex: nightProfile.skyBottomColorHex
      },
      ambientColorHex: nightProfile.ambientColorHex,
      ambientIntensityFactor: nightProfile.ambientIntensityFactor,
      lightColorHex: nightProfile.lightColorHex,
      lightIntensityFactor: nightProfile.lightIntensityFactor
    }
  };
}

export function createDefaultWorldSettings(): WorldSettings {
  const celestialOrbits = createDefaultWorldCelestialOrbitAuthoringSettings(
    DEFAULT_SUN_DIRECTION
  );

  return {
    projectTimeLightingEnabled: true,
    showCelestialBodies: false,
    background: {
      mode: "solid",
      colorHex: DEFAULT_SOLID_BACKGROUND_COLOR
    },
    shaderSky: createDefaultWorldShaderSkySettings(),
    celestialOrbits,
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
    timeOfDay: createDefaultWorldTimeOfDaySettings(),
    advancedRendering: createDefaultAdvancedRenderingSettings()
  };
}

export function isHexColorString(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function isWorldBackgroundMode(
  value: unknown
): value is WorldBackgroundMode {
  return (
    value === "solid" ||
    value === "verticalGradient" ||
    value === "image" ||
    value === "shader"
  );
}

export function cloneWorldBackgroundSettings(
  background: WorldBackgroundSettings
): WorldBackgroundSettings {
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

  if (background.mode === "shader") {
    return {
      mode: "shader"
    };
  }

  return {
    mode: "image",
    assetId: background.assetId,
    environmentIntensity: background.environmentIntensity
  };
}

export function cloneWorldTimePhaseProfile(
  profile: WorldTimePhaseProfile
): WorldTimePhaseProfile {
  return {
    background: cloneWorldBackgroundSettings(profile.background),
    skyTopColorHex: profile.skyTopColorHex,
    skyBottomColorHex: profile.skyBottomColorHex,
    ambientColorHex: profile.ambientColorHex,
    ambientIntensityFactor: profile.ambientIntensityFactor,
    lightColorHex: profile.lightColorHex,
    lightIntensityFactor: profile.lightIntensityFactor
  };
}

export function cloneWorldNightEnvironmentSettings(
  settings: WorldNightEnvironmentSettings
): WorldNightEnvironmentSettings {
  return {
    background: cloneWorldBackgroundSettings(settings.background),
    ambientColorHex: settings.ambientColorHex,
    ambientIntensityFactor: settings.ambientIntensityFactor,
    lightColorHex: settings.lightColorHex,
    lightIntensityFactor: settings.lightIntensityFactor
  };
}

export function cloneWorldTimeOfDaySettings(
  settings: WorldTimeOfDaySettings
): WorldTimeOfDaySettings {
  return {
    dawn: cloneWorldTimePhaseProfile(settings.dawn),
    dusk: cloneWorldTimePhaseProfile(settings.dusk),
    night: cloneWorldNightEnvironmentSettings(settings.night)
  };
}

export function cloneWorldSettings(world: WorldSettings): WorldSettings {
  return {
    projectTimeLightingEnabled: world.projectTimeLightingEnabled,
    showCelestialBodies: world.showCelestialBodies,
    background: cloneWorldBackgroundSettings(world.background),
    shaderSky: cloneWorldShaderSkySettings(world.shaderSky),
    celestialOrbits: cloneWorldCelestialOrbitAuthoringSettings(
      world.celestialOrbits
    ),
    ambientLight: {
      ...world.ambientLight
    },
    sunLight: {
      ...world.sunLight,
      direction: {
        ...world.sunLight.direction
      }
    },
    timeOfDay: cloneWorldTimeOfDaySettings(world.timeOfDay),
    advancedRendering: cloneAdvancedRenderingSettings(world.advancedRendering)
  };
}

export function cloneAdvancedRenderingSettings(
  settings: AdvancedRenderingSettings
): AdvancedRenderingSettings {
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

export function areWorldBackgroundSettingsEqual(
  left: WorldBackgroundSettings,
  right: WorldBackgroundSettings
): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "solid" && right.mode === "solid") {
    return left.colorHex === right.colorHex;
  }

  if (left.mode === "verticalGradient" && right.mode === "verticalGradient") {
    return (
      left.topColorHex === right.topColorHex &&
      left.bottomColorHex === right.bottomColorHex
    );
  }

  if (left.mode === "shader" && right.mode === "shader") {
    return true;
  }

  return (
    left.mode === "image" &&
    right.mode === "image" &&
    left.assetId === right.assetId &&
    left.environmentIntensity === right.environmentIntensity
  );
}

export function areWorldShaderSkySettingsEqual(
  left: WorldShaderSkySettings,
  right: WorldShaderSkySettings
): boolean {
  return (
    left.presetId === right.presetId &&
    left.dayTopColorHex === right.dayTopColorHex &&
    left.dayBottomColorHex === right.dayBottomColorHex &&
    left.horizonHeight === right.horizonHeight &&
    left.celestial.sunDiscSizeDegrees === right.celestial.sunDiscSizeDegrees &&
    left.celestial.moonDiscSizeDegrees ===
      right.celestial.moonDiscSizeDegrees &&
    left.stars.density === right.stars.density &&
    left.stars.brightness === right.stars.brightness &&
    left.stars.horizonFadeOffset === right.stars.horizonFadeOffset &&
    left.clouds.coverage === right.clouds.coverage &&
    left.clouds.density === right.clouds.density &&
    left.clouds.softness === right.clouds.softness &&
    left.clouds.scale === right.clouds.scale &&
    left.clouds.height === right.clouds.height &&
    left.clouds.heightVariation === right.clouds.heightVariation &&
    left.clouds.tintHex === right.clouds.tintHex &&
    left.clouds.opacity === right.clouds.opacity &&
    left.clouds.opacityRandomness === right.clouds.opacityRandomness &&
    left.clouds.driftSpeed === right.clouds.driftSpeed &&
    left.clouds.driftDirectionDegrees === right.clouds.driftDirectionDegrees
  );
}

export function areWorldTimePhaseProfilesEqual(
  left: WorldTimePhaseProfile,
  right: WorldTimePhaseProfile
): boolean {
  return (
    areWorldBackgroundSettingsEqual(left.background, right.background) &&
    left.skyTopColorHex === right.skyTopColorHex &&
    left.skyBottomColorHex === right.skyBottomColorHex &&
    left.ambientColorHex === right.ambientColorHex &&
    left.ambientIntensityFactor === right.ambientIntensityFactor &&
    left.lightColorHex === right.lightColorHex &&
    left.lightIntensityFactor === right.lightIntensityFactor
  );
}

export function areWorldNightEnvironmentSettingsEqual(
  left: WorldNightEnvironmentSettings,
  right: WorldNightEnvironmentSettings
): boolean {
  return (
    areWorldBackgroundSettingsEqual(left.background, right.background) &&
    left.ambientColorHex === right.ambientColorHex &&
    left.ambientIntensityFactor === right.ambientIntensityFactor &&
    left.lightColorHex === right.lightColorHex &&
    left.lightIntensityFactor === right.lightIntensityFactor
  );
}

export function areWorldTimeOfDaySettingsEqual(
  left: WorldTimeOfDaySettings,
  right: WorldTimeOfDaySettings
): boolean {
  return (
    areWorldTimePhaseProfilesEqual(left.dawn, right.dawn) &&
    areWorldTimePhaseProfilesEqual(left.dusk, right.dusk) &&
    areWorldNightEnvironmentSettingsEqual(left.night, right.night)
  );
}

export function areWorldCelestialOrbitSettingsEqual(
  left: WorldCelestialOrbitAuthoringSettings,
  right: WorldCelestialOrbitAuthoringSettings
): boolean {
  return (
    left.sun.azimuthDegrees === right.sun.azimuthDegrees &&
    left.sun.peakAltitudeDegrees === right.sun.peakAltitudeDegrees &&
    left.moon.azimuthDegrees === right.moon.azimuthDegrees &&
    left.moon.peakAltitudeDegrees === right.moon.peakAltitudeDegrees
  );
}

export function areWorldSettingsEqual(
  left: WorldSettings,
  right: WorldSettings
): boolean {
  return (
    left.projectTimeLightingEnabled === right.projectTimeLightingEnabled &&
    left.showCelestialBodies === right.showCelestialBodies &&
    areWorldBackgroundSettingsEqual(left.background, right.background) &&
    areWorldShaderSkySettingsEqual(left.shaderSky, right.shaderSky) &&
    areWorldCelestialOrbitSettingsEqual(
      left.celestialOrbits,
      right.celestialOrbits
    ) &&
    left.ambientLight.colorHex === right.ambientLight.colorHex &&
    left.ambientLight.intensity === right.ambientLight.intensity &&
    left.sunLight.colorHex === right.sunLight.colorHex &&
    left.sunLight.intensity === right.sunLight.intensity &&
    left.sunLight.direction.x === right.sunLight.direction.x &&
    left.sunLight.direction.y === right.sunLight.direction.y &&
    left.sunLight.direction.z === right.sunLight.direction.z &&
    areWorldTimeOfDaySettingsEqual(left.timeOfDay, right.timeOfDay) &&
    areAdvancedRenderingSettingsEqual(
      left.advancedRendering,
      right.advancedRendering
    )
  );
}

export function areAdvancedRenderingSettingsEqual(
  left: AdvancedRenderingSettings,
  right: AdvancedRenderingSettings
): boolean {
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
  imageAssetId?: string,
  imageEnvironmentIntensity: number = DEFAULT_TIME_PHASE_IMAGE_ENVIRONMENT_INTENSITY,
  shaderSkySettings?: WorldShaderSkySettings
): WorldBackgroundSettings {
  if (mode === "image") {
    if (imageAssetId === undefined || imageAssetId.trim().length === 0) {
      if (background.mode === "image") {
        return cloneWorldBackgroundSettings(background);
      }

      throw new Error(
        "An image asset must be selected to use an image background."
      );
    }

    return {
      mode: "image",
      assetId: imageAssetId,
      environmentIntensity:
        background.mode === "image"
          ? background.environmentIntensity
          : imageEnvironmentIntensity
    };
  }

  if (mode === "shader") {
    return {
      mode: "shader"
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
            : background.mode === "shader" && shaderSkySettings !== undefined
              ? shaderSkySettings.dayTopColorHex
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

  if (background.mode === "shader" && shaderSkySettings !== undefined) {
    return {
      mode: "verticalGradient",
      topColorHex: shaderSkySettings.dayTopColorHex,
      bottomColorHex: shaderSkySettings.dayBottomColorHex
    };
  }

  return {
    mode: "verticalGradient",
    topColorHex: DEFAULT_GRADIENT_TOP_COLOR,
    bottomColorHex: DEFAULT_GRADIENT_BOTTOM_COLOR
  };
}
