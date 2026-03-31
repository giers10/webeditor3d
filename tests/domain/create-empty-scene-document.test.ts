import { describe, expect, it } from "vitest";

import { SCENE_DOCUMENT_VERSION, createEmptySceneDocument } from "../../src/document/scene-document";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";

describe("createEmptySceneDocument", () => {
  it("creates a versioned empty scene document", () => {
    const document = createEmptySceneDocument();

    expect(document.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(document.name).toBe("Untitled Scene");
    expect(document.world).toEqual({
      background: {
        mode: "solid",
        colorHex: "#2f3947"
      },
      ambientLight: {
        colorHex: "#f7f1e8",
        intensity: 1
      },
      sunLight: {
        colorHex: "#fff1d5",
        intensity: 1.75,
        direction: {
          x: -0.6,
          y: 1,
          z: 0.35
        }
      }
    });
    expect(document.brushes).toEqual({});
    expect(document.entities).toEqual({});
    expect(document.modelInstances).toEqual({});
    expect(Object.keys(document.materials)).toEqual(STARTER_MATERIAL_LIBRARY.map((material) => material.id));
  });
});
