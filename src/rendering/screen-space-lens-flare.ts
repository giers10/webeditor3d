import {
  BasicDepthPacking,
  Color,
  ShaderMaterial,
  Texture,
  Uniform,
  Vector2,
  Vector3,
  type DepthPackingStrategies,
  type PerspectiveCamera,
  type WebGLRenderTarget,
  type WebGLRenderer
} from "three";
import { Pass } from "postprocessing";

import type { Vec3 } from "../core/vector";
import type {
  AdvancedRenderingLensFlareSettings,
  AdvancedRenderingSettings
} from "../document/world-settings";

const MIN_CELESTIAL_LIGHT_INTENSITY = 1e-4;
const MAX_LENS_FLARE_INTENSITY = 4;
const MIN_LENS_FLARE_HALO_SIZE = 0.25;
const MAX_LENS_FLARE_HALO_SIZE = 3;
const MAX_LENS_FLARE_GHOST_INTENSITY = 3;
const MIN_LENS_FLARE_GHOST_COUNT = 1;
const MAX_LENS_FLARE_GHOST_COUNT = 8;
const LIGHT_OFFSCREEN_FADE_START = 0.92;
const LIGHT_OFFSCREEN_FADE_END = 1;

export interface ResolvedLensFlareParameters {
  enabled: boolean;
  intensity: number;
  haloSize: number;
  ghostIntensity: number;
  ghostCount: number;
}

export interface ScreenSpaceLensFlareLightSource {
  direction: Vec3 | null;
  colorHex: string;
  intensity: number;
}

export interface ScreenSpaceLensFlareLightInput {
  direction: Vec3;
  colorHex: string;
  intensity: number;
}

