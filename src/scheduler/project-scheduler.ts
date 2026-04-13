import { createOpaqueId } from "../core/ids";
import {
  areControlEffectsEqual,
  cloneControlEffect,
  cloneControlTargetRef,
  createActorControlTargetRef,
  createSetActorPresenceControlEffect,
  getControlTargetRefKey,
  type ActorControlTargetRef,
  type SetActorPresenceControlEffect
} from "../controls/control-surface";
import {
  HOURS_PER_DAY,
  normalizeTimeOfDayHours
} from "../document/project-time-settings";

export const PROJECT_SCHEDULE_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export type ProjectScheduleWeekday =
  (typeof PROJECT_SCHEDULE_WEEKDAYS)[number];

export interface ProjectScheduleEveryDaySelection {
  mode: "everyDay";
}

export interface ProjectScheduleSelectedDaysSelection {
  mode: "selectedDays";
  days: ProjectScheduleWeekday[];
}

export type ProjectScheduleDaySelection =
  | ProjectScheduleEveryDaySelection
  | ProjectScheduleSelectedDaysSelection;

export interface ProjectScheduleRoutine {
  id: string;
  title: string;
  enabled: boolean;
  target: ActorControlTargetRef;
  days: ProjectScheduleDaySelection;
  startHour: number;
  endHour: number;
  priority: number;
  effect: SetActorPresenceControlEffect;
}

export interface ProjectScheduler {
  routines: Record<string, ProjectScheduleRoutine>;
}

export interface ProjectScheduleTimelineSegment {
  key: string;
  startHour: number;
  endHour: number;
}

export const DEFAULT_PROJECT_SCHEDULE_START_HOUR = 9 as const;
export const DEFAULT_PROJECT_SCHEDULE_END_HOUR = 17 as const;

function assertNonEmptyString(value: string, label: string) {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function normalizeProjectSchedulePriority(priority: number | undefined): number {
  if (priority === undefined || !Number.isFinite(priority)) {
    return 0;
  }

  return Math.trunc(priority);
}

function normalizeProjectScheduleDays(
  days: ProjectScheduleDaySelection | undefined
): ProjectScheduleDaySelection {
  if (days === undefined || days.mode === "everyDay") {
    return createProjectScheduleEveryDaySelection();
  }

  const deduplicatedDays = [...new Set(days.days)].filter(isProjectScheduleWeekday);

  if (deduplicatedDays.length === 0) {
    throw new Error("Project schedule selected days must include at least one day.");
  }

  if (deduplicatedDays.length === PROJECT_SCHEDULE_WEEKDAYS.length) {
    return createProjectScheduleEveryDaySelection();
  }

  return {
    mode: "selectedDays",
    days: deduplicatedDays
  };
}

function normalizeProjectScheduleTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? "";

  if (normalizedTitle.length === 0) {
    throw new Error("Project schedule routine title must be non-empty.");
  }

  return normalizedTitle;
}

function normalizeProjectScheduleHours(value: number, label: string): number {
  assertFiniteNumber(value, label);
  return normalizeTimeOfDayHours(value);
}

function normalizeProjectScheduleEffectTarget(
  target: ActorControlTargetRef,
  effect: SetActorPresenceControlEffect | undefined
): SetActorPresenceControlEffect {
  if (effect === undefined) {
    return createSetActorPresenceControlEffect({
      target,
      active: true
    });
  }

  if (
    effect.type !== "setActorPresence" ||
    getControlTargetRefKey(effect.target) !== getControlTargetRefKey(target)
  ) {
    throw new Error(
      "Project schedule routine effects must target the same authored actor target."
    );
  }

  return cloneControlEffect(effect);
}

export function isProjectScheduleWeekday(
  value: unknown
): value is ProjectScheduleWeekday {
  return PROJECT_SCHEDULE_WEEKDAYS.includes(value as ProjectScheduleWeekday);
}

export function createProjectScheduleEveryDaySelection(): ProjectScheduleEveryDaySelection {
  return {
    mode: "everyDay"
  };
}

export function createProjectScheduleSelectedDaysSelection(
  days: ProjectScheduleWeekday[]
): ProjectScheduleSelectedDaysSelection {
  return normalizeProjectScheduleDays({
    mode: "selectedDays",
    days
  }) as ProjectScheduleSelectedDaysSelection;
}

export function createEmptyProjectScheduler(): ProjectScheduler {
  return {
    routines: {}
  };
}

