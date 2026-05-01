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
  CLIMB_INPUT_ACTIVE_THRESHOLD,
  CLIMB_SPEED_METERS_PER_SECOND,
  computeClimbPlaneMovement,
  isClimbMovementIntoSurface,
  resolveClimbPlanarInputDirection,
  shouldEnterClimbing,
  shouldExitClimbing,
  type RuntimePlayerClimbSurface
} from "./player-climbing";
import {
  resolvePlayerLedgeGrabTarget,
  resolvePlayerEdgeAssistTopOut,
  shouldAttemptPlayerEdgeAssist,
  type RuntimePlayerLedgeGrabTarget
} from "./player-edge-assist";
import {
  createIdleRuntimeLocomotionState,
  stepPlayerLocomotion
} from "./player-locomotion";
import { createPlayerControllerTelemetry } from "./player-controller-telemetry";
import { shouldAutoCapturePointerLockOnActivate } from "./pointer-lock-utils";
import { smoothGroundedStairHeight } from "./stair-height-smoothing";
import type {
  NavigationController,
  NavigationControllerDeactivateOptions,
  PlayerControllerTelemetry,
  RuntimeControllerContext,
  RuntimeLocomotionState,
  RuntimeTargetLookInputResult
} from "./navigation-controller";
import type { RuntimePlayerMovement } from "./runtime-scene-build";

const LOOK_SENSITIVITY = 0.008;
const GAMEPAD_LOOK_SPEED = 2.8;
const DEFAULT_CAMERA_DISTANCE = 4.5;
const MIN_CAMERA_DISTANCE = 1.5;
const MAX_CAMERA_DISTANCE = 7;
const DEFAULT_PITCH_RADIANS = 0.35;
const MIN_PITCH_RADIANS = -Math.PI * 0.3;
const MAX_PITCH_RADIANS = Math.PI * 0.45;
export const THIRD_PERSON_CAMERA_COLLISION_RADIUS = 0.2;
const CAMERA_COLLISION_RECOVERY_SPEED = 6.5;
const CAMERA_COLLISION_DISTANCE_EPSILON = 1e-4;
const CAMERA_PIVOT_EYE_HEIGHT_FACTOR = 0.85;
const TARGET_ASSIST_YAW_SPEED = 2.2;
const TARGET_ASSIST_ORBIT_PITCH_RETURN_SPEED = 5.5;
const TARGET_ASSIST_VERTICAL_LOOK_SPEED = 3.4;
const TARGET_ASSIST_VERTICAL_LOOK_LIMIT = 1.25;
const TARGET_ASSIST_VERTICAL_COLLISION_FADE_START_RATIO = 0.28;
const TARGET_ASSIST_VERTICAL_COLLISION_FADE_END_RATIO = 0.72;
const TARGET_LOOK_OFFSET_GAMEPAD_SPEED = 1.15;
const TARGET_LOOK_OFFSET_POINTER_SENSITIVITY = 0.004;
const TARGET_LOOK_OFFSET_RETURN_SPEED = 5.5;
const TARGET_LOOK_OFFSET_YAW_LIMIT = 0.75;
const TARGET_LOOK_OFFSET_PITCH_LIMIT = 0.42;
const POINTER_TARGET_LOOK_INPUT_SCALE = 0.06;

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

function normalizeAngleRadians(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function dampAngleRadians(
  current: number,
  target: number,
  strength: number,
  dt: number
): number {
  if (dt <= 0 || strength <= 0) {
    return current;
  }

  const alpha = 1 - Math.exp(-strength * dt);
  return current + normalizeAngleRadians(target - current) * alpha;
}

function dampScalar(
  current: number,
  target: number,
  strength: number,
  dt: number
): number {
  if (dt <= 0 || strength <= 0) {
    return current;
  }

  const alpha = 1 - Math.exp(-strength * dt);

  return current + (target - current) * alpha;
}

function smoothStep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));

  return t * t * (3 - 2 * t);
}

function toEyePosition(feetPosition: Vec3, eyeHeight: number): Vec3 {
  return {
    x: feetPosition.x,
    y: feetPosition.y + eyeHeight,
    z: feetPosition.z
  };
}

function dotPlanarVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.z * right.z;
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
    },
    edgeAssist: {
      enabled: movement.edgeAssist.enabled,
      pushToTopHeight: movement.edgeAssist.pushToTopHeight
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
  private targetLookOffsetYawRadians = 0;
  private targetLookOffsetPitchRadians = 0;
  private targetAssistLookOffsetY = 0;
  private cameraDistance = DEFAULT_CAMERA_DISTANCE;
  private verticalVelocity = 0;
  private grounded = false;
  private jumpPressed = false;
  private locomotionState: RuntimeLocomotionState =
    createIdleRuntimeLocomotionState("flying");
  private inWaterVolume = false;
  private inFogVolume = false;
  private pointerLocked = false;
  private suppressNextPointerLockError = false;
  private dragging = false;
  private pointerLookInputPending = false;
  private lastPointerClientX = 0;
  private lastPointerClientY = 0;
  private initializedFromSpawn = false;
  private previousTelemetry: PlayerControllerTelemetry | null = null;
  private latestJumpStarted = false;
  private latestHeadBump = false;
  private smoothedFeetY = 0;
  private smoothedCameraCollisionDistance: number | null = null;
  private previousPlanarDisplacement = {
    x: 0,
    y: 0,
    z: 0
  };
  private jumpBufferRemainingMs = 0;
  private coyoteTimeRemainingMs = 0;
  private jumpHoldRemainingMs = 0;
  private climbSurface: RuntimePlayerClimbSurface | null = null;
  private climbLatchBlocked = false;
  private ledgeGrabTarget: RuntimePlayerLedgeGrabTarget | null = null;

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
      this.targetLookOffsetYawRadians = 0;
      this.targetLookOffsetPitchRadians = 0;
      this.targetAssistLookOffsetY = 0;
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
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange
    );
    document.addEventListener("pointerlockerror", this.handlePointerLockError);
    ctx.domElement.addEventListener("pointerdown", this.handlePointerDown);
    ctx.domElement.addEventListener("wheel", this.handleWheel, {
      passive: false
    });
    ctx.domElement.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);

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

    this.updateCameraTransform(0);
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
    ctx.domElement.removeEventListener("wheel", this.handleWheel);
    ctx.domElement.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.pressedKeys.clear();

    if (
      (options.releasePointerLock ?? true) &&
      document.pointerLockElement === ctx.domElement
    ) {
      document.exitPointerLock();
    }

    this.pointerLocked = false;
    this.suppressNextPointerLockError = false;
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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
    this.previousTelemetry = null;
    this.smoothedCameraCollisionDistance = null;
    this.pointerLookInputPending = false;
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
    this.targetLookOffsetYawRadians = 0;
    this.targetLookOffsetPitchRadians = 0;
    this.targetAssistLookOffsetY = 0;
    this.cameraDistance = DEFAULT_CAMERA_DISTANCE;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.jumpPressed = false;
    this.smoothedFeetY = 0;
    this.smoothedCameraCollisionDistance = null;
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
    this.dragging = false;
    this.pointerLookInputPending = false;
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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
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

    const cameraDrivenExternally = this.context.isCameraDrivenExternally() === true;
    const lookInputActive = lookInput.horizontal !== 0 || lookInput.vertical !== 0;
    const manualLookInputActive =
      lookInputActive || this.pointerLookInputPending;
    this.pointerLookInputPending = false;
    let targetLookResult: RuntimeTargetLookInputResult | null = null;

    if (!cameraDrivenExternally && lookInputActive) {
      targetLookResult =
        this.context.handleRuntimeTargetLookInput?.({
          horizontal: lookInput.horizontal,
          vertical: lookInput.vertical
        }) ?? null;
    } else if (!cameraDrivenExternally) {
      targetLookResult =
        this.context.handleRuntimeTargetLookInput?.({
          horizontal: 0,
          vertical: 0
        }) ?? null;
    }

    if (
      !cameraDrivenExternally &&
      lookInputActive &&
      targetLookResult?.activeTargetLocked === true
    ) {
      if (
        targetLookResult.switchedTarget !== true &&
        targetLookResult.switchInputHeld !== true
      ) {
        this.applyTargetLookOffsetDelta(
          -lookInput.horizontal * TARGET_LOOK_OFFSET_GAMEPAD_SPEED * dt,
          -lookInput.vertical * TARGET_LOOK_OFFSET_GAMEPAD_SPEED * dt
        );
      }
    } else if (!cameraDrivenExternally && lookInputActive) {
      this.cameraYawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians - lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
      );
    }

    if (
      cameraDrivenExternally ||
      !manualLookInputActive ||
      targetLookResult?.activeTargetLocked !== true ||
      targetLookResult.switchedTarget === true ||
      targetLookResult.switchInputHeld === true
    ) {
      this.targetLookOffsetYawRadians = dampScalar(
        this.targetLookOffsetYawRadians,
        0,
        TARGET_LOOK_OFFSET_RETURN_SPEED,
        dt
      );
      this.targetLookOffsetPitchRadians = dampScalar(
        this.targetLookOffsetPitchRadians,
        0,
        TARGET_LOOK_OFFSET_RETURN_SPEED,
        dt
      );
    }

    if (!cameraDrivenExternally && !manualLookInputActive) {
      const targetAssist =
        this.context.resolveThirdPersonTargetAssist?.() ?? null;

      if (targetAssist !== null) {
        const targetYaw = Math.atan2(
          targetAssist.targetPosition.x - this.feetPosition.x,
          targetAssist.targetPosition.z - this.feetPosition.z
        );
        this.pitchRadians = dampScalar(
          this.pitchRadians,
          DEFAULT_PITCH_RADIANS,
          TARGET_ASSIST_ORBIT_PITCH_RETURN_SPEED * targetAssist.strength,
          dt
        );
        this.cameraYawRadians = dampAngleRadians(
          this.cameraYawRadians,
          targetYaw,
          TARGET_ASSIST_YAW_SPEED * targetAssist.strength,
          dt
        );
        const eyeHeight = getFirstPersonPlayerEyeHeight(this.activePlayerShape);
        const pivotY =
          this.smoothedFeetY + eyeHeight * CAMERA_PIVOT_EYE_HEIGHT_FACTOR;
        const targetLookOffsetY = Math.max(
          -TARGET_ASSIST_VERTICAL_LOOK_LIMIT,
          Math.min(
            TARGET_ASSIST_VERTICAL_LOOK_LIMIT,
            targetAssist.targetPosition.y - pivotY
          )
        );
        this.targetAssistLookOffsetY = dampScalar(
          this.targetAssistLookOffsetY,
          targetLookOffsetY,
          TARGET_ASSIST_VERTICAL_LOOK_SPEED * targetAssist.strength,
          dt
        );
      } else {
        this.targetAssistLookOffsetY = dampScalar(
          this.targetAssistLookOffsetY,
          0,
          TARGET_ASSIST_VERTICAL_LOOK_SPEED,
          dt
        );
      }
    } else if (cameraDrivenExternally) {
      this.targetAssistLookOffsetY = dampScalar(
        this.targetAssistLookOffsetY,
        0,
        TARGET_ASSIST_VERTICAL_LOOK_SPEED,
        dt
      );
    }

    const movementYawRadians =
      cameraDrivenExternally
        ? this.context.getCameraYawRadians()
        : this.cameraYawRadians;

    if (
      this.stepClimbing(
        dt,
        inputState,
        playerMovement,
        movementYawRadians
      )
    ) {
      return;
    }

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
      this.updateCameraTransform(dt);
      this.publishTelemetry();
      return;
    }

    const previousFeetPosition = this.feetPosition;
    const edgeInputDirection = resolveClimbPlanarInputDirection(
      inputState,
      movementYawRadians
    );
    const edgeAssist =
      edgeInputDirection.direction !== null &&
      shouldAttemptPlayerEdgeAssist({
        enabled: playerMovement.edgeAssist.enabled,
        pushToTopHeight: playerMovement.edgeAssist.pushToTopHeight,
        inputMagnitude: locomotionStep.locomotionState.inputMagnitude,
        requestedPlanarSpeed:
          locomotionStep.locomotionState.requestedPlanarSpeed,
        planarSpeed: locomotionStep.locomotionState.planarSpeed,
        collisionCount: locomotionStep.locomotionState.contact.collisionCount,
        airborne: locomotionStep.locomotionState.locomotionMode === "airborne"
      })
        ? resolvePlayerEdgeAssistTopOut({
            feetPosition: locomotionStep.feetPosition,
            shape: locomotionStep.activeShape,
            direction: edgeInputDirection.direction,
            pushToTopHeight: playerMovement.edgeAssist.pushToTopHeight,
            canOccupyShape: (feetPosition, shape) =>
              this.context?.canOccupyPlayerShape?.(feetPosition, shape) ??
              true,
            probeGround: (feetPosition, shape, maxDistance) =>
              this.context?.probePlayerGround?.(
                feetPosition,
                shape,
                maxDistance
              ) ?? {
                grounded: false,
                distance: null,
                normal: null,
                slopeDegrees: null
              }
          })
        : null;
    const nextFeetPosition =
      edgeAssist === null ? locomotionStep.feetPosition : edgeAssist.feetPosition;
    const nextLocomotionState =
      edgeAssist === null
        ? locomotionStep.locomotionState
        : {
            ...locomotionStep.locomotionState,
            locomotionMode: "grounded" as const,
            airborneKind: null,
            gait: "walk" as const,
            grounded: true,
            verticalVelocity: 0,
            contact: {
              ...locomotionStep.locomotionState.contact,
              groundNormal: { x: 0, y: 1, z: 0 },
              groundDistance: 0,
              slopeDegrees: 0
            }
          };

    this.feetPosition = nextFeetPosition;
    this.activePlayerShape = locomotionStep.activeShape;
    this.verticalVelocity =
      edgeAssist === null ? locomotionStep.verticalVelocity : 0;
    this.jumpBufferRemainingMs = locomotionStep.jumpBufferRemainingMs;
    this.coyoteTimeRemainingMs = locomotionStep.coyoteTimeRemainingMs;
    this.jumpHoldRemainingMs =
      edgeAssist === null ? locomotionStep.jumpHoldRemainingMs : 0;
    this.jumpPressed = locomotionStep.jumpPressed;
    this.latestJumpStarted = locomotionStep.jumpStarted;
    this.latestHeadBump = edgeAssist === null ? locomotionStep.headBump : false;
    this.locomotionState = nextLocomotionState;
    this.previousPlanarDisplacement =
      edgeAssist === null
        ? locomotionStep.planarDisplacement
        : {
            x: this.feetPosition.x - previousFeetPosition.x,
            y: 0,
            z: this.feetPosition.z - previousFeetPosition.z
          };
    this.grounded = nextLocomotionState.grounded;
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
        this.previousPlanarDisplacement.x,
        this.previousPlanarDisplacement.z
      ) > 1e-5
    ) {
      this.yawRadians = Math.atan2(
        this.previousPlanarDisplacement.x,
        this.previousPlanarDisplacement.z
      );
    }

    this.updateCameraTransform(dt);
    this.publishTelemetry();
  }

  teleportTo(feetPosition: Vec3, yawDegrees: number) {
    this.feetPosition = {
      ...feetPosition
    };
    this.yawRadians = (yawDegrees * Math.PI) / 180;
    this.cameraYawRadians = this.yawRadians;
    this.pitchRadians = DEFAULT_PITCH_RADIANS;
    this.targetLookOffsetYawRadians = 0;
    this.targetLookOffsetPitchRadians = 0;
    this.targetAssistLookOffsetY = 0;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.jumpPressed = false;
    this.smoothedFeetY = this.feetPosition.y;
    this.smoothedCameraCollisionDistance = null;
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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.updateCameraTransform(0);
    this.publishTelemetry();
  }

  private resolveClimbProbeDirection(
    movementYawRadians: number,
    inputState: ReturnType<typeof resolvePlayerStartActionInputs>
  ): Vec3 {
    if (this.climbSurface !== null) {
      return {
        x: -this.climbSurface.normal.x,
        y: -this.climbSurface.normal.y,
        z: -this.climbSurface.normal.z
      };
    }

    const inputDirection = resolveClimbPlanarInputDirection(
      inputState,
      movementYawRadians
    );

    if (inputDirection.direction !== null) {
      return inputDirection.direction;
    }

    return {
      x: Math.sin(movementYawRadians),
      y: 0,
      z: Math.cos(movementYawRadians)
    };
  }

  private createClimbingLocomotionState(options: {
    inputMagnitude: number;
    displacement: Vec3;
    dt: number;
    collisionCount: number;
    collidedAxes: { x: boolean; y: boolean; z: boolean };
  }): RuntimeLocomotionState {
    const speed =
      options.dt > 0
        ? Math.hypot(
            options.displacement.x,
            options.displacement.y,
            options.displacement.z
          ) / options.dt
        : 0;

    return {
      locomotionMode: "climbing",
      airborneKind: null,
      gait: options.inputMagnitude > 0 ? "walk" : "idle",
      grounded: false,
      crouched: false,
      sprinting: false,
      inputMagnitude: options.inputMagnitude,
      requestedPlanarSpeed: CLIMB_SPEED_METERS_PER_SECOND,
      planarSpeed: speed,
      verticalVelocity: 0,
      contact: {
        collisionCount: options.collisionCount,
        collidedAxes: options.collidedAxes,
        groundNormal: null,
        groundDistance: null,
        slopeDegrees: null
      }
    };
  }

  private stepClimbing(
    dt: number,
    inputState: ReturnType<typeof resolvePlayerStartActionInputs>,
    playerMovement: RuntimePlayerMovement,
    movementYawRadians: number
  ): boolean {
    if (this.context === null) {
      return false;
    }

    const climbPressed = inputState.climb > CLIMB_INPUT_ACTIVE_THRESHOLD;
    const jumpPressed = inputState.jump > CLIMB_INPUT_ACTIVE_THRESHOLD;

    const climbSurface =
      this.context.resolvePlayerClimbSurface?.(
        this.feetPosition,
        this.resolveClimbProbeDirection(movementYawRadians, inputState),
        this.standingPlayerShape,
        this.climbSurface
      ) ?? null;
    const movementIntoSurface = isClimbMovementIntoSurface({
      input: inputState,
      movementYawRadians,
      surface: climbSurface
    });
    const climbIntentActive = climbPressed || movementIntoSurface;

    if (!climbIntentActive) {
      this.climbLatchBlocked = false;
    }

    if (
      this.climbSurface !== null &&
      shouldExitClimbing({
        surface: climbSurface,
        jumpPressed
      })
    ) {
      const exitSurface = this.climbSurface;
      this.climbSurface = null;

      if (jumpPressed && playerMovement.capabilities.jump) {
        const detachMotion = {
          x: exitSurface.normal.x * 0.25,
          y: Math.max(0.05, playerMovement.jump.speed * 0.05),
          z: exitSurface.normal.z * 0.25
        };
        const resolvedMotion =
          this.context.resolveFirstPersonMotion(
            this.feetPosition,
            detachMotion,
            this.standingPlayerShape
          ) ?? null;
        const nextFeetPosition =
          resolvedMotion?.feetPosition ?? {
            x: this.feetPosition.x + detachMotion.x,
            y: this.feetPosition.y + detachMotion.y,
            z: this.feetPosition.z + detachMotion.z
          };
        const displacement = {
          x: nextFeetPosition.x - this.feetPosition.x,
          y: nextFeetPosition.y - this.feetPosition.y,
          z: nextFeetPosition.z - this.feetPosition.z
        };

        this.feetPosition = nextFeetPosition;
        this.activePlayerShape = cloneFirstPersonPlayerShape(
          this.standingPlayerShape
        );
        this.verticalVelocity = playerMovement.jump.speed;
        this.jumpBufferRemainingMs = 0;
        this.coyoteTimeRemainingMs = 0;
        this.jumpHoldRemainingMs = playerMovement.jump.variableHeight
          ? playerMovement.jump.maxHoldMs
          : 0;
        this.jumpPressed = true;
        this.latestJumpStarted = true;
        this.latestHeadBump = false;
        this.climbLatchBlocked = true;
        this.previousPlanarDisplacement = displacement;
        this.grounded = false;
        this.inWaterVolume = false;
        this.inFogVolume =
          this.context.resolvePlayerVolumeState(this.feetPosition).inFog;
        this.smoothedFeetY = this.feetPosition.y;
        this.locomotionState = {
          ...createIdleRuntimeLocomotionState("airborne"),
          airborneKind: "jumping",
          verticalVelocity: this.verticalVelocity,
          inputMagnitude: 0,
          requestedPlanarSpeed: playerMovement.moveSpeed,
          planarSpeed:
            dt > 0 ? Math.hypot(displacement.x, displacement.z) / dt : 0
        };
        this.updateCameraTransform(dt);
        this.publishTelemetry();
        return true;
      }

      return false;
    }

    if (
      this.climbSurface === null &&
      (this.climbLatchBlocked ||
        !shouldEnterClimbing({
          climbInput: inputState.climb,
          movementIntoSurface,
          surface: climbSurface,
          jumpPressed
        }))
    ) {
      return false;
    }

    const activeSurface = climbSurface ?? this.climbSurface;

    if (activeSurface === null) {
      return false;
    }

    const climbMovement = computeClimbPlaneMovement({
      normal: activeSurface.normal,
      input: inputState,
      speedMetersPerSecond: CLIMB_SPEED_METERS_PER_SECOND,
      dt
    });
    const climbTopOutAssist =
      playerMovement.edgeAssist.enabled && climbMovement.motion.y > 0
        ? resolvePlayerEdgeAssistTopOut({
            feetPosition: this.feetPosition,
            shape: this.standingPlayerShape,
            direction: {
              x: -activeSurface.normal.x,
              y: 0,
              z: -activeSurface.normal.z
            },
            pushToTopHeight: playerMovement.edgeAssist.pushToTopHeight,
            canOccupyShape: (feetPosition, shape) =>
              this.context?.canOccupyPlayerShape?.(feetPosition, shape) ??
              true,
            probeGround: (feetPosition, shape, maxDistance) =>
              this.context?.probePlayerGround?.(
                feetPosition,
                shape,
                maxDistance
              ) ?? {
                grounded: false,
                distance: null,
                normal: null,
                slopeDegrees: null
              }
          })
        : null;
    this.climbSurface = climbTopOutAssist === null ? activeSurface : null;

    const resolvedMotion =
      climbTopOutAssist === null
        ? (this.context.resolveFirstPersonMotion(
            this.feetPosition,
            climbMovement.motion,
            this.standingPlayerShape
          ) ?? null)
        : null;
    const nextFeetPosition =
      climbTopOutAssist?.feetPosition ??
      resolvedMotion?.feetPosition ?? {
          x: this.feetPosition.x + climbMovement.motion.x,
          y: this.feetPosition.y + climbMovement.motion.y,
          z: this.feetPosition.z + climbMovement.motion.z
        };
    const displacement = {
      x: nextFeetPosition.x - this.feetPosition.x,
      y: nextFeetPosition.y - this.feetPosition.y,
      z: nextFeetPosition.z - this.feetPosition.z
    };
    const volumeState = this.context.resolvePlayerVolumeState(nextFeetPosition);

    this.feetPosition = nextFeetPosition;
    this.activePlayerShape = cloneFirstPersonPlayerShape(
      this.standingPlayerShape
    );
    this.verticalVelocity = 0;
    this.jumpBufferRemainingMs = 0;
    this.coyoteTimeRemainingMs = 0;
    this.jumpHoldRemainingMs = 0;
    this.jumpPressed = jumpPressed;
    this.latestJumpStarted = false;
    this.latestHeadBump = false;
    this.previousPlanarDisplacement = displacement;
    this.grounded = climbTopOutAssist !== null;
    this.inWaterVolume = volumeState.inWater;
    this.inFogVolume = volumeState.inFog;
    this.smoothedFeetY = this.feetPosition.y;
    this.locomotionState =
      climbTopOutAssist === null
        ? this.createClimbingLocomotionState({
            inputMagnitude: climbMovement.inputMagnitude,
            displacement,
            dt,
            collisionCount: resolvedMotion?.collisionCount ?? 0,
            collidedAxes: resolvedMotion?.collidedAxes ?? {
              x: false,
              y: false,
              z: false
            }
          })
        : {
            ...createIdleRuntimeLocomotionState("grounded"),
            gait: "walk",
            inputMagnitude: climbMovement.inputMagnitude,
            requestedPlanarSpeed: CLIMB_SPEED_METERS_PER_SECOND,
            planarSpeed:
              dt > 0
                ? Math.hypot(displacement.x, displacement.z) / dt
                : 0
          };

    this.updateCameraTransform(dt);
    this.publishTelemetry();
    return true;
  }

  private applyTargetLookOffsetDelta(yawDelta: number, pitchDelta: number) {
    const nextYaw = this.targetLookOffsetYawRadians + yawDelta;
    const nextPitch = this.targetLookOffsetPitchRadians + pitchDelta;
    const clampedYaw = Math.max(
      -TARGET_LOOK_OFFSET_YAW_LIMIT,
      Math.min(TARGET_LOOK_OFFSET_YAW_LIMIT, nextYaw)
    );
    const clampedPitch = Math.max(
      -TARGET_LOOK_OFFSET_PITCH_LIMIT,
      Math.min(TARGET_LOOK_OFFSET_PITCH_LIMIT, nextPitch)
    );
    const boundaryReached = clampedYaw !== nextYaw || clampedPitch !== nextPitch;

    this.targetLookOffsetYawRadians = clampedYaw;
    this.targetLookOffsetPitchRadians = clampedPitch;

    if (boundaryReached) {
      this.context?.handleRuntimeTargetLookBoundaryReached?.();
      this.cameraYawRadians += this.targetLookOffsetYawRadians;
      this.pitchRadians = clampPitch(
        this.pitchRadians + this.targetLookOffsetPitchRadians
      );
      this.targetLookOffsetYawRadians = 0;
      this.targetLookOffsetPitchRadians = 0;
    }
  }

  private resolveSmoothedCameraCollisionPosition(
    pivot: Vec3,
    desiredCameraPosition: Vec3,
    resolvedCameraPosition: Vec3,
    dt: number
  ): Vec3 {
    const desiredDelta = {
      x: desiredCameraPosition.x - pivot.x,
      y: desiredCameraPosition.y - pivot.y,
      z: desiredCameraPosition.z - pivot.z
    };
    const desiredDistance = Math.hypot(
      desiredDelta.x,
      desiredDelta.y,
      desiredDelta.z
    );

    if (desiredDistance <= CAMERA_COLLISION_DISTANCE_EPSILON) {
      this.smoothedCameraCollisionDistance = null;
      return resolvedCameraPosition;
    }

    const resolvedDistance = Math.hypot(
      resolvedCameraPosition.x - pivot.x,
      resolvedCameraPosition.y - pivot.y,
      resolvedCameraPosition.z - pivot.z
    );
    const previousDistance = this.smoothedCameraCollisionDistance;
    const nextDistance =
      previousDistance === null ||
      dt <= 0 ||
      resolvedDistance < previousDistance
        ? resolvedDistance
        : dampScalar(
            previousDistance,
            resolvedDistance,
            CAMERA_COLLISION_RECOVERY_SPEED,
            dt
          );
    const clampedDistance = Math.min(
      Math.max(0, nextDistance),
      Math.min(resolvedDistance, desiredDistance)
    );

    this.smoothedCameraCollisionDistance = clampedDistance;

    return {
      x: pivot.x + (desiredDelta.x / desiredDistance) * clampedDistance,
      y: pivot.y + (desiredDelta.y / desiredDistance) * clampedDistance,
      z: pivot.z + (desiredDelta.z / desiredDistance) * clampedDistance
    };
  }

  private updateCameraTransform(dt = 0) {
    if (this.context === null) {
      return;
    }

    const eyeHeight = getFirstPersonPlayerEyeHeight(this.activePlayerShape);
    const pivot = {
      x: this.feetPosition.x,
      y: this.smoothedFeetY + eyeHeight * CAMERA_PIVOT_EYE_HEIGHT_FACTOR,
      z: this.feetPosition.z
    };
    const resolvedCameraYawRadians =
      this.cameraYawRadians + this.targetLookOffsetYawRadians;
    const resolvedPitchRadians = clampPitch(
      this.pitchRadians + this.targetLookOffsetPitchRadians
    );
    const horizontalDistance =
      Math.cos(resolvedPitchRadians) * this.cameraDistance;
    const desiredCameraPosition = {
      x: pivot.x - Math.sin(resolvedCameraYawRadians) * horizontalDistance,
      y: pivot.y + Math.sin(resolvedPitchRadians) * this.cameraDistance,
      z: pivot.z - Math.cos(resolvedCameraYawRadians) * horizontalDistance
    };
    const rawResolvedCameraPosition =
      this.context.resolveThirdPersonCameraCollision(
        pivot,
        desiredCameraPosition,
        THIRD_PERSON_CAMERA_COLLISION_RADIUS
      );
    const resolvedCameraPosition = this.resolveSmoothedCameraCollisionPosition(
      pivot,
      desiredCameraPosition,
      rawResolvedCameraPosition,
      dt
    );
    const resolvedCameraDistance = Math.hypot(
      resolvedCameraPosition.x - pivot.x,
      resolvedCameraPosition.y - pivot.y,
      resolvedCameraPosition.z - pivot.z
    );
    const collisionDistanceRatio =
      resolvedCameraDistance / Math.max(this.cameraDistance, Number.EPSILON);
    const targetAssistVerticalCollisionScale = smoothStep01(
      (collisionDistanceRatio -
        TARGET_ASSIST_VERTICAL_COLLISION_FADE_START_RATIO) /
        (TARGET_ASSIST_VERTICAL_COLLISION_FADE_END_RATIO -
          TARGET_ASSIST_VERTICAL_COLLISION_FADE_START_RATIO)
    );

    this.context.camera.position.set(
      resolvedCameraPosition.x,
      resolvedCameraPosition.y,
      resolvedCameraPosition.z
    );
    this.lookAtVector.set(
      pivot.x,
      pivot.y +
        this.targetAssistLookOffsetY * targetAssistVerticalCollisionScale,
      pivot.z
    );
    this.context.camera.lookAt(this.lookAtVector);
  }

  private syncPointerLockState() {
    if (this.context === null) {
      return;
    }

    const wasPointerLocked = this.pointerLocked;
    const pointerLocked =
      document.pointerLockElement === this.context.domElement;

    if (wasPointerLocked && !pointerLocked) {
      this.pressedKeys.clear();
      this.jumpPressed = false;
      this.jumpHoldRemainingMs = 0;
      this.pointerLookInputPending = false;
    }

    this.pointerLocked = pointerLocked;
    this.dragging = false;
    this.context.setRuntimeMessage(
      pointerLocked
        ? "Third Person mouse look active. Scroll to zoom, use the right stick for gamepad camera look, and press Escape to release the cursor."
        : "Third Person active. Click inside the runner viewport to capture mouse look, or drag to orbit if pointer lock is unavailable. Scroll to zoom and use the right stick for gamepad camera look."
    );
    this.publishTelemetry();
  }

  private resolveHorizontalMouseLookSign() {
    return this.context?.getRuntimeScene().playerStart
      ?.invertMouseCameraHorizontal === true
      ? -1
      : 1;
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
      yawDegrees: (this.yawRadians * 180) / Math.PI,
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

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };

  private handleBlur = () => {
    this.pressedKeys.clear();
    this.dragging = false;
    this.pointerLookInputPending = false;
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (
      this.context === null ||
      this.context.isInputSuspended() ||
      this.context.isCameraDrivenExternally()
    ) {
      return;
    }

    if (document.pointerLockElement !== this.context.domElement) {
      this.suppressNextPointerLockError = false;
      const pointerLockCapableElement = this.context
        .domElement as HTMLCanvasElement & {
        requestPointerLock?: () => void | Promise<void>;
      };

      if (typeof pointerLockCapableElement.requestPointerLock === "function") {
        const pointerLockResult = pointerLockCapableElement.requestPointerLock();

        if (pointerLockResult instanceof Promise) {
          pointerLockResult.catch(() => {
            this.context?.setRuntimeMessage(
              "Pointer lock request was denied. Drag orbit remains available in Third Person."
            );
          });
        }
      }
    }

    if (
      event.button !== 0 ||
      this.pointerLocked
    ) {
      return;
    }

    this.dragging = true;
    this.lastPointerClientX = event.clientX;
    this.lastPointerClientY = event.clientY;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (
      this.pointerLocked ||
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

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    this.pointerLookInputPending = true;
    const horizontalMovement = deltaX * this.resolveHorizontalMouseLookSign();

    const targetLookResult =
      this.context?.handleRuntimeTargetLookInput?.({
        horizontal: horizontalMovement * POINTER_TARGET_LOOK_INPUT_SCALE,
        vertical: -deltaY * POINTER_TARGET_LOOK_INPUT_SCALE
      }) ?? null;

    if (targetLookResult?.activeTargetLocked === true) {
      if (
        targetLookResult.switchedTarget !== true &&
        targetLookResult.switchInputHeld !== true
      ) {
        this.applyTargetLookOffsetDelta(
          -horizontalMovement * TARGET_LOOK_OFFSET_POINTER_SENSITIVITY,
          deltaY * TARGET_LOOK_OFFSET_POINTER_SENSITIVITY
        );
      }
      return;
    }

    this.cameraYawRadians -= horizontalMovement * LOOK_SENSITIVITY;
    this.pitchRadians = clampPitch(
      this.pitchRadians + deltaY * LOOK_SENSITIVITY
    );
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (
      !this.pointerLocked ||
      this.context?.isInputSuspended() === true ||
      this.context?.isCameraDrivenExternally() === true
    ) {
      return;
    }

    const horizontalMovement =
      event.movementX * this.resolveHorizontalMouseLookSign();

    if (horizontalMovement === 0 && event.movementY === 0) {
      return;
    }

    this.pointerLookInputPending = true;

    const targetLookResult =
      this.context?.handleRuntimeTargetLookInput?.({
        horizontal: horizontalMovement * POINTER_TARGET_LOOK_INPUT_SCALE,
        vertical: -event.movementY * POINTER_TARGET_LOOK_INPUT_SCALE
      }) ?? null;

    if (targetLookResult?.activeTargetLocked === true) {
      if (
        targetLookResult.switchedTarget !== true &&
        targetLookResult.switchInputHeld !== true
      ) {
        this.applyTargetLookOffsetDelta(
          -horizontalMovement * TARGET_LOOK_OFFSET_POINTER_SENSITIVITY,
          event.movementY * TARGET_LOOK_OFFSET_POINTER_SENSITIVITY
        );
      }
      return;
    }

    this.cameraYawRadians -= horizontalMovement * LOOK_SENSITIVITY;
    this.pitchRadians = clampPitch(
      this.pitchRadians + event.movementY * LOOK_SENSITIVITY
    );
  };

  private handlePointerUp = () => {
    this.dragging = false;
    this.context?.handleRuntimeTargetLookInput?.({
      horizontal: 0,
      vertical: 0
    });
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
      "Pointer lock was unavailable in this browser context. Drag orbit remains available in Third Person."
    );
  };
}
