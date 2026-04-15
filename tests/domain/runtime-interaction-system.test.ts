import { describe, expect, it } from "vitest";

import { createEmptyRuntimeControlSurfaceDefinition } from "../../src/controls/control-surface";
import {
  createEmptyProjectSequenceLibrary,
  createProjectSequence
} from "../../src/sequencer/project-sequences";
import {
  createNpcEntity,
  createPlayerStartInputBindings,
  createPlayerStartMovementTemplate
} from "../../src/entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createRunSequenceInteractionLink,
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
    sequences: createEmptyProjectSequenceLibrary(),
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

function createRuntimeNpcFixture(options: {
  entityId: string;
  dialogueId: string;
  title: string;
  text: string;
  speakerName?: string | null;
}): RuntimeSceneDefinition["entities"]["npcs"][number] {
  return {
    entityId: options.entityId,
    actorId: `${options.entityId}-actor`,
    name: undefined,
    visible: true,
    modelAssetId: null,
    dialogues: [
      {
        id: options.dialogueId,
        title: options.title,
        lines: [
          {
            id: `${options.dialogueId}-line-1`,
            speakerName: options.speakerName ?? null,
            text: options.text
          }
        ]
      }
    ],
    defaultDialogueId: options.dialogueId,
    authoredPosition: { x: 0, y: 0, z: 0 },
    authoredYawDegrees: 0,
    active: true,
    activeRoutineId: null,
    activeRoutineTitle: null,
    position: { x: 0, y: 0, z: 0 },
    yawDegrees: 0,
    animationClipName: null,
    animationLoop: undefined,
    resolvedPath: null,
    collider: {
      mode: "capsule",
      radius: 0.3,
      height: 1.8,
      eyeHeight: 1.6
    }
  };
}

