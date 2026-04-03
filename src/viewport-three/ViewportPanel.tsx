import type { CSSProperties } from "react";

import { ViewportCanvas } from "./ViewportCanvas";
import {
  getViewportDisplayModeLabel,
  getViewportPanelLabel,
  type ViewportPanelCameraState,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportPanelState
} from "./viewport-layout";
import { VIEWPORT_VIEW_MODES, getViewportViewModeLabel, type ViewportViewMode } from "./viewport-view-modes";
import type { CreationViewportToolPreview, ViewportToolPreview } from "./viewport-transient-state";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type { ActiveTransformSession, TransformSessionState } from "../core/transform-session";
import type { ToolMode } from "../core/tool-mode";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";

interface ViewportPanelProps {
  panelId: ViewportPanelId;
  panelState: ViewportPanelState;
  layoutMode: ViewportLayoutMode;
  isActive: boolean;
  className?: string;
  style?: CSSProperties;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  selection: EditorSelection;
  toolMode: ToolMode;
  toolPreview: ViewportToolPreview;
  transformSession: TransformSessionState;
  cameraState: ViewportPanelCameraState;
  focusRequestId: number;
  focusSelection: EditorSelection;
  onActivatePanel(panelId: ViewportPanelId): void;
  onSetPanelViewMode(panelId: ViewportPanelId, viewMode: ViewportViewMode): void;
  onSetPanelDisplayMode(panelId: ViewportPanelId, displayMode: ViewportDisplayMode): void;
  onCommitCreation(toolPreview: CreationViewportToolPreview): boolean;
  onCameraStateChange(cameraState: ViewportPanelCameraState): void;
  onToolPreviewChange(toolPreview: ViewportToolPreview): void;
  onTransformSessionChange(transformSession: TransformSessionState): void;
  onTransformCommit(transformSession: ActiveTransformSession): void;
  onTransformCancel(): void;
  onSelectionChange(selection: EditorSelection): void;
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
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  selection,
  toolMode,
  toolPreview,
  transformSession,
  cameraState,
  focusRequestId,
  focusSelection,
  onActivatePanel,
  onSetPanelViewMode,
  onSetPanelDisplayMode,
  onCommitCreation,
  onCameraStateChange,
  onToolPreviewChange,
  onTransformSessionChange,
  onTransformCommit,
  onTransformCancel,
  onSelectionChange
}: ViewportPanelProps) {
  const shouldShow = layoutMode === "quad" || isActive;
  const panelStyle = shouldShow ? style : { ...(style ?? {}), display: "none" };

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
      <div className="viewport-panel__header">
        <div className="viewport-panel__controls">
          <div className="viewport-panel__control-group" role="group" aria-label={`${getViewportPanelLabel(panelId)} view mode`}>
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

          <div className="viewport-panel__control-group" role="group" aria-label={`${getViewportPanelLabel(panelId)} display mode`}>
            {(["normal", "authoring"] as const).map((displayMode) => (
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
        </div>
      </div>

      <ViewportCanvas
        panelId={panelId}
        world={world}
        sceneDocument={sceneDocument}
        projectAssets={projectAssets}
        loadedModelAssets={loadedModelAssets}
        loadedImageAssets={loadedImageAssets}
        selection={selection}
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
        onCommitCreation={onCommitCreation}
        onCameraStateChange={onCameraStateChange}
        onToolPreviewChange={onToolPreviewChange}
        onTransformSessionChange={onTransformSessionChange}
        onTransformCommit={onTransformCommit}
        onTransformCancel={onTransformCancel}
      />
    </section>
  );
}
