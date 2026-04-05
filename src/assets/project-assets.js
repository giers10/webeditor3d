export const PROJECT_ASSET_KINDS = ["model", "image", "audio"];
export function createProjectAssetStorageKey(assetId) {
    return `project-asset:${assetId}`;
}
export function isProjectAssetKind(value) {
    return value === "model" || value === "image" || value === "audio";
}
function cloneVec3(vector) {
    return {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
}
function cloneBoundingBox(boundingBox) {
    if (boundingBox === null) {
        return null;
    }
    return {
        min: cloneVec3(boundingBox.min),
        max: cloneVec3(boundingBox.max),
        size: cloneVec3(boundingBox.size)
    };
}
function cloneModelAssetMetadata(metadata) {
    return {
        kind: "model",
        format: metadata.format,
        sceneName: metadata.sceneName,
        nodeCount: metadata.nodeCount,
        meshCount: metadata.meshCount,
        materialNames: [...metadata.materialNames],
        textureNames: [...metadata.textureNames],
        animationNames: [...metadata.animationNames],
        boundingBox: cloneBoundingBox(metadata.boundingBox),
        warnings: [...metadata.warnings]
    };
}
function cloneImageAssetMetadata(metadata) {
    return {
        kind: "image",
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha,
        warnings: [...metadata.warnings]
    };
}
function cloneAudioAssetMetadata(metadata) {
    return {
        kind: "audio",
        durationSeconds: metadata.durationSeconds,
        channelCount: metadata.channelCount,
        sampleRateHz: metadata.sampleRateHz,
        warnings: [...metadata.warnings]
    };
}
export function cloneProjectAssetRecord(asset) {
    switch (asset.kind) {
        case "model":
            return {
                id: asset.id,
                kind: "model",
                sourceName: asset.sourceName,
                mimeType: asset.mimeType,
                storageKey: asset.storageKey,
                byteLength: asset.byteLength,
                metadata: cloneModelAssetMetadata(asset.metadata)
            };
        case "image":
            return {
                id: asset.id,
                kind: "image",
                sourceName: asset.sourceName,
                mimeType: asset.mimeType,
                storageKey: asset.storageKey,
                byteLength: asset.byteLength,
                metadata: cloneImageAssetMetadata(asset.metadata)
            };
        case "audio":
            return {
                id: asset.id,
                kind: "audio",
                sourceName: asset.sourceName,
                mimeType: asset.mimeType,
                storageKey: asset.storageKey,
                byteLength: asset.byteLength,
                metadata: cloneAudioAssetMetadata(asset.metadata)
            };
    }
}
export function getProjectAssetKindLabel(kind) {
    switch (kind) {
        case "model":
            return "Model";
        case "image":
            return "Image";
        case "audio":
            return "Audio";
    }
}
