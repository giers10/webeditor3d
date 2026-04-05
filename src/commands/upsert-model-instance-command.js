import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection } from "../core/selection";
import { cloneModelInstance, getModelInstanceKindLabel } from "../assets/model-instances";
import { getProjectAssetKindLabel } from "../assets/project-assets";
function setSingleModelInstanceSelection(modelInstanceId) {
    return {
        kind: "modelInstances",
        ids: [modelInstanceId]
    };
}
function createDefaultModelInstanceCommandLabel(isNewModelInstance) {
    const action = isNewModelInstance ? "Place" : "Update";
    return `${action} ${getModelInstanceKindLabel().toLowerCase()}`;
}
export function createUpsertModelInstanceCommand(options) {
    const nextModelInstance = cloneModelInstance(options.modelInstance);
    let previousModelInstance = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? createDefaultModelInstanceCommandLabel(true),
        execute(context) {
            const currentDocument = context.getDocument();
            const currentAsset = currentDocument.assets[nextModelInstance.assetId];
            if (currentAsset === undefined) {
                throw new Error(`Model instance ${nextModelInstance.id} cannot reference missing asset ${nextModelInstance.assetId}.`);
            }
            if (currentAsset.kind !== "model") {
                throw new Error(`Model instance ${nextModelInstance.id} must reference a model asset, not ${getProjectAssetKindLabel(currentAsset.kind).toLowerCase()}.`);
            }
            const currentModelInstance = currentDocument.modelInstances[nextModelInstance.id];
            if (previousSelection === null) {
                previousSelection = cloneEditorSelection(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            if (previousModelInstance === null && currentModelInstance !== undefined) {
                previousModelInstance = cloneModelInstance(currentModelInstance);
            }
            context.setDocument({
                ...currentDocument,
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
            const nextModelInstances = {
                ...currentDocument.modelInstances
            };
            if (previousModelInstance === null) {
                delete nextModelInstances[nextModelInstance.id];
            }
            else {
                nextModelInstances[nextModelInstance.id] = cloneModelInstance(previousModelInstance);
            }
            context.setDocument({
                ...currentDocument,
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
