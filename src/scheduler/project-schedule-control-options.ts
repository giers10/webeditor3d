import type { ProjectDocument, ProjectScene } from "../document/scene-document";
import { getScenePathLabel, getScenePaths } from "../document/paths";
import {
  createActiveSceneControlTargetRef,
  createFollowActorPathControlEffect,
  createActorControlTargetRef,
  createInteractionControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createPlayActorAnimationControlEffect,
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
  createProjectGlobalControlTargetRef,
  createSetSoundVolumeControlEffect,
  createSetSunLightColorControlEffect,
  createSetSunLightIntensityControlEffect,
  createSoundEmitterControlTargetRef,
  createStopModelAnimationControlEffect,
  createStopSoundControlEffect,
  formatControlTargetRef,
  getControlTargetRefKey,
  type ControlEffect,
  type ControlTargetRef
} from "../controls/control-surface";
import { getModelInstances } from "../assets/model-instances";
import { getModelInstanceDisplayLabel } from "../assets/model-instance-labels";
import { getSortedEntityDisplayLabels } from "../entities/entity-labels";
import { listProjectNpcActors } from "../entities/npc-actor-registry";

export const PROJECT_SCHEDULE_EFFECT_OPTION_IDS = [
  "actor.present",
  "actor.hidden",
  "actor.playAnimation",
  "actor.followPath",
  "model.playAnimation",
  "model.stopAnimation",
  "model.visible",
  "model.hidden",
  "sound.play",
  "sound.stop",
  "sound.volume",
  "interaction.enabled",
  "interaction.disabled",
  "light.enabled",
  "light.disabled",
  "light.intensity",
  "light.color",
  "scene.ambientIntensity",
  "scene.ambientColor",
  "scene.sunIntensity",
  "scene.sunColor"
] as const;

export type ProjectScheduleEffectOptionId =
  (typeof PROJECT_SCHEDULE_EFFECT_OPTION_IDS)[number];

export interface ProjectScheduleEffectOption {
  id: ProjectScheduleEffectOptionId;
  label: string;
  valueKind: "none" | "number" | "color" | "animation" | "path";
  valueLabel?: string;
  min?: number;
  step?: number;
}

export interface ProjectSchedulePathOption {
  pathId: string;
  label: string;
  loop: boolean;
}

export interface ProjectScheduleTargetOptionDefaults {
  actorAnimationClipNames?: string[];
  actorAnimationLoop?: boolean;
  actorPathOptions?: ProjectSchedulePathOption[];
  actorPathSpeed?: number;
  animationClipNames?: string[];
  animationLoop?: boolean;
  soundVolume?: number;
  lightIntensity?: number;
  lightColorHex?: string;
  ambientLightIntensity?: number;
  ambientLightColorHex?: string;
  sunLightIntensity?: number;
  sunLightColorHex?: string;
}

export interface ProjectScheduleTargetOption {
  key: string;
  target: ControlTargetRef;
  label: string;
  subtitle: string;
  groupLabel: string;
  defaults: ProjectScheduleTargetOptionDefaults;
}

const PROJECT_SCHEDULE_GROUP_ORDER: Record<string, number> = {
  Project: 0,
  "Scene Lighting": 1,
  Actors: 2,
  "Model Instances": 3,
  "Sound Emitters": 4,
  Interactions: 5,
  Lights: 6,
  Other: 7
};

const PROJECT_SCHEDULE_EFFECT_OPTIONS: Record<
  ProjectScheduleEffectOptionId,
  ProjectScheduleEffectOption
