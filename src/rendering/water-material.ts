import { DoubleSide, Euler, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

import type { Vec3 } from "../core/vector";

export interface WaterContactBounds {
  min: Vec3;
  max: Vec3;
}

export interface WaterContactPatch {
  x: number;
  z: number;
  radius: number;
  intensity: number;
}

export interface WaterMaterialResult {
  material: MeshBasicMaterial | ShaderMaterial;
  animationUniform: { value: number } | null;
}

interface WaterMaterialOptions {
  colorHex: string;
  surfaceOpacity: number;
  waveStrength: number;
  opacity: number;
  quality: boolean;
  wireframe: boolean;
  isTopFace: boolean;
  time: number;
  halfSize: {
    x: number;
    z: number;
  };
  contactPatches?: WaterContactPatch[];
}

interface OrientedWaterVolume {
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
}

const MAX_WATER_CONTACT_PATCHES = 6;
const WATER_CONTACT_EPSILON = 1e-4;

function createBoundsCorners(bounds: WaterContactBounds) {
  return [
    new Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
  ];
}

function createInverseVolumeRotation(rotationDegrees: Vec3) {
  return new Quaternion()
    .setFromEuler(
      new Euler((rotationDegrees.x * Math.PI) / 180, (rotationDegrees.y * Math.PI) / 180, (rotationDegrees.z * Math.PI) / 180, "XYZ")
    )
    .invert();
}

export function collectWaterContactPatches(volume: OrientedWaterVolume, contactBounds: WaterContactBounds[]): WaterContactPatch[] {
  const inverseRotation = createInverseVolumeRotation(volume.rotationDegrees);
  const halfX = Math.max(volume.size.x * 0.5, WATER_CONTACT_EPSILON);
  const halfY = Math.max(volume.size.y * 0.5, WATER_CONTACT_EPSILON);
  const halfZ = Math.max(volume.size.z * 0.5, WATER_CONTACT_EPSILON);
  const surfaceY = halfY;
  const surfaceBand = Math.max(0.18, Math.min(0.55, volume.size.y * 0.2));
  const localPoint = new Vector3();
  const patches: WaterContactPatch[] = [];

  for (const bounds of contactBounds) {
    const corners = createBoundsCorners(bounds);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
      localPoint.copy(corner);
      localPoint.x -= volume.center.x;
      localPoint.y -= volume.center.y;
      localPoint.z -= volume.center.z;
      localPoint.applyQuaternion(inverseRotation);
      minX = Math.min(minX, localPoint.x);
      minY = Math.min(minY, localPoint.y);
      minZ = Math.min(minZ, localPoint.z);
      maxX = Math.max(maxX, localPoint.x);
      maxY = Math.max(maxY, localPoint.y);
      maxZ = Math.max(maxZ, localPoint.z);
    }

    if (maxX <= -halfX || minX >= halfX || maxZ <= -halfZ || minZ >= halfZ) {
      continue;
    }

    if (maxY < surfaceY - surfaceBand || minY > surfaceY + surfaceBand) {
      continue;
    }

    const overlapMinX = Math.max(minX, -halfX);
    const overlapMaxX = Math.min(maxX, halfX);
    const overlapMinZ = Math.max(minZ, -halfZ);
    const overlapMaxZ = Math.min(maxZ, halfZ);
    const overlapWidth = overlapMaxX - overlapMinX;
    const overlapDepth = overlapMaxZ - overlapMinZ;

    if (overlapWidth <= WATER_CONTACT_EPSILON || overlapDepth <= WATER_CONTACT_EPSILON) {
      continue;
    }

    const radius = Math.max(0.2, Math.min(Math.max(overlapWidth, overlapDepth) * 0.55, Math.min(halfX, halfZ) * 0.85));
    const verticalDistance = Math.min(Math.abs(surfaceY - minY), Math.abs(maxY - surfaceY));
    const intensity = 1 - Math.min(verticalDistance / surfaceBand, 1);

    if (intensity <= WATER_CONTACT_EPSILON) {
      continue;
    }

    patches.push({
      x: (overlapMinX + overlapMaxX) * 0.5,
      z: (overlapMinZ + overlapMaxZ) * 0.5,
      radius,
      intensity: 0.45 + intensity * 0.55
    });
  }

  return patches
    .sort((left, right) => right.radius * right.intensity - left.radius * left.intensity)
    .slice(0, MAX_WATER_CONTACT_PATCHES);
}

