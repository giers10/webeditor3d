import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import { ViewportCanvas } from "./ViewportCanvas";
import {
  getViewportDisplayModeLabel,
  getViewportLayoutModeLabel,
  getViewportPanelLabel,
  VIEWPORT_LAYOUT_MODES,
  type ViewportPanelCameraState,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportPanelState
} from "./viewport-layout";
import {
  VIEWPORT_VIEW_MODES,
  getViewportViewModeLabel,
  type ViewportViewMode
} from "./viewport-view-modes";
import type {
  CreationViewportToolPreview,
  ViewportToolPreview
} from "./viewport-transient-state";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type {
  ArmedTerrainBrushState,
  TerrainBrushStrokeCommit
} from "../core/terrain-brush";
import {
  getWhiteboxSelectionModeLabel,
  WHITEBOX_SELECTION_MODES,
  type WhiteboxSelectionMode
} from "../core/whitebox-selection-mode";
import type {
  ActiveTransformSession,
  TransformOperation,
  TransformSessionState
} from "../core/transform-session";
import type { ToolMode } from "../core/tool-mode";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";
import type { RuntimeClockState } from "../runtime-three/runtime-project-time";
import type { RuntimeSceneDefinition } from "../runtime-three/runtime-scene-build";

interface ViewportPanelProps {
  panelId: ViewportPanelId;
  panelState: ViewportPanelState;
  layoutMode: ViewportLayoutMode;
  isActive: boolean;
  className?: string;
  style?: CSSProperties;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  editorSimulationScene: RuntimeSceneDefinition | null;
  editorSimulationClock: RuntimeClockState | null;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  whiteboxSelectionMode: WhiteboxSelectionMode;
  whiteboxSnapEnabled: boolean;
  whiteboxSnapStepDraft: string;
  whiteboxSnapStep: number;
  viewportGridVisible: boolean;
  selection: EditorSelection;
  activeSelectionId: string | null;
  terrainBrushState: ArmedTerrainBrushState | null;
  toolMode: ToolMode;
  toolPreview: ViewportToolPreview;
  transformSession: TransformSessionState;
  canTranslateSelectedTarget: boolean;
  canRotateSelectedTarget: boolean;
  canScaleSelectedTarget: boolean;
  canSurfaceSnapTransformTarget: boolean;
  cameraState: ViewportPanelCameraState;
  focusRequestId: number;
  focusSelection: EditorSelection;
  isAddMenuOpen: boolean;
  onActivatePanel(panelId: ViewportPanelId): void;
  onOpenAddMenu(event: ReactMouseEvent<HTMLButtonElement>): void;
  onSetViewportLayoutMode(layoutMode: ViewportLayoutMode): void;
  onSetPanelViewMode(
    panelId: ViewportPanelId,
    viewMode: ViewportViewMode
  ): void;
  onSetPanelDisplayMode(
    panelId: ViewportPanelId,
    displayMode: ViewportDisplayMode
  ): void;
  onCommitCreation(toolPreview: CreationViewportToolPreview): boolean;
  onTerrainBrushCommit(commit: TerrainBrushStrokeCommit): boolean;
  onCameraStateChange(cameraState: ViewportPanelCameraState): void;
  onToolPreviewChange(toolPreview: ViewportToolPreview): void;
  onBeginTransformOperation(operation: TransformOperation): void;
  onToggleTransformSurfaceSnap(): void;
  onWhiteboxSelectionModeChange(mode: WhiteboxSelectionMode): void;
  onViewportGridToggle(): void;
  onWhiteboxSnapToggle(): void;
  onWhiteboxSnapStepDraftChange(value: string): void;
  onWhiteboxSnapStepBlur(): void;
  onTransformSessionChange(transformSession: TransformSessionState): void;
  onTransformCommit(transformSession: ActiveTransformSession): void;
  onTransformCancel(): void;
  onSelectionChange(selection: EditorSelection): void;
}

