import type { ModelInstance } from "./model-instances";
import { getModelInstances } from "./model-instances";
import type { ProjectAssetRecord } from "./project-assets";

function getModelInstanceBaseLabel(modelInstance: ModelInstance, assets: Record<string, ProjectAssetRecord>): string {
  if (modelInstance.name !== undefined) {
    return modelInstance.name;
  }

  const asset = assets[modelInstance.assetId];

  if (asset === undefined) {
    return "Model Instance";
  }

  return asset.sourceName;
}

export function getModelInstanceDisplayLabel(modelInstance: ModelInstance, assets: Record<string, ProjectAssetRecord>): string {
  return getModelInstanceBaseLabel(modelInstance, assets);
}

export function getModelInstanceDisplayLabelById(
  modelInstanceId: string,
  modelInstances: Record<string, ModelInstance>,
  assets: Record<string, ProjectAssetRecord>
): string {
  const modelInstance = modelInstances[modelInstanceId];

  if (modelInstance === undefined) {
    return "Model Instance";
  }

  return getModelInstanceDisplayLabel(modelInstance, assets);
}

export function getSortedModelInstanceDisplayLabels(
  modelInstances: Record<string, ModelInstance>,
  assets: Record<string, ProjectAssetRecord>
): Array<{ modelInstance: ModelInstance; label: string }> {
  return getModelInstances(modelInstances).map((modelInstance) => ({
    modelInstance,
    label: getModelInstanceDisplayLabel(modelInstance, assets)
  }));
}

