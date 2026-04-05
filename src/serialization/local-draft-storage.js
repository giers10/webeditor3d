import { createEmptySceneDocument } from "../document/scene-document";
import { VIEWPORT_PANEL_IDS, cloneViewportLayoutState, createDefaultViewportLayoutState } from "../viewport-three/viewport-layout";
import { parseSceneDocumentJson, serializeSceneDocument } from "./scene-document-json";
export const DEFAULT_SCENE_DRAFT_STORAGE_KEY = "webeditor3d.scene-document-draft";
const EDITOR_DRAFT_ENVELOPE_FORMAT = "webeditor3d.editor-draft.v1";
function getErrorDetail(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    return "Unknown error.";
}
function formatStorageDiagnostic(prefix, error) {
    return `${prefix} ${getErrorDetail(error)}`;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function parseViewportLayoutMode(value) {
    return value === "single" || value === "quad" ? value : null;
}
function parseViewportPanelId(value) {
    return typeof value === "string" && VIEWPORT_PANEL_IDS.includes(value) ? value : null;
}
function parseViewportLayoutState(value) {
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
        if ((storedViewMode !== "perspective" && storedViewMode !== "top" && storedViewMode !== "front" && storedViewMode !== "side") ||
            (storedDisplayMode !== "normal" && storedDisplayMode !== "authoring" && storedDisplayMode !== "wireframe") ||
            storedCameraState === null ||
            storedPerspectiveOrbit === null ||
            storedTarget === null) {
            return null;
        }
        if (!isFiniteNumber(storedTarget.x) ||
            !isFiniteNumber(storedTarget.y) ||
            !isFiniteNumber(storedTarget.z) ||
            !isFiniteNumber(storedPerspectiveOrbit.radius) ||
            !isFiniteNumber(storedPerspectiveOrbit.theta) ||
            !isFiniteNumber(storedPerspectiveOrbit.phi) ||
            !isFiniteNumber(storedCameraState.orthographicZoom)) {
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
function isStoredEditorDraftEnvelope(value) {
    return isRecord(value) && value.format === EDITOR_DRAFT_ENVELOPE_FORMAT && "document" in value;
}
export function getBrowserStorageAccess() {
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
    }
    catch (error) {
        return {
            storage: null,
            diagnostic: formatStorageDiagnostic("Browser local storage is unavailable.", error)
        };
    }
}
export function getBrowserStorage() {
    return getBrowserStorageAccess().storage;
}
export function saveSceneDocumentDraft(storage, document, viewportLayoutState = null, key = DEFAULT_SCENE_DRAFT_STORAGE_KEY) {
    try {
        const rawDocument = serializeSceneDocument(document);
        storage.setItem(key, JSON.stringify({
            format: EDITOR_DRAFT_ENVELOPE_FORMAT,
            document: JSON.parse(rawDocument),
            viewportLayoutState: viewportLayoutState === null ? null : cloneViewportLayoutState(viewportLayoutState)
        }));
        return {
            status: "saved",
            message: "Local draft saved."
        };
    }
    catch (error) {
        return {
            status: "error",
            message: formatStorageDiagnostic("Local draft could not be saved.", error)
        };
    }
}
export function loadSceneDocumentDraft(storage, key = DEFAULT_SCENE_DRAFT_STORAGE_KEY) {
    try {
        const rawDocument = storage.getItem(key);
        if (rawDocument === null) {
            return {
                status: "missing",
                message: "No local draft was found."
            };
        }
        const parsedDraft = JSON.parse(rawDocument);
        if (isStoredEditorDraftEnvelope(parsedDraft)) {
            return {
                status: "loaded",
                document: parseSceneDocumentJson(JSON.stringify(parsedDraft.document)),
                viewportLayoutState: parseViewportLayoutState(parsedDraft.viewportLayoutState ?? null),
                message: "Local draft loaded."
            };
        }
        return {
            status: "loaded",
            document: parseSceneDocumentJson(rawDocument),
            viewportLayoutState: null,
            message: "Local draft loaded."
        };
    }
    catch (error) {
        return {
            status: "error",
            message: formatStorageDiagnostic("Stored local draft could not be loaded.", error)
        };
    }
}
export function loadOrCreateSceneDocument(storage, key = DEFAULT_SCENE_DRAFT_STORAGE_KEY) {
    if (storage === null) {
        return {
            document: createEmptySceneDocument(),
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
                diagnostic: null
            };
        case "missing":
            return {
                document: createEmptySceneDocument(),
                viewportLayoutState: null,
                diagnostic: null
            };
        case "error":
            return {
                document: createEmptySceneDocument(),
                viewportLayoutState: null,
                diagnostic: `${draftResult.message} Starting with a fresh empty document.`
            };
    }
}
