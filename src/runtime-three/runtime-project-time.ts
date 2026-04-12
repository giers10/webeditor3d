import type { Vec3 } from "../core/vector";
import {
  formatTimeOfDayHours,
  HOURS_PER_DAY,
  type ProjectTimeNightBackgroundSettings,
  normalizeTimeOfDayHours,
  type ProjectTimePhaseProfile,
  type ProjectTimeSettings
} from "../document/project-time-settings";
import {
  cloneWorldBackgroundSettings,
  type WorldAmbientLightSettings,
  type WorldBackgroundSettings,
  type WorldSettings,
  type WorldSunLightSettings
} from "../document/world-settings";

const DEFAULT_NOON_DIRECTION: Vec3 = {
  x: 0.45,
  y: 0.88,
  z: 0.15
};
const UP_AXIS: Vec3 = {
  x: 0,
  y: 1,
  z: 0
};

export interface RuntimeClockState {
  timeOfDayHours: number;
  dayCount: number;
  dayLengthMinutes: number;
}

export interface RuntimeDayNightWorldState {
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
  moonLight: WorldSunLightSettings | null;
  background: WorldBackgroundSettings;
  nightBackgroundOverlay: {
    assetId: string;
    environmentIntensity: number;
    opacity: number;
  } | null;
  daylightFactor: number;
}

