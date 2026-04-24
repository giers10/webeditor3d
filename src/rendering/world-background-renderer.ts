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

export interface WorldShaderSkyEnvironmentTextureResolver {
  resolveEnvironmentTexture(state: WorldShaderSkyRenderState): Texture | null;
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
  environmentBlendTextureResolver: WorldEnvironmentBlendTextureResolver | null = null,
  shaderSkyState: WorldShaderSkyRenderState | null = null,
  shaderSkyEnvironmentTextureResolver: WorldShaderSkyEnvironmentTextureResolver | null = null
): WorldEnvironmentState {
  if (background.mode === "shader") {
    return {
      texture:
        shaderSkyState === null
          ? null
          : (shaderSkyEnvironmentTextureResolver?.resolveEnvironmentTexture(
              shaderSkyState
            ) ?? null),
      intensity: 1
    };
  }

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
uniform float uHorizonHeight;
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
uniform float uStarHorizonFadeOffset;
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
uniform float uAuroraVisibility;
uniform float uAuroraIntensity;
uniform float uAuroraHeight;
uniform float uAuroraThickness;
uniform float uAuroraSpeed;
uniform vec3 uAuroraPrimaryColor;
uniform vec3 uAuroraSecondaryColor;
uniform float uAuroraRotationRadians;
uniform float uAuroraTimeHours;
varying vec3 vWorldPosition;

float hash12(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash13(vec3 point) {
  return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise2(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  float x1 = mix(a, b, blend.x);
  float x2 = mix(c, d, blend.x);

  return mix(x1, x2, blend.y);
}

float noise3(vec3 point) {
  vec3 cell = floor(point);
  vec3 local = fract(point);
  vec3 blend = local * local * (3.0 - 2.0 * local);
  float a = hash13(cell);
  float b = hash13(cell + vec3(1.0, 0.0, 0.0));
  float c = hash13(cell + vec3(0.0, 1.0, 0.0));
  float d = hash13(cell + vec3(1.0, 1.0, 0.0));
  float e = hash13(cell + vec3(0.0, 0.0, 1.0));
  float f = hash13(cell + vec3(1.0, 0.0, 1.0));
  float g = hash13(cell + vec3(0.0, 1.0, 1.0));
  float h = hash13(cell + vec3(1.0, 1.0, 1.0));
  float x1 = mix(a, b, blend.x);
  float x2 = mix(c, d, blend.x);
  float y1 = mix(x1, x2, blend.y);
  float x3 = mix(e, f, blend.x);
  float x4 = mix(g, h, blend.x);
  float y2 = mix(x3, x4, blend.y);

  return mix(y1, y2, blend.z);
}

float fbm2(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 5; octave++) {
    value += noise2(point) * amplitude;
    point = point * 2.03 + vec2(17.3, 9.1);
    amplitude *= 0.5;
  }

  return value;
}

float auroraFilamentPattern(vec2 point, float timeShift) {
  float broad = abs(sin(point.x * 18.0 + noise2(point * 0.45) * 4.0 + timeShift));
  float fine = abs(sin(point.x * 54.0 - point.y * 7.0 + noise2(point * 1.35) * 5.5 + timeShift * 1.8));

  return mix(pow(broad, 3.4), pow(fine, 5.6), 0.58);
}

mat3 rotationY(float radians) {
  float sine = sin(radians);
  float cosine = cos(radians);

  return mat3(
    cosine, 0.0, -sine,
    0.0, 1.0, 0.0,
    sine, 0.0, cosine
  );
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

float starLayer(vec3 direction, float scale, float densityThreshold) {
  vec3 scaledDirection = direction * scale;
  vec3 cell = floor(scaledDirection);
  vec3 local = fract(scaledDirection) - 0.5;
  float seed = hash13(cell);
  float star = smoothstep(0.16, 0.0, length(local));

  return step(densityThreshold, seed) * star * mix(0.45, 1.0, hash13(cell + 17.0));
}

vec2 projectCloudUv(
  vec3 direction,
  float horizonHeight,
  float cloudHeight,
  float layerOffset,
  vec2 driftOffset
) {
  float projectedHeight =
    max(
      direction.y -
        horizonHeight +
        mix(0.24, 0.86, clamp(cloudHeight, 0.0, 1.0)) +
        layerOffset,
      0.08
    );

  return direction.xz / projectedHeight + driftOffset;
}

void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  float shiftedY = clamp(direction.y - uHorizonHeight, -1.0, 1.0);
  float skyMix = clamp(shiftedY * 0.5 + 0.5, 0.0, 1.0);
  skyMix = pow(skyMix, 0.72);

  vec3 skyColor = mix(uSkyBottomColor, uSkyTopColor, skyMix);
  float horizonMask = pow(clamp(1.0 - abs(shiftedY), 0.0, 1.0), 2.6);
  skyColor += mix(uSkyBottomColor, vec3(1.0), 0.1 + uTwilightFactor * 0.18) * horizonMask * 0.04;

  float sunHorizonFade = smoothstep(uHorizonHeight - 0.14, uHorizonHeight + 0.03, uSunDirection.y);
  float moonHorizonFade = smoothstep(uHorizonHeight - 0.14, uHorizonHeight + 0.03, uMoonDirection.y);
  float sunDisc = uSunVisible * sunHorizonFade * discMask(direction, uSunDirection, uSunDiscSizeDegrees, 0.42);
  float sunGlow = uSunVisible * sunHorizonFade * glowMask(direction, uSunDirection, uSunDiscSizeDegrees, 4.8);
  float moonDisc = uMoonVisible * moonHorizonFade * discMask(direction, uMoonDirection, uMoonDiscSizeDegrees, 0.5);
  float moonGlow = uMoonVisible * moonHorizonFade * glowMask(direction, uMoonDirection, uMoonDiscSizeDegrees, 5.6);
  float sunAtmosphere = uSunVisible * sunHorizonFade * glowMask(direction, uSunDirection, uSunDiscSizeDegrees, 12.0);
  float moonAtmosphere = uMoonVisible * moonHorizonFade * glowMask(direction, uMoonDirection, uMoonDiscSizeDegrees, 10.0);

  vec3 rotatedStarDirection = normalize(rotationY(uStarRotationRadians) * direction);
  float starDensity = clamp(uStarDensity, 0.0, 2.0);
  float starLayerA = starLayer(rotatedStarDirection, mix(110.0, 360.0, clamp(starDensity * 0.65, 0.0, 1.0)), mix(0.994, 0.9, clamp(starDensity, 0.0, 1.0)));
  float starLayerB = starLayer(
    normalize(rotationY(uStarRotationRadians + 1.618) * direction),
    mix(220.0, 640.0, clamp(starDensity * 0.5, 0.0, 1.0)),
    mix(0.9985, 0.96, clamp(starDensity * 0.8, 0.0, 1.0))
  );
  float starTwinkle = noise3(rotatedStarDirection * 24.0 + vec3(uTwilightFactor * 17.0, uStarRotationRadians * 0.5, 9.0));
  float stars = (starLayerA * 0.75 + starLayerB * 1.15) * mix(0.8, 1.18, starTwinkle);
  float starHorizonLine = uHorizonHeight + uStarHorizonFadeOffset;
  float starHorizonFade = smoothstep(starHorizonLine - 0.08, starHorizonLine + 0.12, direction.y);
  skyColor += vec3(stars) * uStarBrightness * uStarVisibility * starHorizonFade;

  float cloudScale = max(uCloudScale, 0.01);
  float cloudDensity = clamp(uCloudDensity, 0.0, 2.0);
  vec2 driftA = uCloudDriftOffset * 0.55;
  vec2 driftB =
    vec2(-uCloudDriftOffset.y, uCloudDriftOffset.x) * 0.32 +
    uCloudDriftOffset * 0.35;
  vec2 cloudUvA =
    projectCloudUv(direction, uHorizonHeight, uCloudHeight, 0.12, driftA) *
    (0.28 + cloudScale * 0.48);
  vec2 cloudUvB =
    projectCloudUv(direction, uHorizonHeight, uCloudHeight, 0.28, driftB) *
    (0.54 + cloudScale * 0.82);
  float layerA = fbm2(cloudUvA);
  float layerB = fbm2(cloudUvB * 1.37 + vec2(17.0, 11.0));
  float layerC = noise2(cloudUvA * 2.9 + vec2(5.0, 3.0));
  float cloudShape =
    mix(
      layerA,
      layerA * 0.6 + layerB * 0.4,
      clamp(cloudDensity / 1.35, 0.0, 1.0)
    );
  cloudShape = mix(cloudShape, cloudShape * 0.76 + layerC * 0.24, 0.42);

  float bandCenter = mix(-0.15, 0.85, clamp(uCloudHeight, 0.0, 1.0)) + uHorizonHeight;
  float bandNoise =
    (noise2(cloudUvB * 0.2 + vec2(23.0, 7.0)) - 0.5) *
    2.0 *
    clamp(uCloudHeightVariation, 0.0, 1.0);
  float bandDistance = abs(direction.y - (bandCenter + bandNoise * 0.45));
  float bandWidth = mix(0.7, 0.34, clamp(cloudDensity / 1.4, 0.0, 1.0));
  float bandMask = 1.0 - smoothstep(bandWidth, bandWidth + 0.18, bandDistance);
  float coverageThreshold = mix(0.94, 0.12, clamp(uCloudCoverage, 0.0, 1.0));
  float softness = mix(0.01, 0.22, clamp(uCloudSoftness, 0.0, 1.0));
  float opacityNoise =
    mix(
      1.0,
      noise2(cloudUvA * 1.8 + vec2(31.0, 13.0)),
      clamp(uCloudOpacityRandomness, 0.0, 1.0)
    );
  float cloudHorizonFade = smoothstep(
    uHorizonHeight - 0.16,
    uHorizonHeight + 0.08,
    direction.y
  );
  float clouds = smoothstep(coverageThreshold - softness, coverageThreshold + softness, cloudShape + bandMask * 0.22);
  clouds *= bandMask * cloudHorizonFade;
  clouds *= clamp(uCloudOpacity, 0.0, 1.0) * mix(0.82, 1.0, opacityNoise);

  vec3 cloudLight = mix(mix(uSkyBottomColor, uSkyTopColor, 0.62), vec3(1.0), 0.12 + uDaylightFactor * 0.18 + uTwilightFactor * 0.08);
  cloudLight += uSunColor * sunGlow * (0.16 + uTwilightFactor * 0.12);
  cloudLight += uMoonColor * moonGlow * 0.04 * (1.0 - uDaylightFactor);
  vec3 cloudColor = mix(cloudLight, uCloudTint, 0.56);
  skyColor = mix(skyColor, cloudColor, clamp(clouds, 0.0, 1.0));

  if (uAuroraVisibility > 0.001) {
    vec3 auroraDirection = normalize(rotationY(uAuroraRotationRadians) * direction);
    float auroraTime = uAuroraTimeHours * max(uAuroraSpeed, 0.0);
    float hemisphereMask = smoothstep(-0.24, 0.42, auroraDirection.z);
    vec2 auroraUv = vec2(
      auroraDirection.x * 2.2 + auroraDirection.z * 0.35,
      auroraDirection.z * 1.28
    );
    float arcNoise = fbm2(
      auroraUv * 0.72 + vec2(auroraTime * 0.06, -auroraTime * 0.025)
    );
    float arcCenter =
      uHorizonHeight +
      mix(0.16, 0.82, clamp(uAuroraHeight, 0.0, 1.0)) +
      (arcNoise - 0.5) * mix(0.1, 0.34, clamp(uAuroraThickness, 0.0, 1.0));
    float curtainThickness = mix(0.09, 0.34, clamp(uAuroraThickness, 0.0, 1.0));
    float curtainMask =
      1.0 -
      smoothstep(
        curtainThickness,
        curtainThickness + 0.1,
        abs(direction.y - arcCenter)
      );
    float horizonFade = smoothstep(
      uHorizonHeight - 0.02,
      uHorizonHeight + 0.14,
      direction.y
    );
    float topFade =
      1.0 -
      smoothstep(
        arcCenter + curtainThickness * 1.45,
        arcCenter + curtainThickness * 2.3,
        direction.y
      );
    float sway = fbm2(
      vec2(
        auroraUv.x * 3.5 - auroraTime * 0.22,
        auroraUv.y * 1.4 + auroraTime * 0.04
      )
    );
    float sweep = fbm2(
      vec2(
        auroraUv.x * 6.4 + auroraTime * 0.15,
        auroraUv.y * 2.8 - auroraTime * 0.03
      )
    );
    float filamentPattern = auroraFilamentPattern(
      vec2(auroraUv.x * 1.8, direction.y * 6.0 + auroraUv.y * 2.0),
      auroraTime * 1.7
    );
    float skirt =
      1.0 -
      smoothstep(
        arcCenter - curtainThickness * 1.8,
        arcCenter - curtainThickness * 0.2,
        direction.y
      );
    float auroraStrength =
      curtainMask *
      hemisphereMask *
      horizonFade *
      topFade *
      (0.42 + sway * 0.78) *
      mix(0.55, 1.25, filamentPattern) *
      mix(0.76, 1.0, sweep) *
      mix(0.62, 1.0, skirt);
    float auroraGlow =
      hemisphereMask *
      horizonFade *
      (1.0 -
        smoothstep(
          curtainThickness * 1.6,
          curtainThickness * 3.0,
          abs(direction.y - arcCenter)
        )) *
      (0.16 + sway * 0.32);
    float auroraColorMix = clamp(0.18 + filamentPattern * 0.46 + sweep * 0.5, 0.0, 1.0);
    vec3 auroraColor = mix(
      uAuroraPrimaryColor,
      uAuroraSecondaryColor,
      auroraColorMix
    );
    auroraColor += vec3(0.82, 1.0, 0.9) * filamentPattern * 0.07;
    skyColor +=
      auroraColor *
      (auroraStrength * uAuroraVisibility * uAuroraIntensity +
        auroraGlow * uAuroraVisibility * uAuroraIntensity * 0.4);
  }

  skyColor +=
    uSunColor *
    (sunAtmosphere * (0.03 + uTwilightFactor * 0.18) +
      sunGlow * (0.16 + uTwilightFactor * 0.32) +
      sunDisc * (0.75 + min(uSunIntensity, 3.5) * 0.25));
  skyColor +=
    uMoonColor *
    (moonAtmosphere * 0.015 * (1.0 - uDaylightFactor) +
      moonGlow * 0.12 +
      moonDisc * 0.35 * (0.35 + min(uMoonIntensity, 2.0) * 0.65));
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

function createShaderSkyMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uSkyTopColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      },
      uSkyBottomColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      },
      uHorizonHeight: {
        value: 0
      },
      uSunDirection: {
        value: new Vector3(0, 1, 0)
      },
      uSunColor: {
        value: new Color("#ffffff")
      },
      uSunIntensity: {
        value: 0
      },
      uSunDiscSizeDegrees: {
        value: 2.6
      },
      uSunVisible: {
        value: 0
      },
      uMoonDirection: {
        value: new Vector3(0, 1, 0)
      },
      uMoonColor: {
        value: new Color("#ffffff")
      },
      uMoonIntensity: {
        value: 0
      },
      uMoonDiscSizeDegrees: {
        value: 1.8
      },
      uMoonVisible: {
        value: 0
      },
      uDaylightFactor: {
        value: 1
      },
      uTwilightFactor: {
        value: 0
      },
      uStarDensity: {
        value: 0.5
      },
      uStarBrightness: {
        value: 0.75
      },
      uStarVisibility: {
        value: 0
      },
      uStarHorizonFadeOffset: {
        value: 0
      },
      uStarRotationRadians: {
        value: 0
      },
      uCloudCoverage: {
        value: 0.55
      },
      uCloudDensity: {
        value: 0.6
      },
      uCloudSoftness: {
        value: 0.4
      },
      uCloudScale: {
        value: 1.2
      },
      uCloudHeight: {
        value: 0.6
      },
      uCloudHeightVariation: {
        value: 0.2
      },
      uCloudTint: {
        value: new Color("#ffffff")
      },
      uCloudOpacity: {
        value: 0.65
      },
      uCloudOpacityRandomness: {
        value: 0.2
      },
      uCloudDriftOffset: {
        value: new Vector2(0, 0)
      },
      uAuroraVisibility: {
        value: 0
      },
      uAuroraIntensity: {
        value: 1
      },
      uAuroraHeight: {
        value: 0.66
      },
      uAuroraThickness: {
        value: 0.42
      },
      uAuroraSpeed: {
        value: 0.12
      },
      uAuroraPrimaryColor: {
        value: new Color("#6df7d0")
      },
      uAuroraSecondaryColor: {
        value: new Color("#6e8dff")
      },
      uAuroraRotationRadians: {
        value: 0
      },
      uAuroraTimeHours: {
        value: 0
      }
    },
    vertexShader: GRADIENT_VERTEX_SHADER,
    fragmentShader: DEFAULT_SKY_FRAGMENT_SHADER,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
}

