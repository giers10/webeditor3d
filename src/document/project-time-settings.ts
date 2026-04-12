export const HOURS_PER_DAY = 24 as const;
export const DEFAULT_PROJECT_DAY_LENGTH_MINUTES = 24 as const;
export const DEFAULT_PROJECT_START_DAY_NUMBER = 1 as const;
export const DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS = 9 as const;
export const DEFAULT_PROJECT_SUNRISE_TIME_OF_DAY_HOURS = 6.5 as const;
export const DEFAULT_PROJECT_SUNSET_TIME_OF_DAY_HOURS = 18.5 as const;
export const DEFAULT_PROJECT_DAWN_DURATION_HOURS = 1.5 as const;
export const DEFAULT_PROJECT_DUSK_DURATION_HOURS = 1.5 as const;
export const DEFAULT_PROJECT_NIGHT_BACKGROUND_ENVIRONMENT_INTENSITY =
  0.35 as const;

export type ProjectTimePhase = "dawn" | "dusk" | "night";

export interface ProjectTimePhaseProfile {
  skyTopColorHex: string;
  skyBottomColorHex: string;
  ambientColorHex: string;
  ambientIntensityFactor: number;
  lightColorHex: string;
  lightIntensityFactor: number;
}

export interface ProjectTimeNightBackgroundSettings {
  assetId: string | null;
  environmentIntensity: number;
}

export interface ProjectTimeSettings {
  startDayNumber: number;
  startTimeOfDayHours: number;
  dayLengthMinutes: number;
  sunriseTimeOfDayHours: number;
  sunsetTimeOfDayHours: number;
  dawnDurationHours: number;
  duskDurationHours: number;
  dawn: ProjectTimePhaseProfile;
  dusk: ProjectTimePhaseProfile;
  night: ProjectTimePhaseProfile;
  nightBackground: ProjectTimeNightBackgroundSettings;
}

export function normalizeProjectStartDayNumber(dayNumber: number): number {
  if (!Number.isFinite(dayNumber)) {
    return DEFAULT_PROJECT_START_DAY_NUMBER;
  }

  return Math.max(DEFAULT_PROJECT_START_DAY_NUMBER, Math.floor(dayNumber));
}

export function normalizeTimeOfDayHours(hours: number): number {
  const wrappedHours = hours % HOURS_PER_DAY;
  return wrappedHours < 0 ? wrappedHours + HOURS_PER_DAY : wrappedHours;
}

