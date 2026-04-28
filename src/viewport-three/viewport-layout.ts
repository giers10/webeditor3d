import type { Vec3 } from "../core/vector";

import type { ViewportViewMode } from "./viewport-view-modes";

export type ViewportLayoutMode = "single" | "quad";

export type ViewportDisplayMode = "normal" | "authoring" | "wireframe";

export type ViewportPanelId = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export const VIEWPORT_LAYOUT_MODES = ["single", "quad"] as const;

export const VIEWPORT_PANEL_IDS = ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const;

export interface ViewportPerspectiveOrbitState {
  radius: number;
  theta: number;
  phi: number;
}

export interface ViewportPanelCameraState {
  target: Vec3;
  perspectiveOrbit: ViewportPerspectiveOrbitState;
  orthographicZoom: number;
}

export interface ViewportPanelState {
  viewMode: ViewportViewMode;
  displayMode: ViewportDisplayMode;
  cameraState: ViewportPanelCameraState;
}

export interface ViewportQuadSplit {
  x: number;
  y: number;
}

export interface ViewportLayoutState {
  layoutMode: ViewportLayoutMode;
  activePanelId: ViewportPanelId;
  panels: Record<ViewportPanelId, ViewportPanelState>;
  viewportQuadSplit: ViewportQuadSplit;
}

const DEFAULT_PERSPECTIVE_CAMERA_POSITION = {
  x: 10,
  y: 9,
  z: 10
} as const;

export const DEFAULT_VIEWPORT_LAYOUT_STATE: ViewportLayoutState = {
  layoutMode: "single",
  activePanelId: "topLeft",
  panels: {
    topLeft: {
      viewMode: "perspective",
      displayMode: "normal",
      cameraState: createDefaultViewportPanelCameraState()
    },
    topRight: {
      viewMode: "top",
      displayMode: "authoring",
      cameraState: createDefaultViewportPanelCameraState()
    },
    bottomLeft: {
      viewMode: "front",
      displayMode: "authoring",
      cameraState: createDefaultViewportPanelCameraState()
    },
    bottomRight: {
      viewMode: "side",
      displayMode: "authoring",
      cameraState: createDefaultViewportPanelCameraState()
    }
  },
  viewportQuadSplit: {
    x: 0.5,
    y: 0.5
  }
};

function createDefaultPerspectiveOrbitState(): ViewportPerspectiveOrbitState {
  const { x, y, z } = DEFAULT_PERSPECTIVE_CAMERA_POSITION;
  const radius = Math.sqrt(x * x + y * y + z * z);

  return {
    radius,
    theta: Math.atan2(x, z),
    phi: Math.acos(y / radius)
  };
}

export function createDefaultViewportPanelCameraState(): ViewportPanelCameraState {
  return {
    target: {
      x: 0,
      y: 0,
      z: 0
    },
    perspectiveOrbit: createDefaultPerspectiveOrbitState(),
    orthographicZoom: 1
  };
}

export function cloneViewportPanelCameraState(cameraState: ViewportPanelCameraState): ViewportPanelCameraState {
  return {
    target: {
      ...cameraState.target
    },
    perspectiveOrbit: {
      ...cameraState.perspectiveOrbit
    },
    orthographicZoom: cameraState.orthographicZoom
  };
}

const VIEWPORT_CAMERA_STATE_EPSILON = 1e-6;

function areCameraNumbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= VIEWPORT_CAMERA_STATE_EPSILON;
}

export function areViewportPanelCameraStatesEqual(a: ViewportPanelCameraState, b: ViewportPanelCameraState): boolean {
  return (
    areCameraNumbersEqual(a.target.x, b.target.x) &&
    areCameraNumbersEqual(a.target.y, b.target.y) &&
    areCameraNumbersEqual(a.target.z, b.target.z) &&
    areCameraNumbersEqual(
      a.perspectiveOrbit.radius,
      b.perspectiveOrbit.radius
    ) &&
    areCameraNumbersEqual(a.perspectiveOrbit.theta, b.perspectiveOrbit.theta) &&
    areCameraNumbersEqual(a.perspectiveOrbit.phi, b.perspectiveOrbit.phi) &&
    areCameraNumbersEqual(a.orthographicZoom, b.orthographicZoom)
  );
}

export function cloneViewportPanelState(panelState: ViewportPanelState): ViewportPanelState {
  return {
    viewMode: panelState.viewMode,
    displayMode: panelState.displayMode,
    cameraState: cloneViewportPanelCameraState(panelState.cameraState)
  };
}

export function cloneViewportLayoutState(layoutState: ViewportLayoutState): ViewportLayoutState {
  return {
    layoutMode: layoutState.layoutMode,
    activePanelId: layoutState.activePanelId,
    panels: {
      topLeft: cloneViewportPanelState(layoutState.panels.topLeft),
      topRight: cloneViewportPanelState(layoutState.panels.topRight),
      bottomLeft: cloneViewportPanelState(layoutState.panels.bottomLeft),
      bottomRight: cloneViewportPanelState(layoutState.panels.bottomRight)
    },
    viewportQuadSplit: {
      ...layoutState.viewportQuadSplit
    }
  };
}

export function createDefaultViewportLayoutState(): ViewportLayoutState {
  return cloneViewportLayoutState(DEFAULT_VIEWPORT_LAYOUT_STATE);
}

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
  authoring: "Authoring",
  wireframe: "Wireframe"
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
