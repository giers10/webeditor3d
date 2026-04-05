import { jsx as _jsx } from "react/jsx-runtime";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInactiveTransformSession } from "../../src/core/transform-session";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { ViewportCanvas } from "../../src/viewport-three/ViewportCanvas";
import { createDefaultViewportPanelCameraState } from "../../src/viewport-three/viewport-layout";
const { MockViewportHost, viewportHostInstances } = vi.hoisted(() => {
    const viewportHostInstances = [];
    class MockViewportHost {
        mount = vi.fn();
        dispose = vi.fn();
        updateWorld = vi.fn();
        updateAssets = vi.fn();
        updateDocument = vi.fn();
        setViewMode = vi.fn();
        setDisplayMode = vi.fn();
        setCameraState = vi.fn();
        setBrushSelectionChangeHandler = vi.fn();
        setCameraStateChangeHandler = vi.fn();
        setCreationPreviewChangeHandler = vi.fn();
        setCreationCommitHandler = vi.fn();
        setTransformSessionChangeHandler = vi.fn();
        setTransformCommitHandler = vi.fn();
        setTransformCancelHandler = vi.fn();
        setWhiteboxHoverLabelChangeHandler = vi.fn();
        setWhiteboxSelectionMode = vi.fn();
        setWhiteboxSnapSettings = vi.fn();
        setToolMode = vi.fn();
        setCreationPreview = vi.fn();
        setTransformSession = vi.fn();
        setPanelId = vi.fn();
        focusSelection = vi.fn();
        constructor() {
            viewportHostInstances.push(this);
        }
    }
    return {
        MockViewportHost,
        viewportHostInstances
    };
});
vi.mock("../../src/viewport-three/viewport-host", () => ({
    ViewportHost: MockViewportHost
}));
describe("ViewportCanvas", () => {
    beforeEach(() => {
        viewportHostInstances.length = 0;
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({}));
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it("wires the creation commit handler into the viewport host", async () => {
        const sceneDocument = createEmptySceneDocument();
        const cameraState = createDefaultViewportPanelCameraState();
        const toolPreview = {
            kind: "create",
            sourcePanelId: "topLeft",
            target: {
                kind: "box-brush"
            },
            center: null
        };
        const onCommitCreation = vi.fn(() => true);
        const onCameraStateChange = vi.fn((_cameraState) => undefined);
        const onToolPreviewChange = vi.fn((_toolPreview) => undefined);
        const onTransformSessionChange = vi.fn((_transformSession) => undefined);
        const onTransformCommit = vi.fn((_transformSession) => undefined);
        const onTransformCancel = vi.fn(() => undefined);
        const onSelectionChange = vi.fn();
        render(_jsx(ViewportCanvas, { panelId: "topLeft", world: sceneDocument.world, sceneDocument: sceneDocument, projectAssets: sceneDocument.assets, loadedModelAssets: {}, loadedImageAssets: {}, whiteboxSelectionMode: "object", whiteboxSnapEnabled: true, whiteboxSnapStep: 1, selection: { kind: "none" }, toolMode: "create", toolPreview: toolPreview, transformSession: createInactiveTransformSession(), cameraState: cameraState, viewMode: "perspective", displayMode: "authoring", layoutMode: "single", isActivePanel: true, focusRequestId: 0, focusSelection: { kind: "none" }, onSelectionChange: onSelectionChange, onCommitCreation: onCommitCreation, onCameraStateChange: onCameraStateChange, onToolPreviewChange: onToolPreviewChange, onTransformSessionChange: onTransformSessionChange, onTransformCommit: onTransformCommit, onTransformCancel: onTransformCancel }));
        await waitFor(() => {
            expect(viewportHostInstances).toHaveLength(1);
            expect(viewportHostInstances[0].setCreationCommitHandler).toHaveBeenCalledTimes(1);
        });
        const registeredHandler = viewportHostInstances[0].setCreationCommitHandler.mock.calls[0][0];
        expect(registeredHandler(toolPreview)).toBe(true);
        expect(onCommitCreation).toHaveBeenCalledWith(toolPreview);
    });
    it("applies and subscribes to persisted camera state through the viewport host", async () => {
        const sceneDocument = createEmptySceneDocument();
        const cameraState = createDefaultViewportPanelCameraState();
        const onCameraStateChange = vi.fn((_cameraState) => undefined);
        render(_jsx(ViewportCanvas, { panelId: "topLeft", world: sceneDocument.world, sceneDocument: sceneDocument, projectAssets: sceneDocument.assets, loadedModelAssets: {}, loadedImageAssets: {}, whiteboxSelectionMode: "object", whiteboxSnapEnabled: true, whiteboxSnapStep: 1, selection: { kind: "none" }, toolMode: "select", toolPreview: { kind: "none" }, transformSession: createInactiveTransformSession(), cameraState: cameraState, viewMode: "perspective", displayMode: "normal", layoutMode: "single", isActivePanel: true, focusRequestId: 0, focusSelection: { kind: "none" }, onSelectionChange: vi.fn(), onCommitCreation: vi.fn(() => true), onCameraStateChange: onCameraStateChange, onToolPreviewChange: vi.fn(), onTransformSessionChange: vi.fn(), onTransformCommit: vi.fn(), onTransformCancel: vi.fn() }));
        await waitFor(() => {
            expect(viewportHostInstances).toHaveLength(1);
            expect(viewportHostInstances[0].setCameraState).toHaveBeenCalledWith(cameraState);
            expect(viewportHostInstances[0].setCameraStateChangeHandler).toHaveBeenCalledTimes(1);
        });
    });
});
