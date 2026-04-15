import { describe, expect, it } from "vitest";

import { createCreateConeBrushCommand } from "../../src/commands/create-cone-brush-command";
import { createEditorStore } from "../../src/app/editor-store";
import { createCreateRadialPrismBrushCommand } from "../../src/commands/create-radial-prism-brush-command";
import { createCreateTorusBrushCommand } from "../../src/commands/create-torus-brush-command";
import { createCreateWedgeBrushCommand } from "../../src/commands/create-wedge-brush-command";

describe("whitebox primitive creation commands", () => {
  it("creates a wedge brush with undo and redo", () => {
    const store = createEditorStore();

    store.executeCommand(
      createCreateWedgeBrushCommand({
        center: {
          x: 2.2,
          y: 1.4,
          z: -1.1
        },
        size: {
          x: 4.2,
          y: 2.1,
          z: 6.2
        }
      })
    );

    const brush = Object.values(store.getState().document.brushes)[0];

    expect(brush.kind).toBe("wedge");
    expect(brush.rotationDegrees).toEqual({
      x: 0,
      y: 0,
      z: 180
    });
    expect(Object.keys(brush.faces)).toEqual([
      "bottom",
      "back",
      "slope",
      "left",
      "right"
    ]);
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [brush.id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes).toEqual({});
    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toEqual(brush);
  });

  it("creates a cylinder brush as a 12-sided radial prism", () => {
    const store = createEditorStore();

    store.executeCommand(
      createCreateRadialPrismBrushCommand({
        sideCount: 12
      })
    );

    const brush = Object.values(store.getState().document.brushes)[0];

    expect(brush.kind).toBe("radialPrism");

    if (brush.kind !== "radialPrism") {
      throw new Error("Expected a radial prism brush.");
    }

    expect(brush.sideCount).toBe(12);
    expect(Object.keys(brush.faces)).toHaveLength(14);
  });

  it("creates a cone brush as a capped 12-sided cone", () => {
    const store = createEditorStore();

    store.executeCommand(
      createCreateConeBrushCommand({
        sideCount: 12
      })
    );

    const brush = Object.values(store.getState().document.brushes)[0];

    expect(brush.kind).toBe("cone");

    if (brush.kind !== "cone") {
      throw new Error("Expected a cone brush.");
    }

    expect(brush.sideCount).toBe(12);
    expect(Object.keys(brush.faces)).toHaveLength(13);
  });

  it("creates a torus brush with stable major and tube segments", () => {
    const store = createEditorStore();

    store.executeCommand(
      createCreateTorusBrushCommand({
        majorSegmentCount: 16,
        tubeSegmentCount: 8
      })
    );

    const brush = Object.values(store.getState().document.brushes)[0];

    expect(brush.kind).toBe("torus");

    if (brush.kind !== "torus") {
      throw new Error("Expected a torus brush.");
    }

    expect(brush.majorSegmentCount).toBe(16);
    expect(brush.tubeSegmentCount).toBe(8);
    expect(Object.keys(brush.faces)).toHaveLength(128);
  });
});
