import { createOpaqueId } from "../core/ids";
import { cloneSelectionForCommand, getBoxBrushFaceOrThrow, replaceBoxBrushFace, setSingleBrushFaceSelection } from "./brush-command-helpers";
export function createSetBoxBrushFaceMaterialCommand(options) {
    let previousMaterialId;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.materialId === null ? `Clear ${options.faceId} face material` : `Apply material to ${options.faceId} face`,
        execute(context) {
            const currentDocument = context.getDocument();
            const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);
            if (options.materialId !== null && currentDocument.materials[options.materialId] === undefined) {
                throw new Error(`Material ${options.materialId} does not exist in the document registry.`);
            }
            if (previousMaterialId === undefined) {
                previousMaterialId = currentFace.materialId;
            }
            if (previousSelection === null) {
                previousSelection = cloneSelectionForCommand(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            context.setDocument(replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
                ...currentFace,
                materialId: options.materialId
            }));
            context.setSelection(setSingleBrushFaceSelection(options.brushId, options.faceId));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousMaterialId === undefined) {
                return;
            }
            const currentDocument = context.getDocument();
            const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);
            context.setDocument(replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
                ...currentFace,
                materialId: previousMaterialId
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
