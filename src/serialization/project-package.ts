import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import type { SceneDocument } from "../document/scene-document";
import { getProjectAssetKindLabel, type ProjectAssetRecord } from "../assets/project-assets";
import type { ProjectAssetStorage, ProjectAssetStoragePackageRecord } from "../assets/project-asset-storage";
import { parseSceneDocumentJson, serializeSceneDocument } from "./scene-document-json";

export const PROJECT_PACKAGE_FILE_EXTENSION = ".we3d";
export const PROJECT_PACKAGE_SCENE_PATH = "scene.json";
export const PROJECT_PACKAGE_ASSETS_DIRECTORY = "assets";

type ProjectPackageTree = Record<string, Uint8Array | ProjectPackageTree>;

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function formatAssetLabel(asset: ProjectAssetRecord): string {
  return `${getProjectAssetKindLabel(asset.kind).toLowerCase()} asset ${asset.sourceName}`;
}

function getFileExtension(path: string): string {
  const match = /\.([^.]+)$/u.exec(path.trim());
  return match === null ? "" : match[1].toLowerCase();
}

function inferMimeTypeFromPath(path: string, fallbackMimeType = "application/octet-stream"): string {
  switch (getFileExtension(path)) {
    case "aac":
      return "audio/aac";
    case "avif":
      return "image/avif";
    case "bin":
      return "application/octet-stream";
    case "exr":
      return "image/x-exr";
    case "flac":
      return "audio/flac";
    case "gif":
      return "image/gif";
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "hdr":
      return "image/vnd.radiance";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "json":
      return "application/json";
    case "ktx2":
      return "image/ktx2";
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "oga":
    case "ogg":
      return "audio/ogg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "wav":
    case "wave":
      return "audio/wav";
    case "webm":
      return "audio/webm";
    case "webp":
      return "image/webp";
    default:
      return fallbackMimeType;
  }
}

function normalizePackagePath(path: string): string {
  const segments = path.replace(/\\/gu, "/").split("/");
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (segment.length === 0 || segment === ".") {
      continue;
    }

    if (segment === "..") {
      throw new Error(`Project package path ${path} cannot traverse parent directories.`);
    }

    resolvedSegments.push(segment);
  }

  return resolvedSegments.join("/");
}

function cloneUint8ArrayIntoArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const clonedBytes = new Uint8Array(bytes.byteLength);
  clonedBytes.set(bytes);
  return clonedBytes.buffer;
}

function createAssetPackagePath(assetId: string, relativePath: string): string {
  return `${PROJECT_PACKAGE_ASSETS_DIRECTORY}/${assetId}/${relativePath}`;
}

function setPackagedFile(tree: ProjectPackageTree, packagePath: string, bytes: Uint8Array) {
  const segments = normalizePackagePath(packagePath).split("/");
  let currentTree = tree;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const currentEntry = currentTree[segment];

    if (currentEntry instanceof Uint8Array) {
      throw new Error(`Project save failed: packaged file path ${packagePath} conflicts with an existing file.`);
    }

    if (currentEntry === undefined) {
      currentTree[segment] = {};
    }

    currentTree = currentTree[segment] as ProjectPackageTree;
  }

  const fileName = segments.at(-1);

  if (fileName === undefined || fileName.length === 0) {
    throw new Error(`Project save failed: packaged file path ${packagePath} is invalid.`);
  }

  if (currentTree[fileName] !== undefined) {
    throw new Error(`Project save failed: duplicate packaged asset path ${packagePath}.`);
  }

  currentTree[fileName] = bytes;
}

function resolveStoredFileMimeType(asset: ProjectAssetRecord, relativePath: string): string {
  if (normalizePackagePath(relativePath) === normalizePackagePath(asset.sourceName)) {
    return asset.mimeType;
  }

  return inferMimeTypeFromPath(relativePath);
}

function readPackageEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const rawEntries = unzipSync(bytes);
  const entries = new Map<string, Uint8Array>();

  for (const [rawPath, entryBytes] of Object.entries(rawEntries)) {
    const normalizedPath = normalizePackagePath(rawPath);

    if (normalizedPath.length === 0 || normalizedPath.endsWith("/")) {
      continue;
    }

    if (entries.has(normalizedPath)) {
      throw new Error(`Project package contains duplicate entry ${normalizedPath}.`);
    }

    entries.set(normalizedPath, entryBytes);
  }

  return entries;
}

function buildStoredAssetRecordsFromPackage(
  entries: Map<string, Uint8Array>,
  document: SceneDocument
): Map<string, ProjectAssetStoragePackageRecord> {
  const packageRecords = new Map<string, ProjectAssetStoragePackageRecord>();

  for (const asset of Object.values(document.assets)) {
    packageRecords.set(asset.id, { files: {} });
  }

  for (const [packagePath, bytes] of entries) {
    if (!packagePath.startsWith(`${PROJECT_PACKAGE_ASSETS_DIRECTORY}/`)) {
      continue;
    }

    const relativePackagePath = packagePath.slice(PROJECT_PACKAGE_ASSETS_DIRECTORY.length + 1);
    const slashIndex = relativePackagePath.indexOf("/");

    if (slashIndex === -1) {
      continue;
    }

    const assetId = relativePackagePath.slice(0, slashIndex);
    const assetRelativePath = normalizePackagePath(relativePackagePath.slice(slashIndex + 1));

    if (assetRelativePath.length === 0) {
      continue;
    }

    const asset = document.assets[assetId];
    const storedAsset = packageRecords.get(assetId);

    if (asset === undefined || storedAsset === undefined) {
      continue;
    }

    if (storedAsset.files[assetRelativePath] !== undefined) {
      throw new Error(`Project package contains duplicate file ${createAssetPackagePath(assetId, assetRelativePath)}.`);
    }

    storedAsset.files[assetRelativePath] = {
      bytes: cloneUint8ArrayIntoArrayBuffer(bytes),
      mimeType: resolveStoredFileMimeType(asset, assetRelativePath)
    };
  }

  return packageRecords;
}

