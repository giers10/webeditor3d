import { ViewportCanvas } from "./ViewportCanvas";
import {
  getViewportDisplayModeLabel,
  getViewportPanelLabel,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportPanelState
} from "./viewport-layout";
import { VIEWPORT_VIEW_MODES, getViewportViewModeLabel, type ViewportViewMode } from "./viewport-view-modes";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";

interface ViewportPanelProps {
  panelId: ViewportPanelId;
  panelState: ViewportPanelState;
  layoutMode: ViewportLayoutMode;
  isActive: boolean;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  selection: EditorSelection;
  toolMode: ToolMode;
  focusRequestId: number;
  focusSelection: EditorSelection;
  onActivatePanel(panelId: ViewportPanelId): void;
  onSetPanelViewMode(panelId: ViewportPanelId, viewMode: ViewportViewMode): void;
  onSetPanelDisplayMode(panelId: ViewportPanelId, displayMode: ViewportDisplayMode): void;
  onSelectionChange(selection: EditorSelection): void;
  onCreateBoxBrush(center: Vec3): void;
}

export function ViewportPanel({
  panelId,
  panelState,
  layoutMode,
  isActive,
  world,
  sceneDocument,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  selection,
  toolMode,
  focusRequestId,
  focusSelection,
  onActivatePanel,
  onSetPanelViewMode,
  onSetPanelDisplayMode,
  onSelectionChange,
  onCreateBoxBrush
}: ViewportPanelProps) {
  const shouldShow = layoutMode === "quad" || isActive;

  return (
    <section
      className={`viewport-panel ${layoutMode === "single" ? "viewport-panel--single" : "viewport-panel--quad"} ${isActive ? "viewport-panel--active" : ""}`}
      data-testid={`viewport-panel-${panelId}`}
      data-active={isActive ? "true" : "false"}
      aria-label={`${getViewportPanelLabel(panelId)} viewport panel`}
      style={shouldShow ? undefined : { display: "none" }}
      onPointerDownCapture={() => onActivatePanel(panelId)}
      onFocusCapture={() => onActivatePanel(panelId)}
    >
      <div className="viewport-panel__header">
        <div className="viewport-panel__meta">
          <div className="viewport-panel__title-row">
            <div className="viewport-panel__title">{getViewportPanelLabel(panelId)}</div>
            {isActive ? <div className="viewport-panel__active-badge">Active</div> : null}
          </div>
          <div className="viewport-panel__subtitle">
            {getViewportViewModeLabel(panelState.viewMode)} {getViewportDisplayModeLabel(panelState.displayMode)}
          </div>
        </div>

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
        viewMode={panelState.viewMode}
        displayMode={panelState.displayMode}
        isActivePanel={isActive}
        focusRequestId={focusRequestId}
        focusSelection={focusSelection}
        onSelectionChange={onSelectionChange}
        onCreateBoxBrush={onCreateBoxBrush}
      />
    </section>
  );
}
