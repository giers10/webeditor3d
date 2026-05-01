import { describe, expect, it } from "vitest";

import { FIRST_PERSON_PLAYER_SHAPE } from "../../src/runtime-three/player-collision";
import {
  resolvePlayerEdgeAssistTopOut,
  shouldAttemptPlayerEdgeAssist
} from "../../src/runtime-three/player-edge-assist";

describe("player edge assist", () => {
  it("only attempts edge assist for blocked airborne movement", () => {
    expect(
      shouldAttemptPlayerEdgeAssist({
        enabled: true,
        pushToTopHeight: 0.55,
        inputMagnitude: 1,
        requestedPlanarSpeed: 4.5,
        planarSpeed: 0.2,
        collisionCount: 1,
        airborne: true
      })
    ).toBe(true);
    expect(
      shouldAttemptPlayerEdgeAssist({
        enabled: true,
        pushToTopHeight: 0.55,
        inputMagnitude: 1,
        requestedPlanarSpeed: 4.5,
        planarSpeed: 4.5,
        collisionCount: 0,
        airborne: true
      })
    ).toBe(false);
    expect(
      shouldAttemptPlayerEdgeAssist({
        enabled: true,
        pushToTopHeight: 0.55,
        inputMagnitude: 1,
        requestedPlanarSpeed: 4.5,
        planarSpeed: 0.2,
        collisionCount: 1,
        airborne: false
      })
    ).toBe(false);
  });

  it("resolves a forward and upward top-out candidate onto nearby ground", () => {
    const topY = 1.35;
    const result = resolvePlayerEdgeAssistTopOut({
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      shape: FIRST_PERSON_PLAYER_SHAPE,
      direction: {
        x: 0,
        y: 0,
        z: 1
      },
      pushToTopHeight: 0.55,
      canOccupyShape: (feetPosition) => feetPosition.y >= topY,
      probeGround: (feetPosition, _shape, maxDistance) => {
        const distance = feetPosition.y - topY;

        return distance >= 0 && distance <= maxDistance
          ? {
              grounded: true,
              distance,
              normal: { x: 0, y: 1, z: 0 },
              slopeDegrees: 0
            }
          : {
              grounded: false,
              distance: null,
              normal: null,
              slopeDegrees: null
            };
      }
    });

    expect(result).toMatchObject({
      feetPosition: {
        y: topY
      }
    });
    expect(result?.forwardDistance).toBeGreaterThan(0);
    expect(result?.lift).toBeCloseTo(0.35);
  });

  it("does not top out onto ground that is not above the current feet", () => {
    const result = resolvePlayerEdgeAssistTopOut({
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      shape: FIRST_PERSON_PLAYER_SHAPE,
      direction: {
        x: 0,
        y: 0,
        z: 1
      },
      pushToTopHeight: 0.55,
      canOccupyShape: () => true,
      probeGround: (feetPosition) => ({
        grounded: true,
        distance: feetPosition.y - 1,
        normal: { x: 0, y: 1, z: 0 },
        slopeDegrees: 0
      })
    });

    expect(result).toBeNull();
  });
});
