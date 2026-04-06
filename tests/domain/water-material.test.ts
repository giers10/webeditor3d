import { describe, expect, it } from "vitest";

import { collectWaterContactPatches } from "../../src/rendering/water-material";

describe("water material helpers", () => {
  it("builds contact foam patches for bounds that cross the water surface", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 8
        }
      },
      [
        {
          min: {
            x: -1,
            y: 0.8,
            z: -0.75
          },
          max: {
            x: 1,
            y: 1.35,
            z: 0.75
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]?.x).toBeCloseTo(0, 5);
    expect(patches[0]?.z).toBeCloseTo(0, 5);
    expect(patches[0]?.radius).toBeGreaterThan(0.9);
    expect(patches[0]?.intensity).toBeGreaterThan(0.5);
  });

  it("ignores bounds that do not overlap the water surface band", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 6,
          y: 2,
          z: 6
        }
      },
      [
        {
          min: {
            x: -1,
            y: -3,
            z: -1
          },
          max: {
            x: 1,
            y: -2,
            z: 1
          }
        }
      ]
    );

    expect(patches).toHaveLength(0);
  });
});