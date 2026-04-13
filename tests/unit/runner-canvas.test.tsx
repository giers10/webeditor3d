import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultSceneLoadingScreenSettings,
  createEmptySceneDocument
} from "../../src/document/scene-document";
import { RunnerCanvas } from "../../src/runner-web/RunnerCanvas";
import type { FirstPersonTelemetry } from "../../src/runtime-three/navigation-controller";
import type { RuntimeSceneLoadState } from "../../src/runtime-three/runtime-host";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

function createSwimmingTelemetry(
  runtimeScene: ReturnType<typeof buildRuntimeSceneFromDocument>,
  cameraSubmerged: boolean
): FirstPersonTelemetry {
  const signals = {
    jumpStarted: false,
    leftGround: false,
    startedFalling: false,
    landed: false,
    enteredWater: false,
    exitedWater: false,
    wallContactStarted: false,
    headBump: false
  };

  return {
    feetPosition: { x: 0, y: 0, z: 0 },
    eyePosition: { x: 0, y: cameraSubmerged ? 0.4 : 1.7, z: 0 },
    grounded: false,
    locomotionState: {
      locomotionMode: "swimming",
      airborneKind: null,
      gait: "walk",
      grounded: false,
      crouched: false,
      sprinting: false,
      inputMagnitude: 1,
      requestedPlanarSpeed: runtimeScene.playerMovement.moveSpeed,
      planarSpeed: runtimeScene.playerMovement.moveSpeed,
      verticalVelocity: 0,
      contact: {
        collisionCount: 0,
        collidedAxes: {
          x: false,
          y: false,
          z: false
        },
        groundNormal: null,
        groundDistance: null,
        slopeDegrees: null
      }
    },
    movement: runtimeScene.playerMovement,
    inWaterVolume: true,
    cameraSubmerged,
    inFogVolume: false,
    pointerLocked: true,
    spawn: runtimeScene.spawn,
    signals,
    hooks: {
      camera: {
        jumping: false,
        falling: false,
        landing: false,
        swimming: true,
        underwaterAmount: cameraSubmerged ? 1 : 0.55
      },
      audio: {
        underwaterAmount: cameraSubmerged ? 1 : 0.55,
        enteredWater: false,
        exitedWater: false
      },
      animation: {
        locomotionMode: "swimming",
        airborneKind: null,
        gait: "walk",
        moving: true,
        movementAmount: 1,
        grounded: false,
        crouched: false,
        sprinting: false,
        inWater: true,
        signals
      }
    }
  };
}

const { MockRuntimeHost, runtimeHostInstances } = vi.hoisted(() => {
  const runtimeHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    loadScene: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    setNavigationMode: ReturnType<typeof vi.fn>;
    setRuntimeClockStateHandler: ReturnType<typeof vi.fn>;
    setRuntimeMessageHandler: ReturnType<typeof vi.fn>;
    setFirstPersonTelemetryHandler: ReturnType<typeof vi.fn>;
    setInteractionPromptHandler: ReturnType<typeof vi.fn>;
    setSceneLoadStateHandler: ReturnType<typeof vi.fn>;
    setSceneExitHandler: ReturnType<typeof vi.fn>;
  }> = [];

  class MockRuntimeHost {
    mount = vi.fn();
    dispose = vi.fn();
    loadScene = vi.fn();
    updateAssets = vi.fn();
    setNavigationMode = vi.fn();
    setRuntimeClockStateHandler = vi.fn();
    setRuntimeMessageHandler = vi.fn();
    setFirstPersonTelemetryHandler = vi.fn();
    setInteractionPromptHandler = vi.fn();
    setSceneLoadStateHandler = vi.fn();
    setSceneExitHandler = vi.fn();

    constructor() {
      runtimeHostInstances.push(this);
    }
  }

  return {
    MockRuntimeHost,
    runtimeHostInstances
  };
});

vi.mock("../../src/runtime-three/runtime-host", () => ({
  RuntimeHost: MockRuntimeHost
}));

