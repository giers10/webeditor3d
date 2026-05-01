import {
  createEmptyProjectDocument,
  type ProjectDocument
} from "../document/scene-document";
import {
  formatSceneDiagnosticSummary,
  validateProjectDocument
} from "../document/scene-document-validation";
import {
  cloneViewportLayoutState,
  type ViewportLayoutState
} from "../viewport-three/viewport-layout";

import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  loadSceneDocumentDraft,
  parseViewportLayoutState,
  saveSceneDocumentDraft,
  type KeyValueStorage,
  type LoadOrCreateSceneDocumentResult,
  type LoadSceneDocumentDraftResult,
  type SaveSceneDocumentDraftResult
} from "./local-draft-storage";
import { parseProjectDocumentJson } from "./scene-document-json";

const EDITOR_DRAFT_DATABASE_NAME = "webeditor3d-editor-drafts";
const EDITOR_DRAFT_DATABASE_VERSION = 1;
const EDITOR_DRAFT_OBJECT_STORE = "drafts";
const EDITOR_DOCUMENT_DRAFT_FORMAT = "webeditor3d.editor-document-draft.v1";
const EDITOR_VIEWPORT_DRAFT_FORMAT = "webeditor3d.editor-viewport-draft.v1";

export type EditorDraftSaveResult = SaveSceneDocumentDraftResult;
export type EditorDraftLoadResult = LoadSceneDocumentDraftResult;

export interface EditorDraftStorage {
  saveDocumentDraft(
    document: ProjectDocument,
    fallbackViewportLayoutState?: ViewportLayoutState | null
  ): Promise<EditorDraftSaveResult>;
  saveViewportLayoutDraft(
    viewportLayoutState: ViewportLayoutState,
    fallbackDocument?: ProjectDocument
  ): Promise<EditorDraftSaveResult>;
  loadDraft(): Promise<EditorDraftLoadResult>;
  flushEmergencyFallback?(
    document: ProjectDocument,
    viewportLayoutState: ViewportLayoutState | null
  ): EditorDraftSaveResult;
}

export interface BrowserEditorDraftStorageAccessResult {
  storage: EditorDraftStorage | null;
  diagnostic: string | null;
}

interface EditorDocumentDraftRecord {
  format: typeof EDITOR_DOCUMENT_DRAFT_FORMAT;
  savedAt: number;
  document: ProjectDocument;
}

interface EditorViewportDraftRecord {
  format: typeof EDITOR_VIEWPORT_DRAFT_FORMAT;
  savedAt: number;
  viewportLayoutState: ViewportLayoutState;
}

