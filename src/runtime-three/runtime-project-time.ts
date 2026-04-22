import type { Vec3 } from "../core/vector";
import {
  formatTimeOfDayHours,
  HOURS_PER_DAY,
  normalizeTimeOfDayHours,
  type ProjectTimeSettings
} from "../document/project-time-settings";
import {
  cloneWorldBackgroundSettings,
  type WorldAmbientLightSettings,
  type WorldBackgroundSettings,
  type WorldTimeOfDaySettings,
  type WorldTimePhaseProfile,
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

export type RuntimeDayPhase = "night" | "dawn" | "day" | "dusk";

export interface RuntimeResolvedTimeState {
  timeOfDayHours: number;
  dayCount: number;
  dayLengthMinutes: number;
  dayPhase: RuntimeDayPhase;
  isNight: boolean;
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

interface RuntimeDayPhaseWindowBoundaries {
  dawnStart: number;
  dawnEnd: number;
  duskStart: number;
  duskEnd: number;
}

const MIN_RUNTIME_TIME_WINDOW_HOURS = 0.001;
const TIME_WINDOW_EPSILON = 1e-6;

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

function areTimesEquivalent(leftHours: number, rightHours: number): boolean {
  return (
    Math.abs(
      normalizeTimeOfDayHours(leftHours) - normalizeTimeOfDayHours(rightHours)
    ) <= TIME_WINDOW_EPSILON
  );
}

function resolveRuntimeDayPhaseWindowBoundaries(
  settings: ProjectTimeSettings
): RuntimeDayPhaseWindowBoundaries {
  const dawnHalfDuration =
    Math.max(settings.dawnDurationHours, MIN_RUNTIME_TIME_WINDOW_HOURS) / 2;
  const duskHalfDuration =
    Math.max(settings.duskDurationHours, MIN_RUNTIME_TIME_WINDOW_HOURS) / 2;

  return {
    dawnStart: settings.sunriseTimeOfDayHours - dawnHalfDuration,
    dawnEnd: settings.sunriseTimeOfDayHours + dawnHalfDuration,
    duskStart: settings.sunsetTimeOfDayHours - duskHalfDuration,
    duskEnd: settings.sunsetTimeOfDayHours + duskHalfDuration
  };
}

function hasTimeBoundaryBeenCrossed(
  previousTimeOfDayHours: number,
  currentTimeOfDayHours: number,
  boundaryTimeOfDayHours: number
): boolean {
  const normalizedPreviousTime = normalizeTimeOfDayHours(previousTimeOfDayHours);

  if (areTimesEquivalent(normalizedPreviousTime, boundaryTimeOfDayHours)) {
    return false;
  }

  const wrappedCurrentTime = wrapTimeForward(
    currentTimeOfDayHours,
    normalizedPreviousTime
  );
  const wrappedBoundaryTime = wrapTimeForward(
    boundaryTimeOfDayHours,
    normalizedPreviousTime
  );

  return (
    wrappedBoundaryTime - normalizedPreviousTime > TIME_WINDOW_EPSILON &&
    wrappedBoundaryTime <= wrappedCurrentTime + TIME_WINDOW_EPSILON
  );
}

export function isWithinTimeWindow(
  startTimeOfDayHours: number,
  endTimeOfDayHours: number,
  timeOfDayHours: number
): boolean {
  const normalizedStartTime = normalizeTimeOfDayHours(startTimeOfDayHours);
  const normalizedEndTime = normalizeTimeOfDayHours(endTimeOfDayHours);
  const normalizedTime = normalizeTimeOfDayHours(timeOfDayHours);

  if (areTimesEquivalent(normalizedStartTime, normalizedEndTime)) {
    return false;
  }

  if (normalizedStartTime < normalizedEndTime) {
    return (
      normalizedTime >= normalizedStartTime &&
      normalizedTime < normalizedEndTime
    );
  }

  return (
    normalizedTime >= normalizedStartTime || normalizedTime < normalizedEndTime
  );
}

export function hasTimeWindowJustStarted(
  previousTimeOfDayHours: number,
  currentTimeOfDayHours: number,
  startTimeOfDayHours: number,
  endTimeOfDayHours: number
): boolean {
  if (areTimesEquivalent(startTimeOfDayHours, endTimeOfDayHours)) {
    return false;
  }

  return hasTimeBoundaryBeenCrossed(
    previousTimeOfDayHours,
    currentTimeOfDayHours,
    startTimeOfDayHours
  );
}

export function hasTimeWindowJustEnded(
  previousTimeOfDayHours: number,
  currentTimeOfDayHours: number,
  startTimeOfDayHours: number,
  endTimeOfDayHours: number
): boolean {
  if (areTimesEquivalent(startTimeOfDayHours, endTimeOfDayHours)) {
    return false;
  }

  return hasTimeBoundaryBeenCrossed(
    previousTimeOfDayHours,
    currentTimeOfDayHours,
    endTimeOfDayHours
  );
}

export function resolveRuntimeDayPhase(
  settings: ProjectTimeSettings,
  timeOfDayHours: number
): RuntimeDayPhase {
  const normalizedTime = normalizeTimeOfDayHours(timeOfDayHours);
  const boundaries = resolveRuntimeDayPhaseWindowBoundaries(settings);

  if (
    isWithinTimeWindow(boundaries.dawnStart, boundaries.dawnEnd, normalizedTime)
  ) {
    return "dawn";
  }

  if (
    isWithinTimeWindow(boundaries.duskStart, boundaries.duskEnd, normalizedTime)
  ) {
    return "dusk";
  }

  if (
    isWithinTimeWindow(boundaries.dawnEnd, boundaries.duskStart, normalizedTime)
  ) {
    return "day";
  }

  return "night";
}

export function resolveRuntimeTimeState(
  settings: ProjectTimeSettings,
  clock: RuntimeClockState
): RuntimeResolvedTimeState {
  const timeOfDayHours = normalizeTimeOfDayHours(clock.timeOfDayHours);
  const dayPhase = resolveRuntimeDayPhase(settings, timeOfDayHours);

  return {
    timeOfDayHours,
    dayCount: clock.dayCount,
    dayLengthMinutes: clock.dayLengthMinutes,
    dayPhase,
    isNight: dayPhase === "night"
  };
}

function resolveRuntimeDayNightPhaseWeights(
  settings: ProjectTimeSettings,
  timeOfDayHours: number
): RuntimeDayNightPhaseWeights {
  const boundaries = resolveRuntimeDayPhaseWindowBoundaries(settings);
  const dawnStart = boundaries.dawnStart;
  const currentTime = wrapTimeForward(timeOfDayHours, dawnStart);
  const sunrise = wrapTimeForward(settings.sunriseTimeOfDayHours, dawnStart);
  const dawnEnd = wrapTimeForward(boundaries.dawnEnd, dawnStart);
  const sunset = wrapTimeForward(settings.sunsetTimeOfDayHours, dawnStart);
  const duskStart = wrapTimeForward(boundaries.duskStart, dawnStart);
  const duskEnd = wrapTimeForward(boundaries.duskEnd, dawnStart);

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

function createFallbackPhaseGradientBackground(
  profile: WorldTimePhaseProfile
): WorldBackgroundSettings {
  return {
    mode: "verticalGradient",
    topColorHex: profile.skyTopColorHex,
    bottomColorHex: profile.skyBottomColorHex
  };
}

function resolveTimePhaseBackground(
  profile: WorldTimePhaseProfile
): WorldBackgroundSettings {
  if (profile.background.mode === "image") {
    return {
      ...profile.background
    };
  }

  return cloneWorldBackgroundSettings(
    profile.background.mode === "solid" ||
      profile.background.mode === "verticalGradient"
      ? profile.background
      : createFallbackPhaseGradientBackground(profile)
  );
}

function hasConfiguredImageBackground(
  background: WorldBackgroundSettings
): background is Extract<WorldBackgroundSettings, { mode: "image" }> {
  return background.mode === "image" && background.assetId.trim().length > 0;
}

function resolveBackgroundTopColor(background: WorldBackgroundSettings): string {
  if (background.mode === "solid") {
    return background.colorHex;
  }

  if (background.mode === "verticalGradient") {
    return background.topColorHex;
  }

  return "#000000";
}

function resolveBackgroundBottomColor(background: WorldBackgroundSettings): string {
  if (background.mode === "solid") {
    return background.colorHex;
  }

  if (background.mode === "verticalGradient") {
    return background.bottomColorHex;
  }

  return "#000000";
}

function blendNonImageBackgrounds(
  contributions: Array<{
    background: WorldBackgroundSettings;
    weight: number;
  }>
): WorldBackgroundSettings {
  const activeContributions = contributions.filter(
    ({ background, weight }) => background.mode !== "image" && weight > 1e-6
  );

  if (activeContributions.length === 0) {
    const fallbackBackground = contributions.find(
      ({ background }) => background.mode !== "image"
    )?.background;

    return fallbackBackground === undefined
      ? {
          mode: "solid",
          colorHex: "#000000"
        }
      : cloneWorldBackgroundSettings(fallbackBackground);
  }

  const totalWeight = activeContributions.reduce(
    (sum, { weight }) => sum + weight,
    0
  );

  if (totalWeight <= 1e-6) {
    return cloneWorldBackgroundSettings(activeContributions[0].background);
  }

  const blendColor = (
    resolveColor: (background: WorldBackgroundSettings) => string
  ): string => {
    let red = 0;
    let green = 0;
    let blue = 0;

    for (const { background, weight } of activeContributions) {
      const color = parseHexColor(resolveColor(background));
      red += color.r * weight;
      green += color.g * weight;
      blue += color.b * weight;
    }

    return formatHexColor({
      r: red / totalWeight,
      g: green / totalWeight,
      b: blue / totalWeight
    });
  };

  const hasGradient = activeContributions.some(
    ({ background }) => background.mode === "verticalGradient"
  );
  const blendedTopColorHex = blendColor(resolveBackgroundTopColor);

  if (!hasGradient) {
    return {
      mode: "solid",
      colorHex: blendedTopColorHex
    };
  }

  const blendedBottomColorHex = blendColor(resolveBackgroundBottomColor);

  return {
    mode: "verticalGradient",
    topColorHex: blendedTopColorHex,
    bottomColorHex: blendedBottomColorHex
  };
}

function resolveBackgroundImageOverlay(
  background: WorldBackgroundSettings,
  opacity: number
): RuntimeDayNightWorldState["nightBackgroundOverlay"] {
  if (!hasConfiguredImageBackground(background)) {
    return null;
  }

  const clampedOpacity = clamp(opacity, 0, 1);

  if (clampedOpacity <= 1e-4) {
    return null;
  }

  return {
    assetId: background.assetId,
    environmentIntensity: background.environmentIntensity,
    opacity: clampedOpacity
  };
}

function resolvePreferredDaylikeImageBackground(
  contributions: Array<{
    background: WorldBackgroundSettings;
    weight: number;
  }>
): Extract<WorldBackgroundSettings, { mode: "image" }> | null {
  let bestContribution: {
    background: Extract<WorldBackgroundSettings, { mode: "image" }>;
    weight: number;
  } | null = null;

  for (const contribution of contributions) {
    if (!hasConfiguredImageBackground(contribution.background)) {
      continue;
    }

    if (
      bestContribution === null ||
      contribution.weight > bestContribution.weight + 1e-6
    ) {
      bestContribution = {
        background: contribution.background,
        weight: contribution.weight
      };
    }
  }

  return bestContribution === null
    ? null
    : cloneWorldBackgroundSettings(bestContribution.background);
}

function resolveTimeDrivenBackground(
  dayBackground: WorldBackgroundSettings,
  timeOfDay: WorldTimeOfDaySettings,
  weights: RuntimeDayNightPhaseWeights
): {
  background: WorldBackgroundSettings;
  nightBackgroundOverlay: RuntimeDayNightWorldState["nightBackgroundOverlay"];
} {
  const dawnBackground = resolveTimePhaseBackground(timeOfDay.dawn);
  const duskBackground = resolveTimePhaseBackground(timeOfDay.dusk);
  const nightBackground = timeOfDay.night.background;
  const twilightNightOpacity =
    weights.night + weights.dawn * 0.5 + weights.dusk * 0.5;
  const daylikeImageBackground = resolvePreferredDaylikeImageBackground([
    {
      background: dayBackground,
      weight: weights.day
    },
    {
      background: dawnBackground,
      weight: weights.dawn
    },
    {
      background: duskBackground,
      weight: weights.dusk
    }
  ]);

  if (daylikeImageBackground !== null) {
    return {
      background: daylikeImageBackground,
      nightBackgroundOverlay: resolveBackgroundImageOverlay(
        dayBackground,
        0
      )
    };
  }

  if (hasConfiguredImageBackground(nightBackground)) {
    return {
      background: blendNonImageBackgrounds([
        {
          background: dayBackground,
          weight: weights.day
        },
        {
          background: dawnBackground,
          weight: weights.dawn
        },
        {
          background: duskBackground,
          weight: weights.dusk
        }
      ]),
      nightBackgroundOverlay: resolveBackgroundImageOverlay(
        nightBackground,
        twilightNightOpacity
      )
    };
  }

  return {
    background: blendNonImageBackgrounds([
      {
        background: dayBackground,
        weight: weights.day
      },
      {
        background: dawnBackground,
        weight: weights.dawn
      },
      {
        background: duskBackground,
        weight: weights.dusk
      },
      {
        background: nightBackground,
        weight: weights.night
      }
    ]),
    nightBackgroundOverlay: null
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
  clock: RuntimeClockState | null,
  resolvedTime: RuntimeResolvedTimeState | null =
    clock === null ? null : resolveRuntimeTimeState(settings, clock)
): RuntimeDayNightWorldState {
  if (clock === null || resolvedTime === null || !world.projectTimeLightingEnabled) {
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

  const normalizedTime = resolvedTime.timeOfDayHours;
  const phaseWeights = resolveRuntimeDayNightPhaseWeights(
    settings,
    normalizedTime
  );
  const timeOfDay = world.timeOfDay;
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
      timeOfDay.dawn.lightIntensityFactor,
      timeOfDay.dusk.lightIntensityFactor,
      0,
      phaseWeights
    ) * smoothstep(-0.16, 0.18, sunDirection.y);
  const ambientFactor = blendScalarByWeights(
    1,
    timeOfDay.dawn.ambientIntensityFactor,
    timeOfDay.dusk.ambientIntensityFactor,
    timeOfDay.night.ambientIntensityFactor,
    phaseWeights
  );
  const resolvedBackground = resolveTimeDrivenBackground(
    world.background,
    timeOfDay,
    phaseWeights
  );
  let moonLight: WorldSunLightSettings | null = null;

  const moonVisibilityFactor = clamp(
    phaseWeights.night + phaseWeights.dawn * 0.45 + phaseWeights.dusk * 0.45,
    0,
    1
  );

  if (moonVisibilityFactor > 1e-4) {
    moonLight = {
      colorHex: blendHexColorsByWeights(
        timeOfDay.night.lightColorHex,
        timeOfDay.dawn.lightColorHex,
        timeOfDay.dusk.lightColorHex,
        timeOfDay.night.lightColorHex,
        {
          day: 0,
          dawn: phaseWeights.dawn,
          dusk: phaseWeights.dusk,
          night: phaseWeights.night
        }
      ),
      intensity:
        world.sunLight.intensity *
        timeOfDay.night.lightIntensityFactor *
        moonVisibilityFactor,
      direction: scaleVec3(sunDirection, -1)
    };
  }

  return {
    ambientLight: {
      colorHex: blendHexColorsByWeights(
        world.ambientLight.colorHex,
        timeOfDay.dawn.ambientColorHex,
        timeOfDay.dusk.ambientColorHex,
        timeOfDay.night.ambientColorHex,
        phaseWeights
      ),
      intensity: world.ambientLight.intensity * ambientFactor
    },
    sunLight: {
      colorHex: blendHexColorsByWeights(
        world.sunLight.colorHex,
        timeOfDay.dawn.lightColorHex,
        timeOfDay.dusk.lightColorHex,
        timeOfDay.night.lightColorHex,
        phaseWeights
      ),
      intensity: world.sunLight.intensity * sunFactor,
      direction: sunDirection
    },
    moonLight,
    background: resolvedBackground.background,
    nightBackgroundOverlay: resolvedBackground.nightBackgroundOverlay,
    daylightFactor
  };
}
