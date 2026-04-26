import { fireEvent, render, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import type {
  ActiveTransformSession,
  TransformSessionState
} from "../../src/core/transform-session";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    panelId: string | null;
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
    setTransformPreviewChangeHandler: ReturnType<typeof vi.fn>;
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
    panelId: string | null = null;
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    updateSelection = vi.fn();
    setPanelId = vi.fn((panelId: string) => {
      this.panelId = panelId;
    });
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
    setTransformPreviewChangeHandler = vi.fn();
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

function getTopLeftViewportHost() {
  const viewportHost = viewportHostInstances.find(
    (instance) => instance.panelId === "topLeft"
  );

  if (viewportHost === undefined) {
    throw new Error("Top-left viewport host was not mounted.");
  }

  return viewportHost;
}

function emitSelectionChange(
  viewportHost: ReturnType<typeof getTopLeftViewportHost>,
  selection: { kind: "pathPoint"; pathId: string; pointId: string }
) {
  const handler = viewportHost.setBrushSelectionChangeHandler.mock.calls.at(
    -1
  )?.[0] as ((selection: unknown) => void) | undefined;

  if (handler === undefined) {
    throw new Error("Selection change handler was not registered.");
  }

  act(() => {
    handler(selection);
  });
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

describe("Path point editing integration", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves selected path points and supports Shift+W add, delete, undo, and redo", async () => {
    const path = createScenePath({
      id: "path-edit-main",
      name: "Patrol Route",
      points: [
        {
          id: "path-edit-point-a",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-edit-point-b",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Path Editing Fixture" }),
        paths: {
          [path.id]: path
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

    const viewportHost = getTopLeftViewportHost();

    emitSelectionChange(viewportHost, {
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    fireEvent.keyDown(window, {
      key: "g",
      code: "KeyG"
    });
    fireEvent.keyDown(window, {
      key: "x",
      code: "KeyX"
    });

    const transformSession =
      store.getState().viewportTransientState.transformSession;

    if (transformSession.kind !== "active") {
      throw new Error("Expected an active transform session.");
    }

    expect(transformSession.target).toMatchObject({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });
    expect(transformSession.axisConstraint).toBe("x");

    const previewSession: ActiveTransformSession = {
      ...transformSession,
      preview: {
        kind: "pathPoint",
        position: {
          x: 5,
          y: 0,
          z: 0
        }
      }
    };

    emitTransformPreview(viewportHost, previewSession);
    commitTransform(viewportHost, previewSession);

    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual({
      x: 5,
      y: 0,
      z: 0
    });

    fireEvent.keyDown(window, {
      key: "W",
      code: "KeyW",
      shiftKey: true
    });

    await waitFor(() => {
      expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);
    });

    const selectionAfterAdd = store.getState().selection;

    expect(selectionAfterAdd.kind).toBe("pathPoint");
    if (selectionAfterAdd.kind !== "pathPoint") {
      throw new Error("Expected the appended path point to be selected.");
    }

    const appendedPointId = selectionAfterAdd.pointId;

    fireEvent.keyDown(window, {
      key: "Delete",
      code: "Delete"
    });

    await waitFor(() => {
      expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
    });

    expect(
      store.getState().document.paths[path.id]?.points.some(
        (point) => point.id === appendedPointId
      )
    ).toBe(false);

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true
    });

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true
    });

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true
    });

    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual(path.points[1].position);

    fireEvent.keyDown(window, {
      key: "y",
      code: "KeyY",
      ctrlKey: true
    });
    fireEvent.keyDown(window, {
      key: "y",
      code: "KeyY",
      ctrlKey: true
    });
    fireEvent.keyDown(window, {
      key: "y",
      code: "KeyY",
      ctrlKey: true
    });

    expect(
      store.getState().document.paths[path.id]?.points[1]?.position
    ).toEqual({
      x: 5,
      y: 0,
      z: 0
    });
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
  });
});
