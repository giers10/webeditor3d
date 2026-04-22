import {
  BasicShadowMap,
  DirectionalLight,
  HalfFloatType,
  Mesh,
  NoToneMapping,
  PCFShadowMap,
  PCFSoftShadowMap,
  PointLight,
  SpotLight,
  type Object3D,
  type Material,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
  UnsignedByteType
} from "three";

import {
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode
} from "postprocessing";

import type {
  AdvancedRenderingSettings,
  BoxVolumeRenderPath,
  AdvancedRenderingShadowType,
  AdvancedRenderingToneMappingMode
} from "../document/world-settings";

const AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE = 0.15;
const MIN_AMBIENT_OCCLUSION_EFFECT_RADIUS = 0.02;
const MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS = 0.2;
const MIN_AMBIENT_OCCLUSION_SAMPLES = 12;
const COARSE_AMBIENT_OCCLUSION_RESOLUTION_SCALE = 0.5;
const DETAIL_AMBIENT_OCCLUSION_RESOLUTION_SCALE = 0.75;
const DETAIL_AMBIENT_OCCLUSION_RADIUS_SCALE = 0.35;
const COARSE_AMBIENT_OCCLUSION_INTENSITY_SCALE = 0.45;
const DETAIL_AMBIENT_OCCLUSION_INTENSITY_SCALE = 0.35;

export interface ResolvedBoxVolumeRenderPaths {
  fog: BoxVolumeRenderPath;
  water: BoxVolumeRenderPath;
}

export function resolveBoxVolumeRenderPaths(settings: AdvancedRenderingSettings): ResolvedBoxVolumeRenderPaths {
  if (!settings.enabled) {
    return {
      fog: "performance",
      water: "performance"
    };
  }

  return {
    fog: settings.fogPath,
    water: settings.waterPath
  };
}

export function getAdvancedRenderingShadowMapType(shadowType: AdvancedRenderingShadowType) {
  switch (shadowType) {
    case "basic":
      return BasicShadowMap;
    case "pcf":
      return PCFShadowMap;
    case "pcfSoft":
      return PCFSoftShadowMap;
  }
}

export function getAdvancedRenderingToneMappingMode(mode: AdvancedRenderingToneMappingMode): ToneMappingMode {
  switch (mode) {
    case "none":
      return ToneMappingMode.LINEAR;
    case "linear":
      return ToneMappingMode.LINEAR;
    case "reinhard":
      return ToneMappingMode.REINHARD;
    case "cineon":
      return ToneMappingMode.CINEON;
    case "acesFilmic":
      return ToneMappingMode.ACES_FILMIC;
  }
}

export function configureAdvancedRenderingRenderer(renderer: WebGLRenderer, settings: AdvancedRenderingSettings) {
  renderer.shadowMap.enabled = settings.enabled && settings.shadows.enabled;
  renderer.shadowMap.type = getAdvancedRenderingShadowMapType(settings.shadows.type);
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = settings.toneMapping.exposure;
}

function clampAmbientOcclusionEffectRadius(radius: number) {
  return Math.min(Math.max(radius, MIN_AMBIENT_OCCLUSION_EFFECT_RADIUS), MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS);
}

function getAmbientOcclusionSampleCount(samples: number) {
  return Math.max(samples, MIN_AMBIENT_OCCLUSION_SAMPLES);
}

