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

interface SetBoxBrushFaceMaterialCommandOptions {
  brushId: string;
  faceId: WhiteboxFaceId;
  materialId: string | null;
}

export function createSetBoxBrushFaceMaterialCommand(options: SetBoxBrushFaceMaterialCommandOptions): EditorCommand {
  let previousMaterialId: string | null | undefined;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.materialId === null ? `Clear ${options.faceId} face material` : `Apply material to ${options.faceId} face`,
    execute(context) {
      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);

      if (options.materialId !== null && currentDocument.materials[options.materialId] === undefined) {
        throw new Error(`Material ${options.materialId} does not exist in the document registry.`);
      }

      if (previousMaterialId === undefined) {
        previousMaterialId = currentFace.materialId;
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
          materialId: options.materialId
        })
      );
      context.setSelection(setSingleBrushFaceSelection(options.brushId, options.faceId));
      context.setToolMode("select");
    },
    undo(context) {
      if (previousMaterialId === undefined) {
        return;
      }

      const currentDocument = context.getDocument();
      const currentFace = getBoxBrushFaceOrThrow(currentDocument, options.brushId, options.faceId);

      context.setDocument(
        replaceBoxBrushFace(currentDocument, options.brushId, options.faceId, {
          ...currentFace,
          materialId: previousMaterialId
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
