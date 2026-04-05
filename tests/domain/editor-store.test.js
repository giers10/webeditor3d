import { describe, expect, it } from "vitest";
import { createEditorStore } from "../../src/app/editor-store";
import { createCreateBoxBrushCommand } from "../../src/commands/create-box-brush-command";
import { createSetSceneNameCommand } from "../../src/commands/set-scene-name-command";
import { createTransformSession } from "../../src/core/transform-session";
import { createEmptySceneDocument } from "../../src/document/scene-document";
class MemoryStorage {
    values = new Map();
    getItem(key) {
        return this.values.get(key) ?? null;
    }
    setItem(key, value) {
        this.values.set(key, value);
    }
    removeItem(key) {
        this.values.delete(key);
    }
}
class ThrowingStorage {
    getItem() {
        throw new Error("blocked read");
    }
    setItem() {
        throw new Error("blocked write");
    }
    removeItem() { }
}
describe("EditorStore", () => {
    it("returns a stable snapshot between store updates", () => {
        const store = createEditorStore();
        const initialSnapshot = store.getState();
        const repeatedSnapshot = store.getState();
        expect(repeatedSnapshot).toBe(initialSnapshot);
        store.executeCommand(createSetSceneNameCommand("Snapshot Scene"));
        const updatedSnapshot = store.getState();
        expect(updatedSnapshot).not.toBe(initialSnapshot);
        expect(updatedSnapshot.document.name).toBe("Snapshot Scene");
    });
    it("applies command history with undo and redo", () => {
        const store = createEditorStore();
        store.executeCommand(createSetSceneNameCommand("Foundation Room"));
        expect(store.getState().document.name).toBe("Foundation Room");
        expect(store.getState().canUndo).toBe(true);
        expect(store.undo()).toBe(true);
        expect(store.getState().document.name).toBe("Untitled Scene");
        expect(store.getState().canRedo).toBe(true);
        expect(store.redo()).toBe(true);
        expect(store.getState().document.name).toBe("Foundation Room");
    });
    it("saves and loads a local draft document", () => {
        const storage = new MemoryStorage();
        const writerStore = createEditorStore({ storage });
        writerStore.executeCommand(createSetSceneNameCommand("Draft Scene"));
        writerStore.setViewportLayoutMode("quad");
        writerStore.setActiveViewportPanel("bottomRight");
        writerStore.setViewportPanelViewMode("topLeft", "top");
        writerStore.setViewportPanelDisplayMode("topLeft", "wireframe");
        writerStore.setViewportPanelCameraState("topLeft", {
            target: {
                x: 6,
                y: 2,
                z: -4
            },
            perspectiveOrbit: {
                radius: 18,
                theta: 0.9,
                phi: 1.1
            },
            orthographicZoom: 2.25
        });
        expect(writerStore.saveDraft()).toEqual({
            status: "saved",
            message: "Local draft saved."
        });
        const readerStore = createEditorStore({
            initialDocument: createEmptySceneDocument({ name: "Fresh Scene" }),
            storage
        });
        expect(readerStore.loadDraft()).toMatchObject({
            status: "loaded",
            message: "Local draft loaded."
        });
        expect(readerStore.getState().document.name).toBe("Draft Scene");
        expect(readerStore.getState().viewportLayoutMode).toBe("quad");
        expect(readerStore.getState().activeViewportPanelId).toBe("bottomRight");
        expect(readerStore.getState().viewportPanels.topLeft).toMatchObject({
            viewMode: "top",
            displayMode: "wireframe",
            cameraState: {
                target: {
                    x: 6,
                    y: 2,
                    z: -4
                },
                perspectiveOrbit: {
                    radius: 18,
                    theta: 0.9,
                    phi: 1.1
                },
                orthographicZoom: 2.25
            }
        });
    });
    it("fails gracefully when storage access throws", () => {
        const store = createEditorStore({ storage: new ThrowingStorage() });
        expect(store.saveDraft()).toMatchObject({
            status: "error",
            message: expect.stringContaining("blocked write")
        });
        expect(store.loadDraft()).toMatchObject({
            status: "error",
            message: expect.stringContaining("blocked read")
        });
    });
    it("restores the previous editor tool when leaving play mode", () => {
        const store = createEditorStore();
        store.setToolMode("create");
        store.enterPlayMode();
        expect(store.getState().toolMode).toBe("play");
        store.exitPlayMode();
        expect(store.getState().toolMode).toBe("create");
    });
    it("tracks viewport layout and per-panel state independently from the document", () => {
        const store = createEditorStore();
        expect(store.getState().whiteboxSelectionMode).toBe("object");
        expect(store.getState().viewportLayoutMode).toBe("single");
        expect(store.getState().activeViewportPanelId).toBe("topLeft");
        expect(store.getState().viewportPanels.topLeft.viewMode).toBe("perspective");
        expect(store.getState().viewportPanels.topRight.viewMode).toBe("top");
        expect(store.getState().viewportPanels.topRight.displayMode).toBe("authoring");
        expect(store.getState().viewportQuadSplit).toEqual({
            x: 0.5,
            y: 0.5
        });
        store.setViewportLayoutMode("quad");
        store.setActiveViewportPanel("bottomRight");
        store.setViewportPanelViewMode("bottomRight", "front");
        store.setViewportPanelDisplayMode("bottomRight", "normal");
        store.setViewportQuadSplit({
            x: 0.38,
            y: 0.62
        });
        expect(store.getState().viewportLayoutMode).toBe("quad");
        expect(store.getState().activeViewportPanelId).toBe("bottomRight");
        expect(store.getState().viewportPanels.bottomRight.viewMode).toBe("front");
        expect(store.getState().viewportPanels.bottomRight.displayMode).toBe("normal");
        expect(store.getState().viewportQuadSplit).toEqual({
            x: 0.38,
            y: 0.62
        });
    });
    it("tracks whitebox component selection mode independently from document state", () => {
        const store = createEditorStore();
        store.setWhiteboxSelectionMode("face");
        expect(store.getState().whiteboxSelectionMode).toBe("face");
        store.setWhiteboxSelectionMode("edge");
        expect(store.getState().whiteboxSelectionMode).toBe("edge");
        store.setWhiteboxSelectionMode("vertex");
        expect(store.getState().whiteboxSelectionMode).toBe("vertex");
        store.setWhiteboxSelectionMode("object");
        expect(store.getState().whiteboxSelectionMode).toBe("object");
    });
    it("normalizes selected whitebox components back to the owning solid when switching to a different component mode", () => {
        const store = createEditorStore();
        store.executeCommand(createCreateBoxBrushCommand());
        const createdBrush = Object.values(store.getState().document.brushes)[0];
        store.setWhiteboxSelectionMode("face");
        store.setSelection({
            kind: "brushFace",
            brushId: createdBrush.id,
            faceId: "posY"
        });
        expect(store.getState().selection).toEqual({
            kind: "brushFace",
            brushId: createdBrush.id,
            faceId: "posY"
        });
        store.setWhiteboxSelectionMode("edge");
        expect(store.getState().selection).toEqual({
            kind: "brushes",
            ids: [createdBrush.id]
        });
        store.setSelection({
            kind: "brushEdge",
            brushId: createdBrush.id,
            edgeId: "edgeX_posY_negZ"
        });
        store.setWhiteboxSelectionMode("vertex");
        expect(store.getState().selection).toEqual({
            kind: "brushes",
            ids: [createdBrush.id]
        });
        store.setSelection({
            kind: "brushVertex",
            brushId: createdBrush.id,
            vertexId: "posX_posY_negZ"
        });
        store.setWhiteboxSelectionMode("object");
        expect(store.getState().selection).toEqual({
            kind: "brushes",
            ids: [createdBrush.id]
        });
    });
    it("shares transient creation preview state across viewport panels", () => {
        const store = createEditorStore();
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "none"
        });
        store.setViewportToolPreview({
            kind: "create",
            sourcePanelId: "topLeft",
            target: {
                kind: "box-brush"
            },
            center: {
                x: 4,
                y: 0,
                z: 8
            }
        });
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "create",
            sourcePanelId: "topLeft",
            target: {
                kind: "box-brush"
            },
            center: {
                x: 4,
                y: 0,
                z: 8
            }
        });
        store.setViewportToolPreview({
            kind: "create",
            sourcePanelId: "bottomRight",
            target: {
                kind: "entity",
                entityKind: "pointLight",
                audioAssetId: null
            },
            center: {
                x: 2,
                y: 1,
                z: -3
            }
        });
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "create",
            sourcePanelId: "bottomRight",
            target: {
                kind: "entity",
                entityKind: "pointLight",
                audioAssetId: null
            },
            center: {
                x: 2,
                y: 1,
                z: -3
            }
        });
        store.clearViewportToolPreview("topRight");
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "create",
            sourcePanelId: "bottomRight",
            target: {
                kind: "entity",
                entityKind: "pointLight",
                audioAssetId: null
            },
            center: {
                x: 2,
                y: 1,
                z: -3
            }
        });
        store.clearViewportToolPreview("bottomRight");
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "none"
        });
    });
    it("tracks a shared transient transform session and clears it when selection changes", () => {
        const store = createEditorStore();
        store.setTransformSession(createTransformSession({
            source: "keyboard",
            sourcePanelId: "bottomRight",
            operation: "translate",
            target: {
                kind: "brush",
                brushId: "brush-main",
                initialCenter: {
                    x: 0,
                    y: 1,
                    z: 0
                },
                initialRotationDegrees: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                initialSize: {
                    x: 2,
                    y: 2,
                    z: 2
                }
            }
        }));
        expect(store.getState().viewportTransientState.transformSession).toMatchObject({
            kind: "active",
            source: "keyboard",
            sourcePanelId: "bottomRight",
            operation: "translate",
            target: {
                kind: "brush",
                brushId: "brush-main"
            },
            preview: {
                kind: "brush",
                center: {
                    x: 0,
                    y: 1,
                    z: 0
                },
                rotationDegrees: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                size: {
                    x: 2,
                    y: 2,
                    z: 2
                }
            }
        });
        store.setSelection({
            kind: "brushes",
            ids: ["brush-main"]
        });
        expect(store.getState().viewportTransientState.transformSession).toEqual({
            kind: "none"
        });
    });
    it("clears transient viewport preview when leaving create mode", () => {
        const store = createEditorStore();
        store.setToolMode("create");
        store.setViewportToolPreview({
            kind: "create",
            sourcePanelId: "bottomRight",
            target: {
                kind: "model-instance",
                assetId: "asset-1"
            },
            center: null
        });
        store.setToolMode("select");
        expect(store.getState().viewportTransientState.toolPreview).toEqual({
            kind: "none"
        });
    });
});
