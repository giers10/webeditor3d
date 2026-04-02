import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createSetSceneNameCommand } from "../../src/commands/set-scene-name-command";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import type { KeyValueStorage } from "../../src/serialization/local-draft-storage";

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
  getItem(): string | null {
    throw new Error("blocked read");
  }

  setItem(): void {
    throw new Error("blocked write");
  }

  removeItem(): void {}
}

describe("EditorStore", () => {
  it("returns a stable snapshot between store updates", () => {
    const store = createEditorStore();

    const initialSnapshot = store.getState();
    const repeatedSnapshot = store.getState();

    expect(repeatedSnapshot).toBe(initialSnapshot);

    store.executeCommand(createSetSceneNameCommand("Snapshot Scene"));

    const updatedSnapshot = store.getState();
    expect(updatedSnapshot).not.toBe(initialSnapshot);
    expect(updatedSnapshot.document.name).toBe("Snapshot Scene");
  });

  it("applies command history with undo and redo", () => {
    const store = createEditorStore();

    store.executeCommand(createSetSceneNameCommand("Foundation Room"));

    expect(store.getState().document.name).toBe("Foundation Room");
    expect(store.getState().canUndo).toBe(true);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.name).toBe("Untitled Scene");
    expect(store.getState().canRedo).toBe(true);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.name).toBe("Foundation Room");
  });

  it("saves and loads a local draft document", () => {
    const storage = new MemoryStorage();
    const writerStore = createEditorStore({ storage });

    writerStore.executeCommand(createSetSceneNameCommand("Draft Scene"));
    expect(writerStore.saveDraft()).toEqual({
      status: "saved",
      message: "Local draft saved."
    });

    const readerStore = createEditorStore({
      initialDocument: createEmptySceneDocument({ name: "Fresh Scene" }),
      storage
    });

    expect(readerStore.loadDraft()).toMatchObject({
      status: "loaded",
      message: "Local draft loaded."
    });
    expect(readerStore.getState().document.name).toBe("Draft Scene");
  });

  it("fails gracefully when storage access throws", () => {
    const store = createEditorStore({ storage: new ThrowingStorage() });

    expect(store.saveDraft()).toMatchObject({
      status: "error",
      message: expect.stringContaining("blocked write")
    });

    expect(store.loadDraft()).toMatchObject({
      status: "error",
      message: expect.stringContaining("blocked read")
    });
  });

  it("restores the previous editor tool when leaving play mode", () => {
    const store = createEditorStore();

    store.setToolMode("box-create");
    store.enterPlayMode();

    expect(store.getState().toolMode).toBe("play");

    store.exitPlayMode();

    expect(store.getState().toolMode).toBe("box-create");
  });

  it("tracks viewport layout and per-panel state independently from the document", () => {
    const store = createEditorStore();

    expect(store.getState().viewportLayoutMode).toBe("single");
    expect(store.getState().activeViewportPanelId).toBe("topLeft");
    expect(store.getState().viewportPanels.topLeft.viewMode).toBe("perspective");
    expect(store.getState().viewportPanels.topRight.viewMode).toBe("top");
    expect(store.getState().viewportPanels.topRight.displayMode).toBe("authoring");

    store.setViewportLayoutMode("quad");
    store.setActiveViewportPanel("bottomRight");
    store.setViewportPanelViewMode("bottomRight", "front");
    store.setViewportPanelDisplayMode("bottomRight", "normal");

    expect(store.getState().viewportLayoutMode).toBe("quad");
    expect(store.getState().activeViewportPanelId).toBe("bottomRight");
    expect(store.getState().viewportPanels.bottomRight.viewMode).toBe("front");
    expect(store.getState().viewportPanels.bottomRight.displayMode).toBe("normal");
  });

  it("shares transient box-create preview state across viewport panels", () => {
    const store = createEditorStore();

    expect(store.getState().viewportTransientState.toolPreview).toEqual({
      kind: "none"
    });

    store.setViewportToolPreview({
      kind: "box-create",
      sourcePanelId: "topLeft",
      center: {
        x: 4,
        y: 0,
        z: 8
      }
    });

    expect(store.getState().viewportTransientState.toolPreview).toEqual({
      kind: "box-create",
      sourcePanelId: "topLeft",
      center: {
        x: 4,
        y: 0,
        z: 8
      }
    });

    store.clearViewportToolPreview("topRight");
    expect(store.getState().viewportTransientState.toolPreview).toEqual({
      kind: "box-create",
      sourcePanelId: "topLeft",
      center: {
        x: 4,
        y: 0,
        z: 8
      }
    });

    store.clearViewportToolPreview("topLeft");
    expect(store.getState().viewportTransientState.toolPreview).toEqual({
      kind: "none"
    });
  });

  it("clears transient viewport preview when leaving box-create mode", () => {
    const store = createEditorStore();

    store.setViewportToolPreview({
      kind: "box-create",
      sourcePanelId: "bottomRight",
      center: null
    });
    store.setToolMode("select");

    expect(store.getState().viewportTransientState.toolPreview).toEqual({
      kind: "none"
    });
  });
});
