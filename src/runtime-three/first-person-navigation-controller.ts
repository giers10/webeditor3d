import { Euler } from "three";

import type { Vec3 } from "../core/vector";

import {
  FIRST_PERSON_PLAYER_SHAPE,
  cloneFirstPersonPlayerShape,
  getFirstPersonPlayerEyeHeight
} from "./player-collision";
import {
  resolvePlayerStartActionInputs,
  resolvePlayerStartLookInput,
} from "./player-input-bindings";
import {
  createIdleRuntimeLocomotionState,
  stepPlayerLocomotion
} from "./player-locomotion";
import { createPlayerControllerTelemetry } from "./player-controller-telemetry";
import { smoothGroundedStairHeight } from "./stair-height-smoothing";
import type { PlayerControllerTelemetry } from "./navigation-controller";
import type {
  NavigationControllerDeactivateOptions,
  NavigationController,
  RuntimeControllerContext,
  RuntimeLocomotionState
} from "./navigation-controller";
import type { RuntimePlayerMovement } from "./runtime-scene-build";

const LOOK_SENSITIVITY = 0.0022;
const GAMEPAD_LOOK_SPEED = 2.4;
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
    maxSpeed: movement.maxSpeed,
    maxStepHeight: movement.maxStepHeight,
    capabilities: {
      jump: movement.capabilities.jump,
      sprint: movement.capabilities.sprint,
      crouch: movement.capabilities.crouch
    },
    jump: {
      speed: movement.jump.speed,
      bufferMs: movement.jump.bufferMs,
      coyoteTimeMs: movement.jump.coyoteTimeMs,
      variableHeight: movement.jump.variableHeight,
      maxHoldMs: movement.jump.maxHoldMs,
      moveWhileJumping: movement.jump.moveWhileJumping,
      moveWhileFalling: movement.jump.moveWhileFalling,
      directionOnly: movement.jump.directionOnly,
      bunnyHop: movement.jump.bunnyHop,
      bunnyHopBoost: movement.jump.bunnyHopBoost
    },
    sprint: {
      speedMultiplier: movement.sprint.speedMultiplier
    },
    crouch: {
      speedMultiplier: movement.crouch.speedMultiplier
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
  private feetPosition = {
    x: 0,
    y: 0,
    z: 0
  };
  private standingPlayerShape = cloneFirstPersonPlayerShape(
    FIRST_PERSON_PLAYER_SHAPE
  );
  private activePlayerShape = cloneFirstPersonPlayerShape(
    FIRST_PERSON_PLAYER_SHAPE
  );
  private yawRadians = 0;
  private pitchRadians = 0;
  private verticalVelocity = 0;
  private grounded = false;
  private jumpPressed = false;
  private locomotionState: RuntimeLocomotionState =
    createIdleRuntimeLocomotionState("flying");
  private inWaterVolume = false;
  private inFogVolume = false;
  private pointerLocked = false;
  private suppressNextPointerLockError = false;
  private initializedFromSpawn = false;
  private previousTelemetry: PlayerControllerTelemetry | null = null;
  private latestJumpStarted = false;
  private latestHeadBump = false;
  private smoothedFeetY = 0;
  private previousPlanarDisplacement = {
    x: 0,
    y: 0,
    z: 0
  };
  private jumpBufferRemainingMs = 0;
  private coyoteTimeRemainingMs = 0;
  private jumpHoldRemainingMs = 0;

  activate(ctx: RuntimeControllerContext): void {
    this.context = ctx;

    if (!this.initializedFromSpawn) {
      const runtimeScene = ctx.getRuntimeScene();
      const spawn = runtimeScene.spawn;
      this.feetPosition = {
        ...spawn.position
      };
      this.standingPlayerShape = cloneFirstPersonPlayerShape(
        runtimeScene.playerCollider
      );
      this.activePlayerShape = cloneFirstPersonPlayerShape(
        runtimeScene.playerCollider
      );
      this.yawRadians = (spawn.yawDegrees * Math.PI) / 180;
      this.pitchRadians = 0;
      this.verticalVelocity = 0;
      this.grounded = false;
      this.jumpPressed = false;
      this.smoothedFeetY = this.feetPosition.y;
      this.locomotionState = createIdleRuntimeLocomotionState(
        runtimeScene.playerCollider.mode === "none" ? "flying" : "airborne"
      );
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
    this.jumpPressed = false;
    this.latestJumpStarted = false;
    this.latestHeadBump = false;
    this.previousPlanarDisplacement = {
      x: 0,
      y: 0,
      z: 0
    };
    this.jumpBufferRemainingMs = 0;
    this.coyoteTimeRemainingMs = 0;
    this.jumpHoldRemainingMs = 0;
    this.previousTelemetry = null;
    ctx.setRuntimeMessage(null);
    ctx.setPlayerControllerTelemetry(null);
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
    this.jumpPressed = false;
    this.smoothedFeetY = 0;
    this.standingPlayerShape = cloneFirstPersonPlayerShape(
      FIRST_PERSON_PLAYER_SHAPE
    );
    this.activePlayerShape = cloneFirstPersonPlayerShape(
      FIRST_PERSON_PLAYER_SHAPE
    );
    this.locomotionState = createIdleRuntimeLocomotionState("flying");
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.pointerLocked = false;
    this.suppressNextPointerLockError = false;
    this.initializedFromSpawn = false;
    this.previousTelemetry = null;
    this.latestJumpStarted = false;
    this.latestHeadBump = false;
    this.previousPlanarDisplacement = {
      x: 0,
      y: 0,
      z: 0
    };
    this.jumpBufferRemainingMs = 0;
    this.coyoteTimeRemainingMs = 0;
    this.jumpHoldRemainingMs = 0;
  }

  update(dt: number): void {
    if (this.context === null) {
      return;
    }

    const runtimeScene = this.context.getRuntimeScene();
    this.standingPlayerShape = cloneFirstPersonPlayerShape(
      runtimeScene.playerCollider
    );
    const playerMovement = runtimeScene.playerMovement;
    const lookInput = resolvePlayerStartLookInput(
      runtimeScene.playerInputBindings
    );
    const inputState = resolvePlayerStartActionInputs(
      this.pressedKeys,
      runtimeScene.playerInputBindings
    );

    if (lookInput.horizontal !== 0 || lookInput.vertical !== 0) {
      this.yawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians + lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
      );
    }

    const locomotionStep = stepPlayerLocomotion(
      {
        dt,
        feetPosition: this.feetPosition,
        movementYawRadians: this.yawRadians,
        airDirectionYawRadians: this.yawRadians,
        standingShape: this.standingPlayerShape,
        verticalVelocity: this.verticalVelocity,
        previousLocomotionState: this.locomotionState,
        previousPlanarDisplacement: this.previousPlanarDisplacement,
        jumpBufferRemainingMs: this.jumpBufferRemainingMs,
        coyoteTimeRemainingMs: this.coyoteTimeRemainingMs,
        jumpHoldRemainingMs: this.jumpHoldRemainingMs,
        crouched: this.locomotionState.crouched,
        wasJumpPressed: this.jumpPressed,
        input: inputState,
        movement: playerMovement,
        resolveMotion: (feetPosition, motion, shape) =>
          this.context?.resolveFirstPersonMotion(feetPosition, motion, shape) ??
          null,
        resolveVolumeState: (feetPosition) =>
          this.context?.resolvePlayerVolumeState(feetPosition) ?? {
            inWater: false,
            inFog: false,
            waterSurfaceHeight: null
          },
        probeGround: (feetPosition, shape, maxDistance) =>
          this.context?.probePlayerGround?.(feetPosition, shape, maxDistance) ?? {
            grounded: false,
            distance: null,
            normal: null,
            slopeDegrees: null
          },
        canOccupyShape: (feetPosition, shape) =>
          this.context?.canOccupyPlayerShape?.(feetPosition, shape) ?? true
      }
    );

    if (locomotionStep === null) {
      this.updateCameraTransform();
      this.publishTelemetry();
      return;
    }

    this.feetPosition = locomotionStep.feetPosition;
    this.activePlayerShape = locomotionStep.activeShape;
    this.verticalVelocity = locomotionStep.verticalVelocity;
    this.jumpBufferRemainingMs = locomotionStep.jumpBufferRemainingMs;
    this.coyoteTimeRemainingMs = locomotionStep.coyoteTimeRemainingMs;
    this.jumpHoldRemainingMs = locomotionStep.jumpHoldRemainingMs;
    this.jumpPressed = locomotionStep.jumpPressed;
    this.latestJumpStarted = locomotionStep.jumpStarted;
    this.latestHeadBump = locomotionStep.headBump;
    this.locomotionState = locomotionStep.locomotionState;
    this.previousPlanarDisplacement = locomotionStep.planarDisplacement;
    this.grounded = locomotionStep.locomotionState.grounded;
    this.inWaterVolume = locomotionStep.inWaterVolume;
    this.inFogVolume = locomotionStep.inFogVolume;
    this.smoothedFeetY = smoothGroundedStairHeight({
      currentSmoothedFeetY: this.smoothedFeetY,
      targetFeetY: this.feetPosition.y,
      grounded: this.grounded,
      dt,
      maxStepHeight: playerMovement.maxStepHeight
    });

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
    this.jumpPressed = false;
    this.smoothedFeetY = this.feetPosition.y;
    this.activePlayerShape = cloneFirstPersonPlayerShape(
      this.context?.getRuntimeScene().playerCollider ?? FIRST_PERSON_PLAYER_SHAPE
    );
    this.standingPlayerShape = cloneFirstPersonPlayerShape(
      this.context?.getRuntimeScene().playerCollider ?? FIRST_PERSON_PLAYER_SHAPE
    );
    this.locomotionState = createIdleRuntimeLocomotionState(
      this.activePlayerShape.mode === "none" ? "flying" : "airborne"
    );
    this.previousTelemetry = null;
    this.latestJumpStarted = false;
    this.latestHeadBump = false;
    this.previousPlanarDisplacement = {
      x: 0,
      y: 0,
      z: 0
    };
    this.jumpBufferRemainingMs = 0;
    this.coyoteTimeRemainingMs = 0;
    this.jumpHoldRemainingMs = 0;
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.updateCameraTransform();
    this.publishTelemetry();
  }

  private updateCameraTransform() {
    if (this.context === null) {
      return;
    }

    const renderedFeetPosition = {
      x: this.feetPosition.x,
      y: this.smoothedFeetY,
      z: this.feetPosition.z
    };
    const eyePosition = toEyePosition(
      renderedFeetPosition,
      getFirstPersonPlayerEyeHeight(this.activePlayerShape)
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

    const renderedFeetPosition = {
      x: this.feetPosition.x,
      y: this.smoothedFeetY,
      z: this.feetPosition.z
    };
    const eyePosition = toEyePosition(
      renderedFeetPosition,
      getFirstPersonPlayerEyeHeight(this.activePlayerShape)
    );
    const cameraVolumeState =
      this.context.resolvePlayerVolumeState(eyePosition);
    const cameraSubmerged =
      cameraVolumeState.inWater &&
      cameraVolumeState.waterSurfaceHeight !== null &&
      eyePosition.y < cameraVolumeState.waterSurfaceHeight;

    const telemetry = createPlayerControllerTelemetry({
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
      cameraSubmerged,
      inFogVolume: this.inFogVolume,
      pointerLocked: this.pointerLocked,
      spawn: this.context.getRuntimeScene().spawn,
      previousLocomotionState: this.previousTelemetry?.locomotionState ?? null,
      previousInWaterVolume: this.previousTelemetry?.inWaterVolume ?? false,
      jumpStarted: this.latestJumpStarted,
      headBump: this.latestHeadBump
    });

    this.context.setPlayerControllerTelemetry(telemetry);
    this.previousTelemetry = telemetry;
    this.latestJumpStarted = false;
    this.latestHeadBump = false;
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
    if (
      !this.pointerLocked ||
      this.context?.isInputSuspended() === true
    ) {
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
      this.context.isInputSuspended() ||
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
