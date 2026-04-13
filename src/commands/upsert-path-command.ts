import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  type ScenePath
} from "../document/paths";

import type { EditorCommand } from "./command";

interface UpsertPathCommandOptions {
  path: ScenePath;
  label?: string;
}

function setSinglePathSelection(pathId: string): EditorSelection {
  return {
    kind: "paths",
    ids: [pathId]
  };
}

function createDefaultPathCommandLabel(isNewPath: boolean): string {
  return isNewPath ? "Create path" : "Update path";
}

export function createUpsertPathCommand(
  options: UpsertPathCommandOptions
): EditorCommand {
  const nextPath = cloneScenePath(options.path);
  let previousPath: ScenePath | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? createDefaultPathCommandLabel(true),
    execute(context) {
      const currentDocument = context.getDocument();
      const currentPath = currentDocument.paths[nextPath.id];

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (previousPath === null && currentPath !== undefined) {
        previousPath = cloneScenePath(currentPath);
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [nextPath.id]: cloneScenePath(nextPath)
        }
      });
      context.setSelection(setSinglePathSelection(nextPath.id));
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextPaths = {
        ...currentDocument.paths
      };

      if (previousPath === null) {
        delete nextPaths[nextPath.id];
      } else {
        nextPaths[nextPath.id] = cloneScenePath(previousPath);
      }

      context.setDocument({
        ...currentDocument,
        paths: nextPaths
      });

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
