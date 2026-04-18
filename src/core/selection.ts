import type { WhiteboxSelectionMode } from "./whitebox-selection-mode";
import type {
  WhiteboxEdgeId,
  WhiteboxFaceId,
  WhiteboxVertexId
} from "../document/brushes";

export type EditorSelection =
  | { kind: "none" }
  | { kind: "brushes"; ids: string[] }
  | { kind: "brushFace"; brushId: string; faceId: WhiteboxFaceId }
  | { kind: "brushEdge"; brushId: string; edgeId: WhiteboxEdgeId }
  | { kind: "brushVertex"; brushId: string; vertexId: WhiteboxVertexId }
  | { kind: "terrains"; ids: string[] }
  | { kind: "paths"; ids: string[] }
  | { kind: "pathPoint"; pathId: string; pointId: string }
  | { kind: "entities"; ids: string[] }
  | { kind: "modelInstances"; ids: string[] };

export type EditorSelectionWithIds = Extract<EditorSelection, { ids: string[] }>;
export type SameKindMultiSelectableEditorSelection = Extract<
  EditorSelection,
  | { kind: "brushes"; ids: string[] }
  | { kind: "entities"; ids: string[] }
  | { kind: "modelInstances"; ids: string[] }
>;

export function isEditorSelectionWithIds(
  selection: EditorSelection
): selection is EditorSelectionWithIds {
  return "ids" in selection;
}

export function isSameKindMultiSelectableSelection(
  selection: EditorSelection
): selection is SameKindMultiSelectableEditorSelection {
  return (
    selection.kind === "brushes" ||
    selection.kind === "entities" ||
    selection.kind === "modelInstances"
  );
}

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

  if (selection.kind === "pathPoint") {
    return {
      kind: "pathPoint",
      pathId: selection.pathId,
      pointId: selection.pointId
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
    case "pathPoint":
      return right.kind === "pathPoint" && left.pathId === right.pathId && left.pointId === right.pointId;
    case "brushes":
    case "terrains":
    case "paths":
    case "entities":
    case "modelInstances":
      return right.kind === left.kind && left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
  }
}

export function getSelectionDefaultActiveId(selection: EditorSelection): string | null {
  switch (selection.kind) {
    case "none":
      return null;
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return selection.brushId;
    case "pathPoint":
      return selection.pointId;
    case "brushes":
    case "terrains":
    case "paths":
    case "entities":
    case "modelInstances":
      return selection.ids.at(-1) ?? null;
  }
}

export function resolveSelectionActiveId(
  selection: EditorSelection,
  activeSelectionId: string | null
): string | null {
  if (activeSelectionId === null) {
    return getSelectionDefaultActiveId(selection);
  }

  switch (selection.kind) {
    case "none":
      return null;
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return selection.brushId === activeSelectionId
        ? activeSelectionId
        : selection.brushId;
    case "pathPoint":
      return selection.pointId === activeSelectionId
        ? activeSelectionId
        : selection.pointId;
    case "brushes":
    case "terrains":
    case "paths":
    case "entities":
    case "modelInstances":
      return selection.ids.includes(activeSelectionId)
        ? activeSelectionId
        : getSelectionDefaultActiveId(selection);
  }
}

export function isSelectionActiveId(
  selection: EditorSelection,
  activeSelectionId: string | null,
  id: string
): boolean {
  return resolveSelectionActiveId(selection, activeSelectionId) === id;
}

export function applySameKindSelectionClick(
  currentSelection: EditorSelection,
  clickedSelection: EditorSelection,
  shiftKey: boolean
): EditorSelection {
  if (!shiftKey || !isSameKindMultiSelectableSelection(clickedSelection)) {
    return cloneEditorSelection(clickedSelection);
  }

  if (
    !isSameKindMultiSelectableSelection(currentSelection) ||
    currentSelection.kind !== clickedSelection.kind
  ) {
    return cloneEditorSelection(clickedSelection);
  }

  if (clickedSelection.ids.length !== 1) {
    return cloneEditorSelection(clickedSelection);
  }

  const clickedId = clickedSelection.ids[0];

  if (!currentSelection.ids.includes(clickedId)) {
    return {
      kind: currentSelection.kind,
      ids: [...currentSelection.ids, clickedId]
    };
  }

  const remainingIds = currentSelection.ids.filter((id) => id !== clickedId);

  return remainingIds.length === 0
    ? {
        kind: "none"
      }
    : {
        kind: currentSelection.kind,
        ids: remainingIds
      };
}

