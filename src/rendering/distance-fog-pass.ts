import {
  BasicDepthPacking,
  Color,
  Matrix4,
  ShaderMaterial,
  Texture,
  Uniform,
  Vector2,
  Vector3,
  type DepthPackingStrategies,
  type PerspectiveCamera,
  type WebGLRenderer,
  type WebGLRenderTarget
} from "three";
import { Pass } from "postprocessing";

import type {
  AdvancedRenderingDistanceFogSettings,
  AdvancedRenderingSettings
} from "../document/world-settings";

const MIN_DISTANCE_FOG_RANGE = 0.1;
const MIN_CAMERA_FAR_MARGIN = 0.01;
const MIN_RENDER_DISTANCE_FADE_MARGIN = 6;
const RENDER_DISTANCE_FADE_MARGIN_RATIO = 0.14;
const MAX_RENDER_DISTANCE_FADE_MARGIN_RATIO = 0.45;

export interface ResolvedDistanceFogParameters {
  enabled: boolean;
  colorHex: string;
  nearDistance: number;
  farDistance: number;
  strength: number;
  renderDistance: number;
  skyBlend: number;
  horizonStrength: number;
  heightFalloff: number;
  fadeMargin: number;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveDistanceFogFadeMargin(
  nearDistance: number,
  renderDistance: number
) {
  const availableRange = Math.max(renderDistance - nearDistance, 0);

  if (availableRange <= MIN_DISTANCE_FOG_RANGE) {
    return 0;
  }

  return clampNumber(
    availableRange * RENDER_DISTANCE_FADE_MARGIN_RATIO,
    Math.min(MIN_RENDER_DISTANCE_FADE_MARGIN, availableRange * 0.5),
    availableRange * MAX_RENDER_DISTANCE_FADE_MARGIN_RATIO
  );
}

export function resolveDistanceFogParameters(
  settings: AdvancedRenderingDistanceFogSettings
): ResolvedDistanceFogParameters {
  const nearDistance = Math.max(0, finiteOr(settings.nearDistance, 0));
  const renderDistance = Math.max(
    nearDistance + MIN_DISTANCE_FOG_RANGE,
    finiteOr(settings.renderDistance, nearDistance + MIN_DISTANCE_FOG_RANGE)
  );
  const fadeMargin = resolveDistanceFogFadeMargin(
    nearDistance,
    renderDistance
  );
  const farDistanceLimit = Math.max(
    nearDistance + MIN_DISTANCE_FOG_RANGE,
    renderDistance - fadeMargin
  );
  const farDistance = Math.max(
    nearDistance + MIN_DISTANCE_FOG_RANGE,
    Math.min(
      finiteOr(settings.farDistance, farDistanceLimit),
      farDistanceLimit
    )
  );
  const strength = clampNumber(finiteOr(settings.strength, 0), 0, 1);
  const skyBlend = clampNumber(finiteOr(settings.skyBlend, 0), 0, 1);
  const horizonStrength = clampNumber(
    finiteOr(settings.horizonStrength, 0),
    0,
    1
  );
  const heightFalloff = Math.max(0, finiteOr(settings.heightFalloff, 0));

  return {
    enabled:
      settings.enabled &&
      strength > 0 &&
      farDistance > nearDistance &&
      renderDistance > nearDistance,
    colorHex: settings.colorHex,
    nearDistance,
    farDistance,
    strength,
    renderDistance,
    skyBlend,
    horizonStrength,
    heightFalloff,
    fadeMargin
  };
}

export function shouldApplyDistanceFog(settings: AdvancedRenderingSettings) {
  return (
    settings.enabled &&
    resolveDistanceFogParameters(settings.distanceFog).enabled
  );
}

export function resolveAdvancedRenderingPerspectiveCameraFar(
  settings: AdvancedRenderingSettings | null,
  defaultFar: number,
  cameraNear: number
) {
  const safeDefaultFar = Math.max(
    finiteOr(defaultFar, 1),
    cameraNear + MIN_CAMERA_FAR_MARGIN
  );

  if (settings === null || !settings.enabled) {
    return safeDefaultFar;
  }

  const fogParameters = resolveDistanceFogParameters(settings.distanceFog);

  if (!fogParameters.enabled) {
    return safeDefaultFar;
  }

  const clampedFar = Math.max(
    fogParameters.renderDistance,
    cameraNear + MIN_CAMERA_FAR_MARGIN
  );

  return Math.min(safeDefaultFar, clampedFar);
}

export function applyAdvancedRenderingPerspectiveCameraFar(
  camera: PerspectiveCamera,
  settings: AdvancedRenderingSettings | null,
  defaultFar: number
) {
  const nextFar = resolveAdvancedRenderingPerspectiveCameraFar(
    settings,
    defaultFar,
    camera.near
  );

  if (Math.abs(camera.far - nextFar) <= 1e-6) {
    return false;
  }

  camera.far = nextFar;
  camera.updateProjectionMatrix();
  return true;
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const fragmentShader = `
#include <packing>

uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform vec2 cameraNearFar;
uniform vec2 texelSize;
uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraProjectionMatrixInverse;
uniform mat4 cameraWorldMatrix;
uniform vec3 cameraWorldPosition;
uniform vec3 fogColor;
uniform float nearDistance;
uniform float farDistance;
uniform float renderDistance;
uniform float strength;
uniform float skyBlend;
uniform float horizonStrength;
uniform float heightFalloff;

varying vec2 vUv;

const float BACKGROUND_DEPTH_THRESHOLD = 0.9999999;

float readDepth(const in vec2 uv) {
#if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture2D(depthBuffer, uv));
#else
  return texture2D(depthBuffer, uv).r;
#endif
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

float readViewDistance(const in vec2 uv, const in float fallbackDistance) {
  float sampleDepth = readDepth(clamp(uv, vec2(0.0), vec2(1.0)));

  if (sampleDepth >= BACKGROUND_DEPTH_THRESHOLD) {
    return fallbackDistance;
  }

  return max(-getViewZ(sampleDepth), 0.0);
}

float getDepthEdgeMask(float centerDistance) {
  vec2 safeTexel = max(texelSize, vec2(1.0 / 4096.0));
  float leftDistance = readViewDistance(vUv - vec2(safeTexel.x, 0.0), centerDistance);
  float rightDistance = readViewDistance(vUv + vec2(safeTexel.x, 0.0), centerDistance);
  float downDistance = readViewDistance(vUv - vec2(0.0, safeTexel.y), centerDistance);
  float upDistance = readViewDistance(vUv + vec2(0.0, safeTexel.y), centerDistance);
  float depthDelta = max(
    max(abs(leftDistance - centerDistance), abs(rightDistance - centerDistance)),
    max(abs(downDistance - centerDistance), abs(upDistance - centerDistance))
  );
  float normalizedDelta = depthDelta / max(centerDistance, 1.0);
  return smoothstep(0.08, 0.5, normalizedDelta);
}

vec3 sampleSkyColor(vec3 baseColor) {
  vec2 upperUv = vec2(vUv.x, 0.96);
  vec2 horizonUv = vec2(vUv.x, 0.58);
  float upperSkyMask = smoothstep(BACKGROUND_DEPTH_THRESHOLD, 1.0, readDepth(upperUv));
  float horizonSkyMask = smoothstep(BACKGROUND_DEPTH_THRESHOLD, 1.0, readDepth(horizonUv));
  vec3 upperSky = texture2D(inputBuffer, upperUv).rgb;
  vec3 horizonSky = texture2D(inputBuffer, horizonUv).rgb;
  vec3 sampledSky = mix(upperSky, horizonSky, 0.58);
  float skyMask = max(upperSkyMask, horizonSkyMask);
  return mix(fogColor, sampledSky, skyBlend * skyMask);
}

void main() {
  vec4 baseColor = texture2D(inputBuffer, vUv);
  float depth = readDepth(vUv);

  if (strength <= 0.0) {
    gl_FragColor = baseColor;
    return;
  }

  bool isBackground = depth >= BACKGROUND_DEPTH_THRESHOLD;
  float positionDepth = isBackground ? BACKGROUND_DEPTH_THRESHOLD : depth;
  float viewZ = getViewZ(positionDepth);
  vec3 viewPosition = getViewPosition(vUv, positionDepth, viewZ);
  vec3 worldPosition = (cameraWorldMatrix * vec4(viewPosition, 1.0)).xyz;
  vec3 worldRay = normalize(worldPosition - cameraWorldPosition);
  float distanceFromCamera = isBackground
    ? renderDistance
    : max(-viewZ, 0.0);
  float range = max(farDistance - nearDistance, 0.001);
  float distanceT = max((distanceFromCamera - nearDistance) / range, 0.0);
  float exponentialFog = 1.0 - exp(-distanceT * distanceT * 1.65);
  float cutoffFog = smoothstep(farDistance, max(renderDistance, farDistance + 0.001), distanceFromCamera);
  float horizon = pow(clamp(1.0 - abs(worldRay.y), 0.0, 1.0), 1.35);
  float lowAltitude = exp(-max(worldPosition.y, 0.0) * heightFalloff);
  float heightTerm = mix(1.0, 0.66 + lowAltitude * 0.34, clamp(heightFalloff * 32.0, 0.0, 1.0));
  float haze = max(exponentialFog * (1.0 + horizon * horizonStrength * 0.72) * heightTerm, cutoffFog * (0.78 + horizon * 0.16));
  float fogAmount = clamp(haze * strength, 0.0, 0.96);
  vec3 atmosphereColor = sampleSkyColor(baseColor.rgb);

  if (isBackground) {
    float skyHaze = clamp(horizon * horizonStrength * strength * skyBlend * 0.22, 0.0, 0.32);
    gl_FragColor = vec4(mix(baseColor.rgb, atmosphereColor, skyHaze), baseColor.a);
    return;
  }

  float edgeMask = getDepthEdgeMask(distanceFromCamera);
  fogAmount *= 1.0 - edgeMask * 0.18;

  gl_FragColor = vec4(mix(baseColor.rgb, atmosphereColor, fogAmount), baseColor.a);
}
`;

export class DistanceFogPass extends Pass {
  private readonly sourceCamera: PerspectiveCamera;
  private readonly material: ShaderMaterial;
  private readonly parameters: ResolvedDistanceFogParameters;
  private readonly cameraNearFar = new Vector2();
  private readonly texelSize = new Vector2(1, 1);
  private readonly cameraProjectionMatrix = new Matrix4();
  private readonly cameraProjectionMatrixInverse = new Matrix4();
  private readonly cameraWorldMatrix = new Matrix4();
  private readonly cameraWorldPosition = new Vector3();
  private readonly fogColor = new Color();

  constructor(
    camera: PerspectiveCamera,
    parameters: ResolvedDistanceFogParameters
  ) {
    super("DistanceFogPass");

    this.sourceCamera = camera;
    this.parameters = parameters;
    this.needsDepthTexture = true;
    this.fogColor.set(parameters.colorHex);

    this.material = new ShaderMaterial({
      name: "DistanceFogMaterial",
      defines: {
        DEPTH_PACKING: BasicDepthPacking.toFixed(0)
      },
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        depthBuffer: new Uniform<Texture | null>(null),
        cameraNearFar: new Uniform(this.cameraNearFar),
        texelSize: new Uniform(this.texelSize),
        cameraProjectionMatrix: new Uniform(this.cameraProjectionMatrix),
        cameraProjectionMatrixInverse: new Uniform(
          this.cameraProjectionMatrixInverse
        ),
        cameraWorldMatrix: new Uniform(this.cameraWorldMatrix),
        cameraWorldPosition: new Uniform(this.cameraWorldPosition),
        fogColor: new Uniform(this.fogColor),
        nearDistance: new Uniform(parameters.nearDistance),
        farDistance: new Uniform(parameters.farDistance),
        renderDistance: new Uniform(parameters.renderDistance),
        strength: new Uniform(parameters.strength),
        skyBlend: new Uniform(parameters.skyBlend),
        horizonStrength: new Uniform(parameters.horizonStrength),
        heightFalloff: new Uniform(parameters.heightFalloff)
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
    this.texelSize.set(1 / Math.max(width, 1), 1 / Math.max(height, 1));
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null
  ) {
    if (inputBuffer === null) {
      return;
    }

    this.sourceCamera.updateMatrixWorld();
    this.sourceCamera.updateProjectionMatrix();
    this.cameraNearFar.set(this.sourceCamera.near, this.sourceCamera.far);
    this.cameraProjectionMatrix.copy(this.sourceCamera.projectionMatrix);
    this.cameraProjectionMatrixInverse.copy(
      this.sourceCamera.projectionMatrixInverse
    );
    this.cameraWorldMatrix.copy(this.sourceCamera.matrixWorld);
    this.cameraWorldPosition.setFromMatrixPosition(
      this.sourceCamera.matrixWorld
    );
    this.material.uniforms.inputBuffer.value = inputBuffer.texture;
    this.material.uniforms.nearDistance.value = this.parameters.nearDistance;
    this.material.uniforms.farDistance.value = this.parameters.farDistance;
    this.material.uniforms.renderDistance.value =
      this.parameters.renderDistance;
    this.material.uniforms.strength.value = this.parameters.strength;
    this.material.uniforms.skyBlend.value = this.parameters.skyBlend;
    this.material.uniforms.horizonStrength.value =
      this.parameters.horizonStrength;
    this.material.uniforms.heightFalloff.value =
      this.parameters.heightFalloff;

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}
