import { describe, expect, it } from "vitest";

import { resolveDominantLocalAxisForWorldAxis } from "../../src/viewport-three/transform-axis-mapping";

describe("transform axis mapping", () => {
  it("maps a world axis onto the dominant local axis for rotated targets", () => {
    expect(
      resolveDominantLocalAxisForWorldAxis(
        {
          x: 0,
          y: 90,
          z: 0
        },
        "x"
      )
    ).toBe("z");

    expect(
      resolveDominantLocalAxisForWorldAxis(
        {
          x: 90,
          y: 0,
          z: 0
        },
        "y"
      )
    ).toBe("z");
  });

  it("keeps the same axis when the target is not rotated", () => {
    expect(
      resolveDominantLocalAxisForWorldAxis(
        {
          x: 0,
          y: 0,
          z: 0
        },
        "x"
      )
    ).toBe("x");

    expect(
      resolveDominantLocalAxisForWorldAxis(
        {
          x: 0,
          y: 0,
          z: 0
        },
        "z"
      )
    ).toBe("z");
  });
});