> = {
  "actor.present": {
    id: "actor.present",
    label: "Present",
    valueKind: "none"
  },
  "actor.hidden": {
    id: "actor.hidden",
    label: "Hidden",
    valueKind: "none"
  },
  "actor.playAnimation": {
    id: "actor.playAnimation",
    label: "Play Animation",
    valueKind: "animation"
  },
  "actor.followPath": {
    id: "actor.followPath",
    label: "Follow Path",
    valueKind: "path"
  },
  "model.playAnimation": {
    id: "model.playAnimation",
    label: "Play Animation",
    valueKind: "animation"
  },
  "model.stopAnimation": {
    id: "model.stopAnimation",
    label: "Stop Animation",
    valueKind: "none"
  },
  "model.visible": {
    id: "model.visible",
    label: "Visible",
    valueKind: "none"
  },
  "model.hidden": {
    id: "model.hidden",
    label: "Hidden",
    valueKind: "none"
  },
  "sound.play": {
    id: "sound.play",
    label: "Play Sound",
    valueKind: "none"
  },
  "sound.stop": {
    id: "sound.stop",
    label: "Stop Sound",
    valueKind: "none"
  },
  "sound.volume": {
    id: "sound.volume",
    label: "Set Volume",
    valueKind: "number",
    valueLabel: "Volume",
    min: 0,
    step: 0.05
  },
  "interaction.enabled": {
    id: "interaction.enabled",
    label: "Enabled",
    valueKind: "none"
  },
  "interaction.disabled": {
    id: "interaction.disabled",
    label: "Disabled",
    valueKind: "none"
  },
  "light.enabled": {
    id: "light.enabled",
    label: "Enabled",
    valueKind: "none"
  },
  "light.disabled": {
    id: "light.disabled",
    label: "Disabled",
    valueKind: "none"
  },
  "light.intensity": {
    id: "light.intensity",
    label: "Set Intensity",
    valueKind: "number",
    valueLabel: "Intensity",
    min: 0,
    step: 0.1
  },
  "light.color": {
    id: "light.color",
    label: "Set Color",
    valueKind: "color",
    valueLabel: "Color"
  },
  "scene.ambientIntensity": {
    id: "scene.ambientIntensity",
    label: "Ambient Intensity",
    valueKind: "number",
    valueLabel: "Intensity",
    min: 0,
    step: 0.1
  },
  "scene.ambientColor": {
    id: "scene.ambientColor",
    label: "Ambient Color",
    valueKind: "color",
    valueLabel: "Color"
  },
  "scene.sunIntensity": {
    id: "scene.sunIntensity",
    label: "Sun Intensity",
    valueKind: "number",
    valueLabel: "Intensity",
    min: 0,
    step: 0.1
  },
  "scene.sunColor": {
    id: "scene.sunColor",
    label: "Sun Color",
    valueKind: "color",
    valueLabel: "Color"
  }
};

function compareProjectScheduleTargetOptions(
  left: ProjectScheduleTargetOption,
  right: ProjectScheduleTargetOption
): number {
  return (
    (PROJECT_SCHEDULE_GROUP_ORDER[left.groupLabel] ?? PROJECT_SCHEDULE_GROUP_ORDER.Other) -
      (PROJECT_SCHEDULE_GROUP_ORDER[right.groupLabel] ?? PROJECT_SCHEDULE_GROUP_ORDER.Other) ||
    left.label.localeCompare(right.label) ||
    left.subtitle.localeCompare(right.subtitle) ||
    left.key.localeCompare(right.key)
  );
}

function getSceneTargetSubtitle(scene: ProjectScene): string {
  return `${scene.name} · ${scene.id}`;
}

function createSceneLightingTargetOption(
  projectDocument: ProjectDocument
): ProjectScheduleTargetOption {
  const activeScene =
    projectDocument.scenes[projectDocument.activeSceneId] ??
    Object.values(projectDocument.scenes)[0];

  return {
    key: getControlTargetRefKey(createActiveSceneControlTargetRef()),
    target: createActiveSceneControlTargetRef(),
    label: "Active Scene Lighting",
    subtitle:
      activeScene === undefined
        ? "Ambient and sun lighting of the active scene."
        : `Ambient and sun lighting · ${getSceneTargetSubtitle(activeScene)}`,
    groupLabel: "Scene Lighting",
    defaults: {
      ambientLightIntensity: activeScene?.world.ambientLight.intensity ?? 1,
      ambientLightColorHex: activeScene?.world.ambientLight.colorHex ?? "#ffffff",
      sunLightIntensity: activeScene?.world.sunLight.intensity ?? 1,
      sunLightColorHex: activeScene?.world.sunLight.colorHex ?? "#ffffff"
    }
  };
}

function createProjectEventTargetOption(): ProjectScheduleTargetOption {
  return {
    key: getControlTargetRefKey(createProjectGlobalControlTargetRef()),
    target: createProjectGlobalControlTargetRef(),
    label: "Project Events",
    subtitle: "Timeline-triggered sequences and global one-shot events.",
    groupLabel: "Project",
    defaults: {}
  };
}

