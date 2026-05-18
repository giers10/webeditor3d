import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UVMapping
} from "three";

import type { LoadedImageAsset } from "../assets/image-assets";

import {
  createStarterMaterialSignature,
  createStarterMaterialTextureSet,
  disposeStarterMaterialTextureSet,
  type StarterMaterialTextureSet
} from "./starter-material-textures";
import type {
  CustomMaterialDef,
  MaterialDef,
  MaterialTextureSlot,
  StarterMaterialDef
} from "./starter-material-library";

export interface MaterialTextureSet {
  baseColor: Texture | null;
  normal: Texture | null;
  roughness: Texture | null;
  metallic: Texture | null;
  specular: Texture | null;
  albedoHasAlpha: boolean;
}

export interface CachedMaterialTextureSet {
  signature: string;
  textureSet: MaterialTextureSet;
}

function createStarterTextureSet(
  material: StarterMaterialDef,
  loader: TextureLoader
): MaterialTextureSet {
  const starterTextureSet = createStarterMaterialTextureSet(material, loader);

  return {
    baseColor: starterTextureSet.baseColor,
    normal: starterTextureSet.normal,
    roughness: starterTextureSet.roughness,
    metallic: starterTextureSet.metallic,
    specular: starterTextureSet.specular,
    albedoHasAlpha: false
  };
}

function configureCustomTexture(
  texture: Texture,
  slot: MaterialTextureSlot
): Texture {
  texture.mapping = UVMapping;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = slot === "albedo" ? SRGBColorSpace : NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function cloneCustomTexture(
  source: LoadedImageAsset | undefined,
  slot: MaterialTextureSlot
): Texture | null {
  if (source === undefined) {
    return null;
  }

  return configureCustomTexture(source.texture.clone(), slot);
}

function createCustomTextureSet(
  material: CustomMaterialDef,
  loadedImageAssets: Record<string, LoadedImageAsset>
): MaterialTextureSet {
  const albedoAsset =
    material.textures.albedo === null
      ? undefined
      : loadedImageAssets[material.textures.albedo.assetId];

  return {
    baseColor: cloneCustomTexture(albedoAsset, "albedo"),
    normal:
      material.textures.normal === null
        ? null
        : cloneCustomTexture(
            loadedImageAssets[material.textures.normal.assetId],
            "normal"
          ),
    roughness:
      material.textures.roughness === null
        ? null
        : cloneCustomTexture(
            loadedImageAssets[material.textures.roughness.assetId],
            "roughness"
          ),
    metallic:
      material.textures.metallic === null
        ? null
        : cloneCustomTexture(
            loadedImageAssets[material.textures.metallic.assetId],
            "metallic"
          ),
    specular: null,
    albedoHasAlpha: albedoAsset?.metadata.hasAlpha ?? false
  };
}

function getLoadedTextureSignature(
  loadedImageAssets: Record<string, LoadedImageAsset>,
  assetId: string
): string {
  const loadedAsset = loadedImageAssets[assetId];

  return loadedAsset === undefined
    ? `${assetId}:missing`
    : `${assetId}:${loadedAsset.texture.uuid}`;
}

function createCustomMaterialSignature(
  material: CustomMaterialDef,
  loadedImageAssets: Record<string, LoadedImageAsset>
): string {
  return [
    material.kind,
    material.name,
    material.swatchColorHex,
    material.albedoColorHex,
    material.opacity,
    material.roughness,
    material.metallic,
    material.normalStrength,
    material.textures.albedo === null
      ? "albedo:none"
      : `albedo:${getLoadedTextureSignature(
          loadedImageAssets,
          material.textures.albedo.assetId
        )}`,
    material.textures.normal === null
      ? "normal:none"
      : `normal:${getLoadedTextureSignature(
          loadedImageAssets,
          material.textures.normal.assetId
        )}`,
    material.textures.roughness === null
      ? "roughness:none"
      : `roughness:${getLoadedTextureSignature(
          loadedImageAssets,
          material.textures.roughness.assetId
        )}`,
    material.textures.metallic === null
      ? "metallic:none"
      : `metallic:${getLoadedTextureSignature(
          loadedImageAssets,
          material.textures.metallic.assetId
        )}`
  ].join("|");
}

export function createMaterialSignature(
  material: MaterialDef,
  loadedImageAssets: Record<string, LoadedImageAsset>
): string {
  return material.kind === "starter"
    ? createStarterMaterialSignature(material)
    : createCustomMaterialSignature(material, loadedImageAssets);
}

export function createMaterialTextureSet(
  material: MaterialDef,
  loader: TextureLoader,
  loadedImageAssets: Record<string, LoadedImageAsset>
): MaterialTextureSet {
  return material.kind === "starter"
    ? createStarterTextureSet(material, loader)
    : createCustomTextureSet(material, loadedImageAssets);
}

export function disposeMaterialTextureSet(textureSet: MaterialTextureSet): void {
  if (textureSet.specular !== null || textureSet.metallic !== null) {
    const starterCandidate: StarterMaterialTextureSet = {
      baseColor: textureSet.baseColor as Texture,
      normal: textureSet.normal as Texture,
      roughness: textureSet.roughness as Texture,
      metallic: textureSet.metallic,
      specular: textureSet.specular
    };

    if (
      starterCandidate.baseColor !== null &&
      starterCandidate.normal !== null &&
      starterCandidate.roughness !== null
    ) {
      disposeStarterMaterialTextureSet(starterCandidate);
      return;
    }
  }

  const textures = new Set<Texture>();

  for (const texture of [
    textureSet.baseColor,
    textureSet.normal,
    textureSet.roughness,
    textureSet.metallic,
    textureSet.specular
  ]) {
    if (texture !== null) {
      textures.add(texture);
    }
  }

  for (const texture of textures) {
    texture.dispose();
  }
}
