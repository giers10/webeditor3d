import {
  BasicDepthPacking,
  Color,
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
  AdvancedRenderingDistanceFogSettings,
  AdvancedRenderingSettings
} from "../document/world-settings";

const MIN_DISTANCE_FOG_RANGE = 0.1;
const MIN_CAMERA_FAR_MARGIN = 0.01;

export interface ResolvedDistanceFogParameters {
  enabled: boolean;
  colorHex: string;
  nearDistance: number;
  farDistance: number;
  strength: number;
  renderDistance: number;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveDistanceFogParameters(
  settings: AdvancedRenderingDistanceFogSettings
): ResolvedDistanceFogParameters {
  const nearDistance = Math.max(0, finiteOr(settings.nearDistance, 0));
  const renderDistance = Math.max(
    nearDistance + MIN_DISTANCE_FOG_RANGE,
    finiteOr(settings.renderDistance, nearDistance + MIN_DISTANCE_FOG_RANGE)
  );
  const farDistance = Math.max(
    nearDistance + MIN_DISTANCE_FOG_RANGE,
    Math.min(finiteOr(settings.farDistance, renderDistance), renderDistance)
  );
  const strength = clampNumber(finiteOr(settings.strength, 0), 0, 1);

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
    renderDistance
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
uniform vec3 fogColor;
uniform float nearDistance;
uniform float farDistance;
uniform float strength;

varying vec2 vUv;

float readDepth(const in vec2 uv) {
#if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture2D(depthBuffer, uv));
#else
  return texture2D(depthBuffer, uv).r;
#endif
}

void main() {
  vec4 baseColor = texture2D(inputBuffer, vUv);
  float depth = readDepth(vUv);

  if (depth >= 0.9999 || strength <= 0.0) {
    gl_FragColor = baseColor;
    return;
  }

  float viewZ = perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
  float distanceFromCamera = max(-viewZ, 0.0);
  float range = max(farDistance - nearDistance, 0.001);
  float linearFog = clamp((distanceFromCamera - nearDistance) / range, 0.0, 1.0);
  float haze = smoothstep(0.0, 1.0, linearFog);
  float fogAmount = clamp(haze * strength, 0.0, 0.98);

  gl_FragColor = vec4(mix(baseColor.rgb, fogColor, fogAmount), baseColor.a);
}
`;

export class DistanceFogPass extends Pass {
  private readonly sourceCamera: PerspectiveCamera;
  private readonly material: ShaderMaterial;
  private readonly parameters: ResolvedDistanceFogParameters;
  private readonly cameraNearFar = new Vector2();
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
        fogColor: new Uniform(this.fogColor),
        nearDistance: new Uniform(parameters.nearDistance),
        farDistance: new Uniform(parameters.farDistance),
        strength: new Uniform(parameters.strength)
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

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null
  ) {
    if (inputBuffer === null) {
      return;
    }

    this.cameraNearFar.set(this.sourceCamera.near, this.sourceCamera.far);
    this.material.uniforms.inputBuffer.value = inputBuffer.texture;
    this.material.uniforms.nearDistance.value = this.parameters.nearDistance;
    this.material.uniforms.farDistance.value = this.parameters.farDistance;
    this.material.uniforms.strength.value = this.parameters.strength;

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}
