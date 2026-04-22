import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import {
  createBoxBrush,
  createDefaultBoxBrushLightSettings
} from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setCameraState: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
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
    setTransformCommitHandler = vi.fn();
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    setRenderEnabled = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
    setCameraState = vi.fn();
    setPanelId = vi.fn();
    setBrushSelectionChangeHandler = vi.fn();
    setCameraStateChangeHandler = vi.fn();
    setCreationPreviewChangeHandler = vi.fn();
    setCreationCommitHandler = vi.fn();
    setTransformSessionChangeHandler = vi.fn();
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

describe("light volume integration", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("switches a selected whitebox box into light volume mode", async () => {
    const defaults = createDefaultBoxBrushLightSettings();
    const brush = createBoxBrush({
      id: "brush-light-mode-sidebar"
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Light Sidebar Test" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    act(() => {
      store.setSelection({
        kind: "brushes",
        ids: [brush.id]
      });
    });

    const modeInput = (await screen.findByTestId(
      "brush-volume-mode"
    )) as HTMLSelectElement;

    act(() => {
      fireEvent.change(modeInput, {
        target: {
          value: "light"
        }
      });
    });

    await waitFor(() => {
      expect(store.getState().document.brushes[brush.id]?.volume).toEqual({
        mode: "light",
        light: defaults
      });
    });

    expect(modeInput.value).toBe("light");
  });

  it("commits edited light volume settings through the box-volume inspector", async () => {
    const brush = createBoxBrush({
      id: "brush-light-settings-sidebar",
      volume: {
        mode: "light",
        light: {
          colorHex: "#ffffff",
          intensity: 1.25,
          padding: 0.35,
          falloff: "smoothstep"
        }
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Light Settings Sidebar Test" }),
        brushes: {
          [brush.id]: brush
        }
      }
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    act(() => {
      store.setSelection({
        kind: "brushes",
        ids: [brush.id]
      });
    });

    const colorInput = (await screen.findByTestId(
      "brush-light-color"
    )) as HTMLInputElement;
    const intensityInput = (await screen.findByTestId(
      "brush-light-intensity"
    )) as HTMLInputElement;
    const paddingInput = (await screen.findByTestId(
      "brush-light-padding"
    )) as HTMLInputElement;
    const falloffInput = (await screen.findByTestId(
      "brush-light-falloff"
    )) as HTMLSelectElement;

    act(() => {
      fireEvent.change(colorInput, {
        target: {
          value: "#ffd8a8"
        }
      });
      fireEvent.change(intensityInput, {
        target: {
          value: "2.4"
        }
      });
      fireEvent.blur(intensityInput);
      fireEvent.change(paddingInput, {
        target: {
          value: "0.6"
        }
      });
      fireEvent.blur(paddingInput);
      fireEvent.change(falloffInput, {
        target: {
          value: "linear"
        }
      });
    });

    await waitFor(() => {
      expect(store.getState().document.brushes[brush.id]?.volume).toEqual({
        mode: "light",
        light: {
          colorHex: "#ffd8a8",
          intensity: 2.4,
          padding: 0.6,
          falloff: "linear"
        }
      });
    });

    expect(colorInput.value).toBe("#ffd8a8");
    expect(intensityInput.value).toBe("2.4");
    expect(paddingInput.value).toBe("0.6");
    expect(falloffInput.value).toBe("linear");
  });
});
