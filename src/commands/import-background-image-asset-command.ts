import { createOpaqueId } from "../core/ids";
import { cloneWorldSettings, type WorldSettings } from "../document/world-settings";
import { cloneProjectAssetRecord, type ImageAssetRecord } from "../assets/project-assets";

import type { EditorCommand } from "./command";

interface ImportBackgroundImageAssetCommandOptions {
  asset: ImageAssetRecord;
  world: WorldSettings;
  label?: string;
}

export function createImportBackgroundImageAssetCommand(options: ImportBackgroundImageAssetCommandOptions): EditorCommand {
  const nextAsset = cloneProjectAssetRecord(options.asset);
  const nextWorld = cloneWorldSettings(options.world);
  let previousWorld: WorldSettings | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? `Import ${nextAsset.sourceName} as background`,
    execute(context) {
      const currentDocument = context.getDocument();

      if (currentDocument.assets[nextAsset.id] !== undefined) {
        throw new Error(`Asset ${nextAsset.id} already exists.`);
      }

      if (previousWorld === null) {
        previousWorld = cloneWorldSettings(currentDocument.world);
      }

      context.setDocument({
        ...currentDocument,
        assets: {
          ...currentDocument.assets,
          [nextAsset.id]: cloneProjectAssetRecord(nextAsset)
        },
        world: cloneWorldSettings(nextWorld)
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
        assets: nextAssets,
        world: previousWorld === null ? cloneWorldSettings(currentDocument.world) : cloneWorldSettings(previousWorld)
      });
    }
  };
}
