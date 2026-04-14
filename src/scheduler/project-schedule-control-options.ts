import type { ProjectDocument } from "../document/scene-document";
import type { ControlCapabilityKind, ControlEffect, ControlTargetRef } from "../controls/control-surface";
import {
  createActiveSceneControlTargetRef,
  createActorControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createPlayModelAnimationControlEffect,
  createPlaySoundControlEffect,
  createSetActorPresenceControlEffect,
  createSetAmbientLightColorControlEffect,
  createSetAmbientLightIntensityControlEffect,
  createSetInteractionEnabledControlEffect,
  createSetLightColorControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightIntensityControlEffect,
  createSetModelInstanceVisibleControlEffect,
  createSetSoundVolumeControlEffect,
  createSetSunLightColorControlEffect,
  createSetSunLightIntensityControlEffect,
  createSoundEmitterControlTargetRef,
  createStopModelAnimationControlEffect,
  createStopSoundControlEffect,
  createInteractionControlTargetRef,
  getControlEffectResolutionKey,
  getControlTargetRefKey
} from "../controls/control-surface";
import { getEntityInstances } from "../entities/entity-instances";
import { listProjectNpcActors } from "../entities/npc-actor-registry";

export interface ProjectScheduleTargetOption {
  key: string;
  target: ControlTargetRef;
  label: string;
  subtitle: string;
  group:
    | "actors"
    | "models"
    | "audio"
    | "interactions"
    | "lights"
    | "scene";
  capabilities: ControlCapabilityKind[];
  animationClipNames: string[];
  defaultColorHex?: string;
  defaultIntensity?: number;
  defaultVolume?: number;
  defaultAmbientColorHex?: string;
  defaultAmbientIntensity?: number;
  defaultSunColorHex?: string;
  defaultSunIntensity?: number;
}

export interface ProjectScheduleEffectOption {
  id: string;
  label: string;
}

const TARGET_GROUP_ORDER: Record<ProjectScheduleTargetOption["group"], number> = {
  actors: 0,
  models: 1,
  audio: 2,
  interactions: 3,
  lights: 4,
  scene: 5
};

