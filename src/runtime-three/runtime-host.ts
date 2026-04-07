import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  BufferGeometry,
  DirectionalLight,
  Euler,
  Group,
  FogExp2,
  LoopOnce,
  LoopRepeat,
  Matrix4,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector3,
  SpotLight,
  UniformsLib,
  UniformsUtils,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";
import { EffectComposer } from "postprocessing";

import { createModelInstanceRenderGroup, disposeModelInstance } from "../assets/model-instance-rendering";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { LoadedAudioAsset } from "../assets/audio-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import { buildBoxBrushDerivedMeshData } from "../geometry/box-brush-mesh";
import { createStarterMaterialSignature, createStarterMaterialTexture } from "../materials/starter-material-textures";
import {
  applyAdvancedRenderingLightShadowFlags,
  applyAdvancedRenderingRenderableShadowFlags,
  configureAdvancedRenderingRenderer,
  createAdvancedRenderingComposer,
  resolveBoxVolumeRenderPaths,
  type ResolvedBoxVolumeRenderPaths
} from "../rendering/advanced-rendering";
import {
  collectWaterContactPatches,
  createWaterContactPatchAxisUniformValue,
  createWaterContactPatchShapeUniformValue,
  createWaterContactPatchUniformValue,
  createWaterMaterial
} from "../rendering/water-material";
import { updatePlanarReflectionCamera } from "../rendering/planar-reflection";
import {
  areAdvancedRenderingSettingsEqual,
  cloneAdvancedRenderingSettings,
  type AdvancedRenderingSettings
} from "../document/world-settings";

import { FirstPersonNavigationController } from "./first-person-navigation-controller";
import type { FirstPersonTelemetry, NavigationController, RuntimeControllerContext, RuntimePlayerVolumeState } from "./navigation-controller";
import { RapierCollisionWorld } from "./rapier-collision-world";
import { RuntimeInteractionSystem, type RuntimeInteractionDispatcher, type RuntimeInteractionPrompt } from "./runtime-interaction-system";
import { RuntimeAudioSystem } from "./runtime-audio-system";
import { OrbitVisitorNavigationController } from "./orbit-visitor-navigation-controller";
import { resolveUnderwaterFogState } from "./underwater-fog";
import type {
  RuntimeBoxBrushInstance,
  RuntimeLocalLightCollection,
  RuntimeNavigationMode,
  RuntimeSceneDefinition,
  RuntimeTeleportTarget
} from "./runtime-scene-build";

interface CachedMaterialTexture {
  signature: string;
  texture: ReturnType<typeof createStarterMaterialTexture>;
}

interface LocalLightRenderObjects {
  group: Group;
}

interface RuntimeWaterContactUniformBinding {
  brush: RuntimeBoxBrushInstance;
  uniform: { value: import("three").Vector4[] };
  axisUniform: { value: import("three").Vector2[] };
  shapeUniform: { value: number[] };
  staticContactPatches: ReturnType<typeof collectWaterContactPatches>;
  reflectionTextureUniform: { value: import("three").Texture | null } | null;
  reflectionMatrixUniform: { value: Matrix4 } | null;
  reflectionEnabledUniform: { value: number } | null;
  reflectionRenderTarget: WebGLRenderTarget | null;
}

const FALLBACK_FACE_COLOR = 0x747d89;

