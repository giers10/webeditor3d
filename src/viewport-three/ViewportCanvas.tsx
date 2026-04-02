import { useEffect, useRef, useState } from "react";

import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import { DEFAULT_BOX_BRUSH_CENTER, DEFAULT_BOX_BRUSH_SIZE } from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";
import type { WorldSettings } from "../document/world-settings";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import type { ViewportDisplayMode, ViewportPanelId } from "./viewport-layout";
import {
  getViewportViewModeControlHint,
  getViewportViewModeGridPlaneLabel,
  getViewportViewModeLabel,
  type ViewportViewMode
} from "./viewport-view-modes";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  panelId: ViewportPanelId;
  world: WorldSettings;
  sceneDocument: SceneDocument;
  projectAssets: Record<string, ProjectAssetRecord>;
  loadedModelAssets: Record<string, LoadedModelAsset>;
  loadedImageAssets: Record<string, LoadedImageAsset>;
  selection: EditorSelection;
  toolMode: ToolMode;
  viewMode: ViewportViewMode;
  displayMode: ViewportDisplayMode;
  isActivePanel: boolean;
  focusRequestId: number;
  focusSelection: EditorSelection;
  onSelectionChange(selection: EditorSelection): void;
  onCreateBoxBrush(center: Vec3): void;
}

function formatVec3(vector: Vec3 | null): string {
  if (vector === null) {
    return "Move over the grid to preview a snapped placement.";
  }

  return `${vector.x}, ${vector.y}, ${vector.z}`;
}

function getViewportOverlayText(toolMode: ToolMode, viewMode: ViewportViewMode, displayMode: ViewportDisplayMode): string {
  if (toolMode === "box-create") {
    return `${displayMode === "authoring" ? "Authoring view" : "Box Create"} is active on the ${getViewportViewModeGridPlaneLabel(viewMode)} grid. Click the ${getViewportViewModeGridPlaneLabel(viewMode)} grid to place a ${DEFAULT_BOX_BRUSH_SIZE.x} x ${DEFAULT_BOX_BRUSH_SIZE.y} x ${DEFAULT_BOX_BRUSH_SIZE.z} box. ${getViewportViewModeControlHint(viewMode)}`;
  }

  return `${displayMode === "authoring" ? "Authoring view" : `${getViewportViewModeLabel(viewMode)} view`} active on the ${getViewportViewModeGridPlaneLabel(viewMode)} grid. ${getViewportViewModeControlHint(viewMode)}`;
}

export function ViewportCanvas({
  panelId,
  world,
  sceneDocument,
  projectAssets,
  loadedModelAssets,
  loadedImageAssets,
  selection,
  toolMode,
  viewMode,
  displayMode,
  isActivePanel,
  focusRequestId,
  focusSelection,
  onSelectionChange,
  onCreateBoxBrush
}: ViewportCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<ViewportHost | null>(null);
  const [viewportMessage, setViewportMessage] = useState<string | null>(null);
  const [boxCreatePreview, setBoxCreatePreview] = useState<Vec3 | null>(null);

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
    hostRef.current?.updateWorld(world);
  }, [world]);

  useEffect(() => {
    hostRef.current?.updateAssets(projectAssets, loadedModelAssets, loadedImageAssets);
  }, [projectAssets, loadedModelAssets, loadedImageAssets]);

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
    hostRef.current?.setBrushSelectionChangeHandler(onSelectionChange);
  }, [onSelectionChange]);

  useEffect(() => {
    hostRef.current?.setCreateBoxBrushHandler(onCreateBoxBrush);
  }, [onCreateBoxBrush]);

  useEffect(() => {
    hostRef.current?.setBoxCreatePreviewHandler(setBoxCreatePreview);
  }, []);

  useEffect(() => {
    hostRef.current?.setToolMode(toolMode);

    if (toolMode !== "box-create") {
      setBoxCreatePreview(null);
    }
  }, [toolMode]);

  useEffect(() => {
    if (focusRequestId === 0) {
      return;
    }

    hostRef.current?.focusSelection(sceneDocument, focusSelection);
  }, [focusRequestId, focusSelection, sceneDocument]);

  return (
    <div
      ref={containerRef}
      className={`viewport-canvas viewport-canvas--${toolMode} viewport-canvas--${viewMode} viewport-canvas--${displayMode} ${isActivePanel ? "viewport-canvas--active" : ""}`}
      data-testid={`viewport-canvas-${panelId}`}
      aria-label="Editor viewport"
      style={
        displayMode === "authoring"
          ? {
              backgroundColor: "#000000",
              backgroundImage: "none"
            }
          : createWorldBackgroundStyle(world.background, world.background.mode === "image" ? loadedImageAssets[world.background.assetId]?.sourceUrl ?? null : null)
      }
    >
      <div className="viewport-canvas__overlay" data-testid={`viewport-overlay-${panelId}`}>
        <div className="viewport-canvas__overlay-badges">
          <div className="viewport-canvas__overlay-badge">{toolMode === "box-create" ? "Box Create" : "Select"}</div>
          <div className="viewport-canvas__overlay-badge viewport-canvas__overlay-badge--view">{getViewportViewModeLabel(viewMode)}</div>
          <div className="viewport-canvas__overlay-badge viewport-canvas__overlay-badge--display">
            {displayMode === "authoring" ? "Authoring" : "Lit"}
          </div>
        </div>
        <div className="viewport-canvas__overlay-text">{getViewportOverlayText(toolMode, viewMode, displayMode)}</div>
        {toolMode !== "box-create" ? null : (
          <div className="viewport-canvas__overlay-preview" data-testid={`viewport-snap-preview-${panelId}`}>
            Next box center: {formatVec3(boxCreatePreview)}
          </div>
        )}
      </div>

      {viewportMessage === null ? null : (
        <div className="viewport-canvas__fallback" role="status">
          <div className="viewport-canvas__fallback-title">Viewport Unavailable</div>
          <div>{viewportMessage}</div>
          {toolMode !== "box-create" || !isActivePanel ? null : (
            <button
              className="toolbar__button toolbar__button--accent"
              type="button"
              data-testid={`viewport-fallback-create-box-${panelId}`}
              onClick={() => onCreateBoxBrush(DEFAULT_BOX_BRUSH_CENTER)}
            >
              Create Default Box
            </button>
          )}
        </div>
      )}
    </div>
  );
}
