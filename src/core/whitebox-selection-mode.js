export const WHITEBOX_SELECTION_MODES = ["object", "face", "edge", "vertex"];
export const WHITEBOX_SELECTION_MODE_LABELS = {
    object: "Object",
    face: "Face",
    edge: "Edge",
    vertex: "Vertex"
};
export function getWhiteboxSelectionModeLabel(mode) {
    return WHITEBOX_SELECTION_MODE_LABELS[mode];
}
