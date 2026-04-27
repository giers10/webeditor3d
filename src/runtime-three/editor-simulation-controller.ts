import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { SceneDocument } from "../document/scene-document";

import {
  advanceRuntimeClockState,
  cloneRuntimeClockState,
  createRuntimeClockState,
  reconfigureRuntimeClockState,
  type RuntimeClockState
} from "./runtime-project-time";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "./runtime-project-scheduler";
import {
  applyActorScheduleStateToNpcDefinition,
  buildRuntimeNpcCollider,
  buildRuntimeSceneFromDocument,
  createRuntimeNpcFromDefinition,
  type BuildRuntimeSceneOptions,
  type RuntimeSceneDefinition
} from "./runtime-scene-build";
import { applyResolvedControlStateToRuntimeScene } from "./runtime-scene-editor-simulation";

const DEFAULT_EDITOR_SIMULATION_UI_SNAPSHOT_INTERVAL_SECONDS = 1 / 12;
const MAX_EDITOR_SIMULATION_FRAME_DT_SECONDS = 0.25;

export interface EditorSimulationFrameSnapshot {
  runtimeScene: RuntimeSceneDefinition | null;
  clock: RuntimeClockState | null;
  sceneVersion: number;
  frameVersion: number;
}

export interface EditorSimulationUiSnapshot {
  playing: boolean;
  overrideActive: boolean;
  clock: RuntimeClockState | null;
  message: string | null;
  sceneReady: boolean;
  sceneVersion: number;
  frameVersion: number;
}

interface EditorSimulationControllerOptions {
  uiSnapshotIntervalSeconds?: number;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  buildRuntimeScene?: (
    document: SceneDocument,
    options?: BuildRuntimeSceneOptions
  ) => RuntimeSceneDefinition;
}

export interface EditorSimulationControllerInputs {
  document: SceneDocument;
  loadedModelAssets: Record<string, LoadedModelAsset>;
}

export type EditorSimulationFrameListener = (
  snapshot: EditorSimulationFrameSnapshot
) => void;

export type EditorSimulationUiSnapshotListener = (
  snapshot: EditorSimulationUiSnapshot
) => void;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Editor simulation failed.";
}

function createRuntimePathLookup(
  runtimeScene: RuntimeSceneDefinition
): ReadonlyMap<string, RuntimeSceneDefinition["paths"][number]> {
  return new Map(runtimeScene.paths.map((path) => [path.id, path]));
}

function isNonNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}

export function syncRuntimeSceneToClock(
  runtimeScene: RuntimeSceneDefinition,
  clock: RuntimeClockState
): RuntimeSceneDefinition {
  const nextResolvedScheduler = resolveRuntimeProjectScheduleState({
    scheduler: runtimeScene.scheduler.document,
    sequences: runtimeScene.sequences,
    actorIds: runtimeScene.npcDefinitions.map((npc) => npc.actorId),
    dayNumber: clock.dayCount + 1,
    timeOfDayHours: clock.timeOfDayHours,
    pathsById: createRuntimePathLookup(runtimeScene)
  });
  const actorStates = new Map(
    nextResolvedScheduler.actors.map((actorState) => [
      actorState.actorId,
      actorState
    ])
  );

  for (const npc of runtimeScene.npcDefinitions) {
    applyActorScheduleStateToNpcDefinition(
      npc,
      actorStates.get(npc.actorId) ?? null
    );
  }

  runtimeScene.entities.npcs = runtimeScene.npcDefinitions
    .filter((npc) => npc.active)
    .map((npc) => createRuntimeNpcFromDefinition(npc));
  runtimeScene.colliders = [
    ...runtimeScene.staticColliders,
    ...runtimeScene.entities.npcs
      .map((npc) => buildRuntimeNpcCollider(npc))
      .filter(isNonNull)
  ];

  runtimeScene.scheduler.resolved = nextResolvedScheduler;
  runtimeScene.control.resolved = applyRuntimeProjectScheduleToControlState(
    runtimeScene.control.resolved,
    nextResolvedScheduler,
    runtimeScene.control.baselineResolved
  );

  return applyResolvedControlStateToRuntimeScene(runtimeScene);
}

function requestBrowserAnimationFrame(
  callback: FrameRequestCallback
): number {
  if (typeof window === "undefined") {
    return 0;
  }

  return window.requestAnimationFrame(callback);
}

function cancelBrowserAnimationFrame(handle: number): void {
  if (typeof window === "undefined" || handle === 0) {
    return;
  }

  window.cancelAnimationFrame(handle);
}

