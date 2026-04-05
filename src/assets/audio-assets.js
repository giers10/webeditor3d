import { createOpaqueId } from "../core/ids";
import { createProjectAssetStorageKey } from "./project-assets";
function getErrorDetail(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    return "Unknown error.";
}
function getFileExtension(sourceName) {
    const match = /\.([^.]+)$/u.exec(sourceName.trim());
    return match === null ? "" : match[1].toLowerCase();
}
function inferAudioMimeType(sourceName, fallbackMimeType) {
    if (fallbackMimeType.trim().startsWith("audio/")) {
        return fallbackMimeType.trim();
    }
    switch (getFileExtension(sourceName)) {
        case "aac":
            return "audio/aac";
        case "flac":
            return "audio/flac";
        case "m4a":
        case "mp4":
            return "audio/mp4";
        case "mp3":
            return "audio/mpeg";
        case "oga":
        case "ogg":
            return "audio/ogg";
        case "wav":
        case "wave":
            return "audio/wav";
        case "webm":
            return "audio/webm";
        default:
            throw new Error(`Unsupported audio asset format for ${sourceName}. Use a browser-supported audio file.`);
    }
}
function getImportedFilePath(file) {
    const relativePath = typeof file.webkitRelativePath === "string" ? file.webkitRelativePath.trim() : "";
    const sourcePath = relativePath.length > 0 ? relativePath : file.name.trim();
    return sourcePath.replace(/\\/gu, "/");
}
function createAudioContext() {
    const AudioContextConstructor = globalThis.AudioContext ??
        globalThis.webkitAudioContext;
    if (AudioContextConstructor === undefined) {
        throw new Error("Audio context is unavailable in this browser environment.");
    }
    return new AudioContextConstructor();
}
async function decodeAudioBuffer(bytes) {
    const audioContext = createAudioContext();
    try {
        return await audioContext.decodeAudioData(bytes.slice(0));
    }
    catch (error) {
        throw new Error(getErrorDetail(error));
    }
    finally {
        await audioContext.close().catch(() => undefined);
    }
}
function extractAudioAssetMetadata(buffer) {
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) {
        throw new Error("Imported audio assets must have measurable duration.");
    }
    return {
        kind: "audio",
        durationSeconds: buffer.duration,
        channelCount: buffer.numberOfChannels,
        sampleRateHz: buffer.sampleRate,
        warnings: []
    };
}
function createLoadedAudioAsset(asset, buffer) {
    return {
        assetId: asset.id,
        storageKey: asset.storageKey,
        metadata: asset.metadata,
        buffer
    };
}
function createAudioAssetRecord(sourceName, mimeType, byteLength, metadata) {
    const assetId = createOpaqueId("asset-audio");
    return {
        id: assetId,
        kind: "audio",
        sourceName,
        mimeType,
        storageKey: createProjectAssetStorageKey(assetId),
        byteLength,
        metadata
    };
}
async function loadAudioAssetFromFileRecord(asset, fileRecord) {
    try {
        const buffer = await decodeAudioBuffer(fileRecord.bytes);
        return createLoadedAudioAsset(asset, buffer);
    }
    catch (error) {
        throw new Error(`Audio asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
    }
}
function getStoredAudioAssetFile(asset, storedAsset) {
    const directFile = storedAsset.files[asset.sourceName];
    if (directFile !== undefined) {
        return directFile;
    }
    const storedFiles = Object.values(storedAsset.files);
    if (storedFiles.length === 1) {
        return storedFiles[0];
    }
    return null;
}
export async function importAudioAssetFromFile(file, storage) {
    const sourceName = getImportedFilePath(file);
    const mimeType = inferAudioMimeType(sourceName, file.type);
    const bytes = await file.arrayBuffer();
    let buffer;
    try {
        buffer = await decodeAudioBuffer(bytes);
    }
    catch (error) {
        throw new Error(`Audio import failed for ${sourceName}: ${getErrorDetail(error)}`);
    }
    const metadata = extractAudioAssetMetadata(buffer);
    const asset = createAudioAssetRecord(sourceName, mimeType, bytes.byteLength, metadata);
    const loadedAsset = createLoadedAudioAsset(asset, buffer);
    const packageRecord = {
        files: {
            [sourceName]: {
                bytes,
                mimeType
            }
        }
    };
    try {
        await storage.putAsset(asset.storageKey, packageRecord);
        return {
            asset,
            loadedAsset
        };
    }
    catch (error) {
        await storage.deleteAsset(asset.storageKey).catch(() => undefined);
        throw error;
    }
}
export async function loadAudioAssetFromStorage(storage, asset) {
    let storedAsset;
    try {
        storedAsset = await storage.getAsset(asset.storageKey);
    }
    catch (error) {
        throw new Error(`Audio asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
    }
    if (storedAsset === null) {
        throw new Error(`Missing stored binary data for imported audio asset ${asset.sourceName}.`);
    }
    const storedAudioFile = getStoredAudioAssetFile(asset, storedAsset);
    if (storedAudioFile === null) {
        throw new Error(`Missing stored audio file for imported audio asset ${asset.sourceName}.`);
    }
    return loadAudioAssetFromFileRecord(asset, storedAudioFile);
}
