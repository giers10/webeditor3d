import { Texture } from "three";
import { describe, expect, it } from "vitest";

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

    expect(
      resolveWorldEnvironmentState(world.background, dayTexture, {
        texture: nightTexture,
        opacity: 0.25,
        environmentIntensity: 0.8
      })
    ).toEqual({
      texture: dayTexture,
      intensity: 0.5
    });

    expect(
      resolveWorldEnvironmentState(world.background, dayTexture, {
        texture: nightTexture,
        opacity: 0.75,
        environmentIntensity: 0.8
      })
    ).toEqual({
      texture: nightTexture,
      intensity: 0.7000000000000001
    });
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
