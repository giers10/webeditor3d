import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createPointLightEntity,
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink } from "../../src/interactions/interaction-links";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord } from "../../src/assets/project-assets";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";

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
      enabled: true
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

    const document = {
      ...createEmptySceneDocument({ name: "Runtime Slice" }),
      brushes: {
        [brush.id]: brush
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
        [soundEmitter.id]: soundEmitter,
        [triggerVolume.id]: triggerVolume,
        [teleportTarget.id]: teleportTarget,
        [interactable.id]: interactable,
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
        })
      }
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
    expect(runtimeScene.brushes[0].rotationDegrees).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
    expect(runtimeScene.brushes[0].faces.posY.material?.id).toBe("starter-concrete-checker");
    expect(runtimeScene.colliders).toHaveLength(1);
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
          yawDegrees: 90,
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
          enabled: true
        }
      ]
    });
    expect(runtimeScene.localLights).toEqual({
      pointLights: [
        {
          entityId: "entity-point-light-main",
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
      yawDegrees: 90,
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
    expect(runtimeScene.playerCollider).toEqual({
      mode: "box",
      eyeHeight: 1.4,
      size: {
        x: 0.8,
        y: 1.6,
        z: 0.7
      }
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
    expect(runtimeScene.playerCollider).toEqual({
      mode: "capsule",
      radius: 0.3,
      height: 1.8,
      eyeHeight: 1.6
    });
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
          foamContactLimit: 6
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
});
