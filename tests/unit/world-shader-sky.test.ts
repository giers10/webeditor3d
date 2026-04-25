import { describe, expect, it } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  createWorldShaderSkyEnvironmentCacheKey,
  resolveWorldShaderSkyEnvironmentPhaseStates,
  resolveWorldShaderSkyRenderState,
  resolveWorldShaderSkyStarRotation
} from "../../src/rendering/world-shader-sky";
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
    world.shaderSky.aurora.enabled = true;
    world.shaderSky.aurora.intensity = 1.4;
    world.shaderSky.stars.horizonFadeOffset = 0.06;
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
    expect(noonSky?.stars.horizonFadeOffset).toBe(0.06);
    expect(dawnSky?.sky.topColorHex).not.toBe(noonSky?.sky.topColorHex);
    expect(dawnSky?.sky.topColorHex).not.toBe(midnightSky?.sky.topColorHex);
    expect(midnightSky?.stars.visibility ?? 0).toBeGreaterThan(
      dawnSky?.stars.visibility ?? 0
    );
    expect(dawnSky?.stars.visibility ?? 0).toBeGreaterThan(0);
    expect(noonSky?.stars.visibility ?? 1).toBe(0);
    expect(midnightSky?.aurora.visibility ?? 0).toBeGreaterThan(
      dawnSky?.aurora.visibility ?? 0
    );
    expect(dawnSky?.aurora.visibility ?? 0).toBeGreaterThan(0);
    expect(noonSky?.aurora.visibility ?? 1).toBe(0);
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

  it("keeps aurora orientation stable while animation advances linearly with time", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    world.shaderSky.aurora.enabled = true;

    const eveningTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    });
    const eveningWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 21,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      eveningTime
    );
    const lateNightTime = resolveRuntimeTimeState(time, {
      timeOfDayHours: 3,
      dayCount: 1,
      dayLengthMinutes: 24
    });
    const lateNightWorld = resolveRuntimeDayNightWorldState(
      world,
      time,
      {
        timeOfDayHours: 3,
        dayCount: 1,
        dayLengthMinutes: 24
      },
      lateNightTime
    );

    const eveningSky = resolveWorldShaderSkyRenderState(
      world,
      eveningWorld,
      eveningTime,
      time
    );
    const lateNightSky = resolveWorldShaderSkyRenderState(
      world,
      lateNightWorld,
      lateNightTime,
      time
    );

    expect(eveningSky?.aurora.rotationRadians).toBe(
      lateNightSky?.aurora.rotationRadians
    );
    expect(lateNightSky?.aurora.timeHours ?? 0).toBeGreaterThan(
      eveningSky?.aurora.timeHours ?? 0
    );
  });

  it("rotates shader stars linearly around the authored sun orbit axis", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    world.celestialOrbits.sun = {
      azimuthDegrees: 35,
      peakAltitudeDegrees: 38
    };

    const resolveSkyAtHour = (timeOfDayHours: number) => {
      const resolvedTime = resolveRuntimeTimeState(time, {
        timeOfDayHours,
        dayCount: 0,
        dayLengthMinutes: 24
      });
      const resolvedWorld = resolveRuntimeDayNightWorldState(
        world,
        time,
        {
          timeOfDayHours,
          dayCount: 0,
          dayLengthMinutes: 24
        },
        resolvedTime
      );

      return resolveWorldShaderSkyRenderState(
        world,
        resolvedWorld,
        resolvedTime,
        time
      );
    };

    const midnightSky = resolveSkyAtHour(0);
    const morningSky = resolveSkyAtHour(6);
    const noonSky = resolveSkyAtHour(12);
    const expectedMorningRotation = resolveWorldShaderSkyStarRotation(
      6,
      world.celestialOrbits.sun
    );
    const axis = morningSky?.stars.rotationAxis ?? { x: 0, y: 0, z: 0 };
    const axisLength = Math.hypot(axis.x, axis.y, axis.z);

    expect(midnightSky).not.toBeNull();
    expect(morningSky).not.toBeNull();
    expect(noonSky).not.toBeNull();
    expect(
      (morningSky?.stars.rotationRadians ?? 0) -
        (midnightSky?.stars.rotationRadians ?? 0)
    ).toBeCloseTo(Math.PI / 2);
    expect(
      (noonSky?.stars.rotationRadians ?? 0) -
        (morningSky?.stars.rotationRadians ?? 0)
    ).toBeCloseTo(Math.PI / 2);
    expect(morningSky?.stars.rotationRadians).toBeCloseTo(
      expectedMorningRotation.rotationRadians
    );
    expect(axis.x).toBeCloseTo(expectedMorningRotation.rotationAxis.x);
    expect(axis.y).toBeCloseTo(expectedMorningRotation.rotationAxis.y);
    expect(axis.z).toBeCloseTo(expectedMorningRotation.rotationAxis.z);
    expect(axisLength).toBeCloseTo(1);
    expect(Math.abs(axis.x) + Math.abs(axis.z)).toBeGreaterThan(0.1);
  });

  it("offsets shader-rendered celestial positions when the horizon height changes", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
    world.showCelestialBodies = true;

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
    const baseSky = resolveWorldShaderSkyRenderState(
      world,
      noonWorld,
      noonTime,
      time
    );

    world.shaderSky.horizonHeight = -0.12;

    const shiftedSky = resolveWorldShaderSkyRenderState(
      world,
      noonWorld,
      noonTime,
      time
    );

    expect(baseSky).not.toBeNull();
    expect(shiftedSky).not.toBeNull();
    expect(shiftedSky?.celestial.sunDirection.y ?? 0).toBeGreaterThan(
      baseSky?.celestial.sunDirection.y ?? 0
    );
    expect(shiftedSky?.celestial.moonDirection.y ?? 0).toBeGreaterThan(
      baseSky?.celestial.moonDirection.y ?? 0
    );
  });

  it("resolves representative shader environment states for day, dawn, dusk, and night", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };

    const states = resolveWorldShaderSkyEnvironmentPhaseStates(world, time);

    expect(states.day?.time.dayPhase).toBe("day");
    expect(states.dawn?.time.dayPhase).toBe("dawn");
    expect(states.dusk?.time.dayPhase).toBe("dusk");
    expect(states.night?.time.dayPhase).toBe("night");
    expect(states.day?.sky.topColorHex).not.toBe(states.night?.sky.topColorHex);
  });

  it("quantizes small shader-environment state changes into the same cache key", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    world.background = {
      mode: "shader"
    };
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
    const baseSky = resolveWorldShaderSkyRenderState(
      world,
      noonWorld,
      noonTime,
      time
    );
    const nearSky =
      baseSky === null
        ? null
        : {
            ...baseSky,
            celestial: {
              ...baseSky.celestial,
              sunDirection: {
                ...baseSky.celestial.sunDirection,
                x: baseSky.celestial.sunDirection.x + 0.004
              }
            },
            clouds: {
              ...baseSky.clouds,
              driftOffset: {
                x: baseSky.clouds.driftOffset.x + 0.004,
                y: baseSky.clouds.driftOffset.y
              }
            }
          };
    const shiftedSky =
      baseSky === null
        ? null
        : {
            ...baseSky,
            celestial: {
              ...baseSky.celestial,
              sunIntensity: baseSky.celestial.sunIntensity + 0.2
            }
          };
    const auroraSky =
      baseSky === null
        ? null
        : {
            ...baseSky,
            aurora: {
              ...baseSky.aurora,
              visibility: baseSky.aurora.visibility + 0.12
            }
          };

    expect(baseSky).not.toBeNull();
    expect(nearSky).not.toBeNull();
    expect(shiftedSky).not.toBeNull();
    expect(auroraSky).not.toBeNull();
    expect(
      createWorldShaderSkyEnvironmentCacheKey(
        nearSky ?? (baseSky as NonNullable<typeof baseSky>)
      )
    ).toBe(
      createWorldShaderSkyEnvironmentCacheKey(
        baseSky as NonNullable<typeof baseSky>
      )
    );
    expect(
      createWorldShaderSkyEnvironmentCacheKey(
        shiftedSky ?? (baseSky as NonNullable<typeof baseSky>)
      )
    ).not.toBe(
      createWorldShaderSkyEnvironmentCacheKey(
        baseSky as NonNullable<typeof baseSky>
      )
    );
    expect(
      createWorldShaderSkyEnvironmentCacheKey(
        auroraSky ?? (baseSky as NonNullable<typeof baseSky>)
      )
    ).not.toBe(
      createWorldShaderSkyEnvironmentCacheKey(
        baseSky as NonNullable<typeof baseSky>
      )
    );
  });
});
