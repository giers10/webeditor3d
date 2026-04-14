import { describe, expect, it } from "vitest";

import { createEmptyRuntimeControlSurfaceDefinition } from "../../src/controls/control-surface";
import { createEmptyProjectDialogueLibrary } from "../../src/dialogues/project-dialogues";
import {
  createPlayerStartInputBindings,
  createPlayerStartMovementTemplate
} from "../../src/entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createStartDialogueInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink,
  createStopAnimationInteractionLink,
  createStopSoundInteractionLink
} from "../../src/interactions/interaction-links";
import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { createEmptyProjectScheduler } from "../../src/scheduler/project-scheduler";
import { RuntimeInteractionSystem } from "../../src/runtime-three/runtime-interaction-system";
import { createRuntimeProjectSchedulerState } from "../../src/runtime-three/runtime-project-scheduler";
import type { RuntimeSceneDefinition } from "../../src/runtime-three/runtime-scene-build";
import type { RuntimeInteractionDispatcher } from "../../src/runtime-three/runtime-interaction-system";

function createRuntimeSceneFixture(): RuntimeSceneDefinition {
  const movementTemplate = createPlayerStartMovementTemplate();

  return {
    time: createDefaultProjectTimeSettings(),
    scheduler: createRuntimeProjectSchedulerState({
      document: createEmptyProjectScheduler()
    }),
    dialogues: createEmptyProjectDialogueLibrary(),
    world: {
      ...createDefaultWorldSettings(),
      background: {
        mode: "solid",
        colorHex: "#000000"
      },
      ambientLight: {
        colorHex: "#ffffff",
        intensity: 1
      },
      sunLight: {
        colorHex: "#ffffff",
        intensity: 1,
        direction: {
          x: 0,
          y: 1,
          z: 0
        }
      }
    },
    brushes: [],
    volumes: {
      fog: [],
      water: []
    },
    staticColliders: [],
    colliders: [],
    sceneBounds: null,
    playerInputBindings: createPlayerStartInputBindings(),
    localLights: {
      pointLights: [],
      spotLights: []
    },
    modelInstances: [],
    paths: [],
    npcDefinitions: [],
    entities: {
      playerStarts: [],
      sceneEntries: [],
      npcs: [],
      soundEmitters: [
        {
          entityId: "entity-sound-lobby",
          position: {
            x: 0,
            y: 1,
            z: 0
          },
          audioAssetId: "asset-audio-lobby",
          volume: 0.75,
          refDistance: 6,
          maxDistance: 24,
          autoplay: false,
          loop: true
        }
      ],
      triggerVolumes: [
        {
          entityId: "entity-trigger-main",
          position: {
            x: 0,
            y: 0,
            z: 0
          },
          size: {
            x: 2,
            y: 2,
            z: 2
          },
          triggerOnEnter: true,
          triggerOnExit: true
        }
      ],
      teleportTargets: [
        {
          entityId: "entity-teleport-main",
          position: {
            x: 8,
            y: 0,
            z: -4
          },
          yawDegrees: 180
        }
      ],
      interactables: [
        {
          entityId: "entity-interactable-console",
          position: {
            x: 0,
            y: 1,
            z: 1
          },
          radius: 2,
          prompt: "Use Console",
          interactionEnabled: true
        },
        {
          entityId: "entity-interactable-disabled",
          position: {
            x: 0.25,
            y: 1,
            z: 1
          },
          radius: 2,
          prompt: "Disabled Prompt",
          interactionEnabled: false
        }
      ],
      sceneExits: []
    },
    interactionLinks: [],
    control: createEmptyRuntimeControlSurfaceDefinition(),
    playerStart: null,
    playerCollider: {
      mode: "capsule",
      radius: 0.3,
      height: 1.8,
      eyeHeight: 1.6
    },
    playerMovement: {
      templateKind: "default",
      moveSpeed: movementTemplate.moveSpeed,
      maxSpeed: movementTemplate.maxSpeed,
      maxStepHeight: movementTemplate.maxStepHeight,
      capabilities: movementTemplate.capabilities,
      jump: movementTemplate.jump,
      sprint: movementTemplate.sprint,
      crouch: movementTemplate.crouch
    },
    navigationMode: "thirdPerson",
    spawn: {
      source: "fallback",
      entityId: null,
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      yawDegrees: 0
    }
  };
}

