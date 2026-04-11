import { PerspectiveCamera } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Vec3 } from "../../src/core/vector";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import type {
  FirstPersonPlayerShape,
  ResolvedPlayerMotion
} from "../../src/runtime-three/player-collision";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { FirstPersonNavigationController } from "../../src/runtime-three/first-person-navigation-controller";

function createMockGamepad(options: {
  axes?: number[];
  pressedButtons?: number[];
} = {}): Gamepad {
  return {
    connected: true,
    axes: options.axes ?? [0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: options.pressedButtons?.includes(index) ?? false,
      touched: false,
      value: options.pressedButtons?.includes(index) ?? false ? 1 : 0
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
    id: "entity-player-start-main"
  }),
  resolveFirstPersonMotion: (
    feetPosition: Vec3,
    motion: Vec3
  ) => ResolvedPlayerMotion | null = () => null
) {
  const runtimeScene = buildRuntimeSceneFromDocument(
    {
      ...createEmptySceneDocument({ name: "Pointer Lock Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    },
    {
      navigationMode: "firstPerson"
    }
  );
  const domElement = document.createElement("canvas");

  return {
    domElement,
    context: {
      camera: new PerspectiveCamera(70, 1, 0.05, 1000),
      domElement,
      getRuntimeScene: () => runtimeScene,
      resolveFirstPersonMotion: (
        feetPosition: Vec3,
        motion: Vec3,
        _shape: FirstPersonPlayerShape
      ) => resolveFirstPersonMotion(feetPosition, motion),
      resolvePlayerVolumeState: () => ({
        inWater: false,
        inFog: false
      }),
      resolveThirdPersonCameraCollision: (
        _pivot: Vec3,
        desiredCameraPosition: Vec3
      ) => ({
        ...desiredCameraPosition
      }),
      setRuntimeMessage: vi.fn(),
      setFirstPersonTelemetry: vi.fn()
    }
  };
}

describe("FirstPersonNavigationController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can deactivate during a scene transition without releasing pointer lock", () => {
    const { context, domElement } = createRuntimeControllerContext();
    const controller = new FirstPersonNavigationController();
    const exitPointerLockSpy = vi.fn();

    Object.defineProperty(document, "exitPointerLock", {
      configurable: true,
      value: exitPointerLockSpy
    });

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => domElement
    });

    controller.activate(context);
    controller.deactivate(context, {
      releasePointerLock: false
    });

    expect(exitPointerLockSpy).not.toHaveBeenCalled();
  });

  it("still releases pointer lock for a normal deactivation", () => {
    const { context, domElement } = createRuntimeControllerContext();
    const controller = new FirstPersonNavigationController();
    const exitPointerLockSpy = vi.fn();

    Object.defineProperty(document, "exitPointerLock", {
      configurable: true,
      value: exitPointerLockSpy
    });

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => domElement
    });

    controller.activate(context);
    controller.deactivate(context);

    expect(exitPointerLockSpy).toHaveBeenCalledTimes(1);
  });

  it("uses authored gamepad bindings instead of the hardcoded stick mapping", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-custom-gamepad",
      inputBindings: {
        gamepad: {
          moveForward: "dpadUp",
          moveBackward: "dpadDown",
          moveLeft: "dpadLeft",
          moveRight: "dpadRight"
        }
      }
    });
    const { context } = createRuntimeControllerContext(
      playerStart,
      (feetPosition, motion) => ({
        feetPosition: {
          x: feetPosition.x + motion.x,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: false,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      })
    );
    const controller = new FirstPersonNavigationController();
    const getGamepads = vi.fn<() => Gamepad[]>(() => [
      createMockGamepad({
        axes: [0, -1]
      })
    ]);

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: getGamepads
    });

    controller.activate(context);
    controller.update(1);

    expect(context.camera.position.z).toBe(0);

    getGamepads.mockReturnValue([
      createMockGamepad({
        pressedButtons: [12]
      })
    ]);

    controller.update(1);

    expect(context.camera.position.z).toBeGreaterThan(0);

    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("uses the authored movement template speed for first-person motion telemetry", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-custom-movement",
      movementTemplate: {
        moveSpeed: 2.25
      }
    });
    const { context } = createRuntimeControllerContext(
      playerStart,
      (feetPosition, motion) => ({
        feetPosition: {
          x: feetPosition.x + motion.x,
          y: feetPosition.y + motion.y,
          z: feetPosition.z + motion.z
        },
        grounded: true,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      })
    );
    const controller = new FirstPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    controller.update(1);

    const telemetry = context.setFirstPersonTelemetry.mock.calls.at(-1)?.[0];

    expect(telemetry?.feetPosition.z).toBeCloseTo(2.25);
    expect(telemetry?.movement).toMatchObject({
      templateKind: "default",
      moveSpeed: 2.25,
      capabilities: {
        jump: true,
        sprint: true,
        crouch: true
      }
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("uses the gamepad right stick for camera look without requiring pointer lock", () => {
    const { context } = createRuntimeControllerContext();
    const controller = new FirstPersonNavigationController();
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

    const initialCameraYaw = context.camera.rotation.y;

    controller.update(1);

    expect(context.camera.rotation.y).not.toBe(initialCameraYaw);

    controller.deactivate(context, {
      releasePointerLock: false
    });
  });
});