export function listProjectScheduleTargetOptions(
  projectDocument: ProjectDocument
): ProjectScheduleTargetOption[] {
  const options: ProjectScheduleTargetOption[] = [];

  for (const actor of listProjectNpcActors(projectDocument)) {
    const target = createActorControlTargetRef(actor.actorId);
    options.push({
      key: getControlTargetRefKey(target),
      target,
      label: actor.label,
      subtitle: actor.actorId,
      group: "actors",
      capabilities: ["actorPresence"],
      animationClipNames: []
    });
  }

  for (const scene of Object.values(projectDocument.scenes)) {
    for (const modelInstance of Object.values(scene.modelInstances)) {
      const asset = projectDocument.assets[modelInstance.assetId];
      const animationClipNames =
        asset?.kind === "model" ? [...asset.metadata.animationNames] : [];
      const target = createModelInstanceControlTargetRef(modelInstance.id);
      const capabilities: ControlCapabilityKind[] = ["modelVisibility"];

      if (animationClipNames.length > 0) {
        capabilities.unshift("animationPlayback");
      }

      options.push({
        key: getControlTargetRefKey(target),
        target,
        label: modelInstance.name?.trim() || modelInstance.id,
        subtitle: `${scene.name} · Model Instance`,
        group: "models",
        capabilities,
        animationClipNames
      });
    }

    for (const entity of getEntityInstances(scene.entities)) {
      switch (entity.kind) {
        case "soundEmitter": {
          if (entity.audioAssetId === null) {
            break;
          }

          const target = createSoundEmitterControlTargetRef(entity.id);
          options.push({
            key: getControlTargetRefKey(target),
            target,
            label: entity.name?.trim() || entity.id,
            subtitle: `${scene.name} · Sound Emitter`,
            group: "audio",
            capabilities: ["soundPlayback", "soundVolume"],
            animationClipNames: [],
            defaultVolume: entity.volume
          });
          break;
        }
        case "interactable": {
          const target = createInteractionControlTargetRef("interactable", entity.id);
          options.push({
            key: getControlTargetRefKey(target),
            target,
            label: entity.name?.trim() || entity.prompt || entity.id,
            subtitle: `${scene.name} · Interactable`,
            group: "interactions",
            capabilities: ["interactionAvailability"],
            animationClipNames: []
          });
          break;
        }
        case "sceneExit": {
          const target = createInteractionControlTargetRef("sceneExit", entity.id);
          options.push({
            key: getControlTargetRefKey(target),
            target,
            label: entity.name?.trim() || entity.prompt || entity.id,
            subtitle: `${scene.name} · Scene Exit`,
            group: "interactions",
            capabilities: ["interactionAvailability"],
            animationClipNames: []
          });
          break;
        }
        case "pointLight": {
          const target = createLightControlTargetRef("pointLight", entity.id);
          options.push({
            key: getControlTargetRefKey(target),
            target,
            label: entity.name?.trim() || entity.id,
            subtitle: `${scene.name} · Point Light`,
            group: "lights",
            capabilities: ["lightEnabled", "lightIntensity", "lightColor"],
            animationClipNames: [],
            defaultColorHex: entity.colorHex,
            defaultIntensity: entity.intensity
          });
          break;
        }
        case "spotLight": {
          const target = createLightControlTargetRef("spotLight", entity.id);
          options.push({
            key: getControlTargetRefKey(target),
            target,
            label: entity.name?.trim() || entity.id,
            subtitle: `${scene.name} · Spot Light`,
            group: "lights",
            capabilities: ["lightEnabled", "lightIntensity", "lightColor"],
            animationClipNames: [],
            defaultColorHex: entity.colorHex,
            defaultIntensity: entity.intensity
          });
          break;
        }
      }
    }
  }

  const sceneTarget = createActiveSceneControlTargetRef();
  options.push({
    key: getControlTargetRefKey(sceneTarget),
    target: sceneTarget,
    label: "Active Scene Lighting",
    subtitle: "Ambient and sun light for the currently active scene",
    group: "scene",
    capabilities: [
      "ambientLightIntensity",
      "ambientLightColor",
      "sunLightIntensity",
      "sunLightColor"
    ],
    animationClipNames: [],
    defaultAmbientColorHex: projectDocument.scenes[projectDocument.activeSceneId]?.world
      .ambientLight.colorHex,
    defaultAmbientIntensity: projectDocument.scenes[projectDocument.activeSceneId]?.world
      .ambientLight.intensity,
    defaultSunColorHex: projectDocument.scenes[projectDocument.activeSceneId]?.world
      .sunLight.colorHex,
    defaultSunIntensity: projectDocument.scenes[projectDocument.activeSceneId]?.world
      .sunLight.intensity
  });

  return options.sort((left, right) => {
    return (
      TARGET_GROUP_ORDER[left.group] - TARGET_GROUP_ORDER[right.group] ||
      left.label.localeCompare(right.label) ||
      left.subtitle.localeCompare(right.subtitle) ||
      left.key.localeCompare(right.key)
    );
  });
}

export function findProjectScheduleTargetOption(
  targetOptions: ProjectScheduleTargetOption[],
  target: ControlTargetRef
): ProjectScheduleTargetOption | null {
  const targetKey = getControlTargetRefKey(target);

  return (
    targetOptions.find((candidate) => candidate.key === targetKey) ?? null
  );
}

