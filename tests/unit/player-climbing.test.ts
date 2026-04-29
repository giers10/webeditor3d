import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { FIRST_PERSON_PLAYER_SHAPE } from "../../src/runtime-three/player-collision";
import {
  computeClimbPlaneMovement,
  isClimbableWallNormal,
  resolvePlayerClimbSurface,
  shouldEnterClimbing,
  shouldExitClimbing
} from "../../src/runtime-three/player-climbing";
import type { PlayerStartActionInputState } from "../../src/runtime-three/player-input-bindings";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

function createInputState(
  overrides: Partial<PlayerStartActionInputState> = {}
): PlayerStartActionInputState {
  return {
    moveForward: 0,
    moveBackward: 0,
    moveLeft: 0,
    moveRight: 0,
    jump: 0,
    sprint: 0,
    crouch: 0,
    interact: 0,
    clearTarget: 0,
    pauseTime: 0,
    climb: 0,
    ...overrides
  };
}

describe("player climbing helpers", () => {
  it("accepts wall-like normals and rejects floor or ceiling normals", () => {
    expect(isClimbableWallNormal({ x: 0, y: 0, z: 1 })).toBe(true);
    expect(isClimbableWallNormal({ x: 0, y: 1, z: 0 })).toBe(false);
    expect(isClimbableWallNormal({ x: 0, y: -1, z: 0 })).toBe(false);
  });

  it("maps forward/back input vertically and strafe input along the climb face", () => {
    const upward = computeClimbPlaneMovement({
      normal: { x: 0, y: 0, z: 1 },
      input: createInputState({ moveForward: 1 }),
      speedMetersPerSecond: 2,
      dt: 0.5
    });
    const rightward = computeClimbPlaneMovement({
      normal: { x: 0, y: 0, z: 1 },
      input: createInputState({ moveRight: 1 }),
      speedMetersPerSecond: 2,
      dt: 0.5
    });

    expect(upward.motion).toMatchObject({
      x: 0,
      y: 1,
      z: 0
    });
    expect(upward.inputMagnitude).toBe(1);
    expect(rightward.motion).toMatchObject({
      x: 1,
      y: 0,
      z: 0
    });
    expect(rightward.inputMagnitude).toBe(1);
  });

  it("keeps climb entry and exit conditions explicit", () => {
    const surface = {
      brushId: "brush-wall",
      faceId: "negZ",
      point: { x: 0, y: 1, z: 0.75 },
      normal: { x: 0, y: 0, z: -1 },
      distance: 0.75
    };

    expect(
      shouldEnterClimbing({
        climbInput: 1,
        surface,
        jumpPressed: false
      })
    ).toBe(true);
    expect(
      shouldEnterClimbing({
        climbInput: 0,
        surface,
        jumpPressed: false
      })
    ).toBe(false);
    expect(
      shouldExitClimbing({
        climbInput: 1,
        surface,
        jumpPressed: true
      })
    ).toBe(true);
    expect(
      shouldExitClimbing({
        climbInput: 0,
        surface,
        jumpPressed: false
      })
    ).toBe(true);
  });

  it("resolves only authored climbable whitebox faces in front of the player", () => {
    const brush = createBoxBrush({
      id: "brush-climbable-wall",
      center: {
        x: 0,
        y: 1,
        z: 0.9
      },
      size: {
        x: 4,
        y: 2,
        z: 0.25
      }
    });
    brush.faces.negZ.climbable = true;
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Climb Surface Scene" }),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(
      resolvePlayerClimbSurface({
        runtimeScene,
        feetPosition: { x: 0, y: 0, z: 0 },
        facingDirection: { x: 0, y: 0, z: 1 },
        shape: FIRST_PERSON_PLAYER_SHAPE
      })
    ).toMatchObject({
      brushId: brush.id,
      faceId: "negZ",
      normal: {
        x: 0,
        y: 0,
        z: -1
      }
    });

    brush.faces.negZ.climbable = false;
    const runtimeSceneWithoutClimbableFace = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Non Climb Surface Scene" }),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(
      resolvePlayerClimbSurface({
        runtimeScene: runtimeSceneWithoutClimbableFace,
        feetPosition: { x: 0, y: 0, z: 0 },
        facingDirection: { x: 0, y: 0, z: 1 },
        shape: FIRST_PERSON_PLAYER_SHAPE
      })
    ).toBeNull();
  });
});