describe("RunnerCanvas", () => {
  beforeEach(() => {
    runtimeHostInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only shows the underwater overlay when the camera is submerged", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    const onTelemetryChange = vi.fn();

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Underwater Test"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={onTelemetryChange}
        onInteractionPromptChange={vi.fn()}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
      expect(
        runtimeHostInstances[0]?.setFirstPersonTelemetryHandler
      ).toHaveBeenCalledTimes(1);
      expect(
        runtimeHostInstances[0]?.setSceneLoadStateHandler
      ).toHaveBeenCalledTimes(1);
    });

    const publishTelemetry = runtimeHostInstances[0]
      ?.setFirstPersonTelemetryHandler.mock.calls[0]?.[0] as
      | ((telemetry: FirstPersonTelemetry | null) => void)
      | undefined;
    const publishSceneLoadState = runtimeHostInstances[0]
      ?.setSceneLoadStateHandler.mock.calls[0]?.[0] as
      | ((state: RuntimeSceneLoadState) => void)
      | undefined;

    expect(publishTelemetry).toBeDefined();
    expect(publishSceneLoadState).toBeDefined();

    act(() => {
      publishSceneLoadState?.({
        status: "ready",
        message: null
      });
    });

    act(() => {
      publishTelemetry?.(createSwimmingTelemetry(runtimeScene, false));
    });

    expect(
      screen.queryByLabelText("Built-in scene runner")?.className
    ).not.toContain("runner-canvas--underwater");
    expect(document.querySelector(".runner-canvas__underwater")).toBeNull();

    act(() => {
      publishTelemetry?.(createSwimmingTelemetry(runtimeScene, true));
    });

    expect(screen.getByLabelText("Built-in scene runner").className).toContain(
      "runner-canvas--underwater"
    );
    expect(document.querySelector(".runner-canvas__underwater")).not.toBeNull();
  });

  it("shows the loading overlay until the runtime host reports readiness", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Dungeon Entry"
        sceneLoadingScreen={{
          colorHex: "#223344",
          headline: "Preparing encounter",
          description: "Enemies and triggers are being wired up."
        }}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={vi.fn()}
        onInteractionPromptChange={vi.fn()}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
      expect(
        runtimeHostInstances[0]?.setSceneLoadStateHandler
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByTestId("runner-loading-overlay").className
    ).not.toContain("runner-canvas__loading-overlay--hidden");
    expect(screen.getByTestId("runner-loading-scene-name")).toHaveTextContent(
      "Dungeon Entry"
    );
    expect(screen.getByTestId("runner-loading-headline")).toHaveTextContent(
      "Preparing encounter"
    );
    expect(screen.getByTestId("runner-loading-description")).toHaveTextContent(
      "Enemies and triggers are being wired up."
    );
    expect(document.querySelector(".runner-canvas__crosshair")).toBeNull();
    expect(screen.getByTestId("runner-shell")).toHaveAttribute(
      "aria-busy",
      "true"
    );

    const publishSceneLoadState = runtimeHostInstances[0]
      ?.setSceneLoadStateHandler.mock.calls[0]?.[0] as
      | ((state: RuntimeSceneLoadState) => void)
      | undefined;

    act(() => {
      publishSceneLoadState?.({
        status: "ready",
        message: null
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("runner-loading-overlay").className).toContain(
        "runner-canvas__loading-overlay--hidden"
      );
    });
    expect(document.querySelector(".runner-canvas__crosshair")).not.toBeNull();
    expect(screen.getByTestId("runner-shell")).toHaveAttribute(
      "aria-busy",
      "false"
    );
  });

  it("keeps the overlay visible and shows load errors from the runtime host", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Broken Scene"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={vi.fn()}
        onInteractionPromptChange={vi.fn()}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        runtimeHostInstances[0]?.setSceneLoadStateHandler
      ).toHaveBeenCalledTimes(1);
    });

    const publishSceneLoadState = runtimeHostInstances[0]
      ?.setSceneLoadStateHandler.mock.calls[0]?.[0] as
      | ((state: RuntimeSceneLoadState) => void)
      | undefined;

    act(() => {
      publishSceneLoadState?.({
        status: "error",
        message: "Runner scene failed to load: collision bootstrap exploded."
      });
    });

    expect(
      screen.getByTestId("runner-loading-overlay").className
    ).not.toContain("runner-canvas__loading-overlay--hidden");
    expect(screen.getByTestId("runner-loading-error")).toHaveTextContent(
      "Runner scene failed to load: collision bootstrap exploded."
    );
    expect(document.querySelector(".runner-canvas__crosshair")).toBeNull();
  });

  it("does not recreate the runtime host when the scene-exit callback identity changes", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    const onRuntimeMessageChange = vi.fn();
    const onFirstPersonTelemetryChange = vi.fn();
    const onInteractionPromptChange = vi.fn();
    const { rerender } = render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Stable Runner"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={onRuntimeMessageChange}
        onFirstPersonTelemetryChange={onFirstPersonTelemetryChange}
        onInteractionPromptChange={onInteractionPromptChange}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
      expect(runtimeHostInstances[0]?.loadScene).toHaveBeenCalledTimes(1);
    });

    rerender(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Stable Runner"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={onRuntimeMessageChange}
        onFirstPersonTelemetryChange={onFirstPersonTelemetryChange}
        onInteractionPromptChange={onInteractionPromptChange}
        onSceneExitActivated={vi.fn()}
      />
    );

    expect(runtimeHostInstances).toHaveLength(1);
    expect(runtimeHostInstances[0]?.loadScene).toHaveBeenCalledTimes(1);
    expect(
      runtimeHostInstances[0]?.setSceneExitHandler
    ).toHaveBeenCalledTimes(2);
  });

  it("does not render a DOM night background overlay because the runtime host owns background blending", async () => {
    const document = createEmptySceneDocument();
    document.assets["asset-night-sky"] = {
      id: "asset-night-sky",
      kind: "image",
      sourceName: "night-sky.png",
      mimeType: "image/png",
      storageKey: "project-asset:asset-night-sky",
      byteLength: 2048,
      metadata: {
        kind: "image",
        width: 1024,
        height: 512,
        hasAlpha: false,
        warnings: []
      }
    };
    document.world.timeOfDay.night.background = {
      mode: "image",
      assetId: "asset-night-sky",
      environmentIntensity: 0.42
    };
    const runtimeScene = buildRuntimeSceneFromDocument(document);

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        runtimeClock={{
          timeOfDayHours: 0,
          dayCount: 0,
          dayLengthMinutes: runtimeScene.time.dayLengthMinutes
        }}
        sceneName="Night Runner"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{
          "asset-night-sky": {
            sourceUrl: "/night-sky.png"
          } as never
        }}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={vi.fn()}
        onInteractionPromptChange={vi.fn()}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
    });

    expect(
      screen.queryByTestId("runner-night-background-overlay")
    ).toBeNull();
  });

  it("keeps the crosshair hidden in third-person mode while still showing interaction prompts", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        sceneName="Third Person Runner"
        sceneLoadingScreen={createDefaultSceneLoadingScreenSettings()}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="thirdPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={vi.fn()}
        onInteractionPromptChange={vi.fn()}
        onSceneExitActivated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
      expect(
        runtimeHostInstances[0]?.setSceneLoadStateHandler
      ).toHaveBeenCalledTimes(1);
    });

    const publishSceneLoadState = runtimeHostInstances[0]
      ?.setSceneLoadStateHandler.mock.calls[0]?.[0] as
      | ((state: RuntimeSceneLoadState) => void)
      | undefined;
    const publishInteractionPrompt = runtimeHostInstances[0]
      ?.setInteractionPromptHandler.mock.calls[0]?.[0] as
      | ((prompt: {
          sourceEntityId: string;
          prompt: string;
          distance: number;
          range: number;
        } | null) => void)
      | undefined;

    act(() => {
      publishSceneLoadState?.({
        status: "ready",
        message: null
      });
      publishInteractionPrompt?.({
        sourceEntityId: "entity-interactable-console",
        prompt: "Use Console",
        distance: 1.2,
        range: 2
      });
    });

    expect(document.querySelector(".runner-canvas__crosshair")).toBeNull();
    expect(screen.getByTestId("runner-interaction-prompt")).toBeVisible();
    expect(screen.getByTestId("runner-interaction-prompt-text")).toHaveTextContent(
      "Use Console"
    );
  });
});
