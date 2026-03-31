import { describe, expect, it } from "vitest";

import { createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink } from "../../src/interactions/interaction-links";
import { RuntimeInteractionSystem } from "../../src/runtime-three/runtime-interaction-system";
import type { RuntimeSceneDefinition } from "../../src/runtime-three/runtime-scene-build";

function createRuntimeSceneFixture(): RuntimeSceneDefinition {
  return {
    world: {
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
    colliders: [],
    sceneBounds: null,
    modelInstances: [],
    entities: {
      playerStarts: [],
      soundEmitters: [],
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
          enabled: true
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
          enabled: false
        }
      ]
    },
    interactionLinks: [],
    playerStart: null,
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
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        }
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
        toggleBrushVisibility: () => {
          dispatches.push("toggle");
        }
      }
    );

    expect(dispatches).toEqual(["link-teleport:entity-teleport-main:8"]);
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
    const dispatches: Array<{ brushId: string; visible: boolean | undefined }> = [];

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
        toggleBrushVisibility: (brushId, visible) => {
          dispatches.push({
            brushId,
            visible
          });
        }
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
        toggleBrushVisibility: (brushId, visible) => {
          dispatches.push({
            brushId,
            visible
          });
        }
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
          x: 1,
          y: 0,
          z: 0
        },
        runtimeScene
      )
    ).toBeNull();
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

    interactionSystem.dispatchClickInteraction("entity-interactable-console", runtimeScene, {
      teleportPlayer: (target, link) => {
        dispatches.push(`${link.id}:${target.entityId}:${target.position.x}`);
      },
      toggleBrushVisibility: () => {
        throw new Error("Visibility should not dispatch for this click fixture.");
      }
    });

    expect(dispatches).toEqual(["link-click-teleport:entity-teleport-main:8"]);
  });
});
