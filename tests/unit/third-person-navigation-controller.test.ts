import { PerspectiveCamera } from "three";
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
      setPlayerControllerTelemetry: vi.fn()
    }
  };
}

describe("ThirdPersonNavigationController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
