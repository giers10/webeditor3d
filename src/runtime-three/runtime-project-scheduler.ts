import {
  applyControlEffectToResolvedState,
  cloneControlEffect,
  cloneRuntimeResolvedControlState,
  createActorControlTargetRef,
  createDefaultResolvedControlSource,
  createSchedulerResolvedControlSource,
  createSetActorPresenceControlEffect,
  getControlEffectResolutionKey,
  type ControlEffect,
  type ControlTargetRef,
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

type ActorPresenceScheduleRoutine = ProjectScheduleRoutine & {
  target: {
    kind: "actor";
    actorId: string;
  };
  effect: SetActorPresenceControlEffect;
};

export interface RuntimeResolvedActorScheduleState {
  actorId: string;
  hasRules: boolean;
  active: boolean;
  activeRoutineId: string | null;
  activeRoutineTitle: string | null;
  effect: SetActorPresenceControlEffect | null;
}

export interface RuntimeResolvedScheduledControlRoutine {
  routineId: string;
  title: string;
  target: ControlTargetRef;
  effect: ControlEffect;
  resolutionKey: string;
}

export interface RuntimeResolvedProjectScheduleState {
  actors: RuntimeResolvedActorScheduleState[];
  controls: RuntimeResolvedScheduledControlRoutine[];
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
    actors: state.actors.map(cloneRuntimeResolvedActorScheduleState),
    controls: state.controls.map((routine) => ({
      routineId: routine.routineId,
      title: routine.title,
      target: cloneControlEffect(routine.effect).target,
      effect: cloneControlEffect(routine.effect),
      resolutionKey: routine.resolutionKey
    }))
  };
}

export function createEmptyRuntimeResolvedProjectScheduleState(): RuntimeResolvedProjectScheduleState {
  return {
    actors: [],
    controls: []
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
): ActorPresenceScheduleRoutine[] {
  return Object.values(scheduler.routines)
    .filter(
      (routine): routine is ActorPresenceScheduleRoutine =>
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
    ),
    controls: resolveRuntimeScheduledControlRoutines(options)
  };
}

function resolveRuntimeScheduledControlRoutines(options: {
  scheduler: ProjectScheduler;
  dayNumber: number;
  timeOfDayHours: number;
}): RuntimeResolvedScheduledControlRoutine[] {
  const activeRoutines = Object.values(options.scheduler.routines)
    .filter((routine) =>
      isProjectScheduleRoutineActiveAt(
        routine,
        options.dayNumber,
        options.timeOfDayHours
      )
    )
    .sort(compareProjectScheduleRoutinePriority);
  const seenResolutionKeys = new Set<string>();
  const resolved: RuntimeResolvedScheduledControlRoutine[] = [];

  for (const routine of activeRoutines) {
    if (routine.effect.type === "setActorPresence") {
      continue;
    }

    const resolutionKey = getControlEffectResolutionKey(routine.effect);

    if (seenResolutionKeys.has(resolutionKey)) {
      continue;
    }

    seenResolutionKeys.add(resolutionKey);
    resolved.push({
      routineId: routine.id,
      title: routine.title,
      target: cloneControlEffect(routine.effect).target,
      effect: cloneControlEffect(routine.effect),
      resolutionKey
    });
  }

  return resolved;
}

export function applyRuntimeProjectScheduleToControlState(
  resolved: RuntimeResolvedControlState,
  schedule: RuntimeResolvedProjectScheduleState,
  baselineResolved: RuntimeResolvedControlState = resolved
): RuntimeResolvedControlState {
  let nextResolved = cloneRuntimeResolvedControlState(baselineResolved);

  for (const state of resolved.discrete) {
    if (
      state.source.kind === "default" ||
      state.source.kind === "scheduler" ||
      state.type === "actorPresence"
    ) {
      continue;
    }

    nextResolved = applyControlEffectToResolvedState(
      nextResolved,
      cloneDiscreteStateAsEffect(state),
      state.source
    );
  }

  for (const channel of resolved.channels) {
    if (
      channel.source.kind === "default" ||
      channel.source.kind === "scheduler"
    ) {
      continue;
    }

    nextResolved = applyChannelValueAsEffect(nextResolved, channel);
  }

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

  for (const controlRoutine of schedule.controls) {
    nextResolved = applyControlEffectToResolvedState(
      nextResolved,
      controlRoutine.effect,
      createSchedulerResolvedControlSource(controlRoutine.routineId)
    );
  }

  return nextResolved;
}

function cloneDiscreteStateAsEffect(
  state: RuntimeResolvedControlState["discrete"][number]
): ControlEffect {
  switch (state.type) {
    case "actorPresence":
      return createSetActorPresenceControlEffect({
        target: state.target,
        active: state.value
      });
    case "modelVisibility":
      return {
        type: "setModelInstanceVisible",
        target: state.target,
        visible: state.value
      };
    case "soundPlayback":
      return state.value
        ? {
            type: "playSound",
            target: state.target
          }
        : {
            type: "stopSound",
            target: state.target
          };
    case "modelAnimationPlayback":
      return state.clipName === null
        ? {
            type: "stopModelAnimation",
            target: state.target
          }
        : {
            type: "playModelAnimation",
            target: state.target,
            clipName: state.clipName,
            loop: state.loop
          };
    case "lightEnabled":
      return {
        type: "setLightEnabled",
        target: state.target,
        enabled: state.value
      };
    case "lightColor":
      return {
        type: "setLightColor",
        target: state.target,
        colorHex: state.value
      };
    case "interactionEnabled":
      return {
        type: "setInteractionEnabled",
        target: state.target,
        enabled: state.value
      };
    case "ambientLightColor":
      return {
        type: "setAmbientLightColor",
        target: state.target,
        colorHex: state.value
      };
    case "sunLightColor":
      return {
        type: "setSunLightColor",
        target: state.target,
        colorHex: state.value
      };
  }
}

function applyChannelValueAsEffect(
  resolved: RuntimeResolvedControlState,
  channel: RuntimeResolvedControlState["channels"][number]
): RuntimeResolvedControlState {
  switch (channel.type) {
    case "lightIntensity":
      return applyControlEffectToResolvedState(
        resolved,
        {
          type: "setLightIntensity",
          target: channel.descriptor.target,
          intensity: channel.value
        },
        channel.source
      );
    case "soundVolume":
      return applyControlEffectToResolvedState(
        resolved,
        {
          type: "setSoundVolume",
          target: channel.descriptor.target,
          volume: channel.value
        },
        channel.source
      );
    case "ambientLightIntensity":
      return applyControlEffectToResolvedState(
        resolved,
        {
          type: "setAmbientLightIntensity",
          target: channel.descriptor.target,
          intensity: channel.value
        },
        channel.source
      );
    case "sunLightIntensity":
      return applyControlEffectToResolvedState(
        resolved,
        {
          type: "setSunLightIntensity",
          target: channel.descriptor.target,
          intensity: channel.value
        },
        channel.source
      );
  }
}
