import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
  const viewportHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    updateWorld: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
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
    updateAssets = vi.fn();
    updateDocument = vi.fn();
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
import { createPlayerStartEntity } from "../../src/entities/entity-instances";

describe("Player Start inspector", () => {
  beforeEach(() => {
    viewportHostInstances.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({}) as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the authored movement template dropdown for a selected Player Start", async () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-inspector",
      name: "Inspector Player Start"
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Player Start Inspector Scene" }),
        entities: {
          [playerStart.id]: playerStart
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
        ids: [playerStart.id]
      });
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("player-start-movement-template")
      ).toHaveValue("default");
    });

    expect(store.getState().document.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      movementTemplate: {
        kind: "default"
      }
    });

    expect(screen.getByTestId("player-start-movement-move-speed")).toHaveValue(
      4.5
    );
    expect(screen.getByTestId("player-start-movement-jump-enabled")).toBeChecked();
  });

  it("lets the inspector switch to a custom movement template and persist authored settings", async () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-custom-template",
      name: "Custom Template"
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Custom Template Scene" }),
        entities: {
          [playerStart.id]: playerStart
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
        ids: [playerStart.id]
      });
    });

    const templateSelect = await screen.findByTestId(
      "player-start-movement-template"
    );
    const moveSpeedInput = screen.getByTestId(
      "player-start-movement-move-speed"
    );
    const variableJumpCheckbox = screen.getByTestId(
      "player-start-movement-variable-jump-enabled"
    );
    const airDirectionOnlyCheckbox = screen.getByTestId(
      "player-start-movement-air-direction-only-enabled"
    );
    const jumpBufferInput = screen.getByTestId(
      "player-start-movement-jump-buffer"
    );

    act(() => {
      fireEvent.change(templateSelect, {
        target: {
          value: "responsive"
        }
      });
    });

    await waitFor(() => {
      expect(store.getState().document.entities[playerStart.id]).toMatchObject({
        movementTemplate: {
          kind: "responsive",
          jump: {
            bufferMs: 120,
            coyoteTimeMs: 120,
            variableHeight: true
          }
        }
      });
    });

    act(() => {
      fireEvent.change(moveSpeedInput, {
        target: {
          value: "5.7"
        }
      });
      fireEvent.blur(moveSpeedInput);
    });

    act(() => {
      fireEvent.click(variableJumpCheckbox);
    });

    act(() => {
      fireEvent.click(airDirectionOnlyCheckbox);
    });

    act(() => {
      fireEvent.change(jumpBufferInput, {
        target: {
          value: "75"
        }
      });
      fireEvent.blur(jumpBufferInput);
    });

    await waitFor(() => {
      expect(store.getState().document.entities[playerStart.id]).toMatchObject({
        movementTemplate: {
          kind: "custom",
          moveSpeed: 5.7,
          jump: {
            bufferMs: 75,
            variableHeight: false,
            directionOnly: true
          }
        }
      });
    });
  });

  it("shows authored jump, sprint, and crouch bindings for a selected Player Start", async () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-locomotion-bindings",
      name: "Locomotion Bindings"
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({ name: "Player Start Binding Scene" }),
        entities: {
          [playerStart.id]: playerStart
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
        ids: [playerStart.id]
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("player-start-keyboard-binding-jump")).toBeVisible();
    });

    expect(screen.getByTestId("player-start-gamepad-binding-jump")).toHaveValue(
      "buttonSouth"
    );
    expect(
      screen.getByTestId("player-start-gamepad-binding-sprint")
    ).toHaveValue("leftStickPress");
    expect(
      screen.getByTestId("player-start-gamepad-binding-crouch")
    ).toHaveValue("buttonEast");
  });
});
