import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  LinearFilter,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture
} from "three";

import type { MaterialDef } from "../materials/starter-material-library";

interface TerrainLayerBlendMaterialOptions {
  layerTextures: readonly [Texture, Texture, Texture, Texture];
  emissiveHex?: number;
  emissiveIntensity?: number;
  wireframe?: boolean;
}

interface TerrainLayerColorBlendMaterialOptions {
  layerColors: readonly [number, number, number, number];
  emissiveHex?: number;
  emissiveIntensity?: number;
  wireframe?: boolean;
}

let fallbackTerrainLayerTexture: Texture | null = null;

function createFallbackTerrainLayerTexture(): Texture {
  const texture = new DataTexture(
    new Uint8Array([174, 167, 154, 255]),
    1,
    1,
    RGBAFormat,
    UnsignedByteType
  );
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function getFallbackTerrainLayerTexture(): Texture {
  if (fallbackTerrainLayerTexture === null) {
    fallbackTerrainLayerTexture = createFallbackTerrainLayerTexture();
  }

  return fallbackTerrainLayerTexture;
}

export function getTerrainLayerTexture(
  material: MaterialDef | null,
  textureLookup: (material: MaterialDef) => Texture
): Texture {
  return material === null
    ? getFallbackTerrainLayerTexture()
    : textureLookup(material);
}

export function getTerrainLayerPreviewColor(material: MaterialDef | null): number {
  return material === null
    ? new Color("#aea79a").getHex()
    : new Color(material.swatchColorHex).getHex();
}

export function createTerrainLayerBlendMaterial(
  options: TerrainLayerBlendMaterialOptions
): Material {
  if (options.wireframe === true) {
    return new MeshBasicMaterial({
      color: 0xf2ece2,
      wireframe: true
    });
  }

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    map: options.layerTextures[0],
    emissive: options.emissiveHex ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: 1,
    metalness: 0
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.terrainLayerMap0 = { value: options.layerTextures[0] };
    shader.uniforms.terrainLayerMap1 = { value: options.layerTextures[1] };
    shader.uniforms.terrainLayerMap2 = { value: options.layerTextures[2] };
    shader.uniforms.terrainLayerMap3 = { value: options.layerTextures[3] };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 terrainLayerWeights;
varying vec4 vTerrainLayerWeights;
varying vec2 vTerrainUv;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vTerrainUv = uv;
vTerrainLayerWeights = terrainLayerWeights;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec4 vTerrainLayerWeights;
varying vec2 vTerrainUv;
uniform sampler2D terrainLayerMap0;
uniform sampler2D terrainLayerMap1;
uniform sampler2D terrainLayerMap2;
uniform sampler2D terrainLayerMap3;`
      )
      .replace(
        "#include <map_fragment>",
        `vec4 terrainWeights = max(vTerrainLayerWeights, 0.0);
float terrainWeightSum =
  terrainWeights.x +
  terrainWeights.y +
  terrainWeights.z +
  terrainWeights.w;

if (terrainWeightSum <= 0.0) {
  terrainWeights = vec4(1.0, 0.0, 0.0, 0.0);
} else {
  terrainWeights /= terrainWeightSum;
}

vec4 terrainLayerColor =
  texture2D(terrainLayerMap0, vTerrainUv) * terrainWeights.x +
  texture2D(terrainLayerMap1, vTerrainUv) * terrainWeights.y +
  texture2D(terrainLayerMap2, vTerrainUv) * terrainWeights.z +
  texture2D(terrainLayerMap3, vTerrainUv) * terrainWeights.w;
diffuseColor *= terrainLayerColor;`
      );
  };

  material.customProgramCacheKey = () => "terrain-layer-blend-v1";
  material.needsUpdate = true;
  return material;
}

export function createTerrainLayerColorBlendMaterial(
  options: TerrainLayerColorBlendMaterialOptions
): Material {
  if (options.wireframe === true) {
    return new MeshBasicMaterial({
      color: 0xf2ece2,
      wireframe: true
    });
  }

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: options.emissiveHex ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: 1,
    metalness: 0
  });
  const layerColors = options.layerColors.map((color) => new Color(color)) as [
    Color,
    Color,
    Color,
    Color
  ];

  material.onBeforeCompile = (shader) => {
    shader.uniforms.terrainLayerColor0 = { value: layerColors[0] };
    shader.uniforms.terrainLayerColor1 = { value: layerColors[1] };
    shader.uniforms.terrainLayerColor2 = { value: layerColors[2] };
    shader.uniforms.terrainLayerColor3 = { value: layerColors[3] };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 terrainLayerWeights;
varying vec4 vTerrainLayerWeights;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vTerrainLayerWeights = terrainLayerWeights;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec4 vTerrainLayerWeights;
uniform vec3 terrainLayerColor0;
uniform vec3 terrainLayerColor1;
uniform vec3 terrainLayerColor2;
uniform vec3 terrainLayerColor3;`
      )
      .replace(
        "#include <map_fragment>",
        `vec4 terrainWeights = max(vTerrainLayerWeights, 0.0);
float terrainWeightSum =
  terrainWeights.x +
  terrainWeights.y +
  terrainWeights.z +
  terrainWeights.w;

if (terrainWeightSum <= 0.0) {
  terrainWeights = vec4(1.0, 0.0, 0.0, 0.0);
} else {
  terrainWeights /= terrainWeightSum;
}

vec3 terrainLayerColor =
  terrainLayerColor0 * terrainWeights.x +
  terrainLayerColor1 * terrainWeights.y +
  terrainLayerColor2 * terrainWeights.z +
  terrainLayerColor3 * terrainWeights.w;
diffuseColor.rgb *= terrainLayerColor;`
      );
  };

  material.customProgramCacheKey = () => "terrain-layer-color-blend-v1";
  material.needsUpdate = true;
  return material;
}
