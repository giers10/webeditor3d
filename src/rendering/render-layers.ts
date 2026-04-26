import { type Camera, type Material, type Object3D } from "three";

export type RendererRenderCategory =
  | "ao-world"
  | "post-ao-transparent"
  | "overlay";

export const AO_WORLD_RENDER_LAYER = 0;
export const POST_AO_TRANSPARENT_RENDER_LAYER = 28;
export const OVERLAY_RENDER_LAYER = 29;

export const AO_WORLD_RENDER_LAYER_MASK = 1 << AO_WORLD_RENDER_LAYER;
export const POST_AO_TRANSPARENT_RENDER_LAYER_MASK =
  1 << POST_AO_TRANSPARENT_RENDER_LAYER;
export const OVERLAY_RENDER_LAYER_MASK = 1 << OVERLAY_RENDER_LAYER;
export const ALL_RENDER_LAYER_MASK =
  AO_WORLD_RENDER_LAYER_MASK |
  POST_AO_TRANSPARENT_RENDER_LAYER_MASK |
  OVERLAY_RENDER_LAYER_MASK;

export function getRendererRenderCategoryLayer(
  category: RendererRenderCategory
) {
  switch (category) {
    case "ao-world":
      return AO_WORLD_RENDER_LAYER;
    case "post-ao-transparent":
      return POST_AO_TRANSPARENT_RENDER_LAYER;
    case "overlay":
      return OVERLAY_RENDER_LAYER;
  }
}

export function applyRendererRenderCategory(
  root: Object3D,
  category: RendererRenderCategory
) {
  const layer = getRendererRenderCategoryLayer(category);

  root.traverse((object) => {
    object.layers.set(layer);
  });
}

export function enableObjectForAllRendererRenderCategories(root: Object3D) {
  root.traverse((object) => {
    object.layers.mask = ALL_RENDER_LAYER_MASK;
  });
}

export function enableCameraRendererRenderCategories(camera: Camera) {
  camera.layers.mask = ALL_RENDER_LAYER_MASK;
}

export function isMaterialEligibleForAmbientOcclusion(
  material: Material | Material[]
) {
  const materials = Array.isArray(material) ? material : [material];

  return materials.every((candidate) => {
    const renderMaterial = candidate as Material & {
      colorWrite?: boolean;
      opacity?: number;
      transparent?: boolean;
      visible?: boolean;
    };
    const opacity = renderMaterial.opacity ?? 1;

    return (
      renderMaterial.visible !== false &&
      renderMaterial.colorWrite !== false &&
      renderMaterial.transparent !== true &&
      opacity >= 0.999
    );
  });
}

export function applyRendererRenderCategoryFromMaterial(root: Object3D) {
  root.traverse((object) => {
    const renderable = object as Object3D & {
      material?: Material | Material[];
    };

    if (renderable.material === undefined) {
      return;
    }

    applyRendererRenderCategory(
      object,
      isMaterialEligibleForAmbientOcclusion(renderable.material)
        ? "ao-world"
        : "post-ao-transparent"
    );
  });
}
