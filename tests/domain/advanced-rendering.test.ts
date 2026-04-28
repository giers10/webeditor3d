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
  ssaoCalls: [] as Array<{
    normalBuffer: unknown;
    options: Record<string, unknown>;
  }>
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
    readonly effects: unknown[];

    constructor(
      readonly camera: unknown,
      ...effects: unknown[]
    ) {
      super("EffectPass");
      this.effects = effects;
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
    constructor(
      _camera: unknown,
      normalBuffer: unknown,
      options: Record<string, unknown>
    ) {
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
  applyAdvancedRenderingPerspectiveCameraFar,
  resolveAdvancedRenderingPerspectiveCameraFar,
  resolveDistanceFogParameters
} from "../../src/rendering/distance-fog-pass";
import {
  createScreenSpaceGodRaysLightSource,
  projectScreenSpaceGodRaysLight,
  resolveGodRaysParameters,
  syncScreenSpaceGodRaysLightSource
} from "../../src/rendering/screen-space-god-rays";
import { resolveDynamicGlobalIlluminationParameters } from "../../src/rendering/screen-space-global-illumination";
import {
  ALL_RENDER_LAYER_MASK,
  AO_WORLD_RENDER_LAYER_MASK,
  OVERLAY_RENDER_LAYER_MASK,
  POST_AO_TRANSPARENT_RENDER_LAYER_MASK,
  applyRendererRenderCategory,
  applyRendererRenderCategoryFromMaterial,
  enableCameraRendererRenderCategories
} from "../../src/rendering/render-layers";
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

describe("resolveDynamicGlobalIlluminationParameters", () => {
  it("uses bounded low-cost parameters by default", () => {
    const settings =
      createDefaultWorldSettings().advancedRendering.dynamicGlobalIllumination;
    settings.enabled = true;

    expect(resolveDynamicGlobalIlluminationParameters(settings)).toMatchObject({
      enabled: true,
      intensity: 1.25,
      radius: 3.5,
      quality: "low",
      sliceCount: 1,
      stepCount: 6,
      maxLuminance: 7
    });
  });

  it("clamps authored intensity and radius to bounded renderer values", () => {
    const settings =
      createDefaultWorldSettings().advancedRendering.dynamicGlobalIllumination;
    settings.enabled = true;
    settings.intensity = 25;
    settings.radius = 100;
    settings.quality = "medium";

    expect(resolveDynamicGlobalIlluminationParameters(settings)).toMatchObject({
      enabled: true,
      intensity: 4,
      radius: 8,
      quality: "medium",
      sliceCount: 2,
      stepCount: 8
    });
  });

  it("disables the pass when the authored intensity is zero", () => {
    const settings =
      createDefaultWorldSettings().advancedRendering.dynamicGlobalIllumination;
    settings.enabled = true;
    settings.intensity = 0;

    expect(resolveDynamicGlobalIlluminationParameters(settings).enabled).toBe(
      false
    );
  });
});

describe("distance fog parameters", () => {
  it("keeps the pass disabled by default", () => {
    const settings = createDefaultWorldSettings().advancedRendering;

    expect(resolveDistanceFogParameters(settings.distanceFog)).toMatchObject({
      enabled: false
    });
    expect(
      resolveAdvancedRenderingPerspectiveCameraFar(settings, 1000, 0.1)
    ).toBe(1000);
  });

  it("resolves a bounded fog range and perspective render-distance clamp", () => {
    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.distanceFog = {
      enabled: true,
      colorHex: "#aabbcc",
      nearDistance: 40,
      farDistance: 400,
      strength: 2,
      renderDistance: 180
    };

    expect(resolveDistanceFogParameters(settings.distanceFog)).toMatchObject({
      enabled: true,
      colorHex: "#aabbcc",
      nearDistance: 40,
      farDistance: 180,
      strength: 1,
      renderDistance: 180
    });
    expect(
      resolveAdvancedRenderingPerspectiveCameraFar(settings, 1000, 0.1)
    ).toBe(180);
  });

  it("applies and resets the perspective camera far clamp", () => {
    const settings = createDefaultWorldSettings().advancedRendering;
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    settings.enabled = true;
    settings.distanceFog.enabled = true;
    settings.distanceFog.renderDistance = 125;

    expect(
      applyAdvancedRenderingPerspectiveCameraFar(camera, settings, 1000)
    ).toBe(true);
    expect(camera.far).toBe(125);

    settings.distanceFog.enabled = false;

    expect(
      applyAdvancedRenderingPerspectiveCameraFar(camera, settings, 1000)
    ).toBe(true);
    expect(camera.far).toBe(1000);
  });
});

describe("god rays parameters", () => {
  it("keeps the pass disabled by default", () => {
    const settings = createDefaultWorldSettings().advancedRendering;

    expect(resolveGodRaysParameters(settings.godRays)).toMatchObject({
      enabled: false
    });
  });

  it("resolves bounded screen-space shaft parameters", () => {
    const settings = createDefaultWorldSettings().advancedRendering.godRays;
    settings.enabled = true;
    settings.intensity = 12;
    settings.decay = 1.5;
    settings.exposure = 6;
    settings.density = 3;
    settings.samples = 999;

    expect(resolveGodRaysParameters(settings)).toEqual({
      enabled: true,
      intensity: 3,
      decay: 1,
      exposure: 2,
      density: 1.5,
      samples: 64
    });
  });

  it("syncs the active celestial light source", () => {
    const lightSource = createScreenSpaceGodRaysLightSource();

    syncScreenSpaceGodRaysLightSource(lightSource, {
      colorHex: "#ffd8aa",
      intensity: 1.6,
      direction: {
        x: 0.1,
        y: 0.8,
        z: -0.2
      }
    });

    expect(lightSource).toEqual({
      colorHex: "#ffd8aa",
      intensity: 1.6,
      direction: {
        x: 0.1,
        y: 0.8,
        z: -0.2
      }
    });

    syncScreenSpaceGodRaysLightSource(lightSource, {
      colorHex: "#ffd8aa",
      intensity: 0,
      direction: {
        x: 0.1,
        y: 0.8,
        z: -0.2
      }
    });

    expect(lightSource).toEqual({
      colorHex: "#ffffff",
      intensity: 0,
      direction: null
    });
  });

  it("projects the celestial light direction and rejects behind-camera lights", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);

    const projection = projectScreenSpaceGodRaysLight(camera, {
      colorHex: "#ffffff",
      intensity: 1,
      direction: {
        x: 0,
        y: 0,
        z: -1
      }
    });

    expect(projection?.screenPosition.x).toBeCloseTo(0.5, 6);
    expect(projection?.screenPosition.y).toBeCloseTo(0.5, 6);
    expect(projection?.visibility).toBeCloseTo(1, 6);

    expect(
      projectScreenSpaceGodRaysLight(camera, {
        colorHex: "#ffffff",
        intensity: 1,
        direction: {
          x: 0,
          y: 0,
          z: 1
        }
      })
    ).toBeNull();
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
    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual(["RenderPass", "EffectPass"]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(ALL_RENDER_LAYER_MASK);
    expect(postprocessingState.ssaoCalls).toHaveLength(0);
  });

  it("adds distance fog before post-world overlay layers", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.distanceFog.enabled = true;

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

    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual([
      "RenderPass",
      "DistanceFogPass",
      "RenderPass",
      "RenderPass",
      "EffectPass"
    ]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[1] as { needsDepthTexture?: boolean })
        .needsDepthTexture
    ).toBe(true);
    expect(
      (postprocessingState.composerPasses[2] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(POST_AO_TRANSPARENT_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[3] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(OVERLAY_RENDER_LAYER_MASK);
  });

  it("adds god rays before post-world overlay layers when a celestial light source is available", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    const lightSource = createScreenSpaceGodRaysLightSource();
    settings.enabled = true;
    settings.godRays.enabled = true;
    syncScreenSpaceGodRaysLightSource(lightSource, {
      colorHex: "#fff3cc",
      intensity: 1,
      direction: {
        x: 0,
        y: 0.25,
        z: -1
      }
    });

    createAdvancedRenderingComposer(
      {
        capabilities: {
          isWebGL2: true
        }
      } as unknown as never,
      new Scene(),
      new PerspectiveCamera(),
      settings,
      null,
      lightSource
    );

    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual([
      "RenderPass",
      "ScreenSpaceGodRaysPass",
      "RenderPass",
      "RenderPass",
      "EffectPass"
    ]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[1] as { needsDepthTexture?: boolean })
        .needsDepthTexture
    ).toBe(true);
    expect(
      (postprocessingState.composerPasses[2] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(POST_AO_TRANSPARENT_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[3] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(OVERLAY_RENDER_LAYER_MASK);
  });

  it("does not add god rays when the feature is enabled without a light source", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.godRays.enabled = true;

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

    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual(["RenderPass", "EffectPass"]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(ALL_RENDER_LAYER_MASK);
  });

  it("adds the dynamic GI pass only when dynamic GI is enabled", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.dynamicGlobalIllumination.enabled = true;

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
    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual([
      "RenderPass",
      "NormalPass",
      "ScreenSpaceGlobalIlluminationPass",
      "ShaderPass",
      "RenderPass",
      "RenderPass",
      "EffectPass"
    ]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[2] as { needsDepthTexture?: boolean })
        .needsDepthTexture
    ).toBe(true);
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
    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual([
      "RenderPass",
      "NormalPass",
      "EffectPass",
      "ShaderPass",
      "RenderPass",
      "RenderPass",
      "EffectPass"
    ]);
    expect(
      (postprocessingState.composerPasses[0] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[1] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[4] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(POST_AO_TRANSPARENT_RENDER_LAYER_MASK);
    expect(
      (postprocessingState.composerPasses[5] as { renderLayerMask?: number })
        .renderLayerMask
    ).toBe(OVERLAY_RENDER_LAYER_MASK);
    expect(
      postprocessingState.composerPasses[4] as {
        clear?: boolean;
        ignoreBackground?: boolean;
        skipShadowMapUpdate?: boolean;
      }
    ).toMatchObject({
      clear: false,
      ignoreBackground: true,
      skipShadowMapUpdate: true
    });
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
    expect(postprocessingState.ssaoCalls[1].options.radius).toBeCloseTo(
      0.07,
      6
    );
  });

  it("shares one normal pass between SSAO and dynamic GI", () => {
    postprocessingState.composerOptions.length = 0;
    postprocessingState.composerPasses.length = 0;
    postprocessingState.normalPassTextures.length = 0;
    postprocessingState.ssaoCalls.length = 0;

    const settings = createDefaultWorldSettings().advancedRendering;
    settings.enabled = true;
    settings.ambientOcclusion.enabled = true;
    settings.dynamicGlobalIllumination.enabled = true;

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
    expect(
      postprocessingState.composerPasses.map(
        (pass) => (pass as { name: string }).name
      )
    ).toEqual([
      "RenderPass",
      "NormalPass",
      "ScreenSpaceGlobalIlluminationPass",
      "EffectPass",
      "ShaderPass",
      "RenderPass",
      "RenderPass",
      "EffectPass"
    ]);
    expect(postprocessingState.ssaoCalls).toHaveLength(2);
    expect(postprocessingState.ssaoCalls[0].normalBuffer).toBe(
      postprocessingState.normalPassTextures[0]
    );
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

describe("renderer render layers", () => {
  it("enables all renderer categories on cameras used by direct rendering", () => {
    const camera = new PerspectiveCamera();

    enableCameraRendererRenderCategories(camera);

    expect(camera.layers.mask).toBe(ALL_RENDER_LAYER_MASK);
  });

  it("categorizes opaque renderables separately from transparent effects", () => {
    const group = new Group();
    const opaqueMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    const transparentMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0.35
      })
    );

    group.add(opaqueMesh);
    group.add(transparentMesh);

    applyRendererRenderCategoryFromMaterial(group);

    expect(opaqueMesh.layers.mask).toBe(AO_WORLD_RENDER_LAYER_MASK);
    expect(transparentMesh.layers.mask).toBe(
      POST_AO_TRANSPARENT_RENDER_LAYER_MASK
    );
  });

  it("marks helper subtrees as overlay-only renderables", () => {
    const helperGroup = new Group();
    const helperMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );

    helperGroup.add(helperMesh);
    applyRendererRenderCategory(helperGroup, "overlay");

    expect(helperGroup.layers.mask).toBe(OVERLAY_RENDER_LAYER_MASK);
    expect(helperMesh.layers.mask).toBe(OVERLAY_RENDER_LAYER_MASK);
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
