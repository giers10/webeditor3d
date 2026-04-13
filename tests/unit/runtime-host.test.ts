import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createLightControlTargetRef,
  type ControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightIntensityControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPointLightEntity } from "../../src/entities/entity-instances";
import {
  createControlInteractionLink,
  type InteractionLink
} from "../../src/interactions/interaction-links";
import { RapierCollisionWorld } from "../../src/runtime-three/rapier-collision-world";
import {
  RuntimeHost,
  type RuntimeSceneLoadState
} from "../../src/runtime-three/runtime-host";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

function createDeferred<T>() {
  let resolve: ((value: T) => void) | null = null;
  let reject: ((error: unknown) => void) | null = null;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve(value: T) {
      resolve?.(value);
    },
    reject(error: unknown) {
      reject?.(error);
    }
  };
}

describe("RuntimeHost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delays controller activation until collision setup reports the scene as ready", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const collisionWorld = {
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld;
    const deferredCollisionWorld = createDeferred<RapierCollisionWorld>();
    vi.spyOn(RapierCollisionWorld, "create").mockReturnValue(
      deferredCollisionWorld.promise
    );

    const runtimeMessages: Array<string | null> = [];
    const sceneLoadStates: RuntimeSceneLoadState[] = [];
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.setRuntimeMessageHandler((message) => {
      runtimeMessages.push(message);
    });
    host.setSceneLoadStateHandler((state) => {
      sceneLoadStates.push(state);
    });

    host.loadScene(runtimeScene);
    host.setNavigationMode("thirdPerson");

    expect(sceneLoadStates).toEqual([
      {
        status: "loading",
        message: null
      }
    ]);
    expect(runtimeMessages).toEqual([null]);

    deferredCollisionWorld.resolve(collisionWorld);

    await waitFor(() => {
      expect(sceneLoadStates).toContainEqual({
        status: "ready",
        message: null
      });
      expect(runtimeMessages).toContain(
        "Third Person active. Drag to orbit the camera, use the right stick for gamepad camera look, move with your authored bindings, and scroll to zoom."
      );
    });

    host.dispose();
    expect(collisionWorld.dispose).toHaveBeenCalledTimes(1);
  });

  it("applies typed light control effects through the runtime dispatcher", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      entities: {
        [pointLight.id]: pointLight
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const disableEffect = createSetLightEnabledControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      enabled: false
    });
    const intensityEffect = createSetLightIntensityControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      intensity: 3.5
    });
    const disableLink = createControlInteractionLink({
      id: "link-light-disable",
      sourceEntityId: "entity-trigger-main",
      effect: disableEffect
    });
    const intensityLink = createControlInteractionLink({
      id: "link-light-intensity",
      sourceEntityId: "entity-trigger-main",
      effect: intensityEffect
    });
    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(effect: ControlEffect, link: InteractionLink): void;
      };
      localLightObjects: Map<
        string,
        {
          group: { visible: boolean };
          light: { intensity: number };
        }
      >;
    };
    const dispatcher = hostInternals.createInteractionDispatcher();
    const renderObjects = hostInternals.localLightObjects.get(pointLight.id);

    expect(renderObjects).toBeDefined();
    expect(renderObjects?.group.visible).toBe(true);
    expect(renderObjects?.light.intensity).toBe(1.25);

    dispatcher.dispatchControlEffect(disableEffect, disableLink);
    dispatcher.dispatchControlEffect(intensityEffect, intensityLink);

    expect(renderObjects?.group.visible).toBe(false);
    expect(renderObjects?.light.intensity).toBe(3.5);
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightEnabled",
          value: false,
          source: {
            kind: "interactionLink",
            linkId: disableLink.id
          }
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "interactionLink",
            linkId: intensityLink.id
          }
        })
      ])
    );

    host.dispose();
  });
});
