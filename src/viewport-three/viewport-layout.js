export const VIEWPORT_LAYOUT_MODES = ["single", "quad"];
export const VIEWPORT_PANEL_IDS = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
const DEFAULT_PERSPECTIVE_CAMERA_POSITION = {
    x: 10,
    y: 9,
    z: 10
};
export const DEFAULT_VIEWPORT_LAYOUT_STATE = {
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
function createDefaultPerspectiveOrbitState() {
    const { x, y, z } = DEFAULT_PERSPECTIVE_CAMERA_POSITION;
    const radius = Math.sqrt(x * x + y * y + z * z);
    return {
        radius,
        theta: Math.atan2(x, z),
        phi: Math.acos(y / radius)
    };
}
export function createDefaultViewportPanelCameraState() {
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
export function cloneViewportPanelCameraState(cameraState) {
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
export function areViewportPanelCameraStatesEqual(a, b) {
    return (a.target.x === b.target.x &&
        a.target.y === b.target.y &&
        a.target.z === b.target.z &&
        a.perspectiveOrbit.radius === b.perspectiveOrbit.radius &&
        a.perspectiveOrbit.theta === b.perspectiveOrbit.theta &&
        a.perspectiveOrbit.phi === b.perspectiveOrbit.phi &&
        a.orthographicZoom === b.orthographicZoom);
}
export function cloneViewportPanelState(panelState) {
    return {
        viewMode: panelState.viewMode,
        displayMode: panelState.displayMode,
        cameraState: cloneViewportPanelCameraState(panelState.cameraState)
    };
}
export function cloneViewportLayoutState(layoutState) {
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
export function createDefaultViewportLayoutState() {
    return cloneViewportLayoutState(DEFAULT_VIEWPORT_LAYOUT_STATE);
}
const VIEWPORT_PANEL_LABELS = {
    topLeft: "Top Left",
    topRight: "Top Right",
    bottomLeft: "Bottom Left",
    bottomRight: "Bottom Right"
};
const VIEWPORT_LAYOUT_MODE_LABELS = {
    single: "Single View",
    quad: "4-Panel"
};
const VIEWPORT_DISPLAY_MODE_LABELS = {
    normal: "Normal",
    authoring: "Authoring",
    wireframe: "Wireframe"
};
export function getViewportPanelLabel(panelId) {
    return VIEWPORT_PANEL_LABELS[panelId];
}
export function getViewportLayoutModeLabel(layoutMode) {
    return VIEWPORT_LAYOUT_MODE_LABELS[layoutMode];
}
export function getViewportDisplayModeLabel(displayMode) {
    return VIEWPORT_DISPLAY_MODE_LABELS[displayMode];
}
