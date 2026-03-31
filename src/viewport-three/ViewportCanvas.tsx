import { useEffect, useRef, useState } from "react";

import type { EditorSelection } from "../core/selection";
import type { SceneDocument, WorldSettings } from "../document/scene-document";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  world: WorldSettings;
  sceneDocument: SceneDocument;
  selection: EditorSelection;
  onBrushSelectionChange(brushId: string | null): void;
}

export function ViewportCanvas({ world, sceneDocument, selection, onBrushSelectionChange }: ViewportCanvasProps) {
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
    hostRef.current?.setBrushSelectionChangeHandler(onBrushSelectionChange);
  }, [onBrushSelectionChange]);

  return (
    <div ref={containerRef} className="viewport-canvas" data-testid="viewport-shell" aria-label="Editor viewport">
      {viewportMessage === null ? null : (
        <div className="viewport-canvas__fallback" role="status">
          <div className="viewport-canvas__fallback-title">Viewport Unavailable</div>
          <div>{viewportMessage}</div>
        </div>
      )}
    </div>
  );
}
