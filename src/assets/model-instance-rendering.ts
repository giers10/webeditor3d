import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Material, type Texture } from "three";

import type { Vec3 } from "../core/vector";

import { instantiateModelTemplate, type LoadedModelAsset } from "./gltf-model-import";
import type { ModelInstance } from "./model-instances";
import type { ProjectAssetRecord } from "./project-assets";

const MODEL_PLACEHOLDER_COLOR = 0x89b6ff;
const MODEL_SELECTION_COLOR = 0xf7d2aa;
const MODEL_PREVIEW_SHELL_OPACITY = 0.5;

export type ModelInstanceRenderMode = "normal" | "wireframe";

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

function createWireframeMaterial(material: Material): MeshBasicMaterial {
  const source = material as Material & {
    color?: { getHex(): number };
    opacity?: number;
    transparent?: boolean;
  };
  const opacity = typeof source.opacity === "number" ? source.opacity : 1;

  return new MeshBasicMaterial({
    color: source.color?.getHex() ?? MODEL_PLACEHOLDER_COLOR,
    wireframe: true,
    transparent: source.transparent === true || opacity < 1,
    opacity,
    depthWrite: false
  });
}

function applyWireframeMaterialPresentation(group: Group) {
  group.traverse((object) => {
    const maybeMesh = object as Mesh & { isMesh?: boolean };

    if (maybeMesh.isMesh !== true) {
      return;
    }

    if (Array.isArray(maybeMesh.material)) {
      const originalMaterials = maybeMesh.material;
      maybeMesh.material = originalMaterials.map((material) => createWireframeMaterial(material));
      for (const material of originalMaterials) {
        material.dispose();
      }
      return;
    }

    const originalMaterial = maybeMesh.material;
    maybeMesh.material = createWireframeMaterial(originalMaterial);
    originalMaterial.dispose();
  });
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

function disposeMeshResources(object: Group | Mesh, disposeTextures: boolean, seenTextures: Set<Texture>) {
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

export function createModelInstanceRenderGroup(
  modelInstance: ModelInstance,
  asset: ProjectAssetRecord | undefined,
  loadedAsset: LoadedModelAsset | undefined,
  selected = false,
  previewShellColor?: number,
  renderMode: ModelInstanceRenderMode = "normal"
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
    const instantiatedModel = instantiateModelTemplate(loadedAsset.template);

    if (renderMode === "wireframe") {
      applyWireframeMaterialPresentation(instantiatedModel);
    }

    group.add(instantiatedModel);
  } else {
    const placeholder = createWireframeBox(bounds.size, previewShellColor ?? MODEL_PLACEHOLDER_COLOR, previewShellColor === undefined ? 0.28 : MODEL_PREVIEW_SHELL_OPACITY);
    placeholder.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    placeholder.userData.shadowIgnored = true;
    group.add(placeholder);
  }

  if (loadedAsset !== undefined && previewShellColor !== undefined) {
    const previewShell = createWireframeBox(bounds.size, previewShellColor, MODEL_PREVIEW_SHELL_OPACITY);
    previewShell.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    previewShell.userData.shadowIgnored = true;
    group.add(previewShell);
  }

  if (selected) {
    const selectionShell = createWireframeBox(bounds.size, MODEL_SELECTION_COLOR, 0.8);
    selectionShell.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    selectionShell.userData.shadowIgnored = true;
    group.add(selectionShell);
  }

  return group;
}

export function disposeModelInstance(instance: Group) {
  const seenTextures = new Set<Texture>();

  instance.traverse((object) => {
    disposeMeshResources(object as Group | Mesh, false, seenTextures);
  });
}
