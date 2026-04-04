import { Box3, Group, Mesh, MeshBasicMaterial, type BufferGeometry } from "three";

import type { LoadedModelAsset } from "../../src/assets/gltf-model-import";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";

function countMeshes(group: Group): number {
  let count = 0;

  group.traverse((object) => {
    if ((object as Mesh).isMesh === true) {
      count += 1;
    }
  });

  return count;
}

function countNodes(group: Group): number {
  let count = 0;

  group.traverse(() => {
    count += 1;
  });

  return count;
}

function createBoundingBox(group: Group): ModelAssetRecord["metadata"]["boundingBox"] {
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

export function createFixtureModelAssetRecord(id: string, template: Group, sourceName = `${id}.glb`): ModelAssetRecord {
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

export function createFixtureLoadedModelAsset(asset: ModelAssetRecord, template: Group): LoadedModelAsset {
  template.updateMatrixWorld(true);

  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    metadata: asset.metadata,
    template,
    animations: []
  };
}

export function createFixtureLoadedModelAssetFromGeometry(assetId: string, geometry: BufferGeometry): {
  asset: ModelAssetRecord;
  loadedAsset: LoadedModelAsset;
} {
  const template = new Group();
  template.add(new Mesh(geometry, new MeshBasicMaterial()));
  template.updateMatrixWorld(true);
  const asset = createFixtureModelAssetRecord(assetId, template);

  return {
    asset,
    loadedAsset: createFixtureLoadedModelAsset(asset, template)
  };
}
