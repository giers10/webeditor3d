import { DoubleSide, Euler, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

const MAX_WATER_CONTACT_PATCHES = 6;
const WATER_CONTACT_EPSILON = 1e-4;

function createBoundsCorners(bounds) {
    return [
        new Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
    ];
}
        const clampedOpacity = Math.max(0.14, Math.min(1, options.opacity));
        const topFaceFlag = options.isTopFace ? 1 : 0;
        const hex = options.colorHex.replace("#", "");
        const cr = parseInt(hex.substring(0, 2), 16) / 255;
        const cg = parseInt(hex.substring(2, 4), 16) / 255;
        const cb = parseInt(hex.substring(4, 6), 16) / 255;
        const vertexShader = `
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
        const fragmentShader = `
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
        reflectivity: options.isTopFace ? 0.45 : 0.16,
        clearcoat: options.isTopFace ? 0.85 : 0.18,
        clearcoatRoughness: options.isTopFace ? 0.12 : 0.2,
        attenuationColor: waterColor,
        attenuationDistance,
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
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuse.rgb * 1.12, 0.32 + (1.0 - transmissionFactor) * 0.22);
          diffuseColor.rgb += vec3(0.08, 0.12, 0.18) * fresnel * 0.18;
                    diffuseColor.a = 1.0;
        }`);
    };
    return {
        material,
        animationUniform
    };
}