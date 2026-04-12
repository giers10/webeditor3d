import { describe, expect, it } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  advanceRuntimeClockState,
  createRuntimeClockState,
  resolveRuntimeDayNightWorldState
} from "../../src/runtime-three/runtime-project-time";

describe("runtime project time", () => {
  it("advances and wraps the global clock using the authored day duration", () => {
    const settings = createDefaultProjectTimeSettings();
    settings.startDayNumber = 3;
    settings.startTimeOfDayHours = 23.5;
    settings.dayLengthMinutes = 24;
    const clock = createRuntimeClockState(settings);

    const advancedClock = advanceRuntimeClockState(clock, 60);

    expect(advancedClock.timeOfDayHours).toBeCloseTo(0.5);
    expect(advancedClock.dayCount).toBe(3);
    expect(advancedClock.dayLengthMinutes).toBe(24);
  });

  it("derives authored dawn, day, and night lighting from the global time profile", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "verticalGradient",
      topColorHex: "#88ccff",
      bottomColorHex: "#f2b774"
    };
    time.sunriseTimeOfDayHours = 7;
    time.sunsetTimeOfDayHours = 20;
    time.dawnDurationHours = 2;
    time.duskDurationHours = 2;

    const noon = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 12,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const dawn = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 6.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const midnight = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });

    expect(midnight.sunLight.intensity).toBeLessThan(noon.sunLight.intensity);
    expect(midnight.ambientLight.intensity).toBeLessThan(
      noon.ambientLight.intensity
    );
    expect(dawn.sunLight.colorHex).not.toBe(noon.sunLight.colorHex);
    expect(midnight.moonLight?.intensity ?? 0).toBeGreaterThan(0);
    expect(noon.moonLight).toBeNull();
    expect(noon.sunLight.direction.y).toBeGreaterThan(0);
    expect(midnight.sunLight.direction.y).toBeLessThan(0);

    if (
      dawn.background.mode !== "verticalGradient" ||
      noon.background.mode !== "verticalGradient" ||
      midnight.background.mode !== "verticalGradient"
    ) {
      throw new Error("Expected a gradient background for the day/night test.");
    }

    expect(dawn.background.topColorHex).not.toBe(noon.background.topColorHex);
    expect(midnight.background.topColorHex).not.toBe(noon.background.topColorHex);
    expect(midnight.background.bottomColorHex).not.toBe(
      noon.background.bottomColorHex
    );
  });

  it("leaves scene lighting untouched when the scene disables project time influence", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.projectTimeLightingEnabled = false;

    const resolved = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });

    expect(resolved.ambientLight).toEqual(world.ambientLight);
    expect(resolved.sunLight).toEqual(world.sunLight);
    expect(resolved.background).toEqual(world.background);
    expect(resolved.moonLight).toBeNull();
  });
});