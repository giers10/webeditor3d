import type { Vec3 } from "../core/vector";
import {
  sampleResolvedScenePathPosition,
  sampleResolvedScenePathTangent
} from "../document/paths";
import {
  applyControlEffectToResolvedState,
  cloneControlEffect,
  cloneRuntimeResolvedControlState,
  createActorControlTargetRef,
  createDefaultResolvedControlSource,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect,
  createSchedulerResolvedControlSource,
  createSetActorPresenceControlEffect,
  getControlEffectResolutionKey,
  type ControlEffect,
  type ControlTargetRef,
  type FollowActorPathControlEffect,
  type PlayActorAnimationControlEffect,
  type RuntimeResolvedControlState,
  type SetActorPresenceControlEffect
} from "../controls/control-surface";
import { normalizeYawDegrees } from "../entities/entity-instances";
import {
  cloneProjectScheduler,
  compareProjectScheduleRoutinePriority,
  getProjectScheduleRoutineDurationHours,
  getProjectScheduleRoutineElapsedHoursAt,
  isProjectScheduleDaySelectionActive,
  isProjectScheduleRoutineActiveAt,
  resolveProjectScheduleWeekday,
  type ProjectScheduler,
  type ProjectScheduleRoutine
} from "../sequencer/project-sequencer";
import {
  cloneSequenceEffect,
  findHeldSequenceControlEffect,
  getHeldSequenceControlEffects,
  getProjectSequenceImpulseSteps,
  getProjectScheduleRoutineHeldSteps,
  type ImpulseSequenceStep
} from "../sequencer/project-sequence-steps";
import type { ProjectSequenceLibrary } from "../sequencer/project-sequences";

type ActorScheduleRoutine = ProjectScheduleRoutine & {
  target: {
    kind: "actor";
    actorId: string;
  };
};

export interface RuntimeProjectSchedulePathPoint {
  position: Vec3;
}

export interface RuntimeProjectSchedulePathSegment {
  start: Vec3;
  end: Vec3;
  length: number;
  distanceStart: number;
  distanceEnd: number;
  tangent: Vec3;
}

export interface RuntimeProjectSchedulePathDefinition {
  id: string;
  loop: boolean;
  points: RuntimeProjectSchedulePathPoint[];
  segments: RuntimeProjectSchedulePathSegment[];
  totalLength: number;
}

export interface RuntimeResolvedActorPathState {
  pathId: string;
  progressMode: "deriveFromTime";
  speed: number;
  loop: boolean;
  smoothPath: boolean;
  elapsedHours: number;
  distance: number;
  progress: number;
  position: Vec3;
  tangent: Vec3;
  yawDegrees: number | null;
}

export interface RuntimeResolvedActorScheduleState {
  actorId: string;
  hasRules: boolean;
  active: boolean;
  activeRoutineId: string | null;
  activeRoutineTitle: string | null;
  presenceEffect: SetActorPresenceControlEffect | null;
  animationEffect: PlayActorAnimationControlEffect | null;
  pathEffect: FollowActorPathControlEffect | null;
  resolvedPath: RuntimeResolvedActorPathState | null;
}

export interface RuntimeResolvedScheduledControlRoutine {
  routineId: string;
  title: string;
  target: ControlTargetRef;
  effect: ControlEffect;
  resolutionKey: string;
}

export interface RuntimeResolvedScheduledImpulseRoutine {
  routineId: string;
  title: string;
  effects: ReturnType<typeof getProjectSequenceImpulseSteps>;
}

export interface RuntimeResolvedProjectScheduleState {
  actors: RuntimeResolvedActorScheduleState[];
  controls: RuntimeResolvedScheduledControlRoutine[];
  impulses: RuntimeResolvedScheduledImpulseRoutine[];
}

export interface RuntimeProjectSchedulerState {
  document: ProjectScheduler;
  resolved: RuntimeResolvedProjectScheduleState;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function hasNonZeroVec3(vector: Vec3): boolean {
  return vector.x !== 0 || vector.y !== 0 || vector.z !== 0;
}

function cloneRuntimeResolvedActorPathState(
  state: RuntimeResolvedActorPathState
): RuntimeResolvedActorPathState {
  return {
    pathId: state.pathId,
    progressMode: state.progressMode,
    speed: state.speed,
    loop: state.loop,
    smoothPath: state.smoothPath,
    elapsedHours: state.elapsedHours,
    distance: state.distance,
    progress: state.progress,
    position: cloneVec3(state.position),
    tangent: cloneVec3(state.tangent),
    yawDegrees: state.yawDegrees
  };
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
    presenceEffect:
      state.presenceEffect === null ? null : cloneControlEffect(state.presenceEffect),
    animationEffect:
      state.animationEffect === null ? null : cloneControlEffect(state.animationEffect),
    pathEffect: state.pathEffect === null ? null : cloneControlEffect(state.pathEffect),
    resolvedPath:
      state.resolvedPath === null
        ? null
        : cloneRuntimeResolvedActorPathState(state.resolvedPath)
  };
}

