import {
  CubeCamera,
  HalfFloatType,
  LinearSRGBColorSpace,
  LinearFilter,
  NoToneMapping,
  PMREMGenerator,
  Texture,
  WebGLCubeRenderTarget,
  type WebGLRenderer
} from "three";

import type { RuntimeDayPhase } from "../runtime-three/runtime-project-time";
import type {
  CachedEnvironmentBlendTexture,
  QuantizedEnvironmentBlendCache
} from "./quantized-environment-blend-cache";
import type {
  WorldEnvironmentBlendTextureResolver,
  WorldShaderSkyEnvironmentTextureResolver
} from "./world-background-renderer";
import type { WorldBackgroundRenderer } from "./world-background-renderer";
import {
  createWorldShaderSkyEnvironmentPhaseCacheKey,
  resolveWorldShaderSkyEnvironmentPhaseBlend,
  type WorldShaderSkyEnvironmentPhaseStates,
  type WorldShaderSkyRenderState
} from "./world-shader-sky";

const SHADER_SKY_PHASES: RuntimeDayPhase[] = ["day", "dawn", "dusk", "night"];
const DEFAULT_SHADER_SKY_ENVIRONMENT_CAPTURE_SIZE = 32;

interface ShaderSkyEnvironmentPhaseEntries {
  day: CachedEnvironmentBlendTexture | null;
  dawn: CachedEnvironmentBlendTexture | null;
  dusk: CachedEnvironmentBlendTexture | null;
  night: CachedEnvironmentBlendTexture | null;
}

export interface PrecomputedShaderSkyEnvironmentCacheOptions {
  buildEnvironmentTexture: (
    state: WorldShaderSkyRenderState
  ) => CachedEnvironmentBlendTexture;
  disposeBuildResources?: () => void;
  phaseBlendTextureResolver?: WorldEnvironmentBlendTextureResolver | null;
  clearPhaseBlendTextureResolver?: () => void;
}

function createEmptyPhaseEntries(): ShaderSkyEnvironmentPhaseEntries {
  return {
    day: null,
    dawn: null,
    dusk: null,
    night: null
  };
}

function disposePhaseEntries(entries: ShaderSkyEnvironmentPhaseEntries) {
  for (const phase of SHADER_SKY_PHASES) {
    entries[phase]?.dispose();
  }
}

class RendererShaderSkyEnvironmentTextureBuilder {
  private readonly pmremGenerator: PMREMGenerator;
  private readonly captureTarget: WebGLCubeRenderTarget;
  private readonly captureCamera: CubeCamera;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly worldBackgroundRenderer: WorldBackgroundRenderer,
    captureSize: number = DEFAULT_SHADER_SKY_ENVIRONMENT_CAPTURE_SIZE
  ) {
    this.pmremGenerator = new PMREMGenerator(renderer);
    this.pmremGenerator.compileCubemapShader();
    this.captureTarget = new WebGLCubeRenderTarget(
      Math.max(16, Math.floor(captureSize)),
      {
        type: HalfFloatType,
        magFilter: LinearFilter,
        minFilter: LinearFilter,
        generateMipmaps: false
      }
    );
    this.captureTarget.texture.colorSpace = LinearSRGBColorSpace;
    this.captureCamera = new CubeCamera(
      0.1,
      this.worldBackgroundRenderer.getEnvironmentCaptureFarPlane(),
      this.captureTarget
    );
  }

  build(state: WorldShaderSkyRenderState): CachedEnvironmentBlendTexture {
    const previousRenderTarget = this.renderer.getRenderTarget();
    const previousAutoClear = this.renderer.autoClear;
    const previousXrEnabled = this.renderer.xr.enabled;
    const previousToneMapping = this.renderer.toneMapping;
    const previousOutputColorSpace = this.renderer.outputColorSpace;

    try {
      this.renderer.xr.enabled = false;
      this.renderer.autoClear = true;
      this.renderer.toneMapping = NoToneMapping;
      this.renderer.outputColorSpace = LinearSRGBColorSpace;
      this.worldBackgroundRenderer.syncEnvironmentCaptureState(state);
      this.captureCamera.update(
        this.renderer,
        this.worldBackgroundRenderer.environmentCaptureScene
      );

      const pmremTarget = this.pmremGenerator.fromCubemap(
        this.captureTarget.texture
      );

      return {
        texture: pmremTarget.texture,
        dispose: () => {
          pmremTarget.dispose();
        }
      };
    } finally {
      this.renderer.autoClear = previousAutoClear;
      this.renderer.xr.enabled = previousXrEnabled;
      this.renderer.toneMapping = previousToneMapping;
      this.renderer.outputColorSpace = previousOutputColorSpace;
      this.renderer.setRenderTarget(previousRenderTarget);
    }
  }

  dispose() {
    this.worldBackgroundRenderer.syncEnvironmentCaptureState(null);
    this.captureTarget.dispose();
    this.pmremGenerator.dispose();
  }
}

