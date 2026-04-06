import { Color, DoubleSide, Euler, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Vector2, Vector3, Vector4 } from "three";

const MAX_WATER_CONTACT_PATCHES = 6;
const WATER_CONTACT_EPSILON = 1e-4;

function createBoundsCorners(bounds) {
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

function createInverseVolumeRotation(rotationDegrees) {
    return new Quaternion()
        .setFromEuler(new Euler((rotationDegrees.x * Math.PI) / 180, (rotationDegrees.y * Math.PI) / 180, (rotationDegrees.z * Math.PI) / 180, "XYZ"))
        .invert();
}

export function collectWaterContactPatches(volume, contactBounds) {
    const inverseRotation = createInverseVolumeRotation(volume.rotationDegrees);
    const halfX = Math.max(volume.size.x * 0.5, WATER_CONTACT_EPSILON);
    const halfY = Math.max(volume.size.y * 0.5, WATER_CONTACT_EPSILON);
    const halfZ = Math.max(volume.size.z * 0.5, WATER_CONTACT_EPSILON);
    const surfaceY = halfY;
    const surfaceBand = Math.max(0.18, Math.min(0.55, volume.size.y * 0.2));
    const localPoint = new Vector3();
    const patches = [];
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

export function createWaterMaterial(options) {
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
    const waterColor = new Color(options.colorHex);
    const contactPatches = Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
        const patch = options.contactPatches?.[index];
        return new Vector4(patch?.x ?? 0, patch?.z ?? 0, patch?.radius ?? 0, patch?.intensity ?? 0);
    });
    const waveStrength = Math.max(0, options.waveStrength);
    const waveAmplitude = 0.016 + Math.min(0.12, waveStrength * 0.06);
    const material = new MeshPhysicalMaterial({
        color: options.colorHex,
        emissive: options.colorHex,
        emissiveIntensity: options.isTopFace ? 0.08 + waveStrength * 0.12 : 0.03,
        roughness: options.isTopFace ? 0.08 : 0.22,
        metalness: 0.02,
        transparent: true,
        opacity: options.opacity,
        transmission: options.isTopFace ? 0.86 : 0.42,
        thickness: options.isTopFace ? 1.8 : 0.85,
        ior: 1.325,
        reflectivity: options.isTopFace ? 0.45 : 0.16,
        clearcoat: options.isTopFace ? 0.85 : 0.18,
        clearcoatRoughness: options.isTopFace ? 0.12 : 0.2,
        attenuationColor: waterColor,
        attenuationDistance: options.isTopFace ? 3.5 : 1.7,
        envMapIntensity: options.isTopFace ? 1.2 : 0.9,
        depthWrite: false,
        side: DoubleSide
    });
    material.customProgramCacheKey = () => `water-${options.isTopFace ? "top" : "side"}`;
    material.onBeforeCompile = (shader) => {
        shader.uniforms["waterTime"] = animationUniform;
        shader.uniforms["waterWaveStrength"] = { value: waveStrength };
        shader.uniforms["waterWaveAmplitude"] = { value: waveAmplitude };
        shader.uniforms["waterIsTopFace"] = { value: options.isTopFace ? 1 : 0 };
        shader.uniforms["waterHalfSize"] = { value: halfSize };
        shader.uniforms["waterContactPatches"] = { value: contactPatches };
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", `#include <common>
        uniform float waterTime;
        uniform float waterWaveStrength;
        uniform float waterWaveAmplitude;
        uniform float waterIsTopFace;
        varying vec2 vWaterLocalPos;
        varying vec3 vWaterWaveNormal;`)
            .replace("#include <begin_vertex>", `#include <begin_vertex>
        vWaterLocalPos = transformed.xz;
        vWaterWaveNormal = vec3(0.0, 1.0, 0.0);
        if (waterIsTopFace > 0.5) {
          vec2 dirA = normalize(vec2(0.92, 0.38));
          vec2 dirB = normalize(vec2(-0.34, 0.94));
          vec2 dirC = normalize(vec2(0.58, -0.81));
          float phaseA = dot(transformed.xz, dirA) / 2.3 + waterTime * 0.92;
          float phaseB = dot(transformed.xz, dirB) / 1.45 - waterTime * 1.08;
          float phaseC = dot(transformed.xz, dirC) / 0.82 + waterTime * 1.42;
          float waveA = sin(phaseA) * 0.55;
          float waveB = sin(phaseB) * 0.3;
          float waveC = sin(phaseC) * 0.15;
          transformed.y += (waveA + waveB + waveC) * waterWaveAmplitude;
          vec2 slope =
            dirA * (cos(phaseA) / 2.3) * 0.55 +
            dirB * (cos(phaseB) / 1.45) * 0.3 +
            dirC * (cos(phaseC) / 0.82) * 0.15;
          vWaterWaveNormal = normalize(vec3(-slope.x * (0.3 + waterWaveStrength * 0.7), 1.0, -slope.y * (0.3 + waterWaveStrength * 0.7)));
        }
        `);
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>
        uniform float waterTime;
        uniform float waterWaveStrength;
        uniform float waterIsTopFace;
        uniform vec2 waterHalfSize;
        uniform vec4 waterContactPatches[${MAX_WATER_CONTACT_PATCHES}];
        varying vec2 vWaterLocalPos;
        varying vec3 vWaterWaveNormal;`)
            .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
        if (waterIsTopFace > 0.5) {
          normal = normalize(mix(normal, vWaterWaveNormal, 0.72));
        }`)
            .replace("#include <color_fragment>", `#include <color_fragment>
        if (waterIsTopFace > 0.5) {
          float edgeDistance = min(waterHalfSize.x - abs(vWaterLocalPos.x), waterHalfSize.y - abs(vWaterLocalPos.y));
          float edgeBand = max(0.22, min(waterHalfSize.x, waterHalfSize.y) * 0.12);
          float edgeFoam = 1.0 - smoothstep(0.0, edgeBand, edgeDistance);
          float contactFoam = 0.0;
          for (int patchIndex = 0; patchIndex < ${MAX_WATER_CONTACT_PATCHES}; patchIndex += 1) {
            vec4 patch = waterContactPatches[patchIndex];
            if (patch.z <= 0.0) {
              continue;
            }
            float normalizedDistance = length(vWaterLocalPos - patch.xy) / patch.z;
            float ring = smoothstep(0.38, 0.72, normalizedDistance) * (1.0 - smoothstep(0.88, 1.2, normalizedDistance));
            contactFoam = max(contactFoam, ring * patch.w);
          }
          vec3 viewDirection = normalize(vViewPosition);
          float fresnel = pow(1.0 - clamp(abs(dot(viewDirection, normal)), 0.0, 1.0), 3.0);
          float sparkle = sin(vWaterLocalPos.x * 5.5 + waterTime * 1.4) * sin(vWaterLocalPos.y * 4.6 - waterTime * 1.1);
          float foam = clamp(max(edgeFoam * 0.42, contactFoam) * (0.45 + waterWaveStrength * 0.7) + max(0.0, sparkle) * 0.06, 0.0, 0.72);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.99, 1.0), foam);
          diffuseColor.rgb += vec3(0.08, 0.12, 0.18) * fresnel * 0.18;
          diffuseColor.a = clamp(diffuseColor.a + foam * 0.16, 0.0, 1.0);
        }`);
    };
    return {
        material,
        animationUniform
    };
}