import { describe, expect, it } from "vitest";

import type { Vec3 } from "../../src/core/vector";
import { createPlayerStartMovementTemplate } from "../../src/entities/entity-instances";
import { FIRST_PERSON_PLAYER_SHAPE } from "../../src/runtime-three/player-collision";
import type {
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "../../src/runtime-three/player-collision";
import { createIdleRuntimeLocomotionState } from "../../src/runtime-three/player-locomotion";
import { stepPlayerLocomotion } from "../../src/runtime-three/player-locomotion";
import type { PlayerStartActionInputState } from "../../src/runtime-three/player-input-bindings";
import type { RuntimePlayerMovement } from "../../src/runtime-three/runtime-scene-build";
import { smoothGroundedStairHeight } from "../../src/runtime-three/stair-height-smoothing";

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
  crouch: 0,
  interact: 0,
  clearTarget: 0,
  pauseTime: 0
};

function createVolumeState(
  overrides: {
    inWater?: boolean;
    inFog?: boolean;
    waterSurfaceHeight?: number | null;
  } = {}
) {
  return {
    inWater: false,
    inFog: false,
    waterSurfaceHeight: null,
    ...overrides
  };
}

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
      ...createVolumeState()
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
        ...createVolumeState()
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

  it("keeps shallow water grounded instead of switching to swim locomotion", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 0,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: 0,
      previousLocomotionState: createIdleRuntimeLocomotionState("grounded"),
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
        collisionCount: 0,
        groundCollisionNormal: { x: 0, y: 1, z: 0 },
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      }),
      resolveVolumeState: () =>
        createVolumeState({
          inWater: true,
          waterSurfaceHeight: 1.5
        }),
      probeGround: () => ({
        grounded: true,
        distance: 0,
        normal: { x: 0, y: 1, z: 0 },
        slopeDegrees: 0
      }),
      canOccupyShape: () => true
    });

    expect(step).not.toBeNull();
    expect(step?.locomotionState.locomotionMode).toBe("grounded");
    expect(step?.inWaterVolume).toBe(false);
  });

  it("keeps a sprint jump airborne while crossing narrow water", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 0,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: 0,
      previousLocomotionState: createIdleRuntimeLocomotionState("grounded"),
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
      input: {
        ...FORWARD_INPUT,
        jump: 1,
        sprint: 1
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
      resolveVolumeState: () =>
        createVolumeState({
          inWater: true,
          waterSurfaceHeight: 1.5
        }),
      probeGround: () => ({
        grounded: true,
        distance: 0,
        normal: { x: 0, y: 1, z: 0 },
        slopeDegrees: 0
      }),
      canOccupyShape: () => true
    });

    expect(step).not.toBeNull();
    expect(step?.jumpStarted).toBe(true);
    expect(step?.locomotionState.locomotionMode).toBe("airborne");
    expect(step?.inWaterVolume).toBe(false);
    expect(step?.locomotionState.sprinting).toBe(true);
    expect(step?.verticalVelocity).toBeCloseTo(DEFAULT_MOVEMENT.jump.speed);
  });

  it("stays airborne when a wall edge reports grounded without floor support", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: -1.5,
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
      input: FORWARD_INPUT,
      movement: DEFAULT_MOVEMENT,
      resolveMotion: (feetPosition, motion): ResolvedPlayerMotion => ({
        feetPosition: {
          x: feetPosition.x + motion.x * 0.2,
          y: feetPosition.y + motion.y * 0.2,
          z: feetPosition.z + motion.z * 0.2
        },
        grounded: true,
        collisionCount: 1,
        groundCollisionNormal: null,
        collidedAxes: {
          x: true,
          y: false,
          z: false
        }
      }),
      resolveVolumeState: () => createVolumeState(),
      probeGround: () => ({
        grounded: false,
        distance: null,
        normal: null,
        slopeDegrees: null
      }),
      canOccupyShape: () => true
    });

    expect(step).not.toBeNull();
    expect(step?.locomotionState.grounded).toBe(false);
    expect(step?.locomotionState.locomotionMode).toBe("airborne");
    expect(step?.verticalVelocity).toBeLessThan(0);
  });

  it("disables jump-phase air movement when move while jumping is off", () => {
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
        z: 0
      },
      jumpBufferRemainingMs: 0,
      coyoteTimeRemainingMs: 0,
      jumpHoldRemainingMs: 0,
      crouched: false,
      wasJumpPressed: false,
      input: FORWARD_INPUT,
      movement: {
        ...DEFAULT_MOVEMENT,
        jump: {
          ...DEFAULT_MOVEMENT.jump,
          moveWhileJumping: false
        }
      },
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
      resolveVolumeState: () => createVolumeState(),
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
    expect(step?.planarDisplacement.z).toBeCloseTo(0);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(0);
  });

  it("keeps falling when airborne input pushes into a wall and the pre-move probe flickers grounded", () => {
    let probeCount = 0;

    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: -1.5,
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
      input: FORWARD_INPUT,
      movement: DEFAULT_MOVEMENT,
      resolveMotion: (feetPosition, motion): ResolvedPlayerMotion => ({
        feetPosition: {
          x: feetPosition.x + motion.x * 0.2,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: false,
        collisionCount: 1,
        groundCollisionNormal: null,
        collidedAxes: {
          x: true,
          y: false,
          z: false
        }
      }),
      resolveVolumeState: () => createVolumeState(),
      probeGround: () => {
        probeCount += 1;

        if (probeCount === 1) {
          return {
            grounded: true,
            distance: 0,
            normal: { x: 0, y: 1, z: 0 },
            slopeDegrees: 0
          };
        }

        return {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        };
      },
      canOccupyShape: () => true
    });

    expect(step).not.toBeNull();
    expect(step?.locomotionState.grounded).toBe(false);
    expect(step?.locomotionState.locomotionMode).toBe("airborne");
    expect(step?.verticalVelocity).toBeLessThan(-1.5);
  });

  it("disables falling air movement when move while falling is off", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: -2,
      previousLocomotionState: createIdleRuntimeLocomotionState("airborne"),
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
      movement: {
        ...DEFAULT_MOVEMENT,
        jump: {
          ...DEFAULT_MOVEMENT.jump,
          moveWhileFalling: false
        }
      },
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
      resolveVolumeState: () => createVolumeState(),
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
    expect(step?.planarDisplacement.z).toBeCloseTo(0);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(0);
  });

  it("reorients airborne movement using existing speed without adding more", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1,
        z: 0
      },
      movementYawRadians: 0,
      airDirectionYawRadians: Math.PI / 2,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: -2,
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
      input: FORWARD_INPUT,
      movement: {
        ...DEFAULT_MOVEMENT,
        jump: {
          ...DEFAULT_MOVEMENT.jump,
          directionOnly: true
        }
      },
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
      resolveVolumeState: () => createVolumeState(),
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
    expect(step?.planarDisplacement.x).toBeCloseTo(0.45);
    expect(step?.planarDisplacement.z).toBeCloseTo(0);
    expect(step?.locomotionState.requestedPlanarSpeed).toBeCloseTo(4.5);
    expect(step?.locomotionState.planarSpeed).toBeCloseTo(4.5);
  });

  it("smooths grounded stair height changes instead of snapping", () => {
    const smoothedHeight = smoothGroundedStairHeight({
      currentSmoothedFeetY: 0,
      targetFeetY: 0.2,
      grounded: true,
      dt: 1 / 60,
      maxStepHeight: 0.5
    });

    expect(smoothedHeight).toBeGreaterThan(0);
    expect(smoothedHeight).toBeLessThan(0.2);
  });

  it("snaps grounded height smoothing when the player leaves the ground", () => {
    const smoothedHeight = smoothGroundedStairHeight({
      currentSmoothedFeetY: 0,
      targetFeetY: 0.2,
      grounded: false,
      dt: 1 / 60,
      maxStepHeight: 0.5
    });

    expect(smoothedHeight).toBeCloseTo(0.2);
  });

  it("snaps grounded height smoothing for ledge-sized vertical jumps", () => {
    const smoothedHeight = smoothGroundedStairHeight({
      currentSmoothedFeetY: 0,
      targetFeetY: 1,
      grounded: true,
      dt: 1 / 60,
      maxStepHeight: 0.35
    });

    expect(smoothedHeight).toBeCloseTo(1);
  });

  it("sinks toward the water surface while keeping the head above water", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 1.2,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: 0,
      previousLocomotionState: createIdleRuntimeLocomotionState("swimming"),
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
      resolveVolumeState: () =>
        createVolumeState({
          inWater: true,
          waterSurfaceHeight: 2.4
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
    expect(step?.locomotionState.locomotionMode).toBe("swimming");
    expect(step?.inWaterVolume).toBe(true);
    expect(step?.feetPosition.y).toBeCloseTo(0.84, 5);
    expect(
      (step?.feetPosition.y ?? 0) + FIRST_PERSON_PLAYER_SHAPE.eyeHeight
    ).toBeGreaterThan(2.4);
  });

  it("uses sprint input to dive downward while submerged", () => {
    const step = stepPlayerLocomotion({
      dt: 0.1,
      feetPosition: {
        x: 0,
        y: 0.5,
        z: 0
      },
      movementYawRadians: 0,
      standingShape: FIRST_PERSON_PLAYER_SHAPE,
      verticalVelocity: 0,
      previousLocomotionState: createIdleRuntimeLocomotionState("diving"),
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
      input: {
        ...FORWARD_INPUT,
        moveForward: 0,
        sprint: 1
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
      resolveVolumeState: () =>
        createVolumeState({
          inWater: true,
          waterSurfaceHeight: 2.4
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
    expect(step?.locomotionState.locomotionMode).toBe("diving");
    expect(step?.verticalVelocity).toBeCloseTo(-DEFAULT_MOVEMENT.moveSpeed);
    expect(step?.feetPosition.y).toBeCloseTo(0.05, 5);
  });
});
