import { cloneEditorSelection } from "../core/selection";
import { cloneFaceUvState } from "../document/brushes";
export function getBoxBrushOrThrow(document, brushId) {
    const brush = document.brushes[brushId];
    if (brush === undefined) {
        throw new Error(`Box brush ${brushId} does not exist.`);
    }
    if (brush.kind !== "box") {
        throw new Error(`Brush ${brushId} is not a supported box brush.`);
    }
    return brush;
}
export function setSingleBrushSelection(brushId) {
    return {
        kind: "brushes",
        ids: [brushId]
    };
}
export function setSingleBrushFaceSelection(brushId, faceId) {
    return {
        kind: "brushFace",
        brushId,
        faceId
    };
}
export function setSingleBrushEdgeSelection(brushId, edgeId) {
    return {
        kind: "brushEdge",
        brushId,
        edgeId
    };
}
export function setSingleBrushVertexSelection(brushId, vertexId) {
    return {
        kind: "brushVertex",
        brushId,
        vertexId
    };
}
export function cloneSelectionForCommand(selection) {
    return cloneEditorSelection(selection);
}
export function replaceBrush(document, brush) {
    return {
        ...document,
        brushes: {
            ...document.brushes,
            [brush.id]: brush
        }
    };
}
export function removeBrush(document, brushId) {
    const remainingBrushes = {
        ...document.brushes
    };
    delete remainingBrushes[brushId];
    return {
        ...document,
        brushes: remainingBrushes
    };
}
export function getBoxBrushFaceOrThrow(document, brushId, faceId) {
    const brush = getBoxBrushOrThrow(document, brushId);
    const face = brush.faces[faceId];
    if (face === undefined) {
        throw new Error(`Box brush ${brushId} does not contain face ${faceId}.`);
    }
    return face;
}
export function replaceBoxBrushFace(document, brushId, faceId, face) {
    const brush = getBoxBrushOrThrow(document, brushId);
    return replaceBrush(document, {
        ...brush,
        faces: {
            ...brush.faces,
            [faceId]: {
                materialId: face.materialId,
                uv: cloneFaceUvState(face.uv)
            }
        }
    });
}
