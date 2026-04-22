import { describe, expect, it } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { resolveWorldShaderSkyRenderState } from "../../src/rendering/world-shader-sky";
import {
  resolveRuntimeDayNightWorldState,
  resolveRuntimeTimeState
} from "../../src/runtime-three/runtime-project-time";

describe("resolveWorldShaderSkyRenderState", () => {
  it("blends authored day, dawn, dusk, and night color bases continuously", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    world.showCelestialBodies = true;
    world.shaderSky.dayTopColorHex = "#88ccff";
    world.shaderSky.dayBottomColorHex = "#dff3ff";
    world.shaderSky.horizonHeight = -0.08;
    world.timeOfDay.dawn.background = {
      mode: "verticalGradient",
      topColorHex: "#ff8855",
      bottomColorHex: "#ffd4a8"
    };
    world.timeOfDay.dusk.background = {
      mode: "verticalGradient",
      topColorHex: "#5e62c8",
      bottomColorHex: "#ff9966"
    };
    world.timeOfDay.night.background = {
      mode: "verticalGradient",
      topColorHex: "#04101d",
      bottomColorHex: "#17263b"
    };
    time.sunriseTimeOfDayHours = 7;
    time.sunsetTimeOfDayHours = 20;
    time.dawnDurationHours = 2;
    time.duskDurationHours = 2;

    const dawnTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 6.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const dawnWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 6.5,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      dawnTime
    );
    const noonTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 12,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const noonWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 12,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      noonTime
    );
    const midnightTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const midnightWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 0,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      midnightTime
    );

    const dawnSky = resolveWorldShaderSkyRenderState(
      world,
      dawnWorld,
      dawnTime,
      time
    );
    const noonSky = resolveWorldShaderSkyRenderState(
      world,
      noonWorld,
      noonTime,
      time
    );
    const midnightSky = resolveWorldShaderSkyRenderState(
      world,
      midnightWorld,
      midnightTime,
      time
    );

    expect(dawnSky).not.toBeNull();
    expect(noonSky?.sky.topColorHex).toBe("#88ccff");
    expect(noonSky?.sky.bottomColorHex).toBe("#dff3ff");
    expect(noonSky?.sky.horizonHeight).toBe(-0.08);
    expect(dawnSky?.sky.topColorHex).not.toBe(noonSky?.sky.topColorHex);
    expect(dawnSky?.sky.topColorHex).not.toBe(midnightSky?.sky.topColorHex);
    expect(midnightSky?.stars.visibility ?? 0).toBeGreaterThan(
      dawnSky?.stars.visibility ?? 0
    );
    expect(dawnSky?.stars.visibility ?? 0).toBeGreaterThan(0);
    expect(noonSky?.stars.visibility ?? 1).toBe(0);
  });

  it("keeps shader sky drift and celestial visibility coherent across days", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    world.showCelestialBodies = true;

    const firstNightTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const firstNightWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 0,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      firstNightTime
    );
    const secondNightTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 0,
      dayCount: 1,
      dayLengthMinutes: 24
    });
    const secondNightWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 0,
        dayCount: 1,
        dayLengthMinutes: 24
      },
      secondNightTime
    );

    const firstNightSky = resolveWorldShaderSkyRenderState(
      world,
      firstNightWorld,
      firstNightTime,
      time
    );
    const secondNightSky = resolveWorldShaderSkyRenderState(
      world,
      secondNightWorld,
      secondNightTime,
      time
    );

    expect(firstNightSky?.celestial.sunVisible).toBe(false);
    expect(firstNightSky?.celestial.moonVisible).toBe(true);
    expect(secondNightSky?.clouds.driftOffset.x).not.toBeCloseTo(
      firstNightSky?.clouds.driftOffset.x ?? 0
    );
  });
});
