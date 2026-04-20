import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createDeleteTerrainCommand } from "../../src/commands/delete-terrain-command";
import { createUpsertTerrainCommand } from "../../src/commands/upsert-terrain-command";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createTerrain } from "../../src/document/terrains";

describe("terrain commands", () => {
  it("creates a terrain and restores it through undo and redo", () => {
    const store = createEditorStore();
    const terrain = createTerrain({
      id: "terrain-create-main",
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 2
    });

    store.executeCommand(
      createUpsertTerrainCommand({
        terrain,
        label: "Create terrain fixture"
      })
    );

    expect(store.getState().document.terrains[terrain.id]).toEqual(terrain);
    expect(store.getState().selection).toEqual({
      kind: "terrains",
      ids: [terrain.id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.terrains).toEqual({});

    expect(store.redo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]).toEqual(terrain);
  });

  it("updates existing terrain data without replacing the terrain id", () => {
    const existingTerrain = createTerrain({
      id: "terrain-update-main",
      sampleCountX: 3,
      sampleCountZ: 3,
      heights: [0, 0, 0, 0, 1, 0, 0, 0, 0]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Terrain Update Scene" }),
        terrains: {
          [existingTerrain.id]: existingTerrain
        }
      }
    });
    const updatedTerrain = createTerrain({
      id: existingTerrain.id,
      name: "Raised Ridge",
      position: {
        x: -4,
        y: 2,
        z: -4
      },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1.5,
      heights: [0, 1, 0, 1, 3, 1, 0, 1, 0],
      paintWeights: [
        0.2,
        0,
        0,
        0.1,
        0.3,
        0,
        0,
        0.15,
        0,
        0.25,
        0.25,
        0,
        0.05,
        0.1,
        0.1,
        0,
        0,
        0,
        0.2,
        0,
        0.2,
        0,
        0.1,
        0,
        0,
        0,
        0
      ]
    });

    store.executeCommand(
      createUpsertTerrainCommand({
        terrain: updatedTerrain,
        label: "Update terrain fixture"
      })
    );

    expect(store.getState().document.terrains[existingTerrain.id]).toEqual(
      updatedTerrain
    );

    expect(store.undo()).toBe(true);
    expect(store.getState().document.terrains[existingTerrain.id]).toEqual(
      existingTerrain
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.terrains[existingTerrain.id]).toEqual(
      updatedTerrain
    );
  });

  it("deletes a terrain in one undoable command", () => {
    const terrain = createTerrain({
      id: "terrain-delete-main"
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Terrain Delete Scene" }),
        terrains: {
          [terrain.id]: terrain
        }
      }
    });
    store.setSelection({
      kind: "terrains",
      ids: [terrain.id]
    });

    store.executeCommand(createDeleteTerrainCommand(terrain.id));

    expect(store.getState().document.terrains[terrain.id]).toBeUndefined();
    expect(store.getState().selection).toEqual({
      kind: "none"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]).toEqual(terrain);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]).toBeUndefined();
  });
});
