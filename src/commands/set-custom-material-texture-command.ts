import { createOpaqueId } from "../core/ids";
import type { ProjectDocument } from "../document/scene-document";
import {
  cloneMaterialDef,
  type CustomMaterialDef,
  type MaterialTextureSlot
} from "../materials/starter-material-library";
import {
  cloneProjectAssetRecord,
  type ImageAssetRecord
} from "../assets/project-assets";

import type { EditorCommand } from "./command";

interface SetCustomMaterialTextureCommandOptions {
  materialId: string;
  slot: MaterialTextureSlot;
  assetId: string | null;
  asset?: ImageAssetRecord;
  label?: string;
}

export function createSetCustomMaterialTextureCommand(
  options: SetCustomMaterialTextureCommandOptions
): EditorCommand {
  let previousProjectDocument: ProjectDocument | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Set custom material texture",
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();
      const currentMaterial =
        currentProjectDocument.materials[options.materialId];

      if (currentMaterial === undefined) {
        throw new Error(`Material ${options.materialId} does not exist.`);
      }

      if (currentMaterial.kind !== "custom") {
        throw new Error("Starter materials are read-only.");
      }

      if (options.asset !== undefined && options.asset.id !== options.assetId) {
        throw new Error("Imported material texture asset id must match assetId.");
      }

      const existingAsset =
        options.assetId === null
          ? null
          : (options.asset ?? currentProjectDocument.assets[options.assetId]);

      if (existingAsset !== null) {
        if (existingAsset === undefined) {
          throw new Error(`Asset ${options.assetId} does not exist.`);
        }

        if (existingAsset.kind !== "image") {
          throw new Error("Material texture slots require image assets.");
        }
      }

      if (previousProjectDocument === null) {
        previousProjectDocument = currentProjectDocument;
      }

      const nextMaterial: CustomMaterialDef = {
        ...currentMaterial,
        textures: {
          ...currentMaterial.textures,
          [options.slot]:
            options.assetId === null ? null : { assetId: options.assetId }
        }
      };

      context.setProjectDocument({
        ...currentProjectDocument,
        assets:
          options.asset === undefined
            ? currentProjectDocument.assets
            : {
                ...currentProjectDocument.assets,
                [options.asset.id]: cloneProjectAssetRecord(options.asset)
              },
        materials: {
          ...currentProjectDocument.materials,
          [options.materialId]: cloneMaterialDef(nextMaterial)
        }
      });
    },
    undo(context) {
      if (previousProjectDocument === null) {
        return;
      }

      context.setProjectDocument(previousProjectDocument);
    }
  };
}
