import { Box3, Group, Mesh, MeshBasicMaterial } from "three";
import { createProjectAssetStorageKey } from "../../src/assets/project-assets";
function countMeshes(group) {
    let count = 0;
    group.traverse((object) => {
        if (object.isMesh === true) {
            count += 1;
        }
    });
    return count;
}
function countNodes(group) {
    let count = 0;
    group.traverse(() => {
        count += 1;
    });
    return count;
}
function createBoundingBox(group) {
    const bounds = new Box3().setFromObject(group);
    if (bounds.isEmpty()) {
        return null;
    }
    return {
        min: {
            x: bounds.min.x,
            y: bounds.min.y,
            z: bounds.min.z
        },
        max: {
            x: bounds.max.x,
            y: bounds.max.y,
            z: bounds.max.z
        },
        size: {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        }
    };
}
export function createFixtureModelAssetRecord(id, template, sourceName = `${id}.glb`) {
    template.updateMatrixWorld(true);
    return {
        id,
        kind: "model",
        sourceName,
        mimeType: "model/gltf-binary",
        storageKey: createProjectAssetStorageKey(id),
        byteLength: 128,
        metadata: {
            kind: "model",
            format: "glb",
            sceneName: sourceName,
            nodeCount: countNodes(template),
            meshCount: countMeshes(template),
            materialNames: [],
            textureNames: [],
            animationNames: [],
            boundingBox: createBoundingBox(template),
            warnings: []
        }
    };
}
export function createFixtureLoadedModelAsset(asset, template) {
    template.updateMatrixWorld(true);
    return {
        assetId: asset.id,
        storageKey: asset.storageKey,
        metadata: asset.metadata,
        template,
        animations: []
    };
}
export function createFixtureLoadedModelAssetFromGeometry(assetId, geometry) {
    const template = new Group();
    template.add(new Mesh(geometry, new MeshBasicMaterial()));
    template.updateMatrixWorld(true);
    const asset = createFixtureModelAssetRecord(assetId, template);
    return {
        asset,
        loadedAsset: createFixtureLoadedModelAsset(asset, template)
    };
}
