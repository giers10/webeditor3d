import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import { BOX_FACE_IDS, type BoxFaceId } from "../document/brushes";

import {
  cloneSelectionForCommand,
  getBoxBrushOrThrow,
  replaceBrush
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface SetBoxBrushAllFaceMaterialsCommandOptions {
  brushId: string;
  materialId: string | null;
}

export function createSetBoxBrushAllFaceMaterialsCommand(
  options: SetBoxBrushAllFaceMaterialsCommandOptions
): EditorCommand {
  let previousMaterialIds: Record<BoxFaceId, string | null> | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label:
      options.materialId === null
        ? "Clear solid face materials"
        : "Apply material to solid",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentBrush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (
        options.materialId !== null &&
        currentDocument.materials[options.materialId] === undefined
      ) {
        throw new Error(
          `Material ${options.materialId} does not exist in the document registry.`
        );
      }

      if (previousMaterialIds === null) {
        previousMaterialIds = {
          posX: currentBrush.faces.posX.materialId,
          negX: currentBrush.faces.negX.materialId,
          posY: currentBrush.faces.posY.materialId,
          negY: currentBrush.faces.negY.materialId,
          posZ: currentBrush.faces.posZ.materialId,
          negZ: currentBrush.faces.negZ.materialId
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
                materialId: options.materialId
              }
            ])
          ) as typeof currentBrush.faces
        })
      );
      context.setToolMode("select");
    },
    undo(context) {
      if (previousMaterialIds === null) {
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
              materialId: previousMaterialIds.posX
            },
            negX: {
              ...currentBrush.faces.negX,
              materialId: previousMaterialIds.negX
            },
            posY: {
              ...currentBrush.faces.posY,
              materialId: previousMaterialIds.posY
            },
            negY: {
              ...currentBrush.faces.negY,
              materialId: previousMaterialIds.negY
            },
            posZ: {
              ...currentBrush.faces.posZ,
              materialId: previousMaterialIds.posZ
            },
            negZ: {
              ...currentBrush.faces.negZ,
              materialId: previousMaterialIds.negZ
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
