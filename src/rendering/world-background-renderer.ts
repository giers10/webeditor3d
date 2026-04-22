import {
  BackSide,
  Camera,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  Vector2,
  Vector3
} from "three";

import type { Vec3 } from "../core/vector";
import type {
  WorldBackgroundSettings,
  WorldSunLightSettings
} from "../document/world-settings";
import type { WorldShaderSkyRenderState } from "./world-shader-sky";

const BACKGROUND_SPHERE_RADIUS = 320;
const BACKGROUND_SPHERE_WIDTH_SEGMENTS = 48;
const BACKGROUND_SPHERE_HEIGHT_SEGMENTS = 24;
const DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR = "#0d1116";
const NIGHT_BACKGROUND_EPSILON = 1e-4;
const MIN_CELESTIAL_BODY_INTENSITY = 1e-4;
const MIN_CELESTIAL_BODY_ALTITUDE = -0.02;
const CELESTIAL_BODY_DISTANCE = BACKGROUND_SPHERE_RADIUS - 6;
const SUN_CELESTIAL_BODY_SIZE = 28;
const MOON_CELESTIAL_BODY_SIZE = 20;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(left: number, right: number, amount: number) {
  return left + (right - left) * amount;
}

function resolveGradientColors(background: WorldBackgroundSettings) {
  if (background.mode === "solid") {
    return {
      topColorHex: background.colorHex,
      bottomColorHex: background.colorHex
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    topColorHex: DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR,
    bottomColorHex: DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR
  };
}

export interface WorldBackgroundOverlayState {
  texture: Texture | null;
  opacity: number;
  environmentIntensity: number;
}

export interface WorldEnvironmentBlendTextureResolver {
  resolveBlendTexture(
    baseTexture: Texture,
    overlayTexture: Texture,
    blendAmount: number
  ): Texture | null;
}

export interface WorldEnvironmentState {
  texture: Texture | null;
  intensity: number;
}

export interface WorldCelestialBodyState {
  colorHex: string;
  direction: Vec3;
  intensity: number;
  size: number;
}

export interface WorldCelestialBodiesState {
  sun: WorldCelestialBodyState | null;
  moon: WorldCelestialBodyState | null;
}

export function resolveWorldEnvironmentState(
  background: WorldBackgroundSettings,
  backgroundTexture: Texture | null,
  overlay: WorldBackgroundOverlayState | null,
  environmentBlendTextureResolver: WorldEnvironmentBlendTextureResolver | null = null
): WorldEnvironmentState {
  const baseTexture = background.mode === "image" ? backgroundTexture : null;
  const baseIntensity =
    background.mode === "image" ? background.environmentIntensity : 0;
  const overlayTexture = overlay?.texture ?? null;
  const overlayOpacity = clamp(overlay?.opacity ?? 0, 0, 1);
  const overlayIntensity = overlay?.environmentIntensity ?? 0;

  if (
    baseTexture !== null &&
    overlayTexture !== null &&
    overlayOpacity > NIGHT_BACKGROUND_EPSILON &&
    overlayOpacity < 1 - NIGHT_BACKGROUND_EPSILON
  ) {
    const blendedTexture =
      environmentBlendTextureResolver?.resolveBlendTexture(
        baseTexture,
        overlayTexture,
        overlayOpacity
      ) ?? baseTexture;

    return {
      texture: blendedTexture,
      intensity: lerp(baseIntensity, overlayIntensity, overlayOpacity)
    };
  }

  if (overlayTexture !== null && overlayOpacity > NIGHT_BACKGROUND_EPSILON) {
    if (baseTexture === null) {
      return {
        texture: overlayTexture,
        intensity: overlayIntensity * overlayOpacity
      };
    }

    if (overlayOpacity >= 1 - NIGHT_BACKGROUND_EPSILON) {
      return {
        texture: overlayTexture,
        intensity: overlayIntensity
      };
    }
  }

  if (baseTexture !== null) {
    return {
      texture: baseTexture,
      intensity: baseIntensity
    };
  }

  if (overlayTexture !== null && overlayOpacity > NIGHT_BACKGROUND_EPSILON) {
    return {
      texture: overlayTexture,
      intensity: overlayIntensity * overlayOpacity
    };
  }

  return {
    texture: null,
    intensity: 1
  };
}

function normalizeDirection(direction: Vec3): Vec3 | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);

  if (length <= 1e-6) {
    return null;
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length
  };
}

