import type { Vec3 } from "../core/vector";
import type { ViewportPanelId } from "./viewport-layout";

export interface BoxCreateViewportToolPreview {
  kind: "box-create";
  sourcePanelId: ViewportPanelId;
  center: Vec3 | null;
}

export type ViewportToolPreview = BoxCreateViewportToolPreview | { kind: "none" };

export interface ViewportTransientState {
  toolPreview: ViewportToolPreview;
}

export function createDefaultViewportTransientState(): ViewportTransientState {
  return {
    toolPreview: {
      kind: "none"
    }
  };
}

export function cloneViewportToolPreview(toolPreview: ViewportToolPreview): ViewportToolPreview {
  if (toolPreview.kind === "none") {
    return toolPreview;
  }

  return {
    kind: "box-create",
    sourcePanelId: toolPreview.sourcePanelId,
    center: toolPreview.center === null ? null : { ...toolPreview.center }
  };
}

export function areViewportToolPreviewsEqual(left: ViewportToolPreview, right: ViewportToolPreview): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "none" || right.kind === "none") {
    return true;
  }

  if (left.sourcePanelId !== right.sourcePanelId) {
    return false;
  }

  if (left.center === null || right.center === null) {
    return left.center === right.center;
  }

  return left.center.x === right.center.x && left.center.y === right.center.y && left.center.z === right.center.z;
}
