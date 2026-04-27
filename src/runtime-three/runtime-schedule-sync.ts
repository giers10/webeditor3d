import type { RuntimeClockState } from "./runtime-project-time";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState,
  type RuntimeResolvedActorScheduleState,
  type RuntimeResolvedProjectScheduleState
} from "./runtime-project-scheduler";
import {
  applyActorScheduleStateToNpcDefinition,
  buildRuntimeNpcCollider,
  createRuntimeNpcFromDefinition,
  type RuntimeNpcDefinition,
  type RuntimeSceneDefinition
} from "./runtime-scene-build";

export interface RuntimeScheduleSyncContext {
  readonly runtimeScene: RuntimeSceneDefinition;
  readonly pathsById: ReadonlyMap<string, RuntimeSceneDefinition["paths"][number]>;
  readonly actorIds: string[];
  readonly actorStatesByActorId: ReadonlyMap<
    string,
    RuntimeResolvedActorScheduleState
  >;
}

export interface RuntimeScheduleNpcChange {
  npc: RuntimeNpcDefinition;
  previousActive: boolean;
  previousRoutineId: string | null;
  previousRoutineTitle: string | null;
  previousAnimationClipName: string | null | undefined;
  previousAnimationLoop: boolean | undefined;
  previousYawDegrees: number;
  previousPosition: {
    x: number;
    y: number;
    z: number;
  };
  previousPathId: string | null;
  previousPathProgress: number | null;
  activeChanged: boolean;
  animationChanged: boolean;
  transformChanged: boolean;
  runtimeNpcChanged: boolean;
  colliderChanged: boolean;
}

export interface RuntimeScheduleSyncResult {
  resolvedScheduler: RuntimeResolvedProjectScheduleState;
  resolvedControl: RuntimeSceneDefinition["control"]["resolved"];
  actorStatesByActorId: ReadonlyMap<string, RuntimeResolvedActorScheduleState>;
  nextActiveImpulseRoutineIds: Set<string>;
  npcChanges: RuntimeScheduleNpcChange[];
  npcEntityCollectionChanged: boolean;
  npcColliderCollectionChanged: boolean;
}

function isNonNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}

function createRuntimePathLookup(
  runtimeScene: RuntimeSceneDefinition
): ReadonlyMap<string, RuntimeSceneDefinition["paths"][number]> {
  return new Map(runtimeScene.paths.map((path) => [path.id, path]));
}

function createRuntimeActorIds(runtimeScene: RuntimeSceneDefinition): string[] {
  return [...new Set(runtimeScene.npcDefinitions.map((npc) => npc.actorId))];
}

function getMutableActorStatesByActorId(
  context: RuntimeScheduleSyncContext
): Map<string, RuntimeResolvedActorScheduleState> {
  return context.actorStatesByActorId as Map<
    string,
    RuntimeResolvedActorScheduleState
  >;
}

function hasNpcScheduleOutputChanged(change: RuntimeScheduleNpcChange): boolean {
  return (
    change.activeChanged ||
    change.previousRoutineTitle !== change.npc.activeRoutineTitle ||
    change.animationChanged ||
    change.transformChanged ||
    (change.npc.resolvedPath?.pathId ?? null) !== change.previousPathId ||
    (change.npc.resolvedPath?.progress ?? null) !== change.previousPathProgress
  );
}

function hasNpcColliderChanged(change: RuntimeScheduleNpcChange): boolean {
  if (change.npc.collider.mode === "none") {
    return false;
  }

  return change.activeChanged || (change.npc.active && change.transformChanged);
}

function createNpcChange(
  npc: RuntimeNpcDefinition,
  previous: {
    active: boolean;
    routineId: string | null;
    routineTitle: string | null;
    animationClipName: string | null | undefined;
    animationLoop: boolean | undefined;
    yawDegrees: number;
    position: {
      x: number;
      y: number;
      z: number;
    };
    pathId: string | null;
    pathProgress: number | null;
  }
): RuntimeScheduleNpcChange | null {
  const activeChanged = npc.active !== previous.active;
  const animationChanged =
    npc.animationClipName !== previous.animationClipName ||
    npc.animationLoop !== previous.animationLoop;
  const transformChanged =
    npc.yawDegrees !== previous.yawDegrees ||
    npc.position.x !== previous.position.x ||
    npc.position.y !== previous.position.y ||
    npc.position.z !== previous.position.z;
  const routineChanged =
    npc.activeRoutineId !== previous.routineId ||
    npc.activeRoutineTitle !== previous.routineTitle;
  const pathChanged =
    (npc.resolvedPath?.pathId ?? null) !== previous.pathId ||
    (npc.resolvedPath?.progress ?? null) !== previous.pathProgress;

  if (
    !activeChanged &&
    !animationChanged &&
    !transformChanged &&
    !routineChanged &&
    !pathChanged
  ) {
    return null;
  }

  const change: RuntimeScheduleNpcChange = {
    npc,
    previousActive: previous.active,
    previousRoutineId: previous.routineId,
    previousRoutineTitle: previous.routineTitle,
    previousAnimationClipName: previous.animationClipName,
    previousAnimationLoop: previous.animationLoop,
    previousYawDegrees: previous.yawDegrees,
    previousPosition: previous.position,
    previousPathId: previous.pathId,
    previousPathProgress: previous.pathProgress,
    activeChanged,
    animationChanged,
    transformChanged,
    runtimeNpcChanged: false,
    colliderChanged: false
  };

  change.runtimeNpcChanged = hasNpcScheduleOutputChanged(change);
  change.colliderChanged = hasNpcColliderChanged(change);

  return change;
}