export function createProjectScheduleRoutine(
  overrides: Partial<
    Pick<
      ProjectScheduleRoutine,
      "id" | "title" | "enabled" | "target" | "days" | "startHour" | "endHour" | "priority" | "effect"
    >
  > &
    Pick<ProjectScheduleRoutine, "target" | "title"> = {
    target: createActorControlTargetRef("actor-default"),
    title: "Routine"
  }
): ProjectScheduleRoutine {
  const target = cloneControlTargetRef(overrides.target);
  const startHour = normalizeProjectScheduleHours(
    overrides.startHour ?? DEFAULT_PROJECT_SCHEDULE_START_HOUR,
    "Project schedule start hour"
  );
  const endHour = normalizeProjectScheduleHours(
    overrides.endHour ?? DEFAULT_PROJECT_SCHEDULE_END_HOUR,
    "Project schedule end hour"
  );

  if (startHour === endHour) {
    throw new Error("Project schedule routines must span at least part of the day.");
  }

  return {
    id: overrides.id ?? createOpaqueId("schedule-routine"),
    title: normalizeProjectScheduleTitle(overrides.title),
    enabled: overrides.enabled ?? true,
    target,
    days: normalizeProjectScheduleDays(overrides.days),
    startHour,
    endHour,
    priority: normalizeProjectSchedulePriority(overrides.priority),
    effect: normalizeProjectScheduleEffectTarget(target, overrides.effect)
  };
}

export function cloneProjectScheduleDaySelection(
  days: ProjectScheduleDaySelection
): ProjectScheduleDaySelection {
  switch (days.mode) {
    case "everyDay":
      return createProjectScheduleEveryDaySelection();
    case "selectedDays":
      return createProjectScheduleSelectedDaysSelection(days.days);
  }
}

export function cloneProjectScheduleRoutine(
  routine: ProjectScheduleRoutine
): ProjectScheduleRoutine {
  return {
    id: routine.id,
    title: routine.title,
    enabled: routine.enabled,
    target: cloneControlTargetRef(routine.target),
    days: cloneProjectScheduleDaySelection(routine.days),
    startHour: routine.startHour,
    endHour: routine.endHour,
    priority: routine.priority,
    effect: cloneControlEffect(routine.effect)
  };
}

export function cloneProjectScheduler(
  scheduler: ProjectScheduler
): ProjectScheduler {
  return {
    routines: Object.fromEntries(
      Object.entries(scheduler.routines).map(([routineId, routine]) => [
        routineId,
        cloneProjectScheduleRoutine(routine)
      ])
    )
  };
}

export function areProjectScheduleDaySelectionsEqual(
  left: ProjectScheduleDaySelection,
  right: ProjectScheduleDaySelection
): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "everyDay") {
    return true;
  }

  return (
    right.mode === "selectedDays" &&
    left.days.length === right.days.length &&
    left.days.every((day, index) => day === right.days[index])
  );
}

export function areProjectScheduleRoutinesEqual(
  left: ProjectScheduleRoutine,
  right: ProjectScheduleRoutine
): boolean {
  return (
    left.id === right.id &&
    left.title === right.title &&
    left.enabled === right.enabled &&
    getControlTargetRefKey(left.target) === getControlTargetRefKey(right.target) &&
    areProjectScheduleDaySelectionsEqual(left.days, right.days) &&
    left.startHour === right.startHour &&
    left.endHour === right.endHour &&
    left.priority === right.priority &&
    areControlEffectsEqual(left.effect, right.effect)
  );
}

export function areProjectSchedulersEqual(
  left: ProjectScheduler,
  right: ProjectScheduler
): boolean {
  const leftRoutineIds = Object.keys(left.routines);
  const rightRoutineIds = Object.keys(right.routines);

  if (leftRoutineIds.length !== rightRoutineIds.length) {
    return false;
  }

  return leftRoutineIds.every((routineId) => {
    const leftRoutine = left.routines[routineId];
    const rightRoutine = right.routines[routineId];

    return (
      leftRoutine !== undefined &&
      rightRoutine !== undefined &&
      areProjectScheduleRoutinesEqual(leftRoutine, rightRoutine)
    );
  });
}

export function resolveProjectScheduleWeekday(
  dayNumber: number
): ProjectScheduleWeekday {
  const normalizedDayNumber = Math.floor(Number.isFinite(dayNumber) ? dayNumber : 1);
  const zeroBasedDayIndex =
    ((normalizedDayNumber - 1) % PROJECT_SCHEDULE_WEEKDAYS.length +
      PROJECT_SCHEDULE_WEEKDAYS.length) %
    PROJECT_SCHEDULE_WEEKDAYS.length;

  return PROJECT_SCHEDULE_WEEKDAYS[zeroBasedDayIndex] ?? "monday";
}

