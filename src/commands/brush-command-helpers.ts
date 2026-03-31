import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import { cloneFaceUvState, type BoxBrush, type BoxFaceId, type BrushFace } from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";

export function getBoxBrushOrThrow(document: SceneDocument, brushId: string): BoxBrush {
  const brush = document.brushes[brushId];

  if (brush === undefined) {
    throw new Error(`Box brush ${brushId} does not exist.`);
  }

  if (brush.kind !== "box") {
    throw new Error(`Brush ${brushId} is not a supported box brush.`);
  }

  return brush;
}

export function setSingleBrushSelection(brushId: string): EditorSelection {
  return {
    kind: "brushes",
    ids: [brushId]
  };
}

export function setSingleBrushFaceSelection(brushId: string, faceId: BoxFaceId): EditorSelection {
  return {
    kind: "brushFace",
    brushId,
    faceId
  };
}

export function cloneSelectionForCommand(selection: EditorSelection): EditorSelection {
  return cloneEditorSelection(selection);
}

export function replaceBrush(document: SceneDocument, brush: BoxBrush): SceneDocument {
  return {
    ...document,
    brushes: {
      ...document.brushes,
      [brush.id]: brush
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

export function getBoxBrushFaceOrThrow(document: SceneDocument, brushId: string, faceId: BoxFaceId): BrushFace {
  const brush = getBoxBrushOrThrow(document, brushId);
  const face = brush.faces[faceId];

  if (face === undefined) {
    throw new Error(`Box brush ${brushId} does not contain face ${faceId}.`);
  }

  return face;
}

export function replaceBoxBrushFace(document: SceneDocument, brushId: string, faceId: BoxFaceId, face: BrushFace): SceneDocument {
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
