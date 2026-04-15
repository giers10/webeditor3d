import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect,
  createSetActorPresenceControlEffect
} from "../../src/controls/control-surface";
import { createBoxBrush, deriveBoxBrushSizeFromGeometry } from "../../src/document/brushes";
import { createScenePath } from "../../src/document/paths";
import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import {
  ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION,
  ENTITY_NAMES_SCENE_DOCUMENT_VERSION,
  ENTITY_SYSTEM_FOUNDATION_SCENE_DOCUMENT_VERSION,
  FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION,
  IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
  LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION,
  MODEL_ASSET_PIPELINE_SCENE_DOCUMENT_VERSION,
  NPC_ENTITY_FOUNDATION_SCENE_DOCUMENT_VERSION,
  NPC_DIALOGUE_REFERENCE_SCENE_DOCUMENT_VERSION,
  PATH_FOUNDATION_SCENE_DOCUMENT_VERSION,
  PLAYER_START_AIR_CONTROL_SCENE_DOCUMENT_VERSION,
  PLAYER_START_AIR_DIRECTION_CONTROL_SCENE_DOCUMENT_VERSION,
  PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_MOVEMENT_TEMPLATE_SCENE_DOCUMENT_VERSION,
  PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION,
  SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION,
  SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION,
  STATIC_SIMPLE_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
  TRIGGER_ACTION_TARGET_FOUNDATION_SCENE_DOCUMENT_VERSION,
  WHITEBOX_BEVEL_SCENE_DOCUMENT_VERSION,
  WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION,
  WORLD_TIME_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  createEmptySceneDocument
} from "../../src/document/scene-document";
import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createNpcAlwaysPresence,
  createNpcEntity,
  createNpcTimeWindowPresence,
  createPointLightEntity,
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import {
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createStopAnimationInteractionLink,
  createStopSoundInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink
} from "../../src/interactions/interaction-links";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord, type ImageAssetRecord, type ModelAssetRecord } from "../../src/assets/project-assets";
import { parseSceneDocumentJson, serializeSceneDocument } from "../../src/serialization/scene-document-json";

