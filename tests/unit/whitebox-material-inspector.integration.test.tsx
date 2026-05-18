import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    panelId: string | null;
    setPanelId: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    updateSelection: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setCameraState: ReturnType<typeof vi.fn>;
    setBrushSelectionChangeHandler: ReturnType<typeof vi.fn>;
    setCameraStateChangeHandler: ReturnType<typeof vi.fn>;
    setCreationPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setCreationCommitHandler: ReturnType<typeof vi.fn>;
    setTransformSessionChangeHandler: ReturnType<typeof vi.fn>;
    setTransformPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    setTransformCancelHandler: ReturnType<typeof vi.fn>;
    setWhiteboxHoverLabelChangeHandler: ReturnType<typeof vi.fn>;
    setWhiteboxSelectionMode: ReturnType<typeof vi.fn>;
    setWhiteboxSnapSettings: ReturnType<typeof vi.fn>;
    setGridVisible: ReturnType<typeof vi.fn>;
    setToolMode: ReturnType<typeof vi.fn>;
    setCreationPreview: ReturnType<typeof vi.fn>;
    setTransformSession: ReturnType<typeof vi.fn>;
    focusSelection: ReturnType<typeof vi.fn>;
  }> = [];

  class MockViewportHost {
    panelId: string | null = null;
    setPanelId = vi.fn((panelId: string) => {
      this.panelId = panelId;
    });
    setRenderEnabled = vi.fn();
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    updateSelection = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
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
    setGridVisible = vi.fn();
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

afterEach(() => {
  viewportHostInstances.length = 0;
  vi.restoreAllMocks();
});

async function renderMaterialInspectorFixture() {
  const brush = createBoxBrush({
    id: "brush-material-inspector",
    name: "Material Inspector Brush"
  });
  const store = createEditorStore({
    initialDocument: {
      ...createEmptySceneDocument({ name: "Material Inspector Scene" }),
      brushes: {
        [brush.id]: brush
      }
    }
  });

  act(() => {
    store.setWhiteboxSelectionMode("face");
    store.setSelection({
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });
  });

  const renderResult = render(<App store={store} />);

  await waitFor(() => {
    expect(viewportHostInstances.length).toBeGreaterThan(0);
  });

  return {
    ...renderResult,
    store,
    brush
  };
}

describe("whitebox material inspector", () => {
  it("shows the default slot first and persists edited custom material settings", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { container, store, brush } = await renderMaterialInspectorFixture();

    expect(
      container.querySelector(".material-browser button")
    ).toHaveAttribute("data-testid", "material-button-default-whitebox");
    expect(screen.getByTestId("material-button-default-whitebox")).toHaveTextContent(
      "Default Whitebox"
    );

    fireEvent.click(screen.getByTestId("create-custom-material"));

    const customMaterial = Object.values(store.getState().document.materials).find(
      (material) => material.kind === "custom"
    );

    expect(customMaterial).toBeDefined();
    expect(
      store.getState().document.brushes[brush.id].faces.posZ.materialId
    ).toBe(customMaterial?.id);
    expect(
      store.getState().document.brushes[brush.id].faces.posX.materialId
    ).toBeNull();

    fireEvent.change(screen.getByTestId("custom-material-albedo"), {
      target: {
        value: "#224466"
      }
    });
    fireEvent.change(screen.getByTestId("custom-material-roughness"), {
      target: {
        value: "0.37"
      }
    });
    fireEvent.change(screen.getByTestId("custom-material-metallic"), {
      target: {
        value: "0.58"
      }
    });

    const editedMaterialId = customMaterial?.id;

    if (editedMaterialId === undefined) {
      throw new Error("Expected a custom material to be created.");
    }

    expect(store.getState().document.materials[editedMaterialId]).toMatchObject({
      kind: "custom",
      albedoColorHex: "#224466",
      roughness: 0.37,
      metallic: 0.58
    });

    const exportedProject = store.exportDocumentJson();
    const reloadedStore = createEditorStore();

    reloadedStore.importDocumentJson(exportedProject);

    expect(reloadedStore.getState().document.materials[editedMaterialId]).toMatchObject({
      kind: "custom",
      albedoColorHex: "#224466",
      roughness: 0.37,
      metallic: 0.58
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
