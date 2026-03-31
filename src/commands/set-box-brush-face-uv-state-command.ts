import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import { cloneFaceUvState, type BoxFaceId, type FaceUvState } from "../document/brushes";

import {
  cloneSelectionForCommand,
  getBoxBrushFaceOrThrow,
  replaceBoxBrushFace,
  setSingleBrushFaceSelection
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface SetBoxBrushFaceUvStateCommandOptions {
  brushId: string;
  faceId: BoxFaceId;
  uvState: FaceUvState;
  label?: string;
}

export function createSetBoxBrushFaceUvStateCommand(options: SetBoxBrushFaceUvStateCommandOptions): EditorCommand {
  let previousUvState: FaceUvState | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? `Update ${options.faceId} face UVs`,
    execute(context) {
      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);

      if (previousUvState === null) {
        previousUvState = cloneFaceUvState(currentFace.uv);
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument(
        replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
          ...currentFace,
          uv: cloneFaceUvState(options.uvState)
        })
      );
      context.setSelection(setSingleBrushFaceSelection(options.brushId, options.faceId));
      context.setToolMode("select");
    },
    undo(context) {
      if (previousUvState === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);

      context.setDocument(
        replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
          ...currentFace,
          uv: cloneFaceUvState(previousUvState)
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
