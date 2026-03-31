import { useEffect, useRef, useState } from "react";

import type { EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import { DEFAULT_BOX_BRUSH_SIZE } from "../document/brushes";
import type { SceneDocument, WorldSettings } from "../document/scene-document";
import { DEFAULT_GRID_SIZE } from "../geometry/grid-snapping";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  world: WorldSettings;
  sceneDocument: SceneDocument;
  selection: EditorSelection;
  toolMode: ToolMode;
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

export function ViewportCanvas({
  world,
  sceneDocument,
  selection,
  toolMode,
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
    hostRef.current?.updateDocument(sceneDocument, selection);
  }, [sceneDocument, selection]);

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
      className={`viewport-canvas viewport-canvas--${toolMode}`}
      data-testid="viewport-shell"
      aria-label="Editor viewport"
    >
      <div className="viewport-canvas__overlay" data-testid="viewport-overlay">
        <div className="viewport-canvas__overlay-badge">{toolMode === "box-create" ? "Box Create" : "Select"}</div>
        <div className="viewport-canvas__overlay-text">
          {toolMode === "box-create"
            ? `Click to place a ${DEFAULT_BOX_BRUSH_SIZE.x} x ${DEFAULT_BOX_BRUSH_SIZE.y} x ${DEFAULT_BOX_BRUSH_SIZE.z} box on the ${DEFAULT_GRID_SIZE}m grid.`
            : "Click to select. Middle-drag orbits, Shift + middle-drag pans, wheel zooms, and Numpad Comma frames the selection."}
        </div>
        {toolMode !== "box-create" ? null : (
          <div className="viewport-canvas__overlay-preview" data-testid="viewport-snap-preview">
            Next box center: {formatVec3(boxCreatePreview)}
          </div>
        )}
      </div>

      {viewportMessage === null ? null : (
        <div className="viewport-canvas__fallback" role="status">
          <div className="viewport-canvas__fallback-title">Viewport Unavailable</div>
          <div>{viewportMessage}</div>
          {toolMode !== "box-create" ? null : (
            <button className="toolbar__button toolbar__button--accent" type="button" data-testid="viewport-fallback-create-box" onClick={() => onCreateBoxBrush(DEFAULT_BOX_BRUSH_CENTER)}>
              Create Default Box
            </button>
          )}
        </div>
      )}
    </div>
  );
}
