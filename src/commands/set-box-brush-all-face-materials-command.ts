import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { WhiteboxFaceId } from "../document/brushes";
import { getBrushFaceIds } from "../geometry/whitebox-topology";

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
  let previousMaterialIds: Record<WhiteboxFaceId, string | null> | null = null;
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
        previousMaterialIds = Object.fromEntries(
          getBrushFaceIds(currentBrush).map((faceId) => [
            faceId,
            currentBrush.faces[faceId].materialId
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
        replaceBrush(currentDocument, {
          ...currentBrush,
          faces: Object.fromEntries(
            getBrushFaceIds(currentBrush).map((faceId) => [
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
          faces: Object.fromEntries(
            getBrushFaceIds(currentBrush).map((faceId) => [
              faceId,
              {
                ...currentBrush.faces[faceId],
                materialId: previousMaterialIds[faceId] ?? null
              }
            ])
          ) as typeof currentBrush.faces
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
