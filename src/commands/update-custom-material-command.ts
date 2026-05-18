import { createOpaqueId } from "../core/ids";
import {
  cloneMaterialDef,
  type CustomMaterialDef,
  type CustomMaterialTextureRefs
} from "../materials/starter-material-library";

import type { EditorCommand } from "./command";

type CustomMaterialUpdate = Partial<
  Pick<
    CustomMaterialDef,
    | "name"
    | "swatchColorHex"
    | "tags"
    | "albedoColorHex"
    | "opacity"
    | "roughness"
    | "metallic"
    | "normalStrength"
  >
> & {
  textures?: CustomMaterialTextureRefs;
};

interface UpdateCustomMaterialCommandOptions {
  materialId: string;
  update: CustomMaterialUpdate;
  label?: string;
}

export function createUpdateCustomMaterialCommand(
  options: UpdateCustomMaterialCommandOptions
): EditorCommand {
  let previousMaterial: CustomMaterialDef | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Update custom material",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentMaterial = currentDocument.materials[options.materialId];

      if (currentMaterial === undefined) {
        throw new Error(`Material ${options.materialId} does not exist.`);
      }

      if (currentMaterial.kind !== "custom") {
        throw new Error("Starter materials are read-only.");
      }

      if (previousMaterial === null) {
        previousMaterial = cloneMaterialDef(
          currentMaterial
        ) as CustomMaterialDef;
      }

      const nextAlbedoColorHex =
        options.update.albedoColorHex ?? currentMaterial.albedoColorHex;
      const nextMaterial: CustomMaterialDef = {
        ...currentMaterial,
        ...options.update,
        swatchColorHex:
          options.update.swatchColorHex ??
          (options.update.albedoColorHex === undefined
            ? currentMaterial.swatchColorHex
            : nextAlbedoColorHex),
        albedoColorHex: nextAlbedoColorHex,
        tags: options.update.tags ?? currentMaterial.tags,
        textures: options.update.textures ?? currentMaterial.textures
      };

      context.setDocument({
        ...currentDocument,
        materials: {
          ...currentDocument.materials,
          [options.materialId]: cloneMaterialDef(nextMaterial)
        }
      });
    },
    undo(context) {
      if (previousMaterial === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        materials: {
          ...currentDocument.materials,
          [options.materialId]: cloneMaterialDef(previousMaterial)
        }
      });
    }
  };
}
