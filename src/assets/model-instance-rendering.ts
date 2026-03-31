import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";

import type { Vec3 } from "../core/vector";

import { instantiateModelTemplate, type LoadedModelAsset } from "./gltf-model-import";
import type { ModelInstance } from "./model-instances";
import type { ProjectAssetRecord } from "./project-assets";

const MODEL_PLACEHOLDER_COLOR = 0x89b6ff;
const MODEL_SELECTION_COLOR = 0xf7d2aa;

interface ModelInstanceBounds {
  center: Vec3;
  size: Vec3;
}

function getLocalModelBounds(asset: ProjectAssetRecord | undefined): ModelInstanceBounds {
  if (asset?.kind === "model" && asset.metadata.boundingBox !== null) {
    const boundingBox = asset.metadata.boundingBox;

    return {
      center: {
        x: (boundingBox.min.x + boundingBox.max.x) * 0.5,
        y: (boundingBox.min.y + boundingBox.max.y) * 0.5,
        z: (boundingBox.min.z + boundingBox.max.z) * 0.5
      },
      size: {
        x: Math.max(0.1, Math.abs(boundingBox.max.x - boundingBox.min.x)),
        y: Math.max(0.1, Math.abs(boundingBox.max.y - boundingBox.min.y)),
        z: Math.max(0.1, Math.abs(boundingBox.max.z - boundingBox.min.z))
      }
    };
  }

  return {
    center: {
      x: 0,
      y: 0,
      z: 0
    },
    size: {
      x: 1,
      y: 1,
      z: 1
    }
  };
}

function createWireframeBox(size: Vec3, color: number, opacity: number): Mesh {
  return new Mesh(
    new BoxGeometry(size.x, size.y, size.z),
    new MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
}

export function createModelInstanceRenderGroup(
  modelInstance: ModelInstance,
  asset: ProjectAssetRecord | undefined,
  loadedAsset: LoadedModelAsset | undefined,
  selected = false
): Group {
  const bounds = getLocalModelBounds(asset);
  const group = new Group();

  group.position.set(modelInstance.position.x, modelInstance.position.y, modelInstance.position.z);
  group.rotation.set(
    (modelInstance.rotationDegrees.x * Math.PI) / 180,
    (modelInstance.rotationDegrees.y * Math.PI) / 180,
    (modelInstance.rotationDegrees.z * Math.PI) / 180
  );
  group.scale.set(modelInstance.scale.x, modelInstance.scale.y, modelInstance.scale.z);
  group.userData.modelInstanceId = modelInstance.id;
  group.userData.assetId = modelInstance.assetId;

  if (loadedAsset !== undefined) {
    group.add(instantiateModelTemplate(loadedAsset.template));
  } else {
    const placeholder = createWireframeBox(bounds.size, MODEL_PLACEHOLDER_COLOR, 0.28);
    placeholder.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    group.add(placeholder);
  }

  if (selected) {
    const selectionShell = createWireframeBox(bounds.size, MODEL_SELECTION_COLOR, 0.8);
    selectionShell.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    group.add(selectionShell);
  }

  return group;
}
