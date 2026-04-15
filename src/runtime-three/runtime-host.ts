import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  BufferGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
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
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector3,
  SpotLight,
  TextureLoader,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";
import { EffectComposer } from "postprocessing";

import {
  createModelInstanceRenderGroup,
  disposeModelInstance
} from "../assets/model-instance-rendering";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { LoadedAudioAsset } from "../assets/audio-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import {
  cloneFaceUvState,
  type Brush,
  type WhiteboxFaceId
} from "../document/brushes";
import {
  applyControlEffectToResolvedState,
  createDefaultResolvedControlSource,
  createInteractionLinkResolvedControlSource,
  type ActorControlTargetRef,
  type ControlEffect,
  type InteractionControlTargetRef,
  type LightControlTargetRef,
  type ModelInstanceControlTargetRef,
  type RuntimeResolvedControlChannelValue,
  type RuntimeResolvedDiscreteControlState,
  type SceneControlTargetRef,
  type SoundEmitterControlTargetRef
} from "../controls/control-surface";
import { buildBoxBrushDerivedMeshData } from "../geometry/box-brush-mesh";
import {
  createStarterMaterialSignature,
  createStarterMaterialTextureSet,
  disposeStarterMaterialTextureSet,
  type StarterMaterialTextureSet
} from "../materials/starter-material-textures";
import {
  applyAdvancedRenderingLightShadowFlags,
  applyAdvancedRenderingRenderableShadowFlags,
  configureAdvancedRenderingRenderer,
  createAdvancedRenderingComposer,
  resolveBoxVolumeRenderPaths,
  type ResolvedBoxVolumeRenderPaths
} from "../rendering/advanced-rendering";
import {
  resolveWorldEnvironmentState,
  WorldBackgroundRenderer
} from "../rendering/world-background-renderer";
import {
  collectWaterContactPatches,
  createWaterContactPatchAxisUniformValue,
  createWaterContactPatchShapeUniformValue,
  createWaterContactPatchUniformValue,
  createWaterMaterial
} from "../rendering/water-material";
import { createFogQualityMaterial } from "../rendering/fog-material";
import { updatePlanarReflectionCamera } from "../rendering/planar-reflection";
import {
  applyWhiteboxBevelToMaterial,
  shouldApplyWhiteboxBevel
} from "../rendering/whitebox-bevel-material";
import {
  areAdvancedRenderingSettingsEqual,
  cloneAdvancedRenderingSettings,
  type AdvancedRenderingSettings
} from "../document/world-settings";
import { getNpcColliderHeight } from "../entities/entity-instances";
import type { InteractionLink } from "../interactions/interaction-links";
import type {
  ImpulseSequenceStep,
  SequenceVisibilityMode,
  SequenceVisibilityTarget
} from "../sequencer/project-sequence-steps";

import { FirstPersonNavigationController } from "./first-person-navigation-controller";
import type {
  NavigationController,
  PlayerControllerTelemetry,
  RuntimeControllerContext,
  RuntimePlayerAudioHookState,
  RuntimePlayerVolumeState
} from "./navigation-controller";
import { RapierCollisionWorld } from "./rapier-collision-world";
import {
  RuntimeInteractionSystem,
  type RuntimeDialogueStartSource,
  type RuntimeInteractionDispatcher,
  type RuntimeInteractionPrompt
} from "./runtime-interaction-system";
import { RuntimeAudioSystem } from "./runtime-audio-system";
import {
  advanceRuntimeClockState,
  areRuntimeClockStatesEqual,
  cloneRuntimeClockState,
  createRuntimeClockState,
  reconfigureRuntimeClockState,
  resolveRuntimeDayNightWorldState,
  resolveRuntimeTimeState,
  type RuntimeClockState
} from "./runtime-project-time";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "./runtime-project-scheduler";
import { ThirdPersonNavigationController } from "./third-person-navigation-controller";
import { resolveUnderwaterFogState } from "./underwater-fog";
import { resolveWaterContact } from "./water-volume-utils";
import type {
  RuntimeBrushFace,
  RuntimeNpcDefinition,
  RuntimeBoxBrushInstance,
  RuntimeLocalLightCollection,
  RuntimeNavigationMode,
  RuntimeNpc,
  RuntimeSceneDefinition,
  RuntimeTeleportTarget
} from "./runtime-scene-build";
import {
  applyActorScheduleStateToNpcDefinition,
  buildRuntimeNpcCollider,
  createRuntimeNpcFromDefinition
} from "./runtime-scene-build";
import { resolvePlayerStartPauseInput } from "./player-input-bindings";

interface CachedMaterialTexture {
  signature: string;
  textureSet: StarterMaterialTextureSet;
}

function createRuntimeGeometryBrush(brush: RuntimeBoxBrushInstance): Brush {
  const faces = Object.fromEntries(
    Object.entries(brush.faces).map(([faceId, face]) => [
      faceId,
      {
        materialId: face.materialId,
        uv: cloneFaceUvState(face.uv)
      }
    ])
  );
  const base = {
    id: brush.id,
    name: undefined,
    visible: brush.visible,
    enabled: true,
    center: brush.center,
    rotationDegrees: brush.rotationDegrees,
    size: brush.size,
    volume: brush.volume
  };

  switch (brush.kind) {
    case "box":
      return {
        ...base,
        kind: "box",
        geometry: brush.geometry as Brush["geometry"],
        faces: faces as unknown as Brush["faces"]
      } as Brush;
    case "wedge":
      return {
        ...base,
        kind: "wedge",
        geometry: brush.geometry as Brush["geometry"],
        faces: faces as unknown as Brush["faces"]
      } as Brush;
    case "radialPrism":
      return {
        ...base,
        kind: "radialPrism",
        sideCount: brush.sideCount ?? 12,
        geometry: brush.geometry as Brush["geometry"],
        faces: faces as unknown as Brush["faces"]
      } as Brush;
    case "cone":
      return {
        ...base,
        kind: "cone",
        sideCount: brush.sideCount ?? 12,
        geometry: brush.geometry as Brush["geometry"],
        faces: faces as unknown as Brush["faces"]
      } as Brush;
    case "torus":
      return {
        ...base,
        kind: "torus",
        majorSegmentCount: brush.majorSegmentCount ?? 16,
        tubeSegmentCount: brush.tubeSegmentCount ?? 8,
        geometry: brush.geometry as Brush["geometry"],
        faces: faces as unknown as Brush["faces"]
      } as Brush;
  }
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button"
  );
}

interface LocalLightRenderObjects {
  group: Group;
  light: PointLight | SpotLight;
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
  lastReflectionUpdateTime: number;
}

const FALLBACK_FACE_COLOR = 0xf2ece2;
const RUNTIME_CLOCK_PUBLISH_INTERVAL_SECONDS = 1 / 30;
const WATER_REFLECTION_UPDATE_INTERVAL_MS = 96;