function createDispatcher(
  overrides: Partial<RuntimeInteractionDispatcher> = {}
): RuntimeInteractionDispatcher {
  return {
    teleportPlayer: () => {},
    activateSceneExit: () => {},
    toggleBrushVisibility: () => {},
    playAnimation: () => {},
    stopAnimation: () => {},
    playSound: () => {},
    stopSound: () => {},
    startDialogue: () => {},
    ...overrides
  };
}

describe("RuntimeInteractionSystem", () => {
  it("dispatches teleport player on Trigger Volume enter", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createTeleportPlayerInteractionLink({
        id: "link-teleport",
        sourceEntityId: "entity-trigger-main",
        trigger: "enter",
        targetEntityId: "entity-teleport-main"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: string[] = [];

    interactionSystem.updatePlayerPosition(
      {
        x: 0,
        y: 0,
        z: 0
      },
      runtimeScene,
      {
        teleportPlayer: (target, link) => {
          dispatches.push(`${link.id}:${target.entityId}:${target.position.x}`);
        },
        activateSceneExit: () => {},
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );
    interactionSystem.updatePlayerPosition(
      {
        x: 0.25,
        y: 0,
        z: 0.25
      },
      runtimeScene,
      {
        teleportPlayer: (target, link) => {
          dispatches.push(`${link.id}:${target.entityId}:${target.position.x}`);
        },
        activateSceneExit: () => {},
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual(["link-teleport:entity-teleport-main:8"]);
  });

  it("dispatches animation actions with the authored target model instance and clip", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createPlayAnimationInteractionLink({
        id: "link-play-animation",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetModelInstanceId: "model-instance-animated",
        clipName: "Walk",
        loop: false
      }),
      createStopAnimationInteractionLink({
        id: "link-stop-animation",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetModelInstanceId: "model-instance-animated"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: string[] = [];

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch in this fixture.");
        },
        activateSceneExit: () => {
          throw new Error("Scene exit should not dispatch in this fixture.");
        },
        toggleBrushVisibility: () => {
          throw new Error("Visibility should not dispatch in this fixture.");
        },
        playAnimation: (instanceId, clipName, loop, link) => {
          dispatches.push(
            `${link.id}:${instanceId}:${clipName}:${loop === false ? "once" : "loop"}`
          );
        },
        stopAnimation: (instanceId, link) => {
          dispatches.push(`${link.id}:${instanceId}`);
        },
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual([
      "link-play-animation:model-instance-animated:Walk:once",
      "link-stop-animation:model-instance-animated"
    ]);
  });

  it("dispatches visibility actions only when exiting an occupied Trigger Volume", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createToggleVisibilityInteractionLink({
        id: "link-hide-door",
        sourceEntityId: "entity-trigger-main",
        trigger: "exit",
        targetBrushId: "brush-door",
        visible: false
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: Array<{ brushId: string; visible: boolean | undefined }> =
      [];

    interactionSystem.updatePlayerPosition(
      {
        x: 0,
        y: 0,
        z: 0
      },
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch in this fixture.");
        },
        activateSceneExit: () => {
          throw new Error("Scene exit should not dispatch in this fixture.");
        },
        toggleBrushVisibility: (brushId, visible) => {
          dispatches.push({
            brushId,
            visible
          });
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );
    interactionSystem.updatePlayerPosition(
      {
        x: 3,
        y: 0,
        z: 0
      },
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch in this fixture.");
        },
        activateSceneExit: () => {
          throw new Error("Scene exit should not dispatch in this fixture.");
        },
        toggleBrushVisibility: (brushId, visible) => {
          dispatches.push({
            brushId,
            visible
          });
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual([
      {
        brushId: "brush-door",
        visible: false
      }
    ]);
  });

  it("shows a click prompt only for enabled interactables with authored click links inside range", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createTeleportPlayerInteractionLink({
        id: "link-click-teleport",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetEntityId: "entity-teleport-main"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();

    expect(
      interactionSystem.resolveClickInteractionPrompt(
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 0,
          z: 1
        },
        runtimeScene
      )
    ).toEqual({
      sourceEntityId: "entity-interactable-console",
      prompt: "Use Console",
      distance: expect.any(Number),
      range: 2
    });

    expect(
      interactionSystem.resolveClickInteractionPrompt(
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 1,
          y: 0,
          z: 0
        },
        runtimeScene
      )
    ).toBeNull();
  });

  it("uses the player eye for interaction range while aiming with a third-person camera ray", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createTeleportPlayerInteractionLink({
        id: "link-click-teleport",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetEntityId: "entity-teleport-main"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();

    expect(
      interactionSystem.resolveClickInteractionPrompt(
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 1.6,
          z: -2
        },
        {
          x: 0,
          y: 0,
          z: 1
        },
        runtimeScene
      )
    ).toEqual({
      sourceEntityId: "entity-interactable-console",
      prompt: "Use Console",
      distance: expect.any(Number),
      range: 2
    });
  });

  it("dispatches click actions for the targeted Interactable", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createTeleportPlayerInteractionLink({
        id: "link-click-teleport",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetEntityId: "entity-teleport-main"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: string[] = [];

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      {
        teleportPlayer: (target, link) => {
          dispatches.push(`${link.id}:${target.entityId}:${target.position.x}`);
        },
        activateSceneExit: () => {
          throw new Error(
            "Scene exit should not dispatch for this click fixture."
          );
        },
        toggleBrushVisibility: () => {
          throw new Error(
            "Visibility should not dispatch for this click fixture."
          );
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual(["link-click-teleport:entity-teleport-main:8"]);
  });

  it("dispatches play and stop sound actions for the targeted Sound Emitter", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.interactionLinks = [
      createPlaySoundInteractionLink({
        id: "link-play-sound",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetSoundEmitterId: "entity-sound-lobby"
      }),
      createStopSoundInteractionLink({
        id: "link-stop-sound",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        targetSoundEmitterId: "entity-sound-lobby"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const dispatches: string[] = [];

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch in this fixture.");
        },
        activateSceneExit: () => {
          throw new Error("Scene exit should not dispatch in this fixture.");
        },
        toggleBrushVisibility: () => {
          throw new Error("Visibility should not dispatch in this fixture.");
        },
        playAnimation: () => {
          throw new Error("Animation should not dispatch in this fixture.");
        },
        stopAnimation: () => {
          throw new Error("Animation should not dispatch in this fixture.");
        },
        playSound: (soundEmitterId, link) => {
          dispatches.push(`${link.id}:${soundEmitterId}`);
        },
        stopSound: (soundEmitterId, link) => {
          dispatches.push(`${link.id}:${soundEmitterId}`);
        },
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual([
      "link-play-sound:entity-sound-lobby",
      "link-stop-sound:entity-sound-lobby"
    ]);
  });

  it("dispatches start dialogue actions for authored interaction links", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.dialogues.dialogues["dialogue-console"] = {
      id: "dialogue-console",
      title: "Console",
      lines: [
        {
          id: "dialogue-line-1",
          speakerName: "System",
          text: "Access granted."
        }
      ]
    };
    runtimeScene.interactionLinks = [
      createStartDialogueInteractionLink({
        id: "link-start-dialogue",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        dialogueId: "dialogue-console"
      })
    ];

    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      createDispatcher({
        startDialogue: (dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual(["link-start-dialogue:dialogue-console"]);
  });

  it("dispatches trigger-volume dialogue starts once on enter", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.dialogues.dialogues["dialogue-threshold"] = {
      id: "dialogue-threshold",
      title: "Threshold",
      lines: [
        {
          id: "dialogue-line-threshold-1",
          speakerName: null,
          text: "You crossed the threshold."
        }
      ]
    };
    runtimeScene.interactionLinks = [
      createStartDialogueInteractionLink({
        id: "link-trigger-dialogue",
        sourceEntityId: "entity-trigger-main",
        trigger: "enter",
        dialogueId: "dialogue-threshold"
      })
    ];

    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.updatePlayerPosition(
      {
        x: 0,
        y: 0,
        z: 0
      },
      runtimeScene,
      createDispatcher({
        startDialogue: (dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${dialogueId}`);
        }
      })
    );
    interactionSystem.updatePlayerPosition(
      {
        x: 0.25,
        y: 0,
        z: 0.25
      },
      runtimeScene,
      createDispatcher({
        startDialogue: (dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual(["link-trigger-dialogue:dialogue-threshold"]);
  });

  it("resolves direct NPC dialogue prompts and dispatches them through the shared start path", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.interactables = [];
    runtimeScene.entities.npcs = [
      {
        entityId: "entity-npc-merchant",
        actorId: "actor-merchant",
        name: "Merchant",
        visible: true,
        position: {
          x: 0,
          y: 1,
          z: 1.5
        },
        yawDegrees: 180,
        modelAssetId: null,
        dialogueId: "dialogue-merchant",
        collider: {
          mode: "capsule",
          radius: 0.3,
          height: 1.8,
          eyeHeight: 1.6
        },
        activeRoutineTitle: "Greeting",
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const prompt = interactionSystem.resolveClickInteractionPrompt(
      {
        x: 0,
        y: 1,
        z: 0
      },
      {
        x: 0,
        y: 1.6,
        z: 0
      },
      {
        x: 0,
        y: 0,
        z: 1
      },
      runtimeScene
    );

    expect(prompt).toEqual(
      expect.objectContaining({
        sourceEntityId: "entity-npc-merchant",
        prompt: "Talk to Merchant"
      })
    );

    const dispatches: string[] = [];
    interactionSystem.dispatchClickInteraction(
      "entity-npc-merchant",
      runtimeScene,
      createDispatcher({
        startDialogue: (dialogueId, source) => {
          dispatches.push(
            `${source?.kind}:${source?.sourceEntityId}:${dialogueId}`
          );
        }
      })
    );

    expect(dispatches).toEqual(["npc:entity-npc-merchant:dialogue-merchant"]);
  });

  it("shows a click prompt for enabled Scene Exits within range", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.sceneExits.push({
      entityId: "entity-scene-exit-house-door",
      position: {
        x: 0,
        y: 1,
        z: 1
      },
      radius: 2,
      prompt: "Enter House",
      interactionEnabled: true,
      targetSceneId: "scene-house",
      targetEntryEntityId: "entity-scene-entry-house-front"
    });
    runtimeScene.entities.interactables = [];

    const interactionSystem = new RuntimeInteractionSystem();

    expect(
      interactionSystem.resolveClickInteractionPrompt(
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 1.6,
          z: 0
        },
        {
          x: 0,
          y: 0,
          z: 1
        },
        runtimeScene
      )
    ).toEqual({
      sourceEntityId: "entity-scene-exit-house-door",
      prompt: "Enter House",
      distance: expect.any(Number),
      range: 2
    });
  });

  it("dispatches scene transition requests for Scene Exit click targets", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.sceneExits.push({
      entityId: "entity-scene-exit-house-door",
      position: {
        x: 0,
        y: 1,
        z: 1
      },
      radius: 2,
      prompt: "Enter House",
      interactionEnabled: true,
      targetSceneId: "scene-house",
      targetEntryEntityId: "entity-scene-entry-house-front"
    });
    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.dispatchClickInteraction(
      "entity-scene-exit-house-door",
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch for a scene exit.");
        },
        activateSceneExit: (sceneExit) => {
          dispatches.push(
            `${sceneExit.entityId}:${sceneExit.targetSceneId}:${sceneExit.targetEntryEntityId}`
          );
        },
        toggleBrushVisibility: () => {
          throw new Error("Visibility should not dispatch for a scene exit.");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
        startDialogue: () => {}
      }
    );

    expect(dispatches).toEqual([
      "entity-scene-exit-house-door:scene-house:entity-scene-entry-house-front"
    ]);
  });
});
