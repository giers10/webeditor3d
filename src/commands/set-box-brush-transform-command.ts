import type { ToolMode } from "../core/tool-mode";

import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";
import { cloneBoxBrushGeometry, scaleBoxBrushGeometryToSize } from "../document/brushes";

import {
  cloneSelectionForCommand,
  getBoxBrushOrThrow,
  replaceBrush,
  setSingleBrushEdgeSelection,
  setSingleBrushFaceSelection,
  setSingleBrushSelection,
  setSingleBrushVertexSelection
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";
import type { BoxEdgeId, BoxFaceId, BoxVertexId } from "../document/brushes";

type BrushTransformCommandSelection =
  | { kind: "brush"; brushId: string }
  | { kind: "brushFace"; brushId: string; faceId: BoxFaceId }
  | { kind: "brushEdge"; brushId: string; edgeId: BoxEdgeId }
  | { kind: "brushVertex"; brushId: string; vertexId: BoxVertexId };

interface SetBoxBrushTransformCommandOptions {
  selection: BrushTransformCommandSelection;
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  label?: string;
}

interface BrushTransformSnapshot {
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  geometry: ReturnType<typeof cloneBoxBrushGeometry>;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function selectionToEditorSelection(selection: BrushTransformCommandSelection): EditorSelection {
  switch (selection.kind) {
    case "brush":
      return setSingleBrushSelection(selection.brushId);
    case "brushFace":
      return setSingleBrushFaceSelection(selection.brushId, selection.faceId);
    case "brushEdge":
      return setSingleBrushEdgeSelection(selection.brushId, selection.edgeId);
    case "brushVertex":
      return setSingleBrushVertexSelection(selection.brushId, selection.vertexId);
  }
}

function getBrushId(selection: BrushTransformCommandSelection): string {
  return selection.brushId;
}

function assertPositiveSize(size: Vec3) {
  if (!(size.x > 0 && size.y > 0 && size.z > 0)) {
    throw new Error("Whitebox box size must remain positive on every axis.");
  }

  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
    throw new Error("Whitebox box size values must be finite numbers.");
  }
}

export function createSetBoxBrushTransformCommand(options: SetBoxBrushTransformCommandOptions): EditorCommand {
  assertPositiveSize(options.size);

  let previousSnapshot: BrushTransformSnapshot | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Set box brush transform",
    execute(context) {
      const currentDocument = context.getDocument();
      const brushId = getBrushId(options.selection);
      const brush = getBoxBrushOrThrow(currentDocument, brushId);

      if (previousSnapshot === null) {
        previousSnapshot = {
          center: cloneVec3(brush.center),
          rotationDegrees: cloneVec3(brush.rotationDegrees),
          size: cloneVec3(brush.size),
          geometry: cloneBoxBrushGeometry(brush.geometry)
        };
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextGeometry = scaleBoxBrushGeometryToSize(brush.geometry, options.size);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          center: cloneVec3(options.center),
          rotationDegrees: cloneVec3(options.rotationDegrees),
          size: cloneVec3(options.size),
          geometry: nextGeometry
        })
      );
      context.setSelection(selectionToEditorSelection(options.selection));
      context.setToolMode("select");
    },
    undo(context) {
      if (previousSnapshot === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const brushId = getBrushId(options.selection);
      const brush = getBoxBrushOrThrow(currentDocument, brushId);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          center: cloneVec3(previousSnapshot.center),
          rotationDegrees: cloneVec3(previousSnapshot.rotationDegrees),
          size: cloneVec3(previousSnapshot.size),
          geometry: cloneBoxBrushGeometry(previousSnapshot.geometry)
        })
      );

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
