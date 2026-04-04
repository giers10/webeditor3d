import { useEffect, useRef, useState } from "react";

import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import type { ActiveTransformSession, TransformSessionState } from "../core/transform-session";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import {
  getViewportPanelLabel,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelCameraState,
  type ViewportPanelId
} from "./viewport-layout";
import {
  getViewportViewModeLabel,
  type ViewportViewMode
} from "./viewport-view-modes";
import type { CreationViewportToolPreview, ViewportToolPreview } from "./viewport-transient-state";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  panelId: ViewportPanelId;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  whiteboxSnapEnabled: boolean;
  whiteboxSnapStep: number;
  selection: EditorSelection;
  toolMode: ToolMode;
  toolPreview: ViewportToolPreview;
  transformSession: TransformSessionState;
  cameraState: ViewportPanelCameraState;
  viewMode: ViewportViewMode;
  displayMode: ViewportDisplayMode;
  layoutMode: ViewportLayoutMode;
  isActivePanel: boolean;
  focusRequestId: number;
  focusSelection: EditorSelection;
  onSelectionChange(selection: EditorSelection): void;
  onCommitCreation(toolPreview: CreationViewportToolPreview): boolean;
  onCameraStateChange(cameraState: ViewportPanelCameraState): void;
  onToolPreviewChange(toolPreview: ViewportToolPreview): void;
  onTransformSessionChange(transformSession: TransformSessionState): void;
  onTransformCommit(transformSession: ActiveTransformSession): void;
  onTransformCancel(): void;
}

export function ViewportCanvas({
  panelId,
  world,
  sceneDocument,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  whiteboxSnapEnabled,
  whiteboxSnapStep,
  selection,
  toolMode,
  toolPreview,
  transformSession,
  cameraState,
  viewMode,
  displayMode,
  layoutMode,
  isActivePanel,
  focusRequestId,
  focusSelection,
  onSelectionChange,
  onCommitCreation,
  onCameraStateChange,
  onToolPreviewChange,
  onTransformSessionChange,
  onTransformCommit,
  onTransformCancel
}: ViewportCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<ViewportHost | null>(null);
  const [viewportMessage, setViewportMessage] = useState<string | null>(null);

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

    if (!hasWebGl) {
      setViewportMessage("WebGL is unavailable in this browser environment. The viewport shell is visible, but rendering is disabled.");
      return;
    }

    try {
      const viewportHost = new ViewportHost();
      hostRef.current = viewportHost;
      viewportHost.setPanelId(panelId);
      viewportHost.mount(container);
      setViewportMessage(null);

      return () => {
        viewportHost.dispose();
        hostRef.current = null;
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Viewport initialization failed.";
      setViewportMessage(`Viewport initialization failed: ${message}`);
      return;
    }
  }, []);

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
    hostRef.current?.setCameraStateChangeHandler(onCameraStateChange);
  }, [onCameraStateChange]);

  useEffect(() => {
    hostRef.current?.setCreationPreviewChangeHandler((nextToolPreview) => {
      onToolPreviewChange(
        nextToolPreview.kind === "create"
          ? {
              ...nextToolPreview,
              sourcePanelId: panelId
            }
          : nextToolPreview
      );
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
  const showViewModeOverlay = layoutMode === "quad";
  const showOverlay = showViewModeOverlay || previewVisible || transformPreviewVisible;

  return (
    <div
      ref={containerRef}
      className={`viewport-canvas viewport-canvas--${toolMode} viewport-canvas--${viewMode} viewport-canvas--${displayMode} viewport-canvas--${layoutMode}`}
      data-testid={`viewport-canvas-${panelId}`}
      data-active={isActivePanel ? "true" : "false"}
      aria-label={`${getViewportPanelLabel(panelId)} editor viewport`}
      style={
        displayMode !== "normal"
          ? {
              backgroundColor: "#000000",
              backgroundImage: "none"
            }
          : createWorldBackgroundStyle(world.background, world.background.mode === "image" ? loadedImageAssets[world.background.assetId]?.sourceUrl ?? null : null)
      }
    >
      {!showOverlay ? null : (
        <div className="viewport-canvas__overlay" data-testid={`viewport-overlay-${panelId}`}>
          {!showViewModeOverlay ? null : (
            <div className="viewport-canvas__overlay-badges">
              <div className="viewport-canvas__overlay-badge viewport-canvas__overlay-badge--view">{getViewportViewModeLabel(viewMode)}</div>
            </div>
          )}
          {!previewVisible ? null : (
            <div className="viewport-canvas__overlay-preview" data-testid={`viewport-snap-preview-${panelId}`}>
              Preview: {(toolPreview.center as Vec3).x}, {(toolPreview.center as Vec3).y}, {(toolPreview.center as Vec3).z}
            </div>
          )}
          {!transformPreviewVisible ? null : (
            <div className="viewport-canvas__overlay-preview" data-testid={`viewport-transform-preview-${panelId}`}>
              {transformSession.kind !== "active"
                ? null
                : `${transformSession.operation}${transformSession.axisConstraint === null ? "" : ` · ${transformSession.axisConstraint.toUpperCase()}`}`}
            </div>
          )}
        </div>
      )}

      {viewportMessage === null ? null : (
        <div className="viewport-canvas__fallback" role="status">
          <div className="viewport-canvas__fallback-title">Viewport Unavailable</div>
          <div>{viewportMessage}</div>
          {toolMode !== "create" || toolPreview.kind !== "create" ? null : (
            <button
              className="toolbar__button toolbar__button--accent"
              type="button"
              data-testid={`viewport-fallback-create-${panelId}`}
              onClick={() => {
                onCommitCreation(toolPreview);
              }}
            >
              Commit Creation Preview
            </button>
          )}
        </div>
      )}
    </div>
  );
}
