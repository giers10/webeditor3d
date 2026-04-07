import { ShaderMaterial } from "three";
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
    expect(patches[0]?.halfWidth).toBeGreaterThan(0.9);
    expect(patches[0]?.halfDepth).toBeGreaterThan(0.7);
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

  it("preserves oriented contact regions for rotated boxes", () => {
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
          z: 10
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 2,
            y: 0.4,
            z: 1
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(Math.abs(patches[0]?.axisX ?? 0)).toBeGreaterThan(0.65);
    expect(Math.abs(patches[0]?.axisZ ?? 0)).toBeGreaterThan(0.65);
  });

  it("clips rotated contact regions to the water footprint", () => {
    const centeredPatch = collectWaterContactPatches(
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
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 3,
            y: 0.4,
            z: 1
          }
        }
      ]
    )[0];
    const clippedPatch = collectWaterContactPatches(
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
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 2.2,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 3,
            y: 0.4,
            z: 1
          }
        }
      ]
    )[0];

    expect(centeredPatch).toBeDefined();
    expect(clippedPatch).toBeDefined();
    expect(clippedPatch?.x ?? 999).toBeLessThan(2);
    expect((clippedPatch?.halfWidth ?? 0) * (clippedPatch?.halfDepth ?? 0)).toBeLessThan(
      (centeredPatch?.halfWidth ?? 0) * (centeredPatch?.halfDepth ?? 0)
    );
    expect(Math.abs(clippedPatch?.axisX ?? 0)).toBeGreaterThan(0.65);
    expect(Math.abs(clippedPatch?.axisZ ?? 0)).toBeGreaterThan(0.65);
  });

  it("builds a shared quality shader material for visible tinted water", () => {
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

    expect(result.material).toBeInstanceOf(ShaderMaterial);

    const material = result.material as ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.uniforms["surfaceOpacity"]?.value).toBeGreaterThan(0.14);
    expect(material.uniforms["waveStrength"]?.value).toBe(0.35);
    expect(material.uniforms["isTopFace"]?.value).toBe(1);
    expect(result.contactPatchesUniform?.value).toHaveLength(6);
  });
});