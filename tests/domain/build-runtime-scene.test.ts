import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink } from "../../src/interactions/interaction-links";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey } from "../../src/assets/project-assets";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

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
      yawDegrees: 90
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-lobby",
      position: {
        x: -1,
        y: 1,
        z: 0
      },
      radius: 8,
      gain: 0.75,
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
      enabled: true
    });
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

    const document = {
      ...createEmptySceneDocument({ name: "Runtime Slice" }),
      brushes: {
        [brush.id]: brush
      },
      assets: {
        [modelAsset.id]: modelAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [playerStart.id]: playerStart,
        [soundEmitter.id]: soundEmitter,
        [triggerVolume.id]: triggerVolume,
        [teleportTarget.id]: teleportTarget,
        [interactable.id]: interactable
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
        })
      }
    };
    document.world.background = {
      mode: "verticalGradient",
      topColorHex: "#5f7693",
      bottomColorHex: "#11161d"
    };
    document.world.ambientLight.intensity = 0.55;
    document.world.sunLight.direction = {
      x: -0.8,
      y: 1.2,
      z: 0.1
    };

    const runtimeScene = buildRuntimeSceneFromDocument(document);

    expect(runtimeScene.world).toEqual(document.world);
    expect(runtimeScene.world).not.toBe(document.world);
    expect(runtimeScene.world.sunLight.direction).not.toBe(document.world.sunLight.direction);
    expect(runtimeScene.brushes).toHaveLength(1);
    expect(runtimeScene.modelInstances).toEqual([
      {
        instanceId: "model-instance-triangle",
        assetId: "asset-model-triangle",
        name: undefined,
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
    expect(runtimeScene.brushes[0].faces.posY.material?.id).toBe("starter-concrete-checker");
    expect(runtimeScene.colliders).toEqual([
      {
        kind: "box",
        brushId: "brush-room-floor",
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
    ]);
    expect(runtimeScene.sceneBounds).toEqual({
      min: {
        x: -4,
        y: -1,
        z: -4
      },
      max: {
        x: 4,
        y: 0,
        z: 4
      },
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
    expect(runtimeScene.entities).toEqual({
      playerStarts: [
        {
          entityId: "entity-player-start-main",
          position: {
            x: 2,
            y: 0,
            z: -1
          },
          yawDegrees: 90
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
          radius: 8,
          gain: 0.75,
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
          triggerOnExit: false
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
          enabled: true
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
        id: "link-teleport",
        sourceEntityId: "entity-trigger-door",
        trigger: "enter",
        action: {
          type: "teleportPlayer",
          targetEntityId: "entity-teleport-target-main"
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
      yawDegrees: 90
    });
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
    expect(runtimeScene.entities).toEqual({
      playerStarts: [],
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
});
