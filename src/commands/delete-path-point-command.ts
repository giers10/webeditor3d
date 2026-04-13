import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  cloneScenePathPoint,
  getScenePathPointIndex,
  MIN_SCENE_PATH_POINT_COUNT,
  type ScenePathPoint
} from "../document/paths";

import type { EditorCommand } from "./command";

interface DeletePathPointCommandOptions {
  pathId: string;
  pointId: string;
  label?: string;
}

function setSinglePathSelection(pathId: string): EditorSelection {
  return {
    kind: "paths",
    ids: [pathId]
  };
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

export function createDeletePathPointCommand(
  options: DeletePathPointCommandOptions
): EditorCommand {
  let deletedPoint: ScenePathPoint | null = null;
  let deletedPointIndex: number | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Delete path point",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (path.points.length <= MIN_SCENE_PATH_POINT_COUNT) {
        throw new Error(
          `Paths must keep at least ${MIN_SCENE_PATH_POINT_COUNT} points.`
        );
      }

      const pointIndex = getScenePathPointIndex(path, options.pointId);

      if (pointIndex === -1) {
        throw new Error(`Path point ${options.pointId} does not exist on path ${options.pathId}.`);
      }

      if (deletedPoint === null) {
        deletedPoint = cloneScenePathPoint(path.points[pointIndex]);
      }

      if (deletedPointIndex === null) {
        deletedPointIndex = pointIndex;
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextPoints = path.points.filter((point) => point.id !== options.pointId);
      const fallbackPoint =
        nextPoints[Math.min(pointIndex, nextPoints.length - 1)] ?? null;

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: nextPoints
          })
        }
      });
      context.setSelection(
        fallbackPoint === null
          ? setSinglePathSelection(options.pathId)
          : setSelectedPathPointSelection(options.pathId, fallbackPoint.id)
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (deletedPoint === null || deletedPointIndex === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      const nextPoints = [...path.points];
      nextPoints.splice(deletedPointIndex, 0, cloneScenePathPoint(deletedPoint));

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: nextPoints
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
