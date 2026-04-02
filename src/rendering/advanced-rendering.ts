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
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode
} from "postprocessing";

import type {
  AdvancedRenderingSettings,
  AdvancedRenderingShadowType,
  AdvancedRenderingToneMappingMode
} from "../document/world-settings";

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
  const composer = new EffectComposer(renderer, {
    multisampling: 0,
    frameBufferType: renderer.capabilities.isWebGL2 ? HalfFloatType : UnsignedByteType
  });

  composer.addPass(new RenderPass(scene, camera));

  const effects: Array<SSAOEffect | BloomEffect | DepthOfFieldEffect | ToneMappingEffect | SMAAEffect> = [];

  if (settings.ambientOcclusion.enabled) {
    effects.push(
      new SSAOEffect(camera, undefined, {
        samples: settings.ambientOcclusion.samples,
        radius: settings.ambientOcclusion.radius,
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
