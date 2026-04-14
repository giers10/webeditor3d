import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createActorControlTargetRef,
  createLightControlTargetRef,
  createSetActorPresenceControlEffect,
  type ControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightIntensityControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createNpcEntity,
  createPointLightEntity
} from "../../src/entities/entity-instances";
import {
  createControlInteractionLink,
  type InteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
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
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
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

  it("re-resolves NPC activity from the project scheduler when the runtime clock advances", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const npc = createNpcEntity({
      id: "entity-npc-night-guard",
      actorId: "actor-night-guard"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.scheduler.routines["routine-night-guard"] =
      createProjectScheduleRoutine({
        id: "routine-night-guard",
        title: "Night Shift",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 20,
        endHour: 4,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      runtimeScene: typeof runtimeScene | null;
      syncRuntimeNpcScheduleToCurrentClock(): void;
    };

    expect(runtimeScene.entities.npcs).toEqual([]);

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeNpcScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        actorId: npc.actorId,
        activeRoutineTitle: "Night Shift"
      })
    ]);

    hostInternals.currentClockState = {
      timeOfDayHours: 6,
      dayCount: 1,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeNpcScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([]);
    expect(hostInternals.runtimeScene?.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        active: false,
        activeRoutineTitle: null
      })
    );

    host.dispose();
  });
});
