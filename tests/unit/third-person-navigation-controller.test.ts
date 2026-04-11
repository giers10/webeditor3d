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
import { ThirdPersonNavigationController } from "../../src/runtime-three/third-person-navigation-controller";

function createRuntimeControllerContext() {
  const runtimeScene = buildRuntimeSceneFromDocument(
    {
      ...createEmptySceneDocument({ name: "Third Person Binding Scene" }),
      entities: {
        "entity-player-start-main": createPlayerStartEntity({
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
        collidedAxes: {
          x: false,
          y: false,
          z: false
        }
      }),
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
});