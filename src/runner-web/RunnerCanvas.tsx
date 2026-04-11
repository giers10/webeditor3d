import { useEffect, useRef, useState } from "react";

import type { LoadedAudioAsset } from "../assets/audio-assets";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { SceneLoadingScreenSettings } from "../document/scene-document";
import type { FirstPersonTelemetry } from "../runtime-three/navigation-controller";
import {
  RuntimeHost,
  type RuntimeSceneExitTransitionRequest,
  type RuntimeSceneLoadState
} from "../runtime-three/runtime-host";
import type { RuntimeInteractionPrompt } from "../runtime-three/runtime-interaction-system";
import type {
  RuntimeNavigationMode,
  RuntimeSceneDefinition
} from "../runtime-three/runtime-scene-build";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";

interface RunnerCanvasProps {
  runtimeScene: RuntimeSceneDefinition;
  sceneName: string;
  sceneLoadingScreen: SceneLoadingScreenSettings;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  loadedAudioAssets: Record<string, LoadedAudioAsset>;
  navigationMode: RuntimeNavigationMode;
  onRuntimeMessageChange(message: string | null): void;
  onFirstPersonTelemetryChange(telemetry: FirstPersonTelemetry | null): void;
  onInteractionPromptChange(prompt: RuntimeInteractionPrompt | null): void;
  onSceneExitActivated(request: RuntimeSceneExitTransitionRequest): void;
}

