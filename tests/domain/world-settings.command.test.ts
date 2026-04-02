import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createSetWorldSettingsCommand } from "../../src/commands/set-world-settings-command";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { cloneWorldSettings } from "../../src/document/world-settings";

describe("createSetWorldSettingsCommand", () => {
  it("updates authored world settings and restores them through undo", () => {
    const store = createEditorStore();
    const originalWorld = cloneWorldSettings(store.getState().document.world);
    const nextWorld = cloneWorldSettings(originalWorld);

    nextWorld.background = {
      mode: "verticalGradient",
      topColorHex: "#6e8db4",
      bottomColorHex: "#18212b"
    };
    nextWorld.ambientLight.intensity = 0.45;
    nextWorld.advancedRendering.enabled = true;
    nextWorld.advancedRendering.shadows.enabled = true;
    nextWorld.advancedRendering.shadows.mapSize = 4096;
    nextWorld.advancedRendering.toneMapping.mode = "reinhard";
    nextWorld.advancedRendering.toneMapping.exposure = 1.35;

    store.executeCommand(
      createSetWorldSettingsCommand({
        label: "Set world lighting",
        world: nextWorld
      })
    );

    expect(store.getState().document.world).toEqual(nextWorld);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.world).toEqual(createEmptySceneDocument().world);
  });
});
