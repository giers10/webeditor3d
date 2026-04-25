import type { PerspectiveCamera } from "three";

import type { Vec3 } from "../core/vector";

import type {
  FirstPersonPlayerShape,
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "./player-collision";
import type {
  RuntimeNavigationMode,
  RuntimePlayerMovement,
  RuntimeSceneDefinition,
  RuntimeSpawnPoint
} from "./runtime-scene-build";

export interface RuntimeMovementTransitionSignals {
  jumpStarted: boolean;
  leftGround: boolean;
  startedFalling: boolean;
  landed: boolean;
  enteredWater: boolean;
  exitedWater: boolean;
  wallContactStarted: boolean;
  headBump: boolean;
}

export interface RuntimePlayerCameraHookState {
  jumping: boolean;
  falling: boolean;
  landing: boolean;
  swimming: boolean;
  underwaterAmount: number;
}

export interface RuntimePlayerAudioHookState {
  underwaterAmount: number;
  enteredWater: boolean;
  exitedWater: boolean;
}

export interface RuntimePlayerAnimationHookState {
  locomotionMode: RuntimeLocomotionMode;
  airborneKind: RuntimeAirborneKind;
  gait: RuntimeLocomotionGait;
  moving: boolean;
  movementAmount: number;
  grounded: boolean;
  crouched: boolean;
  sprinting: boolean;
  inWater: boolean;
  signals: RuntimeMovementTransitionSignals;
}

export interface RuntimePlayerMovementHooks {
  camera: RuntimePlayerCameraHookState;
  audio: RuntimePlayerAudioHookState;
  animation: RuntimePlayerAnimationHookState;
}

export interface PlayerControllerTelemetry {
  feetPosition: Vec3;
  eyePosition: Vec3;
  yawDegrees: number;
  grounded: boolean;
  locomotionState: RuntimeLocomotionState;
  movement: RuntimePlayerMovement;
  inWaterVolume: boolean;
  cameraSubmerged: boolean;
  inFogVolume: boolean;
  pointerLocked: boolean;
  spawn: RuntimeSpawnPoint;
  signals: RuntimeMovementTransitionSignals;
  hooks: RuntimePlayerMovementHooks;
}

export type FirstPersonTelemetry = PlayerControllerTelemetry;

export type RuntimeLocomotionMode =
  | "grounded"
  | "airborne"
  | "flying"
  | "swimming"
  | "diving";
export type RuntimeAirborneKind = "jumping" | "falling" | null;
export type RuntimeLocomotionGait =
  | "idle"
  | "walk"
  | "sprint"
  | "crouch";

export interface RuntimeLocomotionContactState {
  collisionCount: number;
  collidedAxes: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
  groundNormal: Vec3 | null;
  groundDistance: number | null;
  slopeDegrees: number | null;
}

export interface RuntimeLocomotionState {
  locomotionMode: RuntimeLocomotionMode;
  airborneKind: RuntimeAirborneKind;
  gait: RuntimeLocomotionGait;
  grounded: boolean;
  crouched: boolean;
  sprinting: boolean;
  inputMagnitude: number;
  requestedPlanarSpeed: number;
  planarSpeed: number;
  verticalVelocity: number;
  contact: RuntimeLocomotionContactState;
}

export interface RuntimePlayerVolumeState {
  inWater: boolean;
  inFog: boolean;
  waterSurfaceHeight: number | null;
}

export interface RuntimeThirdPersonTargetAssist {
  targetPosition: Vec3;
  strength: number;
}

export interface RuntimeTargetLookInput {
  horizontal: number;
  vertical: number;
}

export interface RuntimeTargetLookInputResult {
  activeTargetLocked: boolean;
  switchedTarget: boolean;
  switchInputHeld: boolean;
}

export interface RuntimeControllerContext {
  camera: PerspectiveCamera;
  domElement: HTMLCanvasElement;
  getRuntimeScene(): RuntimeSceneDefinition;
  resolveFirstPersonMotion(
    feetPosition: Vec3,
    motion: Vec3,
    shape: FirstPersonPlayerShape
  ): ResolvedPlayerMotion | null;
  probePlayerGround(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape,
    maxDistance: number
  ): PlayerGroundProbeResult;
  canOccupyPlayerShape(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape
  ): boolean;
  resolvePlayerVolumeState(feetPosition: Vec3): RuntimePlayerVolumeState;
  resolveThirdPersonCameraCollision(
    pivot: Vec3,
    desiredCameraPosition: Vec3,
    radius: number
  ): Vec3;
  resolveThirdPersonTargetAssist?(): RuntimeThirdPersonTargetAssist | null;
  handleRuntimeTargetLookInput?(
    input: RuntimeTargetLookInput
  ): RuntimeTargetLookInputResult;
  isCameraDrivenExternally(): boolean;
  getCameraYawRadians(): number;
  isInputSuspended(): boolean;
  setRuntimeMessage(message: string | null): void;
  setPlayerControllerTelemetry(
    telemetry: PlayerControllerTelemetry | null
  ): void;
}

export interface NavigationControllerDeactivateOptions {
  releasePointerLock?: boolean;
}

export interface NavigationController {
  id: RuntimeNavigationMode;
  activate(ctx: RuntimeControllerContext): void;
  deactivate(
    ctx: RuntimeControllerContext,
    options?: NavigationControllerDeactivateOptions
  ): void;
  resetSceneState(): void;
  update(dt: number): void;
}
