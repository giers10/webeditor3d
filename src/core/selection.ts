import type { BoxFaceId } from "../document/brushes";

export type EditorSelection =
  | { kind: "none" }
  | { kind: "brushes"; ids: string[] }
  | { kind: "brushFace"; brushId: string; faceId: BoxFaceId }
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
    case "brushes":
    case "entities":
    case "modelInstances":
      return right.kind === left.kind && left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
  }
}

export function getSingleSelectedBrushId(selection: EditorSelection): string | null {
  if (selection.kind === "brushFace") {
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
    (selection.kind === "brushFace" && selection.brushId === brushId)
  );
}

export function isBrushFaceSelected(selection: EditorSelection, brushId: string, faceId: BoxFaceId): boolean {
  return selection.kind === "brushFace" && selection.brushId === brushId && selection.faceId === faceId;
}

export function isModelInstanceSelected(selection: EditorSelection, modelInstanceId: string): boolean {
  return selection.kind === "modelInstances" && selection.ids.includes(modelInstanceId);
}
