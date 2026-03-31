import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createUpsertEntityCommand } from "../../src/commands/upsert-entity-command";
import { createSoundEmitterEntity, createTriggerVolumeEntity } from "../../src/entities/entity-instances";

describe("typed entity upsert command", () => {
  it("places a Sound Emitter and restores the previous tool mode across undo and redo", () => {
    const store = createEditorStore();
    const soundEmitter = createSoundEmitterEntity({
      position: {
        x: 1,
        y: 2,
        z: 3
      },
      radius: 5,
      gain: 0.5
    });

    store.setToolMode("box-create");
    store.executeCommand(
      createUpsertEntityCommand({
        entity: soundEmitter,
        label: "Place sound emitter"
      })
    );

    expect(store.getState().toolMode).toBe("select");
    expect(store.getState().selection).toEqual({
      kind: "entities",
      ids: [soundEmitter.id]
    });
    expect(store.getState().document.entities[soundEmitter.id]).toEqual(soundEmitter);

    expect(store.undo()).toBe(true);
    expect(store.getState().toolMode).toBe("box-create");
    expect(store.getState().document.entities).toEqual({});

    expect(store.redo()).toBe(true);
    expect(store.getState().toolMode).toBe("select");
    expect(store.getState().document.entities[soundEmitter.id]).toEqual(soundEmitter);
  });

  it("updates an existing Trigger Volume without changing its entity id", () => {
    const store = createEditorStore();
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main",
      size: {
        x: 2,
        y: 2,
        z: 2
      }
    });
    const movedTriggerVolume = createTriggerVolumeEntity({
      ...triggerVolume,
      position: {
        x: 4,
        y: 1,
        z: -2
      },
      size: {
        x: 3,
        y: 4,
        z: 5
      },
      triggerOnEnter: false,
      triggerOnExit: true
    });

    store.executeCommand(
      createUpsertEntityCommand({
        entity: triggerVolume,
        label: "Place trigger volume"
      })
    );
    store.setToolMode("box-create");
    store.executeCommand(
      createUpsertEntityCommand({
        entity: movedTriggerVolume,
        label: "Update trigger volume"
      })
    );

    expect(store.getState().toolMode).toBe("select");
    expect(store.getState().document.entities[triggerVolume.id]).toEqual(movedTriggerVolume);

    expect(store.undo()).toBe(true);
    expect(store.getState().toolMode).toBe("box-create");
    expect(store.getState().document.entities[triggerVolume.id]).toEqual(triggerVolume);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.entities[triggerVolume.id]).toEqual(movedTriggerVolume);
  });
});