export class PrecomputedShaderSkyEnvironmentCache implements WorldShaderSkyEnvironmentTextureResolver {
  private currentKey: string | null = null;
  private readonly phaseEntries = createEmptyPhaseEntries();
  private disposed = false;

  constructor(
    private readonly options: PrecomputedShaderSkyEnvironmentCacheOptions
  ) {}

  syncPhaseTextures(states: WorldShaderSkyEnvironmentPhaseStates) {
    if (this.disposed) {
      return;
    }

    const nextKey = createWorldShaderSkyEnvironmentPhaseCacheKey(states);

    if (this.currentKey === nextKey) {
      return;
    }

    const nextEntries = createEmptyPhaseEntries();

    try {
      for (const phase of SHADER_SKY_PHASES) {
        const state = states[phase];
        nextEntries[phase] =
          state === null ? null : this.options.buildEnvironmentTexture(state);
      }
    } catch (error) {
      disposePhaseEntries(nextEntries);
      console.warn(
        "Failed to build precomputed shader sky environment textures.",
        error
      );
      return;
    }

    this.options.clearPhaseBlendTextureResolver?.();
    this.clear();

    for (const phase of SHADER_SKY_PHASES) {
      this.phaseEntries[phase] = nextEntries[phase];
    }

    this.currentKey = nextKey;
  }

  resolveEnvironmentTexture(state: WorldShaderSkyRenderState): Texture | null {
    if (this.disposed) {
      return null;
    }

    const phaseBlend = resolveWorldShaderSkyEnvironmentPhaseBlend(state);

    if (phaseBlend === null) {
      return null;
    }

    const baseTexture =
      this.phaseEntries[phaseBlend.basePhase]?.texture ?? null;

    if (baseTexture === null) {
      return null;
    }

    if (phaseBlend.overlayPhase === null || phaseBlend.blendAmount <= 1e-4) {
      return baseTexture;
    }

    const overlayTexture =
      this.phaseEntries[phaseBlend.overlayPhase]?.texture ?? null;

    if (overlayTexture === null) {
      return baseTexture;
    }

    return (
      this.options.phaseBlendTextureResolver?.resolveBlendTexture(
        baseTexture,
        overlayTexture,
        phaseBlend.blendAmount
      ) ?? (phaseBlend.blendAmount >= 0.5 ? overlayTexture : baseTexture)
    );
  }

  clear() {
    this.currentKey = null;
    disposePhaseEntries(this.phaseEntries);

    for (const phase of SHADER_SKY_PHASES) {
      this.phaseEntries[phase] = null;
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.clear();
    this.options.disposeBuildResources?.();
  }
}

export function createRendererPrecomputedShaderSkyEnvironmentCache(
  renderer: WebGLRenderer,
  worldBackgroundRenderer: WorldBackgroundRenderer,
  options: {
    phaseBlendTextureResolver?: QuantizedEnvironmentBlendCache | null;
    captureSize?: number;
  } = {}
): PrecomputedShaderSkyEnvironmentCache {
  const builder = new RendererShaderSkyEnvironmentTextureBuilder(
    renderer,
    worldBackgroundRenderer,
    options.captureSize
  );

  return new PrecomputedShaderSkyEnvironmentCache({
    buildEnvironmentTexture: (state) => builder.build(state),
    disposeBuildResources: () => {
      builder.dispose();
    },
    phaseBlendTextureResolver: options.phaseBlendTextureResolver ?? null,
    clearPhaseBlendTextureResolver: () => {
      options.phaseBlendTextureResolver?.clear();
    }
  });
}
