import { describe, expect, it } from "vitest";

import {
  areWorldSettingsEqual,
  changeWorldBackgroundMode,
  cloneWorldSettings,
  createDefaultWorldCelestialOrbitAuthoringSettings,
  createDefaultWorldShaderSkySettings,
  createWorldCelestialOrbitSettingsFromPeakDirection,
  createDefaultWorldSettings
} from "../../src/document/world-settings";

describe("world settings helpers", () => {
  it("clones world settings without retaining nested references", () => {
    const source = createDefaultWorldSettings();
    const clone = cloneWorldSettings(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.background).not.toBe(source.background);
    expect(clone.shaderSky).not.toBe(source.shaderSky);
    expect(clone.shaderSky.celestial).not.toBe(source.shaderSky.celestial);
    expect(clone.shaderSky.clouds).not.toBe(source.shaderSky.clouds);
    expect(clone.celestialOrbits).not.toBe(source.celestialOrbits);
    expect(clone.celestialOrbits.sun).not.toBe(source.celestialOrbits.sun);
    expect(clone.sunLight.direction).not.toBe(source.sunLight.direction);
    expect(clone.advancedRendering).not.toBe(source.advancedRendering);
    expect(clone.advancedRendering.shadows).not.toBe(
      source.advancedRendering.shadows
    );
    expect(clone.advancedRendering.whiteboxBevel).not.toBe(
      source.advancedRendering.whiteboxBevel
    );
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

    const nextImageBackground = changeWorldBackgroundMode(
      imageBackground,
      "image",
      "asset-background-panorama-2"
    );

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

  it("switches into shader mode and restores the shader day gradient when switching back out", () => {
    const shaderBackground = changeWorldBackgroundMode(
      {
        mode: "verticalGradient",
        topColorHex: "#335577",
        bottomColorHex: "#99ccff"
      },
      "shader"
    );

    expect(shaderBackground).toEqual({
      mode: "shader"
    });

    const restoredGradient = changeWorldBackgroundMode(
      shaderBackground,
      "verticalGradient",
      undefined,
      undefined,
      {
        ...createDefaultWorldShaderSkySettings(),
        dayTopColorHex: "#335577",
        dayBottomColorHex: "#99ccff"
      }
    );

    expect(restoredGradient).toEqual({
      mode: "verticalGradient",
      topColorHex: "#335577",
      bottomColorHex: "#99ccff"
    });
  });

  it("compares authored world settings by value", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    expect(areWorldSettingsEqual(left, right)).toBe(true);

    right.sunLight.direction.x = right.sunLight.direction.x + 0.25;

    expect(areWorldSettingsEqual(left, right)).toBe(false);

    right.sunLight.direction.x = left.sunLight.direction.x;
    right.advancedRendering.bloom.intensity =
      right.advancedRendering.bloom.intensity + 0.1;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats water reflection mode as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.advancedRendering.waterReflectionMode = "all";

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats whitebox bevel settings as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.advancedRendering.whiteboxBevel.enabled = true;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats the scene project-time lighting toggle as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.projectTimeLightingEnabled = false;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats the celestial body toggle as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.showCelestialBodies = true;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats shader sky horizon height as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.shaderSky.horizonHeight = 0.08;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats shader sky star horizon offset as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.shaderSky.stars.horizonFadeOffset = 0.08;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("treats celestial orbit settings as part of authored world equality", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    right.celestialOrbits.moon.azimuthDegrees =
      right.celestialOrbits.moon.azimuthDegrees + 12;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });

  it("derives default celestial orbit settings from a legacy sun direction", () => {
    const direction = {
      x: -0.6,
      y: 1,
      z: 0.35
    };
    const defaults =
      createDefaultWorldCelestialOrbitAuthoringSettings(direction);
    const derivedSunOrbit =
      createWorldCelestialOrbitSettingsFromPeakDirection(direction);

    expect(defaults.sun).toEqual(derivedSunOrbit);
    expect(defaults.moon).toEqual(derivedSunOrbit);
  });
});
