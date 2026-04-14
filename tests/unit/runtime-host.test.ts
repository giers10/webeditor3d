import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createActiveSceneControlTargetRef,
  createActorControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createPlayModelAnimationControlEffect,
  createPlaySoundControlEffect,
  createSetActorPresenceControlEffect,
  type ControlEffect,
  createSetAmbientLightColorControlEffect,
  createSetAmbientLightIntensityControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightColorControlEffect,
  createSetLightIntensityControlEffect,
  createSetModelInstanceVisibleControlEffect,
  createSetSoundVolumeControlEffect,
  createSetSunLightColorControlEffect,
  createSetSunLightIntensityControlEffect,
  createSoundEmitterControlTargetRef,
  createStopModelAnimationControlEffect,
  createStopSoundControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createNpcEntity,
  createPointLightEntity,
  createSoundEmitterEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createControlInteractionLink,
  type InteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import { createModelInstance } from "../../src/assets/model-instances";
import { RapierCollisionWorld } from "../../src/runtime-three/rapier-collision-world";
import {
  RuntimeHost,
  type RuntimeSceneLoadState
} from "../../src/runtime-three/runtime-host";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import type { AnimationMixer } from "three";

function createDeferred<T>() {
  let resolve: ((value: T) => void) | null = null;
  let reject: ((error: unknown) => void) | null = null;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve(value: T) {
      resolve?.(value);
    },
    reject(error: unknown) {
      reject?.(error);
    }
  };
}

