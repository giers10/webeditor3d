import type { EditorSelection } from "./selection";
import {
  BOX_EDGE_LABELS,
  BOX_FACE_LABELS,
  BOX_VERTEX_LABELS
} from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";

function getBrushDisplayLabel(document: SceneDocument, brushId: string): string {
  const brushes = Object.values(document.brushes);
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);

  if (brushIndex === -1) {
    return "Whitebox Box";
  }

  return brushes[brushIndex].name ?? `Whitebox Box ${brushIndex + 1}`;
}

export function getWhiteboxSelectionFeedbackLabel(document: SceneDocument, selection: EditorSelection): string | null {
  switch (selection.kind) {
    case "brushes":
      return selection.ids.length === 1 ? `Solid · ${getBrushDisplayLabel(document, selection.ids[0])}` : null;
    case "brushFace":
      return `Face · ${BOX_FACE_LABELS[selection.faceId]} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    case "brushEdge":
      return `Edge · ${BOX_EDGE_LABELS[selection.edgeId]} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    case "brushVertex":
      return `Vertex · ${BOX_VERTEX_LABELS[selection.vertexId]} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    default:
      return null;
  }
}