export function formatTimeOfDayHours(hours: number): string {
  const normalizedHours = normalizeTimeOfDayHours(hours);
  const totalMinutes = Math.round(normalizedHours * 60) % (HOURS_PER_DAY * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(wholeHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function createDefaultProjectTimePhaseProfile(
  phase: ProjectTimePhase
): ProjectTimePhaseProfile {
  switch (phase) {
    case "dawn":
      return {
        skyTopColorHex: "#5877b2",
        skyBottomColorHex: "#f6a66f",
        ambientColorHex: "#ffd7b0",
        ambientIntensityFactor: 0.72,
        lightColorHex: "#ffc98d",
        lightIntensityFactor: 0.78
      };
    case "dusk":
      return {
        skyTopColorHex: "#304076",
        skyBottomColorHex: "#f08b5b",
        ambientColorHex: "#f0b69a",
        ambientIntensityFactor: 0.6,
        lightColorHex: "#ffae7d",
        lightIntensityFactor: 0.66
      };
    case "night":
      return {
        skyTopColorHex: "#081120",
        skyBottomColorHex: "#1a2438",
        ambientColorHex: "#1d2d45",
        ambientIntensityFactor: 0.24,
        lightColorHex: "#99b5ff",
        lightIntensityFactor: 0.16
      };
  }
}

export function createDefaultProjectTimeNightBackgroundSettings(): ProjectTimeNightBackgroundSettings {
  return {
    assetId: null,
    environmentIntensity: DEFAULT_PROJECT_NIGHT_BACKGROUND_ENVIRONMENT_INTENSITY
  };
}

export function cloneProjectTimePhaseProfile(
  profile: ProjectTimePhaseProfile
): ProjectTimePhaseProfile {
  return {
    skyTopColorHex: profile.skyTopColorHex,
    skyBottomColorHex: profile.skyBottomColorHex,
    ambientColorHex: profile.ambientColorHex,
    ambientIntensityFactor: profile.ambientIntensityFactor,
    lightColorHex: profile.lightColorHex,
    lightIntensityFactor: profile.lightIntensityFactor
  };
}

export function cloneProjectTimeNightBackgroundSettings(
  settings: ProjectTimeNightBackgroundSettings
): ProjectTimeNightBackgroundSettings {
  return {
    assetId: settings.assetId,
    environmentIntensity: settings.environmentIntensity
  };
}

export function areProjectTimePhaseProfilesEqual(
  left: ProjectTimePhaseProfile,
  right: ProjectTimePhaseProfile
): boolean {
  return (
    left.skyTopColorHex === right.skyTopColorHex &&
    left.skyBottomColorHex === right.skyBottomColorHex &&
    left.ambientColorHex === right.ambientColorHex &&
    left.ambientIntensityFactor === right.ambientIntensityFactor &&
    left.lightColorHex === right.lightColorHex &&
    left.lightIntensityFactor === right.lightIntensityFactor
  );
}

export function areProjectTimeNightBackgroundSettingsEqual(
  left: ProjectTimeNightBackgroundSettings,
  right: ProjectTimeNightBackgroundSettings
): boolean {
  return (
    left.assetId === right.assetId &&
    left.environmentIntensity === right.environmentIntensity
  );
}

export function createDefaultProjectTimeSettings(): ProjectTimeSettings {
  return {
    startDayNumber: DEFAULT_PROJECT_START_DAY_NUMBER,
    startTimeOfDayHours: DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS,
    dayLengthMinutes: DEFAULT_PROJECT_DAY_LENGTH_MINUTES,
    sunriseTimeOfDayHours: DEFAULT_PROJECT_SUNRISE_TIME_OF_DAY_HOURS,
    sunsetTimeOfDayHours: DEFAULT_PROJECT_SUNSET_TIME_OF_DAY_HOURS,
    dawnDurationHours: DEFAULT_PROJECT_DAWN_DURATION_HOURS,
    duskDurationHours: DEFAULT_PROJECT_DUSK_DURATION_HOURS,
    dawn: createDefaultProjectTimePhaseProfile("dawn"),
    dusk: createDefaultProjectTimePhaseProfile("dusk"),
    night: createDefaultProjectTimePhaseProfile("night"),
    nightBackground: createDefaultProjectTimeNightBackgroundSettings()
  };
}

export function cloneProjectTimeSettings(
  settings: ProjectTimeSettings
): ProjectTimeSettings {
  return {
    startDayNumber: settings.startDayNumber,
    startTimeOfDayHours: settings.startTimeOfDayHours,
    dayLengthMinutes: settings.dayLengthMinutes,
    sunriseTimeOfDayHours: settings.sunriseTimeOfDayHours,
    sunsetTimeOfDayHours: settings.sunsetTimeOfDayHours,
    dawnDurationHours: settings.dawnDurationHours,
    duskDurationHours: settings.duskDurationHours,
    dawn: cloneProjectTimePhaseProfile(settings.dawn),
    dusk: cloneProjectTimePhaseProfile(settings.dusk),
    night: cloneProjectTimePhaseProfile(settings.night),
    nightBackground: cloneProjectTimeNightBackgroundSettings(
      settings.nightBackground
    )
  };
}

export function areProjectTimeSettingsEqual(
  left: ProjectTimeSettings,
  right: ProjectTimeSettings
): boolean {
  return (
    left.startDayNumber === right.startDayNumber &&
    left.startTimeOfDayHours === right.startTimeOfDayHours &&
    left.dayLengthMinutes === right.dayLengthMinutes &&
    left.sunriseTimeOfDayHours === right.sunriseTimeOfDayHours &&
    left.sunsetTimeOfDayHours === right.sunsetTimeOfDayHours &&
    left.dawnDurationHours === right.dawnDurationHours &&
    left.duskDurationHours === right.duskDurationHours &&
    areProjectTimePhaseProfilesEqual(left.dawn, right.dawn) &&
    areProjectTimePhaseProfilesEqual(left.dusk, right.dusk) &&
    areProjectTimePhaseProfilesEqual(left.night, right.night) &&
    areProjectTimeNightBackgroundSettingsEqual(
      left.nightBackground,
      right.nightBackground
    )
  );
}