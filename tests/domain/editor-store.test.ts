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

describe("EditorStore", () => {
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
    expect(writerStore.saveDraft()).toBe(true);

    const readerStore = createEditorStore({
      initialDocument: createEmptySceneDocument({ name: "Fresh Scene" }),
      storage
    });

    expect(readerStore.loadDraft()).toBe(true);
    expect(readerStore.getState().document.name).toBe("Draft Scene");
  });
});
