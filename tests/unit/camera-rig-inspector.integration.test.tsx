import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setGridVisible: ReturnType<typeof vi.fn>;
    setCameraState: ReturnType<typeof vi.fn>;
    setBrushSelectionChangeHandler: ReturnType<typeof vi.fn>;
    setCameraStateChangeHandler: ReturnType<typeof vi.fn>;
    setCreationPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setCreationCommitHandler: ReturnType<typeof vi.fn>;
    setTransformSessionChangeHandler: ReturnType<typeof vi.fn>;
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
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
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    setPanelId = vi.fn();
    setRenderEnabled = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
    setGridVisible = vi.fn();
    setCameraState = vi.fn();
    setBrushSelectionChangeHandler = vi.fn();
    setCameraStateChangeHandler = vi.fn();
    setCreationPreviewChangeHandler = vi.fn();
    setCreationCommitHandler = vi.fn();
    setTransformSessionChangeHandler = vi.fn();
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

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";

describe("Camera Rig inspector", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates a camera rig from the Add menu and persists fixed-rig inspector edits", async () => {
    const store = createEditorStore();

    const { unmount } = render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(await screen.findByTestId("add-menu-camera-rig"));

    await waitFor(() => {
      expect(
        Object.values(store.getState().document.entities).filter(
          (entity) => entity.kind === "cameraRig"
        )
      ).toHaveLength(1);
    });

    const createdCameraRig = Object.values(store.getState().document.entities).find(
      (entity) => entity.kind === "cameraRig"
    );

    if (createdCameraRig === undefined || createdCameraRig.kind !== "cameraRig") {
      throw new Error("Expected the created camera rig to exist.");
    }

    await waitFor(() => {
      expect(store.getState().selection).toEqual({
        kind: "entities",
        ids: [createdCameraRig.id]
      });
    });

    expect(
      screen.getByTestId(`outliner-entity-${createdCameraRig.id}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId("camera-rig-target-kind")).toHaveValue("player");

    fireEvent.change(screen.getByTestId("camera-rig-priority"), {
      target: { value: "9" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-priority"));
    fireEvent.click(screen.getByTestId("camera-rig-default-active"));
    fireEvent.change(screen.getByTestId("camera-rig-target-kind"), {
      target: { value: "worldPoint" }
    });
    fireEvent.change(screen.getByTestId("camera-rig-target-world-x"), {
      target: { value: "3.5" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-target-world-x"));
    fireEvent.change(screen.getByTestId("camera-rig-target-world-y"), {
      target: { value: "1.75" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-target-world-y"));
    fireEvent.change(screen.getByTestId("camera-rig-target-world-z"), {
      target: { value: "-6" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-target-world-z"));
    fireEvent.change(screen.getByTestId("camera-rig-transition-mode"), {
      target: { value: "blend" }
    });
    fireEvent.change(screen.getByTestId("camera-rig-transition-duration"), {
      target: { value: "1.2" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-transition-duration"));
    fireEvent.change(screen.getByTestId("camera-rig-look-around-yaw-limit"), {
      target: { value: "18" }
    });
    fireEvent.blur(screen.getByTestId("camera-rig-look-around-yaw-limit"));

    await waitFor(() => {
      expect(store.getState().document.entities[createdCameraRig.id]).toMatchObject({
        kind: "cameraRig",
        priority: 9,
        defaultActive: false,
        target: {
          kind: "worldPoint",
          point: {
            x: 3.5,
            y: 1.75,
            z: -6
          }
        },
        transitionMode: "blend",
        transitionDurationSeconds: 1.2,
        lookAround: {
          yawLimitDegrees: 18
        }
      });
    });

    unmount();
  });
});
