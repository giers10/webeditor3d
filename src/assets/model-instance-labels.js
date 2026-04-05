import { getModelInstances } from "./model-instances";
function getModelInstanceBaseLabel(modelInstance, assets) {
    if (modelInstance.name !== undefined) {
        return modelInstance.name;
    }
    const asset = assets[modelInstance.assetId];
    if (asset === undefined) {
        return "Model Instance";
    }
    return asset.sourceName;
}
export function getModelInstanceDisplayLabel(modelInstance, assets) {
    return getModelInstanceBaseLabel(modelInstance, assets);
}
export function getModelInstanceDisplayLabelById(modelInstanceId, modelInstances, assets) {
    const modelInstance = modelInstances[modelInstanceId];
    if (modelInstance === undefined) {
        return "Model Instance";
    }
    return getModelInstanceDisplayLabel(modelInstance, assets);
}
export function getSortedModelInstanceDisplayLabels(modelInstances, assets) {
    return getModelInstances(modelInstances).map((modelInstance) => ({
        modelInstance,
        label: getModelInstanceDisplayLabel(modelInstance, assets)
    }));
}
