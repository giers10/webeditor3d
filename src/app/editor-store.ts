import { CommandHistory } from "../commands/command-history";
import type { CommandContext, EditorCommand } from "../commands/command";
import {
  areEditorSelectionsEqual,
  normalizeSelectionForWhiteboxSelectionMode,
  type EditorSelection
} from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { type WhiteboxSelectionMode } from "../core/whitebox-selection-mode";
import {
  areTransformSessionsEqual,
  cloneTransformSession,
  createInactiveTransformSession,
  type TransformAxis,
  type TransformSessionState
} from "../core/transform-session";
import { createEmptySceneDocument, type SceneDocument } from "../document/scene-document";
import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  type LoadSceneDocumentDraftResult,
  loadSceneDocumentDraft,
  type KeyValueStorage,
  type SaveSceneDocumentDraftResult,
  saveSceneDocumentDraft
} from "../serialization/local-draft-storage";
import { parseSceneDocumentJson, serializeSceneDocument } from "../serialization/scene-document-json";
import type { ViewportViewMode } from "../viewport-three/viewport-view-modes";
import {
  areViewportToolPreviewsEqual,
  cloneViewportToolPreview,
  createDefaultViewportTransientState,
  isViewportToolPreviewCompatible,
  type ViewportToolPreview,
  type ViewportTransientState
} from "../viewport-three/viewport-transient-state";
import {
  areViewportPanelCameraStatesEqual,
  cloneViewportLayoutState,
  cloneViewportPanelCameraState,
  createDefaultViewportLayoutState,
  type ViewportDisplayMode,
  type ViewportLayoutState,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportPanelState,
  type ViewportPanelCameraState,
  type ViewportQuadSplit
} from "../viewport-three/viewport-layout";

export interface EditorStoreState {
  document: SceneDocument;
  selection: EditorSelection;
  whiteboxSelectionMode: WhiteboxSelectionMode;
  toolMode: ToolMode;
  viewportLayoutMode: ViewportLayoutMode;
  activeViewportPanelId: ViewportPanelId;
  viewportPanels: Record<ViewportPanelId, ViewportPanelState>;
  viewportQuadSplit: ViewportQuadSplit;
  viewportTransientState: ViewportTransientState;
  canUndo: boolean;
  canRedo: boolean;
  lastCommandLabel: string | null;
  storageAvailable: boolean;
}

interface EditorStoreOptions {
  initialDocument?: SceneDocument;
  initialViewportLayoutState?: ViewportLayoutState;
  storage?: KeyValueStorage | null;
  storageKey?: string;
}

type EditorStoreListener = () => void;

export type EditorDraftSaveResult = SaveSceneDocumentDraftResult;
export type EditorDraftLoadResult = LoadSceneDocumentDraftResult;

export class EditorStore {
  private document: SceneDocument;
  private selection: EditorSelection = { kind: "none" };
  private whiteboxSelectionMode: WhiteboxSelectionMode = "object";
  private toolMode: ToolMode = "select";
  private viewportLayoutMode: ViewportLayoutMode;
  private activeViewportPanelId: ViewportPanelId;
  private viewportPanels: Record<ViewportPanelId, ViewportPanelState>;
  private viewportQuadSplit: ViewportQuadSplit;
  private viewportTransientState = createDefaultViewportTransientState();
  private previousEditingToolMode: Exclude<ToolMode, "play"> = "select";
  private readonly history = new CommandHistory();
  private readonly listeners = new Set<EditorStoreListener>();
  private readonly storage: KeyValueStorage | null;
  private readonly storageKey: string;
  private lastCommandLabel: string | null = null;
  private snapshot: EditorStoreState;

