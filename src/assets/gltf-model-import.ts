import { Box3, Group, Mesh, type AnimationClip, type Material, type Object3D, type Texture } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { createModelInstance, type ModelInstance } from "./model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetMetadata,
  type ModelAssetRecord
} from "./project-assets";
import { createOpaqueId } from "../core/ids";
import type {
  ProjectAssetStorage,
  ProjectAssetStorageFileRecord,
  ProjectAssetStoragePackageRecord
} from "./project-asset-storage";

interface ImportedModelFileEntry {
  bytes: ArrayBuffer;
  mimeType: string;
  path: string;
}

interface ImportedModelFileSet {
  fileEntries: ImportedModelFileEntry[];
  packageRecord: ProjectAssetStoragePackageRecord;
  rootFile: ImportedModelFileEntry;
  totalByteLength: number;
}

export interface LoadedModelAsset {
  assetId: string;
  storageKey: string;
  metadata: ModelAssetMetadata;
  template: Group;
  animations: AnimationClip[];
}

export interface ImportedModelAssetResult {
  asset: ModelAssetRecord;
  modelInstance: ModelInstance;
  loadedAsset: LoadedModelAsset;
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

function inferFileMimeType(sourceName: string, fallbackMimeType: string): string {
  if (fallbackMimeType.trim().length > 0 && fallbackMimeType !== "application/octet-stream") {
    return fallbackMimeType;
  }

  switch (getFileExtension(sourceName)) {
    case "bin":
      return "application/octet-stream";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "ktx2":
      return "image/ktx2";
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    default:
      return fallbackMimeType.trim().length > 0 ? fallbackMimeType : "application/octet-stream";
  }
}

function inferModelAssetFormat(sourceName: string, mimeType: string): "glb" | "gltf" {
  const extension = getFileExtension(sourceName);

  if (mimeType === "model/gltf-binary" || extension === "glb") {
    return "glb";
  }

  if (mimeType === "model/gltf+json" || mimeType === "application/json" || extension === "gltf") {
    return "gltf";
  }

  throw new Error(`Unsupported model asset format for ${sourceName}. Use .glb or .gltf.`);
}

function inferModelMimeType(format: "glb" | "gltf"): string {
  return format === "glb" ? "model/gltf-binary" : "model/gltf+json";
}

function stripUrlQueryAndHash(path: string): string {
  const queryIndex = path.search(/[?#]/u);
  return queryIndex === -1 ? path : path.slice(0, queryIndex);
}

function normalizeRelativePath(path: string): string {
  const normalizedPath = stripUrlQueryAndHash(path.trim()).replace(/\\/gu, "/");
  const segments = normalizedPath.split("/");
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }

    if (segment === "..") {
      const previousSegment = resolvedSegments.at(-1);

      if (previousSegment !== undefined && previousSegment !== "..") {
        resolvedSegments.pop();
      } else {
        resolvedSegments.push("..");
      }

      continue;
    }

    resolvedSegments.push(segment);
  }

  return resolvedSegments.join("/");
}

function getPathDirectory(path: string): string {
  const normalizedPath = normalizeRelativePath(path);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  return lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex);
}

function getRelativePath(fromDirectory: string, targetPath: string): string {
  const normalizedFromSegments = normalizeRelativePath(fromDirectory).split("/").filter((segment) => segment.length > 0);
  const normalizedTargetSegments = normalizeRelativePath(targetPath).split("/").filter((segment) => segment.length > 0);

  while (
    normalizedFromSegments.length > 0 &&
    normalizedTargetSegments.length > 0 &&
    normalizedFromSegments[0] === normalizedTargetSegments[0]
  ) {
    normalizedFromSegments.shift();
    normalizedTargetSegments.shift();
  }

  return [...new Array(normalizedFromSegments.length).fill(".."), ...normalizedTargetSegments].join("/");
}

function getImportedFilePath(file: File): string {
  const relativePath = typeof file.webkitRelativePath === "string" ? file.webkitRelativePath.trim() : "";
  return normalizeRelativePath(relativePath.length > 0 ? relativePath : file.name.trim());
}

