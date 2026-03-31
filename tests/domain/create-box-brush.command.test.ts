import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateBoxBrushCommand } from "../../src/commands/create-box-brush-command";
import { createMoveBoxBrushCommand } from "../../src/commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../../src/commands/resize-box-brush-command";

describe("box brush commands", () => {
  it("creates a canonical box brush and supports undo/redo", () => {
    const store = createEditorStore();

    store.executeCommand(
      createCreateBoxBrushCommand({
        center: {
          x: 1.2,
          y: 1.1,
          z: -0.6
        },
        size: {
          x: 2.2,
          y: 2.7,
          z: 3.6
        }
      })
    );

    const brush = Object.values(store.getState().document.brushes)[0];

    expect(brush).toBeDefined();
    expect(brush.kind).toBe("box");
    expect(brush.center).toEqual({
      x: 1,
      y: 1,
      z: -1
    });
    expect(brush.size).toEqual({
      x: 2,
      y: 3,
      z: 4
    });
    expect(Object.keys(brush.faces)).toEqual(["posX", "negX", "posY", "negY", "posZ", "negZ"]);
    expect(brush.faces.posX).toEqual({
      materialId: null,
      uv: {
        offset: {
          x: 0,
          y: 0
        },
        scale: {
          x: 1,
          y: 1
        },
        rotationQuarterTurns: 0,
        flipU: false,
        flipV: false
      }
    });
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [brush.id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes).toEqual({});

    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[brush.id]).toEqual(brush);
  });

  it("moves and resizes a box brush through undoable commands", () => {
    const store = createEditorStore();

    store.executeCommand(createCreateBoxBrushCommand());

    const createdBrush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createMoveBoxBrushCommand({
        brushId: createdBrush.id,
        center: {
          x: 2.4,
          y: 3.2,
          z: -1.7
        }
      })
    );
    store.executeCommand(
      createResizeBoxBrushCommand({
        brushId: createdBrush.id,
        size: {
          x: 4.2,
          y: 1.2,
          z: 0.2
        }
      })
    );

    expect(store.getState().document.brushes[createdBrush.id].center).toEqual({
      x: 2,
      y: 3,
      z: -2
    });
    expect(store.getState().document.brushes[createdBrush.id].size).toEqual({
      x: 4,
      y: 1,
      z: 1
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].size).toEqual({
      x: 2,
      y: 2,
      z: 2
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].center).toEqual({
      x: 0,
      y: 1,
      z: 0
    });

    expect(store.redo()).toBe(true);
    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].center).toEqual({
      x: 2,
      y: 3,
      z: -2
    });
    expect(store.getState().document.brushes[createdBrush.id].size).toEqual({
      x: 4,
      y: 1,
      z: 1
    });
  });
});
