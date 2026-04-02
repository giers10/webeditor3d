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
import { createProjectAssetStorageKey } from "../../src/assets/project-assets";

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
          yawDegrees: Number.NaN
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
          radius: Number.NaN
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
          code: "invalid-sound-emitter-radius"
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
});
