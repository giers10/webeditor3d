import { Texture } from "three";
import { describe, expect, it, vi } from "vitest";

import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { resolveWorldEnvironmentState } from "../../src/rendering/world-background-renderer";

describe("resolveWorldEnvironmentState", () => {
  it("keeps the authored day environment when no night overlay is active", () => {
    const world = createDefaultWorldSettings();
    const dayTexture = new Texture();
    world.background = {
      mode: "image",
      assetId: "asset-day-sky",
      environmentIntensity: 0.65
    };

    expect(
      resolveWorldEnvironmentState(world.background, dayTexture, null)
    ).toEqual({
      texture: dayTexture,
      intensity: 0.65
    });
  });

  it("keeps environment lighting energy during a day-to-night crossfade", () => {
    const world = createDefaultWorldSettings();
    const dayTexture = new Texture();
    const nightTexture = new Texture();
    world.background = {
      mode: "image",
      assetId: "asset-day-sky",
      environmentIntensity: 0.4
    };

    const earlyTwilight = resolveWorldEnvironmentState(world.background, dayTexture, {
      texture: nightTexture,
      opacity: 0.25,
      environmentIntensity: 0.8
    });
    const lateTwilight = resolveWorldEnvironmentState(world.background, dayTexture, {
      texture: nightTexture,
      opacity: 0.75,
      environmentIntensity: 0.8
    });

    expect(earlyTwilight.texture).toBe(dayTexture);
    expect(earlyTwilight.intensity).toBeCloseTo(0.5);
    expect(lateTwilight.texture).toBe(dayTexture);
    expect(lateTwilight.intensity).toBeCloseTo(0.7);
  });

  it("uses a cached blended environment texture during partial image-image twilight blends", () => {
    const world = createDefaultWorldSettings();
    const dayTexture = new Texture();
    const nightTexture = new Texture();
    const blendedTexture = new Texture();
    const environmentBlendTextureResolver = {
      resolveBlendTexture: vi.fn().mockReturnValue(blendedTexture)
    };
    world.background = {
      mode: "image",
      assetId: "asset-day-sky",
      environmentIntensity: 0.45
    };

    const twilight = resolveWorldEnvironmentState(
      world.background,
      dayTexture,
      {
        texture: nightTexture,
        opacity: 0.5,
        environmentIntensity: 0.85
      },
      environmentBlendTextureResolver
    );

    expect(
      environmentBlendTextureResolver.resolveBlendTexture
    ).toHaveBeenCalledWith(dayTexture, nightTexture, 0.5);
    expect(twilight.texture).toBe(blendedTexture);
    expect(twilight.intensity).toBeCloseTo(0.65);
  });

  it("falls back to the existing single-texture environment while a blended bucket is unavailable", () => {
    const world = createDefaultWorldSettings();
    const dayTexture = new Texture();
    const nightTexture = new Texture();
    const environmentBlendTextureResolver = {
      resolveBlendTexture: vi.fn().mockReturnValue(null)
    };
    world.background = {
      mode: "image",
      assetId: "asset-day-sky",
      environmentIntensity: 0.45
    };

    const twilight = resolveWorldEnvironmentState(
      world.background,
      dayTexture,
      {
        texture: nightTexture,
        opacity: 0.5,
        environmentIntensity: 0.85
      },
      environmentBlendTextureResolver
    );

    expect(twilight.texture).toBe(dayTexture);
    expect(twilight.intensity).toBeCloseTo(0.65);
  });

  it("fades the night environment in when the authored day background has no image environment", () => {
    const world = createDefaultWorldSettings();
    const nightTexture = new Texture();

    expect(
      resolveWorldEnvironmentState(world.background, null, {
        texture: nightTexture,
        opacity: 0.5,
        environmentIntensity: 0.7
      })
    ).toEqual({
      texture: nightTexture,
      intensity: 0.35
    });
  });
});
