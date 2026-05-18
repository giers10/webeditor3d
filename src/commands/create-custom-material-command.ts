import { createOpaqueId } from "../core/ids";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { updateBrush, type WhiteboxFaceId } from "../document/brushes";
import { getBrushFaceIds } from "../geometry/whitebox-topology";
import {
  cloneMaterialDef,
  type CustomMaterialDef
} from "../materials/starter-material-library";

import {
  cloneSelectionForCommand,
  getBoxBrushOrThrow,
  replaceBrush,
  replaceBoxBrushFace,
  setSingleBrushFaceSelection,
  setSingleBrushSelection
} from "./brush-command-helpers";
import type { EditorCommand } from "./command";

type CreateCustomMaterialApplyTarget =
  | { kind: "brush"; brushId: string }
  | { kind: "face"; brushId: string; faceId: WhiteboxFaceId };

interface CreateCustomMaterialCommandOptions {
  material: CustomMaterialDef;
  applyTo?: CreateCustomMaterialApplyTarget;
  label?: string;
}

export function createCreateCustomMaterialCommand(
  options: CreateCustomMaterialCommandOptions
): EditorCommand {
  const nextMaterial = cloneMaterialDef(options.material) as CustomMaterialDef;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;
  let previousMaterialIds: Record<WhiteboxFaceId, string | null> | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Create custom material",
    execute(context) {
      const currentDocument = context.getDocument();

      if (nextMaterial.kind !== "custom") {
        throw new Error("Only custom materials can be created by this command.");
      }

      if (currentDocument.materials[nextMaterial.id] !== undefined) {
        throw new Error(`Material ${nextMaterial.id} already exists.`);
      }

      if (previousSelection === null) {
        previousSelection = cloneSelectionForCommand(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      let nextDocument = {
        ...currentDocument,
        materials: {
          ...currentDocument.materials,
          [nextMaterial.id]: cloneMaterialDef(nextMaterial)
        }
      };

      if (options.applyTo?.kind === "brush") {
        const currentBrush = getBoxBrushOrThrow(
          currentDocument,
          options.applyTo.brushId
        );

        if (previousMaterialIds === null) {
          previousMaterialIds = Object.fromEntries(
            getBrushFaceIds(currentBrush).map((faceId) => [
              faceId,
              currentBrush.faces[faceId].materialId
            ])
          );
        }

        nextDocument = replaceBrush(
          nextDocument,
          updateBrush(currentBrush, {
            faces: Object.fromEntries(
              getBrushFaceIds(currentBrush).map((faceId) => [
                faceId,
                {
                  ...currentBrush.faces[faceId],
                  materialId: nextMaterial.id
                }
              ])
            ) as typeof currentBrush.faces
          })
        );
        context.setSelection(setSingleBrushSelection(options.applyTo.brushId));
      } else if (options.applyTo?.kind === "face") {
        const currentBrush = getBoxBrushOrThrow(
          currentDocument,
          options.applyTo.brushId
        );
        const currentFace = currentBrush.faces[options.applyTo.faceId];

        if (currentFace === undefined) {
          throw new Error(
            `Whitebox solid ${options.applyTo.brushId} does not contain face ${options.applyTo.faceId}.`
          );
        }

        if (previousMaterialIds === null) {
          previousMaterialIds = {
            [options.applyTo.faceId]: currentFace.materialId
          } as Record<WhiteboxFaceId, string | null>;
        }

        nextDocument = replaceBoxBrushFace(
          nextDocument,
          options.applyTo.brushId,
          options.applyTo.faceId,
          {
            ...currentFace,
            materialId: nextMaterial.id
          }
        );
        context.setSelection(
          setSingleBrushFaceSelection(
            options.applyTo.brushId,
            options.applyTo.faceId
          )
        );
      }

      context.setDocument(nextDocument);
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextMaterials = {
        ...currentDocument.materials
      };

      delete nextMaterials[nextMaterial.id];

      let nextDocument = {
        ...currentDocument,
        materials: nextMaterials
      };

      if (options.applyTo?.kind === "brush" && previousMaterialIds !== null) {
        const currentBrush = getBoxBrushOrThrow(
          currentDocument,
          options.applyTo.brushId
        );

        nextDocument = replaceBrush(
          nextDocument,
          updateBrush(currentBrush, {
            faces: Object.fromEntries(
              getBrushFaceIds(currentBrush).map((faceId) => [
                faceId,
                {
                  ...currentBrush.faces[faceId],
                  materialId: previousMaterialIds?.[faceId] ?? null
                }
              ])
            ) as typeof currentBrush.faces
          })
        );
      } else if (
        options.applyTo?.kind === "face" &&
        previousMaterialIds !== null
      ) {
        const currentBrush = getBoxBrushOrThrow(
          currentDocument,
          options.applyTo.brushId
        );
        const currentFace = currentBrush.faces[options.applyTo.faceId];

        if (currentFace !== undefined) {
          nextDocument = replaceBoxBrushFace(
            nextDocument,
            options.applyTo.brushId,
            options.applyTo.faceId,
            {
              ...currentFace,
              materialId: previousMaterialIds[options.applyTo.faceId] ?? null
            }
          );
        }
      }

      context.setDocument(nextDocument);

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
