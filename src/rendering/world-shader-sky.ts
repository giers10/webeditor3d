import type { Vec2, Vec3 } from "../core/vector";
import type { ProjectTimeSettings } from "../document/project-time-settings";
import {
  createDefaultWorldTimePhaseProfile,
  type WorldBackgroundSettings,
  type WorldSettings
} from "../document/world-settings";
import {
  resolveRuntimeDayNightPhaseWeights,
  type RuntimeDayNightPhaseWeights,
  type RuntimeDayNightWorldState,
  type RuntimeResolvedTimeState
} from "../runtime-three/runtime-project-time";

export interface WorldShaderSkyRenderState {
  presetId: "defaultSky";
  time: {
    dayCount: number;
    timeOfDayHours: number;
    dayPhase: RuntimeResolvedTimeState["dayPhase"];
    daylightFactor: number;
    twilightFactor: number;
    phaseWeights: RuntimeDayNightPhaseWeights;
  };
  sky: {
    topColorHex: string;
    bottomColorHex: string;
    horizonHeight: number;
  };
  celestial: {
    sunDirection: Vec3;
    sunColorHex: string;
    sunIntensity: number;
    sunDiscSizeDegrees: number;
    sunVisible: boolean;
    moonDirection: Vec3;
    moonColorHex: string;
    moonIntensity: number;
    moonDiscSizeDegrees: number;
    moonVisible: boolean;
  };
  stars: {
    density: number;
    brightness: number;
    visibility: number;
    rotationRadians: number;
  };
  clouds: {
    coverage: number;
    density: number;
    softness: number;
    scale: number;
    height: number;
    heightVariation: number;
    tintHex: string;
    opacity: number;
    opacityRandomness: number;
    driftOffset: Vec2;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseHexColor(colorHex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(colorHex.slice(1, 3), 16),
    g: Number.parseInt(colorHex.slice(3, 5), 16),
    b: Number.parseInt(colorHex.slice(5, 7), 16)
  };
}

function formatHexColor(color: { r: number; g: number; b: number }): string {
  const toHex = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function blendHexColorsByWeights(
  colors: {
    day: string;
    dawn: string;
    dusk: string;
    night: string;
  },
  weights: RuntimeDayNightPhaseWeights
): string {
  const totalWeight = weights.day + weights.dawn + weights.dusk + weights.night;

  if (totalWeight <= 1e-6) {
    return colors.day;
  }

  const day = parseHexColor(colors.day);
  const dawn = parseHexColor(colors.dawn);
  const dusk = parseHexColor(colors.dusk);
  const night = parseHexColor(colors.night);

  return formatHexColor({
    r:
      (day.r * weights.day +
        dawn.r * weights.dawn +
        dusk.r * weights.dusk +
        night.r * weights.night) /
      totalWeight,
    g:
      (day.g * weights.day +
        dawn.g * weights.dawn +
        dusk.g * weights.dusk +
        night.g * weights.night) /
      totalWeight,
    b:
      (day.b * weights.day +
        dawn.b * weights.dawn +
        dusk.b * weights.dusk +
        night.b * weights.night) /
      totalWeight
  });
}

function normalizeDirection(direction: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(direction.x, direction.y, direction.z);

  if (length <= 1e-6) {
    return {
      ...fallback
    };
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length
  };
}

function offsetDirectionForHorizon(direction: Vec3, horizonHeight: number): Vec3 {
  if (Math.abs(horizonHeight) <= 1e-6) {
    return direction;
  }

  return normalizeDirection(
    {
      x: direction.x,
      y: direction.y - horizonHeight,
      z: direction.z
    },
    direction
  );
}

function resolveGradientBasis(
  background: WorldBackgroundSettings,
  fallbackTopColorHex: string,
  fallbackBottomColorHex: string
): {
  topColorHex: string;
  bottomColorHex: string;
} {
  if (background.mode === "solid") {
    return {
      topColorHex: background.colorHex,
      bottomColorHex: background.colorHex
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    topColorHex: fallbackTopColorHex,
    bottomColorHex: fallbackBottomColorHex
  };
}

export function resolveWorldShaderSkyRenderState(
  world: WorldSettings,
  resolvedWorld: RuntimeDayNightWorldState,
  resolvedTime: RuntimeResolvedTimeState | null,
  timeSettings: ProjectTimeSettings | null
): WorldShaderSkyRenderState | null {
  if (world.background.mode !== "shader") {
    return null;
  }

  const phaseWeights =
    world.projectTimeLightingEnabled &&
    resolvedTime !== null &&
    timeSettings !== null
      ? resolveRuntimeDayNightPhaseWeights(
          timeSettings,
          resolvedTime.timeOfDayHours
        )
      : {
          day: 1,
          dawn: 0,
          dusk: 0,
          night: 0
        };
  const twilightFactor = clamp(phaseWeights.dawn + phaseWeights.dusk, 0, 1);
  const dayCount = resolvedTime?.dayCount ?? 0;
  const timeOfDayHours = resolvedTime?.timeOfDayHours ?? 12;
  const continuousHours = dayCount * 24 + timeOfDayHours;
  const dawnGradient = resolveGradientBasis(
    world.timeOfDay.dawn.background,
    world.timeOfDay.dawn.skyTopColorHex,
    world.timeOfDay.dawn.skyBottomColorHex
  );
  const duskGradient = resolveGradientBasis(
    world.timeOfDay.dusk.background,
    world.timeOfDay.dusk.skyTopColorHex,
    world.timeOfDay.dusk.skyBottomColorHex
  );
  const defaultNightGradient = createDefaultWorldTimePhaseProfile("night");
  const nightGradient = resolveGradientBasis(
    world.timeOfDay.night.background,
    defaultNightGradient.skyTopColorHex,
    defaultNightGradient.skyBottomColorHex
  );
  const sunDirection = normalizeDirection(
    resolvedWorld.sunLight.direction,
    world.sunLight.direction
  );
  const moonDirection = normalizeDirection(
    resolvedWorld.moonLight?.direction ?? {
      x: -sunDirection.x,
      y: -sunDirection.y,
      z: -sunDirection.z
    },
    {
      x: -sunDirection.x,
      y: -sunDirection.y,
      z: -sunDirection.z
    }
  );
  const sunRenderDirection = offsetDirectionForHorizon(
    sunDirection,
    world.shaderSky.horizonHeight
  );
  const moonRenderDirection = offsetDirectionForHorizon(
    moonDirection,
    world.shaderSky.horizonHeight
  );
  const starVisibility =
    clamp(phaseWeights.night + twilightFactor * 0.45, 0, 1) *
    clamp(1 - resolvedWorld.daylightFactor * 0.85, 0, 1);
  const cloudDriftDirectionRadians =
    (world.shaderSky.clouds.driftDirectionDegrees * Math.PI) / 180;
  const cloudDriftDistance =
    continuousHours * world.shaderSky.clouds.driftSpeed;

  return {
    presetId: world.shaderSky.presetId,
    time: {
      dayCount,
      timeOfDayHours,
      dayPhase: resolvedTime?.dayPhase ?? "day",
      daylightFactor: resolvedWorld.daylightFactor,
      twilightFactor,
      phaseWeights
    },
    sky: {
      topColorHex: blendHexColorsByWeights(
        {
          day: world.shaderSky.dayTopColorHex,
          dawn: dawnGradient.topColorHex,
          dusk: duskGradient.topColorHex,
          night: nightGradient.topColorHex
        },
        phaseWeights
      ),
      bottomColorHex: blendHexColorsByWeights(
        {
          day: world.shaderSky.dayBottomColorHex,
          dawn: dawnGradient.bottomColorHex,
          dusk: duskGradient.bottomColorHex,
          night: nightGradient.bottomColorHex
        },
        phaseWeights
      ),
      horizonHeight: world.shaderSky.horizonHeight
    },
    celestial: {
      sunDirection: sunRenderDirection,
      sunColorHex: resolvedWorld.sunLight.colorHex,
      sunIntensity: resolvedWorld.sunLight.intensity,
      sunDiscSizeDegrees: world.shaderSky.celestial.sunDiscSizeDegrees,
      sunVisible:
        world.showCelestialBodies && resolvedWorld.sunLight.intensity > 1e-4,
      moonDirection: moonRenderDirection,
      moonColorHex: resolvedWorld.moonLight?.colorHex ?? "#d7e4ff",
      moonIntensity: resolvedWorld.moonLight?.intensity ?? 0,
      moonDiscSizeDegrees: world.shaderSky.celestial.moonDiscSizeDegrees,
      moonVisible:
        world.showCelestialBodies &&
        (resolvedWorld.moonLight?.intensity ?? 0) > 1e-4
    },
    stars: {
      density: world.shaderSky.stars.density,
      brightness: world.shaderSky.stars.brightness,
      visibility: starVisibility,
      rotationRadians: Math.atan2(sunDirection.z, sunDirection.x)
    },
    clouds: {
      coverage: world.shaderSky.clouds.coverage,
      density: world.shaderSky.clouds.density,
      softness: world.shaderSky.clouds.softness,
      scale: world.shaderSky.clouds.scale,
      height: world.shaderSky.clouds.height,
      heightVariation: world.shaderSky.clouds.heightVariation,
      tintHex: world.shaderSky.clouds.tintHex,
      opacity: world.shaderSky.clouds.opacity,
      opacityRandomness: world.shaderSky.clouds.opacityRandomness,
      driftOffset: {
        x: Math.cos(cloudDriftDirectionRadians) * cloudDriftDistance,
        y: Math.sin(cloudDriftDirectionRadians) * cloudDriftDistance * 0.35
      }
    }
  };
}
