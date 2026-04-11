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
const CAMERA_COLLISION_RADIUS = 0.2;
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
    capabilities: {
      jump: movement.capabilities.jump,
      sprint: movement.capabilities.sprint,
      crouch: movement.capabilities.crouch
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

  activate(ctx: RuntimeControllerContext): void {
    this.context = ctx;

    if (!this.initializedFromSpawn) {
      const spawn = ctx.getRuntimeScene().spawn;
      this.feetPosition = {
        ...spawn.position
      };
      this.yawRadians = (spawn.yawDegrees * Math.PI) / 180;
      this.cameraYawRadians = this.yawRadians;
      this.pitchRadians = DEFAULT_PITCH_RADIANS;
      this.cameraDistance = DEFAULT_CAMERA_DISTANCE;
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
    this.cameraYawRadians = 0;
    this.pitchRadians = DEFAULT_PITCH_RADIANS;
    this.cameraDistance = DEFAULT_CAMERA_DISTANCE;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.locomotionState = "flying";
    this.inWaterVolume = false;
    this.inFogVolume = false;
    this.dragging = false;
    this.lastPointerClientX = 0;
    this.lastPointerClientY = 0;
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
      this.cameraYawRadians -= lookInput.horizontal * GAMEPAD_LOOK_SPEED * dt;
      this.pitchRadians = clampPitch(
        this.pitchRadians - lookInput.vertical * GAMEPAD_LOOK_SPEED * dt
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
    let nextYawRadians = this.yawRadians;

    if (inputLength > 0) {
      const normalizedInputX = inputX / inputLength;
      const normalizedInputZ = inputZ / inputLength;
      const moveDistance = playerMovement.moveSpeed * dt;

      this.forwardVector.set(
        Math.sin(this.cameraYawRadians),
        0,
        Math.cos(this.cameraYawRadians)
      );
      this.rightVector.set(
        -Math.cos(this.cameraYawRadians),
        0,
        Math.sin(this.cameraYawRadians)
      );

      horizontalX =
        (this.forwardVector.x * normalizedInputZ +
          this.rightVector.x * normalizedInputX) *
        moveDistance;
      horizontalZ =
        (this.forwardVector.z * normalizedInputZ +
          this.rightVector.z * normalizedInputX) *
        moveDistance;
      nextYawRadians = Math.atan2(horizontalX, horizontalZ);
    }

    if (playerShape.mode === "none" || currentVolumeState.inWater) {
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
    this.yawRadians = nextYawRadians;
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
    this.cameraYawRadians = this.yawRadians;
    this.pitchRadians = DEFAULT_PITCH_RADIANS;
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

    const eyeHeight = getFirstPersonPlayerEyeHeight(
      this.context.getRuntimeScene().playerCollider
    );
    const pivot = {
      x: this.feetPosition.x,
      y: this.feetPosition.y + eyeHeight * CAMERA_PIVOT_EYE_HEIGHT_FACTOR,
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
        CAMERA_COLLISION_RADIUS
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
      getFirstPersonPlayerEyeHeight(
        this.context.getRuntimeScene().playerCollider
      )
    );
    const cameraVolumeState = this.context.resolvePlayerVolumeState({
      x: this.context.camera.position.x,
      y: this.context.camera.position.y,
      z: this.context.camera.position.z
    });

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
      pointerLocked: false,
      spawn: this.context.getRuntimeScene().spawn
    });
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
    if (event.button !== 0) {
      return;
    }

    this.dragging = true;
    this.lastPointerClientX = event.clientX;
    this.lastPointerClientY = event.clientY;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.dragging) {
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
    event.preventDefault();
    this.cameraDistance = clampCameraDistance(
      this.cameraDistance + event.deltaY * 0.01
    );
  };

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
}
