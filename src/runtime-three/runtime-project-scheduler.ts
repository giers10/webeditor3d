import {
  applyControlEffectToResolvedState,
  cloneControlEffect,
  cloneRuntimeResolvedControlState,
  createActorControlTargetRef,
  createDefaultResolvedControlSource,
  createSchedulerResolvedControlSource,
  createSetActorPresenceControlEffect,
  type RuntimeResolvedControlState,
  type SetActorPresenceControlEffect
} from "../controls/control-surface";
import {
  cloneProjectScheduler,
  compareProjectScheduleRoutinePriority,
  isProjectScheduleRoutineActiveAt,
  type ProjectScheduler,
  type ProjectScheduleRoutine
} from "../scheduler/project-scheduler";

export interface RuntimeResolvedActorScheduleState {
  actorId: string;
  hasRules: boolean;
  active: boolean;
  activeRoutineId: string | null;
  activeRoutineTitle: string | null;
  effect: SetActorPresenceControlEffect | null;
}

export interface RuntimeResolvedProjectScheduleState {
  actors: RuntimeResolvedActorScheduleState[];
}

export interface RuntimeProjectSchedulerState {
  document: ProjectScheduler;
  resolved: RuntimeResolvedProjectScheduleState;
}

function cloneRuntimeResolvedActorScheduleState(
  state: RuntimeResolvedActorScheduleState
): RuntimeResolvedActorScheduleState {
  return {
    actorId: state.actorId,
    hasRules: state.hasRules,
    active: state.active,
    activeRoutineId: state.activeRoutineId,
    activeRoutineTitle: state.activeRoutineTitle,
    effect: state.effect === null ? null : cloneControlEffect(state.effect)
  };
}

export function cloneRuntimeResolvedProjectScheduleState(
  state: RuntimeResolvedProjectScheduleState
): RuntimeResolvedProjectScheduleState {
  return {
    actors: state.actors.map(cloneRuntimeResolvedActorScheduleState)
  };
}

export function createEmptyRuntimeResolvedProjectScheduleState(): RuntimeResolvedProjectScheduleState {
  return {
    actors: []
  };
}

export function createRuntimeProjectSchedulerState(options: {
  document: ProjectScheduler;
  resolved?: RuntimeResolvedProjectScheduleState;
}): RuntimeProjectSchedulerState {
  return {
    document: cloneProjectScheduler(options.document),
    resolved: cloneRuntimeResolvedProjectScheduleState(
      options.resolved ?? createEmptyRuntimeResolvedProjectScheduleState()
    )
  };
}

function resolveActorScheduleRules(
  scheduler: ProjectScheduler,
  actorId: string
): ProjectScheduleRoutine[] {
  return Object.values(scheduler.routines)
    .filter(
      (routine) =>
        routine.enabled &&
        routine.target.kind === "actor" &&
        routine.target.actorId === actorId &&
        routine.effect.type === "setActorPresence"
    )
    .sort(compareProjectScheduleRoutinePriority);
}

export function resolveRuntimeActorScheduleState(options: {
  scheduler: ProjectScheduler;
  actorId: string;
  dayNumber: number;
  timeOfDayHours: number;
}): RuntimeResolvedActorScheduleState {
  const actorRules = resolveActorScheduleRules(options.scheduler, options.actorId);
  const activeRoutine =
    actorRules.find((routine) =>
      isProjectScheduleRoutineActiveAt(
        routine,
        options.dayNumber,
        options.timeOfDayHours
      )
    ) ?? null;

  if (activeRoutine === null) {
    return {
      actorId: options.actorId,
      hasRules: actorRules.length > 0,
      active: actorRules.length === 0,
      activeRoutineId: null,
      activeRoutineTitle: null,
      effect: null
    };
  }

  return {
    actorId: options.actorId,
    hasRules: true,
    active: activeRoutine.effect.active,
    activeRoutineId: activeRoutine.id,
    activeRoutineTitle: activeRoutine.title,
    effect: cloneControlEffect(activeRoutine.effect)
  };
}

export function resolveRuntimeProjectScheduleState(options: {
  scheduler: ProjectScheduler;
  actorIds: string[];
  dayNumber: number;
  timeOfDayHours: number;
}): RuntimeResolvedProjectScheduleState {
  const actorIds = [...new Set(options.actorIds)];

  return {
    actors: actorIds.map((actorId) =>
      resolveRuntimeActorScheduleState({
        scheduler: options.scheduler,
        actorId,
        dayNumber: options.dayNumber,
        timeOfDayHours: options.timeOfDayHours
      })
    )
  };
}

export function applyRuntimeProjectScheduleToControlState(
  resolved: RuntimeResolvedControlState,
  schedule: RuntimeResolvedProjectScheduleState
): RuntimeResolvedControlState {
  let nextResolved = cloneRuntimeResolvedControlState(resolved);
  nextResolved.discrete = nextResolved.discrete.filter(
    (state) => state.type !== "actorPresence"
  );

  for (const actorState of schedule.actors) {
    const effect =
      actorState.effect ??
      createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(actorState.actorId),
        active: actorState.active
      });
    nextResolved = applyControlEffectToResolvedState(
      nextResolved,
      effect,
      actorState.activeRoutineId === null
        ? createDefaultResolvedControlSource()
        : createSchedulerResolvedControlSource(actorState.activeRoutineId)
    );
  }

  return nextResolved;
}
