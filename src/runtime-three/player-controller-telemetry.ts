import type {
  PlayerControllerTelemetry,
  RuntimeLocomotionState,
  RuntimeMovementTransitionSignals,
  RuntimePlayerMovementHooks
} from "./navigation-controller";

const MOVING_SPEED_EPSILON = 0.05;

function hasWallContact(locomotionState: RuntimeLocomotionState | null): boolean {
  if (locomotionState === null) {
    return false;
  }

  return (
    locomotionState.contact.collidedAxes.x ||
    locomotionState.contact.collidedAxes.z
  );
}

export function createEmptyRuntimeMovementTransitionSignals(): RuntimeMovementTransitionSignals {
  return {
    jumpStarted: false,
    leftGround: false,
    startedFalling: false,
    landed: false,
    enteredWater: false,
    exitedWater: false,
    wallContactStarted: false,
    headBump: false
  };
}

export function resolveRuntimeMovementTransitionSignals(options: {
  previousLocomotionState: RuntimeLocomotionState | null;
  previousInWaterVolume: boolean;
  locomotionState: RuntimeLocomotionState;
  inWaterVolume: boolean;
  jumpStarted: boolean;
  headBump: boolean;
}): RuntimeMovementTransitionSignals {
  const previousGrounded = options.previousLocomotionState?.grounded ?? false;
  const previousAirborneKind = options.previousLocomotionState?.airborneKind;
  const previousWallContact = hasWallContact(options.previousLocomotionState);
  const wallContact = hasWallContact(options.locomotionState);

  return {
    jumpStarted: options.jumpStarted,
    leftGround: previousGrounded && !options.locomotionState.grounded,
    startedFalling:
      options.locomotionState.airborneKind === "falling" &&
      previousAirborneKind !== "falling",
    landed: !previousGrounded && options.locomotionState.grounded,
    enteredWater: !options.previousInWaterVolume && options.inWaterVolume,
    exitedWater: options.previousInWaterVolume && !options.inWaterVolume,
    wallContactStarted: !previousWallContact && wallContact,
    headBump: options.headBump
  };
}

export function resolveRuntimePlayerMovementHooks(options: {
  locomotionState: RuntimeLocomotionState;
  inWaterVolume: boolean;
  cameraSubmerged: boolean;
  signals: RuntimeMovementTransitionSignals;
}): RuntimePlayerMovementHooks {
  const underwaterAmount = options.cameraSubmerged
    ? 1
    : options.inWaterVolume
      ? 0.55
      : 0;

  return {
    camera: {
      jumping:
        options.signals.jumpStarted ||
        options.locomotionState.airborneKind === "jumping",
      falling:
        options.signals.startedFalling ||
        options.locomotionState.airborneKind === "falling",
      landing: options.signals.landed,
      swimming:
        options.locomotionState.locomotionMode === "swimming" ||
        options.locomotionState.locomotionMode === "diving",
      underwaterAmount
    },
    audio: {
      underwaterAmount,
      enteredWater: options.signals.enteredWater,
      exitedWater: options.signals.exitedWater
    },
    animation: {
      locomotionMode: options.locomotionState.locomotionMode,
      airborneKind: options.locomotionState.airborneKind,
      gait: options.locomotionState.gait,
      moving: options.locomotionState.planarSpeed > MOVING_SPEED_EPSILON,
      movementAmount: Math.max(
        options.locomotionState.inputMagnitude,
        Math.min(1, options.locomotionState.planarSpeed)
      ),
      grounded: options.locomotionState.grounded,
      crouched: options.locomotionState.crouched,
      sprinting: options.locomotionState.sprinting,
      inWater: options.inWaterVolume,
      signals: options.signals
    }
  };
}

export function createPlayerControllerTelemetry(options: {
  feetPosition: PlayerControllerTelemetry["feetPosition"];
  eyePosition: PlayerControllerTelemetry["eyePosition"];
  yawDegrees: number;
  grounded: boolean;
  locomotionState: RuntimeLocomotionState;
  movement: PlayerControllerTelemetry["movement"];
  inWaterVolume: boolean;
  cameraSubmerged: boolean;
  inFogVolume: boolean;
  pointerLocked: boolean;
  spawn: PlayerControllerTelemetry["spawn"];
  previousLocomotionState: RuntimeLocomotionState | null;
  previousInWaterVolume: boolean;
  jumpStarted: boolean;
  headBump: boolean;
}): PlayerControllerTelemetry {
  const signals = resolveRuntimeMovementTransitionSignals({
    previousLocomotionState: options.previousLocomotionState,
    previousInWaterVolume: options.previousInWaterVolume,
    locomotionState: options.locomotionState,
    inWaterVolume: options.inWaterVolume,
    jumpStarted: options.jumpStarted,
    headBump: options.headBump
  });

  return {
    feetPosition: options.feetPosition,
    eyePosition: options.eyePosition,
    yawDegrees: options.yawDegrees,
    grounded: options.grounded,
    locomotionState: options.locomotionState,
    movement: options.movement,
    inWaterVolume: options.inWaterVolume,
    cameraSubmerged: options.cameraSubmerged,
    inFogVolume: options.inFogVolume,
    pointerLocked: options.pointerLocked,
    spawn: options.spawn,
    signals,
    hooks: resolveRuntimePlayerMovementHooks({
      locomotionState: options.locomotionState,
      inWaterVolume: options.inWaterVolume,
      cameraSubmerged: options.cameraSubmerged,
      signals
    })
  };
}
