import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid } from "../geometry/grid-snapping";
import { createOpaqueId } from "../core/ids";
import { cloneSelectionForCommand, getBoxBrushOrThrow, replaceBrush, setSingleBrushSelection } from "./brush-command-helpers";
export function createResizeBoxBrushCommand(options) {
    const resolvedSize = options.snapToGrid === false ? options.size : snapPositiveSizeToGrid(options.size, options.gridSize ?? DEFAULT_GRID_SIZE);
    let previousSize = null;
    let previousGeometry = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? "Resize box brush",
        execute(context) {
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            if (previousSize === null) {
                previousSize = {
                    ...brush.size
                };
                previousGeometry = cloneBoxBrushGeometry(brush.geometry);
            }
            if (previousSelection === null) {
                previousSelection = cloneSelectionForCommand(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            const nextGeometry = scaleBoxBrushGeometryToSize(brush.geometry, resolvedSize);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                size: {
                    ...resolvedSize
                },
                geometry: nextGeometry
            }));
            context.setSelection(setSingleBrushSelection(options.brushId));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousSize === null || previousGeometry === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                size: {
                    ...previousSize
                },
                geometry: cloneBoxBrushGeometry(previousGeometry)
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
