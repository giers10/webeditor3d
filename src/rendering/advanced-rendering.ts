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
  type Camera,
  type Object3D,
  type Material,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderTarget,
  type WebGLRenderer,
  UnsignedByteType
} from "three";

import {
  BloomEffect,
  CopyMaterial,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NormalPass,
  RenderPass,
  ShaderPass,
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
import {
  ALL_RENDER_LAYER_MASK,
  AO_WORLD_RENDER_LAYER_MASK,
  OVERLAY_RENDER_LAYER_MASK,
  POST_AO_TRANSPARENT_RENDER_LAYER_MASK,
  isMaterialEligibleForAmbientOcclusion
} from "./render-layers";
import {
  DistanceFogPass,
  resolveDistanceFogParameters,
  shouldApplyDistanceFog
} from "./distance-fog-pass";
import {
  ScreenSpaceGlobalIlluminationPass,
  resolveDynamicGlobalIlluminationParameters
} from "./screen-space-global-illumination";

const AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE = 0.15;
const MIN_AMBIENT_OCCLUSION_EFFECT_RADIUS = 0.02;
const MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS = 0.2;
const MIN_AMBIENT_OCCLUSION_SAMPLES = 12;
const COARSE_AMBIENT_OCCLUSION_RESOLUTION_SCALE = 0.5;
const DETAIL_AMBIENT_OCCLUSION_RESOLUTION_SCALE = 0.75;
const DETAIL_AMBIENT_OCCLUSION_RADIUS_SCALE = 0.35;
const COARSE_AMBIENT_OCCLUSION_INTENSITY_SCALE = 0.45;
const DETAIL_AMBIENT_OCCLUSION_INTENSITY_SCALE = 0.35;

function renderWithCameraLayerMask(
  camera: Camera,
  layerMask: number,
  render: () => void
) {
  const previousLayerMask = camera.layers.mask;

  camera.layers.mask = layerMask;

  try {
    render();
  } finally {
    camera.layers.mask = previousLayerMask;
  }
}

class RenderLayerPass extends RenderPass {
  readonly renderLayerMask: number;
  private readonly renderLayerCamera: Camera;

  constructor(
    scene: Scene,
    camera: Camera,
    renderLayerMask: number,
    overrideMaterial?: Material
  ) {
    super(scene, camera, overrideMaterial);
    this.renderLayerCamera = camera;
    this.renderLayerMask = renderLayerMask;
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null,
    deltaTime?: number,
    stencilTest?: boolean
  ) {
    renderWithCameraLayerMask(
      this.renderLayerCamera,
      this.renderLayerMask,
      () =>
        super.render(
          renderer,
          inputBuffer,
          outputBuffer,
          deltaTime,
          stencilTest
        )
    );
  }
}

class RenderLayerNormalPass extends NormalPass {
  readonly renderLayerMask: number;
  private readonly renderLayerCamera: Camera;

  constructor(scene: Scene, camera: Camera, renderLayerMask: number) {
    super(scene, camera);
    this.renderLayerCamera = camera;
    this.renderLayerMask = renderLayerMask;
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget | null,
    outputBuffer: WebGLRenderTarget | null,
    deltaTime?: number,
    stencilTest?: boolean
  ) {
    renderWithCameraLayerMask(
      this.renderLayerCamera,
      this.renderLayerMask,
      () =>
        super.render(
          renderer,
          inputBuffer,
          outputBuffer,
          deltaTime,
          stencilTest
        )
    );
  }
}

function createMainRenderPass(
  scene: Scene,
  camera: Camera,
  layerMask: number,
  clear: boolean
) {
  const pass = new RenderLayerPass(scene, camera, layerMask);
  pass.clear = clear;

  return pass;
}

function createPostAmbientOcclusionRenderPass(
  scene: Scene,
  camera: Camera,
  layerMask: number
) {
  const pass = new RenderLayerPass(scene, camera, layerMask);

  pass.clear = false;
  pass.ignoreBackground = true;
  pass.skipShadowMapUpdate = true;

  return pass;
}

export interface ResolvedBoxVolumeRenderPaths {
  fog: BoxVolumeRenderPath;
  water: BoxVolumeRenderPath;
}

export function resolveBoxVolumeRenderPaths(
  settings: AdvancedRenderingSettings
): ResolvedBoxVolumeRenderPaths {
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

export function getAdvancedRenderingShadowMapType(
  shadowType: AdvancedRenderingShadowType
) {
  switch (shadowType) {
    case "basic":
      return BasicShadowMap;
    case "pcf":
      return PCFShadowMap;
    case "pcfSoft":
      return PCFSoftShadowMap;
  }
}

export function getAdvancedRenderingToneMappingMode(
  mode: AdvancedRenderingToneMappingMode
): ToneMappingMode {
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

export function configureAdvancedRenderingRenderer(
  renderer: WebGLRenderer,
  settings: AdvancedRenderingSettings
) {
  renderer.shadowMap.enabled = settings.enabled && settings.shadows.enabled;
  renderer.shadowMap.type = getAdvancedRenderingShadowMapType(
    settings.shadows.type
  );
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = settings.toneMapping.exposure;
}

function clampAmbientOcclusionEffectRadius(radius: number) {
  return Math.min(
    Math.max(radius, MIN_AMBIENT_OCCLUSION_EFFECT_RADIUS),
    MAX_AMBIENT_OCCLUSION_EFFECT_RADIUS
  );
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
    frameBufferType: renderer.capabilities.isWebGL2
      ? HalfFloatType
      : UnsignedByteType
  });
  const dynamicGlobalIlluminationParameters =
    resolveDynamicGlobalIlluminationParameters(
      settings.dynamicGlobalIllumination
    );
  const dynamicGlobalIlluminationEnabled =
    settings.enabled && dynamicGlobalIlluminationParameters.enabled;
  const distanceFogParameters = resolveDistanceFogParameters(
    settings.distanceFog
  );
  const distanceFogEnabled =
    settings.enabled && distanceFogParameters.enabled;
  const postWorldLayerIsolationEnabled =
    settings.ambientOcclusion.enabled ||
    dynamicGlobalIlluminationEnabled ||
    distanceFogEnabled;
  const mainRenderLayerMask = postWorldLayerIsolationEnabled
    ? AO_WORLD_RENDER_LAYER_MASK
    : ALL_RENDER_LAYER_MASK;

  if (backgroundScene !== null) {
    composer.addPass(
      createMainRenderPass(backgroundScene, camera, mainRenderLayerMask, true)
    );
    composer.addPass(
      createMainRenderPass(scene, camera, mainRenderLayerMask, false)
    );
  } else {
    composer.addPass(
      createMainRenderPass(scene, camera, mainRenderLayerMask, true)
    );
  }

  const effects: Array<
    BloomEffect | DepthOfFieldEffect | ToneMappingEffect | SMAAEffect
  > = [];

  if (settings.ambientOcclusion.enabled || dynamicGlobalIlluminationEnabled) {
    // postprocessing's internal depth-downsampling path writes zero normals unless
    // a real normal buffer is supplied, which turns SSAO into speckled noise.
    const normalPass = new RenderLayerNormalPass(
      scene,
      camera,
      AO_WORLD_RENDER_LAYER_MASK
    );
    composer.addPass(normalPass);

    if (dynamicGlobalIlluminationEnabled) {
      composer.addPass(
        new ScreenSpaceGlobalIlluminationPass(
          camera,
          normalPass.texture,
          dynamicGlobalIlluminationParameters
        )
      );
    }

    if (settings.ambientOcclusion.enabled) {
      const ambientOcclusionRadius = clampAmbientOcclusionEffectRadius(
        settings.ambientOcclusion.radius
      );
      const ambientOcclusionSamples = getAmbientOcclusionSampleCount(
        settings.ambientOcclusion.samples
      );
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
            intensity:
              settings.ambientOcclusion.intensity *
              COARSE_AMBIENT_OCCLUSION_INTENSITY_SCALE
          }),
          new SSAOEffect(camera, normalPass.texture, {
            depthAwareUpsampling: true,
            luminanceInfluence: AMBIENT_OCCLUSION_LUMINANCE_INFLUENCE,
            resolutionScale: DETAIL_AMBIENT_OCCLUSION_RESOLUTION_SCALE,
            samples: ambientOcclusionSamples,
            radius: detailAmbientOcclusionRadius,
            intensity:
              settings.ambientOcclusion.intensity *
              DETAIL_AMBIENT_OCCLUSION_INTENSITY_SCALE
          })
        )
      );
    }

    composer.addPass(new ShaderPass(new CopyMaterial()));
  }

  if (distanceFogEnabled) {
    composer.addPass(new DistanceFogPass(camera, distanceFogParameters));
  }

  if (postWorldLayerIsolationEnabled) {
    composer.addPass(
      createPostAmbientOcclusionRenderPass(
        scene,
        camera,
        POST_AO_TRANSPARENT_RENDER_LAYER_MASK
      )
    );
    composer.addPass(
      createPostAmbientOcclusionRenderPass(
        scene,
        camera,
        OVERLAY_RENDER_LAYER_MASK
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

export function applyAdvancedRenderingRenderableShadowFlags(
  root: Object3D,
  enabled: boolean
) {
  root.traverse((object) => {
    if ((object as Mesh).isMesh === true) {
      const mesh = object as Mesh;
      const shadowEligible =
        enabled &&
        object.userData.shadowIgnored !== true &&
        isMaterialEligibleForAmbientOcclusion(mesh.material);
      mesh.castShadow = shadowEligible;
      mesh.receiveShadow = shadowEligible;
    }
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