export function createWaterMaterial(options: WaterMaterialOptions): WaterMaterialResult {
  if (options.wireframe) {
    return {
      material: new MeshBasicMaterial({
        color: options.colorHex,
        wireframe: true,
        transparent: true,
        opacity: Math.min(1, options.opacity + 0.2),
        depthWrite: false
      }),
      animationUniform: null
    };
  }

  if (!options.quality) {
    return {
      material: new MeshBasicMaterial({
        color: options.colorHex,
        transparent: true,
        opacity: options.opacity,
        depthWrite: false
      }),
      animationUniform: null
    };
  }

  const animationUniform = { value: options.time };
  const halfSize = new Vector2(Math.max(options.halfSize.x, WATER_CONTACT_EPSILON), Math.max(options.halfSize.z, WATER_CONTACT_EPSILON));
  const contactPatches = Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
    const patch = options.contactPatches?.[index];
    return new Vector4(patch?.x ?? 0, patch?.z ?? 0, patch?.radius ?? 0, patch?.intensity ?? 0);
  });
  const waveStrength = Math.max(0, options.waveStrength);
  const waveAmplitude = 0.016 + Math.min(0.12, waveStrength * 0.06);
  const clampedOpacity = Math.max(0.14, Math.min(1, options.opacity));
  const topFaceFlag = options.isTopFace ? 1 : 0;
  const hex = options.colorHex.replace("#", "");
  const cr = parseInt(hex.substring(0, 2), 16) / 255;
  const cg = parseInt(hex.substring(2, 4), 16) / 255;
  const cb = parseInt(hex.substring(4, 6), 16) / 255;

  const vertexShader = /* glsl */ `
    uniform float time;
    uniform float waveStrength;
    uniform float waveAmplitude;
    uniform float isTopFace;

    varying vec2 vLocalSurfaceUv;
    varying vec3 vWaveNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;

    void main() {
      vec3 transformedPosition = position;
      vLocalSurfaceUv = position.xz;
      vWaveNormal = vec3(0.0, 1.0, 0.0);

      if (isTopFace > 0.5) {
        vec2 dirA = normalize(vec2(0.92, 0.38));
        vec2 dirB = normalize(vec2(-0.34, 0.94));
        vec2 dirC = normalize(vec2(0.58, -0.81));
        float phaseA = dot(vLocalSurfaceUv, dirA) / 2.3 + time * 0.92;
        float phaseB = dot(vLocalSurfaceUv, dirB) / 1.45 - time * 1.08;
        float phaseC = dot(vLocalSurfaceUv, dirC) / 0.82 + time * 1.42;
        float waveA = sin(phaseA) * 0.55;
        float waveB = sin(phaseB) * 0.30;
        float waveC = sin(phaseC) * 0.15;

        transformedPosition.y += (waveA + waveB + waveC) * waveAmplitude;

        vec2 slope =
          dirA * (cos(phaseA) / 2.3) * 0.55 +
          dirB * (cos(phaseB) / 1.45) * 0.30 +
          dirC * (cos(phaseC) / 0.82) * 0.15;
        vWaveNormal = normalize(vec3(-slope.x * (0.3 + waveStrength * 0.7), 1.0, -slope.y * (0.3 + waveStrength * 0.7)));
      }

      vec4 worldPos = modelMatrix * vec4(transformedPosition, 1.0);
      vWorldPos = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec3 waterColor;
    uniform float surfaceOpacity;
    uniform float waveStrength;
    uniform float time;
    uniform float isTopFace;
    uniform vec2 halfSize;
    uniform vec4 contactPatches[${MAX_WATER_CONTACT_PATCHES}];

    varying vec2 vLocalSurfaceUv;
    varying vec3 vWaveNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      vec3 normal = normalize(vWaveNormal);
      vec3 viewDir = normalize(vViewDir);
      float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 2.8);

      float refractPattern =
        sin((vLocalSurfaceUv.x + normal.x * 0.6) * 2.2 + time * 0.8) *
        sin((vLocalSurfaceUv.y + normal.z * 0.4) * 1.9 - time * 0.65);
      float detail = noise(vLocalSurfaceUv * 1.8 + vec2(time * 0.12, -time * 0.09));
      float refraction = refractPattern * 0.08 + (detail - 0.5) * 0.12;

      vec3 deepTint = waterColor * vec3(0.52, 0.66, 0.78);
      vec3 shallowTint = mix(waterColor, vec3(0.72, 0.9, 1.0), 0.2 + fresnel * 0.24);
      vec3 color = mix(deepTint, shallowTint, 0.58 + refraction);

      float edgeDistance = min(halfSize.x - abs(vLocalSurfaceUv.x), halfSize.y - abs(vLocalSurfaceUv.y));
      float edgeBand = max(0.22, min(halfSize.x, halfSize.y) * 0.12);
      float edgeFoam = isTopFace > 0.5 ? 1.0 - smoothstep(0.0, edgeBand, edgeDistance) : 0.0;
      float contactFoam = 0.0;

      if (isTopFace > 0.5) {
        for (int patchIndex = 0; patchIndex < ${MAX_WATER_CONTACT_PATCHES}; patchIndex += 1) {
          vec4 patch = contactPatches[patchIndex];
          if (patch.z <= 0.0) {
            continue;
          }

          float normalizedDistance = length(vLocalSurfaceUv - patch.xy) / patch.z;
          float ring = smoothstep(0.38, 0.72, normalizedDistance) * (1.0 - smoothstep(0.88, 1.2, normalizedDistance));
          contactFoam = max(contactFoam, ring * patch.w);
        }
      }

      float sparkle = max(0.0, sin(vLocalSurfaceUv.x * 5.2 + time * 1.35) * sin(vLocalSurfaceUv.y * 4.4 - time * 1.08));
      float foam = clamp(max(edgeFoam * 0.42, contactFoam) * (0.45 + waveStrength * 0.75) + sparkle * 0.06, 0.0, 0.72);
      vec3 specular = vec3(pow(max(0.0, dot(reflect(-viewDir, normal), normalize(vec3(0.25, 0.88, 0.35)))), 18.0)) * (0.18 + fresnel * 0.52);

      color = mix(color, vec3(0.97, 0.99, 1.0), foam);
      color += specular;
      color += vec3(0.05, 0.08, 0.12) * fresnel;

      float alpha = isTopFace > 0.5
        ? clamp(surfaceOpacity + fresnel * 0.16 + foam * 0.12, 0.32, 0.9)
        : clamp(surfaceOpacity * 0.72 + refraction * 0.05, 0.16, 0.68);

      gl_FragColor = vec4(color, alpha);
    }
  `;

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      time: animationUniform,
      waterColor: { value: [cr, cg, cb] },
      surfaceOpacity: { value: clampedOpacity },
      waveStrength: { value: waveStrength },
      waveAmplitude: { value: waveAmplitude },
      isTopFace: { value: topFaceFlag },
      halfSize: { value: halfSize },
      contactPatches: { value: contactPatches }
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide
  });

  return {
    material,
    animationUniform
  };
}