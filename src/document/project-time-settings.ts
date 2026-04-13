export const HOURS_PER_DAY = 24 as const;
export const DEFAULT_PROJECT_DAY_LENGTH_MINUTES = 24 as const;
export const DEFAULT_PROJECT_START_DAY_NUMBER = 1 as const;
export const DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS = 9 as const;
export const DEFAULT_PROJECT_SUNRISE_TIME_OF_DAY_HOURS = 6.5 as const;
export const DEFAULT_PROJECT_SUNSET_TIME_OF_DAY_HOURS = 18.5 as const;
export const DEFAULT_PROJECT_DAWN_DURATION_HOURS = 1.5 as const;
export const DEFAULT_PROJECT_DUSK_DURATION_HOURS = 1.5 as const;

export interface ProjectTimeSettings {
  startDayNumber: number;
  startTimeOfDayHours: number;
  dayLengthMinutes: number;
  sunriseTimeOfDayHours: number;
  sunsetTimeOfDayHours: number;
  dawnDurationHours: number;
  duskDurationHours: number;
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

export function createDefaultProjectTimeSettings(): ProjectTimeSettings {
  return {
    startDayNumber: DEFAULT_PROJECT_START_DAY_NUMBER,
    startTimeOfDayHours: DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS,
    dayLengthMinutes: DEFAULT_PROJECT_DAY_LENGTH_MINUTES,
    sunriseTimeOfDayHours: DEFAULT_PROJECT_SUNRISE_TIME_OF_DAY_HOURS,
    sunsetTimeOfDayHours: DEFAULT_PROJECT_SUNSET_TIME_OF_DAY_HOURS,
    dawnDurationHours: DEFAULT_PROJECT_DAWN_DURATION_HOURS,
    duskDurationHours: DEFAULT_PROJECT_DUSK_DURATION_HOURS
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
    duskDurationHours: settings.duskDurationHours
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
    left.duskDurationHours === right.duskDurationHours
  );
}