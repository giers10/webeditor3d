import {
  BasicDepthPacking,
  Matrix4,
  ShaderMaterial,
  Texture,
  Uniform,
  Vector2,
  type DepthPackingStrategies,
  type PerspectiveCamera,
  type WebGLRenderer,
  type WebGLRenderTarget
} from "three";
import { Pass } from "postprocessing";

import type {
  AdvancedRenderingDynamicGlobalIlluminationQuality,
  AdvancedRenderingDynamicGlobalIlluminationSettings
} from "../document/world-settings";

const MIN_DYNAMIC_GI_INTENSITY = 0;
const MAX_DYNAMIC_GI_INTENSITY = 4;
const MIN_DYNAMIC_GI_RADIUS = 0.25;
const MAX_DYNAMIC_GI_RADIUS = 8;
const DYNAMIC_GI_MAX_LUMINANCE = 7;

export interface ResolvedDynamicGlobalIlluminationParameters {
  enabled: boolean;
  intensity: number;
  radius: number;
  quality: AdvancedRenderingDynamicGlobalIlluminationQuality;
  sliceCount: number;
  stepCount: number;
  maxLuminance: number;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveDynamicGlobalIlluminationParameters(
  settings: AdvancedRenderingDynamicGlobalIlluminationSettings
): ResolvedDynamicGlobalIlluminationParameters {
  const quality = settings.quality;
  const intensity = clampNumber(
    settings.intensity,
    MIN_DYNAMIC_GI_INTENSITY,
    MAX_DYNAMIC_GI_INTENSITY
  );
  const radius = clampNumber(
    settings.radius,
    MIN_DYNAMIC_GI_RADIUS,
    MAX_DYNAMIC_GI_RADIUS
  );
  const enabled = settings.enabled && intensity > 0 && radius > 0;

  return {
    enabled,
    intensity,
    radius,
    quality,
    sliceCount: quality === "medium" ? 2 : 1,
    stepCount: quality === "medium" ? 8 : 6,
    maxLuminance: DYNAMIC_GI_MAX_LUMINANCE
  };
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const fragmentShader = `
#include <common>
#include <packing>

#define MAX_SLICES 2
#define MAX_STEPS 8

uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform sampler2D normalBuffer;
uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraProjectionMatrixInverse;
uniform vec2 cameraNearFar;
uniform vec2 resolution;
uniform float intensity;
uniform float radius;
uniform int sliceCount;
uniform int stepCount;
uniform float maxLuminance;

varying vec2 vUv;

float saturateFloat(float value) {
  return clamp(value, 0.0, 1.0);
}

float readDepth(const in vec2 uv) {
#if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture2D(depthBuffer, uv));
#else
  return texture2D(depthBuffer, uv).r;
#endif
}

float readLuminance(const in vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 readViewNormal(const in vec2 uv) {
  return normalize(unpackRGBToNormal(texture2D(normalBuffer, uv).rgb));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float getViewZ(const in float depth) {
  return perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
}

vec3 getViewPosition(
  const in vec2 screenPosition,
  const in float depth,
  const in float viewZ
) {
  vec4 clipPosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
  float clipW =
    cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];
  clipPosition *= clipW;
  return (cameraProjectionMatrixInverse * clipPosition).xyz;
}

vec3 clampLuminance(vec3 color, float limit) {
  float luminance = readLuminance(color);
  if (luminance > limit) {
    color *= limit / max(luminance, 0.0001);
  }
  return color;
}

void main() {
  vec4 baseColor = texture2D(inputBuffer, vUv);
  float depth = readDepth(vUv);

  if (depth >= 0.9999 || intensity <= 0.0 || radius <= 0.0) {
    gl_FragColor = baseColor;
    return;
  }

  float viewZ = getViewZ(depth);
  vec3 viewPosition = getViewPosition(vUv, depth, viewZ);
  vec3 viewNormal = readViewNormal(vUv);

  vec2 safeResolution = max(resolution, vec2(1.0));
  float shortestDimension = min(safeResolution.x, safeResolution.y);
  float noise = hash12(gl_FragCoord.xy);
  float projectedRadius = radius * cameraProjectionMatrix[1][1] * 0.5;
  projectedRadius /= max(-viewPosition.z, 0.05);
  projectedRadius = clamp(projectedRadius, 2.0 / shortestDimension, 0.35);

  vec3 accumulatedLight = vec3(0.0);
  float configuredSampleCount = max(float(sliceCount * stepCount * 2), 1.0);

  for (int sliceIndex = 0; sliceIndex < MAX_SLICES; ++sliceIndex) {
    if (sliceIndex >= sliceCount) {
      break;
    }

    float sliceDenominator = max(float(sliceCount), 1.0);
    float angle = (float(sliceIndex) + noise) * PI / sliceDenominator;
    vec2 sliceDirection = vec2(cos(angle), sin(angle));
    vec2 uvDirection = normalize(
      vec2(sliceDirection.x * safeResolution.y / safeResolution.x, sliceDirection.y)
    );

    for (int sideIndex = 0; sideIndex < 2; ++sideIndex) {
      float side = sideIndex == 0 ? 1.0 : -1.0;
      float sideJitter = fract(noise + float(sideIndex) * 0.37);

      for (int stepIndex = 0; stepIndex < MAX_STEPS; ++stepIndex) {
        if (stepIndex >= stepCount) {
          break;
        }

        float stepT = (float(stepIndex) + 0.35 + sideJitter * 0.65);
        stepT /= max(float(stepCount), 1.0);
        float offsetT = pow(stepT, 1.65);
        vec2 sampleUv = vUv + uvDirection * side * projectedRadius * offsetT;

        if (
          sampleUv.x <= 0.0 ||
          sampleUv.x >= 1.0 ||
          sampleUv.y <= 0.0 ||
          sampleUv.y >= 1.0
        ) {
          continue;
        }

        float sampleDepth = readDepth(sampleUv);
        if (sampleDepth >= 0.9999) {
          continue;
        }

        float sampleViewZ = getViewZ(sampleDepth);
        vec3 samplePosition = getViewPosition(sampleUv, sampleDepth, sampleViewZ);
        vec3 offsetVector = samplePosition - viewPosition;
        float distanceToSample = length(offsetVector);

        if (distanceToSample <= 0.015 || distanceToSample > radius) {
          continue;
        }

        vec3 lightDirection = offsetVector / distanceToSample;
        vec3 sampleNormal = readViewNormal(sampleUv);
        vec3 sampleColor = texture2D(inputBuffer, sampleUv).rgb;
        float sampleLuminance = readLuminance(sampleColor);

        float receiveTerm = saturateFloat(dot(viewNormal, lightDirection));
        float emitTerm = max(saturateFloat(dot(sampleNormal, -lightDirection)), 0.12);
        float rangeTerm = pow(saturateFloat(1.0 - distanceToSample / radius), 2.0);
        float lumaTerm = smoothstep(0.015, 0.12, sampleLuminance);
        float thicknessTerm = smoothstep(0.015, 0.08, distanceToSample);
        float contribution = receiveTerm * emitTerm * rangeTerm * lumaTerm * thicknessTerm;

        accumulatedLight += sampleColor * contribution;
      }
    }
  }

  vec3 indirectLight = accumulatedLight * (2.5 / configuredSampleCount) * intensity;
  indirectLight = clampLuminance(indirectLight, maxLuminance);

  gl_FragColor = vec4(baseColor.rgb + indirectLight, baseColor.a);
}
`;

export class ScreenSpaceGlobalIlluminationPass extends Pass {
  private readonly sourceCamera: PerspectiveCamera;
  private readonly material: ShaderMaterial;
  private readonly parameters: ResolvedDynamicGlobalIlluminationParameters;
  private readonly resolution = new Vector2(1, 1);
  private readonly cameraNearFar = new Vector2();
  private readonly cameraProjectionMatrix = new Matrix4();
  private readonly cameraProjectionMatrixInverse = new Matrix4();

  constructor(
    camera: PerspectiveCamera,
    normalBuffer: Texture,
    parameters: ResolvedDynamicGlobalIlluminationParameters
  ) {
    super("ScreenSpaceGlobalIlluminationPass");

    this.sourceCamera = camera;
    this.parameters = parameters;
    this.needsDepthTexture = true;

    this.material = new ShaderMaterial({
      name: "ScreenSpaceGlobalIlluminationMaterial",
      defines: {
        DEPTH_PACKING: BasicDepthPacking.toFixed(0)
      },
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        depthBuffer: new Uniform<Texture | null>(null),
        normalBuffer: new Uniform(normalBuffer),
        cameraProjectionMatrix: new Uniform(this.cameraProjectionMatrix),
        cameraProjectionMatrixInverse: new Uniform(
          this.cameraProjectionMatrixInverse
        ),
        cameraNearFar: new Uniform(this.cameraNearFar),
        resolution: new Uniform(this.resolution),
        intensity: new Uniform(parameters.intensity),
        radius: new Uniform(parameters.radius),
        sliceCount: new Uniform(parameters.sliceCount),
        stepCount: new Uniform(parameters.stepCount),
        maxLuminance: new Uniform(parameters.maxLuminance)
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });
    this.fullscreenMaterial = this.material;
  }

  override setDepthTexture(
    depthTexture: Texture | null,
    depthPacking: DepthPackingStrategies = BasicDepthPacking
  ) {
    this.material.uniforms.depthBuffer.value = depthTexture;
    this.material.defines.DEPTH_PACKING = depthPacking.toFixed(0);
    this.material.needsUpdate = true;
  }

  override setSize(width: number, height: number) {
    this.resolution.set(Math.max(width, 1), Math.max(height, 1));
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null
  ) {
    if (inputBuffer === null) {
      return;
    }

    this.sourceCamera.updateProjectionMatrix();
    this.cameraNearFar.set(this.sourceCamera.near, this.sourceCamera.far);
    this.cameraProjectionMatrix.copy(this.sourceCamera.projectionMatrix);
    this.cameraProjectionMatrixInverse.copy(
      this.sourceCamera.projectionMatrixInverse
    );
    this.material.uniforms.inputBuffer.value = inputBuffer.texture;
    this.material.uniforms.intensity.value = this.parameters.intensity;
    this.material.uniforms.radius.value = this.parameters.radius;
    this.material.uniforms.sliceCount.value = this.parameters.sliceCount;
    this.material.uniforms.stepCount.value = this.parameters.stepCount;
    this.material.uniforms.maxLuminance.value = this.parameters.maxLuminance;

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}
