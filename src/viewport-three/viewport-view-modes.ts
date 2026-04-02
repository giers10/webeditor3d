import type { Vec3 } from "../core/vector";

export type ViewportViewMode = "perspective" | "top" | "front" | "side";

export const VIEWPORT_VIEW_MODES = ["perspective", "top", "front", "side"] as const;

export type ViewportGridPlane = "xz" | "xy" | "yz";
export type ViewportAxis = "x" | "y" | "z";

export interface ViewportViewModeDefinition {
  id: ViewportViewMode;
  label: string;
  cameraType: "perspective" | "orthographic";
  cameraDirection: Vec3 | null;
  cameraUp: Vec3;
  gridPlane: ViewportGridPlane;
  snapAxis: ViewportAxis;
  controlHint: string;
}

const VIEWPORT_VIEW_MODE_DEFINITIONS: Record<ViewportViewMode, ViewportViewModeDefinition> = {
  perspective: {
    id: "perspective",
    label: "Perspective",
    cameraType: "perspective",
    cameraDirection: null,
    cameraUp: {
      x: 0,
      y: 1,
      z: 0
    },
    gridPlane: "xz",
    snapAxis: "y",
    controlHint: "Middle-drag orbits, Shift + middle-drag pans, wheel zooms, and Numpad Comma frames the selection."
  },
  top: {
    id: "top",
    label: "Top",
    cameraType: "orthographic",
    cameraDirection: {
      x: 0,
      y: 1,
      z: 0
    },
    cameraUp: {
      x: 0,
      y: 0,
      z: -1
    },
    gridPlane: "xz",
    snapAxis: "y",
    controlHint: "Middle-drag pans, wheel zooms, and Numpad Comma frames the selection."
  },
  front: {
    id: "front",
    label: "Front",
    cameraType: "orthographic",
    cameraDirection: {
      x: 0,
      y: 0,
      z: 1
    },
    cameraUp: {
      x: 0,
      y: 1,
      z: 0
    },
    gridPlane: "xy",
    snapAxis: "z",
    controlHint: "Middle-drag pans, wheel zooms, and Numpad Comma frames the selection."
  },
  side: {
    id: "side",
    label: "Side",
    cameraType: "orthographic",
    cameraDirection: {
      x: -1,
      y: 0,
      z: 0
    },
    cameraUp: {
      x: 0,
      y: 1,
      z: 0
    },
    gridPlane: "yz",
    snapAxis: "x",
    controlHint: "Middle-drag pans, wheel zooms, and Numpad Comma frames the selection."
  }
};

export function getViewportViewModeDefinition(viewMode: ViewportViewMode): ViewportViewModeDefinition {
  return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode];
}

export function getViewportViewModeLabel(viewMode: ViewportViewMode): string {
  return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].label;
}

export function getViewportViewModeGridPlaneLabel(viewMode: ViewportViewMode): string {
  return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].gridPlane.toUpperCase();
}

export function getViewportViewModeControlHint(viewMode: ViewportViewMode): string {
  return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].controlHint;
}

export function getViewportViewModeSnapAxis(viewMode: ViewportViewMode): ViewportAxis {
  return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].snapAxis;
}

export function isOrthographicViewportViewMode(viewMode: ViewportViewMode): boolean {
  return viewMode !== "perspective";
}
