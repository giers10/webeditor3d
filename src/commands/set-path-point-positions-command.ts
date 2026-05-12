import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import {
  cloneScenePath,
  getScenePathPointIndex,
  type ScenePath
} from "../document/paths";

import type { EditorCommand } from "./command";

export interface PathPointPositionUpdate {
  pointId: string;
  position: Vec3;
}

interface SetPathPointPositionsCommandOptions {
  pathId: string;
  updates: PathPointPositionUpdate[];
  label?: string;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function createPathPointSelection(
  pathId: string,
  pointIds: readonly string[]
): EditorSelection {
  return pointIds.length === 1
    ? {
        kind: "pathPoint",
        pathId,
        pointId: pointIds[0]!
      }
    : {
        kind: "pathPoints",
        pathId,
        pointIds: [...pointIds]
      };
}

function applyPathPointUpdates(
  path: ScenePath,
  updates: readonly PathPointPositionUpdate[]
): ScenePath {
  const positionsByPointId = new Map(
    updates.map((update) => [update.pointId, cloneVec3(update.position)])
  );

  for (const update of updates) {
    if (getScenePathPointIndex(path, update.pointId) === -1) {
      throw new Error(
        `Path point ${update.pointId} does not exist on path ${path.id}.`
      );
    }
  }

  return cloneScenePath({
    ...path,
    points: path.points.map((point) => {
      const nextPosition = positionsByPointId.get(point.id);

      return nextPosition === undefined
        ? point
        : {
            ...point,
            position: nextPosition
          };
    })
  });
}

export function createSetPathPointPositionsCommand(
  options: SetPathPointPositionsCommandOptions
): EditorCommand {
  const updates = options.updates.map((update) => ({
    pointId: update.pointId,
    position: cloneVec3(update.position)
  }));
  let previousPath: ScenePath | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  if (updates.length === 0) {
    throw new Error("At least one path point update is required.");
  }

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Move path points",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (previousPath === null) {
        previousPath = cloneScenePath(path);
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
          [path.id]: applyPathPointUpdates(path, updates)
        }
      });
      context.setSelection(
        createPathPointSelection(
          options.pathId,
          updates.map((update) => update.pointId)
        )
      );
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
