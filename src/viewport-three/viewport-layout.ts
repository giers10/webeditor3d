import type { ViewportViewMode } from "./viewport-view-modes";

export type ViewportLayoutMode = "single" | "quad";

export type ViewportDisplayMode = "normal" | "authoring";

export type ViewportPanelId = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export const VIEWPORT_LAYOUT_MODES = ["single", "quad"] as const;

export const VIEWPORT_PANEL_IDS = ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const;

export interface ViewportPanelState {
  viewMode: ViewportViewMode;
  displayMode: ViewportDisplayMode;
}

export interface ViewportLayoutState {
  layoutMode: ViewportLayoutMode;
  activePanelId: ViewportPanelId;
  panels: Record<ViewportPanelId, ViewportPanelState>;
}

export const DEFAULT_VIEWPORT_LAYOUT_STATE: ViewportLayoutState = {
  layoutMode: "single",
  activePanelId: "topLeft",
  panels: {
    topLeft: {
      viewMode: "perspective",
      displayMode: "normal"
    },
    topRight: {
      viewMode: "top",
      displayMode: "authoring"
    },
    bottomLeft: {
      viewMode: "front",
      displayMode: "authoring"
    },
    bottomRight: {
      viewMode: "side",
      displayMode: "authoring"
    }
  }
};

const VIEWPORT_PANEL_LABELS: Record<ViewportPanelId, string> = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right"
};

const VIEWPORT_LAYOUT_MODE_LABELS: Record<ViewportLayoutMode, string> = {
  single: "Single View",
  quad: "4-Panel"
};

const VIEWPORT_DISPLAY_MODE_LABELS: Record<ViewportDisplayMode, string> = {
  normal: "Normal",
  authoring: "Authoring"
};

export function getViewportPanelLabel(panelId: ViewportPanelId): string {
  return VIEWPORT_PANEL_LABELS[panelId];
}

export function getViewportLayoutModeLabel(layoutMode: ViewportLayoutMode): string {
  return VIEWPORT_LAYOUT_MODE_LABELS[layoutMode];
}

export function getViewportDisplayModeLabel(displayMode: ViewportDisplayMode): string {
  return VIEWPORT_DISPLAY_MODE_LABELS[displayMode];
}

