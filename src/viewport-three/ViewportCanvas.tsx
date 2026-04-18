import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type {
  ArmedTerrainBrushState,
  TerrainBrushStrokeCommit
} from "../core/terrain-brush";
import { getWhiteboxSelectionFeedbackLabel } from "../core/whitebox-selection-feedback";
import type { ToolMode } from "../core/tool-mode";
import { type WhiteboxSelectionMode } from "../core/whitebox-selection-mode";
import type { Vec3 } from "../core/vector";
import {
  getTransformAxisLabel,
  getTransformAxisSpaceLabel,
  type ActiveTransformSession,
  type TransformSessionState
} from "../core/transform-session";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";
import {
  resolveRuntimeDayNightWorldState,
  type RuntimeClockState
} from "../runtime-three/runtime-project-time";
import type { RuntimeSceneDefinition } from "../runtime-three/runtime-scene-build";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import {
  getViewportPanelLabel,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelCameraState,
  type ViewportPanelId
} from "./viewport-layout";
import { type ViewportViewMode } from "./viewport-view-modes";
import type {
  CreationViewportToolPreview,
  ViewportToolPreview
} from "./viewport-transient-state";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  panelId: ViewportPanelId;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  editorSimulationScene: RuntimeSceneDefinition | null;
  editorSimulationClock: RuntimeClockState | null;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  whiteboxSelectionMode: WhiteboxSelectionMode;
  whiteboxSnapEnabled: boolean;
  whiteboxSnapStep: number;
  viewportGridVisible: boolean;
  selection: EditorSelection;
  activeSelectionId: string | null;
  terrainBrushState: ArmedTerrainBrushState | null;
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
  onTerrainBrushCommit(commit: TerrainBrushStrokeCommit): boolean;
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
  editorSimulationScene,
  editorSimulationClock,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  whiteboxSelectionMode,
  whiteboxSnapEnabled,
  whiteboxSnapStep,
  viewportGridVisible,
  selection,
  activeSelectionId,
  terrainBrushState,
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
  onTerrainBrushCommit,
  onCommitCreation,
  onCameraStateChange,
  onToolPreviewChange,
  onTransformSessionChange,
  onTransformCommit,
  onTransformCancel
}: ViewportCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<ViewportHost | null>(null);
  const shouldRenderPanel = layoutMode === "quad" || isActivePanel;
  const [viewportMessage, setViewportMessage] = useState<string | null>(null);
  const [hoveredWhiteboxLabel, setHoveredWhiteboxLabel] = useState<
    string | null
  >(null);

  useLayoutEffect(() => {
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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Viewport initialization failed.";
      setViewportMessage(`Viewport initialization failed: ${message}`);
      return;
    }
  }, []);

  useLayoutEffect(() => {
    hostRef.current?.setRenderEnabled(shouldRenderPanel);
  }, [shouldRenderPanel]);

  useLayoutEffect(() => {
    hostRef.current?.setPanelId(panelId);
  }, [panelId]);

  useLayoutEffect(() => {
    hostRef.current?.updateWorld(world);
  }, [world]);

  useLayoutEffect(() => {
    hostRef.current?.updateSimulation(editorSimulationScene, editorSimulationClock);
  }, [
    editorSimulationScene,
    editorSimulationClock?.dayCount,
    editorSimulationClock?.dayLengthMinutes,
    editorSimulationClock?.timeOfDayHours
  ]);

  useLayoutEffect(() => {
    hostRef.current?.updateAssets(
      projectAssets,
      loadedModelAssets,
      loadedImageAssets
    );
  }, [projectAssets, loadedModelAssets, loadedImageAssets]);

  useLayoutEffect(() => {
    hostRef.current?.setWhiteboxSnapSettings(
      whiteboxSnapEnabled,
      whiteboxSnapStep
    );
  }, [whiteboxSnapEnabled, whiteboxSnapStep]);

  useLayoutEffect(() => {
    hostRef.current?.setGridVisible(viewportGridVisible);
  }, [viewportGridVisible]);

  useLayoutEffect(() => {
    hostRef.current?.setWhiteboxSelectionMode(whiteboxSelectionMode);
  }, [whiteboxSelectionMode]);

  useLayoutEffect(() => {
    hostRef.current?.updateDocument(
      sceneDocument,
      selection,
      activeSelectionId
    );
  }, [sceneDocument, selection, activeSelectionId]);

  useLayoutEffect(() => {
    hostRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  useLayoutEffect(() => {
    hostRef.current?.setDisplayMode(displayMode);
  }, [displayMode]);

  useLayoutEffect(() => {
    hostRef.current?.setCameraState(cameraState);
  }, [cameraState]);

  useEffect(() => {
    hostRef.current?.setBrushSelectionChangeHandler(onSelectionChange);
  }, [onSelectionChange]);

  useEffect(() => {
    hostRef.current?.setTerrainBrushCommitHandler?.(onTerrainBrushCommit);
  }, [onTerrainBrushCommit]);

  useEffect(() => {
    hostRef.current?.setWhiteboxHoverLabelChangeHandler(
      setHoveredWhiteboxLabel
    );
  }, []);

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

  useLayoutEffect(() => {
    hostRef.current?.setToolMode(toolMode);
  }, [toolMode]);

  useLayoutEffect(() => {
    hostRef.current?.setTerrainBrushState?.(terrainBrushState);
  }, [terrainBrushState]);

  useLayoutEffect(() => {
    hostRef.current?.setCreationPreview(
      toolMode === "create" && toolPreview.kind === "create"
        ? toolPreview
        : null
    );
  }, [toolMode, toolPreview]);

  useLayoutEffect(() => {
    hostRef.current?.setTransformSession(transformSession);
  }, [transformSession]);

  useEffect(() => {
    if (focusRequestId === 0) {
      return;
    }

    hostRef.current?.focusSelection(sceneDocument, focusSelection);
  }, [focusRequestId, focusSelection, sceneDocument]);

  const previewVisible =
    toolMode === "create" &&
    toolPreview.kind === "create" &&
    toolPreview.center !== null;
  const transformPreviewVisible = transformSession.kind === "active";
  const selectedWhiteboxLabel = toolMode === "select"
    ? getWhiteboxSelectionFeedbackLabel(sceneDocument, selection)
    : null;
  const terrainBrushOverlayVisible =
    toolMode === "select" && terrainBrushState !== null;
  const resolvedViewportBackground =
    editorSimulationScene !== null && editorSimulationClock !== null
      ? resolveRuntimeDayNightWorldState(
          editorSimulationScene.world,
          editorSimulationScene.time,
          editorSimulationClock
        ).background
      : world.background;
  const showOverlay =
    previewVisible ||
    transformPreviewVisible ||
    terrainBrushOverlayVisible ||
    selectedWhiteboxLabel !== null ||
    hoveredWhiteboxLabel !== null;

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
          : createWorldBackgroundStyle(
              resolvedViewportBackground,
              resolvedViewportBackground.mode === "image"
                ? (loadedImageAssets[resolvedViewportBackground.assetId]?.previewUrl ??
                    null)
                : null
            )
      }
    >
      {!showOverlay ? null : (
        <div
          className="viewport-canvas__overlay"
          data-testid={`viewport-overlay-${panelId}`}
        >
          {!previewVisible ? null : (
            <div
              className="viewport-canvas__overlay-preview"
              data-testid={`viewport-snap-preview-${panelId}`}
            >
              Preview: {(toolPreview.center as Vec3).x},{" "}
              {(toolPreview.center as Vec3).y}, {(toolPreview.center as Vec3).z}
            </div>
          )}
          {!transformPreviewVisible ? null : (
            <div
              className="viewport-canvas__overlay-preview"
              data-testid={`viewport-transform-preview-${panelId}`}
            >
              {transformSession.kind !== "active"
                ? null
                : [
                    transformSession.operation,
                    transformSession.operation === "translate" &&
                    transformSession.surfaceSnapEnabled
                      ? "surface snap"
                      : null,
                    transformSession.axisConstraint === null
                      ? null
                      : `${getTransformAxisSpaceLabel(transformSession.axisConstraintSpace)} ${getTransformAxisLabel(
                          transformSession.axisConstraint
                        )}`
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")}
                </div>
          )}
          {!terrainBrushOverlayVisible ? null : (
            <div
              className="viewport-canvas__overlay-preview"
              data-testid={`viewport-terrain-brush-preview-${panelId}`}
            >
              terrain · {terrainBrushState.tool}
            </div>
          )}
          {selectedWhiteboxLabel === null ? null : (
            <div
              className="viewport-canvas__overlay-preview"
              data-testid={`viewport-selected-whitebox-${panelId}`}
            >
              Selected: {selectedWhiteboxLabel}
            </div>
          )}
          {hoveredWhiteboxLabel === null ? null : (
            <div
              className="viewport-canvas__overlay-preview"
              data-testid={`viewport-hovered-whitebox-${panelId}`}
            >
              Hover: {hoveredWhiteboxLabel}
            </div>
          )}
        </div>
      )}

      {viewportMessage === null ? null : (
        <div className="viewport-canvas__fallback" role="status">
          <div className="viewport-canvas__fallback-title">
            Viewport Unavailable
          </div>
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
