import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import {
  cloneFaceUvState,
  updateBrush,
  type FaceUvState,
  type WhiteboxFaceId
} from "../document/brushes";
import { getBrushFaceIds } from "../geometry/whitebox-topology";

import {
  cloneSelectionForCommand,
  getBoxBrushOrThrow,
  replaceBrush
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface UpdateBoxBrushAllFaceUvsCommandOptions {
  brushId: string;
  label: string;
  updateUvState(uvState: FaceUvState, faceId: WhiteboxFaceId): FaceUvState;
}

export function createUpdateBoxBrushAllFaceUvsCommand(
  options: UpdateBoxBrushAllFaceUvsCommandOptions
): EditorCommand {
  let previousUvStates: Record<WhiteboxFaceId, FaceUvState> | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentDocument = context.getDocument();
      const currentBrush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (previousUvStates === null) {
        previousUvStates = Object.fromEntries(
          getBrushFaceIds(currentBrush).map((faceId) => [
            faceId,
            cloneFaceUvState(currentBrush.faces[faceId]?.uv)
          ])
        );
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument(
        replaceBrush(
          currentDocument,
          updateBrush(currentBrush, {
            faces: Object.fromEntries(
              getBrushFaceIds(currentBrush).map((faceId) => [
                faceId,
                {
                  ...currentBrush.faces[faceId],
                  uv: cloneFaceUvState(
                    options.updateUvState(currentBrush.faces[faceId].uv, faceId)
                  )
                }
              ])
            ) as typeof currentBrush.faces
          })
        )
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (previousUvStates === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const currentBrush = getBoxBrushOrThrow(currentDocument, options.brushId);
      const restoredUvStates = previousUvStates;

      context.setDocument(
        replaceBrush(
          currentDocument,
          updateBrush(currentBrush, {
            faces: Object.fromEntries(
              getBrushFaceIds(currentBrush).map((faceId) => [
                faceId,
                {
                  ...currentBrush.faces[faceId],
                  uv: cloneFaceUvState(restoredUvStates[faceId])
                }
              ])
            ) as typeof currentBrush.faces
          })
        )
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