export function listProjectScheduleEffectOptions(
  targetOption: ProjectScheduleTargetOption
): ProjectScheduleEffectOption[] {
  switch (targetOption.target.kind) {
    case "actor":
      return [
        { id: "actor.present", label: "Present" },
        { id: "actor.hidden", label: "Hidden" }
      ];
    case "modelInstance": {
      const options: ProjectScheduleEffectOption[] = [
        { id: "model.visible", label: "Visible" },
        { id: "model.hidden", label: "Hidden" }
      ];

      if (targetOption.animationClipNames.length > 0) {
        options.unshift(
          { id: "model.playAnimation", label: "Play Animation" },
          { id: "model.stopAnimation", label: "Stop Animation" }
        );
      }

      return options;
    }
    case "entity":
      switch (targetOption.target.entityKind) {
        case "soundEmitter":
          return [
            { id: "sound.play", label: "Play Sound" },
            { id: "sound.stop", label: "Stop Sound" },
            { id: "sound.volume", label: "Set Volume" }
          ];
        case "pointLight":
        case "spotLight":
          return [
            { id: "light.enabled", label: "Enabled" },
            { id: "light.disabled", label: "Disabled" },
            { id: "light.intensity", label: "Set Intensity" },
            { id: "light.color", label: "Set Color" }
          ];
      }
      break;
    case "interaction":
      return [
        { id: "interaction.enabled", label: "Enabled" },
        { id: "interaction.disabled", label: "Disabled" }
      ];
    case "scene":
      return [
        { id: "scene.ambientIntensity", label: "Ambient Intensity" },
        { id: "scene.ambientColor", label: "Ambient Color" },
        { id: "scene.sunIntensity", label: "Sun Intensity" },
        { id: "scene.sunColor", label: "Sun Color" }
      ];
    case "global":
      return [];
  }

  return [];
}

export function getProjectScheduleEffectOptionId(effect: ControlEffect): string {
  switch (effect.type) {
    case "setActorPresence":
      return effect.active ? "actor.present" : "actor.hidden";
    case "playModelAnimation":
      return "model.playAnimation";
    case "stopModelAnimation":
      return "model.stopAnimation";
    case "setModelInstanceVisible":
      return effect.visible ? "model.visible" : "model.hidden";
    case "playSound":
      return "sound.play";
    case "stopSound":
      return "sound.stop";
    case "setSoundVolume":
      return "sound.volume";
    case "setInteractionEnabled":
      return effect.enabled ? "interaction.enabled" : "interaction.disabled";
    case "setLightEnabled":
      return effect.enabled ? "light.enabled" : "light.disabled";
    case "setLightIntensity":
      return "light.intensity";
    case "setLightColor":
      return "light.color";
    case "setAmbientLightIntensity":
      return "scene.ambientIntensity";
    case "setAmbientLightColor":
      return "scene.ambientColor";
    case "setSunLightIntensity":
      return "scene.sunIntensity";
    case "setSunLightColor":
      return "scene.sunColor";
  }
}

export function createDefaultProjectScheduleEffectForTarget(
  targetOption: ProjectScheduleTargetOption
): ControlEffect {
  const [firstEffectOption] = listProjectScheduleEffectOptions(targetOption);

  if (firstEffectOption === undefined) {
    throw new Error(`No schedulable effects are available for ${targetOption.label}.`);
  }

  return createProjectScheduleEffectFromOptionId(targetOption, firstEffectOption.id);
}