function applyShaderSkyStateToMaterial(
  material: ShaderMaterial,
  state: WorldShaderSkyRenderState | null
) {
  if (state === null) {
    material.uniforms.uHorizonHeight.value = 0;
    material.uniforms.uStarVisibility.value = 0;
    material.uniforms.uStarHorizonFadeOffset.value = 0;
    material.uniforms.uSunVisible.value = 0;
    material.uniforms.uMoonVisible.value = 0;
    material.uniforms.uAuroraVisibility.value = 0;
    return;
  }

  material.uniforms.uSkyTopColor.value.set(state.sky.topColorHex);
  material.uniforms.uSkyBottomColor.value.set(state.sky.bottomColorHex);
  material.uniforms.uHorizonHeight.value = state.sky.horizonHeight;
  material.uniforms.uSunDirection.value.set(
    state.celestial.sunDirection.x,
    state.celestial.sunDirection.y,
    state.celestial.sunDirection.z
  );
  material.uniforms.uSunColor.value.set(state.celestial.sunColorHex);
  material.uniforms.uSunIntensity.value = state.celestial.sunIntensity;
  material.uniforms.uSunDiscSizeDegrees.value =
    state.celestial.sunDiscSizeDegrees;
  material.uniforms.uSunVisible.value = state.celestial.sunVisible ? 1 : 0;
  material.uniforms.uMoonDirection.value.set(
    state.celestial.moonDirection.x,
    state.celestial.moonDirection.y,
    state.celestial.moonDirection.z
  );
  material.uniforms.uMoonColor.value.set(state.celestial.moonColorHex);
  material.uniforms.uMoonIntensity.value = state.celestial.moonIntensity;
  material.uniforms.uMoonDiscSizeDegrees.value =
    state.celestial.moonDiscSizeDegrees;
  material.uniforms.uMoonVisible.value = state.celestial.moonVisible ? 1 : 0;
  material.uniforms.uDaylightFactor.value = state.time.daylightFactor;
  material.uniforms.uTwilightFactor.value = state.time.twilightFactor;
  material.uniforms.uStarDensity.value = state.stars.density;
  material.uniforms.uStarBrightness.value = state.stars.brightness;
  material.uniforms.uStarVisibility.value = state.stars.visibility;
  material.uniforms.uStarHorizonFadeOffset.value =
    state.stars.horizonFadeOffset;
  material.uniforms.uStarRotationRadians.value = state.stars.rotationRadians;
  material.uniforms.uCloudCoverage.value = state.clouds.coverage;
  material.uniforms.uCloudDensity.value = state.clouds.density;
  material.uniforms.uCloudSoftness.value = state.clouds.softness;
  material.uniforms.uCloudScale.value = state.clouds.scale;
  material.uniforms.uCloudHeight.value = state.clouds.height;
  material.uniforms.uCloudHeightVariation.value = state.clouds.heightVariation;
  material.uniforms.uCloudTint.value.set(state.clouds.tintHex);
  material.uniforms.uCloudOpacity.value = state.clouds.opacity;
  material.uniforms.uCloudOpacityRandomness.value =
    state.clouds.opacityRandomness;
  material.uniforms.uCloudDriftOffset.value.set(
    state.clouds.driftOffset.x,
    state.clouds.driftOffset.y
  );
  material.uniforms.uAuroraVisibility.value = state.aurora.visibility;
  material.uniforms.uAuroraIntensity.value = state.aurora.intensity;
  material.uniforms.uAuroraHeight.value = state.aurora.height;
  material.uniforms.uAuroraThickness.value = state.aurora.thickness;
  material.uniforms.uAuroraSpeed.value = state.aurora.speed;
  material.uniforms.uAuroraPrimaryColor.value.set(
    state.aurora.primaryColorHex
  );
  material.uniforms.uAuroraSecondaryColor.value.set(
    state.aurora.secondaryColorHex
  );
  material.uniforms.uAuroraRotationRadians.value =
    state.aurora.rotationRadians;
  material.uniforms.uAuroraTimeHours.value = state.aurora.timeHours;
}

