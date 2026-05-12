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
import { TERRAIN_SHADER_LAYER_COUNT } from "../document/terrains";

interface TerrainLayerBlendMaterialOptions {
  layerTextures: readonly Texture[];
  emissiveHex?: number;
  emissiveIntensity?: number;
  foliageMaskPreviewColorHex?: number;
  foliageMaskPreviewOpacity?: number;
  wireframe?: boolean;
}

interface TerrainLayerColorBlendMaterialOptions {
  layerColors: readonly number[];
  emissiveHex?: number;
  emissiveIntensity?: number;
  foliageMaskPreviewColorHex?: number;
  foliageMaskPreviewOpacity?: number;
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

function createPaddedTerrainLayerTextures(
  textures: readonly Texture[]
): Texture[] {
  const fallbackTexture = getFallbackTerrainLayerTexture();

  return Array.from(
    { length: TERRAIN_SHADER_LAYER_COUNT },
    (_, index) => textures[index] ?? fallbackTexture
  );
}

function createPaddedTerrainLayerColors(layerColors: readonly number[]): Color[] {
  const fallbackColor = getTerrainLayerPreviewColor(null);

  return Array.from(
    { length: TERRAIN_SHADER_LAYER_COUNT },
    (_, index) => new Color(layerColors[index] ?? fallbackColor)
  );
}

export function createTerrainLayerBlendMaterial(
  options: TerrainLayerBlendMaterialOptions
): Material {
  const layerTextures = createPaddedTerrainLayerTextures(options.layerTextures);

  if (options.wireframe === true) {
    return new MeshBasicMaterial({
      color: 0xf2ece2,
      wireframe: true
    });
  }

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    map: layerTextures[0],
    emissive: options.emissiveHex ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: 1,
    metalness: 0
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.terrainLayerMap0 = { value: layerTextures[0] };
    shader.uniforms.terrainLayerMap1 = { value: layerTextures[1] };
    shader.uniforms.terrainLayerMap2 = { value: layerTextures[2] };
    shader.uniforms.terrainLayerMap3 = { value: layerTextures[3] };
    shader.uniforms.terrainLayerMap4 = { value: layerTextures[4] };
    shader.uniforms.terrainLayerMap5 = { value: layerTextures[5] };
    shader.uniforms.terrainLayerMap6 = { value: layerTextures[6] };
    shader.uniforms.terrainLayerMap7 = { value: layerTextures[7] };
    shader.uniforms.terrainFoliageMaskPreviewColor = {
      value: new Color(options.foliageMaskPreviewColorHex ?? 0x65d36e)
    };
    shader.uniforms.terrainFoliageMaskPreviewOpacity = {
      value: options.foliageMaskPreviewOpacity ?? 0
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 terrainLayerWeights;
attribute vec4 terrainLayerWeights0;
attribute vec4 terrainLayerWeights1;
attribute float terrainFoliageMask;
varying vec4 vTerrainLayerWeights0;
varying vec4 vTerrainLayerWeights1;
varying float vTerrainFoliageMask;
varying vec2 vTerrainUv;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vTerrainUv = uv;
vTerrainLayerWeights0 = terrainLayerWeights0;
vTerrainLayerWeights1 = terrainLayerWeights1;
vTerrainFoliageMask = terrainFoliageMask;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec4 vTerrainLayerWeights0;
varying vec4 vTerrainLayerWeights1;
varying float vTerrainFoliageMask;
varying vec2 vTerrainUv;
uniform sampler2D terrainLayerMap0;
uniform sampler2D terrainLayerMap1;
uniform sampler2D terrainLayerMap2;
uniform sampler2D terrainLayerMap3;
uniform sampler2D terrainLayerMap4;
uniform sampler2D terrainLayerMap5;
uniform sampler2D terrainLayerMap6;
uniform sampler2D terrainLayerMap7;
uniform vec3 terrainFoliageMaskPreviewColor;
uniform float terrainFoliageMaskPreviewOpacity;`
      )
      .replace(
        "#include <map_fragment>",
        `vec4 terrainWeights0 = max(vTerrainLayerWeights0, 0.0);
vec4 terrainWeights1 = max(vTerrainLayerWeights1, 0.0);
float terrainWeightSum =
  terrainWeights0.x +
  terrainWeights0.y +
  terrainWeights0.z +
  terrainWeights0.w +
  terrainWeights1.x +
  terrainWeights1.y +
  terrainWeights1.z +
  terrainWeights1.w;

if (terrainWeightSum <= 0.0) {
  terrainWeights0 = vec4(1.0, 0.0, 0.0, 0.0);
  terrainWeights1 = vec4(0.0);
} else {
  terrainWeights0 /= terrainWeightSum;
  terrainWeights1 /= terrainWeightSum;
}

vec4 terrainLayerColor =
  texture2D(terrainLayerMap0, vTerrainUv) * terrainWeights0.x +
  texture2D(terrainLayerMap1, vTerrainUv) * terrainWeights0.y +
  texture2D(terrainLayerMap2, vTerrainUv) * terrainWeights0.z +
  texture2D(terrainLayerMap3, vTerrainUv) * terrainWeights0.w +
  texture2D(terrainLayerMap4, vTerrainUv) * terrainWeights1.x +
  texture2D(terrainLayerMap5, vTerrainUv) * terrainWeights1.y +
  texture2D(terrainLayerMap6, vTerrainUv) * terrainWeights1.z +
  texture2D(terrainLayerMap7, vTerrainUv) * terrainWeights1.w;
diffuseColor *= terrainLayerColor;
float foliageMaskPreviewBlend = clamp(
  vTerrainFoliageMask * terrainFoliageMaskPreviewOpacity,
  0.0,
  terrainFoliageMaskPreviewOpacity
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  terrainFoliageMaskPreviewColor,
  foliageMaskPreviewBlend
);`
      );
  };

  material.customProgramCacheKey = () => "terrain-layer-blend-v3";
  material.needsUpdate = true;
  return material;
}

export function createTerrainLayerColorBlendMaterial(
  options: TerrainLayerColorBlendMaterialOptions
): Material {
  const layerColors = createPaddedTerrainLayerColors(options.layerColors);

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

  material.onBeforeCompile = (shader) => {
    shader.uniforms.terrainLayerColor0 = { value: layerColors[0] };
    shader.uniforms.terrainLayerColor1 = { value: layerColors[1] };
    shader.uniforms.terrainLayerColor2 = { value: layerColors[2] };
    shader.uniforms.terrainLayerColor3 = { value: layerColors[3] };
    shader.uniforms.terrainLayerColor4 = { value: layerColors[4] };
    shader.uniforms.terrainLayerColor5 = { value: layerColors[5] };
    shader.uniforms.terrainLayerColor6 = { value: layerColors[6] };
    shader.uniforms.terrainLayerColor7 = { value: layerColors[7] };
    shader.uniforms.terrainFoliageMaskPreviewColor = {
      value: new Color(options.foliageMaskPreviewColorHex ?? 0x65d36e)
    };
    shader.uniforms.terrainFoliageMaskPreviewOpacity = {
      value: options.foliageMaskPreviewOpacity ?? 0
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 terrainLayerWeights;
attribute vec4 terrainLayerWeights0;
attribute vec4 terrainLayerWeights1;
attribute float terrainFoliageMask;
varying vec4 vTerrainLayerWeights0;
varying vec4 vTerrainLayerWeights1;
varying float vTerrainFoliageMask;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vTerrainLayerWeights0 = terrainLayerWeights0;
vTerrainLayerWeights1 = terrainLayerWeights1;
vTerrainFoliageMask = terrainFoliageMask;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec4 vTerrainLayerWeights0;
varying vec4 vTerrainLayerWeights1;
varying float vTerrainFoliageMask;
uniform vec3 terrainLayerColor0;
uniform vec3 terrainLayerColor1;
uniform vec3 terrainLayerColor2;
uniform vec3 terrainLayerColor3;
uniform vec3 terrainLayerColor4;
uniform vec3 terrainLayerColor5;
uniform vec3 terrainLayerColor6;
uniform vec3 terrainLayerColor7;
uniform vec3 terrainFoliageMaskPreviewColor;
uniform float terrainFoliageMaskPreviewOpacity;`
      )
      .replace(
        "#include <map_fragment>",
        `vec4 terrainWeights0 = max(vTerrainLayerWeights0, 0.0);
vec4 terrainWeights1 = max(vTerrainLayerWeights1, 0.0);
float terrainWeightSum =
  terrainWeights0.x +
  terrainWeights0.y +
  terrainWeights0.z +
  terrainWeights0.w +
  terrainWeights1.x +
  terrainWeights1.y +
  terrainWeights1.z +
  terrainWeights1.w;

if (terrainWeightSum <= 0.0) {
  terrainWeights0 = vec4(1.0, 0.0, 0.0, 0.0);
  terrainWeights1 = vec4(0.0);
} else {
  terrainWeights0 /= terrainWeightSum;
  terrainWeights1 /= terrainWeightSum;
}

vec3 terrainLayerColor =
  terrainLayerColor0 * terrainWeights0.x +
  terrainLayerColor1 * terrainWeights0.y +
  terrainLayerColor2 * terrainWeights0.z +
  terrainLayerColor3 * terrainWeights0.w +
  terrainLayerColor4 * terrainWeights1.x +
  terrainLayerColor5 * terrainWeights1.y +
  terrainLayerColor6 * terrainWeights1.z +
  terrainLayerColor7 * terrainWeights1.w;
diffuseColor.rgb *= terrainLayerColor;
float foliageMaskPreviewBlend = clamp(
  vTerrainFoliageMask * terrainFoliageMaskPreviewOpacity,
  0.0,
  terrainFoliageMaskPreviewOpacity
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  terrainFoliageMaskPreviewColor,
  foliageMaskPreviewBlend
);`
      );
  };

  material.customProgramCacheKey = () => "terrain-layer-color-blend-v3";
  material.needsUpdate = true;
  return material;
}
