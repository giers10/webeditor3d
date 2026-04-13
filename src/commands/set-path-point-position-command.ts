import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  getScenePathPointIndex
} from "../document/paths";
import type { Vec3 } from "../core/vector";

import type { EditorCommand } from "./command";

interface SetPathPointPositionCommandOptions {
  pathId: string;
  pointId: string;
  position: Vec3;
  label?: string;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
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

export function createSetPathPointPositionCommand(
  options: SetPathPointPositionCommandOptions
): EditorCommand {
  const nextPosition = cloneVec3(options.position);
  let previousPosition: Vec3 | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Move path point",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      const pointIndex = getScenePathPointIndex(path, options.pointId);

      if (pointIndex === -1) {
        throw new Error(`Path point ${options.pointId} does not exist on path ${options.pathId}.`);
      }

      if (previousPosition === null) {
        previousPosition = cloneVec3(path.points[pointIndex].position);
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
            points: path.points.map((point, index) =>
              index === pointIndex
                ? {
                    ...point,
                    position: cloneVec3(nextPosition)
                  }
                : point
            )
          })
        }
      });
      context.setSelection(
        setSelectedPathPointSelection(options.pathId, options.pointId)
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (previousPosition === null) {
        return;
      }

      const restoredPosition = cloneVec3(previousPosition);

      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      const pointIndex = getScenePathPointIndex(path, options.pointId);

      if (pointIndex === -1) {
        throw new Error(`Path point ${options.pointId} does not exist on path ${options.pathId}.`);
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            points: path.points.map((point, index) =>
              index === pointIndex
                ? {
                    ...point,
                    position: cloneVec3(restoredPosition)
                  }
                : point
            )
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