export function createAdvancedRenderingComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  settings: AdvancedRenderingSettings,
  backgroundScene: Scene | null = null
): EffectComposer {
  // The scene is always rendered into the composer's offscreen targets first,
  // so those targets need depth for correct visibility even when no effect samples it.
  const composer = new EffectComposer(renderer, {
    depthBuffer: true,
    stencilBuffer: false,
    multisampling: 0,
    frameBufferType: renderer.capabilities.isWebGL2 ? HalfFloatType : UnsignedByteType
  });

  if (backgroundScene !== null) {
    composer.addPass(new RenderPass(backgroundScene, camera));
    const mainRenderPass = new RenderPass(scene, camera);
    mainRenderPass.clear = false;
    composer.addPass(mainRenderPass);
  } else {
    composer.addPass(new RenderPass(scene, camera));
  }

  const effects: Array<BloomEffect | DepthOfFieldEffect | ToneMappingEffect | SMAAEffect> = [];

  if (settings.ambientOcclusion.enabled) {
    // postprocessing's internal depth-downsampling path writes zero normals unless
    // a real normal buffer is supplied, which turns SSAO into speckled noise.
    const normalPass = new NormalPass(scene, camera);
    composer.addPass(normalPass);

    const ambientOcclusionRadius = clampAmbientOcclusionEffectRadius(settings.ambientOcclusion.radius);
    const ambientOcclusionSamples = getAmbientOcclusionSampleCount(settings.ambientOcclusion.samples);
    const detailAmbientOcclusionRadius = Math.max(
      ambientOcclusionRadius * DETAIL_AMBIENT_OCCLUSION_RADIUS_SCALE,
      MIN_AMBIENT_OCCLUSION_EFFECT_RADIUS
    );

    composer.addPass(
      new EffectPass(
        camera,
        new SSAOEffect(camera, normalPass.texture, {
          depthAwareUpsampling: true,
          luminanceInfluence: AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE,
          resolutionScale: COARSE_AMBIENT_OCCLUSION_RESOLUTION_SCALE,
          samples: ambientOcclusionSamples,
          radius: ambientOcclusionRadius,
          intensity: settings.ambientOcclusion.intensity * COARSE_AMBIENT_OCCLUSION_INTENSITY_SCALE
        }),
        new SSAOEffect(camera, normalPass.texture, {
          depthAwareUpsampling: true,
          luminanceInfluence: AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE,
          resolutionScale: DETAIL_AMBIENT_OCCLUSION_RESOLUTION_SCALE,
          samples: ambientOcclusionSamples,
          radius: detailAmbientOcclusionRadius,
          intensity: settings.ambientOcclusion.intensity * DETAIL_AMBIENT_OCCLUSION_INTENSITY_SCALE
        })
      )
    );
  }

  if (settings.bloom.enabled) {
    effects.push(
      new BloomEffect({
        intensity: settings.bloom.intensity,
        luminanceThreshold: settings.bloom.threshold,
        radius: settings.bloom.radius
      })
    );
  }

  if (settings.depthOfField.enabled) {
    effects.push(
      new DepthOfFieldEffect(camera, {
        focusDistance: settings.depthOfField.focusDistance,
        focalLength: settings.depthOfField.focalLength,
        bokehScale: settings.depthOfField.bokehScale
      })
    );
  }

  effects.push(
    new ToneMappingEffect({
      mode: getAdvancedRenderingToneMappingMode(settings.toneMapping.mode)
    })
  );
  effects.push(
    new SMAAEffect({
      preset: SMAAPreset.MEDIUM
    })
  );

  composer.addPass(new EffectPass(camera, ...effects));

  return composer;
}

export function applyAdvancedRenderingRenderableShadowFlags(root: Object3D, enabled: boolean) {
  root.traverse((object) => {
    if ((object as Mesh).isMesh === true) {
      const mesh = object as Mesh;
      const shadowEligible =
        enabled &&
        object.userData.shadowIgnored !== true &&
        isRenderableMaterialEligibleForShadows(mesh.material);
      mesh.castShadow = shadowEligible;
      mesh.receiveShadow = shadowEligible;
    }
  });
}

function isRenderableMaterialEligibleForShadows(
  material: Material | Material[]
) {
  const materials = Array.isArray(material) ? material : [material];

  return materials.every((candidate) => {
    const shadowMaterial = candidate as Material & {
      opacity?: number;
      transparent?: boolean;
      visible?: boolean;
    };
    const opacity = shadowMaterial.opacity ?? 1;

    return shadowMaterial.visible !== false &&
      shadowMaterial.transparent !== true &&
      opacity >= 0.999;
  });
}

export function configureAdvancedRenderingShadowLight(
  light: DirectionalLight | PointLight | SpotLight,
  settings: Pick<AdvancedRenderingSettings, "enabled" | "shadows">,
  castShadow: boolean,
  normalBias = 0
) {
  const shadowEnabled =
    settings.enabled && settings.shadows.enabled && castShadow;

  light.castShadow = shadowEnabled;
  light.shadow.autoUpdate = shadowEnabled;
  light.shadow.bias = settings.shadows.bias;
  light.shadow.normalBias = shadowEnabled ? Math.max(0, normalBias) : 0;
  light.shadow.mapSize.set(settings.shadows.mapSize, settings.shadows.mapSize);
}