function refreshRuntimeNpcEntities(runtimeScene: RuntimeSceneDefinition): void {
  runtimeScene.entities.npcs = runtimeScene.npcDefinitions
    .filter((npc) => npc.active)
    .map((npc) => createRuntimeNpcFromDefinition(npc));
}

function refreshRuntimeNpcColliders(runtimeScene: RuntimeSceneDefinition): void {
  runtimeScene.colliders = [
    ...runtimeScene.staticColliders,
    ...runtimeScene.entities.npcs
      .map((npc) => buildRuntimeNpcCollider(npc))
      .filter(isNonNull)
  ];
}

export function createRuntimeScheduleSyncContext(
  runtimeScene: RuntimeSceneDefinition
): RuntimeScheduleSyncContext {
  return {
    runtimeScene,
    pathsById: createRuntimePathLookup(runtimeScene),
    actorIds: createRuntimeActorIds(runtimeScene),
    actorStatesByActorId: new Map()
  };
}

export function assertRuntimeScheduleSyncContextForScene(
  context: RuntimeScheduleSyncContext,
  runtimeScene: RuntimeSceneDefinition
): void {
  if (context.runtimeScene !== runtimeScene) {
    throw new Error(
      "Runtime schedule sync context does not match the runtime scene."
    );
  }
}

export function syncRuntimeSceneScheduleToClock(options: {
  runtimeScene: RuntimeSceneDefinition;
  clock: RuntimeClockState;
  context: RuntimeScheduleSyncContext;
}): RuntimeScheduleSyncResult {
  const { runtimeScene, clock, context } = options;

  assertRuntimeScheduleSyncContextForScene(context, runtimeScene);

  const resolvedScheduler = resolveRuntimeProjectScheduleState({
    scheduler: runtimeScene.scheduler.document,
    sequences: runtimeScene.sequences,
    actorIds: context.actorIds,
    dayNumber: clock.dayCount + 1,
    timeOfDayHours: clock.timeOfDayHours,
    pathsById: context.pathsById
  });
  const actorStatesByActorId = getMutableActorStatesByActorId(context);
  const nextActiveImpulseRoutineIds = new Set(
    resolvedScheduler.impulses.map((routine) => routine.routineId)
  );
  const npcChanges: RuntimeScheduleNpcChange[] = [];
  let npcEntityCollectionChanged = false;
  let npcColliderCollectionChanged = false;

  actorStatesByActorId.clear();
  for (const actorState of resolvedScheduler.actors) {
    actorStatesByActorId.set(actorState.actorId, actorState);
  }

  for (const npc of runtimeScene.npcDefinitions) {
    const previous = {
      active: npc.active,
      routineId: npc.activeRoutineId,
      routineTitle: npc.activeRoutineTitle,
      animationClipName: npc.animationClipName,
      animationLoop: npc.animationLoop,
      yawDegrees: npc.yawDegrees,
      position: {
        x: npc.position.x,
        y: npc.position.y,
        z: npc.position.z
      },
      pathId: npc.resolvedPath?.pathId ?? null,
      pathProgress: npc.resolvedPath?.progress ?? null
    };

    applyActorScheduleStateToNpcDefinition(
      npc,
      actorStatesByActorId.get(npc.actorId) ?? null
    );

    const change = createNpcChange(npc, previous);

    if (change === null) {
      continue;
    }

    npcChanges.push(change);
    npcEntityCollectionChanged ||= change.runtimeNpcChanged;
    npcColliderCollectionChanged ||= change.colliderChanged;
  }

  if (npcEntityCollectionChanged) {
    refreshRuntimeNpcEntities(runtimeScene);
  }

  if (npcColliderCollectionChanged) {
    if (!npcEntityCollectionChanged) {
      refreshRuntimeNpcEntities(runtimeScene);
    }

    refreshRuntimeNpcColliders(runtimeScene);
  }

  return {
    resolvedScheduler,
    resolvedControl: applyRuntimeProjectScheduleToControlState(
      runtimeScene.control.resolved,
      resolvedScheduler,
      runtimeScene.control.baselineResolved
    ),
    actorStatesByActorId: context.actorStatesByActorId,
    nextActiveImpulseRoutineIds,
    npcChanges,
    npcEntityCollectionChanged,
    npcColliderCollectionChanged
  };
}

export function commitRuntimeScheduleSyncResult(
  runtimeScene: RuntimeSceneDefinition,
  result: RuntimeScheduleSyncResult
): void {
  runtimeScene.scheduler.resolved = result.resolvedScheduler;
  runtimeScene.control.resolved = result.resolvedControl;
}
