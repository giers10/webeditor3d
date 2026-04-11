import type { MeshStandardMaterial, Shader } from "three";

import type {
  AdvancedRenderingSettings,
  AdvancedRenderingWhiteboxBevelSettings
} from "../document/world-settings";

const WHITEBOX_BEVEL_MIN_DETERMINANT = 1e-5;
const WHITEBOX_BEVEL_MAX_EDGE_WIDTH = 0.49;

function formatShaderFloat(value: number) {
  return value.toFixed(4);
}

export function shouldApplyWhiteboxBevel(
  settings: Pick<AdvancedRenderingSettings, "enabled" | "whiteboxBevel">
): boolean {
  return (
    settings.enabled &&
    settings.whiteboxBevel.enabled &&
    settings.whiteboxBevel.edgeWidth > 0 &&
    settings.whiteboxBevel.normalStrength > 0
  );
}

export function applyWhiteboxBevelToMaterial(
  material: MeshStandardMaterial,
  settings: AdvancedRenderingWhiteboxBevelSettings
) {
  const edgeWidth = Math.min(
    Math.max(settings.edgeWidth, 0),
    WHITEBOX_BEVEL_MAX_EDGE_WIDTH
  );
  const normalStrength = Math.max(settings.normalStrength, 0);
  const shaderKey = `whitebox-bevel:${formatShaderFloat(edgeWidth)}:${formatShaderFloat(normalStrength)}`;

  material.onBeforeCompile = (shader: Shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 faceUv;
varying vec2 vWhiteboxFaceUv;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vWhiteboxFaceUv = faceUv;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vWhiteboxFaceUv;`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
vec2 whiteboxFaceUv = clamp(vWhiteboxFaceUv, 0.0, 1.0);
float whiteboxBevelLeft = 1.0 - smoothstep(0.0, ${formatShaderFloat(edgeWidth)}, whiteboxFaceUv.x);
float whiteboxBevelRight = 1.0 - smoothstep(0.0, ${formatShaderFloat(edgeWidth)}, 1.0 - whiteboxFaceUv.x);
float whiteboxBevelBottom = 1.0 - smoothstep(0.0, ${formatShaderFloat(edgeWidth)}, whiteboxFaceUv.y);
float whiteboxBevelTop = 1.0 - smoothstep(0.0, ${formatShaderFloat(edgeWidth)}, 1.0 - whiteboxFaceUv.y);
float whiteboxBevelMask = max(max(whiteboxBevelLeft, whiteboxBevelRight), max(whiteboxBevelBottom, whiteboxBevelTop));
vec3 whiteboxFacePosition = -vViewPosition;
vec3 whiteboxDpdx = dFdx(whiteboxFacePosition);
vec3 whiteboxDpdy = dFdy(whiteboxFacePosition);
vec2 whiteboxDuvdx = dFdx(whiteboxFaceUv);
vec2 whiteboxDuvdy = dFdy(whiteboxFaceUv);
float whiteboxDeterminant = whiteboxDuvdx.x * whiteboxDuvdy.y - whiteboxDuvdx.y * whiteboxDuvdy.x;

if (whiteboxBevelMask > 0.0 && abs(whiteboxDeterminant) > ${WHITEBOX_BEVEL_MIN_DETERMINANT.toFixed(5)}) {
  vec3 whiteboxTangent = normalize(
    (whiteboxDpdx * whiteboxDuvdy.y - whiteboxDpdy * whiteboxDuvdx.y) /
      whiteboxDeterminant
  );
  vec3 whiteboxBitangent = normalize(
    (-whiteboxDpdx * whiteboxDuvdy.x + whiteboxDpdy * whiteboxDuvdx.x) /
      whiteboxDeterminant
  );

  whiteboxTangent = normalize(whiteboxTangent - normal * dot(normal, whiteboxTangent));
  whiteboxBitangent = normalize(whiteboxBitangent - normal * dot(normal, whiteboxBitangent));

  vec3 whiteboxBevelDirection =
    whiteboxTangent * (whiteboxBevelRight - whiteboxBevelLeft) +
    whiteboxBitangent * (whiteboxBevelTop - whiteboxBevelBottom);
  vec3 whiteboxBeveledNormal = normalize(
    normal + whiteboxBevelDirection * ${formatShaderFloat(normalStrength)}
  );
  normal = normalize(mix(normal, whiteboxBeveledNormal, whiteboxBevelMask));
}`
      );
  };

  material.customProgramCacheKey = () => shaderKey;
  material.needsUpdate = true;
}
