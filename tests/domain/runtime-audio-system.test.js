import { describe, expect, it } from "vitest";
import { computeSoundEmitterDistanceGain } from "../../src/runtime-three/runtime-audio-system";
describe("computeSoundEmitterDistanceGain", () => {
    it("keeps full volume near the emitter and eases smoothly to silence at max distance", () => {
        expect(computeSoundEmitterDistanceGain(4, 6, 24)).toBe(1);
        expect(computeSoundEmitterDistanceGain(6, 6, 24)).toBe(1);
        expect(computeSoundEmitterDistanceGain(12, 6, 24)).toBeCloseTo(0.198, 3);
        expect(computeSoundEmitterDistanceGain(18, 6, 24)).toBeCloseTo(0.012, 3);
        expect(computeSoundEmitterDistanceGain(24, 6, 24)).toBe(0);
        expect(computeSoundEmitterDistanceGain(30, 6, 24)).toBe(0);
    });
});