function createBoundingBoxFromObject(object: Object3D): ModelAssetMetadata["boundingBox"] {
  const box = new Box3().setFromObject(object);

  if (box.isEmpty()) {
    return null;
  }

  const min = {
    x: box.min.x,
    y: box.min.y,
    z: box.min.z
  };
  const max = {
    x: box.max.x,
    y: box.max.y,
    z: box.max.z
  };

  return {
    min,
    max,
    size: {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z
    }
  };
}

function collectMaterialNames(scene: Group): string[] {
  const names = new Set<string>();

  scene.traverse((object) => {
    const maybeMesh = object as Mesh & { isMesh?: boolean };

    if (maybeMesh.isMesh !== true) {
      return;
    }

    const materials = Array.isArray(maybeMesh.material) ? maybeMesh.material : [maybeMesh.material];

    for (const material of materials) {
      if (material.name.trim().length > 0) {
        names.add(material.name);
      }
    }
  });

  return [...names].sort((left, right) => left.localeCompare(right));
}

function collectTextureNames(parserJson: { textures?: Array<{ name?: string }> }): string[] {
  const textures = parserJson.textures ?? [];
  const names = new Set<string>();

  for (const texture of textures) {
    if (texture.name !== undefined && texture.name.trim().length > 0) {
      names.add(texture.name);
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

function collectAnimationNames(gltf: GLTF): string[] {
  return gltf.animations
    .map((animation, index) => (animation.name.trim().length > 0 ? animation.name : `Animation ${index + 1}`))
    .sort((left, right) => left.localeCompare(right));
}

function countNodes(scene: Group): number {
  let count = 0;

  scene.traverse(() => {
    count += 1;
  });

  return count;
}

export function extractModelAssetMetadata(gltf: GLTF, format: "glb" | "gltf"): ModelAssetMetadata {
  gltf.scene.updateMatrixWorld(true);
  const boundingBox = createBoundingBoxFromObject(gltf.scene);

  let actualMeshCount = 0;

  gltf.scene.traverse((object) => {
    if ((object as Mesh).isMesh === true) {
      actualMeshCount += 1;
    }
  });

  const parserJson = gltf.parser.json as { materials?: Array<{ name?: string }>; textures?: Array<{ name?: string }> };
  const materialNames = collectMaterialNames(gltf.scene);
  const textureNames = collectTextureNames(parserJson);
  const animationNames = collectAnimationNames(gltf);
  const warnings: string[] = [];

  if (boundingBox === null) {
    warnings.push("The imported model does not contain measurable geometry.");
  }

  if (actualMeshCount === 0) {
    warnings.push("The imported model does not contain any meshes.");
  }

  if (materialNames.length === 0 && (parserJson.materials?.length ?? 0) > 0) {
    for (const material of parserJson.materials ?? []) {
      if (material.name !== undefined && material.name.trim().length > 0) {
        materialNames.push(material.name);
      }
    }
  }

  return {
    kind: "model",
    format,
    sceneName: gltf.scene.name.trim().length > 0 ? gltf.scene.name : null,
    nodeCount: countNodes(gltf.scene),
    meshCount: actualMeshCount,
    materialNames: [...new Set(materialNames)].sort((left, right) => left.localeCompare(right)),
    textureNames,
    animationNames,
    boundingBox,
    warnings
  };
}

function createLoadedModelAsset(asset: ModelAssetRecord, template: Group, animations: AnimationClip[]): LoadedModelAsset {
  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    metadata: asset.metadata,
    template,
    animations
  };
}

function createModelAssetRecord(
  sourceName: string,
  mimeType: string,
  byteLength: number,
  metadata: ModelAssetMetadata
): ModelAssetRecord {
  const assetId = createOpaqueId("asset-model");

  return {
    id: assetId,
    kind: "model",
    sourceName,
    mimeType,
    storageKey: createProjectAssetStorageKey(assetId),
    byteLength,
    metadata
  };
}

async function loadGltfFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<GLTF> {
  const loader = new GLTFLoader();
  return loader.parseAsync(arrayBuffer, "");
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

function rewriteGltfResourceUris(
  gltfJson: Record<string, unknown>,
  files: Record<string, ProjectAssetStorageFileRecord>
): { missingUris: string[]; revokeUrls: Array<() => void> } {
  const dataUrlsByPath = new Map<string, string>();
  const revokeUrls: Array<() => void> = [];
  const missingUris = new Set<string>();

  const resolveUri = (uri: string): string | null => {
    if (uri.startsWith("data:") || uri.startsWith("blob:")) {
      return uri;
    }

    const normalizedUri = normalizeRelativePath(uri);
    const storedFile = files[normalizedUri];

    if (storedFile === undefined) {
      return null;
    }

    const cachedDataUrl = dataUrlsByPath.get(normalizedUri);

    if (cachedDataUrl !== undefined) {
      return cachedDataUrl;
    }

    const transientResourceUrl = createTransientResourceUrl(storedFile);
    dataUrlsByPath.set(normalizedUri, transientResourceUrl.url);
    revokeUrls.push(transientResourceUrl.revoke);
    return transientResourceUrl.url;
  };

  const rewriteUri = (value: unknown): unknown => {
    if (typeof value !== "string") {
      return value;
    }

    const resolvedUri = resolveUri(stripUrlQueryAndHash(value));

    if (resolvedUri === null) {
      missingUris.add(normalizeRelativePath(value));
      return value;
    }

    return resolvedUri;
  };

  const buffers = Array.isArray(gltfJson.buffers) ? (gltfJson.buffers as Array<Record<string, unknown>>) : [];
  for (const buffer of buffers) {
    if (typeof buffer.uri === "string") {
      buffer.uri = rewriteUri(buffer.uri);
    }
  }

  const images = Array.isArray(gltfJson.images) ? (gltfJson.images as Array<Record<string, unknown>>) : [];
  for (const image of images) {
    if (typeof image.uri === "string") {
      image.uri = rewriteUri(image.uri);
    }
  }

  return {
    missingUris: [...missingUris],
    revokeUrls
  };
}

function cloneTemplateScene(scene: Group): Group {
  return scene.clone(true);
}

function cloneMaterial(material: Material): Material {
  return material.clone();
}

function cloneMeshResources(object: Object3D) {
  const maybeMesh = object as Mesh & { isMesh?: boolean };

  if (maybeMesh.isMesh !== true) {
    return;
  }

  maybeMesh.geometry = maybeMesh.geometry.clone();
  maybeMesh.material = Array.isArray(maybeMesh.material)
    ? maybeMesh.material.map((material) => cloneMaterial(material))
    : cloneMaterial(maybeMesh.material);
}

function disposeTexture(texture: Texture, seenTextures: Set<Texture>) {
  if (seenTextures.has(texture)) {
    return;
  }

  seenTextures.add(texture);
  texture.dispose();
}

function disposeMaterialResources(material: Material, disposeTextures: boolean, seenTextures: Set<Texture>) {
  if (disposeTextures) {
    for (const value of Object.values(material as unknown as Record<string, unknown>)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry !== null && typeof entry === "object" && "isTexture" in entry) {
            disposeTexture(entry as Texture, seenTextures);
          }
        }

        continue;
      }

      if (typeof value === "object" && "isTexture" in value) {
        disposeTexture(value as Texture, seenTextures);
      }
    }
  }

  material.dispose();
}

