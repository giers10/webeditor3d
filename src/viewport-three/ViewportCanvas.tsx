import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";

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
import type { EditorSimulationController } from "../runtime-three/editor-simulation-controller";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import { traceUpdateLoopEvent } from "../debug/update-loop-trace";
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
  editorSimulationController: EditorSimulationController;
  editorSimulationPlaying?: boolean;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  whiteboxSelectionMode: WhiteboxSelectionMode;
  whiteboxSnapEnabled: boolean;
  whiteboxSnapStep: number;
  viewportGridVisible: boolean;
  selection: EditorSelection;
  activeSelectionId: string | null;
  terrainLodGridVisibleTerrainIds?: readonly string[];
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
  onTransformPreviewChange?(transformSession: ActiveTransformSession): void;
  onTransformCommit(transformSession: ActiveTransformSession): void;
  onTransformCancel(): void;
  onPlayEditorSimulation?(): void;
  onPauseEditorSimulation?(): void;
  onStepEditorSimulation?(deltaHours: number): void;
}

const VIEWPORT_TIME_TRANSPORT_STEP_HOURS = 0.25;
const VIEWPORT_TIME_TRANSPORT_REPEAT_MS = 125;

interface ViewportTimeTransportProps {
  panelId: ViewportPanelId;
  editorSimulationPlaying: boolean;
  onPlayEditorSimulation(): void;
  onPauseEditorSimulation(): void;
  onStepEditorSimulation(deltaHours: number): void;
}

function ViewportTimeTransport({
  panelId,
  editorSimulationPlaying,
  onPlayEditorSimulation,
  onPauseEditorSimulation,
  onStepEditorSimulation
}: ViewportTimeTransportProps) {
  const repeatIntervalRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pointerStepHandledRef = useRef(false);
  const latestStepHandlerRef = useRef(onStepEditorSimulation);

  useEffect(() => {
    latestStepHandlerRef.current = onStepEditorSimulation;
  }, [onStepEditorSimulation]);

  const stopStepping = useCallback(() => {
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }

    const activeButton = activeButtonRef.current;
    const activePointerId = activePointerIdRef.current;

    if (
      activeButton !== null &&
      activePointerId !== null &&
      activeButton.hasPointerCapture?.(activePointerId)
    ) {
      activeButton.releasePointerCapture(activePointerId);
    }

    activePointerIdRef.current = null;
    activeButtonRef.current = null;
  }, []);

  useEffect(() => {
    const handleWindowBlur = () => {
      stopStepping();
    };

    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      stopStepping();
    };
  }, [stopStepping]);

  const step = useCallback((direction: -1 | 1) => {
    latestStepHandlerRef.current(
      direction * VIEWPORT_TIME_TRANSPORT_STEP_HOURS
    );
  }, []);

  const startStepping = useCallback(
    (direction: -1 | 1, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (typeof event.button === "number" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      stopStepping();

      pointerStepHandledRef.current = true;
      activePointerIdRef.current = event.pointerId;
      activeButtonRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture?.(event.pointerId);

      step(direction);
      repeatIntervalRef.current = window.setInterval(() => {
        step(direction);
      }, VIEWPORT_TIME_TRANSPORT_REPEAT_MS);
    },
    [step, stopStepping]
  );

  const stopPointerStepping = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      event.stopPropagation();
      stopStepping();
    },
    [stopStepping]
  );

  const clickStep = useCallback((direction: -1 | 1) => {
    if (pointerStepHandledRef.current) {
      pointerStepHandledRef.current = false;
      return;
    }

    step(direction);
  }, [step]);

  return (
    <div
      className="viewport-canvas__time-transport"
      data-testid={`viewport-time-transport-${panelId}`}
      role="group"
      aria-label="Editor project time transport"
    >
      <button
        className="viewport-canvas__time-button"
        type="button"
        data-testid={`viewport-time-rewind-${panelId}`}
        aria-label="Step editor project time backward"
        title="Step editor project time backward"
        onPointerDown={(event) => startStepping(-1, event)}
        onPointerUp={stopPointerStepping}
        onPointerCancel={stopPointerStepping}
        onLostPointerCapture={stopPointerStepping}
        onBlur={stopStepping}
        onClick={() => clickStep(-1)}
      >
        &lt;&lt;
      </button>
      <button
        className="viewport-canvas__time-button viewport-canvas__time-button--primary"
        type="button"
        data-testid={`viewport-time-play-toggle-${panelId}`}
        aria-label={
          editorSimulationPlaying
            ? "Pause editor project time"
            : "Play editor project time"
        }
        title={
          editorSimulationPlaying
            ? "Pause editor project time"
            : "Play editor project time"
        }
        onClick={
          editorSimulationPlaying
            ? onPauseEditorSimulation
            : onPlayEditorSimulation
        }
      >
        {editorSimulationPlaying ? "II" : ">"}
      </button>
      <button
        className="viewport-canvas__time-button"
        type="button"
        data-testid={`viewport-time-forward-${panelId}`}
        aria-label="Step editor project time forward"
        title="Step editor project time forward"
        onPointerDown={(event) => startStepping(1, event)}
        onPointerUp={stopPointerStepping}
        onPointerCancel={stopPointerStepping}
        onLostPointerCapture={stopPointerStepping}
        onBlur={stopStepping}
        onClick={() => clickStep(1)}
      >
        &gt;&gt;
      </button>
    </div>
  );
}

