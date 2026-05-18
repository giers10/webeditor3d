import { describe, expect, it } from "vitest";
import { NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from "three";

import type { LoadedImageAsset } from "../../src/assets/image-assets";
import {
  createMaterialSignature,
  createMaterialTextureSet,
  disposeMaterialTextureSet
} from "../../src/materials/material-rendering";
import { createCustomMaterialDef } from "../../src/materials/starter-material-library";

function createLoadedImageAsset(
  assetId: string,
  options: { hasAlpha?: boolean } = {}
): LoadedImageAsset {
  return {
    assetId,
    storageKey: `project-asset:${assetId}`,
    metadata: {
      kind: "image",
      width: 2,
      height: 2,
      hasAlpha: options.hasAlpha ?? false,
      warnings: []
    },
    texture: new Texture(),
    sourceUrl: `memory://${assetId}`,
    previewUrl: `memory://${assetId}`,
    revokeSourceUrl: () => undefined
  };
}

describe("material rendering", () => {
  it("keeps scalar-only custom materials texture-free", () => {
    const material = createCustomMaterialDef({
      id: "material-scalar-only",
      opacity: 0.62,
      roughness: 0.24,
      metallic: 0.11
    });
    const textureSet = createMaterialTextureSet(
      material,
      new TextureLoader(),
      {}
    );

    expect(textureSet).toEqual({
      baseColor: null,
      normal: null,
      roughness: null,
      metallic: null,
      specular: null,
      albedoHasAlpha: false
    });
    expect(createMaterialSignature(material, {})).toContain("0.62|0.24|0.11");
  });

  it("lazily clones only referenced custom material maps with slot color spaces", () => {
    const albedoAsset = createLoadedImageAsset("asset-albedo-alpha", {
      hasAlpha: true
    });
    const normalAsset = createLoadedImageAsset("asset-normal");
    const material = createCustomMaterialDef({
      id: "material-textured",
      textures: {
        albedo: {
          assetId: albedoAsset.assetId
        },
        normal: {
          assetId: normalAsset.assetId
        },
        roughness: null,
        metallic: null
      }
    });

    const textureSet = createMaterialTextureSet(
      material,
      new TextureLoader(),
      {
        [albedoAsset.assetId]: albedoAsset,
        [normalAsset.assetId]: normalAsset
      }
    );

    expect(textureSet.baseColor).not.toBeNull();
    expect(textureSet.normal).not.toBeNull();
    expect(textureSet.roughness).toBeNull();
    expect(textureSet.metallic).toBeNull();
    expect(textureSet.albedoHasAlpha).toBe(true);
    expect(textureSet.baseColor).not.toBe(albedoAsset.texture);
    expect(textureSet.baseColor?.colorSpace).toBe(SRGBColorSpace);
    expect(textureSet.normal?.colorSpace).toBe(NoColorSpace);

    disposeMaterialTextureSet(textureSet);
    albedoAsset.texture.dispose();
    normalAsset.texture.dispose();
  });
});
