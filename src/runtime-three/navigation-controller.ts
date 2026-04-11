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

export interface FirstPersonTelemetry {
  feetPosition: Vec3;
  eyePosition: Vec3;
  grounded: boolean;
  locomotionState: RuntimeLocomotionState;
  movement: RuntimePlayerMovement;
  inWaterVolume: boolean;
  cameraSubmerged: boolean;
  inFogVolume: boolean;
  pointerLocked: boolean;
  spawn: RuntimeSpawnPoint;
}

export type RuntimeLocomotionMode =
  | "grounded"
  | "airborne"
  | "flying"
  | "swimming";
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
  setRuntimeMessage(message: string | null): void;
  setFirstPersonTelemetry(telemetry: FirstPersonTelemetry | null): void;
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