export function createProjectScheduleEffectFromOptionId(
  targetOption: ProjectScheduleTargetOption,
  optionId: string,
  previousEffect: ControlEffect | null = null
): ControlEffect {
  const target = targetOption.target;

  switch (optionId) {
    case "actor.present":
      return createSetActorPresenceControlEffect({
        target: target as ReturnType<typeof createActorControlTargetRef>,
        active: true
      });
    case "actor.hidden":
      return createSetActorPresenceControlEffect({
        target: target as ReturnType<typeof createActorControlTargetRef>,
        active: false
      });
    case "model.playAnimation":
      return createPlayModelAnimationControlEffect({
        target: target as ReturnType<typeof createModelInstanceControlTargetRef>,
        clipName:
          previousEffect?.type === "playModelAnimation"
            ? previousEffect.clipName
            : targetOption.animationClipNames[0] ?? "Idle",
        loop:
          previousEffect?.type === "playModelAnimation"
            ? previousEffect.loop
            : true
      });
    case "model.stopAnimation":
      return createStopModelAnimationControlEffect({
        target: target as ReturnType<typeof createModelInstanceControlTargetRef>
      });
    case "model.visible":
      return createSetModelInstanceVisibleControlEffect({
        target: target as ReturnType<typeof createModelInstanceControlTargetRef>,
        visible: true
      });
    case "model.hidden":
      return createSetModelInstanceVisibleControlEffect({
        target: target as ReturnType<typeof createModelInstanceControlTargetRef>,
        visible: false
      });
    case "sound.play":
      return createPlaySoundControlEffect({
        target: target as ReturnType<typeof createSoundEmitterControlTargetRef>
      });
    case "sound.stop":
      return createStopSoundControlEffect({
        target: target as ReturnType<typeof createSoundEmitterControlTargetRef>
      });
    case "sound.volume":
      return createSetSoundVolumeControlEffect({
        target: target as ReturnType<typeof createSoundEmitterControlTargetRef>,
        volume:
          previousEffect?.type === "setSoundVolume"
            ? previousEffect.volume
            : targetOption.defaultVolume ?? 1
      });
    case "interaction.enabled":
      return createSetInteractionEnabledControlEffect({
        target: target as ReturnType<typeof createInteractionControlTargetRef>,
        enabled: true
      });
    case "interaction.disabled":
      return createSetInteractionEnabledControlEffect({
        target: target as ReturnType<typeof createInteractionControlTargetRef>,
        enabled: false
      });
    case "light.enabled":
      return createSetLightEnabledControlEffect({
        target: target as ReturnType<typeof createLightControlTargetRef>,
        enabled: true
      });
    case "light.disabled":
      return createSetLightEnabledControlEffect({
        target: target as ReturnType<typeof createLightControlTargetRef>,
        enabled: false
      });
    case "light.intensity":
      return createSetLightIntensityControlEffect({
        target: target as ReturnType<typeof createLightControlTargetRef>,
        intensity:
          previousEffect?.type === "setLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaultIntensity ?? 1
      });
    case "light.color":
      return createSetLightColorControlEffect({
        target: target as ReturnType<typeof createLightControlTargetRef>,
        colorHex:
          previousEffect?.type === "setLightColor"
            ? previousEffect.colorHex
            : targetOption.defaultColorHex ?? "#ffffff"
      });
    case "scene.ambientIntensity":
      return createSetAmbientLightIntensityControlEffect({
        target: target as ReturnType<typeof createActiveSceneControlTargetRef>,
        intensity:
          previousEffect?.type === "setAmbientLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaultAmbientIntensity ?? 1
      });
    case "scene.ambientColor":
      return createSetAmbientLightColorControlEffect({
        target: target as ReturnType<typeof createActiveSceneControlTargetRef>,
        colorHex:
          previousEffect?.type === "setAmbientLightColor"
            ? previousEffect.colorHex
            : targetOption.defaultAmbientColorHex ?? "#ffffff"
      });
    case "scene.sunIntensity":
      return createSetSunLightIntensityControlEffect({
        target: target as ReturnType<typeof createActiveSceneControlTargetRef>,
        intensity:
          previousEffect?.type === "setSunLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaultSunIntensity ?? 1
      });
    case "scene.sunColor":
      return createSetSunLightColorControlEffect({
        target: target as ReturnType<typeof createActiveSceneControlTargetRef>,
        colorHex:
          previousEffect?.type === "setSunLightColor"
            ? previousEffect.colorHex
            : targetOption.defaultSunColorHex ?? "#ffffff"
      });
    default:
      throw new Error(`Unsupported project schedule effect option ${optionId}.`);
  }
}

export function getProjectScheduleRoutineResolutionKey(effect: ControlEffect): string {
  return getControlEffectResolutionKey(effect);
}
