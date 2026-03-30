import { describe, expect, it } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import { parseSceneDocumentJson, serializeSceneDocument } from "../../src/serialization/scene-document-json";

describe("scene document JSON", () => {
  it("round-trips the current empty schema", () => {
    const document = createEmptySceneDocument({ name: "Bootstrap Scene" });
    const serializedDocument = serializeSceneDocument(document);

    expect(parseSceneDocumentJson(serializedDocument)).toEqual(document);
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      migrateSceneDocument({
        version: 99,
        name: "Legacy",
        world: {},
        materials: {},
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
