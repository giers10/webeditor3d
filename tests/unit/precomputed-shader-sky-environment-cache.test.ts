import { Texture } from "three";
import { describe, expect, it, vi } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { PrecomputedShaderSkyEnvironmentCache } from "../../src/rendering/precomputed-shader-sky-environment-cache";
import {
  resolveWorldShaderSkyEnvironmentPhaseStates,
  resolveWorldShaderSkyRenderState
} from "../../src/rendering/world-shader-sky";
import {
  resolveRuntimeDayNightWorldState,
  resolveRuntimeTimeState
} from "../../src/runtime-three/runtime-project-time";

describe("PrecomputedShaderSkyEnvironmentCache", () => {
  it("builds representative shader environment textures once per phase-cache key", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    const buildEnvironmentTexture = vi.fn(() => ({
      texture: new Texture(),
      dispose: vi.fn()
    }));
    const cache = new PrecomputedShaderSkyEnvironmentCache({
      buildEnvironmentTexture
    });
    const states = resolveWorldShaderSkyEnvironmentPhaseStates(world, time);

    cache.syncPhaseTextures(states);
    cache.syncPhaseTextures(states);

    expect(buildEnvironmentTexture).toHaveBeenCalledTimes(4);
  });

  it("blends between the active precomputed phase textures during twilight", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    const buildOrder: string[] = [];
    const phaseTextures: Record<"day" | "dawn" | "dusk" | "night", Texture> = {
      day: new Texture(),
      dawn: new Texture(),
      dusk: new Texture(),
      night: new Texture()
    };
    const blendedTexture = new Texture();
    time.sunriseTimeOfDayHours = 7;
    time.sunsetTimeOfDayHours = 20;
    time.dawnDurationHours = 2;
    time.duskDurationHours = 2;
    world.background = {
      mode: "shader"
    };
    const cache = new PrecomputedShaderSkyEnvironmentCache({
      buildEnvironmentTexture: vi.fn((state) => {
        buildOrder.push(state.time.dayPhase);
        return {
          texture: phaseTextures[state.time.dayPhase],
          dispose: vi.fn()
        };
      }),
      phaseBlendTextureResolver: {
        resolveBlendTexture: vi.fn().mockReturnValue(blendedTexture)
      }
    });
    const noonTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 7.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const noonWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 7.5,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      noonTime
    );
    const twilightSky = resolveWorldShaderSkyRenderState(
      world,
      noonWorld,
      noonTime,
      time
    );
    const states = resolveWorldShaderSkyEnvironmentPhaseStates(world, time);

    cache.syncPhaseTextures(states);

    expect(buildOrder).toEqual(["day", "dawn", "dusk", "night"]);
    expect(cache.resolveEnvironmentTexture(twilightSky!)).toBe(blendedTexture);
  });
});
