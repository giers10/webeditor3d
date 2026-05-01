import {
  createProjectDocumentFromSceneDocument,
  createEmptyProjectDocument,
  type ProjectDocument
} from "../document/scene-document";
import {
  VIEWPORT_PANEL_IDS,
  cloneViewportLayoutState,
  createDefaultViewportLayoutState,
  type ViewportLayoutMode,
  type ViewportLayoutState,
  type ViewportPanelId
} from "../viewport-three/viewport-layout";

import {
  parseSceneDocumentJson,
  parseProjectDocumentJson
} from "./scene-document-json";
import { assertProjectDocumentIsValid } from "../document/scene-document-validation";

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
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

export type LoadSceneDocumentDraftResult =
  | { status: "loaded"; document: ProjectDocument; viewportLayoutState: ViewportLayoutState | null; message: string }
  | { status: "missing"; message: string }
  | { status: "error"; message: string };

export interface LoadOrCreateSceneDocumentResult {
  document: ProjectDocument;
  viewportLayoutState: ViewportLayoutState | null;
  diagnostic: string | null;
}

export const DEFAULT_SCENE_DRAFT_STORAGE_KEY = "webeditor3d.scene-document-draft";
export const DEFAULT_SCENE_DRAFT_MAX_SERIALIZED_BYTES = 4 * 1024 * 1024;
const MIN_TERRAIN_SAMPLE_JSON_BYTES = 2;
const ESTIMATED_PROJECT_DRAFT_BASE_BYTES = 64 * 1024;
const EDITOR_DRAFT_ENVELOPE_FORMAT = "webeditor3d.editor-draft.v1";

export interface SaveSceneDocumentDraftOptions {
  maxSerializedBytes?: number;
}

