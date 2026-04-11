import { Euler, Vector3 } from "three";

import type { Vec3 } from "../core/vector";

import { getFirstPersonPlayerEyeHeight } from "./player-collision";
import {
  resolvePlayerStartLookInput,
  resolvePlayerStartMovementActions
} from "./player-input-bindings";
import type {
  NavigationControllerDeactivateOptions,
  NavigationController,
  RuntimeControllerContext,
  RuntimeLocomotionState
} from "./navigation-controller";
import type { RuntimePlayerMovement } from "./runtime-scene-build";

const LOOK_SENSITIVITY = 0.0022;
const GAMEPAD_LOOK_SPEED = 2.4;
const GRAVITY = 22;
const MAX_PITCH_RADIANS = Math.PI * 0.48;

function clampPitch(pitchRadians: number): number {
  return Math.max(
    -MAX_PITCH_RADIANS,
    Math.min(MAX_PITCH_RADIANS, pitchRadians)
  );
}

function toEyePosition(feetPosition: Vec3, eyeHeight: number): Vec3 {
  return {
    x: feetPosition.x,
    y: feetPosition.y + eyeHeight,
    z: feetPosition.z
  };
}

function cloneRuntimePlayerMovement(
  movement: RuntimePlayerMovement
): RuntimePlayerMovement {
  return {
    templateKind: movement.templateKind,
    moveSpeed: movement.moveSpeed,
    capabilities: {
      jump: movement.capabilities.jump,
      sprint: movement.capabilities.sprint,
      crouch: movement.capabilities.crouch
    }
  };
}

function shouldAutoCapturePointerLockOnActivate(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor;
  const isSafari =
    vendor.includes("Apple") &&
    userAgent.includes("Safari/") &&
    !userAgent.includes("Chrome/") &&
    !userAgent.includes("Chromium/") &&
    !userAgent.includes("CriOS/") &&
    !userAgent.includes("Edg/") &&
    !userAgent.includes("OPR/") &&
    !userAgent.includes("Firefox/");

  return !isSafari;
}

export class FirstPersonNavigationController implements NavigationController {
  readonly id = "firstPerson" as const;

  private context: RuntimeControllerContext | null = null;
  private readonly pressedKeys = new Set<string>();
  private readonly cameraRotation = new Euler(0, 0, 0, "YXZ");
  private readonly forwardVector = new Vector3();
  private readonly rightVector = new Vector3();
  private feetPosition = {
    x: 0,
    y: 0,
    z: 0
  };
  private yawRadians = 0;
  private pitchRadians = 0;
  private verticalVelocity = 0;
  private grounded = false;
  private locomotionState: RuntimeLocomotionState = "flying";
  private inWaterVolume = false;
  private inFogVolume = false;
  private pointerLocked = false;
  private suppressNextPointerLockError = false;
  private initializedFromSpawn = false;

  activate(ctx: RuntimeControllerContext): void {
    this.context = ctx;

    if (!this.initializedFromSpawn) {
      const spawn = ctx.getRuntimeScene().spawn;
      this.feetPosition = {
        ...spawn.position
      };
      this.yawRadians = (spawn.yawDegrees * Math.PI) / 180;
      this.pitchRadians = 0;
      this.verticalVelocity = 0;
      this.grounded = false;
      this.locomotionState = "flying";
      this.inWaterVolume = false;
      this.inFogVolume = false;
      this.initializedFromSpawn = true;
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange
    );
    document.addEventListener("pointerlockerror", this.handlePointerLockError);
    ctx.domElement.addEventListener("pointerdown", this.handlePointerDown);

    this.syncPointerLockState();

    if (
      shouldAutoCapturePointerLockOnActivate() &&
      document.pointerLockElement !== ctx.domElement
    ) {
      const pointerLockCapableElement = ctx.domElement as HTMLCanvasElement & {
        requestPointerLock?: () => void | Promise<void>;
      };

      if (typeof pointerLockCapableElement.requestPointerLock === "function") {
        this.suppressNextPointerLockError = true;
        const pointerLockResult = pointerLockCapableElement.requestPointerLock();

        if (pointerLockResult instanceof Promise) {
          pointerLockResult.catch(() => {});
        }
      }
    }

    this.updateCameraTransform();
    this.publishTelemetry();
  }

