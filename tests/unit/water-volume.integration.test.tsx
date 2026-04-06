import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
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
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
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

describe("water volume integration", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the selected water color after committing the picker change", async () => {
    const brush = createBoxBrush({
      id: "brush-water-sidebar",
      volume: {
        mode: "water",
        water: {
          colorHex: "#4da6d9",
          surfaceOpacity: 0.55,
          waveStrength: 0.35
        }
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Water Sidebar Test" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
      expect(viewportHostInstances[0]?.setTransformCommitHandler).toHaveBeenCalled();
    });

    act(() => {
      store.setSelection({
        kind: "brushes",
        ids: [brush.id]
      });
    });

    const input = (await screen.findByTestId("brush-water-color")) as HTMLInputElement;

    act(() => {
      fireEvent.change(input, {
        target: {
          value: "#12a4ff"
        }
      });
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(input.value).toBe("#12a4ff");
    expect(store.getState().document.brushes[brush.id]?.volume).toEqual({
      mode: "water",
      water: {
        colorHex: "#12a4ff",
        surfaceOpacity: 0.55,
        waveStrength: 0.35
      }
    });
  });
});