function createFallbackProjectScheduleTargetOption(
  target: ControlTargetRef
): ProjectScheduleTargetOption {
  return {
    key: getControlTargetRefKey(target),
    target,
    label: formatControlTargetRef(target),
    subtitle: "Target is missing or no longer available in the current project.",
    groupLabel: "Other",
    defaults: {}
  };
}

export function listProjectScheduleTargetOptions(
  projectDocument: ProjectDocument
): ProjectScheduleTargetOption[] {
  const options = new Map<string, ProjectScheduleTargetOption>();

  const pushOption = (option: ProjectScheduleTargetOption) => {
    if (!options.has(option.key)) {
      options.set(option.key, option);
    }
  };

  pushOption(createProjectEventTargetOption());
  pushOption(createSceneLightingTargetOption(projectDocument));

  for (const actor of listProjectNpcActors(projectDocument)) {
    const uniqueUsage = actor.usages.length === 1 ? actor.usages[0] ?? null : null;
    const actorScene =
      uniqueUsage === null
        ? null
        : projectDocument.scenes[uniqueUsage.sceneId] ?? null;
    const actorEntity =
      uniqueUsage === null || actorScene === null
        ? null
        : actorScene.entities[uniqueUsage.entityId];
    const actorModelAsset =
      actorEntity?.kind === "npc" && actorEntity.modelAssetId !== null
        ? projectDocument.assets[actorEntity.modelAssetId]
        : undefined;
    const actorAnimationClipNames =
      actorModelAsset !== undefined && actorModelAsset.kind === "model"
        ? [...actorModelAsset.metadata.animationNames]
        : [];
    const actorPathOptions =
      actorScene === null
        ? []
        : getScenePaths(actorScene.paths)
            .filter((path) => path.enabled)
            .map((path, index) => ({
              pathId: path.id,
              label: getScenePathLabel(path, index),
              loop: path.loop
            }));
    const usageLabel =
      uniqueUsage === null
        ? actor.usages.length > 1
          ? `${actor.usages.length} usages`
          : actor.actorId
        : `${uniqueUsage.sceneName} · ${actor.actorId}`;

    pushOption({
      key: getControlTargetRefKey(createActorControlTargetRef(actor.actorId)),
      target: createActorControlTargetRef(actor.actorId),
      label: actor.label,
      subtitle: usageLabel,
      groupLabel: "Actors",
      defaults: {
        actorAnimationClipNames,
        actorAnimationLoop: true,
        actorPathOptions,
        actorPathSpeed: 1
      }
    });
  }

  for (const scene of Object.values(projectDocument.scenes)) {
    for (const modelInstance of getModelInstances(scene.modelInstances)) {
      const asset = projectDocument.assets[modelInstance.assetId];
      const target = createModelInstanceControlTargetRef(modelInstance.id);
      const animationClipNames =
        asset !== undefined && asset.kind === "model"
          ? [...asset.metadata.animationNames]
          : [];

      pushOption({
        key: getControlTargetRefKey(target),
        target,
        label: getModelInstanceDisplayLabel(modelInstance, projectDocument.assets),
        subtitle: getSceneTargetSubtitle(scene),
        groupLabel: "Model Instances",
        defaults: {
          animationClipNames,
          animationLoop: true
        }
      });
    }

    for (const { entity, label } of getSortedEntityDisplayLabels(
      scene.entities,
      projectDocument.assets
    )) {
      switch (entity.kind) {
        case "soundEmitter": {
          if (entity.audioAssetId === null) {
            break;
          }

          const target = createSoundEmitterControlTargetRef(entity.id);

          pushOption({
            key: getControlTargetRefKey(target),
            target,
            label,
            subtitle: getSceneTargetSubtitle(scene),
            groupLabel: "Sound Emitters",
            defaults: {
              soundVolume: entity.volume
            }
          });
          break;
        }
        case "interactable": {
          const target = createInteractionControlTargetRef("interactable", entity.id);

          pushOption({
            key: getControlTargetRefKey(target),
            target,
            label,
            subtitle: getSceneTargetSubtitle(scene),
            groupLabel: "Interactions",
            defaults: {}
          });
          break;
        }
        case "pointLight": {
          const target = createLightControlTargetRef("pointLight", entity.id);

          pushOption({
            key: getControlTargetRefKey(target),
            target,
            label,
            subtitle: getSceneTargetSubtitle(scene),
            groupLabel: "Lights",
            defaults: {
              lightIntensity: entity.intensity,
              lightColorHex: entity.colorHex
            }
          });
          break;
        }
        case "spotLight": {
          const target = createLightControlTargetRef("spotLight", entity.id);

          pushOption({
            key: getControlTargetRefKey(target),
            target,
            label,
            subtitle: getSceneTargetSubtitle(scene),
            groupLabel: "Lights",
            defaults: {
              lightIntensity: entity.intensity,
              lightColorHex: entity.colorHex
            }
          });
          break;
        }
      }
    }
  }

  return [...options.values()].sort(compareProjectScheduleTargetOptions);
}

