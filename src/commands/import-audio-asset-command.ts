import { createOpaqueId } from "../core/ids";
import { cloneProjectAssetRecord, type AudioAssetRecord } from "../assets/project-assets";

import type { EditorCommand } from "./command";

interface ImportAudioAssetCommandOptions {
  asset: AudioAssetRecord;
  label?: string;
}

export function createImportAudioAssetCommand(options: ImportAudioAssetCommandOptions): EditorCommand {
  const nextAsset = cloneProjectAssetRecord(options.asset);

  return {
    id: createOpaqueId("command"),
    label: options.label ?? `Import ${nextAsset.sourceName}`,
    execute(context) {
      const currentDocument = context.getDocument();

      if (currentDocument.assets[nextAsset.id] !== undefined) {
        throw new Error(`Asset ${nextAsset.id} already exists.`);
      }

      context.setDocument({
        ...currentDocument,
        assets: {
          ...currentDocument.assets,
          [nextAsset.id]: cloneProjectAssetRecord(nextAsset)
        }
      });
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextAssets = {
        ...currentDocument.assets
      };

      delete nextAssets[nextAsset.id];

      context.setDocument({
        ...currentDocument,
        assets: nextAssets
      });
    }
  };
}