interface StoredEditorDraftEnvelope {
  format: typeof EDITOR_DRAFT_ENVELOPE_FORMAT;
  document: unknown;
  viewportLayoutState?: unknown;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function formatStorageDiagnostic(prefix: string, error: unknown): string {
  return `${prefix} ${getErrorDetail(error)}`;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAutosaveTooLargeMessage(sizeBytes: number, maxBytes: number): string {
  return `Autosave skipped because this project draft is about ${formatByteSize(sizeBytes)}, above the ${formatByteSize(maxBytes)} browser autosave limit. The last successful autosave was kept; use project save/export for terrain-heavy scenes.`;
}

function getTerrainDraftSampleValueCount(document: ProjectDocument): number {
  let sampleValueCount = 0;

  for (const scene of Object.values(document.scenes)) {
    for (const terrain of Object.values(scene.terrains)) {
      sampleValueCount += terrain.heights.length + terrain.paintWeights.length;
    }
  }

  return sampleValueCount;
}

export function estimateProjectDraftSerializedBytes(
  document: ProjectDocument,
  viewportLayoutState: ViewportLayoutState | null = null
): number {
  const terrainSampleValueCount = getTerrainDraftSampleValueCount(document);
  const viewportBytes = viewportLayoutState === null ? 0 : 16 * 1024;

  return (
    ESTIMATED_PROJECT_DRAFT_BASE_BYTES +
    viewportBytes +
    terrainSampleValueCount * MIN_TERRAIN_SAMPLE_JSON_BYTES
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseViewportLayoutMode(value: unknown): ViewportLayoutMode | null {
  return value === "single" || value === "quad" ? value : null;
}

function parseViewportPanelId(value: unknown): ViewportPanelId | null {
  return typeof value === "string" && (VIEWPORT_PANEL_IDS as readonly string[]).includes(value) ? (value as ViewportPanelId) : null;
}

export function parseViewportLayoutState(value: unknown): ViewportLayoutState | null {
  if (!isRecord(value)) {
    return null;
  }

  const layoutMode = parseViewportLayoutMode(value.layoutMode);
  const activePanelId = parseViewportPanelId(value.activePanelId);
  const viewportQuadSplit = isRecord(value.viewportQuadSplit) ? value.viewportQuadSplit : null;
  const panels = isRecord(value.panels) ? value.panels : null;

  if (layoutMode === null || activePanelId === null || viewportQuadSplit === null || panels === null) {
    return null;
  }

  if (!isFiniteNumber(viewportQuadSplit.x) || !isFiniteNumber(viewportQuadSplit.y)) {
    return null;
  }

  const defaultLayoutState = createDefaultViewportLayoutState();
  const nextLayoutState = cloneViewportLayoutState(defaultLayoutState);

  nextLayoutState.layoutMode = layoutMode;
  nextLayoutState.activePanelId = activePanelId;
  nextLayoutState.viewportQuadSplit = {
    x: viewportQuadSplit.x,
    y: viewportQuadSplit.y
  };

  for (const panelId of VIEWPORT_PANEL_IDS) {
    const storedPanel = panels[panelId];

    if (!isRecord(storedPanel)) {
      return null;
    }

    const storedViewMode = storedPanel.viewMode;
    const storedDisplayMode = storedPanel.displayMode;
    const storedCameraState = isRecord(storedPanel.cameraState) ? storedPanel.cameraState : null;
    const storedPerspectiveOrbit = storedCameraState !== null && isRecord(storedCameraState.perspectiveOrbit) ? storedCameraState.perspectiveOrbit : null;
    const storedTarget = storedCameraState !== null && isRecord(storedCameraState.target) ? storedCameraState.target : null;

    if (
      (storedViewMode !== "perspective" && storedViewMode !== "top" && storedViewMode !== "front" && storedViewMode !== "side") ||
      (storedDisplayMode !== "normal" && storedDisplayMode !== "authoring" && storedDisplayMode !== "wireframe") ||
      storedCameraState === null ||
      storedPerspectiveOrbit === null ||
      storedTarget === null
    ) {
      return null;
    }

    if (
      !isFiniteNumber(storedTarget.x) ||
      !isFiniteNumber(storedTarget.y) ||
      !isFiniteNumber(storedTarget.z) ||
      !isFiniteNumber(storedPerspectiveOrbit.radius) ||
      !isFiniteNumber(storedPerspectiveOrbit.theta) ||
      !isFiniteNumber(storedPerspectiveOrbit.phi) ||
      !isFiniteNumber(storedCameraState.orthographicZoom)
    ) {
      return null;
    }

    nextLayoutState.panels[panelId] = {
      viewMode: storedViewMode,
      displayMode: storedDisplayMode,
      cameraState: {
        target: {
          x: storedTarget.x,
          y: storedTarget.y,
          z: storedTarget.z
        },
        perspectiveOrbit: {
          radius: storedPerspectiveOrbit.radius,
          theta: storedPerspectiveOrbit.theta,
          phi: storedPerspectiveOrbit.phi
        },
        orthographicZoom: storedCameraState.orthographicZoom
      }
    };
  }

  return nextLayoutState;
}

function isStoredEditorDraftEnvelope(value: unknown): value is StoredEditorDraftEnvelope {
  return isRecord(value) && value.format === EDITOR_DRAFT_ENVELOPE_FORMAT && "document" in value;
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
  document: ProjectDocument,
  viewportLayoutState: ViewportLayoutState | null = null,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  options: SaveSceneDocumentDraftOptions = {}
): SaveSceneDocumentDraftResult {
  try {
    const maxSerializedBytes =
      options.maxSerializedBytes ?? DEFAULT_SCENE_DRAFT_MAX_SERIALIZED_BYTES;
    const estimatedDraftBytes = estimateProjectDraftSerializedBytes(
      document,
      viewportLayoutState
    );

    if (
      Number.isFinite(maxSerializedBytes) &&
      maxSerializedBytes > 0 &&
      estimatedDraftBytes > maxSerializedBytes
    ) {
      return {
        status: "skipped",
        message: getAutosaveTooLargeMessage(
          estimatedDraftBytes,
          maxSerializedBytes
        )
      };
    }

    assertProjectDocumentIsValid(document);

    const rawDraft = JSON.stringify({
        format: EDITOR_DRAFT_ENVELOPE_FORMAT,
        document,
        viewportLayoutState: viewportLayoutState === null ? null : cloneViewportLayoutState(viewportLayoutState)
      } satisfies StoredEditorDraftEnvelope);

    if (
      Number.isFinite(maxSerializedBytes) &&
      maxSerializedBytes > 0 &&
      rawDraft.length > maxSerializedBytes
    ) {
      return {
        status: "skipped",
        message: getAutosaveTooLargeMessage(rawDraft.length, maxSerializedBytes)
      };
    }

    storage.setItem(key, rawDraft);

    return {
      status: "saved",
      message: "Autosave updated."
    };
  } catch (error) {
    return {
      status: "error",
      message: formatStorageDiagnostic("Autosave could not be saved.", error)
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
        message: "No autosave was found."
      };
    }

    const parsedDraft = JSON.parse(rawDocument) as unknown;

    if (isStoredEditorDraftEnvelope(parsedDraft)) {
      return {
        status: "loaded",
        document: parseProjectDocumentJson(JSON.stringify(parsedDraft.document)),
        viewportLayoutState: parseViewportLayoutState(parsedDraft.viewportLayoutState ?? null),
        message: "Recovered latest autosave."
      };
    }

    return {
      status: "loaded",
      document:
        isRecord(parsedDraft) &&
        ("scenes" in parsedDraft || "activeSceneId" in parsedDraft)
          ? parseProjectDocumentJson(rawDocument)
          : createProjectDocumentFromSceneDocument(
              parseSceneDocumentJson(rawDocument)
            ),
      viewportLayoutState: null,
      message: "Recovered latest autosave."
    };
  } catch (error) {
    return {
      status: "error",
      message: formatStorageDiagnostic("Stored autosave could not be loaded.", error)
    };
  }
}

export function loadOrCreateSceneDocument(
  storage: KeyValueStorage | null,
  key = DEFAULT_SCENE_DRAFT_STORAGE_KEY
): LoadOrCreateSceneDocumentResult {
  if (storage === null) {
    return {
      document: createEmptyProjectDocument(),
      viewportLayoutState: null,
      diagnostic: null
    };
  }

  const draftResult = loadSceneDocumentDraft(storage, key);

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
