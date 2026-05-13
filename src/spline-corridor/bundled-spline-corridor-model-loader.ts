import { Group } from "three";

import { createConfiguredGltfLoader } from "../assets/gltf-model-import";

const bundledSplineCorridorTemplatePromises = new Map<string, Promise<Group>>();

function getErrorDetail(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message.trim()
    : "Unknown error.";
}

export function loadBundledSplineCorridorModelTemplate(
  bundledPath: string
): Promise<Group> {
  const cachedTemplatePromise =
    bundledSplineCorridorTemplatePromises.get(bundledPath);

  if (cachedTemplatePromise !== undefined) {
    return cachedTemplatePromise;
  }

  const templatePromise = createConfiguredGltfLoader()
    .loadAsync(bundledPath)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      bundledSplineCorridorTemplatePromises.delete(bundledPath);
      throw new Error(
        `Bundled spline corridor model failed to load from ${bundledPath}: ${getErrorDetail(error)}`
      );
    });

  bundledSplineCorridorTemplatePromises.set(bundledPath, templatePromise);
  return templatePromise;
}
