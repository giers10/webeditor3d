import { createOpaqueId } from "../core/ids";
import { cloneFaceUvState } from "../document/brushes";
import { cloneSelectionForCommand, getBoxBrushFaceOrThrow, replaceBoxBrushFace, setSingleBrushFaceSelection } from "./brush-command-helpers";
export function createSetBoxBrushFaceUvStateCommand(options) {
    let previousUvState = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? `Update ${options.faceId} face UVs`,
        execute(context) {
            const currentDocument = context.getDocument();
            const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);
            if (previousUvState === null) {
                previousUvState = cloneFaceUvState(currentFace.uv);
            }
            if (previousSelection === null) {
                previousSelection = cloneSelectionForCommand(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            context.setDocument(replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
                ...currentFace,
                uv: cloneFaceUvState(options.uvState)
            }));
            context.setSelection(setSingleBrushFaceSelection(options.brushId, options.faceId));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousUvState === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);
            context.setDocument(replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
                ...currentFace,
                uv: cloneFaceUvState(previousUvState)
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
