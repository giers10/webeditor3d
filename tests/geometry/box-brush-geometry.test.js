import { describe, expect, it } from "vitest";
import { createBoxBrush } from "../../src/document/brushes";
import { getBoxBrushBounds, getBoxBrushCornerPositions } from "../../src/geometry/box-brush";
describe("box brush geometry", () => {
    it("builds finite bounds and eight corner positions from canonical box data", () => {
        const brush = createBoxBrush({
            center: {
                x: 2,
                y: 4,
                z: -3
            },
            size: {
                x: 6,
                y: 2,
                z: 4
            }
        });
        expect(getBoxBrushBounds(brush)).toEqual({
            min: {
                x: -1,
                y: 3,
                z: -5
            },
            max: {
                x: 5,
                y: 5,
                z: -1
            }
        });
        const corners = getBoxBrushCornerPositions(brush);
        expect(corners).toHaveLength(8);
        expect(new Set(corners.map((corner) => `${corner.x}:${corner.y}:${corner.z}`)).size).toBe(8);
        expect(corners.every((corner) => Number.isFinite(corner.x) && Number.isFinite(corner.y) && Number.isFinite(corner.z))).toBe(true);
    });
    it("derives rotated world bounds from authored box rotation without changing stable corner count", () => {
        const brush = createBoxBrush({
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
                y: 2,
                z: 4
            }
        });
        const bounds = getBoxBrushBounds(brush);
        const corners = getBoxBrushCornerPositions(brush);
        expect(bounds.min.x).toBeCloseTo(-2.1213203436);
        expect(bounds.max.x).toBeCloseTo(2.1213203436);
        expect(bounds.min.z).toBeCloseTo(-2.1213203436);
        expect(bounds.max.z).toBeCloseTo(2.1213203436);
        expect(corners).toHaveLength(8);
        expect(new Set(corners.map((corner) => `${corner.x}:${corner.y}:${corner.z}`)).size).toBe(8);
    });
});
