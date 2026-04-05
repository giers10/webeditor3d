import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection } from "../core/selection";
import { cloneModelInstance } from "../assets/model-instances";
import { cloneProjectAssetRecord } from "../assets/project-assets";
function setSingleModelInstanceSelection(modelInstanceId) {
    return {
        kind: "modelInstances",
        ids: [modelInstanceId]
    };
}
export function createImportModelAssetCommand(options) {
    const nextAsset = cloneProjectAssetRecord(options.asset);
    const nextModelInstance = cloneModelInstance(options.modelInstance);
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? `Import ${nextAsset.sourceName}`,
        execute(context) {
            const currentDocument = context.getDocument();
            if (currentDocument.assets[nextAsset.id] !== undefined) {
                throw new Error(`Asset ${nextAsset.id} already exists.`);
            }
            if (currentDocument.modelInstances[nextModelInstance.id] !== undefined) {
                throw new Error(`Model instance ${nextModelInstance.id} already exists.`);
            }
            if (previousSelection === null) {
                previousSelection = cloneEditorSelection(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            context.setDocument({
                ...currentDocument,
                assets: {
                    ...currentDocument.assets,
                    [nextAsset.id]: cloneProjectAssetRecord(nextAsset)
                },
                modelInstances: {
                    ...currentDocument.modelInstances,
                    [nextModelInstance.id]: cloneModelInstance(nextModelInstance)
                }
            });
            context.setSelection(setSingleModelInstanceSelection(nextModelInstance.id));
            context.setToolMode("select");
        },
        undo(context) {
            const currentDocument = context.getDocument();
            const nextAssets = {
                ...currentDocument.assets
            };
            const nextModelInstances = {
                ...currentDocument.modelInstances
            };
            delete nextAssets[nextAsset.id];
            delete nextModelInstances[nextModelInstance.id];
            context.setDocument({
                ...currentDocument,
                assets: nextAssets,
                modelInstances: nextModelInstances
            });
            if (previousSelection !== null) {
                context.setSelection(previousSelection);
            }
            if (previousToolMode !== null) {
                context.setToolMode(previousToolMode);
            }
        }
    };
}
