import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateFoliageLayerCommand } from "../../src/commands/create-foliage-layer-command";
import { createDeleteFoliageLayerCommand } from "../../src/commands/delete-foliage-layer-command";
import { createUpdateFoliageLayerCommand } from "../../src/commands/update-foliage-layer-command";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { BUNDLED_FOLIAGE_PROTOTYPES } from "../../src/foliage/bundled-foliage-manifest";
import { createFoliageLayer } from "../../src/foliage/foliage";

describe("foliage layer commands", () => {
  it("creates a scene foliage layer and restores it through undo and redo", () => {
    const bundledPrototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const layer = createFoliageLayer({
      id: "foliage-layer-create-command",
      name: "Create Command Layer",
      prototypeIds: [bundledPrototype.id]
    });
    const store = createEditorStore();

    store.executeCommand(
      createCreateFoliageLayerCommand({
        layer,
        label: "Create foliage layer fixture"
      })
    );

    expect(store.getState().document.foliageLayers[layer.id]).toEqual(layer);
    expect(
      store.getState().projectDocument.scenes[store.getState().activeSceneId]
        ?.foliageLayers[layer.id]
    ).toEqual(layer);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.foliageLayers[layer.id]).toBeUndefined();

    expect(store.redo()).toBe(true);
    expect(store.getState().document.foliageLayers[layer.id]).toEqual(layer);
  });

  it("updates foliage layer settings and prototype references", () => {
    const firstPrototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const secondPrototype = BUNDLED_FOLIAGE_PROTOTYPES[1]!;
    const existingLayer = createFoliageLayer({
      id: "foliage-layer-update-command",
      name: "Original Layer",
      prototypeIds: [firstPrototype.id]
    });
    const updatedLayer = createFoliageLayer({
      ...existingLayer,
      name: "Meadow Edge",
      prototypeIds: [firstPrototype.id, secondPrototype.id],
      density: 2.5,
      minScale: 0.7,
      maxScale: 1.4,
      minSlopeDegrees: 5,
      maxSlopeDegrees: 35,
      alignToNormal: 0.8,
      noiseScale: 12,
      noiseStrength: 0.6,
      noiseThreshold: 0.25,
      colorVariation: 0.2,
      seed: 42,
      enabled: false
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Foliage Update Scene" }),
        foliageLayers: {
          [existingLayer.id]: existingLayer
        }
      }
    });

    store.executeCommand(
      createUpdateFoliageLayerCommand({
        layer: updatedLayer,
        label: "Update foliage layer fixture"
      })
    );

    expect(store.getState().document.foliageLayers[existingLayer.id]).toEqual(
      updatedLayer
    );

    expect(store.undo()).toBe(true);
    expect(store.getState().document.foliageLayers[existingLayer.id]).toEqual(
      existingLayer
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.foliageLayers[existingLayer.id]).toEqual(
      updatedLayer
    );
  });

  it("deletes a foliage layer in one undoable command", () => {
    const layer = createFoliageLayer({
      id: "foliage-layer-delete-command",
      name: "Delete Command Layer",
      prototypeIds: [BUNDLED_FOLIAGE_PROTOTYPES[0]!.id]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Foliage Delete Scene" }),
        foliageLayers: {
          [layer.id]: layer
        }
      }
    });

    store.executeCommand(createDeleteFoliageLayerCommand(layer.id));

    expect(store.getState().document.foliageLayers[layer.id]).toBeUndefined();

    expect(store.undo()).toBe(true);
    expect(store.getState().document.foliageLayers[layer.id]).toEqual(layer);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.foliageLayers[layer.id]).toBeUndefined();
  });
});
