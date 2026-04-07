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
const MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS = 0.2;

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

export function createAdvancedRenderingComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  settings: AdvancedRenderingSettings
): EffectComposer {
  // The scene is always rendered into the composer's offscreen targets first,
  // so those targets need depth for correct visibility even when no effect samples it.
  const composer = new EffectComposer(renderer, {
    depthBuffer: true,
    stencilBuffer: false,
    multisampling: 0,
    frameBufferType: renderer.capabilities.isWebGL2 ? HalfFloatType : UnsignedByteType
  });

  composer.addPass(new RenderPass(scene, camera));

  const effects: Array<SSAOEffect | BloomEffect | DepthOfFieldEffect | ToneMappingEffect | SMAAEffect> = [];

  if (settings.ambientOcclusion.enabled) {
    // postprocessing's internal depth-downsampling path writes zero normals unless
    // a real normal buffer is supplied, which turns SSAO into speckled noise.
    const normalPass = new NormalPass(scene, camera);
    composer.addPass(normalPass);

    effects.push(
      new SSAOEffect(camera, normalPass.texture, {
        depthAwareUpsampling: true,
        luminanceInfluence: AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE,
        samples: settings.ambientOcclusion.samples,
        radius: Math.min(settings.ambientOcclusion.radius, MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS),
        intensity: settings.ambientOcclusion.intensity
      })
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
    if ((object as Mesh).isMesh === true && object.userData.shadowIgnored !== true) {
      const mesh = object as Mesh;
      mesh.castShadow = enabled;
      mesh.receiveShadow = enabled;
    }
  });
}

export function applyAdvancedRenderingLightShadowFlags(
  root: Object3D,
  settings: Pick<AdvancedRenderingSettings, "enabled" | "shadows">
) {
  const shadowEnabled = settings.enabled && settings.shadows.enabled;

  root.traverse((object) => {
    if (object instanceof DirectionalLight || object instanceof PointLight || object instanceof SpotLight) {
      object.castShadow = shadowEnabled;
      object.shadow.bias = settings.shadows.bias;
      object.shadow.mapSize.set(settings.shadows.mapSize, settings.shadows.mapSize);
    }
  });
}
