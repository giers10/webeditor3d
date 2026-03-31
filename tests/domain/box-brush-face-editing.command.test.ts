import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateBoxBrushCommand } from "../../src/commands/create-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../../src/commands/set-box-brush-face-material-command";
import { createSetBoxBrushFaceUvStateCommand } from "../../src/commands/set-box-brush-face-uv-state-command";

describe("box brush face editing commands", () => {
  it("applies a material to one box face and supports undo/redo", () => {
    const store = createEditorStore();

    store.executeCommand(createCreateBoxBrushCommand());

    const createdBrush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createSetBoxBrushFaceMaterialCommand({
        brushId: createdBrush.id,
        faceId: "posZ",
        materialId: "starter-amber-grid"
      })
    );

    expect(store.getState().document.brushes[createdBrush.id].faces.posZ.materialId).toBe("starter-amber-grid");
    expect(store.getState().selection).toEqual({
      kind: "brushFace",
      brushId: createdBrush.id,
      faceId: "posZ"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posZ.materialId).toBeNull();

    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posZ.materialId).toBe("starter-amber-grid");
  });

  it("updates face UV state through an undoable command", () => {
    const store = createEditorStore();

    store.executeCommand(createCreateBoxBrushCommand());

    const createdBrush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createSetBoxBrushFaceUvStateCommand({
        brushId: createdBrush.id,
        faceId: "posY",
        uvState: {
          offset: {
            x: 0.5,
            y: -0.25
          },
          scale: {
            x: 0.25,
            y: 0.5
          },
          rotationQuarterTurns: 1,
          flipU: true,
          flipV: false
        },
        label: "Adjust top face UVs"
      })
    );

    expect(store.getState().document.brushes[createdBrush.id].faces.posY.uv).toEqual({
      offset: {
        x: 0.5,
        y: -0.25
      },
      scale: {
        x: 0.25,
        y: 0.5
      },
      rotationQuarterTurns: 1,
      flipU: true,
      flipV: false
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posY.uv).toEqual({
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
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posY.uv.rotationQuarterTurns).toBe(1);
    expect(store.getState().document.brushes[createdBrush.id].faces.posY.uv.flipU).toBe(true);
  });
});
