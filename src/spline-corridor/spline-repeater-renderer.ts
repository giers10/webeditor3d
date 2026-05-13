import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MathUtils,
  Mesh,
  Quaternion,
  Vector3,
  type Material
} from "three";

import type { Terrain } from "../document/terrains";
import { applyRendererRenderCategoryFromMaterial } from "../rendering/render-layers";

import { loadBundledSplineCorridorModelTemplate } from "./bundled-spline-corridor-model-loader";
import {
  deriveSplineRepeaterInstances,
  type SplineRepeaterInstance,
  type SplineRepeaterPathLike
} from "./spline-repeaters";

interface SplineRepeaterRendererInput {
  paths: readonly SplineRepeaterPathLike[];
  terrains: readonly Terrain[];
}

interface SplineRepeaterRendererOptions {
  onRebuilt?: () => void;
  onDiagnostic?: (message: string) => void;
}

interface TemplateMeshSource {
  name: string;
  geometry: BufferGeometry;
  material: Material | Material[];
  matrixWorld: Matrix4;
}

export class SplineRepeaterRenderer {
  readonly group = new Group();

  private requestId = 0;
  private activeGroup: Group | null = null;
  private readonly onRebuilt: (() => void) | undefined;
  private readonly onDiagnostic: ((message: string) => void) | undefined;

  constructor(options: SplineRepeaterRendererOptions = {}) {
    this.group.name = "splineRepeaters";
    this.group.userData.nonPickable = true;
    this.onRebuilt = options.onRebuilt;
    this.onDiagnostic = options.onDiagnostic;
  }

  sync(input: SplineRepeaterRendererInput) {
    const requestId = this.requestId + 1;
    this.requestId = requestId;
    void this.rebuildAsync(requestId, input);
  }

  clear() {
    this.requestId += 1;
    this.clearActiveGroup();
  }

  dispose() {
    this.clear();
  }

  private clearActiveGroup() {
    if (this.activeGroup === null) {
      return;
    }

    this.group.remove(this.activeGroup);
    this.disposeInstancedGroup(this.activeGroup);
    this.activeGroup = null;
  }

  private disposeInstancedGroup(group: Group) {
    group.traverse((object) => {
      const maybeInstancedMesh = object as InstancedMesh & {
        isInstancedMesh?: boolean;
      };

      if (maybeInstancedMesh.isInstancedMesh !== true) {
        return;
      }

      maybeInstancedMesh.geometry.dispose();

      if (Array.isArray(maybeInstancedMesh.material)) {
        for (const material of maybeInstancedMesh.material) {
          material.dispose();
        }
        return;
      }

      maybeInstancedMesh.material.dispose();
    });
  }

  private emitDiagnostic(message: string) {
    if (this.onDiagnostic !== undefined) {
      this.onDiagnostic(message);
      return;
    }

    console.warn(message);
  }

  private cloneMaterial(material: Material | Material[]): Material | Material[] {
    return Array.isArray(material)
      ? material.map((entry) => entry.clone())
      : material.clone();
  }

  private collectTemplateMeshes(template: Group): TemplateMeshSource[] {
    const meshSources: TemplateMeshSource[] = [];

    template.updateMatrixWorld(true);
    template.traverse((object) => {
      const maybeMesh = object as Mesh & { isMesh?: boolean };

      if (maybeMesh.isMesh !== true) {
        return;
      }

      meshSources.push({
        name: maybeMesh.name,
        geometry: maybeMesh.geometry.clone(),
        material: this.cloneMaterial(maybeMesh.material),
        matrixWorld: maybeMesh.matrixWorld.clone()
      });
    });

    return meshSources;
  }

  private createInstancedMeshesForAsset(options: {
    assetId: string;
    instances: readonly SplineRepeaterInstance[];
    meshSources: readonly TemplateMeshSource[];
  }): InstancedMesh[] {
    const instancePosition = new Vector3();
    const instanceScale = new Vector3();
    const instanceQuaternion = new Quaternion();
    const instanceMatrix = new Matrix4();
    const finalMatrix = new Matrix4();
    const yAxis = new Vector3(0, 1, 0);

    return options.meshSources.map((meshSource, meshIndex) => {
      const instancedMesh = new InstancedMesh(
        meshSource.geometry,
        meshSource.material,
        options.instances.length
      );
      instancedMesh.name =
        meshSource.name.trim().length > 0
          ? `SplineRepeater:${options.assetId}:${meshSource.name}`
          : `SplineRepeater:${options.assetId}:mesh-${meshIndex}`;
      instancedMesh.userData.nonPickable = true;
      instancedMesh.userData.splineCorridorAssetId = options.assetId;
      instancedMesh.frustumCulled = true;

      options.instances.forEach((instance, instanceIndex) => {
        instancePosition.set(
          instance.position.x,
          instance.position.y,
          instance.position.z
        );
        instanceQuaternion.setFromAxisAngle(
          yAxis,
          MathUtils.degToRad(instance.yawDegrees)
        );
        instanceScale.set(instance.scale, instance.scale, instance.scale);
        instanceMatrix.compose(
          instancePosition,
          instanceQuaternion,
          instanceScale
        );
        finalMatrix.multiplyMatrices(instanceMatrix, meshSource.matrixWorld);
        instancedMesh.setMatrixAt(instanceIndex, finalMatrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMesh.computeBoundingBox();
      instancedMesh.computeBoundingSphere();
      applyRendererRenderCategoryFromMaterial(instancedMesh);
      return instancedMesh;
    });
  }

  private async rebuildAsync(
    requestId: number,
    input: SplineRepeaterRendererInput
  ) {
    const instances = input.paths.flatMap((path) =>
      deriveSplineRepeaterInstances({
        path,
        terrains: input.terrains
      })
    );
    const nextGroup = new Group();
    nextGroup.name = "splineRepeaterInstances";
    nextGroup.userData.nonPickable = true;
    const instancesByAssetId = new Map<string, SplineRepeaterInstance[]>();

    for (const instance of instances) {
      const assetInstances = instancesByAssetId.get(instance.asset.id) ?? [];
      assetInstances.push(instance);
      instancesByAssetId.set(instance.asset.id, assetInstances);
    }

    for (const [assetId, assetInstances] of instancesByAssetId) {
      const asset = assetInstances[0]?.asset;

      if (asset === undefined) {
        continue;
      }

      let template: Group;

      try {
        template = await loadBundledSplineCorridorModelTemplate(
          asset.bundledPath
        );
      } catch (error) {
        this.emitDiagnostic(
          error instanceof Error
            ? error.message
            : `Bundled spline corridor model failed to load from ${asset.bundledPath}.`
        );
        continue;
      }

      if (requestId !== this.requestId) {
        this.disposeInstancedGroup(nextGroup);
        return;
      }

      const instancedMeshes = this.createInstancedMeshesForAsset({
        assetId,
        instances: assetInstances,
        meshSources: this.collectTemplateMeshes(template)
      });

      for (const instancedMesh of instancedMeshes) {
        nextGroup.add(instancedMesh);
      }
    }

    if (requestId !== this.requestId) {
      this.disposeInstancedGroup(nextGroup);
      return;
    }

    this.clearActiveGroup();

    if (nextGroup.children.length === 0) {
      this.disposeInstancedGroup(nextGroup);
      this.onRebuilt?.();
      return;
    }

    this.activeGroup = nextGroup;
    this.group.add(nextGroup);
    this.onRebuilt?.();
  }
}
