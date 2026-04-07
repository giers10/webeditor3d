import { describe, expect, it } from "vitest";

import {
  areWorldSettingsEqual,
  changeWorldBackgroundMode,
  cloneWorldSettings,
  createDefaultWorldSettings
} from "../../src/document/world-settings";

describe("world settings helpers", () => {
  it("clones world settings without retaining nested references", () => {
    const source = createDefaultWorldSettings();
    const clone = cloneWorldSettings(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.background).not.toBe(source.background);
    expect(clone.sunLight.direction).not.toBe(source.sunLight.direction);
    expect(clone.advancedRendering).not.toBe(source.advancedRendering);
    expect(clone.advancedRendering.shadows).not.toBe(source.advancedRendering.shadows);
  });

  it("switches a solid background into a gradient while preserving the authored color as the top edge", () => {
    const gradient = changeWorldBackgroundMode(
      {
        mode: "solid",
        colorHex: "#334455"
      },
      "verticalGradient"
    );

    expect(gradient).toEqual({
      mode: "verticalGradient",
      topColorHex: "#334455",
      bottomColorHex: "#141a22"
    });
  });

  it("switches and clones image backgrounds by asset id", () => {
    const imageBackground = changeWorldBackgroundMode(
      {
        mode: "solid",
        colorHex: "#334455"
      },
      "image",
      "asset-background-panorama"
    );

    expect(imageBackground).toEqual({
      mode: "image",
      assetId: "asset-background-panorama",
      environmentIntensity: 0.5
    });

    const nextImageBackground = changeWorldBackgroundMode(imageBackground, "image", "asset-background-panorama-2");

    expect(nextImageBackground).toEqual({
      mode: "image",
      assetId: "asset-background-panorama-2",
      environmentIntensity: 0.5
    });

    const world = createDefaultWorldSettings();
    world.background = nextImageBackground;

    const clonedWorld = cloneWorldSettings(world);

    expect(clonedWorld.background).toEqual(nextImageBackground);
    expect(clonedWorld.background).not.toBe(world.background);
    expect(areWorldSettingsEqual(world, clonedWorld)).toBe(true);
  });

  it("compares authored world settings by value", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    expect(areWorldSettingsEqual(left, right)).toBe(true);

    right.sunLight.direction.x = right.sunLight.direction.x + 0.25;

    expect(areWorldSettingsEqual(left, right)).toBe(false);

    right.sunLight.direction.x = left.sunLight.direction.x;
    right.advancedRendering.bloom.intensity = right.advancedRendering.bloom.intensity + 0.1;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats water reflection mode as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.advancedRendering.waterReflectionMode = "all";

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });
});
