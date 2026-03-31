import type { Vec3 } from "../core/vector";

export const PROJECT_ASSET_KINDS = ["model", "image", "audio"] as const;

export type ProjectAssetKind = (typeof PROJECT_ASSET_KINDS)[number];

export interface ProjectAssetBoundingBox {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}

export interface ModelAssetMetadata {
  kind: "model";
  format: "glb" | "gltf";
  sceneName: string | null;
  nodeCount: number;
  meshCount: number;
  materialNames: string[];
  textureNames: string[];
  animationNames: string[];
  boundingBox: ProjectAssetBoundingBox | null;
  warnings: string[];
}

export interface ImageAssetMetadata {
  kind: "image";
  width: number;
  height: number;
  hasAlpha: boolean;
  warnings: string[];
}

export interface AudioAssetMetadata {
  kind: "audio";
  durationSeconds: number | null;
  channelCount: number | null;
  sampleRateHz: number | null;
  warnings: string[];
}

export type ProjectAssetMetadata = ModelAssetMetadata | ImageAssetMetadata | AudioAssetMetadata;

export interface ProjectAssetRecordBase<TKind extends ProjectAssetKind, TMetadata extends ProjectAssetMetadata> {
  id: string;
  kind: TKind;
  sourceName: string;
  mimeType: string;
  storageKey: string;
  byteLength: number;
  metadata: TMetadata;
}

export type ModelAssetRecord = ProjectAssetRecordBase<"model", ModelAssetMetadata>;
export type ImageAssetRecord = ProjectAssetRecordBase<"image", ImageAssetMetadata>;
export type AudioAssetRecord = ProjectAssetRecordBase<"audio", AudioAssetMetadata>;

export type ProjectAssetRecord = ModelAssetRecord | ImageAssetRecord | AudioAssetRecord;

export function createProjectAssetStorageKey(assetId: string): string {
  return `project-asset:${assetId}`;
}

export function isProjectAssetKind(value: unknown): value is ProjectAssetKind {
  return value === "model" || value === "image" || value === "audio";
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function cloneBoundingBox(boundingBox: ProjectAssetBoundingBox | null): ProjectAssetBoundingBox | null {
  if (boundingBox === null) {
    return null;
  }

  return {
    min: cloneVec3(boundingBox.min),
    max: cloneVec3(boundingBox.max),
    size: cloneVec3(boundingBox.size)
  };
}

function cloneModelAssetMetadata(metadata: ModelAssetMetadata): ModelAssetMetadata {
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

function cloneImageAssetMetadata(metadata: ImageAssetMetadata): ImageAssetMetadata {
  return {
    kind: "image",
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha,
    warnings: [...metadata.warnings]
  };
}

function cloneAudioAssetMetadata(metadata: AudioAssetMetadata): AudioAssetMetadata {
  return {
    kind: "audio",
    durationSeconds: metadata.durationSeconds,
    channelCount: metadata.channelCount,
    sampleRateHz: metadata.sampleRateHz,
    warnings: [...metadata.warnings]
  };
}

export function cloneProjectAssetRecord(asset: ProjectAssetRecord): ProjectAssetRecord {
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

export function getProjectAssetKindLabel(kind: ProjectAssetKind): string {
  switch (kind) {
    case "model":
      return "Model";
    case "image":
      return "Image";
    case "audio":
      return "Audio";
  }
}

