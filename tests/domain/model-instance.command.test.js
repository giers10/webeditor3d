import { describe, expect, it } from "vitest";
import { createEditorStore } from "../../src/app/editor-store";
import { createImportModelAssetCommand } from "../../src/commands/import-model-asset-command";
import { createUpsertModelInstanceCommand } from "../../src/commands/upsert-model-instance-command";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey } from "../../src/assets/project-assets";
import { createEmptySceneDocument } from "../../src/document/scene-document";
describe("model instance commands", () => {
    const modelAsset = {
        id: "asset-model-triangle",
        kind: "model",
        sourceName: "tiny-triangle.gltf",
        mimeType: "model/gltf+json",
        storageKey: createProjectAssetStorageKey("asset-model-triangle"),
        byteLength: 36,
        metadata: {
            kind: "model",
            format: "gltf",
            sceneName: "Fixture Triangle Scene",
            nodeCount: 2,
            meshCount: 1,
            materialNames: ["Fixture Material"],
            textureNames: [],
            animationNames: [],
            boundingBox: {
                min: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                max: {
                    x: 1,
                    y: 1,
                    z: 0
                },
                size: {
                    x: 1,
                    y: 1,
                    z: 0
                }
            },
            warnings: []
        }
    };
    it("imports a model asset and placed model instance through undo and redo", () => {
        const store = createEditorStore();
        const modelInstance = createModelInstance({
            id: "model-instance-triangle",
            assetId: modelAsset.id,
            name: "Fixture Triangle",
            position: {
                x: 4,
                y: 2,
                z: -3
            },
            rotationDegrees: {
                x: 0,
                y: 45,
                z: 0
            },
            scale: {
                x: 1.5,
                y: 2,
                z: 1.5
            }
        });
        store.executeCommand(createImportModelAssetCommand({
            asset: modelAsset,
            modelInstance,
            label: "Import fixture triangle"
        }));
        expect(store.getState().document.assets[modelAsset.id]).toEqual(modelAsset);
        expect(store.getState().document.modelInstances[modelInstance.id]).toEqual(modelInstance);
        expect(store.getState().selection).toEqual({
            kind: "modelInstances",
            ids: [modelInstance.id]
        });
        expect(store.undo()).toBe(true);
        expect(store.getState().document.assets).toEqual({});
        expect(store.getState().document.modelInstances).toEqual({});
        expect(store.redo()).toBe(true);
        expect(store.getState().document.assets[modelAsset.id]).toEqual(modelAsset);
        expect(store.getState().document.modelInstances[modelInstance.id]).toEqual(modelInstance);
    });
    it("updates an existing model instance transform without changing the asset reference", () => {
        const existingModelInstance = createModelInstance({
            id: "model-instance-triangle",
            assetId: modelAsset.id,
            position: {
                x: 1,
                y: 0,
                z: 1
            },
            rotationDegrees: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            }
        });
        const store = createEditorStore({
            initialDocument: {
                ...createEmptySceneDocument({ name: "Model Instance Scene" }),
                assets: {
                    [modelAsset.id]: modelAsset
                },
                modelInstances: {
                    [existingModelInstance.id]: existingModelInstance
                }
            }
        });
        const updatedModelInstance = createModelInstance({
            id: existingModelInstance.id,
            assetId: modelAsset.id,
            name: existingModelInstance.name,
            position: {
                x: 5,
                y: 1,
                z: -2
            },
            rotationDegrees: {
                x: 15,
                y: 90,
                z: 0
            },
            scale: {
                x: 2,
                y: 2,
                z: 2
            }
        });
        store.executeCommand(createUpsertModelInstanceCommand({
            modelInstance: updatedModelInstance,
            label: "Update fixture triangle"
        }));
        expect(store.getState().document.modelInstances[existingModelInstance.id]).toEqual(updatedModelInstance);
        expect(store.getState().document.assets[modelAsset.id]).toEqual(modelAsset);
        expect(store.undo()).toBe(true);
        expect(store.getState().document.modelInstances[existingModelInstance.id]).toEqual(existingModelInstance);
        expect(store.redo()).toBe(true);
        expect(store.getState().document.modelInstances[existingModelInstance.id]).toEqual(updatedModelInstance);
    });
});
