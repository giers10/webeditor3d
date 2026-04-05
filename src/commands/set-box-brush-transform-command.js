import { createOpaqueId } from "../core/ids";
import { cloneSelectionForCommand, getBoxBrushOrThrow, replaceBrush, setSingleBrushEdgeSelection, setSingleBrushFaceSelection, setSingleBrushSelection, setSingleBrushVertexSelection } from "./brush-command-helpers";
function cloneVec3(vector) {
    return {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
}
function selectionToEditorSelection(selection) {
    switch (selection.kind) {
        case "brush":
            return setSingleBrushSelection(selection.brushId);
        case "brushFace":
            return setSingleBrushFaceSelection(selection.brushId, selection.faceId);
        case "brushEdge":
            return setSingleBrushEdgeSelection(selection.brushId, selection.edgeId);
        case "brushVertex":
            return setSingleBrushVertexSelection(selection.brushId, selection.vertexId);
    }
}
function getBrushId(selection) {
    return selection.brushId;
}
function assertPositiveSize(size) {
    if (!(size.x > 0 && size.y > 0 && size.z > 0)) {
        throw new Error("Whitebox box size must remain positive on every axis.");
    }
    if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
        throw new Error("Whitebox box size values must be finite numbers.");
    }
}
export function createSetBoxBrushTransformCommand(options) {
    assertPositiveSize(options.size);
    let previousSnapshot = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? "Set box brush transform",
        execute(context) {
            const currentDocument = context.getDocument();
            const brushId = getBrushId(options.selection);
            const brush = getBoxBrushOrThrow(currentDocument, brushId);
            if (previousSnapshot === null) {
                previousSnapshot = {
                    center: cloneVec3(brush.center),
                    rotationDegrees: cloneVec3(brush.rotationDegrees),
                    size: cloneVec3(brush.size),
                    geometry: cloneBoxBrushGeometry(brush.geometry)
                };
            }
            if (previousSelection === null) {
                previousSelection = cloneSelectionForCommand(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            const nextGeometry = scaleBoxBrushGeometryToSize(brush.geometry, options.size);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                center: cloneVec3(options.center),
                rotationDegrees: cloneVec3(options.rotationDegrees),
                size: cloneVec3(options.size),
                geometry: nextGeometry
            }));
            context.setSelection(selectionToEditorSelection(options.selection));
            context.setToolMode("select");
        },
        undo(context) {
            if (previousSnapshot === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const brushId = getBrushId(options.selection);
            const brush = getBoxBrushOrThrow(currentDocument, brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                center: cloneVec3(previousSnapshot.center),
                rotationDegrees: cloneVec3(previousSnapshot.rotationDegrees),
                size: cloneVec3(previousSnapshot.size),
                geometry: cloneBoxBrushGeometry(previousSnapshot.geometry)
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
