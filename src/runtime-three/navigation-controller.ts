import type { PerspectiveCamera } from "three";

import type { Vec3 } from "../core/vector";

import type { FirstPersonPlayerShape, ResolvedPlayerMotion } from "./player-collision";
import type { RuntimeNavigationMode, RuntimeSceneDefinition, RuntimeSpawnPoint } from "./runtime-scene-build";

export interface FirstPersonTelemetry {
  feetPosition: Vec3;
  eyePosition: Vec3;
  grounded: boolean;
  locomotionState: RuntimeLocomotionState;
  inWaterVolume: boolean;
  cameraSubmerged: boolean;
  inFogVolume: boolean;
  pointerLocked: boolean;
  spawn: RuntimeSpawnPoint;
}

export type RuntimeLocomotionState = "grounded" | "swimming" | "flying";

export interface RuntimePlayerVolumeState {
  inWater: boolean;
  inFog: boolean;
}

export interface RuntimeControllerContext {
  camera: PerspectiveCamera;
  domElement: HTMLCanvasElement;
  getRuntimeScene(): RuntimeSceneDefinition;
  resolveFirstPersonMotion(feetPosition: Vec3, motion: Vec3, shape: FirstPersonPlayerShape): ResolvedPlayerMotion | null;
  resolvePlayerVolumeState(feetPosition: Vec3): RuntimePlayerVolumeState;
  setRuntimeMessage(message: string | null): void;
  setFirstPersonTelemetry(telemetry: FirstPersonTelemetry | null): void;
}

export interface NavigationController {
  id: RuntimeNavigationMode;
  activate(ctx: RuntimeControllerContext): void;
  deactivate(ctx: RuntimeControllerContext): void;
  resetSceneState(): void;
  update(dt: number): void;
}