export interface ScreenSpaceLensFlareLightProjection {
  screenPosition: {
    x: number;
    y: number;
  };
  visibility: number;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function formatGlslFloat(value: number): string {
  return value.toFixed(4);
}

function isFiniteVec3(vector: Vec3 | null): vector is Vec3 {
  return (
    vector !== null &&
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

export function createScreenSpaceLensFlareLightSource(): ScreenSpaceLensFlareLightSource {
  return {
    direction: null,
    colorHex: "#ffffff",
    intensity: 0
  };
}

export function syncScreenSpaceLensFlareLightSource(
  target: ScreenSpaceLensFlareLightSource,
  light: ScreenSpaceLensFlareLightInput | null
) {
  if (
    light === null ||
    light.intensity <= MIN_CELESTIAL_LIGHT_INTENSITY ||
    !isFiniteVec3(light.direction)
  ) {
    target.direction = null;
    target.colorHex = "#ffffff";
    target.intensity = 0;
    return;
  }

  target.direction = {
    x: light.direction.x,
    y: light.direction.y,
    z: light.direction.z
  };
  target.colorHex = light.colorHex;
  target.intensity = light.intensity;
}

export function resolveLensFlareParameters(
  settings: AdvancedRenderingLensFlareSettings
): ResolvedLensFlareParameters {
  const intensity = clampNumber(
    finiteOr(settings.intensity, 0),
    0,
    MAX_LENS_FLARE_INTENSITY
  );
  const haloSize = clampNumber(
    finiteOr(settings.haloSize, 1),
    MIN_LENS_FLARE_HALO_SIZE,
    MAX_LENS_FLARE_HALO_SIZE
  );
  const ghostIntensity = clampNumber(
    finiteOr(settings.ghostIntensity, 0),
    0,
    MAX_LENS_FLARE_GHOST_INTENSITY
  );
  const ghostCount = Math.round(
    clampNumber(
      finiteOr(settings.ghostCount, MIN_LENS_FLARE_GHOST_COUNT),
      MIN_LENS_FLARE_GHOST_COUNT,
      MAX_LENS_FLARE_GHOST_COUNT
    )
  );

  return {
    enabled: settings.enabled && intensity > 0 && haloSize > 0,
    intensity,
    haloSize,
    ghostIntensity,
    ghostCount
  };
}

export function shouldApplyLensFlare(settings: AdvancedRenderingSettings) {
  return (
    settings.enabled && resolveLensFlareParameters(settings.lensFlare).enabled
  );
}

export function projectScreenSpaceLensFlareLight(
  camera: PerspectiveCamera,
  lightSource: ScreenSpaceLensFlareLightSource
): ScreenSpaceLensFlareLightProjection | null {
  if (
    lightSource.intensity <= MIN_CELESTIAL_LIGHT_INTENSITY ||
    !isFiniteVec3(lightSource.direction)
  ) {
    return null;
  }

  const direction = new Vector3(
    lightSource.direction.x,
    lightSource.direction.y,
    lightSource.direction.z
  );

  if (direction.lengthSq() <= 1e-8) {
    return null;
  }

  direction.normalize();
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const cameraPosition = new Vector3().setFromMatrixPosition(
    camera.matrixWorld
  );
  const projectionDistance = Math.max(
    camera.near + 1,
    Math.min(camera.far * 0.5, 500)
  );
  const worldPosition = cameraPosition
    .clone()
    .add(direction.multiplyScalar(projectionDistance));
  const viewPosition = worldPosition.clone().applyMatrix4(
    camera.matrixWorldInverse
  );

  if (viewPosition.z >= -camera.near) {
    return null;
  }

  const ndcPosition = worldPosition.clone().project(camera);

  if (!Number.isFinite(ndcPosition.x) || !Number.isFinite(ndcPosition.y)) {
    return null;
  }

  const maxAxisDistance = Math.max(
    Math.abs(ndcPosition.x),
    Math.abs(ndcPosition.y)
  );
  const visibility =
    1 -
    smoothstep(
      LIGHT_OFFSCREEN_FADE_START,
      LIGHT_OFFSCREEN_FADE_END,
      maxAxisDistance
    );

  if (visibility <= 0) {
    return null;
  }

  return {
    screenPosition: {
      x: ndcPosition.x * 0.5 + 0.5,
      y: ndcPosition.y * 0.5 + 0.5
    },
    visibility
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
#include <packing>

#define MAX_LENS_FLARE_GHOSTS 8

uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform vec2 resolution;
uniform vec2 lightPosition;
uniform vec3 lightColor;
uniform float sourceIntensity;
uniform float intensity;
uniform float haloSize;
uniform float ghostIntensity;
uniform int ghostCount;

varying vec2 vUv;

const float BACKGROUND_DEPTH_THRESHOLD = 0.9999999;

float readDepth(const in vec2 uv) {
#if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture2D(depthBuffer, uv));
#else
  return texture2D(depthBuffer, uv).r;
#endif
}

float getSourceOcclusion() {
  vec2 safeResolution = max(resolution, vec2(1.0));
  vec2 pixelSize = 1.0 / safeResolution;
  float sampleRadius = max(haloSize * 0.008, 1.5 * max(pixelSize.x, pixelSize.y));
  float visibility = 0.0;

  visibility += step(BACKGROUND_DEPTH_THRESHOLD, readDepth(clamp(lightPosition, vec2(0.0), vec2(1.0))));
  visibility += step(BACKGROUND_DEPTH_THRESHOLD, readDepth(clamp(lightPosition + vec2(sampleRadius, 0.0), vec2(0.0), vec2(1.0))));
  visibility += step(BACKGROUND_DEPTH_THRESHOLD, readDepth(clamp(lightPosition - vec2(sampleRadius, 0.0), vec2(0.0), vec2(1.0))));
  visibility += step(BACKGROUND_DEPTH_THRESHOLD, readDepth(clamp(lightPosition + vec2(0.0, sampleRadius), vec2(0.0), vec2(1.0))));
  visibility += step(BACKGROUND_DEPTH_THRESHOLD, readDepth(clamp(lightPosition - vec2(0.0, sampleRadius), vec2(0.0), vec2(1.0))));

  return visibility * 0.2;
}

vec3 getGhostTint(float index) {
  vec3 spectral = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + index * 1.7);
  return mix(lightColor, spectral, 0.35);
}

void main() {
  vec4 baseColor = texture2D(inputBuffer, vUv);

  if (sourceIntensity <= 0.0 || intensity <= 0.0 || haloSize <= 0.0) {
    gl_FragColor = baseColor;
    return;
  }

  vec2 safeResolution = max(resolution, vec2(1.0));
  vec2 aspectScale = vec2(safeResolution.x / safeResolution.y, 1.0);
  vec2 center = vec2(0.5);
  float centerDistance = length((lightPosition - center) * aspectScale);
  float viewFocus = 1.0 - smoothstep(0.35, 0.95, centerDistance);
  float visibility = getSourceOcclusion() * sourceIntensity * intensity * viewFocus;

  if (visibility <= 0.001) {
    gl_FragColor = baseColor;
    return;
  }

  vec3 flareColor = vec3(0.0);
  float sourceDistance = length((vUv - lightPosition) * aspectScale);
  float sourceCore =
    1.0 - smoothstep(0.0, haloSize * ${formatGlslFloat(0.032)}, sourceDistance);
  float sourceHalo =
    1.0 - smoothstep(haloSize * ${formatGlslFloat(0.035)}, haloSize * ${formatGlslFloat(0.24)}, sourceDistance);
  float horizontalStreak =
    (1.0 - smoothstep(0.0, haloSize * ${formatGlslFloat(0.012)}, abs(vUv.y - lightPosition.y))) *
    (1.0 - smoothstep(0.08, 0.58, abs(vUv.x - lightPosition.x)));

  flareColor += lightColor * (sourceCore * 1.4 + sourceHalo * 0.42 + horizontalStreak * 0.12);

  vec2 flareAxis = center - lightPosition;

  for (int ghostIndex = 1; ghostIndex <= MAX_LENS_FLARE_GHOSTS; ++ghostIndex) {
    if (ghostIndex > ghostCount) {
      break;
    }

    float ghostProgress = float(ghostIndex) / max(float(ghostCount), 1.0);
    vec2 ghostPosition = center + flareAxis * (0.18 + ghostProgress * 1.55);
    float ghostRadius = haloSize * mix(0.028, 0.082, ghostProgress);
    float ghostDistance = length((vUv - ghostPosition) * aspectScale);
    float ghostMask =
      1.0 - smoothstep(ghostRadius * 0.25, ghostRadius, ghostDistance);
    float ghostFalloff = mix(1.0, 0.45, ghostProgress);

    flareColor +=
      getGhostTint(float(ghostIndex)) *
      ghostMask *
      ghostFalloff *
      ghostIntensity;
  }

  gl_FragColor = vec4(baseColor.rgb + flareColor * visibility, baseColor.a);
}
`;

export class ScreenSpaceLensFlarePass extends Pass {
  private readonly sourceCamera: PerspectiveCamera;
  private readonly lightSource: ScreenSpaceLensFlareLightSource;
  private readonly parameters: ResolvedLensFlareParameters;
  private readonly material: ShaderMaterial;
  private readonly lightPosition = new Vector2(0.5, 0.5);
  private readonly lightColor = new Color("#ffffff");
  private readonly resolution = new Vector2(1, 1);

  constructor(
    camera: PerspectiveCamera,
    lightSource: ScreenSpaceLensFlareLightSource,
    parameters: ResolvedLensFlareParameters
  ) {
    super("ScreenSpaceLensFlarePass");

    this.sourceCamera = camera;
    this.lightSource = lightSource;
    this.parameters = parameters;
    this.needsDepthTexture = true;

    this.material = new ShaderMaterial({
      name: "ScreenSpaceLensFlareMaterial",
      defines: {
        DEPTH_PACKING: BasicDepthPacking.toFixed(0)
      },
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        depthBuffer: new Uniform<Texture | null>(null),
        resolution: new Uniform(this.resolution),
        lightPosition: new Uniform(this.lightPosition),
        lightColor: new Uniform(this.lightColor),
        sourceIntensity: new Uniform(0),
        intensity: new Uniform(parameters.intensity),
        haloSize: new Uniform(parameters.haloSize),
        ghostIntensity: new Uniform(parameters.ghostIntensity),
        ghostCount: new Uniform(parameters.ghostCount)
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

    const projection = projectScreenSpaceLensFlareLight(
      this.sourceCamera,
      this.lightSource
    );
    const sourceIntensity =
      projection === null
        ? 0
        : Math.min(this.lightSource.intensity, 4) * projection.visibility;

    if (projection !== null) {
      this.lightPosition.set(
        projection.screenPosition.x,
        projection.screenPosition.y
      );
    }

    this.lightColor.set(this.lightSource.colorHex);
    this.material.uniforms.inputBuffer.value = inputBuffer.texture;
    this.material.uniforms.sourceIntensity.value = sourceIntensity;
    this.material.uniforms.intensity.value = this.parameters.intensity;
    this.material.uniforms.haloSize.value = this.parameters.haloSize;
    this.material.uniforms.ghostIntensity.value =
      this.parameters.ghostIntensity;
    this.material.uniforms.ghostCount.value = this.parameters.ghostCount;

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override dispose() {
    this.material.dispose();
  }
}
