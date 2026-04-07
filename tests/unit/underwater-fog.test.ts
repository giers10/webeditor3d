import { describe, expect, it } from "vitest";

import { resolveUnderwaterFogState } from "../../src/runtime-three/underwater-fog";

describe("resolveUnderwaterFogState", () => {
  const runtimeScene = {
    volumes: {
      water: [
        {
          brushId: "water-1",
          center: { x: 0, y: 0, z: 0 },
          rotationDegrees: { x: 0, y: 25, z: 0 },
          size: { x: 10, y: 4, z: 8 },
          colorHex: "#347aa0",
          surfaceOpacity: 0.72,
          waveStrength: 0.4
        }
      ],
      fog: []
    }
  };

  it("returns fog tint and density from the containing water volume", () => {
    const fogState = resolveUnderwaterFogState(runtimeScene, {
      cameraSubmerged: true,
      eyePosition: { x: 0.3, y: 1.1, z: 0.2 }
    });

    expect(fogState).not.toBeNull();
    expect(fogState?.colorHex).toBe("#347aa0");
    expect(fogState?.density ?? 0).toBeCloseTo(0.03352, 5);
  });

  it("does not enable fog when the camera is not submerged", () => {
    expect(
      resolveUnderwaterFogState(runtimeScene, {
        cameraSubmerged: false,
        eyePosition: { x: 0.3, y: 1.1, z: 0.2 }
      })
    ).toBeNull();
  });

  it("does not enable fog for points outside the water volume", () => {
    expect(
      resolveUnderwaterFogState(runtimeScene, {
        cameraSubmerged: true,
        eyePosition: { x: 20, y: 1.1, z: 0.2 }
      })
    ).toBeNull();
  });
});