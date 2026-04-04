import type { ToolMode } from "../core/tool-mode";
import { DEFAULT_GRID_SIZE, snapVec3ToGrid } from "../geometry/grid-snapping";

import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";

import { cloneSelectionForCommand, getBoxBrushOrThrow, replaceBrush, setSingleBrushSelection } from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface MoveBoxBrushCommandOptions {
  brushId: string;
  center: Vec3;
  snapToGrid?: boolean;
  gridSize?: number;
  label?: string;
}

export function createMoveBoxBrushCommand(options: MoveBoxBrushCommandOptions): EditorCommand {
  const resolvedCenter =
    options.snapToGrid === false ? options.center : snapVec3ToGrid(options.center, options.gridSize ?? DEFAULT_GRID_SIZE);

  let previousCenter: Vec3 | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Move box brush",
    execute(context) {
      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (previousCenter === null) {
        previousCenter = {
          ...brush.center
        };
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          center: {
            ...resolvedCenter
          }
        })
      );
      context.setSelection(setSingleBrushSelection(options.brushId));
      context.setToolMode("select");
    },
    undo(context) {
      if (previousCenter === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          center: {
            ...previousCenter
          }
        })
      );

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