export class EditorSimulationController {
  private document: SceneDocument | null = null;
  private loadedModelAssets: Record<string, LoadedModelAsset> | null = null;
  private runtimeScene: RuntimeSceneDefinition | null = null;
  private currentClock: RuntimeClockState | null = null;
  private clockOverride: RuntimeClockState | null = null;
  private playing = false;
  private message: string | null = null;
  private animationFrame: number | null = null;
  private previousFrameTimestamp: number | null = null;
  private uiSnapshotAccumulator = 0;
  private sceneVersion = 0;
  private frameVersion = 0;
  private readonly frameListeners = new Set<EditorSimulationFrameListener>();
  private readonly uiSnapshotListeners =
    new Set<EditorSimulationUiSnapshotListener>();
  private readonly uiSnapshotIntervalSeconds: number;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly buildScene: (
    document: SceneDocument,
    options?: BuildRuntimeSceneOptions
  ) => RuntimeSceneDefinition;

  constructor(options: EditorSimulationControllerOptions = {}) {
    this.uiSnapshotIntervalSeconds =
      options.uiSnapshotIntervalSeconds ??
      DEFAULT_EDITOR_SIMULATION_UI_SNAPSHOT_INTERVAL_SECONDS;
    this.requestFrame =
      options.requestAnimationFrame ?? requestBrowserAnimationFrame;
    this.cancelFrame =
      options.cancelAnimationFrame ?? cancelBrowserAnimationFrame;
    this.buildScene = options.buildRuntimeScene ?? buildRuntimeSceneFromDocument;
  }

  dispose() {
    this.stopAnimationLoop();
    this.frameListeners.clear();
    this.uiSnapshotListeners.clear();
  }

  updateInputs(inputs: EditorSimulationControllerInputs) {
    const documentChanged = this.document !== inputs.document;
    const assetsChanged = this.loadedModelAssets !== inputs.loadedModelAssets;

    this.document = inputs.document;
    this.loadedModelAssets = inputs.loadedModelAssets;

    if (this.clockOverride === null) {
      this.currentClock = createRuntimeClockState(inputs.document.time);
    } else {
      this.clockOverride = reconfigureRuntimeClockState(
        this.clockOverride,
        inputs.document.time
      );
      this.currentClock = cloneRuntimeClockState(this.clockOverride);
    }

    if (documentChanged || assetsChanged || this.runtimeScene === null) {
      this.rebuildCachedRuntimeScene();
      return;
    }

    this.syncRuntimeSceneToCurrentClock();
    this.publishUiSnapshot(true);
  }

  play() {
    if (this.document === null) {
      return;
    }

    if (this.clockOverride === null) {
      this.clockOverride = cloneRuntimeClockState(
        this.currentClock ?? createRuntimeClockState(this.document.time)
      );
      this.currentClock = cloneRuntimeClockState(this.clockOverride);
    }

    this.playing = true;
    this.previousFrameTimestamp = null;
    this.uiSnapshotAccumulator = 0;
    this.syncRuntimeSceneToCurrentClock();
    this.publishUiSnapshot(true);
    this.requestAnimationLoop();
  }

  pause() {
    if (!this.playing) {
      return;
    }

    this.playing = false;
    this.previousFrameTimestamp = null;
    this.stopAnimationLoop();
    this.publishUiSnapshot(true);
  }

  reset() {
    this.playing = false;
    this.clockOverride = null;
    this.previousFrameTimestamp = null;
    this.uiSnapshotAccumulator = 0;
    this.stopAnimationLoop();

    if (this.document !== null) {
      this.currentClock = createRuntimeClockState(this.document.time);
    }

    this.syncRuntimeSceneToCurrentClock();
    this.publishUiSnapshot(true);
  }

  stepHours(deltaHours: number) {
    this.pause();

    if (this.document === null) {
      return;
    }

    const baseClock =
      this.currentClock ?? createRuntimeClockState(this.document.time);
    this.clockOverride = offsetRuntimeClockState(baseClock, deltaHours);
    this.currentClock = cloneRuntimeClockState(this.clockOverride);
    this.syncRuntimeSceneToCurrentClock();
    this.publishUiSnapshot(true);
  }

