import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import type {
  ActiveTransformSession,
  TransformSessionState
} from "../../src/core/transform-session";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import type { ViewportPanelCameraState } from "../../src/viewport-three/viewport-layout";

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

const modelAsset = {
  id: "asset-model-transform-integration",
  kind: "model",
  sourceName: "transform-fixture.glb",
  mimeType: "model/gltf-binary",
  storageKey: createProjectAssetStorageKey("asset-model-transform-integration"),
  byteLength: 64,
  metadata: {
    kind: "model",
    format: "glb",
    sceneName: "Transform Fixture",
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: {
      min: {
        x: -0.5,
        y: 0,
        z: -0.5
      },
      max: {
        x: 0.5,
        y: 1,
        z: 0.5
      },
      size: {
        x: 1,
        y: 1,
        z: 1
      }
    },
    warnings: []
  }
} satisfies ModelAssetRecord;

function getTopLeftViewportHost() {
  const viewportHost = viewportHostInstances.find(
    (instance) => instance.panelId === "topLeft"
  );

  if (viewportHost === undefined) {
    throw new Error("Top-left viewport host was not mounted.");
  }

  return viewportHost;
}

async function renderTransformFixtureApp() {
  const brush = createBoxBrush({
    id: "brush-transform-main",
    name: "Brush Transform Fixture",
    center: {
      x: 0,
      y: 1,
      z: 0
    }
  });
  const playerStart = createPlayerStartEntity({
    id: "entity-player-start-transform",
    name: "Player Start Fixture",
    position: {
      x: 2,
      y: 0,
      z: -2
    },
    yawDegrees: 0
  });
  const modelInstance = createModelInstance({
    id: "model-instance-transform-main",
    assetId: modelAsset.id,
    name: "Model Transform Fixture",
    position: {
      x: -3,
      y: 0,
      z: 3
    }
  });
  const store = createEditorStore({
    initialDocument: {
      ...createEmptySceneDocument({ name: "Transform Fixture" }),
      brushes: {
        [brush.id]: brush
      },
      assets: {
        [modelAsset.id]: modelAsset
      },
      entities: {
        [playerStart.id]: playerStart
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      }
    }
  });

  render(<App store={store} />);

  await waitFor(() => {
    expect(viewportHostInstances.length).toBeGreaterThan(0);
    expect(
      getTopLeftViewportHost().setTransformCommitHandler
    ).toHaveBeenCalled();
  });

  return {
    store,
    brush,
    playerStart,
    modelInstance,
    viewportHost: getTopLeftViewportHost()
  };
}

async function renderQuadTransformFixtureApp() {
  const fixture = await renderTransformFixtureApp();

  act(() => {
    fixture.store.setViewportLayoutMode("quad");
  });

  return fixture;
}

async function renderMultiSelectionFixtureApp() {
  const brushA = createBoxBrush({
    id: "brush-multi-select-a",
    name: "Brush Multi A",
    center: {
      x: -2,
      y: 1,
      z: 0
    }
  });
  const brushB = createBoxBrush({
    id: "brush-multi-select-b",
    name: "Brush Multi B",
    center: {
      x: 4,
      y: 1,
      z: 0
    }
  });
  const playerStart = createPlayerStartEntity({
    id: "entity-multi-select-player",
    name: "Player Multi Fixture",
    position: {
      x: 0,
      y: 0,
      z: -4
    }
  });
  const store = createEditorStore({
    initialDocument: {
      ...createEmptySceneDocument({ name: "Multi Selection Fixture" }),
      brushes: {
        [brushA.id]: brushA,
        [brushB.id]: brushB
      },
      entities: {
        [playerStart.id]: playerStart
      }
    }
  });

  render(<App store={store} />);

  await waitFor(() => {
    expect(viewportHostInstances.length).toBeGreaterThan(0);
    expect(getTopLeftViewportHost().setBrushSelectionChangeHandler).toHaveBeenCalled();
  });

  return {
    store,
    brushA,
    brushB,
    playerStart,
    viewportHost: getTopLeftViewportHost()
  };
}

