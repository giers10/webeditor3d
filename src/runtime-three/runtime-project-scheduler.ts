import type { Vec3 } from "../core/vector";
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
  findProjectScheduleRoutineEffect,
  getProjectScheduleRoutineElapsedHoursAt,
  isProjectScheduleRoutineActiveAt,
  type ProjectScheduler,
  type ProjectScheduleRoutine
} from "../scheduler/project-scheduler";

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

export interface RuntimeResolvedProjectScheduleState {
  actors: RuntimeResolvedActorScheduleState[];
  controls: RuntimeResolvedScheduledControlRoutine[];
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
    })
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

function clampPathProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  if (progress <= 0) {
    return 0;
  }

  if (progress >= 1) {
    return 1;
  }

  return progress;
}

function resolvePathSegmentSample(
  path: RuntimeProjectSchedulePathDefinition,
  progress: number
): { segmentIndex: number | null; distance: number } {
  if (path.segments.length === 0 || path.totalLength <= 0) {
    return {
      segmentIndex: null,
      distance: 0
    };
  }

  const distance = clampPathProgress(progress) * path.totalLength;

  if (distance >= path.totalLength) {
    return {
      segmentIndex: path.segments.length - 1,
      distance
    };
  }

  const segmentIndex = path.segments.findIndex(
    (segment) => distance <= segment.distanceEnd
  );

  return {
    segmentIndex: segmentIndex === -1 ? path.segments.length - 1 : segmentIndex,
    distance
  };
}

function findNonZeroPathTangent(
  path: RuntimeProjectSchedulePathDefinition,
  index: number
): Vec3 {
  for (let candidateIndex = index; candidateIndex < path.segments.length; candidateIndex += 1) {
    const candidate = path.segments[candidateIndex];

    if (candidate !== undefined && candidate.length > 0) {
      return cloneVec3(candidate.tangent);
    }
  }

  for (let candidateIndex = index - 1; candidateIndex >= 0; candidateIndex -= 1) {
    const candidate = path.segments[candidateIndex];

    if (candidate !== undefined && candidate.length > 0) {
      return cloneVec3(candidate.tangent);
    }
  }

  return {
    x: 0,
    y: 0,
    z: 0
  };
}

function sampleRuntimeSchedulePathPosition(
  path: RuntimeProjectSchedulePathDefinition,
  progress: number
): Vec3 {
  if (path.points.length === 0) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  const { segmentIndex, distance } = resolvePathSegmentSample(path, progress);

  if (segmentIndex === null) {
    return cloneVec3(path.points[0]?.position ?? { x: 0, y: 0, z: 0 });
  }

  const segment = path.segments[segmentIndex];

  if (segment.length <= 0) {
    return cloneVec3(segment.start);
  }

  const localDistance = Math.min(
    segment.length,
    Math.max(0, distance - segment.distanceStart)
  );
  const t = localDistance / segment.length;

  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * t,
    y: segment.start.y + (segment.end.y - segment.start.y) * t,
    z: segment.start.z + (segment.end.z - segment.start.z) * t
  };
}

function sampleRuntimeSchedulePathTangent(
  path: RuntimeProjectSchedulePathDefinition,
  progress: number
): Vec3 {
  const { segmentIndex } = resolvePathSegmentSample(path, progress);

  if (segmentIndex === null) {
    return {
      x: 0,
      y: 0,
      z: 0
    };
  }

  return findNonZeroPathTangent(path, segmentIndex);
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
  const position = sampleRuntimeSchedulePathPosition(options.path, progress);
  const tangent = sampleRuntimeSchedulePathTangent(options.path, progress);

  return {
    pathId: options.effect.pathId,
    progressMode: options.effect.progressMode,
    speed: options.effect.speed,
    loop: options.effect.loop,
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

export function resolveRuntimeActorScheduleState(options: {
  scheduler: ProjectScheduler;
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
    return {
      actorId: options.actorId,
      hasRules: actorRules.length > 0,
      active: actorRules.length === 0,
      activeRoutineId: null,
      activeRoutineTitle: null,
      presenceEffect: null,
      animationEffect: null,
      pathEffect: null,
      resolvedPath: null
    };
  }

  const presenceEffect =
    findProjectScheduleRoutineEffect(activeRoutine, "setActorPresence") ??
    createSetActorPresenceControlEffect({
      target: createActorControlTargetRef(options.actorId),
      active: true
    });
  const animationEffect =
    findProjectScheduleRoutineEffect(activeRoutine, "playActorAnimation");
  const pathEffect = findProjectScheduleRoutineEffect(activeRoutine, "followActorPath");
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
        actorId,
        dayNumber: options.dayNumber,
        timeOfDayHours: options.timeOfDayHours,
        pathsById: options.pathsById
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
    if (routine.target.kind === "actor") {
      continue;
    }

    for (const effect of routine.effects) {
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
