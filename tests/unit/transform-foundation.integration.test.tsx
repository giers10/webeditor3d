import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";
import type { ActiveTransformSession, TransformSessionState } from "../../src/core/transform-session";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    panelId: string | null;
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
    setTransformCommitHandler: ReturnType<typeof vi.fn>;
    setTransformCancelHandler: ReturnType<typeof vi.fn>;
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
  const viewportHost = viewportHostInstances.find((instance) => instance.panelId === "topLeft");

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
    expect(getTopLeftViewportHost().setTransformCommitHandler).toHaveBeenCalled();
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

function getLatestTransformSession(store: ReturnType<typeof createEditorStore>): ActiveTransformSession {
  const transformSession = store.getState().viewportTransientState.transformSession;

  if (transformSession.kind !== "active") {
    throw new Error("Expected an active transform session.");
  }

  return transformSession;
}

function emitTransformPreview(
  viewportHost: ReturnType<typeof getTopLeftViewportHost>,
  transformSession: ActiveTransformSession
) {
  const handler = viewportHost.setTransformSessionChangeHandler.mock.calls.at(-1)?.[0] as ((transformSession: TransformSessionState) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Transform session change handler was not registered.");
  }

  act(() => {
    handler(transformSession);
  });
}

function commitTransform(viewportHost: ReturnType<typeof getTopLeftViewportHost>, transformSession: ActiveTransformSession) {
  const handler = viewportHost.setTransformCommitHandler.mock.calls.at(-1)?.[0] as ((transformSession: ActiveTransformSession) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Transform commit handler was not registered.");
  }

  act(() => {
    handler(transformSession);
  });
}

describe("transform foundation integration", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves a whole brush through keyboard entry, axis constraint, and viewport commit", async () => {
    const { store, brush, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Brush Transform Fixture$/ }));
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    expect(store.getState().viewportTransientState.transformSession).toMatchObject({
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

    expect(store.getState().viewportTransientState.transformSession).toMatchObject({
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
        }
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

  it("moves an entity through the shared transform controller", async () => {
    const { store, playerStart, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Player Start Fixture$/ }));
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
    const { store, playerStart, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Player Start Fixture$/ }));
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
    expect(store.getState().document.entities[playerStart.id]).toEqual(playerStart);
  });

  it("moves a model instance through the shared transform controller", async () => {
    const { store, modelInstance, viewportHost } = await renderTransformFixtureApp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Model Transform Fixture$/ }));
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

    expect(store.getState().document.modelInstances[modelInstance.id]).toMatchObject({
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
      fireEvent.click(screen.getByRole("button", { name: /^Brush Transform Fixture$/ }));
    });

    fireEvent.pointerMove(screen.getByTestId("viewport-panel-bottomRight"));
    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });

    expect(store.getState().activeViewportPanelId).toBe("bottomRight");
    expect(store.getState().viewportTransientState.transformSession).toMatchObject({
      kind: "active",
      operation: "translate",
      sourcePanelId: "bottomRight",
      target: {
        kind: "brush",
        brushId: brush.id
      }
    });
  });
});
