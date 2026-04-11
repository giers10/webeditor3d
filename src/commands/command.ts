import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { ProjectDocument, SceneDocument } from "../document/scene-document";

export interface CommandContext {
  getDocument(): SceneDocument;
  setDocument(document: SceneDocument): void;
  getProjectDocument(): ProjectDocument;
  setProjectDocument(document: ProjectDocument): void;
  getSelection(): EditorSelection;
  setSelection(selection: EditorSelection): void;
  getToolMode(): ToolMode;
  setToolMode(toolMode: ToolMode): void;
}

export interface EditorCommand {
  id: string;
  label: string;
  execute(context: CommandContext): void;
  undo(context: CommandContext): void;
}
