import { describe, expect, it } from "vitest";

import {
  createRadialPrismBrush,
  createWedgeBrush
} from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("whitebox primitive scene JSON", () => {
  it("round-trips wedge and cylinder brushes through scene JSON", () => {
    const document = createEmptySceneDocument({ name: "Primitive Scene" });
    const wedge = createWedgeBrush({
      id: "brush-wedge-json"
    });
    const cylinder = createRadialPrismBrush({
      id: "brush-cylinder-json",
      sideCount: 12
    });

    document.brushes[wedge.id] = wedge;
    document.brushes[cylinder.id] = cylinder;

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });
});
