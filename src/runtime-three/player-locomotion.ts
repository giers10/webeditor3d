import type { Vec3 } from "../core/vector";

import type {
  RuntimeLocomotionContactState,
  RuntimeLocomotionMode,
  RuntimeLocomotionState,
  RuntimePlayerVolumeState
} from "./navigation-controller";
import type { PlayerStartActionInputState } from "./player-input-bindings";
import {
  cloneFirstPersonPlayerShape,
  createCrouchedFirstPersonPlayerShape,
  type FirstPersonPlayerShape,
  type PlayerGroundProbeResult,
  type ResolvedPlayerMotion
} from "./player-collision";
import type { RuntimePlayerMovement } from "./runtime-scene-build";

const ACTION_ACTIVE_THRESHOLD = 0.5;
const GRAVITY = 22;
const GROUND_PROBE_DISTANCE = 0.12;
const VERTICAL_ASCENT_EPSILON = 1e-4;
const IDLE_SPEED_EPSILON = 0.05;
const VARIABLE_JUMP_HOLD_GRAVITY_FACTOR = 0.45;
const VARIABLE_JUMP_RELEASE_VELOCITY_FACTOR = 0.45;
const SWIM_HEAD_CLEARANCE = 0.04;

function clampPlanarSpeed(speed: number, maxSpeed: number): number {
  if (maxSpeed <= 0) {
    return speed;
  }

  return Math.min(speed, maxSpeed);
}

