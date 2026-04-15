import { describe, expect, it } from "vitest";

import { applyStarterEnvironmentAssetsToProjectDocument } from "../../src/assets/starter-environment-assets";
import { createEmptyProjectDocument } from "../../src/document/scene-document";
import {
  loadProjectPackage,
  saveProjectPackage
} from "../../src/serialization/project-package";

describe("starter environment project packages", () => {
  it("saves and reloads builtin starter environments without asset storage", async () => {
    const document = applyStarterEnvironmentAssetsToProjectDocument(
      createEmptyProjectDocument()
    );

    const bytes = await saveProjectPackage(document, null);
    const loadedDocument = await loadProjectPackage(bytes, null);

    expect(loadedDocument).toEqual(document);
  });
});
