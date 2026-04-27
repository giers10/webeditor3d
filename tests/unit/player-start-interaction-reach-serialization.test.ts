import { describe, expect, it } from "vitest";

import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createEmptySceneDocument,
  PLAYER_START_TARGETING_SETTINGS_SCENE_DOCUMENT_VERSION,
  PLAYER_START_INTERACTION_REACH_SCENE_DOCUMENT_VERSION,
  PLAYER_START_INTERACT_BINDINGS_SCENE_DOCUMENT_VERSION
} from "../../src/document/scene-document";
import {
  DEFAULT_PLAYER_START_ALLOW_LOOK_INPUT_TARGET_SWITCH,
  DEFAULT_PLAYER_START_INVERT_MOUSE_CAMERA_HORIZONTAL,
  DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES,
  DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
  DEFAULT_PLAYER_START_TARGET_BUTTON_CYCLES_ACTIVE_TARGET,
  createPlayerStartEntity
} from "../../src/entities/entity-instances";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("Player Start interaction sector persistence", () => {
  it("migrates legacy player starts without an authored interaction sector", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy"
    });
    const legacyPlayerStart = {
      ...playerStart
    } as Record<string, unknown>;

    delete legacyPlayerStart.interactionReachMeters;
    delete legacyPlayerStart.interactionAngleDegrees;

    const migrated = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Reach Scene" }),
      version: PLAYER_START_INTERACTION_REACH_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: legacyPlayerStart
      }
    });

    expect(migrated.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      interactionReachMeters: DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
      interactionAngleDegrees: DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES
    });
  });

  it("round-trips authored interaction sector settings through scene JSON", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-round-trip",
      interactionReachMeters: 3.4,
      interactionAngleDegrees: 42,
      allowLookInputTargetSwitch: false,
      targetButtonCyclesActiveTarget: true,
      invertMouseCameraHorizontal: true,
      inputBindings: {
        keyboard: {
          clearTarget: "KeyQ"
        },
        gamepad: {
          clearTarget: "rightShoulder"
        }
      }
    });
    const document = {
      ...createEmptySceneDocument({ name: "Round Trip Reach Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const parsed = parseSceneDocumentJson(serializeSceneDocument(document));

    expect(parsed.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      interactionReachMeters: 3.4,
      interactionAngleDegrees: 42,
      allowLookInputTargetSwitch: false,
      targetButtonCyclesActiveTarget: true,
      invertMouseCameraHorizontal: true,
      inputBindings: {
        keyboard: {
          clearTarget: "KeyQ"
        },
        gamepad: {
          clearTarget: "rightShoulder"
        }
      }
    });
  });

  it("migrates version 82 player starts to include targeting defaults and clear-target bindings", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-targeting-legacy"
    });
    const legacyPlayerStart = {
      ...playerStart,
      inputBindings: {
        keyboard: {
          moveForward: playerStart.inputBindings.keyboard.moveForward,
          moveBackward: playerStart.inputBindings.keyboard.moveBackward,
          moveLeft: playerStart.inputBindings.keyboard.moveLeft,
          moveRight: playerStart.inputBindings.keyboard.moveRight,
          jump: playerStart.inputBindings.keyboard.jump,
          sprint: playerStart.inputBindings.keyboard.sprint,
          crouch: playerStart.inputBindings.keyboard.crouch,
          interact: playerStart.inputBindings.keyboard.interact,
          pauseTime: playerStart.inputBindings.keyboard.pauseTime
        },
        gamepad: {
          moveForward: playerStart.inputBindings.gamepad.moveForward,
          moveBackward: playerStart.inputBindings.gamepad.moveBackward,
          moveLeft: playerStart.inputBindings.gamepad.moveLeft,
          moveRight: playerStart.inputBindings.gamepad.moveRight,
          jump: playerStart.inputBindings.gamepad.jump,
          sprint: playerStart.inputBindings.gamepad.sprint,
          crouch: playerStart.inputBindings.gamepad.crouch,
          interact: playerStart.inputBindings.gamepad.interact,
          pauseTime: playerStart.inputBindings.gamepad.pauseTime,
          cameraLook: playerStart.inputBindings.gamepad.cameraLook
        }
      }
    } as Record<string, unknown>;

    delete legacyPlayerStart.allowLookInputTargetSwitch;
    delete legacyPlayerStart.targetButtonCyclesActiveTarget;

    const migrated = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Player Targeting Scene" }),
      version: PLAYER_START_INTERACT_BINDINGS_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: legacyPlayerStart
      }
    });

    expect(migrated.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      allowLookInputTargetSwitch:
        DEFAULT_PLAYER_START_ALLOW_LOOK_INPUT_TARGET_SWITCH,
      targetButtonCyclesActiveTarget:
        DEFAULT_PLAYER_START_TARGET_BUTTON_CYCLES_ACTIVE_TARGET,
      inputBindings: {
        keyboard: {
          clearTarget: "Escape"
        },
        gamepad: {
          clearTarget: "buttonNorth"
        }
      }
    });
  });

  it("migrates version 83 player starts to include the mouse inversion default", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-mouse-invert-legacy"
    });
    const legacyPlayerStart = {
      ...playerStart
    } as Record<string, unknown>;

    delete legacyPlayerStart.invertMouseCameraHorizontal;

    const migrated = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Player Mouse Invert Scene" }),
      version: PLAYER_START_TARGETING_SETTINGS_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: legacyPlayerStart
      }
    });

    expect(migrated.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      invertMouseCameraHorizontal:
        DEFAULT_PLAYER_START_INVERT_MOUSE_CAMERA_HORIZONTAL
    });
  });
});
