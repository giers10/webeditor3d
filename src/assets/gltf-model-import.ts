import { Box3, Group, Mesh, type Material, type Object3D, type Texture } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { createModelInstance, type ModelInstance } from "./model-instances";
import {
  createProjectAssetStorageKey,
  type ModelAssetMetadata,
  type ModelAssetRecord,
  type ProjectAssetStorage
} from "./project-assets";
import { createOpaqueId } from "../core/ids";
import type { ProjectAssetStorageRecord } from "./project-asset-storage";

export interface LoadedModelAsset {
  assetId: string;
  storageKey: string;
  metadata: ModelAssetMetadata;
  template: Group;
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

function createLoadedModelAsset(asset: ModelAssetRecord, template: Group): LoadedModelAsset {
  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    metadata: asset.metadata,
    template
  };
}

function createModelAssetRecord(sourceName: string, mimeType: string, bytes: ArrayBuffer, metadata: ModelAssetMetadata): ModelAssetRecord {
  const assetId = createOpaqueId("asset-model");

  return {
    id: assetId,
    kind: "model",
    sourceName,
    mimeType,
    storageKey: createProjectAssetStorageKey(assetId),
    byteLength: bytes.byteLength,
    metadata
  };
}

async function loadGltfFromBlob(blob: Blob): Promise<GLTF> {
  const loader = new GLTFLoader();
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await loader.loadAsync(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
    for (const value of Object.values(material as Record<string, unknown>)) {
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

export async function importModelAssetFromFile(
  file: File,
  storage: ProjectAssetStorage
): Promise<ImportedModelAssetResult> {
  const sourceName = file.name;
  const format = inferModelAssetFormat(sourceName, file.type);
  const mimeType = inferModelMimeType(format);
  const bytes = await file.arrayBuffer();

  let gltf: GLTF;

  try {
    gltf = await loadGltfFromBlob(new Blob([bytes], { type: mimeType }));
  } catch (error) {
    throw new Error(`Model import failed for ${sourceName}: ${getErrorDetail(error)}`);
  }

  const metadata = extractModelAssetMetadata(gltf, format);
  const asset = createModelAssetRecord(sourceName, mimeType, bytes, metadata);
  await storage.putAsset(asset.storageKey, {
    bytes,
    mimeType
  } satisfies ProjectAssetStorageRecord);

  const modelInstance = createModelInstance({
    assetId: asset.id,
    name: undefined
  });

  return {
    asset,
    modelInstance,
    loadedAsset: createLoadedModelAsset(asset, cloneTemplateScene(gltf.scene))
  };
}

export async function loadModelAssetFromStorage(
  storage: ProjectAssetStorage,
  asset: ModelAssetRecord
): Promise<LoadedModelAsset> {
  const storedAsset = await storage.getAsset(asset.storageKey);

  if (storedAsset === null) {
    throw new Error(`Missing stored binary data for imported model asset ${asset.sourceName}.`);
  }

  const gltf = await loadGltfFromBlob(
    new Blob([storedAsset.bytes], {
      type: storedAsset.mimeType || asset.mimeType
    })
  );

  return createLoadedModelAsset(asset, cloneTemplateScene(gltf.scene));
}
