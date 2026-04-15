import type { EditorSelection } from "./selection";
import {
  type Brush
} from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";
import {
  getBrushDefaultName,
  getBrushEdgeLabel,
  getBrushFaceLabel,
  getBrushKindLabel,
  getBrushVertexLabel
} from "../geometry/whitebox-topology";

function getBrushDisplayLabel(document: SceneDocument, brushId: string): string {
  const brushes = Object.values(document.brushes);
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);

  if (brushIndex === -1) {
    return "Whitebox Solid";
  }

  return brushes[brushIndex].name ?? getBrushDefaultName(brushes[brushIndex], brushIndex);
}

function getBrushOrNull(
  document: SceneDocument,
  brushId: string
): Brush | null {
  return document.brushes[brushId] ?? null;
}

export function getWhiteboxSelectionFeedbackLabel(document: SceneDocument, selection: EditorSelection): string | null {
  switch (selection.kind) {
    case "brushes":
      return selection.ids.length === 1 ? `Solid · ${getBrushDisplayLabel(document, selection.ids[0])}` : null;
    case "brushFace": {
      const brush = getBrushOrNull(document, selection.brushId);
      return brush === null
        ? `Face · ${selection.faceId} · ${getBrushDisplayLabel(document, selection.brushId)}`
        : `Face · ${getBrushFaceLabel(brush, selection.faceId)} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    }
    case "brushEdge": {
      const brush = getBrushOrNull(document, selection.brushId);
      return brush === null
        ? `Edge · ${selection.edgeId} · ${getBrushDisplayLabel(document, selection.brushId)}`
        : `Edge · ${getBrushEdgeLabel(brush, selection.edgeId)} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    }
    case "brushVertex": {
      const brush = getBrushOrNull(document, selection.brushId);
      return brush === null
        ? `Vertex · ${selection.vertexId} · ${getBrushDisplayLabel(document, selection.brushId)}`
        : `Vertex · ${getBrushVertexLabel(brush, selection.vertexId)} · ${getBrushDisplayLabel(document, selection.brushId)}`;
    }
    default:
      return null;
  }
}
