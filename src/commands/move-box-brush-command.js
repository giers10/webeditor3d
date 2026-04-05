import { DEFAULT_GRID_SIZE, snapVec3ToGrid } from "../geometry/grid-snapping";
import { createOpaqueId } from "../core/ids";
import { cloneSelectionForCommand, getBoxBrushOrThrow, replaceBrush, setSingleBrushSelection } from "./brush-command-helpers";
export function createMoveBoxBrushCommand(options) {
    const resolvedCenter = options.snapToGrid === false ? options.center : snapVec3ToGrid(options.center, options.gridSize ?? DEFAULT_GRID_SIZE);
    let previousCenter = null;
    let previousSelection = null;
    let previousToolMode = null;
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
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                center: {
                    ...resolvedCenter
                }
            }));
            context.setSelection(setSingleBrushSelection(options.brushId));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousCenter === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                center: {
                    ...previousCenter
                }
            }));
            if (previousSelection !== null) {
                context.setSelection(previousSelection);
            }
            if (previousToolMode !== null) {
                context.setToolMode(previousToolMode);
            }
        }
    };
}