export function getPreviousProjectScheduleWeekday(
  weekday: ProjectScheduleWeekday
): ProjectScheduleWeekday {
  const dayIndex = PROJECT_SCHEDULE_WEEKDAYS.indexOf(weekday);
  return (
    PROJECT_SCHEDULE_WEEKDAYS[
      (dayIndex - 1 + PROJECT_SCHEDULE_WEEKDAYS.length) %
        PROJECT_SCHEDULE_WEEKDAYS.length
    ] ?? "sunday"
  );
}

export function isProjectScheduleDaySelectionActive(
  days: ProjectScheduleDaySelection,
  weekday: ProjectScheduleWeekday
): boolean {
  switch (days.mode) {
    case "everyDay":
      return true;
    case "selectedDays":
      return days.days.includes(weekday);
  }
}

export function isProjectScheduleRoutineActiveAt(
  routine: ProjectScheduleRoutine,
  dayNumber: number,
  timeOfDayHours: number
): boolean {
  if (!routine.enabled) {
    return false;
  }

  const normalizedTimeOfDayHours = normalizeTimeOfDayHours(timeOfDayHours);
  const weekday = resolveProjectScheduleWeekday(dayNumber);

  if (routine.startHour < routine.endHour) {
    return (
      isProjectScheduleDaySelectionActive(routine.days, weekday) &&
      normalizedTimeOfDayHours >= routine.startHour &&
      normalizedTimeOfDayHours < routine.endHour
    );
  }

  return (
    (isProjectScheduleDaySelectionActive(routine.days, weekday) &&
      normalizedTimeOfDayHours >= routine.startHour) ||
    (isProjectScheduleDaySelectionActive(
      routine.days,
      getPreviousProjectScheduleWeekday(weekday)
    ) &&
      normalizedTimeOfDayHours < routine.endHour)
  );
}

export function compareProjectScheduleRoutinePriority(
  left: ProjectScheduleRoutine,
  right: ProjectScheduleRoutine
): number {
  return (
    right.priority - left.priority ||
    left.startHour - right.startHour ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}

export function getProjectScheduleTimelineSegments(
  routine: Pick<ProjectScheduleRoutine, "id" | "startHour" | "endHour">
): ProjectScheduleTimelineSegment[] {
  if (routine.startHour < routine.endHour) {
    return [
      {
        key: `${routine.id}:primary`,
        startHour: routine.startHour,
        endHour: routine.endHour
      }
    ];
  }

  return [
    {
      key: `${routine.id}:late`,
      startHour: routine.startHour,
      endHour: HOURS_PER_DAY
    },
    {
      key: `${routine.id}:early`,
      startHour: 0,
      endHour: routine.endHour
    }
  ];
}

export function formatProjectScheduleWeekdayLabel(
  weekday: ProjectScheduleWeekday
): string {
  switch (weekday) {
    case "monday":
      return "Mon";
    case "tuesday":
      return "Tue";
    case "wednesday":
      return "Wed";
    case "thursday":
      return "Thu";
    case "friday":
      return "Fri";
    case "saturday":
      return "Sat";
    case "sunday":
      return "Sun";
  }
}

export function formatProjectScheduleDaySelection(
  days: ProjectScheduleDaySelection
): string {
  switch (days.mode) {
    case "everyDay":
      return "Every day";
    case "selectedDays":
      return days.days.map(formatProjectScheduleWeekdayLabel).join(", ");
  }
}

export function upsertProjectScheduleRoutine(
  scheduler: ProjectScheduler,
  routine: ProjectScheduleRoutine
): ProjectScheduler {
  assertNonEmptyString(routine.id, "Project schedule routine id");

  return {
    routines: {
      ...scheduler.routines,
      [routine.id]: cloneProjectScheduleRoutine(routine)
    }
  };
}

export function removeProjectScheduleRoutine(
  scheduler: ProjectScheduler,
  routineId: string
): ProjectScheduler {
  if (scheduler.routines[routineId] === undefined) {
    return cloneProjectScheduler(scheduler);
  }

  const nextRoutines = { ...scheduler.routines };
  delete nextRoutines[routineId];

  return {
    routines: nextRoutines
  };
}
