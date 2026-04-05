export function cloneEditorSelection(selection) {
    if (selection.kind === "none") {
        return {
            kind: "none"
        };
    }
    if (selection.kind === "brushFace") {
        return {
            kind: "brushFace",
            brushId: selection.brushId,
            faceId: selection.faceId
        };
    }
    if (selection.kind === "brushEdge") {
        return {
            kind: "brushEdge",
            brushId: selection.brushId,
            edgeId: selection.edgeId
        };
    }
    if (selection.kind === "brushVertex") {
        return {
            kind: "brushVertex",
            brushId: selection.brushId,
            vertexId: selection.vertexId
        };
    }
    return {
        kind: selection.kind,
        ids: [...selection.ids]
    };
}
export function areEditorSelectionsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    switch (left.kind) {
        case "none":
            return true;
        case "brushFace":
            return right.kind === "brushFace" && left.brushId === right.brushId && left.faceId === right.faceId;
        case "brushEdge":
            return right.kind === "brushEdge" && left.brushId === right.brushId && left.edgeId === right.edgeId;
        case "brushVertex":
            return right.kind === "brushVertex" && left.brushId === right.brushId && left.vertexId === right.vertexId;
        case "brushes":
        case "entities":
        case "modelInstances":
            return right.kind === left.kind && left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
    }
}
export function getSingleSelectedBrushId(selection) {
    if (selection.kind === "brushFace" || selection.kind === "brushEdge" || selection.kind === "brushVertex") {
        return selection.brushId;
    }
    if (selection.kind !== "brushes" || selection.ids.length !== 1) {
        return null;
    }
    return selection.ids[0];
}
export function getSelectedBrushFaceId(selection) {
    if (selection.kind !== "brushFace") {
        return null;
    }
    return selection.faceId;
}
export function getSelectedBrushEdgeId(selection) {
    if (selection.kind !== "brushEdge") {
        return null;
    }
    return selection.edgeId;
}
export function getSelectedBrushVertexId(selection) {
    if (selection.kind !== "brushVertex") {
        return null;
    }
    return selection.vertexId;
}
export function getSingleSelectedEntityId(selection) {
    if (selection.kind !== "entities" || selection.ids.length !== 1) {
        return null;
    }
    return selection.ids[0];
}
export function getSingleSelectedModelInstanceId(selection) {
    if (selection.kind !== "modelInstances" || selection.ids.length !== 1) {
        return null;
    }
    return selection.ids[0];
}
export function isBrushSelected(selection, brushId) {
    return ((selection.kind === "brushes" && selection.ids.includes(brushId)) ||
        ((selection.kind === "brushFace" || selection.kind === "brushEdge" || selection.kind === "brushVertex") &&
            selection.brushId === brushId));
}
export function isBrushFaceSelected(selection, brushId, faceId) {
    return selection.kind === "brushFace" && selection.brushId === brushId && selection.faceId === faceId;
}
export function isBrushEdgeSelected(selection, brushId, edgeId) {
    return selection.kind === "brushEdge" && selection.brushId === brushId && selection.edgeId === edgeId;
}
export function isBrushVertexSelected(selection, brushId, vertexId) {
    return selection.kind === "brushVertex" && selection.brushId === brushId && selection.vertexId === vertexId;
}
export function isModelInstanceSelected(selection, modelInstanceId) {
    return selection.kind === "modelInstances" && selection.ids.includes(modelInstanceId);
}
export function normalizeSelectionForWhiteboxSelectionMode(selection, mode) {
    switch (selection.kind) {
        case "brushFace":
            return mode === "face"
                ? selection
                : {
                    kind: "brushes",
                    ids: [selection.brushId]
                };
        case "brushEdge":
            return mode === "edge"
                ? selection
                : {
                    kind: "brushes",
                    ids: [selection.brushId]
                };
        case "brushVertex":
            return mode === "vertex"
                ? selection
                : {
                    kind: "brushes",
                    ids: [selection.brushId]
                };
        default:
            return selection;
    }
}