describe("scene document JSON", () => {
  it("round-trips the current empty schema", () => {
    const document = createEmptySceneDocument({ name: "Bootstrap Scene" });
    const serializedDocument = serializeSceneDocument(document);

    expect(parseSceneDocumentJson(serializedDocument)).toEqual(document);
  });

  it("round-trips project dialogue library resources through the scene schema", () => {
    const document = createEmptySceneDocument({ name: "Dialogue Scene" });
    document.dialogues.dialogues["dialogue-bell"] = {
      id: "dialogue-bell",
      title: "Bell Tower",
      lines: [
        {
          id: "dialogue-line-bell-1",
          speakerName: "Watcher",
          text: "The bell rings before dawn."
        }
      ]
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });

  it("round-trips authored scheduler routines in the scene document schema", () => {
    const npc = createNpcEntity({
      id: "entity-npc-clocksmith",
      actorId: "actor-clocksmith"
    });
    const document = createEmptySceneDocument({ name: "Schedule Scene" });
    document.entities[npc.id] = npc;
    document.scheduler.routines["routine-clocksmith-open"] =
      createProjectScheduleRoutine({
        id: "routine-clocksmith-open",
        title: "Clocksmith Open",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 10,
        endHour: 18,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    expect(
      parseSceneDocumentJson(serializeSceneDocument(document))
    ).toEqual(document);
  });

  it("round-trips actor scheduler animation and follow-path routines in the scene document schema", () => {
    const npcModelAsset = {
      id: "asset-model-patroller",
      kind: "model" as const,
      sourceName: "patroller.glb",
      mimeType: "model/gltf-binary",
      storageKey: "asset:model:patroller",
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
    };
    const actorTarget = createActorControlTargetRef("actor-patroller");
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: actorTarget.actorId,
      modelAssetId: npcModelAsset.id
    });
    const path = createScenePath({
      id: "path-patrol"
    });
    const document = createEmptySceneDocument({ name: "Schedule Scene" });
    document.assets[npcModelAsset.id] = npcModelAsset;
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

    expect(
      parseSceneDocumentJson(serializeSceneDocument(document))
    ).toEqual(document);
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

  it("round-trips floating-point whitebox box transforms without accidental snapping", () => {
    const brush = createBoxBrush({
      id: "brush-float-transform",
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.875
      },
      rotationDegrees: {
        x: 12.5,
        y: 37.5,
        z: -8.25
      },
      size: {
        x: 2.5,
        y: 3.25,
        z: 4.75
      }
    });

    const document = {
      ...createEmptySceneDocument({ name: "Float Transform Scene" }),
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

  it("round-trips whitebox box volume settings", () => {
    const waterBrush = createBoxBrush({
      id: "brush-water-volume",
      volume: {
        mode: "water",
        water: {
          colorHex: "#2f79c4",
          surfaceOpacity: 0.65,
          waveStrength: 0.35,
          foamContactLimit: 9,
          surfaceDisplacementEnabled: true
        }
      }
    });
    const fogBrush = createBoxBrush({
      id: "brush-fog-volume",
      volume: {
        mode: "fog",
        fog: {
          colorHex: "#98a6bf",
          density: 0.45,
          padding: 0.2
        }
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Volume Round Trip Scene" }),
      brushes: {
        [waterBrush.id]: waterBrush,
        [fogBrush.id]: fogBrush
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips authored whitebox geometry vertices", () => {
    const brush = createBoxBrush({
      id: "brush-authored-geometry"
    });
    brush.geometry.vertices.posX_posY_posZ = {
      x: 1.5,
      y: 1,
      z: 1.25
    };
    brush.geometry.vertices.negX_negY_negZ = {
      x: -1,
      y: -1.25,
      z: -1.5
    };
    brush.size = deriveBoxBrushSizeFromGeometry(brush.geometry);

    const document = {
      ...createEmptySceneDocument({ name: "Authored Geometry Scene" }),
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

  it("round-trips authored advanced rendering settings", () => {
    const document = createEmptySceneDocument({ name: "Advanced Rendering Scene" });
    document.world.advancedRendering = {
      enabled: true,
      shadows: {
        enabled: true,
        mapSize: 4096,
        type: "pcf",
        bias: -0.001
      },
      ambientOcclusion: {
        enabled: true,
        intensity: 1.4,
        radius: 0.75,
        samples: 16
      },
      bloom: {
        enabled: true,
        intensity: 1.2,
        threshold: 0.9,
        radius: 0.4
      },
      toneMapping: {
        mode: "acesFilmic",
        exposure: 1.25
      },
      whiteboxBevel: {
        enabled: true,
        edgeWidth: 0.18,
        normalStrength: 0.9
      },
      fogPath: "quality",
      waterPath: "performance",
      waterReflectionMode: "world",
      depthOfField: {
        enabled: true,
        focusDistance: 12,
        focalLength: 0.045,
        bokehScale: 1.8
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("migrates v32 scene documents without whitebox bevel settings to defaults", () => {
    const emptyScene = createEmptySceneDocument({
      name: "Legacy Whitebox Bevel Scene"
    });
    const { whiteboxBevel: _whiteboxBevel, ...legacyAdvancedRendering } =
      emptyScene.world.advancedRendering;

    const migratedDocument = migrateSceneDocument({
      version: WHITEBOX_BEVEL_SCENE_DOCUMENT_VERSION,
      name: emptyScene.name,
      world: {
        ...emptyScene.world,
        advancedRendering: legacyAdvancedRendering
      },
      materials: emptyScene.materials,
      textures: emptyScene.textures,
      assets: emptyScene.assets,
      brushes: emptyScene.brushes,
      modelInstances: emptyScene.modelInstances,
      entities: emptyScene.entities,
      interactionLinks: emptyScene.interactionLinks
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.world.advancedRendering.whiteboxBevel).toEqual(
      emptyScene.world.advancedRendering.whiteboxBevel
    );
  });

  it("defaults missing water reflection mode and clamps legacy foam limits during migration", () => {
    const migratedDocument = migrateSceneDocument({
      version: SCENE_DOCUMENT_VERSION,
      name: "Legacy Water Settings",
      time: createDefaultProjectTimeSettings(),
      scheduler: createEmptySceneDocument().scheduler,
      world: {
        ...createEmptySceneDocument().world,
        advancedRendering: {
          ...createEmptySceneDocument().world.advancedRendering,
          enabled: true,
          waterPath: "quality"
        }
      },
      materials: STARTER_MATERIAL_LIBRARY.reduce<Record<string, (typeof STARTER_MATERIAL_LIBRARY)[number]>>((registry, material) => {
        registry[material.id] = material;
        return registry;
      }, {}),
      textures: {},
      assets: {},
      brushes: {
        "brush-water-legacy": {
          ...createBoxBrush({ id: "brush-water-legacy" }),
          volume: {
            mode: "water",
            water: {
              colorHex: "#2f79c4",
              surfaceOpacity: 0.65,
              waveStrength: 0.35,
              foamContactLimit: 999
            }
          }
        }
      },
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    } as unknown);

    expect(migratedDocument.world.advancedRendering.waterReflectionMode).toBe("none");
    expect(migratedDocument.brushes["brush-water-legacy"]?.volume).toEqual({
      mode: "water",
      water: expect.objectContaining({
        foamContactLimit: 24,
        surfaceDisplacementEnabled: false
      })
    });
  });

  it("migrates legacy documents without advanced rendering settings to defaults", () => {
    const emptyScene = createEmptySceneDocument({ name: "Legacy Advanced Rendering Scene" });
    const { advancedRendering: _advancedRendering, ...legacyWorld } = emptyScene.world;

    const migratedDocument = migrateSceneDocument({
      version: SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION,
      name: emptyScene.name,
      world: legacyWorld,
      materials: emptyScene.materials,
      textures: emptyScene.textures,
      assets: emptyScene.assets,
      brushes: emptyScene.brushes,
      modelInstances: emptyScene.modelInstances,
      entities: emptyScene.entities,
      interactionLinks: emptyScene.interactionLinks
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.world.advancedRendering).toEqual(emptyScene.world.advancedRendering);
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
      name: "Main Spawn",
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 135,
      movementTemplate: {
        kind: "custom",
        moveSpeed: 5.25,
        capabilities: {
          jump: true,
          sprint: false,
          crouch: true
        },
        jump: {
          speed: 8.1,
          bufferMs: 120,
          coyoteTimeMs: 90,
          variableHeight: true,
          maxHoldMs: 220,
          moveWhileJumping: false,
          moveWhileFalling: false,
          directionOnly: true
        },
        sprint: {
          speedMultiplier: 1.8
        },
        crouch: {
          speedMultiplier: 0.55
        }
      },
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
      },
      inputBindings: {
        keyboard: {
          moveForward: "KeyQ",
          moveBackward: "BracketLeft",
          moveLeft: "Comma",
          moveRight: "Period",
          jump: "Space",
          sprint: "ShiftRight",
          crouch: "KeyC",
          pauseTime: "KeyP"
        },
        gamepad: {
          moveForward: "dpadUp",
          moveBackward: "dpadDown",
          moveLeft: "dpadLeft",
          moveRight: "dpadRight",
          jump: "buttonNorth",
          sprint: "rightShoulder",
          crouch: "buttonEast",
          pauseTime: "buttonMenu",
          cameraLook: "rightStick"
        }
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Player Start Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("migrates version 14 documents without entity names", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-legacy",
      position: {
        x: 2,
        y: 3,
        z: 1
      },
      colorHex: "#ffeeaa",
      intensity: 1.75,
      distance: 9
    });
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Entity Name Scene" }),
      version: 14 as const,
      entities: {
        [pointLight.id]: pointLight
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[pointLight.id]).toEqual(pointLight);
  });

  it("migrates version 15 model instances to include default collider settings", () => {
    const asset = {
      id: "asset-model-legacy-collider",
      kind: "model",
      sourceName: "legacy-collider.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-legacy-collider"),
      byteLength: 64,
      metadata: {
        kind: "model",
        format: "glb",
        sceneName: "Legacy Collider Scene",
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: {
          min: {
            x: -0.5,
            y: 0,
            z: -0.5
          },
          max: {
            x: 0.5,
            y: 1,
            z: 0.5
          },
          size: {
            x: 1,
            y: 1,
            z: 1
          }
        },
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const migratedDocument = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Model Collider Scene" }),
      version: ENTITY_NAMES_SCENE_DOCUMENT_VERSION,
      assets: {
        [asset.id]: asset
      },
      modelInstances: {
        "model-instance-legacy-collider": {
          id: "model-instance-legacy-collider",
          kind: "modelInstance",
          assetId: asset.id,
          position: {
            x: 1,
            y: 0,
            z: -2
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          scale: {
            x: 1,
            y: 1,
            z: 1
          }
        }
      }
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.modelInstances["model-instance-legacy-collider"].collision).toEqual({
      mode: "none",
      visible: false
    });
  });

  it("migrates version 17 box brushes to include default whitebox rotation", () => {
    const migratedDocument = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Whitebox Transform Scene" }),
      version: PLAYER_START_COLLIDER_SETTINGS_SCENE_DOCUMENT_VERSION,
      brushes: {
        "brush-legacy-room": {
          id: "brush-legacy-room",
          kind: "box",
          center: {
            x: 1.25,
            y: 1.5,
            z: -0.75
          },
          size: {
            x: 2.5,
            y: 3.25,
            z: 4.75
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
      }
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes["brush-legacy-room"]).toMatchObject({
      center: {
        x: 1.25,
        y: 1.5,
        z: -0.75
      },
      size: {
        x: 2.5,
        y: 3.25,
        z: 4.75
      },
      rotationDegrees: {
        x: 0,
        y: 0,
        z: 0
      }
    });
  });

  it("migrates version 16 Player Start entities to include default collider settings", () => {
    const playerStart = {
      id: "entity-player-start-legacy-collider",
      kind: "playerStart" as const,
      position: {
        x: 1,
        y: 0,
        z: -3
      },
      yawDegrees: 45
    };
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Player Collider Scene" }),
      version: IMPORTED_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(
      createPlayerStartEntity({
        id: playerStart.id,
        position: playerStart.position,
        yawDegrees: playerStart.yawDegrees
      })
    );
  });

  it("migrates version 24 Player Start entities to default to first-person navigation", () => {
    const playerStart = {
      id: "entity-player-start-legacy-navigation",
      kind: "playerStart" as const,
      position: {
        x: 0,
        y: 0,
        z: 1
      },
      yawDegrees: 180,
      collider: {
        mode: "capsule" as const,
        eyeHeight: 1.6,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.6,
          y: 1.8,
          z: 0.6
        }
      }
    };
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Player Navigation Scene" }),
      version: SCENE_TRANSITION_ENTITIES_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(
      createPlayerStartEntity({
        ...playerStart,
        navigationMode: "firstPerson"
      })
    );
  });

  it("migrates version 25 Player Start entities to include default input bindings", () => {
    const playerStart = {
      id: "entity-player-start-legacy-bindings",
      kind: "playerStart" as const,
      position: {
        x: 1,
        y: 0,
        z: -2
      },
      yawDegrees: 90,
      navigationMode: "thirdPerson" as const,
      collider: {
        mode: "capsule" as const,
        eyeHeight: 1.6,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.6,
          y: 1.8,
          z: 0.6
        }
      }
    };
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Player Binding Scene" }),
      version: PLAYER_START_NAVIGATION_MODE_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(
      createPlayerStartEntity({
        ...playerStart
      })
    );
  });

  it("migrates version 26 Player Start input bindings to include default gamepad camera look", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy-camera-look",
      position: {
        x: 2,
        y: 0,
        z: 0
      }
    });
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Player Camera Look Scene" }),
      version: PLAYER_START_INPUT_BINDINGS_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: {
          ...playerStart,
          inputBindings: {
            ...playerStart.inputBindings,
            gamepad: {
              moveForward: playerStart.inputBindings.gamepad.moveForward,
              moveBackward: playerStart.inputBindings.gamepad.moveBackward,
              moveLeft: playerStart.inputBindings.gamepad.moveLeft,
              moveRight: playerStart.inputBindings.gamepad.moveRight
            }
          }
        }
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(playerStart);
  });

  it("migrates version 51 Player Start input bindings to include default pause bindings", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy-pause-binding"
    });
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy Player Pause Binding Scene" }),
      version: NPC_DIALOGUE_REFERENCE_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: {
          ...playerStart,
          inputBindings: {
            keyboard: {
              moveForward: playerStart.inputBindings.keyboard.moveForward,
              moveBackward: playerStart.inputBindings.keyboard.moveBackward,
              moveLeft: playerStart.inputBindings.keyboard.moveLeft,
              moveRight: playerStart.inputBindings.keyboard.moveRight,
              jump: playerStart.inputBindings.keyboard.jump,
              sprint: playerStart.inputBindings.keyboard.sprint,
              crouch: playerStart.inputBindings.keyboard.crouch
            },
            gamepad: {
              moveForward: playerStart.inputBindings.gamepad.moveForward,
              moveBackward: playerStart.inputBindings.gamepad.moveBackward,
              moveLeft: playerStart.inputBindings.gamepad.moveLeft,
              moveRight: playerStart.inputBindings.gamepad.moveRight,
              jump: playerStart.inputBindings.gamepad.jump,
              sprint: playerStart.inputBindings.gamepad.sprint,
              crouch: playerStart.inputBindings.gamepad.crouch,
              cameraLook: playerStart.inputBindings.gamepad.cameraLook
            }
          }
        }
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(playerStart);
  });

  it("migrates version 30 Player Start entities to include the default movement template", () => {
    const playerStart = {
      id: "entity-player-start-legacy-movement-template",
      kind: "playerStart" as const,
      position: {
        x: -1,
        y: 0,
        z: 3
      },
      yawDegrees: 30,
      navigationMode: "thirdPerson" as const,
      inputBindings: {
        keyboard: {
          moveForward: "KeyW",
          moveBackward: "KeyS",
          moveLeft: "KeyA",
          moveRight: "KeyD"
        },
        gamepad: {
          moveForward: "leftStickUp" as const,
          moveBackward: "leftStickDown" as const,
          moveLeft: "leftStickLeft" as const,
          moveRight: "leftStickRight" as const,
          cameraLook: "rightStick" as const
        }
      },
      collider: {
        mode: "capsule" as const,
        eyeHeight: 1.6,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.6,
          y: 1.8,
          z: 0.6
        }
      }
    };
    const legacyDocument = {
      ...createEmptySceneDocument({
        name: "Legacy Player Movement Template Scene"
      }),
      version: STATIC_SIMPLE_MODEL_COLLIDERS_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(
      createPlayerStartEntity({
        ...playerStart
      })
    );
  });

  it("migrates version 31 Player Start movement bindings to include default jump sprint and crouch actions", () => {
    const playerStart = {
      id: "entity-player-start-legacy-locomotion-bindings",
      kind: "playerStart" as const,
      position: {
        x: 1,
        y: 0,
        z: -4
      },
      yawDegrees: 0,
      navigationMode: "firstPerson" as const,
      movementTemplate: {
        kind: "default" as const,
        moveSpeed: 4.5,
        capabilities: {
          jump: true,
          sprint: true,
          crouch: true
        }
      },
      inputBindings: {
        keyboard: {
          moveForward: "KeyW",
          moveBackward: "KeyS",
          moveLeft: "KeyA",
          moveRight: "KeyD"
        },
        gamepad: {
          moveForward: "leftStickUp" as const,
          moveBackward: "leftStickDown" as const,
          moveLeft: "leftStickLeft" as const,
          moveRight: "leftStickRight" as const,
          cameraLook: "rightStick" as const
        }
      },
      collider: {
        mode: "capsule" as const,
        eyeHeight: 1.6,
        capsuleRadius: 0.3,
        capsuleHeight: 1.8,
        boxSize: {
          x: 0.6,
          y: 1.8,
          z: 0.6
        }
      }
    };
    const legacyDocument = {
      ...createEmptySceneDocument({
        name: "Legacy Player Locomotion Binding Scene"
      }),
      version: PLAYER_START_MOVEMENT_TEMPLATE_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(
      createPlayerStartEntity({
        ...playerStart
      })
    );
  });

  it("migrates version 33 Player Start jump settings to include default air movement flags", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy-air-move-flags",
      movementTemplate: {
        kind: "responsive"
      }
    });
    const {
      moveWhileJumping: _moveWhileJumping,
      moveWhileFalling: _moveWhileFalling,
      directionOnly: _directionOnly,
      ...legacyJump
    } = playerStart.movementTemplate.jump;
    const legacyDocument = {
      ...createEmptySceneDocument({
        name: "Legacy Player Air Movement Scene"
      }),
      version: 33,
      entities: {
        [playerStart.id]: {
          ...playerStart,
          movementTemplate: {
            ...playerStart.movementTemplate,
            jump: legacyJump
          }
        }
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(playerStart);
  });

  it("migrates version 34 Player Start jump settings to include default air direction mode", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy-air-direction",
      movementTemplate: {
        kind: "responsive"
      }
    });
    const {
      directionOnly: _directionOnly,
      ...legacyJump
    } = playerStart.movementTemplate.jump;
    const legacyDocument = {
      ...createEmptySceneDocument({
        name: "Legacy Player Air Direction Scene"
      }),
      version: PLAYER_START_AIR_CONTROL_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: {
          ...playerStart,
          movementTemplate: {
            ...playerStart.movementTemplate,
            jump: legacyJump
          }
        }
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[playerStart.id]).toEqual(playerStart);
  });

  it("migrates version 35 documents to default authored visible and enabled state while preserving interaction enablement", () => {
    const brush = createBoxBrush({
      id: "brush-authored-state-legacy"
    });
    const modelAsset: ModelAssetRecord = {
      id: "asset-model-authored-state-legacy",
      kind: "model",
      sourceName: "legacy-authored-state.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-authored-state-legacy"),
      byteLength: 2048,
      metadata: {
        kind: "model",
        format: "glb",
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
    const modelInstance = createModelInstance({
      id: "model-instance-authored-state-legacy",
      assetId: modelAsset.id
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-authored-state-legacy",
      interactionEnabled: false
    });
    const {
      visible: _legacyBrushVisible,
      enabled: _legacyBrushEnabled,
      ...legacyBrush
    } = brush;
    const {
      visible: _legacyModelVisible,
      enabled: _legacyModelEnabled,
      ...legacyModelInstance
    } = modelInstance;
    const {
      visible: _legacyInteractableVisible,
      enabled: _legacyInteractableEnabled,
      interactionEnabled: legacyInteractableInteractionEnabled,
      ...legacyInteractable
    } = interactable;

    const migratedDocument = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Authored State Scene" }),
      version: PLAYER_START_AIR_DIRECTION_CONTROL_SCENE_DOCUMENT_VERSION,
      assets: {
        [modelAsset.id]: modelAsset
      },
      brushes: {
        [brush.id]: legacyBrush
      },
      modelInstances: {
        [modelInstance.id]: legacyModelInstance
      },
      entities: {
        [interactable.id]: {
          ...legacyInteractable,
          enabled: legacyInteractableInteractionEnabled
        }
      }
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes[brush.id]).toMatchObject({
      visible: true,
      enabled: true
    });
    expect(migratedDocument.modelInstances[modelInstance.id]).toMatchObject({
      visible: true,
      enabled: true
    });
    expect(migratedDocument.entities[interactable.id]).toMatchObject({
      visible: true,
      enabled: true,
      interactionEnabled: false
    });
  });

  it("round-trips authored third-person Player Start navigation", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-third-person",
      navigationMode: "thirdPerson"
    });
    const document = {
      ...createEmptySceneDocument({ name: "Third Person Player Start Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });

  it("round-trips the initial typed entity registry without mixing entities into model instances", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "lobby-loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 4096,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 4.5,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      position: {
        x: 1,
        y: 2,
        z: 3
      },
      audioAssetId: audioAsset.id,
      volume: 0.6,
      refDistance: 7,
      maxDistance: 18,
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
      assets: {
        [audioAsset.id]: audioAsset
      },
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

  it("round-trips NPC entities with stable actor ids and optional model refs", () => {
    const modelAsset = {
      id: "asset-model-npc",
      kind: "model" as const,
      sourceName: "npc-guide.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-npc"),
      byteLength: 512,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: "NPC Guide",
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const npc = createNpcEntity({
      id: "entity-npc-guide",
      actorId: "actor-town-guide",
      presence: createNpcTimeWindowPresence({
        startHour: 21.5,
        endHour: 2.5
      }),
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 225,
      modelAssetId: modelAsset.id,
      collider: {
        mode: "box",
        eyeHeight: 1.4,
        boxSize: {
          x: 0.9,
          y: 1.7,
          z: 0.8
        }
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "NPC Round Trip Scene" }),
      assets: {
        [modelAsset.id]: modelAsset
      },
      entities: {
        [npc.id]: npc
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });

  it("round-trips authored playSound and stopSound interaction links", () => {
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "lobby-loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 4096,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 4.5,
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
    const playLink = createPlaySoundInteractionLink({
      id: "link-play-sound",
      sourceEntityId: triggerVolume.id,
      trigger: "enter",
      targetSoundEmitterId: soundEmitter.id
    });
    const stopLink = createStopSoundInteractionLink({
      id: "link-stop-sound",
      sourceEntityId: triggerVolume.id,
      trigger: "exit",
      targetSoundEmitterId: soundEmitter.id
    });
    const document = {
      ...createEmptySceneDocument({ name: "Sound Link Scene" }),
      assets: {
        [audioAsset.id]: audioAsset
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [soundEmitter.id]: soundEmitter
      },
      interactionLinks: {
        [playLink.id]: playLink,
        [stopLink.id]: stopLink
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
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

  it("round-trips authored model-instance collision settings", () => {
    const asset = {
      id: "asset-model-collider",
      kind: "model",
      sourceName: "collision-test.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-collider"),
      byteLength: 64,
      metadata: {
        kind: "model",
        format: "glb",
        sceneName: "Collision Test Scene",
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: {
          min: {
            x: -1,
            y: 0,
            z: -1
          },
          max: {
            x: 1,
            y: 2,
            z: 1
          },
          size: {
            x: 2,
            y: 2,
            z: 2
          }
        },
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-collider",
      assetId: asset.id,
      collision: {
        mode: "dynamic",
        visible: true
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Model Collision Scene" }),
      assets: {
        [asset.id]: asset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips authored static-simple model-instance collision settings", () => {
    const asset = {
      id: "asset-model-static-simple-collider",
      kind: "model",
      sourceName: "collision-static-simple.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-static-simple-collider"),
      byteLength: 64,
      metadata: {
        kind: "model",
        format: "glb",
        sceneName: "Static Simple Collision Test Scene",
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: {
          min: {
            x: -2,
            y: 0,
            z: -0.1
          },
          max: {
            x: 2,
            y: 4,
            z: 0.1
          },
          size: {
            x: 4,
            y: 4,
            z: 0.2
          }
        },
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-static-simple-collider",
      assetId: asset.id,
      collision: {
        mode: "static-simple",
        visible: true
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Static Simple Model Collision Scene" }),
      assets: {
        [asset.id]: asset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("migrates version 29 scene documents to preserve existing model collision settings", () => {
    const asset = {
      id: "asset-model-v29-collider",
      kind: "model",
      sourceName: "v29-collider.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-v29-collider"),
      byteLength: 64,
      metadata: {
        kind: "model",
        format: "glb",
        sceneName: "V29 Collider Scene",
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: {
          min: {
            x: -1,
            y: 0,
            z: -1
          },
          max: {
            x: 1,
            y: 2,
            z: 1
          },
          size: {
            x: 2,
            y: 2,
            z: 2
          }
        },
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const legacyDocument = {
      ...createEmptySceneDocument({ name: "Legacy V29 Collider Scene" }),
      version: SCENE_EDITOR_PREFERENCES_SCENE_DOCUMENT_VERSION,
      assets: {
        [asset.id]: asset
      },
      modelInstances: {
        "model-instance-v29-collider": {
          ...createModelInstance({
            id: "model-instance-v29-collider",
            assetId: asset.id,
            collision: {
              mode: "dynamic",
              visible: true
            }
          })
        }
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.modelInstances["model-instance-v29-collider"].collision).toEqual({
      mode: "dynamic",
      visible: true
    });
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

  it("migrates NPC foundation entities to include default collider settings", () => {
    const migratedDocument = migrateSceneDocument({
      version: NPC_ENTITY_FOUNDATION_SCENE_DOCUMENT_VERSION,
      name: "NPC Collider Migration",
      time: createDefaultProjectTimeSettings(),
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {
        "entity-npc-guide": {
          id: "entity-npc-guide",
          kind: "npc",
          position: {
            x: 1,
            y: 0,
            z: 2
          },
          visible: true,
          enabled: true,
          actorId: "actor-town-guide",
          yawDegrees: 30,
          modelAssetId: null
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities["entity-npc-guide"]).toEqual(
      createNpcEntity({
        id: "entity-npc-guide",
        actorId: "actor-town-guide",
        position: {
          x: 1,
          y: 0,
          z: 2
        },
        yawDegrees: 30,
        modelAssetId: null
      })
    );
  });

  it("migrates pre-presence NPC entities to always-authored presence", () => {
    const migratedDocument = migrateSceneDocument({
      version: PATH_FOUNDATION_SCENE_DOCUMENT_VERSION,
      name: "NPC Presence Migration",
      time: createDefaultProjectTimeSettings(),
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      paths: {},
      modelInstances: {},
      entities: {
        "entity-npc-guide": {
          id: "entity-npc-guide",
          kind: "npc",
          position: {
            x: 1,
            y: 0,
            z: 2
          },
          visible: true,
          enabled: true,
          actorId: "actor-town-guide",
          yawDegrees: 30,
          modelAssetId: null,
          collider: createNpcEntity().collider
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities["entity-npc-guide"]).toEqual(
      createNpcEntity({
        id: "entity-npc-guide",
        actorId: "actor-town-guide",
        presence: createNpcAlwaysPresence(),
        position: {
          x: 1,
          y: 0,
          z: 2
        },
        yawDegrees: 30,
        modelAssetId: null
      })
    );
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

  it("migrates v40 scene documents to the current schema version without changing authored entities", () => {
    const interactable = createInteractableEntity({
      id: "entity-interactable-v40",
      prompt: "Inspect"
    });

    const migratedDocument = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "v40 Compatibility Scene" }),
      version: WORLD_TIME_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
      entities: {
        [interactable.id]: interactable
      }
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities[interactable.id]).toEqual(interactable);
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

  it("migrates v12 sound emitters to the current schema version", () => {
    const migratedDocument = migrateSceneDocument({
      version: ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION,
      name: "Legacy Sound Scene",
      world: createEmptySceneDocument().world,
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {
        "entity-sound-main": {
          id: "entity-sound-main",
          kind: "soundEmitter",
          position: {
            x: 1,
            y: 2,
            z: 3
          },
          radius: 9,
          gain: 0.4,
          autoplay: true,
          loop: false
        }
      },
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.entities["entity-sound-main"]).toEqual({
      id: "entity-sound-main",
      kind: "soundEmitter",
      name: undefined,
      position: {
        x: 1,
        y: 2,
        z: 3
      },
      visible: true,
      enabled: true,
      audioAssetId: null,
      volume: 0.4,
      refDistance: 9,
      maxDistance: 9,
      autoplay: true,
      loop: false
    });
  });

  it("migrates v13 documents without the advanced rendering block to the current schema version", () => {
    const emptyScene = createEmptySceneDocument();
    const { advancedRendering: _advancedRendering, ...legacyWorld } = emptyScene.world;

    const migratedDocument = migrateSceneDocument({
      version: SPATIAL_AUDIO_SCENE_DOCUMENT_VERSION,
      name: "Legacy Spatial Audio Scene",
      world: legacyWorld,
      materials: emptyScene.materials,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.world.advancedRendering).toEqual(emptyScene.world.advancedRendering);
  });

  it("migrates v19 whitebox boxes without volume settings to the current schema version", () => {
    const legacyBrush = createBoxBrush({
      id: "brush-legacy"
    });
    const migratedDocument = migrateSceneDocument({
      version: WHITEBOX_GEOMETRY_SCENE_DOCUMENT_VERSION,
      name: "Legacy Whitebox Volume Scene",
      world: {
        ...createEmptySceneDocument().world,
        advancedRendering: {
          ...createEmptySceneDocument().world.advancedRendering,
          fogPath: undefined,
          waterPath: undefined
        }
      },
      materials: createEmptySceneDocument().materials,
      textures: {},
      assets: {},
      brushes: {
        "brush-legacy": {
          id: "brush-legacy",
          kind: "box",
          center: legacyBrush.center,
          rotationDegrees: legacyBrush.rotationDegrees,
          size: legacyBrush.size,
          geometry: legacyBrush.geometry,
          faces: legacyBrush.faces
        }
      },
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    } as any);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.brushes["brush-legacy"].volume).toEqual({ mode: "none" });
    expect(migratedDocument.world.advancedRendering.fogPath).toBe("performance");
    expect(migratedDocument.world.advancedRendering.waterPath).toBe("performance");
  });

  it("round-trips authored playAnimation and stopAnimation interaction links", () => {
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
    } satisfies ModelAssetRecord;
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
        time: createDefaultProjectTimeSettings(),
        scheduler: createEmptySceneDocument().scheduler,
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
          scheduler: createEmptySceneDocument().scheduler,
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
          time: createDefaultProjectTimeSettings(),
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