export function ViewportCanvas({
  panelId,
  world,
  sceneDocument,
  editorSimulationController,
  editorSimulationPlaying = false,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  whiteboxSelectionMode,
  whiteboxSnapEnabled,
  whiteboxSnapStep,
  viewportGridVisible,
  selection,
  activeSelectionId,
  terrainLodGridVisibleTerrainIds = [],
  terrainBrushState = null,
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
  onTransformPreviewChange = () => undefined,
  onTransformCommit,
  onTransformCancel,
  onPlayEditorSimulation = () => undefined,
  onPauseEditorSimulation = () => undefined,
  onStepEditorSimulation = () => undefined
}: ViewportCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<ViewportHost | null>(null);
  const shouldRenderPanel = layoutMode === "quad" || isActivePanel;
  const [viewportMessage, setViewportMessage] = useState<string | null>(null);
  const [hoveredWhiteboxLabel, setHoveredWhiteboxLabel] = useState<
    string | null
  >(null);
  const hoveredWhiteboxLabelTraceRef = useRef<string | null>(null);

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
    const host = hostRef.current;

    if (host === null) {
      return;
    }

    const initialFrame = editorSimulationController.getFrameSnapshot();
    let currentSceneVersion = initialFrame.sceneVersion;
    let currentFrameVersion = initialFrame.frameVersion;
    host.updateSimulation(initialFrame.runtimeScene, initialFrame.clock, {
      sceneVersion: initialFrame.sceneVersion,
      frameVersion: initialFrame.frameVersion
    });

    return editorSimulationController.subscribeFrame((frame) => {
      if (frame.sceneVersion !== currentSceneVersion) {
        currentSceneVersion = frame.sceneVersion;
        currentFrameVersion = frame.frameVersion;
        host.updateSimulation(frame.runtimeScene, frame.clock, {
          sceneVersion: frame.sceneVersion,
          frameVersion: frame.frameVersion
        });
        return;
      }

      if (frame.frameVersion === currentFrameVersion) {
        return;
      }

      currentFrameVersion = frame.frameVersion;
      host.updateSimulationFrame(frame.runtimeScene, frame.clock, {
        sceneVersion: frame.sceneVersion,
        frameVersion: frame.frameVersion
      });
    });
  }, [editorSimulationController]);

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
    hostRef.current?.updateSelection(selection, activeSelectionId);
  }, [selection, activeSelectionId]);

  useLayoutEffect(() => {
    hostRef.current?.setTerrainLodGridVisibleTerrainIds(
      terrainLodGridVisibleTerrainIds
    );
  }, [terrainLodGridVisibleTerrainIds]);

  useLayoutEffect(() => {
    hostRef.current?.updateDocument(sceneDocument);
  }, [sceneDocument]);

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
    hostRef.current?.setWhiteboxHoverLabelChangeHandler((nextLabel) => {
      const previousLabel = hoveredWhiteboxLabelTraceRef.current;

      traceUpdateLoopEvent("ViewportCanvas.setWhiteboxHoverLabel", {
        panelId,
        previousLabel,
        nextLabel,
        labelChanged: previousLabel !== nextLabel
      });

      hoveredWhiteboxLabelTraceRef.current = nextLabel;
      setHoveredWhiteboxLabel(nextLabel);
    });
  }, [panelId]);

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
    hostRef.current?.setTransformPreviewChangeHandler(onTransformPreviewChange);
  }, [onTransformPreviewChange]);

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
  }, [focusRequestId]);

  const previewVisible =
    toolMode === "create" &&
    toolPreview.kind === "create" &&
    toolPreview.center !== null;
  const transformPreviewVisible = transformSession.kind === "active";
  const selectedWhiteboxLabel =
    toolMode === "select"
      ? getWhiteboxSelectionFeedbackLabel(sceneDocument, selection)
      : null;
  const terrainBrushOverlayVisible =
    toolMode === "select" && terrainBrushState != null;
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
              world.background,
              world.background.mode === "image"
                ? (loadedImageAssets[world.background.assetId]?.previewUrl ?? null)
                : null,
              world.background.mode === "shader"
                ? {
                    topColorHex: world.shaderSky.dayTopColorHex,
                    bottomColorHex: world.shaderSky.dayBottomColorHex
                  }
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
              {terrainBrushState.tool === "paint"
                ? ` · layer ${terrainBrushState.layerIndex + 1}`
                : ""}
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

      {!isActivePanel || viewportMessage !== null ? null : (
        <ViewportTimeTransport
          panelId={panelId}
          editorSimulationPlaying={editorSimulationPlaying}
          onPlayEditorSimulation={onPlayEditorSimulation}
          onPauseEditorSimulation={onPauseEditorSimulation}
          onStepEditorSimulation={onStepEditorSimulation}
        />
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
