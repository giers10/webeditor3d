import { describe, expect, it } from "vitest";

import {
  createNpcAlwaysPresence,
  createNpcTimeWindowPresence
} from "../../src/entities/entity-instances";
import {
  hasNpcPresenceActivityChanged,
  resolveNpcPresenceActive
} from "../../src/runtime-three/runtime-npc-presence";

describe("runtime NPC presence", () => {
  it("keeps always-authored NPC presence active at any time of day", () => {
    const presence = createNpcAlwaysPresence();

    expect(resolveNpcPresenceActive(presence, 2)).toBe(true);
    expect(resolveNpcPresenceActive(presence, 14.5)).toBe(true);
    expect(
      hasNpcPresenceActivityChanged(presence, 6, 18)
    ).toBe(false);
  });

  it("resolves time-windowed NPC presence across midnight and detects window boundaries", () => {
    const presence = createNpcTimeWindowPresence({
      startHour: 22,
      endHour: 2
    });

    expect(resolveNpcPresenceActive(presence, 21.5)).toBe(false);
    expect(resolveNpcPresenceActive(presence, 23.5)).toBe(true);
    expect(resolveNpcPresenceActive(presence, 1.5)).toBe(true);
    expect(resolveNpcPresenceActive(presence, 3)).toBe(false);

    expect(hasNpcPresenceActivityChanged(presence, 21.5, 23)).toBe(true);
    expect(hasNpcPresenceActivityChanged(presence, 23, 1)).toBe(false);
    expect(hasNpcPresenceActivityChanged(presence, 1.5, 2.5)).toBe(true);
  });
});
