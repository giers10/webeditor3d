import { describe, expect, it } from "vitest";

import {
  createDefaultViewportLayoutState,
  getViewportDisplayModeLabel,
  getViewportLayoutModeLabel,
  getViewportPanelLabel
} from "../../src/viewport-three/viewport-layout";

describe("viewport layout", () => {
  it("defaults to a quad-ready panel arrangement with orthographic authoring panes", () => {
    const layout = createDefaultViewportLayoutState();

    expect(layout.layoutMode).toBe("single");
    expect(layout.activePanelId).toBe("topLeft");
    expect(layout.panels.topLeft).toMatchObject({
      viewMode: "perspective",
      displayMode: "normal"
    });
    expect(layout.panels.topRight).toMatchObject({
      viewMode: "top",
      displayMode: "authoring"
    });
    expect(layout.panels.bottomLeft).toMatchObject({
      viewMode: "front",
      displayMode: "authoring"
    });
    expect(layout.panels.bottomRight).toMatchObject({
      viewMode: "side",
      displayMode: "authoring"
    });
    expect(layout.viewportQuadSplit).toEqual({
      x: 0.5,
      y: 0.5
    });
  });

  it("exposes readable labels for the layout and panel chrome", () => {
    expect(getViewportLayoutModeLabel("single")).toBe("Single View");
    expect(getViewportLayoutModeLabel("quad")).toBe("4-Panel");
    expect(getViewportDisplayModeLabel("authoring")).toBe("Authoring");
    expect(getViewportPanelLabel("topRight")).toBe("Top Right");
  });
});
