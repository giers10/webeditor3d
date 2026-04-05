import { createOpaqueId } from "../core/ids";
import { cloneBoxBrush } from "../document/brushes";
import { cloneSelectionForCommand, removeBrush } from "./brush-command-helpers";
function selectionIncludesBrush(selection, brushId) {
    return ((selection.kind === "brushes" && selection.ids.includes(brushId)) ||
        ((selection.kind === "brushFace" || selection.kind === "brushEdge" || selection.kind === "brushVertex") &&
            selection.brushId === brushId));
}
export function createDeleteBoxBrushCommand(brushId) {
    let previousBrush = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: "Delete box brush",
        execute(context) {
            const currentDocument = context.getDocument();
            const currentBrush = currentDocument.brushes[brushId];
            if (currentBrush === undefined) {
                throw new Error(`Box brush ${brushId} does not exist.`);
            }
            if (previousBrush === null) {
                previousBrush = cloneBoxBrush(currentBrush);
            }
            if (previousSelection === null) {
                previousSelection = cloneSelectionForCommand(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            context.setDocument(removeBrush(currentDocument, brushId));
            if (selectionIncludesBrush(context.getSelection(), brushId)) {
                context.setSelection({
                    kind: "none"
                });
            }
            context.setToolMode("select");
        },
        undo(context) {
            if (previousBrush === null) {
                return;
            }
            const currentDocument = context.getDocument();
            context.setDocument({
                ...currentDocument,
                brushes: {
                    ...currentDocument.brushes,
                    [previousBrush.id]: cloneBoxBrush(previousBrush)
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
