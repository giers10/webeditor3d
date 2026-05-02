import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import {
  createActiveSceneControlTargetRef,
  createActivateCameraRigOverrideControlEffect,
  createActorControlTargetRef,
  createCameraRigControlTargetRef,
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
import {
  createEmptyProjectDocument,
  createEmptyProjectScene,
  createEmptySceneDocument,
  createSceneDocumentFromProject
} from "../../src/document/scene-document";
import {
  validateProjectDocument,
  validateSceneDocument,
  validateSceneDocumentLocalBuildContent
} from "../../src/document/scene-document-validation";
import {
  createCameraRigActorTargetRef,
  createCameraRigEntity,
  createCameraRigEntityTargetRef,
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
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import {
  createControlInteractionLink,
  createRunSequenceInteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { createProjectSequence } from "../../src/sequencer/project-sequences";

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

  it("validates project-global actor schedule targets against all project scenes", () => {
    const sceneA = createEmptyProjectScene({
      id: "scene-a",
      name: "Scene A"
    });
    const sceneB = createEmptyProjectScene({
      id: "scene-b",
      name: "Scene B"
    });
    const ana = createNpcEntity({
      id: "entity-npc-ana-nanto",
      actorId: "Ana Nanto"
    });
    const actorTarget = createActorControlTargetRef(ana.actorId);
    const project = createEmptyProjectDocument({
      sceneId: sceneA.id,
      sceneName: sceneA.name
    });

    project.scenes = {
      [sceneA.id]: {
        ...sceneA,
        entities: {
          [ana.id]: ana
        }
      },
      [sceneB.id]: sceneB
    };
    project.sequences.sequences["sequence-ana-presence"] =
      createProjectSequence({
        id: "sequence-ana-presence",
        title: "Ana Presence",
        effects: [
          {
            stepClass: "held",
            type: "controlEffect",
            effect: createSetActorPresenceControlEffect({
              target: actorTarget,
              active: true
            })
          }
        ]
      });
    project.scheduler.routines["routine-ana-presence"] =
      createProjectScheduleRoutine({
        id: "routine-ana-presence",
        title: "Ana Presence",
        target: actorTarget,
        sequenceId: "sequence-ana-presence",
        effects: []
      });

    const projectValidation = validateProjectDocument(project);
    const sceneBValidation = validateSceneDocumentLocalBuildContent(
      createSceneDocumentFromProject(project, sceneB.id)
    );

    expect(projectValidation.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-control-actor-target"
        })
      ])
    );
    expect(sceneBValidation.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-control-actor-target"
        })
      ])
    );
  });

  it("keeps project validation strict for truly missing project-global actor targets", () => {
    const project = createEmptyProjectDocument();
    const missingActorTarget = createActorControlTargetRef("actor-missing");

    project.sequences.sequences["sequence-missing-actor"] =
      createProjectSequence({
        id: "sequence-missing-actor",
        title: "Missing Actor",
        effects: [
          {
            stepClass: "held",
            type: "controlEffect",
            effect: createSetActorPresenceControlEffect({
              target: missingActorTarget,
              active: true
            })
          }
        ]
      });
    project.scheduler.routines["routine-missing-actor"] =
      createProjectScheduleRoutine({
        id: "routine-missing-actor",
        title: "Missing Actor",
        target: missingActorTarget,
        sequenceId: "sequence-missing-actor",
        effects: []
      });

    const validation = validateProjectDocument(project);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-control-actor-target",
          path: "sequences.sequences.sequence-missing-actor.effects.0.effect.target.actorId"
        }),
        expect.objectContaining({
          code: "missing-control-actor-target",
          path: "scheduler.routines.routine-missing-actor.target.actorId"
        })
      ])
    );
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

  it("rejects project schedule routines that reference missing project sequences", () => {
    const npc = createNpcEntity({
      id: "entity-npc-sequence-guide",
      actorId: "actor-sequence-guide"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.scheduler.routines["routine-sequence-missing"] =
      createProjectScheduleRoutine({
        id: "routine-sequence-missing",
        title: "Missing Sequence",
        target: createActorControlTargetRef(npc.actorId),
        sequenceId: "sequence-missing",
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-routine-sequence-resource",
          path: "scheduler.routines.routine-sequence-missing.sequenceId"
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
      .action as (typeof document.interactionLinks)["link-sound-volume"]["action"] & {
      effect: { volume: number };
    };
    const ambientColorAction = document.interactionLinks["link-ambient-color"]
      .action as (typeof document.interactionLinks)["link-ambient-color"]["action"] & {
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

  it("rejects interaction run-sequence links that do not resolve impulse steps", () => {
    const interactable = createInteractableEntity({
      id: "entity-interactable-sequence"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-sequence"
    });
    const document = createEmptySceneDocument();
    document.entities[interactable.id] = interactable;
    document.entities[soundEmitter.id] = soundEmitter;
    document.sequences.sequences["sequence-held-only"] = createProjectSequence({
      id: "sequence-held-only",
      title: "Held Only",
      steps: [
        {
          stepClass: "held",
          type: "controlEffect",
          effect: createSetSoundVolumeControlEffect({
            target: createSoundEmitterControlTargetRef(soundEmitter.id),
            volume: 0.5
          })
        }
      ]
    });
    document.interactionLinks["link-run-held-sequence"] =
      createRunSequenceInteractionLink({
        id: "link-run-held-sequence",
        sourceEntityId: interactable.id,
        trigger: "click",
        sequenceId: "sequence-held-only"
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-link-sequence-no-impulse-steps",
          path: "interactionLinks.link-run-held-sequence.action.sequenceId"
        })
      ])
    );
  });

  it("accepts NPC interaction links that run click sequences", () => {
    const npc = createNpcEntity({
      id: "entity-npc-guide",
      actorId: "actor-guide",
      dialogues: [
        {
          id: "dialogue-guide",
          title: "Guide",
          lines: [
            {
              id: "dialogue-guide-line-1",
              text: "Welcome."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-guide"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.sequences.sequences["sequence-guide-talk"] = createProjectSequence(
      {
        id: "sequence-guide-talk",
        title: "Guide Talk",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: npc.id,
            dialogueId: "dialogue-guide"
          }
        ]
      }
    );
    document.interactionLinks["link-guide-talk"] =
      createRunSequenceInteractionLink({
        id: "link-guide-talk",
        sourceEntityId: npc.id,
        trigger: "click",
        sequenceId: "sequence-guide-talk"
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("accepts actor timeline sequences without an explicit presence effect", () => {
    const npc = createNpcEntity({
      id: "entity-npc-guard",
      actorId: "actor-guard"
    });
    const path = createScenePath({
      id: "path-guard-patrol"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.paths[path.id] = path;
    document.sequences.sequences["sequence-guard-patrol"] =
      createProjectSequence({
        id: "sequence-guard-patrol",
        title: "Guard Patrol",
        effects: [
          {
            stepClass: "held",
            type: "controlEffect",
            effect: createFollowActorPathControlEffect({
              target: createActorControlTargetRef("actor-guard"),
              pathId: path.id,
              speed: 1,
              loop: true,
              progressMode: "deriveFromTime"
            })
          }
        ]
      });
    document.scheduler.routines["routine-guard-patrol"] =
      createProjectScheduleRoutine({
        id: "routine-guard-patrol",
        title: "Guard Patrol",
        target: createActorControlTargetRef("actor-guard"),
        startHour: 8,
        endHour: 18,
        sequenceId: "sequence-guard-patrol",
        effects: []
      });

    const validation = validateSceneDocument(document);

    expect(validation.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-project-schedule-actor-presence-missing"
        })
      ])
    );
  });

  it("rejects NPC default dialogues that point to missing NPC-authored dialogues", () => {
    const npc = {
      ...createNpcEntity({
        id: "entity-npc-guide",
        actorId: "actor-guide"
      }),
      defaultDialogueId: "dialogue-missing"
    };
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-npc-default-dialogue",
          path: `entities.${npc.id}.defaultDialogueId`
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

  it("accepts typed camera rig control effects in scheduler routines and interaction links", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-camera"
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-main"
    });
    const document = createEmptySceneDocument();
    document.entities[triggerVolume.id] = triggerVolume;
    document.entities[cameraRig.id] = cameraRig;
    document.scheduler.routines["routine-camera-override"] =
      createProjectScheduleRoutine({
        id: "routine-camera-override",
        title: "Camera Override",
        target: createCameraRigControlTargetRef(cameraRig.id),
        startHour: 8,
        endHour: 18,
        effect: createActivateCameraRigOverrideControlEffect({
          target: createCameraRigControlTargetRef(cameraRig.id)
        })
      });
    document.interactionLinks["link-camera-override"] =
      createControlInteractionLink({
        id: "link-camera-override",
        sourceEntityId: triggerVolume.id,
        effect: createActivateCameraRigOverrideControlEffect({
          target: createCameraRigControlTargetRef(cameraRig.id)
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
    document.scheduler.routines["routine-patrol"] =
      createProjectScheduleRoutine({
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
    brush.faces.negZ.climbable = "yes" as unknown as boolean;

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
        }),
        expect.objectContaining({
          code: "invalid-brush-face-climbable",
          path: "brushes.brush-invalid.faces.negZ.climbable"
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
          interactionReachMeters: Number.NaN,
          interactionAngleDegrees: Number.NaN,
          allowLookInputTargetSwitch: "yes" as unknown as boolean,
          targetButtonCyclesActiveTarget: 1 as unknown as boolean,
          invertMouseCameraHorizontal: "no" as unknown as boolean,
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
            },
            edgeAssist: {
              enabled: "yes",
              pushToTopHeight: -1
            }
          } as unknown as ReturnType<
            typeof createPlayerStartEntity
          >["movementTemplate"],
          inputBindings: {
            keyboard: {
              ...createPlayerStartInputBindings().keyboard,
              jump: "",
              sprint: "",
              crouch: "",
              climb: "",
              interact: "",
              clearTarget: "",
              pauseTime: ""
            },
            gamepad: {
              ...createPlayerStartInputBindings().gamepad,
              jump: "invalidButton",
              sprint: "invalidButton",
              crouch: "invalidButton",
              climb: "invalidButton",
              interact: "invalidButton",
              clearTarget: "invalidButton",
              pauseTime: "invalidButton"
            }
          } as unknown as ReturnType<
            typeof createPlayerStartEntity
          >["inputBindings"],
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
          code: "invalid-player-start-interaction-reach"
        }),
        expect.objectContaining({
          code: "invalid-player-start-interaction-angle"
        }),
        expect.objectContaining({
          code: "invalid-player-start-look-input-target-switch"
        }),
        expect.objectContaining({
          code: "invalid-player-start-target-button-cycles-active-target"
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
          code: "invalid-player-start-edge-assist-enabled"
        }),
        expect.objectContaining({
          code: "invalid-player-start-push-to-top-height"
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
          code: "invalid-player-start-climb-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-interact-keyboard-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-clear-target-keyboard-binding"
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
          code: "invalid-player-start-climb-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-interact-gamepad-binding"
        }),
        expect.objectContaining({
          code: "invalid-player-start-clear-target-gamepad-binding"
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

  it("validates fixed camera rig targets and authored settings", () => {
    const otherCameraRig = createCameraRigEntity({
      id: "entity-camera-rig-other"
    });
    const missingActorRig = createCameraRigEntity({
      id: "entity-camera-rig-missing-actor",
      target: createCameraRigActorTargetRef("actor-missing")
    });
    const missingEntityRig = createCameraRigEntity({
      id: "entity-camera-rig-missing-entity",
      target: createCameraRigEntityTargetRef("entity-missing")
    });
    const selfTargetRig = createCameraRigEntity({
      id: "entity-camera-rig-self"
    });
    const cameraTargetRig = createCameraRigEntity({
      id: "entity-camera-rig-camera-target",
      target: createCameraRigEntityTargetRef(otherCameraRig.id)
    });
    const invalidRig = createCameraRigEntity({
      id: "entity-camera-rig-invalid"
    });

    selfTargetRig.target = createCameraRigEntityTargetRef(selfTargetRig.id);
    invalidRig.priority = Number.NaN;
    invalidRig.targetOffset = {
      x: Number.POSITIVE_INFINITY,
      y: 0,
      z: 0
    };
    invalidRig.lookAround.enabled = "yes" as unknown as boolean;
    invalidRig.lookAround.pitchLimitDegrees = Number.NaN;

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        [otherCameraRig.id]: otherCameraRig,
        [missingActorRig.id]: missingActorRig,
        [missingEntityRig.id]: missingEntityRig,
        [selfTargetRig.id]: selfTargetRig,
        [cameraTargetRig.id]: cameraTargetRig,
        [invalidRig.id]: invalidRig
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-camera-rig-target-actor"
        }),
        expect.objectContaining({
          code: "missing-camera-rig-target-entity"
        }),
        expect.objectContaining({
          code: "camera-rig-self-target"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-target-entity-kind"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-priority"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-target-offset"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-look-around-enabled"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-look-around-pitch-limit"
        })
      ])
    );
  });

  it("validates rail camera rig path references", () => {
    const disabledPath = createScenePath({
      id: "path-camera-disabled",
      enabled: false
    });
    const blankPathRig = createCameraRigEntity({
      id: "entity-camera-rig-blank-path",
      rigType: "rail",
      pathId: ""
    });
    const missingPathRig = createCameraRigEntity({
      id: "entity-camera-rig-missing-path",
      rigType: "rail",
      pathId: "path-camera-missing"
    });
    const disabledPathRig = createCameraRigEntity({
      id: "entity-camera-rig-disabled-path",
      rigType: "rail",
      pathId: disabledPath.id
    });

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      paths: {
        [disabledPath.id]: disabledPath
      },
      entities: {
        [blankPathRig.id]: blankPathRig,
        [missingPathRig.id]: missingPathRig,
        [disabledPathRig.id]: disabledPathRig
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-camera-rig-path-id"
        }),
        expect.objectContaining({
          code: "missing-camera-rig-path"
        }),
        expect.objectContaining({
          code: "disabled-camera-rig-path"
        })
      ])
    );
  });

  it("validates mapped rail camera rig placement fields", () => {
    const path = createScenePath({
      id: "path-camera-mapped"
    });
    const invalidPlacementRig = createCameraRigEntity({
      id: "entity-camera-rig-invalid-placement",
      rigType: "rail",
      pathId: path.id
    }) as ReturnType<typeof createCameraRigEntity> & {
      railPlacementMode: string;
    };
    const invalidMappedRig = createCameraRigEntity({
      id: "entity-camera-rig-invalid-mapped",
      rigType: "rail",
      pathId: path.id,
      railPlacementMode: "mapTargetBetweenPoints",
      trackStartPoint: {
        x: 0,
        y: 1,
        z: 2
      },
      trackEndPoint: {
        x: 10,
        y: 1,
        z: 2
      },
      railStartProgress: 0.2,
      railEndProgress: 0.8
    });

    invalidPlacementRig.railPlacementMode = "diagonal";
    invalidMappedRig.trackStartPoint = {
      x: Number.NaN,
      y: 1,
      z: 2
    };
    invalidMappedRig.trackEndPoint = {
      x: 10,
      y: Number.POSITIVE_INFINITY,
      z: 2
    };
    invalidMappedRig.railStartProgress = -0.1;
    invalidMappedRig.railEndProgress = 1.1;

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      paths: {
        [path.id]: path
      },
      entities: {
        [invalidPlacementRig.id]: invalidPlacementRig,
        [invalidMappedRig.id]: invalidMappedRig
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-camera-rig-rail-placement-mode"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-track-start-point"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-track-end-point"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-rail-start-progress"
        }),
        expect.objectContaining({
          code: "invalid-camera-rig-rail-end-progress"
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
        warnings: [
          "Background images work best as a 2:1 equirectangular panorama."
        ]
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

  it("allows dawn and dusk image backgrounds to omit a direct asset id", () => {
    const document = createEmptySceneDocument();
    document.world.timeOfDay.dawn.background = {
      mode: "image",
      assetId: "",
      environmentIntensity: 0.55
    };
    document.world.timeOfDay.dusk.background = {
      mode: "image",
      assetId: "",
      environmentIntensity: 0.45
    };

    const validation = validateSceneDocument(document);

    expect(
      validation.errors.some(
        (diagnostic) =>
          diagnostic.path === "world.timeOfDay.dawn.background.assetId" ||
          diagnostic.path === "world.timeOfDay.dusk.background.assetId"
      )
    ).toBe(false);
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
    document.world.showCelestialBodies = "yes" as unknown as boolean;
    document.world.ambientLight.intensity = -0.25;
    document.world.celestialOrbits.sun.azimuthDegrees = 400;
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
          code: "invalid-world-show-celestial-bodies",
          path: "world.showCelestialBodies"
        }),
        expect.objectContaining({
          code: "invalid-world-ambient-intensity",
          path: "world.ambientLight.intensity"
        }),
        expect.objectContaining({
          code: "invalid-world-sun-orbit-azimuth",
          path: "world.celestialOrbits.sun.azimuthDegrees"
        }),
        expect.objectContaining({
          code: "invalid-world-sun-direction",
          path: "world.sunLight.direction"
        })
      ])
    );
  });

  it("detects invalid shader sky settings and rejects phase-local shader backgrounds", () => {
    const document = createEmptySceneDocument();
    document.world.background = {
      mode: "shader"
    };
    document.world.shaderSky.dayTopColorHex = "bad-color" as `#${string}`;
    document.world.shaderSky.horizonHeight = 0.75;
    document.world.shaderSky.stars.horizonFadeOffset = 0.75;
    document.world.shaderSky.celestial.sunDiscSizeDegrees = 0;
    document.world.shaderSky.clouds.coverage = 2;
    document.world.shaderSky.aurora.intensity = -1;
    document.world.shaderSky.aurora.primaryColorHex =
      "bad-color" as `#${string}`;
    document.world.timeOfDay.dawn.background = {
      mode: "shader"
    } as typeof document.world.timeOfDay.dawn.background;

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-world-shader-sky-day-top-color",
          path: "world.shaderSky.dayTopColorHex"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-horizon-height",
          path: "world.shaderSky.horizonHeight"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-star-horizon-fade-offset",
          path: "world.shaderSky.stars.horizonFadeOffset"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-sun-disc-size",
          path: "world.shaderSky.celestial.sunDiscSizeDegrees"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-cloud-coverage",
          path: "world.shaderSky.clouds.coverage"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-aurora-intensity",
          path: "world.shaderSky.aurora.intensity"
        }),
        expect.objectContaining({
          code: "invalid-world-shader-sky-aurora-primary-color",
          path: "world.shaderSky.aurora.primaryColorHex"
        }),
        expect.objectContaining({
          code: "invalid-dawn-background-mode",
          path: "world.timeOfDay.dawn.background.mode"
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
      dynamicGlobalIllumination: {
        ...document.world.advancedRendering.dynamicGlobalIllumination,
        enabled: "yes",
        intensity: -0.25,
        radius: Number.NaN,
        quality: "ultra"
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
      },
      distanceFog: {
        ...document.world.advancedRendering.distanceFog,
        enabled: "yes",
        colorHex: "mist",
        nearDistance: Number.NaN,
        farDistance: 0,
        strength: 1.5,
        renderDistance: -2,
        skyBlend: 1.5,
        horizonStrength: -0.2,
        heightFalloff: Number.NaN
      },
      godRays: {
        ...document.world.advancedRendering.godRays,
        enabled: "yes",
        intensity: -0.1,
        decay: 1.5,
        exposure: -0.2,
        density: Number.NaN,
        sourceSize: 0,
        samples: 0
      },
      foliage: {
        ...document.world.advancedRendering.foliage,
        enabled: "yes",
        densityMultiplier: 3,
        maxDistanceMultiplier: 0,
        shadows: "close"
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
          code: "invalid-advanced-rendering-dynamic-gi-enabled",
          path: "world.advancedRendering.dynamicGlobalIllumination.enabled"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-dynamic-gi-intensity",
          path: "world.advancedRendering.dynamicGlobalIllumination.intensity"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-dynamic-gi-radius",
          path: "world.advancedRendering.dynamicGlobalIllumination.radius"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-dynamic-gi-quality",
          path: "world.advancedRendering.dynamicGlobalIllumination.quality"
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
          code: "invalid-advanced-rendering-distance-fog-enabled",
          path: "world.advancedRendering.distanceFog.enabled"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-color",
          path: "world.advancedRendering.distanceFog.colorHex"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-near-distance",
          path: "world.advancedRendering.distanceFog.nearDistance"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-far-distance",
          path: "world.advancedRendering.distanceFog.farDistance"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-strength",
          path: "world.advancedRendering.distanceFog.strength"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-render-distance",
          path: "world.advancedRendering.distanceFog.renderDistance"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-sky-blend",
          path: "world.advancedRendering.distanceFog.skyBlend"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-horizon-strength",
          path: "world.advancedRendering.distanceFog.horizonStrength"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-distance-fog-height-falloff",
          path: "world.advancedRendering.distanceFog.heightFalloff"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-enabled",
          path: "world.advancedRendering.godRays.enabled"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-intensity",
          path: "world.advancedRendering.godRays.intensity"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-decay",
          path: "world.advancedRendering.godRays.decay"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-exposure",
          path: "world.advancedRendering.godRays.exposure"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-density",
          path: "world.advancedRendering.godRays.density"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-source-size",
          path: "world.advancedRendering.godRays.sourceSize"
        }),
        expect.objectContaining({
          code: "invalid-advanced-rendering-god-rays-samples",
          path: "world.advancedRendering.godRays.samples"
        }),
        expect.objectContaining({
          code: "invalid-foliage-quality-enabled",
          path: "world.advancedRendering.foliage.enabled"
        }),
        expect.objectContaining({
          code: "invalid-foliage-quality-density-multiplier",
          path: "world.advancedRendering.foliage.densityMultiplier"
        }),
        expect.objectContaining({
          code: "invalid-foliage-quality-max-distance-multiplier",
          path: "world.advancedRendering.foliage.maxDistanceMultiplier"
        }),
        expect.objectContaining({
          code: "invalid-foliage-quality-shadows",
          path: "world.advancedRendering.foliage.shadows"
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
    const invalidLightBrush = createBoxBrush({
      id: "brush-invalid-volume-light"
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
    (invalidLightBrush as any).volume = {
      mode: "light",
      light: {
        colorHex: "light",
        intensity: Number.NaN,
        padding: -0.25,
        falloff: "ease"
      }
    };

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      brushes: {
        [invalidModeBrush.id]: invalidModeBrush,
        [invalidWaterBrush.id]: invalidWaterBrush,
        [invalidFogBrush.id]: invalidFogBrush,
        [invalidLightBrush.id]: invalidLightBrush
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
        }),
        expect.objectContaining({
          code: "invalid-box-light-color",
          path: "brushes.brush-invalid-volume-light.volume.light.colorHex"
        }),
        expect.objectContaining({
          code: "invalid-box-light-intensity",
          path: "brushes.brush-invalid-volume-light.volume.light.intensity"
        }),
        expect.objectContaining({
          code: "invalid-box-light-padding",
          path: "brushes.brush-invalid-volume-light.volume.light.padding"
        }),
        expect.objectContaining({
          code: "invalid-box-light-falloff",
          path: "brushes.brush-invalid-volume-light.volume.light.falloff"
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
