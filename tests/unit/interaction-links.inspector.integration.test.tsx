import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
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
    mount = vi.fn();
    dispose = vi.fn();
    updateWorld = vi.fn();
    updateSimulation = vi.fn();
    updateAssets = vi.fn();
    updateDocument = vi.fn();
    updateSelection = vi.fn();
    setPanelId = vi.fn();
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

import { App } from "../../src/app/App";
import { createEditorStore } from "../../src/app/editor-store";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createCameraRigEntity,
  createCameraRigWorldPointTargetRef,
  createInteractableEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";

describe("Interaction link inspector", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authors trigger-volume control links for camera rig overrides", async () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-camera-link"
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-trigger-link",
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      })
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Trigger Control Link Scene" }),
        entities: {
          [triggerVolume.id]: triggerVolume,
          [cameraRig.id]: cameraRig
        }
      }
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    act(() => {
      store.setSelection({
        kind: "entities",
        ids: [triggerVolume.id]
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Control Link" }));

    await waitFor(() => {
      expect(Object.keys(store.getState().document.interactionLinks)).toHaveLength(1);
    });

    const createdLink = Object.values(store.getState().document.interactionLinks)[0];

    if (createdLink === undefined || createdLink.action.type !== "control") {
      throw new Error("Expected a control interaction link to be created.");
    }

    expect(screen.getByTestId(`interaction-link-action-${createdLink.id}`)).toHaveValue(
      "control"
    );
    expect(
      screen.getByTestId(`interaction-link-control-target-${createdLink.id}`)
    ).toHaveValue(`entity:cameraRig:${cameraRig.id}`);
    expect(
      screen.getByTestId(`interaction-link-control-effect-${createdLink.id}`)
    ).toHaveValue("camera.activate");

    fireEvent.change(
      screen.getByTestId(`interaction-link-control-effect-${createdLink.id}`),
      {
        target: {
          value: "camera.clear"
        }
      }
    );

    await waitFor(() => {
      expect(
        store.getState().document.interactionLinks[createdLink.id]
      ).toMatchObject({
        action: {
          type: "control",
          effect: {
            type: "clearCameraRigOverride",
            target: {
              kind: "entity",
              entityKind: "cameraRig",
              entityId: cameraRig.id
            }
          }
        }
      });
    });
  });

  it("authors interactable control links with click-triggered camera rig activation", async () => {
    const interactable = createInteractableEntity({
      id: "entity-interactable-camera-link",
      prompt: "Use Camera Console"
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-interactable-link",
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      })
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Interactable Control Link Scene" }),
        entities: {
          [interactable.id]: interactable,
          [cameraRig.id]: cameraRig
        }
      }
    });

    render(<App store={store} />);

    await waitFor(() => {
      expect(viewportHostInstances.length).toBeGreaterThan(0);
    });

    act(() => {
      store.setSelection({
        kind: "entities",
        ids: [interactable.id]
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Control Link" }));

    await waitFor(() => {
      expect(Object.keys(store.getState().document.interactionLinks)).toHaveLength(1);
    });

    const createdLink = Object.values(store.getState().document.interactionLinks)[0];

    if (createdLink === undefined || createdLink.action.type !== "control") {
      throw new Error("Expected a control interaction link to be created.");
    }

    expect(
      screen.getByTestId(`interaction-link-trigger-${createdLink.id}`)
    ).toHaveValue("On Click");
    expect(
      screen.getByTestId(`interaction-link-control-effect-${createdLink.id}`)
    ).toHaveValue("camera.activate");

    await waitFor(() => {
      expect(
        store.getState().document.interactionLinks[createdLink.id]
      ).toMatchObject({
        trigger: "click",
        action: {
          type: "control",
          effect: {
            type: "activateCameraRigOverride",
            target: {
              kind: "entity",
              entityKind: "cameraRig",
              entityId: cameraRig.id
            }
          }
        }
      });
    });
  });
});
