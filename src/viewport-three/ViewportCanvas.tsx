import { useEffect, useRef } from "react";

import type { WorldSettings } from "../document/scene-document";

import { ViewportHost } from "./viewport-host";

interface ViewportCanvasProps {
  world: WorldSettings;
}

export function ViewportCanvas({ world }: ViewportCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<ViewportHost | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    const viewportHost = new ViewportHost();
    hostRef.current = viewportHost;
    viewportHost.mount(container, world);

    return () => {
      viewportHost.dispose();
      hostRef.current = null;
    };
  }, []);

  useEffect(() => {
    hostRef.current?.updateWorld(world);
  }, [world]);

  return <div ref={containerRef} className="viewport-canvas" data-testid="viewport-shell" aria-label="Editor viewport" />;
}
