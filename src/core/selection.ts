import type { WhiteboxSelectionMode } from "./whitebox-selection-mode";
import type { BoxEdgeId, BoxFaceId, BoxVertexId } from "../document/brushes";

export type EditorSelection =
  | { kind: "none" }
  | { kind: "brushes"; ids: string[] }
  | { kind: "brushFace"; brushId: string; faceId: BoxFaceId }
  | { kind: "brushEdge"; brushId: string; edgeId: BoxEdgeId }
  | { kind: "brushVertex"; brushId: string; vertexId: BoxVertexId }
  | { kind: "entities"; ids: string[] }
  | { kind: "modelInstances"; ids: string[] };

export function cloneEditorSelection(selection: EditorSelection): EditorSelection {
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

export function areEditorSelectionsEqual(left: EditorSelection, right: EditorSelection): boolean {
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

export function getSingleSelectedBrushId(selection: EditorSelection): string | null {
  if (selection.kind === "brushFace" || selection.kind === "brushEdge" || selection.kind === "brushVertex") {
    return selection.brushId;
  }

  if (selection.kind !== "brushes" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function getSelectedBrushFaceId(selection: EditorSelection): BoxFaceId | null {
  if (selection.kind !== "brushFace") {
    return null;
  }

  return selection.faceId;
}

export function getSelectedBrushEdgeId(selection: EditorSelection): BoxEdgeId | null {
  if (selection.kind !== "brushEdge") {
    return null;
  }

  return selection.edgeId;
}

export function getSelectedBrushVertexId(selection: EditorSelection): BoxVertexId | null {
  if (selection.kind !== "brushVertex") {
    return null;
  }

  return selection.vertexId;
}

export function getSingleSelectedEntityId(selection: EditorSelection): string | null {
  if (selection.kind !== "entities" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function getSingleSelectedModelInstanceId(selection: EditorSelection): string | null {
  if (selection.kind !== "modelInstances" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function isBrushSelected(selection: EditorSelection, brushId: string): boolean {
  return (
    (selection.kind === "brushes" && selection.ids.includes(brushId)) ||
    ((selection.kind === "brushFace" || selection.kind === "brushEdge" || selection.kind === "brushVertex") &&
      selection.brushId === brushId)
  );
}

export function isBrushFaceSelected(selection: EditorSelection, brushId: string, faceId: BoxFaceId): boolean {
  return selection.kind === "brushFace" && selection.brushId === brushId && selection.faceId === faceId;
}

export function isBrushEdgeSelected(selection: EditorSelection, brushId: string, edgeId: BoxEdgeId): boolean {
  return selection.kind === "brushEdge" && selection.brushId === brushId && selection.edgeId === edgeId;
}

export function isBrushVertexSelected(selection: EditorSelection, brushId: string, vertexId: BoxVertexId): boolean {
  return selection.kind === "brushVertex" && selection.brushId === brushId && selection.vertexId === vertexId;
}

export function isModelInstanceSelected(selection: EditorSelection, modelInstanceId: string): boolean {
  return selection.kind === "modelInstances" && selection.ids.includes(modelInstanceId);
}

export function normalizeSelectionForWhiteboxSelectionMode(selection: EditorSelection, mode: WhiteboxSelectionMode): EditorSelection {
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