function disposeMeshResources(object: Object3D, disposeTextures: boolean, seenTextures: Set<Texture>) {
  const maybeMesh = object as Mesh & { isMesh?: boolean };

  if (maybeMesh.isMesh !== true) {
    return;
  }

  maybeMesh.geometry.dispose();

  if (Array.isArray(maybeMesh.material)) {
    for (const material of maybeMesh.material) {
      disposeMaterialResources(material, disposeTextures, seenTextures);
    }
  } else {
    disposeMaterialResources(maybeMesh.material, disposeTextures, seenTextures);
  }
}

export function instantiateModelTemplate(template: Group): Group {
  const clone = cloneSkeleton(template) as Group;

  clone.traverse(cloneMeshResources);

  return clone;
}

export function disposeModelTemplate(template: Group) {
  const seenTextures = new Set<Texture>();

  template.traverse((object) => {
    disposeMeshResources(object, true, seenTextures);
  });
}

export function disposeModelInstance(instance: Group) {
  const seenTextures = new Set<Texture>();

  instance.traverse((object) => {
    disposeMeshResources(object, false, seenTextures);
  });
}

async function loadModelFileSet(files: File[]): Promise<ImportedModelFileSet> {
  if (files.length === 0) {
    throw new Error("Select a .glb or .gltf file to import.");
  }

  const modelFiles = files.filter((file) => {
    try {
      inferModelAssetFormat(file.name, file.type);
      return true;
    } catch {
      return false;
    }
  });

  if (modelFiles.length === 0) {
    throw new Error("Select a .glb or .gltf file to import.");
  }

  if (modelFiles.length > 1) {
    throw new Error("Select exactly one .glb or .gltf file and any matching sidecar resources.");
  }

  const rootFile = modelFiles[0];
  const rootSourcePath = getImportedFilePath(rootFile);
  const rootDirectory = getPathDirectory(rootSourcePath);
  const importedFiles = await Promise.all(
    files.map(async (file) => ({
      file,
      bytes: await file.arrayBuffer()
    }))
  );
  const fileEntries: ImportedModelFileEntry[] = [];
  const packageFiles: Record<string, ProjectAssetStorageFileRecord> = {};

  for (const { file, bytes } of importedFiles) {
    const sourcePath = file === rootFile ? normalizeRelativePath(rootFile.name.trim()) : getRelativePath(rootDirectory, getImportedFilePath(file));
    const mimeType = inferFileMimeType(file.name, file.type);

    if (packageFiles[sourcePath] !== undefined) {
      throw new Error(`Duplicate imported file path ${sourcePath}.`);
    }

    const entry = {
      bytes,
      mimeType,
      path: sourcePath
    } satisfies ImportedModelFileEntry;

    fileEntries.push(entry);
    packageFiles[sourcePath] = {
      bytes,
      mimeType
    };
  }

  const rootEntry = fileEntries.find((entry) => entry.path === normalizeRelativePath(rootFile.name.trim()));

  if (rootEntry === undefined) {
    throw new Error(`Unable to locate the root model file ${rootFile.name}.`);
  }

  // Keep the root file's canonical storage path equal to its source name so reloads can find it directly.
  const packageRecord: ProjectAssetStoragePackageRecord = {
    files: packageFiles
  };

  return {
    fileEntries,
    packageRecord,
    rootFile: rootEntry,
    totalByteLength: fileEntries.reduce((total, entry) => total + entry.bytes.byteLength, 0)
  };
}