  advance(dtSeconds: number) {
    if (!this.playing || this.currentClock === null) {
      return;
    }

    const boundedDtSeconds = Math.min(
      Math.max(0, dtSeconds),
      MAX_EDITOR_SIMULATION_FRAME_DT_SECONDS
    );

    if (boundedDtSeconds <= 0) {
      return;
    }

    this.currentClock = advanceRuntimeClockState(
      this.currentClock,
      boundedDtSeconds
    );
    this.clockOverride = cloneRuntimeClockState(this.currentClock);
    this.syncRuntimeSceneToCurrentClock();
    this.uiSnapshotAccumulator += boundedDtSeconds;

    if (this.uiSnapshotAccumulator >= this.uiSnapshotIntervalSeconds) {
      this.uiSnapshotAccumulator = 0;
      this.publishUiSnapshot();
    }
  }

  subscribeFrame(listener: EditorSimulationFrameListener): () => void {
    this.frameListeners.add(listener);

    return () => {
      this.frameListeners.delete(listener);
    };
  }

  subscribeUiSnapshot(
    listener: EditorSimulationUiSnapshotListener
  ): () => void {
    this.uiSnapshotListeners.add(listener);
    listener(this.getUiSnapshot());

    return () => {
      this.uiSnapshotListeners.delete(listener);
    };
  }

  getFrameSnapshot(): EditorSimulationFrameSnapshot {
    return {
      runtimeScene: this.runtimeScene,
      clock:
        this.currentClock === null
          ? null
          : cloneRuntimeClockState(this.currentClock),
      sceneVersion: this.sceneVersion,
      frameVersion: this.frameVersion
    };
  }

  getUiSnapshot(): EditorSimulationUiSnapshot {
    return {
      playing: this.playing,
      overrideActive: this.clockOverride !== null,
      clock:
        this.currentClock === null
          ? null
          : cloneRuntimeClockState(this.currentClock),
      message: this.message,
      sceneReady: this.runtimeScene !== null,
      sceneVersion: this.sceneVersion,
      frameVersion: this.frameVersion
    };
  }

  private rebuildCachedRuntimeScene() {
    this.sceneVersion += 1;
    this.frameVersion += 1;

    if (
      this.document === null ||
      this.loadedModelAssets === null ||
      this.currentClock === null
    ) {
      this.runtimeScene = null;
      this.message = null;
      this.emitFrame();
      this.publishUiSnapshot(true);
      return;
    }

    try {
      this.runtimeScene = syncRuntimeSceneToClock(
        this.buildScene(this.document, {
          loadedModelAssets: this.loadedModelAssets,
          runtimeClock: this.currentClock
        }),
        this.currentClock
      );
      this.message = null;
    } catch (error) {
      this.runtimeScene = null;
      this.message = getErrorMessage(error);
    }

    this.emitFrame();
    this.publishUiSnapshot(true);
  }

  private syncRuntimeSceneToCurrentClock() {
    if (this.runtimeScene === null || this.currentClock === null) {
      this.emitFrame();
      return;
    }

    try {
      syncRuntimeSceneToClock(this.runtimeScene, this.currentClock);
      this.message = null;
    } catch (error) {
      this.runtimeScene = null;
      this.sceneVersion += 1;
      this.message = getErrorMessage(error);
    }

    this.frameVersion += 1;
    this.emitFrame();
  }

  private emitFrame() {
    const snapshot = this.getFrameSnapshot();

    for (const listener of this.frameListeners) {
      listener(snapshot);
    }
  }

  private publishUiSnapshot(_force = false) {
    const snapshot = this.getUiSnapshot();

    for (const listener of this.uiSnapshotListeners) {
      listener(snapshot);
    }
  }

  private requestAnimationLoop() {
    if (!this.playing || this.animationFrame !== null) {
      return;
    }

    this.animationFrame = this.requestFrame(this.handleAnimationFrame);
  }

  private stopAnimationLoop() {
    if (this.animationFrame === null) {
      return;
    }

    this.cancelFrame(this.animationFrame);
    this.animationFrame = null;
  }

  private handleAnimationFrame = (timestamp: number) => {
    this.animationFrame = null;

    if (!this.playing) {
      return;
    }

    if (this.previousFrameTimestamp !== null) {
      this.advance((timestamp - this.previousFrameTimestamp) / 1000);
    }

    this.previousFrameTimestamp = timestamp;
    this.requestAnimationLoop();
  };
}

function offsetRuntimeClockState(
  state: RuntimeClockState,
  deltaHours: number
): RuntimeClockState {
  const totalHours = Math.max(
    0,
    state.dayCount * 24 + state.timeOfDayHours + deltaHours
  );

  return {
    timeOfDayHours: totalHours % 24,
    dayCount: Math.floor(totalHours / 24),
    dayLengthMinutes: state.dayLengthMinutes
  };
}
