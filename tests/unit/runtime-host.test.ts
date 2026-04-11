import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
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
      dispose: vi.fn()
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
    host.setNavigationMode("orbitVisitor");

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
        "Orbit Visitor active. Drag to orbit around the scene and use the mouse wheel to zoom."
      );
    });

    host.dispose();
    expect(collisionWorld.dispose).toHaveBeenCalledTimes(1);
  });
});
