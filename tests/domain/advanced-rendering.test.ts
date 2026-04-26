import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  UnsignedByteType
} from "three";
import { describe, expect, it, vi } from "vitest";

const postprocessingState = vi.hoisted(() => ({
  composerOptions: [] as Array<Record<string, unknown>>,
  composerPasses: [] as unknown[],
  normalPassTextures: [] as unknown[],
  ssaoCalls: [] as Array<{ normalBuffer: unknown; options: Record<string, unknown> }>
}));

vi.mock("postprocessing", () => {
  class MockPass {
    name: string;
    needsSwap = true;

    constructor(name = "Pass") {
      this.name = name;
    }
  }

  class MockEffectComposer {
    constructor(_renderer: unknown, options: Record<string, unknown>) {
      postprocessingState.composerOptions.push(options);
    }

    addPass(pass: unknown) {
      postprocessingState.composerPasses.push(pass);
    }
  }

  class MockRenderPass extends MockPass {
    clear = true;
    ignoreBackground = false;
    skipShadowMapUpdate = false;

    constructor(
      readonly scene: unknown,
      readonly camera: unknown,
      readonly overrideMaterial: unknown = null
    ) {
      super("RenderPass");
    }

    render() {}
  }

  class MockNormalPass extends MockPass {
    texture: Record<string, unknown>;

    constructor(_scene: unknown, _camera: unknown) {
      super("NormalPass");
      this.texture = {
        kind: "normal-pass-texture",
        index: postprocessingState.normalPassTextures.length
      };
      postprocessingState.normalPassTextures.push(this.texture);
    }

    render() {}
  }

  class MockEffectPass extends MockPass {
    constructor(readonly camera: unknown, ...readonly effects: unknown[]) {
      super("EffectPass");
    }
  }

  class MockCopyMaterial {
    kind = "copy-material";
  }

  class MockShaderPass extends MockPass {
    constructor(readonly material: unknown) {
      super("ShaderPass");
    }
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
    CopyMaterial: MockCopyMaterial,
    DepthOfFieldEffect: MockDepthOfFieldEffect,
    EffectComposer: MockEffectComposer,
    EffectPass: MockEffectPass,
    NormalPass: MockNormalPass,
    Pass: MockPass,
    RenderPass: MockRenderPass,
    ShaderPass: MockShaderPass,
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
import {
  applyAdvancedRenderingRenderableShadowFlags,
  createAdvancedRenderingComposer,
  resolveBoxVolumeRenderPaths
} from "../../src/rendering/advanced-rendering";
import {
  applyWhiteboxBevelToMaterial,
  shouldApplyWhiteboxBevel
} from "../../src/rendering/whitebox-bevel-material";

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
        intensity: 0.2975,
        resolutionScale: 0.75
      }
    });
    expect(postprocessingState.ssaoCalls[1].options.radius).toBeCloseTo(0.07, 6);
  });
});

describe("whitebox bevel materials", () => {
  it("only applies when advanced rendering and the effect are both enabled", () => {
    const settings = createDefaultWorldSettings().advancedRendering;

    expect(shouldApplyWhiteboxBevel(settings)).toBe(false);

    settings.enabled = true;
    settings.whiteboxBevel.enabled = true;

    expect(shouldApplyWhiteboxBevel(settings)).toBe(true);
  });

  it("injects face-space bevel shading into standard materials", () => {
    const material = new MeshStandardMaterial();

    applyWhiteboxBevelToMaterial(material, {
      enabled: true,
      edgeWidth: 0.18,
      normalStrength: 0.9
    });

    const shader = {
      vertexShader: "#include <common>\n#include <uv_vertex>\n",
      fragmentShader: "#include <common>\n#include <normal_fragment_maps>\n"
    };

    material.onBeforeCompile(shader as never, {} as never);

    expect(shader.vertexShader).toContain("attribute vec2 faceUv;");
    expect(shader.vertexShader).toContain("vWhiteboxFaceUv = faceUv;");
    expect(shader.fragmentShader).toContain("varying vec2 vWhiteboxFaceUv;");
    expect(shader.fragmentShader).toContain("whiteboxBevelMask");
    expect(material.customProgramCacheKey?.()).toContain("whitebox-bevel:");
  });
});

describe("advanced rendering shadow flags", () => {
  it("only enables shadows for opaque renderable meshes", () => {
    const group = new Group();
    const opaqueMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    const transparentMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({
        transparent: true,
        opacity: 0.4
      })
    );
    const ignoredMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    ignoredMesh.userData.shadowIgnored = true;

    group.add(opaqueMesh);
    group.add(transparentMesh);
    group.add(ignoredMesh);

    applyAdvancedRenderingRenderableShadowFlags(group, true);

    expect(opaqueMesh.castShadow).toBe(true);
    expect(opaqueMesh.receiveShadow).toBe(true);
    expect(transparentMesh.castShadow).toBe(false);
    expect(transparentMesh.receiveShadow).toBe(false);
    expect(ignoredMesh.castShadow).toBe(false);
    expect(ignoredMesh.receiveShadow).toBe(false);

    applyAdvancedRenderingRenderableShadowFlags(group, false);

    expect(opaqueMesh.castShadow).toBe(false);
    expect(opaqueMesh.receiveShadow).toBe(false);
  });
});
