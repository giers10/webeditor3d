import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  cloneScenePathPoint,
  createAppendedScenePathPoint,
  createScenePathPointAfter,
  getScenePathPointIndex,
  type ScenePathPoint
} from "../document/paths";

import type { EditorCommand } from "./command";

interface AddPathPointCommandOptions {
  pathId: string;
  point?: ScenePathPoint;
  insertAfterPointId?: string;
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
  let addedPoint: ScenePathPoint | null =
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

      if (addedPoint === null) {
        addedPoint =
          options.insertAfterPointId === undefined
            ? createAppendedScenePathPoint(path)
            : createScenePathPointAfter(path, options.insertAfterPointId);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const insertionIndex =
        options.insertAfterPointId === undefined
          ? path.points.length
          : getScenePathPointIndex(path, options.insertAfterPointId) + 1;

      if (insertionIndex <= 0) {
        throw new Error(
          `Path point ${options.insertAfterPointId} does not exist.`
        );
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: [
              ...path.points.slice(0, insertionIndex),
              cloneScenePathPoint(addedPoint),
              ...path.points.slice(insertionIndex)
            ]
          })
        }
      });
      context.setSelection(
        setSelectedPathPointSelection(options.pathId, addedPoint.id)
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (addedPoint === null) {
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
            points: path.points.filter((point) => point.id !== addedPoint?.id)
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
