import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { WhiteboxFaceId } from "../document/brushes";

import {
  cloneSelectionForCommand,
  getBoxBrushFaceOrThrow,
  replaceBoxBrushFace,
  setSingleBrushFaceSelection
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface SetBoxBrushFaceClimbableCommandOptions {
  brushId: string;
  faceId: WhiteboxFaceId;
  climbable: boolean;
}

export function createSetBoxBrushFaceClimbableCommand(
  options: SetBoxBrushFaceClimbableCommandOptions
): EditorCommand {
  let previousClimbable: boolean | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.climbable
      ? `Mark ${options.faceId} face climbable`
      : `Clear ${options.faceId} face climbable`,
    execute(context) {
      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(
        currentDocument,
        options.brushId,
        options.faceId
      );

      if (previousClimbable === null) {
        previousClimbable = currentFace.climbable;
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
          climbable: options.climbable
        })
      );
      context.setSelection(
        setSingleBrushFaceSelection(options.brushId, options.faceId)
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (previousClimbable === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(
        currentDocument,
        options.brushId,
        options.faceId
      );

      context.setDocument(
        replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
          ...currentFace,
          climbable: previousClimbable
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
