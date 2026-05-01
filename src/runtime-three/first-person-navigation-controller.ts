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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
    this.ledgeGrabTarget = null;
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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
    this.ledgeGrabTarget = null;
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
      this.yawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians + lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
      );
    }

    if (
      this.stepLedgeGrab(dt, inputState, playerMovement, this.yawRadians)
    ) {
      return;
    }

    if (
      this.stepClimbing(dt, inputState, playerMovement, this.yawRadians)
    ) {
      return;
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

    const previousFeetPosition = this.feetPosition;
    const edgeInputDirection = resolveClimbPlanarInputDirection(
      inputState,
      this.yawRadians
    );
    const shouldTryEdgeAssist =
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
      });
    const edgeAssist =
      shouldTryEdgeAssist && edgeInputDirection.direction !== null
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

    if (
      edgeAssist === null &&
      shouldTryEdgeAssist &&
      edgeInputDirection.direction !== null
    ) {
      const ledgeGrabTarget = resolvePlayerLedgeGrabTarget({
        feetPosition: locomotionStep.feetPosition,
        shape: locomotionStep.activeShape,
        direction: edgeInputDirection.direction,
        pushToTopHeight: playerMovement.edgeAssist.pushToTopHeight,
        canOccupyShape: (feetPosition, shape) =>
          this.context?.canOccupyPlayerShape?.(feetPosition, shape) ?? true,
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
      });

      if (ledgeGrabTarget !== null) {
        this.enterLedgeGrab(ledgeGrabTarget, edgeInputDirection.inputMagnitude);
        this.updateCameraTransform();
        this.publishTelemetry();
        return;
      }
    }

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
    this.climbSurface = null;
    this.climbLatchBlocked = false;
    this.ledgeGrabTarget = null;
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.updateCameraTransform();
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
        this.updateCameraTransform();
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

    this.updateCameraTransform();
    this.publishTelemetry();
    return true;
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
    }

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
    const context = this.context;

    if (
      !this.pointerLocked ||
      context === null ||
      context.isInputSuspended() === true ||
      context.isCameraDrivenExternally() === true
    ) {
      return;
    }

    const horizontalMouseLookSign =
      context.getRuntimeScene().playerStart?.invertMouseCameraHorizontal === true
        ? -1
        : 1;
    const horizontalMovement = event.movementX * horizontalMouseLookSign;

    const targetLookResult =
      context.handleRuntimeTargetLookInput?.({
        horizontal: horizontalMovement,
        vertical: -event.movementY
      }) ?? null;

    if (targetLookResult?.activeTargetLocked === true) {
      return;
    }

    this.yawRadians -= horizontalMovement * LOOK_SENSITIVITY;
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
