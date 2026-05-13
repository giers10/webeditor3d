import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneScenePath,
  getScenePathPointIndex,
  MIN_SCENE_PATH_POINT_COUNT,
  type ScenePath
} from "../document/paths";
import type { SplineCorridorJunctionRegistry } from "../document/spline-corridor-junctions";

import type { EditorCommand } from "./command";
import {
  cloneSplineCorridorJunctionRegistry,
  setScenePathAndReattachJunctions
} from "./path-junction-maintenance";

interface DeletePathPointsCommandOptions {
  pathId: string;
  pointIds: string[];
  label?: string;
}

function createFallbackSelection(path: ScenePath, firstDeletedIndex: number): EditorSelection {
  const fallbackPoint =
    path.points[Math.min(firstDeletedIndex, path.points.length - 1)] ?? null;

  return fallbackPoint === null
    ? {
        kind: "paths",
        ids: [path.id]
      }
    : {
        kind: "pathPoint",
        pathId: path.id,
        pointId: fallbackPoint.id
      };
}

export function createDeletePathPointsCommand(
  options: DeletePathPointsCommandOptions
): EditorCommand {
  const pointIds = [...new Set(options.pointIds)];
  let previousPath: ScenePath | null = null;
  let previousJunctions: SplineCorridorJunctionRegistry | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  if (pointIds.length === 0) {
    throw new Error("At least one path point id is required.");
  }

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Delete path points",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      const deletedIndexes = pointIds.map((pointId) => {
        const pointIndex = getScenePathPointIndex(path, pointId);

        if (pointIndex === -1) {
          throw new Error(
            `Path point ${pointId} does not exist on path ${options.pathId}.`
          );
        }

        return pointIndex;
      });

      if (path.points.length - pointIds.length < MIN_SCENE_PATH_POINT_COUNT) {
        throw new Error(
          `Paths must keep at least ${MIN_SCENE_PATH_POINT_COUNT} points.`
        );
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

      if (previousJunctions === null) {
        previousJunctions = cloneSplineCorridorJunctionRegistry(
          currentDocument.splineCorridorJunctions
        );
      }

      const pointIdSet = new Set(pointIds);
      const nextPath = cloneScenePath({
        ...path,
        points: path.points.filter((point) => !pointIdSet.has(point.id))
      });

      context.setDocument(
        setScenePathAndReattachJunctions(currentDocument, nextPath)
      );
      context.setSelection(
        createFallbackSelection(nextPath, Math.min(...deletedIndexes))
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
        },
        splineCorridorJunctions:
          previousJunctions === null
            ? currentDocument.splineCorridorJunctions
            : cloneSplineCorridorJunctionRegistry(previousJunctions)
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
