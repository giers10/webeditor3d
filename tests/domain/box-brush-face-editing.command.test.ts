import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateBoxBrushCommand } from "../../src/commands/create-box-brush-command";
import { createSetBoxBrushAllFaceMaterialsCommand } from "../../src/commands/set-box-brush-all-face-materials-command";
import { createSetBoxBrushFaceMaterialCommand } from "../../src/commands/set-box-brush-face-material-command";
import { createSetBoxBrushFaceUvStateCommand } from "../../src/commands/set-box-brush-face-uv-state-command";
import { createUpdateBoxBrushAllFaceUvsCommand } from "../../src/commands/update-box-brush-all-face-uvs-command";
import { BOX_FACE_IDS } from "../../src/document/brushes";

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

  it("applies one material across all box faces and restores prior face materials on undo", () => {
    const store = createEditorStore();

    store.executeCommand(createCreateBoxBrushCommand());

    const createdBrush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createSetBoxBrushFaceMaterialCommand({
        brushId: createdBrush.id,
        faceId: "posX",
        materialId: "starter-hazard-stripe"
      })
    );
    store.executeCommand(
      createSetBoxBrushFaceMaterialCommand({
        brushId: createdBrush.id,
        faceId: "negY",
        materialId: "starter-concrete-checker"
      })
    );
    store.setSelection({
      kind: "brushes",
      ids: [createdBrush.id]
    });

    store.executeCommand(
      createSetBoxBrushAllFaceMaterialsCommand({
        brushId: createdBrush.id,
        materialId: "starter-amber-grid"
      })
    );

    BOX_FACE_IDS.forEach((faceId) => {
      expect(
        store.getState().document.brushes[createdBrush.id].faces[faceId]
          .materialId
      ).toBe("starter-amber-grid");
    });
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [createdBrush.id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posX.materialId).toBe("starter-hazard-stripe");
    expect(store.getState().document.brushes[createdBrush.id].faces.negY.materialId).toBe("starter-concrete-checker");
    expect(store.getState().document.brushes[createdBrush.id].faces.posZ.materialId).toBeNull();

    expect(store.redo()).toBe(true);
    BOX_FACE_IDS.forEach((faceId) => {
      expect(
        store.getState().document.brushes[createdBrush.id].faces[faceId]
          .materialId
      ).toBe("starter-amber-grid");
    });
  });

  it("updates all face UV states and restores prior per-face transforms on undo", () => {
    const store = createEditorStore();

    store.executeCommand(createCreateBoxBrushCommand());

    const createdBrush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createSetBoxBrushFaceUvStateCommand({
        brushId: createdBrush.id,
        faceId: "posX",
        uvState: {
          offset: {
            x: 0.25,
            y: -0.5
          },
          scale: {
            x: 2,
            y: 0.5
          },
          rotationQuarterTurns: 1,
          flipU: false,
          flipV: true
        },
        label: "Seed right face UVs"
      })
    );
    store.executeCommand(
      createSetBoxBrushFaceUvStateCommand({
        brushId: createdBrush.id,
        faceId: "negZ",
        uvState: {
          offset: {
            x: -0.125,
            y: 0.375
          },
          scale: {
            x: 0.75,
            y: 1.25
          },
          rotationQuarterTurns: 3,
          flipU: true,
          flipV: false
        },
        label: "Seed back face UVs"
      })
    );
    store.setSelection({
      kind: "brushes",
      ids: [createdBrush.id]
    });

    store.executeCommand(
      createUpdateBoxBrushAllFaceUvsCommand({
        brushId: createdBrush.id,
        label: "Normalize solid UVs",
        updateUvState: (uvState, faceId) => ({
          ...uvState,
          offset: {
            x: BOX_FACE_IDS.indexOf(faceId as (typeof BOX_FACE_IDS)[number]),
            y: uvState.offset.y + 1
          },
          scale: {
            x: 0.5,
            y: 0.75
          },
          rotationQuarterTurns: 2,
          flipU: true,
          flipV: false
        })
      })
    );

    BOX_FACE_IDS.forEach((faceId, index) => {
      const nextUv =
        store.getState().document.brushes[createdBrush.id].faces[faceId].uv;

      expect(nextUv.offset.x).toBe(index);
      expect(nextUv.scale).toEqual({
        x: 0.5,
        y: 0.75
      });
      expect(nextUv.rotationQuarterTurns).toBe(2);
      expect(nextUv.flipU).toBe(true);
      expect(nextUv.flipV).toBe(false);
    });
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [createdBrush.id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.brushes[createdBrush.id].faces.posX.uv).toEqual({
      offset: {
        x: 0.25,
        y: -0.5
      },
      scale: {
        x: 2,
        y: 0.5
      },
      rotationQuarterTurns: 1,
      flipU: false,
      flipV: true
    });
    expect(store.getState().document.brushes[createdBrush.id].faces.negZ.uv).toEqual({
      offset: {
        x: -0.125,
        y: 0.375
      },
      scale: {
        x: 0.75,
        y: 1.25
      },
      rotationQuarterTurns: 3,
      flipU: true,
      flipV: false
    });
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
    BOX_FACE_IDS.forEach((faceId, index) => {
      const nextUv =
        store.getState().document.brushes[createdBrush.id].faces[faceId].uv;

      expect(nextUv.offset.x).toBe(index);
      expect(nextUv.rotationQuarterTurns).toBe(2);
      expect(nextUv.flipU).toBe(true);
      expect(nextUv.flipV).toBe(false);
    });
  });
});
