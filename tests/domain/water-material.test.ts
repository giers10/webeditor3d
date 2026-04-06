import { MeshPhysicalMaterial } from "three";
import { describe, expect, it } from "vitest";

import { collectWaterContactPatches, createWaterMaterial } from "../../src/rendering/water-material";

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

  it("keeps quality water visibly tinted instead of fading to transparent alpha", () => {
    const result = createWaterMaterial({
      colorHex: "#4da6d9",
      surfaceOpacity: 0.55,
      waveStrength: 0.35,
      opacity: 0.71,
      quality: true,
      wireframe: false,
      isTopFace: true,
      time: 0,
      halfSize: {
        x: 4,
        z: 4
      },
      contactPatches: []
    });

    expect(result.material).toBeInstanceOf(MeshPhysicalMaterial);

    const material = result.material as MeshPhysicalMaterial;
    expect(material.opacity).toBe(1);
    expect(material.transmission).toBeGreaterThan(0.16);
    expect(material.transmission).toBeLessThan(0.72);
    expect(material.emissiveIntensity).toBeGreaterThan(0.16);
  });
});