  private readonly commandContext: CommandContext = {
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

  constructor(options: EditorStoreOptions = {}) {
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

  subscribe = (listener: EditorStoreListener) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): EditorStoreState => this.snapshot;

  setToolMode(toolMode: ToolMode) {
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

  setViewportLayoutMode(viewportLayoutMode: ViewportLayoutMode) {
    if (this.viewportLayoutMode === viewportLayoutMode) {
      return;
    }

    this.viewportLayoutMode = viewportLayoutMode;
    this.emit();
  }

  setActiveViewportPanel(panelId: ViewportPanelId) {
    if (this.activeViewportPanelId === panelId) {
      return;
    }

    this.activeViewportPanelId = panelId;
    this.emit();
  }

  setViewportPanelViewMode(panelId: ViewportPanelId, viewMode: ViewportViewMode) {
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

  setViewportPanelDisplayMode(panelId: ViewportPanelId, displayMode: ViewportDisplayMode) {
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

  setViewportPanelCameraState(panelId: ViewportPanelId, cameraState: ViewportPanelCameraState) {
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

  setViewportQuadSplit(viewportQuadSplit: ViewportQuadSplit) {
    if (this.viewportQuadSplit.x === viewportQuadSplit.x && this.viewportQuadSplit.y === viewportQuadSplit.y) {
      return;
    }

    this.viewportQuadSplit = {
      x: viewportQuadSplit.x,
      y: viewportQuadSplit.y
    };
    this.emit();
  }

  setViewportToolPreview(toolPreview: ViewportToolPreview) {
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

  clearViewportToolPreview(sourcePanelId?: ViewportPanelId) {
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

  setTransformSession(transformSession: TransformSessionState) {
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

  setTransformAxisConstraint(axisConstraint: TransformAxis | null) {
    if (this.viewportTransientState.transformSession.kind !== "active") {
      return;
    }

    if (this.viewportTransientState.transformSession.axisConstraint === axisConstraint) {
      return;
    }

    this.viewportTransientState = {
      ...this.viewportTransientState,
      transformSession: {
        ...(cloneTransformSession(this.viewportTransientState.transformSession) as Extract<TransformSessionState, { kind: "active" }>),
        axisConstraint
      }
    };
    this.emit();
  }

  setViewportViewMode(viewportViewMode: ViewportViewMode) {
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

  setSelection(selection: EditorSelection) {
    if (this.viewportTransientState.transformSession.kind === "active" && !areEditorSelectionsEqual(this.selection, selection)) {
      this.viewportTransientState = {
        ...this.viewportTransientState,
        transformSession: createInactiveTransformSession()
      };
    }

    this.selection = selection;
    this.emit();
  }

  setWhiteboxSelectionMode(mode: WhiteboxSelectionMode) {
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

  executeCommand(command: EditorCommand) {
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

  undo(): boolean {
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

  redo(): boolean {
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

  replaceDocument(document: SceneDocument, resetHistory = true) {
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

  saveDraft(): EditorDraftSaveResult {
    if (this.storage === null) {
      return {
        status: "error",
        message: "Browser local storage is unavailable."
      };
    }

    return saveSceneDocumentDraft(this.storage, this.document, this.createViewportLayoutState(), this.storageKey);
  }

  loadDraft(): EditorDraftLoadResult {
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

  exportDocumentJson(): string {
    return serializeSceneDocument(this.document);
  }

  importDocumentJson(source: string): SceneDocument {
    const document = parseSceneDocumentJson(source);
    this.replaceDocument(document);
    return document;
  }

  private emit() {
    this.snapshot = this.createSnapshot();

    for (const listener of this.listeners) {
      listener();
    }
  }

  private createViewportLayoutState(): ViewportLayoutState {
    return cloneViewportLayoutState({
      layoutMode: this.viewportLayoutMode,
      activePanelId: this.activeViewportPanelId,
      panels: this.viewportPanels,
      viewportQuadSplit: this.viewportQuadSplit
    });
  }

  private applyViewportLayoutState(viewportLayoutState: ViewportLayoutState) {
    const nextViewportLayoutState = cloneViewportLayoutState(viewportLayoutState);

    this.viewportLayoutMode = nextViewportLayoutState.layoutMode;
    this.activeViewportPanelId = nextViewportLayoutState.activePanelId;
    this.viewportPanels = nextViewportLayoutState.panels;
    this.viewportQuadSplit = nextViewportLayoutState.viewportQuadSplit;
  }

  private createSnapshot(): EditorStoreState {
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

export function createEditorStore(options?: EditorStoreOptions): EditorStore {
  return new EditorStore(options);
}
