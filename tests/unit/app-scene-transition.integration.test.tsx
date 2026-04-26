import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import {
  createPlayerStartEntity,
  createSceneEntryEntity
} from "../../src/entities/entity-instances";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    updateSelection: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setGridVisible: ReturnType<typeof vi.fn>;
    setCameraState: ReturnType<typeof vi.fn>;
    setBrushSelectionChangeHandler: ReturnType<typeof vi.fn>;
    setCameraStateChangeHandler: ReturnType<typeof vi.fn>;
    setCreationPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setCreationCommitHandler: ReturnType<typeof vi.fn>;
    setTransformSessionChangeHandler: ReturnType<typeof vi.fn>;
    setTransformPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setTransformCancelHandler: ReturnType<typeof vi.fn>;
    setWhiteboxHoverLabelChangeHandler: ReturnType<typeof vi.fn>;
    setWhiteboxSelectionMode: ReturnType<typeof vi.fn>;
    setWhiteboxSnapSettings: ReturnType<typeof vi.fn>;
    setToolMode: ReturnType<typeof vi.fn>;
    setCreationPreview: ReturnType<typeof vi.fn>;
    setTransformSession: ReturnType<typeof vi.fn>;
    focusSelection: ReturnType<typeof vi.fn>;
  }> = [];

  class MockViewportHost {
    setPanelId = vi.fn();
    setRenderEnabled = vi.fn();
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    updateSelection = vi.fn();
    updateSimulation = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
    setGridVisible = vi.fn();
    setCameraState = vi.fn();
    setBrushSelectionChangeHandler = vi.fn();
    setCameraStateChangeHandler = vi.fn();
    setCreationPreviewChangeHandler = vi.fn();
    setCreationCommitHandler = vi.fn();
    setTransformSessionChangeHandler = vi.fn();
    setTransformPreviewChangeHandler = vi.fn();
    setTransformCommitHandler = vi.fn();
    setTransformCancelHandler = vi.fn();
    setWhiteboxHoverLabelChangeHandler = vi.fn();
    setWhiteboxSelectionMode = vi.fn();
    setWhiteboxSnapSettings = vi.fn();
    setToolMode = vi.fn();
    setCreationPreview = vi.fn();
    setTransformSession = vi.fn();
    focusSelection = vi.fn();

    constructor() {
      viewportHostInstances.push(this);
    }
  }

  return {
    MockViewportHost,
    viewportHostInstances
  };
});

vi.mock("../../src/viewport-three/viewport-host", () => ({
  ViewportHost: MockViewportHost
}));

vi.mock("../../src/assets/project-asset-storage", () => ({
  getBrowserProjectAssetStorageAccess: vi.fn(async () => ({
    storage: null,
    diagnostic: null
  }))
}));

vi.mock("../../src/runner-web/RunnerCanvas", () => ({
  RunnerCanvas: (props: {
    sceneName: string;
    onSceneTransitionActivated(request: {
      sourceEntityId: string | null;
      targetSceneId: string;
      targetEntryEntityId: string;
    }): void;
  }) => {
    return (
      <div data-testid="mock-runner-canvas">
        <div data-testid="mock-runner-scene-name">{props.sceneName}</div>
        <button
          type="button"
          data-testid="mock-trigger-scene-transition"
          onClick={() => {
            props.onSceneTransitionActivated({
              sourceEntityId: "entity-interactable-front-door",
              targetSceneId: "scene-house",
              targetEntryEntityId: "entity-scene-entry-house-front"
            });
          }}
        >
          Trigger Scene Transition
        </button>
      </div>
    );
  }
}));

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";

function createSceneTransitionProject() {
  const outdoorScene = createEmptyProjectScene({
    id: "scene-outside",
    name: "Outside"
  });
  const houseScene = createEmptyProjectScene({
    id: "scene-house",
    name: "House"
  });
  const outdoorPlayerStart = createPlayerStartEntity({
    id: "entity-player-start-outside",
    position: {
      x: 0,
      y: 0,
      z: 0
    },
    yawDegrees: 90
  });
  const housePlayerStart = createPlayerStartEntity({
    id: "entity-player-start-house",
    position: {
      x: 0,
      y: 0,
      z: 0
    },
    yawDegrees: 180
  });
  const houseEntry = createSceneEntryEntity({
    id: "entity-scene-entry-house-front",
    position: {
      x: 3,
      y: 0,
      z: -1
    },
    yawDegrees: 270
  });
  const projectDocument = createEmptyProjectDocument({
    sceneId: outdoorScene.id,
    sceneName: outdoorScene.name
  });

  projectDocument.activeSceneId = outdoorScene.id;
  projectDocument.scenes = {
    [outdoorScene.id]: {
      ...outdoorScene,
      entities: {
        [outdoorPlayerStart.id]: outdoorPlayerStart
      }
    },
    [houseScene.id]: {
      ...houseScene,
      entities: {
        [housePlayerStart.id]: housePlayerStart,
        [houseEntry.id]: houseEntry
      }
    }
  };

  return projectDocument;
}

describe("App scene transition flow", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("switches runtime scenes through scene transition requests without changing the editor active scene", async () => {
    const store = createEditorStore({
      initialProjectDocument: createSceneTransitionProject()
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Scene" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-runner-scene-name")).toHaveTextContent(
        "Outside"
      );
    });

    expect(screen.getByTestId("runner-scene-name")).toHaveTextContent(
      "Outside"
    );
    expect(screen.getByTestId("runner-transition-count")).toHaveTextContent(
      "0"
    );
    expect(store.getState().activeSceneId).toBe("scene-outside");

    fireEvent.click(screen.getByTestId("mock-trigger-scene-transition"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-runner-scene-name")).toHaveTextContent(
        "House"
      );
    });

    expect(screen.getByTestId("runner-scene-name")).toHaveTextContent("House");
    expect(screen.getByTestId("runner-transition-count")).toHaveTextContent(
      "1"
    );
    expect(screen.getByTestId("runner-spawn-state")).toHaveTextContent(
      "Scene Entry"
    );
    expect(screen.getByText("Last transition: Outside to House")).toBeVisible();
    expect(store.getState().activeSceneId).toBe("scene-outside");
  });
});
