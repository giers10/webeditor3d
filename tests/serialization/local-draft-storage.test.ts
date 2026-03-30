import { describe, expect, it, vi } from "vitest";

import { SCENE_DOCUMENT_VERSION, createEmptySceneDocument } from "../../src/document/scene-document";
import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  getBrowserStorageAccess,
  loadOrCreateSceneDocument,
  loadSceneDocumentDraft,
  saveSceneDocumentDraft,
  type KeyValueStorage
} from "../../src/serialization/local-draft-storage";

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
    expect(result.document).toEqual(createEmptySceneDocument());
    expect(result.diagnostic).toContain("Stored local draft could not be loaded.");
    expect(result.diagnostic).toContain("Starting with a fresh empty document.");
  });

  it("reports browser storage access failures without throwing", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("access denied");
      }
    });

    try {
      const result = getBrowserStorageAccess();

      expect(result.storage).toBeNull();
      expect(result.diagnostic).toContain("Browser local storage is unavailable.");
      expect(result.diagnostic).toContain("access denied");
    } finally {
      if (originalDescriptor !== undefined) {
        Object.defineProperty(window, "localStorage", originalDescriptor);
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
      createEmptySceneDocument()
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("quota exceeded");
  });
});
