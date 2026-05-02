import { Group } from "three";

import { createConfiguredGltfLoader } from "../assets/gltf-model-import";

const bundledFoliageTemplatePromises = new Map<string, Promise<Group>>();

function getErrorDetail(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message.trim()
    : "Unknown error.";
}

export function loadBundledFoliageModelTemplate(
  bundledPath: string
): Promise<Group> {
  const cachedTemplatePromise = bundledFoliageTemplatePromises.get(bundledPath);

  if (cachedTemplatePromise !== undefined) {
    return cachedTemplatePromise;
  }

  const templatePromise = createConfiguredGltfLoader()
    .loadAsync(bundledPath)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      bundledFoliageTemplatePromises.delete(bundledPath);
      throw new Error(
        `Bundled foliage model failed to load from ${bundledPath}: ${getErrorDetail(error)}`
      );
    });

  bundledFoliageTemplatePromises.set(bundledPath, templatePromise);
  return templatePromise;
}
