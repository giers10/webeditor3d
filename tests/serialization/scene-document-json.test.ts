import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import {
  ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION,
  FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION,
  LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION,
  MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION,
  WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  createEmptySceneDocument
} from "../../src/document/scene-document";
import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createPointLightEntity,
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink, createPlayAnimationInteractionLink, createStopAnimationInteractionLink } from "../../src/interactions/interaction-links";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ImageAssetRecord, type ModelAssetRecord } from "../../src/assets/project-assets";
import { parseSceneDocumentJson, serializeSceneDocument } from "../../src/serialization/scene-document-json";

describe("scene document JSON", () => {
  it("round-trips the current empty schema", () => {
    const document = createEmptySceneDocument({ name: "Bootstrap Scene" });
    const serializedDocument = serializeSceneDocument(document);

    expect(parseSceneDocumentJson(serializedDocument)).toEqual(document);
  });

  it("round-trips a document containing a canonical box brush", () => {
    const brush = createBoxBrush({
      id: "brush-box-room",
      name: "Entry Room",
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 4,
        y: 2,
        z: 6
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Brush Scene" }),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips per-face material and UV state", () => {
    const brush = createBoxBrush({
      id: "brush-face-room",
      center: {
        x: 2,
        y: 2,
        z: -1
      },
      size: {
        x: 6,
        y: 4,
        z: 8
      }
    });

    brush.faces.posX.materialId = "starter-amber-grid";
    brush.faces.posX.uv = {
      offset: {
        x: 0.5,
        y: -0.25
      },
      scale: {
        x: 0.25,
        y: 0.5
      },
      rotationQuarterTurns: 3,
      flipU: true,
      flipV: true
    };

    const document = {
      ...createEmptySceneDocument({ name: "Face UV Scene" }),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips authored world environment settings", () => {
    const document = createEmptySceneDocument({ name: "World Environment Scene" });
    document.world.background = {
      mode: "verticalGradient",
      topColorHex: "#6a87ab",
      bottomColorHex: "#151b23"
    };
    document.world.ambientLight = {
      colorHex: "#d4e2ff",
      intensity: 0.45
    };
    document.world.sunLight = {
      colorHex: "#ffd8a6",
      intensity: 2.25,
      direction: {
        x: -1,
        y: 0.8,
        z: 0.2
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips authored local lights and an image background asset", () => {
    const imageAsset = {
      id: "asset-background-panorama",
      kind: "image",
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
    } satisfies ImageAssetRecord;
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      position: {
        x: 2,
        y: 3,
        z: 1
      },
      colorHex: "#ffddaa",
      intensity: 1.5,
      distance: 10
    });
    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-main",
      position: {
        x: -2,
        y: 4,
        z: 0
      },
      direction: {
        x: 0.25,
        y: -1,
        z: 0.15
      },
      colorHex: "#d6e6ff",
      intensity: 2,
      distance: 14,
      angleDegrees: 42
    });
    const document = {
      ...createEmptySceneDocument({ name: "Local Light and Background Scene" }),
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
      environmentIntensity: 0.75
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips a document containing an authored PlayerStart entity", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 135
    });
    const document = {
      ...createEmptySceneDocument({ name: "Player Start Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips the initial typed entity registry without mixing entities into model instances", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      position: {
        x: 1,
        y: 2,
        z: 3
      },
      radius: 7,
      gain: 0.6,
      autoplay: true,
      loop: true
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main",
      position: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 2,
        y: 3,
        z: 4
      }
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-main",
      position: {
        x: -3,
        y: 0,
        z: 5
      },
      yawDegrees: 180
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-main",
      position: {
        x: 2,
        y: 1,
        z: -2
      },
      radius: 1.25,
      prompt: "Open Door",
      enabled: true
    });
    const document = {
      ...createEmptySceneDocument({ name: "Typed Entity Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [soundEmitter.id]: soundEmitter,
        [triggerVolume.id]: triggerVolume,
        [teleportTarget.id]: teleportTarget,
        [interactable.id]: interactable
      }
    };

    const roundTripDocument = parseSceneDocumentJson(serializeSceneDocument(document));

    expect(roundTripDocument).toEqual(document);
    expect(roundTripDocument.modelInstances).toEqual({});
  });

  it("round-trips imported model assets and placed model instances", () => {
    const asset = {
      id: "asset-model-triangle",
      kind: "model",
      sourceName: "tiny-triangle.gltf",
      mimeType: "model/gltf+json",
      storageKey: createProjectAssetStorageKey("asset-model-triangle"),
      byteLength: 36,
      metadata: {
        kind: "model",
        format: "gltf",
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
    } satisfies ModelAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-triangle",
      assetId: asset.id,
      name: "Fixture Triangle",
      position: {
        x: 4,
        y: 2,
        z: -3
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      scale: {
        x: 1.5,
        y: 2,
        z: 1.5
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Imported Asset Scene" }),
      assets: {
        [asset.id]: asset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips canonical interaction links", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-main",
      prompt: "Use Console"
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-main"
    });
    const brush = createBoxBrush({
      id: "brush-door"
    });
    const document = {
      ...createEmptySceneDocument({ name: "Interaction Scene" }),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [interactable.id]: interactable,
        [teleportTarget.id]: teleportTarget
      },
      interactionLinks: {
        "link-teleport": createTeleportPlayerInteractionLink({
          id: "link-teleport",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetEntityId: teleportTarget.id
        }),
        "link-hide-door": createToggleVisibilityInteractionLink({
          id: "link-hide-door",
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

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("migrates the foundation schema to the current schema version", () => {
    const migratedDocument = migrateSceneDocument({
      version: 1,
      name: "Foundation Scene",
      world: createEmptySceneDocument().world,
      materials: {},
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes).toEqual({});
    expect(migratedDocument.name).toBe("Foundation Scene");
    expect(Object.keys(migratedDocument.materials)).toEqual(STARTER_MATERIAL_LIBRARY.map((material) => material.id));
  });

  it("migrates slice 3.0 documents to the current schema version without changing empty asset collections", () => {
    const migratedDocument = migrateSceneDocument({
      version: MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION,
      name: "Imported Asset Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.assets).toEqual({});
    expect(migratedDocument.modelInstances).toEqual({});
  });

  it("migrates slice 1.1 box brushes to explicit per-face UV state", () => {
    const migratedDocument = migrateSceneDocument({
      version: 2,
      name: "Legacy Brush Scene",
      world: createEmptySceneDocument().world,
      materials: {},
      textures: {},
      assets: {},
      brushes: {
        "brush-legacy": {
          id: "brush-legacy",
          kind: "box",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          size: {
            x: 4,
            y: 2,
            z: 6
          },
          faces: {
            posX: { materialId: null },
            negX: { materialId: null },
            posY: { materialId: null },
            negY: { materialId: null },
            posZ: { materialId: "starter-amber-grid" },
            negZ: { materialId: null }
          }
        }
      },
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes["brush-legacy"].faces.posZ.materialId).toBe("starter-amber-grid");
    expect(migratedDocument.brushes["brush-legacy"].faces.posZ.uv).toEqual({
      offset: {
        x: 0,
        y: 0
      },
      scale: {
        x: 1,
        y: 1
      },
      rotationQuarterTurns: 0,
      flipU: false,
      flipV: false
    });
  });

  it("migrates slice 1.2 face materials to the PlayerStart-capable schema", () => {
    const migratedDocument = migrateSceneDocument({
      version: 3,
      name: "Legacy Face Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities).toEqual({});
  });

  it("migrates runner-v1 documents to authored brush names without changing existing content", () => {
    const migratedDocument = migrateSceneDocument({
      version: 4,
      name: "Runner V1 Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {
        "brush-room-shell": {
          id: "brush-room-shell",
          kind: "box",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          size: {
            x: 4,
            y: 2,
            z: 6
          },
          faces: {
            posX: { materialId: null, uv: createBoxBrush().faces.posX.uv },
            negX: { materialId: null, uv: createBoxBrush().faces.negX.uv },
            posY: { materialId: null, uv: createBoxBrush().faces.posY.uv },
            negY: { materialId: null, uv: createBoxBrush().faces.negY.uv },
            posZ: { materialId: null, uv: createBoxBrush().faces.posZ.uv },
            negZ: { materialId: null, uv: createBoxBrush().faces.negZ.uv }
          }
        }
      },
      modelInstances: {},
      entities: {
        "entity-player-start-main": {
          id: "entity-player-start-main",
          kind: "playerStart",
          position: {
            x: 2,
            y: 0,
            z: -2
          },
          yawDegrees: 45
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes["brush-room-shell"].name).toBeUndefined();
    expect(migratedDocument.entities["entity-player-start-main"]).toMatchObject({
      kind: "playerStart",
      yawDegrees: 45
    });
  });

  it("migrates slice 1.4 documents to the world-environment schema without changing authored solid backgrounds", () => {
    const migratedDocument = migrateSceneDocument({
      version: FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION,
      name: "First Room Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.world.background).toEqual({
      mode: "solid",
      colorHex: "#2f3947"
    });
  });

  it("migrates slice 3.2 documents with local lights and skyboxes to the current schema version", () => {
    const imageAsset = {
      id: "asset-background-panorama",
      kind: "image",
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
    } satisfies ImageAssetRecord;
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main"
    });
    const spotLight = createSpotLightEntity({
      id: "entity-spot-light-main"
    });

    const migratedDocument = migrateSceneDocument({
      version: LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION,
      name: "Local Light Scene",
      world: {
        ...createEmptySceneDocument().world,
        background: {
          mode: "image",
          assetId: imageAsset.id
        }
      },
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {
        [imageAsset.id]: imageAsset
      },
      brushes: {},
      modelInstances: {},
      entities: {
        [pointLight.id]: pointLight,
        [spotLight.id]: spotLight
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.world.background).toEqual({
      mode: "image",
      assetId: imageAsset.id,
      environmentIntensity: 0.5
    });
    expect(migratedDocument.entities[pointLight.id]).toEqual(pointLight);
    expect(migratedDocument.entities[spotLight.id]).toEqual(spotLight);
    expect(migratedDocument.assets[imageAsset.id]).toEqual(imageAsset);
  });

  it("migrates slice 1.5 documents to the typed-entity schema without changing supported authored entities", () => {
    const migratedDocument = migrateSceneDocument({
      version: WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
      name: "World Environment Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {
        "entity-player-start-main": {
          id: "entity-player-start-main",
          kind: "playerStart",
          position: {
            x: 2,
            y: 0,
            z: -1
          },
          yawDegrees: 90
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities["entity-player-start-main"]).toMatchObject({
      kind: "playerStart",
      yawDegrees: 90
    });
  });

  it("migrates slice 2.1 documents to the interaction-link schema with empty interaction links", () => {
    const migratedDocument = migrateSceneDocument({
      version: ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION,
      name: "Entity Foundation Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {
        "entity-trigger-main": {
          id: "entity-trigger-main",
          kind: "triggerVolume",
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
          triggerOnExit: false
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.interactionLinks).toEqual({});
    expect(migratedDocument.entities["entity-trigger-main"]).toMatchObject({
      kind: "triggerVolume"
    });
  });

  it("migrates slice 2.2 documents to the click-capable interaction schema without changing existing links", () => {
    const migratedDocument = migrateSceneDocument({
      version: TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION,
      name: "Trigger Action Target Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {
        "entity-trigger-main": {
          id: "entity-trigger-main",
          kind: "triggerVolume",
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
          triggerOnExit: false
        },
        "entity-teleport-main": {
          id: "entity-teleport-main",
          kind: "teleportTarget",
          position: {
            x: 4,
            y: 0,
            z: -2
          },
          yawDegrees: 90
        }
      },
      interactionLinks: {
        "link-teleport": {
          id: "link-teleport",
          sourceEntityId: "entity-trigger-main",
          trigger: "enter",
          action: {
            type: "teleportPlayer",
            targetEntityId: "entity-teleport-main"
          }
        }
      }
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.interactionLinks).toEqual({
      "link-teleport": {
        id: "link-teleport",
        sourceEntityId: "entity-trigger-main",
        trigger: "enter",
        action: {
          type: "teleportPlayer",
          targetEntityId: "entity-teleport-main"
        }
      }
    });
  });

  it("migrates v11 documents to v12 with animation fields defaulted to undefined on model instances", () => {
    const asset = {
      id: "asset-model-anim",
      kind: "model",
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-anim"),
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

    const migratedDocument = migrateSceneDocument({
      version: 11,
      name: "V11 Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: { [asset.id]: asset },
      brushes: {},
      modelInstances: {
        "mi-1": {
          id: "mi-1",
          kind: "modelInstance",
          assetId: asset.id,
          position: { x: 0, y: 0, z: 0 },
          rotationDegrees: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }
      },
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.modelInstances["mi-1"].animationClipName).toBeUndefined();
    expect(migratedDocument.modelInstances["mi-1"].animationAutoplay).toBeUndefined();
  });

  it("round-trips a v12 document containing playAnimation and stopAnimation interaction links", () => {
    const asset = {
      id: "asset-model-anim",
      kind: "model",
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-anim"),
      byteLength: 1024,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: ["Walk", "Run"],
        boundingBox: null,
        warnings: []
      }
    };
    const modelInstance = createModelInstance({
      id: "mi-animated",
      assetId: asset.id,
      animationClipName: "Walk",
      animationAutoplay: true
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const playLink = createPlayAnimationInteractionLink({
      id: "link-play",
      sourceEntityId: triggerVolume.id,
      trigger: "enter",
      targetModelInstanceId: modelInstance.id,
      clipName: "Walk"
    });
    const stopLink = createStopAnimationInteractionLink({
      id: "link-stop",
      sourceEntityId: triggerVolume.id,
      trigger: "exit",
      targetModelInstanceId: modelInstance.id
    });
    const document = {
      ...createEmptySceneDocument({ name: "Animation Scene" }),
      assets: { [asset.id]: asset },
      modelInstances: { [modelInstance.id]: modelInstance },
      entities: { [triggerVolume.id]: triggerVolume },
      interactionLinks: {
        [playLink.id]: playLink,
        [stopLink.id]: stopLink
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("rejects a v12 document where a playAnimation action has an empty clipName", () => {
    const asset = {
      id: "asset-model-anim",
      kind: "model",
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-anim"),
      byteLength: 1024,
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
    };

    expect(() =>
      migrateSceneDocument({
        version: SCENE_DOCUMENT_VERSION,
        name: "Bad Animation Scene",
        world: createEmptySceneDocument().world,
        materials: createEmptySceneDocument().materials,
        textures: {},
        assets: { [asset.id]: asset },
        brushes: {},
        modelInstances: {},
        entities: {
          "entity-trigger-main": {
            id: "entity-trigger-main",
            kind: "triggerVolume",
            position: { x: 0, y: 0, z: 0 },
            size: { x: 2, y: 2, z: 2 },
            triggerOnEnter: true,
            triggerOnExit: false
          }
        },
        interactionLinks: {
          "link-bad-play": {
            id: "link-bad-play",
            sourceEntityId: "entity-trigger-main",
            trigger: "enter",
            action: {
              type: "playAnimation",
              targetModelInstanceId: "mi-animated",
              clipName: ""
            }
          }
        }
      })
    ).toThrow();
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      migrateSceneDocument({
        version: 99,
        name: "Legacy",
        world: {},
        textures: {},
        assets: {},
        brushes: {},
        modelInstances: {},
        entities: {},
        interactionLinks: {}
      })
    ).toThrow("Unsupported scene document version");
  });

  it("rejects duplicate authored ids after migration and validation", () => {
    expect(() =>
      parseSceneDocumentJson(
        JSON.stringify({
          version: SCENE_DOCUMENT_VERSION,
          name: "Duplicate Id Scene",
          world: createEmptySceneDocument().world,
          materials: createEmptySceneDocument().materials,
          textures: {},
          assets: {},
          brushes: {
            "brush-room-shell": {
              id: "shared-id",
              kind: "box",
              center: {
                x: 0,
                y: 1,
                z: 0
              },
              size: {
                x: 2,
                y: 2,
                z: 2
              },
              faces: {
                posX: { materialId: null, uv: createBoxBrush().faces.posX.uv },
                negX: { materialId: null, uv: createBoxBrush().faces.negX.uv },
                posY: { materialId: null, uv: createBoxBrush().faces.posY.uv },
                negY: { materialId: null, uv: createBoxBrush().faces.negY.uv },
                posZ: { materialId: null, uv: createBoxBrush().faces.posZ.uv },
                negZ: { materialId: null, uv: createBoxBrush().faces.negZ.uv }
              }
            }
          },
          modelInstances: {},
          entities: {
            "shared-id": {
              id: "shared-id",
              kind: "playerStart",
              position: {
                x: 0,
                y: 0,
                z: 0
              },
              yawDegrees: 0
            }
          },
          interactionLinks: {}
        })
      )
    ).toThrow("Duplicate authored id shared-id");
  });
});
