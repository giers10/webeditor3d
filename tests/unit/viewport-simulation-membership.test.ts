import { describe, expect, it } from "vitest";

import {
  createViewportSimulationMembershipSignatures
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
