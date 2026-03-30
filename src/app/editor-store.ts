import { CommandHistory } from "../commands/command-history";
import type { CommandContext, EditorCommand } from "../commands/command";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { createEmptySceneDocument, type SceneDocument } from "../document/scene-document";
import {
  DEFAULT_SCENE_DRAFT_STORAGE_KEY,
  loadSceneDocumentDraft,
  type KeyValueStorage,
  saveSceneDocumentDraft
} from "../serialization/local-draft-storage";
import { parseSceneDocumentJson, serializeSceneDocument } from "../serialization/scene-document-json";

export interface EditorStoreState {
  document: SceneDocument;
  selection: EditorSelection;
  toolMode: ToolMode;
  canUndo: boolean;
  canRedo: boolean;
  lastCommandLabel: string | null;
}

interface EditorStoreOptions {
  initialDocument?: SceneDocument;
  storage?: KeyValueStorage | null;
  storageKey?: string;
}

type EditorStoreListener = () => void;

export class EditorStore {
  private document: SceneDocument;
  private selection: EditorSelection = { kind: "none" };
  private toolMode: ToolMode = "select";
  private readonly history = new CommandHistory();
  private readonly listeners = new Set<EditorStoreListener>();
  private readonly storage: KeyValueStorage | null;
  private readonly storageKey: string;
  private lastCommandLabel: string | null = null;

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
  }

  subscribe = (listener: EditorStoreListener) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): EditorStoreState => ({
    document: this.document,
    selection: this.selection,
    toolMode: this.toolMode,
    canUndo: this.history.canUndo(),
    canRedo: this.history.canRedo(),
    lastCommandLabel: this.lastCommandLabel
  });

  setToolMode(toolMode: ToolMode) {
    if (this.toolMode === toolMode) {
      return;
    }

    this.toolMode = toolMode;
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

    if (resetHistory) {
      this.history.clear();
      this.lastCommandLabel = null;
    }

    this.emit();
  }

  saveDraft(): boolean {
    if (this.storage === null) {
      return false;
    }

    saveSceneDocumentDraft(this.storage, this.document, this.storageKey);
    return true;
  }

  loadDraft(): boolean {
    if (this.storage === null) {
      return false;
    }

    const document = loadSceneDocumentDraft(this.storage, this.storageKey);

    if (document === null) {
      return false;
    }

    this.replaceDocument(document);
    return true;
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
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createEditorStore(options?: EditorStoreOptions): EditorStore {
  return new EditorStore(options);
}
