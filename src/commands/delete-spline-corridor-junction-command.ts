import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneSplineCorridorJunction,
  type SplineCorridorJunction
} from "../document/spline-corridor-junctions";

import type { EditorCommand } from "./command";

export function createDeleteSplineCorridorJunctionCommand(
  junctionId: string
): EditorCommand {
  let previousJunction: SplineCorridorJunction | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete spline corridor junction",
    execute(context) {
      const currentDocument = context.getDocument();
      const junction = currentDocument.splineCorridorJunctions[junctionId];

      if (junction === undefined) {
        throw new Error(`Spline corridor junction ${junctionId} does not exist.`);
      }

      if (previousJunction === null) {
        previousJunction = cloneSplineCorridorJunction(junction);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextJunctions = {
        ...currentDocument.splineCorridorJunctions
      };
      delete nextJunctions[junctionId];

      context.setDocument({
        ...currentDocument,
        splineCorridorJunctions: nextJunctions
      });
      context.setToolMode("select");
    },
    undo(context) {
      if (previousJunction === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        splineCorridorJunctions: {
          ...currentDocument.splineCorridorJunctions,
          [previousJunction.id]: cloneSplineCorridorJunction(previousJunction)
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

