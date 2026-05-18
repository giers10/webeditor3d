import { describe, expect, it } from "vitest";

import { createDefaultProjectTimeSettings } from "../../src/document/project-time-settings";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  createViewportSimulationMembershipSignatures,
  resolveViewportWorldState
} from "../../src/viewport-three/viewport-host";
import type { RuntimeSceneDefinition } from "../../src/runtime-three/runtime-scene-build";

describe("createViewportSimulationMembershipSignatures", () => {
  it("tracks structural simulation membership without including per-frame values", () => {
    const runtimeScene = {
      localLights: {
        pointLights: [
          {
            entityId: "point-a",
            intensity: 1
          }
        ],
        spotLights: [
          {
            entityId: "spot-a",
            intensity: 2
          }
        ]
      },
      volumes: {
        light: [
          {
            brushId: "volume-a",
            lights: [{}, {}]
          }
        ]
      },
      modelInstances: [
        {
          instanceId: "model-a",
          visible: true
        }
      ],
      entities: {
        interactables: [
          {
            entityId: "interactable-a",
            interactionEnabled: true
          }
        ]
      }
    } as RuntimeSceneDefinition;

    const changedValuesScene = {
      ...runtimeScene,
      localLights: {
        pointLights: [
          {
            entityId: "point-a",
            intensity: 5
          }
        ],
        spotLights: [
          {
            entityId: "spot-a",
            intensity: 8
          }
        ]
      },
      modelInstances: [
        {
          instanceId: "model-a",
          visible: false
        }
      ],
      entities: {
        interactables: [
          {
            entityId: "interactable-a",
            interactionEnabled: false
          }
        ]
      }
    } as RuntimeSceneDefinition;

    const changedStructureScene = {
      ...runtimeScene,
      volumes: {
        light: [
          {
            brushId: "volume-a",
            lights: [{}]
          }
        ]
      }
    } as RuntimeSceneDefinition;

    expect(createViewportSimulationMembershipSignatures(changedValuesScene)).toEqual(
      createViewportSimulationMembershipSignatures(runtimeScene)
    );
    expect(
      createViewportSimulationMembershipSignatures(changedStructureScene)
    ).not.toEqual(createViewportSimulationMembershipSignatures(runtimeScene));
  });
});

describe("resolveViewportWorldState", () => {
  it("applies document project time when the runtime scene is unavailable", () => {
    const world = createDefaultWorldSettings();
    const time = createDefaultProjectTimeSettings();
    time.startTimeOfDayHours = 0;
    world.projectTimeLightingEnabled = true;
    world.ambientLight = {
      colorHex: "#ffffff",
      intensity: 1
    };
    world.timeOfDay.night.ambientColorHex = "#101820";
    world.timeOfDay.night.ambientIntensityFactor = 0.25;

    const state = resolveViewportWorldState({
      currentWorld: world,
      currentDocument: { time },
      currentSimulationScene: null,
      currentSimulationClock: {
        timeOfDayHours: 0,
        dayCount: 0,
        dayLengthMinutes: time.dayLengthMinutes
      }
    });

    expect(state.resolvedTime?.dayPhase).toBe("night");
    expect(state.resolvedWorld?.ambientLight).toEqual({
      colorHex: "#101820",
      intensity: 0.25
    });
  });

  it("prefers runtime scene time settings when a runtime scene is available", () => {
    const documentWorld = createDefaultWorldSettings();
    const runtimeWorld = createDefaultWorldSettings();
    const documentTime = createDefaultProjectTimeSettings();
    const runtimeTime = createDefaultProjectTimeSettings();
    documentTime.sunriseTimeOfDayHours = 6;
    documentTime.sunsetTimeOfDayHours = 18;
    runtimeTime.sunriseTimeOfDayHours = 10;
    runtimeTime.sunsetTimeOfDayHours = 20;

    const state = resolveViewportWorldState({
      currentWorld: documentWorld,
      currentDocument: { time: documentTime },
      currentSimulationScene: {
        time: runtimeTime,
        world: runtimeWorld
      },
      currentSimulationClock: {
        timeOfDayHours: 9,
        dayCount: 0,
        dayLengthMinutes: runtimeTime.dayLengthMinutes
      }
    });

    expect(state.world).toBe(runtimeWorld);
    expect(state.timeSettings).toBe(runtimeTime);
    expect(state.resolvedTime?.dayPhase).toBe("night");
  });
});
