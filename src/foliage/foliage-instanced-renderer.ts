import {
  Camera,
  Color,
  Frustum,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
  type BufferGeometry,
  type Material
} from "three";

import type { Terrain } from "../document/terrains";
import {
  resolveFoliageQualitySettings,
  type FoliageQualitySettings
} from "../document/world-settings";
import { applyRendererRenderCategoryFromMaterial } from "../rendering/render-layers";
import { loadBundledFoliageModelTemplate } from "./bundled-foliage-model-loader";
import {
  createFoliageInstanceMatrix,
  createFoliageRenderBatches,
  type FoliageRenderBatch,
  type FoliageRenderView
} from "./foliage-render-batches";
import type {
  FoliageLayer,
  FoliageLayerRegistry,
  FoliagePrototypeRegistry
} from "./foliage";
import {
  createFoliageScatterPrototypeRegistry,
  generateFoliageScatterForScene,
  type FoliageScatterPrototypeSource,
  type FoliageScatterResult
} from "./foliage-scatter";

export interface FoliageInstancedRendererSyncInput {
  terrains: Record<string, Terrain> | readonly Terrain[];
  foliageLayers: FoliageLayerRegistry;
  foliagePrototypes?: FoliagePrototypeRegistry;
  bundledFoliagePrototypes?: FoliageScatterPrototypeSource;
  quality?: FoliageQualitySettings | null;
}

export interface FoliageInstancedRendererOptions {
  onRebuilt?: () => void;
  onDiagnostic?: (message: string) => void;
}

interface FoliageTemplateSourceMesh {
  geometry: BufferGeometry;
  material: Material | Material[];
  localMatrix: Matrix4;
}

const VIEW_SIGNATURE_PRECISION = 100;

function cloneMaterial(material: Material): Material {
  return material.clone();
}

function cloneMaterialSet(material: Material | Material[]): Material | Material[] {
  return Array.isArray(material)
    ? material.map((entry) => cloneMaterial(entry))
    : cloneMaterial(material);
}

function disposeMaterial(material: Material | Material[]) {
  const materials = Array.isArray(material) ? material : [material];

  for (const entry of materials) {
    entry.dispose();
  }
}

function disposeInstancedMesh(mesh: InstancedMesh) {
  mesh.geometry.dispose();
  disposeMaterial(mesh.material);
}

function disposeFoliageGroup(group: Group) {
  const instancedMeshes: InstancedMesh[] = [];

  group.traverse((object) => {
    const maybeInstancedMesh = object as InstancedMesh & {
      isInstancedMesh?: boolean;
    };

    if (maybeInstancedMesh.isInstancedMesh === true) {
      instancedMeshes.push(maybeInstancedMesh);
    }
  });

  for (const mesh of instancedMeshes) {
    disposeInstancedMesh(mesh);
  }

  group.clear();
}

function normalizeTerrainRegistry(
  terrains: Record<string, Terrain> | readonly Terrain[]
): Record<string, Terrain> {
  if (Array.isArray(terrains)) {
    const terrainList = terrains as readonly Terrain[];

    return Object.fromEntries(
      terrainList.map((terrain) => [terrain.id, terrain])
    );
  }

  return terrains as Record<string, Terrain>;
}

function scaleFoliageLayerDensity(
  layer: FoliageLayer,
  densityMultiplier: number
): FoliageLayer {
  return {
    ...layer,
    density: layer.density * densityMultiplier
  };
}

function scaleFoliageLayerRegistryDensities(
  layers: FoliageLayerRegistry,
  densityMultiplier: number
): FoliageLayerRegistry {
  if (densityMultiplier === 1) {
    return layers;
  }

  return Object.fromEntries(
    Object.entries(layers).map(([layerId, layer]) => [
      layerId,
      scaleFoliageLayerDensity(layer, densityMultiplier)
    ])
  );
}

function createRenderViewFromCamera(camera: Camera): FoliageRenderView {
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const cameraPosition = new Vector3();
  camera.getWorldPosition(cameraPosition);
  const projectionViewMatrix = new Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );

  return {
    cameraPosition: {
      x: cameraPosition.x,
      y: cameraPosition.y,
      z: cameraPosition.z
    },
    frustum: new Frustum().setFromProjectionMatrix(projectionViewMatrix)
  };
}

