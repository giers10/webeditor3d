import { describe, expect, it } from "vitest";

import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { resolveBoxVolumeRenderPaths } from "../../src/rendering/advanced-rendering";

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
