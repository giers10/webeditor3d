export type EditorSelection =
  | { kind: "none" }
  | { kind: "brushes"; ids: string[] }
  | { kind: "entities"; ids: string[] }
  | { kind: "modelInstances"; ids: string[] };

export function cloneEditorSelection(selection: EditorSelection): EditorSelection {
  if (selection.kind === "none") {
    return {
      kind: "none"
    };
  }

  return {
    kind: selection.kind,
    ids: [...selection.ids]
  };
}

export function getSingleSelectedBrushId(selection: EditorSelection): string | null {
  if (selection.kind !== "brushes" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function isBrushSelected(selection: EditorSelection, brushId: string): boolean {
  return selection.kind === "brushes" && selection.ids.includes(brushId);
}