function createCameraViewSignature(camera: Camera): string {
  const values = [
    ...camera.matrixWorld.elements,
    ...camera.projectionMatrix.elements
  ];

  return values
    .map((value) => Math.round(value * VIEW_SIGNATURE_PRECISION))
    .join("|");
}

function collectTemplateSourceMeshes(template: Group): FoliageTemplateSourceMesh[] {
  const sourceMeshes: FoliageTemplateSourceMesh[] = [];

  template.updateMatrixWorld(true);
  template.traverse((object) => {
    const maybeMesh = object as Mesh<BufferGeometry, Material | Material[]> & {
      isMesh?: boolean;
    };

    if (maybeMesh.isMesh !== true) {
      return;
    }

    sourceMeshes.push({
      geometry: maybeMesh.geometry,
      material: maybeMesh.material,
      localMatrix: maybeMesh.matrixWorld.clone()
    });
  });

  return sourceMeshes;
}

function createInstancedMeshForSource(
  batch: FoliageRenderBatch,
  sourceMesh: FoliageTemplateSourceMesh
): InstancedMesh {
  const mesh = new InstancedMesh(
    sourceMesh.geometry.clone(),
    cloneMaterialSet(sourceMesh.material),
    batch.instances.length
  );
  const color = new Color();

  mesh.name = `Foliage:${batch.prototypeId}:${batch.chunkId}:${batch.lodLevel}`;
  mesh.userData.nonPickable = true;
  mesh.userData.shadowIgnored = !batch.castShadow;
  mesh.userData.foliageBatchKey = batch.key;
  mesh.userData.foliageChunkId = batch.chunkId;
  mesh.userData.foliagePrototypeId = batch.prototypeId;
  mesh.userData.foliageLayerId = batch.layerId;
  mesh.userData.foliageTerrainId = batch.terrainId;
  mesh.castShadow = batch.castShadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.raycast = () => undefined;

  for (let index = 0; index < batch.instances.length; index += 1) {
    const instance = batch.instances[index]!;
    mesh.setMatrixAt(
      index,
      createFoliageInstanceMatrix(instance, sourceMesh.localMatrix)
    );
    color.setRGB(
      instance.colorTint.r,
      instance.colorTint.g,
      instance.colorTint.b
    );
    mesh.setColorAt(index, color);
  }

  mesh.instanceMatrix.needsUpdate = true;

  if (mesh.instanceColor !== null) {
    mesh.instanceColor.needsUpdate = true;
  }

  return mesh;
}

export class FoliageInstancedRenderer {
  readonly group = new Group();

  private requestId = 0;
  private activeBatchGroup: Group | null = null;
  private scatter: FoliageScatterResult | null = null;
  private prototypeRegistry: FoliagePrototypeRegistry = {};
  private quality: FoliageQualitySettings = resolveFoliageQualitySettings(null);
  private currentView: FoliageRenderView | null = null;
  private viewSignature: string | null = null;
  private readonly onRebuilt?: () => void;
  private readonly onDiagnostic?: (message: string) => void;

  constructor(options: FoliageInstancedRendererOptions = {}) {
    this.onRebuilt = options.onRebuilt;
    this.onDiagnostic = options.onDiagnostic;
    this.group.name = "foliageInstancedRenderer";
    this.group.userData.nonPickable = true;
  }

  sync(input: FoliageInstancedRendererSyncInput) {
    const terrains = normalizeTerrainRegistry(input.terrains);
    const quality = resolveFoliageQualitySettings(input.quality);
    const prototypeRegistry = createFoliageScatterPrototypeRegistry({
      foliagePrototypes: input.foliagePrototypes,
      bundledFoliagePrototypes: input.bundledFoliagePrototypes
    });
    const foliageLayers = scaleFoliageLayerRegistryDensities(
      input.foliageLayers,
      quality.densityMultiplier
    );

    this.quality = quality;
    this.prototypeRegistry = prototypeRegistry;

    if (!quality.enabled || quality.densityMultiplier <= 0) {
      this.scatter = null;
      this.clearActiveBatches();
      this.onRebuilt?.();
      return;
    }

    this.scatter = generateFoliageScatterForScene({
      terrains,
      foliageLayers,
      foliagePrototypes: input.foliagePrototypes,
      bundledFoliagePrototypes: input.bundledFoliagePrototypes
    });
    this.rebuildCurrentBatches();
  }

