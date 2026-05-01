import { describe, expect, it } from "vitest";

import { createSetSceneNameCommand } from "../../src/commands/set-scene-name-command";
import { createEditorStore } from "../../src/app/editor-store";
import {
  createEmptySceneDocument,
  createProjectDocumentFromSceneDocument
} from "../../src/document/scene-document";
import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  saveSceneDocumentDraft,
  type KeyValueStorage
} from "../../src/serialization/local-draft-storage";
import { MemoryEditorDraftStorage } from "../../src/serialization/editor-draft-storage";
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

describe("editor draft storage", () => {
  it("saves and restores document and viewport layout drafts separately", async () => {
    const storage = new MemoryEditorDraftStorage();
    const viewportLayoutState = createDefaultViewportLayoutState();

    viewportLayoutState.layoutMode = "quad";
    viewportLayoutState.activePanelId = "bottomRight";
    viewportLayoutState.panels.topLeft.cameraState.target = {
      x: 3,
      y: 4,
      z: 5
    };

    await expect(
      storage.saveDocumentDraft(
        createProjectDocumentFromSceneDocument(
          createEmptySceneDocument({ name: "Document Draft" })
        )
      )
    ).resolves.toEqual({
      status: "saved",
      message: "Autosave updated."
    });
    await expect(
      storage.saveViewportLayoutDraft(viewportLayoutState)
    ).resolves.toEqual({
      status: "saved",
      message: "Autosave updated."
    });

    const result = await storage.loadDraft();

    expect(result.status).toBe("loaded");

    if (result.status !== "loaded") {
      return;
    }

    expect(result.document.scenes[result.document.activeSceneId]?.name).toBe(
      "Document Draft"
    );
    expect(result.viewportLayoutState).toMatchObject({
      layoutMode: "quad",
      activePanelId: "bottomRight",
      panels: {
        topLeft: {
          cameraState: {
            target: {
              x: 3,
              y: 4,
              z: 5
            }
          }
        }
      }
    });

    const nextViewportLayoutState = createDefaultViewportLayoutState();
    nextViewportLayoutState.panels.topLeft.cameraState.target = {
      x: 9,
      y: 8,
      z: 7
    };

    await storage.saveViewportLayoutDraft(nextViewportLayoutState);

    const nextResult = await storage.loadDraft();

    expect(nextResult.status).toBe("loaded");

    if (nextResult.status !== "loaded") {
      return;
    }

    expect(
      nextResult.document.scenes[nextResult.document.activeSceneId]?.name
    ).toBe("Document Draft");
    expect(
      nextResult.viewportLayoutState?.panels.topLeft.cameraState.target
    ).toEqual({
      x: 9,
      y: 8,
      z: 7
    });
  });

  it("falls back to a legacy localStorage draft when no async document draft exists", async () => {
    const legacyStorage = new MemoryStorage();
    saveSceneDocumentDraft(
      legacyStorage,
      createProjectDocumentFromSceneDocument(
        createEmptySceneDocument({ name: "Legacy Draft" })
      )
    );
    const storage = new MemoryEditorDraftStorage({
      legacyStorage
    });

    const result = await storage.loadDraft();

    expect(result.status).toBe("loaded");

    if (result.status !== "loaded") {
      return;
    }

    expect(result.document.scenes[result.document.activeSceneId]?.name).toBe(
      "Legacy Draft"
    );
  });

  it("saves viewport-only drafts without requiring document validation", async () => {
    const storage = new MemoryEditorDraftStorage();
    const viewportLayoutState = createDefaultViewportLayoutState();

    viewportLayoutState.panels.topLeft.cameraState.orthographicZoom = 3;

    await expect(
      storage.saveViewportLayoutDraft(viewportLayoutState)
    ).resolves.toEqual({
      status: "saved",
      message: "Autosave updated."
    });
  });

  it("lets the editor store provide document and viewport snapshots independently", () => {
    const store = createEditorStore();

    store.executeCommand(createSetSceneNameCommand("Snapshot Scene"));
    store.setViewportLayoutMode("quad");
    store.setActiveViewportPanel("bottomRight");

    expect(
      store.getProjectDocumentDraftSnapshot().scenes[
        store.getProjectDocumentDraftSnapshot().activeSceneId
      ]?.name
    ).toBe("Snapshot Scene");
    expect(store.getViewportLayoutDraftSnapshot()).toMatchObject({
      layoutMode: "quad",
      activePanelId: "bottomRight"
    });
  });
});