export function cloneRuntimeResolvedProjectScheduleState(
  state: RuntimeResolvedProjectScheduleState
): RuntimeResolvedProjectScheduleState {
  return {
    actors: state.actors.map(cloneRuntimeResolvedActorScheduleState),
    controls: state.controls.map((routine) => {
      const effect = cloneControlEffect(routine.effect);

      return {
        routineId: routine.routineId,
        title: routine.title,
        target: effect.target,
        effect,
        resolutionKey: routine.resolutionKey
      };
    }),
    impulses: state.impulses.map((routine) => ({
      routineId: routine.routineId,
      title: routine.title,
      effects: routine.effects.map(
        (effect) => cloneSequenceEffect(effect) as ImpulseSequenceStep
      )
    }))
  };
}

export function createEmptyRuntimeResolvedProjectScheduleState(): RuntimeResolvedProjectScheduleState {
  return {
    actors: [],
    controls: [],
    impulses: []
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

function resolveActorPathProgress(
  path: RuntimeProjectSchedulePathDefinition,
  effect: FollowActorPathControlEffect,
  elapsedHours: number
): { distance: number; progress: number } {
  const distance = Math.max(0, elapsedHours) * effect.speed;

  if (path.totalLength <= 0) {
    return {
      distance,
      progress: 0
    };
  }

  if (effect.loop) {
    const wrappedDistance = distance % path.totalLength;

    return {
      distance,
      progress: wrappedDistance / path.totalLength
    };
  }

  return {
    distance,
    progress: Math.min(1, distance / path.totalLength)
  };
}

function resolveActorSchedulePathState(options: {
  effect: FollowActorPathControlEffect;
  elapsedHours: number;
  path: RuntimeProjectSchedulePathDefinition | null;
}): RuntimeResolvedActorPathState | null {
  if (options.path === null) {
    return null;
  }

  const { distance, progress } = resolveActorPathProgress(
    options.path,
    options.effect,
    options.elapsedHours
  );
  const position = sampleResolvedScenePathPosition(options.path, progress, {
    smooth: options.effect.smoothPath
  });
  const tangent = sampleResolvedScenePathTangent(options.path, progress, {
    smooth: options.effect.smoothPath
  });

  return {
    pathId: options.effect.pathId,
    progressMode: options.effect.progressMode,
    speed: options.effect.speed,
    loop: options.effect.loop,
    smoothPath: options.effect.smoothPath,
    elapsedHours: options.elapsedHours,
    distance,
    progress,
    position,
    tangent,
    yawDegrees: hasNonZeroVec3(tangent)
      ? normalizeYawDegrees((Math.atan2(tangent.x, tangent.z) * 180) / Math.PI)
      : null
  };
}

function resolveActorScheduleRules(
  scheduler: ProjectScheduler,
  actorId: string
): ActorScheduleRoutine[] {
  return Object.values(scheduler.routines)
    .filter(
      (routine): routine is ActorScheduleRoutine =>
        routine.enabled &&
        routine.target.kind === "actor" &&
        routine.target.actorId === actorId
    )
    .sort(compareProjectScheduleRoutinePriority);
}

function getAbsoluteScheduleHours(dayNumber: number, timeOfDayHours: number): number {
  return (Math.floor(dayNumber) - 1) * 24 + timeOfDayHours;
}

function resolveMostRecentCompletedActorPathState(options: {
  actorRules: ActorScheduleRoutine[];
  sequences: ProjectSequenceLibrary;
  dayNumber: number;
  timeOfDayHours: number;
  pathsById?: ReadonlyMap<string, RuntimeProjectSchedulePathDefinition>;
}): {
  pathEffect: FollowActorPathControlEffect;
  resolvedPath: RuntimeResolvedActorPathState;
} | null {
  const currentAbsoluteHours = getAbsoluteScheduleHours(
    options.dayNumber,
    options.timeOfDayHours
  );
  let bestMatch:
    | {
        endAbsoluteHours: number;
        routine: ActorScheduleRoutine;
        pathEffect: FollowActorPathControlEffect;
      }
    | null = null;

  for (const routine of options.actorRules) {
    const heldSteps = getProjectScheduleRoutineHeldSteps(routine, options.sequences);
    const pathEffect = findHeldSequenceControlEffect(heldSteps, "followActorPath");

    if (pathEffect === null) {
      continue;
    }

    const durationHours = getProjectScheduleRoutineDurationHours(routine);

    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      const occurrenceStartDayNumber = options.dayNumber - dayOffset;

      if (
        !isProjectScheduleDaySelectionActive(
          routine.days,
          resolveProjectScheduleWeekday(occurrenceStartDayNumber)
        )
      ) {
        continue;
      }

      const occurrenceEndAbsoluteHours =
        getAbsoluteScheduleHours(occurrenceStartDayNumber, routine.startHour) +
        durationHours;

      if (occurrenceEndAbsoluteHours > currentAbsoluteHours) {
        continue;
      }

      if (
        bestMatch !== null &&
        (bestMatch.endAbsoluteHours > occurrenceEndAbsoluteHours ||
          (bestMatch.endAbsoluteHours === occurrenceEndAbsoluteHours &&
            compareProjectScheduleRoutinePriority(bestMatch.routine, routine) <= 0))
      ) {
        continue;
      }

      bestMatch = {
        endAbsoluteHours: occurrenceEndAbsoluteHours,
        routine,
        pathEffect
      };
      break;
    }
  }

  if (bestMatch === null) {
    return null;
  }

  const resolvedPath = resolveActorSchedulePathState({
    effect: bestMatch.pathEffect,
    elapsedHours: getProjectScheduleRoutineDurationHours(bestMatch.routine),
    path: options.pathsById?.get(bestMatch.pathEffect.pathId) ?? null
  });

  if (resolvedPath === null) {
    return null;
  }

  return {
    pathEffect: cloneControlEffect(bestMatch.pathEffect),
    resolvedPath
  };
}

export function resolveRuntimeActorScheduleState(options: {
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
  actorId: string;
  dayNumber: number;
  timeOfDayHours: number;
  pathsById?: ReadonlyMap<string, RuntimeProjectSchedulePathDefinition>;
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
    const completedPathState = resolveMostRecentCompletedActorPathState({
      actorRules,
      sequences: options.sequences,
      dayNumber: options.dayNumber,
      timeOfDayHours: options.timeOfDayHours,
      pathsById: options.pathsById
    });

    return {
      actorId: options.actorId,
      hasRules: actorRules.length > 0,
      active: true,
      activeRoutineId: null,
      activeRoutineTitle: null,
      presenceEffect: null,
      animationEffect: null,
      pathEffect: completedPathState?.pathEffect ?? null,
      resolvedPath: completedPathState?.resolvedPath ?? null
    };
  }

  const heldSteps = getProjectScheduleRoutineHeldSteps(
    activeRoutine,
    options.sequences
  );
  const presenceEffect =
    findHeldSequenceControlEffect(heldSteps, "setActorPresence") ??
    createSetActorPresenceControlEffect({
      target: createActorControlTargetRef(options.actorId),
      active: true
    });
  const animationEffect =
    findHeldSequenceControlEffect(heldSteps, "playActorAnimation");
  const pathEffect = findHeldSequenceControlEffect(
    heldSteps,
    "followActorPath"
  );
  const elapsedHours = getProjectScheduleRoutineElapsedHoursAt(
    activeRoutine,
    options.dayNumber,
    options.timeOfDayHours
  );

  return {
    actorId: options.actorId,
    hasRules: true,
    active: presenceEffect.active,
    activeRoutineId: activeRoutine.id,
    activeRoutineTitle: activeRoutine.title,
    presenceEffect: cloneControlEffect(presenceEffect),
    animationEffect:
      animationEffect === null ? null : cloneControlEffect(animationEffect),
    pathEffect: pathEffect === null ? null : cloneControlEffect(pathEffect),
    resolvedPath:
      pathEffect === null || elapsedHours === null
        ? null
        : resolveActorSchedulePathState({
            effect: pathEffect,
            elapsedHours,
            path: options.pathsById?.get(pathEffect.pathId) ?? null
          })
  };
}

export function resolveRuntimeProjectScheduleState(options: {
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
  actorIds: string[];
  dayNumber: number;
  timeOfDayHours: number;
  pathsById?: ReadonlyMap<string, RuntimeProjectSchedulePathDefinition>;
}): RuntimeResolvedProjectScheduleState {
  const actorIds = [...new Set(options.actorIds)];

  return {
    actors: actorIds.map((actorId) =>
      resolveRuntimeActorScheduleState({
        scheduler: options.scheduler,
        sequences: options.sequences,
        actorId,
        dayNumber: options.dayNumber,
        timeOfDayHours: options.timeOfDayHours,
        pathsById: options.pathsById
      })
    ),
    controls: resolveRuntimeScheduledControlRoutines(options),
    impulses: resolveRuntimeScheduledImpulseRoutines(options)
  };
}

function resolveRuntimeScheduledControlRoutines(options: {
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
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
    if (routine.target.kind === "actor") {
      continue;
    }

    for (const effect of getHeldSequenceControlEffects(
      getProjectScheduleRoutineHeldSteps(routine, options.sequences)
    )) {
      const resolutionKey = getControlEffectResolutionKey(effect);

      if (seenResolutionKeys.has(resolutionKey)) {
        continue;
      }

      seenResolutionKeys.add(resolutionKey);
      resolved.push({
        routineId: routine.id,
        title: routine.title,
        target: cloneControlEffect(effect).target,
        effect: cloneControlEffect(effect),
        resolutionKey
      });
    }
  }

  return resolved;
}

function resolveRuntimeScheduledImpulseRoutines(options: {
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
  dayNumber: number;
  timeOfDayHours: number;
}): RuntimeResolvedScheduledImpulseRoutine[] {
  const activeRoutines = Object.values(options.scheduler.routines)
    .filter(
      (routine) =>
        routine.sequenceId !== null &&
        isProjectScheduleRoutineActiveAt(
          routine,
          options.dayNumber,
          options.timeOfDayHours
        )
    )
    .sort(compareProjectScheduleRoutinePriority);
  const resolved: RuntimeResolvedScheduledImpulseRoutine[] = [];

  for (const routine of activeRoutines) {
    if (routine.sequenceId === null) {
      continue;
    }

    const sequence = options.sequences.sequences[routine.sequenceId] ?? null;

    if (sequence === null) {
      continue;
    }

    const effects = getProjectSequenceImpulseSteps(sequence);

    if (effects.length === 0) {
      continue;
    }

    resolved.push({
      routineId: routine.id,
      title: routine.title,
      effects
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
      state.type === "actorPresence" ||
      state.type === "actorAnimationPlayback" ||
      state.type === "actorPathAssignment"
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
    const presenceEffect =
      actorState.presenceEffect ??
      createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(actorState.actorId),
        active: actorState.active
      });
    const source =
      actorState.activeRoutineId === null
        ? createDefaultResolvedControlSource()
        : createSchedulerResolvedControlSource(actorState.activeRoutineId);

    nextResolved = applyControlEffectToResolvedState(
      nextResolved,
      presenceEffect,
      source
    );

    if (actorState.animationEffect !== null) {
      nextResolved = applyControlEffectToResolvedState(
        nextResolved,
        actorState.animationEffect,
        source
      );
    }

    if (actorState.pathEffect !== null) {
      nextResolved = applyControlEffectToResolvedState(
        nextResolved,
        actorState.pathEffect,
        source
      );
    }
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
    case "projectTimePaused":
      throw new Error(
        "Project time pause is intentionally not cloned into scheduler routine effects because pausing the scheduler clock would deadlock time progression."
      );
    case "actorPresence":
      return createSetActorPresenceControlEffect({
        target: state.target,
        active: state.value
      });
    case "actorAnimationPlayback":
      if (state.clipName === null) {
        throw new Error("Cannot clone a cleared actor animation state to a control effect.");
      }

      return createPlayActorAnimationControlEffect({
        target: state.target,
        clipName: state.clipName,
        loop: state.loop
      });
    case "actorPathAssignment":
      if (
        state.pathId === null ||
        state.speed === null ||
        state.progressMode === null
      ) {
        throw new Error("Cannot clone a cleared actor path state to a control effect.");
      }

      return createFollowActorPathControlEffect({
        target: state.target,
        pathId: state.pathId,
        speed: state.speed,
        loop: state.loop,
        progressMode: state.progressMode
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
