import { describe, expect, it } from "vitest";

import { SCENE_DOCUMENT_VERSION, createEmptySceneDocument } from "../../src/document/scene-document";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";

describe("createEmptySceneDocument", () => {
  it("creates a versioned empty scene document", () => {
    const document = createEmptySceneDocument();

    expect(document.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(document.name).toBe("Untitled Scene");
    expect(document.world).toEqual(createDefaultWorldSettings());
    expect(document.brushes).toEqual({});
    expect(document.paths).toEqual({});
    expect(document.entities).toEqual({});
    expect(document.modelInstances).toEqual({});
    expect(document.interactionLinks).toEqual({});
    expect(Object.keys(document.materials)).toEqual(STARTER_MATERIAL_LIBRARY.map((material) => material.id));
  });
});
