import { CommandHistory } from "../commands/command-history";
import type { CommandContext, EditorCommand } from "../commands/command";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
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
  createDefaultViewportLayoutState,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportPanelState
} from "../viewport-three/viewport-layout";

export interface EditorStoreState {
  document: SceneDocument;
  selection: EditorSelection;
  toolMode: ToolMode;
  viewportLayoutMode: ViewportLayoutMode;
  activeViewportPanelId: ViewportPanelId;
  viewportPanels: Record<ViewportPanelId, ViewportPanelState>;
  canUndo: boolean;
  canRedo: boolean;
  lastCommandLabel: string | null;
  storageAvailable: boolean;
}

interface EditorStoreOptions {
  initialDocument?: SceneDocument;
  storage?: KeyValueStorage | null;
  storageKey?: string;
}

type EditorStoreListener = () => void;

export type EditorDraftSaveResult = SaveSceneDocumentDraftResult;
export type EditorDraftLoadResult = LoadSceneDocumentDraftResult;

export class EditorStore {
  private document: SceneDocument;
  private selection: EditorSelection = { kind: "none" };
  private toolMode: ToolMode = "select";
  private viewportLayoutMode: ViewportLayoutMode = "single";
  private activeViewportPanelId: ViewportPanelId = "topLeft";
  private viewportPanels = createDefaultViewportLayoutState().panels;
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
    this.document = options.initialDocument ?? createEmptySceneDocument();
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

  setViewportViewMode(viewportViewMode: ViewportViewMode) {
    this.setViewportPanelViewMode(this.activeViewportPanelId, viewportViewMode);
  }

  enterPlayMode() {
    if (this.toolMode === "play") {
      return;
    }

    this.previousEditingToolMode = this.toolMode;
    this.toolMode = "play";
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
    this.selection = selection;
    this.emit();
  }

  executeCommand(command: EditorCommand) {
    this.history.execute(command, this.commandContext);
    this.lastCommandLabel = command.label;
    this.emit();
  }

  undo(): boolean {
    const command = this.history.undo(this.commandContext);

    if (command === null) {
      return false;
    }

    this.lastCommandLabel = `Undid ${command.label}`;
    this.emit();
    return true;
  }

  redo(): boolean {
    const command = this.history.redo(this.commandContext);

    if (command === null) {
      return false;
    }

    this.lastCommandLabel = `Redid ${command.label}`;
    this.emit();
    return true;
  }

  replaceDocument(document: SceneDocument, resetHistory = true) {
    this.document = document;
    this.selection = { kind: "none" };
    this.toolMode = "select";
    this.previousEditingToolMode = "select";

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

    return saveSceneDocumentDraft(this.storage, this.document, this.storageKey);
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

  private createSnapshot(): EditorStoreState {
    return {
      document: this.document,
      selection: this.selection,
      toolMode: this.toolMode,
      viewportLayoutMode: this.viewportLayoutMode,
      activeViewportPanelId: this.activeViewportPanelId,
      viewportPanels: this.viewportPanels,
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
