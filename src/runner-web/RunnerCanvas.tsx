import { useEffect, useRef, useState } from "react";

import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { FirstPersonTelemetry } from "../runtime-three/navigation-controller";
import { RuntimeHost } from "../runtime-three/runtime-host";
import type { RuntimeInteractionPrompt } from "../runtime-three/runtime-interaction-system";
import type { RuntimeNavigationMode, RuntimeSceneDefinition } from "../runtime-three/runtime-scene-build";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";

interface RunnerCanvasProps {
  runtimeScene: RuntimeSceneDefinition;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  navigationMode: RuntimeNavigationMode;
  onRuntimeMessageChange(message: string | null): void;
  onFirstPersonTelemetryChange(telemetry: FirstPersonTelemetry | null): void;
  onInteractionPromptChange(prompt: RuntimeInteractionPrompt | null): void;
}

export function RunnerCanvas({
  runtimeScene,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  navigationMode,
  onRuntimeMessageChange,
  onFirstPersonTelemetryChange,
  onInteractionPromptChange
}: RunnerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<RuntimeHost | null>(null);
  const [runnerMessage, setRunnerMessage] = useState<string | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<RuntimeInteractionPrompt | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    const testCanvas = document.createElement("canvas");
    const hasWebGl =
      testCanvas.getContext("webgl2") !== null ||
      testCanvas.getContext("webgl") !== null ||
      testCanvas.getContext("experimental-webgl") !== null;

    try {
      const runtimeHost = new RuntimeHost({
        enableRendering: hasWebGl
      });
      hostRef.current = runtimeHost;
      runtimeHost.mount(container);
      runtimeHost.setRuntimeMessageHandler(onRuntimeMessageChange);
      runtimeHost.setFirstPersonTelemetryHandler(onFirstPersonTelemetryChange);
      runtimeHost.setInteractionPromptHandler((prompt) => {
        setInteractionPrompt(prompt);
        onInteractionPromptChange(prompt);
      });
      setRunnerMessage(
        hasWebGl ? null : "WebGL is unavailable in this browser environment. The runner shell is visible, but runtime rendering is disabled."
      );

      return () => {
        onInteractionPromptChange(null);
        runtimeHost.dispose();
        hostRef.current = null;
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Runner initialization failed.";
      setRunnerMessage(`Runner initialization failed: ${message}`);
      onInteractionPromptChange(null);
      return;
    }
  }, [onFirstPersonTelemetryChange, onInteractionPromptChange, onRuntimeMessageChange]);

  useEffect(() => {
    hostRef.current?.updateAssets(projectAssets, loadedModelAssets, loadedImageAssets);
  }, [projectAssets, loadedModelAssets, loadedImageAssets]);

  useEffect(() => {
    hostRef.current?.loadScene(runtimeScene);
  }, [runtimeScene]);

  useEffect(() => {
    hostRef.current?.setNavigationMode(navigationMode);
  }, [navigationMode]);

  return (
    <div
      ref={containerRef}
      className="runner-canvas"
      data-testid="runner-shell"
      aria-label="Built-in scene runner"
      style={createWorldBackgroundStyle(
        runtimeScene.world.background,
        runtimeScene.world.background.mode === "image" ? loadedImageAssets[runtimeScene.world.background.assetId]?.sourceUrl ?? null : null
      )}
    >
      {navigationMode === "firstPerson" ? <div className="runner-canvas__crosshair" aria-hidden="true" /> : null}
      {navigationMode === "firstPerson" && interactionPrompt !== null ? (
        <div className="runner-canvas__prompt" data-testid="runner-interaction-prompt" role="status" aria-live="polite">
          <div className="runner-canvas__prompt-badge">Click</div>
          <div className="runner-canvas__prompt-text" data-testid="runner-interaction-prompt-text">
            {interactionPrompt.prompt}
          </div>
          <div className="runner-canvas__prompt-meta" data-testid="runner-interaction-prompt-meta">
            {interactionPrompt.distance.toFixed(1)}m away · {interactionPrompt.range.toFixed(1)}m range
          </div>
        </div>
      ) : null}
      {runnerMessage === null ? null : (
        <div className="runner-canvas__fallback" role="status">
          <div className="runner-canvas__fallback-title">Runner Unavailable</div>
          <div>{runnerMessage}</div>
        </div>
      )}
    </div>
  );
}
