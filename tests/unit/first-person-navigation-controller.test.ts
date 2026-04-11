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
  ) => ResolvedPlayerMotion | null = () => null,
  options: {
    probePlayerGround?: (
      feetPosition: Vec3,
      shape: FirstPersonPlayerShape,
      maxDistance: number
    ) => PlayerGroundProbeResult;
    canOccupyPlayerShape?: (
      feetPosition: Vec3,
      shape: FirstPersonPlayerShape
    ) => boolean;
  } = {}
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
  const createVolumeState = () => ({
    inWater: false,
    inFog: false,
    waterSurfaceHeight: null
  });

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
      probePlayerGround: (
        feetPosition: Vec3,
        shape: FirstPersonPlayerShape,
        maxDistance: number
      ) =>
        options.probePlayerGround?.(feetPosition, shape, maxDistance) ?? {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        },
      canOccupyPlayerShape: (
        feetPosition: Vec3,
        shape: FirstPersonPlayerShape
      ) => options.canOccupyPlayerShape?.(feetPosition, shape) ?? true,
      resolvePlayerVolumeState: () => createVolumeState(),
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
        collisionCount: 0,
        groundCollisionNormal: null,
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
        collisionCount: 1,
        groundCollisionNormal: { x: 0, y: 1, z: 0 },
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

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

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

  it("keeps jump ascent alive when the ground probe still sees nearby floor", () => {
    const probePlayerGround = vi.fn(
      (
        feetPosition: Vec3,
        _shape: FirstPersonPlayerShape,
        _maxDistance: number
      ): PlayerGroundProbeResult => {
        if (feetPosition.y <= 0.13) {
          return {
            grounded: true,
            distance: feetPosition.y,
            normal: { x: 0, y: 1, z: 0 },
            slopeDegrees: 0
          };
        }

        return {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        };
      }
    );

    const { context } = createRuntimeControllerContext(
      createPlayerStartEntity({
        id: "entity-player-start-jump"
      }),
      (feetPosition, motion) => ({
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
      {
        probePlayerGround
      }
    );
    const controller = new FirstPersonNavigationController();

    controller.activate(context);
    controller.update(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    controller.update(1 / 60);

    const jumpTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    controller.update(1 / 60);

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(jumpTelemetry?.grounded).toBe(false);
    expect(jumpTelemetry?.locomotionState.locomotionMode).toBe("airborne");
    expect(jumpTelemetry?.locomotionState.airborneKind).toBe("jumping");
    expect(jumpTelemetry?.signals.jumpStarted).toBe(true);
    expect(jumpTelemetry?.signals.leftGround).toBe(true);

    expect(telemetry?.grounded).toBe(false);
    expect(telemetry?.locomotionState.locomotionMode).toBe("airborne");
    expect(telemetry?.locomotionState.airborneKind).toBe("jumping");
    expect(telemetry?.locomotionState.verticalVelocity).toBeGreaterThan(0);
    expect(telemetry?.feetPosition.y ?? 0).toBeGreaterThan(
      jumpTelemetry?.feetPosition.y ?? 0
    );
    expect(telemetry?.signals.jumpStarted).toBe(false);
    expect(telemetry?.signals.leftGround).toBe(false);
    expect(telemetry?.hooks.camera.jumping).toBe(true);
    expect(telemetry?.hooks.animation.airborneKind).toBe("jumping");
    expect(probePlayerGround).toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("preserves takeoff sprint speed while airborne", () => {
    const probePlayerGround = vi.fn(
      (
        feetPosition: Vec3,
        _shape: FirstPersonPlayerShape,
        _maxDistance: number
      ): PlayerGroundProbeResult => {
        if (feetPosition.y <= 0.13) {
          return {
            grounded: true,
            distance: feetPosition.y,
            normal: { x: 0, y: 1, z: 0 },
            slopeDegrees: 0
          };
        }

        return {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        };
      }
    );

    const { context } = createRuntimeControllerContext(
      createPlayerStartEntity({
        id: "entity-player-start-sprint-jump"
      }),
      (feetPosition, motion) => ({
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
      {
        probePlayerGround
      }
    );
    const controller = new FirstPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ShiftLeft" })
    );
    controller.update(1 / 60);

    const groundedTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    controller.update(1 / 60);

    const jumpTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    controller.update(1 / 60);

    const airborneTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(groundedTelemetry?.locomotionState.planarSpeed).toBeGreaterThan(7);
    expect(groundedTelemetry?.locomotionState.sprinting).toBe(true);

    expect(jumpTelemetry?.locomotionState.locomotionMode).toBe("airborne");
    expect(jumpTelemetry?.locomotionState.requestedPlanarSpeed).toBeGreaterThan(
      7
    );
    expect(jumpTelemetry?.locomotionState.planarSpeed).toBeGreaterThan(7);
    expect(jumpTelemetry?.locomotionState.sprinting).toBe(true);

    expect(airborneTelemetry?.locomotionState.locomotionMode).toBe(
      "airborne"
    );
    expect(
      airborneTelemetry?.locomotionState.requestedPlanarSpeed
    ).toBeGreaterThan(7);
    expect(airborneTelemetry?.locomotionState.planarSpeed).toBeGreaterThan(7);
    expect(airborneTelemetry?.locomotionState.sprinting).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    window.dispatchEvent(
      new KeyboardEvent("keyup", { code: "ShiftLeft" })
    );
    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("does not keep crouch speed penalty while airborne", () => {
    const probePlayerGround = vi.fn(
      (
        feetPosition: Vec3,
        _shape: FirstPersonPlayerShape,
        _maxDistance: number
      ): PlayerGroundProbeResult => {
        if (feetPosition.y <= 0.13) {
          return {
            grounded: true,
            distance: feetPosition.y,
            normal: { x: 0, y: 1, z: 0 },
            slopeDegrees: 0
          };
        }

        return {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        };
      }
    );

    const { context } = createRuntimeControllerContext(
      createPlayerStartEntity({
        id: "entity-player-start-crouch-jump"
      }),
      (feetPosition, motion) => ({
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
      {
        probePlayerGround,
        canOccupyPlayerShape: () => true
      }
    );
    const controller = new FirstPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ControlLeft" })
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    controller.update(1 / 60);

    const crouchedGroundedTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    controller.update(1 / 60);
    controller.update(1 / 60);

    const airborneTelemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];
    const baseMoveSpeed = airborneTelemetry?.movement.moveSpeed ?? 4.5;

    expect(crouchedGroundedTelemetry?.locomotionState.crouched).toBe(true);
    expect(
      crouchedGroundedTelemetry?.locomotionState.requestedPlanarSpeed ??
        Number.POSITIVE_INFINITY
    ).toBeLessThan(baseMoveSpeed);

    expect(airborneTelemetry?.locomotionState.locomotionMode).toBe("airborne");
    expect(airborneTelemetry?.locomotionState.requestedPlanarSpeed).toBeCloseTo(
      baseMoveSpeed
    );
    expect(airborneTelemetry?.locomotionState.planarSpeed).toBeCloseTo(4.5);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    window.dispatchEvent(
      new KeyboardEvent("keyup", { code: "ControlLeft" })
    );
    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("lowers the eye height and locomotion gait when crouch is held", () => {
    const { context } = createRuntimeControllerContext(
      createPlayerStartEntity({
        id: "entity-player-start-crouch"
      }),
      (feetPosition, motion) => ({
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
      }),
      {
        probePlayerGround: () => ({
          grounded: true,
          distance: 0,
          normal: { x: 0, y: 1, z: 0 },
          slopeDegrees: 0
        }),
        canOccupyPlayerShape: () => true
      }
    );
    const controller = new FirstPersonNavigationController();

    controller.activate(context);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ControlLeft" })
    );
    controller.update(0.1);

    const telemetry =
      context.setPlayerControllerTelemetry.mock.calls.at(-1)?.[0];

    expect(telemetry?.locomotionState.gait).toBe("crouch");
    expect(telemetry?.locomotionState.crouched).toBe(true);
    expect(telemetry?.eyePosition.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
      1.6
    );

    window.dispatchEvent(
      new KeyboardEvent("keyup", { code: "ControlLeft" })
    );
    controller.deactivate(context, {
      releasePointerLock: false
    });
  });
});
