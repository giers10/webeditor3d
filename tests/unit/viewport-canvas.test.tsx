import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTransformSession,
  createInactiveTransformSession,
  type ActiveTransformSession,
  type TransformSessionState
} from "../../src/core/transform-session";
import type { EditorSelection } from "../../src/core/selection";
import type { ArmedTerrainBrushState } from "../../src/core/terrain-brush";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createTerrain } from "../../src/document/terrains";
import {
  EditorSimulationController,
  type EditorSimulationFrameSnapshot
} from "../../src/runtime-three/editor-simulation-controller";
import { createRuntimeClockState } from "../../src/runtime-three/runtime-project-time";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { ViewportCanvas } from "../../src/viewport-three/ViewportCanvas";
import {
  createDefaultViewportPanelCameraState,
  type ViewportPanelCameraState
} from "../../src/viewport-three/viewport-layout";
import type {
  CreationViewportToolPreview,
  ViewportToolPreview
} from "../../src/viewport-three/viewport-transient-state";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    setRenderEnabled: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateSimulation: ReturnType<typeof vi.fn>;
    updateSimulationFrame: ReturnType<typeof vi.fn>;
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
    setTerrainBrushCommitHandler: ReturnType<typeof vi.fn>;
    setWhiteboxHoverLabelChangeHandler: ReturnType<typeof vi.fn>;
    setWhiteboxSelectionMode: ReturnType<typeof vi.fn>;
    setWhiteboxSnapSettings: ReturnType<typeof vi.fn>;
    setGridVisible: ReturnType<typeof vi.fn>;
    setToolMode: ReturnType<typeof vi.fn>;
    setTerrainBrushState: ReturnType<typeof vi.fn>;
    setTerrainLodGridVisibleTerrainIds: ReturnType<typeof vi.fn>;
    setCreationPreview: ReturnType<typeof vi.fn>;
    setTransformSession: ReturnType<typeof vi.fn>;
    setPanelId: ReturnType<typeof vi.fn>;
    focusSelection: ReturnType<typeof vi.fn>;
  }> = [];

  class MockViewportHost {
    mount = vi.fn();
    dispose = vi.fn();
    setRenderEnabled = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateSimulationFrame = vi.fn();
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
    setTerrainBrushCommitHandler = vi.fn();
    setWhiteboxHoverLabelChangeHandler = vi.fn();
    setWhiteboxSelectionMode = vi.fn();
    setWhiteboxSnapSettings = vi.fn();
    setGridVisible = vi.fn();
    setToolMode = vi.fn();
    setTerrainBrushState = vi.fn();
    setTerrainLodGridVisibleTerrainIds = vi.fn();
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
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.useRealTimers();
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
    const onCameraStateChange = vi.fn(
      (_cameraState: ViewportPanelCameraState) => undefined
    );
    const onToolPreviewChange = vi.fn(
      (_toolPreview: ViewportToolPreview) => undefined
    );
    const onTransformSessionChange = vi.fn(
      (_transformSession: TransformSessionState) => undefined
    );
    const onTransformCommit = vi.fn(
      (_transformSession: ActiveTransformSession) => undefined
    );
    const onTransformCancel = vi.fn(() => undefined);
    const onSelectionChange = vi.fn();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
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
        onTerrainBrushCommit={vi.fn(() => true)}
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
      expect(
        viewportHostInstances[0].setCreationCommitHandler
      ).toHaveBeenCalledTimes(1);
    });

    const registeredHandler = viewportHostInstances[0].setCreationCommitHandler
      .mock.calls[0][0] as (
      toolPreview: CreationViewportToolPreview
    ) => boolean;

    expect(registeredHandler(toolPreview)).toBe(true);
    expect(onCommitCreation).toHaveBeenCalledWith(toolPreview);
  });

  it("applies and subscribes to persisted camera state through the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();
    const cameraState = createDefaultViewportPanelCameraState();
    const onCameraStateChange = vi.fn(
      (_cameraState: ViewportPanelCameraState) => undefined
    );

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
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
        onTerrainBrushCommit={vi.fn(() => true)}
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
      expect(viewportHostInstances[0].setCameraState).toHaveBeenCalledWith(
        cameraState
      );
      expect(
        viewportHostInstances[0].setCameraStateChangeHandler
      ).toHaveBeenCalledTimes(1);
    });
  });

  it("syncs selection without resyncing the viewport document", async () => {
    const brush = createBoxBrush({
      id: "selection-sync-brush"
    });
    const sceneDocument = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };
    const cameraState = createDefaultViewportPanelCameraState();
    const renderCanvas = (
      selection: EditorSelection,
      activeSelectionId: string | null
    ) => (
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={selection}
        activeSelectionId={activeSelectionId}
        terrainBrushState={null}
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
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    const { rerender } = render(renderCanvas({ kind: "none" }, null));

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].updateDocument).toHaveBeenCalledWith(
        sceneDocument
      );
    });

    const viewportHost = viewportHostInstances[0];
    expect(viewportHost.updateDocument.mock.calls[0]).toHaveLength(1);
    viewportHost.updateDocument.mockClear();
    viewportHost.updateSelection.mockClear();

    const selectedBrush: EditorSelection = {
      kind: "brushes",
      ids: [brush.id]
    };
    rerender(renderCanvas(selectedBrush, brush.id));

    await waitFor(() => {
      expect(viewportHost.updateSelection).toHaveBeenCalledWith(
        selectedBrush,
        brush.id
      );
    });
    expect(viewportHost.updateDocument).not.toHaveBeenCalled();
  });

  it("pushes editor simulation scene state into the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();
    const editorSimulationController = new EditorSimulationController();
    editorSimulationController.updateInputs({
      document: sceneDocument,
      loadedModelAssets: {}
    });
    const editorSimulationFrame =
      editorSimulationController.getFrameSnapshot();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={editorSimulationController}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].updateSimulation).toHaveBeenCalledWith(
        editorSimulationFrame.runtimeScene,
        editorSimulationFrame.clock,
        {
          sceneVersion: editorSimulationFrame.sceneVersion,
          frameVersion: editorSimulationFrame.frameVersion
        }
      );
    });
  });

  it("routes ordinary editor simulation frames through the incremental host update", async () => {
    const sceneDocument = createEmptySceneDocument();
    sceneDocument.time.dayLengthMinutes = 24;
    const editorSimulationController = new EditorSimulationController({
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => undefined
    });
    editorSimulationController.updateInputs({
      document: sceneDocument,
      loadedModelAssets: {}
    });

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={editorSimulationController}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
    });

    const viewportHost = viewportHostInstances[0];
    viewportHost.updateSimulation.mockClear();
    viewportHost.updateSimulationFrame.mockClear();

    act(() => {
      editorSimulationController.play();
      editorSimulationController.advance(0.25);
    });

    expect(viewportHost.updateSimulation).not.toHaveBeenCalled();
    expect(viewportHost.updateSimulationFrame).toHaveBeenCalled();
  });

  it("keeps same-scene-version simulation frames on the incremental path even if scene identity changes", async () => {
    const sceneDocument = createEmptySceneDocument();
    const firstRuntimeScene = buildRuntimeSceneFromDocument(sceneDocument);
    const secondRuntimeScene = buildRuntimeSceneFromDocument({
      ...sceneDocument,
      name: "Different Runtime Object"
    });
    const clock = createRuntimeClockState(sceneDocument.time);
    let frameListener:
      | ((snapshot: EditorSimulationFrameSnapshot) => void)
      | null = null;
    const editorSimulationController = {
      getFrameSnapshot: () => ({
        runtimeScene: firstRuntimeScene,
        clock,
        sceneVersion: 1,
        frameVersion: 1
      }),
      subscribeFrame: (
        listener: (snapshot: EditorSimulationFrameSnapshot) => void
      ) => {
        frameListener = listener;
        return () => undefined;
      }
    } as unknown as EditorSimulationController;

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={editorSimulationController}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(frameListener).not.toBeNull();
    });

    const viewportHost = viewportHostInstances[0];
    viewportHost.updateSimulation.mockClear();
    viewportHost.updateSimulationFrame.mockClear();

    act(() => {
      frameListener?.({
        runtimeScene: secondRuntimeScene,
        clock,
        sceneVersion: 1,
        frameVersion: 2
      });
    });

    expect(viewportHost.updateSimulation).not.toHaveBeenCalled();
    expect(viewportHost.updateSimulationFrame).toHaveBeenCalledWith(
      secondRuntimeScene,
      clock,
      {
        sceneVersion: 1,
        frameVersion: 2
      }
    );
  });

  it("routes editor simulation scene-version changes through the structural host update", async () => {
    const sceneDocument = createEmptySceneDocument();
    const editorSimulationController = new EditorSimulationController();
    editorSimulationController.updateInputs({
      document: sceneDocument,
      loadedModelAssets: {}
    });

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={editorSimulationController}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
    });

    const viewportHost = viewportHostInstances[0];
    viewportHost.updateSimulation.mockClear();
    viewportHost.updateSimulationFrame.mockClear();

    const nextSceneDocument = {
      ...sceneDocument,
      name: "Structural Simulation Scene"
    };

    act(() => {
      editorSimulationController.updateInputs({
        document: nextSceneDocument,
        loadedModelAssets: {}
      });
    });

    expect(viewportHost.updateSimulation).toHaveBeenCalledTimes(1);
    expect(viewportHost.updateSimulationFrame).not.toHaveBeenCalled();
  });

  it("shows the surface snap translate overlay when the active transform enables it", () => {
    const sceneDocument = createEmptySceneDocument();
    const brush = createBoxBrush({
      id: "overlay-brush",
      center: { x: 0, y: 1, z: 0 }
    });

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "brushes", ids: [brush.id] }}
        activeSelectionId={brush.id}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createTransformSession({
          source: "keyboard",
          sourcePanelId: "topLeft",
          operation: "translate",
          surfaceSnapEnabled: true,
          axisConstraint: "x",
          axisConstraintSpace: "local",
          target: {
            kind: "brush",
            brushId: brush.id,
            brushKind: brush.kind,
            initialCenter: brush.center,
            initialRotationDegrees: brush.rotationDegrees,
            initialSize: brush.size,
            initialGeometry: brush.geometry
          }
        })}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId("viewport-transform-preview-topLeft")).toHaveTextContent(
      "translate · surface snap · Local X"
    );
  });

  it("shows the terrain brush overlay and pushes brush state into the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();
    const terrainBrushState: ArmedTerrainBrushState = {
      terrainId: "terrain-selected",
      tool: "smooth",
      radius: 2.5,
      strength: 0.4,
      falloff: 0.7
    };

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "terrains", ids: [terrainBrushState.terrainId] }}
        activeSelectionId={terrainBrushState.terrainId}
        terrainBrushState={terrainBrushState}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].setTerrainBrushState).toHaveBeenCalledWith(
        terrainBrushState
      );
      expect(
        viewportHostInstances[0].setTerrainBrushCommitHandler
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByTestId("viewport-terrain-brush-preview-topLeft")
    ).toHaveTextContent("terrain · smooth");
  });

  it("passes terrain LoD grid visibility to the viewport host", async () => {
    const sceneDocument = createEmptySceneDocument();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "terrains", ids: ["terrain-selected"] }}
        activeSelectionId="terrain-selected"
        terrainLodGridVisibleTerrainIds={["terrain-selected"]}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(
        viewportHostInstances[0].setTerrainLodGridVisibleTerrainIds
      ).toHaveBeenCalledWith(["terrain-selected"]);
    });
  });

  it("shows the active terrain paint layer in the viewport overlay", () => {
    const sceneDocument = createEmptySceneDocument();
    const terrainBrushState: ArmedTerrainBrushState = {
      terrainId: "terrain-selected",
      tool: "paint",
      layerIndex: 2,
      radius: 2.5,
      strength: 0.4,
      falloff: 0.7
    };

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "terrains", ids: [terrainBrushState.terrainId] }}
        activeSelectionId={terrainBrushState.terrainId}
        terrainBrushState={terrainBrushState}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("viewport-terrain-brush-preview-topLeft")
    ).toHaveTextContent("terrain · paint · layer 3");
  });

  it("shows the viewport time transport only on the active viewport panel", () => {
    const sceneDocument = createEmptySceneDocument();
    const commonProps = {
      world: sceneDocument.world,
      sceneDocument,
      editorSimulationController: new EditorSimulationController(),
      projectAssets: sceneDocument.assets,
      loadedModelAssets: {},
      loadedImageAssets: {},
      whiteboxSelectionMode: "object" as const,
      whiteboxSnapEnabled: true,
      whiteboxSnapStep: 1,
      viewportGridVisible: true,
      selection: { kind: "none" } as EditorSelection,
      activeSelectionId: null,
      terrainBrushState: null,
      toolMode: "select" as const,
      toolPreview: { kind: "none" } as ViewportToolPreview,
      transformSession: createInactiveTransformSession(),
      cameraState: createDefaultViewportPanelCameraState(),
      viewMode: "perspective" as const,
      displayMode: "normal" as const,
      layoutMode: "quad" as const,
      focusRequestId: 0,
      focusSelection: { kind: "none" } as EditorSelection,
      onSelectionChange: vi.fn(),
      onTerrainBrushCommit: vi.fn(() => true),
      onCommitCreation: vi.fn(() => true),
      onCameraStateChange: vi.fn(),
      onToolPreviewChange: vi.fn(),
      onTransformSessionChange: vi.fn(),
      onTransformCommit: vi.fn(),
      onTransformCancel: vi.fn(),
      onPlayEditorSimulation: vi.fn(),
      onPauseEditorSimulation: vi.fn(),
      onStepEditorSimulation: vi.fn()
    };

    const { rerender } = render(
      <ViewportCanvas panelId="topLeft" isActivePanel {...commonProps} />
    );

    expect(screen.getByTestId("viewport-time-transport-topLeft")).toBeVisible();

    rerender(
      <ViewportCanvas
        panelId="topRight"
        isActivePanel={false}
        {...commonProps}
      />
    );

    expect(
      screen.queryByTestId("viewport-time-transport-topRight")
    ).not.toBeInTheDocument();
  });

  it("routes viewport time transport play and pause to editor simulation handlers", () => {
    const sceneDocument = createEmptySceneDocument();
    const onPlayEditorSimulation = vi.fn();
    const onPauseEditorSimulation = vi.fn();

    const renderCanvas = (editorSimulationPlaying: boolean) => (
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        editorSimulationPlaying={editorSimulationPlaying}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
        onPlayEditorSimulation={onPlayEditorSimulation}
        onPauseEditorSimulation={onPauseEditorSimulation}
        onStepEditorSimulation={vi.fn()}
      />
    );

    const { rerender } = render(renderCanvas(false));
    const playToggle = screen.getByTestId("viewport-time-play-toggle-topLeft");

    expect(playToggle).toHaveTextContent(">");
    fireEvent.click(playToggle);
    expect(onPlayEditorSimulation).toHaveBeenCalledTimes(1);
    expect(onPauseEditorSimulation).not.toHaveBeenCalled();

    rerender(renderCanvas(true));
    const pauseToggle = screen.getByTestId("viewport-time-play-toggle-topLeft");

    expect(pauseToggle).toHaveTextContent("II");
    fireEvent.click(pauseToggle);
    expect(onPauseEditorSimulation).toHaveBeenCalledTimes(1);
  });

  it("steps viewport time once on click and repeatedly while held", () => {
    vi.useFakeTimers();

    const sceneDocument = createEmptySceneDocument();
    const onStepEditorSimulation = vi.fn();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
        onPlayEditorSimulation={vi.fn()}
        onPauseEditorSimulation={vi.fn()}
        onStepEditorSimulation={onStepEditorSimulation}
      />
    );

    fireEvent.click(screen.getByTestId("viewport-time-rewind-topLeft"));
    expect(onStepEditorSimulation).toHaveBeenLastCalledWith(-0.25);
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(1);

    const fastForward = screen.getByTestId("viewport-time-forward-topLeft");
    fireEvent.pointerDown(fastForward, { button: 0, pointerId: 1 });
    expect(onStepEditorSimulation).toHaveBeenLastCalledWith(0.25);
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(124);
    });
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(3);

    fireEvent.pointerUp(fastForward, { pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(3);
  });

  it("stops viewport time repeat stepping on pointer cancel and blur", () => {
    vi.useFakeTimers();

    const sceneDocument = createEmptySceneDocument();
    const onStepEditorSimulation = vi.fn();

    render(
      <ViewportCanvas
        panelId="topLeft"
        world={sceneDocument.world}
        sceneDocument={sceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={sceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "none" }}
        activeSelectionId={null}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={createDefaultViewportPanelCameraState()}
        viewMode="perspective"
        displayMode="normal"
        layoutMode="single"
        isActivePanel
        focusRequestId={0}
        focusSelection={{ kind: "none" }}
        onSelectionChange={vi.fn()}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={vi.fn()}
        onToolPreviewChange={vi.fn()}
        onTransformSessionChange={vi.fn()}
        onTransformCommit={vi.fn()}
        onTransformCancel={vi.fn()}
        onPlayEditorSimulation={vi.fn()}
        onPauseEditorSimulation={vi.fn()}
        onStepEditorSimulation={onStepEditorSimulation}
      />
    );

    const rewind = screen.getByTestId("viewport-time-rewind-topLeft");
    fireEvent.pointerDown(rewind, { button: 0, pointerId: 2 });
    fireEvent.pointerCancel(rewind, { pointerId: 2 });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(1);

    const fastForward = screen.getByTestId("viewport-time-forward-topLeft");
    fireEvent.pointerDown(fastForward, { button: 0, pointerId: 3 });
    fireEvent.blur(fastForward);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onStepEditorSimulation).toHaveBeenCalledTimes(2);
  });

  it("does not refocus the viewport when the scene document changes without a new focus request", async () => {
    const baseSceneDocument = createEmptySceneDocument();
    const focusedTerrain = createTerrain({
      id: "terrain-focused"
    });
    const focusedSceneDocument = {
      ...baseSceneDocument,
      terrains: {
        [focusedTerrain.id]: focusedTerrain
      }
    };
    const updatedSceneDocument = {
      ...focusedSceneDocument,
      terrains: {
        [focusedTerrain.id]: createTerrain({
          ...focusedTerrain,
          heights: focusedTerrain.heights.map((height, index) =>
            index === 0 ? height + 1 : height
          )
        })
      }
    };
    const cameraState = createDefaultViewportPanelCameraState();
    const onCameraStateChange = vi.fn(
      (_cameraState: ViewportPanelCameraState) => undefined
    );
    const onToolPreviewChange = vi.fn(
      (_toolPreview: ViewportToolPreview) => undefined
    );
    const onTransformSessionChange = vi.fn(
      (_transformSession: TransformSessionState) => undefined
    );
    const onTransformCommit = vi.fn(
      (_transformSession: ActiveTransformSession) => undefined
    );
    const onTransformCancel = vi.fn(() => undefined);
    const onSelectionChange = vi.fn();

    const { rerender } = render(
      <ViewportCanvas
        panelId="topLeft"
        world={focusedSceneDocument.world}
        sceneDocument={focusedSceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={focusedSceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "terrains", ids: [focusedTerrain.id] }}
        activeSelectionId={focusedTerrain.id}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={cameraState}
        viewMode="perspective"
        displayMode="authoring"
        layoutMode="single"
        isActivePanel
        focusRequestId={1}
        focusSelection={{ kind: "terrains", ids: [focusedTerrain.id] }}
        onSelectionChange={onSelectionChange}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={onToolPreviewChange}
        onTransformSessionChange={onTransformSessionChange}
        onTransformCommit={onTransformCommit}
        onTransformCancel={onTransformCancel}
      />
    );

    await waitFor(() => {
      expect(viewportHostInstances).toHaveLength(1);
      expect(viewportHostInstances[0].focusSelection).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ViewportCanvas
        panelId="topLeft"
        world={updatedSceneDocument.world}
        sceneDocument={updatedSceneDocument}
        editorSimulationController={new EditorSimulationController()}
        projectAssets={updatedSceneDocument.assets}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        whiteboxSelectionMode="object"
        whiteboxSnapEnabled
        whiteboxSnapStep={1}
        viewportGridVisible={true}
        selection={{ kind: "terrains", ids: [focusedTerrain.id] }}
        activeSelectionId={focusedTerrain.id}
        terrainBrushState={null}
        toolMode="select"
        toolPreview={{ kind: "none" }}
        transformSession={createInactiveTransformSession()}
        cameraState={cameraState}
        viewMode="perspective"
        displayMode="authoring"
        layoutMode="single"
        isActivePanel
        focusRequestId={1}
        focusSelection={{ kind: "terrains", ids: [focusedTerrain.id] }}
        onSelectionChange={onSelectionChange}
        onTerrainBrushCommit={vi.fn(() => true)}
        onCommitCreation={vi.fn(() => true)}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={onToolPreviewChange}
        onTransformSessionChange={onTransformSessionChange}
        onTransformCommit={onTransformCommit}
        onTransformCancel={onTransformCancel}
      />
    );

    expect(viewportHostInstances[0].focusSelection).toHaveBeenCalledTimes(1);
  });
});
