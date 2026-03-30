import { createEmptySceneDocument, type SceneDocument } from "../document/scene-document";

import { parseSceneDocumentJson, serializeSceneDocument } from "./scene-document-json";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserStorageAccessResult {
  storage: KeyValueStorage | null;
  diagnostic: string | null;
}

export type SaveSceneDocumentDraftResult =
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

export type LoadSceneDocumentDraftResult =
  | { status: "loaded"; document: SceneDocument; message: string }
  | { status: "missing"; message: string }
  | { status: "error"; message: string };

export interface LoadOrCreateSceneDocumentResult {
  document: SceneDocument;
  diagnostic: string | null;
}

export const DEFAULT_SCENE_DRAFT_STORAGE_KEY = "webeditor3d.scene-document-draft";

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function formatStorageDiagnostic(prefix: string, error: unknown): string {
  return `${prefix} ${getErrorDetail(error)}`;
}

export function getBrowserStorageAccess(): BrowserStorageAccessResult {
  if (typeof window === "undefined") {
    return {
      storage: null,
      diagnostic: null
    };
  }

  try {
    return {
      storage: window.localStorage,
      diagnostic: null
    };
  } catch (error) {
    return {
      storage: null,
      diagnostic: formatStorageDiagnostic("Browser local storage is unavailable.", error)
    };
  }
}

export function getBrowserStorage(): KeyValueStorage | null {
  return getBrowserStorageAccess().storage;
}

export function saveSceneDocumentDraft(
  storage: KeyValueStorage,
  document: SceneDocument,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY
): SaveSceneDocumentDraftResult {
  try {
    storage.setItem(key, serializeSceneDocument(document));

    return {
      status: "saved",
      message: "Local draft saved."
    };
  } catch (error) {
    return {
      status: "error",
      message: formatStorageDiagnostic("Local draft could not be saved.", error)
    };
  }
}

export function loadSceneDocumentDraft(
  storage: KeyValueStorage,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY
): LoadSceneDocumentDraftResult {
  try {
    const rawDocument = storage.getItem(key);

    if (rawDocument === null) {
      return {
        status: "missing",
        message: "No local draft was found."
      };
    }

    return {
      status: "loaded",
      document: parseSceneDocumentJson(rawDocument),
      message: "Local draft loaded."
    };
  } catch (error) {
    return {
      status: "error",
      message: formatStorageDiagnostic("Stored local draft could not be loaded.", error)
    };
  }
}

export function loadOrCreateSceneDocument(
  storage: KeyValueStorage | null,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY
): LoadOrCreateSceneDocumentResult {
  if (storage === null) {
    return {
      document: createEmptySceneDocument(),
      diagnostic: null
    };
  }

  const draftResult = loadSceneDocumentDraft(storage, key);

  switch (draftResult.status) {
    case "loaded":
      return {
        document: draftResult.document,
        diagnostic: null
      };
    case "missing":
      return {
        document: createEmptySceneDocument(),
        diagnostic: null
      };
    case "error":
      return {
        document: createEmptySceneDocument(),
        diagnostic: `${draftResult.message} Starting with a fresh empty document.`
      };
  }
}
