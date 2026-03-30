import { createEmptySceneDocument, type SceneDocument } from "../document/scene-document";

import { parseSceneDocumentJson, serializeSceneDocument } from "./scene-document-json";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SCENE_DRAFT_STORAGE_KEY = "webeditor3d.scene-document-draft";

export function getBrowserStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function saveSceneDocumentDraft(
  storage: KeyValueStorage,
  document: SceneDocument,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY
) {
  storage.setItem(key, serializeSceneDocument(document));
}

export function loadSceneDocumentDraft(storage: KeyValueStorage, key = DEFAULT_SCENE_DRAFT_STORAGE_KEY): SceneDocument | null {
  const rawDocument = storage.getItem(key);

  if (rawDocument === null) {
    return null;
  }

  return parseSceneDocumentJson(rawDocument);
}

export function loadOrCreateSceneDocument(storage: KeyValueStorage | null, key = DEFAULT_SCENE_DRAFT_STORAGE_KEY): SceneDocument {
  if (storage === null) {
    return createEmptySceneDocument();
  }

  return loadSceneDocumentDraft(storage, key) ?? createEmptySceneDocument();
}
