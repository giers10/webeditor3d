import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneScenePath, type ScenePath } from "../document/paths";

import type { EditorCommand } from "./command";

function selectionIncludesPath(selection: EditorSelection, pathId: string): boolean {
  return (
    (selection.kind === "paths" && selection.ids.includes(pathId)) ||
    (selection.kind === "pathPoint" && selection.pathId === pathId)
  );
}

export function createDeletePathCommand(pathId: string): EditorCommand {
  let previousPath: ScenePath | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete path",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentPath = currentDocument.paths[pathId];

      if (currentPath === undefined) {
        throw new Error(`Path ${pathId} does not exist.`);
      }

      if (previousPath === null) {
        previousPath = cloneScenePath(currentPath);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextPaths = {
        ...currentDocument.paths
      };
      delete nextPaths[pathId];

      context.setDocument({
        ...currentDocument,
        paths: nextPaths
      });

      if (selectionIncludesPath(context.getSelection(), pathId)) {
        context.setSelection({
          kind: "none"
        });
      }

      context.setToolMode("select");
    },
    undo(context) {
      if (previousPath === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [previousPath.id]: cloneScenePath(previousPath)
        }
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
