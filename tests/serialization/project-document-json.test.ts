import { describe, expect, it } from "vitest";

import {
  MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  createDefaultSceneLoadingScreenSettings,
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import {
  parseProjectDocumentJson,
  serializeProjectDocument
} from "../../src/serialization/scene-document-json";

describe("project document JSON", () => {
  it("round-trips authored scene loading overlay settings", () => {
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

    const serializedDocument = serializeProjectDocument(document);

    expect(parseProjectDocumentJson(serializedDocument)).toEqual(document);
  });

  it("migrates v22 project documents by defaulting missing scene loading overlays", () => {
    const legacyScene = createEmptyProjectScene({
      id: "scene-main",
      name: "Legacy Entry"
    });
    const { loadingScreen: _loadingScreen, ...legacySceneWithoutLoadingScreen } =
      legacyScene;
    void _loadingScreen;

    const migratedDocument = parseProjectDocumentJson(
      JSON.stringify({
        version: MULTI_SCENE_FOUNDATION_SCENE_DOCUMENT_VERSION,
        activeSceneId: "scene-main",
        scenes: {
          "scene-main": legacySceneWithoutLoadingScreen
        },
        materials: createEmptyProjectDocument().materials,
        textures: {},
        assets: {}
      })
    );

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.scenes["scene-main"]?.loadingScreen).toEqual(
      createDefaultSceneLoadingScreenSettings()
    );
  });
});
