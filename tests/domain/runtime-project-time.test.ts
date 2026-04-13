import { describe, expect, it } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  advanceRuntimeClockState,
  createRuntimeClockState,
  hasTimeWindowJustEnded,
  hasTimeWindowJustStarted,
  isWithinTimeWindow,
  resolveRuntimeDayPhase,
  resolveRuntimeDayNightWorldState,
  resolveRuntimeTimeState
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

  it("resolves reusable runtime day semantics from the authored sun windows", () => {
    const settings = createDefaultProjectTimeSettings();
    settings.startDayNumber = 4;
    settings.dayLengthMinutes = 30;
    settings.sunriseTimeOfDayHours = 7;
    settings.sunsetTimeOfDayHours = 20;
    settings.dawnDurationHours = 2;
    settings.duskDurationHours = 2;

    const resolvedNight = resolveRuntimeTimeState(settings, {
      timeOfDayHours: 2,
      dayCount: 4,
      dayLengthMinutes: 30
    });
    const resolvedDawn = resolveRuntimeTimeState(settings, {
      timeOfDayHours: 6.5,
      dayCount: 4,
      dayLengthMinutes: 30
    });
    const resolvedDay = resolveRuntimeTimeState(settings, {
      timeOfDayHours: 12,
      dayCount: 4,
      dayLengthMinutes: 30
    });
    const resolvedDusk = resolveRuntimeTimeState(settings, {
      timeOfDayHours: 20.5,
      dayCount: 4,
      dayLengthMinutes: 30
    });

    expect(resolveRuntimeDayPhase(settings, 2)).toBe("night");
    expect(resolveRuntimeDayPhase(settings, 6.5)).toBe("dawn");
    expect(resolveRuntimeDayPhase(settings, 12)).toBe("day");
    expect(resolveRuntimeDayPhase(settings, 20.5)).toBe("dusk");

    expect(resolvedNight).toMatchObject({
      timeOfDayHours: 2,
      dayCount: 4,
      dayLengthMinutes: 30,
      dayPhase: "night",
      isNight: true
    });
    expect(resolvedDawn.dayPhase).toBe("dawn");
    expect(resolvedDawn.isNight).toBe(false);
    expect(resolvedDay.dayPhase).toBe("day");
    expect(resolvedDay.isNight).toBe(false);
    expect(resolvedDusk.dayPhase).toBe("dusk");
  });

  it("handles forward time windows across midnight", () => {
    expect(isWithinTimeWindow(22, 2, 23.5)).toBe(true);
    expect(isWithinTimeWindow(22, 2, 1.5)).toBe(true);
    expect(isWithinTimeWindow(22, 2, 12)).toBe(false);

    expect(hasTimeWindowJustStarted(21.5, 23.5, 22, 2)).toBe(true);
    expect(hasTimeWindowJustStarted(23.5, 1, 22, 2)).toBe(false);
    expect(hasTimeWindowJustEnded(23.5, 2.5, 22, 2)).toBe(true);

    expect(hasTimeWindowJustStarted(21, 3, 22, 2)).toBe(true);
    expect(hasTimeWindowJustEnded(21, 3, 22, 2)).toBe(true);
  });

  it("derives authored dawn, day, and night lighting from the global time profile", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "verticalGradient",
      topColorHex: "#88ccff",
      bottomColorHex: "#f2b774"
    };
    world.timeOfDay.night.background = {
      mode: "verticalGradient",
      topColorHex: "#07101f",
      bottomColorHex: "#18253b"
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
    const preSunrise = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 6.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const dawn = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 7.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const lateDawn = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 7.9,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const postSunset = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 20.5,
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
    expect(preSunrise.ambientLight.intensity).toBeGreaterThan(
      midnight.ambientLight.intensity
    );
    expect(preSunrise.ambientLight.intensity).toBeLessThan(
      noon.ambientLight.intensity
    );
    expect(dawn.sunLight.colorHex).not.toBe(noon.sunLight.colorHex);
    expect(dawn.ambientLight.intensity).toBeGreaterThan(
      preSunrise.ambientLight.intensity
    );
    expect(postSunset.ambientLight.intensity).toBeLessThan(
      noon.ambientLight.intensity
    );
    expect(postSunset.ambientLight.intensity).toBeGreaterThan(
      midnight.ambientLight.intensity
    );
    expect(midnight.moonLight?.intensity ?? 0).toBeGreaterThan(0);
    expect(preSunrise.moonLight?.intensity ?? 0).toBeGreaterThan(0);
    expect(dawn.moonLight?.intensity ?? 0).toBeGreaterThan(0);
    expect(lateDawn.moonLight?.intensity ?? 0).toBeLessThan(
      dawn.moonLight?.intensity ?? 0
    );
    expect(postSunset.moonLight?.intensity ?? 0).toBeGreaterThan(0);
    expect(noon.moonLight).toBeNull();
    expect(noon.sunLight.direction.y).toBeGreaterThan(0);
    expect(midnight.sunLight.direction.y).toBeLessThan(0);

    if (
      preSunrise.background.mode !== "verticalGradient" ||
      dawn.background.mode !== "verticalGradient" ||
      noon.background.mode !== "verticalGradient" ||
      midnight.background.mode !== "verticalGradient"
    ) {
      throw new Error("Expected a gradient background for the day/night test.");
    }

    expect(preSunrise.background.topColorHex).not.toBe(
      midnight.background.topColorHex
    );
    expect(dawn.background.topColorHex).not.toBe(noon.background.topColorHex);
    expect(midnight.background.topColorHex).not.toBe(noon.background.topColorHex);
    expect(midnight.background.bottomColorHex).not.toBe(
      noon.background.bottomColorHex
    );
  });

  it("uses the scene night image as a runtime overlay when the night background is an image", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    time.sunriseTimeOfDayHours = 7;
    time.sunsetTimeOfDayHours = 20;
    time.dawnDurationHours = 2;
    time.duskDurationHours = 2;
    world.timeOfDay.night.background = {
      mode: "image",
      assetId: "asset-night-sky",
      environmentIntensity: 0.42
    };

    const preSunrise = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 6.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const postSunset = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 20.5,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const midnight = resolveRuntimeDayNightWorldState(world, time, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });

    expect(preSunrise.nightBackgroundOverlay?.assetId).toBe("asset-night-sky");
    expect(preSunrise.nightBackgroundOverlay?.opacity ?? 0).toBeGreaterThan(0);
    expect(postSunset.nightBackgroundOverlay?.opacity ?? 0).toBeGreaterThan(0);
    expect(midnight.nightBackgroundOverlay?.opacity ?? 0).toBeCloseTo(1);
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