function resolveWorldCelestialBodyState(
  light: WorldSunLightSettings | null,
  size: number
): WorldCelestialBodyState | null {
  if (light === null || light.intensity <= MIN_CELESTIAL_BODY_INTENSITY) {
    return null;
  }

  const direction = normalizeDirection(light.direction);

  if (direction === null || direction.y < MIN_CELESTIAL_BODY_ALTITUDE) {
    return null;
  }

  return {
    colorHex: light.colorHex,
    direction,
    intensity: light.intensity,
    size
  };
}

export function resolveWorldCelestialBodiesState(
  showCelestialBodies: boolean,
  sunLight: WorldSunLightSettings,
  moonLight: WorldSunLightSettings | null
): WorldCelestialBodiesState {
  if (!showCelestialBodies) {
    return {
      sun: null,
      moon: null
    };
  }

  return {
    sun: resolveWorldCelestialBodyState(sunLight, SUN_CELESTIAL_BODY_SIZE),
    moon: resolveWorldCelestialBodyState(moonLight, MOON_CELESTIAL_BODY_SIZE)
  };
}

const GRADIENT_VERTEX_SHADER = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRADIENT_FRAGMENT_SHADER = `
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
varying vec3 vWorldPosition;

void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  float gradientAmount = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(uBottomColor, uTopColor, gradientAmount);
gl_FragColor = vec4(color, 1.0);
}
`;

