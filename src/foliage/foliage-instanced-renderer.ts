import {
  Camera,
  Color,
  Frustum,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  Vector2,
  Vector3,
  type BufferGeometry,
  type IUniform,
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
const FOLIAGE_WIND_ATTRIBUTE_NAME = "foliageWind";
const FOLIAGE_WIND_SHADER_KEY = "foliage-wind-v1";

type FoliageWindCompileShader = Parameters<
  MeshStandardMaterial["onBeforeCompile"]
>[0];
type FoliageWindCompileRenderer = Parameters<
  MeshStandardMaterial["onBeforeCompile"]
>[1];

interface FoliageWindUniformSet {
  time: IUniform<number>;
  strength: IUniform<number>;
  speed: IUniform<number>;
  direction: IUniform<Vector2>;
}

interface FoliageWindMaterialOptions {
  getSettings: () => FoliageQualitySettings;
  getTime: () => number;
  registerUniforms: (uniforms: FoliageWindUniformSet) => void;
}

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

function writeFoliageWindDirectionVector(
  target: Vector2,
  settings: FoliageQualitySettings
): Vector2 {
  const radians = (settings.windDirectionDegrees * Math.PI) / 180;

  return target.set(Math.cos(radians), Math.sin(radians)).normalize();
}

function createFoliageWindUniformSet(
  settings: FoliageQualitySettings,
  time: number
): FoliageWindUniformSet {
  return {
    time: { value: time },
    strength: { value: settings.windStrength },
    speed: { value: settings.windSpeed },
    direction: {
      value: writeFoliageWindDirectionVector(new Vector2(), settings)
    }
  };
}

function writeFoliageWindUniformValues(
  uniforms: FoliageWindUniformSet,
  settings: FoliageQualitySettings,
  time: number
) {
  uniforms.time.value = time;
  uniforms.strength.value = settings.windStrength;
  uniforms.speed.value = settings.windSpeed;
  writeFoliageWindDirectionVector(uniforms.direction.value, settings);
}

function patchFoliageWindMaterial(
  material: MeshStandardMaterial,
  options: FoliageWindMaterialOptions
) {
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const previousCustomProgramCacheKey =
    material.customProgramCacheKey.bind(material);

  material.onBeforeCompile = (
    shader: FoliageWindCompileShader,
    renderer: FoliageWindCompileRenderer
  ) => {
    previousOnBeforeCompile(shader, renderer);

    const uniforms = createFoliageWindUniformSet(
      options.getSettings(),
      options.getTime()
    );

    shader.uniforms.foliageWindTime = uniforms.time;
    shader.uniforms.foliageWindStrength = uniforms.strength;
    shader.uniforms.foliageWindSpeed = uniforms.speed;
    shader.uniforms.foliageWindDirection = uniforms.direction;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 ${FOLIAGE_WIND_ATTRIBUTE_NAME};
uniform float foliageWindTime;
uniform float foliageWindStrength;
uniform float foliageWindSpeed;
uniform vec2 foliageWindDirection;`
      )
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
float foliageWindHeightMask = clamp(position.y, 0.0, 1.0);
foliageWindHeightMask *= foliageWindHeightMask;
float foliageWindInstanceStrength = max(${FOLIAGE_WIND_ATTRIBUTE_NAME}.y, 0.0);
float foliageWindAmount =
  foliageWindStrength * foliageWindInstanceStrength * foliageWindHeightMask;
vec2 foliageWindSideDirection = vec2(-foliageWindDirection.y, foliageWindDirection.x);
float foliageWindPhase =
  dot(mvPosition.xz, foliageWindDirection * 0.22) +
  ${FOLIAGE_WIND_ATTRIBUTE_NAME}.x +
  foliageWindTime * foliageWindSpeed;
float foliageWindPrimary = sin(foliageWindPhase);
float foliageWindSecondary = sin(foliageWindPhase * 1.73 + foliageWindTime * foliageWindSpeed * 0.37);
mvPosition.xz += foliageWindDirection * foliageWindPrimary * foliageWindAmount * 0.18;
mvPosition.xz += foliageWindSideDirection * foliageWindSecondary * foliageWindAmount * 0.045;
mvPosition.y += foliageWindSecondary * foliageWindAmount * 0.025;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`
      );

    options.registerUniforms(uniforms);
  };
  material.customProgramCacheKey = () =>
    `${previousCustomProgramCacheKey()}|${FOLIAGE_WIND_SHADER_KEY}`;
  material.needsUpdate = true;
}

