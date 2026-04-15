import { describe, expect, it } from "vitest";
import { AnimationClip, BoxGeometry, PlaneGeometry } from "three";

import {
  createActorControlTargetRef,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect,
  createSetActorPresenceControlEffect
} from "../../src/controls/control-surface";
import { createBoxBrush } from "../../src/document/brushes";
import { createScenePath } from "../../src/document/paths";
import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  DEFAULT_PLAYER_START_MOVE_SPEED,
  DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
  createNpcEntity,
  createPointLightEntity,
  createInteractableEntity,
  createPlayerStartMovementTemplate,
  createPlayerStartInputBindings,
  createPlayerStartEntity,
  createSceneEntryEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createStartDialogueInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord } from "../../src/assets/project-assets";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";

const defaultMovementTemplate = createPlayerStartMovementTemplate();

describe("buildRuntimeSceneFromDocument", () => {
  it("builds runtime brush data, colliders, and an authored player spawn from the document", () => {
    const brush = createBoxBrush({
      id: "brush-room-floor",
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      size: {
        x: 8,
        y: 1,
        z: 8
      }
    });
    brush.faces.posY.materialId = "starter-concrete-checker";

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90,
      collider: {
        mode: "box",
        eyeHeight: 1.4,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.8,
          y: 1.6,
          z: 0.7
        }
      }
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-lobby",
      position: {
        x: -1,
        y: 1,
        z: 0
      },
      audioAssetId: "asset-audio-lobby",
      volume: 0.75,
      refDistance: 8,
      maxDistance: 24,
      autoplay: true,
      loop: false
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-door",
      position: {
        x: 0,
        y: 1,
        z: 2
      },
      size: {
        x: 2,
        y: 2,
        z: 1
      },
      triggerOnEnter: true,
      triggerOnExit: false
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-target-main",
      position: {
        x: 6,
        y: 0,
        z: -3
      },
      yawDegrees: 270
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-console",
      position: {
        x: 1,
        y: 1,
        z: 1
      },
      radius: 1.5,
      prompt: "Use Console",
      interactionEnabled: true
    });
    const sceneEntry = createSceneEntryEntity({
      id: "entity-scene-entry-house-front",
      position: {
        x: -3,
        y: 0,
        z: 2
      },
      yawDegrees: 135
    });
    const npc = createNpcEntity({
      id: "entity-npc-guide",
      actorId: "actor-house-guide",
      position: {
        x: -1,
        y: 0,
        z: -2
      },
      yawDegrees: 45,
      modelAssetId: "asset-model-triangle"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      position: {
        x: 2,
        y: 3,
        z: 1
      }
    });
    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-main",
      position: {
        x: -2,
        y: 4,
        z: 0
      },
      direction: {
        x: 0.2,
        y: -1,
        z: 0.1
      }
    });
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
        warnings: []
      }
    };
    const audioAsset = {
      id: "asset-audio-lobby",
      kind: "audio" as const,
      sourceName: "lobby-loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-lobby"),
      byteLength: 4096,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 3.25,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const modelAsset = {
      id: "asset-model-triangle",
      kind: "model" as const,
      sourceName: "tiny-triangle.gltf",
      mimeType: "model/gltf+json",
      storageKey: createProjectAssetStorageKey("asset-model-triangle"),
      byteLength: 36,
      metadata: {
        kind: "model" as const,
        format: "gltf" as const,
        sceneName: "Fixture Triangle Scene",
        nodeCount: 2,
        meshCount: 1,
        materialNames: ["Fixture Material"],
        textureNames: [],
        animationNames: [],
        boundingBox: {
          min: {
            x: 0,
            y: 0,
            z: 0
          },
          max: {
            x: 1,
            y: 1,
            z: 0
          },
          size: {
            x: 1,
            y: 1,
            z: 0
          }
        },
        warnings: []
      }
    };
    const modelInstance = createModelInstance({
      id: "model-instance-triangle",
      assetId: modelAsset.id,
      position: {
        x: -2,
        y: 0,
        z: 4
      },
      rotationDegrees: {
        x: 0,
        y: 90,
        z: 0
      },
      scale: {
        x: 2,
        y: 2,
        z: 2
      }
    });
    const path = createScenePath({
      id: "path-lobby-route",
      name: "Lobby Route",
      points: [
        {
          id: "path-point-a",
          position: {
            x: -2,
            y: 0,
            z: -2
          }
        },
        {
          id: "path-point-b",
          position: {
            x: -2,
            y: 0,
            z: 1
          }
        },
        {
          id: "path-point-c",
          position: {
            x: 2,
            y: 0,
            z: 1
          }
        }
      ]
    });

    const document = {
      ...createEmptySceneDocument({ name: "Runtime Slice" }),
      brushes: {
        [brush.id]: brush
      },
      paths: {
        [path.id]: path
      },
      assets: {
        [audioAsset.id]: audioAsset,
        [modelAsset.id]: modelAsset,
        [imageAsset.id]: imageAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc,
        [soundEmitter.id]: soundEmitter,
        [triggerVolume.id]: triggerVolume,
        [teleportTarget.id]: teleportTarget,
        [interactable.id]: interactable,
        [sceneEntry.id]: sceneEntry,
        [pointLight.id]: pointLight,
        [spotLight.id]: spotLight
      },
      interactionLinks: {
        "link-teleport": createTeleportPlayerInteractionLink({
          id: "link-teleport",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetEntityId: teleportTarget.id
        }),
        "link-hide-brush": createToggleVisibilityInteractionLink({
          id: "link-hide-brush",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetBrushId: brush.id,
          visible: false
        }),
        "link-click-teleport": createTeleportPlayerInteractionLink({
          id: "link-click-teleport",
          sourceEntityId: interactable.id,
          trigger: "click",
          targetEntityId: teleportTarget.id
        }),
        "link-interactable-dialogue": createStartDialogueInteractionLink({
          id: "link-interactable-dialogue",
          sourceEntityId: interactable.id,
          trigger: "click",
          dialogueId: "dialogue-warning"
        }),
        "link-trigger-dialogue": createStartDialogueInteractionLink({
          id: "link-trigger-dialogue",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          dialogueId: "dialogue-warning"
        })
      }
    };
    document.dialogues.dialogues["dialogue-warning"] = {
      id: "dialogue-warning",
      title: "Warning",
      lines: [
        {
          id: "dialogue-line-warning-1",
          speakerName: "Operator",
          text: "The generator is unstable."
        }
      ]
    };
    document.world.background = {
      mode: "image",
      assetId: imageAsset.id,
      environmentIntensity: 0.75
    };
    document.world.ambientLight.intensity = 0.55;
    document.world.sunLight.direction = {
      x: -0.8,
      y: 1.2,
      z: 0.1
    };
    document.time = {
      ...createDefaultProjectTimeSettings(),
      startTimeOfDayHours: 18.5,
      dayLengthMinutes: 16
    };

    const runtimeScene = buildRuntimeSceneFromDocument(document);

    expect(runtimeScene.time).toEqual(document.time);
    expect(runtimeScene.time).not.toBe(document.time);
    expect(runtimeScene.world).toEqual(document.world);
    expect(runtimeScene.world).not.toBe(document.world);
    expect(runtimeScene.world.sunLight.direction).not.toBe(document.world.sunLight.direction);
    expect(runtimeScene.brushes).toHaveLength(1);
    expect(runtimeScene.modelInstances).toEqual([
      {
        instanceId: "model-instance-triangle",
        assetId: "asset-model-triangle",
        name: undefined,
        visible: true,
        position: {
          x: -2,
          y: 0,
          z: 4
        },
        rotationDegrees: {
          x: 0,
          y: 90,
          z: 0
        },
        scale: {
          x: 2,
          y: 2,
          z: 2
        }
      }
    ]);
    expect(runtimeScene.paths).toEqual([
      {
        id: "path-lobby-route",
        name: "Lobby Route",
        visible: true,
        enabled: true,
        loop: false,
        points: [
          {
            pointId: "path-point-a",
            position: {
              x: -2,
              y: 0,
              z: -2
            }
          },
          {
            pointId: "path-point-b",
            position: {
              x: -2,
              y: 0,
              z: 1
            }
          },
          {
            pointId: "path-point-c",
            position: {
              x: 2,
              y: 0,
              z: 1
            }
          }
        ],
        segments: [
          {
            index: 0,
            startPointId: "path-point-a",
            endPointId: "path-point-b",
            start: {
              x: -2,
              y: 0,
              z: -2
            },
            end: {
              x: -2,
              y: 0,
              z: 1
            },
            length: 3,
            distanceStart: 0,
            distanceEnd: 3,
            tangent: {
              x: 0,
              y: 0,
              z: 1
            }
          },
          {
            index: 1,
            startPointId: "path-point-b",
            endPointId: "path-point-c",
            start: {
              x: -2,
              y: 0,
              z: 1
            },
            end: {
              x: 2,
              y: 0,
              z: 1
            },
            length: 4,
            distanceStart: 3,
            distanceEnd: 7,
            tangent: {
              x: 1,
              y: 0,
              z: 0
            }
          }
        ],
        totalLength: 7
      }
    ]);
    expect(runtimeScene.brushes[0].rotationDegrees).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
    expect(runtimeScene.brushes[0].faces.posY.material?.id).toBe("starter-concrete-checker");
    expect(runtimeScene.colliders).toHaveLength(2);
    expect(runtimeScene.colliders[0]).toMatchObject({
      kind: "trimesh",
      source: "brush",
      brushId: "brush-room-floor",
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      rotationDegrees: {
        x: 0,
        y: 0,
        z: 0
      },
      worldBounds: {
        min: {
          x: -4,
          y: -1,
          z: -4
        },
        max: {
          x: 4,
          y: 0,
          z: 4
        }
      }
    });
    const brushCollider = runtimeScene.colliders[0];
    if (brushCollider.kind !== "trimesh") {
      throw new Error(`Expected a trimesh brush collider, received ${brushCollider.kind}.`);
    }
    expect(Array.from(brushCollider.vertices)).toHaveLength(24);
    expect(Array.from(brushCollider.indices)).toHaveLength(36);
    expect(runtimeScene.sceneBounds).toEqual({
      min: {
        x: -4,
        y: -1,
        z: -4
      },
      max: {
        x: 4,
        y: 1.8,
        z: 4
      },
      center: {
        x: 0,
        y: 0.4,
        z: 0
      },
      size: {
        x: 8,
        y: 2.8,
        z: 8
      }
    });
    expect(runtimeScene.entities).toEqual({
      playerStarts: [
        {
          entityId: "entity-player-start-main",
          position: {
            x: 2,
            y: 0,
            z: -1
          },
          yawDegrees: 90,
          navigationMode: "firstPerson",
          movement: {
            templateKind: "default",
            moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
            maxSpeed: defaultMovementTemplate.maxSpeed,
            maxStepHeight: defaultMovementTemplate.maxStepHeight,
            capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
            jump: defaultMovementTemplate.jump,
            sprint: defaultMovementTemplate.sprint,
            crouch: defaultMovementTemplate.crouch
          },
          inputBindings: playerStart.inputBindings,
          collider: {
            mode: "box",
            eyeHeight: 1.4,
            size: {
              x: 0.8,
              y: 1.6,
              z: 0.7
            }
          }
        }
      ],
      sceneEntries: [
        {
          entityId: "entity-scene-entry-house-front",
          position: {
            x: -3,
            y: 0,
            z: 2
          },
          yawDegrees: 135
        }
      ],
      npcs: [
        {
          entityId: "entity-npc-guide",
          actorId: "actor-house-guide",
          name: undefined,
          visible: true,
          position: {
            x: -1,
            y: 0,
            z: -2
          },
        yawDegrees: 45,
        modelAssetId: modelAsset.id,
        dialogues: [],
        defaultDialogueId: null,
          activeRoutineTitle: null,
          animationClipName: null,
          animationLoop: undefined,
          resolvedPath: null,
          collider: {
            mode: "capsule",
            radius: 0.3,
            height: 1.8,
            eyeHeight: 1.6
          }
        }
      ],
      soundEmitters: [
        {
          entityId: "entity-sound-lobby",
          position: {
            x: -1,
            y: 1,
            z: 0
          },
          audioAssetId: audioAsset.id,
          volume: 0.75,
          refDistance: 8,
          maxDistance: 24,
          autoplay: true,
          loop: false
        }
      ],
      triggerVolumes: [
        {
          entityId: "entity-trigger-door",
          position: {
            x: 0,
            y: 1,
            z: 2
          },
          size: {
            x: 2,
            y: 2,
            z: 1
          },
          triggerOnEnter: true,
          triggerOnExit: true
        }
      ],
      teleportTargets: [
        {
          entityId: "entity-teleport-target-main",
          position: {
            x: 6,
            y: 0,
            z: -3
          },
          yawDegrees: 270
        }
      ],
      interactables: [
        {
          entityId: "entity-interactable-console",
          position: {
            x: 1,
            y: 1,
            z: 1
          },
          radius: 1.5,
          prompt: "Use Console",
          interactionEnabled: true
        }
      ]
    });
    expect(runtimeScene.localLights).toEqual({
      pointLights: [
        {
          entityId: "entity-point-light-main",
          enabled: true,
          position: {
            x: 2,
            y: 3,
            z: 1
          },
          colorHex: "#ffffff",
          intensity: 1.25,
          distance: 8
        }
      ],
      spotLights: [
        {
          entityId: "entity-spot-light-main",
          enabled: true,
          position: {
            x: -2,
            y: 4,
            z: 0
          },
          direction: {
            x: 0.2,
            y: -1,
            z: 0.1
          },
          colorHex: "#ffffff",
          intensity: 1.5,
          distance: 12,
          angleDegrees: 35
        }
      ]
    });
    expect(runtimeScene.interactionLinks).toEqual([
      {
        id: "link-click-teleport",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        action: {
          type: "teleportPlayer",
          targetEntityId: "entity-teleport-target-main"
        }
      },
      {
        id: "link-interactable-dialogue",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        action: {
          type: "startDialogue",
          dialogueId: "dialogue-warning"
        }
      },
      {
        id: "link-teleport",
        sourceEntityId: "entity-trigger-door",
        trigger: "enter",
        action: {
          type: "teleportPlayer",
          targetEntityId: "entity-teleport-target-main"
        }
      },
      {
        id: "link-trigger-dialogue",
        sourceEntityId: "entity-trigger-door",
        trigger: "enter",
        action: {
          type: "startDialogue",
          dialogueId: "dialogue-warning"
        }
      },
      {
        id: "link-hide-brush",
        sourceEntityId: "entity-trigger-door",
        trigger: "exit",
        action: {
          type: "toggleVisibility",
          targetBrushId: "brush-room-floor",
          visible: false
        }
      }
    ]);
    expect(runtimeScene.playerStart).toEqual({
      entityId: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90,
      navigationMode: "firstPerson",
      movement: {
        templateKind: "default",
        moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
        maxSpeed: defaultMovementTemplate.maxSpeed,
        maxStepHeight: defaultMovementTemplate.maxStepHeight,
        capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
        jump: defaultMovementTemplate.jump,
        sprint: defaultMovementTemplate.sprint,
        crouch: defaultMovementTemplate.crouch
      },
      inputBindings: playerStart.inputBindings,
      collider: {
        mode: "box",
        eyeHeight: 1.4,
        size: {
          x: 0.8,
          y: 1.6,
          z: 0.7
        }
      }
    });
    expect(runtimeScene.colliders[1]).toMatchObject({
      kind: "character",
      source: "npc",
      entityId: "entity-npc-guide",
      position: {
        x: -1,
        y: 0,
        z: -2
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      shape: {
        mode: "capsule",
        radius: 0.3,
        height: 1.8,
        eyeHeight: 1.6
      },
      worldBounds: {
        min: {
          x: -1.3,
          y: 0,
          z: -2.3
        },
        max: {
          x: -0.7,
          y: 1.8,
          z: -1.7
        }
      }
    });
    expect(runtimeScene.playerCollider).toEqual({
      mode: "box",
      eyeHeight: 1.4,
      size: {
        x: 0.8,
        y: 1.6,
        z: 0.7
      }
    });
    expect(runtimeScene.playerMovement).toEqual({
      templateKind: "default",
      moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
      maxSpeed: defaultMovementTemplate.maxSpeed,
      maxStepHeight: defaultMovementTemplate.maxStepHeight,
      capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
      jump: defaultMovementTemplate.jump,
      sprint: defaultMovementTemplate.sprint,
      crouch: defaultMovementTemplate.crouch
    });
    expect(runtimeScene.playerInputBindings).toEqual(playerStart.inputBindings);
    expect(runtimeScene.navigationMode).toBe("firstPerson");
    expect(runtimeScene.spawn).toEqual({
      source: "playerStart",
      entityId: "entity-player-start-main",
      position: {
        x: 2,
        y: 0,
        z: -1
      },
      yawDegrees: 90
    });
  });

  it("filters active NPCs from the project scheduler against the current runtime clock", () => {
    const alwaysNpc = createNpcEntity({
      id: "entity-npc-always",
      actorId: "actor-town-always"
    });
    const daytimeNpc = createNpcEntity({
      id: "entity-npc-daytime",
      actorId: "actor-town-daytime"
    });
    const overnightNpc = createNpcEntity({
      id: "entity-npc-overnight",
      actorId: "actor-town-overnight"
    });
    const document = {
      ...createEmptySceneDocument({ name: "NPC Presence Scene" }),
      entities: {
        [alwaysNpc.id]: alwaysNpc,
        [daytimeNpc.id]: daytimeNpc,
        [overnightNpc.id]: overnightNpc
      }
    };
    document.scheduler.routines["routine-daytime"] = createProjectScheduleRoutine({
      id: "routine-daytime",
      title: "Day Shift",
      target: createActorControlTargetRef(daytimeNpc.actorId),
      startHour: 9,
      endHour: 17,
      effect: createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(daytimeNpc.actorId),
        active: true
      })
    });
    document.scheduler.routines["routine-overnight"] = createProjectScheduleRoutine({
      id: "routine-overnight",
      title: "Night Shift",
      target: createActorControlTargetRef(overnightNpc.actorId),
      startHour: 22,
      endHour: 2,
      effect: createSetActorPresenceControlEffect({
        target: createActorControlTargetRef(overnightNpc.actorId),
        active: true
      })
    });

    const daytimeRuntimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: {
        timeOfDayHours: 10,
        dayCount: 2,
        dayLengthMinutes: 24
      }
    });
    const overnightRuntimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: {
        timeOfDayHours: 23.5,
        dayCount: 2,
        dayLengthMinutes: 24
      }
    });

    expect(
      daytimeRuntimeScene.entities.npcs.map((npc) => npc.entityId)
    ).toEqual([
      "entity-npc-always",
      "entity-npc-daytime",
      "entity-npc-overnight"
    ]);
    expect(
      daytimeRuntimeScene.npcDefinitions.map((npc) => ({
        entityId: npc.entityId,
        active: npc.active
      }))
    ).toEqual([
      {
        entityId: "entity-npc-always",
        active: true
      },
      {
        entityId: "entity-npc-daytime",
        active: true
      },
      {
        entityId: "entity-npc-overnight",
        active: true
      }
    ]);
    expect(
      daytimeRuntimeScene.colliders
        .filter((collider) => collider.source === "npc")
        .map((collider) => collider.entityId)
    ).toEqual([
      "entity-npc-always",
      "entity-npc-daytime",
      "entity-npc-overnight"
    ]);

    expect(
      overnightRuntimeScene.entities.npcs.map((npc) => npc.entityId)
    ).toEqual([
      "entity-npc-always",
      "entity-npc-daytime",
      "entity-npc-overnight"
    ]);
    expect(
      overnightRuntimeScene.colliders
        .filter((collider) => collider.source === "npc")
        .map((collider) => collider.entityId)
    ).toEqual([
      "entity-npc-always",
      "entity-npc-daytime",
      "entity-npc-overnight"
    ]);
    expect(
      overnightRuntimeScene.entities.npcs.find(
        (npc) => npc.entityId === overnightNpc.id
      )
    ).toEqual(
      expect.objectContaining({
        activeRoutineTitle: "Night Shift"
      })
    );
  });

  it("builds a deterministic fallback spawn when no PlayerStart is authored", () => {
    const brush = createBoxBrush({
      id: "brush-room-wall",
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 6,
        y: 2,
        z: 6
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Fallback Runtime Scene" }),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(runtimeScene.playerStart).toBeNull();
    expect(runtimeScene.playerCollider).toEqual({
      mode: "capsule",
      radius: 0.3,
      height: 1.8,
      eyeHeight: 1.6
    });
    expect(runtimeScene.playerMovement).toEqual({
      templateKind: "default",
      moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
      maxSpeed: defaultMovementTemplate.maxSpeed,
      maxStepHeight: defaultMovementTemplate.maxStepHeight,
      capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
      jump: defaultMovementTemplate.jump,
      sprint: defaultMovementTemplate.sprint,
      crouch: defaultMovementTemplate.crouch
    });
    expect(runtimeScene.playerInputBindings).toEqual(
      createPlayerStartInputBindings()
    );
    expect(runtimeScene.navigationMode).toBe("thirdPerson");
    expect(runtimeScene.entities).toEqual({
      playerStarts: [],
      sceneEntries: [],
      npcs: [],
      soundEmitters: [],
      triggerVolumes: [],
      teleportTargets: [],
      interactables: []
    });
    expect(runtimeScene.interactionLinks).toEqual([]);
    expect(runtimeScene.spawn).toEqual({
      source: "fallback",
      entityId: null,
      position: {
        x: 0,
        y: 2.1,
        z: 6
      },
      yawDegrees: 180
    });
  });

  it("blocks first-person runtime builds when PlayerStart is missing", () => {
    expect(() =>
      buildRuntimeSceneFromDocument(createEmptySceneDocument({ name: "Missing Player Start" }), {
        navigationMode: "firstPerson"
      })
    ).toThrow("First-person run requires an authored Player Start");
  });

  it("uses the authored Player Start navigation mode for third-person scenes", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-third-person",
      navigationMode: "thirdPerson"
    });

    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Authored Third Person Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    });

    expect(runtimeScene.navigationMode).toBe("thirdPerson");
    expect(runtimeScene.playerStart?.navigationMode).toBe("thirdPerson");
    expect(runtimeScene.entities.playerStarts[0]?.navigationMode).toBe(
      "thirdPerson"
    );
  });

  it("keeps hidden authored objects active but excludes disabled authored objects from the runtime build", () => {
    const hiddenBrush = createBoxBrush({
      id: "brush-hidden-runtime",
      visible: false
    });
    const disabledBrush = createBoxBrush({
      id: "brush-disabled-runtime",
      enabled: false
    });
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry(
      "asset-authored-state-runtime",
      new BoxGeometry(1, 1, 1)
    );
    const hiddenModelInstance = createModelInstance({
      id: "model-instance-hidden-runtime",
      assetId: asset.id,
      visible: false,
      collision: {
        mode: "static",
        visible: false
      }
    });
    const disabledModelInstance = createModelInstance({
      id: "model-instance-disabled-runtime",
      assetId: asset.id,
      enabled: false,
      collision: {
        mode: "static",
        visible: false
      }
    });
    const disabledPlayerStart = createPlayerStartEntity({
      id: "entity-player-start-disabled-runtime",
      enabled: false,
      position: {
        x: -4,
        y: 0,
        z: 0
      }
    });
    const enabledPlayerStart = createPlayerStartEntity({
      id: "entity-player-start-enabled-runtime",
      position: {
        x: 4,
        y: 0,
        z: 0
      }
    });
    const hiddenInteractable = createInteractableEntity({
      id: "entity-interactable-hidden-runtime",
      visible: false,
      interactionEnabled: true,
      prompt: "Hidden but active"
    });
    const disabledInteractable = createInteractableEntity({
      id: "entity-interactable-disabled-runtime",
      enabled: false,
      interactionEnabled: true,
      prompt: "Disabled"
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-target-runtime",
      position: {
        x: 12,
        y: 0,
        z: 0
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Authored State Runtime Scene" }),
        assets: {
          [asset.id]: asset
        },
        brushes: {
          [hiddenBrush.id]: hiddenBrush,
          [disabledBrush.id]: disabledBrush
        },
        modelInstances: {
          [hiddenModelInstance.id]: hiddenModelInstance,
          [disabledModelInstance.id]: disabledModelInstance
        },
        entities: {
          [disabledPlayerStart.id]: disabledPlayerStart,
          [enabledPlayerStart.id]: enabledPlayerStart,
          [hiddenInteractable.id]: hiddenInteractable,
          [disabledInteractable.id]: disabledInteractable,
          [teleportTarget.id]: teleportTarget
        },
        interactionLinks: {
          "link-hidden-click": createTeleportPlayerInteractionLink({
            id: "link-hidden-click",
            sourceEntityId: hiddenInteractable.id,
            trigger: "click",
            targetEntityId: teleportTarget.id
          }),
          "link-disabled-click": createTeleportPlayerInteractionLink({
            id: "link-disabled-click",
            sourceEntityId: disabledInteractable.id,
            trigger: "click",
            targetEntityId: teleportTarget.id
          })
        }
      },
      {
        navigationMode: "firstPerson",
        loadedModelAssets: {
          [asset.id]: loadedAsset
        }
      }
    );

    expect(runtimeScene.playerStart?.entityId).toBe(enabledPlayerStart.id);
    expect(runtimeScene.brushes.map((brush) => brush.id)).toEqual([hiddenBrush.id]);
    expect(runtimeScene.brushes[0]?.visible).toBe(false);
    expect(runtimeScene.modelInstances).toEqual([
      expect.objectContaining({
        instanceId: hiddenModelInstance.id,
        assetId: asset.id,
        visible: false
      })
    ]);
    expect(
      runtimeScene.entities.interactables.map((entity) => entity.entityId)
    ).toEqual([hiddenInteractable.id]);
    expect(runtimeScene.colliders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "brush",
          brushId: hiddenBrush.id
        }),
        expect.objectContaining({
          source: "modelInstance",
          instanceId: hiddenModelInstance.id,
          assetId: asset.id
        })
      ])
    );
    expect(runtimeScene.interactionLinks.map((link) => link.id)).toEqual([
      "link-hidden-click"
    ]);
  });

  it("uses a requested Scene Entry as the runtime spawn without replacing the Player Start collider", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      yawDegrees: 90
    });
    const sceneEntry = createSceneEntryEntity({
      id: "entity-scene-entry-basement-door",
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 270
    });

    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Scene Entry Spawn" }),
        entities: {
          [playerStart.id]: playerStart,
          [sceneEntry.id]: sceneEntry
        }
      },
      {
        navigationMode: "firstPerson",
        sceneEntryId: sceneEntry.id
      }
    );

    expect(runtimeScene.playerStart?.entityId).toBe(playerStart.id);
    expect(runtimeScene.spawn).toEqual({
      source: "sceneEntry",
      entityId: sceneEntry.id,
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 270
    });
  });

  it("adds generated imported-model colliders to the runtime scene build", () => {
    const floorBrush = createBoxBrush({
      id: "brush-runtime-floor",
      center: {
        x: 0,
        y: -0.5,
        z: 0
      },
      size: {
        x: 8,
        y: 1,
        z: 8
      }
    });
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-runtime-collider", new BoxGeometry(1, 2, 1));
    const modelInstance = createModelInstance({
      id: "model-instance-runtime-collider",
      assetId: asset.id,
      position: {
        x: 2,
        y: 1,
        z: 0
      },
      collision: {
        mode: "static",
        visible: true
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Imported Collider Scene" }),
        assets: {
          [asset.id]: asset
        },
        brushes: {
          [floorBrush.id]: floorBrush
        },
        modelInstances: {
          [modelInstance.id]: modelInstance
        }
      },
      {
        loadedModelAssets: {
          [asset.id]: loadedAsset
        }
      }
    );

    expect(runtimeScene.colliders).toHaveLength(2);
    expect(runtimeScene.colliders[1]).toMatchObject({
      source: "modelInstance",
      instanceId: modelInstance.id,
      assetId: asset.id,
      kind: "trimesh",
      mode: "static",
      visible: true
    });
    expect(runtimeScene.sceneBounds?.max.y).toBeGreaterThanOrEqual(2);
  });

  it("adds static-simple imported-model colliders as compound box pieces", () => {
    const wallGeometry = new PlaneGeometry(4, 4, 4, 4);
    wallGeometry.rotateY(Math.PI * 0.5);
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-runtime-static-simple", wallGeometry);
    const modelInstance = createModelInstance({
      id: "model-instance-runtime-static-simple",
      assetId: asset.id,
      position: {
        x: 2,
        y: 2,
        z: 0
      },
      collision: {
        mode: "static-simple",
        visible: true
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument(
      {
        ...createEmptySceneDocument({ name: "Imported Static Simple Collider Scene" }),
        assets: {
          [asset.id]: asset
        },
        modelInstances: {
          [modelInstance.id]: modelInstance
        }
      },
      {
        loadedModelAssets: {
          [asset.id]: loadedAsset
        }
      }
    );

    expect(runtimeScene.colliders).toHaveLength(1);
    expect(runtimeScene.colliders[0]).toMatchObject({
      source: "modelInstance",
      instanceId: modelInstance.id,
      assetId: asset.id,
      kind: "compound",
      mode: "static-simple",
      visible: true,
      decomposition: "surface-voxel-boxes"
    });

    if (runtimeScene.colliders[0].source !== "modelInstance" || runtimeScene.colliders[0].kind !== "compound") {
      throw new Error("Expected the runtime collider to be a generated compound model collider.");
    }

    expect(runtimeScene.colliders[0].pieces.every((piece) => piece.kind === "box")).toBe(true);
  });

  it("preserves rotated whitebox box transforms for runner rendering and collision bounds", () => {
    const brush = createBoxBrush({
      id: "brush-rotated-room",
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.75
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      size: {
        x: 2,
        y: 2,
        z: 4
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Rotated Whitebox Scene" }),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(runtimeScene.brushes[0]).toMatchObject({
      center: brush.center,
      rotationDegrees: brush.rotationDegrees,
      size: brush.size
    });
    expect(runtimeScene.colliders[0]).toMatchObject({
      kind: "trimesh",
      source: "brush",
      brushId: brush.id,
      center: brush.center,
      rotationDegrees: brush.rotationDegrees
    });
    expect(runtimeScene.sceneBounds?.min.x).toBeCloseTo(-0.8713203436);
    expect(runtimeScene.sceneBounds?.max.x).toBeCloseTo(3.3713203436);
    expect(runtimeScene.sceneBounds?.min.z).toBeCloseTo(-2.8713203436);
    expect(runtimeScene.sceneBounds?.max.z).toBeCloseTo(1.3713203436);
  });

  it("builds non-blocking water and fog volumes from whitebox boxes", () => {
    const solidBrush = createBoxBrush({
      id: "brush-solid",
      center: {
        x: 0,
        y: 0,
        z: 0
      },
      size: {
        x: 6,
        y: 1,
        z: 6
      }
    });
    const waterBrush = createBoxBrush({
      id: "brush-water",
      center: {
        x: 2,
        y: 0.5,
        z: 1
      },
      size: {
        x: 3,
        y: 2,
        z: 3
      },
      volume: {
        mode: "water",
        water: {
          colorHex: "#2f79c4",
          surfaceOpacity: 0.7,
          waveStrength: 0.35,
          foamContactLimit: 6,
          surfaceDisplacementEnabled: false
        }
      }
    });
    const fogBrush = createBoxBrush({
      id: "brush-fog",
      center: {
        x: -2,
        y: 1,
        z: -1
      },
      size: {
        x: 4,
        y: 3,
        z: 2
      },
      volume: {
        mode: "fog",
        fog: {
          colorHex: "#99aac4",
          density: 0.55,
          padding: 0.25
        }
      }
    });

    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Volume Runtime Scene" }),
      brushes: {
        [solidBrush.id]: solidBrush,
        [waterBrush.id]: waterBrush,
        [fogBrush.id]: fogBrush
      }
    });

    expect(runtimeScene.brushes).toHaveLength(3);
    expect(runtimeScene.colliders).toHaveLength(1);
    expect(runtimeScene.colliders[0]).toMatchObject({
      source: "brush",
      brushId: solidBrush.id
    });
    expect(runtimeScene.volumes.water).toEqual([
      {
        brushId: waterBrush.id,
        center: waterBrush.center,
        rotationDegrees: waterBrush.rotationDegrees,
        size: waterBrush.size,
        colorHex: "#2f79c4",
        surfaceOpacity: 0.7,
        waveStrength: 0.35
      }
    ]);
    expect(runtimeScene.volumes.fog).toEqual([
      {
        brushId: fogBrush.id,
        center: fogBrush.center,
        rotationDegrees: fogBrush.rotationDegrees,
        size: fogBrush.size,
        colorHex: "#99aac4",
        density: 0.55,
        padding: 0.25
      }
    ]);
  });

  it("resolves active actor routines into NPC animation and deterministic follow-path pose", () => {
    const actorTarget = createActorControlTargetRef("actor-patroller");
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry(
      "asset-npc-patroller",
      new BoxGeometry(0.8, 1.8, 0.6)
    );
    asset.metadata.animationNames = ["Walk"];
    loadedAsset.animations = [new AnimationClip("Walk", 1, [])];
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: actorTarget.actorId,
      modelAssetId: asset.id,
      dialogues: [
        {
          id: "dialogue-patrol",
          title: "Patrol",
          lines: [
            {
              id: "dialogue-line-patrol-1",
              speakerName: "Guard",
              text: "All clear."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-patrol",
      yawDegrees: 15
    });
    const path = createScenePath({
      id: "path-patrol",
      points: [
        {
          id: "path-point-start",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-end",
          position: {
            x: 8,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const document = createEmptySceneDocument();
    document.assets[asset.id] = asset;
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

    const runtimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: {
        timeOfDayHours: 11,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      loadedModelAssets: {
        [asset.id]: loadedAsset
      }
    });

    expect(runtimeScene.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        active: true,
        activeRoutineTitle: "Patrolling",
        animationClipName: "Walk",
        yawDegrees: 90,
        position: {
          x: 4,
          y: 0,
          z: 0
        },
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 0.5,
          elapsedHours: 2,
          yawDegrees: 90
        })
      })
    );
    expect(runtimeScene.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        animationClipName: "Walk",
        defaultDialogueId: "dialogue-patrol",
        dialogues: expect.arrayContaining([
          expect.objectContaining({
            id: "dialogue-patrol"
          })
        ]),
        position: {
          x: 4,
          y: 0,
          z: 0
        },
        activeRoutineTitle: "Patrolling",
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 0.5
        })
      })
    ]);
  });
});
