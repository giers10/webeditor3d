import { describe, expect, it } from "vitest";

import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import {
  createActiveSceneControlTargetRef,
  createInteractionControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createSetAmbientLightIntensityControlEffect,
  createSetInteractionEnabledControlEffect,
  createSetLightIntensityControlEffect,
  createSetModelInstanceVisibleControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createInteractableEntity,
  createPointLightEntity
} from "../../src/entities/entity-instances";
import { createRuntimeClockState } from "../../src/runtime-three/runtime-project-time";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { applyResolvedControlStateToRuntimeScene } from "../../src/runtime-three/runtime-scene-editor-simulation";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";

describe("runtime scene editor simulation", () => {
  it("applies resolved scheduler-controlled state onto runtime scene data for editor rendering", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-night-lamp",
      intensity: 1.25
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-market-stall",
      interactionEnabled: true
    });
    const modelAsset = {
      id: "asset-model-stall-awning",
      kind: "model" as const,
      sourceName: "stall-awning.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-stall-awning"),
      byteLength: 1024,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: [],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-stall-awning",
      assetId: modelAsset.id,
      visible: true
    });
    const lightTarget = createLightControlTargetRef("pointLight", pointLight.id);
    const interactionTarget = createInteractionControlTargetRef(
      "interactable",
      interactable.id
    );
    const modelTarget = createModelInstanceControlTargetRef(modelInstance.id);
    const sceneTarget = createActiveSceneControlTargetRef();
    const document = createEmptySceneDocument();
    document.time.startTimeOfDayHours = 21;
    document.entities[pointLight.id] = pointLight;
    document.entities[interactable.id] = interactable;
    document.assets[modelAsset.id] = modelAsset;
    document.modelInstances[modelInstance.id] = modelInstance;
    document.scheduler.routines["routine-night-light"] =
      createProjectScheduleRoutine({
        id: "routine-night-light",
        title: "Night Light",
        target: lightTarget,
        startHour: 18,
        endHour: 6,
        effect: createSetLightIntensityControlEffect({
          target: lightTarget,
          intensity: 3.5
        })
      });
    document.scheduler.routines["routine-close-stall"] =
      createProjectScheduleRoutine({
        id: "routine-close-stall",
        title: "Close Stall",
        target: interactionTarget,
        startHour: 18,
        endHour: 6,
        effect: createSetInteractionEnabledControlEffect({
          target: interactionTarget,
          enabled: false
        })
      });
    document.scheduler.routines["routine-hide-awning"] =
      createProjectScheduleRoutine({
        id: "routine-hide-awning",
        title: "Hide Awning",
        target: modelTarget,
        startHour: 18,
        endHour: 6,
        effect: createSetModelInstanceVisibleControlEffect({
          target: modelTarget,
          visible: false
        })
      });
    document.scheduler.routines["routine-night-ambient"] =
      createProjectScheduleRoutine({
        id: "routine-night-ambient",
        title: "Night Ambient",
        target: sceneTarget,
        startHour: 18,
        endHour: 6,
        effect: createSetAmbientLightIntensityControlEffect({
          target: sceneTarget,
          intensity: 0.2
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: createRuntimeClockState(document.time)
    });

    expect(runtimeScene.localLights.pointLights[0]?.intensity).toBe(1.25);
    expect(runtimeScene.entities.interactables[0]?.interactionEnabled).toBe(true);
    expect(runtimeScene.modelInstances[0]?.visible).toBe(true);
    expect(runtimeScene.world.ambientLight.intensity).toBe(
      document.world.ambientLight.intensity
    );

    expect(applyResolvedControlStateToRuntimeScene(runtimeScene)).toBe(
      runtimeScene
    );

    expect(runtimeScene.localLights.pointLights[0]?.intensity).toBe(3.5);
    expect(runtimeScene.entities.interactables[0]?.interactionEnabled).toBe(
      false
    );
    expect(runtimeScene.modelInstances[0]?.visible).toBe(false);
    expect(runtimeScene.world.ambientLight.intensity).toBe(0.2);
  });
});
