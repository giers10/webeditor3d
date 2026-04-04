import type { ToolMode } from "../core/tool-mode";
import { createBoxBrush, DEFAULT_BOX_BRUSH_CENTER, DEFAULT_BOX_BRUSH_SIZE } from "../document/brushes";
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";

import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";

import { cloneSelectionForCommand, removeBrush, setSingleBrushSelection } from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface CreateBoxBrushCommandOptions {
  center?: Vec3;
  size?: Vec3;
  snapToGrid?: boolean;
  gridSize?: number;
}

export function createCreateBoxBrushCommand(options: CreateBoxBrushCommandOptions = {}): EditorCommand {
  const snapToGrid = options.snapToGrid ?? true;
  const brush = createBoxBrush({
    center:
      snapToGrid === false
        ? options.center ?? DEFAULT_BOX_BRUSH_CENTER
        : snapVec3ToGrid(options.center ?? DEFAULT_BOX_BRUSH_CENTER, options.gridSize ?? DEFAULT_GRID_SIZE),
    size:
      snapToGrid === false
        ? options.size ?? DEFAULT_BOX_BRUSH_SIZE
        : snapPositiveSizeToGrid(options.size ?? DEFAULT_BOX_BRUSH_SIZE, options.gridSize ?? DEFAULT_GRID_SIZE)
  });

  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Create box brush",
    execute(context) {
      const currentDocument = context.getDocument();

      if (currentDocument.brushes[brush.id] !== undefined) {
        throw new Error(`Box brush ${brush.id} already exists.`);
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument({
        ...currentDocument,
        brushes: {
          ...currentDocument.brushes,
          [brush.id]: brush
        }
      });
      context.setSelection(setSingleBrushSelection(brush.id));
      context.setToolMode("select");
    },
    undo(context) {
      context.setDocument(removeBrush(context.getDocument(), brush.id));

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