const DEFAULT_SKY_FRAGMENT_SHADER = `
uniform vec3 uSkyTopColor;
uniform vec3 uSkyBottomColor;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uSunDiscSizeDegrees;
uniform float uSunVisible;
uniform vec3 uMoonDirection;
uniform vec3 uMoonColor;
uniform float uMoonIntensity;
uniform float uMoonDiscSizeDegrees;
uniform float uMoonVisible;
uniform float uDaylightFactor;
uniform float uTwilightFactor;
uniform float uStarDensity;
uniform float uStarBrightness;
uniform float uStarVisibility;
uniform float uStarRotationRadians;
uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudSoftness;
uniform float uCloudScale;
uniform float uCloudHeight;
uniform float uCloudHeightVariation;
uniform vec3 uCloudTint;
uniform float uCloudOpacity;
uniform float uCloudOpacityRandomness;
uniform vec2 uCloudDriftOffset;
varying vec3 vWorldPosition;

const float PI = 3.1415926535897932384626433832795;

float hash12(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 5; octave++) {
    value += noise(point) * amplitude;
    point = point * 2.03 + vec2(19.7, 7.3);
    amplitude *= 0.5;
  }

  return value;
}

mat2 rotation2d(float radians) {
  float sine = sin(radians);
  float cosine = cos(radians);

  return mat2(cosine, -sine, sine, cosine);
}

vec2 toSkyUv(vec3 direction) {
  float longitude = atan(direction.z, direction.x);
  float latitude = asin(clamp(direction.y, -1.0, 1.0));

  return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);
}

float discMask(vec3 direction, vec3 lightDirection, float sizeDegrees, float featherScale) {
  float sizeRadians = radians(max(sizeDegrees, 0.01));
  float alignment = dot(direction, normalize(lightDirection));
  float outerCos = cos(sizeRadians * 1.6);
  float innerCos = cos(sizeRadians * max(featherScale, 0.18));

  return smoothstep(outerCos, innerCos, alignment);
}

float glowMask(vec3 direction, vec3 lightDirection, float sizeDegrees, float radiusScale) {
  float sizeRadians = radians(max(sizeDegrees, 0.01) * max(radiusScale, 1.0));
  float alignment = dot(direction, normalize(lightDirection));
  float outerCos = cos(sizeRadians * 1.8);
  float innerCos = cos(sizeRadians * 0.55);

  return smoothstep(outerCos, innerCos, alignment);
}

float starLayer(vec2 uv, float scale, float densityThreshold) {
  vec2 scaledUv = uv * scale;
  vec2 cell = floor(scaledUv);
  vec2 local = fract(scaledUv) - 0.5;
  float seed = hash12(cell);
  float star = smoothstep(0.18, 0.0, length(local));

  return step(densityThreshold, seed) * star * mix(0.45, 1.0, hash12(cell + 17.0));
}

void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  float skyMix = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  skyMix = pow(skyMix, 0.72);

  vec3 skyColor = mix(uSkyBottomColor, uSkyTopColor, skyMix);
  float horizonMask = pow(clamp(1.0 - abs(direction.y), 0.0, 1.0), 2.6);
  skyColor += mix(uSkyBottomColor, vec3(1.0), 0.1 + uTwilightFactor * 0.18) * horizonMask * 0.04;

  float sunDisc = uSunVisible * discMask(direction, uSunDirection, uSunDiscSizeDegrees, 0.42);
  float sunGlow = uSunVisible * glowMask(direction, uSunDirection, uSunDiscSizeDegrees, 4.8);
  float moonDisc = uMoonVisible * discMask(direction, uMoonDirection, uMoonDiscSizeDegrees, 0.5);
  float moonGlow = uMoonVisible * glowMask(direction, uMoonDirection, uMoonDiscSizeDegrees, 5.6);

  vec2 skyUv = toSkyUv(direction);
  vec2 centeredStarUv = skyUv - 0.5;
  centeredStarUv = rotation2d(uStarRotationRadians) * centeredStarUv;
  vec2 starUv = centeredStarUv + 0.5;
  float starDensity = clamp(uStarDensity, 0.0, 2.0);
  float starLayerA = starLayer(starUv, mix(110.0, 360.0, clamp(starDensity * 0.65, 0.0, 1.0)), mix(0.994, 0.9, clamp(starDensity, 0.0, 1.0)));
  float starLayerB = starLayer(starUv + vec2(13.4, 5.7), mix(220.0, 640.0, clamp(starDensity * 0.5, 0.0, 1.0)), mix(0.9985, 0.96, clamp(starDensity * 0.8, 0.0, 1.0)));
  float starTwinkle = noise(starUv * 24.0 + vec2(uStarRotationRadians * 0.5, uTwilightFactor * 17.0));
  float stars = (starLayerA * 0.75 + starLayerB * 1.15) * mix(0.8, 1.18, starTwinkle);
  float starHorizonFade = smoothstep(-0.08, 0.12, direction.y);
  skyColor += vec3(stars) * uStarBrightness * uStarVisibility * starHorizonFade;

  vec2 cloudUv = skyUv;
  cloudUv.x += uCloudDriftOffset.x;
  cloudUv.y += uCloudDriftOffset.y;
  float cloudScale = max(uCloudScale, 0.01);
  float layerA = fbm(cloudUv * (0.9 + cloudScale * 1.4));
  float layerB = fbm((cloudUv + vec2(5.1, 1.7)) * (1.8 + cloudScale * 2.1));
  float layerC = noise((cloudUv - vec2(3.4, 7.2)) * (3.4 + cloudScale * 3.4));
  float cloudDensity = clamp(uCloudDensity, 0.0, 2.0);
  float cloudShape = mix(layerA, layerA * 0.58 + layerB * 0.42, clamp(cloudDensity / 1.35, 0.0, 1.0));
  cloudShape = mix(cloudShape, cloudShape * 0.72 + layerC * 0.28, 0.35);

  float bandCenter = mix(-0.15, 0.85, clamp(uCloudHeight, 0.0, 1.0));
  float bandNoise = (noise(cloudUv * 0.45 + vec2(11.0, 23.0)) - 0.5) * 2.0 * clamp(uCloudHeightVariation, 0.0, 1.0);
  float bandDistance = abs(direction.y - (bandCenter + bandNoise * 0.45));
  float bandMask = 1.0 - smoothstep(0.22, 0.88, bandDistance + (1.0 - clamp(cloudDensity / 1.35, 0.0, 1.0)) * 0.15);
  float coverageThreshold = mix(0.94, 0.12, clamp(uCloudCoverage, 0.0, 1.0));
  float softness = mix(0.01, 0.22, clamp(uCloudSoftness, 0.0, 1.0));
  float opacityNoise = mix(1.0, noise(cloudUv * 2.6 + vec2(19.0, 7.0)), clamp(uCloudOpacityRandomness, 0.0, 1.0));
  float clouds = smoothstep(coverageThreshold, coverageThreshold - softness - 0.0001, cloudShape + bandMask * 0.22);
  clouds *= bandMask;
  clouds *= clamp(uCloudOpacity, 0.0, 1.0) * mix(0.82, 1.0, opacityNoise);

  vec3 cloudLight = mix(mix(uSkyBottomColor, uSkyTopColor, 0.62), vec3(1.0), 0.12 + uDaylightFactor * 0.18 + uTwilightFactor * 0.08);
  cloudLight += uSunColor * sunGlow * (0.16 + uTwilightFactor * 0.12);
  vec3 cloudColor = mix(cloudLight, uCloudTint, 0.56);
  skyColor = mix(skyColor, cloudColor, clamp(clouds, 0.0, 1.0));

  skyColor += uSunColor * (sunGlow * (0.16 + uTwilightFactor * 0.32) + sunDisc * (0.75 + min(uSunIntensity, 3.5) * 0.25));
  skyColor += uMoonColor * (moonGlow * 0.12 + moonDisc * 0.35 * (0.35 + min(uMoonIntensity, 2.0) * 0.65));
  skyColor = clamp(skyColor, 0.0, 1.0);

  gl_FragColor = vec4(skyColor, 1.0);
}
`;

