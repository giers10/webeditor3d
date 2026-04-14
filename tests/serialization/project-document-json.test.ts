import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createFollowActorPathControlEffect,
  createLightControlTargetRef,
  createPlayActorAnimationControlEffect,
  createSetLightIntensityControlEffect,
  createSetActorPresenceControlEffect
} from "../../src/controls/control-surface";
import {
  AUTHORED_OBJECT_STATE_SCENE_DOCUMENT_VERSION,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SCENE_EDITOR_SNAP_STEP,
  NPC_COLLIDER_SCENE_DOCUMENT_VERSION,
  PROJECT_DIALOGUE_LIBRARY_SCENE_DOCUMENT_VERSION,
  PROJECT_SEQUENCE_LIBRARY_SCENE_DOCUMENT_VERSION,
  SCHEDULER_ACTOR_ROUTINE_EFFECTS_SCENE_DOCUMENT_VERSION,
  NPC_PRESENCE_SCENE_DOCUMENT_VERSION,
  PLAYER_START_PAUSE_BINDINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION,
  PROJECT_TIME_DAY_NIGHT_PROFILE_SCENE_DOCUMENT_VERSION,
  RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
  SCHEDULER_CONTROL_EFFECTS_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import { createScenePath } from "../../src/document/paths";
import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import {
  createDefaultWorldSettings,
  createDefaultWorldTimePhaseProfile
} from "../../src/document/world-settings";
import {
  createPointLightEntity,
  createNpcEntity,
  createNpcTimeWindowPresence,
  createSceneEntryEntity,
  createSceneExitEntity
} from "../../src/entities/entity-instances";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { createProjectSequence } from "../../src/sequencer/project-sequences";
import { createRunSequenceInteractionLink } from "../../src/interactions/interaction-links";
import {
  parseProjectDocumentJson,
  serializeProjectDocument
} from "../../src/serialization/scene-document-json";

describe("project document JSON", () => {
  it("round-trips project dialogue library resources", () => {
    const document = createEmptyProjectDocument({
      name: "Dialogue Project"
    });
    document.dialogues.dialogues["dialogue-market"] = {
      id: "dialogue-market",
      title: "Market Greeting",
      lines: [
        {
          id: "dialogue-line-1",
          speakerName: "Merchant",
          text: "Fresh fruit, just in."
        },
        {
          id: "dialogue-line-2",
          speakerName: null,
          text: "The crowd keeps moving around you."
        }
      ]
    };

    expect(parseProjectDocumentJson(serializeProjectDocument(document))).toEqual(
      document
    );
  });

  it("round-trips NPC dialogue references in project scenes", () => {
    const document = createEmptyProjectDocument({
      name: "NPC Dialogue Project"
    });
    const npc = createNpcEntity({
      id: "entity-npc-merchant",
      actorId: "actor-merchant",
      dialogueId: "dialogue-market"
    });
    document.dialogues.dialogues["dialogue-market"] = {
      id: "dialogue-market",
      title: "Market",
      lines: [
        {
          id: "dialogue-line-market-1",
          speakerName: "Merchant",
          text: "Fresh bread."
        }
      ]
    };
    document.scenes[document.activeSceneId]!.entities[npc.id] = npc;

    expect(parseProjectDocumentJson(serializeProjectDocument(document))).toEqual(
      document
    );
  });

  it("migrates project NPCs without dialogue references from v50 to null dialogue ids", () => {
    const document = createEmptyProjectDocument({
      name: "Legacy NPC Dialogue Project"
    });
    const npc = createNpcEntity({
      id: "entity-npc-guide",
      actorId: "actor-guide"
    });
    document.scenes[document.activeSceneId]!.entities[npc.id] = npc;

    const legacyDocument = JSON.parse(
      serializeProjectDocument(document)
    ) as Record<string, unknown>;
    legacyDocument.version = PROJECT_DIALOGUE_LIBRARY_SCENE_DOCUMENT_VERSION;
    delete (legacyDocument.scenes as Record<string, unknown>)[
      document.activeSceneId
    ];
    legacyDocument.scenes = {
      [document.activeSceneId]: {
        ...document.scenes[document.activeSceneId],
        entities: {
          [npc.id]: {
            ...document.scenes[document.activeSceneId]!.entities[npc.id],
            dialogueId: undefined
          }
        }
      }
    };

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify(legacyDocument)
    );
    const migratedNpc = migratedDocument.scenes[migratedDocument.activeSceneId]!
      .entities[npc.id];

    expect(migratedNpc).toEqual(
      expect.objectContaining({
        kind: "npc",
        dialogueId: null
      })
    );
  });

  it("round-trips project sequences referenced by routines and interaction links", () => {
    const document = createEmptyProjectDocument({
      name: "Sequence Project"
    });

    document.dialogues.dialogues["dialogue-market"] = {
      id: "dialogue-market",
      title: "Market Greeting",
      lines: [
        {
          id: "dialogue-line-market-1",
          speakerName: "Merchant",
          text: "Fresh fruit."
        }
      ]
    };
    document.sequences.sequences["sequence-market-dialogue"] = createProjectSequence({
      id: "sequence-market-dialogue",
      title: "Market Greeting Sequence",
      steps: [
        {
          stepClass: "impulse",
          type: "startDialogue",
          dialogueId: "dialogue-market"
        }
      ]
    });
    document.sequences.sequences["sequence-vendor-open"] = createProjectSequence({
      id: "sequence-vendor-open",
      title: "Vendor Open",
      steps: [
        {
          stepClass: "held",
          type: "controlEffect",
          effect: createSetActorPresenceControlEffect({
            target: createActorControlTargetRef("actor-vendor"),
            active: true
          })
        }
      ]
    });
    document.scheduler.routines["routine-vendor-open"] = createProjectScheduleRoutine({
      id: "routine-vendor-open",
      title: "Vendor Open",
      target: createActorControlTargetRef("actor-vendor"),
      sequenceId: "sequence-vendor-open",
      effect: createSetActorPresenceControlEffect({
        target: createActorControlTargetRef("actor-vendor"),
        active: false
      })
    });
    document.scenes[document.activeSceneId]!.interactionLinks["link-sequence"] =
      createRunSequenceInteractionLink({
        id: "link-sequence",
        sourceEntityId: "entity-trigger-sequence",
        sequenceId: "sequence-market-dialogue"
      });

    expect(parseProjectDocumentJson(serializeProjectDocument(document))).toEqual(
      document
    );
  });

  it("migrates v52 project documents without sequences to an empty project sequence library", () => {
    const document = createEmptyProjectDocument({
      name: "Legacy Sequence Project"
    });
    const legacyDocument = JSON.parse(
      serializeProjectDocument(document)
    ) as Record<string, unknown>;

    legacyDocument.version = PLAYER_START_PAUSE_BINDINGS_SCENE_DOCUMENT_VERSION;
    delete legacyDocument.sequences;

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify(legacyDocument)
    );

    expect(migratedDocument.sequences).toEqual({
      sequences: {}
    });
  });

  it("round-trips the project name and authored scene loading overlay settings", () => {
    const cellarEntry = createSceneEntryEntity({
      id: "entity-scene-entry-cellar-stairs",
      position: {
        x: 1,
        y: 0,
        z: -2
      },
      yawDegrees: 180
    });
    const mainExit = createSceneExitEntity({
      id: "entity-scene-exit-main-hatch",
      position: {
        x: 0,
        y: 1,
        z: 3
      },
      targetSceneId: "scene-cellar",
      targetEntryEntityId: cellarEntry.id
    });
    const document = {
      ...createEmptyProjectDocument({
        name: "Castle Project",
        sceneName: "Entry"
      }),
      activeSceneId: "scene-cellar",
      scenes: {
        "scene-main": createEmptyProjectScene({
          id: "scene-main",
          name: "Entry"
        }),
        "scene-cellar": createEmptyProjectScene({
          id: "scene-cellar",
          name: "Cellar",
          loadingScreen: {
            colorHex: "#233041",
            headline: "Descending",
            description: "Dust and echoes settle before the next room appears."
          }
        })
      }
    };
    document.scenes["scene-main"].entities[mainExit.id] = mainExit;
    document.scenes["scene-cellar"].entities[cellarEntry.id] = cellarEntry;
    document.scenes["scene-main"].editorPreferences = {
      ...document.scenes["scene-main"].editorPreferences,
      whiteboxSelectionMode: "face",
      whiteboxSnapEnabled: false,
      whiteboxSnapStep: 0.5,
      viewportGridVisible: false,
      viewportLayoutMode: "quad",
      activeViewportPanelId: "bottomRight",
      viewportQuadSplit: {
        x: 0.42,
        y: 0.58
      },
      viewportPanels: {
        ...document.scenes["scene-main"].editorPreferences.viewportPanels,
        topLeft: {
          viewMode: "front",
          displayMode: "wireframe"
        }
      }
    };
    document.scenes["scene-cellar"].editorPreferences = {
      ...document.scenes["scene-cellar"].editorPreferences,
      whiteboxSelectionMode: "vertex",
      whiteboxSnapStep: 2,
      viewportLayoutMode: "quad",
      activeViewportPanelId: "topRight",
      viewportPanels: {
        ...document.scenes["scene-cellar"].editorPreferences.viewportPanels,
        topLeft: {
          viewMode: "side",
          displayMode: "authoring"
        }
      }
    };
    document.scenes["scene-cellar"].world.advancedRendering = {
      ...document.scenes["scene-cellar"].world.advancedRendering,
      enabled: true,
      whiteboxBevel: {
        enabled: true,
        edgeWidth: 0.16,
        normalStrength: 0.85
      }
    };
    document.scenes["scene-cellar"].world.projectTimeLightingEnabled = false;
    document.assets["asset-night-sky"] = {
      id: "asset-night-sky",
      kind: "image",
      sourceName: "night-sky.png",
      mimeType: "image/png",
      storageKey: "project-asset:asset-night-sky",
      byteLength: 2048,
      metadata: {
        kind: "image",
        width: 1024,
        height: 512,
        hasAlpha: false,
        warnings: []
      }
    };
    document.time = {
      startDayNumber: 3,
      startTimeOfDayHours: 18.5,
      dayLengthMinutes: 16,
      sunriseTimeOfDayHours: 5.5,
      sunsetTimeOfDayHours: 19.75,
      dawnDurationHours: 1.25,
      duskDurationHours: 1.75
    };
    document.scenes["scene-cellar"].world.timeOfDay = {
      dawn: {
        skyTopColorHex: "#6680bc",
        skyBottomColorHex: "#f3b07a",
        ambientColorHex: "#ffe0ba",
        ambientIntensityFactor: 0.78,
        lightColorHex: "#ffd29d",
        lightIntensityFactor: 0.82
      },
      dusk: {
        skyTopColorHex: "#313d70",
        skyBottomColorHex: "#e27b5e",
        ambientColorHex: "#f0bf9f",
        ambientIntensityFactor: 0.58,
        lightColorHex: "#ff9d79",
        lightIntensityFactor: 0.61
      },
      night: {
        background: {
          mode: "image",
          assetId: "asset-night-sky",
          environmentIntensity: 0.42
        },
        ambientColorHex: "#1a2941",
        ambientIntensityFactor: 0.22,
        lightColorHex: "#95b0ff",
        lightIntensityFactor: 0.19
      }
    };
    document.scenes["scene-cellar"].paths["path-cellar-patrol"] = createScenePath(
      {
        id: "path-cellar-patrol",
        name: "Cellar Patrol",
        loop: true,
        points: [
          {
            id: "path-point-a",
            position: {
              x: -2,
              y: 0,
              z: 1
            }
          },
          {
            id: "path-point-b",
            position: {
              x: 0,
              y: 0,
              z: 3
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
      }
    );

    const serializedDocument = serializeProjectDocument(document);

    expect(parseProjectDocumentJson(serializedDocument)).toEqual(document);
  });

  it("round-trips project scheduler routines bound to actor presence control", () => {
    const document = createEmptyProjectDocument({
      name: "Routine Project"
    });
    const npc = createNpcEntity({
      id: "entity-npc-vendor",
      actorId: "actor-vendor"
    });

    document.scenes[document.activeSceneId].entities[npc.id] = npc;
    document.scheduler.routines["routine-vendor-open"] =
      createProjectScheduleRoutine({
        id: "routine-vendor-open",
        title: "Vendor Open",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 8,
        endHour: 16,
        priority: 2,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    expect(
      parseProjectDocumentJson(serializeProjectDocument(document))
    ).toEqual(document);
  });

  it("round-trips actor scheduler routines with animation and follow-path effects", () => {
    const document = createEmptyProjectDocument({
      name: "Routine Project"
    });
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
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: "actor-patroller",
      modelAssetId: npcModelAsset.id
    });
    const path = createScenePath({
      id: "path-patrol"
    });

    document.assets[npcModelAsset.id] = npcModelAsset;
    document.scenes[document.activeSceneId].entities[npc.id] = npc;
    document.scenes[document.activeSceneId].paths[path.id] = path;
    document.scheduler.routines["routine-patrol"] = createProjectScheduleRoutine({
      id: "routine-patrol",
      title: "Patrolling",
      target: createActorControlTargetRef(npc.actorId),
      startHour: 9,
      endHour: 13,
      effects: [
        createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        }),
        createPlayActorAnimationControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          clipName: "Walk",
          loop: true
        }),
        createFollowActorPathControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          pathId: path.id,
          speed: 2,
          loop: false,
          progressMode: "deriveFromTime"
        })
      ]
    });

    expect(
      parseProjectDocumentJson(serializeProjectDocument(document))
    ).toEqual(document);
  });

  it("round-trips project scheduler routines bound to typed light control effects", () => {
    const document = createEmptyProjectDocument({
      name: "Lighting Project"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });

    document.scenes[document.activeSceneId].entities[pointLight.id] = pointLight;
    document.scheduler.routines["routine-night-light"] =
      createProjectScheduleRoutine({
        id: "routine-night-light",
        title: "Night Light",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 18,
        endHour: 6,
        effect: createSetLightIntensityControlEffect({
          target: createLightControlTargetRef("pointLight", pointLight.id),
          intensity: 0.35
        })
      });

    expect(
      parseProjectDocumentJson(serializeProjectDocument(document))
    ).toEqual(document);
  });

  it("migrates v48 project documents with legacy single-effect scheduler routines to the current version", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });
    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        ...createEmptyProjectDocument({
          name: "Legacy Scheduler Project"
        }),
        version: SCHEDULER_CONTROL_EFFECTS_SCENE_DOCUMENT_VERSION,
        scenes: {
          "scene-main": {
            ...createEmptyProjectScene({
              id: "scene-main",
              name: "Legacy Scene"
            }),
            entities: {
              [pointLight.id]: pointLight
            }
          }
        },
        scheduler: {
          routines: {
            "routine-night-light": {
              id: "routine-night-light",
              title: "Night Light",
              enabled: true,
              target: {
                kind: "entity",
                entityKind: "pointLight",
                entityId: pointLight.id
              },
              days: {
                mode: "everyDay"
              },
              startHour: 18,
              endHour: 6,
              priority: 0,
              effect: {
                type: "setLightIntensity",
                target: {
                  kind: "entity",
                  entityKind: "pointLight",
                  entityId: pointLight.id
                },
                intensity: 0.35
              }
            }
          }
        }
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.scheduler.routines["routine-night-light"]).toEqual(
      createProjectScheduleRoutine({
        id: "routine-night-light",
        title: "Night Light",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 18,
        endHour: 6,
        effect: createSetLightIntensityControlEffect({
          target: createLightControlTargetRef("pointLight", pointLight.id),
          intensity: 0.35
        })
      })
    );
  });

  it("migrates v49 project documents without dialogue libraries to the current version", () => {
    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: SCHEDULER_ACTOR_ROUTINE_EFFECTS_SCENE_DOCUMENT_VERSION,
        name: "Legacy Dialogue Project",
        time: createDefaultProjectTimeSettings(),
        scheduler: {
          routines: {}
        },
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": createEmptyProjectScene({
            id: "scene-main",
            name: "Main"
          })
        },
        materials: {},
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.dialogues).toEqual({
      dialogues: {}
    });
  });

  it("migrates pre-path project documents to empty scene path registries", () => {
    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: NPC_COLLIDER_SCENE_DOCUMENT_VERSION,
        name: "Legacy Pathless Project",
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": {
            ...createEmptyProjectScene({
              id: "scene-main",
              name: "Legacy Scene"
            }),
            paths: undefined
          }
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {},
        time: createDefaultProjectTimeSettings()
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.scenes["scene-main"]?.paths).toEqual({});
  });

  it("migrates pre-project-time multi-scene documents to default project time settings", () => {
    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: AUTHORED_OBJECT_STATE_SCENE_DOCUMENT_VERSION,
        name: "Legacy Project",
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": createEmptyProjectScene({
            id: "scene-main",
            name: "Legacy Entry"
          })
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.time).toEqual(createDefaultProjectTimeSettings());
  });

  it("migrates legacy project time environment profiles into scene world settings", () => {
    const legacyProject = createEmptyProjectDocument({
      name: "Legacy Time Project",
      sceneName: "Atrium"
    });
    const legacyScene = legacyProject.scenes[legacyProject.activeSceneId];

    if (legacyScene === undefined) {
      throw new Error("Expected the legacy project to contain an active scene.");
    }

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: PROJECT_TIME_DAY_NIGHT_PROFILE_SCENE_DOCUMENT_VERSION,
        name: legacyProject.name,
        activeSceneId: legacyProject.activeSceneId,
        scenes: {
          [legacyScene.id]: {
            ...legacyScene,
            world: {
              ...legacyScene.world,
              projectTimeLightingEnabled: undefined,
              timeOfDay: undefined
            }
          }
        },
        materials: legacyProject.materials,
        textures: legacyProject.textures,
        assets: legacyProject.assets,
        time: {
          startDayNumber: 2,
          startTimeOfDayHours: 17.5,
          dayLengthMinutes: 20,
          sunriseTimeOfDayHours: 6.25,
          sunsetTimeOfDayHours: 19.5,
          dawnDurationHours: 1.25,
          duskDurationHours: 1.75,
          dawn: {
            ...createDefaultWorldSettings().timeOfDay.dawn,
            ambientIntensityFactor: 0.74
          },
          dusk: {
            ...createDefaultWorldSettings().timeOfDay.dusk,
            lightIntensityFactor: 0.63
          },
          night: {
            ...createDefaultWorldTimePhaseProfile("night"),
            lightIntensityFactor: 0.21
          }
        }
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.time.startDayNumber).toBe(2);
    expect(migratedDocument.time.startTimeOfDayHours).toBe(17.5);
    expect(migratedDocument.time.dayLengthMinutes).toBe(20);
    expect(migratedDocument.time.sunriseTimeOfDayHours).toBe(6.25);
    expect(
      migratedDocument.scenes[migratedDocument.activeSceneId]?.world.timeOfDay
        .dawn.ambientIntensityFactor
    ).toBe(0.74);
    expect(
      migratedDocument.scenes[migratedDocument.activeSceneId]?.world.timeOfDay
        .dusk.lightIntensityFactor
    ).toBe(0.63);
    expect(
      migratedDocument.scenes[migratedDocument.activeSceneId]?.world.timeOfDay
        .night.lightIntensityFactor
    ).toBe(0.21);
    expect(
      migratedDocument.scenes[migratedDocument.activeSceneId]?.world.timeOfDay
        .night.background
    ).toEqual(
      createDefaultWorldSettings().timeOfDay.night.background
    );
    expect(
      migratedDocument.scenes[migratedDocument.activeSceneId]?.world
        .projectTimeLightingEnabled
    ).toBe(true);
  });

  it("migrates pre-project-name multi-scene documents to Untitled Project", () => {
    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION,
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": (() => {
            const legacyScene = createEmptyProjectScene({
              id: "scene-main",
              name: "Legacy Entry"
            });

            return {
              ...legacyScene,
              editorPreferences: undefined
            };
          })()
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.name).toBe(DEFAULT_PROJECT_NAME);
    expect(migratedDocument.scenes["scene-main"]?.name).toBe("Legacy Entry");
    expect(migratedDocument.scenes["scene-main"]?.editorPreferences).toMatchObject(
      {
        whiteboxSelectionMode: "object",
        whiteboxSnapEnabled: true,
        whiteboxSnapStep: DEFAULT_SCENE_EDITOR_SNAP_STEP,
        viewportGridVisible: true,
        viewportLayoutMode: "single",
        activeViewportPanelId: "topLeft"
      }
    );
  });

  it("migrates v23 project documents without Scene Entry and Scene Exit entities", () => {
    const legacyScene = createEmptyProjectScene({
      id: "scene-main",
      name: "Legacy Entry"
    });

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": legacyScene
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.scenes["scene-main"]?.loadingScreen).toEqual(
      legacyScene.loadingScreen
    );
  });

  it("migrates legacy NPC time-window presence into project scheduler routines", () => {
    const legacyNpc = createNpcEntity({
      id: "entity-npc-night-guard",
      actorId: "actor-night-guard",
      presence: createNpcTimeWindowPresence({
        startHour: 20,
        endHour: 4
      })
    });

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: NPC_PRESENCE_SCENE_DOCUMENT_VERSION,
        name: "Legacy Presence Project",
        time: createDefaultProjectTimeSettings(),
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": {
            ...createEmptyProjectScene({
              id: "scene-main",
              name: "Main"
            }),
            entities: {
              [legacyNpc.id]: legacyNpc
            }
          }
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.scenes["scene-main"]?.entities[legacyNpc.id]).toEqual(
      createNpcEntity({
        ...legacyNpc,
        presence: {
          mode: "always"
        }
      })
    );
    expect(migratedDocument.scheduler.routines).toEqual({
      "schedule-routine-scene-main-entity-npc-night-guard":
        expect.objectContaining({
          id: "schedule-routine-scene-main-entity-npc-night-guard",
          title: legacyNpc.actorId,
          startHour: 20,
          endHour: 4,
          target: {
            kind: "actor",
            actorId: legacyNpc.actorId
          },
          effects: [
            {
              type: "setActorPresence",
              target: {
                kind: "actor",
                actorId: legacyNpc.actorId
              },
              active: true
            }
          ]
        })
    });
  });

  it("rejects Scene Exit targets that point at a missing Scene Entry", () => {
    const document = createEmptyProjectDocument({ sceneName: "Outside" });
    const targetScene = createEmptyProjectScene({
      id: "scene-house",
      name: "House"
    });
    document.scenes[targetScene.id] = targetScene;
    document.scenes["scene-main"].entities["entity-scene-exit-door"] =
      createSceneExitEntity({
        id: "entity-scene-exit-door",
        targetSceneId: targetScene.id,
        targetEntryEntityId: "missing-entry"
      });

    expect(() =>
      parseProjectDocumentJson(JSON.stringify(document))
    ).toThrow("target entry");
  });
});
