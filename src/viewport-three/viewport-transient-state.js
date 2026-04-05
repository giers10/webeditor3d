import { areTransformSessionsEqual, cloneTransformSession, createInactiveTransformSession } from "../core/transform-session";
export function createDefaultViewportTransientState() {
    return {
        toolPreview: {
            kind: "none"
        },
        transformSession: createInactiveTransformSession()
    };
}
export function cloneViewportToolPreview(toolPreview) {
    if (toolPreview.kind === "none") {
        return toolPreview;
    }
    return {
        kind: "create",
        sourcePanelId: toolPreview.sourcePanelId,
        target: toolPreview.target.kind === "entity"
            ? {
                kind: "entity",
                entityKind: toolPreview.target.entityKind,
                audioAssetId: toolPreview.target.audioAssetId
            }
            : toolPreview.target.kind === "model-instance"
                ? {
                    kind: "model-instance",
                    assetId: toolPreview.target.assetId
                }
                : {
                    kind: "box-brush"
                },
        center: toolPreview.center === null ? null : { ...toolPreview.center }
    };
}
export function areViewportToolPreviewsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    if (left.kind === "none" || right.kind === "none") {
        return true;
    }
    if (left.kind !== "create" || right.kind !== "create") {
        return false;
    }
    if (left.sourcePanelId !== right.sourcePanelId) {
        return false;
    }
    if (left.target.kind !== right.target.kind) {
        return false;
    }
    if (left.target.kind === "entity" && right.target.kind === "entity") {
        if (left.target.entityKind !== right.target.entityKind || left.target.audioAssetId !== right.target.audioAssetId) {
            return false;
        }
    }
    if (left.target.kind === "model-instance" && right.target.kind === "model-instance" && left.target.assetId !== right.target.assetId) {
        return false;
    }
    if (left.center === null || right.center === null) {
        return left.center === right.center;
    }
    return left.center.x === right.center.x && left.center.y === right.center.y && left.center.z === right.center.z;
}
export function isViewportToolPreviewCompatible(toolMode, toolPreview) {
    if (toolPreview.kind === "none") {
        return true;
    }
    return toolMode === "create" && toolPreview.kind === "create";
}
export function cloneViewportTransientState(transientState) {
    return {
        toolPreview: cloneViewportToolPreview(transientState.toolPreview),
        transformSession: cloneTransformSession(transientState.transformSession)
    };
}
export function areViewportTransientStatesEqual(left, right) {
    return areViewportToolPreviewsEqual(left.toolPreview, right.toolPreview) && areTransformSessionsEqual(left.transformSession, right.transformSession);
}
