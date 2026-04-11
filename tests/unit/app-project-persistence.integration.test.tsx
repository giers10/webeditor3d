import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
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

const { loadProjectPackageMock, saveProjectPackageMock } = vi.hoisted(() => ({
  saveProjectPackageMock: vi.fn(async () => new Uint8Array([1, 2, 3])),
  loadProjectPackageMock: vi.fn()
}));

vi.mock("../../src/viewport-three/viewport-host", () => ({
  ViewportHost: MockViewportHost
}));

vi.mock("../../src/assets/project-asset-storage", () => ({
  getBrowserProjectAssetStorageAccess: vi.fn(async () => ({
    storage: null,
    diagnostic: null
  }))
}));

vi.mock("../../src/serialization/project-package", () => ({
  PROJECT_PACKAGE_FILE_EXTENSION: ".we3d",
  saveProjectPackage: saveProjectPackageMock,
  loadProjectPackage: loadProjectPackageMock
}));

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";

describe("App project persistence controls", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    saveProjectPackageMock.mockClear();
    loadProjectPackageMock.mockClear();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({}) as never);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:project"),
      revokeObjectURL: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows Save Project and Load Project instead of the old draft/json actions", async () => {
    render(<App store={createEditorStore()} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("button", { name: "Save Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load Project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export JSON" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import JSON" })).not.toBeInTheDocument();
  });

  it("invokes Save Project when Cmd/Ctrl+S is pressed", async () => {
    const store = createEditorStore();

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, {
      code: "KeyS",
      ctrlKey: true
    });

    await waitFor(() => {
      expect(saveProjectPackageMock).toHaveBeenCalledWith(
        store.getState().projectDocument,
        null
      );
    });
  });
});