function dampScalar(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * Math.min(1, dt * rate);
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

export interface RuntimeSceneLoadState {
  status: "loading" | "ready" | "error";
  message: string | null;
}

export interface RuntimeSceneTransitionRequest {
  sourceEntityId: string | null;
  targetSceneId: string;
  targetEntryEntityId: string;
}

export interface RuntimeDialogueState {
  npcEntityId: string;
  dialogueId: string;
  title: string;
  lineId: string;
  lineIndex: number;
  lineCount: number;
  speakerName: string | null;
  text: string;
  source: RuntimeDialogueStartSource;
}

export interface RuntimePauseState {
  paused: boolean;
  source: "manual" | "control" | "mixed" | null;
}

export class RuntimeHost {
  private readonly scene = new Scene();
  private readonly worldBackgroundRenderer = new WorldBackgroundRenderer();
  private readonly camera = new PerspectiveCamera(70, 1, 0.05, 1000);
  private readonly cameraForward = new Vector3();
  private readonly volumeOffset = new Vector3();
  private readonly volumeInverseRotation = new Quaternion();
  private readonly fogLocalCameraPosition = new Vector3();
  private readonly domElement: HTMLCanvasElement;
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly moonLight = new DirectionalLight();
  private readonly localLightGroup = new Group();
  private readonly brushGroup = new Group();
  private readonly modelGroup = new Group();
  private readonly firstPersonController =
    new FirstPersonNavigationController();
  private readonly thirdPersonController =
    new ThirdPersonNavigationController();
  private readonly interactionSystem = new RuntimeInteractionSystem();
  private readonly audioSystem = new RuntimeAudioSystem(
    this.scene,
    this.camera,
    null
  );
  private readonly underwaterSceneFog = new FogExp2("#2c6f8d", 0.03);
  private readonly waterReflectionCamera = new PerspectiveCamera();
  private readonly brushMeshes = new Map<
    string,
    Mesh<BufferGeometry, Material[]>
  >();
  private volumeTime = 0;
  private readonly volumeAnimatedUniforms: Array<{ value: number }> = [];
  private readonly runtimeWaterContactUniforms: RuntimeWaterContactUniformBinding[] =
    [];
  private readonly localLightObjects = new Map<
    string,
    LocalLightRenderObjects
  >();
  private readonly modelRenderObjects = new Map<string, Group>();
  private readonly materialTextureCache = new Map<
    string,
    CachedMaterialTexture
  >();
  private readonly materialTextureLoader = new TextureLoader();
  private readonly animationMixers = new Map<string, AnimationMixer>();
  private readonly instanceAnimationClips = new Map<string, AnimationClip[]>();
  private readonly controllerContext: RuntimeControllerContext;
  private readonly renderer: WebGLRenderer | null;
  private runtimeScene: RuntimeSceneDefinition | null = null;
  private collisionWorld: RapierCollisionWorld | null = null;
  private collisionWorldRequestId = 0;
  private desiredNavigationMode: RuntimeNavigationMode = "thirdPerson";
  private sceneReady = false;
  private currentWorld: RuntimeSceneDefinition["world"] | null = null;
  private currentAdvancedRenderingSettings: AdvancedRenderingSettings | null =
    null;
  private advancedRenderingComposer: EffectComposer | null = null;
  private projectAssets: Record<string, ProjectAssetRecord> = {};
  private loadedModelAssets: Record<string, LoadedModelAsset> = {};
  private loadedImageAssets: Record<string, LoadedImageAsset> = {};
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private previousFrameTime = 0;
  private container: HTMLElement | null = null;
  private activeController: NavigationController | null = null;
  private runtimeMessageHandler: ((message: string | null) => void) | null =
    null;
  private playerControllerTelemetryHandler:
    | ((telemetry: PlayerControllerTelemetry | null) => void)
    | null = null;
  private interactionPromptHandler:
    | ((prompt: RuntimeInteractionPrompt | null) => void)
    | null = null;
  private runtimeDialogueHandler:
    | ((dialogue: RuntimeDialogueState | null) => void)
    | null = null;
  private runtimePauseStateHandler:
    | ((state: RuntimePauseState) => void)
    | null = null;
  private sceneLoadStateHandler:
    | ((state: RuntimeSceneLoadState) => void)
    | null = null;
  private sceneTransitionHandler:
    | ((request: RuntimeSceneTransitionRequest) => void)
    | null = null;
  private currentRuntimeMessage: string | null = null;
  private currentPlayerControllerTelemetry: PlayerControllerTelemetry | null =
    null;
  private currentInteractionPrompt: RuntimeInteractionPrompt | null = null;
  private currentDialogue: RuntimeDialogueState | null = null;
  private currentPauseState: RuntimePauseState = {
    paused: false,
    source: null
  };
  private currentSceneLoadState: RuntimeSceneLoadState | null = null;
  private currentClockState: RuntimeClockState | null = null;
  private lastPublishedClockState: RuntimeClockState | null = null;
  private currentPlayerAudioHooks: RuntimePlayerAudioHookState | null = null;
  private runtimeClockStateHandler:
    | ((state: RuntimeClockState) => void)
    | null = null;
  private clockPublishAccumulator = 0;
  private cameraEffectVerticalOffset = 0;
  private cameraEffectVerticalVelocity = 0;
  private cameraEffectPitchOffset = 0;
  private cameraEffectPitchVelocity = 0;
  private cameraEffectRollOffset = 0;
  private baseCameraFov = 70;
  private manualPauseActive = false;
  private controlPauseActive = false;
  private previousPauseInputActive = false;
  private readonly pressedKeys = new Set<string>();
  private activeScheduledImpulseRoutineIds = new Set<string>();
  private completedScheduledImpulseRoutineIds = new Set<string>();

  constructor(options: { enableRendering?: boolean } = {}) {
    const enableRendering = options.enableRendering ?? true;

    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.moonLight);
    this.scene.add(this.localLightGroup);
    this.scene.add(this.brushGroup);
    this.scene.add(this.modelGroup);
    this.underwaterSceneFog.density = 0;
    this.scene.fog = this.underwaterSceneFog;
    this.renderer = enableRendering
      ? new WebGLRenderer({ antialias: false, alpha: true })
      : null;
    this.domElement =
      this.renderer?.domElement ?? document.createElement("canvas");

    if (this.renderer !== null) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearAlpha(0);
    } else {
      this.domElement.className = "runner-canvas__surface";
    }

    this.moonLight.intensity = 0;
    this.moonLight.visible = false;

    this.controllerContext = {
      camera: this.camera,
      domElement: this.domElement,
      getRuntimeScene: () => {
        if (this.runtimeScene === null) {
          throw new Error("Runtime scene has not been loaded.");
        }

        return this.runtimeScene;
      },
      resolveFirstPersonMotion: (feetPosition, motion, shape) =>
        this.collisionWorld?.resolveFirstPersonMotion(
          feetPosition,
          motion,
          shape
        ) ?? null,
      probePlayerGround: (feetPosition, shape, maxDistance) =>
        this.collisionWorld?.probePlayerGround(
          feetPosition,
          shape,
          maxDistance
        ) ?? {
          grounded: false,
          distance: null,
          normal: null,
          slopeDegrees: null
        },
      canOccupyPlayerShape: (feetPosition, shape) =>
        this.collisionWorld?.canOccupyPlayerShape(feetPosition, shape) ?? true,
      resolvePlayerVolumeState: (feetPosition) =>
        this.resolvePlayerVolumeState(feetPosition),
      resolveThirdPersonCameraCollision: (
        pivot,
        desiredCameraPosition,
        radius
      ) =>
        this.collisionWorld?.resolveThirdPersonCameraCollision(
          pivot,
          desiredCameraPosition,
          radius
        ) ?? { ...desiredCameraPosition },
      isInputSuspended: () => this.isRuntimePaused(),
      setRuntimeMessage: (message) => {
        if (message === this.currentRuntimeMessage) {
          return;
        }

        this.currentRuntimeMessage = message;
        this.runtimeMessageHandler?.(message);
      },
      setPlayerControllerTelemetry: (telemetry) => {
        this.currentPlayerControllerTelemetry = telemetry;
        this.currentPlayerAudioHooks = telemetry?.hooks.audio ?? null;
        this.playerControllerTelemetryHandler?.(telemetry);
      }
    };
  }

  private resolvePlayerVolumeState(feetPosition: {
    x: number;
    y: number;
    z: number;
  }): RuntimePlayerVolumeState {
    if (this.runtimeScene === null) {
      return {
        inWater: false,
        inFog: false,
        waterSurfaceHeight: null
      };
    }

    const waterContact = resolveWaterContact(
      feetPosition,
      this.runtimeScene.volumes.water
    );
    const inFog = this.runtimeScene.volumes.fog.some((volume) =>
      this.isPointInsideOrientedVolume(feetPosition, volume)
    );

    return {
      inWater: waterContact !== null,
      inFog,
      waterSurfaceHeight: waterContact?.surfaceHeight ?? null
    };
  }

  private isPointInsideOrientedVolume(
    point: { x: number; y: number; z: number },
    volume: {
      center: { x: number; y: number; z: number };
      rotationDegrees: { x: number; y: number; z: number };
      size: { x: number; y: number; z: number };
    }
  ): boolean {
    this.volumeOffset.set(
      point.x - volume.center.x,
      point.y - volume.center.y,
      point.z - volume.center.z
    );

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
    this.domElement.addEventListener(
      "pointerdown",
      this.handleRuntimePointerDown
    );
    window.addEventListener("keydown", this.handleRuntimeKeyDown);
    window.addEventListener("keyup", this.handleRuntimeKeyUp);
    window.addEventListener("blur", this.handleRuntimeBlur);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);

    this.previousFrameTime = performance.now();
    this.render();
  }

  loadScene(runtimeScene: RuntimeSceneDefinition) {
    const requestId = ++this.collisionWorldRequestId;
    const preservePointerLockDuringLoad =
      this.activeController === this.firstPersonController &&
      this.desiredNavigationMode === "firstPerson" &&
      document.pointerLockElement === this.domElement;

    this.sceneReady = false;
    this.runtimeScene = runtimeScene;
    this.currentWorld = runtimeScene.world;
    this.activeScheduledImpulseRoutineIds.clear();
    this.syncRuntimeClockState(runtimeScene.time);
    this.syncRuntimeScheduleToCurrentClock();
    this.activeController?.deactivate(this.controllerContext, {
      releasePointerLock: !preservePointerLockDuringLoad
    });
    this.activeController = null;
    this.firstPersonController.resetSceneState();
    this.thirdPersonController.resetSceneState();
    this.interactionSystem.reset();
    this.setInteractionPrompt(null);
    this.setRuntimeDialogue(null);
    this.manualPauseActive = false;
    this.controlPauseActive = false;
    this.previousPauseInputActive = false;
    this.pressedKeys.clear();
    this.publishRuntimePauseState(true);
    this.currentPlayerControllerTelemetry = null;
    this.currentPlayerAudioHooks = null;
    this.playerControllerTelemetryHandler?.(null);
    this.currentRuntimeMessage = null;
    this.runtimeMessageHandler?.(null);
    this.resetPlayerCameraEffects();
    this.clearCollisionWorld();
    this.publishSceneLoadState({
      status: "loading",
      message: null
    });
    this.syncResolvedControlStateToRuntime(runtimeScene.control.resolved);
    this.applyWorld();
    this.rebuildLocalLights(runtimeScene.localLights);
    this.rebuildBrushMeshes(runtimeScene.brushes);
    this.rebuildModelRenderObjects(
      runtimeScene.modelInstances,
      runtimeScene.npcDefinitions
    );
    this.audioSystem.loadScene(runtimeScene);
    void this.finalizeSceneLoad(
      requestId,
      runtimeScene.colliders,
      runtimeScene.playerCollider,
      runtimeScene.playerMovement
    );
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
      this.rebuildModelRenderObjects(
        this.runtimeScene.modelInstances,
        this.runtimeScene.npcDefinitions
      );
    }

    this.audioSystem.updateAssets(projectAssets, loadedAudioAssets);
  }

  setNavigationMode(mode: RuntimeNavigationMode) {
    this.desiredNavigationMode = mode;

    if (this.runtimeScene === null || !this.sceneReady) {
      return;
    }

    this.activateDesiredNavigationController();
  }

  setRuntimeMessageHandler(handler: ((message: string | null) => void) | null) {
    this.runtimeMessageHandler = handler;
    this.audioSystem.setRuntimeMessageHandler(handler);
  }

  setPlayerControllerTelemetryHandler(
    handler: ((telemetry: PlayerControllerTelemetry | null) => void) | null
  ) {
    this.playerControllerTelemetryHandler = handler;
  }

  setFirstPersonTelemetryHandler(
    handler: ((telemetry: PlayerControllerTelemetry | null) => void) | null
  ) {
    this.setPlayerControllerTelemetryHandler(handler);
  }

  setInteractionPromptHandler(
    handler: ((prompt: RuntimeInteractionPrompt | null) => void) | null
  ) {
    this.interactionPromptHandler = handler;
  }

  setRuntimeDialogueHandler(
    handler: ((dialogue: RuntimeDialogueState | null) => void) | null
  ) {
    this.runtimeDialogueHandler = handler;

    if (handler !== null && this.currentDialogue !== null) {
      handler(this.currentDialogue);
    }
  }

  setRuntimePauseStateHandler(
    handler: ((state: RuntimePauseState) => void) | null
  ) {
    this.runtimePauseStateHandler = handler;

    if (handler !== null) {
      handler({ ...this.currentPauseState });
    }
  }

  setManualPause(paused: boolean) {
    this.setManualPauseActive(paused);
  }

  toggleManualPause() {
    this.setManualPauseActive(!this.manualPauseActive);
  }

  advanceRuntimeDialogue() {
    if (this.runtimeScene === null || this.currentDialogue === null) {
      return;
    }

    const npc =
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === this.currentDialogue?.npcEntityId
      ) ?? null;
    const dialogue =
      npc?.dialogues.find(
        (candidate) => candidate.id === this.currentDialogue?.dialogueId
      ) ?? null;

    if (dialogue === null) {
      this.setRuntimeDialogue(null);
      return;
    }

    const nextLineIndex = this.currentDialogue.lineIndex + 1;

    if (nextLineIndex >= dialogue.lines.length) {
      this.setRuntimeDialogue(null);
      return;
    }

    this.setRuntimeDialogue(
      this.createRuntimeNpcDialogueState(
        this.currentDialogue.npcEntityId,
        dialogue.id,
        nextLineIndex,
        this.currentDialogue.source
      )
    );
  }

  closeRuntimeDialogue() {
    this.setRuntimeDialogue(null);
  }

  setSceneLoadStateHandler(
    handler: ((state: RuntimeSceneLoadState) => void) | null
  ) {
    this.sceneLoadStateHandler = handler;

    if (handler !== null && this.currentSceneLoadState !== null) {
      handler(this.currentSceneLoadState);
    }
  }

  setRuntimeClockStateHandler(
    handler: ((state: RuntimeClockState) => void) | null
  ) {
    this.runtimeClockStateHandler = handler;

    if (handler !== null && this.currentClockState !== null) {
      handler(cloneRuntimeClockState(this.currentClockState));
    }
  }

  setSceneTransitionHandler(
    handler: ((request: RuntimeSceneTransitionRequest) => void) | null
  ) {
    this.sceneTransitionHandler = handler;
  }

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.activeController?.deactivate(this.controllerContext);
    this.activeController = null;
    this.resetPlayerCameraEffects();
    this.setInteractionPrompt(null);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.clearLocalLights();
    this.clearBrushMeshes();
    this.clearModelRenderObjects();
    this.collisionWorldRequestId += 1;
    this.clearCollisionWorld();
    this.audioSystem.dispose();
    this.advancedRenderingComposer?.dispose();
    this.advancedRenderingComposer = null;
    this.currentAdvancedRenderingSettings = null;
    this.scene.fog = null;
    this.currentClockState = null;
    this.lastPublishedClockState = null;
    this.activeScheduledImpulseRoutineIds.clear();
    this.completedScheduledImpulseRoutineIds.clear();
    this.manualPauseActive = false;
    this.controlPauseActive = false;
    this.previousPauseInputActive = false;
    this.pressedKeys.clear();
    this.publishRuntimePauseState(true);
    if (this.renderer !== null) {
      this.renderer.autoClear = true;
    }

    for (const cachedTexture of this.materialTextureCache.values()) {
      disposeStarterMaterialTextureSet(cachedTexture.textureSet);
    }

    this.materialTextureCache.clear();
    this.worldBackgroundRenderer.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
    this.domElement.removeEventListener("click", this.handleRuntimeClick);
    this.domElement.removeEventListener(
      "pointerdown",
      this.handleRuntimePointerDown
    );
    window.removeEventListener("keydown", this.handleRuntimeKeyDown);
    window.removeEventListener("keyup", this.handleRuntimeKeyUp);
    window.removeEventListener("blur", this.handleRuntimeBlur);
    this.pressedKeys.clear();

    if (this.container !== null && this.container.contains(this.domElement)) {
      this.container.removeChild(this.domElement);
    }

    this.container = null;
  }

  private publishSceneLoadState(state: RuntimeSceneLoadState) {
    if (
      this.currentSceneLoadState?.status === state.status &&
      this.currentSceneLoadState.message === state.message
    ) {
      return;
    }

    this.currentSceneLoadState = state;
    this.sceneLoadStateHandler?.(state);
  }

  private syncRuntimeClockState(timeSettings: RuntimeSceneDefinition["time"]) {
    this.currentClockState =
      this.currentClockState === null
        ? createRuntimeClockState(timeSettings)
        : reconfigureRuntimeClockState(this.currentClockState, timeSettings);
    this.clockPublishAccumulator = 0;
    this.publishRuntimeClockState(true);
  }

  private publishRuntimeClockState(force = false) {
    if (this.currentClockState === null) {
      return;
    }

    const nextState = cloneRuntimeClockState(this.currentClockState);

    if (
      !force &&
      this.lastPublishedClockState !== null &&
      areRuntimeClockStatesEqual(this.lastPublishedClockState, nextState)
    ) {
      return;
    }

    this.lastPublishedClockState = nextState;
    this.runtimeClockStateHandler?.(cloneRuntimeClockState(nextState));
  }

  private isRuntimePaused(): boolean {
    return this.manualPauseActive || this.controlPauseActive;
  }

  private publishRuntimePauseState(force = false) {
    const nextState: RuntimePauseState = {
      paused: this.isRuntimePaused(),
      source: this.manualPauseActive
        ? this.controlPauseActive
          ? "mixed"
          : "manual"
        : this.controlPauseActive
          ? "control"
          : null
    };

    if (
      !force &&
      this.currentPauseState.paused === nextState.paused &&
      this.currentPauseState.source === nextState.source
    ) {
      return;
    }

    this.currentPauseState = nextState;

    if (nextState.paused) {
      this.setInteractionPrompt(null);
    }

    this.runtimePauseStateHandler?.({ ...nextState });
  }

  private setManualPauseActive(paused: boolean) {
    if (this.manualPauseActive === paused) {
      return;
    }

    this.manualPauseActive = paused;
    this.publishRuntimePauseState();
  }

  private setControlPauseActive(paused: boolean) {
    if (this.controlPauseActive === paused) {
      return;
    }

    this.controlPauseActive = paused;
    this.publishRuntimePauseState();
  }

  private activateDesiredNavigationController() {
    if (this.runtimeScene === null || !this.sceneReady) {
      return;
    }

    const nextController =
      this.desiredNavigationMode === "firstPerson"
        ? this.firstPersonController
        : this.thirdPersonController;

    if (this.activeController?.id === nextController.id) {
      return;
    }

    this.activeController?.deactivate(this.controllerContext);
    this.interactionSystem.reset();
    this.setInteractionPrompt(null);
    this.activeController = nextController;
    this.activeController.activate(this.controllerContext);
  }

  private async finalizeSceneLoad(
    requestId: number,
    colliders: RuntimeSceneDefinition["colliders"],
    playerShape: RuntimeSceneDefinition["playerCollider"],
    playerMovement: RuntimeSceneDefinition["playerMovement"]
  ) {
    try {
      const nextCollisionWorld = await this.buildCollisionWorld(
        requestId,
        colliders,
        playerShape,
        playerMovement
      );

      if (requestId !== this.collisionWorldRequestId) {
        nextCollisionWorld.dispose();
        return;
      }

      this.collisionWorld = nextCollisionWorld;
      this.sceneReady = true;
      this.publishSceneLoadState({
        status: "ready",
        message: null
      });
      this.activateDesiredNavigationController();
    } catch (error) {
      if (requestId !== this.collisionWorldRequestId) {
        return;
      }

      const detail =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "Unknown error.";
      const message = `Runner scene failed to load: ${detail}`;
      this.sceneReady = false;
      this.currentRuntimeMessage = message;
      this.runtimeMessageHandler?.(message);
      this.publishSceneLoadState({
        status: "error",
        message
      });
    }
  }

  private applyWorld() {
    if (this.currentWorld === null) {
      return;
    }

    const world = this.currentWorld;

    this.scene.background = null;
    this.scene.environment = null;
    this.scene.environmentIntensity = 1;

    this.applyDayNightLighting();

    if (this.renderer !== null) {
      configureAdvancedRenderingRenderer(
        this.renderer,
        world.advancedRendering
      );
      this.syncAdvancedRenderingComposer(world.advancedRendering);
    }

    this.applyShadowState();
  }

  private applyDayNightLighting() {
    if (this.currentWorld === null || this.runtimeScene === null) {
      return;
    }

    const resolvedTime =
      this.currentClockState === null
        ? null
        : resolveRuntimeTimeState(
            this.runtimeScene.time,
            this.currentClockState
          );

    const resolvedWorld = resolveRuntimeDayNightWorldState(
      this.currentWorld,
      this.runtimeScene.time,
      this.currentClockState,
      resolvedTime
    );
    const backgroundTexture =
      resolvedWorld.background.mode === "image"
        ? (this.loadedImageAssets[resolvedWorld.background.assetId]?.texture ??
          null)
        : null;
    const nightBackgroundOverlay = resolvedWorld.nightBackgroundOverlay;
    const backgroundOverlayState =
      nightBackgroundOverlay === null
        ? null
        : {
            texture:
              this.loadedImageAssets[nightBackgroundOverlay.assetId]?.texture ??
              null,
            opacity: nightBackgroundOverlay.opacity,
            environmentIntensity: nightBackgroundOverlay.environmentIntensity
          };
    const environmentState = resolveWorldEnvironmentState(
      resolvedWorld.background,
      backgroundTexture,
      backgroundOverlayState
    );

    this.worldBackgroundRenderer.update(
      resolvedWorld.background,
      backgroundTexture,
      backgroundOverlayState
    );
    this.scene.background = null;
    this.scene.environment = environmentState.texture;
    this.scene.environmentIntensity = environmentState.intensity;

    this.ambientLight.color.set(resolvedWorld.ambientLight.colorHex);
    this.ambientLight.intensity = resolvedWorld.ambientLight.intensity;
    this.sunLight.color.set(resolvedWorld.sunLight.colorHex);
    this.sunLight.intensity = resolvedWorld.sunLight.intensity;
    this.sunLight.position
      .set(
        resolvedWorld.sunLight.direction.x,
        resolvedWorld.sunLight.direction.y,
        resolvedWorld.sunLight.direction.z
      )
      .normalize()
      .multiplyScalar(18);

    if (resolvedWorld.moonLight === null) {
      this.moonLight.visible = false;
      this.moonLight.intensity = 0;
      return;
    }

    this.moonLight.visible = resolvedWorld.moonLight.intensity > 1e-4;
    this.moonLight.color.set(resolvedWorld.moonLight.colorHex);
    this.moonLight.intensity = resolvedWorld.moonLight.intensity;
    this.moonLight.position
      .set(
        resolvedWorld.moonLight.direction.x,
        resolvedWorld.moonLight.direction.y,
        resolvedWorld.moonLight.direction.z
      )
      .normalize()
      .multiplyScalar(16);
  }

  private async buildCollisionWorld(
    requestId: number,
    colliders: RuntimeSceneDefinition["colliders"],
    playerShape: RuntimeSceneDefinition["playerCollider"],
    playerMovement: RuntimeSceneDefinition["playerMovement"]
  ) {
    const nextCollisionWorld = await RapierCollisionWorld.create(
      colliders,
      playerShape,
      {
        maxStepHeight: playerMovement.maxStepHeight
      }
    );

    if (requestId !== this.collisionWorldRequestId) {
      nextCollisionWorld.dispose();
      throw new Error("Scene load was superseded by a newer request.");
    }

    return nextCollisionWorld;
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
      !areAdvancedRenderingSettingsEqual(
        this.currentAdvancedRenderingSettings,
        settings
      );

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

    this.advancedRenderingComposer = createAdvancedRenderingComposer(
      this.renderer,
      this.scene,
      this.camera,
      settings,
      this.worldBackgroundRenderer.scene
    );
    this.currentAdvancedRenderingSettings =
      cloneAdvancedRenderingSettings(settings);
    this.renderer.autoClear = false;
  }

  private applyShadowState() {
    if (this.currentWorld === null) {
      return;
    }

    const advancedRendering = this.currentWorld.advancedRendering;
    const shadowsEnabled =
      advancedRendering.enabled && advancedRendering.shadows.enabled;

    applyAdvancedRenderingLightShadowFlags(this.sunLight, advancedRendering);
    this.moonLight.castShadow = false;
    this.moonLight.shadow.autoUpdate = false;

    for (const renderObjects of this.localLightObjects.values()) {
      applyAdvancedRenderingLightShadowFlags(
        renderObjects.group,
        advancedRendering
      );
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
      this.localLightObjects.set(pointLight.entityId, renderObjects);
    }

    for (const spotLight of localLights.spotLights) {
      const renderObjects = this.createSpotLightRuntimeObjects(spotLight);
      this.localLightGroup.add(renderObjects.group);
      this.localLightObjects.set(spotLight.entityId, renderObjects);
    }

    this.applyShadowState();
  }

  private createPointLightRuntimeObjects(
    pointLight: RuntimeLocalLightCollection["pointLights"][number]
  ): LocalLightRenderObjects {
    const group = new Group();
    const light = new PointLight(
      pointLight.colorHex,
      pointLight.intensity,
      pointLight.distance
    );

    group.position.set(
      pointLight.position.x,
      pointLight.position.y,
      pointLight.position.z
    );
    group.visible = pointLight.enabled;
    light.position.set(0, 0, 0);
    group.add(light);

    return {
      group,
      light
    };
  }

  private createSpotLightRuntimeObjects(
    spotLight: RuntimeLocalLightCollection["spotLights"][number]
  ): LocalLightRenderObjects {
    const group = new Group();
    const light = new SpotLight(
      spotLight.colorHex,
      spotLight.intensity,
      spotLight.distance,
      (spotLight.angleDegrees * Math.PI) / 180,
      0.18,
      1
    );
    const direction = new Vector3(
      spotLight.direction.x,
      spotLight.direction.y,
      spotLight.direction.z
    ).normalize();
    const orientation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction
    );

    group.position.set(
      spotLight.position.x,
      spotLight.position.y,
      spotLight.position.z
    );
    group.quaternion.copy(orientation);
    group.visible = spotLight.enabled;
    light.position.set(0, 0, 0);
    light.target.position.set(0, 1, 0);
    group.add(light);
    group.add(light.target);

    return {
      group,
      light
    };
  }

  private syncResolvedControlStateToRuntime(
    resolved: RuntimeSceneDefinition["control"]["resolved"]
  ) {
    for (const state of resolved.discrete) {
      this.applyResolvedDiscreteControlState(state);
    }

    for (const channelValue of resolved.channels) {
      this.applyResolvedControlChannelValue(channelValue);
    }
  }

  private applyResolvedDiscreteControlState(
    state: RuntimeResolvedDiscreteControlState
  ) {
    switch (state.type) {
      case "projectTimePaused":
        this.applyProjectTimePausedControl(state.value);
        return;
      case "actorPresence":
        this.applyActorPresenceControl(state.target.actorId, state.value);
        return;
      case "actorAnimationPlayback":
        this.applyActorAnimationPlaybackControl(
          state.target,
          state.clipName,
          state.loop
        );
        return;
      case "actorPathAssignment":
        return;
      case "modelVisibility":
        this.applyModelInstanceVisibilityControl(state.target, state.value);
        return;
      case "soundPlayback":
        this.applySoundPlaybackControl(state.target, state.value);
        return;
      case "modelAnimationPlayback":
        this.applyModelAnimationPlaybackControl(
          state.target,
          state.clipName,
          state.loop
        );
        return;
      case "lightEnabled":
        this.applyLightEnabledControl(state.target, state.value);
        return;
      case "lightColor":
        this.applyLightColorControl(state.target, state.value);
        return;
      case "interactionEnabled":
        this.applyInteractionEnabledControl(state.target, state.value);
        return;
      case "ambientLightColor":
        this.applyAmbientLightColorControl(state.target, state.value);
        return;
      case "sunLightColor":
        this.applySunLightColorControl(state.target, state.value);
        return;
    }
  }

  private applyResolvedControlChannelValue(
    channelValue: RuntimeResolvedControlChannelValue
  ) {
    switch (channelValue.type) {
      case "lightIntensity":
        this.applyLightIntensityControl(
          channelValue.descriptor.target,
          channelValue.value
        );
        return;
      case "soundVolume":
        this.applySoundVolumeControl(
          channelValue.descriptor.target,
          channelValue.value
        );
        return;
      case "ambientLightIntensity":
        this.applyAmbientLightIntensityControl(
          channelValue.descriptor.target,
          channelValue.value
        );
        return;
      case "sunLightIntensity":
        this.applySunLightIntensityControl(
          channelValue.descriptor.target,
          channelValue.value
        );
        return;
    }
  }

  private mutateRuntimeLightState(
    target: LightControlTargetRef,
    mutate: (
      light:
        | RuntimeSceneDefinition["localLights"]["pointLights"][number]
        | RuntimeSceneDefinition["localLights"]["spotLights"][number]
    ) => void
  ) {
    if (this.runtimeScene === null) {
      return;
    }

    const lights =
      target.entityKind === "pointLight"
        ? this.runtimeScene.localLights.pointLights
        : this.runtimeScene.localLights.spotLights;
    const light = lights.find((candidate) => candidate.entityId === target.entityId);

    if (light !== undefined) {
      mutate(light);
    }
  }

  private applyLightEnabledControl(
    target: LightControlTargetRef,
    enabled: boolean
  ) {
    this.mutateRuntimeLightState(target, (light) => {
      light.enabled = enabled;
    });

    const renderObjects = this.localLightObjects.get(target.entityId);

    if (renderObjects === undefined) {
      return;
    }

    renderObjects.group.visible = enabled;
  }

  private applyLightIntensityControl(
    target: LightControlTargetRef,
    intensity: number
  ) {
    this.mutateRuntimeLightState(target, (light) => {
      light.intensity = intensity;
    });

    const renderObjects = this.localLightObjects.get(target.entityId);

    if (renderObjects === undefined) {
      return;
    }

    renderObjects.light.intensity = intensity;
  }

  private applyLightColorControl(target: LightControlTargetRef, colorHex: string) {
    this.mutateRuntimeLightState(target, (light) => {
      light.colorHex = colorHex;
    });

    const renderObjects = this.localLightObjects.get(target.entityId);

    if (renderObjects === undefined) {
      return;
    }

    renderObjects.light.color.set(colorHex);
  }

  private applyAmbientLightIntensityControl(
    _target: SceneControlTargetRef,
    intensity: number
  ) {
    if (this.runtimeScene === null || this.currentWorld === null) {
      return;
    }

    if (
      this.runtimeScene.world.ambientLight.intensity === intensity &&
      this.currentWorld.ambientLight.intensity === intensity
    ) {
      return;
    }

    this.runtimeScene.world.ambientLight.intensity = intensity;
    this.currentWorld.ambientLight.intensity = intensity;
    this.applyDayNightLighting();
  }

  private applyAmbientLightColorControl(
    _target: SceneControlTargetRef,
    colorHex: string
  ) {
    if (this.runtimeScene === null || this.currentWorld === null) {
      return;
    }

    if (
      this.runtimeScene.world.ambientLight.colorHex === colorHex &&
      this.currentWorld.ambientLight.colorHex === colorHex
    ) {
      return;
    }

    this.runtimeScene.world.ambientLight.colorHex = colorHex;
    this.currentWorld.ambientLight.colorHex = colorHex;
    this.applyDayNightLighting();
  }

  private applySunLightIntensityControl(
    _target: SceneControlTargetRef,
    intensity: number
  ) {
    if (this.runtimeScene === null || this.currentWorld === null) {
      return;
    }

    if (
      this.runtimeScene.world.sunLight.intensity === intensity &&
      this.currentWorld.sunLight.intensity === intensity
    ) {
      return;
    }

    this.runtimeScene.world.sunLight.intensity = intensity;
    this.currentWorld.sunLight.intensity = intensity;
    this.applyDayNightLighting();
  }

  private applySunLightColorControl(
    _target: SceneControlTargetRef,
    colorHex: string
  ) {
    if (this.runtimeScene === null || this.currentWorld === null) {
      return;
    }

    if (
      this.runtimeScene.world.sunLight.colorHex === colorHex &&
      this.currentWorld.sunLight.colorHex === colorHex
    ) {
      return;
    }

    this.runtimeScene.world.sunLight.colorHex = colorHex;
    this.currentWorld.sunLight.colorHex = colorHex;
    this.applyDayNightLighting();
  }

  private applyModelInstanceVisibilityControl(
    target: ModelInstanceControlTargetRef,
    visible: boolean
  ) {
    if (this.runtimeScene !== null) {
      const modelInstance =
        this.runtimeScene.modelInstances.find(
          (candidate) => candidate.instanceId === target.modelInstanceId
        ) ?? null;

      if (modelInstance !== null) {
        modelInstance.visible = visible;
      }
    }

    const renderGroup = this.modelRenderObjects.get(target.modelInstanceId);

    if (renderGroup !== undefined) {
      renderGroup.visible = visible;
    }
  }

  private applyModelAnimationPlaybackControl(
    target: ModelInstanceControlTargetRef,
    clipName: string | null,
    loop: boolean | undefined
  ) {
    let stateChanged = true;

    if (this.runtimeScene !== null) {
      const modelInstance =
        this.runtimeScene.modelInstances.find(
          (candidate) => candidate.instanceId === target.modelInstanceId
        ) ?? null;

      if (modelInstance !== null) {
        const nextClipName = clipName ?? undefined;
        const nextAutoplay = clipName !== null;
        const nextLoop = clipName === null ? undefined : loop;

        stateChanged =
          modelInstance.animationClipName !== nextClipName ||
          modelInstance.animationAutoplay !== nextAutoplay ||
          modelInstance.animationLoop !== nextLoop;
        modelInstance.animationClipName = nextClipName;
        modelInstance.animationAutoplay = nextAutoplay;
        modelInstance.animationLoop = nextLoop;
      }
    }

    if (!stateChanged) {
      return;
    }

    if (!this.animationMixers.has(target.modelInstanceId)) {
      return;
    }

    if (clipName === null) {
      this.applyStopAnimationAction(target.modelInstanceId);
      return;
    }

    this.applyPlayAnimationAction(target.modelInstanceId, clipName, loop);
  }

  private applySoundPlaybackControl(
    target: SoundEmitterControlTargetRef,
    playing: boolean,
    link: InteractionLink | null = null
  ) {
    let stateChanged = true;

    if (this.runtimeScene !== null) {
      const soundEmitter =
        this.runtimeScene.entities.soundEmitters.find(
          (candidate) => candidate.entityId === target.entityId
        ) ?? null;

      if (soundEmitter !== null) {
        stateChanged = soundEmitter.autoplay !== playing;
        soundEmitter.autoplay = playing;
      }
    }

    if (!stateChanged) {
      return;
    }

    if (!this.audioSystem.hasSoundEmitter(target.entityId)) {
      return;
    }

    if (playing) {
      this.audioSystem.playSound(target.entityId, link);
    } else {
      this.audioSystem.stopSound(target.entityId);
    }
  }

  private applyActorAnimationPlaybackControl(
    target: ActorControlTargetRef,
    clipName: string | null,
    loop: boolean | undefined
  ) {
    if (this.runtimeScene !== null) {
      for (const npc of this.runtimeScene.npcDefinitions) {
        if (npc.actorId !== target.actorId) {
          continue;
        }

        const nextClipName = clipName;

        if (
          npc.animationClipName === nextClipName &&
          npc.animationLoop === loop
        ) {
          continue;
        }

        npc.animationClipName = nextClipName;
        npc.animationLoop = loop;
      }
    }

    const npcIds =
      this.runtimeScene?.npcDefinitions
        .filter((npc) => npc.actorId === target.actorId)
        .map((npc) => npc.entityId) ?? [];

    for (const npcId of npcIds) {
      if (!this.animationMixers.has(npcId)) {
        continue;
      }

      if (clipName === null) {
        this.applyStopAnimationAction(npcId);
      } else {
        this.applyPlayAnimationAction(npcId, clipName, loop);
      }
    }
  }

  private applySoundVolumeControl(
    target: SoundEmitterControlTargetRef,
    volume: number
  ) {
    let stateChanged = true;

    if (this.runtimeScene !== null) {
      const soundEmitter =
        this.runtimeScene.entities.soundEmitters.find(
          (candidate) => candidate.entityId === target.entityId
        ) ?? null;

      if (soundEmitter !== null) {
        stateChanged = soundEmitter.volume !== volume;
        soundEmitter.volume = volume;
      }
    }

    if (!stateChanged) {
      return;
    }

    this.audioSystem.setSoundEmitterVolume(target.entityId, volume);
  }

  private applyInteractionEnabledControl(
    target: InteractionControlTargetRef,
    enabled: boolean
  ) {
    if (this.runtimeScene === null) {
      return;
    }

    const interactable =
      this.runtimeScene.entities.interactables.find(
        (candidate) => candidate.entityId === target.entityId
      ) ?? null;

    if (interactable !== null) {
      interactable.interactionEnabled = enabled;
    }
  }

  private applyActorPresenceControl(actorId: string, active: boolean) {
    if (this.runtimeScene === null) {
      return;
    }

    let changed = false;

    for (const npc of this.runtimeScene.npcDefinitions) {
      if (npc.actorId !== actorId || npc.active === active) {
        continue;
      }

      npc.active = active;
      npc.activeRoutineId = null;
      npc.activeRoutineTitle = null;
      changed = true;
      const renderGroup = this.modelRenderObjects.get(npc.entityId);

      if (renderGroup !== undefined) {
        renderGroup.visible = npc.visible && npc.active;
      }
    }

    if (!changed) {
      return;
    }

    this.refreshRuntimeNpcCollections();
    this.refreshCollisionWorldForNpcSchedule();
  }

  private applyProjectTimePausedControl(paused: boolean) {
    this.setControlPauseActive(paused);
  }

  private applyControlEffect(
    effect: ControlEffect,
    link: InteractionLink | null = null
  ) {
    switch (effect.type) {
      case "setProjectTimePaused":
        this.applyProjectTimePausedControl(effect.paused);
        break;
      case "setActorPresence":
        this.applyActorPresenceControl(effect.target.actorId, effect.active);
        break;
      case "playActorAnimation":
        this.applyActorAnimationPlaybackControl(
          effect.target,
          effect.clipName,
          effect.loop
        );
        break;
      case "followActorPath":
        console.warn(
          "followActorPath is scheduler-owned in this slice and is ignored when dispatched directly."
        );
        break;
      case "playModelAnimation":
        this.applyModelAnimationPlaybackControl(
          effect.target,
          effect.clipName,
          effect.loop
        );
        break;
      case "stopModelAnimation":
        this.applyModelAnimationPlaybackControl(effect.target, null, undefined);
        break;
      case "setModelInstanceVisible":
        this.applyModelInstanceVisibilityControl(effect.target, effect.visible);
        break;
      case "playSound":
        this.applySoundPlaybackControl(effect.target, true, link);
        break;
      case "stopSound":
        this.applySoundPlaybackControl(effect.target, false);
        break;
      case "setSoundVolume":
        this.applySoundVolumeControl(effect.target, effect.volume);
        break;
      case "setInteractionEnabled":
        this.applyInteractionEnabledControl(effect.target, effect.enabled);
        break;
      case "setLightEnabled":
        this.applyLightEnabledControl(effect.target, effect.enabled);
        break;
      case "setLightIntensity":
        this.applyLightIntensityControl(effect.target, effect.intensity);
        break;
      case "setLightColor":
        this.applyLightColorControl(effect.target, effect.colorHex);
        break;
      case "setAmbientLightIntensity":
        this.applyAmbientLightIntensityControl(effect.target, effect.intensity);
        break;
      case "setAmbientLightColor":
        this.applyAmbientLightColorControl(effect.target, effect.colorHex);
        break;
      case "setSunLightIntensity":
        this.applySunLightIntensityControl(effect.target, effect.intensity);
        break;
      case "setSunLightColor":
        this.applySunLightColorControl(effect.target, effect.colorHex);
        break;
    }

    if (this.runtimeScene === null) {
      return;
    }

    this.runtimeScene.control.resolved = applyControlEffectToResolvedState(
      this.runtimeScene.control.resolved,
      effect,
      link === null
        ? createDefaultResolvedControlSource()
        : createInteractionLinkResolvedControlSource(link.id)
    );
  }

  private rebuildBrushMeshes(brushes: RuntimeBoxBrushInstance[]) {
    this.clearBrushMeshes();
    const volumeRenderPaths: ResolvedBoxVolumeRenderPaths =
      this.currentWorld === null
        ? { fog: "performance", water: "performance" }
        : resolveBoxVolumeRenderPaths(this.currentWorld.advancedRendering);

    for (const brush of brushes) {
      const geometryBrush = createRuntimeGeometryBrush(brush);
      const derivedMesh = buildBoxBrushDerivedMeshData(geometryBrush);
      const geometry = derivedMesh.geometry;
      const staticContactPatches =
        brush.volume.mode === "water"
          ? this.collectRuntimeStaticWaterContactPatches(brush)
          : [];
      const contactPatches =
        brush.volume.mode === "water"
          ? this.mergeRuntimeWaterContactPatches(
              brush,
              staticContactPatches,
              this.collectRuntimePlayerWaterContactPatches(brush)
            )
          : [];

      const materials =
        this.createFogMaterialSet(
          brush,
          volumeRenderPaths,
          derivedMesh.faceIdsInOrder
        ) ??
        derivedMesh.faceIdsInOrder.map((faceId) =>
          this.createFaceMaterial(
            brush,
            faceId,
            brush.faces[faceId]?.material ?? null,
            volumeRenderPaths,
            contactPatches,
            staticContactPatches
          )
        );

      const mesh = new Mesh(geometry, materials);
      mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
      mesh.rotation.set(
        (brush.rotationDegrees.x * Math.PI) / 180,
        (brush.rotationDegrees.y * Math.PI) / 180,
        (brush.rotationDegrees.z * Math.PI) / 180
      );
      mesh.visible = brush.visible;
      this.configureFogVolumeMesh(mesh, materials);
      this.brushGroup.add(mesh);
      this.brushMeshes.set(brush.id, mesh);
    }

    this.applyShadowState();
  }

  private createFogMaterialSet(
    brush: RuntimeBoxBrushInstance,
    volumeRenderPaths: {
      fog: "performance" | "quality";
      water: "performance" | "quality";
    },
    faceIds: WhiteboxFaceId[]
  ): Material[] | null {
    if (brush.volume.mode !== "fog") {
      return null;
    }

    if (volumeRenderPaths.fog === "quality") {
      const fogMaterial = createFogQualityMaterial({
        colorHex: brush.volume.fog.colorHex,
        density: brush.volume.fog.density,
        padding: brush.volume.fog.padding,
        time: this.volumeTime,
        halfSize: {
          x: brush.size.x * 0.5,
          y: brush.size.y * 0.5,
          z: brush.size.z * 0.5
        }
      });

      this.volumeAnimatedUniforms.push(fogMaterial.animationUniform);
      return faceIds.map(() => fogMaterial.material);
    }

    const densityOpacity = Math.max(
      0.06,
      Math.min(0.72, brush.volume.fog.density * 0.8 + 0.08)
    );
    const fogMaterial = new MeshBasicMaterial({
      color: brush.volume.fog.colorHex,
      transparent: true,
      opacity: densityOpacity,
      depthWrite: false
    });

    return faceIds.map(() => fogMaterial);
  }

  private configureFogVolumeMesh(
    mesh: Mesh<BufferGeometry, Material[]>,
    materials: Material[]
  ) {
    const fogMaterials = materials.filter(
      (material): material is ShaderMaterial =>
        material instanceof ShaderMaterial &&
        material.uniforms["localCameraPosition"] !== undefined
    );

    if (fogMaterials.length === 0) {
      return;
    }

    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      const localCameraPosition = mesh.worldToLocal(
        this.fogLocalCameraPosition.copy(camera.position)
      );

      for (const material of fogMaterials) {
        (
          material.uniforms["localCameraPosition"] as { value: Vector3 }
        ).value.copy(localCameraPosition);
      }
    };
  }

  private createNpcColliderFallbackRenderGroup(npc: RuntimeNpc): Group {
    const group = new Group();
    const colliderMaterial = new MeshStandardMaterial({
      color: 0xa0df7a,
      emissive: 0xa0df7a,
      emissiveIntensity: 0.05,
      roughness: 0.52,
      metalness: 0.02,
      transparent: true,
      opacity: 0.3
    });
    const facingMaterial = new MeshStandardMaterial({
      color: 0xa0df7a,
      emissive: 0xa0df7a,
      emissiveIntensity: 0.08,
      roughness: 0.42,
      metalness: 0.03
    });

    group.position.set(npc.position.x, npc.position.y, npc.position.z);

    switch (npc.collider.mode) {
      case "capsule": {
        const collisionMesh = new Mesh(
          new CapsuleGeometry(
            npc.collider.radius,
            Math.max(0, npc.collider.height - npc.collider.radius * 2),
            8,
            14
          ),
          colliderMaterial
        );
        collisionMesh.position.y = npc.collider.height * 0.5;
        group.add(collisionMesh);
        break;
      }
      case "box": {
        const collisionMesh = new Mesh(
          new BoxGeometry(
            npc.collider.size.x,
            npc.collider.size.y,
            npc.collider.size.z
          ),
          colliderMaterial
        );
        collisionMesh.position.y = npc.collider.size.y * 0.5;
        group.add(collisionMesh);
        break;
      }
      case "none":
        break;
    }

    const facingGroup = new Group();
    facingGroup.rotation.y = (npc.yawDegrees * Math.PI) / 180;
    group.add(facingGroup);
    const colliderTop =
      getNpcColliderHeight({
        mode: npc.collider.mode,
        eyeHeight: npc.collider.eyeHeight,
        capsuleRadius:
          npc.collider.mode === "capsule" ? npc.collider.radius : 0.35,
        capsuleHeight:
          npc.collider.mode === "capsule" ? npc.collider.height : 1.8,
        boxSize:
          npc.collider.mode === "box"
            ? npc.collider.size
            : {
                x: 0.7,
                y: 1.8,
                z: 0.7
              }
      }) ?? 0.18;

    const body = new Mesh(new BoxGeometry(0.08, 0.08, 0.34), facingMaterial);
    body.position.set(0, colliderTop + 0.12, 0.06);

    const arrowHead = new Mesh(new ConeGeometry(0.1, 0.22, 14), facingMaterial);
    arrowHead.rotation.x = Math.PI * 0.5;
    arrowHead.position.set(0, colliderTop + 0.12, 0.28);

    facingGroup.add(body);
    facingGroup.add(arrowHead);

    return group;
  }

  private rebuildModelRenderObjects(
    modelInstances: RuntimeSceneDefinition["modelInstances"],
    npcs: RuntimeNpcDefinition[]
  ) {
    this.clearModelRenderObjects();

    for (const modelInstance of modelInstances) {
      const asset = this.projectAssets[modelInstance.assetId];
      const loadedAsset = this.loadedModelAssets[modelInstance.assetId];
      const renderGroup = createModelInstanceRenderGroup(
        {
          id: modelInstance.instanceId,
          kind: "modelInstance",
          assetId: modelInstance.assetId,
          name: modelInstance.name,
          visible: modelInstance.visible,
          enabled: true,
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
      renderGroup.visible = modelInstance.visible;
      this.modelGroup.add(renderGroup);
      this.modelRenderObjects.set(modelInstance.instanceId, renderGroup);

      if (loadedAsset?.animations && loadedAsset.animations.length > 0) {
        const mixer = new AnimationMixer(renderGroup);
        this.animationMixers.set(modelInstance.instanceId, mixer);
        this.instanceAnimationClips.set(
          modelInstance.instanceId,
          loadedAsset.animations
        );

        if (
          modelInstance.animationAutoplay === true &&
          modelInstance.animationClipName
        ) {
          const clip = AnimationClip.findByName(
            loadedAsset.animations,
            modelInstance.animationClipName
          );
          if (clip) {
            const action = mixer.clipAction(clip);
            action.loop =
              modelInstance.animationLoop === false ? LoopOnce : LoopRepeat;
            action.clampWhenFinished = modelInstance.animationLoop === false;
            action.reset().play();
          }
        }
      }
    }

    for (const npc of npcs) {
      const asset =
        npc.modelAssetId === null
          ? null
          : (this.projectAssets[npc.modelAssetId] ?? null);
      const loadedAsset =
        npc.modelAssetId === null
          ? undefined
          : this.loadedModelAssets[npc.modelAssetId];
      const renderGroup =
        npc.modelAssetId === null || asset?.kind !== "model"
          ? this.createNpcColliderFallbackRenderGroup(npc)
          : createModelInstanceRenderGroup(
              {
                id: npc.entityId,
                kind: "modelInstance",
                assetId: npc.modelAssetId,
                name: npc.name,
                visible: npc.visible,
                enabled: true,
                position: npc.position,
                rotationDegrees: {
                  x: 0,
                  y: npc.yawDegrees,
                  z: 0
                },
                scale: {
                  x: 1,
                  y: 1,
                  z: 1
                },
                collision: {
                  mode: "none",
                  visible: false
                }
              },
              asset,
              loadedAsset,
              false
            );
      renderGroup.visible = npc.visible && npc.active;
      this.modelGroup.add(renderGroup);
      this.modelRenderObjects.set(npc.entityId, renderGroup);

      if (loadedAsset?.animations && loadedAsset.animations.length > 0) {
        const mixer = new AnimationMixer(renderGroup);
        this.animationMixers.set(npc.entityId, mixer);
        this.instanceAnimationClips.set(npc.entityId, loadedAsset.animations);

        if (npc.animationClipName !== null) {
          const clip = AnimationClip.findByName(
            loadedAsset.animations,
            npc.animationClipName
          );

          if (clip) {
            const action = mixer.clipAction(clip);
            action.loop = npc.animationLoop === false ? LoopOnce : LoopRepeat;
            action.clampWhenFinished = npc.animationLoop === false;
            action.reset().play();
          }
        }
      }
    }

    this.applyShadowState();
  }

  private createFaceMaterial(
    brush: RuntimeBoxBrushInstance,
    faceId: WhiteboxFaceId,
    material: RuntimeBrushFace["material"],
    volumeRenderPaths: {
      fog: "performance" | "quality";
      water: "performance" | "quality";
    },
    contactPatches: ReturnType<typeof collectWaterContactPatches>,
    staticContactPatches: ReturnType<typeof collectWaterContactPatches>
  ): Material {
    if (brush.volume.mode === "water") {
      const baseOpacity = Math.max(
        0.05,
        Math.min(1, brush.volume.water.surfaceOpacity)
      );
      const isTopFace = brush.kind === "box" && faceId === "posY";
      const waterMaterial = createWaterMaterial({
        colorHex: brush.volume.water.colorHex,
        surfaceOpacity: brush.volume.water.surfaceOpacity,
        waveStrength: brush.volume.water.waveStrength,
        surfaceDisplacementEnabled:
          brush.volume.water.surfaceDisplacementEnabled,
        opacity:
          isTopFace
            ? Math.min(1, baseOpacity + 0.18)
            : baseOpacity * 0.5,
        quality: volumeRenderPaths.water === "quality",
        wireframe: false,
        isTopFace,
        time: this.volumeTime,
        halfSize: {
          x: brush.size.x * 0.5,
          z: brush.size.z * 0.5
        },
        contactPatches,
        reflection: {
          texture: null,
          enabled: isTopFace
        }
      });

      if (waterMaterial.animationUniform !== null) {
        this.volumeAnimatedUniforms.push(waterMaterial.animationUniform);
      }

      if (
        isTopFace &&
        waterMaterial.contactPatchesUniform !== null &&
        waterMaterial.contactPatchAxesUniform !== null
      ) {
        this.runtimeWaterContactUniforms.push({
          brush,
          uniform: waterMaterial.contactPatchesUniform,
          axisUniform: waterMaterial.contactPatchAxesUniform,
          shapeUniform: waterMaterial.contactPatchShapesUniform ?? {
            value: []
          },
          staticContactPatches,
          reflectionTextureUniform: waterMaterial.reflectionTextureUniform,
          reflectionMatrixUniform: waterMaterial.reflectionMatrixUniform,
          reflectionEnabledUniform: waterMaterial.reflectionEnabledUniform,
          reflectionRenderTarget:
            this.getWaterReflectionMode() !== "none"
              ? this.createWaterReflectionRenderTarget()
              : null,
          lastReflectionUpdateTime: Number.NEGATIVE_INFINITY
        });
      }

      return waterMaterial.material;
    }

    if (brush.volume.mode === "fog") {
      if (volumeRenderPaths.fog === "quality") {
        const fogMaterial = createFogQualityMaterial({
          colorHex: brush.volume.fog.colorHex,
          density: brush.volume.fog.density,
          padding: brush.volume.fog.padding,
          time: this.volumeTime,
          halfSize: {
            x: brush.size.x * 0.5,
            y: brush.size.y * 0.5,
            z: brush.size.z * 0.5
          }
        });

        this.volumeAnimatedUniforms.push(fogMaterial.animationUniform);
        return fogMaterial.material;
      }
      // Performance fallback: simple transparent material
      const densityOpacity = Math.max(
        0.06,
        Math.min(0.72, brush.volume.fog.density * 0.8 + 0.08)
      );
      return new MeshBasicMaterial({
        color: brush.volume.fog.colorHex,
        transparent: true,
        opacity: densityOpacity,
        depthWrite: false
      });
    }

    if (material === null) {
      const faceMaterial = new MeshStandardMaterial({
        color: FALLBACK_FACE_COLOR,
        roughness: 0.9,
        metalness: 0.05
      });

      if (
        this.currentWorld !== null &&
        shouldApplyWhiteboxBevel(this.currentWorld.advancedRendering)
      ) {
        applyWhiteboxBevelToMaterial(
          faceMaterial,
          this.currentWorld.advancedRendering.whiteboxBevel
        );
      }

      return faceMaterial;
    }

    const textureSet = this.getOrCreateTextureSet(material);
    const faceMaterial = new MeshPhysicalMaterial({
      color: 0xffffff,
      map: textureSet.baseColor,
      normalMap: textureSet.normal,
      roughnessMap: textureSet.roughness,
      roughness: 1,
      metalnessMap: textureSet.metallic,
      metalness: textureSet.metallic === null ? 0.03 : 1,
      specularColorMap: textureSet.specular,
      specularColor: new Color(0xffffff),
      specularIntensity: textureSet.specular === null ? 0.2 : 1
    });

    if (
      this.currentWorld !== null &&
      shouldApplyWhiteboxBevel(this.currentWorld.advancedRendering)
    ) {
      applyWhiteboxBevelToMaterial(
        faceMaterial,
        this.currentWorld.advancedRendering.whiteboxBevel
      );
    }

    return faceMaterial;
  }

  private updateUnderwaterSceneFog() {
    const fogState =
      this.activeController === this.firstPersonController
        ? resolveUnderwaterFogState(
            this.runtimeScene,
            this.currentPlayerControllerTelemetry
          )
        : null;

    if (fogState === null) {
      this.underwaterSceneFog.density = 0;
      return;
    }

    this.underwaterSceneFog.color.set(fogState.colorHex);
    this.underwaterSceneFog.density = fogState.density;
  }

  private resetPlayerCameraEffects() {
    this.cameraEffectVerticalOffset = 0;
    this.cameraEffectVerticalVelocity = 0;
    this.cameraEffectPitchOffset = 0;
    this.cameraEffectPitchVelocity = 0;
    this.cameraEffectRollOffset = 0;

    if (Math.abs(this.camera.fov - this.baseCameraFov) > 1e-4) {
      this.camera.fov = this.baseCameraFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private applyPlayerCameraEffects(dt: number) {
    const telemetry = this.currentPlayerControllerTelemetry;
    const cameraHooks = telemetry?.hooks.camera ?? null;
    const signals = telemetry?.signals ?? null;

    if (signals?.jumpStarted) {
      this.cameraEffectVerticalVelocity += 0.42;
      this.cameraEffectPitchVelocity += 0.045;
    }

    if (signals?.startedFalling) {
      this.cameraEffectVerticalVelocity -= 0.1;
      this.cameraEffectPitchVelocity -= 0.035;
    }

    if (signals?.landed) {
      this.cameraEffectVerticalVelocity -= 0.68;
      this.cameraEffectPitchVelocity -= 0.08;
    }

    if (signals?.headBump) {
      this.cameraEffectVerticalVelocity -= 0.28;
      this.cameraEffectPitchVelocity -= 0.05;
    }

    this.cameraEffectVerticalOffset += this.cameraEffectVerticalVelocity * dt;
    this.cameraEffectPitchOffset += this.cameraEffectPitchVelocity * dt;
    this.cameraEffectVerticalVelocity = dampScalar(
      this.cameraEffectVerticalVelocity,
      0,
      10,
      dt
    );
    this.cameraEffectPitchVelocity = dampScalar(
      this.cameraEffectPitchVelocity,
      0,
      12,
      dt
    );
    this.cameraEffectVerticalOffset = dampScalar(
      this.cameraEffectVerticalOffset,
      0,
      9,
      dt
    );
    this.cameraEffectPitchOffset = dampScalar(
      this.cameraEffectPitchOffset,
      0,
      10,
      dt
    );

    const swimmingOffset =
      cameraHooks?.swimming === true
        ? Math.sin(this.volumeTime * 2.8) * 0.025
        : 0;
    const targetRollOffset =
      cameraHooks?.swimming === true
        ? Math.sin(this.volumeTime * 1.8) * 0.012
        : 0;
    const targetFov =
      this.baseCameraFov -
      (cameraHooks?.underwaterAmount ?? 0) * 1.8 -
      (cameraHooks?.swimming === true ? 0.6 : 0);

    this.cameraEffectRollOffset = dampScalar(
      this.cameraEffectRollOffset,
      targetRollOffset,
      6,
      dt
    );

    this.camera.position.y += this.cameraEffectVerticalOffset + swimmingOffset;
    this.camera.rotation.x += this.cameraEffectPitchOffset;
    this.camera.rotation.z += this.cameraEffectRollOffset;

    const nextFov = dampScalar(this.camera.fov, targetFov, 6, dt);

    if (Math.abs(nextFov - this.camera.fov) > 1e-4) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private getWaterReflectionMode() {
    if (
      this.currentWorld === null ||
      !this.currentWorld.advancedRendering.enabled ||
      this.currentWorld.advancedRendering.waterPath !== "quality"
    ) {
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
      binding.lastReflectionUpdateTime = Number.NEGATIVE_INFINITY;
    }
  }

  private updateRuntimeWaterReflections() {
    if (this.renderer === null || this.runtimeScene === null) {
      return;
    }

    const reflectionMode = this.getWaterReflectionMode();
    const now = performance.now();

    for (const binding of this.runtimeWaterContactUniforms) {
      if (
        reflectionMode === "none" ||
        binding.reflectionTextureUniform === null ||
        binding.reflectionMatrixUniform === null ||
        binding.reflectionEnabledUniform === null
      ) {
        if (binding.reflectionEnabledUniform !== null) {
          binding.reflectionEnabledUniform.value = 0;
        }
        continue;
      }

      if (binding.reflectionRenderTarget === null) {
        binding.reflectionRenderTarget =
          this.createWaterReflectionRenderTarget();
      }

      const canRenderReflection = updatePlanarReflectionCamera(
        binding.brush,
        this.camera,
        this.waterReflectionCamera,
        binding.reflectionMatrixUniform.value
      );

      if (!canRenderReflection || binding.reflectionRenderTarget === null) {
        binding.reflectionEnabledUniform.value = 0;
        continue;
      }

      if (
        binding.reflectionTextureUniform.value !== null &&
        now - binding.lastReflectionUpdateTime <
          WATER_REFLECTION_UPDATE_INTERVAL_MS
      ) {
        binding.reflectionEnabledUniform.value = 0.36;
        continue;
      }

      const hiddenWaterMeshes: Array<{
        mesh: Mesh<BufferGeometry, Material[]>;
        visible: boolean;
      }> = [];
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
      const previousFogDensity = this.underwaterSceneFog.density;
      const previousReflectionStates = this.runtimeWaterContactUniforms.map(
        (waterBinding) => ({
          binding: waterBinding,
          enabled: waterBinding.reflectionEnabledUniform?.value ?? 0,
          texture: waterBinding.reflectionTextureUniform?.value ?? null
        })
      );

      try {
        this.underwaterSceneFog.density = 0;
        for (const state of previousReflectionStates) {
          if (state.binding.reflectionEnabledUniform !== null) {
            state.binding.reflectionEnabledUniform.value = 0;
          }
        }
        binding.reflectionTextureUniform.value = null;
        this.renderer.setRenderTarget(binding.reflectionRenderTarget);
        this.renderer.autoClear = true;
        this.renderer.clear();
        this.renderer.render(
          this.worldBackgroundRenderer.scene,
          this.waterReflectionCamera
        );
        this.renderer.autoClear = false;
        this.renderer.render(this.scene, this.waterReflectionCamera);
      } finally {
        this.renderer.setRenderTarget(previousRenderTarget);
        this.renderer.autoClear = previousAutoClear;
        this.modelGroup.visible = previousModelGroupVisibility;
        this.underwaterSceneFog.density = previousFogDensity;
        for (const state of previousReflectionStates) {
          if (state.binding.reflectionEnabledUniform !== null) {
            state.binding.reflectionEnabledUniform.value = state.enabled;
          }
          if (state.binding.reflectionTextureUniform !== null) {
            state.binding.reflectionTextureUniform.value = state.texture;
          }
        }

        for (const hiddenWaterMesh of hiddenWaterMeshes) {
          hiddenWaterMesh.mesh.visible = hiddenWaterMesh.visible;
        }
      }

      binding.reflectionTextureUniform.value =
        binding.reflectionRenderTarget.texture;
      binding.reflectionEnabledUniform.value = 0.36;
      binding.lastReflectionUpdateTime = now;
    }
  }

  private getOrCreateTextureSet(
    material: NonNullable<RuntimeBrushFace["material"]>
  ) {
    const signature = createStarterMaterialSignature(material);
    const cachedTexture = this.materialTextureCache.get(material.id);

    if (cachedTexture !== undefined && cachedTexture.signature === signature) {
      return cachedTexture.textureSet;
    }

    if (cachedTexture !== undefined) {
      disposeStarterMaterialTextureSet(cachedTexture.textureSet);
    }

    const textureSet = createStarterMaterialTextureSet(
      material,
      this.materialTextureLoader
    );
    this.materialTextureCache.set(material.id, {
      signature,
      textureSet
    });

    return textureSet;
  }

  private clearLocalLights() {
    for (const renderObjects of this.localLightObjects.values()) {
      this.localLightGroup.remove(renderObjects.group);
    }

    this.localLightObjects.clear();
  }

  private clearBrushMeshes() {
    for (const mesh of this.brushMeshes.values()) {
      this.brushGroup.remove(mesh);
      mesh.geometry.dispose();
      this.disposeUniqueMaterials(mesh.material);
    }

    this.brushMeshes.clear();
    this.volumeAnimatedUniforms.length = 0;
    for (const binding of this.runtimeWaterContactUniforms) {
      binding.reflectionRenderTarget?.dispose();
    }
    this.runtimeWaterContactUniforms.length = 0;
  }

  private disposeUniqueMaterials(materials: Material[]) {
    for (const material of new Set(materials)) {
      material.dispose();
    }
  }

  private createPlayerWaterContactBounds() {
    if (
      this.runtimeScene === null ||
      this.currentPlayerControllerTelemetry === null
    ) {
      return null;
    }

    const feetPosition = this.currentPlayerControllerTelemetry.feetPosition;
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

  private collectRuntimeStaticWaterContactPatches(
    brush: RuntimeBoxBrushInstance
  ) {
    const contactBounds: Parameters<typeof collectWaterContactPatches>[1] = [];

    const runtimeBrushesById = new Map(
      (this.runtimeScene?.brushes ?? []).map((runtimeBrush) => [
        runtimeBrush.id,
        runtimeBrush
      ])
    );

    for (const collider of this.runtimeScene?.colliders ?? []) {
      if (collider.source === "brush") {
        const otherBrush = runtimeBrushesById.get(collider.brushId);

        if (
          otherBrush === undefined ||
          otherBrush.id === brush.id ||
          otherBrush.volume.mode !== "none"
        ) {
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

  private collectRuntimePlayerWaterContactPatches(
    brush: RuntimeBoxBrushInstance
  ) {
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
    return brush.volume.mode === "water"
      ? brush.volume.water.foamContactLimit
      : 0;
  }

  private mergeRuntimeWaterContactPatches(
    brush: RuntimeBoxBrushInstance,
    staticContactPatches: ReturnType<typeof collectWaterContactPatches>,
    dynamicContactPatches: ReturnType<typeof collectWaterContactPatches>
  ) {
    return [...dynamicContactPatches, ...staticContactPatches].slice(
      0,
      this.getRuntimeWaterFoamContactLimit(brush)
    );
  }

  private updateRuntimeWaterContactUniforms() {
    for (const binding of this.runtimeWaterContactUniforms) {
      const mergedPatches = this.mergeRuntimeWaterContactPatches(
        binding.brush,
        binding.staticContactPatches,
        this.collectRuntimePlayerWaterContactPatches(binding.brush)
      );
      binding.uniform.value =
        createWaterContactPatchUniformValue(mergedPatches);
      binding.axisUniform.value =
        createWaterContactPatchAxisUniformValue(mergedPatches);
      binding.shapeUniform.value =
        createWaterContactPatchShapeUniformValue(mergedPatches);
    }
  }

  private clearModelRenderObjects() {
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
    this.updatePauseInputState();
    const simulationDt = this.isRuntimePaused() ? 0 : dt;

    this.activeController?.update(simulationDt);
    this.applyPlayerCameraEffects(simulationDt);
    this.audioSystem.setPlayerControllerAudioHooks(
      this.currentPlayerAudioHooks
    );
    this.audioSystem.updateListenerTransform();

    this.volumeTime += simulationDt;
    for (const uniform of this.volumeAnimatedUniforms) {
      uniform.value = this.volumeTime;
    }

    if (this.currentClockState !== null && simulationDt > 0) {
      this.currentClockState = advanceRuntimeClockState(
        this.currentClockState,
        simulationDt
      );
      if (this.sceneReady) {
        this.syncRuntimeScheduleToCurrentClock();
      }
      this.applyDayNightLighting();
      this.clockPublishAccumulator += simulationDt;

      if (
        this.clockPublishAccumulator >= RUNTIME_CLOCK_PUBLISH_INTERVAL_SECONDS
      ) {
        this.clockPublishAccumulator = 0;
        this.publishRuntimeClockState();
      }
    }

    for (const mixer of this.animationMixers.values()) {
      mixer.update(simulationDt);
    }

    if (
      this.sceneReady &&
      this.runtimeScene !== null &&
      this.currentPlayerControllerTelemetry !== null &&
      !this.isRuntimePaused()
    ) {
      this.interactionSystem.updatePlayerPosition(
        {
          feetPosition: this.currentPlayerControllerTelemetry.feetPosition,
          eyePosition: this.currentPlayerControllerTelemetry.eyePosition
        },
        this.runtimeScene,
        this.createInteractionDispatcher()
      );

      this.setInteractionPrompt(
        this.currentDialogue === null ? this.resolveInteractionPrompt() : null
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
      this.worldBackgroundRenderer.syncToCamera(this.camera);
      this.advancedRenderingComposer.render(dt);
      return;
    }

    if (this.renderer === null) {
      return;
    }

    this.worldBackgroundRenderer.syncToCamera(this.camera);
    const previousAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.clear();
    this.renderer.render(this.worldBackgroundRenderer.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = previousAutoClear;
  };

  private applyTeleportPlayerAction(target: RuntimeTeleportTarget) {
    if (this.activeController === this.thirdPersonController) {
      this.thirdPersonController.teleportTo(target.position, target.yawDegrees);
      return;
    }

    this.firstPersonController.teleportTo(target.position, target.yawDegrees);
  }

  private applySceneTransitionEffect(options: {
    sourceEntityId: string | null;
    targetSceneId: string;
    targetEntryEntityId: string;
  }) {
    this.sceneTransitionHandler?.({
      sourceEntityId: options.sourceEntityId,
      targetSceneId: options.targetSceneId,
      targetEntryEntityId: options.targetEntryEntityId
    });
  }

  private dispatchImpulseSequenceEffect(
    effect: ImpulseSequenceStep,
    sourceEntityId: string | null
  ) {
    if (this.runtimeScene === null) {
      return;
    }

    switch (effect.type) {
      case "controlEffect":
        this.applyControlEffect(effect.effect, null);
        return;
      case "makeNpcTalk":
        this.openRuntimeNpcDialogue(effect.npcEntityId, effect.dialogueId, {
          kind: "direct",
          sourceEntityId,
          linkId: null,
          trigger: null
        });
        return;
      case "teleportPlayer": {
        const teleportTarget =
          this.runtimeScene.entities.teleportTargets.find(
            (candidate) => candidate.entityId === effect.targetEntityId
          ) ?? null;

        if (teleportTarget !== null) {
          this.applyTeleportPlayerAction(teleportTarget);
        }
        return;
      }
      case "startSceneTransition":
        this.applySceneTransitionEffect({
          sourceEntityId,
          targetSceneId: effect.targetSceneId,
          targetEntryEntityId: effect.targetEntryEntityId
        });
        return;
      case "setVisibility":
        this.applyVisibilitySequenceEffect(effect.target, effect.mode);
        return;
    }
  }

  private syncRuntimeScheduleToCurrentClock() {
    if (this.runtimeScene === null || this.currentClockState === null) {
      return;
    }

    const nextResolvedScheduler = resolveRuntimeProjectScheduleState({
      scheduler: this.runtimeScene.scheduler.document,
      sequences: this.runtimeScene.sequences,
      actorIds: this.runtimeScene.npcDefinitions.map((npc) => npc.actorId),
      dayNumber: this.currentClockState.dayCount + 1,
      timeOfDayHours: this.currentClockState.timeOfDayHours,
      pathsById: new Map(this.runtimeScene.paths.map((path) => [path.id, path]))
    });
    const actorStates = new Map(
      nextResolvedScheduler.actors.map((state) => [state.actorId, state])
    );
    const nextActiveImpulseRoutineIds = new Set(
      nextResolvedScheduler.impulses.map((routine) => routine.routineId)
    );
    let changed = false;

    for (const npc of this.runtimeScene.npcDefinitions) {
      const actorState = actorStates.get(npc.actorId);
      const previousActive = npc.active;
      const previousRoutineId = npc.activeRoutineId;
      const previousRoutineTitle = npc.activeRoutineTitle;
      const previousAnimationClipName = npc.animationClipName;
      const previousAnimationLoop = npc.animationLoop;
      const previousYawDegrees = npc.yawDegrees;
      const previousPosition = {
        x: npc.position.x,
        y: npc.position.y,
        z: npc.position.z
      };
      const previousPathId = npc.resolvedPath?.pathId ?? null;
      const previousPathProgress = npc.resolvedPath?.progress ?? null;

      applyActorScheduleStateToNpcDefinition(npc, actorState ?? null);

      if (
        npc.active === previousActive &&
        npc.activeRoutineId === previousRoutineId &&
        npc.activeRoutineTitle === previousRoutineTitle &&
        npc.animationClipName === previousAnimationClipName &&
        npc.animationLoop === previousAnimationLoop &&
        npc.yawDegrees === previousYawDegrees &&
        npc.position.x === previousPosition.x &&
        npc.position.y === previousPosition.y &&
        npc.position.z === previousPosition.z &&
        (npc.resolvedPath?.pathId ?? null) === previousPathId &&
        (npc.resolvedPath?.progress ?? null) === previousPathProgress
      ) {
        continue;
      }

      changed = true;
      const renderGroup = this.modelRenderObjects.get(npc.entityId);

      if (renderGroup !== undefined) {
        renderGroup.visible = npc.visible && npc.active;
        renderGroup.position.set(npc.position.x, npc.position.y, npc.position.z);
        renderGroup.rotation.set(0, (npc.yawDegrees * Math.PI) / 180, 0);
      }

      if (
        this.animationMixers.has(npc.entityId) &&
        (npc.animationClipName !== previousAnimationClipName ||
          npc.animationLoop !== previousAnimationLoop)
      ) {
        if (npc.animationClipName === null) {
          this.applyStopAnimationAction(npc.entityId);
        } else {
          this.applyPlayAnimationAction(
            npc.entityId,
            npc.animationClipName,
            npc.animationLoop
          );
        }
      }
    }

    const nextResolvedControl = applyRuntimeProjectScheduleToControlState(
      this.runtimeScene.control.resolved,
      nextResolvedScheduler,
      this.runtimeScene.control.baselineResolved
    );
    this.syncResolvedControlStateToRuntime(nextResolvedControl);

    for (const impulseRoutine of nextResolvedScheduler.impulses) {
      if (
        this.activeScheduledImpulseRoutineIds.has(impulseRoutine.routineId) ||
        this.completedScheduledImpulseRoutineIds.has(impulseRoutine.routineId)
      ) {
        continue;
      }

      for (const effect of impulseRoutine.effects) {
        this.dispatchImpulseSequenceEffect(effect, null);
      }

      this.completedScheduledImpulseRoutineIds.add(impulseRoutine.routineId);
    }

    this.runtimeScene.scheduler.resolved = nextResolvedScheduler;
    this.runtimeScene.control.resolved = nextResolvedControl;
    this.activeScheduledImpulseRoutineIds = nextActiveImpulseRoutineIds;

    if (changed) {
      this.refreshRuntimeNpcCollections();
      this.refreshCollisionWorldForNpcSchedule();
    }
  }

  private refreshRuntimeNpcCollections() {
    if (this.runtimeScene === null) {
      return;
    }

    this.runtimeScene.entities.npcs = this.runtimeScene.npcDefinitions
      .filter((npc) => npc.active)
      .map((npc) => createRuntimeNpcFromDefinition(npc));
    this.runtimeScene.colliders = [
      ...this.runtimeScene.staticColliders,
      ...this.runtimeScene.entities.npcs
        .map((npc) => buildRuntimeNpcCollider(npc))
        .filter(isNonNull)
    ];
  }

  private refreshCollisionWorldForNpcSchedule() {
    if (this.runtimeScene === null) {
      return;
    }

    const requestId = ++this.collisionWorldRequestId;
    const previousCollisionWorld = this.collisionWorld;

    void this.buildCollisionWorld(
      requestId,
      this.runtimeScene.colliders,
      this.runtimeScene.playerCollider,
      this.runtimeScene.playerMovement
    )
      .then((nextCollisionWorld) => {
        if (requestId !== this.collisionWorldRequestId) {
          nextCollisionWorld.dispose();
          return;
        }

        this.collisionWorld = nextCollisionWorld;
        previousCollisionWorld?.dispose();
      })
      .catch((error) => {
        if (requestId !== this.collisionWorldRequestId) {
          return;
        }

        const detail =
          error instanceof Error && error.message.trim().length > 0
            ? error.message.trim()
            : "Unknown error.";
        const message = `Runner collision refresh failed: ${detail}`;
        this.currentRuntimeMessage = message;
        this.runtimeMessageHandler?.(message);
      });
  }

  private applyToggleBrushVisibilityAction(
    brushId: string,
    visible: boolean | undefined
  ) {
    const mesh = this.brushMeshes.get(brushId);

    if (mesh === undefined) {
      return;
    }

    if (this.runtimeScene !== null) {
      const brush =
        this.runtimeScene.brushes.find((candidate) => candidate.id === brushId) ??
        null;

      if (brush !== null) {
        brush.visible = visible ?? !brush.visible;
      }
    }

    mesh.visible = visible ?? !mesh.visible;
  }

  private applyVisibilitySequenceEffect(
    target: SequenceVisibilityTarget,
    mode: SequenceVisibilityMode
  ) {
    const explicitVisible =
      mode === "toggle" ? undefined : mode === "show";

    if (target.kind === "brush") {
      this.applyToggleBrushVisibilityAction(target.brushId, explicitVisible);
      return;
    }

    const runtimeModelInstance =
      this.runtimeScene?.modelInstances.find(
        (candidate) => candidate.instanceId === target.modelInstanceId
      ) ?? null;
    const currentVisible =
      runtimeModelInstance?.visible ??
      this.modelRenderObjects.get(target.modelInstanceId)?.visible ??
      true;

    this.applyModelInstanceVisibilityControl(
      {
        kind: "modelInstance",
        modelInstanceId: target.modelInstanceId
      },
      explicitVisible ?? !currentVisible
    );
  }

  private applyPlayAnimationAction(
    instanceId: string,
    clipName: string,
    loop: boolean | undefined
  ) {
    const mixer = this.animationMixers.get(instanceId);
    const clips = this.instanceAnimationClips.get(instanceId);

    if (!mixer || !clips) {
      console.warn(`playAnimation: no mixer for instance ${instanceId}`);
      return;
    }

    const clip = AnimationClip.findByName(clips, clipName);

    if (!clip) {
      console.warn(
        `playAnimation: clip "${clipName}" not found on instance ${instanceId}`
      );
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
      startSceneTransition: (request) => {
        this.applySceneTransitionEffect(request);
      },
      toggleBrushVisibility: (brushId, visible) => {
        this.applyToggleBrushVisibilityAction(brushId, visible);
      },
      setVisibility: (target, mode) => {
        this.applyVisibilitySequenceEffect(target, mode);
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
      },
      startNpcDialogue: (npcEntityId, dialogueId, source) => {
        this.openRuntimeNpcDialogue(npcEntityId, dialogueId, source);
      },
      dispatchControlEffect: (effect, link) => {
        this.applyControlEffect(effect, link);
      }
    };
  }

  private setInteractionPrompt(prompt: RuntimeInteractionPrompt | null) {
    if (
      this.currentInteractionPrompt?.sourceEntityId ===
        prompt?.sourceEntityId &&
      this.currentInteractionPrompt?.prompt === prompt?.prompt &&
      this.currentInteractionPrompt?.distance === prompt?.distance &&
      this.currentInteractionPrompt?.range === prompt?.range
    ) {
      return;
    }

    this.currentInteractionPrompt = prompt;
    this.interactionPromptHandler?.(prompt);
  }

  private createRuntimeNpcDialogueState(
    npcEntityId: string,
    dialogueId: string,
    lineIndex: number,
    source: RuntimeDialogueStartSource
  ): RuntimeDialogueState | null {
    if (this.runtimeScene === null) {
      return null;
    }

    const npc =
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === npcEntityId
      ) ?? null;

    if (npc === null) {
      return null;
    }

    const dialogue = npc.dialogues.find((candidate) => candidate.id === dialogueId);

    if (dialogue === undefined) {
      return null;
    }

    const line = dialogue.lines[lineIndex];

    if (line === undefined) {
      return null;
    }

    return {
      npcEntityId,
      dialogueId,
      title: dialogue.title,
      lineId: line.id,
      lineIndex,
      lineCount: dialogue.lines.length,
      speakerName: line.speakerName,
      text: line.text,
      source
    };
  }

  private setRuntimeDialogue(dialogue: RuntimeDialogueState | null) {
    if (
      this.currentDialogue?.npcEntityId === dialogue?.npcEntityId &&
      this.currentDialogue?.dialogueId === dialogue?.dialogueId &&
      this.currentDialogue?.lineId === dialogue?.lineId &&
      this.currentDialogue?.lineIndex === dialogue?.lineIndex &&
      this.currentDialogue?.lineCount === dialogue?.lineCount &&
      this.currentDialogue?.speakerName === dialogue?.speakerName &&
      this.currentDialogue?.text === dialogue?.text &&
      this.currentDialogue?.title === dialogue?.title &&
      this.currentDialogue?.source.kind === dialogue?.source.kind &&
      this.currentDialogue?.source.sourceEntityId ===
        dialogue?.source.sourceEntityId &&
      this.currentDialogue?.source.linkId === dialogue?.source.linkId &&
      this.currentDialogue?.source.trigger === dialogue?.source.trigger
    ) {
      return;
    }

    this.currentDialogue = dialogue;
    this.runtimeDialogueHandler?.(dialogue);
  }

  private openRuntimeNpcDialogue(
    npcEntityId: string,
    dialogueId: string | null,
    source: RuntimeDialogueStartSource = {
      kind: "direct",
      sourceEntityId: null,
      linkId: null,
      trigger: null
    }
  ) {
    if (this.runtimeScene === null) {
      return;
    }

    const npc =
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === npcEntityId
      ) ?? null;

    if (npc === null) {
      console.warn(`dialogue: missing npc ${npcEntityId}`);
      return;
    }

    const resolvedDialogueId =
      dialogueId ??
      npc.defaultDialogueId ??
      npc.dialogues[0]?.id ??
      null;

    if (resolvedDialogueId === null) {
      console.warn(`dialogue: npc ${npcEntityId} has no dialogue to speak`);
      return;
    }

    if (
      this.currentDialogue?.npcEntityId === npcEntityId &&
      this.currentDialogue?.dialogueId === resolvedDialogueId
    ) {
      return;
    }

    const dialogue = this.createRuntimeNpcDialogueState(
      npcEntityId,
      resolvedDialogueId,
      0,
      source
    );

    if (dialogue === null) {
      console.warn(
        `dialogue: npc ${npcEntityId} is missing dialogue ${resolvedDialogueId}`
      );
      return;
    }

    this.setRuntimeDialogue(dialogue);
  }

  private resolveInteractionPrompt(): RuntimeInteractionPrompt | null {
    if (
      this.runtimeScene === null ||
      this.currentPlayerControllerTelemetry === null ||
      (this.activeController !== this.firstPersonController &&
        this.activeController !== this.thirdPersonController)
    ) {
      return null;
    }

    this.camera.getWorldDirection(this.cameraForward);

    const interactionOrigin = this.currentPlayerControllerTelemetry.eyePosition;
    const rayOrigin =
      this.activeController === this.thirdPersonController
        ? {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
          }
        : interactionOrigin;

    return this.interactionSystem.resolveClickInteractionPrompt(
      interactionOrigin,
      rayOrigin,
      {
        x: this.cameraForward.x,
        y: this.cameraForward.y,
        z: this.cameraForward.z
      },
      this.runtimeScene
    );
  }

  private handleRuntimeClick = () => {
    if (
      !this.sceneReady ||
      this.runtimeScene === null ||
      (this.activeController !== this.firstPersonController &&
        this.activeController !== this.thirdPersonController)
    ) {
      return;
    }

    this.audioSystem.handleUserGesture();

    if (this.currentDialogue !== null) {
      this.advanceRuntimeDialogue();
      return;
    }

    if (this.isRuntimePaused()) {
      return;
    }

    if (this.currentInteractionPrompt === null) {
      return;
    }

    this.interactionSystem.dispatchClickInteraction(
      this.currentInteractionPrompt.sourceEntityId,
      this.runtimeScene,
      this.createInteractionDispatcher()
    );
  };

  private handleRuntimePointerDown = () => {
    if (!this.sceneReady) {
      return;
    }

    this.audioSystem.handleUserGesture();
  };

  private handleRuntimeKeyDown = (event: KeyboardEvent) => {
    if (
      this.runtimeScene === null ||
      !this.sceneReady ||
      event.code !== this.runtimeScene.playerInputBindings.keyboard.pauseTime
    ) {
      return;
    }

    this.pressedKeys.add(event.code);

    if (
      event.defaultPrevented ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isEditableEventTarget(event.target)
    ) {
      return;
    }

    this.pressedKeys.add(event.code);
    event.preventDefault();
    this.toggleManualPause();
    this.previousPauseInputActive = true;
  };

  private handleRuntimeKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };

  private handleRuntimeBlur = () => {
    this.pressedKeys.clear();
    this.previousPauseInputActive = false;
  };

  private updatePauseInputState() {
    if (this.runtimeScene === null || !this.sceneReady) {
      this.previousPauseInputActive = false;
      return;
    }

    const pauseInputActive =
      resolvePlayerStartPauseInput(
        this.pressedKeys,
        this.runtimeScene.playerInputBindings
      ) >= 0.5;

    if (pauseInputActive && !this.previousPauseInputActive) {
      this.toggleManualPause();
    }

    this.previousPauseInputActive = pauseInputActive;
  }
}