async function loadGltfFromImportedModelFileSet(fileSet: ImportedModelFileSet): Promise<GLTF> {
  const rootFormat = inferModelAssetFormat(fileSet.rootFile.path, fileSet.rootFile.mimeType);

  if (rootFormat === "glb") {
    return loadGltfFromArrayBuffer(fileSet.rootFile.bytes);
  }

  const text = new TextDecoder().decode(fileSet.rootFile.bytes);
  const gltfJson = JSON.parse(text) as Record<string, unknown>;
  const { missingUris, revokeUrls } = rewriteGltfResourceUris(gltfJson, fileSet.packageRecord.files);

  if (missingUris.length > 0) {
    for (const revokeUrl of revokeUrls) {
      revokeUrl();
    }

    throw new Error(`Missing external model resource(s): ${missingUris.join(", ")}.`);
  }

  const loader = new GLTFLoader();

  try {
    return await loader.parseAsync(JSON.stringify(gltfJson), "");
  } finally {
    for (const revokeUrl of revokeUrls) {
      revokeUrl();
    }
  }
}

function createModelAssetRecordFromFileSet(
  sourceName: string,
  mimeType: string,
  byteLength: number,
  metadata: ModelAssetMetadata
): ModelAssetRecord {
  return createModelAssetRecord(sourceName, mimeType, byteLength, metadata);
}