const CELESTIAL_BODY_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SUN_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 centeredUv = vUv * 2.0 - 1.0;
  float distanceFromCenter = length(centeredUv);
  float disc = smoothstep(0.52, 0.18, distanceFromCenter);
  float core = smoothstep(0.26, 0.0, distanceFromCenter);
  float halo = smoothstep(1.0, 0.28, distanceFromCenter);
  float glow = clamp(0.18 + min(uIntensity, 4.0) * 0.18, 0.18, 0.95);
  vec3 warmCore = mix(uColor, vec3(1.0, 0.97, 0.88), 0.45);
  vec3 color =
    warmCore * (disc * 1.15 + core * 0.8) +
    uColor * halo * glow * 0.55;
  float alpha = disc * 0.82 + core * 0.28 + halo * glow * 0.22;

  if (alpha <= 0.001) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
`;

const MOON_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * (3.0 - 2.0 * local);

  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

void main() {
  vec2 centeredUv = vUv * 2.0 - 1.0;
  float distanceFromCenter = length(centeredUv);
  float disc = smoothstep(0.52, 0.44, distanceFromCenter);
  float body = smoothstep(0.48, 0.0, distanceFromCenter);
  float halo = smoothstep(0.92, 0.32, distanceFromCenter);
  float craterNoise = noise(centeredUv * 6.0 + vec2(17.0, 9.0));
  float mariaNoise = noise(centeredUv * 3.0 + vec2(3.0, 5.0));
  float surfaceVariation = mix(0.86, 1.04, craterNoise * 0.65 + mariaNoise * 0.35);
  float glow = clamp(0.12 + min(uIntensity, 2.0) * 0.16, 0.12, 0.42);
  vec3 moonColor = mix(uColor, vec3(1.0, 1.0, 1.0), 0.35) * surfaceVariation;
  vec3 color = moonColor * (body * 1.08 + disc * 0.18) + uColor * halo * glow * 0.18;
  float alpha = disc * 0.82 + halo * glow * 0.12;

  if (alpha <= 0.001) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
`;

function createCelestialBodyMaterial(fragmentShader: string) {
  return new ShaderMaterial({
    uniforms: {
      uColor: {
        value: new Color("#ffffff")
      },
      uIntensity: {
        value: 0
      }
    },
    vertexShader: CELESTIAL_BODY_VERTEX_SHADER,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true
  });
}

export class WorldBackgroundRenderer {
  readonly scene = new Scene();

