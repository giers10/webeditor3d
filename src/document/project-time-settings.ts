export const HOURS_PER_DAY = 24 as const;
export const DEFAULT_PROJECT_DAY_LENGTH_MINUTES = 24 as const;
export const DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS = 9 as const;

export interface ProjectTimeSettings {
  startTimeOfDayHours: number;
  dayLengthMinutes: number;
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
    startTimeOfDayHours: DEFAULT_PROJECT_START_TIME_OF_DAY_HOURS,
    dayLengthMinutes: DEFAULT_PROJECT_DAY_LENGTH_MINUTES
  };
}

export function cloneProjectTimeSettings(
  settings: ProjectTimeSettings
): ProjectTimeSettings {
  return {
    startTimeOfDayHours: settings.startTimeOfDayHours,
    dayLengthMinutes: settings.dayLengthMinutes
  };
}

export function areProjectTimeSettingsEqual(
  left: ProjectTimeSettings,
  right: ProjectTimeSettings
): boolean {
  return (
    left.startTimeOfDayHours === right.startTimeOfDayHours &&
    left.dayLengthMinutes === right.dayLengthMinutes
  );
}