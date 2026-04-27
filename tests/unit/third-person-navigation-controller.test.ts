import { PerspectiveCamera, Vector3 } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Vec3 } from "../../src/core/vector";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import type {
  FirstPersonPlayerShape,
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "../../src/runtime-three/player-collision";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { ThirdPersonNavigationController } from "../../src/runtime-three/third-person-navigation-controller";

function createMockGamepad(options: {
  axes?: number[];
} = {}): Gamepad {
  return {
    connected: true,
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0
    })),
    id: "mock-standard-gamepad",
    index: 0,
    mapping: "standard",
    timestamp: 0,
    vibrationActuator: null,
    hapticActuators: []
  } as unknown as Gamepad;
}

function createRuntimeControllerContext(
  playerStart = createPlayerStartEntity({
    id: "entity-player-start-main",
    inputBindings: {
      keyboard: {
        moveForward: "ArrowUp",
        moveBackward: "ArrowDown",
        moveLeft: "ArrowLeft",
        moveRight: "ArrowRight"
      }
    }
  })
) {
  const runtimeScene = buildRuntimeSceneFromDocument(
    {
      ...createEmptySceneDocument({ name: "Third Person Binding Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    },
    {
      navigationMode: "thirdPerson"
    }
  );
  const domElement = document.createElement("canvas");
  const createVolumeState = () => ({
    inWater: false,
    inFog: false,
    waterSurfaceHeight: null
  });

  return {
    context: {
      camera: new PerspectiveCamera(70, 1, 0.05, 1000),
      domElement,
      getRuntimeScene: () => runtimeScene,
      resolveFirstPersonMotion: (
        feetPosition: Vec3,
        motion: Vec3,
        _shape: FirstPersonPlayerShape
      ): ResolvedPlayerMotion => ({
        feetPosition: {
          x: feetPosition.x + motion.x,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: false,
        collisionCount: 0,
        groundCollisionNormal: null,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      }),
      probePlayerGround: (): PlayerGroundProbeResult => ({
        grounded: false,
        distance: null,
        normal: null,
        slopeDegrees: null
      }),
      canOccupyPlayerShape: () => true,
      resolvePlayerVolumeState: () => createVolumeState(),
      resolveThirdPersonCameraCollision: (
        _pivot: Vec3,
        desiredCameraPosition: Vec3
      ) => ({
        ...desiredCameraPosition
      }),
      isCameraDrivenExternally: () => false,
      getCameraYawRadians: () => 0,
      isInputSuspended: () => false,
      setRuntimeMessage: vi.fn(),
      setPlayerControllerTelemetry: vi.fn()
    }
  };
}

describe("ThirdPersonNavigationController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: undefined
    });
  });

  it("uses authored keyboard bindings instead of hardcoded WASD movement", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();

    controller.activate(context);

    const initialCameraZ = context.camera.position.z;

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    controller.update(1);

    expect(context.camera.position.z).toBe(initialCameraZ);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    controller.update(1);

    expect(context.camera.position.z).toBeGreaterThan(initialCameraZ);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    controller.deactivate(context);
  });

  it("uses the gamepad right stick for third-person camera orbit", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const getGamepads = vi.fn<() => Gamepad[]>(() => [
      createMockGamepad({
        axes: [0, 0, 1, 0]
      })
    ]);

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: getGamepads
    });

    controller.activate(context);

    const initialCameraX = context.camera.position.x;
    const initialCameraZ = context.camera.position.z;

    controller.update(1);

    expect(
      context.camera.position.x !== initialCameraX ||
        context.camera.position.z !== initialCameraZ
    ).toBe(true);

    controller.deactivate(context);
  });

  it("captures pointer-locked third-person mouse look and honors horizontal inversion", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-invert-third-person",
      invertMouseCameraHorizontal: true
    });
    const { context, domElement } = createRuntimeControllerContext(playerStart);
    const controller = new ThirdPersonNavigationController();
    const mouseMoveEvent = new MouseEvent("mousemove");

    Object.defineProperty(mouseMoveEvent, "movementX", {
      configurable: true,
      value: 24
    });
    Object.defineProperty(mouseMoveEvent, "movementY", {
      configurable: true,
      value: 0
    });
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => domElement
    });

    controller.activate(context);
    document.dispatchEvent(mouseMoveEvent);
    controller.update(0);

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(telemetry?.pointerLocked).toBe(true);
    expect(context.camera.position.x).toBeLessThan(0);

    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("smooths the third-person camera back out when collision clears", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    let collisionScale = 0.25;
    let latestPivot: Vec3 | null = null;
    let latestDesiredCameraPosition: Vec3 | null = null;
    const distanceBetween = (left: Vec3, right: Vec3) =>
      Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);

    context.resolveThirdPersonCameraCollision = vi.fn(
      (pivot: Vec3, desiredCameraPosition: Vec3) => {
        latestPivot = { ...pivot };
        latestDesiredCameraPosition = { ...desiredCameraPosition };

        return {
          x: pivot.x + (desiredCameraPosition.x - pivot.x) * collisionScale,
          y: pivot.y + (desiredCameraPosition.y - pivot.y) * collisionScale,
          z: pivot.z + (desiredCameraPosition.z - pivot.z) * collisionScale
        };
      }
    );

    controller.activate(context);

    const blockedDistance = distanceBetween(
      {
        x: context.camera.position.x,
        y: context.camera.position.y,
        z: context.camera.position.z
      },
      latestPivot ?? { x: 0, y: 0, z: 0 }
    );

    collisionScale = 1;
    controller.update(0.1);

    const recoveringDistance = distanceBetween(
      {
        x: context.camera.position.x,
        y: context.camera.position.y,
        z: context.camera.position.z
      },
      latestPivot ?? { x: 0, y: 0, z: 0 }
    );
    const desiredDistance = distanceBetween(
      latestDesiredCameraPosition ?? { x: 0, y: 0, z: 0 },
      latestPivot ?? { x: 0, y: 0, z: 0 }
    );

    expect(recoveringDistance).toBeGreaterThan(blockedDistance);
    expect(recoveringDistance).toBeLessThan(desiredDistance);

    controller.update(1);

    const finalDistance = distanceBetween(
      {
        x: context.camera.position.x,
        y: context.camera.position.y,
        z: context.camera.position.z
      },
      latestPivot ?? { x: 0, y: 0, z: 0 }
    );
    const finalDesiredDistance = distanceBetween(
      latestDesiredCameraPosition ?? { x: 0, y: 0, z: 0 },
      latestPivot ?? { x: 0, y: 0, z: 0 }
    );

    expect(finalDistance).toBeCloseTo(finalDesiredDistance);
    controller.deactivate(context);
  });

  it("allows the third-person camera to pitch low enough for floor collision to pull it inward", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const controllerInternals = controller as unknown as {
      pitchRadians: number;
    };
    const floorHeight = 0.2;
    let latestPivot: Vec3 | null = null;
    let latestDesiredCameraPosition: Vec3 | null = null;
    const distanceBetween = (left: Vec3, right: Vec3) =>
      Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);

    context.resolveThirdPersonCameraCollision = vi.fn(
      (pivot: Vec3, desiredCameraPosition: Vec3) => {
        latestPivot = { ...pivot };
        latestDesiredCameraPosition = { ...desiredCameraPosition };

        if (desiredCameraPosition.y >= floorHeight) {
          return { ...desiredCameraPosition };
        }

        const t =
          (pivot.y - floorHeight) /
          Math.max(pivot.y - desiredCameraPosition.y, 1e-6);

        return {
          x: pivot.x + (desiredCameraPosition.x - pivot.x) * t,
          y: floorHeight,
          z: pivot.z + (desiredCameraPosition.z - pivot.z) * t
        };
      }
    );

    controller.activate(context);
    controllerInternals.pitchRadians = -1.2;
    controller.update(0);

    expect(latestDesiredCameraPosition).not.toBeNull();
    const desiredCameraPosition =
      latestDesiredCameraPosition ?? { x: 0, y: 0, z: 0 };

    expect(desiredCameraPosition.y).toBeLessThan(floorHeight);
    expect(context.camera.position.y).toBeCloseTo(floorHeight);
    expect(
      distanceBetween(
        {
          x: context.camera.position.x,
          y: context.camera.position.y,
          z: context.camera.position.z
        },
        latestPivot ?? { x: 0, y: 0, z: 0 }
      )
    ).toBeLessThan(
      distanceBetween(
        desiredCameraPosition,
        latestPivot ?? { x: 0, y: 0, z: 0 }
      )
    );

    controller.deactivate(context);
  });

  it("uses lock-on look input as a temporary offset that returns to center", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    let axes = [0, 0, 1, 0];
    const getGamepads = vi.fn<() => Gamepad[]>(() => [
      createMockGamepad({
        axes
      })
    ]);
    const handleRuntimeTargetLookInput = vi.fn(() => ({
      activeTargetLocked: true,
      switchedTarget: false,
      switchInputHeld: false
    }));
    const targetContext = {
      ...context,
      handleRuntimeTargetLookInput
    };

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: getGamepads
    });

    controller.activate(targetContext);

    const initialCameraX = targetContext.camera.position.x;
    controller.update(0.1);
    const offsetCameraX = targetContext.camera.position.x;

    axes = [0, 0, 0, 0];
    controller.update(0.5);
    const returnedCameraX = targetContext.camera.position.x;

    expect(offsetCameraX).not.toBeCloseTo(initialCameraX);
    expect(Math.abs(returnedCameraX - initialCameraX)).toBeLessThan(
      Math.abs(offsetCameraX - initialCameraX)
    );
    expect(handleRuntimeTargetLookInput).toHaveBeenCalledWith({
      horizontal: expect.any(Number),
      vertical: 0
    });

    controller.deactivate(targetContext);
  });

  it("requests target clear without snapping back when lock-on manual look reaches its boundary", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const controllerInternals = controller as unknown as {
      cameraYawRadians: number;
      targetLookOffsetYawRadians: number;
    };
    const getGamepads = vi.fn<() => Gamepad[]>(() => [
      createMockGamepad({
        axes: [0, 0, 1, 0]
      })
    ]);
    const handleRuntimeTargetLookBoundaryReached = vi.fn(() => false);
    const targetContext = {
      ...context,
      handleRuntimeTargetLookInput: vi.fn(() => ({
        activeTargetLocked: true,
        switchedTarget: false,
        switchInputHeld: false
      })),
      handleRuntimeTargetLookBoundaryReached
    };

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: getGamepads
    });

    controller.activate(targetContext);
    controller.update(1);

    expect(handleRuntimeTargetLookBoundaryReached).toHaveBeenCalledTimes(1);
    expect(controllerInternals.cameraYawRadians).toBeLessThan(-0.7);
    expect(controllerInternals.targetLookOffsetYawRadians).toBe(0);

    controller.deactivate(targetContext);
  });

  it("uses third-person target assist to adjust vertical camera aim", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const targetContext = {
      ...context,
      resolveThirdPersonTargetAssist: () => ({
        targetPosition: {
          x: 0,
          y: 4,
          z: 5
        },
        strength: 1
      })
    };
    const cameraDirection = new Vector3();

    controller.activate(targetContext);
    targetContext.camera.getWorldDirection(cameraDirection);
    const initialForwardY = cameraDirection.y;

    controller.update(1);
    targetContext.camera.getWorldDirection(cameraDirection);

    expect(cameraDirection.y).toBeGreaterThan(initialForwardY);

    controller.deactivate(targetContext);
  });

  it("blends the previous high orbit pitch toward neutral when targeting starts", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    let targetAssistActive = false;
    const controllerInternals = controller as unknown as {
      pitchRadians: number;
    };
    const targetContext = {
      ...context,
      resolveThirdPersonTargetAssist: () =>
        targetAssistActive
          ? {
              targetPosition: {
                x: 0,
                y: 1,
                z: 5
              },
              strength: 1
            }
          : null
    };

    controller.activate(targetContext);
    const defaultCameraY = targetContext.camera.position.y;

    controllerInternals.pitchRadians = 1.2;
    controller.update(0);
    const highOrbitCameraY = targetContext.camera.position.y;

    targetAssistActive = true;
    controller.update(0.016);
    const firstTargetFrameCameraY = targetContext.camera.position.y;
    controller.update(1);

    expect(highOrbitCameraY).toBeGreaterThan(defaultCameraY + 2);
    expect(firstTargetFrameCameraY).toBeGreaterThan(defaultCameraY + 1);
    expect(firstTargetFrameCameraY).toBeLessThan(highOrbitCameraY);
    expect(controllerInternals.pitchRadians).toBeCloseTo(0.35, 2);

    controller.deactivate(targetContext);
  });

  it("pauses third-person target assist while the camera is actively moved with pointer drag", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const controllerInternals = controller as unknown as {
      cameraYawRadians: number;
      pitchRadians: number;
      targetAssistLookOffsetY: number;
      handlePointerDown(event: PointerEvent): void;
      handlePointerMove(event: PointerEvent): void;
      handlePointerUp(): void;
    };
    const targetContext = {
      ...context,
      resolveThirdPersonTargetAssist: () => ({
        targetPosition: {
          x: 0,
          y: 4,
          z: 5
        },
        strength: 1
      }),
      handleRuntimeTargetLookInput: vi.fn(() => ({
        activeTargetLocked: true,
        switchedTarget: false,
        switchInputHeld: false
      }))
    };

    controller.activate(targetContext);
    controllerInternals.cameraYawRadians = 1.1;
    controllerInternals.pitchRadians = 1.1;
    controllerInternals.targetAssistLookOffsetY = 0;

    controllerInternals.handlePointerDown({
      button: 0,
      clientX: 0,
      clientY: 0
    } as PointerEvent);
    controllerInternals.handlePointerMove({
      clientX: 30,
      clientY: 12
    } as PointerEvent);

    controller.update(0.016);

    expect(controllerInternals.cameraYawRadians).toBeCloseTo(1.1, 5);
    expect(controllerInternals.pitchRadians).toBeCloseTo(1.1, 5);
    expect(controllerInternals.targetAssistLookOffsetY).toBeCloseTo(0, 5);

    controllerInternals.handlePointerUp();
    controller.deactivate(targetContext);
  });

  it("fades vertical target assist when camera collision pushes the camera close", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new ThirdPersonNavigationController();
    const targetContext = {
      ...context,
      resolveThirdPersonCameraCollision: (
        pivot: Vec3,
        desiredCameraPosition: Vec3
      ) => ({
        x: pivot.x + (desiredCameraPosition.x - pivot.x) * 0.12,
        y: pivot.y + (desiredCameraPosition.y - pivot.y) * 0.12,
        z: pivot.z + (desiredCameraPosition.z - pivot.z) * 0.12
      }),
      resolveThirdPersonTargetAssist: () => ({
        targetPosition: {
          x: 0,
          y: 5,
          z: 5
        },
        strength: 1
      })
    };
    const cameraDirection = new Vector3();

    controller.activate(targetContext);
    controller.update(1);
    targetContext.camera.getWorldDirection(cameraDirection);

    expect(cameraDirection.y).toBeLessThan(0.15);

    controller.deactivate(targetContext);
  });


  it("uses the authored movement template speed for third-person motion telemetry", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-custom-third-person-movement",
      inputBindings: {
        keyboard: {
          moveForward: "ArrowUp",
          moveBackward: "ArrowDown",
          moveLeft: "ArrowLeft",
          moveRight: "ArrowRight"
        }
      },
      movementTemplate: {
        moveSpeed: 2.25
      }
    });
    const { context } = createRuntimeControllerContext(playerStart);
    const controller = new ThirdPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    controller.update(1);

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(
      Math.hypot(
        telemetry?.feetPosition.x ?? 0,
        telemetry?.feetPosition.z ?? 0
      )
    ).toBeCloseTo(2.25);
    expect(telemetry?.movement).toMatchObject({
      templateKind: "default",
      moveSpeed: 2.25,
      capabilities: {
        jump: true,
        sprint: true,
        crouch: true
      }
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    controller.deactivate(context);
  });

  it("uses sprint input to raise gait and planar travel speed when grounded", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-third-person-sprint",
      inputBindings: {
        keyboard: {
          moveForward: "ArrowUp",
          moveBackward: "ArrowDown",
          moveLeft: "ArrowLeft",
          moveRight: "ArrowRight",
          sprint: "ShiftLeft"
        }
      }
    });
    const { context } = createRuntimeControllerContext(playerStart);
    context.probePlayerGround = vi.fn(() => ({
      grounded: true,
      distance: 0,
      normal: { x: 0, y: 1, z: 0 },
      slopeDegrees: 0
    }));
    context.resolveFirstPersonMotion = (
      feetPosition: Vec3,
      motion: Vec3,
      _shape: FirstPersonPlayerShape
    ) => ({
      feetPosition: {
        x: feetPosition.x + motion.x,
        y: feetPosition.y,
        z: feetPosition.z + motion.z
      },
      grounded: true,
      collisionCount: 1,
      groundCollisionNormal: { x: 0, y: 1, z: 0 },
      collidedAxes: {
        x: false,
        y: true,
        z: false
      }
    });
    const controller = new ThirdPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ShiftLeft" })
    );
    controller.update(1);

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(telemetry?.locomotionState.gait).toBe("sprint");
    expect(telemetry?.locomotionState.sprinting).toBe(true);
    expect(telemetry?.locomotionState.locomotionMode).toBe("grounded");
    expect(
      Math.hypot(
        telemetry?.feetPosition.x ?? 0,
        telemetry?.feetPosition.z ?? 0
      )
    ).toBeGreaterThan(7);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    window.dispatchEvent(
      new KeyboardEvent("keyup", { code: "ShiftLeft" })
    );
    controller.deactivate(context);
  });
});
