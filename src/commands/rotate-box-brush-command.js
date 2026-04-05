import { createOpaqueId } from "../core/ids";
import { cloneSelectionForCommand, getBoxBrushOrThrow, replaceBrush, setSingleBrushSelection } from "./brush-command-helpers";
export function createRotateBoxBrushCommand(options) {
    let previousRotationDegrees = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? "Rotate box brush",
        execute(context) {
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            if (previousRotationDegrees === null) {
                previousRotationDegrees = {
                    ...brush.rotationDegrees
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
                rotationDegrees: {
                    ...options.rotationDegrees
                }
            }));
            context.setSelection(setSingleBrushSelection(options.brushId));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousRotationDegrees === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                rotationDegrees: {
                    ...previousRotationDegrees
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
