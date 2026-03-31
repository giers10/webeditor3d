import type { PerspectiveCamera } from "three";

import type { Vec3 } from "../core/vector";

import type { RuntimeNavigationMode, RuntimeSceneDefinition, RuntimeSpawnPoint } from "./runtime-scene-build";

export interface FirstPersonTelemetry {
  feetPosition: Vec3;
  eyePosition: Vec3;
  grounded: boolean;
  pointerLocked: boolean;
  spawn: RuntimeSpawnPoint;
}

export interface RuntimeControllerContext {
  camera: PerspectiveCamera;
  domElement: HTMLCanvasElement;
  getRuntimeScene(): RuntimeSceneDefinition;
  setRuntimeMessage(message: string | null): void;
  setFirstPersonTelemetry(telemetry: FirstPersonTelemetry | null): void;
}

export interface NavigationController {
  id: RuntimeNavigationMode;
  activate(ctx: RuntimeControllerContext): void;
  deactivate(ctx: RuntimeControllerContext): void;
  update(dt: number): void;
}
