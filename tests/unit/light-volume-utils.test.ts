import { describe, expect, it } from "vitest";

import { deriveBoxLightVolumePointLights } from "../../src/runtime-three/light-volume-utils";

describe("deriveBoxLightVolumePointLights", () => {
  it("derives a bounded four-light cluster from the dominant box axes", () => {
    const lights = deriveBoxLightVolumePointLights({
      size: {
        x: 8,
        y: 4,
        z: 2
      },
      intensity: 2,
      padding: 0.25,
      falloff: "linear"
    });

    expect(lights).toHaveLength(4);
    expect(new Set(lights.map((light) => light.localPosition.z))).toEqual(
      new Set([0])
    );
    expect(lights.every((light) => light.intensity === 1)).toBe(true);
    expect(lights.every((light) => light.distance > 0.75)).toBe(true);
    expect(lights.every((light) => light.decay === 1.4)).toBe(true);
  });

  it("shrinks the light cluster inward and reduces reach as padding increases", () => {
    const withoutPadding = deriveBoxLightVolumePointLights({
      size: {
        x: 6,
        y: 6,
        z: 3
      },
      intensity: 1.5,
      padding: 0,
      falloff: "smoothstep"
    });
    const withPadding = deriveBoxLightVolumePointLights({
      size: {
        x: 6,
        y: 6,
        z: 3
      },
      intensity: 1.5,
      padding: 1,
      falloff: "smoothstep"
    });

    expect(withPadding).toHaveLength(withoutPadding.length);
    expect(
      Math.abs(withPadding[0]?.localPosition.x ?? 0)
    ).toBeLessThan(Math.abs(withoutPadding[0]?.localPosition.x ?? 0));
    expect(
      Math.abs(withPadding[0]?.localPosition.y ?? 0)
    ).toBeLessThan(Math.abs(withoutPadding[0]?.localPosition.y ?? 0));
    expect((withPadding[0]?.distance ?? 0)).toBeLessThan(
      withoutPadding[0]?.distance ?? 0
    );
  });

  it("uses a softer smoothstep layout than linear falloff", () => {
    const linear = deriveBoxLightVolumePointLights({
      size: {
        x: 5,
        y: 5,
        z: 2
      },
      intensity: 1.25,
      padding: 0.4,
      falloff: "linear"
    });
    const smoothstep = deriveBoxLightVolumePointLights({
      size: {
        x: 5,
        y: 5,
        z: 2
      },
      intensity: 1.25,
      padding: 0.4,
      falloff: "smoothstep"
    });

    expect(Math.abs(smoothstep[0]?.localPosition.x ?? 0)).toBeGreaterThan(
      Math.abs(linear[0]?.localPosition.x ?? 0)
    );
    expect(Math.abs(smoothstep[0]?.localPosition.y ?? 0)).toBeGreaterThan(
      Math.abs(linear[0]?.localPosition.y ?? 0)
    );
    expect(smoothstep[0]?.decay).toBe(2);
    expect(linear[0]?.decay).toBe(1.4);
  });
});