interface IndexedDbRequestLike<T> {
  result: T;
  error: DOMException | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function createSavedResult(message = "Autosave updated."): EditorDraftSaveResult {
  return {
    status: "saved",
    message
  };
}

function createSkippedResult(message: string): EditorDraftSaveResult {
  return {
    status: "skipped",
    message
  };
}

function createErrorResult(prefix: string, error: unknown): EditorDraftSaveResult {
  return {
    status: "error",
    message: `${prefix} ${getErrorDetail(error)}`
  };
}

function assertProjectDocumentDraftIsValid(document: ProjectDocument) {
  const validation = validateProjectDocument(document, {
    terrainSampleValues: "skip"
  });

  if (validation.errors.length > 0) {
    throw new Error(
      `Project document draft has ${validation.errors.length} validation error(s): ${formatSceneDiagnosticSummary(validation.errors)}`
    );
  }
}

function parseProjectDocumentDraft(value: unknown): ProjectDocument {
  return parseProjectDocumentJson(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEditorDocumentDraftRecord(
  value: unknown
): value is EditorDocumentDraftRecord {
  return isRecord(value) && value.format === EDITOR_DOCUMENT_DRAFT_FORMAT;
}

function isEditorViewportDraftRecord(
  value: unknown
): value is EditorViewportDraftRecord {
  return isRecord(value) && value.format === EDITOR_VIEWPORT_DRAFT_FORMAT;
}

function getDocumentRecordKey(draftKey: string): string {
  return `${draftKey}:document`;
}

function getViewportRecordKey(draftKey: string): string {
  return `${draftKey}:viewport`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function openEditorDraftDatabase(
  indexedDb: IDBFactory = indexedDB
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(
      EDITOR_DRAFT_DATABASE_NAME,
      EDITOR_DRAFT_DATABASE_VERSION
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(EDITOR_DRAFT_OBJECT_STORE)) {
        database.createObjectStore(EDITOR_DRAFT_OBJECT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB database open failed."));
    request.onblocked = () =>
      reject(new Error("IndexedDB database upgrade was blocked."));
  });
}

export class IndexedDbEditorDraftStorage implements EditorDraftStorage {
  constructor(
    private readonly database: IDBDatabase,
    private readonly draftKey = DEFAULT_SCENE_DRAFT_STORAGE_KEY,
    private readonly legacyStorage: KeyValueStorage | null = null
  ) {}

  async saveDocumentDraft(
    document: ProjectDocument,
    _fallbackViewportLayoutState: ViewportLayoutState | null = null
  ): Promise<EditorDraftSaveResult> {
    try {
      assertProjectDocumentDraftIsValid(document);
      await this.putRecord(getDocumentRecordKey(this.draftKey), {
        format: EDITOR_DOCUMENT_DRAFT_FORMAT,
        savedAt: Date.now(),
        document
      } satisfies EditorDocumentDraftRecord);
      return createSavedResult();
    } catch (error) {
      return createErrorResult("Autosave could not be saved.", error);
    }
  }

  async saveViewportLayoutDraft(
    viewportLayoutState: ViewportLayoutState
  ): Promise<EditorDraftSaveResult> {
    try {
      await this.putRecord(getViewportRecordKey(this.draftKey), {
        format: EDITOR_VIEWPORT_DRAFT_FORMAT,
        savedAt: Date.now(),
        viewportLayoutState: cloneViewportLayoutState(viewportLayoutState)
      } satisfies EditorViewportDraftRecord);
      return createSavedResult();
    } catch (error) {
      return createErrorResult("Autosave could not be saved.", error);
    }
  }

  async loadDraft(): Promise<EditorDraftLoadResult> {
    try {
      const documentRecord = await this.getRecord(
        getDocumentRecordKey(this.draftKey)
      );

      if (documentRecord === undefined) {
        return this.loadLegacyDraft();
      }

      if (!isEditorDocumentDraftRecord(documentRecord)) {
        throw new Error("IndexedDB document draft has an unsupported format.");
      }

      const viewportRecord = await this.getRecord(
        getViewportRecordKey(this.draftKey)
      );
      let viewportLayoutState: ViewportLayoutState | null = null;

      if (viewportRecord !== undefined) {
        if (!isEditorViewportDraftRecord(viewportRecord)) {
          throw new Error("IndexedDB viewport draft has an unsupported format.");
        }

        viewportLayoutState = parseViewportLayoutState(
          viewportRecord.viewportLayoutState
        );
      }

      return {
        status: "loaded",
        document: parseProjectDocumentDraft(documentRecord.document),
        viewportLayoutState,
        message: "Recovered latest autosave."
      };
    } catch (error) {
      return {
        status: "error",
        message: `Stored autosave could not be loaded. ${getErrorDetail(error)}`
      };
    }
  }

  flushEmergencyFallback(
    document: ProjectDocument,
    viewportLayoutState: ViewportLayoutState | null
  ): EditorDraftSaveResult {
    if (this.legacyStorage === null) {
      return createSkippedResult(
        "Emergency localStorage autosave skipped because browser local storage is unavailable."
      );
    }

    return saveSceneDocumentDraft(
      this.legacyStorage,
      document,
      viewportLayoutState,
      this.draftKey
    );
  }

  private async getRecord(key: string): Promise<unknown | undefined> {
    const transaction = this.database.transaction(
      EDITOR_DRAFT_OBJECT_STORE,
      "readonly"
    );
    const store = transaction.objectStore(EDITOR_DRAFT_OBJECT_STORE);
    const result = await requestToPromise(store.get(key));
    await transactionDone(transaction);
    return result;
  }

  private async putRecord(key: string, value: unknown): Promise<void> {
    const transaction = this.database.transaction(
      EDITOR_DRAFT_OBJECT_STORE,
      "readwrite"
    );
    const store = transaction.objectStore(EDITOR_DRAFT_OBJECT_STORE);

    store.put(value, key);
    await transactionDone(transaction);
  }

  private loadLegacyDraft(): EditorDraftLoadResult {
    if (this.legacyStorage === null) {
      return {
        status: "missing",
        message: "No autosave was found."
      };
    }

    return loadSceneDocumentDraft(this.legacyStorage, this.draftKey);
  }
}

export class LocalStorageEditorDraftStorage implements EditorDraftStorage {
  private latestDocument: ProjectDocument | null = null;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly draftKey = DEFAULT_SCENE_DRAFT_STORAGE_KEY
  ) {}

  async saveDocumentDraft(
    document: ProjectDocument,
    fallbackViewportLayoutState: ViewportLayoutState | null = null
  ): Promise<EditorDraftSaveResult> {
    this.latestDocument = document;
    return saveSceneDocumentDraft(
      this.storage,
      document,
      fallbackViewportLayoutState,
      this.draftKey
    );
  }

  async saveViewportLayoutDraft(
    viewportLayoutState: ViewportLayoutState,
    fallbackDocument?: ProjectDocument
  ): Promise<EditorDraftSaveResult> {
    const document = fallbackDocument ?? this.latestDocument;

    if (document === null) {
      return createSkippedResult(
        "Viewport autosave skipped because no document draft is available for localStorage fallback."
      );
    }

    return saveSceneDocumentDraft(
      this.storage,
      document,
      viewportLayoutState,
      this.draftKey
    );
  }

  async loadDraft(): Promise<EditorDraftLoadResult> {
    const result = loadSceneDocumentDraft(this.storage, this.draftKey);

    if (result.status === "loaded") {
      this.latestDocument = result.document;
    }

    return result;
  }

  flushEmergencyFallback(
    document: ProjectDocument,
    viewportLayoutState: ViewportLayoutState | null
  ): EditorDraftSaveResult {
    this.latestDocument = document;
    return saveSceneDocumentDraft(
      this.storage,
      document,
      viewportLayoutState,
      this.draftKey
    );
  }
}

export class MemoryEditorDraftStorage implements EditorDraftStorage {
  private documentRecord: EditorDocumentDraftRecord | null = null;
  private viewportRecord: EditorViewportDraftRecord | null = null;

  constructor(
    private readonly options: {
      legacyStorage?: KeyValueStorage | null;
      draftKey?: string;
    } = {}
  ) {}

  async saveDocumentDraft(
    document: ProjectDocument
  ): Promise<EditorDraftSaveResult> {
    try {
      assertProjectDocumentDraftIsValid(document);
      this.documentRecord = {
        format: EDITOR_DOCUMENT_DRAFT_FORMAT,
        savedAt: Date.now(),
        document
      };
      return createSavedResult();
    } catch (error) {
      return createErrorResult("Autosave could not be saved.", error);
    }
  }

  async saveViewportLayoutDraft(
    viewportLayoutState: ViewportLayoutState
  ): Promise<EditorDraftSaveResult> {
    this.viewportRecord = {
      format: EDITOR_VIEWPORT_DRAFT_FORMAT,
      savedAt: Date.now(),
      viewportLayoutState: cloneViewportLayoutState(viewportLayoutState)
    };
    return createSavedResult();
  }

  async loadDraft(): Promise<EditorDraftLoadResult> {
    if (this.documentRecord === null) {
      const legacyStorage = this.options.legacyStorage ?? null;

      if (legacyStorage !== null) {
        return loadSceneDocumentDraft(
          legacyStorage,
          this.options.draftKey ?? DEFAULT_SCENE_DRAFT_STORAGE_KEY
        );
      }

      return {
        status: "missing",
        message: "No autosave was found."
      };
    }

    return {
      status: "loaded",
      document: parseProjectDocumentDraft(this.documentRecord.document),
      viewportLayoutState:
        this.viewportRecord === null
          ? null
          : parseViewportLayoutState(this.viewportRecord.viewportLayoutState),
      message: "Recovered latest autosave."
    };
  }

  flushEmergencyFallback(
    document: ProjectDocument,
    viewportLayoutState: ViewportLayoutState | null
  ): EditorDraftSaveResult {
    const legacyStorage = this.options.legacyStorage ?? null;

    if (legacyStorage === null) {
      return createSkippedResult(
        "Emergency localStorage autosave skipped because browser local storage is unavailable."
      );
    }

    return saveSceneDocumentDraft(
      legacyStorage,
      document,
      viewportLayoutState,
      this.options.draftKey ?? DEFAULT_SCENE_DRAFT_STORAGE_KEY
    );
  }
}

export async function createBrowserEditorDraftStorage(options: {
  legacyStorage: KeyValueStorage | null;
  draftKey?: string;
  indexedDb?: IDBFactory | null;
}): Promise<BrowserEditorDraftStorageAccessResult> {
  const draftKey = options.draftKey ?? DEFAULT_SCENE_DRAFT_STORAGE_KEY;
  const indexedDb =
    options.indexedDb === undefined
      ? typeof indexedDB === "undefined"
        ? null
        : indexedDB
      : options.indexedDb;

  if (indexedDb !== null) {
    try {
      return {
        storage: new IndexedDbEditorDraftStorage(
          await openEditorDraftDatabase(indexedDb),
          draftKey,
          options.legacyStorage
        ),
        diagnostic: null
      };
    } catch (error) {
      if (options.legacyStorage !== null) {
        return {
          storage: new LocalStorageEditorDraftStorage(
            options.legacyStorage,
            draftKey
          ),
          diagnostic: `IndexedDB autosave is unavailable; using localStorage fallback. ${getErrorDetail(error)}`
        };
      }

      return {
        storage: null,
        diagnostic: `IndexedDB autosave is unavailable and localStorage fallback is unavailable. ${getErrorDetail(error)}`
      };
    }
  }

  if (options.legacyStorage !== null) {
    return {
      storage: new LocalStorageEditorDraftStorage(options.legacyStorage, draftKey),
      diagnostic: "IndexedDB autosave is unavailable; using localStorage fallback."
    };
  }

  return {
    storage: null,
    diagnostic: null
  };
}

export async function loadOrCreateEditorDraft(
  storage: EditorDraftStorage | null
): Promise<LoadOrCreateSceneDocumentResult> {
  if (storage === null) {
    return {
      document: createEmptyProjectDocument(),
      viewportLayoutState: null,
      diagnostic: null
    };
  }

  const draftResult = await storage.loadDraft();

  switch (draftResult.status) {
    case "loaded":
      return {
        document: draftResult.document,
        viewportLayoutState: draftResult.viewportLayoutState,
        diagnostic: draftResult.message
      };
    case "missing":
      return {
        document: createEmptyProjectDocument(),
        viewportLayoutState: null,
        diagnostic: null
      };
    case "error":
      return {
        document: createEmptyProjectDocument(),
        viewportLayoutState: null,
        diagnostic: `${draftResult.message} Starting with a fresh empty document.`
      };
  }
}

export function createResolvedIndexedDbRequest<T>(
  result: T
): IndexedDbRequestLike<T> {
  return {
    result,
    error: null,
    onsuccess: null,
    onerror: null
  };
}
