import { describe, expect, it } from "vitest";

import {
  DEFAULT_INTERACTABLE_PROMPT,
  DEFAULT_SOUND_EMITTER_GAIN,
  DEFAULT_SOUND_EMITTER_RADIUS,
  DEFAULT_TRIGGER_VOLUME_SIZE,
  createDefaultEntityInstance,
  createInteractableEntity,
  getEntityRegistryEntry
} from "../../src/entities/entity-instances";

describe("entity registry defaults", () => {
  it("creates explicit typed defaults for each supported entity kind", () => {
    expect(createDefaultEntityInstance("playerStart")).toMatchObject({
      kind: "playerStart",
      position: { x: 0, y: 0, z: 0 },
      yawDegrees: 0
    });

    expect(createDefaultEntityInstance("soundEmitter")).toMatchObject({
      kind: "soundEmitter",
      position: { x: 0, y: 0, z: 0 },
      radius: DEFAULT_SOUND_EMITTER_RADIUS,
      gain: DEFAULT_SOUND_EMITTER_GAIN,
      autoplay: false,
      loop: false
    });

    expect(createDefaultEntityInstance("triggerVolume")).toMatchObject({
      kind: "triggerVolume",
      position: { x: 0, y: 0, z: 0 },
      size: DEFAULT_TRIGGER_VOLUME_SIZE,
      triggerOnEnter: true,
      triggerOnExit: false
    });

    expect(createDefaultEntityInstance("teleportTarget")).toMatchObject({
      kind: "teleportTarget",
      position: { x: 0, y: 0, z: 0 },
      yawDegrees: 0
    });

    expect(createDefaultEntityInstance("interactable")).toMatchObject({
      kind: "interactable",
      position: { x: 0, y: 0, z: 0 },
      radius: 1.5,
      prompt: DEFAULT_INTERACTABLE_PROMPT,
      enabled: true
    });
  });

  it("keeps entity metadata and prompt validation explicit", () => {
    expect(getEntityRegistryEntry("triggerVolume")).toMatchObject({
      kind: "triggerVolume",
      label: "Trigger Volume"
    });

    expect(
      createInteractableEntity({
        prompt: "  Open  "
      }).prompt
    ).toBe("Open");

    expect(() =>
      createInteractableEntity({
        prompt: "   "
      })
    ).toThrow("Interactable prompt must be non-empty.");
  });
});
