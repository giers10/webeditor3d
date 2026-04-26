import { describe, expect, it } from "vitest";

import {
  DEFAULT_CAMERA_RIG_DEFAULT_ACTIVE,
  DEFAULT_CAMERA_RIG_LOOK_AROUND_ENABLED,
  DEFAULT_CAMERA_RIG_LOOK_AROUND_PITCH_LIMIT_DEGREES,
  DEFAULT_CAMERA_RIG_LOOK_AROUND_RECENTER_SPEED,
  DEFAULT_CAMERA_RIG_LOOK_AROUND_YAW_LIMIT_DEGREES,
  DEFAULT_CAMERA_RIG_PRIORITY,
  DEFAULT_CAMERA_RIG_TARGET_OFFSET,
  DEFAULT_CAMERA_RIG_TRANSITION_DURATION_SECONDS,
  DEFAULT_CAMERA_RIG_TRANSITION_MODE,
  DEFAULT_POINT_LIGHT_COLOR_HEX,
  DEFAULT_POINT_LIGHT_DISTANCE,
  DEFAULT_POINT_LIGHT_INTENSITY,
  DEFAULT_PLAYER_START_BOX_SIZE,
  DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
  DEFAULT_PLAYER_START_CAPSULE_RADIUS,
  DEFAULT_PLAYER_START_CROUCH_SETTINGS,
  DEFAULT_PLAYER_START_EYE_HEIGHT,
  DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
  DEFAULT_PLAYER_START_JUMP_SETTINGS,
  DEFAULT_PLAYER_START_MOVE_SPEED,
  DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
  DEFAULT_PLAYER_START_SPRINT_SETTINGS,
  DEFAULT_SPOT_LIGHT_ANGLE_DEGREES,
  DEFAULT_SPOT_LIGHT_COLOR_HEX,
  DEFAULT_SPOT_LIGHT_DISTANCE,
  DEFAULT_SPOT_LIGHT_DIRECTION,
  DEFAULT_SPOT_LIGHT_INTENSITY,
  DEFAULT_INTERACTABLE_PROMPT,
  DEFAULT_NPC_YAW_DEGREES,
  DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID,
  DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
  DEFAULT_SOUND_EMITTER_REF_DISTANCE,
  DEFAULT_SOUND_EMITTER_VOLUME,
  DEFAULT_TRIGGER_VOLUME_SIZE,
  createPointLightEntity,
  createDefaultEntityInstance,
  createInteractableEntity,
  createNpcEntity,
  createSpotLightEntity,
  getEntityRegistryEntry
} from "../../src/entities/entity-instances";

describe("entity registry defaults", () => {
  it("creates explicit typed defaults for each supported entity kind", () => {
    expect(createDefaultEntityInstance("playerStart")).toMatchObject({
      kind: "playerStart",
      position: { x: 0, y: 0, z: 0 },
      yawDegrees: 0,
      navigationMode: "firstPerson",
      interactionReachMeters: DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
      movementTemplate: {
        kind: "default",
        moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
        capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
        jump: DEFAULT_PLAYER_START_JUMP_SETTINGS,
        sprint: DEFAULT_PLAYER_START_SPRINT_SETTINGS,
        crouch: DEFAULT_PLAYER_START_CROUCH_SETTINGS
      },
      collider: {
        mode: "capsule",
        eyeHeight: DEFAULT_PLAYER_START_EYE_HEIGHT,
        capsuleRadius: DEFAULT_PLAYER_START_CAPSULE_RADIUS,
        capsuleHeight: DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
        boxSize: DEFAULT_PLAYER_START_BOX_SIZE
      },
      inputBindings: {
        keyboard: {
          moveForward: "KeyW",
          moveBackward: "KeyS",
          moveLeft: "KeyA",
          moveRight: "KeyD",
          jump: "Space",
          sprint: "ShiftLeft",
          crouch: "ControlLeft"
        },
        gamepad: {
          moveForward: "leftStickUp",
          moveBackward: "leftStickDown",
          moveLeft: "leftStickLeft",
          moveRight: "leftStickRight",
          jump: "buttonSouth",
          sprint: "leftStickPress",
          crouch: "buttonEast",
          cameraLook: "rightStick"
        }
      }
    });

    expect(createDefaultEntityInstance("pointLight")).toMatchObject({
      kind: "pointLight",
      position: { x: 0, y: 0, z: 0 },
      colorHex: DEFAULT_POINT_LIGHT_COLOR_HEX,
      intensity: DEFAULT_POINT_LIGHT_INTENSITY,
      distance: DEFAULT_POINT_LIGHT_DISTANCE
    });

    expect(createDefaultEntityInstance("cameraRig")).toMatchObject({
      kind: "cameraRig",
      position: { x: 0, y: 0, z: 0 },
      rigType: "fixed",
      priority: DEFAULT_CAMERA_RIG_PRIORITY,
      defaultActive: DEFAULT_CAMERA_RIG_DEFAULT_ACTIVE,
      target: {
        kind: "player"
      },
      targetOffset: DEFAULT_CAMERA_RIG_TARGET_OFFSET,
      transitionMode: DEFAULT_CAMERA_RIG_TRANSITION_MODE,
      transitionDurationSeconds: DEFAULT_CAMERA_RIG_TRANSITION_DURATION_SECONDS,
      lookAround: {
        enabled: DEFAULT_CAMERA_RIG_LOOK_AROUND_ENABLED,
        yawLimitDegrees: DEFAULT_CAMERA_RIG_LOOK_AROUND_YAW_LIMIT_DEGREES,
        pitchLimitDegrees: DEFAULT_CAMERA_RIG_LOOK_AROUND_PITCH_LIMIT_DEGREES,
        recenterSpeed: DEFAULT_CAMERA_RIG_LOOK_AROUND_RECENTER_SPEED
      }
    });

    expect(createDefaultEntityInstance("spotLight")).toMatchObject({
      kind: "spotLight",
      position: { x: 0, y: 0, z: 0 },
      direction: DEFAULT_SPOT_LIGHT_DIRECTION,
      colorHex: DEFAULT_SPOT_LIGHT_COLOR_HEX,
      intensity: DEFAULT_SPOT_LIGHT_INTENSITY,
      distance: DEFAULT_SPOT_LIGHT_DISTANCE,
      angleDegrees: DEFAULT_SPOT_LIGHT_ANGLE_DEGREES
    });

    expect(createDefaultEntityInstance("soundEmitter")).toMatchObject({
      kind: "soundEmitter",
      position: { x: 0, y: 0, z: 0 },
      audioAssetId: DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID,
      volume: DEFAULT_SOUND_EMITTER_VOLUME,
      refDistance: DEFAULT_SOUND_EMITTER_REF_DISTANCE,
      maxDistance: DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
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

    expect(createDefaultEntityInstance("npc")).toMatchObject({
      kind: "npc",
      position: { x: 0, y: 0, z: 0 },
      yawDegrees: DEFAULT_NPC_YAW_DEGREES,
      modelAssetId: null
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

    expect(() =>
      createPointLightEntity({
        distance: 0
      })
    ).toThrow("Point Light distance must be a finite number greater than zero.");

    expect(() =>
      createSpotLightEntity({
        direction: {
          x: 0,
          y: 0,
          z: 0
        }
      })
    ).toThrow("Spot Light direction must not be the zero vector.");

    expect(() =>
      createNpcEntity({
        actorId: "   "
      })
    ).toThrow("NPC actorId must be a non-empty string.");
  });
});
