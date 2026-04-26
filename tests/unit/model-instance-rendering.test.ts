import { BoxGeometry, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it } from "vitest";

import {
  createModelInstanceRenderGroup,
  disposeModelInstance,
  syncModelInstanceSelectionShell
} from "../../src/assets/model-instance-rendering";
import { createModelInstance } from "../../src/assets/model-instances";
import type { ModelAssetRecord } from "../../src/assets/project-assets";

const modelAsset: ModelAssetRecord = {
  id: "asset-model",
  kind: "model",
  sourceName: "Model.glb",
  mimeType: "model/gltf-binary",
  storageKey: "project-asset:asset-model",
  byteLength: 1024,
  metadata: {
    kind: "model",
    format: "glb",
    sceneName: null,
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: {
      min: { x: -1, y: 0, z: -0.5 },
      max: { x: 1, y: 2, z: 0.5 },
      size: { x: 2, y: 2, z: 1 }
    },
    warnings: []
  }
};

function getSelectionShells(group: ReturnType<typeof createModelInstanceRenderGroup>) {
  return group.children.filter(
    (child): child is Mesh =>
      child instanceof Mesh &&
      child.userData.modelInstanceSelectionShell === true
  );
}

describe("model instance rendering", () => {
  it("toggles one selection shell without replacing unrelated children", () => {
    const modelInstance = createModelInstance({
      id: "model-instance",
      assetId: modelAsset.id
    });
    const renderGroup = createModelInstanceRenderGroup(
      modelInstance,
      modelAsset,
      undefined,
      false
    );
    const debugMesh = new Mesh(
      new BoxGeometry(0.25, 0.25, 0.25),
      new MeshBasicMaterial()
    );
    debugMesh.userData.nonPickable = true;
    renderGroup.add(debugMesh);

    expect(getSelectionShells(renderGroup)).toHaveLength(0);

    syncModelInstanceSelectionShell(renderGroup, modelAsset, true);
    syncModelInstanceSelectionShell(renderGroup, modelAsset, true);

    expect(getSelectionShells(renderGroup)).toHaveLength(1);
    expect(renderGroup.children).toContain(debugMesh);

    syncModelInstanceSelectionShell(renderGroup, modelAsset, false);

    expect(getSelectionShells(renderGroup)).toHaveLength(0);
    expect(renderGroup.children).toContain(debugMesh);

    disposeModelInstance(renderGroup);
  });
});
