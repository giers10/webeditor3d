import { describe, expect, it } from "vitest";

import { createDefaultWorldSettings } from "../../src/document/scene-document";
import { areWorldSettingsEqual, changeWorldBackgroundMode, cloneWorldSettings } from "../../src/document/world-settings";

describe("world settings helpers", () => {
  it("clones world settings without retaining nested references", () => {
    const source = createDefaultWorldSettings();
    const clone = cloneWorldSettings(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.background).not.toBe(source.background);
    expect(clone.sunLight.direction).not.toBe(source.sunLight.direction);
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

  it("compares authored world settings by value", () => {
    const left = createDefaultWorldSettings();
    const right = cloneWorldSettings(left);

    expect(areWorldSettingsEqual(left, right)).toBe(true);

    right.sunLight.direction.x = right.sunLight.direction.x + 0.25;

    expect(areWorldSettingsEqual(left, right)).toBe(false);
  });
});
