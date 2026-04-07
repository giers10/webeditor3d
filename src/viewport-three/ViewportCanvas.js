import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { getWhiteboxSelectionFeedbackLabel } from "../core/whitebox-selection-feedback";
import { getWhiteboxSelectionModeLabel } from "../core/whitebox-selection-mode";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import { getViewportPanelLabel } from "./viewport-layout";
import { getViewportViewModeLabel } from "./viewport-view-modes";
import { ViewportHost } from "./viewport-host";
export function ViewportCanvas({ panelId, world, sceneDocument, projectAssets, loadedModelAssets, loadedImageAssets, whiteboxSelectionMode, whiteboxSnapEnabled, whiteboxSnapStep, selection, toolMode, toolPreview, transformSession, cameraState, viewMode, displayMode, layoutMode, isActivePanel, focusRequestId, focusSelection, onSelectionChange, onCommitCreation, onCameraStateChange, onToolPreviewChange, onTransformSessionChange, onTransformCommit, onTransformCancel }) {
    const containerRef = useRef(null);
    const hostRef = useRef(null);
    const shouldRenderPanel = layoutMode === "quad" || isActivePanel;
    const [viewportMessage, setViewportMessage] = useState(null);
    const [hoveredWhiteboxLabel, setHoveredWhiteboxLabel] = useState(null);
    useEffect(() => {
        const container = containerRef.current;
        if (container === null) {
            return;
        }
        try {
            const viewportHost = new ViewportHost();
            hostRef.current = viewportHost;
            viewportHost.setPanelId(panelId);
            viewportHost.setRenderEnabled(shouldRenderPanel);
            viewportHost.mount(container);
            setViewportMessage(null);
            return () => {
                viewportHost.dispose();
                hostRef.current = null;
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Viewport initialization failed.";
            setViewportMessage(`Viewport initialization failed: ${message}`);
            return;
        }
    }, []);
    useEffect(() => {
        hostRef.current?.setRenderEnabled(shouldRenderPanel);
    }, [shouldRenderPanel]);
    useEffect(() => {
        hostRef.current?.setPanelId(panelId);
    }, [panelId]);
    useEffect(() => {
        hostRef.current?.updateWorld(world);
    }, [world]);
    useEffect(() => {
        hostRef.current?.updateAssets(projectAssets, loadedModelAssets, loadedImageAssets);
    }, [projectAssets, loadedModelAssets, loadedImageAssets]);
    useEffect(() => {
        hostRef.current?.setWhiteboxSnapSettings(whiteboxSnapEnabled, whiteboxSnapStep);
    }, [whiteboxSnapEnabled, whiteboxSnapStep]);
    useEffect(() => {
        hostRef.current?.setWhiteboxSelectionMode(whiteboxSelectionMode);
    }, [whiteboxSelectionMode]);
    useEffect(() => {
        hostRef.current?.updateDocument(sceneDocument, selection);
    }, [sceneDocument, selection]);
    useEffect(() => {
        hostRef.current?.setViewMode(viewMode);
    }, [viewMode]);
    useEffect(() => {
        hostRef.current?.setDisplayMode(displayMode);
    }, [displayMode]);
    useEffect(() => {
        hostRef.current?.setCameraState(cameraState);
    }, [cameraState]);
    useEffect(() => {
        hostRef.current?.setBrushSelectionChangeHandler(onSelectionChange);
    }, [onSelectionChange]);
    useEffect(() => {
        hostRef.current?.setWhiteboxHoverLabelChangeHandler(setHoveredWhiteboxLabel);
    }, []);
    useEffect(() => {
        hostRef.current?.setCameraStateChangeHandler(onCameraStateChange);
    }, [onCameraStateChange]);
    useEffect(() => {
        hostRef.current?.setCreationPreviewChangeHandler((nextToolPreview) => {
            onToolPreviewChange(nextToolPreview.kind === "create"
                ? {
                    ...nextToolPreview,
                    sourcePanelId: panelId
                }
                : nextToolPreview);
        });
    }, [onToolPreviewChange, panelId]);
    useEffect(() => {
        hostRef.current?.setCreationCommitHandler(onCommitCreation);
    }, [onCommitCreation]);
    useEffect(() => {
        hostRef.current?.setTransformSessionChangeHandler(onTransformSessionChange);
    }, [onTransformSessionChange]);
    useEffect(() => {
        hostRef.current?.setTransformCommitHandler(onTransformCommit);
    }, [onTransformCommit]);
    useEffect(() => {
        hostRef.current?.setTransformCancelHandler(onTransformCancel);
    }, [onTransformCancel]);
    useEffect(() => {
        hostRef.current?.setToolMode(toolMode);
    }, [toolMode]);
    useEffect(() => {
        hostRef.current?.setCreationPreview(toolMode === "create" && toolPreview.kind === "create" ? toolPreview : null);
    }, [toolMode, toolPreview]);
    useEffect(() => {
        hostRef.current?.setTransformSession(transformSession);
    }, [transformSession]);
    useEffect(() => {
        if (focusRequestId === 0) {
            return;
        }
        hostRef.current?.focusSelection(sceneDocument, focusSelection);
    }, [focusRequestId, focusSelection, sceneDocument]);
    const previewVisible = toolMode === "create" && toolPreview.kind === "create" && toolPreview.center !== null;
    const transformPreviewVisible = transformSession.kind === "active";
    const selectionModeVisible = toolMode === "select";
    const selectedWhiteboxLabel = selectionModeVisible ? getWhiteboxSelectionFeedbackLabel(sceneDocument, selection) : null;
    const showViewModeOverlay = layoutMode === "quad";
    const showOverlay = showViewModeOverlay || selectionModeVisible || previewVisible || transformPreviewVisible || selectedWhiteboxLabel !== null || hoveredWhiteboxLabel !== null;
    return (_jsxs("div", { ref: containerRef, className: `viewport-canvas viewport-canvas--${toolMode} viewport-canvas--${viewMode} viewport-canvas--${displayMode} viewport-canvas--${layoutMode}`, "data-testid": `viewport-canvas-${panelId}`, "data-active": isActivePanel ? "true" : "false", "aria-label": `${getViewportPanelLabel(panelId)} editor viewport`, style: displayMode !== "normal"
            ? {
                backgroundColor: "#000000",
                backgroundImage: "none"
            }
            : createWorldBackgroundStyle(world.background, world.background.mode === "image" ? loadedImageAssets[world.background.assetId]?.sourceUrl ?? null : null), children: [!showOverlay ? null : (_jsxs("div", { className: "viewport-canvas__overlay", "data-testid": `viewport-overlay-${panelId}`, children: [!showViewModeOverlay ? null : (_jsxs("div", { className: "viewport-canvas__overlay-badges", children: [_jsx("div", { className: "viewport-canvas__overlay-badge viewport-canvas__overlay-badge--view", children: getViewportViewModeLabel(viewMode) }), !selectionModeVisible ? null : (_jsx("div", { className: "viewport-canvas__overlay-badge viewport-canvas__overlay-badge--selection", "data-testid": `viewport-selection-mode-${panelId}`, children: getWhiteboxSelectionModeLabel(whiteboxSelectionMode) }))] })), showViewModeOverlay || !selectionModeVisible ? null : (_jsx("div", { className: "viewport-canvas__overlay-badges", children: _jsx("div", { className: "viewport-canvas__overlay-badge viewport-canvas__overlay-badge--selection", "data-testid": `viewport-selection-mode-${panelId}`, children: getWhiteboxSelectionModeLabel(whiteboxSelectionMode) }) })), !previewVisible ? null : (_jsxs("div", { className: "viewport-canvas__overlay-preview", "data-testid": `viewport-snap-preview-${panelId}`, children: ["Preview: ", toolPreview.center.x, ", ", toolPreview.center.y, ", ", toolPreview.center.z] })), !transformPreviewVisible ? null : (_jsx("div", { className: "viewport-canvas__overlay-preview", "data-testid": `viewport-transform-preview-${panelId}`, children: transformSession.kind !== "active"
                            ? null
                            : `${transformSession.operation}${transformSession.axisConstraint === null ? "" : ` · ${transformSession.axisConstraint.toUpperCase()}`}` })), selectedWhiteboxLabel === null ? null : (_jsxs("div", { className: "viewport-canvas__overlay-preview", "data-testid": `viewport-selected-whitebox-${panelId}`, children: ["Selected: ", selectedWhiteboxLabel] })), hoveredWhiteboxLabel === null ? null : (_jsxs("div", { className: "viewport-canvas__overlay-preview", "data-testid": `viewport-hovered-whitebox-${panelId}`, children: ["Hover: ", hoveredWhiteboxLabel] }))] })), viewportMessage === null ? null : (_jsxs("div", { className: "viewport-canvas__fallback", role: "status", children: [_jsx("div", { className: "viewport-canvas__fallback-title", children: "Viewport Unavailable" }), _jsx("div", { children: viewportMessage }), toolMode !== "create" || toolPreview.kind !== "create" ? null : (_jsx("button", { className: "toolbar__button toolbar__button--accent", type: "button", "data-testid": `viewport-fallback-create-${panelId}`, onClick: () => {
                            onCommitCreation(toolPreview);
                        }, children: "Commit Creation Preview" }))] }))] }));
}
