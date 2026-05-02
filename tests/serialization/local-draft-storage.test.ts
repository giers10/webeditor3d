import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import {
  DEFAULT_PROJECT_NAME,
  SCENE_DOCUMENT_VERSION,
  createDefaultSceneEditorPreferences,
  createEmptyProjectDocument,
  createEmptyProjectScene,
  createEmptySceneDocument,
  createProjectDocumentFromSceneDocument
} from "../../src/document/scene-document";
import { createTerrain } from "../../src/document/terrains";
import { serializeSceneDocument } from "../../src/serialization/scene-document-json";
import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  getBrowserStorageAccess,
  loadOrCreateSceneDocument,
  loadSceneDocumentDraft,
  saveSceneDocumentDraft,
  type KeyValueStorage
} from "../../src/serialization/local-draft-storage";
import { createDefaultViewportLayoutState } from "../../src/viewport-three/viewport-layout";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class ThrowingStorage implements KeyValueStorage {
  constructor(
    private readonly options: {
      onGetItem?: Error;
      onSetItem?: Error;
      onRemoveItem?: Error;
    } = {}
  ) {}

  getItem(): string | null {
    if (this.options.onGetItem !== undefined) {
      throw this.options.onGetItem;
    }

    return null;
  }

  setItem(): void {
    if (this.options.onSetItem !== undefined) {
      throw this.options.onSetItem;
    }
  }

  removeItem(): void {
    if (this.options.onRemoveItem !== undefined) {
      throw this.options.onRemoveItem;
    }
  }
}

