import { describe, expect, it, vi } from "vitest";

import { createActorControlTargetRef } from "../../src/controls/control-surface";
import {
  createEmptyProjectDocument,
  createEmptyProjectScene,
  createEmptySceneDocument,
  createSceneDocumentFromProject
} from "../../src/document/scene-document";
import { createNpcEntity } from "../../src/entities/entity-instances";
import {
  EditorSimulationController,
  type EditorSimulationUiSnapshot
} from "../../src/runtime-three/editor-simulation-controller";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import {
  createEmptyProjectScheduler,
  createProjectScheduleRoutine
} from "../../src/scheduler/project-scheduler";

function createManualFrameController(options: {
  uiSnapshotIntervalSeconds?: number;
  onBuild?: () => void;
} = {}) {
  return new EditorSimulationController({
    uiSnapshotIntervalSeconds: options.uiSnapshotIntervalSeconds,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => undefined,
    buildRuntimeScene: (document, buildOptions) => {
      options.onBuild?.();
      return buildRuntimeSceneFromDocument(document, buildOptions);
    }
  });
}

describe("EditorSimulationController", () => {
  it("advances the editor clock only while playing", () => {
    const document = createEmptySceneDocument();
    document.time.dayLengthMinutes = 24;
    document.time.startTimeOfDayHours = 6;
    const controller = createManualFrameController();
    controller.updateInputs({
      document,
      loadedModelAssets: {}
    });

    const initialClock = controller.getUiSnapshot().clock;
    expect(initialClock?.timeOfDayHours).toBe(6);

    controller.play();
    controller.advance(60);

    const playingClock = controller.getUiSnapshot().clock;
    expect(playingClock?.timeOfDayHours).toBeGreaterThan(6);

    controller.pause();
    controller.advance(60);

    expect(controller.getUiSnapshot().clock).toEqual(playingClock);
  });

  it("publishes coarse UI snapshots at a bounded tick rate", () => {
    const document = createEmptySceneDocument();
    const controller = createManualFrameController({
      uiSnapshotIntervalSeconds: 0.5
    });
    const snapshots: EditorSimulationUiSnapshot[] = [];

    controller.updateInputs({
      document,
      loadedModelAssets: {}
    });
    controller.subscribeUiSnapshot((snapshot) => {
      snapshots.push(snapshot);
    });
    snapshots.length = 0;

    controller.play();
    expect(snapshots).toHaveLength(1);
    snapshots.length = 0;

    controller.advance(0.2);
    controller.advance(0.2);
    expect(snapshots).toHaveLength(0);

    controller.advance(0.1);
    expect(snapshots).toHaveLength(1);
  });

  it("rebuilds the cached base simulation scene only when inputs change", () => {
    let buildCount = 0;
    const document = createEmptySceneDocument();
    const loadedModelAssets = {};
    const controller = createManualFrameController({
      onBuild: () => {
        buildCount += 1;
      }
    });

    controller.updateInputs({
      document,
      loadedModelAssets
    });
    expect(buildCount).toBe(1);

    controller.play();
    controller.advance(0.1);
    controller.advance(0.1);
    expect(buildCount).toBe(1);

    controller.updateInputs({
      document,
      loadedModelAssets
    });
    expect(buildCount).toBe(1);

    const renamedDocument = {
      ...document,
      name: "Rebuilt Scene"
    };
    controller.updateInputs({
      document: renamedDocument,
      loadedModelAssets
    });
    expect(buildCount).toBe(2);

    const retimedDocument = {
      ...renamedDocument,
      time: {
        ...renamedDocument.time,
        dayLengthMinutes: 12
      }
    };
    controller.updateInputs({
      document: retimedDocument,
      loadedModelAssets
    });
    expect(buildCount).toBe(3);

    controller.updateInputs({
      document: retimedDocument,
      loadedModelAssets: {}
    });
    expect(buildCount).toBe(4);
  });

  it("emits frame updates without publishing a UI snapshot every frame", () => {
    const document = createEmptySceneDocument();
    const controller = createManualFrameController({
      uiSnapshotIntervalSeconds: 1
    });
    const frameListener = vi.fn();
    const uiListener = vi.fn();

    controller.updateInputs({
      document,
      loadedModelAssets: {}
    });
    controller.subscribeFrame(frameListener);
    controller.subscribeUiSnapshot(uiListener);
    frameListener.mockClear();
    uiListener.mockClear();

    controller.play();
    frameListener.mockClear();
    uiListener.mockClear();
    controller.advance(0.25);
    controller.advance(0.25);

    expect(frameListener).toHaveBeenCalledTimes(2);
    expect(uiListener).not.toHaveBeenCalled();
  });

  it("versions clock-only frame updates when the runtime scene cannot build", () => {
    const document = createEmptySceneDocument();
    document.time.startTimeOfDayHours = 9;
    const controller = new EditorSimulationController({
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => undefined,
      buildRuntimeScene: () => {
        throw new Error("Invalid runtime scene");
      }
    });
    const frameListener = vi.fn();

    controller.updateInputs({
      document,
      loadedModelAssets: {}
    });

    const initialFrame = controller.getFrameSnapshot();
    expect(initialFrame.runtimeScene).toBeNull();

    controller.subscribeFrame(frameListener);
    controller.stepHours(1);

    const steppedFrame = controller.getFrameSnapshot();
    expect(steppedFrame.runtimeScene).toBeNull();
    expect(steppedFrame.clock?.timeOfDayHours).toBe(10);
    expect(steppedFrame.frameVersion).toBeGreaterThan(
      initialFrame.frameVersion
    );
    expect(frameListener).toHaveBeenLastCalledWith(steppedFrame);
  });

  it("validates editor simulation scheduling against the full project", () => {
    const actorTarget = createActorControlTargetRef("actor-other-scene");
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines["routine-other-scene"] = createProjectScheduleRoutine({
      id: "routine-other-scene",
      title: "Other Scene Actor",
      target: actorTarget
    });
    const projectDocument = createEmptyProjectDocument({
      sceneId: "scene-active",
      scheduler
    });
    const otherScene = createEmptyProjectScene({
      id: "scene-other",
      name: "Other Scene"
    });
    const otherNpc = createNpcEntity({
      id: "npc-other-scene",
      actorId: actorTarget.actorId
    });
    const projectWithOtherScene = {
      ...projectDocument,
      scenes: {
        ...projectDocument.scenes,
        [otherScene.id]: {
          ...otherScene,
          entities: {
            [otherNpc.id]: otherNpc
          }
        }
      }
    };
    const activeSceneDocument = createSceneDocumentFromProject(
      projectWithOtherScene,
      projectWithOtherScene.activeSceneId
    );
    const standaloneController = createManualFrameController();
    const projectAwareController = createManualFrameController();

    standaloneController.updateInputs({
      document: activeSceneDocument,
      loadedModelAssets: {}
    });
    projectAwareController.updateInputs({
      document: activeSceneDocument,
      projectDocument: projectWithOtherScene,
      loadedModelAssets: {}
    });

    expect(standaloneController.getUiSnapshot().sceneReady).toBe(false);
    expect(standaloneController.getUiSnapshot().message).toContain(
      "does not exist in this document"
    );
    expect(projectAwareController.getUiSnapshot().sceneReady).toBe(true);
    expect(projectAwareController.getUiSnapshot().message).toBeNull();
  });

  it("does not rebuild for project metadata changes outside the scheduling signature", () => {
    let buildCount = 0;
    const projectDocument = createEmptyProjectDocument();
    const sceneDocument = createSceneDocumentFromProject(projectDocument);
    const loadedModelAssets = {};
    const controller = createManualFrameController({
      onBuild: () => {
        buildCount += 1;
      }
    });

    controller.updateInputs({
      document: sceneDocument,
      projectDocument,
      loadedModelAssets
    });
    expect(buildCount).toBe(1);

    controller.updateInputs({
      document: sceneDocument,
      projectDocument: {
        ...projectDocument,
        name: "Renamed Project"
      },
      loadedModelAssets
    });
    expect(buildCount).toBe(1);
  });

  it("rebuilds when project scheduling targets change outside the active scene", () => {
    let buildCount = 0;
    const projectDocument = createEmptyProjectDocument();
    const sceneDocument = createSceneDocumentFromProject(projectDocument);
    const loadedModelAssets = {};
    const controller = createManualFrameController({
      onBuild: () => {
        buildCount += 1;
      }
    });

    controller.updateInputs({
      document: sceneDocument,
      projectDocument,
      loadedModelAssets
    });
    expect(buildCount).toBe(1);

    const otherScene = createEmptyProjectScene({
      id: "scene-other",
      name: "Other Scene"
    });
    const otherNpc = createNpcEntity({
      id: "npc-other",
      actorId: "actor-other"
    });

    controller.updateInputs({
      document: sceneDocument,
      projectDocument: {
        ...projectDocument,
        scenes: {
          ...projectDocument.scenes,
          [otherScene.id]: {
            ...otherScene,
            entities: {
              [otherNpc.id]: otherNpc
            }
          }
        }
      },
      loadedModelAssets
    });
    expect(buildCount).toBe(2);
  });
});
