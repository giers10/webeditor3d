import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneSplineCorridorJunction,
  type SplineCorridorJunction
} from "../document/spline-corridor-junctions";

import type { EditorCommand } from "./command";

interface UpsertSplineCorridorJunctionCommandOptions {
  junction: SplineCorridorJunction;
  label?: string;
}

export function createUpsertSplineCorridorJunctionCommand(
  options: UpsertSplineCorridorJunctionCommandOptions
): EditorCommand {
  const nextJunction = cloneSplineCorridorJunction(options.junction);
  let previousJunction: SplineCorridorJunction | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Update spline corridor junction",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentJunction =
        currentDocument.splineCorridorJunctions[nextJunction.id];

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (previousJunction === null && currentJunction !== undefined) {
        previousJunction = cloneSplineCorridorJunction(currentJunction);
      }

      context.setDocument({
        ...currentDocument,
        splineCorridorJunctions: {
          ...currentDocument.splineCorridorJunctions,
          [nextJunction.id]: cloneSplineCorridorJunction(nextJunction)
        }
      });
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextJunctions = {
        ...currentDocument.splineCorridorJunctions
      };

      if (previousJunction === null) {
        delete nextJunctions[nextJunction.id];
      } else {
        nextJunctions[nextJunction.id] =
          cloneSplineCorridorJunction(previousJunction);
      }

      context.setDocument({
        ...currentDocument,
        splineCorridorJunctions: nextJunctions
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

