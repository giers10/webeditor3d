import {
  Camera,
  Color,
  Frustum,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Sphere,
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
  createFoliageRenderResourcePlan,
  resolveFoliageRenderChunkLod,
  type FoliageRenderBatch,
  type FoliageRenderChunk,
  type FoliageRenderResourcePlan,
  type FoliageRenderView
} from "./foliage-render-batches";
import type {
  FoliageLayer,
  FoliageLayerRegistry,
  FoliagePrototypeLodLevel,
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

function stableStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(String(value));
}

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

function writeRenderViewFromCamera(
  camera: Camera,
  view: FoliageRenderView,
  cameraPosition: Vector3,
  projectionViewMatrix: Matrix4,
  frustum: Frustum
): FoliageRenderView {
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  camera.getWorldPosition(cameraPosition);
  projectionViewMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(projectionViewMatrix);

  view.cameraPosition.x = cameraPosition.x;
  view.cameraPosition.y = cameraPosition.y;
  view.cameraPosition.z = cameraPosition.z;
  view.frustum = frustum;

  return view;
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

function createFoliageRenderResourceSignature(options: {
  terrains: Record<string, Terrain>;
  foliageLayers: FoliageLayerRegistry;
  prototypeRegistry: FoliagePrototypeRegistry;
  quality: FoliageQualitySettings;
}): string {
  return stableStringify({
    terrains: options.terrains,
    foliageLayers: options.foliageLayers,
    prototypeRegistry: options.prototypeRegistry,
    quality: {
      enabled: options.quality.enabled,
      densityMultiplier: options.quality.densityMultiplier,
      shadows: options.quality.shadows
    }
  });
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
  private batchGroupsByKey = new Map<string, Group>();
  private activeBatchKeyByChunkKey = new Map<string, string>();
  private activeLodLevelByChunkKey = new Map<
    string,
    FoliagePrototypeLodLevel
  >();
  private renderChunks: FoliageRenderChunk[] = [];
  private scatter: FoliageScatterResult | null = null;
  private prototypeRegistry: FoliagePrototypeRegistry = {};
  private quality: FoliageQualitySettings = resolveFoliageQualitySettings(null);
  private currentView: FoliageRenderView | null = null;
  private viewSignature: string | null = null;
  private renderResourceSignature: string | null = null;
  private readonly renderViewCameraPosition = new Vector3();
  private readonly renderViewProjectionMatrix = new Matrix4();
  private readonly renderViewFrustum = new Frustum();
  private readonly renderView: FoliageRenderView = {
    cameraPosition: { x: 0, y: 0, z: 0 },
    frustum: this.renderViewFrustum
  };
  private readonly chunkFrustumSphere = new Sphere();
  private readonly sourceMeshPromisesByBundledPath = new Map<
    string,
    Promise<FoliageTemplateSourceMesh[]>
  >();
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
    const previousMaxDistanceMultiplier = this.quality.maxDistanceMultiplier;
    const prototypeRegistry = createFoliageScatterPrototypeRegistry({
      foliagePrototypes: input.foliagePrototypes,
      bundledFoliagePrototypes: input.bundledFoliagePrototypes
    });
    const foliageLayers = scaleFoliageLayerRegistryDensities(
      input.foliageLayers,
      quality.densityMultiplier
    );
    const renderResourceSignature = createFoliageRenderResourceSignature({
      terrains,
      foliageLayers,
      prototypeRegistry,
      quality
    });

    this.quality = quality;
    this.prototypeRegistry = prototypeRegistry;

    if (quality.maxDistanceMultiplier !== previousMaxDistanceMultiplier) {
      this.resetActiveChunkViewState();
    }

    if (!quality.enabled || quality.densityMultiplier <= 0) {
      this.scatter = null;
      this.renderResourceSignature = null;
      this.clearActiveBatches();
      this.onRebuilt?.();
      return;
    }

    if (
      renderResourceSignature === this.renderResourceSignature &&
      this.scatter !== null
    ) {
      this.applyCurrentViewToRenderResources();
      return;
    }

    this.renderResourceSignature = renderResourceSignature;
    this.scatter = generateFoliageScatterForScene({
      terrains,
      foliageLayers,
      foliagePrototypes: input.foliagePrototypes,
      bundledFoliagePrototypes: input.bundledFoliagePrototypes
    });
    this.rebuildRenderResources();
  }

  updateView(camera: Camera) {
    this.currentView = writeRenderViewFromCamera(
      camera,
      this.renderView,
      this.renderViewCameraPosition,
      this.renderViewProjectionMatrix,
      this.renderViewFrustum
    );

    if (this.scatter === null) {
      return;
    }

    const nextViewSignature = createCameraViewSignature(camera);

    if (nextViewSignature === this.viewSignature) {
      return;
    }

    this.viewSignature = nextViewSignature;
    this.applyCurrentViewToRenderResources();
  }

  private rebuildRenderResources() {
    const requestId = ++this.requestId;
    const scatter = this.scatter;

    if (scatter === null) {
      this.clearActiveBatches();
      this.onRebuilt?.();
      return;
    }

    const renderResourcePlan = createFoliageRenderResourcePlan(
      scatter,
      this.prototypeRegistry,
      {
        quality: this.quality
      }
    );

    if (renderResourcePlan.batches.length === 0) {
      this.clearActiveBatches();
      this.onRebuilt?.();
      return;
    }

    void this.rebuildBatchesAsync(requestId, renderResourcePlan);
  }

  private applyCurrentViewToRenderResources() {
    if (this.activeBatchGroup === null) {
      return;
    }

    for (const chunk of this.renderChunks) {
      const previousBatchKey =
        this.activeBatchKeyByChunkKey.get(chunk.key) ?? null;
      const previousLodLevel =
        this.activeLodLevelByChunkKey.get(chunk.key) ?? null;
      const renderLod = resolveFoliageRenderChunkLod({
        chunk,
        view: this.currentView,
        quality: this.quality,
        previousLodLevel,
        frustumSphere: this.chunkFrustumSphere
      });
      const nextBatchKey =
        renderLod === null
          ? null
          : (chunk.batchKeysByLodLevel[renderLod.level] ?? null);

      if (nextBatchKey === previousBatchKey) {
        continue;
      }

      if (previousBatchKey !== null) {
        this.setBatchGroupVisibility(previousBatchKey, false);
      }

      if (nextBatchKey === null || renderLod === null) {
        this.activeBatchKeyByChunkKey.delete(chunk.key);
        this.activeLodLevelByChunkKey.delete(chunk.key);
        continue;
      }

      this.setBatchGroupVisibility(nextBatchKey, true);
      this.activeBatchKeyByChunkKey.set(chunk.key, nextBatchKey);
      this.activeLodLevelByChunkKey.set(chunk.key, renderLod.level);
    }
  }

  private setBatchGroupVisibility(batchKey: string, visible: boolean) {
    const batchGroup = this.batchGroupsByKey.get(batchKey);

    if (batchGroup === undefined || batchGroup.visible === visible) {
      return;
    }

    batchGroup.visible = visible;
  }

  private resetActiveChunkViewState() {
    for (const batchKey of this.activeBatchKeyByChunkKey.values()) {
      this.setBatchGroupVisibility(batchKey, false);
    }

    this.activeBatchKeyByChunkKey.clear();
    this.activeLodLevelByChunkKey.clear();
  }

  dispose() {
    this.requestId += 1;
    this.scatter = null;
    this.prototypeRegistry = {};
    this.currentView = null;
    this.viewSignature = null;
    this.renderResourceSignature = null;
    this.sourceMeshPromisesByBundledPath.clear();
    this.clearActiveBatches();
  }

  private clearActiveBatches() {
    this.batchGroupsByKey.clear();
    this.activeBatchKeyByChunkKey.clear();
    this.activeLodLevelByChunkKey.clear();
    this.renderChunks = [];

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

  private loadTemplateSourceMeshes(
    bundledPath: string
  ): Promise<FoliageTemplateSourceMesh[]> {
    const cachedSourceMeshPromise =
      this.sourceMeshPromisesByBundledPath.get(bundledPath);

    if (cachedSourceMeshPromise !== undefined) {
      return cachedSourceMeshPromise;
    }

    const sourceMeshPromise = loadBundledFoliageModelTemplate(bundledPath)
      .then((template) => collectTemplateSourceMeshes(template))
      .catch((error: unknown) => {
        this.sourceMeshPromisesByBundledPath.delete(bundledPath);
        throw error;
      });

    this.sourceMeshPromisesByBundledPath.set(bundledPath, sourceMeshPromise);
    return sourceMeshPromise;
  }

  private async rebuildBatchesAsync(
    requestId: number,
    renderResourcePlan: FoliageRenderResourcePlan
  ) {
    const nextBatchGroup = new Group();
    const nextBatchGroupsByKey = new Map<string, Group>();
    nextBatchGroup.name = "foliageInstancedBatches";
    nextBatchGroup.userData.nonPickable = true;

    for (const batch of renderResourcePlan.batches) {
      let sourceMeshes: FoliageTemplateSourceMesh[];

      try {
        sourceMeshes = await this.loadTemplateSourceMeshes(batch.bundledPath);
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

      if (sourceMeshes.length === 0) {
        this.emitDiagnostic(
          `Bundled foliage model ${batch.bundledPath} contains no renderable meshes.`
        );
        continue;
      }

      const batchGroup = new Group();
      batchGroup.name = `FoliageBatch:${batch.prototypeId}`;
      batchGroup.visible = false;
      batchGroup.userData.nonPickable = true;
      batchGroup.userData.foliageBatchKey = batch.key;
      batchGroup.userData.foliagePrototypeId = batch.prototypeId;
      batchGroup.userData.foliageLayerId = batch.layerId;
      batchGroup.userData.foliageTerrainId = batch.terrainId;

      for (const sourceMesh of sourceMeshes) {
        batchGroup.add(createInstancedMeshForSource(batch, sourceMesh));
      }

      applyRendererRenderCategoryFromMaterial(batchGroup);
      nextBatchGroupsByKey.set(batch.key, batchGroup);
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
    this.batchGroupsByKey = nextBatchGroupsByKey;
    this.renderChunks = [...renderResourcePlan.chunks];
    this.group.add(nextBatchGroup);
    this.applyCurrentViewToRenderResources();
    this.onRebuilt?.();
  }
}
