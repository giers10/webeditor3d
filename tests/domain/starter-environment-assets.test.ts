import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import {
  STARTER_DAY_ENVIRONMENT_ASSET_ID,
  STARTER_NIGHT_ENVIRONMENT_ASSET_ID
} from "../../src/assets/starter-environment-assets";
import { createEmptyProjectDocument } from "../../src/document/scene-document";
import { DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY } from "../../src/document/world-settings";

describe("starter environment assets", () => {
  it("seeds starter environments and defaults untouched day and night backgrounds", () => {
    const store = createEditorStore();
    const projectDocument = store.getState().projectDocument;
    const world = store.getState().document.world;

    expect(projectDocument.assets[STARTER_DAY_ENVIRONMENT_ASSET_ID]).toBeDefined();
    expect(projectDocument.assets[STARTER_NIGHT_ENVIRONMENT_ASSET_ID]).toBeDefined();
    expect(world.background).toEqual({
      mode: "image",
      assetId: STARTER_DAY_ENVIRONMENT_ASSET_ID,
      environmentIntensity: 0.85
    });
    expect(world.timeOfDay.night.background).toEqual({
      mode: "image",
      assetId: STARTER_NIGHT_ENVIRONMENT_ASSET_ID,
      environmentIntensity: DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY
    });
  });

  it("does not overwrite authored scene backgrounds when adding starter environments", () => {
    const projectDocument = createEmptyProjectDocument();
    const activeScene = projectDocument.scenes[projectDocument.activeSceneId];

    activeScene.world.background = {
      mode: "solid",
      colorHex: "#123456"
    };
    activeScene.world.timeOfDay.night.background = {
      mode: "solid",
      colorHex: "#05070a"
    };

    const store = createEditorStore({
      initialProjectDocument: projectDocument
    });
    const world = store.getState().document.world;

    expect(store.getState().projectDocument.assets[STARTER_DAY_ENVIRONMENT_ASSET_ID]).toBeDefined();
    expect(store.getState().projectDocument.assets[STARTER_NIGHT_ENVIRONMENT_ASSET_ID]).toBeDefined();
    expect(world.background).toEqual({
      mode: "solid",
      colorHex: "#123456"
    });
    expect(world.timeOfDay.night.background).toEqual({
      mode: "solid",
      colorHex: "#05070a"
    });
  });
});
