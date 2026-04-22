import type { Vec2, Vec3 } from "../core/vector";
import {
  HOURS_PER_DAY,
  normalizeTimeOfDayHours,
  type ProjectTimeSettings
} from "../document/project-time-settings";
import {
  createDefaultWorldTimePhaseProfile,
  type WorldBackgroundSettings,
  type WorldSettings
} from "../document/world-settings";
import {
  resolveRuntimeDayNightWorldState,
  resolveRuntimeDayNightPhaseWeights,
  resolveRuntimeTimeState,
  type RuntimeDayNightPhaseWeights,
  type RuntimeDayPhase,
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
    horizonFadeOffset: number;
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

export interface WorldShaderSkyEnvironmentPhaseStates {
  day: WorldShaderSkyRenderState | null;
  dawn: WorldShaderSkyRenderState | null;
  dusk: WorldShaderSkyRenderState | null;
  night: WorldShaderSkyRenderState | null;
}

export interface WorldShaderSkyEnvironmentPhaseBlend {
  basePhase: RuntimeDayPhase;
  overlayPhase: RuntimeDayPhase | null;
  blendAmount: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function wrapTimeForward(hours: number, originHours: number): number {
  let wrappedHours = normalizeTimeOfDayHours(hours);

  while (wrappedHours < originHours) {
    wrappedHours += HOURS_PER_DAY;
  }

  return wrappedHours;
}

function resolveTimeWindowMidpoint(
  startTimeOfDayHours: number,
  endTimeOfDayHours: number
): number {
  const wrappedEndTime = wrapTimeForward(endTimeOfDayHours, startTimeOfDayHours);

  return normalizeTimeOfDayHours(
    startTimeOfDayHours + (wrappedEndTime - startTimeOfDayHours) / 2
  );
}

function quantizeNumberToBucket(value: number, step: number): number {
  return Math.round(value / step);
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

function offsetDirectionForHorizon(
  direction: Vec3,
  horizonHeight: number
): Vec3 {
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
      horizonFadeOffset: world.shaderSky.stars.horizonFadeOffset,
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

export function resolveWorldShaderSkyEnvironmentPhaseStates(
  world: WorldSettings,
  timeSettings: ProjectTimeSettings | null
): WorldShaderSkyEnvironmentPhaseStates {
  if (world.background.mode !== "shader") {
    return {
      day: null,
      dawn: null,
      dusk: null,
      night: null
    };
  }

  if (!world.projectTimeLightingEnabled || timeSettings === null) {
    const resolvedWorld: RuntimeDayNightWorldState = {
      ambientLight: {
        ...world.ambientLight
      },
      sunLight: {
        ...world.sunLight,
        direction: {
          ...world.sunLight.direction
        }
      },
      moonLight: null,
      background: {
        ...world.background
      },
      nightBackgroundOverlay: null,
      daylightFactor: 1
    };
    const dayState = resolveWorldShaderSkyRenderState(
      world,
      resolvedWorld,
      null,
      null
    );

    return {
      day: dayState,
      dawn: dayState,
      dusk: dayState,
      night: dayState
    };
  }

  const dawnHalfDuration =
    Math.max(timeSettings.dawnDurationHours, 0.001) / 2;
  const duskHalfDuration =
    Math.max(timeSettings.duskDurationHours, 0.001) / 2;
  const dawnStart = timeSettings.sunriseTimeOfDayHours - dawnHalfDuration;
  const dawnEnd = timeSettings.sunriseTimeOfDayHours + dawnHalfDuration;
  const duskStart = timeSettings.sunsetTimeOfDayHours - duskHalfDuration;
  const duskEnd = timeSettings.sunsetTimeOfDayHours + duskHalfDuration;
  const representativeTimes = {
    dawn: resolveTimeWindowMidpoint(dawnStart, dawnEnd),
    day: resolveTimeWindowMidpoint(dawnEnd, duskStart),
    dusk: resolveTimeWindowMidpoint(duskStart, duskEnd),
    night: resolveTimeWindowMidpoint(duskEnd, dawnStart)
  };
  const resolveRepresentativeState = (
    timeOfDayHours: number
  ): WorldShaderSkyRenderState | null => {
    const resolvedTime = resolveRuntimeTimeState(timeSettings, {
      timeOfDayHours,
      dayCount: 0,
      dayLengthMinutes: timeSettings.dayLengthMinutes
    });
    const resolvedWorld = resolveRuntimeDayNightWorldState(
      world,
      timeSettings,
      {
        timeOfDayHours,
        dayCount: 0,
        dayLengthMinutes: timeSettings.dayLengthMinutes
      },
      resolvedTime
    );

    return resolveWorldShaderSkyRenderState(
      world,
      resolvedWorld,
      resolvedTime,
      timeSettings
    );
  };

  return {
    day: resolveRepresentativeState(representativeTimes.day),
    dawn: resolveRepresentativeState(representativeTimes.dawn),
    dusk: resolveRepresentativeState(representativeTimes.dusk),
    night: resolveRepresentativeState(representativeTimes.night)
  };
}

export function createWorldShaderSkyEnvironmentCacheKey(
  state: WorldShaderSkyRenderState
): string {
  return JSON.stringify({
    presetId: state.presetId,
    sky: [
      state.sky.topColorHex,
      state.sky.bottomColorHex,
      quantizeNumberToBucket(state.sky.horizonHeight, 0.01)
    ],
    sun: [
      state.celestial.sunColorHex,
      quantizeNumberToBucket(state.celestial.sunDirection.x, 0.01),
      quantizeNumberToBucket(state.celestial.sunDirection.y, 0.01),
      quantizeNumberToBucket(state.celestial.sunDirection.z, 0.01),
      quantizeNumberToBucket(state.celestial.sunIntensity, 0.05),
      quantizeNumberToBucket(state.celestial.sunDiscSizeDegrees, 0.05),
      state.celestial.sunVisible ? 1 : 0
    ],
    moon: [
      state.celestial.moonColorHex,
      quantizeNumberToBucket(state.celestial.moonDirection.x, 0.01),
      quantizeNumberToBucket(state.celestial.moonDirection.y, 0.01),
      quantizeNumberToBucket(state.celestial.moonDirection.z, 0.01),
      quantizeNumberToBucket(state.celestial.moonIntensity, 0.05),
      quantizeNumberToBucket(state.celestial.moonDiscSizeDegrees, 0.05),
      state.celestial.moonVisible ? 1 : 0
    ],
    stars: [
      quantizeNumberToBucket(state.stars.density, 0.05),
      quantizeNumberToBucket(state.stars.brightness, 0.05),
      quantizeNumberToBucket(state.stars.visibility, 0.05),
      quantizeNumberToBucket(state.stars.horizonFadeOffset, 0.01),
      quantizeNumberToBucket(state.stars.rotationRadians, 0.02)
    ],
    clouds: [
      state.clouds.tintHex,
      quantizeNumberToBucket(state.clouds.coverage, 0.05),
      quantizeNumberToBucket(state.clouds.density, 0.05),
      quantizeNumberToBucket(state.clouds.softness, 0.05),
      quantizeNumberToBucket(state.clouds.scale, 0.05),
      quantizeNumberToBucket(state.clouds.height, 0.05),
      quantizeNumberToBucket(state.clouds.heightVariation, 0.05),
      quantizeNumberToBucket(state.clouds.opacity, 0.05),
      quantizeNumberToBucket(state.clouds.opacityRandomness, 0.05),
      quantizeNumberToBucket(state.clouds.driftOffset.x, 0.02),
      quantizeNumberToBucket(state.clouds.driftOffset.y, 0.02)
    ]
  });
}

export function createWorldShaderSkyEnvironmentPhaseCacheKey(
  states: WorldShaderSkyEnvironmentPhaseStates
): string {
  return JSON.stringify({
    day:
      states.day === null
        ? null
        : createWorldShaderSkyEnvironmentCacheKey(states.day),
    dawn:
      states.dawn === null
        ? null
        : createWorldShaderSkyEnvironmentCacheKey(states.dawn),
    dusk:
      states.dusk === null
        ? null
        : createWorldShaderSkyEnvironmentCacheKey(states.dusk),
    night:
      states.night === null
        ? null
        : createWorldShaderSkyEnvironmentCacheKey(states.night)
  });
}

export function resolveWorldShaderSkyEnvironmentPhaseBlend(
  state: Pick<WorldShaderSkyRenderState, "time">
): WorldShaderSkyEnvironmentPhaseBlend | null {
  const activePhases = (
    ["day", "dawn", "dusk", "night"] as const
  ).filter((phase) => state.time.phaseWeights[phase] > 1e-4);

  if (activePhases.length === 0) {
    return null;
  }

  if (activePhases.length === 1) {
    return {
      basePhase: activePhases[0],
      overlayPhase: null,
      blendAmount: 0
    };
  }

  const [basePhase, overlayPhase] = activePhases;
  const baseWeight = state.time.phaseWeights[basePhase];
  const overlayWeight = state.time.phaseWeights[overlayPhase];
  const totalWeight = Math.max(baseWeight + overlayWeight, 1e-6);

  return {
    basePhase,
    overlayPhase,
    blendAmount: overlayWeight / totalWeight
  };
}
