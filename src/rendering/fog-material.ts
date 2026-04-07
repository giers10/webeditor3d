import { BackSide, Color, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";

export interface FogQualityMaterialOptions {
  colorHex: string;
  density: number;
  padding: number;
  time: number;
  halfSize: {
    x: number;
    y: number;
    z: number;
  };
  opacityMultiplier?: number;
  colorLift?: number;
}

export interface FogQualityMaterialResult {
  material: ShaderMaterial;
  animationUniform: { value: number };
}

const MIN_FOG_HALF_SIZE = 0.05;

export function createFogQualityMaterial(options: FogQualityMaterialOptions): FogQualityMaterialResult {
  const halfSize = new Vector3(
    Math.max(MIN_FOG_HALF_SIZE, options.halfSize.x),
    Math.max(MIN_FOG_HALF_SIZE, options.halfSize.y),
    Math.max(MIN_FOG_HALF_SIZE, options.halfSize.z)
  );
  const minHalfExtent = Math.min(halfSize.x, halfSize.y, halfSize.z);
  const padding = Math.max(0, Math.min(options.padding, minHalfExtent * 0.82));
  const animationUniform = { value: options.time };
  const uniforms = UniformsUtils.clone(UniformsLib.fog) as Record<string, { value: unknown }>;

  uniforms["time"] = animationUniform;
  uniforms["volumeFogColor"] = { value: new Color(options.colorHex) };
  uniforms["volumeFogDensity"] = { value: Math.max(0, options.density) };
  uniforms["volumeHalfSize"] = { value: halfSize };
  uniforms["volumePadding"] = { value: padding };
  uniforms["opacityMultiplier"] = { value: Math.max(0.6, Math.min(1.5, options.opacityMultiplier ?? 1)) };
  uniforms["colorLift"] = { value: Math.max(0, Math.min(0.22, options.colorLift ?? 0)) };

  const vertexShader = /* glsl */ `
    varying vec3 vLocalPosition;
    #include <fog_pars_vertex>

    void main() {
      vLocalPosition = position;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec4 mvPosition = viewMatrix * worldPosition;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform vec3 volumeFogColor;
    uniform float volumeFogDensity;
    uniform vec3 volumeHalfSize;
    uniform float volumePadding;
    uniform float opacityMultiplier;
    uniform float colorLift;
    uniform float time;

    varying vec3 vLocalPosition;
    #include <fog_pars_fragment>

    #define FOG_STEPS 18

    float saturate(float value) {
      return clamp(value, 0.0, 1.0);
    }

    float hash13(vec3 point) {
      point = fract(point * 0.1031);
      point += dot(point, point.yzx + 33.33);
      return fract((point.x + point.y) * point.z);
    }

    float noise3(vec3 point) {
      vec3 cell = floor(point);
      vec3 local = fract(point);
      vec3 smoothLocal = local * local * (3.0 - 2.0 * local);

      float n000 = hash13(cell + vec3(0.0, 0.0, 0.0));
      float n100 = hash13(cell + vec3(1.0, 0.0, 0.0));
      float n010 = hash13(cell + vec3(0.0, 1.0, 0.0));
      float n110 = hash13(cell + vec3(1.0, 1.0, 0.0));
      float n001 = hash13(cell + vec3(0.0, 0.0, 1.0));
      float n101 = hash13(cell + vec3(1.0, 0.0, 1.0));
      float n011 = hash13(cell + vec3(0.0, 1.0, 1.0));
      float n111 = hash13(cell + vec3(1.0, 1.0, 1.0));

      float nx00 = mix(n000, n100, smoothLocal.x);
      float nx10 = mix(n010, n110, smoothLocal.x);
      float nx01 = mix(n001, n101, smoothLocal.x);
      float nx11 = mix(n011, n111, smoothLocal.x);
      float nxy0 = mix(nx00, nx10, smoothLocal.y);
      float nxy1 = mix(nx01, nx11, smoothLocal.y);
      return mix(nxy0, nxy1, smoothLocal.z);
    }

    float fbm(vec3 point) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int octave = 0; octave < 4; octave += 1) {
        value += amplitude * noise3(point);
        point = point * 2.02 + vec3(17.1, 31.7, 9.2);
        amplitude *= 0.5;
      }

      return value;
    }

    vec2 intersectBox(vec3 rayOrigin, vec3 rayDirection, vec3 halfSize) {
      vec3 safeDirection = sign(rayDirection) * max(abs(rayDirection), vec3(1e-4));
      vec3 invDirection = 1.0 / safeDirection;
      vec3 t0 = (-halfSize - rayOrigin) * invDirection;
      vec3 t1 = (halfSize - rayOrigin) * invDirection;
      vec3 tMin = min(t0, t1);
      vec3 tMax = max(t0, t1);
      float nearHit = max(max(tMin.x, tMin.y), tMin.z);
      float farHit = min(min(tMax.x, tMax.y), tMax.z);
      return vec2(nearHit, farHit);
    }

    float sampleShape(vec3 samplePosition) {
      float minHalfExtent = min(min(volumeHalfSize.x, volumeHalfSize.y), volumeHalfSize.z);
      float edgeSoftness = max(0.08, min(volumePadding + minHalfExtent * 0.16, minHalfExtent * 0.72));
      vec3 innerHalfSize = max(volumeHalfSize - vec3(edgeSoftness), vec3(minHalfExtent * 0.18));
      vec3 distanceToCore = abs(samplePosition) - innerHalfSize;
      float outsideDistance = length(max(distanceToCore, 0.0));
      float insideDistance = min(max(distanceToCore.x, max(distanceToCore.y, distanceToCore.z)), 0.0);
      float roundedBoxDistance = outsideDistance + insideDistance;
      float edgeMask = 1.0 - smoothstep(-edgeSoftness * 0.7, edgeSoftness * 1.35, roundedBoxDistance);

      vec3 ellipsoidPosition = samplePosition / max(volumeHalfSize - vec3(edgeSoftness * 0.18), vec3(1e-3));
      float roundedMask = 1.0 - smoothstep(0.54, 1.03, length(ellipsoidPosition * vec3(0.96, 1.08, 0.96)));

      return edgeMask * mix(0.42, 1.0, roundedMask);
    }

    float sampleVolumeDensity(vec3 samplePosition) {
      vec3 normalizedPosition = samplePosition / max(volumeHalfSize, vec3(1e-3));
      float shape = sampleShape(samplePosition);

      if (shape <= 1e-3) {
        return 0.0;
      }

      vec3 drift = vec3(time * 0.12, time * 0.05, -time * 0.08);
      vec3 warpSource = samplePosition * 0.65 + drift;
      vec3 warp = vec3(
        fbm(warpSource + vec3(13.1, 0.0, 0.0)),
        fbm(warpSource + vec3(0.0, 7.9, 0.0)),
        fbm(warpSource + vec3(0.0, 0.0, 19.7))
      ) - 0.5;
      vec3 cloudPosition = samplePosition + warp * (0.7 + shape * 0.5);

      float primary = fbm(cloudPosition * 0.78 + drift);
      float secondary = fbm(cloudPosition * 1.56 - drift * 1.35);
      float wisps = fbm(cloudPosition * 2.35 + vec3(0.0, time * 0.09, 0.0));
      float cloud = smoothstep(0.28, 0.94, mix(primary, secondary, 0.45) + wisps * 0.18);
      float centerBias = 1.0 - smoothstep(0.18, 1.08, length(normalizedPosition * vec3(1.05, 0.92, 1.05)));
      float verticalBias = mix(0.9, 1.08, smoothstep(-0.75, 0.35, normalizedPosition.y));
      float carvedCloud = mix(0.35, 1.1, cloud) * mix(0.72, 1.0, centerBias);

      return volumeFogDensity * shape * carvedCloud * verticalBias;
    }

    void main() {
      vec3 worldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      mat3 localToWorld = mat3(modelMatrix);
      vec3 worldCameraOffset = cameraPosition - worldOrigin;
      vec3 localCameraPosition = vec3(
        dot(worldCameraOffset, localToWorld[0]),
        dot(worldCameraOffset, localToWorld[1]),
        dot(worldCameraOffset, localToWorld[2])
      );
      vec3 rayDirection = normalize(vLocalPosition - localCameraPosition);
      vec2 hitRange = intersectBox(localCameraPosition, rayDirection, volumeHalfSize);
      float startDistance = max(hitRange.x, 0.0);
      float endDistance = hitRange.y;

      if (endDistance <= startDistance) {
        discard;
      }

      float rayLength = endDistance - startDistance;
      float stepLength = rayLength / float(FOG_STEPS);
      float jitter = hash13(vLocalPosition * 1.73 + vec3(time * 0.17)) - 0.5;
      float transmittance = 1.0;
      vec3 accumulatedColor = vec3(0.0);

      for (int stepIndex = 0; stepIndex < FOG_STEPS; stepIndex += 1) {
        float sampleDistance = startDistance + (float(stepIndex) + 0.5 + jitter * 0.35) * stepLength;
        vec3 samplePosition = localCameraPosition + rayDirection * sampleDistance;
        float sampleDensity = sampleVolumeDensity(samplePosition);

        if (sampleDensity <= 1e-4) {
          continue;
        }

        vec3 normalizedPosition = samplePosition / max(volumeHalfSize, vec3(1e-3));
        float forwardScatter = pow(1.0 - abs(dot(rayDirection, normalize(samplePosition + vec3(1e-3, 2e-3, -1e-3)))), 2.0);
        float topLight = smoothstep(-0.2, 0.95, normalizedPosition.y);
        float coolShadow = smoothstep(0.15, 0.9, fbm(samplePosition * 0.92 - vec3(time * 0.11, 0.0, time * 0.06)));
        vec3 sampleColor = mix(volumeFogColor * 0.74, vec3(1.0), 0.08 + topLight * 0.12 + forwardScatter * 0.18);
        sampleColor = mix(sampleColor * 0.92, sampleColor, coolShadow);

        float extinction = sampleDensity * stepLength * 1.65;
        float sampleAlpha = 1.0 - exp(-extinction);
        accumulatedColor += transmittance * sampleColor * sampleAlpha;
        transmittance *= 1.0 - sampleAlpha;

        if (transmittance < 0.03) {
          break;
        }
      }

      float baseAlpha = 1.0 - transmittance;
      float alpha = clamp(baseAlpha * opacityMultiplier, 0.0, 0.96);

      if (alpha <= 0.01) {
        discard;
      }

      vec3 color = accumulatedColor / max(baseAlpha, 1e-4);
      color = mix(color, vec3(1.0), colorLift);

      gl_FragColor = vec4(color, alpha);
      #include <fog_fragment>
    }
  `;

  return {
    material: new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
      side: BackSide
    }),
    animationUniform
  };
}