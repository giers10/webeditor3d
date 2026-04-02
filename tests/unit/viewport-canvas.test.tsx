import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import { ViewportCanvas } from "../../src/viewport-three/ViewportCanvas";
import type { CreationViewportToolPreview, ViewportToolPreview } from "../../src/viewport-three/viewport-transient-state";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    setViewMode: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setBrushSelectionChangeHandler: ReturnType<typeof vi.fn>;
    setCreationPreviewChangeHandler: ReturnType<typeof vi.fn>;
    setCreationCommitHandler: ReturnType<typeof vi.fn>;
    setToolMode: ReturnType<typeof vi.fn>;
    setCreationPreview: ReturnType<typeof vi.fn>;
    focusSelection: ReturnType<typeof vi.fn>;
  }> = [];

  class MockViewportHost {
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    setViewMode = vi.fn();
    setDisplayMode = vi.fn();
    setBrushSelectionChangeHandler = vi.fn();
    setCreationPreviewChangeHandler = vi.fn();
    setCreationCommitHandler = vi.fn();
    setToolMode = vi.fn();
    setCreationPreview = vi.fn();
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

describe("ViewportCanvas", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wires the creation commit handler into the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();
    const toolPreview: CreationViewportToolPreview = {
      kind: "create",
      sourcePanelId: "topLeft",
      target: {
        kind: "box-brush"
      },
      center: null
    };
    const onCommitCreation = vi.fn(() => true);
    const onToolPreviewChange = vi.fn((_toolPreview: ViewportToolPreview) => undefined);
    const onSelectionChange = vi.fn();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        selection={{ kind: "none" }}
        toolMode="create"
        toolPreview={toolPreview}
        viewMode="perspective"
        displayMode="authoring"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={onSelectionChange}
        onCommitCreation={onCommitCreation}
        onToolPreviewChange={onToolPreviewChange}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].setCreationCommitHandler).toHaveBeenCalledTimes(1);
    });

    const registeredHandler = viewportHostInstances[0].setCreationCommitHandler.mock.calls[0][0] as (
      toolPreview: CreationViewportToolPreview
    ) => boolean;

    expect(registeredHandler(toolPreview)).toBe(true);
    expect(onCommitCreation).toHaveBeenCalledWith(toolPreview);
  });
});
