import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";
import { createModelInstance } from "../../src/assets/model-instances";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateRuntimeSceneBuild } from "../../src/runtime-three/runtime-scene-validation";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";
describe("validateRuntimeSceneBuild", () => {
    it("reports missing loaded geometry for collider modes that depend on imported mesh data", () => {
        const { asset } = createFixtureLoadedModelAssetFromGeometry("asset-model-static-validation", new BoxGeometry(1, 1, 1));
        const modelInstance = createModelInstance({
            id: "model-instance-static-validation",
            assetId: asset.id,
            collision: {
                mode: "static",
                visible: false
            }
        });
        const validation = validateRuntimeSceneBuild({
            ...createEmptySceneDocument({ name: "Missing Model Geometry Scene" }),
            assets: {
                [asset.id]: asset
            },
            modelInstances: {
                [modelInstance.id]: modelInstance
            }
        }, {
            navigationMode: "orbitVisitor",
            loadedModelAssets: {}
        });
        expect(validation.errors.map((diagnostic) => diagnostic.code)).toContain("missing-model-collider-geometry");
    });
    it("fails terrain mode clearly when the source mesh is incompatible with the heightfield path", () => {
        const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-terrain-validation", new BoxGeometry(1, 1, 1));
        const modelInstance = createModelInstance({
            id: "model-instance-terrain-validation",
            assetId: asset.id,
            collision: {
                mode: "terrain",
                visible: true
            }
        });
        const validation = validateRuntimeSceneBuild({
            ...createEmptySceneDocument({ name: "Invalid Terrain Scene" }),
            assets: {
                [asset.id]: asset
            },
            modelInstances: {
                [modelInstance.id]: modelInstance
            }
        }, {
            navigationMode: "orbitVisitor",
            loadedModelAssets: {
                [asset.id]: loadedAsset
            }
        });
        expect(validation.errors.map((diagnostic) => diagnostic.code)).toContain("unsupported-terrain-model-collider");
    });
    it("warns that dynamic collision currently participates as fixed queryable world geometry", () => {
        const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-dynamic-validation", new BoxGeometry(1, 1, 1));
        const modelInstance = createModelInstance({
            id: "model-instance-dynamic-validation",
            assetId: asset.id,
            collision: {
                mode: "dynamic",
                visible: false
            }
        });
        const validation = validateRuntimeSceneBuild({
            ...createEmptySceneDocument({ name: "Dynamic Collider Scene" }),
            assets: {
                [asset.id]: asset
            },
            modelInstances: {
                [modelInstance.id]: modelInstance
            }
        }, {
            navigationMode: "orbitVisitor",
            loadedModelAssets: {
                [asset.id]: loadedAsset
            }
        });
        expect(validation.errors).toEqual([]);
        expect(validation.warnings.map((diagnostic) => diagnostic.code)).toContain("dynamic-model-collider-fixed-query-only");
    });
});