export function applyEditorSelectionClick(
  currentSelection: EditorSelection,
  clickedSelection: EditorSelection | null,
  shiftKey: boolean
): EditorSelection {
  if (clickedSelection === null) {
    return shiftKey
      ? cloneEditorSelection(currentSelection)
      : {
          kind: "none"
        };
  }

  return applySameKindSelectionClick(
    currentSelection,
    clickedSelection,
    shiftKey
  );
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

export function getSelectedBrushFaceId(
  selection: EditorSelection
): WhiteboxFaceId | null {
  if (selection.kind !== "brushFace") {
    return null;
  }

  return selection.faceId;
}

export function getSelectedBrushEdgeId(
  selection: EditorSelection
): WhiteboxEdgeId | null {
  if (selection.kind !== "brushEdge") {
    return null;
  }

  return selection.edgeId;
}

export function getSelectedBrushVertexId(
  selection: EditorSelection
): WhiteboxVertexId | null {
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

export function getSingleSelectedPathId(selection: EditorSelection): string | null {
  if (selection.kind !== "paths" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function getSingleSelectedPathPoint(selection: EditorSelection): { pathId: string; pointId: string } | null {
  if (selection.kind !== "pathPoint") {
    return null;
  }

  return {
    pathId: selection.pathId,
    pointId: selection.pointId
  };
}

export function getSingleSelectedPathOwnerId(selection: EditorSelection): string | null {
  if (selection.kind === "pathPoint") {
    return selection.pathId;
  }

  return getSingleSelectedPathId(selection);
}

export function getSingleSelectedModelInstanceId(selection: EditorSelection): string | null {
  if (selection.kind !== "modelInstances" || selection.ids.length !== 1) {
    return null;
  }

  return selection.ids[0];
}

export function getSingleSelectedTerrainId(selection: EditorSelection): string | null {
  if (selection.kind !== "terrains" || selection.ids.length !== 1) {
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

export function isBrushFaceSelected(
  selection: EditorSelection,
  brushId: string,
  faceId: WhiteboxFaceId
): boolean {
  return selection.kind === "brushFace" && selection.brushId === brushId && selection.faceId === faceId;
}

export function isBrushEdgeSelected(
  selection: EditorSelection,
  brushId: string,
  edgeId: WhiteboxEdgeId
): boolean {
  return selection.kind === "brushEdge" && selection.brushId === brushId && selection.edgeId === edgeId;
}

export function isBrushVertexSelected(
  selection: EditorSelection,
  brushId: string,
  vertexId: WhiteboxVertexId
): boolean {
  return selection.kind === "brushVertex" && selection.brushId === brushId && selection.vertexId === vertexId;
}

export function isModelInstanceSelected(selection: EditorSelection, modelInstanceId: string): boolean {
  return selection.kind === "modelInstances" && selection.ids.includes(modelInstanceId);
}

export function isTerrainSelected(selection: EditorSelection, terrainId: string): boolean {
  return selection.kind === "terrains" && selection.ids.includes(terrainId);
}

export function isPathSelected(selection: EditorSelection, pathId: string): boolean {
  return (
    (selection.kind === "paths" && selection.ids.includes(pathId)) ||
    (selection.kind === "pathPoint" && selection.pathId === pathId)
  );
}

export function isPathPointSelected(selection: EditorSelection, pathId: string, pointId: string): boolean {
  return selection.kind === "pathPoint" && selection.pathId === pathId && selection.pointId === pointId;
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
