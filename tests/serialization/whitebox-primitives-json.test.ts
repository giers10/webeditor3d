import { describe, expect, it } from "vitest";

import {
  createConeBrush,
  createRadialPrismBrush,
  createTorusBrush,
  createWedgeBrush
} from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("whitebox primitive scene JSON", () => {
  it("round-trips wedge, cylinder, cone, and torus brushes through scene JSON", () => {
    const document = createEmptySceneDocument({ name: "Primitive Scene" });
    const wedge = createWedgeBrush({
      id: "brush-wedge-json"
    });
    const cylinder = createRadialPrismBrush({
      id: "brush-cylinder-json",
      sideCount: 12
    });
    const cone = createConeBrush({
      id: "brush-cone-json",
      sideCount: 12
    });
    const torus = createTorusBrush({
      id: "brush-torus-json",
      majorSegmentCount: 16,
      tubeSegmentCount: 8
    });

    document.brushes[wedge.id] = wedge;
    document.brushes[cylinder.id] = cylinder;
    document.brushes[cone.id] = cone;
    document.brushes[torus.id] = torus;

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });
});
