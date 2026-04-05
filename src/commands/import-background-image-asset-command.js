import { createOpaqueId } from "../core/ids";
import { cloneWorldSettings } from "../document/world-settings";
import { cloneProjectAssetRecord } from "../assets/project-assets";
export function createImportBackgroundImageAssetCommand(options) {
    const nextAsset = cloneProjectAssetRecord(options.asset);
    const nextWorld = cloneWorldSettings(options.world);
    let previousWorld = null;
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