describe("RuntimeHost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delays controller activation until collision setup reports the scene as ready", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const collisionWorld = {
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld;
    const deferredCollisionWorld = createDeferred<RapierCollisionWorld>();
    vi.spyOn(RapierCollisionWorld, "create").mockReturnValue(
      deferredCollisionWorld.promise
    );

    const runtimeMessages: Array<string | null> = [];
    const sceneLoadStates: RuntimeSceneLoadState[] = [];
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.setRuntimeMessageHandler((message) => {
      runtimeMessages.push(message);
    });
    host.setSceneLoadStateHandler((state) => {
      sceneLoadStates.push(state);
    });

    host.loadScene(runtimeScene);
    host.setNavigationMode("thirdPerson");

    expect(sceneLoadStates).toEqual([
      {
        status: "loading",
        message: null
      }
    ]);
    expect(runtimeMessages).toEqual([null]);

    deferredCollisionWorld.resolve(collisionWorld);

    await waitFor(() => {
      expect(sceneLoadStates).toContainEqual({
        status: "ready",
        message: null
      });
      expect(runtimeMessages).toContain(
        "Third Person active. Drag to orbit the camera, use the right stick for gamepad camera look, move with your authored bindings, and scroll to zoom."
      );
    });

    host.dispose();
    expect(collisionWorld.dispose).toHaveBeenCalledTimes(1);
  });

  it("applies typed light control effects through the runtime dispatcher", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      entities: {
        [pointLight.id]: pointLight
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const disableEffect = createSetLightEnabledControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      enabled: false
    });
    const intensityEffect = createSetLightIntensityControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      intensity: 3.5
    });
    const disableLink = createControlInteractionLink({
      id: "link-light-disable",
      sourceEntityId: "entity-trigger-main",
      effect: disableEffect
    });
    const intensityLink = createControlInteractionLink({
      id: "link-light-intensity",
      sourceEntityId: "entity-trigger-main",
      effect: intensityEffect
    });
    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
      localLightObjects: Map<
        string,
        {
          group: { visible: boolean };
          light: { intensity: number };
        }
      >;
    };
    const dispatcher = hostInternals.createInteractionDispatcher();
    const renderObjects = hostInternals.localLightObjects.get(pointLight.id);

    expect(renderObjects).toBeDefined();
    expect(renderObjects?.group.visible).toBe(true);
    expect(renderObjects?.light.intensity).toBe(1.25);

    dispatcher.dispatchControlEffect(disableEffect, disableLink);
    dispatcher.dispatchControlEffect(intensityEffect, intensityLink);

    expect(renderObjects?.group.visible).toBe(false);
    expect(renderObjects?.light.intensity).toBe(3.5);
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightEnabled",
          value: false,
          source: {
            kind: "interactionLink",
            linkId: disableLink.id
          }
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "interactionLink",
            linkId: intensityLink.id
          }
        })
      ])
    );

    host.dispose();
  });

  it("applies expanded typed control effects for model, sound, and scene lighting", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      colorHex: "#ff8800",
      intensity: 1.25
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: "asset-audio-main",
      volume: 0.8
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
      byteLength: 512,
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
      assetId: modelAsset.id
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      assets: {
        [modelAsset.id]: modelAsset,
        [audioAsset.id]: audioAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight,
        [soundEmitter.id]: soundEmitter
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
      localLightObjects: Map<
        string,
        {
          group: { visible: boolean };
          light: { intensity: number; color: { getHexString(): string } };
        }
      >;
      modelRenderObjects: Map<string, { visible: boolean }>;
      ambientLight: {
        intensity: number;
        color: { getHexString(): string };
      };
      sunLight: {
        intensity: number;
        color: { getHexString(): string };
      };
      audioSystem: {
        hasSoundEmitter(soundEmitterId: string): boolean;
        playSound(soundEmitterId: string, link: InteractionLink | null): void;
        stopSound(soundEmitterId: string): void;
        setSoundEmitterVolume(soundEmitterId: string, volume: number): void;
      };
      animationMixers: Map<string, AnimationMixer>;
      applyPlayAnimationAction(
        instanceId: string,
        clipName: string,
        loop: boolean | undefined
      ): void;
      applyStopAnimationAction(instanceId: string): void;
    };

    const dispatcher = hostInternals.createInteractionDispatcher();
    const lightRenderObjects = hostInternals.localLightObjects.get(pointLight.id);
    const modelRenderGroup = hostInternals.modelRenderObjects.get(
      modelInstance.id
    );

    const hasSoundEmitterSpy = vi
      .spyOn(hostInternals.audioSystem, "hasSoundEmitter")
      .mockReturnValue(true);
    const playSoundSpy = vi
      .spyOn(hostInternals.audioSystem, "playSound")
      .mockImplementation(() => undefined);
    const stopSoundSpy = vi
      .spyOn(hostInternals.audioSystem, "stopSound")
      .mockImplementation(() => undefined);
    const setSoundEmitterVolumeSpy = vi
      .spyOn(hostInternals.audioSystem, "setSoundEmitterVolume")
      .mockImplementation(() => undefined);
    hostInternals.animationMixers.set(
      modelInstance.id,
      {} as unknown as AnimationMixer
    );
    const playAnimationSpy = vi
      .spyOn(hostInternals, "applyPlayAnimationAction")
      .mockImplementation(() => undefined);
    const stopAnimationSpy = vi
      .spyOn(hostInternals, "applyStopAnimationAction")
      .mockImplementation(() => undefined);

    const hideModelEffect = createSetModelInstanceVisibleControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id),
      visible: false
    });
    const playAnimationEffect = createPlayModelAnimationControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id),
      clipName: "Idle",
      loop: false
    });
    const stopAnimationEffect = createStopModelAnimationControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id)
    });
    const playSoundEffect = createPlaySoundControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id)
    });
    const stopSoundEffect = createStopSoundControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id)
    });
    const setSoundVolumeEffect = createSetSoundVolumeControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id),
      volume: 0.2
    });
    const lightColorEffect = createSetLightColorControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      colorHex: "#00ffaa"
    });
    const ambientIntensityEffect = createSetAmbientLightIntensityControlEffect({
      target: createActiveSceneControlTargetRef(),
      intensity: 0.6
    });
    const ambientColorEffect = createSetAmbientLightColorControlEffect({
      target: createActiveSceneControlTargetRef(),
      colorHex: "#112233"
    });
    const sunIntensityEffect = createSetSunLightIntensityControlEffect({
      target: createActiveSceneControlTargetRef(),
      intensity: 0.75
    });
    const sunColorEffect = createSetSunLightColorControlEffect({
      target: createActiveSceneControlTargetRef(),
      colorHex: "#ffeeaa"
    });

    const links = {
      hideModel: createControlInteractionLink({
        id: "link-hide-model",
        sourceEntityId: triggerVolume.id,
        effect: hideModelEffect
      }),
      playAnimation: createControlInteractionLink({
        id: "link-play-animation",
        sourceEntityId: triggerVolume.id,
        effect: playAnimationEffect
      }),
      stopAnimation: createControlInteractionLink({
        id: "link-stop-animation",
        sourceEntityId: triggerVolume.id,
        effect: stopAnimationEffect
      }),
      playSound: createControlInteractionLink({
        id: "link-play-sound",
        sourceEntityId: triggerVolume.id,
        effect: playSoundEffect
      }),
      stopSound: createControlInteractionLink({
        id: "link-stop-sound",
        sourceEntityId: triggerVolume.id,
        effect: stopSoundEffect
      }),
      setSoundVolume: createControlInteractionLink({
        id: "link-set-sound-volume",
        sourceEntityId: triggerVolume.id,
        effect: setSoundVolumeEffect
      }),
      lightColor: createControlInteractionLink({
        id: "link-light-color",
        sourceEntityId: triggerVolume.id,
        effect: lightColorEffect
      }),
      ambientIntensity: createControlInteractionLink({
        id: "link-ambient-intensity",
        sourceEntityId: triggerVolume.id,
        effect: ambientIntensityEffect
      }),
      ambientColor: createControlInteractionLink({
        id: "link-ambient-color",
        sourceEntityId: triggerVolume.id,
        effect: ambientColorEffect
      }),
      sunIntensity: createControlInteractionLink({
        id: "link-sun-intensity",
        sourceEntityId: triggerVolume.id,
        effect: sunIntensityEffect
      }),
      sunColor: createControlInteractionLink({
        id: "link-sun-color",
        sourceEntityId: triggerVolume.id,
        effect: sunColorEffect
      })
    };

    dispatcher.dispatchControlEffect(hideModelEffect, links.hideModel);
    dispatcher.dispatchControlEffect(playAnimationEffect, links.playAnimation);
    dispatcher.dispatchControlEffect(stopAnimationEffect, links.stopAnimation);
    dispatcher.dispatchControlEffect(playSoundEffect, links.playSound);
    dispatcher.dispatchControlEffect(stopSoundEffect, links.stopSound);
    dispatcher.dispatchControlEffect(setSoundVolumeEffect, links.setSoundVolume);
    dispatcher.dispatchControlEffect(lightColorEffect, links.lightColor);
    dispatcher.dispatchControlEffect(
      ambientIntensityEffect,
      links.ambientIntensity
    );
    dispatcher.dispatchControlEffect(ambientColorEffect, links.ambientColor);
    dispatcher.dispatchControlEffect(sunIntensityEffect, links.sunIntensity);
    dispatcher.dispatchControlEffect(sunColorEffect, links.sunColor);

    expect(modelRenderGroup?.visible).toBe(false);
    expect(runtimeScene.modelInstances[0]).toEqual(
      expect.objectContaining({
        visible: false,
        animationClipName: undefined,
        animationAutoplay: false
      })
    );
    expect(playAnimationSpy).toHaveBeenCalledWith(
      modelInstance.id,
      "Idle",
      false
    );
    expect(stopAnimationSpy).toHaveBeenCalledWith(modelInstance.id);
    expect(hasSoundEmitterSpy).toHaveBeenCalledWith(soundEmitter.id);
    expect(playSoundSpy).toHaveBeenCalledWith(soundEmitter.id, links.playSound);
    expect(stopSoundSpy).toHaveBeenCalledWith(soundEmitter.id);
    expect(setSoundEmitterVolumeSpy).toHaveBeenCalledWith(soundEmitter.id, 0.2);
    expect(runtimeScene.entities.soundEmitters[0]).toEqual(
      expect.objectContaining({
        autoplay: false,
        volume: 0.2
      })
    );
    expect(lightRenderObjects?.light.color.getHexString()).toBe("00ffaa");
    expect(runtimeScene.localLights.pointLights[0]).toEqual(
      expect.objectContaining({
        colorHex: "#00ffaa"
      })
    );
    expect(hostInternals.ambientLight.intensity).toBeCloseTo(0.6);
    expect(hostInternals.ambientLight.color.getHexString()).toBe("112233");
    expect(hostInternals.sunLight.intensity).toBeCloseTo(0.75);
    expect(hostInternals.sunLight.color.getHexString()).toBe("ffeeaa");
    expect(runtimeScene.world.ambientLight).toEqual(
      expect.objectContaining({
        intensity: 0.6,
        colorHex: "#112233"
      })
    );
    expect(runtimeScene.world.sunLight).toEqual(
      expect.objectContaining({
        intensity: 0.75,
        colorHex: "#ffeeaa"
      })
    );
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "modelVisibility",
          value: false
        }),
        expect.objectContaining({
          type: "modelAnimationPlayback",
          clipName: null
        }),
        expect.objectContaining({
          type: "soundPlayback",
          value: false
        }),
        expect.objectContaining({
          type: "lightColor",
          value: "#00ffaa"
        }),
        expect.objectContaining({
          type: "ambientLightColor",
          value: "#112233"
        }),
        expect.objectContaining({
          type: "sunLightColor",
          value: "#ffeeaa"
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "soundVolume",
          value: 0.2
        }),
        expect.objectContaining({
          type: "ambientLightIntensity",
          value: 0.6
        }),
        expect.objectContaining({
          type: "sunLightIntensity",
          value: 0.75
        })
      ])
    );

    host.dispose();
  });

  it("re-resolves NPC activity from the project scheduler when the runtime clock advances", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const npc = createNpcEntity({
      id: "entity-npc-night-guard",
      actorId: "actor-night-guard"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.scheduler.routines["routine-night-guard"] =
      createProjectScheduleRoutine({
        id: "routine-night-guard",
        title: "Night Shift",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 20,
        endHour: 4,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      runtimeScene: typeof runtimeScene | null;
      syncRuntimeNpcScheduleToCurrentClock(): void;
    };

    expect(runtimeScene.entities.npcs).toEqual([]);

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeNpcScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        actorId: npc.actorId,
        activeRoutineTitle: "Night Shift"
      })
    ]);

    hostInternals.currentClockState = {
      timeOfDayHours: 6,
      dayCount: 1,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeNpcScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([]);
    expect(hostInternals.runtimeScene?.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        active: false,
        activeRoutineTitle: null
      })
    );

    host.dispose();
  });
});
