import {
  DataTexture,
  EquirectangularReflectionMapping,
  LinearSRGBColorSpace,
  SRGBColorSpace,
  Texture
} from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { createOpaqueId } from "../core/ids";
import { createProjectAssetStorageKey, type ImageAssetMetadata, type ImageAssetRecord } from "./project-assets";
import {
  type ProjectAssetStorage,
  type ProjectAssetStorageFileRecord,
  type ProjectAssetStoragePackageRecord
} from "./project-asset-storage";

export interface LoadedImageAsset {
  assetId: string;
  storageKey: string;
  metadata: ImageAssetMetadata;
  texture: Texture;
  sourceUrl: string;
  revokeSourceUrl: () => void;
}

export interface ImportedImageAssetResult {
  asset: ImageAssetRecord;
  loadedAsset: LoadedImageAsset;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function getFileExtension(sourceName: string): string {
  const match = /\.([^.]+)$/u.exec(sourceName.trim());
  return match === null ? "" : match[1].toLowerCase();
}

function inferImageMimeType(sourceName: string, fallbackMimeType: string): string {
  if (fallbackMimeType.trim().startsWith("image/")) {
    return fallbackMimeType.trim();
  }

  switch (getFileExtension(sourceName)) {
    case "avif":
      return "image/avif";
    case "exr":
      return "image/x-exr";
    case "gif":
      return "image/gif";
    case "hdr":
      return "image/vnd.radiance";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      throw new Error(`Unsupported image asset format for ${sourceName}. Use a browser-supported image file or .exr/.hdr.`);
  }
}

function isHdrFormat(sourceName: string): boolean {
  const ext = getFileExtension(sourceName);
  return ext === "exr" || ext === "hdr";
}

function getImportedFilePath(file: File): string {
  const relativePath = typeof file.webkitRelativePath === "string" ? file.webkitRelativePath.trim() : "";
  const sourcePath = relativePath.length > 0 ? relativePath : file.name.trim();
  return sourcePath.replace(/\\/gu, "/");
}

function createDataUrlForStoredFile(file: ProjectAssetStorageFileRecord): string {
  const byteArray = new Uint8Array(file.bytes);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < byteArray.length; index += chunkSize) {
    binary += String.fromCharCode(...byteArray.subarray(index, index + chunkSize));
  }

  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(file.bytes).toString("base64");
  return `data:${file.mimeType};base64,${base64}`;
}

function createTransientResourceUrl(file: ProjectAssetStorageFileRecord): { revoke: () => void; url: string } {
  if (typeof URL.createObjectURL === "function" && typeof Blob !== "undefined") {
    const objectUrl = URL.createObjectURL(new Blob([file.bytes], { type: file.mimeType }));

    return {
      url: objectUrl,
      revoke: () => {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(objectUrl);
        }
      }
    };
  }

  return {
    url: createDataUrlForStoredFile(file),
    revoke: () => undefined
  };
}

function loadImageElement(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => {
      resolve(image);
    });
    image.addEventListener("error", () => {
      reject(new Error(`Image could not be loaded from ${sourceUrl}.`));
    });
    image.src = sourceUrl;
  });
}

function detectImageHasAlpha(image: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  const sampleWidth = Math.max(1, Math.min(64, image.naturalWidth || image.width));
  const sampleHeight = Math.max(1, Math.min(64, image.naturalHeight || image.height));
  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });

  if (context === null) {
    return false;
  }

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  try {
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 255) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function extractImageAssetMetadata(image: HTMLImageElement): ImageAssetMetadata {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error("Imported image assets must have measurable dimensions.");
  }

  const warnings: string[] = [];
  const aspectRatio = width / height;

  if (Math.abs(aspectRatio - 2) > 0.15) {
    warnings.push("Background images work best as a 2:1 equirectangular panorama.");
  }

  return {
    kind: "image",
    width,
    height,
    hasAlpha: detectImageHasAlpha(image),
    warnings
  };
}

function extractHdrTextureMetadata(texture: DataTexture): ImageAssetMetadata {
  const width = texture.image.width as number;
  const height = texture.image.height as number;
  const warnings: string[] = [];

  if (Math.abs(width / height - 2) > 0.15) {
    warnings.push("Background images work best as a 2:1 equirectangular panorama.");
  }

  return { kind: "image", width, height, hasAlpha: false, warnings };
}