function getLatestTransformSession(
  store: ReturnType<typeof createEditorStore>
): ActiveTransformSession {
  const transformSession =
    store.getState().viewportTransientState.transformSession;

  if (transformSession.kind !== "active") {
    throw new Error("Expected an active transform session.");
  }

  return transformSession;
}

function emitTransformPreview(
  viewportHost: ReturnType<typeof getTopLeftViewportHost>,
  transformSession: ActiveTransformSession
) {
  const handler = viewportHost.setTransformSessionChangeHandler.mock.calls.at(
    -1
  )?.[0] as ((transformSession: TransformSessionState) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Transform session change handler was not registered.");
  }

  act(() => {
    handler(transformSession);
  });
}

function commitTransform(
  viewportHost: ReturnType<typeof getTopLeftViewportHost>,
  transformSession: ActiveTransformSession
) {
  const handler = viewportHost.setTransformCommitHandler.mock.calls.at(
    -1
  )?.[0] as ((transformSession: ActiveTransformSession) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Transform commit handler was not registered.");
  }

  act(() => {
    handler(transformSession);
  });
}

function emitCameraStateChange(
  viewportHost: ReturnType<typeof getTopLeftViewportHost>,
  cameraState: ViewportPanelCameraState
) {
  const handler = viewportHost.setCameraStateChangeHandler.mock.calls.at(
    -1
  )?.[0] as ((cameraState: ViewportPanelCameraState) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Camera state change handler was not registered.");
  }

  act(() => {
    handler(cameraState);
  });
}

