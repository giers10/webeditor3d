import type {
  RuntimeResolvedControlChannelValue,
  RuntimeResolvedDiscreteControlState
} from "../controls/control-surface";

import type { RuntimeSceneDefinition } from "./runtime-scene-build";

function mutateRuntimeLight(
  runtimeScene: RuntimeSceneDefinition,
  entityId: string,
  mutate: (
    light:
      | RuntimeSceneDefinition["localLights"]["pointLights"][number]
      | RuntimeSceneDefinition["localLights"]["spotLights"][number]
  ) => void
) {
  const pointLight = runtimeScene.localLights.pointLights.find(
    (candidate) => candidate.entityId === entityId
  );

  if (pointLight !== undefined) {
    mutate(pointLight);
    return;
  }

  const spotLight = runtimeScene.localLights.spotLights.find(
    (candidate) => candidate.entityId === entityId
  );

  if (spotLight !== undefined) {
    mutate(spotLight);
  }
}

function applyResolvedDiscreteControlStateToRuntimeScene(
  runtimeScene: RuntimeSceneDefinition,
  state: RuntimeResolvedDiscreteControlState
) {
  switch (state.type) {
    case "actorPresence":
    case "actorAnimationPlayback":
    case "actorPathAssignment":
      // Runtime scene build already resolves scheduler-owned actor state.
      return;
    case "modelVisibility": {
      const modelInstance = runtimeScene.modelInstances.find(
        (candidate) => candidate.instanceId === state.target.modelInstanceId
      );

      if (modelInstance !== undefined) {
        modelInstance.visible = state.value;
      }
      return;
    }
    case "soundPlayback": {
      const soundEmitter = runtimeScene.entities.soundEmitters.find(
        (candidate) => candidate.entityId === state.target.entityId
      );

      if (soundEmitter !== undefined) {
        soundEmitter.autoplay = state.value;
      }
      return;
    }
    case "modelAnimationPlayback": {
      const modelInstance = runtimeScene.modelInstances.find(
        (candidate) => candidate.instanceId === state.target.modelInstanceId
      );

      if (modelInstance !== undefined) {
        modelInstance.animationClipName = state.clipName ?? undefined;
        modelInstance.animationAutoplay = state.clipName !== null;
        modelInstance.animationLoop =
          state.clipName === null ? undefined : state.loop;
      }
      return;
    }
    case "lightEnabled":
      mutateRuntimeLight(runtimeScene, state.target.entityId, (light) => {
        light.enabled = state.value;
      });
      return;
    case "lightColor":
      mutateRuntimeLight(runtimeScene, state.target.entityId, (light) => {
        light.colorHex = state.value;
      });
      return;
    case "interactionEnabled":
      const interactable = runtimeScene.entities.interactables.find(
        (candidate) => candidate.entityId === state.target.entityId
      );

      if (interactable !== undefined) {
        interactable.interactionEnabled = state.value;
      }
      return;
    case "ambientLightColor":
      runtimeScene.world.ambientLight.colorHex = state.value;
      return;
    case "sunLightColor":
      runtimeScene.world.sunLight.colorHex = state.value;
      return;
  }
}

function applyResolvedControlChannelValueToRuntimeScene(
  runtimeScene: RuntimeSceneDefinition,
  channelValue: RuntimeResolvedControlChannelValue
) {
  switch (channelValue.type) {
    case "lightIntensity":
      mutateRuntimeLight(runtimeScene, channelValue.descriptor.target.entityId, (light) => {
        light.intensity = channelValue.value;
      });
      return;
    case "soundVolume": {
      const soundEmitter = runtimeScene.entities.soundEmitters.find(
        (candidate) =>
          candidate.entityId === channelValue.descriptor.target.entityId
      );

      if (soundEmitter !== undefined) {
        soundEmitter.volume = channelValue.value;
      }
      return;
    }
    case "ambientLightIntensity":
      runtimeScene.world.ambientLight.intensity = channelValue.value;
      return;
    case "sunLightIntensity":
      runtimeScene.world.sunLight.intensity = channelValue.value;
      return;
  }
}

export function applyResolvedControlStateToRuntimeScene(
  runtimeScene: RuntimeSceneDefinition
): RuntimeSceneDefinition {
  for (const state of runtimeScene.control.resolved.discrete) {
    applyResolvedDiscreteControlStateToRuntimeScene(runtimeScene, state);
  }

  for (const channelValue of runtimeScene.control.resolved.channels) {
    applyResolvedControlChannelValueToRuntimeScene(runtimeScene, channelValue);
  }

  return runtimeScene;
}