export function getProjectScheduleTargetOptionByKey(
  targetOptions: ProjectScheduleTargetOption[],
  targetKey: string
): ProjectScheduleTargetOption | null {
  return (
    targetOptions.find((candidate) => candidate.key === targetKey) ?? null
  );
}

export function getProjectScheduleTargetOptionForRoutine(
  targetOptions: ProjectScheduleTargetOption[],
  target: ControlTargetRef
): ProjectScheduleTargetOption {
  return (
    getProjectScheduleTargetOptionByKey(
      targetOptions,
      getControlTargetRefKey(target)
    ) ?? createFallbackProjectScheduleTargetOption(target)
  );
}

export function listProjectScheduleEffectOptions(
  targetOption: ProjectScheduleTargetOption
): ProjectScheduleEffectOption[] {
  switch (targetOption.target.kind) {
    case "actor":
      return [
        ...((targetOption.defaults.actorAnimationClipNames?.length ?? 0) > 0
          ? [PROJECT_SCHEDULE_EFFECT_OPTIONS["actor.playAnimation"]]
          : []),
        ...((targetOption.defaults.actorPathOptions?.length ?? 0) > 0
          ? [PROJECT_SCHEDULE_EFFECT_OPTIONS["actor.followPath"]]
          : [])
      ];
    case "modelInstance": {
      const options: ProjectScheduleEffectOption[] = [];

      if ((targetOption.defaults.animationClipNames?.length ?? 0) > 0) {
        options.push(
          PROJECT_SCHEDULE_EFFECT_OPTIONS["model.playAnimation"],
          PROJECT_SCHEDULE_EFFECT_OPTIONS["model.stopAnimation"]
        );
      }

      options.push(
        PROJECT_SCHEDULE_EFFECT_OPTIONS["model.visible"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["model.hidden"]
      );
      return options;
    }
    case "entity":
      if (targetOption.target.entityKind === "soundEmitter") {
        return [
          PROJECT_SCHEDULE_EFFECT_OPTIONS["sound.play"],
          PROJECT_SCHEDULE_EFFECT_OPTIONS["sound.stop"],
          PROJECT_SCHEDULE_EFFECT_OPTIONS["sound.volume"]
        ];
      }

      return [
        PROJECT_SCHEDULE_EFFECT_OPTIONS["light.enabled"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["light.disabled"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["light.intensity"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["light.color"]
      ];
    case "interaction":
      return [
        PROJECT_SCHEDULE_EFFECT_OPTIONS["interaction.enabled"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["interaction.disabled"]
      ];
    case "scene":
      return [
        PROJECT_SCHEDULE_EFFECT_OPTIONS["scene.ambientIntensity"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["scene.ambientColor"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["scene.sunIntensity"],
        PROJECT_SCHEDULE_EFFECT_OPTIONS["scene.sunColor"]
      ];
    case "global":
      return [];
  }
}

export function getProjectSequenceControlStepClassForEffectOptionId(
  effectOptionId: ProjectScheduleEffectOptionId
): "held" | "impulse" {
  switch (effectOptionId) {
    case "model.playAnimation":
    case "model.stopAnimation":
    case "sound.play":
    case "sound.stop":
      return "impulse";
    case "actor.present":
    case "actor.hidden":
    case "actor.playAnimation":
    case "actor.followPath":
    case "model.visible":
    case "model.hidden":
    case "sound.volume":
    case "interaction.enabled":
    case "interaction.disabled":
    case "light.enabled":
    case "light.disabled":
    case "light.intensity":
    case "light.color":
    case "scene.ambientIntensity":
    case "scene.ambientColor":
    case "scene.sunIntensity":
    case "scene.sunColor":
      return "held";
  }
}

export function getProjectScheduleEffectOptionId(
  effect: ControlEffect
): ProjectScheduleEffectOptionId {
  switch (effect.type) {
    case "setProjectTimePaused":
      throw new Error(
        "Project time pause is intentionally not exposed in the schedule editor because a scheduler routine cannot safely pause its own project clock."
      );
    case "setActorPresence":
      return effect.active ? "actor.present" : "actor.hidden";
    case "playActorAnimation":
      return "actor.playAnimation";
    case "followActorPath":
      return "actor.followPath";
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

export function createProjectScheduleEffectFromOption(options: {
  targetOption: ProjectScheduleTargetOption;
  effectOptionId: ProjectScheduleEffectOptionId;
  previousEffect?: ControlEffect | null;
}): ControlEffect {
  const previousEffect = options.previousEffect ?? null;
  const { targetOption } = options;

  switch (options.effectOptionId) {
    case "actor.present":
      return createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(
          (targetOption.target as ReturnType<typeof createActorControlTargetRef>).actorId
        ),
        active: true
      });
    case "actor.hidden":
      return createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(
          (targetOption.target as ReturnType<typeof createActorControlTargetRef>).actorId
        ),
        active: false
      });
    case "actor.playAnimation":
      return createPlayActorAnimationControlEffect({
        target: createActorControlTargetRef(
          (targetOption.target as ReturnType<typeof createActorControlTargetRef>).actorId
        ),
        clipName:
          previousEffect?.type === "playActorAnimation" &&
          (targetOption.defaults.actorAnimationClipNames ?? []).includes(
            previousEffect.clipName
          )
            ? previousEffect.clipName
            : targetOption.defaults.actorAnimationClipNames?.[0] ?? "Animation",
        loop:
          previousEffect?.type === "playActorAnimation"
            ? previousEffect.loop
            : targetOption.defaults.actorAnimationLoop
      });
    case "actor.followPath":
      return createFollowActorPathControlEffect({
        target: createActorControlTargetRef(
          (targetOption.target as ReturnType<typeof createActorControlTargetRef>).actorId
        ),
        pathId:
          previousEffect?.type === "followActorPath" &&
          (targetOption.defaults.actorPathOptions ?? []).some(
            (pathOption) => pathOption.pathId === previousEffect.pathId
          )
            ? previousEffect.pathId
            : targetOption.defaults.actorPathOptions?.[0]?.pathId ?? "path",
        speed:
          previousEffect?.type === "followActorPath"
            ? previousEffect.speed
            : targetOption.defaults.actorPathSpeed ?? 1,
        loop:
          previousEffect?.type === "followActorPath"
            ? previousEffect.loop
            : targetOption.defaults.actorPathOptions?.[0]?.loop ?? false,
        smoothPath:
          previousEffect?.type === "followActorPath"
            ? previousEffect.smoothPath
            : true,
        progressMode: "deriveFromTime"
      });
    case "model.playAnimation":
      return createPlayModelAnimationControlEffect({
        target: createModelInstanceControlTargetRef(
          (targetOption.target as ReturnType<typeof createModelInstanceControlTargetRef>).modelInstanceId
        ),
        clipName:
          previousEffect?.type === "playModelAnimation" &&
          (targetOption.defaults.animationClipNames ?? []).includes(
            previousEffect.clipName
          )
            ? previousEffect.clipName
            : targetOption.defaults.animationClipNames?.[0] ?? "Animation",
        loop:
          previousEffect?.type === "playModelAnimation"
            ? previousEffect.loop
            : targetOption.defaults.animationLoop
      });
    case "model.stopAnimation":
      return createStopModelAnimationControlEffect({
        target: createModelInstanceControlTargetRef(
          (targetOption.target as ReturnType<typeof createModelInstanceControlTargetRef>).modelInstanceId
        )
      });
    case "model.visible":
      return createSetModelInstanceVisibleControlEffect({
        target: createModelInstanceControlTargetRef(
          (targetOption.target as ReturnType<typeof createModelInstanceControlTargetRef>).modelInstanceId
        ),
        visible: true
      });
    case "model.hidden":
      return createSetModelInstanceVisibleControlEffect({
        target: createModelInstanceControlTargetRef(
          (targetOption.target as ReturnType<typeof createModelInstanceControlTargetRef>).modelInstanceId
        ),
        visible: false
      });
    case "sound.play":
      return createPlaySoundControlEffect({
        target: createSoundEmitterControlTargetRef(
          (targetOption.target as ReturnType<typeof createSoundEmitterControlTargetRef>).entityId
        )
      });
    case "sound.stop":
      return createStopSoundControlEffect({
        target: createSoundEmitterControlTargetRef(
          (targetOption.target as ReturnType<typeof createSoundEmitterControlTargetRef>).entityId
        )
      });
    case "sound.volume":
      return createSetSoundVolumeControlEffect({
        target: createSoundEmitterControlTargetRef(
          (targetOption.target as ReturnType<typeof createSoundEmitterControlTargetRef>).entityId
        ),
        volume:
          previousEffect?.type === "setSoundVolume"
            ? previousEffect.volume
            : targetOption.defaults.soundVolume ?? 1
      });
    case "interaction.enabled":
      return createSetInteractionEnabledControlEffect({
        target: createInteractionControlTargetRef(
          (targetOption.target as ReturnType<typeof createInteractionControlTargetRef>).interactionKind,
          (targetOption.target as ReturnType<typeof createInteractionControlTargetRef>).entityId
        ),
        enabled: true
      });
    case "interaction.disabled":
      return createSetInteractionEnabledControlEffect({
        target: createInteractionControlTargetRef(
          (targetOption.target as ReturnType<typeof createInteractionControlTargetRef>).interactionKind,
          (targetOption.target as ReturnType<typeof createInteractionControlTargetRef>).entityId
        ),
        enabled: false
      });
    case "light.enabled":
      return createSetLightEnabledControlEffect({
        target: createLightControlTargetRef(
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityKind,
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityId
        ),
        enabled: true
      });
    case "light.disabled":
      return createSetLightEnabledControlEffect({
        target: createLightControlTargetRef(
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityKind,
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityId
        ),
        enabled: false
      });
    case "light.intensity":
      return createSetLightIntensityControlEffect({
        target: createLightControlTargetRef(
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityKind,
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityId
        ),
        intensity:
          previousEffect?.type === "setLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaults.lightIntensity ?? 1
      });
    case "light.color":
      return createSetLightColorControlEffect({
        target: createLightControlTargetRef(
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityKind,
          (targetOption.target as ReturnType<typeof createLightControlTargetRef>).entityId
        ),
        colorHex:
          previousEffect?.type === "setLightColor"
            ? previousEffect.colorHex
            : targetOption.defaults.lightColorHex ?? "#ffffff"
      });
    case "scene.ambientIntensity":
      return createSetAmbientLightIntensityControlEffect({
        target: createActiveSceneControlTargetRef(),
        intensity:
          previousEffect?.type === "setAmbientLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaults.ambientLightIntensity ?? 1
      });
    case "scene.ambientColor":
      return createSetAmbientLightColorControlEffect({
        target: createActiveSceneControlTargetRef(),
        colorHex:
          previousEffect?.type === "setAmbientLightColor"
            ? previousEffect.colorHex
            : targetOption.defaults.ambientLightColorHex ?? "#ffffff"
      });
    case "scene.sunIntensity":
      return createSetSunLightIntensityControlEffect({
        target: createActiveSceneControlTargetRef(),
        intensity:
          previousEffect?.type === "setSunLightIntensity"
            ? previousEffect.intensity
            : targetOption.defaults.sunLightIntensity ?? 1
      });
    case "scene.sunColor":
      return createSetSunLightColorControlEffect({
        target: createActiveSceneControlTargetRef(),
        colorHex:
          previousEffect?.type === "setSunLightColor"
            ? previousEffect.colorHex
            : targetOption.defaults.sunLightColorHex ?? "#ffffff"
      });
  }
}
