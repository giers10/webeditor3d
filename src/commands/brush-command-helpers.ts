import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import {
  cloneBrush,
  cloneBrushGeometry,
  cloneFaceUvState,
  type Brush,
  type BrushFace
} from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";
import type {
  WhiteboxEdgeId,
  WhiteboxFaceId,
  WhiteboxVertexId
} from "../document/brushes";

export function getBoxBrushOrThrow(document: SceneDocument, brushId: string): Brush {
  const brush = document.brushes[brushId];

  if (brush === undefined) {
    throw new Error(`Box brush ${brushId} does not exist.`);
  }

  return brush;
}

export function setSingleBrushSelection(brushId: string): EditorSelection {
  return {
    kind: "brushes",
    ids: [brushId]
  };
}

export function setSingleBrushFaceSelection(brushId: string, faceId: WhiteboxFaceId): EditorSelection {
  return {
    kind: "brushFace",
    brushId,
    faceId
  };
}

export function setSingleBrushEdgeSelection(brushId: string, edgeId: WhiteboxEdgeId): EditorSelection {
  return {
    kind: "brushEdge",
    brushId,
    edgeId
  };
}

export function setSingleBrushVertexSelection(brushId: string, vertexId: WhiteboxVertexId): EditorSelection {
  return {
    kind: "brushVertex",
    brushId,
    vertexId
  };
}

export function cloneSelectionForCommand(selection: EditorSelection): EditorSelection {
  return cloneEditorSelection(selection);
}

export function replaceBrush(document: SceneDocument, brush: Brush): SceneDocument {
  return {
    ...document,
    brushes: {
      ...document.brushes,
      [brush.id]: cloneBrush(brush)
    }
  };
}

export function removeBrush(document: SceneDocument, brushId: string): SceneDocument {
  const remainingBrushes = {
    ...document.brushes
  };
  delete remainingBrushes[brushId];

  return {
    ...document,
    brushes: remainingBrushes
  };
}

export function getBoxBrushFaceOrThrow(document: SceneDocument, brushId: string, faceId: WhiteboxFaceId): BrushFace {
  const brush = getBoxBrushOrThrow(document, brushId);
  const face = brush.faces[faceId];

  if (face === undefined) {
    throw new Error(`Box brush ${brushId} does not contain face ${faceId}.`);
  }

  return face;
}

export function replaceBoxBrushFace(document: SceneDocument, brushId: string, faceId: WhiteboxFaceId, face: BrushFace): SceneDocument {
  const brush = getBoxBrushOrThrow(document, brushId);

  return replaceBrush(document, {
    ...brush,
    faces: {
      ...brush.faces,
      [faceId]: {
        materialId: face.materialId,
        uv: cloneFaceUvState(face.uv)
      }
    },
    geometry: cloneBrushGeometry(brush.geometry)
  });
}