export class WorldBackgroundRenderer {
  readonly scene = new Scene();
  readonly environmentCaptureScene = new Scene();

  private readonly anchor = new Group();
  private readonly environmentCaptureAnchor = new Group();
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
  private readonly shaderSkyMaterial = createShaderSkyMaterial();
  private readonly environmentCaptureShaderMaterial = createShaderSkyMaterial();
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
  private readonly sunMaterial =
    createCelestialBodyMaterial(SUN_FRAGMENT_SHADER);
  private readonly moonMaterial =
    createCelestialBodyMaterial(MOON_FRAGMENT_SHADER);
  private readonly shaderMesh = new Mesh(this.geometry, this.shaderSkyMaterial);
  private readonly environmentCaptureShaderMesh = new Mesh(
    this.geometry,
    this.environmentCaptureShaderMaterial
  );
  private readonly gradientMesh = new Mesh(
    this.geometry,
    this.gradientMaterial
  );
  private readonly imageMesh = new Mesh(this.geometry, this.imageMaterial);
  private readonly overlayMesh = new Mesh(this.geometry, this.overlayMaterial);
  private readonly sunMesh = new Mesh(this.celestialGeometry, this.sunMaterial);
  private readonly moonMesh = new Mesh(
    this.celestialGeometry,
    this.moonMaterial
  );
  private readonly celestialBodyPosition = new Vector3();
  private sunState: WorldCelestialBodyState | null = null;
  private moonState: WorldCelestialBodyState | null = null;

