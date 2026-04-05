import { describe, expect, it } from "vitest";
import { getViewportViewModeControlHint, getViewportViewModeDefinition, getViewportViewModeGridPlaneLabel, getViewportViewModeLabel } from "../../src/viewport-three/viewport-view-modes";
describe("viewport view modes", () => {
    it("defines the orthographic axes and grid planes explicitly", () => {
        expect(getViewportViewModeDefinition("top")).toMatchObject({
            label: "Top",
            cameraType: "orthographic",
            cameraDirection: {
                x: 0,
                y: 1,
                z: 0
            },
            cameraUp: {
                x: 0,
                y: 0,
                z: -1
            },
            gridPlane: "xz",
            snapAxis: "y"
        });
        expect(getViewportViewModeDefinition("front")).toMatchObject({
            label: "Front",
            cameraType: "orthographic",
            cameraDirection: {
                x: 0,
                y: 0,
                z: 1
            },
            cameraUp: {
                x: 0,
                y: 1,
                z: 0
            },
            gridPlane: "xy",
            snapAxis: "z"
        });
        expect(getViewportViewModeDefinition("side")).toMatchObject({
            label: "Side",
            cameraType: "orthographic",
            cameraDirection: {
                x: -1,
                y: 0,
                z: 0
            },
            cameraUp: {
                x: 0,
                y: 1,
                z: 0
            },
            gridPlane: "yz",
            snapAxis: "x"
        });
    });
    it("exposes readable labels and grid hints for the UI", () => {
        expect(getViewportViewModeLabel("perspective")).toBe("Perspective");
        expect(getViewportViewModeLabel("top")).toBe("Top");
        expect(getViewportViewModeGridPlaneLabel("front")).toBe("XY");
        expect(getViewportViewModeControlHint("perspective")).toContain("orbits");
        expect(getViewportViewModeControlHint("side")).toContain("pans");
    });
});
