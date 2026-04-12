import { describe, expect, it } from "vitest";

import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  advanceRuntimeClockState,
  createRuntimeClockState,
  resolveRuntimeDayNightWorldState
} from "../../src/runtime-three/runtime-project-time";

describe("runtime project time", () => {
  it("advances and wraps the global clock using the authored day duration", () => {
    const clock = createRuntimeClockState({
      startTimeOfDayHours: 23.5,
      dayLengthMinutes: 24
    });

    const advancedClock = advanceRuntimeClockState(clock, 60);

    expect(advancedClock.timeOfDayHours).toBeCloseTo(0.5);
    expect(advancedClock.dayCount).toBe(1);
    expect(advancedClock.dayLengthMinutes).toBe(24);
  });

  it("derives darker night lighting and background from the authored world", () => {
    const world = createDefaultWorldSettings();
    world.background = {
      mode: "verticalGradient",
      topColorHex: "#88ccff",
      bottomColorHex: "#f2b774"
    };

    const noon = resolveRuntimeDayNightWorldState(world, {
      timeOfDayHours: 12,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const midnight = resolveRuntimeDayNightWorldState(world, {
      timeOfDayHours: 0,
      dayCount: 0,
      dayLengthMinutes: 24
    });

    expect(midnight.sunLight.intensity).toBeLessThan(noon.sunLight.intensity);
    expect(midnight.ambientLight.intensity).toBeLessThan(
      noon.ambientLight.intensity
    );
    expect(noon.sunLight.direction.y).toBeGreaterThan(0);
    expect(midnight.sunLight.direction.y).toBeLessThan(0);

    if (
      noon.background.mode !== "verticalGradient" ||
      midnight.background.mode !== "verticalGradient"
    ) {
      throw new Error("Expected a gradient background for the day/night test.");
    }

    expect(midnight.background.topColorHex).not.toBe(noon.background.topColorHex);
    expect(midnight.background.bottomColorHex).not.toBe(
      noon.background.bottomColorHex
    );
  });
});