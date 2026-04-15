import {
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader
} from "three";

import {
  getStarterMaterialBaseColorUrl,
  getStarterMaterialMetallicUrl,
  getStarterMaterialNormalUrl,
  getStarterMaterialRoughnessUrl,
  getStarterMaterialSpecularUrl,
  getStarterMaterialTextureRepeat,
  type MaterialDef
} from "./starter-material-library";

export interface StarterMaterialTextureSet {
  baseColor: Texture;
  normal: Texture;
  roughness: Texture;
  metallic: Texture | null;
  specular: Texture | null;
}

export function createStarterMaterialSignature(material: MaterialDef): string {
  return [
    material.assetFolder,
    material.workflow,
    material.previewImageName,
    material.sizeCm.width,
    material.sizeCm.height,
    material.swatchColorHex
  ].join("|");
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

function floorPowerOfTwo(value: number): number {
  return 2 ** Math.max(0, Math.floor(Math.log2(Math.max(1, value))));
}

function createRepeatableTextureImage(
  image: { width: number; height: number }
): { width: number; height: number } | HTMLCanvasElement {
  if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
    return image;
  }

  const canvas = document.createElement("canvas");
  canvas.width = floorPowerOfTwo(image.width);
  canvas.height = floorPowerOfTwo(image.height);

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("2D canvas context is unavailable for starter material texture conversion.");
  }

  context.drawImage(
    image as CanvasImageSource,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas;
}

function configureTexture(
  texture: Texture,
  material: MaterialDef,
  options: { colorSpace?: typeof SRGBColorSpace | null }
) {
  const repeat = getStarterMaterialTextureRepeat(material);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat.x, repeat.y);
  texture.colorSpace = options.colorSpace ?? texture.colorSpace;
}

function loadMaterialTexture(
  loader: TextureLoader,
  url: string,
  material: MaterialDef,
  options: { colorSpace?: typeof SRGBColorSpace | null }
): Texture {
  const texture = loader.load(url, (loadedTexture) => {
    loadedTexture.image = createRepeatableTextureImage(
      loadedTexture.image as { width: number; height: number }
    );
    configureTexture(loadedTexture, material, options);
    loadedTexture.needsUpdate = true;
  });

  configureTexture(texture, material, options);

  return texture;
}

export function createStarterMaterialTextureSet(
  material: MaterialDef,
  loader: TextureLoader = new TextureLoader()
): StarterMaterialTextureSet {
  const metallicUrl = getStarterMaterialMetallicUrl(material);
  const specularUrl = getStarterMaterialSpecularUrl(material);

  return {
    baseColor: loadMaterialTexture(loader, getStarterMaterialBaseColorUrl(material), material, {
      colorSpace: SRGBColorSpace
    }),
    normal: loadMaterialTexture(loader, getStarterMaterialNormalUrl(material), material, {
      colorSpace: null
    }),
    roughness: loadMaterialTexture(
      loader,
      getStarterMaterialRoughnessUrl(material),
      material,
      {
        colorSpace: null
      }
    ),
    metallic:
      metallicUrl === null
        ? null
        : loadMaterialTexture(loader, metallicUrl, material, {
            colorSpace: null
          }),
    specular:
      specularUrl === null
        ? null
        : loadMaterialTexture(loader, specularUrl, material, {
            colorSpace: null
          })
  };
}

export function disposeStarterMaterialTextureSet(
  textureSet: StarterMaterialTextureSet
): void {
  const textures = new Set<Texture>([
    textureSet.baseColor,
    textureSet.normal,
    textureSet.roughness
  ]);

  if (textureSet.metallic !== null) {
    textures.add(textureSet.metallic);
  }

  if (textureSet.specular !== null) {
    textures.add(textureSet.specular);
  }

  for (const texture of textures) {
    texture.dispose();
  }
}
