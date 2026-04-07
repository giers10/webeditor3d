import { PerspectiveCamera, Scene, UnsignedByteType } from "three";
import { describe, expect, it, vi } from "vitest";

const postprocessingState = vi.hoisted(() => ({
  composerOptions: [] as Array<Record<string, unknown>>,
  composerPasses: [] as unknown[],
  normalPassTextures: [] as unknown[],
  ssaoCalls: [] as Array<{ normalBuffer: unknown; options: Record<string, unknown> }>
}));

vi.mock("postprocessing", () => {
  class MockEffectComposer {
    constructor(_renderer: unknown, options: Record<string, unknown>) {
      postprocessingState.composerOptions.push(options);
    }

    addPass(pass: unknown) {
      postprocessingState.composerPasses.push(pass);
    }
  }

  class MockRenderPass {
    constructor(_scene: unknown, _camera: unknown) {}
  }

  class MockNormalPass {
    texture: Record<string, unknown>;

    constructor(_scene: unknown, _camera: unknown) {
      this.texture = {
        kind: "normal-pass-texture",
        index: postprocessingState.normalPassTextures.length
      };
      postprocessingState.normalPassTextures.push(this.texture);
    }
  }

  class MockEffectPass {
    constructor(_camera: unknown, ..._effects: unknown[]) {}
  }

  class MockSSAOEffect {
    constructor(_camera: unknown, normalBuffer: unknown, options: Record<string, unknown>) {
      postprocessingState.ssaoCalls.push({ normalBuffer, options });
    }
  }

  class MockBloomEffect {
    constructor(_options: Record<string, unknown>) {}
  }

  class MockDepthOfFieldEffect {
    constructor(_camera: unknown, _options: Record<string, unknown>) {}
  }

  class MockToneMappingEffect {
    constructor(_options: Record<string, unknown>) {}
  }

  class MockSMAAEffect {
    constructor(_options: Record<string, unknown>) {}
  }

  return {
    BloomEffect: MockBloomEffect,
    DepthOfFieldEffect: MockDepthOfFieldEffect,
    EffectComposer: MockEffectComposer,
    EffectPass: MockEffectPass,
    NormalPass: MockNormalPass,
    RenderPass: MockRenderPass,
    SMAAEffect: MockSMAAEffect,
    SMAAPreset: {
      MEDIUM: "medium"
    },
    SSAOEffect: MockSSAOEffect,
    ToneMappingEffect: MockToneMappingEffect,
    ToneMappingMode: {
      ACES_FILMIC: "ACES_FILMIC",
      CINEON: "CINEON",
      LINEAR: "LINEAR",
      REINHARD: "REINHARD"
    }
  };
});

import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { createAdvancedRenderingComposer, resolveBoxVolumeRenderPaths } from "../../src/rendering/advanced-rendering";

describe("resolveBoxVolumeRenderPaths", () => {
  it("uses authored fog and water paths when advanced rendering is enabled", () => {
    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.fogPath = "quality";
    settings.waterPath = "performance";

    expect(resolveBoxVolumeRenderPaths(settings)).toEqual({
      fog: "quality",
      water: "performance"
    });
  });

  it("falls back to performance paths when advanced rendering is disabled", () => {
    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = false;
    settings.fogPath = "quality";
    settings.waterPath = "quality";

    expect(resolveBoxVolumeRenderPaths(settings)).toEqual({
      fog: "performance",
      water: "performance"
    });
  });
});

describe("createAdvancedRenderingComposer", () => {
  it("keeps depth buffering enabled when the post stack only uses color effects", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.ambientOcclusion.enabled = false;
    settings.depthOfField.enabled = false;

    createAdvancedRenderingComposer(
      {
        capabilities: {
          isWebGL2: false
        }
      } as unknown as never,
      new Scene(),
      new PerspectiveCamera(),
      settings
    );

    expect(postprocessingState.composerOptions).toHaveLength(1);
    expect(postprocessingState.composerOptions[0]).toMatchObject({
      depthBuffer: true,
      frameBufferType: UnsignedByteType
    });
    expect(postprocessingState.ssaoCalls).toHaveLength(0);
  });

  it("builds a dual-layer SSAO stack from one normal pass", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.ambientOcclusion.enabled = true;
    settings.ambientOcclusion.samples = 8;
    settings.ambientOcclusion.radius = 0.5;
    settings.ambientOcclusion.intensity = 0.85;

    createAdvancedRenderingComposer(
      {
        capabilities: {
          isWebGL2: true
        }
      } as unknown as never,
      new Scene(),
      new PerspectiveCamera(),
      settings
    );

    expect(postprocessingState.normalPassTextures).toHaveLength(1);
    expect(postprocessingState.ssaoCalls).toHaveLength(2);
    expect(postprocessingState.ssaoCalls[0]).toMatchObject({
      normalBuffer: postprocessingState.normalPassTextures[0],
      options: {
        depthAwareUpsampling: true,
        luminanceInfluence: 0.15,
        samples: 12,
        radius: 0.2,
        intensity: 0.3825,
        resolutionScale: 0.5
      }
    });
    expect(postprocessingState.ssaoCalls[1]).toMatchObject({
      normalBuffer: postprocessingState.normalPassTextures[0],
      options: {
        depthAwareUpsampling: true,
        luminanceInfluence: 0.15,
        samples: 12,
        radius: 0.07,
        intensity: 0.2975,
        resolutionScale: 0.75
      }
    });
  });
});