  updateView(camera: Camera) {
    this.currentView = createRenderViewFromCamera(camera);

    if (this.scatter === null) {
      return;
    }

    const nextViewSignature = createCameraViewSignature(camera);

    if (nextViewSignature === this.viewSignature) {
      return;
    }

    this.viewSignature = nextViewSignature;
    this.rebuildCurrentBatches();
  }

  private rebuildCurrentBatches() {
    const requestId = ++this.requestId;
    const scatter = this.scatter;

    if (scatter === null) {
      this.clearActiveBatches();
      this.onRebuilt?.();
      return;
    }

    const batches = createFoliageRenderBatches(scatter, this.prototypeRegistry, {
      view: this.currentView,
      quality: this.quality
    });

    this.clearActiveBatches();

    if (batches.length === 0) {
      this.onRebuilt?.();
      return;
    }

    void this.rebuildBatchesAsync(requestId, batches);
  }

  dispose() {
    this.requestId += 1;
    this.scatter = null;
    this.prototypeRegistry = {};
    this.viewSignature = null;
    this.clearActiveBatches();
  }

  private clearActiveBatches() {
    if (this.activeBatchGroup === null) {
      return;
    }

    this.group.remove(this.activeBatchGroup);
    disposeFoliageGroup(this.activeBatchGroup);
    this.activeBatchGroup = null;
  }

  private emitDiagnostic(message: string) {
    if (this.onDiagnostic !== undefined) {
      this.onDiagnostic(message);
      return;
    }

    console.warn(message);
  }

  private async rebuildBatchesAsync(
    requestId: number,
    batches: readonly FoliageRenderBatch[]
  ) {
    const nextBatchGroup = new Group();
    nextBatchGroup.name = "foliageInstancedBatches";
    nextBatchGroup.userData.nonPickable = true;

    for (const batch of batches) {
      let template: Group;

      try {
        template = await loadBundledFoliageModelTemplate(batch.bundledPath);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Bundled foliage model failed to load from ${batch.bundledPath}.`;
        this.emitDiagnostic(message);
        continue;
      }

      if (requestId !== this.requestId) {
        disposeFoliageGroup(nextBatchGroup);
        return;
      }

      const sourceMeshes = collectTemplateSourceMeshes(template);

      if (sourceMeshes.length === 0) {
        this.emitDiagnostic(
          `Bundled foliage model ${batch.bundledPath} contains no renderable meshes.`
        );
        continue;
      }

      const batchGroup = new Group();
      batchGroup.name = `FoliageBatch:${batch.prototypeId}`;
      batchGroup.userData.nonPickable = true;
      batchGroup.userData.foliageBatchKey = batch.key;
      batchGroup.userData.foliagePrototypeId = batch.prototypeId;
      batchGroup.userData.foliageLayerId = batch.layerId;
      batchGroup.userData.foliageTerrainId = batch.terrainId;

      for (const sourceMesh of sourceMeshes) {
        batchGroup.add(createInstancedMeshForSource(batch, sourceMesh));
      }

      applyRendererRenderCategoryFromMaterial(batchGroup);
      nextBatchGroup.add(batchGroup);
    }

    if (requestId !== this.requestId) {
      disposeFoliageGroup(nextBatchGroup);
      return;
    }

    this.clearActiveBatches();

    if (nextBatchGroup.children.length === 0) {
      disposeFoliageGroup(nextBatchGroup);
      this.onRebuilt?.();
      return;
    }

    this.activeBatchGroup = nextBatchGroup;
    this.group.add(nextBatchGroup);
    this.onRebuilt?.();
  }
}
