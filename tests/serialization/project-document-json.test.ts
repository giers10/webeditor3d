import { describe, expect, it } from "vitest";

import {
  AUTHORED_OBJECT_STATE_SCENE_DOCUMENT_VERSION,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SCENE_EDITOR_SNAP_STEP,
  PLAYER_START_GAMEPAD_CAMERA_LOOK_SCENE_DOCUMENT_VERSION,
  RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import {
  createSceneEntryEntity,
  createSceneExitEntity
} from "../../src/entities/entity-instances";
import {
  parseProjectDocumentJson,
  serializeProjectDocument
} from "../../src/serialization/scene-document-json";

describe("project document JSON", () => {
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
    document.time = {
      startTimeOfDayHours: 18.5,
      dayLengthMinutes: 16
    };

    const serializedDocument = serializeProjectDocument(document);

    expect(parseProjectDocumentJson(serializedDocument)).toEqual(document);
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
