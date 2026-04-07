import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import { RunnerCanvas } from "../../src/runner-web/RunnerCanvas";
import type { FirstPersonTelemetry } from "../../src/runtime-three/navigation-controller";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

const { MockRuntimeHost, runtimeHostInstances } = vi.hoisted(() => {
  const runtimeHostInstances: Array<{
    mount: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    loadScene: ReturnType<typeof vi.fn>;
    updateAssets: ReturnType<typeof vi.fn>;
    setNavigationMode: ReturnType<typeof vi.fn>;
    setRuntimeMessageHandler: ReturnType<typeof vi.fn>;
    setFirstPersonTelemetryHandler: ReturnType<typeof vi.fn>;
    setInteractionPromptHandler: ReturnType<typeof vi.fn>;
  }> = [];

  class MockRuntimeHost {
    mount = vi.fn();
    dispose = vi.fn();
    loadScene = vi.fn();
    updateAssets = vi.fn();
    setNavigationMode = vi.fn();
    setRuntimeMessageHandler = vi.fn();
    setFirstPersonTelemetryHandler = vi.fn();
    setInteractionPromptHandler = vi.fn();

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
    const runtimeScene = buildRuntimeSceneFromDocument(createEmptySceneDocument());
    const onTelemetryChange = vi.fn();

    render(
      <RunnerCanvas
        runtimeScene={runtimeScene}
        projectAssets={{}}
        loadedModelAssets={{}}
        loadedImageAssets={{}}
        loadedAudioAssets={{}}
        navigationMode="firstPerson"
        onRuntimeMessageChange={vi.fn()}
        onFirstPersonTelemetryChange={onTelemetryChange}
        onInteractionPromptChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(runtimeHostInstances).toHaveLength(1);
      expect(runtimeHostInstances[0]?.setFirstPersonTelemetryHandler).toHaveBeenCalledTimes(1);
    });

    const publishTelemetry = runtimeHostInstances[0]?.setFirstPersonTelemetryHandler.mock.calls[0]?.[0] as ((telemetry: FirstPersonTelemetry | null) => void) | undefined;

    expect(publishTelemetry).toBeDefined();

    act(() => {
      publishTelemetry?.({
        feetPosition: { x: 0, y: 0, z: 0 },
        eyePosition: { x: 0, y: 1.7, z: 0 },
        grounded: false,
        locomotionState: "swimming",
        inWaterVolume: true,
        cameraSubmerged: false,
        inFogVolume: false,
        pointerLocked: true,
        spawn: runtimeScene.spawn
      });
    });

    expect(screen.queryByLabelText("Built-in scene runner")?.className).not.toContain("runner-canvas--underwater");
    expect(document.querySelector(".runner-canvas__underwater")).toBeNull();

    act(() => {
      publishTelemetry?.({
        feetPosition: { x: 0, y: 0, z: 0 },
        eyePosition: { x: 0, y: 0.4, z: 0 },
        grounded: false,
        locomotionState: "swimming",
        inWaterVolume: true,
        cameraSubmerged: true,
        inFogVolume: false,
        pointerLocked: true,
        spawn: runtimeScene.spawn
      });
    });

    expect(screen.getByLabelText("Built-in scene runner").className).toContain("runner-canvas--underwater");
    expect(document.querySelector(".runner-canvas__underwater")).not.toBeNull();
  });
});