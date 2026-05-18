import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createCreateBoxBrushCommand } from "../../src/commands/create-box-brush-command";
import { createCreateCustomMaterialCommand } from "../../src/commands/create-custom-material-command";
import { createSetCustomMaterialTextureCommand } from "../../src/commands/set-custom-material-texture-command";
import { createUpdateCustomMaterialCommand } from "../../src/commands/update-custom-material-command";
import {
  createProjectAssetStorageKey,
  type ImageAssetRecord
} from "../../src/assets/project-assets";
import { BOX_FACE_IDS, type WhiteboxFaceId } from "../../src/document/brushes";
import { createCustomMaterialDef } from "../../src/materials/starter-material-library";

function createImageAsset(id: string): ImageAssetRecord {
  return {
    id,
    kind: "image",
    sourceName: `${id}.png`,
    mimeType: "image/png",
    storageKey: createProjectAssetStorageKey(id),
    byteLength: 128,
    metadata: {
      kind: "image",
      width: 4,
      height: 4,
      hasAlpha: false,
      warnings: []
    }
  };
}

describe("custom material commands", () => {
  it("creates a custom material and applies it to the selected face with undo/redo", () => {
    const store = createEditorStore();
    const material = createCustomMaterialDef({
      id: "material-custom-face",
      name: "Blue Test",
      albedoColorHex: "#3366ff"
    });

    store.executeCommand(createCreateBoxBrushCommand());

    const brush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createCreateCustomMaterialCommand({
        material,
        applyTo: {
          kind: "face",
          brushId: brush.id,
          faceId: "posZ"
        }
      })
    );

    expect(store.getState().document.materials[material.id]).toMatchObject({
      kind: "custom",
      name: "Blue Test",
      albedoColorHex: "#3366ff"
    });
    expect(
      store.getState().document.brushes[brush.id].faces.posZ.materialId
    ).toBe(material.id);
    expect(store.getState().selection).toEqual({
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.materials[material.id]).toBeUndefined();
    expect(
      store.getState().document.brushes[brush.id].faces.posZ.materialId
    ).toBeNull();

    expect(store.redo()).toBe(true);
    expect(store.getState().document.materials[material.id]).toBeDefined();
    expect(
      store.getState().document.brushes[brush.id].faces.posZ.materialId
    ).toBe(material.id);
  });

  it("creates a custom material and applies it to all selected solid faces", () => {
    const store = createEditorStore();
    const material = createCustomMaterialDef({
      id: "material-custom-solid",
      name: "Solid Test"
    });

    store.executeCommand(createCreateBoxBrushCommand());

    const brush = Object.values(store.getState().document.brushes)[0];

    store.executeCommand(
      createCreateCustomMaterialCommand({
        material,
        applyTo: {
          kind: "brush",
          brushId: brush.id
        }
      })
    );

    for (const faceId of BOX_FACE_IDS) {
      expect(
        store.getState().document.brushes[brush.id].faces[
          faceId as WhiteboxFaceId
        ].materialId
      ).toBe(material.id);
    }

    expect(store.undo()).toBe(true);

    for (const faceId of BOX_FACE_IDS) {
      expect(
        store.getState().document.brushes[brush.id].faces[
          faceId as WhiteboxFaceId
        ].materialId
      ).toBeNull();
    }
  });

  it("updates custom material scalar settings and restores them on undo", () => {
    const store = createEditorStore();
    const material = createCustomMaterialDef({
      id: "material-custom-update",
      roughness: 0.8,
      metallic: 0
    });

    store.executeCommand(
      createCreateCustomMaterialCommand({
        material
      })
    );
    store.executeCommand(
      createUpdateCustomMaterialCommand({
        materialId: material.id,
        update: {
          opacity: 0.45,
          roughness: 0.2,
          metallic: 0.9,
          normalStrength: 0.35
        }
      })
    );

    expect(store.getState().document.materials[material.id]).toMatchObject({
      opacity: 0.45,
      roughness: 0.2,
      metallic: 0.9,
      normalStrength: 0.35
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.materials[material.id]).toMatchObject({
      opacity: 1,
      roughness: 0.8,
      metallic: 0,
      normalStrength: 1
    });
  });

  it("imports and assigns image texture assets to custom material slots", () => {
    const store = createEditorStore();
    const material = createCustomMaterialDef({
      id: "material-custom-texture"
    });
    const imageAsset = createImageAsset("asset-material-albedo");

    store.executeCommand(
      createCreateCustomMaterialCommand({
        material
      })
    );
    store.executeCommand(
      createSetCustomMaterialTextureCommand({
        materialId: material.id,
        slot: "albedo",
        assetId: imageAsset.id,
        asset: imageAsset
      })
    );

    const assignedMaterial = store.getState().document.materials[material.id];

    expect(store.getState().document.assets[imageAsset.id]).toEqual(imageAsset);
    expect(assignedMaterial).toMatchObject({
      kind: "custom",
      textures: {
        albedo: {
          assetId: imageAsset.id
        }
      }
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.assets[imageAsset.id]).toBeUndefined();
    expect(store.getState().document.materials[material.id]).toMatchObject({
      textures: {
        albedo: null
      }
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().document.assets[imageAsset.id]).toEqual(imageAsset);
    expect(store.getState().document.materials[material.id]).toMatchObject({
      textures: {
        albedo: {
          assetId: imageAsset.id
        }
      }
    });
  });

  it("keeps starter materials read-only", () => {
    const store = createEditorStore();

    expect(() =>
      store.executeCommand(
        createUpdateCustomMaterialCommand({
          materialId: "starter-amber-grid",
          update: {
            roughness: 0.4
          }
        })
      )
    ).toThrow("Starter materials are read-only.");
  });
});
