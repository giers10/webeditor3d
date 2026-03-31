import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";
import { parseSceneDocumentJson, serializeSceneDocument } from "../../src/serialization/scene-document-json";

describe("scene document JSON", () => {
  it("round-trips the current empty schema", () => {
    const document = createEmptySceneDocument({ name: "Bootstrap Scene" });
    const serializedDocument = serializeSceneDocument(document);

    expect(parseSceneDocumentJson(serializedDocument)).toEqual(document);
  });

  it("round-trips a document containing a canonical box brush", () => {
    const brush = createBoxBrush({
      id: "brush-box-room",
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 4,
        y: 2,
        z: 6
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Brush Scene" }),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("round-trips per-face material and UV state", () => {
    const brush = createBoxBrush({
      id: "brush-face-room",
      center: {
        x: 2,
        y: 2,
        z: -1
      },
      size: {
        x: 6,
        y: 4,
        z: 8
      }
    });

    brush.faces.posX.materialId = "starter-amber-grid";
    brush.faces.posX.uv = {
      offset: {
        x: 0.5,
        y: -0.25
      },
      scale: {
        x: 0.25,
        y: 0.5
      },
      rotationQuarterTurns: 3,
      flipU: true,
      flipV: true
    };

    const document = {
      ...createEmptySceneDocument({ name: "Face UV Scene" }),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(document);
  });

  it("migrates the foundation schema to the current schema version", () => {
    const migratedDocument = migrateSceneDocument({
      version: 1,
      name: "Foundation Scene",
      world: createEmptySceneDocument().world,
      textures: {},
      assets: {},
      brushes: {},
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(3);
    expect(migratedDocument.brushes).toEqual({});
    expect(migratedDocument.name).toBe("Foundation Scene");
    expect(Object.keys(migratedDocument.materials)).toEqual(STARTER_MATERIAL_LIBRARY.map((material) => material.id));
  });

  it("migrates slice 1.1 box brushes to explicit per-face UV state", () => {
    const migratedDocument = migrateSceneDocument({
      version: 2,
      name: "Legacy Brush Scene",
      world: createEmptySceneDocument().world,
      materials: {},
      textures: {},
      assets: {},
      brushes: {
        "brush-legacy": {
          id: "brush-legacy",
          kind: "box",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          size: {
            x: 4,
            y: 2,
            z: 6
          },
          faces: {
            posX: { materialId: null },
            negX: { materialId: null },
            posY: { materialId: null },
            negY: { materialId: null },
            posZ: { materialId: "starter-amber-grid" },
            negZ: { materialId: null }
          }
        }
      },
      modelInstances: {},
      entities: {},
      interactionLinks: {}
    });

    expect(migratedDocument.version).toBe(3);
    expect(migratedDocument.brushes["brush-legacy"].faces.posZ.materialId).toBe("starter-amber-grid");
    expect(migratedDocument.brushes["brush-legacy"].faces.posZ.uv).toEqual({
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
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      migrateSceneDocument({
        version: 99,
        name: "Legacy",
        world: {},
        textures: {},
        assets: {},
        brushes: {},
        modelInstances: {},
        entities: {},
        interactionLinks: {}
      })
    ).toThrow("Unsupported scene document version");
  });
});