const VIEWPORT_DISPLAY_MODES = ["normal", "authoring", "wireframe"] as const;

function getPanelScopedTestId(panelId: ViewportPanelId, name: string): string {
  return `viewport-panel-${panelId}-${name}`;
}

function getSharedControlTestId(
  panelId: ViewportPanelId,
  isActive: boolean,
  sharedId: string,
  fallbackId = sharedId
): string {
  return isActive ? sharedId : getPanelScopedTestId(panelId, fallbackId);
}

export function ViewportPanel({
  panelId,
  panelState,
  layoutMode,
  isActive,
  className,
  style,
  world,
  sceneDocument,
  editorSimulationScene,
  editorSimulationClock,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  whiteboxSelectionMode,
  whiteboxSnapEnabled,
  whiteboxSnapStepDraft,
  whiteboxSnapStep,
  viewportGridVisible,
  selection,
  activeSelectionId,
  terrainBrushState = null,
  toolMode,
  toolPreview,
  transformSession,
  canTranslateSelectedTarget,
  canRotateSelectedTarget,
  canScaleSelectedTarget,
  canSurfaceSnapTransformTarget,
  cameraState,
  focusRequestId,
  focusSelection,
  isAddMenuOpen,
  onActivatePanel,
  onOpenAddMenu,
  onSetViewportLayoutMode,
  onSetPanelViewMode,
  onSetPanelDisplayMode,
  onCommitCreation,
  onTerrainBrushCommit,
  onCameraStateChange,
  onToolPreviewChange,
  onBeginTransformOperation,
  onToggleTransformSurfaceSnap,
  onWhiteboxSelectionModeChange,
  onViewportGridToggle,
  onWhiteboxSnapToggle,
  onWhiteboxSnapStepDraftChange,
  onWhiteboxSnapStepBlur,
  onTransformSessionChange,
  onTransformCommit,
  onTransformCancel,
  onSelectionChange
}: ViewportPanelProps) {
  const shouldShow = layoutMode === "quad" || isActive;
  const panelStyle = shouldShow ? style : { ...(style ?? {}), display: "none" };
  const transformButtonsDisabled = toolMode !== "select";

  return (
    <section
      className={`viewport-panel ${layoutMode === "single" ? "viewport-panel--single" : "viewport-panel--quad"} ${className ?? ""}`.trim()}
      data-testid={`viewport-panel-${panelId}`}
      data-active={isActive ? "true" : "false"}
      data-viewport-panel-id={panelId}
      aria-hidden={shouldShow ? undefined : true}
      aria-label={`${getViewportPanelLabel(panelId)} viewport panel`}
      style={panelStyle}
      onPointerDownCapture={() => onActivatePanel(panelId)}
      onFocusCapture={() => onActivatePanel(panelId)}
    >
      <ViewportCanvas
        panelId={panelId}
        world={world}
        sceneDocument={sceneDocument}
        editorSimulationScene={editorSimulationScene}
        editorSimulationClock={editorSimulationClock}
        projectAssets={projectAssets}
        loadedModelAssets={loadedModelAssets}
        loadedImageAssets={loadedImageAssets}
        whiteboxSelectionMode={whiteboxSelectionMode}
        whiteboxSnapEnabled={whiteboxSnapEnabled}
        whiteboxSnapStep={whiteboxSnapStep}
        viewportGridVisible={viewportGridVisible}
        selection={selection}
        activeSelectionId={activeSelectionId}
        terrainBrushState={terrainBrushState}
        toolMode={toolMode}
        toolPreview={toolPreview}
        transformSession={transformSession}
        cameraState={cameraState}
        viewMode={panelState.viewMode}
        displayMode={panelState.displayMode}
        layoutMode={layoutMode}
        isActivePanel={isActive}
        focusRequestId={focusRequestId}
        focusSelection={focusSelection}
        onSelectionChange={onSelectionChange}
        onTerrainBrushCommit={onTerrainBrushCommit}
        onCommitCreation={onCommitCreation}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={onToolPreviewChange}
        onTransformSessionChange={onTransformSessionChange}
        onTransformCommit={onTransformCommit}
        onTransformCancel={onTransformCancel}
      />

      <div className="viewport-panel__overlay viewport-panel__overlay--top">
        <div className="viewport-panel__overlay-scroll">
          <button
            className="viewport-panel__button viewport-panel__button--accent"
            type="button"
            data-testid={getSharedControlTestId(
              panelId,
              isActive,
              "outliner-add-button",
              "add-button"
            )}
            aria-haspopup="menu"
            aria-expanded={isAddMenuOpen}
            onClick={onOpenAddMenu}
          >
            Add
          </button>

          <div
            className="viewport-panel__control-group"
            role="group"
            aria-label="Viewport layout mode"
          >
            {VIEWPORT_LAYOUT_MODES.map((mode) => (
              <button
                key={mode}
                className={`viewport-panel__button ${layoutMode === mode ? "viewport-panel__button--active" : ""}`}
                type="button"
                data-testid={getSharedControlTestId(
                  panelId,
                  isActive,
                  `viewport-layout-${mode}`,
                  `layout-${mode}`
                )}
                aria-pressed={layoutMode === mode}
                onClick={() => onSetViewportLayoutMode(mode)}
              >
                {getViewportLayoutModeLabel(mode)}
              </button>
            ))}
          </div>

          <div
            className="viewport-panel__control-group"
            role="group"
            aria-label={`${getViewportPanelLabel(panelId)} view mode`}
          >
            {VIEWPORT_VIEW_MODES.map((viewMode) => (
              <button
                key={viewMode}
                className={`viewport-panel__button ${panelState.viewMode === viewMode ? "viewport-panel__button--active" : ""}`}
                type="button"
                data-testid={`viewport-panel-${panelId}-view-${viewMode}`}
                aria-pressed={panelState.viewMode === viewMode}
                onClick={() => onSetPanelViewMode(panelId, viewMode)}
              >
                {getViewportViewModeLabel(viewMode)}
              </button>
            ))}
          </div>

          <div
            className="viewport-panel__control-group"
            role="group"
            aria-label={`${getViewportPanelLabel(panelId)} display mode`}
          >
            {VIEWPORT_DISPLAY_MODES.map((displayMode) => (
              <button
                key={displayMode}
                className={`viewport-panel__button ${panelState.displayMode === displayMode ? "viewport-panel__button--active" : ""}`}
                type="button"
                data-testid={`viewport-panel-${panelId}-display-${displayMode}`}
                aria-pressed={panelState.displayMode === displayMode}
                onClick={() => onSetPanelDisplayMode(panelId, displayMode)}
              >
                {getViewportDisplayModeLabel(displayMode)}
              </button>
            ))}
          </div>

          <div
            className="viewport-panel__control-group"
            role="group"
            aria-label="Whitebox snap settings"
          >
            <button
              className={`viewport-panel__button ${viewportGridVisible ? "viewport-panel__button--active" : ""}`}
              type="button"
              data-testid={getSharedControlTestId(
                panelId,
                isActive,
                "viewport-grid-toggle"
              )}
              aria-pressed={viewportGridVisible}
              onClick={onViewportGridToggle}
            >
              {viewportGridVisible ? "Grid On" : "Grid Off"}
            </button>
            <button
              className={`viewport-panel__button ${whiteboxSnapEnabled ? "viewport-panel__button--active" : ""}`}
              type="button"
              data-testid={getSharedControlTestId(
                panelId,
                isActive,
                "whitebox-snap-toggle"
              )}
              aria-pressed={whiteboxSnapEnabled}
              onClick={onWhiteboxSnapToggle}
            >
              {whiteboxSnapEnabled ? "Snap On" : "Snap Off"}
            </button>
            <label className="viewport-panel__inline-field">
              <span className="viewport-panel__inline-label">Step</span>
              <input
                data-testid={getSharedControlTestId(
                  panelId,
                  isActive,
                  "whitebox-snap-step"
                )}
                className="text-input viewport-panel__inline-input"
                type="number"
                min="0.01"
                step="0.1"
                value={whiteboxSnapStepDraft}
                onChange={(event) =>
                  onWhiteboxSnapStepDraftChange(event.currentTarget.value)
                }
                onBlur={onWhiteboxSnapStepBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onWhiteboxSnapStepBlur();
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="viewport-panel__overlay viewport-panel__overlay--left">
        <div
          className="viewport-panel__control-group viewport-panel__control-group--stack"
          role="group"
          aria-label="Transform operations"
        >
          <button
            className={`viewport-panel__button ${transformSession.kind === "active" && transformSession.operation === "translate" ? "viewport-panel__button--active" : ""}`}
            type="button"
            data-testid={getSharedControlTestId(
              panelId,
              isActive,
              "transform-translate-button"
            )}
            aria-pressed={
              transformSession.kind === "active" &&
              transformSession.operation === "translate"
            }
            disabled={transformButtonsDisabled || !canTranslateSelectedTarget}
            onClick={() => onBeginTransformOperation("translate")}
          >
            Move
          </button>
          {transformSession.kind === "active" &&
          transformSession.operation === "translate" ? (
            <button
              className={`viewport-panel__button ${transformSession.surfaceSnapEnabled ? "viewport-panel__button--active" : ""}`}
              type="button"
              data-testid={getSharedControlTestId(
                panelId,
                isActive,
                "transform-surface-snap-button"
              )}
              aria-pressed={transformSession.surfaceSnapEnabled}
              disabled={!canSurfaceSnapTransformTarget}
              onClick={onToggleTransformSurfaceSnap}
              title={
                canSurfaceSnapTransformTarget
                  ? "Snap the current move preview onto the visible surface under the cursor."
                  : "Surface Snap Move currently supports whitebox solids, model instances, and trigger volumes."
              }
            >
              Surface Snap
            </button>
          ) : null}
          <button
            className={`viewport-panel__button ${transformSession.kind === "active" && transformSession.operation === "rotate" ? "viewport-panel__button--active" : ""}`}
            type="button"
            data-testid={getSharedControlTestId(
              panelId,
              isActive,
              "transform-rotate-button"
            )}
            aria-pressed={
              transformSession.kind === "active" &&
              transformSession.operation === "rotate"
            }
            disabled={transformButtonsDisabled || !canRotateSelectedTarget}
            onClick={() => onBeginTransformOperation("rotate")}
          >
            Rotate
          </button>
          <button
            className={`viewport-panel__button ${transformSession.kind === "active" && transformSession.operation === "scale" ? "viewport-panel__button--active" : ""}`}
            type="button"
            data-testid={getSharedControlTestId(
              panelId,
              isActive,
              "transform-scale-button"
            )}
            aria-pressed={
              transformSession.kind === "active" &&
              transformSession.operation === "scale"
            }
            disabled={transformButtonsDisabled || !canScaleSelectedTarget}
            onClick={() => onBeginTransformOperation("scale")}
          >
            Scale
          </button>
        </div>

        <div
          className="viewport-panel__control-group viewport-panel__control-group--stack"
          role="group"
          aria-label="Whitebox selection mode"
        >
          {WHITEBOX_SELECTION_MODES.map((mode) => (
            <button
              key={mode}
              className={`viewport-panel__button ${whiteboxSelectionMode === mode ? "viewport-panel__button--active" : ""}`}
              type="button"
              data-testid={getSharedControlTestId(
                panelId,
                isActive,
                `whitebox-selection-mode-${mode}`
              )}
              aria-pressed={whiteboxSelectionMode === mode}
              onClick={() => onWhiteboxSelectionModeChange(mode)}
            >
              {getWhiteboxSelectionModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
