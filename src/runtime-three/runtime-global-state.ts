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
}

export function createDefaultRuntimeGlobalState(): RuntimeGlobalState {
  return {
    flags: {},
    activeMusicCueId: null,
    transitionCount: 0,
    lastSceneTransition: null
  };
}