  constructor() {
    this.shaderMesh.renderOrder = -1003;
    this.gradientMesh.renderOrder = -1002;
    this.imageMesh.renderOrder = -1001;
    this.overlayMesh.renderOrder = -1000;
    this.moonMesh.renderOrder = -999;
    this.sunMesh.renderOrder = -998;

    for (const mesh of [
      this.shaderMesh,
      this.environmentCaptureShaderMesh,
      this.gradientMesh,
      this.imageMesh,
      this.overlayMesh,
      this.sunMesh,
      this.moonMesh
    ]) {
      mesh.frustumCulled = false;
    }

    this.anchor.add(this.shaderMesh);
    this.anchor.add(this.gradientMesh);
    this.anchor.add(this.imageMesh);
    this.anchor.add(this.overlayMesh);
    this.anchor.add(this.moonMesh);
    this.anchor.add(this.sunMesh);
    this.scene.add(this.anchor);
    this.environmentCaptureAnchor.add(this.environmentCaptureShaderMesh);
    this.environmentCaptureScene.add(this.environmentCaptureAnchor);

    this.shaderMesh.visible = false;
    this.environmentCaptureShaderMesh.visible = false;
    this.imageMesh.visible = false;
    this.overlayMesh.visible = false;
    this.sunMesh.visible = false;
    this.moonMesh.visible = false;
  }

