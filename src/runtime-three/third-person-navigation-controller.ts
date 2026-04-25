import { Vector3 } from "three";

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
  NavigationController,
  NavigationControllerDeactivateOptions,
  RuntimeControllerContext,
  RuntimeLocomotionState
} from "./navigation-controller";
import type { RuntimePlayerMovement } from "./runtime-scene-build";

const LOOK_SENSITIVITY = 0.008;
const GAMEPAD_LOOK_SPEED = 2.8;
const DEFAULT_CAMERA_DISTANCE = 4.5;
const MIN_CAMERA_DISTANCE = 1.5;
const MAX_CAMERA_DISTANCE = 7;
const DEFAULT_PITCH_RADIANS = 0.35;
const MIN_PITCH_RADIANS = -0.2;
const MAX_PITCH_RADIANS = Math.PI * 0.45;
export const THIRD_PERSON_CAMERA_COLLISION_RADIUS = 0.2;
const CAMERA_PIVOT_EYE_HEIGHT_FACTOR = 0.85;

function clampPitch(pitchRadians: number): number {
  return Math.max(
    MIN_PITCH_RADIANS,
    Math.min(MAX_PITCH_RADIANS, pitchRadians)
  );
}

function clampCameraDistance(distance: number): number {
  return Math.max(
    MIN_CAMERA_DISTANCE,
    Math.min(MAX_CAMERA_DISTANCE, distance)
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

export class ThirdPersonNavigationController implements NavigationController {
  readonly id = "thirdPerson" as const;

  private context: RuntimeControllerContext | null = null;
  private readonly pressedKeys = new Set<string>();
  private readonly lookAtVector = new Vector3();
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
  private cameraYawRadians = 0;
  private pitchRadians = DEFAULT_PITCH_RADIANS;
  private cameraDistance = DEFAULT_CAMERA_DISTANCE;
  private verticalVelocity = 0;
  private grounded = false;
  private jumpPressed = false;
  private locomotionState: RuntimeLocomotionState =
    createIdleRuntimeLocomotionState("flying");
  private inWaterVolume = false;
  private inFogVolume = false;
  private dragging = false;
  private lastPointerClientX = 0;
  private lastPointerClientY = 0;
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
      this.cameraYawRadians = this.yawRadians;
      this.pitchRadians = DEFAULT_PITCH_RADIANS;
      this.cameraDistance = DEFAULT_CAMERA_DISTANCE;
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
    ctx.domElement.addEventListener("pointerdown", this.handlePointerDown);
    ctx.domElement.addEventListener("wheel", this.handleWheel, {
      passive: false
    });
    ctx.domElement.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);

    ctx.setRuntimeMessage(
      "Third Person active. Drag to orbit the camera, use the right stick for gamepad camera look, move with your authored bindings, and scroll to zoom."
    );
    this.updateCameraTransform();
    this.publishTelemetry();
  }

  deactivate(
    ctx: RuntimeControllerContext,
    _options: NavigationControllerDeactivateOptions = {}
  ): void {
    void _options;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    ctx.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    ctx.domElement.removeEventListener("wheel", this.handleWheel);
    ctx.domElement.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.pressedKeys.clear();
    this.dragging = false;
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
    this.cameraYawRadians = 0;
    this.pitchRadians = DEFAULT_PITCH_RADIANS;
    this.cameraDistance = DEFAULT_CAMERA_DISTANCE;
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
    this.dragging = false;
    this.lastPointerClientX = 0;
    this.lastPointerClientY = 0;
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

    if (
      this.context.isCameraDrivenExternally() !== true &&
      (lookInput.horizontal !== 0 || lookInput.vertical !== 0)
    ) {
      this.cameraYawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians - lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
      );
    }

    const movementYawRadians =
      this.context.isCameraDrivenExternally() === true
        ? this.context.getCameraYawRadians()
        : this.cameraYawRadians;

    const locomotionStep = stepPlayerLocomotion(
      {
        dt,
        feetPosition: this.feetPosition,
        movementYawRadians,
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

    if (
      Math.hypot(
        locomotionStep.planarDisplacement.x,
        locomotionStep.planarDisplacement.z
      ) > 1e-5
    ) {
      this.yawRadians = Math.atan2(
        locomotionStep.planarDisplacement.x,
        locomotionStep.planarDisplacement.z
      );
    }

    this.updateCameraTransform();
    this.publishTelemetry();
  }

  teleportTo(feetPosition: Vec3, yawDegrees: number) {
    this.feetPosition = {
      ...feetPosition
    };
    this.yawRadians = (yawDegrees * Math.PI) / 180;
    this.cameraYawRadians = this.yawRadians;
    this.pitchRadians = DEFAULT_PITCH_RADIANS;
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

    const eyeHeight = getFirstPersonPlayerEyeHeight(this.activePlayerShape);
    const pivot = {
      x: this.feetPosition.x,
      y: this.smoothedFeetY + eyeHeight * CAMERA_PIVOT_EYE_HEIGHT_FACTOR,
      z: this.feetPosition.z
    };
    const horizontalDistance =
      Math.cos(this.pitchRadians) * this.cameraDistance;
    const desiredCameraPosition = {
      x: pivot.x - Math.sin(this.cameraYawRadians) * horizontalDistance,
      y: pivot.y + Math.sin(this.pitchRadians) * this.cameraDistance,
      z: pivot.z - Math.cos(this.cameraYawRadians) * horizontalDistance
    };
    const resolvedCameraPosition =
      this.context.resolveThirdPersonCameraCollision(
        pivot,
        desiredCameraPosition,
        THIRD_PERSON_CAMERA_COLLISION_RADIUS
      );

    this.context.camera.position.set(
      resolvedCameraPosition.x,
      resolvedCameraPosition.y,
      resolvedCameraPosition.z
    );
    this.lookAtVector.set(pivot.x, pivot.y, pivot.z);
    this.context.camera.lookAt(this.lookAtVector);
  }

  private publishTelemetry() {
    if (this.context === null) {
      return;
    }

    const eyePosition = toEyePosition(
      this.feetPosition,
      getFirstPersonPlayerEyeHeight(this.activePlayerShape)
    );
    const cameraVolumeState = this.context.resolvePlayerVolumeState({
      x: this.context.camera.position.x,
      y: this.context.camera.position.y,
      z: this.context.camera.position.z
    });
    const cameraSubmerged =
      cameraVolumeState.inWater &&
      cameraVolumeState.waterSurfaceHeight !== null &&
      this.context.camera.position.y < cameraVolumeState.waterSurfaceHeight;

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
      pointerLocked: false,
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

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };

  private handleBlur = () => {
    this.pressedKeys.clear();
    this.dragging = false;
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      this.context?.isInputSuspended() === true ||
      this.context?.isCameraDrivenExternally() === true
    ) {
      return;
    }

    this.dragging = true;
    this.lastPointerClientX = event.clientX;
    this.lastPointerClientY = event.clientY;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (
      !this.dragging ||
      this.context?.isInputSuspended() === true ||
      this.context?.isCameraDrivenExternally() === true
    ) {
      return;
    }

    const deltaX = event.clientX - this.lastPointerClientX;
    const deltaY = event.clientY - this.lastPointerClientY;
    this.lastPointerClientX = event.clientX;
    this.lastPointerClientY = event.clientY;

    this.cameraYawRadians -= deltaX * LOOK_SENSITIVITY;
    this.pitchRadians = clampPitch(
      this.pitchRadians + deltaY * LOOK_SENSITIVITY
    );
  };

  private handlePointerUp = () => {
    this.dragging = false;
  };

  private handleWheel = (event: WheelEvent) => {
    if (
      this.context?.isInputSuspended() === true ||
      this.context?.isCameraDrivenExternally() === true
    ) {
      return;
    }

    event.preventDefault();
    this.cameraDistance = clampCameraDistance(
      this.cameraDistance + event.deltaY * 0.01
    );
  };

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
}
