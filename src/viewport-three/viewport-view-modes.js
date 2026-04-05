export const VIEWPORT_VIEW_MODES = ["perspective", "top", "front", "side"];
const VIEWPORT_VIEW_MODE_DEFINITIONS = {
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
export function getViewportViewModeDefinition(viewMode) {
    return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode];
}
export function getViewportViewModeLabel(viewMode) {
    return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].label;
}
export function getViewportViewModeGridPlaneLabel(viewMode) {
    return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].gridPlane.toUpperCase();
}
export function getViewportViewModeControlHint(viewMode) {
    return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].controlHint;
}
export function getViewportViewModeSnapAxis(viewMode) {
    return VIEWPORT_VIEW_MODE_DEFINITIONS[viewMode].snapAxis;
}
export function isOrthographicViewportViewMode(viewMode) {
    return viewMode !== "perspective";
}
