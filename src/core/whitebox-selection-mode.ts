export const WHITEBOX_SELECTION_MODES = ["object", "face", "edge", "vertex"] as const;

export type WhiteboxSelectionMode = (typeof WHITEBOX_SELECTION_MODES)[number];

export const WHITEBOX_SELECTION_MODE_LABELS: Record<WhiteboxSelectionMode, string> = {
  object: "Object",
  face: "Face",
  edge: "Edge",
  vertex: "Vertex"
};

export function getWhiteboxSelectionModeLabel(mode: WhiteboxSelectionMode): string {
  return WHITEBOX_SELECTION_MODE_LABELS[mode];
}
