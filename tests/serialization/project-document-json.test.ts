import { describe, expect, it } from "vitest";

import {
  RUNNER_LOADING_SCREEN_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import {
  createSceneEntryEntity,
  createSceneExitEntity
} from "../../src/entities/entity-instances";
import {
  parseProjectDocumentJson,
  serializeProjectDocument
} from "../../src/serialization/scene-document-json";

describe("project document JSON", () => {
  it("round-trips authored scene loading overlay settings", () => {
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
      ...createEmptyProjectDocument({ sceneName: "Entry" }),
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

    const serializedDocument = serializeProjectDocument(document);

    expect(parseProjectDocumentJson(serializedDocument)).toEqual(document);
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
      parseProjectDocumentJson(serializeProjectDocument(document))
    ).toThrow("target entry");
  });
});