function clampUnitInterval(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createEmptyLocomotionContactState(): RuntimeLocomotionContactState {
  return {
    collisionCount: 0,
    collidedAxes: {
      x: false,
      y: false,
      z: false
    },
    groundNormal: null,
    groundDistance: null,
    slopeDegrees: null
  };
}

export function createIdleRuntimeLocomotionState(
  locomotionMode: RuntimeLocomotionMode = "flying"
): RuntimeLocomotionState {
  return {
    locomotionMode,
    airborneKind:
      locomotionMode === "airborne" ? "falling" : null,
    gait: "idle",
    grounded: locomotionMode === "grounded",
    crouched: false,
    sprinting: false,
    inputMagnitude: 0,
    requestedPlanarSpeed: 0,
    planarSpeed: 0,
    verticalVelocity: 0,
    contact: createEmptyLocomotionContactState()
  };
}

export interface StepPlayerLocomotionOptions {
  dt: number;
  feetPosition: Vec3;
  movementYawRadians: number;
  airDirectionYawRadians?: number;
  standingShape: FirstPersonPlayerShape;
  verticalVelocity: number;
  previousLocomotionState?: RuntimeLocomotionState;
  previousPlanarDisplacement: Vec3;
  jumpBufferRemainingMs: number;
  coyoteTimeRemainingMs: number;
  jumpHoldRemainingMs: number;
  crouched: boolean;
  wasJumpPressed: boolean;
  input: PlayerStartActionInputState;
  movement: RuntimePlayerMovement;
  resolveMotion(
    feetPosition: Vec3,
    motion: Vec3,
    shape: FirstPersonPlayerShape
  ): ResolvedPlayerMotion | null;
  resolveVolumeState(feetPosition: Vec3): RuntimePlayerVolumeState;
  probeGround(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape,
    maxDistance: number
  ): PlayerGroundProbeResult;
  canOccupyShape(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape
  ): boolean;
}

export interface StepPlayerLocomotionResult {
  feetPosition: Vec3;
  activeShape: FirstPersonPlayerShape;
  verticalVelocity: number;
  jumpBufferRemainingMs: number;
  coyoteTimeRemainingMs: number;
  jumpHoldRemainingMs: number;
  crouched: boolean;
  jumpPressed: boolean;
  jumpStarted: boolean;
  headBump: boolean;
  locomotionState: RuntimeLocomotionState;
  inWaterVolume: boolean;
  inFogVolume: boolean;
  planarDisplacement: Vec3;
}

function readGroundProbe(
  feetPosition: Vec3,
  shape: FirstPersonPlayerShape,
  probeGround: StepPlayerLocomotionOptions["probeGround"]
): PlayerGroundProbeResult {
  if (shape.mode === "none") {
    return {
      grounded: false,
      distance: null,
      normal: null,
      slopeDegrees: null
    };
  }

  return probeGround(feetPosition, shape, GROUND_PROBE_DISTANCE);
}

function resolveLocomotionMode(
  shape: FirstPersonPlayerShape,
  inWaterVolume: boolean,
  grounded: boolean,
  headSubmerged: boolean
): RuntimeLocomotionMode {
  if (shape.mode === "none") {
    return "flying";
  }

  if (inWaterVolume) {
    return headSubmerged ? "diving" : "swimming";
  }

  if (grounded) {
    return "grounded";
  }

  return "airborne";
}

function resolveAirborneKind(
  locomotionMode: RuntimeLocomotionMode,
  verticalVelocity: number
): RuntimeLocomotionState["airborneKind"] {
  if (locomotionMode !== "airborne") {
    return null;
  }

  return verticalVelocity > 0 ? "jumping" : "falling";
}

function resolveGait(
  crouched: boolean,
  sprinting: boolean,
  planarSpeed: number
): RuntimeLocomotionState["gait"] {
  if (crouched) {
    return "crouch";
  }

  if (planarSpeed <= IDLE_SPEED_EPSILON) {
    return "idle";
  }

  return sprinting ? "sprint" : "walk";
}

function computePlanarMotion(
  movementYawRadians: number,
  input: PlayerStartActionInputState,
  requestedPlanarSpeed: number,
  dt: number
): { motion: Vec3; inputMagnitude: number } {
  const directionResult = computePlanarInputDirection(
    movementYawRadians,
    input
  );

  if (
    directionResult.direction === null ||
    requestedPlanarSpeed <= 0 ||
    dt <= 0
  ) {
    return {
      motion: {
        x: 0,
        y: 0,
        z: 0
      },
      inputMagnitude: directionResult.inputMagnitude
    };
  }

  const planarDistance = requestedPlanarSpeed * dt;

  return {
    motion: {
      x: directionResult.direction.x * planarDistance,
      y: 0,
      z: directionResult.direction.z * planarDistance
    },
    inputMagnitude: directionResult.inputMagnitude
  };
}

function computePlanarInputDirection(
  movementYawRadians: number,
  input: PlayerStartActionInputState
): { direction: Vec3 | null; inputMagnitude: number } {
  const inputX = input.moveRight - input.moveLeft;
  const inputZ = input.moveForward - input.moveBackward;
  const rawMagnitude = Math.hypot(inputX, inputZ);
  const inputMagnitude = clampUnitInterval(rawMagnitude);

  if (rawMagnitude <= 0) {
    return {
      direction: null,
      inputMagnitude
    };
  }

  const normalizedInputX = inputX / rawMagnitude;
  const normalizedInputZ = inputZ / rawMagnitude;
  const forwardX = Math.sin(movementYawRadians);
  const forwardZ = Math.cos(movementYawRadians);
  const rightX = -Math.cos(movementYawRadians);
  const rightZ = Math.sin(movementYawRadians);
  const directionX =
    forwardX * normalizedInputZ + rightX * normalizedInputX;
  const directionZ =
    forwardZ * normalizedInputZ + rightZ * normalizedInputX;
  const directionMagnitude = Math.hypot(directionX, directionZ);

  if (directionMagnitude <= 0) {
    return {
      direction: null,
      inputMagnitude
    };
  }

  return {
    direction: {
      x: directionX / directionMagnitude,
      y: 0,
      z: directionZ / directionMagnitude
    },
    inputMagnitude
  };
}

function computePlanarSpeedFromDisplacement(
  displacement: Vec3,
  dt: number
): number {
  if (dt <= 0) {
    return 0;
  }

  return Math.hypot(displacement.x, displacement.z) / dt;
}

function clearPlanarMovementInput(
  input: PlayerStartActionInputState
): PlayerStartActionInputState {
  return {
    ...input,
    moveForward: 0,
    moveBackward: 0,
    moveLeft: 0,
    moveRight: 0
  };
}

function computeDirectionalAirMotion(options: {
  directionYawRadians: number;
  input: PlayerStartActionInputState;
  previousPlanarDisplacement: Vec3;
  dt: number;
}): { motion: Vec3; inputMagnitude: number } {
  const directionResult = computePlanarInputDirection(
    options.directionYawRadians,
    options.input
  );
  const planarSpeed = computePlanarSpeedFromDisplacement(
    options.previousPlanarDisplacement,
    options.dt
  );

  if (
    directionResult.direction === null ||
    planarSpeed <= 0 ||
    options.dt <= 0
  ) {
    return {
      motion: {
        x: 0,
        y: 0,
        z: 0
      },
      inputMagnitude: directionResult.inputMagnitude
    };
  }

  const planarDistance = planarSpeed * options.dt;

  return {
    motion: {
      x: directionResult.direction.x * planarDistance,
      y: 0,
      z: directionResult.direction.z * planarDistance
    },
    inputMagnitude: directionResult.inputMagnitude
  };
}

function isWaterLocomotionMode(
  locomotionMode: RuntimeLocomotionMode | null | undefined
): boolean {
  return locomotionMode === "swimming" || locomotionMode === "diving";
}

function isShallowWater(options: {
  inWater: boolean;
  waterSurfaceHeight: number | null;
  feetPosition: Vec3;
  shape: FirstPersonPlayerShape;
  groundProbe: PlayerGroundProbeResult;
}): boolean {
  if (
    !options.inWater ||
    options.waterSurfaceHeight === null ||
    options.groundProbe.grounded !== true ||
    options.groundProbe.distance === null
  ) {
    return false;
  }

  const waterDepth =
    options.waterSurfaceHeight -
    (options.feetPosition.y - options.groundProbe.distance);

  return waterDepth <= options.shape.eyeHeight + SWIM_HEAD_CLEARANCE;
}

function shouldPreserveAirborneWaterCrossing(options: {
  inWater: boolean;
  waterSurfaceHeight: number | null;
  feetPosition: Vec3;
  shape: FirstPersonPlayerShape;
  verticalVelocity: number;
  previousLocomotionState?: RuntimeLocomotionState;
}): boolean {
  if (
    !options.inWater ||
    options.waterSurfaceHeight === null ||
    options.verticalVelocity <= VERTICAL_ASCENT_EPSILON ||
    isWaterLocomotionMode(options.previousLocomotionState?.locomotionMode)
  ) {
    return false;
  }

  const headHeight = options.feetPosition.y + options.shape.eyeHeight;

  return headHeight >= options.waterSurfaceHeight;
}

function alignPlanarMotionToGround(
  planarMotion: Vec3,
  groundNormal: Vec3 | null
): Vec3 {
  if (groundNormal === null || groundNormal.y <= VERTICAL_ASCENT_EPSILON) {
    return planarMotion;
  }

  return {
    x: planarMotion.x,
    y:
      -(
        groundNormal.x * planarMotion.x +
        groundNormal.z * planarMotion.z
      ) / groundNormal.y,
    z: planarMotion.z
  };
}

function resolveContactState(
  resolvedMotion: ResolvedPlayerMotion,
  groundProbe: PlayerGroundProbeResult,
  grounded: boolean
): RuntimeLocomotionContactState {
  const groundNormal = groundProbe.normal ?? resolvedMotion.groundCollisionNormal;
  const groundDistance =
    groundProbe.distance ?? (grounded ? 0 : null);

  return {
    collisionCount: resolvedMotion.collisionCount,
    collidedAxes: {
      x: resolvedMotion.collidedAxes.x,
      y: resolvedMotion.collidedAxes.y,
      z: resolvedMotion.collidedAxes.z
    },
    groundNormal,
    groundDistance,
    slopeDegrees:
      groundProbe.slopeDegrees ??
      (groundNormal === null
        ? null
        : (Math.acos(Math.max(-1, Math.min(1, groundNormal.y))) * 180) /
          Math.PI)
  };
}

export function stepPlayerLocomotion(
  options: StepPlayerLocomotionOptions
): StepPlayerLocomotionResult | null {
  const currentVolumeState = options.resolveVolumeState(options.feetPosition);
  const dtMs = Math.max(0, options.dt * 1000);
  const jumpPressed = options.input.jump > ACTION_ACTIVE_THRESHOLD;
  const sprintPressed = options.input.sprint > ACTION_ACTIVE_THRESHOLD;
  const crouchPressed = options.input.crouch > ACTION_ACTIVE_THRESHOLD;
  const jumpJustPressed = jumpPressed && !options.wasJumpPressed;
  const canCrouch =
    options.movement.capabilities.crouch &&
    options.standingShape.mode !== "none";
  let jumpBufferRemainingMs = Math.max(
    0,
    options.jumpBufferRemainingMs - dtMs
  );
  let coyoteTimeRemainingMs = Math.max(
    0,
    options.coyoteTimeRemainingMs - dtMs
  );
  let jumpHoldRemainingMs = Math.max(0, options.jumpHoldRemainingMs - dtMs);

  let crouched = options.crouched && canCrouch;

  if (canCrouch) {
    if (crouchPressed) {
      crouched = true;
    } else if (crouched) {
      crouched = !options.canOccupyShape(
        options.feetPosition,
        options.standingShape
      );
    }
  } else {
    crouched = false;
  }

  const activeShape = crouched
    ? createCrouchedFirstPersonPlayerShape(options.standingShape)
    : cloneFirstPersonPlayerShape(options.standingShape);
  const currentGroundProbe = readGroundProbe(
    options.feetPosition,
    activeShape,
    options.probeGround
  );
  const currentShallowWater = isShallowWater({
    inWater: currentVolumeState.inWater,
    waterSurfaceHeight: currentVolumeState.waterSurfaceHeight,
    feetPosition: options.feetPosition,
    shape: activeShape,
    groundProbe: currentGroundProbe
  });
  const currentSwimmableWater =
    currentVolumeState.inWater &&
    currentVolumeState.waterSurfaceHeight !== null &&
    !currentShallowWater &&
    !shouldPreserveAirborneWaterCrossing({
      inWater: currentVolumeState.inWater,
      waterSurfaceHeight: currentVolumeState.waterSurfaceHeight,
      feetPosition: options.feetPosition,
      shape: activeShape,
      verticalVelocity: options.verticalVelocity,
      previousLocomotionState: options.previousLocomotionState
    });
  // The probe can still see nearby floor on the frame after takeoff. While a
  // jump is still carrying positive upward velocity, don't let that probe pull
  // the controller back into grounded/stick-to-ground logic.
  const ascendingFromPreviousFrame =
    options.verticalVelocity > VERTICAL_ASCENT_EPSILON;
  const canUseImmediateGrounding =
    options.previousLocomotionState === undefined ||
    options.previousLocomotionState.grounded;
  const currentlyGrounded =
    currentGroundProbe.grounded &&
    !ascendingFromPreviousFrame &&
    canUseImmediateGrounding;

  if (currentlyGrounded) {
    coyoteTimeRemainingMs = options.movement.jump.coyoteTimeMs;
  }

  if (
    options.movement.capabilities.jump &&
    jumpJustPressed &&
    !currentSwimmableWater
  ) {
    jumpBufferRemainingMs = options.movement.jump.bufferMs;
  }

  const sprinting =
    options.movement.capabilities.sprint &&
    sprintPressed &&
    !crouched &&
    currentlyGrounded &&
    !currentSwimmableWater;
  const previousRequestedPlanarSpeed = Math.max(
    0,
    options.previousLocomotionState?.requestedPlanarSpeed ?? 0
  );
  const groundedRequestedPlanarSpeed = clampPlanarSpeed(
    options.movement.moveSpeed *
      (crouched
        ? options.movement.crouch.speedMultiplier
        : sprinting
          ? options.movement.sprint.speedMultiplier
          : 1),
    options.movement.maxSpeed
  );
  const airborneRequestedPlanarSpeed = clampPlanarSpeed(
    Math.max(options.movement.moveSpeed, previousRequestedPlanarSpeed),
    options.movement.maxSpeed
  );
  const jumpTriggered =
    options.movement.capabilities.jump &&
    (jumpJustPressed || jumpBufferRemainingMs > 0) &&
    (currentlyGrounded || coyoteTimeRemainingMs > 0) &&
    !currentSwimmableWater &&
    activeShape.mode !== "none";
  const bufferedJumpTriggered =
    jumpTriggered && !jumpJustPressed && jumpBufferRemainingMs > 0;
  const preservePreviousJumpSpeed =
    !currentlyGrounded || bufferedJumpTriggered;
  const jumpRequestedPlanarSpeedBase = clampPlanarSpeed(
    Math.max(
      options.movement.moveSpeed,
      groundedRequestedPlanarSpeed,
      preservePreviousJumpSpeed ? previousRequestedPlanarSpeed : 0
    ),
    options.movement.maxSpeed
  );
  const jumpRequestedPlanarSpeed =
    bufferedJumpTriggered && options.movement.jump.bunnyHop
      ? clampPlanarSpeed(
          jumpRequestedPlanarSpeedBase *
            (1 + options.movement.jump.bunnyHopBoost),
          options.movement.maxSpeed
        )
      : jumpRequestedPlanarSpeedBase;

  if (jumpTriggered) {
    jumpBufferRemainingMs = 0;
    coyoteTimeRemainingMs = 0;
  }

  const airMovementAllowed =
    currentlyGrounded ||
    jumpTriggered ||
    currentSwimmableWater ||
    (options.verticalVelocity > VERTICAL_ASCENT_EPSILON
      ? options.movement.jump.moveWhileJumping
      : options.movement.jump.moveWhileFalling);
  const planarInput = airMovementAllowed
    ? options.input
    : clearPlanarMovementInput(options.input);
  const directionalAirControlActive =
    !currentlyGrounded &&
    !jumpTriggered &&
    !currentSwimmableWater &&
    airMovementAllowed &&
    options.movement.jump.directionOnly;
  const previousPlanarSpeed = computePlanarSpeedFromDisplacement(
    options.previousPlanarDisplacement,
    options.dt
  );

  const requestedPlanarSpeed =
    activeShape.mode !== "none" && !currentSwimmableWater
      ? jumpTriggered
        ? jumpRequestedPlanarSpeed
        : currentlyGrounded
          ? groundedRequestedPlanarSpeed
          : airborneRequestedPlanarSpeed
      : groundedRequestedPlanarSpeed;
  const planarMotionFromInput = directionalAirControlActive
    ? computeDirectionalAirMotion({
        directionYawRadians:
          options.airDirectionYawRadians ?? options.movementYawRadians,
        input: planarInput,
        previousPlanarDisplacement: options.previousPlanarDisplacement,
        dt: options.dt
      })
    : computePlanarMotion(
        options.movementYawRadians,
        planarInput,
        requestedPlanarSpeed,
        options.dt
      );
  const preserveAirborneMomentum =
    activeShape.mode !== "none" &&
    !currentSwimmableWater &&
    (jumpTriggered || !currentlyGrounded) &&
    planarMotionFromInput.inputMagnitude <= 0;
  const planarMotion = preserveAirborneMomentum
    ? {
        motion: {
          x: options.previousPlanarDisplacement.x,
          y: 0,
          z: options.previousPlanarDisplacement.z
        },
        inputMagnitude: 0
      }
    : planarMotionFromInput;

  const groundedPlanarMotion =
    currentlyGrounded && !jumpTriggered
      ? alignPlanarMotionToGround(
          planarMotion.motion,
          currentGroundProbe.normal
        )
      : planarMotion.motion;

  let verticalVelocity = options.verticalVelocity;
  let verticalDisplacement = 0;
  const waterVerticalInput =
    (jumpPressed ? 1 : 0) - (sprintPressed ? 1 : 0);
  const swimVerticalSpeed = options.movement.moveSpeed;

  if (activeShape.mode === "none") {
    verticalVelocity = 0;
    jumpHoldRemainingMs = 0;
  } else if (currentSwimmableWater) {
    const waterSurfaceHeight =
      currentVolumeState.waterSurfaceHeight ??
      options.feetPosition.y + activeShape.eyeHeight;
    const targetFeetY =
      waterSurfaceHeight +
      SWIM_HEAD_CLEARANCE -
      activeShape.eyeHeight;
    const currentHeadSubmerged =
      options.feetPosition.y + activeShape.eyeHeight <
      waterSurfaceHeight;

    if (waterVerticalInput !== 0) {
      verticalVelocity = waterVerticalInput * swimVerticalSpeed;
      verticalDisplacement = verticalVelocity * options.dt;
    } else if (!currentHeadSubmerged) {
      const targetDelta = targetFeetY - options.feetPosition.y;
      verticalDisplacement = Math.max(
        -swimVerticalSpeed * options.dt,
        Math.min(swimVerticalSpeed * options.dt, targetDelta)
      );
      verticalVelocity =
        options.dt > 0 ? verticalDisplacement / options.dt : 0;
    } else {
      verticalVelocity = 0;
      verticalDisplacement = 0;
    }

    jumpHoldRemainingMs = 0;
  } else if (jumpTriggered) {
    verticalVelocity = options.movement.jump.speed;
    verticalDisplacement = verticalVelocity * options.dt;
    jumpHoldRemainingMs = options.movement.jump.variableHeight
      ? options.movement.jump.maxHoldMs
      : 0;
  } else if (currentlyGrounded) {
    verticalVelocity = 0;
    verticalDisplacement = 0;
    jumpHoldRemainingMs = 0;
  } else {
    if (
      options.movement.jump.variableHeight &&
      !jumpPressed &&
      jumpHoldRemainingMs > 0 &&
      verticalVelocity > VERTICAL_ASCENT_EPSILON
    ) {
      verticalVelocity *= VARIABLE_JUMP_RELEASE_VELOCITY_FACTOR;
      jumpHoldRemainingMs = 0;
    }

    const variableJumpActive =
      options.movement.jump.variableHeight &&
      jumpPressed &&
      jumpHoldRemainingMs > 0 &&
      verticalVelocity > VERTICAL_ASCENT_EPSILON;
    const gravityScale = variableJumpActive
      ? VARIABLE_JUMP_HOLD_GRAVITY_FACTOR
      : 1;

    verticalVelocity -= GRAVITY * gravityScale * options.dt;
    verticalDisplacement = verticalVelocity * options.dt;
  }

  const resolvedMotion = options.resolveMotion(
    options.feetPosition,
    {
      x: groundedPlanarMotion.x,
      y: verticalDisplacement + groundedPlanarMotion.y,
      z: groundedPlanarMotion.z
    },
    activeShape
  );

  if (resolvedMotion === null) {
    return null;
  }

  const nextVolumeState = options.resolveVolumeState(resolvedMotion.feetPosition);
  const groundProbe = readGroundProbe(
    resolvedMotion.feetPosition,
    activeShape,
    options.probeGround
  );
  const nextShallowWater = isShallowWater({
    inWater: nextVolumeState.inWater,
    waterSurfaceHeight: nextVolumeState.waterSurfaceHeight,
    feetPosition: resolvedMotion.feetPosition,
    shape: activeShape,
    groundProbe
  });
  const nextSwimmableWater =
    nextVolumeState.inWater &&
    nextVolumeState.waterSurfaceHeight !== null &&
    !nextShallowWater &&
    !shouldPreserveAirborneWaterCrossing({
      inWater: nextVolumeState.inWater,
      waterSurfaceHeight: nextVolumeState.waterSurfaceHeight,
      feetPosition: resolvedMotion.feetPosition,
      shape: activeShape,
      verticalVelocity,
      previousLocomotionState: options.previousLocomotionState
    });
  const nextWaterSurfaceHeight =
    nextVolumeState.waterSurfaceHeight ??
    resolvedMotion.feetPosition.y + activeShape.eyeHeight;
  const headSubmerged =
    nextSwimmableWater &&
    resolvedMotion.feetPosition.y + activeShape.eyeHeight <
      nextWaterSurfaceHeight;
  const headBump =
    verticalDisplacement > 0 &&
    resolvedMotion.collidedAxes.y &&
    resolvedMotion.feetPosition.y <= options.feetPosition.y + 1e-4;
  const ascending = verticalVelocity > VERTICAL_ASCENT_EPSILON && !headBump;
  const grounded =
    !jumpTriggered &&
    !ascending &&
    activeShape.mode !== "none" &&
    !nextSwimmableWater &&
    groundProbe.grounded;

  if (activeShape.mode === "none" || grounded || headBump) {
    verticalVelocity = 0;
    jumpHoldRemainingMs = 0;
  }

  const locomotionMode = resolveLocomotionMode(
    activeShape,
    nextSwimmableWater,
    grounded,
    headSubmerged
  );
  const actualPlanarSpeed =
    options.dt > 0
      ? Math.hypot(
          resolvedMotion.feetPosition.x - options.feetPosition.x,
          resolvedMotion.feetPosition.z - options.feetPosition.z
        ) / options.dt
      : 0;

  return {
    feetPosition: resolvedMotion.feetPosition,
    activeShape,
    verticalVelocity,
    jumpBufferRemainingMs,
    coyoteTimeRemainingMs,
    jumpHoldRemainingMs,
    crouched,
    jumpPressed,
    jumpStarted: jumpTriggered,
    headBump,
    locomotionState: {
      locomotionMode,
      airborneKind: resolveAirborneKind(locomotionMode, verticalVelocity),
      gait: resolveGait(crouched, sprinting, actualPlanarSpeed),
      grounded,
      crouched,
      sprinting,
      inputMagnitude: planarMotion.inputMagnitude,
      requestedPlanarSpeed: preserveAirborneMomentum
        ? previousPlanarSpeed
        : (directionalAirControlActive
            ? previousPlanarSpeed
            : requestedPlanarSpeed) * planarMotion.inputMagnitude,
      planarSpeed: actualPlanarSpeed,
      verticalVelocity,
      contact: resolveContactState(resolvedMotion, groundProbe, grounded)
    },
    inWaterVolume: nextSwimmableWater,
    inFogVolume: nextVolumeState.inFog,
    planarDisplacement: {
      x: resolvedMotion.feetPosition.x - options.feetPosition.x,
      y: 0,
      z: resolvedMotion.feetPosition.z - options.feetPosition.z
    }
  };
}