function createImageTexture(image: HTMLImageElement): Texture {
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

function configureHdrTexture(texture: DataTexture): DataTexture {
  // HDR/EXR data is linear — do not apply sRGB color space
  texture.colorSpace = LinearSRGBColorSpace;
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

function loadHdrTexture(url: string, sourceName: string): Promise<DataTexture> {
  return new Promise<DataTexture>((resolve, reject) => {
    if (getFileExtension(sourceName) === "exr") {
      new EXRLoader().load(url, resolve, undefined, () => {
        reject(new Error(`EXR file could not be loaded: ${sourceName}.`));
      });
    } else {
      new RGBELoader().load(url, resolve, undefined, () => {
        reject(new Error(`HDR file could not be loaded: ${sourceName}.`));
      });
    }
  });
}

function createLoadedImageAsset(
  asset: ImageAssetRecord,
  image: HTMLImageElement,
  sourceUrl: string,
  revokeSourceUrl: () => void
): LoadedImageAsset {
  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    metadata: asset.metadata,
    texture: createImageTexture(image),
    sourceUrl,
    revokeSourceUrl
  };
}

function createLoadedHdrImageAsset(
  asset: ImageAssetRecord,
  texture: DataTexture,
  sourceUrl: string,
  revokeSourceUrl: () => void
): LoadedImageAsset {
  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    metadata: asset.metadata,
    texture: configureHdrTexture(texture),
    sourceUrl,
    revokeSourceUrl
  };
}

function createImageAssetRecord(
  sourceName: string,
  mimeType: string,
  byteLength: number,
  metadata: ImageAssetMetadata
): ImageAssetRecord {
  const assetId = createOpaqueId("asset-image");

  return {
    id: assetId,
    kind: "image",
    sourceName,
    mimeType,
    storageKey: createProjectAssetStorageKey(assetId),
    byteLength,
    metadata
  };
}

function getStoredImageAssetFile(
  asset: ImageAssetRecord,
  storedAsset: ProjectAssetStoragePackageRecord
): ProjectAssetStorageFileRecord | null {
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

async function loadImageAssetFromFileRecord(
  asset: ImageAssetRecord,
  fileRecord: ProjectAssetStorageFileRecord
): Promise<LoadedImageAsset> {
  const transientResourceUrl = createTransientResourceUrl(fileRecord);

  if (isHdrFormat(asset.sourceName)) {
    try {
      const texture = await loadHdrTexture(transientResourceUrl.url, asset.sourceName);
      return createLoadedHdrImageAsset(asset, texture, transientResourceUrl.url, transientResourceUrl.revoke);
    } catch (error) {
      transientResourceUrl.revoke();
      throw new Error(`Image asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
    }
  }

  try {
    const image = await loadImageElement(transientResourceUrl.url);
    return createLoadedImageAsset(asset, image, transientResourceUrl.url, transientResourceUrl.revoke);
  } catch (error) {
    transientResourceUrl.revoke();
    throw new Error(`Image asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
  }
}

export async function importBackgroundImageAssetFromFile(
  file: File,
  storage: ProjectAssetStorage
): Promise<ImportedImageAssetResult> {
  const sourceName = getImportedFilePath(file);
  const mimeType = inferImageMimeType(sourceName, file.type);
  const bytes = await file.arrayBuffer();
  const fileRecord: ProjectAssetStorageFileRecord = {
    bytes,
    mimeType
  };
  const transientResourceUrl = createTransientResourceUrl(fileRecord);
  let image: HTMLImageElement;

  try {
    image = await loadImageElement(transientResourceUrl.url);
  } catch (error) {
    transientResourceUrl.revoke();
    throw new Error(`Image import failed for ${sourceName}: ${getErrorDetail(error)}`);
  }

  const metadata = extractImageAssetMetadata(image);
  const asset = createImageAssetRecord(sourceName, mimeType, bytes.byteLength, metadata);
  const loadedAsset = createLoadedImageAsset(asset, image, transientResourceUrl.url, transientResourceUrl.revoke);
  const packageRecord: ProjectAssetStoragePackageRecord = {
    files: {
      [sourceName]: fileRecord
    }
  };

  try {
    await storage.putAsset(asset.storageKey, packageRecord);
    return {
      asset,
      loadedAsset
    };
  } catch (error) {
    disposeLoadedImageAsset(loadedAsset);
    await storage.deleteAsset(asset.storageKey).catch(() => undefined);
    throw error;
  }
}

export async function loadImageAssetFromStorage(
  storage: ProjectAssetStorage,
  asset: ImageAssetRecord
): Promise<LoadedImageAsset> {
  let storedAsset: ProjectAssetStoragePackageRecord | null;

  try {
    storedAsset = await storage.getAsset(asset.storageKey);
  } catch (error) {
    throw new Error(`Image asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
  }

  if (storedAsset === null) {
    throw new Error(`Missing stored binary data for imported image asset ${asset.sourceName}.`);
  }

  const storedImageFile = getStoredImageAssetFile(asset, storedAsset);

  if (storedImageFile === null) {
    throw new Error(`Missing stored image file for imported image asset ${asset.sourceName}.`);
  }

  return loadImageAssetFromFileRecord(asset, storedImageFile);
}

export function disposeLoadedImageAsset(asset: LoadedImageAsset) {
  asset.texture.dispose();
  asset.revokeSourceUrl();
}