export async function importModelAssetFromFiles(
  files: File[],
  storage: ProjectAssetStorage
): Promise<ImportedModelAssetResult> {
  let fileSet: ImportedModelFileSet;

  try {
    fileSet = await loadModelFileSet(files);
  } catch (error) {
    throw new Error(`Model import failed: ${getErrorDetail(error)}`);
  }

  const sourceName = fileSet.rootFile.path;
  const format = inferModelAssetFormat(sourceName, fileSet.rootFile.mimeType);
  const mimeType = inferModelMimeType(format);
  let gltf: GLTF;

  try {
    gltf = await loadGltfFromImportedModelFileSet(fileSet);
  } catch (error) {
    throw new Error(`Model import failed for ${sourceName}: ${getErrorDetail(error)}`);
  }

  const metadata = extractModelAssetMetadata(gltf, format);
  const asset = createModelAssetRecordFromFileSet(sourceName, mimeType, fileSet.totalByteLength, metadata);

  try {
    await storage.putAsset(asset.storageKey, fileSet.packageRecord);

    const modelInstance = createModelInstance({
      assetId: asset.id,
      name: undefined
    });

    return {
      asset,
      modelInstance,
      loadedAsset: createLoadedModelAsset(asset, cloneTemplateScene(gltf.scene))
    };
  } catch (error) {
    await storage.deleteAsset(asset.storageKey).catch(() => undefined);
    throw error;
  }
}

export async function importModelAssetFromFile(
  file: File,
  storage: ProjectAssetStorage
): Promise<ImportedModelAssetResult> {
  return importModelAssetFromFiles([file], storage);
}

function getStoredModelAssetFile(
  asset: ModelAssetRecord,
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

export async function loadModelAssetFromStorage(
  storage: ProjectAssetStorage,
  asset: ModelAssetRecord
): Promise<LoadedModelAsset> {
  let storedAsset: ProjectAssetStoragePackageRecord | null;

  try {
    storedAsset = await storage.getAsset(asset.storageKey);
  } catch (error) {
    throw new Error(`Model asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
  }

  if (storedAsset === null) {
    throw new Error(`Missing stored binary data for imported model asset ${asset.sourceName}.`);
  }

  const storedModelFile = getStoredModelAssetFile(asset, storedAsset);

  if (storedModelFile === null) {
    throw new Error(`Missing stored root file for imported model asset ${asset.sourceName}.`);
  }

  if (asset.metadata.format === "glb") {
    try {
      const gltf = await loadGltfFromArrayBuffer(storedModelFile.bytes);
      return createLoadedModelAsset(asset, cloneTemplateScene(gltf.scene));
    } catch (error) {
      throw new Error(`Model asset reload failed for ${asset.sourceName}: ${getErrorDetail(error)}`);
    }
  }

  const fileEntries = storedAsset.files;
  const rootFileBytes = storedModelFile.bytes;
  const gltfJson = JSON.parse(new TextDecoder().decode(rootFileBytes)) as Record<string, unknown>;
  const { missingUris, revokeUrls } = rewriteGltfResourceUris(gltfJson, fileEntries);

  if (missingUris.length > 0) {
    for (const revokeUrl of revokeUrls) {
      revokeUrl();
    }

    throw new Error(`Missing stored external model resource(s): ${missingUris.join(", ")}.`);
  }

  const loader = new GLTFLoader();

  try {
    const gltf = await loader.parseAsync(JSON.stringify(gltfJson), "");
    return createLoadedModelAsset(asset, cloneTemplateScene(gltf.scene));
  } finally {
    for (const revokeUrl of revokeUrls) {
      revokeUrl();
    }
  }
}
