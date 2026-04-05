import { CommandHistory } from "../commands/command-history";
import { areEditorSelectionsEqual, normalizeSelectionForWhiteboxSelectionMode } from "../core/selection";
import {} from "../core/whitebox-selection-mode";
import { areTransformSessionsEqual, cloneTransformSession, createInactiveTransformSession } from "../core/transform-session";
import { createEmptySceneDocument } from "../document/scene-document";
import { DEFAULT_SCENE_DRAFT_STORAGE_KEY, loadSceneDocumentDraft, saveSceneDocumentDraft } from "../serialization/local-draft-storage";
import { parseSceneDocumentJson, serializeSceneDocument } from "../serialization/scene-document-json";
import { areViewportToolPreviewsEqual, cloneViewportToolPreview, createDefaultViewportTransientState, isViewportToolPreviewCompatible } from "../viewport-three/viewport-transient-state";
import { areViewportPanelCameraStatesEqual, cloneViewportLayoutState, cloneViewportPanelCameraState, createDefaultViewportLayoutState } from "../viewport-three/viewport-layout";
export class EditorStore {
    document;
    selection = { kind: "none" };
    whiteboxSelectionMode = "object";
    toolMode = "select";
    viewportLayoutMode;
    activeViewportPanelId;
    viewportPanels;
    viewportQuadSplit;
    viewportTransientState = createDefaultViewportTransientState();
    previousEditingToolMode = "select";
    history = new CommandHistory();
    listeners = new Set();
    storage;
    storageKey;
    lastCommandLabel = null;
    snapshot;
    commandContext = {
        getDocument: () => this.document,
        setDocument: (document) => {
            this.document = document;
        },
        getSelection: () => this.selection,
        setSelection: (selection) => {
            this.selection = selection;
        },
        getToolMode: () => this.toolMode,
        setToolMode: (toolMode) => {
            this.toolMode = toolMode;
        }
    };
    constructor(options = {}) {
        const initialViewportLayoutState = cloneViewportLayoutState(options.initialViewportLayoutState ?? createDefaultViewportLayoutState());
        this.document = options.initialDocument ?? createEmptySceneDocument();
        this.viewportLayoutMode = initialViewportLayoutState.layoutMode;
        this.activeViewportPanelId = initialViewportLayoutState.activePanelId;
        this.viewportPanels = initialViewportLayoutState.panels;
        this.viewportQuadSplit = initialViewportLayoutState.viewportQuadSplit;
        this.storage = options.storage ?? null;
        this.storageKey = options.storageKey ?? DEFAULT_SCENE_DRAFT_STORAGE_KEY;
        this.snapshot = this.createSnapshot();
    }
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    getState = () => this.snapshot;
    setToolMode(toolMode) {
        if (this.toolMode === toolMode) {
            return;
        }
        if (toolMode !== "play") {
            this.previousEditingToolMode = toolMode;
        }
        this.toolMode = toolMode;
        if (!isViewportToolPreviewCompatible(toolMode, this.viewportTransientState.toolPreview)) {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                toolPreview: createDefaultViewportTransientState().toolPreview
            };
        }
        if (toolMode !== "select" && this.viewportTransientState.transformSession.kind !== "none") {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
        }
        this.emit();
    }
    setViewportLayoutMode(viewportLayoutMode) {
        if (this.viewportLayoutMode === viewportLayoutMode) {
            return;
        }
        this.viewportLayoutMode = viewportLayoutMode;
        this.emit();
    }
    setActiveViewportPanel(panelId) {
        if (this.activeViewportPanelId === panelId) {
            return;
        }
        this.activeViewportPanelId = panelId;
        this.emit();
    }
    setViewportPanelViewMode(panelId, viewMode) {
        if (this.viewportPanels[panelId].viewMode === viewMode) {
            return;
        }
        this.viewportPanels = {
            ...this.viewportPanels,
            [panelId]: {
                ...this.viewportPanels[panelId],
                viewMode
            }
        };
        this.emit();
    }
    setViewportPanelDisplayMode(panelId, displayMode) {
        if (this.viewportPanels[panelId].displayMode === displayMode) {
            return;
        }
        this.viewportPanels = {
            ...this.viewportPanels,
            [panelId]: {
                ...this.viewportPanels[panelId],
                displayMode
            }
        };
        this.emit();
    }
    setViewportPanelCameraState(panelId, cameraState) {
        if (areViewportPanelCameraStatesEqual(this.viewportPanels[panelId].cameraState, cameraState)) {
            return;
        }
        this.viewportPanels = {
            ...this.viewportPanels,
            [panelId]: {
                ...this.viewportPanels[panelId],
                cameraState: cloneViewportPanelCameraState(cameraState)
            }
        };
        this.emit();
    }
    setViewportQuadSplit(viewportQuadSplit) {
        if (this.viewportQuadSplit.x === viewportQuadSplit.x && this.viewportQuadSplit.y === viewportQuadSplit.y) {
            return;
        }
        this.viewportQuadSplit = {
            x: viewportQuadSplit.x,
            y: viewportQuadSplit.y
        };
        this.emit();
    }
    setViewportToolPreview(toolPreview) {
        const nextToolPreview = cloneViewportToolPreview(toolPreview);
        if (areViewportToolPreviewsEqual(this.viewportTransientState.toolPreview, nextToolPreview)) {
            return;
        }
        this.viewportTransientState = {
            ...this.viewportTransientState,
            toolPreview: nextToolPreview
        };
        this.emit();
    }
    clearViewportToolPreview(sourcePanelId) {
        const currentToolPreview = this.viewportTransientState.toolPreview;
        if (currentToolPreview.kind === "none") {
            return;
        }
        if (sourcePanelId !== undefined && currentToolPreview.sourcePanelId !== sourcePanelId) {
            return;
        }
        this.viewportTransientState = {
            ...this.viewportTransientState,
            toolPreview: createDefaultViewportTransientState().toolPreview
        };
        this.emit();
    }
    setTransformSession(transformSession) {
        const nextTransformSession = cloneTransformSession(transformSession);
        if (areTransformSessionsEqual(this.viewportTransientState.transformSession, nextTransformSession)) {
            return;
        }
        this.viewportTransientState = {
            ...this.viewportTransientState,
            transformSession: nextTransformSession
        };
        this.emit();
    }
    clearTransformSession() {
        if (this.viewportTransientState.transformSession.kind === "none") {
            return;
        }
        this.viewportTransientState = {
            ...this.viewportTransientState,
            transformSession: createInactiveTransformSession()
        };
        this.emit();
    }
    setTransformAxisConstraint(axisConstraint) {
        if (this.viewportTransientState.transformSession.kind !== "active") {
            return;
        }
        if (this.viewportTransientState.transformSession.axisConstraint === axisConstraint) {
            return;
        }
        this.viewportTransientState = {
            ...this.viewportTransientState,
            transformSession: {
                ...cloneTransformSession(this.viewportTransientState.transformSession),
                axisConstraint
            }
        };
        this.emit();
    }
    setViewportViewMode(viewportViewMode) {
        this.setViewportPanelViewMode(this.activeViewportPanelId, viewportViewMode);
    }
    enterPlayMode() {
        if (this.toolMode === "play") {
            return;
        }
        this.previousEditingToolMode = this.toolMode;
        this.toolMode = "play";
        if (this.viewportTransientState.toolPreview.kind !== "none") {
            this.viewportTransientState = createDefaultViewportTransientState();
        }
        this.emit();
    }
    exitPlayMode() {
        if (this.toolMode !== "play") {
            return;
        }
        this.toolMode = this.previousEditingToolMode;
        this.emit();
    }
    setSelection(selection) {
        if (this.viewportTransientState.transformSession.kind === "active" && !areEditorSelectionsEqual(this.selection, selection)) {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
        }
        this.selection = selection;
        this.emit();
    }
    setWhiteboxSelectionMode(mode) {
        if (this.whiteboxSelectionMode === mode) {
            return;
        }
        if (this.viewportTransientState.transformSession.kind !== "none") {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
        }
        this.whiteboxSelectionMode = mode;
        this.selection = normalizeSelectionForWhiteboxSelectionMode(this.selection, mode);
        this.emit();
    }
    executeCommand(command) {
        if (this.viewportTransientState.transformSession.kind !== "none") {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
        }
        this.history.execute(command, this.commandContext);
        this.lastCommandLabel = command.label;
        this.emit();
    }
    undo() {
        let clearedTransformSession = false;
        if (this.viewportTransientState.transformSession.kind !== "none") {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
            clearedTransformSession = true;
        }
        const command = this.history.undo(this.commandContext);
        if (command === null) {
            if (clearedTransformSession) {
                this.emit();
            }
            return false;
        }
        this.lastCommandLabel = `Undid ${command.label}`;
        this.emit();
        return true;
    }
    redo() {
        let clearedTransformSession = false;
        if (this.viewportTransientState.transformSession.kind !== "none") {
            this.viewportTransientState = {
                ...this.viewportTransientState,
                transformSession: createInactiveTransformSession()
            };
            clearedTransformSession = true;
        }
        const command = this.history.redo(this.commandContext);
        if (command === null) {
            if (clearedTransformSession) {
                this.emit();
            }
            return false;
        }
        this.lastCommandLabel = `Redid ${command.label}`;
        this.emit();
        return true;
    }
    replaceDocument(document, resetHistory = true) {
        this.document = document;
        this.selection = { kind: "none" };
        this.whiteboxSelectionMode = "object";
        this.toolMode = "select";
        this.previousEditingToolMode = "select";
        this.viewportTransientState = createDefaultViewportTransientState();
        if (resetHistory) {
            this.history.clear();
            this.lastCommandLabel = null;
        }
        this.emit();
    }
    saveDraft() {
        if (this.storage === null) {
            return {
                status: "error",
                message: "Browser local storage is unavailable."
            };
        }
        return saveSceneDocumentDraft(this.storage, this.document, this.createViewportLayoutState(), this.storageKey);
    }
    loadDraft() {
        if (this.storage === null) {
            return {
                status: "error",
                message: "Browser local storage is unavailable."
            };
        }
        const draftResult = loadSceneDocumentDraft(this.storage, this.storageKey);
        if (draftResult.status !== "loaded") {
            return draftResult;
        }
        this.replaceDocument(draftResult.document);
        if (draftResult.viewportLayoutState !== null) {
            this.applyViewportLayoutState(draftResult.viewportLayoutState);
            this.emit();
        }
        return draftResult;
    }
    exportDocumentJson() {
        return serializeSceneDocument(this.document);
    }
    importDocumentJson(source) {
        const document = parseSceneDocumentJson(source);
        this.replaceDocument(document);
        return document;
    }
    emit() {
        this.snapshot = this.createSnapshot();
        for (const listener of this.listeners) {
            listener();
        }
    }
    createViewportLayoutState() {
        return cloneViewportLayoutState({
            layoutMode: this.viewportLayoutMode,
            activePanelId: this.activeViewportPanelId,
            panels: this.viewportPanels,
            viewportQuadSplit: this.viewportQuadSplit
        });
    }
    applyViewportLayoutState(viewportLayoutState) {
        const nextViewportLayoutState = cloneViewportLayoutState(viewportLayoutState);
        this.viewportLayoutMode = nextViewportLayoutState.layoutMode;
        this.activeViewportPanelId = nextViewportLayoutState.activePanelId;
        this.viewportPanels = nextViewportLayoutState.panels;
        this.viewportQuadSplit = nextViewportLayoutState.viewportQuadSplit;
    }
    createSnapshot() {
        return {
            document: this.document,
            selection: this.selection,
            whiteboxSelectionMode: this.whiteboxSelectionMode,
            toolMode: this.toolMode,
            viewportLayoutMode: this.viewportLayoutMode,
            activeViewportPanelId: this.activeViewportPanelId,
            viewportPanels: this.viewportPanels,
            viewportQuadSplit: this.viewportQuadSplit,
            viewportTransientState: this.viewportTransientState,
            canUndo: this.history.canUndo(),
            canRedo: this.history.canRedo(),
            lastCommandLabel: this.lastCommandLabel,
            storageAvailable: this.storage !== null
        };
    }
}
export function createEditorStore(options) {
    return new EditorStore(options);
}
