import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { RuntimeHost } from "../runtime-three/runtime-host";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
export function RunnerCanvas({ runtimeScene, projectAssets, loadedModelAssets, loadedImageAssets, loadedAudioAssets, navigationMode, onRuntimeMessageChange, onFirstPersonTelemetryChange, onInteractionPromptChange }) {
    const containerRef = useRef(null);
    const hostRef = useRef(null);
    const [runnerMessage, setRunnerMessage] = useState(null);
    const [interactionPrompt, setInteractionPrompt] = useState(null);
    const [firstPersonTelemetry, setFirstPersonTelemetry] = useState(null);
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
                setFirstPersonTelemetry(null);
                runtimeHost.dispose();
                hostRef.current = null;
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Runner initialization failed.";
            setRunnerMessage(`Runner initialization failed: ${message}`);
            onInteractionPromptChange(null);
            return;
        }
    }, [onFirstPersonTelemetryChange, onInteractionPromptChange, onRuntimeMessageChange]);
    useEffect(() => {
        hostRef.current?.updateAssets(projectAssets, loadedModelAssets, loadedImageAssets, loadedAudioAssets);
    }, [projectAssets, loadedModelAssets, loadedImageAssets, loadedAudioAssets]);
    useEffect(() => {
        hostRef.current?.loadScene(runtimeScene);
    }, [runtimeScene]);
    useEffect(() => {
        hostRef.current?.setNavigationMode(navigationMode);
    }, [navigationMode]);
    return (_jsxs("div", { ref: containerRef, className: `runner-canvas ${navigationMode === "firstPerson" && firstPersonTelemetry?.cameraSubmerged ? "runner-canvas--underwater" : ""}`, "data-testid": "runner-shell", "aria-label": "Built-in scene runner", style: createWorldBackgroundStyle(runtimeScene.world.background, runtimeScene.world.background.mode === "image" ? loadedImageAssets[runtimeScene.world.background.assetId]?.sourceUrl ?? null : null), children: [navigationMode === "firstPerson" && firstPersonTelemetry?.cameraSubmerged ? _jsx("div", { className: "runner-canvas__underwater", "aria-hidden": "true" }) : null, navigationMode === "firstPerson" ? _jsx("div", { className: "runner-canvas__crosshair", "aria-hidden": "true" }) : null, navigationMode === "firstPerson" && interactionPrompt !== null ? (_jsxs("div", { className: "runner-canvas__prompt", "data-testid": "runner-interaction-prompt", role: "status", "aria-live": "polite", children: [_jsx("div", { className: "runner-canvas__prompt-badge", children: "Click" }), _jsx("div", { className: "runner-canvas__prompt-text", "data-testid": "runner-interaction-prompt-text", children: interactionPrompt.prompt }), _jsxs("div", { className: "runner-canvas__prompt-meta", "data-testid": "runner-interaction-prompt-meta", children: [interactionPrompt.distance.toFixed(1), "m away \u00B7 ", interactionPrompt.range.toFixed(1), "m range"] })] })) : null, runnerMessage === null ? null : (_jsxs("div", { className: "runner-canvas__fallback", role: "status", children: [_jsx("div", { className: "runner-canvas__fallback-title", children: "Runner Unavailable" }), _jsx("div", { children: runnerMessage })] }))] }));
}
