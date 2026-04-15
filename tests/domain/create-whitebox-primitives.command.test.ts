import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateRadialPrismBrushCommand } from "../../src/commands/create-radial-prism-brush-command";
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
    expect(brush.sideCount).toBe(12);
    expect(Object.keys(brush.faces)).toHaveLength(14);
  });
});