describe("local draft storage", () => {
  it("falls back to a fresh document when stored draft JSON is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEFAULT_SCENE_DRAFT_STORAGE_KEY, "{invalid-json");

    const result = loadOrCreateSceneDocument(storage);

    expect(result.document.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(result.document).toEqual(createEmptyProjectDocument());
    expect(result.diagnostic).toContain("Stored autosave could not be loaded.");
    expect(result.diagnostic).toContain(
      "Starting with a fresh empty document."
    );
  });

  it("reports browser storage access failures without throwing", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "localStorage"
    );

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("access denied");
      }
    });

    try {
      const result = getBrowserStorageAccess();

      expect(result.storage).toBeNull();
      expect(result.diagnostic).toContain(
        "Browser local storage is unavailable."
      );
      expect(result.diagnostic).toContain("access denied");
    } finally {
      if (originalDescriptor !== undefined) {
        Object.defineProperty(window, "localStorage", originalDescriptor);
      } else {
        Reflect.deleteProperty(window, "localStorage");
      }
    }
  });

  it("returns an error result when reading from storage throws", () => {
    const result = loadSceneDocumentDraft(
      new ThrowingStorage({
        onGetItem: new Error("blocked read")
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("blocked read");
  });

  it("returns an error result when saving to storage throws", () => {
    const result = saveSceneDocumentDraft(
      new ThrowingStorage({
        onSetItem: new Error("quota exceeded")
      }),
      createEmptyProjectDocument()
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("quota exceeded");
  });

  it("stores and restores editor viewport layout state alongside the document draft", () => {
    const storage = new MemoryStorage();
    const viewportLayoutState = createDefaultViewportLayoutState();

    viewportLayoutState.layoutMode = "quad";
    viewportLayoutState.activePanelId = "bottomRight";
    viewportLayoutState.panels.topLeft.displayMode = "wireframe";
    viewportLayoutState.panels.topLeft.cameraState.target = {
      x: 8,
      y: 3,
      z: -5
    };
    viewportLayoutState.panels.topLeft.cameraState.perspectiveOrbit.theta = 1.25;
    viewportLayoutState.panels.topLeft.cameraState.orthographicZoom = 2.5;

    expect(
      saveSceneDocumentDraft(
        storage,
        createProjectDocumentFromSceneDocument(
          createEmptySceneDocument({ name: "Viewport Draft" })
        ),
        viewportLayoutState
      )
    ).toEqual({
      status: "saved",
      message: "Autosave updated."
    });
    const result = loadSceneDocumentDraft(storage);

    expect(result.status).toBe("loaded");

    if (result.status !== "loaded") {
      return;
    }

    expect(result.document.scenes[result.document.activeSceneId]?.name).toBe(
      "Viewport Draft"
    );
    expect(result.viewportLayoutState).toMatchObject({
      layoutMode: "quad",
      activePanelId: "bottomRight",
      panels: {
        topLeft: {
          displayMode: "wireframe",
          cameraState: {
            target: {
              x: 8,
              y: 3,
              z: -5
            },
            perspectiveOrbit: {
              theta: 1.25
            },
            orthographicZoom: 2.5
          }
        }
      }
    });
  });

  it("stores and restores all project scenes in autosave drafts", () => {
    const storage = new MemoryStorage();
    const document = {
      ...createEmptyProjectDocument({
        name: "Castle Campaign",
        sceneName: "Entry"
      }),
      activeSceneId: "scene-hall",
      scenes: {
        "scene-main": createEmptyProjectScene({
          id: "scene-main",
          name: "Entry"
        }),
        "scene-hall": createEmptyProjectScene({
          id: "scene-hall",
          name: "Hallway",
          loadingScreen: {
            colorHex: "#253142",
            headline: "Crossing over",
            description: "Preparing the next hallway scene."
          }
        })
      }
    };

    expect(saveSceneDocumentDraft(storage, document)).toEqual({
      status: "saved",
      message: "Autosave updated."
    });

    const result = loadSceneDocumentDraft(storage);

    expect(result.status).toBe("loaded");

    if (result.status !== "loaded") {
      return;
    }

    expect(result.document.name).toBe("Castle Campaign");
    expect(result.document.activeSceneId).toBe("scene-hall");
    expect(Object.keys(result.document.scenes)).toEqual([
      "scene-main",
      "scene-hall"
    ]);
    expect(result.document.scenes["scene-hall"]?.loadingScreen).toEqual({
      colorHex: "#253142",
      headline: "Crossing over",
      description: "Preparing the next hallway scene."
    });
  });

  it("skips oversized terrain-heavy autosaves and keeps the previous draft", () => {
    const storage = new MemoryStorage();
    saveSceneDocumentDraft(
      storage,
      createProjectDocumentFromSceneDocument(
        createEmptySceneDocument({ name: "Previous Draft" })
      )
    );
    const terrain = createTerrain({
      id: "terrain-large-draft",
      sampleCountX: 17,
      sampleCountZ: 17
    });
    const document = {
      ...createEmptyProjectDocument(),
      scenes: {
        "scene-main": {
          ...createEmptyProjectScene({
            id: "scene-main",
            name: "Terrain Draft"
          }),
          terrains: {
            [terrain.id]: terrain
          }
        }
      }
    };

    const result = saveSceneDocumentDraft(storage, document, null, undefined, {
      maxSerializedBytes: 512
    });

    expect(result.status).toBe("skipped");
    expect(result.message).toContain("Autosave skipped");
    expect(result.message).toContain("last successful autosave was kept");

    const recoveredResult = loadSceneDocumentDraft(storage);

    expect(recoveredResult.status).toBe("loaded");

    if (recoveredResult.status !== "loaded") {
      return;
    }

    expect(
      recoveredResult.document.scenes[recoveredResult.document.activeSceneId]
        ?.name
    ).toBe("Previous Draft");
  });

  it("allows terrain autosaves when the minimum estimate and actual draft fit", () => {
    const storage = new MemoryStorage();
    const terrain = createTerrain({
      id: "terrain-medium-draft",
      sampleCountX: 17,
      sampleCountZ: 17
    });
    const document = {
      ...createEmptyProjectDocument(),
      scenes: {
        "scene-main": {
          ...createEmptyProjectScene({
            id: "scene-main",
            name: "Terrain Draft"
          }),
          terrains: {
            [terrain.id]: terrain
          }
        }
      }
    };

    const result = saveSceneDocumentDraft(storage, document, null, undefined, {
      maxSerializedBytes: 70_000
    });

    expect(result).toEqual({
      status: "saved",
      message: "Autosave updated."
    });

    const recoveredResult = loadSceneDocumentDraft(storage);

    expect(recoveredResult.status).toBe("loaded");
  });

  it("skips oversized autosaves before full document validation", () => {
    const storage = new MemoryStorage();
    const invalidTerrain = createTerrain({
      id: "terrain-invalid-large-draft",
      sampleCountX: 17,
      sampleCountZ: 17
    });
    invalidTerrain.layers[0] = {
      materialId: "missing-material"
    };
    const document = {
      ...createEmptyProjectDocument(),
      scenes: {
        "scene-main": {
          ...createEmptyProjectScene({
            id: "scene-main",
            name: "Invalid Terrain Draft"
          }),
          terrains: {
            [invalidTerrain.id]: invalidTerrain
          }
        }
      }
    };

    const result = saveSceneDocumentDraft(storage, document, null, undefined, {
      maxSerializedBytes: 512
    });

    expect(result.status).toBe("skipped");
    expect(result.message).toContain("Autosave skipped");
  });

  it("loads older raw scene-document drafts without requiring viewport layout state", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DEFAULT_SCENE_DRAFT_STORAGE_KEY,
      serializeSceneDocument(createEmptySceneDocument({ name: "Legacy Draft" }))
    );

    const result = loadSceneDocumentDraft(storage);

    expect(result.status).toBe("loaded");

    if (result.status !== "loaded") {
      return;
    }

    expect(result.document.name).toBe(DEFAULT_PROJECT_NAME);
    expect(result.document.scenes[result.document.activeSceneId]?.name).toBe(
      "Legacy Draft"
    );
    expect(result.viewportLayoutState).toBeNull();
    expect(result.message).toBe("Recovered latest autosave.");
  });

  it("reports recovered autosaves through bootstrap diagnostics", () => {
    const storage = new MemoryStorage();
    saveSceneDocumentDraft(
      storage,
      createProjectDocumentFromSceneDocument(
        createEmptySceneDocument({ name: "Recovered Scene" })
      )
    );

    const result = loadOrCreateSceneDocument(storage);

    expect(result.document.scenes[result.document.activeSceneId]?.name).toBe(
      "Recovered Scene"
    );
    expect(result.diagnostic).toBe("Recovered latest autosave.");
  });

  it("refuses to save an invalid scene document draft", () => {
    const invalidBrush = createBoxBrush({
      id: "brush-invalid"
    });
    invalidBrush.faces.posX.materialId = "missing-material";

    const result = saveSceneDocumentDraft(new MemoryStorage(), {
      ...createProjectDocumentFromSceneDocument(createEmptySceneDocument()),
      scenes: {
        "scene-main": {
          id: "scene-main",
          name: "Untitled Scene",
          loadingScreen: {
            colorHex: "#0d1117",
            headline: null,
            description: null
          },
          editorPreferences: createDefaultSceneEditorPreferences(),
          world: createEmptySceneDocument().world,
          brushes: {
            [invalidBrush.id]: invalidBrush
          },
          terrains: {},
          foliageLayers: {},
          paths: {},
          modelInstances: {},
          entities: {},
          interactionLinks: {}
        }
      }
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("validation error");
  });
});
