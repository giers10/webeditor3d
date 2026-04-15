import {
  createDefaultProjectTimeSettings,
  type ProjectTimeSettings
} from "../document/project-time-settings";

import {
  createRuntimeClockState,
  resolveRuntimeTimeState,
  type RuntimeResolvedTimeState,
  type RuntimeClockState
} from "./runtime-project-time";

export interface RuntimeSceneTransitionRecord {
  fromSceneId: string;
  fromSceneName: string;
  toSceneId: string;
  toSceneName: string;
  sourceEntityId: string | null;
  targetEntryEntityId: string;
}

export interface RuntimeGlobalState {
  flags: Record<string, boolean>;
  activeMusicCueId: string | null;
  transitionCount: number;
  lastSceneTransition: RuntimeSceneTransitionRecord | null;
  clock: RuntimeClockState;
}

export function createDefaultRuntimeGlobalState(
  timeSettings = createDefaultProjectTimeSettings()
): RuntimeGlobalState {
  return {
    flags: {},
    activeMusicCueId: null,
    transitionCount: 0,
    lastSceneTransition: null,
    clock: createRuntimeClockState(timeSettings)
  };
}

export function resolveRuntimeGlobalTimeState(
  state: RuntimeGlobalState,
  timeSettings: ProjectTimeSettings
): RuntimeResolvedTimeState {
  return resolveRuntimeTimeState(timeSettings, state.clock);
}
