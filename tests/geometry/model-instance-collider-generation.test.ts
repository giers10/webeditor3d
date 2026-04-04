import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";

import { createModelInstance } from "../../src/assets/model-instances";
import { buildGeneratedModelCollider } from "../../src/geometry/model-instance-collider-generation";
import {
  createFixtureLoadedModelAsset,
  createFixtureLoadedModelAssetFromGeometry,
  createFixtureModelAssetRecord
} from "../helpers/model-collider-fixtures";

describe("buildGeneratedModelCollider", () => {
  it("builds a simple oriented box collider from asset bounds", () => {
    const { asset } = createFixtureLoadedModelAssetFromGeometry("asset-model-simple", new BoxGeometry(2, 4, 6));
    const modelInstance = createModelInstance({
      id: "model-instance-simple",
      assetId: asset.id,
      collision: {
        mode: "simple",
        visible: true
      }
    });

    const collider = buildGeneratedModelCollider(modelInstance, asset);

    expect(collider).not.toBeNull();
    expect(collider).toMatchObject({
      kind: "box",
      mode: "simple",
      visible: true,
      center: {
        x: 0,
        y: 0,
        z: 0
      },
      size: {
        x: 2,
        y: 4,
        z: 6
      }
    });
  });

  it("builds a static triangle-mesh collider from loaded model geometry", () => {
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-static", new BoxGeometry(2, 1, 3));
    const modelInstance = createModelInstance({
      id: "model-instance-static",
      assetId: asset.id,
      collision: {
        mode: "static",
        visible: false
      }
    });

    const collider = buildGeneratedModelCollider(modelInstance, asset, loadedAsset);

    expect(collider).not.toBeNull();
    expect(collider?.kind).toBe("trimesh");
    expect(collider?.mode).toBe("static");
    expect(Array.from(collider?.vertices ?? [])).toSatisfy((values: number[]) => values.every(Number.isFinite));
    expect(Array.from(collider?.indices ?? [])).toSatisfy((values: number[]) => values.every(Number.isInteger));
  });

  it("builds a terrain heightfield from a regular-grid mesh", () => {
    const geometry = new PlaneGeometry(4, 4, 2, 2);
    geometry.rotateX(-Math.PI * 0.5);
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-terrain", geometry);
    const modelInstance = createModelInstance({
      id: "model-instance-terrain",
      assetId: asset.id,
      collision: {
        mode: "terrain",
        visible: true
      }
    });

    const collider = buildGeneratedModelCollider(modelInstance, asset, loadedAsset);

    expect(collider).not.toBeNull();
    expect(collider).toMatchObject({
      kind: "heightfield",
      mode: "terrain",
      rows: 3,
      cols: 3
    });
    expect(Array.from(collider?.heights ?? [])).toSatisfy((values: number[]) => values.every(Number.isFinite));
  });

  it("fails terrain mode for meshes that are not a clean regular-grid terrain surface", () => {
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry("asset-model-invalid-terrain", new BoxGeometry(2, 2, 2));
    const modelInstance = createModelInstance({
      id: "model-instance-invalid-terrain",
      assetId: asset.id,
      collision: {
        mode: "terrain",
        visible: false
      }
    });

    expect(() => buildGeneratedModelCollider(modelInstance, asset, loadedAsset)).toThrow("cannot use terrain collision");
  });

  it("builds explicit convex compound pieces for dynamic mode", () => {
    const template = new Group();
    const material = new MeshBasicMaterial();
    const leftBox = new Mesh(new BoxGeometry(1, 1, 1), material);
    const rightBox = new Mesh(new BoxGeometry(1, 2, 1), material);

    leftBox.position.set(-1.25, 0.5, 0);
    rightBox.position.set(1.25, 1, 0);
    template.add(leftBox);
    template.add(rightBox);
    template.updateMatrixWorld(true);

    const asset = createFixtureModelAssetRecord("asset-model-dynamic", template);
    const loadedAsset = createFixtureLoadedModelAsset(asset, template);
    const modelInstance = createModelInstance({
      id: "model-instance-dynamic",
      assetId: asset.id,
      collision: {
        mode: "dynamic",
        visible: true
      }
    });

    const collider = buildGeneratedModelCollider(modelInstance, asset, loadedAsset);

    expect(collider).not.toBeNull();
    expect(collider).toMatchObject({
      kind: "compound",
      mode: "dynamic",
      decomposition: "spatial-bisect",
      runtimeBehavior: "fixedQueryOnly"
    });
    expect(collider?.kind === "compound" ? collider.pieces.length : 0).toBeGreaterThanOrEqual(2);
  });
});
