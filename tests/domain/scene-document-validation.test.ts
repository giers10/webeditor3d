import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import {
  createPointLightEntity,
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord, type ModelAssetRecord } from "../../src/assets/project-assets";

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
          position: {
            x: 0,
            y: Number.NaN,
            z: 0
          },
          yawDegrees: Number.NaN,
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
          enabled: "yes" as unknown as boolean
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
          code: "invalid-interactable-enabled"
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
});
