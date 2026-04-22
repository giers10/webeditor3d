import { PerspectiveCamera } from "three";
import { describe, expect, it, vi } from "vitest";

import type { Vec3 } from "../../src/core/vector";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import type {
  FirstPersonPlayerShape,
  PlayerGroundProbeResult,
  ResolvedPlayerMotion
} from "../../src/runtime-three/player-collision";
import { FirstPersonNavigationController } from "../../src/runtime-three/first-person-navigation-controller";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { ThirdPersonNavigationController } from "../../src/runtime-three/third-person-navigation-controller";

function createSuspendedContext(navigationMode: "firstPerson" | "thirdPerson") {
  const playerStart = createPlayerStartEntity({
    id: `entity-player-start-${navigationMode}`
  });
  const runtimeScene = buildRuntimeSceneFromDocument(
    {
      ...createEmptySceneDocument({ name: `Paused ${navigationMode} Scene` }),
      entities: {
        [playerStart.id]: playerStart
      }
    },
    {
      navigationMode
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
        inFog: false,
        waterSurfaceHeight: null
      }),
      resolveThirdPersonCameraCollision: (
        _pivot: Vec3,
        desiredCameraPosition: Vec3
      ) => ({ ...desiredCameraPosition }),
      isCameraDrivenExternally: () => false,
      getCameraYawRadians: () => 0,
      isInputSuspended: () => true,
      setRuntimeMessage: vi.fn(),
      setPlayerControllerTelemetry: vi.fn()
    }
  };
}

describe("paused navigation input", () => {
  it("ignores first-person mouse look while input is suspended", () => {
    const { context, domElement } = createSuspendedContext("firstPerson");
    const controller = new FirstPersonNavigationController();

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => domElement
    });

    controller.activate(context);
    const initialQuaternion = context.camera.quaternion.clone();

    (controller as unknown as {
      handleMouseMove(event: { movementX: number; movementY: number }): void;
    }).handleMouseMove({
      movementX: 48,
      movementY: 24
    });
    controller.update(0);

    expect(context.camera.quaternion.equals(initialQuaternion)).toBe(true);

    controller.deactivate(context, {
      releasePointerLock: false
    });
  });

  it("ignores third-person orbit and zoom while input is suspended", () => {
    const { context } = createSuspendedContext("thirdPerson");
    const controller = new ThirdPersonNavigationController();

    controller.activate(context);
    const initialPosition = context.camera.position.clone();

    (
      controller as unknown as {
        handlePointerDown(event: { button: number; clientX: number; clientY: number }): void;
        handlePointerMove(event: { clientX: number; clientY: number }): void;
        handleWheel(event: { preventDefault(): void; deltaY: number }): void;
      }
    ).handlePointerDown({
      button: 0,
      clientX: 100,
      clientY: 100
    });
    (
      controller as unknown as {
        handlePointerMove(event: { clientX: number; clientY: number }): void;
      }
    ).handlePointerMove({
      clientX: 180,
      clientY: 150
    });
    (
      controller as unknown as {
        handleWheel(event: { preventDefault(): void; deltaY: number }): void;
      }
    ).handleWheel({
      preventDefault() {},
      deltaY: -240
    });
    controller.update(0);

    expect(context.camera.position.equals(initialPosition)).toBe(true);

    controller.deactivate(context);
  });
});
