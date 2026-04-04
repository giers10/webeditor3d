import { Euler, Vector3 } from "three";

import type { Vec3 } from "../core/vector";

import { getFirstPersonPlayerEyeHeight } from "./player-collision";
import type { NavigationController, RuntimeControllerContext } from "./navigation-controller";

const LOOK_SENSITIVITY = 0.0022;
const MOVE_SPEED = 4.5;
const GRAVITY = 22;
const MAX_PITCH_RADIANS = Math.PI * 0.48;

function clampPitch(pitchRadians: number): number {
  return Math.max(-MAX_PITCH_RADIANS, Math.min(MAX_PITCH_RADIANS, pitchRadians));
}

function toEyePosition(feetPosition: Vec3, eyeHeight: number): Vec3 {
  return {
    x: feetPosition.x,
    y: feetPosition.y + eyeHeight,
    z: feetPosition.z
  };
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
  private pointerLocked = false;
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
      this.initializedFromSpawn = true;
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    document.addEventListener("pointerlockerror", this.handlePointerLockError);
    ctx.domElement.addEventListener("pointerdown", this.handlePointerDown);

    this.syncPointerLockState();
    this.updateCameraTransform();
    this.publishTelemetry();
  }

  deactivate(ctx: RuntimeControllerContext): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    document.removeEventListener("pointerlockerror", this.handlePointerLockError);
    ctx.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.pressedKeys.clear();

    if (document.pointerLockElement === ctx.domElement) {
      document.exitPointerLock();
    }

    this.pointerLocked = false;
    ctx.setRuntimeMessage(null);
    ctx.setFirstPersonTelemetry(null);
    this.context = null;
  }

  update(dt: number): void {
    if (this.context === null) {
      return;
    }

    const playerShape = this.context.getRuntimeScene().playerCollider;
    const inputX = (this.pressedKeys.has("KeyD") ? 1 : 0) - (this.pressedKeys.has("KeyA") ? 1 : 0);
    const inputZ = (this.pressedKeys.has("KeyW") ? 1 : 0) - (this.pressedKeys.has("KeyS") ? 1 : 0);
    const inputLength = Math.hypot(inputX, inputZ);

    let horizontalX = 0;
    let horizontalZ = 0;

    if (inputLength > 0) {
      const normalizedInputX = inputX / inputLength;
      const normalizedInputZ = inputZ / inputLength;
      const moveDistance = MOVE_SPEED * dt;

      this.forwardVector.set(Math.sin(this.yawRadians), 0, Math.cos(this.yawRadians));
      this.rightVector.set(-Math.cos(this.yawRadians), 0, Math.sin(this.yawRadians));

      horizontalX = (this.forwardVector.x * normalizedInputZ + this.rightVector.x * normalizedInputX) * moveDistance;
      horizontalZ = (this.forwardVector.z * normalizedInputZ + this.rightVector.z * normalizedInputX) * moveDistance;
    }

    if (playerShape.mode === "none") {
      this.verticalVelocity = 0;
    } else {
      this.verticalVelocity -= GRAVITY * dt;
    }

    const resolvedMotion = this.context.resolveFirstPersonMotion(
      this.feetPosition,
      {
        x: horizontalX,
        y: playerShape.mode === "none" ? 0 : this.verticalVelocity * dt,
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
    this.grounded = resolvedMotion.grounded;

    if (this.grounded && this.verticalVelocity < 0) {
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
    this.updateCameraTransform();
    this.publishTelemetry();
  }

  private updateCameraTransform() {
    if (this.context === null) {
      return;
    }

    const eyePosition = toEyePosition(this.feetPosition, getFirstPersonPlayerEyeHeight(this.context.getRuntimeScene().playerCollider));
    this.cameraRotation.x = this.pitchRadians;
    // Authoring yaw treats 0 degrees as facing +Z, while a three.js camera
    // looks down -Z by default. Offset by 180 degrees so runtime view matches
    // the authored PlayerStart marker and movement basis.
    this.cameraRotation.y = this.yawRadians + Math.PI;
    this.cameraRotation.z = 0;

    this.context.camera.position.set(eyePosition.x, eyePosition.y, eyePosition.z);
    this.context.camera.rotation.copy(this.cameraRotation);
  }

  private publishTelemetry() {
    if (this.context === null) {
      return;
    }

    this.context.setFirstPersonTelemetry({
      feetPosition: {
        ...this.feetPosition
      },
      eyePosition: toEyePosition(this.feetPosition, getFirstPersonPlayerEyeHeight(this.context.getRuntimeScene().playerCollider)),
      grounded: this.grounded,
      pointerLocked: this.pointerLocked,
      spawn: this.context.getRuntimeScene().spawn
    });
  }

  private syncPointerLockState() {
    if (this.context === null) {
      return;
    }

    const pointerLocked = document.pointerLockElement === this.context.domElement;
    this.pointerLocked = pointerLocked;
    this.context.setRuntimeMessage(
      pointerLocked
        ? "Mouse look active. Press Escape to release the cursor or switch to Orbit Visitor."
        : "Click inside the runner viewport to capture mouse look. If pointer lock fails, switch to Orbit Visitor."
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
    this.pitchRadians = clampPitch(this.pitchRadians - event.movementY * LOOK_SENSITIVITY);
  };

  private handlePointerLockChange = () => {
    this.syncPointerLockState();
  };

  private handlePointerLockError = () => {
    this.context?.setRuntimeMessage(
      "Pointer lock was unavailable in this browser context. Orbit Visitor remains available as the non-FPS fallback."
    );
  };

  private handlePointerDown = () => {
    if (this.context === null || document.pointerLockElement === this.context.domElement) {
      return;
    }

    const pointerLockCapableElement = this.context.domElement as HTMLCanvasElement & {
      requestPointerLock(): void | Promise<void>;
    };
    const pointerLockResult = pointerLockCapableElement.requestPointerLock();

    if (pointerLockResult instanceof Promise) {
      pointerLockResult.catch(() => {
        this.context?.setRuntimeMessage(
          "Pointer lock request was denied. Click again or use Orbit Visitor for non-locked navigation."
        );
      });
    }
  };
}