function createDispatcher(
  overrides: Partial<RuntimeInteractionDispatcher> = {}
): RuntimeInteractionDispatcher {
  return {
    teleportPlayer: () => {},
    startSceneTransition: () => {},
    toggleBrushVisibility: () => {},
    playAnimation: () => {},
    stopAnimation: () => {},
    playSound: () => {},
    stopSound: () => {},
    startNpcDialogue: () => {},
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
        startSceneTransition: () => {},
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
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
        startSceneTransition: () => {},
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
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
        startSceneTransition: () => {
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
        startSceneTransition: () => {
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
        startSceneTransition: () => {
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
        startSceneTransition: () => {
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
        startSceneTransition: () => {
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
      }
    );

    expect(dispatches).toEqual([
      "link-play-sound:entity-sound-lobby",
      "link-stop-sound:entity-sound-lobby"
    ]);
  });

  it("dispatches make-npc-talk sequences for authored interaction links", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.npcs = [
      createRuntimeNpcFixture({
        entityId: "entity-npc-console",
        dialogueId: "dialogue-console",
        title: "Console",
        speakerName: "System",
        text: "Access granted."
      })
    ];
    runtimeScene.sequences.sequences["sequence-console-dialogue"] =
      createProjectSequence({
        id: "sequence-console-dialogue",
        title: "Console Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-console",
            dialogueId: "dialogue-console"
          }
        ]
      });
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-run-sequence-dialogue",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        sequenceId: "sequence-console-dialogue"
      })
    ];

    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      createDispatcher({
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${npcEntityId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual([
      "link-run-sequence-dialogue:entity-npc-console:dialogue-console"
    ]);
  });

  it("dispatches run-sequence links through authored impulse steps", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.npcs = [
      {
        ...createNpcEntity({
          id: "entity-npc-sequence",
          dialogues: [
            {
              id: "dialogue-sequence",
              title: "Sequence Dialogue",
              lines: [
                {
                  id: "dialogue-line-sequence-1",
                  speakerName: "Console",
                  text: "Sequence started."
                }
              ]
            }
          ],
          defaultDialogueId: "dialogue-sequence"
        }),
        active: true,
        activeRoutineId: null,
        activeRoutineTitle: null,
        authoredPosition: { x: 0, y: 0, z: 0 },
        authoredYawDegrees: 0,
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        yawDegrees: 0,
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];
    runtimeScene.sequences.sequences["sequence-console-dialogue"] =
      createProjectSequence({
        id: "sequence-console-dialogue",
        title: "Console Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-sequence",
            dialogueId: "dialogue-sequence"
          }
        ]
      });
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-run-sequence-dialogue",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        sequenceId: "sequence-console-dialogue"
      })
    ];

    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      createDispatcher({
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${npcEntityId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual([
      "link-run-sequence-dialogue:entity-npc-sequence:dialogue-sequence"
    ]);
  });

  it("treats interactable sequence links as click interactions even when the stored trigger is non-click", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.npcs = [
      {
        ...createNpcEntity({
          id: "entity-npc-console",
          dialogues: [
            {
              id: "dialogue-console",
              title: "Console",
              lines: [
                {
                  id: "dialogue-line-console-1",
                  speakerName: "System",
                  text: "Console online."
                }
              ]
            }
          ],
          defaultDialogueId: "dialogue-console"
        }),
        active: true,
        activeRoutineId: null,
        activeRoutineTitle: null,
        authoredPosition: { x: 0, y: 0, z: 0 },
        authoredYawDegrees: 0,
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        yawDegrees: 0,
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];
    runtimeScene.sequences.sequences["sequence-console-dialogue"] =
      createProjectSequence({
        id: "sequence-console-dialogue",
        title: "Console Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-console",
            dialogueId: "dialogue-console"
          }
        ]
      });
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-run-sequence-console",
        sourceEntityId: "entity-interactable-console",
        trigger: "enter",
        sequenceId: "sequence-console-dialogue"
      })
    ];

    const interactionSystem = new RuntimeInteractionSystem();
    const prompt = interactionSystem.resolveClickInteractionPrompt(
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
    );

    expect(prompt).toEqual(
      expect.objectContaining({
        sourceEntityId: "entity-interactable-console",
        prompt: "Use Console"
      })
    );

    const dispatches: string[] = [];
    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      createDispatcher({
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(
            `${source?.kind}:${source?.sourceEntityId}:${source?.trigger}:${npcEntityId}:${dialogueId}`
          );
        }
      })
    );

    expect(dispatches).toEqual([
      "interactionLink:entity-interactable-console:enter:entity-npc-console:dialogue-console"
    ]);
  });

  it("dispatches trigger-volume make-npc-talk sequences once on enter", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.npcs = [
      {
        ...createNpcEntity({
          id: "entity-npc-threshold",
          dialogues: [
            {
              id: "dialogue-threshold",
              title: "Threshold",
              lines: [
                {
                  id: "dialogue-line-threshold-1",
                  speakerName: null,
                  text: "You crossed the threshold."
                }
              ]
            }
          ],
          defaultDialogueId: "dialogue-threshold"
        }),
        active: true,
        activeRoutineId: null,
        activeRoutineTitle: null,
        authoredPosition: { x: 0, y: 0, z: 0 },
        authoredYawDegrees: 0,
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        yawDegrees: 0,
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];
    runtimeScene.sequences.sequences["sequence-trigger-dialogue"] =
      createProjectSequence({
        id: "sequence-trigger-dialogue",
        title: "Trigger Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-threshold",
            dialogueId: "dialogue-threshold"
          }
        ]
      });
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-trigger-sequence",
        sourceEntityId: "entity-trigger-main",
        trigger: "enter",
        sequenceId: "sequence-trigger-dialogue"
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
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${npcEntityId}:${dialogueId}`);
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
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${npcEntityId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual([
      "link-trigger-sequence:entity-npc-threshold:dialogue-threshold"
    ]);
  });

  it("treats trigger-volume sequence links authored with click as enter interactions", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.npcs = [
      {
        ...createNpcEntity({
          id: "entity-npc-threshold",
          dialogues: [
            {
              id: "dialogue-threshold",
              title: "Threshold",
              lines: [
                {
                  id: "dialogue-line-threshold-1",
                  speakerName: null,
                  text: "Welcome."
                }
              ]
            }
          ],
          defaultDialogueId: "dialogue-threshold"
        }),
        active: true,
        activeRoutineId: null,
        activeRoutineTitle: null,
        authoredPosition: { x: 0, y: 0, z: 0 },
        authoredYawDegrees: 0,
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        yawDegrees: 0,
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];
    runtimeScene.sequences.sequences["sequence-trigger-dialogue"] =
      createProjectSequence({
        id: "sequence-trigger-dialogue",
        title: "Trigger Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-threshold",
            dialogueId: "dialogue-threshold"
          }
        ]
      });
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-trigger-sequence-click",
        sourceEntityId: "entity-trigger-main",
        trigger: "click",
        sequenceId: "sequence-trigger-dialogue"
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
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(
            `${source?.kind}:${source?.sourceEntityId}:${source?.trigger}:${npcEntityId}:${dialogueId}`
          );
        }
      })
    );

    expect(dispatches).toEqual([
      "interactionLink:entity-trigger-main:click:entity-npc-threshold:dialogue-threshold"
    ]);
  });

  it("treats the player body segment as entering a trigger volume, not just the feet point", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.entities.triggerVolumes = [
      {
        entityId: "entity-trigger-chest-height",
        position: {
          x: 0,
          y: 1.2,
          z: 0
        },
        size: {
          x: 2,
          y: 1,
          z: 2
        },
        triggerOnEnter: true,
        triggerOnExit: false
      }
    ];
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-body-trigger-sequence",
        sourceEntityId: "entity-trigger-chest-height",
        trigger: "enter",
        sequenceId: "sequence-trigger-dialogue"
      })
    ];
    runtimeScene.entities.npcs = [
      {
        ...createNpcEntity({
          id: "entity-npc-threshold",
          dialogues: [
            {
              id: "dialogue-threshold",
              title: "Threshold",
              lines: [
                {
                  id: "dialogue-line-threshold-1",
                  speakerName: null,
                  text: "Welcome."
                }
              ]
            }
          ],
          defaultDialogueId: "dialogue-threshold"
        }),
        active: true,
        activeRoutineId: null,
        activeRoutineTitle: null,
        authoredPosition: { x: 0, y: 0, z: 0 },
        authoredYawDegrees: 0,
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        yawDegrees: 0,
        animationClipName: null,
        animationLoop: undefined,
        resolvedPath: null
      }
    ];
    runtimeScene.sequences.sequences["sequence-trigger-dialogue"] =
      createProjectSequence({
        id: "sequence-trigger-dialogue",
        title: "Trigger Dialogue Sequence",
        effects: [
          {
            stepClass: "impulse",
            type: "makeNpcTalk",
            npcEntityId: "entity-npc-threshold",
            dialogueId: "dialogue-threshold"
          }
        ]
      });

    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.updatePlayerPosition(
      {
        feetPosition: {
          x: 0,
          y: 0,
          z: 0
        },
        eyePosition: {
          x: 0,
          y: 1.6,
          z: 0
        }
      },
      runtimeScene,
      createDispatcher({
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(`${source?.linkId}:${npcEntityId}:${dialogueId}`);
        }
      })
    );

    expect(dispatches).toEqual([
      "link-body-trigger-sequence:entity-npc-threshold:dialogue-threshold"
    ]);
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
        dialogues: [
          {
            id: "dialogue-merchant",
            title: "Merchant Greeting",
            lines: [
              {
                id: "dialogue-merchant-line-1",
                speakerName: "Merchant",
                text: "Fresh goods."
              }
            ]
          }
        ],
        defaultDialogueId: "dialogue-merchant",
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
        startNpcDialogue: (npcEntityId, dialogueId, source) => {
          dispatches.push(
            `${source?.kind}:${source?.sourceEntityId}:${source?.trigger}:${npcEntityId}:${dialogueId}`
          );
        }
      })
    );

    expect(dispatches).toEqual([
      "npc:entity-npc-merchant:click:entity-npc-merchant:dialogue-merchant"
    ]);
  });

  it("shows a click prompt for interactables that run a scene transition sequence", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.sequences = {
      sequences: {
        "sequence-enter-house": createProjectSequence({
          id: "sequence-enter-house",
          title: "Enter House",
          effects: [
            {
              stepClass: "impulse",
              type: "startSceneTransition",
              targetSceneId: "scene-house",
              targetEntryEntityId: "entity-scene-entry-house-front"
            }
          ]
        })
      }
    };
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-enter-house",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        sequenceId: "sequence-enter-house"
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
  });

  it("dispatches scene transition requests for interactable scene transition sequences", () => {
    const runtimeScene = createRuntimeSceneFixture();
    runtimeScene.sequences = {
      sequences: {
        "sequence-enter-house": createProjectSequence({
          id: "sequence-enter-house",
          title: "Enter House",
          effects: [
            {
              stepClass: "impulse",
              type: "startSceneTransition",
              targetSceneId: "scene-house",
              targetEntryEntityId: "entity-scene-entry-house-front"
            }
          ]
        })
      }
    };
    runtimeScene.interactionLinks = [
      createRunSequenceInteractionLink({
        id: "link-enter-house",
        sourceEntityId: "entity-interactable-console",
        trigger: "click",
        sequenceId: "sequence-enter-house"
      })
    ];
    const dispatches: string[] = [];
    const interactionSystem = new RuntimeInteractionSystem();

    interactionSystem.dispatchClickInteraction(
      "entity-interactable-console",
      runtimeScene,
      {
        teleportPlayer: () => {
          throw new Error("Teleport should not dispatch for a scene transition.");
        },
        startSceneTransition: (request) => {
          dispatches.push(
            `${request.sourceEntityId}:${request.targetSceneId}:${request.targetEntryEntityId}`
          );
        },
        toggleBrushVisibility: () => {
          throw new Error("Visibility should not dispatch for a scene transition.");
        },
        playAnimation: () => {},
        stopAnimation: () => {},
        playSound: () => {},
        stopSound: () => {},
      }
    );

    expect(dispatches).toEqual([
      "entity-interactable-console:scene-house:entity-scene-entry-house-front"
    ]);
  });
});