export async function saveProjectPackage(
  document: SceneDocument,
  storage: ProjectAssetStorage | null
): Promise<Uint8Array> {
  const sceneJson = serializeSceneDocument(document);
  const assets = Object.values(document.assets).sort((left, right) => left.id.localeCompare(right.id));

  if (assets.length > 0 && storage === null) {
    throw new Error("Project save failed: project asset storage is unavailable for asset-backed scenes.");
  }

  const packageEntries: ProjectPackageTree = {};
  setPackagedFile(packageEntries, PROJECT_PACKAGE_SCENE_PATH, strToU8(sceneJson));
  const missingAssetDiagnostics: string[] = [];

  for (const asset of assets) {
    let storedAsset: ProjectAssetStoragePackageRecord | null;

    try {
      storedAsset = await storage?.getAsset(asset.storageKey) ?? null;
    } catch (error) {
      throw new Error(`Project save failed while reading ${formatAssetLabel(asset)}: ${getErrorDetail(error)}`);
    }

    if (storedAsset === null) {
      missingAssetDiagnostics.push(`Missing stored binary data for ${formatAssetLabel(asset)}.`);
      continue;
    }

    const storedFiles = Object.entries(storedAsset.files).sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath));

    if (storedFiles.length === 0) {
      missingAssetDiagnostics.push(`No stored files were found for ${formatAssetLabel(asset)}.`);
      continue;
    }

    for (const [storedPath, storedFile] of storedFiles) {
      const normalizedStoredPath = normalizePackagePath(storedPath);

      if (normalizedStoredPath.length === 0) {
        throw new Error(`Project save failed: ${formatAssetLabel(asset)} contains an empty stored file path.`);
      }

      const packagePath = createAssetPackagePath(asset.id, normalizedStoredPath);

      setPackagedFile(packageEntries, packagePath, new Uint8Array(storedFile.bytes.slice(0)));
    }
  }

  if (missingAssetDiagnostics.length > 0) {
    throw new Error(`Project save failed: ${missingAssetDiagnostics.join(" | ")}`);
  }

  return zipSync(packageEntries, {
    level: 6
  });
}

export async function loadProjectPackage(
  bytes: Uint8Array,
  storage: ProjectAssetStorage | null
): Promise<SceneDocument> {
  let entries: Map<string, Uint8Array>;

  try {
    entries = readPackageEntries(bytes);
  } catch (error) {
    throw new Error(`Project load failed: ${getErrorDetail(error)}`);
  }

  const sceneEntry = entries.get(PROJECT_PACKAGE_SCENE_PATH);

  if (sceneEntry === undefined) {
    throw new Error("Project load failed: project package is missing scene.json.");
  }

  let document: SceneDocument;

  try {
    document = parseSceneDocumentJson(strFromU8(sceneEntry));
  } catch (error) {
    throw new Error(`Project load failed: ${getErrorDetail(error)}`);
  }

  const assets = Object.values(document.assets).sort((left, right) => left.id.localeCompare(right.id));

  if (assets.length === 0) {
    return document;
  }

  if (storage === null) {
    throw new Error("Project load failed: project asset storage is unavailable for asset-backed scenes.");
  }

  const packagedAssetRecords = buildStoredAssetRecordsFromPackage(entries, document);

  for (const asset of assets) {
    const packagedAsset = packagedAssetRecords.get(asset.id);

    if (packagedAsset === undefined || Object.keys(packagedAsset.files).length === 0) {
      throw new Error(`Project load failed: project package is missing bundled files for ${formatAssetLabel(asset)}.`);
    }
  }

  const previousStoredAssets = new Map<string, ProjectAssetStoragePackageRecord | null>();
  const writtenStorageKeys: string[] = [];

  try {
    for (const asset of assets) {
      const packagedAsset = packagedAssetRecords.get(asset.id);

      if (packagedAsset === undefined) {
        continue;
      }

      previousStoredAssets.set(asset.storageKey, await storage.getAsset(asset.storageKey));
      await storage.putAsset(asset.storageKey, packagedAsset);
      writtenStorageKeys.push(asset.storageKey);
    }
  } catch (error) {
    for (const storageKey of writtenStorageKeys.reverse()) {
      const previousStoredAsset = previousStoredAssets.get(storageKey) ?? null;

      try {
        if (previousStoredAsset === null) {
          await storage.deleteAsset(storageKey);
        } else {
          await storage.putAsset(storageKey, previousStoredAsset);
        }
      } catch {
        // Preserve the original storage failure.
      }
    }

    throw new Error(`Project load failed while restoring packaged assets: ${getErrorDetail(error)}`);
  }

  return document;
}
