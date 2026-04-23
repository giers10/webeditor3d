import { describe, expect, it } from "vitest";

import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import {
  createCameraRigEntity,
  createCameraRigWorldPointTargetRef,
  createInteractableEntity,
  createNpcEntity,
  createPointLightEntity,
  createSoundEmitterEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createActorControlTargetRef,
  createLightControlTargetRef,
  createProjectGlobalControlTargetRef,
  createSetActorPresenceControlEffect,
  createSetLightEnabledControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createControlInteractionLink } from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { RuntimeInteractionSystem } from "../../src/runtime-three/runtime-interaction-system";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

describe("runtime control foundation", () => {
  it("builds a typed control surface for light, interaction, sound, and model targets", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      visible: false,
      intensity: 2.5
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-console",
      interactionEnabled: false
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: "asset-audio-main",
      autoplay: true,
      volume: 0.4
    });
    const npc = createNpcEntity({
      id: "entity-npc-vendor",
      actorId: "actor-market-vendor"
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-main",
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      })
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const modelAsset = {
      id: "asset-model-animated",
      kind: "model" as const,
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-animated"),
      byteLength: 1024,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: ["Idle"],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 2048,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 2,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-animated",
      assetId: modelAsset.id,
      animationClipName: "Idle",
      animationAutoplay: true
    });

    const document = createEmptySceneDocument();
    document.scheduler.routines["routine-market-vendor"] =
      createProjectScheduleRoutine({
        id: "routine-market-vendor",
        title: "Market Hours",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 9,
        endHour: 17,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument({
      ...document,
      assets: {
        [modelAsset.id]: modelAsset,
        [audioAsset.id]: audioAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [pointLight.id]: pointLight,
        [interactable.id]: interactable,
        [soundEmitter.id]: soundEmitter,
        [npc.id]: npc,
        [cameraRig.id]: cameraRig,
        [triggerVolume.id]: triggerVolume
      }
    });

    expect(runtimeScene.control.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: {
            kind: "global",
            scope: "project"
          },
          capabilities: ["projectTimePause"]
        }),
        expect.objectContaining({
          target: {
            kind: "scene",
            scope: "activeScene"
          },
          capabilities: [
            "ambientLightIntensity",
            "ambientLightColor",
            "sunLightIntensity",
            "sunLightColor"
          ]
        }),
        expect.objectContaining({
          target: {
            kind: "actor",
            actorId: npc.actorId
          },
          capabilities: ["actorPresence"]
        }),
        expect.objectContaining({
          target: {
            kind: "entity",
            entityKind: "cameraRig",
            entityId: cameraRig.id
          },
          capabilities: ["cameraRigOverride"]
        }),
        expect.objectContaining({
          target: {
            kind: "entity",
            entityKind: "pointLight",
            entityId: pointLight.id
          },
          capabilities: ["lightEnabled", "lightIntensity", "lightColor"]
        }),
        expect.objectContaining({
          target: {
            kind: "interaction",
            interactionKind: "interactable",
            entityId: interactable.id
          },
          capabilities: ["interactionAvailability"]
        }),
        expect.objectContaining({
          target: {
            kind: "entity",
            entityKind: "soundEmitter",
            entityId: soundEmitter.id
          },
          capabilities: ["soundPlayback", "soundVolume"]
        }),
        expect.objectContaining({
          target: {
            kind: "modelInstance",
            modelInstanceId: modelInstance.id
          },
          capabilities: ["animationPlayback", "modelVisibility"]
        })
      ])
    );
    expect(runtimeScene.control.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "ambientLight.intensity",
          target: {
            kind: "scene",
            scope: "activeScene"
          }
        }),
        expect.objectContaining({
          channel: "sunLight.intensity",
          target: {
            kind: "scene",
            scope: "activeScene"
          }
        }),
        expect.objectContaining({
          channel: "light.intensity",
          target: {
            kind: "entity",
            entityKind: "pointLight",
            entityId: pointLight.id
          },
          minValue: 0,
          defaultValue: 2.5
        }),
        expect.objectContaining({
          channel: "sound.volume",
          target: {
            kind: "entity",
            entityKind: "soundEmitter",
            entityId: soundEmitter.id
          },
          defaultValue: 0.4
        })
      ])
    );
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "projectTimePaused",
          target: createProjectGlobalControlTargetRef(),
          value: false
        }),
        expect.objectContaining({
          type: "cameraRigOverride",
          target: createProjectGlobalControlTargetRef(),
          entityId: null
        }),
        expect.objectContaining({
          type: "ambientLightColor",
          target: {
            kind: "scene",
            scope: "activeScene"
          }
        }),
        expect.objectContaining({
          type: "sunLightColor",
          target: {
            kind: "scene",
            scope: "activeScene"
          }
        }),
        expect.objectContaining({
          type: "actorPresence",
          target: {
            kind: "actor",
            actorId: npc.actorId
          },
          value: true
        }),
        expect.objectContaining({
          type: "lightEnabled",
          target: {
            kind: "entity",
            entityKind: "pointLight",
            entityId: pointLight.id
          },
          value: false
        }),
        expect.objectContaining({
          type: "lightColor",
          target: {
            kind: "entity",
            entityKind: "pointLight",
            entityId: pointLight.id
          },
          value: pointLight.colorHex
        }),
        expect.objectContaining({
          type: "interactionEnabled",
          target: {
            kind: "interaction",
            interactionKind: "interactable",
            entityId: interactable.id
          },
          value: false
        }),
        expect.objectContaining({
          type: "soundPlayback",
          target: {
            kind: "entity",
            entityKind: "soundEmitter",
            entityId: soundEmitter.id
          },
          value: true
        }),
        expect.objectContaining({
          type: "modelVisibility",
          target: {
            kind: "modelInstance",
            modelInstanceId: modelInstance.id
          },
          value: true
        }),
        expect.objectContaining({
          type: "modelAnimationPlayback",
          target: {
            kind: "modelInstance",
            modelInstanceId: modelInstance.id
          },
          clipName: "Idle"
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "ambientLightIntensity",
          descriptor: expect.objectContaining({
            channel: "ambientLight.intensity",
            target: {
              kind: "scene",
              scope: "activeScene"
            }
          })
        }),
        expect.objectContaining({
          type: "sunLightIntensity",
          descriptor: expect.objectContaining({
            channel: "sunLight.intensity",
            target: {
              kind: "scene",
              scope: "activeScene"
            }
          })
        }),
        expect.objectContaining({
          type: "lightIntensity",
          descriptor: expect.objectContaining({
            channel: "light.intensity",
            target: {
              kind: "entity",
              entityKind: "pointLight",
              entityId: pointLight.id
            }
          }),
          value: 2.5
        }),
        expect.objectContaining({
          type: "soundVolume",
          descriptor: expect.objectContaining({
            channel: "sound.volume",
            target: {
              kind: "entity",
              entityKind: "soundEmitter",
              entityId: soundEmitter.id
            }
          }),
          value: 0.4
        })
      ])
    );
  });

  it("dispatches authored control effects through the interaction system", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main"
    });
    const lightOffEffect = createSetLightEnabledControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      enabled: false
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight
      },
      interactionLinks: {
        "link-light-off": createControlInteractionLink({
          id: "link-light-off",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          effect: lightOffEffect
        })
      }
    });
    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: Array<{ type: string; enabled: boolean }> = [];

    interactionSystem.updatePlayerPosition(
      {
        x: 0,
        y: 0,
        z: 0
      },
      runtimeScene,
      {
        teleportPlayer: () => {},
        startSceneTransition: () => {},
        toggleBrushVisibility: () => {},
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startNpcDialogue: () => {},
        dispatchControlEffect: (effect, link) => {
          dispatches.push({
            type: `${link.id}:${effect.type}`,
            enabled: effect.type === "setLightEnabled" ? effect.enabled : true
          });
        }
      }
    );

    expect(dispatches).toEqual([
      {
        type: "link-light-off:setLightEnabled",
        enabled: false
      }
    ]);
  });
});
