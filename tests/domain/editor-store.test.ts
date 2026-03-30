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
  getItem(_key: string): string | null {
    throw new Error("blocked read");
  }

  setItem(_key: string, _value: string): void {
    throw new Error("blocked write");
  }

  removeItem(_key: string): void {}
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
});