function cloneMaterial(
  material: Material,
  windOptions?: FoliageWindMaterialOptions
): Material {
  const clonedMaterial = material.clone();

  if (
    windOptions !== undefined &&
    clonedMaterial instanceof MeshStandardMaterial
  ) {
    patchFoliageWindMaterial(clonedMaterial, windOptions);
  }

  return clonedMaterial;
}

function cloneMaterialSet(
  material: Material | Material[],
  windOptions?: FoliageWindMaterialOptions
): Material | Material[] {
  return Array.isArray(material)
    ? material.map((entry) => cloneMaterial(entry, windOptions))
    : cloneMaterial(material, windOptions);
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
      shadows: options.quality.shadows,
      windEnabled: options.quality.windEnabled
    }
  });
}

function createFoliageWindAttribute(
  instances: FoliageRenderBatch["instances"]
): InstancedBufferAttribute {
  const values = new Float32Array(instances.length * 2);

  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]!;

    values[index * 2] = instance.windPhase;
    values[index * 2 + 1] = Math.max(0, instance.windStrength);
  }

  return new InstancedBufferAttribute(values, 2);
}

function createInstancedMeshForSource(
  batch: FoliageRenderBatch,
  sourceMesh: FoliageTemplateSourceMesh,
  windOptions?: FoliageWindMaterialOptions
): InstancedMesh {
  const mesh = new InstancedMesh(
    sourceMesh.geometry.clone(),
    cloneMaterialSet(sourceMesh.material, windOptions),
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

  if (windOptions !== undefined) {
    mesh.geometry.setAttribute(
      FOLIAGE_WIND_ATTRIBUTE_NAME,
      createFoliageWindAttribute(batch.instances)
    );
  }

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
  private windTime = 0;
  private windUniforms: FoliageWindUniformSet[] = [];
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

  updateWind(deltaSeconds: number) {
    if (!this.shouldApplyWindShader()) {
      return;
    }

    if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      this.windTime += deltaSeconds;
    }

    this.writeWindUniforms();
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
      this.writeWindUniforms();
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
    this.windUniforms = [];
    this.sourceMeshPromisesByBundledPath.clear();
    this.clearActiveBatches();
  }

  private clearActiveBatches() {
    this.batchGroupsByKey.clear();
    this.activeBatchKeyByChunkKey.clear();
    this.activeLodLevelByChunkKey.clear();
    this.renderChunks = [];
    this.windUniforms = [];

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

  private shouldApplyWindShader(): boolean {
    return (
      this.quality.enabled &&
      this.quality.densityMultiplier > 0 &&
      this.quality.windEnabled
    );
  }

  private registerWindUniforms = (uniforms: FoliageWindUniformSet) => {
    writeFoliageWindUniformValues(uniforms, this.quality, this.windTime);
    this.windUniforms.push(uniforms);
  };

  private writeWindUniforms() {
    if (!this.shouldApplyWindShader()) {
      return;
    }

    for (const uniforms of this.windUniforms) {
      writeFoliageWindUniformValues(uniforms, this.quality, this.windTime);
    }
  }

  private getWindMaterialOptions(): FoliageWindMaterialOptions | undefined {
    if (!this.shouldApplyWindShader()) {
      return undefined;
    }

    return {
      getSettings: () => this.quality,
      getTime: () => this.windTime,
      registerUniforms: this.registerWindUniforms
    };
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

      const windOptions = this.getWindMaterialOptions();

      for (const sourceMesh of sourceMeshes) {
        batchGroup.add(
          createInstancedMeshForSource(batch, sourceMesh, windOptions)
        );
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
