import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  cloneScenePathPoint,
  createAppendedScenePathPoint,
  type ScenePathPoint
} from "../document/paths";

import type { EditorCommand } from "./command";

interface AddPathPointCommandOptions {
  pathId: string;
  point?: ScenePathPoint;
  label?: string;
}

function setSelectedPathPointSelection(
  pathId: string,
  pointId: string
): EditorSelection {
  return {
    kind: "pathPoint",
    pathId,
    pointId
  };
}

export function createAddPathPointCommand(
  options: AddPathPointCommandOptions
): EditorCommand {
  let appendedPoint: ScenePathPoint | null =
    options.point === undefined ? null : cloneScenePathPoint(options.point);
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Add path point",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (appendedPoint === null) {
        appendedPoint = createAppendedScenePathPoint(path);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: [...path.points, cloneScenePathPoint(appendedPoint)]
          })
        }
      });
      context.setSelection(
        setSelectedPathPointSelection(options.pathId, appendedPoint.id)
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (appendedPoint === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: path.points.filter((point) => point.id !== appendedPoint?.id)
          })
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