interface RuntimeDayNightPhaseWeights {
  day: number;
  dawn: number;
  dusk: number;
  night: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 1e-6) {
    return {
      ...DEFAULT_NOON_DIRECTION
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function dot(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function rotateAroundAxis(vector: Vec3, axis: Vec3, radians: number): Vec3 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return normalizeVec3(
    addVec3(
      addVec3(
        scaleVec3(vector, cosine),
        scaleVec3(cross(axis, vector), sine)
      ),
      scaleVec3(axis, dot(axis, vector) * (1 - cosine))
    )
  );
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
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function blendHexColors(leftHex: string, rightHex: string, amount: number): string {
  const left = parseHexColor(leftHex);
  const right = parseHexColor(rightHex);

  return formatHexColor({
    r: lerp(left.r, right.r, amount),
    g: lerp(left.g, right.g, amount),
    b: lerp(left.b, right.b, amount)
  });
}

function blendHexColorsByWeights(
  dayHex: string,
  dawnHex: string,
  duskHex: string,
  nightHex: string,
  weights: RuntimeDayNightPhaseWeights
): string {
  const totalWeight =
    weights.day + weights.dawn + weights.dusk + weights.night;

  if (totalWeight <= 1e-6) {
    return dayHex;
  }

  const day = parseHexColor(dayHex);
  const dawn = parseHexColor(dawnHex);
  const dusk = parseHexColor(duskHex);
  const night = parseHexColor(nightHex);

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

function blendScalarByWeights(
  dayValue: number,
  dawnValue: number,
  duskValue: number,
  nightValue: number,
  weights: RuntimeDayNightPhaseWeights
): number {
  const totalWeight =
    weights.day + weights.dawn + weights.dusk + weights.night;

  if (totalWeight <= 1e-6) {
    return dayValue;
  }

  return (
    dayValue * weights.day +
    dawnValue * weights.dawn +
    duskValue * weights.dusk +
    nightValue * weights.night
  ) / totalWeight;
}

function resolveNoonSunDirection(direction: Vec3): Vec3 {
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

function wrapTimeForward(hours: number, originHours: number): number {
  let wrappedHours = normalizeTimeOfDayHours(hours);

  while (wrappedHours < originHours) {
    wrappedHours += HOURS_PER_DAY;
  }

  return wrappedHours;
}

function resolveRuntimeDayNightPhaseWeights(
  settings: ProjectTimeSettings,
  timeOfDayHours: number
): RuntimeDayNightPhaseWeights {
  const dawnHalfDuration = Math.max(settings.dawnDurationHours, 0.001) / 2;
  const duskHalfDuration = Math.max(settings.duskDurationHours, 0.001) / 2;
  const dawnStart = settings.sunriseTimeOfDayHours - dawnHalfDuration;
  const currentTime = wrapTimeForward(timeOfDayHours, dawnStart);
  const sunrise = wrapTimeForward(settings.sunriseTimeOfDayHours, dawnStart);
  const dawnEnd = sunrise + dawnHalfDuration;
  const sunset = wrapTimeForward(settings.sunsetTimeOfDayHours, dawnStart);
  const duskStart = sunset - duskHalfDuration;
  const duskEnd = sunset + duskHalfDuration;

  if (currentTime < sunrise) {
    const amount = smoothstep(dawnStart, sunrise, currentTime);

    return {
      day: 0,
      dawn: amount,
      dusk: 0,
      night: 1 - amount
    };
  }

  if (currentTime < dawnEnd) {
    const amount = smoothstep(sunrise, dawnEnd, currentTime);

    return {
      day: amount,
      dawn: 1 - amount,
      dusk: 0,
      night: 0
    };
  }

  if (currentTime < duskStart) {
    return {
      day: 1,
      dawn: 0,
      dusk: 0,
      night: 0
    };
  }

  if (currentTime < sunset) {
    const amount = smoothstep(duskStart, sunset, currentTime);

    return {
      day: 1 - amount,
      dawn: 0,
      dusk: amount,
      night: 0
    };
  }

  if (currentTime < duskEnd) {
    const amount = smoothstep(sunset, duskEnd, currentTime);

    return {
      day: 0,
      dawn: 0,
      dusk: 1 - amount,
      night: amount
    };
  }

  return {
    day: 0,
    dawn: 0,
    dusk: 0,
    night: 1
  };
}

function resolveTimeDrivenSunOrbitRadians(
  settings: ProjectTimeSettings,
  timeOfDayHours: number
): number {
  const sunrise = settings.sunriseTimeOfDayHours;
  const daytimeDuration = Math.max(
    settings.sunsetTimeOfDayHours - settings.sunriseTimeOfDayHours,
    0.001
  );
  const relativeTime = wrapTimeForward(timeOfDayHours, sunrise) - sunrise;

  if (relativeTime <= daytimeDuration) {
    const daytimeProgress = clamp(relativeTime / daytimeDuration, 0, 1);

    return lerp(-Math.PI / 2, Math.PI / 2, daytimeProgress);
  }

  const nighttimeDuration = Math.max(HOURS_PER_DAY - daytimeDuration, 0.001);
  const nighttimeProgress = clamp(
    (relativeTime - daytimeDuration) / nighttimeDuration,
    0,
    1
  );

  return lerp(Math.PI / 2, Math.PI * 1.5, nighttimeProgress);
}

function resolveTimeDrivenSunDirection(
  noonDirection: Vec3,
  settings: ProjectTimeSettings,
  timeOfDayHours: number
): Vec3 {
  const orbitAxisCandidate = cross(noonDirection, UP_AXIS);
  const orbitAxis =
    Math.hypot(
      orbitAxisCandidate.x,
      orbitAxisCandidate.y,
      orbitAxisCandidate.z
    ) <= 1e-6
      ? {
          x: 1,
          y: 0,
          z: 0
        }
      : normalizeVec3(orbitAxisCandidate);
  const orbitRadians = resolveTimeDrivenSunOrbitRadians(
    settings,
    timeOfDayHours
  );

  return rotateAroundAxis(noonDirection, orbitAxis, orbitRadians);
}

function resolvePhaseSolidBackgroundColor(profile: ProjectTimePhaseProfile): string {
  return blendHexColors(profile.skyTopColorHex, profile.skyBottomColorHex, 0.65);
}

function resolveTimeDrivenBackground(
  background: WorldBackgroundSettings,
  settings: ProjectTimeSettings,
  weights: RuntimeDayNightPhaseWeights
): WorldBackgroundSettings {
  if (background.mode === "solid") {
    return {
      mode: "solid",
      colorHex: blendHexColorsByWeights(
        background.colorHex,
        resolvePhaseSolidBackgroundColor(settings.dawn),
        resolvePhaseSolidBackgroundColor(settings.dusk),
        resolvePhaseSolidBackgroundColor(settings.night),
        weights
      )
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: blendHexColorsByWeights(
        background.topColorHex,
        settings.dawn.skyTopColorHex,
        settings.dusk.skyTopColorHex,
        settings.night.skyTopColorHex,
        weights
      ),
      bottomColorHex: blendHexColorsByWeights(
        background.bottomColorHex,
        settings.dawn.skyBottomColorHex,
        settings.dusk.skyBottomColorHex,
        settings.night.skyBottomColorHex,
        weights
      )
    };
  }

  return cloneWorldBackgroundSettings(background);
}

function resolveNightBackgroundOverlay(
  nightBackground: ProjectTimeNightBackgroundSettings,
  weights: RuntimeDayNightPhaseWeights
): RuntimeDayNightWorldState["nightBackgroundOverlay"] {
  if (nightBackground.assetId === null) {
    return null;
  }

  const opacity = clamp(
    weights.night + weights.dawn * 0.5 + weights.dusk * 0.5,
    0,
    1
  );

  if (opacity <= 1e-4) {
    return null;
  }

  return {
    assetId: nightBackground.assetId,
    environmentIntensity: nightBackground.environmentIntensity,
    opacity
  };
}

export function createRuntimeClockState(
  settings: ProjectTimeSettings
): RuntimeClockState {
  return {
    timeOfDayHours: normalizeTimeOfDayHours(settings.startTimeOfDayHours),
    dayCount: settings.startDayNumber - 1,
    dayLengthMinutes: settings.dayLengthMinutes
  };
}

export function cloneRuntimeClockState(
  state: RuntimeClockState
): RuntimeClockState {
  return {
    timeOfDayHours: state.timeOfDayHours,
    dayCount: state.dayCount,
    dayLengthMinutes: state.dayLengthMinutes
  };
}

export function areRuntimeClockStatesEqual(
  left: RuntimeClockState,
  right: RuntimeClockState
): boolean {
  return (
    left.timeOfDayHours === right.timeOfDayHours &&
    left.dayCount === right.dayCount &&
    left.dayLengthMinutes === right.dayLengthMinutes
  );
}

export function reconfigureRuntimeClockState(
  state: RuntimeClockState,
  settings: ProjectTimeSettings
): RuntimeClockState {
  return {
    ...cloneRuntimeClockState(state),
    dayLengthMinutes: settings.dayLengthMinutes
  };
}

export function advanceRuntimeClockState(
  state: RuntimeClockState,
  dtSeconds: number
): RuntimeClockState {
  if (dtSeconds <= 0) {
    return cloneRuntimeClockState(state);
  }

  const safeDayLengthMinutes = Math.max(state.dayLengthMinutes, 0.001);
  const hoursAdvanced =
    (dtSeconds / (safeDayLengthMinutes * 60)) * HOURS_PER_DAY;
  const absoluteHours = state.timeOfDayHours + hoursAdvanced;

  return {
    timeOfDayHours: normalizeTimeOfDayHours(absoluteHours),
    dayCount: state.dayCount + Math.floor(absoluteHours / HOURS_PER_DAY),
    dayLengthMinutes: state.dayLengthMinutes
  };
}

export function formatRuntimeClockTime(state: RuntimeClockState): string {
  return formatTimeOfDayHours(state.timeOfDayHours);
}

export function resolveRuntimeDayNightWorldState(
  world: WorldSettings,
  settings: ProjectTimeSettings,
  clock: RuntimeClockState | null
): RuntimeDayNightWorldState {
  if (clock === null || !world.projectTimeLightingEnabled) {
    return {
      ambientLight: {
        colorHex: world.ambientLight.colorHex,
        intensity: world.ambientLight.intensity
      },
      sunLight: {
        colorHex: world.sunLight.colorHex,
        intensity: world.sunLight.intensity,
        direction: {
          ...world.sunLight.direction
        }
      },
      moonLight: null,
      background: cloneWorldBackgroundSettings(world.background),
      nightBackgroundOverlay: null,
      daylightFactor: 1
    };
  }

  const normalizedTime = normalizeTimeOfDayHours(clock.timeOfDayHours);
  const phaseWeights = resolveRuntimeDayNightPhaseWeights(
    settings,
    normalizedTime
  );
  const noonDirection = resolveNoonSunDirection(world.sunLight.direction);
  const sunDirection = resolveTimeDrivenSunDirection(
    noonDirection,
    settings,
    normalizedTime
  );
  const daylightFactor = clamp(
    phaseWeights.day +
      phaseWeights.dawn * 0.7 +
      phaseWeights.dusk * 0.5 +
      phaseWeights.night * 0.08,
    0,
    1
  );
  const sunFactor =
    blendScalarByWeights(
      1,
      settings.dawn.lightIntensityFactor,
      settings.dusk.lightIntensityFactor,
      0,
      phaseWeights
    ) * smoothstep(-0.16, 0.18, sunDirection.y);
  const ambientFactor = blendScalarByWeights(
    1,
    settings.dawn.ambientIntensityFactor,
    settings.dusk.ambientIntensityFactor,
    settings.night.ambientIntensityFactor,
    phaseWeights
  );

  const beforeSunrise = normalizedTime < settings.sunriseTimeOfDayHours;
  const afterSunset = normalizedTime >= settings.sunsetTimeOfDayHours;
  let moonLight: WorldSunLightSettings | null = null;

  if (beforeSunrise || afterSunset || phaseWeights.night > 0) {
    let moonColorHex = settings.night.lightColorHex;
    let moonVisibilityFactor = phaseWeights.night;

    if (beforeSunrise && phaseWeights.dawn > 0) {
      const twilightBlend =
        phaseWeights.dawn /
        Math.max(phaseWeights.dawn + phaseWeights.night, 0.001);
      moonColorHex = blendHexColors(
        settings.night.lightColorHex,
        settings.dawn.lightColorHex,
        twilightBlend
      );
      moonVisibilityFactor = phaseWeights.night + phaseWeights.dawn * 0.45;
    } else if (afterSunset && phaseWeights.dusk > 0) {
      const twilightBlend =
        phaseWeights.dusk /
        Math.max(phaseWeights.dusk + phaseWeights.night, 0.001);
      moonColorHex = blendHexColors(
        settings.night.lightColorHex,
        settings.dusk.lightColorHex,
        twilightBlend
      );
      moonVisibilityFactor = phaseWeights.night + phaseWeights.dusk * 0.45;
    }

    moonVisibilityFactor = clamp(moonVisibilityFactor, 0, 1);

    if (moonVisibilityFactor > 1e-4) {
      moonLight = {
        colorHex: moonColorHex,
        intensity:
          world.sunLight.intensity *
          settings.night.lightIntensityFactor *
          moonVisibilityFactor,
        direction: scaleVec3(sunDirection, -1)
      };
    }
  }

  return {
    ambientLight: {
      colorHex: blendHexColorsByWeights(
        world.ambientLight.colorHex,
        settings.dawn.ambientColorHex,
        settings.dusk.ambientColorHex,
        settings.night.ambientColorHex,
        phaseWeights
      ),
      intensity: world.ambientLight.intensity * ambientFactor
    },
    sunLight: {
      colorHex: blendHexColorsByWeights(
        world.sunLight.colorHex,
        settings.dawn.lightColorHex,
        settings.dusk.lightColorHex,
        settings.night.lightColorHex,
        phaseWeights
      ),
      intensity: world.sunLight.intensity * sunFactor,
      direction: sunDirection
    },
    moonLight,
    background: resolveTimeDrivenBackground(
      world.background,
      settings,
      phaseWeights
    ),
    nightBackgroundOverlay: resolveNightBackgroundOverlay(
      settings.nightBackground,
      phaseWeights
    ),
    daylightFactor
  };
}