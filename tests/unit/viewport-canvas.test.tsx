import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInactiveTransformSession, type ActiveTransformSession, type TransformSessionState } from "../../src/core/transform-session";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { ViewportCanvas } from "../../src/viewport-three/ViewportCanvas";
import { createDefaultViewportPanelCameraState, type ViewportPanelCameraState } from "../../src/viewport-three/viewport-layout";
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
    setGridVisible: ReturnType<typeof vi.fn>;
    setToolMode: ReturnType<typeof vi.fn>;
    setCreationPreview: ReturnType<typeof vi.fn>;
    setTransformSession: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
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
    setGridVisible = vi.fn();
    setToolMode = vi.fn();
    setCreationPreview = vi.fn();
    setTransformSession = vi.fn();
    setPanelId = vi.fn();
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
    const cameraState = createDefaultViewportPanelCameraState();
    const toolPreview: CreationViewportToolPreview = {
      kind: "create",
      sourcePanelId: "topLeft",
      target: {
        kind: "box-brush"
      },
      center: null
    };
    const onCommitCreation = vi.fn(() => true);
    const onCameraStateChange = vi.fn((_cameraState: ViewportPanelCameraState) => undefined);
    const onToolPreviewChange = vi.fn((_toolPreview: ViewportToolPreview) => undefined);
    const onTransformSessionChange = vi.fn((_transformSession: TransformSessionState) => undefined);
    const onTransformCommit = vi.fn((_transformSession: ActiveTransformSession) => undefined);
    const onTransformCancel = vi.fn(() => undefined);
    const onSelectionChange = vi.fn();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible
        selection={{ kind: "none" }}
        toolMode="create"
        toolPreview={toolPreview}
        transformSession={createInactiveTransformSession()}
        cameraState={cameraState}
        viewMode="perspective"
        displayMode="authoring"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={onSelectionChange}
        onCommitCreation={onCommitCreation}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={onToolPreviewChange}
        onTransformSessionChange={onTransformSessionChange}
        onTransformCommit={onTransformCommit}
        onTransformCancel={onTransformCancel}
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

  it("applies and subscribes to persisted camera state through the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();
    const cameraState = createDefaultViewportPanelCameraState();
    const onCameraStateChange = vi.fn((_cameraState: ViewportPanelCameraState) => undefined);

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible
        selection={{ kind: "none" }}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={cameraState}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].setCameraState).toHaveBeenCalledWith(cameraState);
      expect(viewportHostInstances[0].setCameraStateChangeHandler).toHaveBeenCalledTimes(1);
    });
  });
});
