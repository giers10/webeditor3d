import { describe, expect, it, vi } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  EditorSimulationController,
  type EditorSimulationUiSnapshot
} from "../../src/runtime-three/editor-simulation-controller";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

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
    uiListener.mockClear();
    controller.advance(0.25);
    controller.advance(0.25);

    expect(frameListener).toHaveBeenCalledTimes(2);
    expect(uiListener).not.toHaveBeenCalled();
  });
});