export class RuntimeHost {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.05, 1000);
  private readonly cameraForward = new Vector3();
  private readonly volumeOffset = new Vector3();
  private readonly volumeInverseRotation = new Quaternion();
  private readonly domElement: HTMLCanvasElement;
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly localLightGroup = new Group();
  private readonly brushGroup = new Group();
  private readonly modelGroup = new Group();
  private readonly firstPersonController = new FirstPersonNavigationController();
  private readonly orbitVisitorController = new OrbitVisitorNavigationController();
  private readonly interactionSystem = new RuntimeInteractionSystem();
  private readonly audioSystem = new RuntimeAudioSystem(this.scene, this.camera, null);
  private readonly underwaterSceneFog = new FogExp2("#2c6f8d", 0.03);
  private readonly waterReflectionCamera = new PerspectiveCamera();
  private readonly brushMeshes = new Map<string, Mesh<BufferGeometry, Material[]>>();
  private volumeTime = 0;
  private readonly volumeAnimatedMaterials: ShaderMaterial[] = [];
  private readonly volumeAnimatedUniforms: Array<{ value: number }> = [];
  private readonly runtimeWaterContactUniforms: RuntimeWaterContactUniformBinding[] = [];
  private readonly localLightObjects = new Map<string, Group>();
  private readonly modelRenderObjects = new Map<string, Group>();
  private readonly materialTextureCache = new Map<string, CachedMaterialTexture>();
  private readonly animationMixers = new Map<string, AnimationMixer>();
  private readonly instanceAnimationClips = new Map<string, AnimationClip[]>();
  private readonly controllerContext: RuntimeControllerContext;
  private readonly renderer: WebGLRenderer | null;
  private runtimeScene: RuntimeSceneDefinition | null = null;
  private collisionWorld: RapierCollisionWorld | null = null;
  private collisionWorldRequestId = 0;
  private currentWorld: RuntimeSceneDefinition["world"] | null = null;
  private currentAdvancedRenderingSettings: AdvancedRenderingSettings | null = null;
  private advancedRenderingComposer: EffectComposer | null = null;
  private projectAssets: Record<string, ProjectAssetRecord> = {};
  private loadedModelAssets: Record<string, LoadedModelAsset> = {};
  private loadedImageAssets: Record<string, LoadedImageAsset> = {};
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private previousFrameTime = 0;
  private container: HTMLElement | null = null;
  private activeController: NavigationController | null = null;
  private runtimeMessageHandler: ((message: string | null) => void) | null = null;
  private firstPersonTelemetryHandler: ((telemetry: FirstPersonTelemetry | null) => void) | null = null;
  private interactionPromptHandler: ((prompt: RuntimeInteractionPrompt | null) => void) | null = null;
  private currentRuntimeMessage: string | null = null;
  private currentFirstPersonTelemetry: FirstPersonTelemetry | null = null;
  private currentInteractionPrompt: RuntimeInteractionPrompt | null = null;

  constructor(options: { enableRendering?: boolean } = {}) {
    const enableRendering = options.enableRendering ?? true;

    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.localLightGroup);
    this.scene.add(this.brushGroup);
    this.scene.add(this.modelGroup);
    this.renderer = enableRendering ? new WebGLRenderer({ antialias: false, alpha: true }) : null;
    this.domElement = this.renderer?.domElement ?? document.createElement("canvas");

    if (this.renderer !== null) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearAlpha(0);
    } else {
      this.domElement.className = "runner-canvas__surface";
    }

    this.controllerContext = {
      camera: this.camera,
      domElement: this.domElement,
      getRuntimeScene: () => {
        if (this.runtimeScene === null) {
          throw new Error("Runtime scene has not been loaded.");
        }

        return this.runtimeScene;
      },
      resolveFirstPersonMotion: (feetPosition, motion, shape) => this.collisionWorld?.resolveFirstPersonMotion(feetPosition, motion, shape) ?? null,
      resolvePlayerVolumeState: (feetPosition) => this.resolvePlayerVolumeState(feetPosition),
      setRuntimeMessage: (message) => {
        if (message === this.currentRuntimeMessage) {
          return;
        }

        this.currentRuntimeMessage = message;
        this.runtimeMessageHandler?.(message);
      },
      setFirstPersonTelemetry: (telemetry) => {
        this.currentFirstPersonTelemetry = telemetry;
        this.firstPersonTelemetryHandler?.(telemetry);
      }
    };
  }

  private resolvePlayerVolumeState(feetPosition: { x: number; y: number; z: number }): RuntimePlayerVolumeState {
    if (this.runtimeScene === null) {
      return {
        inWater: false,
        inFog: false
      };
    }

    const inWater = this.runtimeScene.volumes.water.some((volume) => this.isPointInsideOrientedVolume(feetPosition, volume));
    const inFog = this.runtimeScene.volumes.fog.some((volume) => this.isPointInsideOrientedVolume(feetPosition, volume));

    return {
      inWater,
      inFog
    };
  }

  private isPointInsideOrientedVolume(
    point: { x: number; y: number; z: number },
    volume: { center: { x: number; y: number; z: number }; rotationDegrees: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } }
  ): boolean {
    this.volumeOffset.set(point.x - volume.center.x, point.y - volume.center.y, point.z - volume.center.z);

    this.volumeInverseRotation
      .setFromEuler(
        new Euler(
          (volume.rotationDegrees.x * Math.PI) / 180,
          (volume.rotationDegrees.y * Math.PI) / 180,
          (volume.rotationDegrees.z * Math.PI) / 180,
          "XYZ"
        )
      )
      .invert();

    this.volumeOffset.applyQuaternion(this.volumeInverseRotation);

    const halfX = volume.size.x * 0.5;
    const halfY = volume.size.y * 0.5;
    const halfZ = volume.size.z * 0.5;

    return (
      Math.abs(this.volumeOffset.x) <= halfX &&
      Math.abs(this.volumeOffset.y) <= halfY &&
      Math.abs(this.volumeOffset.z) <= halfZ
    );
  }

  mount(container: HTMLElement) {
    this.container = container;
    container.appendChild(this.domElement);
    this.domElement.addEventListener("click", this.handleRuntimeClick);
    this.domElement.addEventListener("pointerdown", this.handleRuntimePointerDown);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);

    this.previousFrameTime = performance.now();
    this.render();
  }

  loadScene(runtimeScene: RuntimeSceneDefinition) {
    this.runtimeScene = runtimeScene;
    this.currentWorld = runtimeScene.world;
    this.interactionSystem.reset();
    this.setInteractionPrompt(null);
    this.applyWorld();
    this.rebuildLocalLights(runtimeScene.localLights);
    this.rebuildBrushMeshes(runtimeScene.brushes);
    this.rebuildModelInstances(runtimeScene.modelInstances);
    void this.rebuildCollisionWorld(runtimeScene.colliders, runtimeScene.playerCollider);
    this.audioSystem.loadScene(runtimeScene);
  }

  updateAssets(
    projectAssets: Record<string, ProjectAssetRecord>,
    loadedModelAssets: Record<string, LoadedModelAsset>,
    loadedImageAssets: Record<string, LoadedImageAsset>,
    loadedAudioAssets: Record<string, LoadedAudioAsset>
  ) {
    this.projectAssets = projectAssets;
    this.loadedModelAssets = loadedModelAssets;
    this.loadedImageAssets = loadedImageAssets;

    if (this.currentWorld !== null) {
      this.applyWorld();
    }

    if (this.runtimeScene !== null) {
      this.rebuildModelInstances(this.runtimeScene.modelInstances);
    }

    this.audioSystem.updateAssets(projectAssets, loadedAudioAssets);
  }

  setNavigationMode(mode: RuntimeNavigationMode) {
    if (this.runtimeScene === null) {
      return;
    }

    const nextController = mode === "firstPerson" ? this.firstPersonController : this.orbitVisitorController;

    if (this.activeController?.id === nextController.id) {
      return;
    }

    if (this.activeController === this.firstPersonController && this.currentFirstPersonTelemetry !== null && nextController === this.orbitVisitorController) {
      this.orbitVisitorController.setFocusPoint(this.currentFirstPersonTelemetry.feetPosition);
    }

    this.activeController?.deactivate(this.controllerContext);
    this.interactionSystem.reset();
    this.setInteractionPrompt(null);
    this.activeController = nextController;
    this.activeController.activate(this.controllerContext);
  }

  setRuntimeMessageHandler(handler: ((message: string | null) => void) | null) {
    this.runtimeMessageHandler = handler;
    this.audioSystem.setRuntimeMessageHandler(handler);
  }

  setFirstPersonTelemetryHandler(handler: ((telemetry: FirstPersonTelemetry | null) => void) | null) {
    this.firstPersonTelemetryHandler = handler;
  }

  setInteractionPromptHandler(handler: ((prompt: RuntimeInteractionPrompt | null) => void) | null) {
    this.interactionPromptHandler = handler;
  }

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.activeController?.deactivate(this.controllerContext);
    this.activeController = null;
    this.setInteractionPrompt(null);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.clearLocalLights();
    this.clearBrushMeshes();
    this.clearModelInstances();
    this.collisionWorldRequestId += 1;
    this.clearCollisionWorld();
    this.audioSystem.dispose();
    this.advancedRenderingComposer?.dispose();
    this.advancedRenderingComposer = null;
    this.currentAdvancedRenderingSettings = null;
    this.scene.fog = null;
    if (this.renderer !== null) {
      this.renderer.autoClear = true;
    }

    for (const cachedTexture of this.materialTextureCache.values()) {
      cachedTexture.texture.dispose();
    }

    this.materialTextureCache.clear();
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
    this.domElement.removeEventListener("click", this.handleRuntimeClick);
    this.domElement.removeEventListener("pointerdown", this.handleRuntimePointerDown);

    if (this.container !== null && this.container.contains(this.domElement)) {
      this.container.removeChild(this.domElement);
    }

    this.container = null;
  }

  private applyWorld() {
    if (this.currentWorld === null) {
      return;
    }

    const world = this.currentWorld;
    this.ambientLight.color.set(world.ambientLight.colorHex);
    this.ambientLight.intensity = world.ambientLight.intensity;
    this.sunLight.color.set(world.sunLight.colorHex);
    this.sunLight.intensity = world.sunLight.intensity;
    this.sunLight.position
      .set(
        world.sunLight.direction.x,
        world.sunLight.direction.y,
        world.sunLight.direction.z
      )
      .normalize()
      .multiplyScalar(18);

    if (world.background.mode === "image") {
      const texture = this.loadedImageAssets[world.background.assetId]?.texture ?? null;
      this.scene.background = texture;
      this.scene.environment = texture;
      this.scene.environmentIntensity = world.background.environmentIntensity;
    } else {
      this.scene.background = null;
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
    }

    if (this.renderer !== null) {
      configureAdvancedRenderingRenderer(this.renderer, world.advancedRendering);
      this.syncAdvancedRenderingComposer(world.advancedRendering);
    }

    this.applyShadowState();
  }

  private async rebuildCollisionWorld(colliders: RuntimeSceneDefinition["colliders"], playerShape: RuntimeSceneDefinition["playerCollider"]) {
    const requestId = ++this.collisionWorldRequestId;

    this.clearCollisionWorld();

    try {
      const nextCollisionWorld = await RapierCollisionWorld.create(colliders, playerShape);

      if (requestId !== this.collisionWorldRequestId) {
        nextCollisionWorld.dispose();
        return;
      }

      this.collisionWorld = nextCollisionWorld;
    } catch (error) {
      if (requestId !== this.collisionWorldRequestId) {
        return;
      }

      const message = error instanceof Error ? error.message : "Runner collision initialization failed.";
      this.currentRuntimeMessage = `Runner collision initialization failed: ${message}`;
      this.runtimeMessageHandler?.(this.currentRuntimeMessage);
    }
  }

  private clearCollisionWorld() {
    this.collisionWorld?.dispose();
    this.collisionWorld = null;
  }

  private syncAdvancedRenderingComposer(settings: AdvancedRenderingSettings) {
    if (this.renderer === null) {
      return;
    }

    const shouldUseComposer = settings.enabled;
    const settingsChanged =
      this.currentAdvancedRenderingSettings === null ||
      !areAdvancedRenderingSettingsEqual(this.currentAdvancedRenderingSettings, settings);

    if (!shouldUseComposer) {
      if (this.advancedRenderingComposer !== null) {
        this.advancedRenderingComposer.dispose();
        this.advancedRenderingComposer = null;
      }

      this.currentAdvancedRenderingSettings = null;
      this.renderer.autoClear = true;
      return;
    }

    if (this.advancedRenderingComposer !== null && !settingsChanged) {
      return;
    }

    if (this.advancedRenderingComposer !== null) {
      this.advancedRenderingComposer.dispose();
    }

    this.advancedRenderingComposer = createAdvancedRenderingComposer(this.renderer, this.scene, this.camera, settings);
    this.currentAdvancedRenderingSettings = cloneAdvancedRenderingSettings(settings);
    this.renderer.autoClear = false;
  }

  private applyShadowState() {
    if (this.currentWorld === null) {
      return;
    }

    const advancedRendering = this.currentWorld.advancedRendering;
    const shadowsEnabled = advancedRendering.enabled && advancedRendering.shadows.enabled;

    applyAdvancedRenderingLightShadowFlags(this.sunLight, advancedRendering);

    for (const renderGroup of this.localLightObjects.values()) {
      applyAdvancedRenderingLightShadowFlags(renderGroup, advancedRendering);
    }

    for (const mesh of this.brushMeshes.values()) {
      applyAdvancedRenderingRenderableShadowFlags(mesh, shadowsEnabled);
    }

    for (const renderGroup of this.modelRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(renderGroup, shadowsEnabled);
    }
  }

  private rebuildLocalLights(localLights: RuntimeLocalLightCollection) {
    this.clearLocalLights();

    for (const pointLight of localLights.pointLights) {
      const renderObjects = this.createPointLightRuntimeObjects(pointLight);
      this.localLightGroup.add(renderObjects.group);
      this.localLightObjects.set(pointLight.entityId, renderObjects.group);
    }

    for (const spotLight of localLights.spotLights) {
      const renderObjects = this.createSpotLightRuntimeObjects(spotLight);
      this.localLightGroup.add(renderObjects.group);
      this.localLightObjects.set(spotLight.entityId, renderObjects.group);
    }

    this.applyShadowState();
  }

  private createPointLightRuntimeObjects(pointLight: RuntimeLocalLightCollection["pointLights"][number]): LocalLightRenderObjects {
    const group = new Group();
    const light = new PointLight(pointLight.colorHex, pointLight.intensity, pointLight.distance);

    group.position.set(pointLight.position.x, pointLight.position.y, pointLight.position.z);
    light.position.set(0, 0, 0);
    group.add(light);

    return {
      group
    };
  }

  private createSpotLightRuntimeObjects(spotLight: RuntimeLocalLightCollection["spotLights"][number]): LocalLightRenderObjects {
    const group = new Group();
    const light = new SpotLight(
      spotLight.colorHex,
      spotLight.intensity,
      spotLight.distance,
      (spotLight.angleDegrees * Math.PI) / 180,
      0.18,
      1
    );
    const direction = new Vector3(spotLight.direction.x, spotLight.direction.y, spotLight.direction.z).normalize();
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);

    group.position.set(spotLight.position.x, spotLight.position.y, spotLight.position.z);
    group.quaternion.copy(orientation);
    light.position.set(0, 0, 0);
    light.target.position.set(0, 1, 0);
    group.add(light);
    group.add(light.target);

    return {
      group
    };
  }

  private rebuildBrushMeshes(brushes: RuntimeBoxBrushInstance[]) {
    this.clearBrushMeshes();
    const volumeRenderPaths: ResolvedBoxVolumeRenderPaths =
      this.currentWorld === null ? { fog: "performance", water: "performance" } : resolveBoxVolumeRenderPaths(this.currentWorld.advancedRendering);

    for (const brush of brushes) {
      const geometry = buildBoxBrushDerivedMeshData(brush).geometry;
      const staticContactPatches = brush.volume.mode === "water" ? this.collectRuntimeStaticWaterContactPatches(brush) : [];
      const contactPatches =
        brush.volume.mode === "water"
          ? this.mergeRuntimeWaterContactPatches(brush, staticContactPatches, this.collectRuntimePlayerWaterContactPatches(brush))
          : [];

      const materials = [
        this.createFaceMaterial(brush, "posX", brush.faces.posX.material, volumeRenderPaths, contactPatches, staticContactPatches),
        this.createFaceMaterial(brush, "negX", brush.faces.negX.material, volumeRenderPaths, contactPatches, staticContactPatches),
        this.createFaceMaterial(brush, "posY", brush.faces.posY.material, volumeRenderPaths, contactPatches, staticContactPatches),
        this.createFaceMaterial(brush, "negY", brush.faces.negY.material, volumeRenderPaths, contactPatches, staticContactPatches),
        this.createFaceMaterial(brush, "posZ", brush.faces.posZ.material, volumeRenderPaths, contactPatches, staticContactPatches),
        this.createFaceMaterial(brush, "negZ", brush.faces.negZ.material, volumeRenderPaths, contactPatches, staticContactPatches)
      ];

      const mesh = new Mesh(geometry, materials);
      mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
      mesh.rotation.set(
        (brush.rotationDegrees.x * Math.PI) / 180,
        (brush.rotationDegrees.y * Math.PI) / 180,
        (brush.rotationDegrees.z * Math.PI) / 180
      );
      this.brushGroup.add(mesh);
      this.brushMeshes.set(brush.id, mesh);
    }

    this.applyShadowState();
  }

  private rebuildModelInstances(modelInstances: RuntimeSceneDefinition["modelInstances"]) {
    this.clearModelInstances();

    for (const modelInstance of modelInstances) {
      const asset = this.projectAssets[modelInstance.assetId];
      const loadedAsset = this.loadedModelAssets[modelInstance.assetId];
      const renderGroup = createModelInstanceRenderGroup(
        {
          id: modelInstance.instanceId,
          kind: "modelInstance",
          assetId: modelInstance.assetId,
          name: modelInstance.name,
          position: modelInstance.position,
          rotationDegrees: modelInstance.rotationDegrees,
          scale: modelInstance.scale,
          collision: {
            mode: "none",
            visible: false
          }
        },
        asset,
        loadedAsset,
        false
      );
      this.modelGroup.add(renderGroup);
      this.modelRenderObjects.set(modelInstance.instanceId, renderGroup);

      if (loadedAsset?.animations && loadedAsset.animations.length > 0) {
        const mixer = new AnimationMixer(renderGroup);
        this.animationMixers.set(modelInstance.instanceId, mixer);
        this.instanceAnimationClips.set(modelInstance.instanceId, loadedAsset.animations);

        if (modelInstance.animationAutoplay === true && modelInstance.animationClipName) {
          const clip = AnimationClip.findByName(loadedAsset.animations, modelInstance.animationClipName);
          if (clip) {
            mixer.clipAction(clip).play();
          }
        }
      }
    }

    this.applyShadowState();
  }

  private createFaceMaterial(
    brush: RuntimeBoxBrushInstance,
    faceId: "posX" | "negX" | "posY" | "negY" | "posZ" | "negZ",
    material: RuntimeBoxBrushInstance["faces"]["posX"]["material"],
    volumeRenderPaths: { fog: "performance" | "quality"; water: "performance" | "quality" },
    contactPatches: ReturnType<typeof collectWaterContactPatches>,
    staticContactPatches: ReturnType<typeof collectWaterContactPatches>
  ): Material {
    if (brush.volume.mode === "water") {
      const baseOpacity = Math.max(0.05, Math.min(1, brush.volume.water.surfaceOpacity));
      const waterMaterial = createWaterMaterial({
        colorHex: brush.volume.water.colorHex,
        surfaceOpacity: brush.volume.water.surfaceOpacity,
        waveStrength: brush.volume.water.waveStrength,
        opacity: faceId === "posY" ? Math.min(1, baseOpacity + 0.18) : baseOpacity * 0.5,
        quality: volumeRenderPaths.water === "quality",
        wireframe: false,
        isTopFace: faceId === "posY",
        time: this.volumeTime,
        halfSize: {
          x: brush.size.x * 0.5,
          z: brush.size.z * 0.5
        },
        contactPatches,
        reflection: {
          texture: null,
          enabled: faceId === "posY" && this.getWaterReflectionMode() !== "none"
        }
      });

      if (waterMaterial.animationUniform !== null) {
        this.volumeAnimatedUniforms.push(waterMaterial.animationUniform);
      }

      if (faceId === "posY" && waterMaterial.contactPatchesUniform !== null && waterMaterial.contactPatchAxesUniform !== null) {
        this.runtimeWaterContactUniforms.push({
          brush,
          uniform: waterMaterial.contactPatchesUniform,
          axisUniform: waterMaterial.contactPatchAxesUniform,
          shapeUniform: waterMaterial.contactPatchShapesUniform ?? { value: [] },
          staticContactPatches,
          reflectionTextureUniform: waterMaterial.reflectionTextureUniform,
          reflectionMatrixUniform: waterMaterial.reflectionMatrixUniform,
          reflectionEnabledUniform: waterMaterial.reflectionEnabledUniform,
          reflectionRenderTarget: this.getWaterReflectionMode() !== "none" ? this.createWaterReflectionRenderTarget() : null
        });
      }

      return waterMaterial.material;
    }

    if (brush.volume.mode === "fog") {
      if (volumeRenderPaths.fog === "quality") {
        return this.createFogQualityMaterial(brush.volume.fog);
      }
      // Performance fallback: simple transparent material
      const densityOpacity = Math.max(0.06, Math.min(0.72, brush.volume.fog.density * 0.8 + 0.08));
      return new MeshBasicMaterial({
        color: brush.volume.fog.colorHex,
        transparent: true,
        opacity: densityOpacity,
        depthWrite: false
      });
    }

    if (material === null) {
      return new MeshStandardMaterial({
        color: FALLBACK_FACE_COLOR,
        roughness: 0.9,
        metalness: 0.05
      });
    }

    return new MeshStandardMaterial({
      color: 0xffffff,
      map: this.getOrCreateTexture(material),
      roughness: 0.92,
      metalness: 0.02
    });
  }

  // Soft edge-faded fog shader with slow drift animation — quality mode only.
  private createFogQualityMaterial(fog: { colorHex: string; density: number }): ShaderMaterial {
    const hex = fog.colorHex.replace("#", "");
    const cr = parseInt(hex.substring(0, 2), 16) / 255;
    const cg = parseInt(hex.substring(2, 4), 16) / 255;
    const cb = parseInt(hex.substring(4, 6), 16) / 255;

    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform vec3 volumeFogColor;
      uniform float volumeFogDensity;
      uniform float time;
      varying vec2 vUv;
      #include <fog_pars_fragment>

      void main() {
        // Soft fade: distance from the center of each face in UV space
        vec2 dist = abs(vUv - 0.5) * 2.0;        // 0 at center, 1 at edge
        float edgeFade = 1.0 - smoothstep(0.4, 1.0, max(dist.x, dist.y));

        // Slow drifting noise to break up the flat look
        float drift = sin(vUv.x * 4.5 + time * 0.28) * sin(vUv.y * 3.2 + time * 0.22);
        float variation = 0.82 + drift * 0.18;

        float alpha = volumeFogDensity * edgeFade * variation;
        alpha = clamp(alpha, 0.0, 0.88);

        // Edge scatter brightening
        vec3 color = mix(volumeFogColor, vec3(1.0), (1.0 - edgeFade) * 0.09);
        gl_FragColor = vec4(color, alpha);
        #include <fog_fragment>
      }
    `;

    const uniforms = UniformsUtils.merge([
      UniformsLib.fog,
      {
        volumeFogColor: { value: [cr, cg, cb] },
        volumeFogDensity: { value: Math.min(0.9, fog.density + 0.12) },
        time: { value: this.volumeTime }
      }
    ]);

    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
      side: 2 // THREE.DoubleSide — fog is visible from inside too
    });
    this.volumeAnimatedMaterials.push(mat);
    return mat;
  }

  private updateUnderwaterSceneFog() {
    const fogState =
      this.activeController === this.firstPersonController
        ? resolveUnderwaterFogState(this.runtimeScene, this.currentFirstPersonTelemetry)
        : null;

    if (fogState === null) {
      if (this.scene.fog !== null) {
        this.scene.fog = null;
      }
      return;
    }

    this.underwaterSceneFog.color.set(fogState.colorHex);
    this.underwaterSceneFog.density = fogState.density;

    if (this.scene.fog !== this.underwaterSceneFog) {
      this.scene.fog = this.underwaterSceneFog;
    }
  }

  private getWaterReflectionMode() {
    if (this.currentWorld === null || !this.currentWorld.advancedRendering.enabled || this.currentWorld.advancedRendering.waterPath !== "quality") {
      return "none" as const;
    }

    return this.currentWorld.advancedRendering.waterReflectionMode;
  }

  private createWaterReflectionRenderTarget() {
    const canvasWidth = this.container?.clientWidth ?? this.domElement.width;
    const canvasHeight = this.container?.clientHeight ?? this.domElement.height;
    const width = Math.max(128, Math.round(Math.max(canvasWidth, 512) * 0.5));
    const height = Math.max(128, Math.round(Math.max(canvasHeight, 512) * 0.5));
    return new WebGLRenderTarget(width, height);
  }

  private resizeWaterReflectionTargets() {
    const canvasWidth = this.container?.clientWidth ?? this.domElement.width;
    const canvasHeight = this.container?.clientHeight ?? this.domElement.height;
    const width = Math.max(128, Math.round(Math.max(canvasWidth, 512) * 0.5));
    const height = Math.max(128, Math.round(Math.max(canvasHeight, 512) * 0.5));

    for (const binding of this.runtimeWaterContactUniforms) {
      binding.reflectionRenderTarget?.setSize(width, height);
    }
  }

  private updateRuntimeWaterReflections() {
    if (this.renderer === null || this.runtimeScene === null) {
      return;
    }

    const reflectionMode = this.getWaterReflectionMode();

    for (const binding of this.runtimeWaterContactUniforms) {
      if (
        reflectionMode === "none" ||
        binding.reflectionRenderTarget === null ||
        binding.reflectionTextureUniform === null ||
        binding.reflectionMatrixUniform === null ||
        binding.reflectionEnabledUniform === null
      ) {
        if (binding.reflectionEnabledUniform !== null) {
          binding.reflectionEnabledUniform.value = 0;
        }
        continue;
      }

      const canRenderReflection = updatePlanarReflectionCamera(
        binding.brush,
        this.camera,
        this.waterReflectionCamera,
        binding.reflectionMatrixUniform.value
      );

      if (!canRenderReflection) {
        binding.reflectionEnabledUniform.value = 0;
        continue;
      }

      const hiddenWaterMeshes: Array<{ mesh: Mesh<BufferGeometry, Material[]>; visible: boolean }> = [];
      for (const runtimeBrush of this.runtimeScene.brushes) {
        if (runtimeBrush.volume.mode !== "water") {
          continue;
        }

        const mesh = this.brushMeshes.get(runtimeBrush.id);
        if (mesh === undefined) {
          continue;
        }

        hiddenWaterMeshes.push({ mesh, visible: mesh.visible });
        mesh.visible = false;
      }

      const previousModelGroupVisibility = this.modelGroup.visible;
      if (reflectionMode === "world") {
        this.modelGroup.visible = false;
      }

      const previousAutoClear = this.renderer.autoClear;
      const previousRenderTarget = this.renderer.getRenderTarget();
      this.renderer.autoClear = true;
      this.renderer.setRenderTarget(binding.reflectionRenderTarget);
      this.renderer.clear();
      this.renderer.render(this.scene, this.waterReflectionCamera);
      this.renderer.setRenderTarget(previousRenderTarget);
      this.renderer.autoClear = previousAutoClear;
      this.modelGroup.visible = previousModelGroupVisibility;

      for (const hiddenWaterMesh of hiddenWaterMeshes) {
        hiddenWaterMesh.mesh.visible = hiddenWaterMesh.visible;
      }

      binding.reflectionTextureUniform.value = binding.reflectionRenderTarget.texture;
      binding.reflectionEnabledUniform.value = 0.36;
    }
  }

  private getOrCreateTexture(material: NonNullable<RuntimeBoxBrushInstance["faces"]["posX"]["material"]>) {
    const signature = createStarterMaterialSignature(material);
    const cachedTexture = this.materialTextureCache.get(material.id);

    if (cachedTexture !== undefined && cachedTexture.signature === signature) {
      return cachedTexture.texture;
    }

    cachedTexture?.texture.dispose();

    const texture = createStarterMaterialTexture(material);
    this.materialTextureCache.set(material.id, {
      signature,
      texture
    });

    return texture;
  }

  private clearLocalLights() {
    for (const renderGroup of this.localLightObjects.values()) {
      this.localLightGroup.remove(renderGroup);
    }

    this.localLightObjects.clear();
  }

  private clearBrushMeshes() {
    for (const mesh of this.brushMeshes.values()) {
      this.brushGroup.remove(mesh);
      mesh.geometry.dispose();

      for (const material of mesh.material) {
        material.dispose();
      }
    }

    this.brushMeshes.clear();
    this.volumeAnimatedMaterials.length = 0;
    this.volumeAnimatedUniforms.length = 0;
    for (const binding of this.runtimeWaterContactUniforms) {
      binding.reflectionRenderTarget?.dispose();
    }
    this.runtimeWaterContactUniforms.length = 0;
  }

  private createPlayerWaterContactBounds() {
    if (this.runtimeScene === null || this.currentFirstPersonTelemetry === null) {
      return null;
    }

    const feetPosition = this.currentFirstPersonTelemetry.feetPosition;
    const playerShape = this.runtimeScene.playerCollider;

    switch (playerShape.mode) {
      case "capsule":
        return {
          min: {
            x: feetPosition.x - playerShape.radius,
            y: feetPosition.y,
            z: feetPosition.z - playerShape.radius
          },
          max: {
            x: feetPosition.x + playerShape.radius,
            y: feetPosition.y + playerShape.height,
            z: feetPosition.z + playerShape.radius
          }
        };
      case "box":
        return {
          min: {
            x: feetPosition.x - playerShape.size.x * 0.5,
            y: feetPosition.y,
            z: feetPosition.z - playerShape.size.z * 0.5
          },
          max: {
            x: feetPosition.x + playerShape.size.x * 0.5,
            y: feetPosition.y + playerShape.size.y,
            z: feetPosition.z + playerShape.size.z * 0.5
          }
        };
      case "none":
        return null;
    }
  }

  private collectRuntimeStaticWaterContactPatches(brush: RuntimeBoxBrushInstance) {
    const contactBounds: Parameters<typeof collectWaterContactPatches>[1] = [];

    const runtimeBrushesById = new Map((this.runtimeScene?.brushes ?? []).map((runtimeBrush) => [runtimeBrush.id, runtimeBrush]));

    for (const collider of this.runtimeScene?.colliders ?? []) {
      if (collider.source === "brush") {
        const otherBrush = runtimeBrushesById.get(collider.brushId);

        if (otherBrush === undefined || otherBrush.id === brush.id || otherBrush.volume.mode !== "none") {
          continue;
        }

        contactBounds.push({
          kind: "triangleMesh",
          vertices: collider.vertices,
          indices: collider.indices,
          transform: {
            position: collider.center,
            rotationDegrees: collider.rotationDegrees,
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        });
        continue;
      }

      if (collider.kind === "trimesh") {
        contactBounds.push({
          kind: "triangleMesh",
          vertices: collider.vertices,
          indices: collider.indices,
          mergeProfile: "aggressive",
          transform: collider.transform
        });
        continue;
      }

      contactBounds.push({
        min: collider.worldBounds.min,
        max: collider.worldBounds.max
      });
    }

    return collectWaterContactPatches(
      {
        center: brush.center,
        rotationDegrees: brush.rotationDegrees,
        size: brush.size
      },
      contactBounds,
      this.getRuntimeWaterFoamContactLimit(brush)
    );
  }

  private collectRuntimePlayerWaterContactPatches(brush: RuntimeBoxBrushInstance) {
    const playerBounds = this.createPlayerWaterContactBounds();

    if (playerBounds === null) {
      return [];
    }

    return collectWaterContactPatches(
      {
        center: brush.center,
        rotationDegrees: brush.rotationDegrees,
        size: brush.size
      },
      [playerBounds],
      this.getRuntimeWaterFoamContactLimit(brush)
    );
  }

  private getRuntimeWaterFoamContactLimit(brush: RuntimeBoxBrushInstance) {
    return brush.volume.mode === "water" ? brush.volume.water.foamContactLimit : 0;
  }

  private mergeRuntimeWaterContactPatches(
    brush: RuntimeBoxBrushInstance,
    staticContactPatches: ReturnType<typeof collectWaterContactPatches>,
    dynamicContactPatches: ReturnType<typeof collectWaterContactPatches>
  ) {
    return [...dynamicContactPatches, ...staticContactPatches].slice(0, this.getRuntimeWaterFoamContactLimit(brush));
  }

  private updateRuntimeWaterContactUniforms() {
    for (const binding of this.runtimeWaterContactUniforms) {
      const mergedPatches = this.mergeRuntimeWaterContactPatches(
        binding.brush,
        binding.staticContactPatches,
        this.collectRuntimePlayerWaterContactPatches(binding.brush)
      );
      binding.uniform.value = createWaterContactPatchUniformValue(mergedPatches);
      binding.axisUniform.value = createWaterContactPatchAxisUniformValue(mergedPatches);
      binding.shapeUniform.value = createWaterContactPatchShapeUniformValue(mergedPatches);
    }
  }

  private clearModelInstances() {
    for (const mixer of this.animationMixers.values()) {
      mixer.stopAllAction();
    }
    this.animationMixers.clear();
    this.instanceAnimationClips.clear();

    for (const renderGroup of this.modelRenderObjects.values()) {
      this.modelGroup.remove(renderGroup);
      disposeModelInstance(renderGroup);
    }

    this.modelRenderObjects.clear();
  }

  private resize() {
    if (this.container === null) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.domElement.width = width;
    this.domElement.height = height;
    this.renderer?.setSize(width, height, false);
    this.advancedRenderingComposer?.setSize(width, height);
    this.resizeWaterReflectionTargets();
  }

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);

    const now = performance.now();
    const dt = Math.min((now - this.previousFrameTime) / 1000, 1 / 20);
    this.previousFrameTime = now;

    this.activeController?.update(dt);
    this.audioSystem.updateListenerTransform();

    this.volumeTime += dt;
    for (const mat of this.volumeAnimatedMaterials) {
      (mat.uniforms["time"] as { value: number }).value = this.volumeTime;
    }
    for (const uniform of this.volumeAnimatedUniforms) {
      uniform.value = this.volumeTime;
    }

    for (const mixer of this.animationMixers.values()) {
      mixer.update(dt);
    }

    if (this.runtimeScene !== null && this.activeController === this.firstPersonController && this.currentFirstPersonTelemetry !== null) {
      this.interactionSystem.updatePlayerPosition(this.currentFirstPersonTelemetry.feetPosition, this.runtimeScene, this.createInteractionDispatcher());
      this.camera.getWorldDirection(this.cameraForward);
      this.setInteractionPrompt(
        this.interactionSystem.resolveClickInteractionPrompt(
          this.currentFirstPersonTelemetry.eyePosition,
          {
            x: this.cameraForward.x,
            y: this.cameraForward.y,
            z: this.cameraForward.z
          },
          this.runtimeScene
        )
      );
    } else {
      this.setInteractionPrompt(null);
    }

    if (this.runtimeWaterContactUniforms.length > 0) {
      this.updateRuntimeWaterContactUniforms();
      this.updateRuntimeWaterReflections();
    }

    this.updateUnderwaterSceneFog();

    if (this.advancedRenderingComposer !== null) {
      this.advancedRenderingComposer.render(dt);
      return;
    }

    this.renderer?.render(this.scene, this.camera);
  };

  private applyTeleportPlayerAction(target: RuntimeTeleportTarget) {
    this.firstPersonController.teleportTo(target.position, target.yawDegrees);
  }

  private applyToggleBrushVisibilityAction(brushId: string, visible: boolean | undefined) {
    const mesh = this.brushMeshes.get(brushId);

    if (mesh === undefined) {
      return;
    }

    mesh.visible = visible ?? !mesh.visible;
  }

  private applyPlayAnimationAction(instanceId: string, clipName: string, loop: boolean | undefined) {
    const mixer = this.animationMixers.get(instanceId);
    const clips = this.instanceAnimationClips.get(instanceId);

    if (!mixer || !clips) {
      console.warn(`playAnimation: no mixer for instance ${instanceId}`);
      return;
    }

    const clip = AnimationClip.findByName(clips, clipName);

    if (!clip) {
      console.warn(`playAnimation: clip "${clipName}" not found on instance ${instanceId}`);
      return;
    }

    // LoopRepeat is the three.js default; LoopOnce plays the clip a single time then stops.
    const action = mixer.clipAction(clip);
    action.loop = loop === false ? LoopOnce : LoopRepeat;
    action.clampWhenFinished = loop === false;
    mixer.stopAllAction();
    action.reset().play();
  }

  private applyStopAnimationAction(instanceId: string) {
    const mixer = this.animationMixers.get(instanceId);

    if (!mixer) {
      console.warn(`stopAnimation: no mixer for instance ${instanceId}`);
      return;
    }

    mixer.stopAllAction();
  }

  private createInteractionDispatcher(): RuntimeInteractionDispatcher {
    return {
      teleportPlayer: (target) => {
        this.applyTeleportPlayerAction(target);
      },
      toggleBrushVisibility: (brushId, visible) => {
        this.applyToggleBrushVisibilityAction(brushId, visible);
      },
      playAnimation: (instanceId, clipName, loop) => {
        this.applyPlayAnimationAction(instanceId, clipName, loop);
      },
      stopAnimation: (instanceId) => {
        this.applyStopAnimationAction(instanceId);
      },
      playSound: (soundEmitterId, link) => {
        this.audioSystem.playSound(soundEmitterId, link);
      },
      stopSound: (soundEmitterId) => {
        this.audioSystem.stopSound(soundEmitterId);
      }
    };
  }

  private setInteractionPrompt(prompt: RuntimeInteractionPrompt | null) {
    if (
      this.currentInteractionPrompt?.sourceEntityId === prompt?.sourceEntityId &&
      this.currentInteractionPrompt?.prompt === prompt?.prompt &&
      this.currentInteractionPrompt?.distance === prompt?.distance &&
      this.currentInteractionPrompt?.range === prompt?.range
    ) {
      return;
    }

    this.currentInteractionPrompt = prompt;
    this.interactionPromptHandler?.(prompt);
  }

  private handleRuntimeClick = () => {
    this.audioSystem.handleUserGesture();

    if (this.runtimeScene === null || this.activeController !== this.firstPersonController || this.currentInteractionPrompt === null) {
      return;
    }

    this.interactionSystem.dispatchClickInteraction(this.currentInteractionPrompt.sourceEntityId, this.runtimeScene, this.createInteractionDispatcher());
  };

  private handleRuntimePointerDown = () => {
    this.audioSystem.handleUserGesture();
  };
}
