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
const JUMP_SPEED = 7.2;
const SPRINT_SPEED_MULTIPLIER = 1.65;
const CROUCH_SPEED_MULTIPLIER = 0.45;
const GROUND_PROBE_DISTANCE = 0.12;
const GROUND_STICK_DISTANCE = 0.08;
const VERTICAL_ASCENT_EPSILON = 1e-4;
const IDLE_SPEED_EPSILON = 0.05;

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
  standingShape: FirstPersonPlayerShape;
  verticalVelocity: number;
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
  volumeState: RuntimePlayerVolumeState,
  probeGround: StepPlayerLocomotionOptions["probeGround"]
): PlayerGroundProbeResult {
  if (shape.mode === "none" || volumeState.inWater) {
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
  grounded: boolean
): RuntimeLocomotionMode {
  if (shape.mode === "none") {
    return "flying";
  }

  if (inWaterVolume) {
    return "swimming";
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
  const inputX = input.moveRight - input.moveLeft;
  const inputZ = input.moveForward - input.moveBackward;
  const rawMagnitude = Math.hypot(inputX, inputZ);
  const inputMagnitude = clampUnitInterval(rawMagnitude);

  if (rawMagnitude <= 0 || requestedPlanarSpeed <= 0 || dt <= 0) {
    return {
      motion: {
        x: 0,
        y: 0,
        z: 0
      },
      inputMagnitude
    };
  }

  const normalizedInputX = inputX / rawMagnitude;
  const normalizedInputZ = inputZ / rawMagnitude;
  const forwardX = Math.sin(movementYawRadians);
  const forwardZ = Math.cos(movementYawRadians);
  const rightX = -Math.cos(movementYawRadians);
  const rightZ = Math.sin(movementYawRadians);
  const planarDistance = requestedPlanarSpeed * dt;

  return {
    motion: {
      x:
        (forwardX * normalizedInputZ + rightX * normalizedInputX) *
        planarDistance,
      y: 0,
      z:
        (forwardZ * normalizedInputZ + rightZ * normalizedInputX) *
        planarDistance
    },
    inputMagnitude
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
  const jumpPressed = options.input.jump > ACTION_ACTIVE_THRESHOLD;
  const sprintPressed = options.input.sprint > ACTION_ACTIVE_THRESHOLD;
  const crouchPressed = options.input.crouch > ACTION_ACTIVE_THRESHOLD;
  const canCrouch =
    options.movement.capabilities.crouch &&
    options.standingShape.mode !== "none";

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
    currentVolumeState,
    options.probeGround
  );
  // The probe can still see nearby floor on the frame after takeoff. While a
  // jump is still carrying positive upward velocity, don't let that probe pull
  // the controller back into grounded/stick-to-ground logic.
  const ascendingFromPreviousFrame =
    options.verticalVelocity > VERTICAL_ASCENT_EPSILON;
  const currentlyGrounded =
    currentGroundProbe.grounded && !ascendingFromPreviousFrame;
  const sprinting =
    options.movement.capabilities.sprint &&
    sprintPressed &&
    !crouched &&
    !currentVolumeState.inWater;
  const requestedPlanarSpeed =
    options.movement.moveSpeed *
    (crouched
      ? CROUCH_SPEED_MULTIPLIER
      : sprinting
        ? SPRINT_SPEED_MULTIPLIER
        : 1);
  const planarMotion = computePlanarMotion(
    options.movementYawRadians,
    options.input,
    requestedPlanarSpeed,
    options.dt
  );
  const jumpTriggered =
    options.movement.capabilities.jump &&
    jumpPressed &&
    !options.wasJumpPressed &&
    currentlyGrounded &&
    !currentVolumeState.inWater &&
    activeShape.mode !== "none";

  let verticalVelocity = options.verticalVelocity;
  let verticalDisplacement = 0;

  if (activeShape.mode === "none" || currentVolumeState.inWater) {
    verticalVelocity = 0;
  } else if (jumpTriggered) {
    verticalVelocity = JUMP_SPEED;
    verticalDisplacement = verticalVelocity * options.dt;
  } else if (currentlyGrounded) {
    verticalVelocity = 0;
    verticalDisplacement = options.dt > 0 ? -GROUND_STICK_DISTANCE : 0;
  } else {
    verticalVelocity -= GRAVITY * options.dt;
    verticalDisplacement = verticalVelocity * options.dt;
  }

  const resolvedMotion = options.resolveMotion(
    options.feetPosition,
    {
      x: planarMotion.motion.x,
      y: verticalDisplacement,
      z: planarMotion.motion.z
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
    nextVolumeState,
    options.probeGround
  );
  const headBump =
    verticalDisplacement > 0 &&
    resolvedMotion.collidedAxes.y &&
    resolvedMotion.feetPosition.y <= options.feetPosition.y + 1e-4;
  const ascending = verticalVelocity > VERTICAL_ASCENT_EPSILON && !headBump;
  const grounded =
    !jumpTriggered &&
    !ascending &&
    activeShape.mode !== "none" &&
    !nextVolumeState.inWater &&
    (resolvedMotion.grounded || groundProbe.grounded);

  if (
    activeShape.mode === "none" ||
    nextVolumeState.inWater ||
    grounded ||
    headBump
  ) {
    verticalVelocity = 0;
  }

  const locomotionMode = resolveLocomotionMode(
    activeShape,
    nextVolumeState.inWater,
    grounded
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
      requestedPlanarSpeed:
        requestedPlanarSpeed * planarMotion.inputMagnitude,
      planarSpeed: actualPlanarSpeed,
      verticalVelocity,
      contact: resolveContactState(resolvedMotion, groundProbe, grounded)
    },
    inWaterVolume: nextVolumeState.inWater,
    inFogVolume: nextVolumeState.inFog,
    planarDisplacement: {
      x: resolvedMotion.feetPosition.x - options.feetPosition.x,
      y: 0,
      z: resolvedMotion.feetPosition.z - options.feetPosition.z
    }
  };
}