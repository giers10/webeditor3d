import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneScenePath, type ScenePath } from "../document/paths";
import {
  cloneSplineCorridorJunction,
  type SplineCorridorJunction
} from "../document/spline-corridor-junctions";

import type { EditorCommand } from "./command";

function selectionIncludesPath(selection: EditorSelection, pathId: string): boolean {
  return (
    (selection.kind === "paths" && selection.ids.includes(pathId)) ||
    (selection.kind === "pathPoint" && selection.pathId === pathId) ||
    (selection.kind === "pathPoints" && selection.pathId === pathId)
  );
}

export function createDeletePathCommand(pathId: string): EditorCommand {
  let previousPath: ScenePath | null = null;
  let previousJunctions: Record<string, SplineCorridorJunction> | null = null;
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

      if (previousJunctions === null) {
        previousJunctions = Object.fromEntries(
          Object.entries(currentDocument.splineCorridorJunctions)
            .filter(([, junction]) =>
              junction.connections.some(
                (connection) => connection.pathId === pathId
              )
            )
            .map(([junctionId, junction]) => [
              junctionId,
              cloneSplineCorridorJunction(junction)
            ])
        );
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
      const nextJunctions = Object.fromEntries(
        Object.entries(currentDocument.splineCorridorJunctions)
          .map(([junctionId, junction]) => [
            junctionId,
            cloneSplineCorridorJunction({
              ...junction,
              connections: junction.connections.filter(
                (connection) => connection.pathId !== pathId
              )
            })
          ])
          .filter(([, junction]) => junction.connections.length >= 2)
      );

      context.setDocument({
        ...currentDocument,
        paths: nextPaths,
        splineCorridorJunctions: nextJunctions
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
        },
        splineCorridorJunctions: {
          ...currentDocument.splineCorridorJunctions,
          ...Object.fromEntries(
            Object.entries(previousJunctions ?? {}).map(
              ([junctionId, junction]) => [
                junctionId,
                cloneSplineCorridorJunction(junction)
              ]
            )
          )
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
