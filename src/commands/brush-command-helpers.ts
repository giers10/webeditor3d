import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { BoxBrush } from "../document/brushes";
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
