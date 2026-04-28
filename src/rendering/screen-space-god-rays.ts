import {
  BasicDepthPacking,
  Color,
  LinearFilter,
  MeshBasicMaterial,
  RGBAFormat,
  ShaderMaterial,
  Texture,
  UnsignedByteType,
  Uniform,
  Vector4,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type DepthPackingStrategies,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { Pass } from "postprocessing";

import type { Vec3 } from "../core/vector";
import type {
  AdvancedRenderingGodRaysSettings,
  AdvancedRenderingSettings,
  WorldSunLightSettings
} from "../document/world-settings";

const MIN_CELESTIAL_LIGHT_INTENSITY = 1e-4;
const MAX_GOD_RAYS_INTENSITY = 3;
const MAX_GOD_RAYS_EXPOSURE = 2;
const MAX_GOD_RAYS_DENSITY = 1.5;
const MIN_GOD_RAYS_SAMPLES = 8;
const MAX_GOD_RAYS_SAMPLES = 64;
const LIGHT_OFFSCREEN_FADE_START = 0.92;
const LIGHT_OFFSCREEN_FADE_END = 1;
const MASK_RESOLUTION_SCALE = 0.5;

export interface ResolvedGodRaysParameters {
  enabled: boolean;
  intensity: number;
  decay: number;
  exposure: number;
  density: number;
  samples: number;
}

export interface ScreenSpaceGodRaysLightSource {
  direction: Vec3 | null;
  colorHex: string;
  intensity: number;
}

export interface ScreenSpaceGodRaysLightProjection {
  screenPosition: {
    x: number;
    y: number;
  };
  visibility: number;
}

export interface ResolvedGodRaysAtmosphereParameters {
  nearDistance: number;
  farDistance: number;
  strength: number;
  horizonStrength: number;
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

function isFiniteVec3(vector: Vec3 | null): vector is Vec3 {
  return (
    vector !== null &&
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

export function createScreenSpaceGodRaysLightSource(): ScreenSpaceGodRaysLightSource {
  return {
    direction: null,
    colorHex: "#ffffff",
    intensity: 0
  };
}

export function syncScreenSpaceGodRaysLightSource(
  target: ScreenSpaceGodRaysLightSource,
  light: WorldSunLightSettings | null
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

export function resolveGodRaysParameters(
  settings: AdvancedRenderingGodRaysSettings
): ResolvedGodRaysParameters {
  const intensity = clampNumber(
    finiteOr(settings.intensity, 0),
    0,
    MAX_GOD_RAYS_INTENSITY
  );
  const decay = clampNumber(finiteOr(settings.decay, 0), 0, 1);
  const exposure = clampNumber(
    finiteOr(settings.exposure, 0),
    0,
    MAX_GOD_RAYS_EXPOSURE
  );
  const density = clampNumber(
    finiteOr(settings.density, 0),
    0,
    MAX_GOD_RAYS_DENSITY
  );
  const samples = Math.round(
    clampNumber(
      finiteOr(settings.samples, MIN_GOD_RAYS_SAMPLES),
      MIN_GOD_RAYS_SAMPLES,
      MAX_GOD_RAYS_SAMPLES
    )
  );

  return {
    enabled:
      settings.enabled &&
      intensity > 0 &&
      exposure > 0 &&
      density > 0 &&
      samples > 0,
    intensity,
    decay,
    exposure,
    density,
    samples
  };
}

export function shouldApplyGodRays(settings: AdvancedRenderingSettings) {
  return settings.enabled && resolveGodRaysParameters(settings.godRays).enabled;
}

export function projectScreenSpaceGodRaysLight(
  camera: PerspectiveCamera,
  lightSource: ScreenSpaceGodRaysLightSource
): ScreenSpaceGodRaysLightProjection | null {
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

  if (
    !Number.isFinite(ndcPosition.x) ||
    !Number.isFinite(ndcPosition.y)
  ) {
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

const sourceMaskFragmentShader = `
uniform vec2 resolution;
uniform vec2 lightPosition;
uniform float sourceIntensity;

varying vec2 vUv;

void main() {
  vec2 safeResolution = max(resolution, vec2(1.0));
  vec2 aspectScale = vec2(safeResolution.x / safeResolution.y, 1.0);
  float sourceDistance = length((vUv - lightPosition) * aspectScale);
  float core = 1.0 - smoothstep(0.006, 0.035, sourceDistance);
  float halo = 1.0 - smoothstep(0.025, 0.18, sourceDistance);
  float sourceMask = clamp(core * 1.15 + halo * 0.55, 0.0, 1.0);

  gl_FragColor = vec4(vec3(sourceMask * sourceIntensity), 1.0);
}
`;

const fragmentShader = `
#include <packing>

#define MAX_GOD_RAYS_SAMPLES 64

uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform sampler2D shaftMaskBuffer;
uniform vec2 cameraNearFar;
uniform vec2 resolution;
uniform vec2 lightPosition;
uniform vec3 lightColor;
uniform vec4 atmosphere;
uniform float sourceIntensity;
uniform float intensity;
uniform float decay;
uniform float exposure;
uniform float density;
uniform int sampleCount;

varying vec2 vUv;

float readDepth(const in vec2 uv) {
#if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture2D(depthBuffer, uv));
#else
  return texture2D(depthBuffer, uv).r;
#endif
}

float readLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float getViewZ(const in float depth) {
  return perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
}

float getAtmosphereMask(const in float depth) {
  if (atmosphere.z <= 0.0) {
    return 1.0;
  }

  if (depth >= 0.9999) {
    return 1.0;
  }

  float distanceFromCamera = max(-getViewZ(depth), 0.0);
  float distanceMask = smoothstep(atmosphere.x, max(atmosphere.y, atmosphere.x + 0.001), distanceFromCamera);
  return mix(0.34, 1.0, clamp(distanceMask * atmosphere.z + atmosphere.w * 0.28, 0.0, 1.0));
}

void main() {
  vec4 baseColor = texture2D(inputBuffer, vUv);

  if (
    sourceIntensity <= 0.0 ||
    intensity <= 0.0 ||
    exposure <= 0.0 ||
    density <= 0.0 ||
    sampleCount <= 0
  ) {
    gl_FragColor = baseColor;
    return;
  }

  vec2 delta = (lightPosition - vUv) * density / max(float(sampleCount), 1.0);
  vec2 sampleUv = vUv;
  float accumulatedMask = 0.0;
  float illuminationDecay = 1.0;

  for (int sampleIndex = 0; sampleIndex < MAX_GOD_RAYS_SAMPLES; ++sampleIndex) {
    if (sampleIndex >= sampleCount) {
      break;
    }

    sampleUv += delta;

    if (
      sampleUv.x < 0.0 ||
      sampleUv.x > 1.0 ||
      sampleUv.y < 0.0 ||
      sampleUv.y > 1.0
    ) {
      illuminationDecay *= decay;
      continue;
    }

    float shaftMask = texture2D(shaftMaskBuffer, sampleUv).r;

    if (shaftMask <= 0.001) {
      illuminationDecay *= decay;
      continue;
    }

    accumulatedMask += shaftMask * illuminationDecay;
    illuminationDecay *= decay;
  }

  vec3 shaftColor =
    lightColor *
    accumulatedMask *
    exposure *
    intensity *
    max(float(sampleCount), 1.0);
  float receiverAtmosphere = getAtmosphereMask(readDepth(vUv));
  float baseLuminance = readLuminance(baseColor.rgb);
  float highlightProtection = 1.0 - smoothstep(0.9, 2.2, baseLuminance) * 0.22;
  shaftColor *= receiverAtmosphere * highlightProtection;

  gl_FragColor = vec4(baseColor.rgb + shaftColor, baseColor.a);
}
`;

export class ScreenSpaceGodRaysPass extends Pass {
  private readonly sourceCamera: PerspectiveCamera;
  private readonly lightSource: ScreenSpaceGodRaysLightSource;
  private readonly parameters: ResolvedGodRaysParameters;
  private readonly atmosphereParameters: ResolvedGodRaysAtmosphereParameters | null;
  private readonly occluderScene: Scene;
  private readonly occluderLayerMask: number;
  private readonly shaftMaskRenderTarget: WebGLRenderTarget;
  private readonly sourceMaskMaterial: ShaderMaterial;
  private readonly occluderMaterial = new MeshBasicMaterial({
    color: 0x000000,
    depthWrite: true,
    depthTest: true
  });
  private readonly material: ShaderMaterial;
  private readonly lightPosition = new Vector2(0.5, 0.5);
  private readonly lightColor = new Color("#ffffff");
  private readonly cameraNearFar = new Vector2();
  private readonly resolution = new Vector2(1, 1);
  private readonly maskResolution = new Vector2(1, 1);
  private readonly atmosphere = new Vector4(0, 1, 0, 0);
  private readonly previousClearColor = new Color();

  constructor(
    camera: PerspectiveCamera,
    lightSource: ScreenSpaceGodRaysLightSource,
    parameters: ResolvedGodRaysParameters,
    atmosphereParameters: ResolvedGodRaysAtmosphereParameters | null,
    occluderScene: Scene,
    occluderLayerMask: number
  ) {
    super("ScreenSpaceGodRaysPass");

    this.sourceCamera = camera;
    this.lightSource = lightSource;
    this.parameters = parameters;
    this.atmosphereParameters = atmosphereParameters;
    this.occluderScene = occluderScene;
    this.occluderLayerMask = occluderLayerMask;
    this.needsDepthTexture = true;

    this.shaftMaskRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
      format: RGBAFormat,
      type: UnsignedByteType,
      minFilter: LinearFilter,
      magFilter: LinearFilter
    });
    this.shaftMaskRenderTarget.texture.name = "ScreenSpaceGodRays.Mask";
    this.sourceMaskMaterial = new ShaderMaterial({
      name: "ScreenSpaceGodRaysSourceMaskMaterial",
      uniforms: {
        resolution: new Uniform(this.maskResolution),
        lightPosition: new Uniform(this.lightPosition),
        sourceIntensity: new Uniform(0)
      },
      vertexShader,
      fragmentShader: sourceMaskFragmentShader,
      depthWrite: false,
      depthTest: false
    });
    this.material = new ShaderMaterial({
      name: "ScreenSpaceGodRaysMaterial",
      defines: {
        DEPTH_PACKING: BasicDepthPacking.toFixed(0)
      },
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        depthBuffer: new Uniform<Texture | null>(null),
        shaftMaskBuffer: new Uniform(this.shaftMaskRenderTarget.texture),
        cameraNearFar: new Uniform(this.cameraNearFar),
        resolution: new Uniform(this.resolution),
        lightPosition: new Uniform(this.lightPosition),
        lightColor: new Uniform(this.lightColor),
        atmosphere: new Uniform(this.atmosphere),
        sourceIntensity: new Uniform(0),
        intensity: new Uniform(parameters.intensity),
        decay: new Uniform(parameters.decay),
        exposure: new Uniform(parameters.exposure),
        density: new Uniform(parameters.density),
        sampleCount: new Uniform(parameters.samples)
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
    this.maskResolution.set(
      Math.max(Math.round(width * MASK_RESOLUTION_SCALE), 1),
      Math.max(Math.round(height * MASK_RESOLUTION_SCALE), 1)
    );
    this.shaftMaskRenderTarget.setSize(
      this.maskResolution.x,
      this.maskResolution.y
    );
  }

  private renderShaftMask(renderer: WebGLRenderer, sourceIntensity: number) {
    const previousRenderTarget = renderer.getRenderTarget();
    const previousClearAlpha = renderer.getClearAlpha();
    const previousAutoClear = renderer.autoClear;
    const previousSceneOverrideMaterial = this.occluderScene.overrideMaterial;
    const previousCameraLayerMask = this.sourceCamera.layers.mask;
    renderer.getClearColor(this.previousClearColor);

    renderer.setRenderTarget(this.shaftMaskRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);

    this.sourceMaskMaterial.uniforms.sourceIntensity.value = sourceIntensity;
    this.fullscreenMaterial = this.sourceMaskMaterial;
    renderer.render(this.scene, this.camera);

    this.occluderScene.overrideMaterial = this.occluderMaterial;
    this.sourceCamera.layers.mask = this.occluderLayerMask;
    renderer.autoClear = false;
    renderer.render(this.occluderScene, this.sourceCamera);

    renderer.autoClear = previousAutoClear;
    this.sourceCamera.layers.mask = previousCameraLayerMask;
    this.occluderScene.overrideMaterial = previousSceneOverrideMaterial;
    renderer.setClearColor(this.previousClearColor, previousClearAlpha);
    renderer.setRenderTarget(previousRenderTarget);
    this.fullscreenMaterial = this.material;
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null
  ) {
    if (inputBuffer === null) {
      return;
    }

    const projection = projectScreenSpaceGodRaysLight(
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

    if (sourceIntensity > 0) {
      this.renderShaftMask(renderer, sourceIntensity);
    }

    this.cameraNearFar.set(this.sourceCamera.near, this.sourceCamera.far);
    if (this.atmosphereParameters === null) {
      this.atmosphere.set(0, 1, 0, 0);
    } else {
      this.atmosphere.set(
        this.atmosphereParameters.nearDistance,
        this.atmosphereParameters.farDistance,
        this.atmosphereParameters.strength,
        this.atmosphereParameters.horizonStrength
      );
    }
    this.lightColor.set(this.lightSource.colorHex);
    this.material.uniforms.inputBuffer.value = inputBuffer.texture;
    this.material.uniforms.shaftMaskBuffer.value =
      this.shaftMaskRenderTarget.texture;
    this.material.uniforms.sourceIntensity.value = sourceIntensity;
    this.material.uniforms.intensity.value = this.parameters.intensity;
    this.material.uniforms.decay.value = this.parameters.decay;
    this.material.uniforms.exposure.value = this.parameters.exposure;
    this.material.uniforms.density.value = this.parameters.density;
    this.material.uniforms.sampleCount.value = this.parameters.samples;

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override dispose() {
    this.shaftMaskRenderTarget.dispose();
    this.sourceMaskMaterial.dispose();
    this.occluderMaterial.dispose();
    this.material.dispose();
  }
}
