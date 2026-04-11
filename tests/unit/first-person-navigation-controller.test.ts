import { PerspectiveCamera } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { FirstPersonNavigationController } from "../../src/runtime-three/first-person-navigation-controller";

function createRuntimeControllerContext() {
  const runtimeScene = buildRuntimeSceneFromDocument(
    {
      ...createEmptySceneDocument({ name: "Pointer Lock Scene" }),
      entities: {
        "entity-player-start-main": createPlayerStartEntity({
          id: "entity-player-start-main"
        })
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
      resolveFirstPersonMotion: () => null,
      resolvePlayerVolumeState: () => ({
        inWater: false,
        inFog: false
      }),
      resolveThirdPersonCameraCollision: (_pivot, desiredCameraPosition) => ({
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
});
