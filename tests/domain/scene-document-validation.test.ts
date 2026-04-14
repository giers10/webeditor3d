import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import {
  createActiveSceneControlTargetRef,
  createActorControlTargetRef,
  createFollowActorPathControlEffect,
  createLightControlTargetRef,
  createPlayActorAnimationControlEffect,
  createSetActorPresenceControlEffect,
  createSetAmbientLightColorControlEffect,
  createSetLightIntensityControlEffect,
  createSetSoundVolumeControlEffect,
  createSoundEmitterControlTargetRef
} from "../../src/controls/control-surface";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import {
  createPointLightEntity,
  createInteractableEntity,
  createNpcEntity,
  createNpcTimeWindowPresence,
  createPlayerStartInputBindings,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord, type ModelAssetRecord } from "../../src/assets/project-assets";
import {
  createControlInteractionLink,
  createStartDialogueInteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";

describe("validateSceneDocument", () => {
  it("accepts a valid first-room document", () => {
    const brush = createBoxBrush({
      id: "brush-room-shell"
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const document = {
      ...createEmptySceneDocument({ name: "First Room" }),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
  });

  it("detects duplicate authored ids across collections", () => {
    const brush = createBoxBrush({
      id: "shared-room-id"
    });
    const playerStart = createPlayerStartEntity({
      id: "shared-room-id"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        "entity-player-start-main": playerStart
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "entity-id-mismatch"
        }),
        expect.objectContaining({
          code: "duplicate-authored-id"
        })
      ])
    );
  });

  it("rejects project schedule routines that target missing actors", () => {
    const document = createEmptySceneDocument();
    document.scheduler.routines["routine-missing-actor"] =
      createProjectScheduleRoutine({
        id: "routine-missing-actor",
        title: "Missing Actor",
        target: createActorControlTargetRef("actor-missing"),
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef("actor-missing"),
          active: true
        })
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-control-actor-target",
          path: "scheduler.routines.routine-missing-actor.target.actorId"
        })
      ])
    );
  });

  it("rejects invalid expanded control-surface effect values", () => {
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 1024,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 3,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: audioAsset.id
    });
    const document = {
      ...createEmptySceneDocument(),
      assets: {
        [audioAsset.id]: audioAsset
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [soundEmitter.id]: soundEmitter
      },
      interactionLinks: {
        "link-sound-volume": createControlInteractionLink({
          id: "link-sound-volume",
          sourceEntityId: triggerVolume.id,
          effect: createSetSoundVolumeControlEffect({
            target: createSoundEmitterControlTargetRef(soundEmitter.id),
            volume: 0.4
          })
        }),
        "link-ambient-color": createControlInteractionLink({
          id: "link-ambient-color",
          sourceEntityId: triggerVolume.id,
          effect: createSetAmbientLightColorControlEffect({
            target: createActiveSceneControlTargetRef(),
            colorHex: "#112233"
          })
        })
      }
    };
    const soundVolumeAction = document.interactionLinks["link-sound-volume"]
      .action as typeof document.interactionLinks["link-sound-volume"]["action"] & {
      effect: { volume: number };
    };
    const ambientColorAction = document.interactionLinks["link-ambient-color"]
      .action as typeof document.interactionLinks["link-ambient-color"]["action"] & {
      effect: { colorHex: string };
    };
    soundVolumeAction.effect.volume = Number.NaN;
    ambientColorAction.effect.colorHex = "not-a-color";

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-control-sound-volume",
          path: "interactionLinks.link-sound-volume.action.effect.volume"
        }),
        expect.objectContaining({
          code: "invalid-control-ambient-light-color",
          path: "interactionLinks.link-ambient-color.action.effect.colorHex"
        })
      ])
    );
  });

  it("rejects interaction dialogue links that reference missing dialogue resources", () => {
    const interactable = createInteractableEntity({
      id: "entity-interactable-main"
    });
    const document = createEmptySceneDocument();
    document.entities[interactable.id] = interactable;
    document.interactionLinks["link-dialogue-missing"] =
      createStartDialogueInteractionLink({
        id: "link-dialogue-missing",
        sourceEntityId: interactable.id,
        trigger: "click",
        dialogueId: "dialogue-missing"
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-dialogue-resource",
          path: "interactionLinks.link-dialogue-missing.action.dialogueId"
        })
      ])
    );
  });

  it("rejects NPC dialogue references that point to missing dialogue resources", () => {
    const npc = createNpcEntity({
      id: "entity-npc-guide",
      actorId: "actor-guide",
      dialogueId: "dialogue-missing"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-dialogue-resource",
          path: `entities.${npc.id}.dialogueId`
        })
      ])
    );
  });

  it("accepts typed scheduler light control effects in the scene document", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });
    const document = createEmptySceneDocument();
    document.entities[pointLight.id] = pointLight;
    document.scheduler.routines["routine-night-light"] =
      createProjectScheduleRoutine({
        id: "routine-night-light",
        title: "Night Light",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 18,
        endHour: 6,
        effect: createSetLightIntensityControlEffect({
          target: createLightControlTargetRef("pointLight", pointLight.id),
          intensity: 0.35
        })
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("accepts actor scheduler animation and follow-path effects when the actor has one bound NPC usage", () => {
    const actorTarget = createActorControlTargetRef("actor-patroller");
    const npcModelAsset = {
      id: "asset-model-patroller",
      kind: "model" as const,
      sourceName: "patroller.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-patroller"),
      byteLength: 1024,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: ["Walk"],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: actorTarget.actorId,
      modelAssetId: npcModelAsset.id
    });
    const path = createScenePath({
      id: "path-patrol"
    });
    const document = createEmptySceneDocument();
    document.assets[npcModelAsset.id] = npcModelAsset;
    document.entities[npc.id] = npc;
    document.paths[path.id] = path;
    document.scheduler.routines["routine-patrol"] = createProjectScheduleRoutine({
      id: "routine-patrol",
      title: "Patrolling",
      target: actorTarget,
      startHour: 9,
      endHour: 13,
      effects: [
        createSetActorPresenceControlEffect({
          target: actorTarget,
          active: true
        }),
        createPlayActorAnimationControlEffect({
          target: actorTarget,
          clipName: "Walk",
          loop: true
        }),
        createFollowActorPathControlEffect({
          target: actorTarget,
          pathId: path.id,
          speed: 2,
          loop: false,
          progressMode: "deriveFromTime"
        })
      ]
    });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("detects invalid box sizes and missing material references", () => {
    const brush = createBoxBrush({
      id: "brush-invalid"
    });
    brush.rotationDegrees.y = Number.NaN;
    brush.size.x = 0;
    brush.faces.posZ.materialId = "material-that-does-not-exist";

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-box-rotation",
          path: "brushes.brush-invalid.rotationDegrees"
        }),
        expect.objectContaining({
          code: "invalid-box-size",
          path: "brushes.brush-invalid.size"
        }),
        expect.objectContaining({
          code: "missing-material-ref",
          path: "brushes.brush-invalid.faces.posZ.materialId"
        })
      ])
    );
  });

  it("detects invalid Player Start values", () => {
    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        "entity-player-start-main": {
          id: "entity-player-start-main",
          kind: "playerStart",
          visible: true,
          enabled: true,
          position: {
            x: 0,
            y: Number.NaN,
            z: 0
          },
          yawDegrees: Number.NaN,
          navigationMode: "invalidMode" as unknown as "firstPerson",
          movementTemplate: {
            kind: "invalidTemplate",
            moveSpeed: 0,
            capabilities: {
              jump: "yes",
              sprint: 1,
              crouch: null
            },
            jump: {
              speed: 0,
              bufferMs: -1,
              coyoteTimeMs: -1,
              variableHeight: "yes",
              maxHoldMs: 0,
              moveWhileJumping: "yes",
              moveWhileFalling: 1,
              directionOnly: "left"
            },
            sprint: {
              speedMultiplier: 0
            },
            crouch: {
              speedMultiplier: 0
            }
          } as unknown as ReturnType<typeof createPlayerStartEntity>["movementTemplate"],
          inputBindings: {
            keyboard: {
              ...createPlayerStartInputBindings().keyboard,
              jump: "",
              sprint: "",
              crouch: "",
              pauseTime: ""
            },
            gamepad: {
              ...createPlayerStartInputBindings().gamepad,
              jump: "invalidButton",
              sprint: "invalidButton",
              crouch: "invalidButton",
              pauseTime: "invalidButton"
            }
          } as unknown as ReturnType<typeof createPlayerStartEntity>["inputBindings"],
          collider: {
            mode: "capsule",
            eyeHeight: 3,
            capsuleRadius: 0.4,
            capsuleHeight: 0.5,
            boxSize: {
              x: 0.6,
              y: -1,
              z: 0.6
            }
          }
        }
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-player-start-position"
        }),
        expect.objectContaining({
          code: "invalid-player-start-yaw"
        }),
        expect.objectContaining({
          code: "invalid-player-start-navigation-mode"
        }),
        expect.objectContaining({
          code: "invalid-player-start-movement-template-kind"
        }),
        expect.objectContaining({
          code: "invalid-player-start-movement-speed"
        }),
        expect.objectContaining({
          code: "invalid-player-start-jump-capability"
        }),
        expect.objectContaining({
          code: "invalid-player-start-sprint-capability"
        }),
        expect.objectContaining({
          code: "invalid-player-start-crouch-capability"
        }),
        expect.objectContaining({
          code: "invalid-player-start-jump-speed"
        }),
        expect.objectContaining({
          code: "invalid-player-start-jump-buffer-ms"
        }),
        expect.objectContaining({
          code: "invalid-player-start-coyote-time-ms"
        }),
        expect.objectContaining({
          code: "invalid-player-start-variable-jump-height"
        }),
        expect.objectContaining({
          code: "invalid-player-start-variable-jump-max-hold-ms"
        }),
        expect.objectContaining({
          code: "invalid-player-start-move-while-jumping"
        }),
        expect.objectContaining({
          code: "invalid-player-start-move-while-falling"
        }),
        expect.objectContaining({
          code: "invalid-player-start-air-direction-only"
        }),
        expect.objectContaining({
          code: "invalid-player-start-sprint-speed-multiplier"
        }),
        expect.objectContaining({
          code: "invalid-player-start-crouch-speed-multiplier"
        }),
        expect.objectContaining({
          code: "invalid-player-start-jump-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-sprint-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-crouch-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-pause-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-jump-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-sprint-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-crouch-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-pause-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-capsule-proportions"
        }),
        expect.objectContaining({
          code: "invalid-player-start-box-size"
        }),
        expect.objectContaining({
          code: "invalid-player-start-eye-height"
        })
      ])
    );
  });

  it("detects invalid typed entity values across the entity registry", () => {
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main"
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-main"
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-main"
    });

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        [soundEmitter.id]: {
          ...soundEmitter,
          refDistance: Number.NaN
        },
        [triggerVolume.id]: {
          ...triggerVolume,
          size: {
            x: 0,
            y: 2,
            z: 2
          }
        },
        [teleportTarget.id]: {
          ...teleportTarget,
          yawDegrees: Number.POSITIVE_INFINITY
        },
        [interactable.id]: {
          ...interactable,
          prompt: "   ",
          enabled: "yes" as unknown as boolean,
          interactionEnabled: "yes" as unknown as boolean
        }
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-sound-emitter-ref-distance"
        }),
        expect.objectContaining({
          code: "invalid-trigger-volume-size"
        }),
        expect.objectContaining({
          code: "invalid-teleport-target-yaw"
        }),
        expect.objectContaining({
          code: "invalid-interactable-prompt"
        }),
        expect.objectContaining({
          code: "invalid-entity-enabled"
        }),
        expect.objectContaining({
          code: "invalid-interactable-interaction-enabled"
        })
      ])
    );
  });

  it("detects missing and invalid audio asset references on Sound Emitters", () => {
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "lobby-loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 4096,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 4.25,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const modelAsset = {
      id: "asset-model-main",
      kind: "model" as const,
      sourceName: "fixture.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-main"),
      byteLength: 128,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const missingAudioEmitter = createSoundEmitterEntity({
      id: "entity-sound-missing",
      audioAssetId: "asset-missing-audio"
    });
    const wrongKindAudioEmitter = createSoundEmitterEntity({
      id: "entity-sound-wrong-kind",
      audioAssetId: modelAsset.id
    });
    const validAudioEmitter = createSoundEmitterEntity({
      id: "entity-sound-valid",
      audioAssetId: audioAsset.id
    });

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      assets: {
        [audioAsset.id]: audioAsset,
        [modelAsset.id]: modelAsset
      },
      entities: {
        [missingAudioEmitter.id]: missingAudioEmitter,
        [wrongKindAudioEmitter.id]: wrongKindAudioEmitter,
        [validAudioEmitter.id]: validAudioEmitter
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-sound-emitter-audio-asset",
          path: "entities.entity-sound-missing.audioAssetId"
        }),
        expect.objectContaining({
          code: "invalid-sound-emitter-audio-asset-kind",
          path: "entities.entity-sound-wrong-kind.audioAssetId"
        })
      ])
    );
  });

  it("validates NPC actor ids and model asset references", () => {
    const modelAsset = {
      id: "asset-model-main",
      kind: "model" as const,
      sourceName: "fixture.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-main"),
      byteLength: 128,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const missingModelNpc = createNpcEntity({
      id: "entity-npc-missing-model",
      actorId: "actor-town-guide",
      modelAssetId: "asset-model-missing"
    });
    const wrongKindModelNpc = createNpcEntity({
      id: "entity-npc-wrong-kind",
      actorId: "actor-town-baker",
      modelAssetId: "asset-audio-main"
    });
    const duplicateActorNpc = createNpcEntity({
      id: "entity-npc-duplicate",
      actorId: "actor-town-guide",
      modelAssetId: modelAsset.id
    });
    const invalidColliderNpc = createNpcEntity({
      id: "entity-npc-invalid-collider",
      actorId: "actor-town-guard",
      collider: {
        mode: "box",
        eyeHeight: 1.2,
        boxSize: {
          x: 0.7,
          y: 1.2,
          z: 0.7
        }
      }
    });
    invalidColliderNpc.collider.eyeHeight = 2;

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      assets: {
        "asset-audio-main": {
          id: "asset-audio-main",
          kind: "audio",
          sourceName: "voice.ogg",
          mimeType: "audio/ogg",
          storageKey: createProjectAssetStorageKey("asset-audio-main"),
          byteLength: 32,
          metadata: {
            kind: "audio",
            durationSeconds: 1,
            channelCount: 1,
            sampleRateHz: 44100,
            warnings: []
          }
        },
        [modelAsset.id]: modelAsset
      },
      entities: {
        [missingModelNpc.id]: missingModelNpc,
        [wrongKindModelNpc.id]: wrongKindModelNpc,
        [duplicateActorNpc.id]: duplicateActorNpc,
        [invalidColliderNpc.id]: invalidColliderNpc
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-npc-model-asset",
          path: "entities.entity-npc-missing-model.modelAssetId"
        }),
        expect.objectContaining({
          code: "invalid-npc-model-asset-kind",
          path: "entities.entity-npc-wrong-kind.modelAssetId"
        }),
        expect.objectContaining({
          code: "duplicate-npc-actor-id",
          path: "entities.entity-npc-duplicate.actorId"
        }),
        expect.objectContaining({
          code: "invalid-npc-eye-height",
          path: "entities.entity-npc-invalid-collider.collider.eyeHeight"
        })
      ])
    );
  });

  it("validates authored NPC presence windows", () => {
    const zeroWindowNpc = createNpcEntity({
      id: "entity-npc-zero-window",
      actorId: "actor-town-zero-window",
      presence: createNpcTimeWindowPresence({
        startHour: 8,
        endHour: 12
      })
    });
    zeroWindowNpc.presence = {
      mode: "timeWindow",
      startHour: 8,
      endHour: 8
    };

    const invalidRangeNpc = createNpcEntity({
      id: "entity-npc-invalid-range",
      actorId: "actor-town-invalid-range",
      presence: createNpcTimeWindowPresence({
        startHour: 20,
        endHour: 2
      })
    });
    invalidRangeNpc.presence = {
      mode: "timeWindow",
      startHour: 25,
      endHour: 2
    };

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        [zeroWindowNpc.id]: zeroWindowNpc,
        [invalidRangeNpc.id]: invalidRangeNpc
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-npc-presence-zero-window",
          path: "entities.entity-npc-zero-window.presence.startHour"
        }),
        expect.objectContaining({
          code: "invalid-npc-presence-start-range",
          path: "entities.entity-npc-invalid-range.presence.startHour"
        })
      ])
    );
  });

  it("accepts authored point and spot lights with an active image background asset", () => {
    const imageAsset = {
      id: "asset-background-panorama",
      kind: "image" as const,
      sourceName: "skybox-panorama.svg",
      mimeType: "image/svg+xml",
      storageKey: createProjectAssetStorageKey("asset-background-panorama"),
      byteLength: 2048,
      metadata: {
        kind: "image" as const,
        width: 512,
        height: 256,
        hasAlpha: false,
        warnings: ["Background images work best as a 2:1 equirectangular panorama."]
      }
    };
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      position: {
        x: 1,
        y: 3,
        z: -2
      }
    });
    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-main",
      position: {
        x: -1,
        y: 4,
        z: 2
      },
      direction: {
        x: 0.25,
        y: -1,
        z: 0.15
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      assets: {
        [imageAsset.id]: imageAsset
      },
      entities: {
        [pointLight.id]: pointLight,
        [spotLight.id]: spotLight
      }
    };
    document.world.background = {
      mode: "image",
      assetId: imageAsset.id,
      environmentIntensity: 0.5
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("detects invalid local light values and missing image background assets", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-invalid"
    });
    pointLight.colorHex = "not-a-color";
    pointLight.intensity = -1;
    pointLight.distance = 0;

    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-invalid"
    });
    spotLight.direction = {
      x: 0,
      y: 0,
      z: 0
    };
    spotLight.distance = -2;
    spotLight.angleDegrees = 180;

    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [pointLight.id]: pointLight,
        [spotLight.id]: spotLight
      }
    };
    document.world.background = {
      mode: "image",
      assetId: "asset-missing-background",
      environmentIntensity: 0.5
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-point-light-color"
        }),
        expect.objectContaining({
          code: "invalid-point-light-intensity"
        }),
        expect.objectContaining({
          code: "invalid-point-light-distance"
        }),
        expect.objectContaining({
          code: "invalid-spot-light-direction"
        }),
        expect.objectContaining({
          code: "invalid-spot-light-distance"
        }),
        expect.objectContaining({
          code: "invalid-spot-light-angle"
        }),
        expect.objectContaining({
          code: "missing-world-background-asset"
        })
      ])
    );
  });

  it("detects invalid world lighting and background settings", () => {
    const document = createEmptySceneDocument();
    document.world.background = {
      mode: "verticalGradient",
      topColorHex: "sky-blue",
      bottomColorHex: "#18212b"
    };
    document.world.ambientLight.intensity = -0.25;
    document.world.sunLight.direction = {
      x: 0,
      y: 0,
      z: 0
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-world-background-top-color",
          path: "world.background.topColorHex"
        }),
        expect.objectContaining({
          code: "invalid-world-ambient-intensity",
          path: "world.ambientLight.intensity"
        }),
        expect.objectContaining({
          code: "invalid-world-sun-direction",
          path: "world.sunLight.direction"
        })
      ])
    );
  });

  it("detects invalid advanced rendering settings", () => {
    const document = createEmptySceneDocument();
    document.world.advancedRendering = {
      ...document.world.advancedRendering,
      enabled: true,
      shadows: {
        ...document.world.advancedRendering.shadows,
        mapSize: 3000,
        type: "ultra",
        bias: Number.NaN
      },
      ambientOcclusion: {
        ...document.world.advancedRendering.ambientOcclusion,
        samples: 0
      },
      bloom: {
        ...document.world.advancedRendering.bloom,
        intensity: -0.25,
        threshold: -1,
        radius: -0.5
      },
      toneMapping: {
        mode: "filmic",
        exposure: 0
      },
      fogPath: "high",
      waterPath: "ultra",
      depthOfField: {
        ...document.world.advancedRendering.depthOfField,
        focalLength: 0,
        bokehScale: -2
      },
      whiteboxBevel: {
        ...document.world.advancedRendering.whiteboxBevel,
        edgeWidth: -0.1,
        normalStrength: Number.NaN
      }
    } as any;

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-advanced-rendering-shadow-map-size",
          path: "world.advancedRendering.shadows.mapSize"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-shadow-type",
          path: "world.advancedRendering.shadows.type"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-shadow-bias",
          path: "world.advancedRendering.shadows.bias"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-ao-samples",
          path: "world.advancedRendering.ambientOcclusion.samples"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-bloom-intensity",
          path: "world.advancedRendering.bloom.intensity"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-bloom-threshold",
          path: "world.advancedRendering.bloom.threshold"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-bloom-radius",
          path: "world.advancedRendering.bloom.radius"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-tone-mapping-mode",
          path: "world.advancedRendering.toneMapping.mode"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-tone-mapping-exposure",
          path: "world.advancedRendering.toneMapping.exposure"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-dof-focal-length",
          path: "world.advancedRendering.depthOfField.focalLength"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-dof-bokeh-scale",
          path: "world.advancedRendering.depthOfField.bokehScale"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-whitebox-bevel-edge-width",
          path: "world.advancedRendering.whiteboxBevel.edgeWidth"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-whitebox-bevel-normal-strength",
          path: "world.advancedRendering.whiteboxBevel.normalStrength"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-fog-path",
          path: "world.advancedRendering.fogPath"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-water-path",
          path: "world.advancedRendering.waterPath"
        })
      ])
    );
  });

  it("detects invalid whitebox box volume settings", () => {
    const invalidModeBrush = createBoxBrush({
      id: "brush-invalid-volume-mode"
    });
    const invalidWaterBrush = createBoxBrush({
      id: "brush-invalid-volume-water"
    });
    const invalidFogBrush = createBoxBrush({
      id: "brush-invalid-volume-fog"
    });

    (invalidModeBrush as any).volume = {
      mode: "lava",
      water: {
        colorHex: "#3a7dc2",
        surfaceOpacity: 0.6,
        waveStrength: 0.3,
        surfaceDisplacementEnabled: false
      }
    };
    (invalidWaterBrush as any).volume = {
      mode: "water",
      water: {
        colorHex: "water",
        surfaceOpacity: Number.NaN,
        waveStrength: -1
      }
    };
    (invalidFogBrush as any).volume = {
      mode: "fog",
      fog: {
        colorHex: "fog",
        density: Number.NaN,
        padding: -0.5
      }
    };

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      brushes: {
        [invalidModeBrush.id]: invalidModeBrush,
        [invalidWaterBrush.id]: invalidWaterBrush,
        [invalidFogBrush.id]: invalidFogBrush
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-box-volume-mode",
          path: "brushes.brush-invalid-volume-mode.volume.mode"
        }),
        expect.objectContaining({
          code: "invalid-box-water-color",
          path: "brushes.brush-invalid-volume-water.volume.water.colorHex"
        }),
        expect.objectContaining({
          code: "invalid-box-water-surface-opacity",
          path: "brushes.brush-invalid-volume-water.volume.water.surfaceOpacity"
        }),
        expect.objectContaining({
          code: "invalid-box-water-wave-strength",
          path: "brushes.brush-invalid-volume-water.volume.water.waveStrength"
        }),
        expect.objectContaining({
          code: "invalid-box-water-surface-displacement-enabled",
          path: "brushes.brush-invalid-volume-water.volume.water.surfaceDisplacementEnabled"
        }),
        expect.objectContaining({
          code: "invalid-box-fog-color",
          path: "brushes.brush-invalid-volume-fog.volume.fog.colorHex"
        }),
        expect.objectContaining({
          code: "invalid-box-fog-density",
          path: "brushes.brush-invalid-volume-fog.volume.fog.density"
        }),
        expect.objectContaining({
          code: "invalid-box-fog-padding",
          path: "brushes.brush-invalid-volume-fog.volume.fog.padding"
        })
      ])
    );
  });

  it("detects invalid authored path foundations", () => {
    const invalidPath = createScenePath({
      id: "path-invalid",
      points: [
        {
          id: "path-point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });

    invalidPath.name = "   ";
    invalidPath.points = [
      {
        id: "path-point-a",
        position: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    ] as typeof invalidPath.points;

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      paths: {
        [invalidPath.id]: invalidPath
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-path-name",
          path: "paths.path-invalid.name"
        }),
        expect.objectContaining({
          code: "invalid-path-point-count",
          path: "paths.path-invalid.points"
        })
      ])
    );
  });
});
