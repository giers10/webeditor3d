import { createDefaultProjectTimeSettings } from "../document/project-time-settings";

import {
  createRuntimeClockState,
  type RuntimeClockState
} from "./runtime-project-time";

export interface RuntimeSceneTransitionRecord {
  fromSceneId: string;
  fromSceneName: string;
  toSceneId: string;
  toSceneName: string;
  viaExitEntityId: string;
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
