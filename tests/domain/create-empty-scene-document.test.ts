import { describe, expect, it } from "vitest";

import { SCENE_DOCUMENT_VERSION, createEmptySceneDocument } from "../../src/document/scene-document";

describe("createEmptySceneDocument", () => {
  it("creates a versioned empty scene document", () => {
    const document = createEmptySceneDocument();

    expect(document.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(document.name).toBe("Untitled Scene");
    expect(document.brushes).toEqual({});
    expect(document.entities).toEqual({});
    expect(document.modelInstances).toEqual({});
  });
});