export function RunnerCanvas({
  runtimeScene,
  sceneName,
  sceneLoadingScreen,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  loadedAudioAssets,
  navigationMode,
  onRuntimeMessageChange,
  onFirstPersonTelemetryChange,
  onInteractionPromptChange,
  onSceneExitActivated
}: RunnerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<RuntimeHost | null>(null);
  const [runnerMessage, setRunnerMessage] = useState<string | null>(null);
  const [sceneLoadState, setSceneLoadState] = useState<RuntimeSceneLoadState>({
    status: "loading",
    message: null
  });
  const [interactionPrompt, setInteractionPrompt] =
    useState<RuntimeInteractionPrompt | null>(null);
  const [firstPersonTelemetry, setFirstPersonTelemetry] =
    useState<FirstPersonTelemetry | null>(null);
  const overlayMessage = runnerMessage ?? sceneLoadState.message;
  const overlayStatus =
    overlayMessage !== null ? "error" : sceneLoadState.status;
  const runnerReady = overlayStatus === "ready";

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    try {
      const runtimeHost = new RuntimeHost({
        enableRendering: true
      });
      hostRef.current = runtimeHost;
      runtimeHost.mount(container);
      runtimeHost.setRuntimeMessageHandler(onRuntimeMessageChange);
      runtimeHost.setSceneLoadStateHandler(setSceneLoadState);
      runtimeHost.setFirstPersonTelemetryHandler((telemetry) => {
        setFirstPersonTelemetry(telemetry);
        onFirstPersonTelemetryChange(telemetry);
      });
      runtimeHost.setInteractionPromptHandler((prompt) => {
        setInteractionPrompt(prompt);
        onInteractionPromptChange(prompt);
      });
      setRunnerMessage(null);

      return () => {
        onInteractionPromptChange(null);
        onFirstPersonTelemetryChange(null);
        setFirstPersonTelemetry(null);
        setInteractionPrompt(null);
        runtimeHost.dispose();
        hostRef.current = null;
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Runner initialization failed.";
      const failureMessage = `Runner initialization failed: ${message}`;
      setRunnerMessage(failureMessage);
      setSceneLoadState({
        status: "error",
        message: failureMessage
      });
      onRuntimeMessageChange(failureMessage);
      onInteractionPromptChange(null);
      onFirstPersonTelemetryChange(null);
      return;
    }
  }, [
    onFirstPersonTelemetryChange,
    onInteractionPromptChange,
    onRuntimeMessageChange
  ]);

  useEffect(() => {
    hostRef.current?.setSceneExitHandler(onSceneExitActivated);
  }, [onSceneExitActivated]);

  useEffect(() => {
    hostRef.current?.updateAssets(
      projectAssets,
      loadedModelAssets,
      loadedImageAssets,
      loadedAudioAssets
    );
  }, [projectAssets, loadedModelAssets, loadedImageAssets, loadedAudioAssets]);

  useEffect(() => {
    setRunnerMessage(null);
    setSceneLoadState({
      status: "loading",
      message: null
    });
    setInteractionPrompt(null);
    setFirstPersonTelemetry(null);
    onInteractionPromptChange(null);
    onFirstPersonTelemetryChange(null);
    onRuntimeMessageChange(null);
    hostRef.current?.setNavigationMode(navigationMode);
    hostRef.current?.loadScene(runtimeScene);
  }, [
    navigationMode,
    onFirstPersonTelemetryChange,
    onInteractionPromptChange,
    onRuntimeMessageChange,
    runtimeScene
  ]);

  useEffect(() => {
    hostRef.current?.setNavigationMode(navigationMode);
  }, [navigationMode]);

  return (
    <div
      ref={containerRef}
      className={`runner-canvas ${navigationMode === "firstPerson" && firstPersonTelemetry?.cameraSubmerged ? "runner-canvas--underwater" : ""}`}
      data-testid="runner-shell"
      aria-label="Built-in scene runner"
      aria-busy={!runnerReady}
      style={createWorldBackgroundStyle(
        runtimeScene.world.background,
        runtimeScene.world.background.mode === "image"
          ? (loadedImageAssets[runtimeScene.world.background.assetId]
              ?.sourceUrl ?? null)
          : null
      )}
    >
      <div
        className={`runner-canvas__loading-overlay ${runnerReady ? "runner-canvas__loading-overlay--hidden" : ""}`}
        data-testid="runner-loading-overlay"
        aria-hidden={runnerReady}
        role={overlayStatus === "error" ? "alert" : "status"}
        aria-live="polite"
        style={{
          background: `linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.3) 100%), ${sceneLoadingScreen.colorHex}`
        }}
      >
        <div className="runner-canvas__loading-card">
          <div className="runner-canvas__loading-badge">
            {overlayStatus === "error" ? "Load Failed" : "Loading Scene"}
          </div>
          <div
            className="runner-canvas__loading-scene-name"
            data-testid="runner-loading-scene-name"
          >
            {sceneName}
          </div>
          {sceneLoadingScreen.headline === null ? null : (
            <div
              className="runner-canvas__loading-headline"
              data-testid="runner-loading-headline"
            >
              {sceneLoadingScreen.headline}
            </div>
          )}
          {sceneLoadingScreen.description === null ? null : (
            <div
              className="runner-canvas__loading-description"
              data-testid="runner-loading-description"
            >
              {sceneLoadingScreen.description}
            </div>
          )}
          {overlayMessage === null ? null : (
            <div
              className="runner-canvas__loading-error"
              data-testid="runner-loading-error"
            >
              {overlayMessage}
            </div>
          )}
        </div>
      </div>
      {runnerReady &&
      navigationMode === "firstPerson" &&
      firstPersonTelemetry?.cameraSubmerged ? (
        <div className="runner-canvas__underwater" aria-hidden="true" />
      ) : null}
      {runnerReady && navigationMode === "firstPerson" ? (
        <div className="runner-canvas__crosshair" aria-hidden="true" />
      ) : null}
      {runnerReady && interactionPrompt !== null ? (
        <div
          className="runner-canvas__prompt"
          data-testid="runner-interaction-prompt"
          role="status"
          aria-live="polite"
        >
          <div className="runner-canvas__prompt-badge">Click</div>
          <div
            className="runner-canvas__prompt-text"
            data-testid="runner-interaction-prompt-text"
          >
            {interactionPrompt.prompt}
          </div>
          <div
            className="runner-canvas__prompt-meta"
            data-testid="runner-interaction-prompt-meta"
          >
            {interactionPrompt.distance.toFixed(1)}m away ·{" "}
            {interactionPrompt.range.toFixed(1)}m range
          </div>
        </div>
      ) : null}
      {runnerMessage === null ? null : (
        <div className="runner-canvas__fallback" role="status">
          <div className="runner-canvas__fallback-title">
            Runner Unavailable
          </div>
          <div>{runnerMessage}</div>
        </div>
      )}
    </div>
  );
}