  deactivate(
    ctx: RuntimeControllerContext,
    options: NavigationControllerDeactivateOptions = {}
  ): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener(
      "pointerlockchange",
      this.handlePointerLockChange
    );
    document.removeEventListener(
      "pointerlockerror",
      this.handlePointerLockError
    );
    ctx.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.pressedKeys.clear();

    if (
      (options.releasePointerLock ?? true) &&
      document.pointerLockElement === ctx.domElement
    ) {
      document.exitPointerLock();
    }

    this.pointerLocked = false;
  this.suppressNextPointerLockError = false;
    ctx.setRuntimeMessage(null);
    ctx.setFirstPersonTelemetry(null);
    this.context = null;
  }

  resetSceneState(): void {
    this.pressedKeys.clear();
    this.feetPosition = {
      x: 0,
      y: 0,
      z: 0
    };
    this.yawRadians = 0;
    this.pitchRadians = 0;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.locomotionState = "flying";
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.pointerLocked = false;
    this.suppressNextPointerLockError = false;
    this.initializedFromSpawn = false;
  }

  update(dt: number): void {
    if (this.context === null) {
      return;
    }

    const runtimeScene = this.context.getRuntimeScene();
    const playerShape = runtimeScene.playerCollider;
    const playerMovement = runtimeScene.playerMovement;
    const lookInput = resolvePlayerStartLookInput(
      runtimeScene.playerInputBindings
    );
    const inputState = resolvePlayerStartMovementActions(
      this.pressedKeys,
      runtimeScene.playerInputBindings
    );

    if (lookInput.horizontal !== 0 || lookInput.vertical !== 0) {
      this.yawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians + lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
      );
    }

    const currentVolumeState = this.context.resolvePlayerVolumeState(
      this.feetPosition
    );
    const inputX = inputState.moveRight - inputState.moveLeft;
    const inputZ = inputState.moveForward - inputState.moveBackward;
    const inputLength = Math.hypot(inputX, inputZ);

    let horizontalX = 0;
    let horizontalZ = 0;

    if (inputLength > 0) {
      const normalizedInputX = inputX / inputLength;
      const normalizedInputZ = inputZ / inputLength;
      const moveDistance = playerMovement.moveSpeed * dt;

      this.forwardVector.set(
        Math.sin(this.yawRadians),
        0,
        Math.cos(this.yawRadians)
      );
      this.rightVector.set(
        -Math.cos(this.yawRadians),
        0,
        Math.sin(this.yawRadians)
      );

      horizontalX =
        (this.forwardVector.x * normalizedInputZ +
          this.rightVector.x * normalizedInputX) *
        moveDistance;
      horizontalZ =
        (this.forwardVector.z * normalizedInputZ +
          this.rightVector.z * normalizedInputX) *
        moveDistance;
    }

    if (playerShape.mode === "none") {
      this.verticalVelocity = 0;
    } else if (currentVolumeState.inWater) {
      this.verticalVelocity = 0;
    } else {
      this.verticalVelocity -= GRAVITY * dt;
    }

    const resolvedMotion = this.context.resolveFirstPersonMotion(
      this.feetPosition,
      {
        x: horizontalX,
        y:
          playerShape.mode === "none" || currentVolumeState.inWater
            ? 0
            : this.verticalVelocity * dt,
        z: horizontalZ
      },
      playerShape
    );

    if (resolvedMotion === null) {
      this.updateCameraTransform();
      this.publishTelemetry();
      return;
    }

    this.feetPosition = resolvedMotion.feetPosition;
    const nextVolumeState = this.context.resolvePlayerVolumeState(
      this.feetPosition
    );
    this.inWaterVolume = nextVolumeState.inWater;
    this.inFogVolume = nextVolumeState.inFog;
    this.grounded = nextVolumeState.inWater ? false : resolvedMotion.grounded;

    if (playerShape.mode === "none") {
      this.locomotionState = "flying";
    } else if (this.inWaterVolume) {
      this.locomotionState = "swimming";
    } else if (this.grounded) {
      this.locomotionState = "grounded";
    } else {
      this.locomotionState = "flying";
    }

    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    } else if (this.inWaterVolume) {
      this.verticalVelocity = 0;
    }

    this.updateCameraTransform();
    this.publishTelemetry();
  }

  teleportTo(feetPosition: Vec3, yawDegrees: number) {
    this.feetPosition = {
      ...feetPosition
    };
    this.yawRadians = (yawDegrees * Math.PI) / 180;
    this.pitchRadians = 0;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.locomotionState = "flying";
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.updateCameraTransform();
    this.publishTelemetry();
  }

  private updateCameraTransform() {
    if (this.context === null) {
      return;
    }

    const eyePosition = toEyePosition(
      this.feetPosition,
      getFirstPersonPlayerEyeHeight(
        this.context.getRuntimeScene().playerCollider
      )
    );
    this.cameraRotation.x = this.pitchRadians;
    // Authoring yaw treats 0 degrees as facing +Z, while a three.js camera
    // looks down -Z by default. Offset by 180 degrees so runtime view matches
    // the authored PlayerStart marker and movement basis.
    this.cameraRotation.y = this.yawRadians + Math.PI;
    this.cameraRotation.z = 0;

    this.context.camera.position.set(
      eyePosition.x,
      eyePosition.y,
      eyePosition.z
    );
    this.context.camera.rotation.copy(this.cameraRotation);
  }

  private publishTelemetry() {
    if (this.context === null) {
      return;
    }

    const eyePosition = toEyePosition(
      this.feetPosition,
      getFirstPersonPlayerEyeHeight(
        this.context.getRuntimeScene().playerCollider
      )
    );
    const cameraVolumeState =
      this.context.resolvePlayerVolumeState(eyePosition);

    this.context.setFirstPersonTelemetry({
      feetPosition: {
        ...this.feetPosition
      },
      eyePosition,
      grounded: this.grounded,
      locomotionState: this.locomotionState,
      movement: cloneRuntimePlayerMovement(
        this.context.getRuntimeScene().playerMovement
      ),
      inWaterVolume: this.inWaterVolume,
      cameraSubmerged: cameraVolumeState.inWater,
      inFogVolume: this.inFogVolume,
      pointerLocked: this.pointerLocked,
      spawn: this.context.getRuntimeScene().spawn
    });
  }

  private syncPointerLockState() {
    if (this.context === null) {
      return;
    }

    const pointerLocked =
      document.pointerLockElement === this.context.domElement;
    this.pointerLocked = pointerLocked;
    this.context.setRuntimeMessage(
      pointerLocked
        ? "Mouse look active. Press Escape to release the cursor or switch to Third Person. The gamepad right stick also controls the camera."
        : "Click inside the runner viewport to capture mouse look. If pointer lock fails, the gamepad right stick still controls the camera and Third Person remains available."
    );
    this.publishTelemetry();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };

  private handleBlur = () => {
    this.pressedKeys.clear();
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.pointerLocked) {
      return;
    }

    this.yawRadians -= event.movementX * LOOK_SENSITIVITY;
    this.pitchRadians = clampPitch(
      this.pitchRadians - event.movementY * LOOK_SENSITIVITY
    );
  };

  private handlePointerLockChange = () => {
    this.suppressNextPointerLockError = false;
    this.syncPointerLockState();
  };

  private handlePointerLockError = () => {
    if (this.suppressNextPointerLockError) {
      this.suppressNextPointerLockError = false;
      return;
    }

    this.context?.setRuntimeMessage(
      "Pointer lock was unavailable in this browser context. Third Person remains available as the non-FPS fallback."
    );
  };

  private handlePointerDown = () => {
    if (
      this.context === null ||
      document.pointerLockElement === this.context.domElement
    ) {
      return;
    }

    this.suppressNextPointerLockError = false;

    const pointerLockCapableElement = this.context
      .domElement as HTMLCanvasElement & {
      requestPointerLock(): void | Promise<void>;
    };
    const pointerLockResult = pointerLockCapableElement.requestPointerLock();

    if (pointerLockResult instanceof Promise) {
      pointerLockResult.catch(() => {
        this.context?.setRuntimeMessage(
          "Pointer lock request was denied. Click again or use Third Person for non-locked navigation."
        );
      });
    }
  };
}
