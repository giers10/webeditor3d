import { describe, expect, it } from "vitest";

import type { Vec3 } from "../../src/core/vector";
import { createPlayerStartMovementTemplate } from "../../src/entities/entity-instances";
import { FIRST_PERSON_PLAYER_SHAPE } from "../../src/runtime-three/player-collision";
import type {
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "../../src/runtime-three/player-collision";
import { stepPlayerLocomotion } from "../../src/runtime-three/player-locomotion";
import type { PlayerStartActionInputState } from "../../src/runtime-three/player-input-bindings";
import type { RuntimePlayerMovement } from "../../src/runtime-three/runtime-scene-build";

const movementTemplate = createPlayerStartMovementTemplate();

const DEFAULT_MOVEMENT: RuntimePlayerMovement = {
  templateKind: "default",
  moveSpeed: movementTemplate.moveSpeed,
  maxSpeed: movementTemplate.maxSpeed,
  maxStepHeight: movementTemplate.maxStepHeight,
  capabilities: movementTemplate.capabilities,
  jump: movementTemplate.jump,
  sprint: movementTemplate.sprint,
  crouch: movementTemplate.crouch
};

const FORWARD_INPUT: PlayerStartActionInputState = {
  moveForward: 1,
  moveBackward: 0,
  moveLeft: 0,
  moveRight: 0,
  jump: 0,
  sprint: 0,
  crouch: 0
};

function createGroundProbeResult(normal: Vec3): PlayerGroundProbeResult {
  return {
    grounded: true,
    distance: 0,
    normal,
    slopeDegrees:
      (Math.acos(Math.max(-1, Math.min(1, normal.y))) * 180) / Math.PI
  };
}

function stepForwardOnSlope(normal: Vec3) {
  return stepPlayerLocomotion({
    dt: 0.1,
    feetPosition: {
      x: 0,
      y: 0,
      z: 0
    },
    movementYawRadians: 0,
    standingShape: FIRST_PERSON_PLAYER_SHAPE,
    verticalVelocity: 0,
    previousLocomotionState: undefined,
    previousPlanarDisplacement: {
      x: 0,
      y: 0,
      z: 0
    },
    jumpBufferRemainingMs: 0,
    coyoteTimeRemainingMs: 0,
    jumpHoldRemainingMs: 0,
    crouched: false,
    wasJumpPressed: false,
    input: FORWARD_INPUT,
    movement: DEFAULT_MOVEMENT,
    resolveMotion: (feetPosition, motion): ResolvedPlayerMotion => ({
      feetPosition: {
        x: feetPosition.x + motion.x,
        y: feetPosition.y + motion.y,
        z: feetPosition.z + motion.z
      },
      grounded: true,
      collisionCount: 1,
      groundCollisionNormal: normal,
      collidedAxes: {
        x: false,
        y: false,
        z: false
      }
    }),
    resolveVolumeState: () => ({
      inWater: false,
      inFog: false
    }),
    probeGround: () => createGroundProbeResult(normal),
    canOccupyShape: () => true
  });
}

describe("player-locomotion", () => {
  it("keeps uphill planar speed on walkable slopes", () => {
    const slopeAngleRadians = Math.PI / 6;
    const uphillNormal = {
      x: 0,
      y: Math.cos(slopeAngleRadians),
      z: -Math.sin(slopeAngleRadians)
    };

    const step = stepForwardOnSlope(uphillNormal);

    expect(step).not.toBeNull();
    expect(step?.locomotionState.grounded).toBe(true);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(4.5);
    expect(step?.locomotionState.requestedPlanarSpeed).toBeCloseTo(4.5);
    expect(step?.feetPosition.z).toBeCloseTo(0.45);
    expect(step?.feetPosition.y ?? 0).toBeGreaterThan(0.25);
  });

  it("keeps downhill planar speed on walkable slopes", () => {
    const slopeAngleRadians = Math.PI / 6;
    const downhillNormal = {
      x: 0,
      y: Math.cos(slopeAngleRadians),
      z: Math.sin(slopeAngleRadians)
    };

    const step = stepForwardOnSlope(downhillNormal);

    expect(step).not.toBeNull();
    expect(step?.locomotionState.grounded).toBe(true);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(4.5);
    expect(step?.locomotionState.requestedPlanarSpeed).toBeCloseTo(4.5);
    expect(step?.feetPosition.z).toBeCloseTo(0.45);
    expect(step?.feetPosition.y ?? 0).toBeLessThan(-0.25);
  });

  it("preserves airborne planar momentum when movement input is released", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: 2,
      previousLocomotionState: createIdleRuntimeLocomotionState("airborne"),
      previousPlanarDisplacement: {
        x: 0,
        y: 0,
        z: 0.45
      },
      jumpBufferRemainingMs: 0,
      coyoteTimeRemainingMs: 0,
      jumpHoldRemainingMs: 0,
      crouched: false,
      wasJumpPressed: false,
      input: {
        ...FORWARD_INPUT,
        moveForward: 0
      },
      movement: DEFAULT_MOVEMENT,
      resolveMotion: (feetPosition, motion): ResolvedPlayerMotion => ({
        feetPosition: {
          x: feetPosition.x + motion.x,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: false,
        collisionCount: 0,
        groundCollisionNormal: null,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      }),
      resolveVolumeState: () => ({
        inWater: false,
        inFog: false
      }),
      probeGround: () => ({
        grounded: false,
        distance: null,
        normal: null,
        slopeDegrees: null
      }),
      canOccupyShape: () => true
    });

    expect(step).not.toBeNull();
    expect(step?.locomotionState.locomotionMode).toBe("airborne");
    expect(step?.locomotionState.inputMagnitude).toBe(0);
    expect(step?.locomotionState.requestedPlanarSpeed).toBeCloseTo(4.5);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(4.5);
    expect(step?.planarDisplacement.z).toBeCloseTo(0.45);
  });
});