  update(
    background: WorldBackgroundSettings,
    backgroundTexture: Texture | null,
    overlay: WorldBackgroundOverlayState | null,
    celestialBodies: WorldCelestialBodiesState | null = null,
    shaderSkyState: WorldShaderSkyRenderState | null = null
  ) {
    const gradientColors = resolveGradientColors(background);
    this.gradientMaterial.uniforms.uTopColor.value.set(
      gradientColors.topColorHex
    );
    this.gradientMaterial.uniforms.uBottomColor.value.set(
      gradientColors.bottomColorHex
    );

    const showShaderBackground =
      background.mode === "shader" && shaderSkyState !== null;
    const showImageBackground =
      !showShaderBackground &&
      background.mode === "image" &&
      backgroundTexture !== null;

    if (this.imageMaterial.map !== backgroundTexture) {
      this.imageMaterial.map = backgroundTexture;
      this.imageMaterial.needsUpdate = true;
    }

    applyShaderSkyStateToMaterial(this.shaderSkyMaterial, shaderSkyState);
    this.syncEnvironmentCaptureState(
      showShaderBackground ? shaderSkyState : null
    );
    this.shaderMesh.visible = showShaderBackground;
    this.gradientMesh.visible = !showShaderBackground && !showImageBackground;
    this.imageMesh.visible = showImageBackground;

    const overlayTexture = overlay?.texture ?? null;
    const overlayOpacity =
      overlayTexture === null ? 0 : clamp(overlay?.opacity ?? 0, 0, 1);

    if (this.overlayMaterial.map !== overlayTexture) {
      this.overlayMaterial.map = overlayTexture;
      this.overlayMaterial.needsUpdate = true;
    }

    this.overlayMaterial.opacity = overlayOpacity;
    this.overlayMesh.visible =
      !showShaderBackground && overlayOpacity > NIGHT_BACKGROUND_EPSILON;
    this.sunState = showShaderBackground
      ? null
      : (celestialBodies?.sun ?? null);
    this.moonState = showShaderBackground
      ? null
      : (celestialBodies?.moon ?? null);
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
    this.shaderSkyMaterial.dispose();
    this.environmentCaptureShaderMaterial.dispose();
    this.imageMaterial.dispose();
    this.overlayMaterial.dispose();
    this.sunMaterial.dispose();
    this.moonMaterial.dispose();
  }

  syncEnvironmentCaptureState(state: WorldShaderSkyRenderState | null) {
    applyShaderSkyStateToMaterial(this.environmentCaptureShaderMaterial, state);
    this.environmentCaptureShaderMesh.visible = state !== null;
  }

  getEnvironmentCaptureFarPlane() {
    return BACKGROUND_SPHERE_RADIUS + 8;
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