describe("transform foundation integration", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves a whole brush through keyboard entry, axis constraint, and viewport commit", async () => {
    const { store, brush, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      operation: "translate",
      axisConstraint: null,
      target: {
        kind: "brush",
        brushId: brush.id
      }
    });

    fireEvent.keyDown(window, {
      key: "x",
      code: "KeyX"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "x"
    });

    const previewSession = {
      ...getLatestTransformSession(store),
      preview: {
        kind: "brush" as const,
        center: {
          x: 6,
          y: brush.center.y,
          z: brush.center.z
        },
        rotationDegrees: {
          ...brush.rotationDegrees
        },
        size: {
          ...brush.size
        },
        geometry: createBoxBrush({ size: brush.size }).geometry
      }
    };

    emitTransformPreview(viewportHost, previewSession);
    commitTransform(viewportHost, previewSession);

    expect(store.getState().viewportTransientState.transformSession).toEqual({
      kind: "none"
    });
    expect(store.getState().document.brushes[brush.id].center).toEqual({
      x: 6,
      y: brush.center.y,
      z: brush.center.z
    });
  });

  it("rotates and scales a whole whitebox box through the shared transform controller", async () => {
    const { store, brush, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.click(screen.getByTestId("transform-rotate-button"));

    const rotatePreviewSession = {
      ...getLatestTransformSession(store),
      preview: {
        kind: "brush" as const,
        center: {
          ...brush.center
        },
        rotationDegrees: {
          x: 0,
          y: 37.5,
          z: 12.5
        },
        size: {
          ...brush.size
        },
        geometry: createBoxBrush({ size: brush.size }).geometry
      }
    };

    emitTransformPreview(viewportHost, rotatePreviewSession);
    commitTransform(viewportHost, rotatePreviewSession);

    expect(store.getState().document.brushes[brush.id].rotationDegrees).toEqual(
      {
        x: 0,
        y: 37.5,
        z: 12.5
      }
    );

    fireEvent.click(screen.getByTestId("transform-scale-button"));

    const scalePreviewSession = {
      ...getLatestTransformSession(store),
      preview: {
        kind: "brush" as const,
        center: {
          ...brush.center
        },
        rotationDegrees: {
          x: 0,
          y: 37.5,
          z: 12.5
        },
        size: {
          x: 3.5,
          y: 2.5,
          z: 4.5
        },
        geometry: createBoxBrush({
          size: {
            x: 3.5,
            y: 2.5,
            z: 4.5
          }
        }).geometry
      }
    };

    emitTransformPreview(viewportHost, scalePreviewSession);
    commitTransform(viewportHost, scalePreviewSession);

    expect(store.getState().document.brushes[brush.id]).toMatchObject({
      rotationDegrees: {
        x: 0,
        y: 37.5,
        z: 12.5
      },
      size: {
        x: 3.5,
        y: 2.5,
        z: 4.5
      }
    });
  });

  it("keeps transform controls coherent across object and component modes", async () => {
    const { store, brush } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    expect(screen.getByTestId("transform-translate-button")).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByTestId("whitebox-selection-mode-face"));
    });

    expect(store.getState().whiteboxSelectionMode).toBe("face");
    expect(screen.getByTestId("transform-translate-button")).toBeDisabled();
    expect(screen.getByTestId("transform-rotate-button")).toBeDisabled();
    expect(screen.getByTestId("transform-scale-button")).toBeDisabled();

    act(() => {
      store.setSelection({
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posY"
      });
    });

    expect(screen.getByTestId("transform-translate-button")).not.toBeDisabled();
    expect(screen.getByTestId("transform-rotate-button")).not.toBeDisabled();
    expect(screen.getByTestId("transform-scale-button")).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByTestId("whitebox-selection-mode-vertex"));
    });

    act(() => {
      store.setSelection({
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      });
    });

    expect(screen.getByTestId("transform-translate-button")).not.toBeDisabled();
    expect(screen.getByTestId("transform-rotate-button")).toBeDisabled();
    expect(screen.getByTestId("transform-scale-button")).toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByTestId("whitebox-selection-mode-object"));
    });

    expect(store.getState().whiteboxSelectionMode).toBe("object");
    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [brush.id]
    });
    expect(screen.getByTestId("transform-translate-button")).not.toBeDisabled();
  });

  it("switches whitebox selection modes through keyboard shortcuts", async () => {
    const { store, brush } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "1",
      code: "Digit1"
    });

    expect(store.getState().whiteboxSelectionMode).toBe("face");
    expect(screen.getByText(/selection mode set to face/i)).toBeInTheDocument();

    act(() => {
      store.setSelection({
        kind: "brushEdge",
        brushId: brush.id,
        edgeId: "edgeX_posY_negZ"
      });
    });

    fireEvent.keyDown(window, {
      key: "2",
      code: "Digit2"
    });

    expect(store.getState().whiteboxSelectionMode).toBe("edge");
    expect(
      screen.getByTestId("whitebox-selection-mode-edge")
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, {
      key: "3",
      code: "Digit3"
    });

    expect(store.getState().whiteboxSelectionMode).toBe("vertex");
    expect(
      screen.getByTestId("whitebox-selection-mode-vertex")
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, {
      key: "^",
      code: "Digit6",
      shiftKey: true
    });

    expect(store.getState().whiteboxSelectionMode).toBe("object");
    expect(
      screen.getByTestId("whitebox-selection-mode-object")
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/selection mode set to object/i)).toBeInTheDocument();
  });

  it("keeps outliner and viewport selection state synchronized for same-kind multi-selection", async () => {
    const { store, brushA, brushB, playerStart, viewportHost } =
      await renderMultiSelectionFixtureApp();

    await act(async () => {
      fireEvent.click(screen.getByTestId(`outliner-brush-${brushA.id}`));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId(`outliner-brush-${brushB.id}`), {
        shiftKey: true
      });
    });

    expect(store.getState().selection).toEqual({
      kind: "brushes",
      ids: [brushA.id, brushB.id]
    });
    expect(store.getState().activeSelectionId).toBe(brushB.id);
    expect(screen.getByText("Whitebox Solids")).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("Brush Multi B")).toBeInTheDocument();

    const selectionHandler = viewportHost.setBrushSelectionChangeHandler.mock.calls.at(
      -1
    )?.[0] as ((selection: { kind: "entities"; ids: string[] }) => void);

    act(() => {
      selectionHandler({
        kind: "entities",
        ids: [playerStart.id]
      });
    });

    expect(store.getState().selection).toEqual({
      kind: "entities",
      ids: [playerStart.id]
    });
    expect(store.getState().activeSelectionId).toBe(playerStart.id);
  });

  it("moves an entity through the shared transform controller", async () => {
    const { store, playerStart, viewportHost } =
      await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Player Start Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    const previewSession = {
      ...getLatestTransformSession(store),
      preview: {
        kind: "entity" as const,
        position: {
          x: 8,
          y: 0,
          z: -4
        },
        rotation: {
          kind: "yaw" as const,
          yawDegrees: playerStart.yawDegrees
        }
      }
    };

    emitTransformPreview(viewportHost, previewSession);
    commitTransform(viewportHost, previewSession);

    expect(store.getState().document.entities[playerStart.id]).toMatchObject({
      position: {
        x: 8,
        y: 0,
        z: -4
      }
    });
  });

  it("cancels an active transform with Escape without committing preview changes", async () => {
    const { store, playerStart, viewportHost } =
      await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Player Start Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    emitTransformPreview(viewportHost, {
      ...getLatestTransformSession(store),
      preview: {
        kind: "entity",
        position: {
          x: 12,
          y: 0,
          z: -6
        },
        rotation: {
          kind: "yaw",
          yawDegrees: playerStart.yawDegrees
        }
      }
    });

    fireEvent.keyDown(window, {
      key: "Escape",
      code: "Escape"
    });

    expect(store.getState().viewportTransientState.transformSession).toEqual({
      kind: "none"
    });
    expect(store.getState().document.entities[playerStart.id]).toEqual(
      playerStart
    );
  });

  it("moves a model instance through the shared transform controller", async () => {
    const { store, modelInstance, viewportHost } =
      await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Model Transform Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    const previewSession = {
      ...getLatestTransformSession(store),
      preview: {
        kind: "modelInstance" as const,
        position: {
          x: -1,
          y: 0,
          z: 7
        },
        rotationDegrees: {
          ...modelInstance.rotationDegrees
        },
        scale: {
          ...modelInstance.scale
        }
      }
    };

    emitTransformPreview(viewportHost, previewSession);
    commitTransform(viewportHost, previewSession);

    expect(
      store.getState().document.modelInstances[modelInstance.id]
    ).toMatchObject({
      position: {
        x: -1,
        y: 0,
        z: 7
      }
    });
  });

  it("uses the hovered quad viewport as the active transform panel for keyboard entry", async () => {
    const { store, brush } = await renderQuadTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.pointerMove(screen.getByTestId("viewport-panel-bottomRight"), {
      clientX: 24,
      clientY: 24
    });
    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    expect(store.getState().activeViewportPanelId).toBe("bottomRight");
    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      operation: "translate",
      sourcePanelId: "bottomRight",
      target: {
        kind: "brush",
        brushId: brush.id
      }
    });
  });

  it("toggles a repeated axis key from world to local on supported transform targets", async () => {
    const { store } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });
    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "z",
      axisConstraintSpace: "world"
    });

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "z",
      axisConstraintSpace: "local"
    });
    expect(
      screen.getByText(/constrained move to local z\./i)
    ).toBeInTheDocument();
  });

  it("toggles repeated axis keys from world to local while translating a selected edge", async () => {
    const { store, brush } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    await act(async () => {
      fireEvent.keyDown(window, {
        key: "2",
        code: "Digit2"
      });
    });

    act(() => {
      store.setSelection({
        kind: "brushEdge",
        brushId: brush.id,
        edgeId: "edgeX_posY_negZ"
      });
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });
    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      target: {
        kind: "brushEdge",
        brushId: brush.id,
        edgeId: "edgeX_posY_negZ"
      },
      axisConstraint: "z",
      axisConstraintSpace: "world"
    });

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "z",
      axisConstraintSpace: "local"
    });
    expect(
      screen.getByText(/constrained move to local z\./i)
    ).toBeInTheDocument();
  });

  it("toggles repeated axis keys from world to local while translating a selected face", async () => {
    const { store, brush } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    await act(async () => {
      fireEvent.keyDown(window, {
        key: "1",
        code: "Digit1"
      });
    });

    act(() => {
      store.setSelection({
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posY"
      });
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });
    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      target: {
        kind: "brushFace",
        brushId: brush.id,
        faceId: "posY"
      },
      axisConstraint: "z",
      axisConstraintSpace: "world"
    });

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "z",
      axisConstraintSpace: "local"
    });
    expect(
      screen.getByText(/constrained move to local z\./i)
    ).toBeInTheDocument();
  });

  it("toggles repeated axis keys from world to local while translating a selected vertex", async () => {
    const { store, brush } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    await act(async () => {
      fireEvent.keyDown(window, {
        key: "3",
        code: "Digit3"
      });
    });

    act(() => {
      store.setSelection({
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      });
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });
    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      target: {
        kind: "brushVertex",
        brushId: brush.id,
        vertexId: "posX_posY_posZ"
      },
      axisConstraint: "z",
      axisConstraintSpace: "world"
    });

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ"
    });

    expect(
      store.getState().viewportTransientState.transformSession
    ).toMatchObject({
      kind: "active",
      axisConstraint: "z",
      axisConstraintSpace: "local"
    });
    expect(
      screen.getByText(/constrained move to local z\./i)
    ).toBeInTheDocument();
  });

  it("does not reapply the persisted viewport camera state across transform commit, cancel, and delete", async () => {
    const { store, brush, viewportHost } = await renderTransformFixtureApp();
    const persistedCameraState: ViewportPanelCameraState = {
      target: {
        x: 14,
        y: 6,
        z: -9
      },
      perspectiveOrbit: {
        radius: 28,
        theta: 0.84,
        phi: 1.18
      },
      orthographicZoom: 2.4
    };

    emitCameraStateChange(viewportHost, persistedCameraState);

    expect(store.getState().viewportPanels.topLeft.cameraState).toEqual(
      persistedCameraState
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Brush Transform Fixture$/ })
      );
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    const commitCameraCallCount = viewportHost.setCameraState.mock.calls.length;
    commitTransform(viewportHost, {
      ...getLatestTransformSession(store),
      preview: {
        kind: "brush",
        center: {
          x: brush.center.x + 3,
          y: brush.center.y,
          z: brush.center.z
        },
        rotationDegrees: {
          ...brush.rotationDegrees
        },
        size: {
          ...brush.size
        },
        geometry: createBoxBrush({ size: brush.size }).geometry
      }
    });

    expect(viewportHost.setCameraState.mock.calls.length).toBe(
      commitCameraCallCount
    );
    expect(store.getState().viewportPanels.topLeft.cameraState).toEqual(
      persistedCameraState
    );

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    const cancelCameraCallCount = viewportHost.setCameraState.mock.calls.length;

    fireEvent.keyDown(window, {
      key: "Escape",
      code: "Escape"
    });

    expect(viewportHost.setCameraState.mock.calls.length).toBe(
      cancelCameraCallCount
    );
    expect(store.getState().viewportPanels.topLeft.cameraState).toEqual(
      persistedCameraState
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteCameraCallCount = viewportHost.setCameraState.mock.calls.length;

    fireEvent.keyDown(window, {
      key: "Delete",
      code: "Delete"
    });

    expect(viewportHost.setCameraState.mock.calls.length).toBe(
      deleteCameraCallCount
    );
    expect(store.getState().viewportPanels.topLeft.cameraState).toEqual(
      persistedCameraState
    );
  });

  it("toggles viewport grid visibility through the shared viewport host path", async () => {
    const { viewportHost } = await renderTransformFixtureApp();

    const initialCallCount = viewportHost.setGridVisible.mock.calls.length;

    fireEvent.click(screen.getByTestId("viewport-grid-toggle"));

    await waitFor(() => {
      expect(viewportHost.setGridVisible.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
    expect(viewportHost.setGridVisible.mock.calls.at(-1)?.[0]).toBe(false);
    expect(screen.getByText(/viewport grid hidden\./i)).toBeInTheDocument();
  });
});
