import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import {
  BOX_FACE_IDS,
  cloneFaceUvState,
  type BoxFaceId,
  type FaceUvState
} from "../document/brushes";

import {
  cloneSelectionForCommand,
  getBoxBrushOrThrow,
  replaceBrush
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface UpdateBoxBrushAllFaceUvsCommandOptions {
  brushId: string;
  label: string;
  updateUvState(uvState: FaceUvState, faceId: BoxFaceId): FaceUvState;
}

export function createUpdateBoxBrushAllFaceUvsCommand(
  options: UpdateBoxBrushAllFaceUvsCommandOptions
): EditorCommand {
  let previousUvStates: Record<BoxFaceId, FaceUvState> | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentDocument = context.getDocument();
      const currentBrush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (previousUvStates === null) {
        previousUvStates = {
          posX: cloneFaceUvState(currentBrush.faces.posX.uv),
          negX: cloneFaceUvState(currentBrush.faces.negX.uv),
          posY: cloneFaceUvState(currentBrush.faces.posY.uv),
          negY: cloneFaceUvState(currentBrush.faces.negY.uv),
          posZ: cloneFaceUvState(currentBrush.faces.posZ.uv),
          negZ: cloneFaceUvState(currentBrush.faces.negZ.uv)
        };
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument(
        replaceBrush(currentDocument, {
          ...currentBrush,
          faces: Object.fromEntries(
            BOX_FACE_IDS.map((faceId) => [
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
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (previousUvStates === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const currentBrush = getBoxBrushOrThrow(currentDocument, options.brushId);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...currentBrush,
          faces: {
            posX: {
              ...currentBrush.faces.posX,
              uv: cloneFaceUvState(previousUvStates.posX)
            },
            negX: {
              ...currentBrush.faces.negX,
              uv: cloneFaceUvState(previousUvStates.negX)
            },
            posY: {
              ...currentBrush.faces.posY,
              uv: cloneFaceUvState(previousUvStates.posY)
            },
            negY: {
              ...currentBrush.faces.negY,
              uv: cloneFaceUvState(previousUvStates.negY)
            },
            posZ: {
              ...currentBrush.faces.posZ,
              uv: cloneFaceUvState(previousUvStates.posZ)
            },
            negZ: {
              ...currentBrush.faces.negZ,
              uv: cloneFaceUvState(previousUvStates.negZ)
            }
          }
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