  private readonly anchor = new Group();
  private readonly geometry = new SphereGeometry(
    BACKGROUND_SPHERE_RADIUS,
    BACKGROUND_SPHERE_WIDTH_SEGMENTS,
    BACKGROUND_SPHERE_HEIGHT_SEGMENTS
  );
  private readonly gradientMaterial = new ShaderMaterial({
    uniforms: {
      uTopColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      },
      uBottomColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      }
    },
    vertexShader: GRADIENT_VERTEX_SHADER,
    fragmentShader: GRADIENT_FRAGMENT_SHADER,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly imageMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly overlayMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
    opacity: 0
  });
  private readonly celestialGeometry = new PlaneGeometry(1, 1);
  private readonly sunMaterial = createCelestialBodyMaterial(
    SUN_FRAGMENT_SHADER
  );
  private readonly moonMaterial = createCelestialBodyMaterial(
    MOON_FRAGMENT_SHADER
  );
  private readonly gradientMesh = new Mesh(this.geometry, this.gradientMaterial);
  private readonly imageMesh = new Mesh(this.geometry, this.imageMaterial);
  private readonly overlayMesh = new Mesh(this.geometry, this.overlayMaterial);
  private readonly sunMesh = new Mesh(this.celestialGeometry, this.sunMaterial);
  private readonly moonMesh = new Mesh(this.celestialGeometry, this.moonMaterial);
  private readonly celestialBodyPosition = new Vector3();
  private sunState: WorldCelestialBodyState | null = null;
  private moonState: WorldCelestialBodyState | null = null;

  constructor() {
    this.gradientMesh.renderOrder = -1002;
    this.imageMesh.renderOrder = -1001;
    this.overlayMesh.renderOrder = -1000;
    this.moonMesh.renderOrder = -999;
    this.sunMesh.renderOrder = -998;

    for (const mesh of [
      this.gradientMesh,
      this.imageMesh,
      this.overlayMesh,
      this.sunMesh,
      this.moonMesh
    ]) {
      mesh.frustumCulled = false;
    }

    this.anchor.add(this.gradientMesh);
    this.anchor.add(this.imageMesh);
    this.anchor.add(this.overlayMesh);
    this.anchor.add(this.moonMesh);
    this.anchor.add(this.sunMesh);
    this.scene.add(this.anchor);
  }

  update(
    background: WorldBackgroundSettings,
    backgroundTexture: Texture | null,
    overlay: WorldBackgroundOverlayState | null,
    celestialBodies: WorldCelestialBodiesState | null = null
  ) {
    const gradientColors = resolveGradientColors(background);
    this.gradientMaterial.uniforms.uTopColor.value.set(
      gradientColors.topColorHex
    );
    this.gradientMaterial.uniforms.uBottomColor.value.set(
      gradientColors.bottomColorHex
    );

    const showImageBackground =
      background.mode === "image" && backgroundTexture !== null;

    if (this.imageMaterial.map !== backgroundTexture) {
      this.imageMaterial.map = backgroundTexture;
      this.imageMaterial.needsUpdate = true;
    }

    this.gradientMesh.visible = !showImageBackground;
    this.imageMesh.visible = showImageBackground;

    const overlayTexture = overlay?.texture ?? null;
    const overlayOpacity =
      overlayTexture === null ? 0 : clamp(overlay?.opacity ?? 0, 0, 1);

    if (this.overlayMaterial.map !== overlayTexture) {
      this.overlayMaterial.map = overlayTexture;
      this.overlayMaterial.needsUpdate = true;
    }

    this.overlayMaterial.opacity = overlayOpacity;
    this.overlayMesh.visible = overlayOpacity > NIGHT_BACKGROUND_EPSILON;
    this.sunState = celestialBodies?.sun ?? null;
    this.moonState = celestialBodies?.moon ?? null;
    this.syncCelestialBodyVisualState(
      this.sunMesh,
      this.sunMaterial,
      this.sunState
    );
    this.syncCelestialBodyVisualState(
      this.moonMesh,
      this.moonMaterial,
      this.moonState
    );
  }

  syncToCamera(camera: Camera) {
    this.anchor.position.copy(camera.position);
    this.syncCelestialBodyPose(this.sunMesh, this.sunState, camera);
    this.syncCelestialBodyPose(this.moonMesh, this.moonState, camera);
  }

  dispose() {
    this.geometry.dispose();
    this.celestialGeometry.dispose();
    this.gradientMaterial.dispose();
    this.imageMaterial.dispose();
    this.overlayMaterial.dispose();
    this.sunMaterial.dispose();
    this.moonMaterial.dispose();
  }

  private syncCelestialBodyVisualState(
    mesh: Mesh,
    material: ShaderMaterial,
    state: WorldCelestialBodyState | null
  ) {
    if (state === null) {
      mesh.visible = false;
      material.uniforms.uIntensity.value = 0;
      return;
    }

    material.uniforms.uColor.value.set(state.colorHex);
    material.uniforms.uIntensity.value = state.intensity;
    mesh.scale.setScalar(state.size);
    mesh.visible = true;
  }

  private syncCelestialBodyPose(
    mesh: Mesh,
    state: WorldCelestialBodyState | null,
    camera: Camera
  ) {
    if (state === null) {
      mesh.visible = false;
      return;
    }

    this.celestialBodyPosition
      .set(state.direction.x, state.direction.y, state.direction.z)
      .normalize()
      .multiplyScalar(CELESTIAL_BODY_DISTANCE);
    mesh.position.copy(this.celestialBodyPosition);
    mesh.lookAt(camera.position);
  }
}
