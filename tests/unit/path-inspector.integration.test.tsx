import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    updateSelection: ReturnType<typeof vi.fn>;
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
    updateSelection = vi.fn();
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

describe("Path inspector", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a path from the Add menu and edits its basic inspector fields", async () => {
    const store = createEditorStore();

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(await screen.findByTestId("add-menu-path"));

    await waitFor(() => {
      expect(store.getState().selection).toMatchObject({
        kind: "paths"
      });
      expect(Object.keys(store.getState().document.paths)).toHaveLength(1);
    });

    const createdPath = Object.values(store.getState().document.paths)[0];

    if (createdPath === undefined) {
      throw new Error("Expected the created path to exist.");
    }

    expect(screen.getByTestId("path-name")).toHaveValue("");
    expect(screen.getByTestId("path-loop")).not.toBeChecked();
    expect(screen.getByTestId("path-point-0-x")).toHaveValue(-1);
    expect(screen.getByTestId("path-point-1-x")).toHaveValue(1);

    fireEvent.change(screen.getByTestId("path-name"), {
      target: {
        value: "Patrol Route"
      }
    });
    fireEvent.blur(screen.getByTestId("path-name"));
    fireEvent.click(screen.getByTestId("path-loop"));
    fireEvent.change(screen.getByTestId("path-point-1-z"), {
      target: {
        value: "2"
      }
    });
    fireEvent.blur(screen.getByTestId("path-point-1-z"));
    fireEvent.click(screen.getByTestId("add-path-point"));

    await waitFor(() => {
      const updatedPath = store.getState().document.paths[createdPath.id];

      expect(updatedPath).toMatchObject({
        name: "Patrol Route",
        loop: true
      });
      expect(updatedPath?.points).toHaveLength(3);
      expect(updatedPath?.points[1]?.position).toEqual({
        x: 1,
        y: 0,
        z: 2
      });
    });
  });
});
