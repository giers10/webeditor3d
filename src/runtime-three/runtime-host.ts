import {
  AdditiveBlending,
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  BufferGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  DoubleSide,
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
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector3,
  SpotLight,
  TextureLoader,
  Texture,
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
  mapWorldPointToScenePathProgressBetweenPoints,
  resolveNearestPointOnResolvedScenePath,
  sampleResolvedScenePathPosition
} from "../document/paths";
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
import { buildTerrainDerivedMeshData } from "../geometry/terrain-mesh";
import {
  createStarterMaterialSignature,
  createStarterMaterialTextureSet,
  disposeStarterMaterialTextureSet,
  type StarterMaterialTextureSet
} from "../materials/starter-material-textures";
import {
  applyAdvancedRenderingRenderableShadowFlags,
  configureAdvancedRenderingShadowLight,
  configureAdvancedRenderingRenderer,
  createAdvancedRenderingComposer,
  resolveBoxVolumeRenderPaths,
  type ResolvedBoxVolumeRenderPaths
} from "../rendering/advanced-rendering";
import {
  fitCelestialDirectionalShadow,
  resolveDominantCelestialShadowCaster
} from "../rendering/celestial-shadows";
import {
  resolveWorldShaderSkyEnvironmentPhaseStates,
  resolveWorldShaderSkyRenderState
} from "../rendering/world-shader-sky";
import {
  resolveWorldCelestialBodiesState,
  resolveWorldEnvironmentState,
  WorldBackgroundRenderer
} from "../rendering/world-background-renderer";
import {
  createRendererPrecomputedShaderSkyEnvironmentCache,
  type PrecomputedShaderSkyEnvironmentCache
} from "../rendering/precomputed-shader-sky-environment-cache";
import {
  createRendererQuantizedEnvironmentBlendCache,
  createRendererQuantizedPmremBlendCache,
  type QuantizedEnvironmentBlendCache
} from "../rendering/quantized-environment-blend-cache";
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
  createTerrainLayerBlendMaterial,
  getTerrainLayerTexture
} from "../rendering/terrain-layer-material";
import {
  applyWhiteboxBevelToMaterial,
  shouldApplyWhiteboxBevel
} from "../rendering/whitebox-bevel-material";
import {
  applyRendererRenderCategory,
  applyRendererRenderCategoryFromMaterial,
  enableCameraRendererRenderCategories,
  enableObjectForAllRendererRenderCategories
} from "../rendering/render-layers";
import {
  areAdvancedRenderingSettingsEqual,
  cloneAdvancedRenderingSettings,
  type AdvancedRenderingSettings
} from "../document/world-settings";
import {
  DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES,
  DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
  getNpcColliderHeight,
  getPlayerStartMouseBindingCodeForButton,
  isPlayerStartMouseBindingCode
} from "../entities/entity-instances";
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
  RuntimePlayerVolumeState,
  RuntimeTargetLookInput,
  RuntimeTargetLookInputResult
} from "./navigation-controller";
import { RapierCollisionWorld } from "./rapier-collision-world";
import {
  RuntimeInteractionSystem,
  resolveRuntimeTargetCandidates,
  resolveRuntimeTargetReference,
  type RuntimeDialogueStartSource,
  type RuntimeInteractionDispatcher,
  type RuntimeInteractionPrompt,
  type RuntimeTargetCandidate,
  type RuntimeResolvedTarget,
  type RuntimeTargetReference
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
import { resolveRuntimePlayerMovementHooks } from "./player-controller-telemetry";
import {
  resolveDialogueAttentionCameraSolution,
  type DialogueAttentionSideSign
} from "./dialogue-attention-camera";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "./runtime-project-scheduler";
import {
  THIRD_PERSON_CAMERA_COLLISION_RADIUS,
  ThirdPersonNavigationController
} from "./third-person-navigation-controller";
import { resolveUnderwaterFogState } from "./underwater-fog";
import { resolveWaterContact } from "./water-volume-utils";
import type {
  RuntimeBrushFace,
  RuntimeCameraRig,
  RuntimeNpc,
  RuntimeNpcDefinition,
  RuntimeBoxBrushInstance,
  RuntimeLocalLightCollection,
  RuntimeNavigationMode,
  RuntimeSceneDefinition,
  RuntimeTerrain,
  RuntimeTeleportTarget
} from "./runtime-scene-build";
import {
  applyActorScheduleStateToNpcDefinition,
  buildRuntimeNpcCollider,
  createRuntimeNpcFromDefinition
} from "./runtime-scene-build";
import {
  resolveDefaultTargetCycleInput,
  resolvePlayerStartInteractInput,
  resolvePlayerStartLookInput,
  resolvePlayerStartPauseInput
} from "./player-input-bindings";

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

interface LightVolumeRenderObjects {
  group: Group;
  lights: PointLight[];
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
const CAMERA_RIG_POINTER_LOOK_SENSITIVITY = 0.004;
const CAMERA_RIG_GAMEPAD_LOOK_SPEED = 2.2;
const DIALOGUE_ATTENTION_CAMERA_TRANSITION_DURATION_SECONDS = 0.35;
const DIALOGUE_ATTENTION_PLAYER_FOCUS_HEIGHT_FACTOR = 0.82;
const DIALOGUE_ATTENTION_NPC_FOCUS_HEIGHT_FACTOR = 0.88;
const DIALOGUE_PARTICIPANT_MIN_SURFACE_DISTANCE = 0.5;
const DIALOGUE_PARTICIPANT_PUSHBACK_DURATION_SECONDS = 0.3;
const DIALOGUE_PARTICIPANT_YAW_BLEND_RATE = 8;
const DIALOGUE_PARTICIPANT_RESTORE_EPSILON_DEGREES = 0.5;
const CAMERA_COLLISION_RECOVERY_SPEED = 6.5;
const CAMERA_COLLISION_DISTANCE_EPSILON = 1e-4;
const TARGETING_LUX_FOLLOW_RATE = 8;
const TARGETING_LUX_FLIGHT_RATE = 7.5;
const TARGETING_LUX_RETURN_RATE = 8.5;
const TARGETING_LUX_HOME_HEIGHT_FACTOR = 0.52;
const TARGETING_LUX_HIDE_DISTANCE = 0.06;
const TARGETING_LUX_EXTRA_TARGET_LIFT = 0.3;
const TARGETING_LUX_SWAY_RATE = 2.2;
const TARGETING_LUX_SWAY_DISTANCE = 0.22;
const TARGETING_LUX_BOB_RATE = 4.2;
const TARGETING_LUX_PULSE_RATE = 6.5;
const TARGETING_ACTIVE_ARROW_COUNT = 3;
const TARGETING_ACTIVE_ARROW_ORBIT_RATE = 1.6;
const TARGETING_DIRECTION_SWITCH_INPUT_THRESHOLD = 0.28;
const TARGETING_SCREEN_SWITCH_MIN_DISTANCE = 0.04;
const TARGETING_SCREEN_SWITCH_MIN_ALIGNMENT = 0.68;
const TARGETING_SCREEN_SWITCH_MAX_ABS_X = 1.35;
const TARGETING_SCREEN_SWITCH_MAX_ABS_Y = 1.25;
const TARGETING_SCREEN_PROPOSAL_MAX_ABS_X = 1;
const TARGETING_SCREEN_PROPOSAL_MAX_ABS_Y = 1;
const TARGETING_SCREEN_PROPOSAL_FOCUS_Y = 0.2;
const TARGETING_MAX_ACTIVE_TARGET_DISTANCE = 15;
const TARGETING_ACTIVE_TARGET_RELEASE_DISTANCE =
  TARGETING_MAX_ACTIVE_TARGET_DISTANCE + 0.75;
const TARGETING_AUTO_RETARGET_SAFE_DISTANCE =
  TARGETING_MAX_ACTIVE_TARGET_DISTANCE - 0.75;
const TARGETING_VISIBILITY_TARGET_CLEARANCE = 0.45;
const TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING = 0.08;
const TARGETING_ACTIVE_OCCLUSION_GRACE_SECONDS = 0.35;
// Proposed-target camera nudging is intentionally disabled for now. Lux alone
// should communicate proposal without moving the gameplay camera.
// const PROPOSED_TARGET_CAMERA_ASSIST_STRENGTH = 0.28;
const ACTIVE_TARGET_CAMERA_ASSIST_STRENGTH = 0.55;
const TARGETING_LUX_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const TARGETING_LUX_CORE_FRAGMENT_SHADER = `
varying vec2 vUv;

void main() {
  vec2 centeredUv = vUv * 2.0 - 1.0;
  float distanceFromCenter = length(centeredUv);
  float body = smoothstep(0.72, 0.2, distanceFromCenter);
  float rim = smoothstep(0.56, 0.76, distanceFromCenter) *
    smoothstep(1.0, 0.7, distanceFromCenter);
  float edgeFade = smoothstep(1.0, 0.78, distanceFromCenter);

  vec3 whiteCore = vec3(1.0, 0.98, 0.9);
  vec3 tealRim = vec3(0.35, 1.0, 1.0);
  vec3 color = mix(whiteCore, tealRim, rim * 0.7);
  color += tealRim * rim * 0.35;

  float alpha = clamp(body * 0.95 + rim * 0.45, 0.0, 1.0) * edgeFade;
  if (alpha <= 0.002) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
`;
const TARGETING_LUX_GLOW_FRAGMENT_SHADER = `
varying vec2 vUv;

void main() {
  vec2 centeredUv = vUv * 2.0 - 1.0;
  float distanceFromCenter = length(centeredUv);
  float outerFade = smoothstep(1.0, 0.04, distanceFromCenter);
  float ringWeight = smoothstep(0.28, 0.64, distanceFromCenter) *
    smoothstep(1.0, 0.58, distanceFromCenter);
  vec3 teal = vec3(0.36, 0.98, 1.0);
  vec3 deepTeal = vec3(0.02, 0.46, 0.54);
  vec3 color = mix(deepTeal, teal, ringWeight);
  float alpha = outerFade * (0.12 + ringWeight * 0.42);

  if (alpha <= 0.002) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
`;

export function resolveRuntimeTargetVisualPlacement(target: {
  center: { x: number; y: number; z: number };
  range: number;
}) {
  const luxLift =
    clampScalar(target.range * 0.42, 0.78, 1.35) +
    TARGETING_LUX_EXTRA_TARGET_LIFT;
  const activeMarkerRadius = clampScalar(target.range * 0.48, 0.62, 1.15);
  const activeMarkerScale = clampScalar(target.range * 0.55, 0.8, 1.35);

  return {
    luxPosition: {
      x: target.center.x,
      y: target.center.y + luxLift,
      z: target.center.z
    },
    activeMarkerPosition: {
      x: target.center.x,
      y: target.center.y,
      z: target.center.z
    },
    activeMarkerRadius,
    activeMarkerScale
  };
}

function dampScalar(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * Math.min(1, dt * rate);
}

function clampScalar(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerpScalar(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function createTargetingLuxCoreMaterial() {
  return new ShaderMaterial({
    vertexShader: TARGETING_LUX_VERTEX_SHADER,
    fragmentShader: TARGETING_LUX_CORE_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
    side: DoubleSide
  });
}

function createTargetingLuxGlowMaterial() {
  return new ShaderMaterial({
    vertexShader: TARGETING_LUX_VERTEX_SHADER,
    fragmentShader: TARGETING_LUX_GLOW_FRAGMENT_SHADER,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
    side: DoubleSide
  });
}

function distanceBetweenPoints(
  left: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number }
) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function smoothStep01(value: number) {
  const t = clampScalar(value, 0, 1);

  return t * t * (3 - 2 * t);
}

function normalizeDegrees(value: number) {
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;

  return wrapped === -180 ? 180 : wrapped;
}

function resolveShortestAngleDeltaDegrees(
  fromDegrees: number,
  toDegrees: number
) {
  return normalizeDegrees(toDegrees - fromDegrees);
}

function dampAngleDegrees(
  currentDegrees: number,
  targetDegrees: number,
  rate: number,
  dt: number
) {
  return normalizeDegrees(
    currentDegrees +
      resolveShortestAngleDeltaDegrees(currentDegrees, targetDegrees) *
        Math.min(1, dt * rate)
  );
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
  speakerName: string;
  text: string;
  source: RuntimeDialogueStartSource;
}

export interface RuntimePauseState {
  paused: boolean;
  source: "manual" | "control" | "dialogue" | "mixed" | null;
}

type RuntimeCameraSourceKey =
  | "gameplay"
  | `rig:${string}`
  | `dialogue:${string}`;

interface RuntimeCameraPose {
  position: Vector3;
  lookTarget: Vector3;
  collisionPivot?: Vector3 | null;
  collisionRadius?: number | null;
}

interface RuntimeCameraTransitionState {
  durationSeconds: number;
  elapsedSeconds: number;
  fromPose: RuntimeCameraPose;
  toPose: RuntimeCameraPose;
  destinationSourceKey: RuntimeCameraSourceKey;
}

interface RuntimeDialogueAttentionState {
  npcEntityId: string;
  sideSign: DialogueAttentionSideSign;
}

interface RuntimeDialogueParticipantState {
  npcEntityId: string;
  npcCurrentYawDegrees: number;
  npcTargetYawDegrees: number;
  npcRestoreYawDegrees: number;
  playerStartFeetPosition: RuntimeTeleportTarget["position"];
  playerTargetFeetPosition: RuntimeTeleportTarget["position"];
  playerPositionBlendElapsedSeconds: number;
  playerPositionBlendDurationSeconds: number;
  playerCurrentYawDegrees: number;
  playerTargetYawDegrees: number;
}

type RuntimeResolvedCameraSource =
  | {
      kind: "gameplay";
    }
  | {
      kind: "rig";
      rig: RuntimeCameraRig;
    }
  | {
      kind: "dialogue";
      state: RuntimeDialogueAttentionState;
    };

type TargetingLuxFlightState =
  | "hidden"
  | "outbound"
  | "following"
  | "returning";

export class RuntimeHost {
  private readonly scene = new Scene();
  private readonly worldBackgroundRenderer = new WorldBackgroundRenderer();
  private readonly camera = new PerspectiveCamera(70, 1, 0.05, 1000);
  private readonly cameraForward = new Vector3();
  private readonly cameraRigLookTarget = new Vector3();
  private readonly cameraRigDirection = new Vector3();
  private readonly cameraRigForward = new Vector3();
  private readonly cameraCollisionDirection = new Vector3();
  private readonly volumeOffset = new Vector3();
  private readonly volumeInverseRotation = new Quaternion();
  private readonly fogLocalCameraPosition = new Vector3();
  private readonly domElement: HTMLCanvasElement;
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly moonLight = new DirectionalLight();
  private readonly localLightGroup = new Group();
  private readonly lightVolumeGroup = new Group();
  private readonly brushGroup = new Group();
  private readonly terrainGroup = new Group();
  private readonly modelGroup = new Group();
  private readonly targetingVisualGroup = new Group();
  private readonly targetingLuxGroup = new Group();
  private readonly targetingActiveGroup = new Group();
  private readonly targetingLuxTargetPosition = new Vector3();
  private readonly targetingLuxHomePosition = new Vector3();
  private readonly targetingLuxSwayDirection = new Vector3();
  private readonly targetingActiveCameraRight = new Vector3();
  private readonly targetingActiveCameraUp = new Vector3();
  private readonly targetingActiveArrowDirection = new Vector3();
  private readonly targetingActiveArrowLocalTipAxis = new Vector3(0, 1, 0);
  private readonly targetingActiveArrowGeometry = new ConeGeometry(
    0.16,
    0.38,
    16
  );
  private readonly targetingActiveArrowMaterial = new MeshBasicMaterial({
    color: 0xfff2a2,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.95
  });
  private readonly targetingActiveArrows: Mesh<
    ConeGeometry,
    MeshBasicMaterial
  >[] = Array.from(
    { length: TARGETING_ACTIVE_ARROW_COUNT },
    () =>
      new Mesh(
        this.targetingActiveArrowGeometry,
        this.targetingActiveArrowMaterial
      )
  );
  private readonly targetingLuxMesh = new Mesh(
    new PlaneGeometry(0.32, 0.32),
    createTargetingLuxCoreMaterial()
  );
  private readonly targetingLuxGlowMesh = new Mesh(
    new PlaneGeometry(0.76, 0.76),
    createTargetingLuxGlowMaterial()
  );
  private readonly targetingLuxLight = new PointLight(0x8df7ff, 1.25, 3.2, 2);
  private targetingLuxInitialized = false;
  private targetingLuxFlightState: TargetingLuxFlightState = "hidden";
  private targetingVisualTime = 0;
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
  private readonly terrainMeshes = new Map<
    string,
    Mesh<BufferGeometry, Material>
  >();
  private volumeTime = 0;
  private readonly volumeAnimatedUniforms: Array<{ value: number }> = [];
  private readonly runtimeWaterContactUniforms: RuntimeWaterContactUniformBinding[] =
    [];
  private readonly localLightObjects = new Map<
    string,
    LocalLightRenderObjects
  >();
  private readonly lightVolumeObjects = new Map<
    string,
    LightVolumeRenderObjects
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
  private readonly environmentBlendCache: QuantizedEnvironmentBlendCache | null;
  private readonly shaderSkyEnvironmentBlendCache: QuantizedEnvironmentBlendCache | null;
  private readonly shaderSkyEnvironmentCache: PrecomputedShaderSkyEnvironmentCache | null;
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
  private currentCelestialShadowCaster: "sun" | "moon" | null = null;
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
  private runtimeTargetCandidates: RuntimeTargetCandidate[] = [];
  private proposedRuntimeTarget: RuntimeTargetCandidate | null = null;
  private activeRuntimeTargetReference: RuntimeTargetReference | null = null;
  private activeRuntimeTargetOcclusionSeconds = 0;
  private runtimeTargetSwitchInputHeld = false;
  private previousTargetCycleInputActive = false;
  private activeCameraRigOverrideEntityId: string | null = null;
  private activeCameraSourceKey: RuntimeCameraSourceKey | null = null;
  private activeRuntimeCameraRig: RuntimeCameraRig | null = null;
  private activeDialogueAttentionState: RuntimeDialogueAttentionState | null =
    null;
  private dialogueParticipantState: RuntimeDialogueParticipantState | null =
    null;
  private cameraTransitionState: RuntimeCameraTransitionState | null = null;
  private suppressNextCameraSourceTransition = false;
  private cameraRigLookYawRadians = 0;
  private cameraRigLookPitchRadians = 0;
  private cameraRigLookDragging = false;
  private smoothedRuntimeCameraCollisionDistance: number | null = null;
  private lastCameraRigPointerClientX = 0;
  private lastCameraRigPointerClientY = 0;
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
  private dialoguePauseActive = false;
  private previousPauseInputActive = false;
  private readonly pressedKeys = new Set<string>();
  private activeScheduledImpulseRoutineIds = new Set<string>();
  private completedScheduledImpulseRoutineIds = new Set<string>();

  constructor(options: { enableRendering?: boolean } = {}) {
    const enableRendering = options.enableRendering ?? true;

    enableCameraRendererRenderCategories(this.camera);
    enableCameraRendererRenderCategories(this.waterReflectionCamera);
    enableObjectForAllRendererRenderCategories(this.ambientLight);
    enableObjectForAllRendererRenderCategories(this.sunLight);
    enableObjectForAllRendererRenderCategories(this.moonLight);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);
    this.scene.add(this.localLightGroup);
    this.scene.add(this.lightVolumeGroup);
    this.scene.add(this.brushGroup);
    this.scene.add(this.terrainGroup);
    this.scene.add(this.modelGroup);
    this.targetingLuxMesh.renderOrder = 10000;
    this.targetingLuxGlowMesh.renderOrder = 9999;
    this.targetingLuxLight.castShadow = false;
    this.targetingLuxGroup.add(this.targetingLuxGlowMesh);
    this.targetingLuxGroup.add(this.targetingLuxMesh);
    this.targetingLuxGroup.add(this.targetingLuxLight);
    applyRendererRenderCategory(this.targetingLuxGroup, "overlay");
    enableObjectForAllRendererRenderCategories(this.targetingLuxLight);
    this.targetingActiveArrows.forEach((arrow, index) => {
      arrow.renderOrder = 10001 + index;
      this.targetingActiveGroup.add(arrow);
    });
    applyRendererRenderCategory(this.targetingActiveGroup, "overlay");
    this.targetingVisualGroup.add(this.targetingLuxGroup);
    this.targetingVisualGroup.add(this.targetingActiveGroup);
    this.targetingVisualGroup.visible = false;
    this.targetingLuxGroup.visible = false;
    this.targetingActiveGroup.visible = false;
    this.scene.add(this.targetingVisualGroup);
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
    this.environmentBlendCache =
      this.renderer === null
        ? null
        : createRendererQuantizedEnvironmentBlendCache(this.renderer, {
            onTextureReady: () => {
              this.applyDayNightLighting();
            }
          });
    this.shaderSkyEnvironmentBlendCache =
      this.renderer === null
        ? null
        : createRendererQuantizedPmremBlendCache(this.renderer, {
            onTextureReady: () => {
              this.applyDayNightLighting();
            }
          });
    this.shaderSkyEnvironmentCache =
      this.renderer === null
        ? null
        : createRendererPrecomputedShaderSkyEnvironmentCache(
            this.renderer,
            this.worldBackgroundRenderer,
            {
              phaseBlendTextureResolver: this.shaderSkyEnvironmentBlendCache,
              captureSize: 32
            }
          );

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
      resolveThirdPersonTargetAssist: () =>
        this.resolveThirdPersonTargetAssist(),
      handleRuntimeTargetLookInput: (input) =>
        this.handleRuntimeTargetLookInput(input),
      handleRuntimeTargetLookBoundaryReached: () => {
        this.clearActiveRuntimeTarget();
        return false;
      },
      isCameraDrivenExternally: () =>
        this.resolveActiveRuntimeCameraRig() !== null ||
        this.resolveDialogueAttentionNpc() !== null,
      getCameraYawRadians: () => {
        this.camera.getWorldDirection(this.cameraForward);
        return Math.atan2(this.cameraForward.x, this.cameraForward.z);
      },
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
    this.domElement.addEventListener("wheel", this.handleRuntimeWheel, {
      passive: false
    });
    window.addEventListener("keydown", this.handleRuntimeKeyDown);
    window.addEventListener("keyup", this.handleRuntimeKeyUp);
    window.addEventListener("pointermove", this.handleRuntimePointerMove);
    window.addEventListener("pointerup", this.handleRuntimePointerUp);
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
    this.clearRuntimeTargetingState();
    this.setRuntimeDialogue(null);
    this.manualPauseActive = false;
    this.controlPauseActive = false;
    this.dialoguePauseActive = false;
    this.previousPauseInputActive = false;
    this.cameraRigLookDragging = false;
    this.cameraRigLookYawRadians = 0;
    this.cameraRigLookPitchRadians = 0;
    this.activeCameraSourceKey = null;
    this.activeRuntimeCameraRig = null;
    this.activeDialogueAttentionState = null;
    this.dialogueParticipantState = null;
    this.cameraTransitionState = null;
    this.resetRuntimeCameraCollisionSmoothing();
    this.suppressNextCameraSourceTransition = true;
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
    this.rebuildLightVolumes(runtimeScene.volumes.light);
    this.rebuildBrushMeshes(runtimeScene.brushes);
    this.rebuildTerrainMeshes(runtimeScene.terrains);
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
    this.environmentBlendCache?.clear();

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

    if (mode === "firstPerson") {
      this.clearRuntimeTargetingState();
    }

    if (this.runtimeScene === null || !this.sceneReady) {
      return;
    }

    this.activateDesiredNavigationController();
  }

  setActiveCameraRigOverride(entityId: string | null) {
    const nextEntityId = entityId === null ? null : entityId.trim() || null;

    if (this.activeCameraRigOverrideEntityId === nextEntityId) {
      return;
    }

    this.activeCameraRigOverrideEntityId = nextEntityId;
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
    this.clearRuntimeTargetingState();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.clearLocalLights();
    this.clearLightVolumes();
    this.clearBrushMeshes();
    this.clearTerrainMeshes();
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
    this.dialoguePauseActive = false;
    this.previousPauseInputActive = false;
    this.cameraRigLookDragging = false;
    this.cameraRigLookYawRadians = 0;
    this.cameraRigLookPitchRadians = 0;
    this.activeCameraSourceKey = null;
    this.activeRuntimeCameraRig = null;
    this.activeDialogueAttentionState = null;
    this.dialogueParticipantState = null;
    this.cameraTransitionState = null;
    this.resetRuntimeCameraCollisionSmoothing();
    this.suppressNextCameraSourceTransition = false;
    this.pressedKeys.clear();
    this.publishRuntimePauseState(true);
    if (this.renderer !== null) {
      this.renderer.autoClear = true;
    }

    for (const cachedTexture of this.materialTextureCache.values()) {
      disposeStarterMaterialTextureSet(cachedTexture.textureSet);
    }

    this.materialTextureCache.clear();
    this.environmentBlendCache?.dispose();
    this.shaderSkyEnvironmentBlendCache?.dispose();
    this.shaderSkyEnvironmentCache?.dispose();
    this.targetingLuxMesh.geometry.dispose();
    this.targetingLuxMesh.material.dispose();
    this.targetingLuxGlowMesh.geometry.dispose();
    this.targetingLuxGlowMesh.material.dispose();
    this.targetingActiveArrowGeometry.dispose();
    this.targetingActiveArrowMaterial.dispose();
    this.worldBackgroundRenderer.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
    this.domElement.removeEventListener("click", this.handleRuntimeClick);
    this.domElement.removeEventListener(
      "pointerdown",
      this.handleRuntimePointerDown
    );
    this.domElement.removeEventListener("wheel", this.handleRuntimeWheel);
    window.removeEventListener("keydown", this.handleRuntimeKeyDown);
    window.removeEventListener("keyup", this.handleRuntimeKeyUp);
    window.removeEventListener("pointermove", this.handleRuntimePointerMove);
    window.removeEventListener("pointerup", this.handleRuntimePointerUp);
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
    return (
      this.manualPauseActive ||
      this.controlPauseActive ||
      this.dialoguePauseActive
    );
  }

  private publishRuntimePauseState(force = false) {
    const pauseSources: RuntimePauseState["source"][] = [];

    if (this.manualPauseActive) {
      pauseSources.push("manual");
    }

    if (this.controlPauseActive) {
      pauseSources.push("control");
    }

    if (this.dialoguePauseActive) {
      pauseSources.push("dialogue");
    }

    const nextState: RuntimePauseState = {
      paused: this.isRuntimePaused(),
      source:
        pauseSources.length === 0
          ? null
          : pauseSources.length === 1
            ? pauseSources[0]
            : "mixed"
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

  private setDialoguePauseActive(paused: boolean) {
    if (this.dialoguePauseActive === paused) {
      return;
    }

    this.dialoguePauseActive = paused;
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
    if (nextController === this.firstPersonController) {
      this.clearRuntimeTargetingState();
    }
    this.activeController = nextController;
    this.activeController.activate(this.controllerContext);
  }

  private resolveRuntimeEntityPositionById(entityId: string) {
    if (this.runtimeScene === null) {
      return null;
    }

    const playerStart =
      this.runtimeScene.entities.playerStarts.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (playerStart !== null) {
      return playerStart.position;
    }

    const sceneEntry =
      this.runtimeScene.entities.sceneEntries.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (sceneEntry !== null) {
      return sceneEntry.position;
    }

    const npc =
      this.runtimeScene.npcDefinitions.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (npc !== null) {
      return npc.position;
    }

    const soundEmitter =
      this.runtimeScene.entities.soundEmitters.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (soundEmitter !== null) {
      return soundEmitter.position;
    }

    const triggerVolume =
      this.runtimeScene.entities.triggerVolumes.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (triggerVolume !== null) {
      return triggerVolume.position;
    }

    const teleportTarget =
      this.runtimeScene.entities.teleportTargets.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (teleportTarget !== null) {
      return teleportTarget.position;
    }

    const interactable =
      this.runtimeScene.entities.interactables.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (interactable !== null) {
      return interactable.position;
    }

    const pointLight =
      this.runtimeScene.localLights.pointLights.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (pointLight !== null) {
      return pointLight.position;
    }

    const spotLight =
      this.runtimeScene.localLights.spotLights.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (spotLight !== null) {
      return spotLight.position;
    }

    return null;
  }

  private resolveDialogueAttentionNpc() {
    if (this.runtimeScene === null || this.currentDialogue === null) {
      return null;
    }

    return (
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === this.currentDialogue?.npcEntityId
      ) ?? null
    );
  }

  private resolveDialogueAttentionPlayerFocusPoint() {
    if (this.runtimeScene === null) {
      return null;
    }

    const eyePosition = this.currentPlayerControllerTelemetry?.eyePosition ?? {
      x: this.runtimeScene.spawn.position.x,
      y:
        this.runtimeScene.spawn.position.y +
        this.runtimeScene.playerCollider.eyeHeight,
      z: this.runtimeScene.spawn.position.z
    };
    const feetPosition =
      this.currentPlayerControllerTelemetry?.feetPosition ??
      this.runtimeScene.spawn.position;

    return {
      x: feetPosition.x + (eyePosition.x - feetPosition.x) * 0.5,
      y:
        feetPosition.y +
        (eyePosition.y - feetPosition.y) *
          DIALOGUE_ATTENTION_PLAYER_FOCUS_HEIGHT_FACTOR,
      z: feetPosition.z + (eyePosition.z - feetPosition.z) * 0.5
    };
  }

  private resolveDialogueAttentionNpcFocusPoint(npc: RuntimeNpc) {
    return {
      x: npc.position.x,
      y:
        npc.position.y +
        npc.collider.eyeHeight * DIALOGUE_ATTENTION_NPC_FOCUS_HEIGHT_FACTOR,
      z: npc.position.z
    };
  }

  private resolveDialoguePlayerFeetPosition() {
    if (this.runtimeScene === null) {
      return null;
    }

    return (
      this.currentPlayerControllerTelemetry?.feetPosition ??
      this.runtimeScene.playerStart?.position ??
      this.runtimeScene.spawn.position
    );
  }

  private resolveDialoguePlayerYawDegrees() {
    if (this.currentPlayerControllerTelemetry !== null) {
      return this.currentPlayerControllerTelemetry.yawDegrees;
    }

    this.camera.getWorldDirection(this.cameraForward);
    return (
      (Math.atan2(this.cameraForward.x, this.cameraForward.z) * 180) / Math.PI
    );
  }

  private resolvePlayerShapeHorizontalRadius() {
    if (this.runtimeScene === null) {
      return 0;
    }

    const playerShape = this.runtimeScene.playerCollider;

    switch (playerShape.mode) {
      case "capsule":
        return playerShape.radius;
      case "box":
        return Math.max(playerShape.size.x, playerShape.size.z) * 0.5;
      case "none":
        return 0;
    }
  }

  private resolveNpcShapeHorizontalRadius(npc: RuntimeNpc) {
    switch (npc.collider.mode) {
      case "capsule":
        return npc.collider.radius;
      case "box":
        return Math.max(npc.collider.size.x, npc.collider.size.z) * 0.5;
      case "none":
        return 0;
    }
  }

  private resolveYawDegreesTowards(
    from: { x: number; z: number },
    to: { x: number; z: number }
  ) {
    return (Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI;
  }

  private resolveDialogueParticipantPlayerFeetPosition(
    state: RuntimeDialogueParticipantState
  ) {
    if (state.playerPositionBlendDurationSeconds <= 0) {
      return state.playerTargetFeetPosition;
    }

    const blendT = smoothStep01(
      state.playerPositionBlendElapsedSeconds /
        state.playerPositionBlendDurationSeconds
    );

    return {
      x: lerpScalar(
        state.playerStartFeetPosition.x,
        state.playerTargetFeetPosition.x,
        blendT
      ),
      y: lerpScalar(
        state.playerStartFeetPosition.y,
        state.playerTargetFeetPosition.y,
        blendT
      ),
      z: lerpScalar(
        state.playerStartFeetPosition.z,
        state.playerTargetFeetPosition.z,
        blendT
      )
    };
  }

  private isDialogueAttentionCameraReady(npcEntityId: string) {
    const state = this.dialogueParticipantState;

    if (state === null || state.npcEntityId !== npcEntityId) {
      return true;
    }

    return (
      state.playerPositionBlendDurationSeconds <= 0 ||
      state.playerPositionBlendElapsedSeconds >=
        state.playerPositionBlendDurationSeconds - 1e-4
    );
  }

  private resolveDialogueParticipantState(
    npc: RuntimeNpc
  ): RuntimeDialogueParticipantState | null {
    if (this.runtimeScene === null) {
      return null;
    }

    const playerFeetPosition = this.resolveDialoguePlayerFeetPosition();

    if (playerFeetPosition === null) {
      return null;
    }

    const currentPlayerYawDegrees = this.resolveDialoguePlayerYawDegrees();
    const minimumCenterDistance =
      this.resolvePlayerShapeHorizontalRadius() +
      this.resolveNpcShapeHorizontalRadius(npc) +
      DIALOGUE_PARTICIPANT_MIN_SURFACE_DISTANCE;
    const offsetX = playerFeetPosition.x - npc.position.x;
    const offsetZ = playerFeetPosition.z - npc.position.z;
    const currentHorizontalDistance = Math.hypot(offsetX, offsetZ);
    let directionX = offsetX;
    let directionZ = offsetZ;

    if (currentHorizontalDistance <= 1e-4) {
      const fallbackYawRadians = (npc.yawDegrees * Math.PI) / 180;
      directionX = -Math.sin(fallbackYawRadians);
      directionZ = -Math.cos(fallbackYawRadians);
    }

    const directionLength = Math.hypot(directionX, directionZ);
    const normalizedDirectionX =
      directionLength <= 1e-4 ? 0 : directionX / directionLength;
    const normalizedDirectionZ =
      directionLength <= 1e-4 ? -1 : directionZ / directionLength;
    const desiredHorizontalDistance = Math.max(
      currentHorizontalDistance,
      minimumCenterDistance
    );
    const desiredFeetPosition = {
      x: npc.position.x + normalizedDirectionX * desiredHorizontalDistance,
      y: playerFeetPosition.y,
      z: npc.position.z + normalizedDirectionZ * desiredHorizontalDistance
    };
    let targetFeetPosition = desiredFeetPosition;

    if (
      currentHorizontalDistance < desiredHorizontalDistance - 1e-4 &&
      this.collisionWorld !== null &&
      this.runtimeScene.playerCollider.mode !== "none"
    ) {
      for (let step = 1; step <= 8; step += 1) {
        const t = step / 8;
        const candidate = {
          x:
            playerFeetPosition.x +
            (desiredFeetPosition.x - playerFeetPosition.x) * t,
          y: playerFeetPosition.y,
          z:
            playerFeetPosition.z +
            (desiredFeetPosition.z - playerFeetPosition.z) * t
        };

        if (
          this.collisionWorld.canOccupyPlayerShape(
            candidate,
            this.runtimeScene.playerCollider
          )
        ) {
          targetFeetPosition = candidate;
        } else {
          break;
        }
      }
    }

    const playerTargetYawDegrees = this.resolveYawDegreesTowards(
      {
        x: targetFeetPosition.x,
        z: targetFeetPosition.z
      },
      {
        x: npc.position.x,
        z: npc.position.z
      }
    );
    const npcTargetYawDegrees = this.resolveYawDegreesTowards(
      {
        x: npc.position.x,
        z: npc.position.z
      },
      {
        x: targetFeetPosition.x,
        z: targetFeetPosition.z
      }
    );

    return {
      npcEntityId: npc.entityId,
      npcCurrentYawDegrees: npc.yawDegrees,
      npcTargetYawDegrees,
      npcRestoreYawDegrees: npc.yawDegrees,
      playerStartFeetPosition: {
        ...playerFeetPosition
      },
      playerTargetFeetPosition: targetFeetPosition,
      playerPositionBlendElapsedSeconds: 0,
      playerPositionBlendDurationSeconds:
        currentHorizontalDistance < desiredHorizontalDistance - 1e-4
          ? DIALOGUE_PARTICIPANT_PUSHBACK_DURATION_SECONDS
          : 0,
      playerCurrentYawDegrees: currentPlayerYawDegrees,
      playerTargetYawDegrees
    };
  }

  private syncNpcRenderGroupTransform(renderGroup: Group, npc: RuntimeNpc) {
    renderGroup.position.set(npc.position.x, npc.position.y, npc.position.z);
    const facingGroup = renderGroup.getObjectByName("npcFacingGroup");

    if (facingGroup !== undefined) {
      renderGroup.rotation.set(0, 0, 0);
      facingGroup.rotation.set(0, (npc.yawDegrees * Math.PI) / 180, 0);
      return;
    }

    renderGroup.rotation.set(0, (npc.yawDegrees * Math.PI) / 180, 0);
  }

  private setRuntimeNpcYawDegrees(entityId: string, yawDegrees: number) {
    if (this.runtimeScene === null) {
      return;
    }

    const npc =
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === entityId
      ) ?? null;

    if (npc === null) {
      return;
    }

    npc.yawDegrees = normalizeDegrees(yawDegrees);
    const renderGroup = this.modelRenderObjects.get(entityId);

    if (renderGroup !== undefined) {
      this.syncNpcRenderGroupTransform(renderGroup, npc);
    }
  }

  private updateRuntimeDialogueParticipants(dt: number) {
    if (this.runtimeScene === null || this.dialogueParticipantState === null) {
      return;
    }

    const state = this.dialogueParticipantState;
    const dialogueActive =
      this.currentDialogue !== null &&
      this.currentDialogue.npcEntityId === state.npcEntityId;
    const npc =
      this.runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === state.npcEntityId
      ) ?? null;

    if (npc === null) {
      this.dialogueParticipantState = null;
      return;
    }

    if (dialogueActive) {
      state.npcTargetYawDegrees = this.resolveYawDegreesTowards(
        {
          x: npc.position.x,
          z: npc.position.z
        },
        {
          x: state.playerTargetFeetPosition.x,
          z: state.playerTargetFeetPosition.z
        }
      );
      state.playerPositionBlendElapsedSeconds = Math.min(
        state.playerPositionBlendDurationSeconds,
        state.playerPositionBlendElapsedSeconds + dt
      );
      const playerFeetPosition =
        this.resolveDialogueParticipantPlayerFeetPosition(state);
      state.playerTargetYawDegrees = this.resolveYawDegreesTowards(
        {
          x: playerFeetPosition.x,
          z: playerFeetPosition.z
        },
        {
          x: npc.position.x,
          z: npc.position.z
        }
      );
      state.playerCurrentYawDegrees = dampAngleDegrees(
        state.playerCurrentYawDegrees,
        state.playerTargetYawDegrees,
        DIALOGUE_PARTICIPANT_YAW_BLEND_RATE,
        dt
      );
      state.npcCurrentYawDegrees = dampAngleDegrees(
        state.npcCurrentYawDegrees,
        state.npcTargetYawDegrees,
        DIALOGUE_PARTICIPANT_YAW_BLEND_RATE,
        dt
      );
      this.applyTeleportPlayerAction({
        position: playerFeetPosition,
        yawDegrees: state.playerCurrentYawDegrees
      });
      this.setRuntimeNpcYawDegrees(
        state.npcEntityId,
        state.npcCurrentYawDegrees
      );
      return;
    }

    state.npcCurrentYawDegrees = dampAngleDegrees(
      state.npcCurrentYawDegrees,
      state.npcRestoreYawDegrees,
      DIALOGUE_PARTICIPANT_YAW_BLEND_RATE,
      dt
    );
    this.setRuntimeNpcYawDegrees(state.npcEntityId, state.npcCurrentYawDegrees);

    if (
      Math.abs(
        resolveShortestAngleDeltaDegrees(
          state.npcCurrentYawDegrees,
          state.npcRestoreYawDegrees
        )
      ) <= DIALOGUE_PARTICIPANT_RESTORE_EPSILON_DEGREES
    ) {
      this.setRuntimeNpcYawDegrees(
        state.npcEntityId,
        state.npcRestoreYawDegrees
      );
      this.dialogueParticipantState = null;
    }
  }

  private resolveRuntimeCameraRigTargetPosition(rig: RuntimeCameraRig) {
    if (this.runtimeScene === null) {
      return null;
    }

    switch (rig.target.kind) {
      case "player":
        return (
          this.currentPlayerControllerTelemetry?.feetPosition ??
          this.runtimeScene.playerStart?.position ??
          this.runtimeScene.spawn.position
        );
      case "actor": {
        const target = rig.target;
        const activeNpc =
          this.runtimeScene.npcDefinitions.find(
            (candidate) =>
              candidate.actorId === target.actorId && candidate.active
          ) ??
          this.runtimeScene.npcDefinitions.find(
            (candidate) => candidate.actorId === target.actorId
          ) ??
          null;

        return activeNpc?.position ?? null;
      }
      case "entity":
        return this.resolveRuntimeEntityPositionById(rig.target.entityId);
      case "worldPoint":
        return rig.target.point;
    }
  }

  private resolveRuntimeCameraRigPosition(rig: RuntimeCameraRig) {
    if (this.runtimeScene === null) {
      return null;
    }

    switch (rig.rigType) {
      case "fixed":
        return rig.position;
      case "rail": {
        const path =
          this.runtimeScene.paths.find(
            (candidate) => candidate.id === rig.pathId
          ) ?? null;

        if (path === null) {
          return null;
        }

        const targetPosition = this.resolveRuntimeCameraRigTargetPosition(rig);

        if (targetPosition === null) {
          return null;
        }

        if (rig.railPlacementMode === "mapTargetBetweenPoints") {
          const mappedProgress = mapWorldPointToScenePathProgressBetweenPoints({
            point: targetPosition,
            trackStartPoint: rig.trackStartPoint,
            trackEndPoint: rig.trackEndPoint,
            railStartProgress: rig.railStartProgress,
            railEndProgress: rig.railEndProgress
          });

          return sampleResolvedScenePathPosition(
            path,
            mappedProgress.railProgress
          );
        }

        return resolveNearestPointOnResolvedScenePath(path, targetPosition)
          .position;
      }
    }
  }

  private resolveRuntimeCameraRigLookTarget(rig: RuntimeCameraRig) {
    const targetPosition = this.resolveRuntimeCameraRigTargetPosition(rig);

    if (targetPosition === null) {
      return null;
    }

    return {
      x: targetPosition.x + rig.targetOffset.x,
      y: targetPosition.y + rig.targetOffset.y,
      z: targetPosition.z + rig.targetOffset.z
    };
  }

  private resolveActiveRuntimeCameraRig() {
    if (this.runtimeScene === null) {
      return null;
    }

    const cameraRigs = this.runtimeScene.entities.cameraRigs;

    if (cameraRigs.length === 0) {
      return null;
    }

    if (this.activeCameraRigOverrideEntityId !== null) {
      return (
        cameraRigs.find(
          (candidate) =>
            candidate.entityId === this.activeCameraRigOverrideEntityId
        ) ?? null
      );
    }

    const eligibleCameraRigs = cameraRigs.filter(
      (candidate) => candidate.defaultActive
    );

    if (eligibleCameraRigs.length === 0) {
      return null;
    }

    return [...eligibleCameraRigs].sort(
      (left, right) =>
        right.priority - left.priority ||
        left.entityId.localeCompare(right.entityId)
    )[0]!;
  }

  private updateRuntimeCameraRigLookState(rig: RuntimeCameraRig, dt: number) {
    if (this.runtimeScene === null) {
      return;
    }

    if (rig.lookAround.enabled) {
      const lookInput = resolvePlayerStartLookInput(
        this.runtimeScene.playerInputBindings
      );

      if (lookInput.horizontal !== 0 || lookInput.vertical !== 0) {
        this.cameraRigLookYawRadians -=
          lookInput.horizontal * CAMERA_RIG_GAMEPAD_LOOK_SPEED * dt;
        this.cameraRigLookPitchRadians = clampScalar(
          this.cameraRigLookPitchRadians -
            lookInput.vertical * CAMERA_RIG_GAMEPAD_LOOK_SPEED * dt,
          (-rig.lookAround.pitchLimitDegrees * Math.PI) / 180,
          (rig.lookAround.pitchLimitDegrees * Math.PI) / 180
        );
      }

      this.cameraRigLookYawRadians = clampScalar(
        this.cameraRigLookYawRadians,
        (-rig.lookAround.yawLimitDegrees * Math.PI) / 180,
        (rig.lookAround.yawLimitDegrees * Math.PI) / 180
      );
    }

    const recenterRate =
      rig.lookAround.enabled && !this.cameraRigLookDragging
        ? rig.lookAround.recenterSpeed
        : rig.lookAround.enabled
          ? 0
          : Math.max(8, rig.lookAround.recenterSpeed);

    this.cameraRigLookYawRadians = dampScalar(
      this.cameraRigLookYawRadians,
      0,
      recenterRate,
      dt
    );
    this.cameraRigLookPitchRadians = dampScalar(
      this.cameraRigLookPitchRadians,
      0,
      recenterRate,
      dt
    );
  }

  private syncCameraRigTelemetryHooks() {
    const telemetry = this.currentPlayerControllerTelemetry;

    if (telemetry === null) {
      this.currentPlayerAudioHooks = null;
      return;
    }

    const cameraVolumeState = this.resolvePlayerVolumeState({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    });
    const cameraSubmerged =
      cameraVolumeState.inWater &&
      cameraVolumeState.waterSurfaceHeight !== null &&
      this.camera.position.y < cameraVolumeState.waterSurfaceHeight;
    const hooks = resolveRuntimePlayerMovementHooks({
      locomotionState: telemetry.locomotionState,
      inWaterVolume: telemetry.inWaterVolume,
      cameraSubmerged,
      signals: telemetry.signals
    });
    const nextTelemetry: PlayerControllerTelemetry = {
      ...telemetry,
      cameraSubmerged,
      hooks
    };

    this.currentPlayerControllerTelemetry = nextTelemetry;
    this.currentPlayerAudioHooks = hooks.audio;
    this.playerControllerTelemetryHandler?.(nextTelemetry);
  }

  private captureCurrentCameraPose(): RuntimeCameraPose {
    const position = this.camera.position.clone();
    const lookTarget = position
      .clone()
      .add(this.camera.getWorldDirection(this.cameraForward));

    return {
      position,
      lookTarget
    };
  }

  private resetRuntimeCameraCollisionSmoothing() {
    this.smoothedRuntimeCameraCollisionDistance = null;
  }

  private smoothRuntimeCameraCollisionPosition(
    pivot: { x: number; y: number; z: number },
    desiredPosition: Vector3,
    resolvedPosition: { x: number; y: number; z: number },
    dt: number
  ): Vector3 {
    this.cameraCollisionDirection.set(
      desiredPosition.x - pivot.x,
      desiredPosition.y - pivot.y,
      desiredPosition.z - pivot.z
    );

    const desiredDistance = this.cameraCollisionDirection.length();

    if (desiredDistance <= CAMERA_COLLISION_DISTANCE_EPSILON) {
      this.resetRuntimeCameraCollisionSmoothing();
      return new Vector3(
        resolvedPosition.x,
        resolvedPosition.y,
        resolvedPosition.z
      );
    }

    const resolvedDistance = Math.hypot(
      resolvedPosition.x - pivot.x,
      resolvedPosition.y - pivot.y,
      resolvedPosition.z - pivot.z
    );
    const previousDistance = this.smoothedRuntimeCameraCollisionDistance;
    const nextDistance =
      previousDistance === null ||
      dt <= 0 ||
      resolvedDistance < previousDistance
        ? resolvedDistance
        : dampScalar(
            previousDistance,
            resolvedDistance,
            CAMERA_COLLISION_RECOVERY_SPEED,
            dt
          );
    const clampedDistance = Math.min(
      Math.max(0, nextDistance),
      Math.min(resolvedDistance, desiredDistance)
    );

    this.smoothedRuntimeCameraCollisionDistance = clampedDistance;
    this.cameraCollisionDirection.normalize().multiplyScalar(clampedDistance);

    return new Vector3(
      pivot.x + this.cameraCollisionDirection.x,
      pivot.y + this.cameraCollisionDirection.y,
      pivot.z + this.cameraCollisionDirection.z
    );
  }

  private resolveCollisionAdjustedCameraPose(
    pose: RuntimeCameraPose,
    dt = 0
  ): RuntimeCameraPose {
    if (
      pose.collisionPivot === undefined ||
      pose.collisionPivot === null ||
      pose.collisionRadius === undefined ||
      pose.collisionRadius === null
    ) {
      this.resetRuntimeCameraCollisionSmoothing();
      return pose;
    }

    const resolvedPosition =
      this.collisionWorld?.resolveThirdPersonCameraCollision(
        {
          x: pose.collisionPivot.x,
          y: pose.collisionPivot.y,
          z: pose.collisionPivot.z
        },
        {
          x: pose.position.x,
          y: pose.position.y,
          z: pose.position.z
        },
        pose.collisionRadius
      );

    if (resolvedPosition === undefined) {
      this.resetRuntimeCameraCollisionSmoothing();
      return pose;
    }

    return {
      ...pose,
      position: this.smoothRuntimeCameraCollisionPosition(
        pose.collisionPivot,
        pose.position,
        resolvedPosition,
        dt
      )
    };
  }

  private applyCameraPose(pose: RuntimeCameraPose, dt = 0) {
    const resolvedPose = this.resolveCollisionAdjustedCameraPose(pose, dt);

    this.camera.position.copy(resolvedPose.position);
    this.camera.lookAt(resolvedPose.lookTarget);
  }

  private isActiveExternalCameraSource() {
    return (
      this.activeCameraSourceKey !== null &&
      this.activeCameraSourceKey !== "gameplay"
    );
  }

  private resolveRuntimeCameraRigPose(
    rig: RuntimeCameraRig,
    dt: number
  ): RuntimeCameraPose | null {
    const nextLookTarget = this.resolveRuntimeCameraRigLookTarget(rig);
    const nextPosition = this.resolveRuntimeCameraRigPosition(rig);

    if (nextLookTarget === null || nextPosition === null) {
      return null;
    }

    this.updateRuntimeCameraRigLookState(rig, dt);

    const authoredPosition = new Vector3(
      nextPosition.x,
      nextPosition.y,
      nextPosition.z
    );
    this.cameraRigLookTarget.set(
      nextLookTarget.x,
      nextLookTarget.y,
      nextLookTarget.z
    );
    this.cameraRigDirection
      .subVectors(this.cameraRigLookTarget, authoredPosition)
      .normalize();

    if (this.cameraRigDirection.lengthSq() <= 1e-8) {
      this.cameraRigDirection.set(0, 0, 1);
    }

    const baseYawRadians = Math.atan2(
      this.cameraRigDirection.x,
      this.cameraRigDirection.z
    );
    const basePitchRadians = Math.asin(
      clampScalar(this.cameraRigDirection.y, -1, 1)
    );
    const lookYawRadians = baseYawRadians + this.cameraRigLookYawRadians;
    const lookPitchRadians = clampScalar(
      basePitchRadians + this.cameraRigLookPitchRadians,
      -Math.PI * 0.49,
      Math.PI * 0.49
    );
    const lookDirection = new Vector3(
      Math.sin(lookYawRadians) * Math.cos(lookPitchRadians),
      Math.sin(lookPitchRadians),
      Math.cos(lookYawRadians) * Math.cos(lookPitchRadians)
    );

    return {
      position: authoredPosition,
      lookTarget: authoredPosition.clone().add(lookDirection)
    };
  }

  private createRuntimeCameraSourceKey(
    source: RuntimeResolvedCameraSource
  ): RuntimeCameraSourceKey {
    switch (source.kind) {
      case "gameplay":
        return "gameplay";
      case "rig":
        return `rig:${source.rig.entityId}`;
      case "dialogue":
        return `dialogue:${source.state.npcEntityId}`;
    }
  }

  private resolveDialogueAttentionCameraPose(
    referenceCameraPose: RuntimeCameraPose
  ): RuntimeCameraPose | null {
    const npc = this.resolveDialogueAttentionNpc();
    const playerFocusPoint = this.resolveDialogueAttentionPlayerFocusPoint();

    if (npc === null || playerFocusPoint === null) {
      return null;
    }

    const solution = resolveDialogueAttentionCameraSolution({
      playerFocusPoint,
      npcFocusPoint: this.resolveDialogueAttentionNpcFocusPoint(npc),
      referenceCameraPosition: {
        x: referenceCameraPose.position.x,
        y: referenceCameraPose.position.y,
        z: referenceCameraPose.position.z
      },
      referenceLookTarget: {
        x: referenceCameraPose.lookTarget.x,
        y: referenceCameraPose.lookTarget.y,
        z: referenceCameraPose.lookTarget.z
      },
      previousSideSign:
        this.activeDialogueAttentionState?.npcEntityId === npc.entityId
          ? this.activeDialogueAttentionState.sideSign
          : null,
      cameraVerticalFovRadians: (this.camera.fov * Math.PI) / 180,
      cameraAspect: this.camera.aspect
    });

    this.activeDialogueAttentionState = {
      npcEntityId: npc.entityId,
      sideSign: solution.sideSign
    };

    return {
      position: new Vector3(
        solution.position.x,
        solution.position.y,
        solution.position.z
      ),
      lookTarget: new Vector3(
        solution.lookTarget.x,
        solution.lookTarget.y,
        solution.lookTarget.z
      ),
      collisionPivot: new Vector3(
        solution.pivot.x,
        solution.pivot.y,
        solution.pivot.z
      ),
      collisionRadius: THIRD_PERSON_CAMERA_COLLISION_RADIUS
    };
  }

  private resolveActiveRuntimeCameraSource(): RuntimeResolvedCameraSource {
    const nextRig = this.resolveActiveRuntimeCameraRig();

    if (nextRig !== null) {
      return {
        kind: "rig",
        rig: nextRig
      };
    }

    const dialogueNpc = this.resolveDialogueAttentionNpc();

    if (dialogueNpc !== null) {
      if (!this.isDialogueAttentionCameraReady(dialogueNpc.entityId)) {
        return {
          kind: "gameplay"
        };
      }

      return {
        kind: "dialogue",
        state:
          this.activeDialogueAttentionState?.npcEntityId ===
          dialogueNpc.entityId
            ? this.activeDialogueAttentionState
            : {
                npcEntityId: dialogueNpc.entityId,
                sideSign: 1
              }
      };
    }

    return {
      kind: "gameplay"
    };
  }

  private resolveRuntimeCameraSourcePose(
    source: RuntimeResolvedCameraSource,
    dt: number,
    referenceCameraPose: RuntimeCameraPose
  ): RuntimeCameraPose | null {
    switch (source.kind) {
      case "gameplay":
        return this.captureCurrentCameraPose();
      case "rig":
        return this.resolveRuntimeCameraRigPose(source.rig, dt);
      case "dialogue":
        return this.resolveDialogueAttentionCameraPose(referenceCameraPose);
    }
  }

  private resolveRuntimeCameraTransitionSettings(
    previousSource: RuntimeResolvedCameraSource,
    nextSource: RuntimeResolvedCameraSource
  ) {
    if (this.suppressNextCameraSourceTransition) {
      return {
        mode: "cut" as const,
        durationSeconds: 0
      };
    }

    const transitionRig =
      nextSource.kind === "rig"
        ? nextSource.rig
        : previousSource.kind === "rig"
          ? previousSource.rig
          : null;

    if (transitionRig !== null) {
      return {
        mode: transitionRig.transitionMode,
        durationSeconds: transitionRig.transitionDurationSeconds
      };
    }

    if (previousSource.kind === "dialogue" || nextSource.kind === "dialogue") {
      return {
        mode: "blend" as const,
        durationSeconds: DIALOGUE_ATTENTION_CAMERA_TRANSITION_DURATION_SECONDS
      };
    }

    return {
      mode: "cut" as const,
      durationSeconds: 0
    };
  }

  private applyActiveCameraRig(
    dt: number,
    previousCameraPose: RuntimeCameraPose = this.captureCurrentCameraPose()
  ) {
    const previousSource: RuntimeResolvedCameraSource =
      this.activeRuntimeCameraRig !== null
        ? {
            kind: "rig",
            rig: this.activeRuntimeCameraRig
          }
        : this.activeCameraSourceKey !== null &&
            this.activeCameraSourceKey.startsWith("dialogue:") &&
            this.activeDialogueAttentionState !== null
          ? {
              kind: "dialogue",
              state: this.activeDialogueAttentionState
            }
          : {
              kind: "gameplay"
            };
    let nextSource = this.resolveActiveRuntimeCameraSource();
    let nextSourceKey = this.createRuntimeCameraSourceKey(nextSource);
    let sourceChanged = this.activeCameraSourceKey !== nextSourceKey;

    if (sourceChanged) {
      this.cameraRigLookDragging = false;
      this.cameraRigLookYawRadians = 0;
      this.cameraRigLookPitchRadians = 0;
      this.resetRuntimeCameraCollisionSmoothing();
    }

    let targetPose = this.resolveRuntimeCameraSourcePose(
      nextSource,
      dt,
      previousCameraPose
    );

    if (targetPose === null) {
      nextSource = {
        kind: "gameplay"
      };
      nextSourceKey = "gameplay";
      sourceChanged = this.activeCameraSourceKey !== nextSourceKey;
      this.cameraRigLookDragging = false;
      this.cameraRigLookYawRadians = dampScalar(
        this.cameraRigLookYawRadians,
        0,
        8,
        dt
      );
      this.cameraRigLookPitchRadians = dampScalar(
        this.cameraRigLookPitchRadians,
        0,
        8,
        dt
      );
      targetPose = this.captureCurrentCameraPose();
    }

    if (sourceChanged) {
      const transitionSettings = this.resolveRuntimeCameraTransitionSettings(
        previousSource,
        nextSource
      );

      if (
        transitionSettings.mode === "blend" &&
        transitionSettings.durationSeconds > 0
      ) {
        this.cameraTransitionState = {
          durationSeconds: transitionSettings.durationSeconds,
          elapsedSeconds: 0,
          fromPose: {
            position: previousCameraPose.position.clone(),
            lookTarget: previousCameraPose.lookTarget.clone(),
            collisionPivot: previousCameraPose.collisionPivot?.clone() ?? null,
            collisionRadius: previousCameraPose.collisionRadius ?? null
          },
          toPose: {
            position: targetPose.position.clone(),
            lookTarget: targetPose.lookTarget.clone(),
            collisionPivot: targetPose.collisionPivot?.clone() ?? null,
            collisionRadius: targetPose.collisionRadius ?? null
          },
          destinationSourceKey: nextSourceKey
        };
      } else {
        this.cameraTransitionState = null;
      }

      this.activeCameraSourceKey = nextSourceKey;
      this.suppressNextCameraSourceTransition = false;
    }

    this.activeRuntimeCameraRig =
      nextSource.kind === "rig" ? nextSource.rig : null;

    if (nextSource.kind === "gameplay" && this.currentDialogue === null) {
      this.activeDialogueAttentionState = null;
    }

    if (
      this.cameraTransitionState !== null &&
      this.cameraTransitionState.destinationSourceKey === nextSourceKey
    ) {
      this.cameraTransitionState.elapsedSeconds = Math.min(
        this.cameraTransitionState.durationSeconds,
        this.cameraTransitionState.elapsedSeconds + dt
      );
      this.cameraTransitionState.toPose.position.copy(targetPose.position);
      this.cameraTransitionState.toPose.lookTarget.copy(targetPose.lookTarget);
      this.cameraTransitionState.toPose.collisionPivot =
        targetPose.collisionPivot?.clone() ?? null;
      this.cameraTransitionState.toPose.collisionRadius =
        targetPose.collisionRadius ?? null;
      const blendT =
        this.cameraTransitionState.durationSeconds <= 0
          ? 1
          : this.cameraTransitionState.elapsedSeconds /
            this.cameraTransitionState.durationSeconds;
      const blendedPosition = this.cameraRigForward.lerpVectors(
        this.cameraTransitionState.fromPose.position,
        this.cameraTransitionState.toPose.position,
        blendT
      );
      const blendedLookTarget = this.cameraRigLookTarget.lerpVectors(
        this.cameraTransitionState.fromPose.lookTarget,
        this.cameraTransitionState.toPose.lookTarget,
        blendT
      );
      this.applyCameraPose(
        {
          position: blendedPosition.clone(),
          lookTarget: blendedLookTarget.clone(),
          collisionPivot:
            this.cameraTransitionState.toPose.collisionPivot?.clone() ?? null,
          collisionRadius:
            this.cameraTransitionState.toPose.collisionRadius ?? null
        },
        dt
      );

      if (blendT >= 1) {
        this.cameraTransitionState = null;
      }
    } else {
      this.cameraTransitionState = null;
      this.applyCameraPose(targetPose, dt);
    }

    if (nextSource.kind !== "gameplay") {
      this.syncCameraRigTelemetryHooks();
    }

    return this.activeRuntimeCameraRig;
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
    const celestialBodiesState = resolveWorldCelestialBodiesState(
      this.currentWorld.showCelestialBodies,
      resolvedWorld.sunLight,
      resolvedWorld.moonLight
    );
    const shaderSkyState = resolveWorldShaderSkyRenderState(
      this.currentWorld,
      resolvedWorld,
      resolvedTime,
      this.runtimeScene.time
    );
    if (this.currentWorld.background.mode === "shader") {
      this.shaderSkyEnvironmentCache?.syncPhaseTextures(
        resolveWorldShaderSkyEnvironmentPhaseStates(
          this.currentWorld,
          this.runtimeScene.time
        )
      );
    }

    this.worldBackgroundRenderer.update(
      resolvedWorld.background,
      backgroundTexture,
      backgroundOverlayState,
      celestialBodiesState,
      shaderSkyState
    );
    const environmentState = resolveWorldEnvironmentState(
      resolvedWorld.background,
      backgroundTexture,
      backgroundOverlayState,
      this.environmentBlendCache,
      shaderSkyState,
      this.shaderSkyEnvironmentCache
    );
    this.scene.background = null;
    this.scene.environment = environmentState.texture;
    this.scene.environmentIntensity = environmentState.intensity;

    this.ambientLight.color.set(resolvedWorld.ambientLight.colorHex);
    this.ambientLight.intensity = resolvedWorld.ambientLight.intensity;
    this.currentCelestialShadowCaster =
      resolveDominantCelestialShadowCaster(
        resolvedWorld.sunLight,
        resolvedWorld.moonLight
      )?.key ?? null;
    this.sunLight.color.set(resolvedWorld.sunLight.colorHex);
    this.sunLight.intensity = resolvedWorld.sunLight.intensity;
    this.sunLight.visible = resolvedWorld.sunLight.intensity > 1e-4;
    this.sunLight.position
      .set(
        resolvedWorld.sunLight.direction.x,
        resolvedWorld.sunLight.direction.y,
        resolvedWorld.sunLight.direction.z
      )
      .normalize()
      .multiplyScalar(18);
    this.sunLight.target.position.set(0, 0, 0);

    if (resolvedWorld.moonLight === null) {
      this.moonLight.visible = false;
      this.moonLight.intensity = 0;
      this.moonLight.target.position.set(0, 0, 0);
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
    this.moonLight.target.position.set(0, 0, 0);
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

    for (const mesh of this.brushMeshes.values()) {
      applyAdvancedRenderingRenderableShadowFlags(mesh, shadowsEnabled);
    }

    for (const mesh of this.terrainMeshes.values()) {
      applyAdvancedRenderingRenderableShadowFlags(mesh, shadowsEnabled);
    }

    for (const renderGroup of this.modelRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(renderGroup, shadowsEnabled);
    }

    this.syncCelestialShadowState();
  }

  private resolveRuntimeShadowFocusTarget() {
    const telemetry = this.currentPlayerControllerTelemetry;

    if (telemetry !== null) {
      return {
        center: {
          x: telemetry.feetPosition.x,
          y: (telemetry.feetPosition.y + telemetry.eyePosition.y) * 0.5,
          z: telemetry.feetPosition.z
        },
        radius: 8
      };
    }

    const sceneBounds = this.runtimeScene?.sceneBounds ?? null;

    if (sceneBounds !== null) {
      return {
        center: {
          x: sceneBounds.center.x,
          y: sceneBounds.center.y,
          z: sceneBounds.center.z
        },
        radius: Math.max(
          6,
          Math.hypot(
            sceneBounds.size.x,
            sceneBounds.size.y,
            sceneBounds.size.z
          ) * 0.2
        )
      };
    }

    return {
      center: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      radius: 8
    };
  }

  private syncCelestialShadowState() {
    if (this.currentWorld === null) {
      return;
    }

    const advancedRendering = this.currentWorld.advancedRendering;
    const shadowsEnabled =
      advancedRendering.enabled && advancedRendering.shadows.enabled;

    for (const renderObjects of this.localLightObjects.values()) {
      configureAdvancedRenderingShadowLight(
        renderObjects.light,
        advancedRendering,
        false
      );
    }

    for (const renderObjects of this.lightVolumeObjects.values()) {
      for (const light of renderObjects.lights) {
        configureAdvancedRenderingShadowLight(light, advancedRendering, false);
      }
    }

    if (!shadowsEnabled || this.currentCelestialShadowCaster === null) {
      configureAdvancedRenderingShadowLight(
        this.sunLight,
        advancedRendering,
        false
      );
      configureAdvancedRenderingShadowLight(
        this.moonLight,
        advancedRendering,
        false
      );
      return;
    }

    const activeLight =
      this.currentCelestialShadowCaster === "moon"
        ? this.moonLight
        : this.sunLight;
    const lightDirection = activeLight.position
      .clone()
      .sub(activeLight.target.position)
      .normalize();
    const fit = fitCelestialDirectionalShadow({
      activeCamera: this.camera,
      focusTarget: this.resolveRuntimeShadowFocusTarget(),
      lightDirection: {
        x: lightDirection.x,
        y: lightDirection.y,
        z: lightDirection.z
      },
      mapSize: advancedRendering.shadows.mapSize,
      sceneBounds: this.runtimeScene?.sceneBounds ?? null
    });

    if (fit === null) {
      configureAdvancedRenderingShadowLight(
        this.sunLight,
        advancedRendering,
        false
      );
      configureAdvancedRenderingShadowLight(
        this.moonLight,
        advancedRendering,
        false
      );
      return;
    }

    configureAdvancedRenderingShadowLight(
      this.sunLight,
      advancedRendering,
      this.currentCelestialShadowCaster === "sun",
      this.currentCelestialShadowCaster === "sun" ? fit.normalBias : 0
    );
    configureAdvancedRenderingShadowLight(
      this.moonLight,
      advancedRendering,
      this.currentCelestialShadowCaster === "moon",
      this.currentCelestialShadowCaster === "moon" ? fit.normalBias : 0
    );

    activeLight.position.set(
      fit.lightPosition.x,
      fit.lightPosition.y,
      fit.lightPosition.z
    );
    activeLight.target.position.set(
      fit.targetPosition.x,
      fit.targetPosition.y,
      fit.targetPosition.z
    );
    activeLight.updateMatrixWorld();
    activeLight.target.updateMatrixWorld();
    const shadowCamera = activeLight.shadow.camera as OrthographicCamera;
    shadowCamera.left = fit.cameraBounds.left;
    shadowCamera.right = fit.cameraBounds.right;
    shadowCamera.top = fit.cameraBounds.top;
    shadowCamera.bottom = fit.cameraBounds.bottom;
    shadowCamera.near = fit.cameraBounds.near;
    shadowCamera.far = fit.cameraBounds.far;
    shadowCamera.updateProjectionMatrix();
    activeLight.shadow.needsUpdate = true;
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

  private rebuildLightVolumes(
    lightVolumes: RuntimeSceneDefinition["volumes"]["light"]
  ) {
    this.clearLightVolumes();

    for (const lightVolume of lightVolumes) {
      const renderObjects = this.createLightVolumeRuntimeObjects(lightVolume);
      this.lightVolumeGroup.add(renderObjects.group);
      this.lightVolumeObjects.set(lightVolume.brushId, renderObjects);
    }
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
    enableObjectForAllRendererRenderCategories(group);

    return {
      group,
      light
    };
  }

  private createLightVolumeRuntimeObjects(
    lightVolume: RuntimeSceneDefinition["volumes"]["light"][number]
  ): LightVolumeRenderObjects {
    const group = new Group();
    const lights: PointLight[] = [];

    group.position.set(
      lightVolume.center.x,
      lightVolume.center.y,
      lightVolume.center.z
    );
    group.rotation.set(
      (lightVolume.rotationDegrees.x * Math.PI) / 180,
      (lightVolume.rotationDegrees.y * Math.PI) / 180,
      (lightVolume.rotationDegrees.z * Math.PI) / 180
    );
    group.visible = lightVolume.enabled;

    for (const derivedLight of lightVolume.lights) {
      const light = new PointLight(
        lightVolume.colorHex,
        derivedLight.intensity,
        derivedLight.distance,
        derivedLight.decay
      );
      light.castShadow = false;
      light.shadow.autoUpdate = false;
      light.position.set(
        derivedLight.localPosition.x,
        derivedLight.localPosition.y,
        derivedLight.localPosition.z
      );
      group.add(light);
      lights.push(light);
    }
    enableObjectForAllRendererRenderCategories(group);

    return {
      group,
      lights
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
    enableObjectForAllRendererRenderCategories(group);

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
      case "cameraRigOverride":
        this.applyCameraRigOverrideControl(state.entityId);
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
    const light = lights.find(
      (candidate) => candidate.entityId === target.entityId
    );

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

  private applyLightColorControl(
    target: LightControlTargetRef,
    colorHex: string
  ) {
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

  private applyCameraRigOverrideControl(entityId: string | null) {
    this.setActiveCameraRigOverride(entityId);
  }

  private applyControlEffect(
    effect: ControlEffect,
    link: InteractionLink | null = null
  ) {
    switch (effect.type) {
      case "setProjectTimePaused":
        this.applyProjectTimePausedControl(effect.paused);
        break;
      case "activateCameraRigOverride":
        this.applyCameraRigOverrideControl(effect.target.entityId);
        break;
      case "clearCameraRigOverride":
        this.applyCameraRigOverrideControl(null);
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
      applyRendererRenderCategoryFromMaterial(mesh);
      this.brushGroup.add(mesh);
      this.brushMeshes.set(brush.id, mesh);
    }

    this.applyShadowState();
  }

  private rebuildTerrainMeshes(terrains: RuntimeTerrain[]) {
    this.clearTerrainMeshes();

    for (const terrain of terrains) {
      const geometry = buildTerrainDerivedMeshData({
        ...terrain,
        kind: "terrain",
        enabled: true
      }).geometry;
      const mesh = new Mesh(
        geometry,
        this.createRuntimeTerrainMaterial(terrain)
      );

      mesh.position.set(
        terrain.position.x,
        terrain.position.y,
        terrain.position.z
      );
      mesh.visible = terrain.visible;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      applyRendererRenderCategory(mesh, "ao-world");
      this.terrainGroup.add(mesh);
      this.terrainMeshes.set(terrain.id, mesh);
    }

    this.applyShadowState();
  }

  private createRuntimeTerrainMaterial(terrain: RuntimeTerrain): Material {
    const layerTextures = terrain.layers.map((layer) =>
      getTerrainLayerTexture(
        layer.material,
        (material) => this.getOrCreateTextureSet(material).baseColor
      )
    ) as [Texture, Texture, Texture, Texture];

    return createTerrainLayerBlendMaterial({
      layerTextures
    });
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
    facingGroup.name = "npcFacingGroup";
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
      applyRendererRenderCategoryFromMaterial(renderGroup);
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
      applyRendererRenderCategoryFromMaterial(renderGroup);
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
        opacity: isTopFace
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

    if (brush.volume.mode === "light") {
      const lightMaterial = new MeshBasicMaterial({
        color: brush.volume.light.colorHex,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      lightMaterial.colorWrite = false;
      return lightMaterial;
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
    const cameraVolumeState = this.resolvePlayerVolumeState({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    });
    const fogTelemetry = this.isActiveExternalCameraSource()
      ? {
          cameraSubmerged:
            cameraVolumeState.inWater &&
            cameraVolumeState.waterSurfaceHeight !== null &&
            this.camera.position.y < cameraVolumeState.waterSurfaceHeight,
          eyePosition: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
          }
        }
      : this.activeController === this.firstPersonController
        ? this.currentPlayerControllerTelemetry
        : null;
    const fogState = resolveUnderwaterFogState(this.runtimeScene, fogTelemetry);

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

  private clearLightVolumes() {
    for (const renderObjects of this.lightVolumeObjects.values()) {
      this.lightVolumeGroup.remove(renderObjects.group);
    }

    this.lightVolumeObjects.clear();
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

  private clearTerrainMeshes() {
    for (const mesh of this.terrainMeshes.values()) {
      this.terrainGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    this.terrainMeshes.clear();
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
    }

    return null;
  }

  private collectRuntimeStaticWaterContactPatches(
    brush: RuntimeBoxBrushInstance
  ): ReturnType<typeof collectWaterContactPatches> {
    const contactBounds: Parameters<typeof collectWaterContactPatches>[1] = [];

    if (this.runtimeScene === null) {
      return [];
    }

    for (const terrain of this.runtimeScene.terrains) {
      if (!terrain.visible) {
        continue;
      }

      const derivedMesh = buildTerrainDerivedMeshData({
        ...terrain,
        kind: "terrain",
        enabled: true
      });

      contactBounds.push({
        kind: "triangleMesh",
        vertices: derivedMesh.positions,
        indices: derivedMesh.indices,
        mergeProfile: "aggressive",
        transform: {
          position: terrain.position,
          rotationDegrees: {
            x: 0,
            y: 0,
            z: 0
          },
          scale: {
            x: 1,
            y: 1,
            z: 1
          }
        }
      });
    }

    for (const collider of this.runtimeScene.colliders) {
      if (collider.source === "terrain") {
        continue;
      }

      if (collider.kind === "trimesh" && collider.source === "brush") {
        if (collider.brushId === brush.id) {
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
    this.updateRuntimeTargetingInputState();
    const simulationDt = this.isRuntimePaused() ? 0 : dt;
    const cameraDt = dt;
    const previousCameraPose = this.captureCurrentCameraPose();

    this.updateRuntimeDialogueParticipants(cameraDt);
    this.refreshRuntimeTargetingState();
    this.activeController?.update(simulationDt);
    this.refreshRuntimeTargetingState();
    this.updateActiveRuntimeTargetLockState(cameraDt);
    const activeCameraRig = this.applyActiveCameraRig(
      cameraDt,
      previousCameraPose
    );
    this.updateRuntimeTargetingVisuals(cameraDt);

    if (!this.isActiveExternalCameraSource() && activeCameraRig === null) {
      this.applyPlayerCameraEffects(simulationDt);
    } else {
      this.resetPlayerCameraEffects();
    }

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
    this.syncCelestialShadowState();

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

  private applyTeleportPlayerAction(target: {
    position: RuntimeTeleportTarget["position"];
    yawDegrees: number;
  }) {
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
        this.syncNpcRenderGroupTransform(renderGroup, npc);
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
        this.runtimeScene.brushes.find(
          (candidate) => candidate.id === brushId
        ) ?? null;

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
    const explicitVisible = mode === "toggle" ? undefined : mode === "show";

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

    const dialogue = npc.dialogues.find(
      (candidate) => candidate.id === dialogueId
    );

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
      speakerName: npc.actorId,
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

    if (
      dialogue !== null &&
      this.activeDialogueAttentionState?.npcEntityId !== dialogue.npcEntityId
    ) {
      this.activeDialogueAttentionState = null;
    }

    if (
      dialogue !== null &&
      this.dialogueParticipantState?.npcEntityId !== dialogue.npcEntityId
    ) {
      this.dialogueParticipantState = null;
    }

    this.currentDialogue = dialogue;
    this.setDialoguePauseActive(dialogue !== null);
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
      dialogueId ?? npc.defaultDialogueId ?? npc.dialogues[0]?.id ?? null;

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

    this.dialogueParticipantState = this.resolveDialogueParticipantState(npc);
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
    const interactionReachMeters =
      this.runtimeScene.playerStart?.interactionReachMeters ??
      DEFAULT_PLAYER_START_INTERACTION_REACH_METERS;
    const interactionAngleDegrees =
      this.runtimeScene.playerStart?.interactionAngleDegrees ??
      DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES;
    const horizontalViewLengthSquared =
      this.cameraForward.x * this.cameraForward.x +
      this.cameraForward.z * this.cameraForward.z;
    const interactionViewDirection =
      horizontalViewLengthSquared > Number.EPSILON
        ? {
            x: this.cameraForward.x,
            y: 0,
            z: this.cameraForward.z
          }
        : {
            x:
              Math.sin(
                (this.currentPlayerControllerTelemetry.yawDegrees * Math.PI) /
                  180
              ),
            y: 0,
            z:
              Math.cos(
                (this.currentPlayerControllerTelemetry.yawDegrees * Math.PI) /
                  180
              )
          };

    return this.interactionSystem.resolveClickInteractionPrompt(
      interactionOrigin,
      interactionViewDirection,
      interactionReachMeters,
      interactionAngleDegrees,
      this.runtimeScene
    );
  }

  private clearRuntimeTargetingState() {
    this.runtimeTargetCandidates = [];
    this.proposedRuntimeTarget = null;
    this.activeRuntimeTargetReference = null;
    this.activeRuntimeTargetOcclusionSeconds = 0;
    this.runtimeTargetSwitchInputHeld = false;
    this.previousTargetCycleInputActive = false;
    this.targetingLuxInitialized = false;
    this.targetingLuxFlightState = "hidden";
    this.targetingVisualTime = 0;
    this.targetingVisualGroup.visible = false;
    this.targetingLuxGroup.visible = false;
    this.targetingActiveGroup.visible = false;
  }

  private resolveActiveRuntimeTarget(): RuntimeResolvedTarget | null {
    if (
      this.runtimeScene === null ||
      this.activeRuntimeTargetReference === null
    ) {
      return null;
    }

    return resolveRuntimeTargetReference(
      this.runtimeScene,
      this.activeRuntimeTargetReference
    );
  }

  private setActiveRuntimeTargetReference(
    reference: RuntimeTargetReference | null
  ) {
    this.activeRuntimeTargetReference = reference;
    this.activeRuntimeTargetOcclusionSeconds = 0;
    this.runtimeTargetSwitchInputHeld = false;
  }

  private resolveRuntimeTargetVisibilityClearance(target: {
    kind?: string;
    entityId?: string;
    range: number;
  }): number {
    if (this.runtimeScene !== null && target.kind === "npc") {
      const npc =
        this.runtimeScene.entities.npcs.find(
          (candidate) => candidate.entityId === target.entityId
        ) ?? null;

      if (npc !== null) {
        switch (npc.collider.mode) {
          case "capsule":
            return (
              Math.max(
                npc.collider.radius,
                TARGETING_VISIBILITY_TARGET_CLEARANCE
              ) + TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING
            );
          case "box":
            return (
              clampScalar(
                Math.max(
                  npc.collider.size.x,
                  npc.collider.size.y,
                  npc.collider.size.z
                ) * 0.25,
                0.35,
                0.75
              ) + TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING
            );
          case "none":
            return 0.9 + TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING;
        }
      }
    }

    if (this.runtimeScene !== null && target.kind === "interactable") {
      const interactable =
        this.runtimeScene.entities.interactables.find(
          (candidate) => candidate.entityId === target.entityId
        ) ?? null;

      if (interactable !== null) {
        return clampScalar(interactable.radius * 0.5, 0.25, 0.9);
      }
    }

    return Math.max(
      TARGETING_VISIBILITY_TARGET_CLEARANCE,
      clampScalar(target.range * 0.5, 0.25, 0.9)
    );
  }

  private resolveRuntimeTargetVisibilitySamples(target: {
    kind?: string;
    entityId?: string;
    center: { x: number; y: number; z: number };
    range: number;
  }): Array<{
    point: { x: number; y: number; z: number };
    targetClearance: number;
  }> {
    const targetClearance =
      this.resolveRuntimeTargetVisibilityClearance(target);

    if (this.runtimeScene !== null && target.kind === "npc") {
      const npc =
        this.runtimeScene.entities.npcs.find(
          (candidate) => candidate.entityId === target.entityId
        ) ?? null;

      if (npc !== null) {
        switch (npc.collider.mode) {
          case "capsule": {
            const collider = npc.collider;
            const sampleClearance =
              Math.max(collider.radius, TARGETING_VISIBILITY_TARGET_CLEARANCE) +
              TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING;
            const yAt = (factor: number) =>
              npc.position.y + collider.height * factor;

            return [
              {
                point: { x: npc.position.x, y: yAt(0.82), z: npc.position.z },
                targetClearance: sampleClearance
              },
              {
                point: { x: npc.position.x, y: yAt(0.62), z: npc.position.z },
                targetClearance: sampleClearance
              },
              { point: target.center, targetClearance: sampleClearance },
              {
                point: { x: npc.position.x, y: yAt(0.38), z: npc.position.z },
                targetClearance: sampleClearance
              }
            ];
          }
          case "box": {
            const collider = npc.collider;
            const sampleClearance =
              clampScalar(
                Math.max(collider.size.x, collider.size.y, collider.size.z) *
                  0.25,
                0.35,
                0.75
              ) + TARGETING_VISIBILITY_TARGET_CLEARANCE_PADDING;
            const yAt = (factor: number) =>
              npc.position.y + collider.size.y * factor;

            return [
              {
                point: { x: npc.position.x, y: yAt(0.82), z: npc.position.z },
                targetClearance: sampleClearance
              },
              {
                point: { x: npc.position.x, y: yAt(0.62), z: npc.position.z },
                targetClearance: sampleClearance
              },
              { point: target.center, targetClearance: sampleClearance },
              {
                point: { x: npc.position.x, y: yAt(0.38), z: npc.position.z },
                targetClearance: sampleClearance
              }
            ];
          }
          case "none":
            return [
              {
                point: {
                  x: npc.position.x,
                  y: npc.position.y + 1.45,
                  z: npc.position.z
                },
                targetClearance
              },
              { point: target.center, targetClearance },
              {
                point: {
                  x: npc.position.x,
                  y: npc.position.y + 0.65,
                  z: npc.position.z
                },
                targetClearance
              }
            ];
        }
      }
    }

    return [{ point: target.center, targetClearance }];
  }

  private isRuntimeTargetVisibleFrom(
    origin: { x: number; y: number; z: number },
    target: {
      kind?: string;
      entityId?: string;
      center: { x: number; y: number; z: number };
      range: number;
    }
  ): boolean {
    if (this.collisionWorld === null) {
      return true;
    }

    const collisionWorld = this.collisionWorld;

    return this.resolveRuntimeTargetVisibilitySamples(target).some((sample) =>
      collisionWorld.isLineSegmentClear(origin, sample.point, {
        targetClearance: sample.targetClearance
      })
    );
  }

  private isRuntimeTargetCameraVisible(target: {
    kind?: string;
    entityId?: string;
    center: { x: number; y: number; z: number };
    range: number;
  }): boolean {
    return this.isRuntimeTargetVisibleFrom(
      {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target
    );
  }

  private isRuntimeTargetPlayerVisible(target: {
    kind?: string;
    entityId?: string;
    center: { x: number; y: number; z: number };
    range: number;
  }): boolean {
    const playerEyePosition =
      this.currentPlayerControllerTelemetry?.eyePosition;

    if (playerEyePosition === undefined) {
      return false;
    }

    return this.isRuntimeTargetVisibleFrom(playerEyePosition, target);
  }

  private refreshRuntimeTargetingState() {
    if (
      this.runtimeScene === null ||
      this.currentPlayerControllerTelemetry === null ||
      !this.sceneReady ||
      this.activeController !== this.thirdPersonController
    ) {
      if (this.activeController === this.firstPersonController) {
        this.clearRuntimeTargetingState();
      } else {
        this.runtimeTargetCandidates = [];
        this.proposedRuntimeTarget = null;
      }
      return;
    }

    if (this.currentDialogue !== null) {
      this.runtimeTargetCandidates = [];
      this.proposedRuntimeTarget = null;
      return;
    }

    this.camera.getWorldDirection(this.cameraForward);

    const previousProposedId = this.proposedRuntimeTarget?.entityId ?? null;
    this.runtimeTargetCandidates = resolveRuntimeTargetCandidates({
      interactionOrigin: this.currentPlayerControllerTelemetry.eyePosition,
      cameraPosition: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      cameraForward: {
        x: this.cameraForward.x,
        y: this.cameraForward.y,
        z: this.cameraForward.z
      },
      runtimeScene: this.runtimeScene,
      previousProposedTargetEntityId: previousProposedId
    }).filter((candidate) => this.isRuntimeTargetCameraVisible(candidate));

    if (
      this.activeRuntimeTargetReference !== null &&
      this.resolveActiveRuntimeTarget() === null
    ) {
      this.setActiveRuntimeTargetReference(null);
    }

    this.proposedRuntimeTarget =
      this.resolveRuntimeTargetCandidateNearestScreenCenter({
        requirePlayerVisibility: true
      }) ??
      this.runtimeTargetCandidates.find((candidate) =>
        this.isRuntimeTargetPlayerVisible(candidate)
      ) ??
      null;
  }

  private activateOrCycleRuntimeTarget() {
    if (
      this.runtimeScene === null ||
      !this.sceneReady ||
      this.activeController !== this.thirdPersonController ||
      this.currentDialogue !== null
    ) {
      if (this.activeController === this.firstPersonController) {
        this.clearRuntimeTargetingState();
      }
      return;
    }

    if (this.activeRuntimeTargetReference !== null) {
      this.clearActiveRuntimeTarget();
      return;
    }

    const nextTarget =
      this.proposedRuntimeTarget ??
      this.resolveRuntimeTargetCandidateNearestScreenCenter({
        requirePlayerVisibility: true
      });

    if (nextTarget !== null) {
      this.setActiveRuntimeTargetReference({
        kind: nextTarget.kind,
        entityId: nextTarget.entityId
      });
    }
  }

  private clearActiveRuntimeTarget() {
    this.setActiveRuntimeTargetReference(null);
  }

  private createRuntimeTargetLookInputResult(
    result: Partial<RuntimeTargetLookInputResult> = {}
  ): RuntimeTargetLookInputResult {
    return {
      activeTargetLocked: result.activeTargetLocked ?? false,
      switchedTarget: result.switchedTarget ?? false,
      switchInputHeld: result.switchInputHeld ?? false
    };
  }

  private handleRuntimeTargetLookInput(
    input: RuntimeTargetLookInput
  ): RuntimeTargetLookInputResult {
    const activeTarget = this.resolveActiveRuntimeTarget();

    if (activeTarget === null) {
      if (this.activeRuntimeTargetReference !== null) {
        this.setActiveRuntimeTargetReference(null);
      }
      this.runtimeTargetSwitchInputHeld = false;
      return this.createRuntimeTargetLookInputResult();
    }

    const inputMagnitude = Math.hypot(input.horizontal, input.vertical);

    if (inputMagnitude <= Number.EPSILON) {
      this.runtimeTargetSwitchInputHeld = false;
      return this.createRuntimeTargetLookInputResult({
        activeTargetLocked: true
      });
    }

    if (
      this.runtimeTargetSwitchInputHeld ||
      inputMagnitude < TARGETING_DIRECTION_SWITCH_INPUT_THRESHOLD
    ) {
      if (inputMagnitude < TARGETING_DIRECTION_SWITCH_INPUT_THRESHOLD) {
        this.runtimeTargetSwitchInputHeld = false;
      }

      return this.createRuntimeTargetLookInputResult({
        activeTargetLocked: true,
        switchInputHeld: this.runtimeTargetSwitchInputHeld
      });
    }

    const directionalTarget = this.resolveRuntimeTargetCandidateInLookDirection(
      activeTarget,
      input
    );

    if (directionalTarget !== null) {
      this.setActiveRuntimeTargetReference({
        kind: directionalTarget.kind,
        entityId: directionalTarget.entityId
      });
      this.runtimeTargetSwitchInputHeld = true;
      this.proposedRuntimeTarget = directionalTarget;

      return this.createRuntimeTargetLookInputResult({
        activeTargetLocked: true,
        switchedTarget: true,
        switchInputHeld: true
      });
    }

    return this.createRuntimeTargetLookInputResult({
      activeTargetLocked: true
    });
  }

  private resolveRuntimeTargetScreenPoint(point: {
    x: number;
    y: number;
    z: number;
  }) {
    const projected = new Vector3(point.x, point.y, point.z).project(
      this.camera
    );

    if (
      !Number.isFinite(projected.x) ||
      !Number.isFinite(projected.y) ||
      !Number.isFinite(projected.z) ||
      projected.z < -1 ||
      projected.z > 1
    ) {
      return null;
    }

    return {
      x: projected.x,
      y: projected.y
    };
  }

  private resolveRuntimeTargetCandidateInLookDirection(
    activeTarget: RuntimeResolvedTarget,
    input: RuntimeTargetLookInput
  ): RuntimeTargetCandidate | null {
    const inputLength = Math.hypot(input.horizontal, input.vertical);

    if (inputLength <= Number.EPSILON) {
      return null;
    }

    const activeScreenPoint = this.resolveRuntimeTargetScreenPoint(
      activeTarget.center
    );

    if (activeScreenPoint === null) {
      return null;
    }

    let bestCandidate: RuntimeTargetCandidate | null = null;
    let bestAlignment = TARGETING_SCREEN_SWITCH_MIN_ALIGNMENT;
    let bestScreenDistance = 0;
    const inputX = input.horizontal / inputLength;
    const inputY = input.vertical / inputLength;

    for (const candidate of this.runtimeTargetCandidates) {
      if (candidate.entityId === activeTarget.entityId) {
        continue;
      }

      const candidateScreenPoint = this.resolveRuntimeTargetScreenPoint(
        candidate.center
      );

      if (
        candidateScreenPoint === null ||
        Math.abs(candidateScreenPoint.x) > TARGETING_SCREEN_SWITCH_MAX_ABS_X ||
        Math.abs(candidateScreenPoint.y) > TARGETING_SCREEN_SWITCH_MAX_ABS_Y
      ) {
        continue;
      }

      const screenDeltaX = candidateScreenPoint.x - activeScreenPoint.x;
      const screenDeltaY = candidateScreenPoint.y - activeScreenPoint.y;
      const screenDistance = Math.hypot(screenDeltaX, screenDeltaY);

      if (screenDistance < TARGETING_SCREEN_SWITCH_MIN_DISTANCE) {
        continue;
      }

      const alignment =
        (screenDeltaX / screenDistance) * inputX +
        (screenDeltaY / screenDistance) * inputY;

      if (alignment < TARGETING_SCREEN_SWITCH_MIN_ALIGNMENT) {
        continue;
      }

      if (
        bestCandidate === null ||
        alignment > bestAlignment ||
        (alignment === bestAlignment && screenDistance > bestScreenDistance) ||
        (alignment === bestAlignment &&
          screenDistance === bestScreenDistance &&
          candidate.score > bestCandidate.score)
      ) {
        bestCandidate = candidate;
        bestAlignment = alignment;
        bestScreenDistance = screenDistance;
      }
    }

    return bestCandidate;
  }

  private resolveRuntimeTargetCandidateNearestScreenCenter(
    options: {
      exclude?: RuntimeTargetReference | null;
      maxDistanceFromPlayer?: number;
      requirePlayerVisibility?: boolean;
    } = {}
  ): RuntimeTargetCandidate | null {
    const exclude = options.exclude ?? null;
    const maxDistanceFromPlayer = options.maxDistanceFromPlayer ?? null;
    const requirePlayerVisibility = options.requirePlayerVisibility ?? false;
    const playerEyePosition =
      maxDistanceFromPlayer === null && !requirePlayerVisibility
        ? null
        : (this.currentPlayerControllerTelemetry?.eyePosition ?? null);
    let bestCandidate: RuntimeTargetCandidate | null = null;
    let bestScreenDistanceSquared = Number.POSITIVE_INFINITY;

    for (const candidate of this.runtimeTargetCandidates) {
      if (
        exclude !== null &&
        candidate.kind === exclude.kind &&
        candidate.entityId === exclude.entityId
      ) {
        continue;
      }

      if (
        maxDistanceFromPlayer !== null &&
        playerEyePosition !== null &&
        distanceBetweenPoints(playerEyePosition, candidate.center) >
          maxDistanceFromPlayer
      ) {
        continue;
      }

      if (
        requirePlayerVisibility &&
        (playerEyePosition === null ||
          !this.isRuntimeTargetVisibleFrom(playerEyePosition, candidate))
      ) {
        continue;
      }

      const screenPoint = this.resolveRuntimeTargetScreenPoint(
        candidate.center
      );

      if (
        screenPoint === null ||
        Math.abs(screenPoint.x) > TARGETING_SCREEN_PROPOSAL_MAX_ABS_X ||
        Math.abs(screenPoint.y) > TARGETING_SCREEN_PROPOSAL_MAX_ABS_Y
      ) {
        continue;
      }

      const screenDistanceSquared =
        screenPoint.x * screenPoint.x +
        (screenPoint.y - TARGETING_SCREEN_PROPOSAL_FOCUS_Y) *
          (screenPoint.y - TARGETING_SCREEN_PROPOSAL_FOCUS_Y);

      if (
        bestCandidate === null ||
        screenDistanceSquared < bestScreenDistanceSquared ||
        (screenDistanceSquared === bestScreenDistanceSquared &&
          candidate.score > bestCandidate.score)
      ) {
        bestCandidate = candidate;
        bestScreenDistanceSquared = screenDistanceSquared;
      }
    }

    return bestCandidate;
  }

  private retargetOrClearActiveRuntimeTarget(): boolean {
    if (this.activeRuntimeTargetReference === null) {
      return false;
    }

    const replacementTarget =
      this.resolveRuntimeTargetCandidateNearestScreenCenter({
        exclude: this.activeRuntimeTargetReference,
        maxDistanceFromPlayer: TARGETING_AUTO_RETARGET_SAFE_DISTANCE,
        requirePlayerVisibility: true
      });

    if (replacementTarget !== null) {
      this.setActiveRuntimeTargetReference({
        kind: replacementTarget.kind,
        entityId: replacementTarget.entityId
      });
      this.proposedRuntimeTarget = replacementTarget;
      return true;
    }

    this.setActiveRuntimeTargetReference(null);
    return false;
  }

  private updateActiveRuntimeTargetLockState(dt = 0) {
    if (
      this.activeRuntimeTargetReference === null ||
      this.currentPlayerControllerTelemetry === null ||
      this.activeController !== this.thirdPersonController
    ) {
      return;
    }

    const activeTarget = this.resolveActiveRuntimeTarget();

    if (activeTarget === null) {
      this.setActiveRuntimeTargetReference(null);
      return;
    }

    if (
      distanceBetweenPoints(
        this.currentPlayerControllerTelemetry.eyePosition,
        activeTarget.center
      ) > TARGETING_ACTIVE_TARGET_RELEASE_DISTANCE
    ) {
      this.retargetOrClearActiveRuntimeTarget();
      return;
    }

    if (this.isRuntimeTargetCameraVisible(activeTarget)) {
      this.activeRuntimeTargetOcclusionSeconds = 0;
    } else {
      this.activeRuntimeTargetOcclusionSeconds += Math.max(0, dt);

      if (
        this.activeRuntimeTargetOcclusionSeconds >=
        TARGETING_ACTIVE_OCCLUSION_GRACE_SECONDS
      ) {
        this.setActiveRuntimeTargetReference(null);
        return;
      }
    }
  }

  private updateRuntimeTargetingInputState() {
    if (this.runtimeScene === null || !this.sceneReady) {
      this.previousTargetCycleInputActive = false;
      return;
    }

    const targetInputActive = resolveDefaultTargetCycleInput() >= 0.5;

    if (targetInputActive && !this.previousTargetCycleInputActive) {
      this.activateOrCycleRuntimeTarget();
    }

    this.previousTargetCycleInputActive = targetInputActive;
  }

  private resolveThirdPersonTargetAssist() {
    if (
      this.runtimeScene === null ||
      this.activeController !== this.thirdPersonController ||
      this.currentDialogue !== null ||
      this.resolveActiveRuntimeCameraRig() !== null ||
      this.resolveDialogueAttentionNpc() !== null
    ) {
      return null;
    }

    const activeTarget = this.resolveActiveRuntimeTarget();

    if (activeTarget !== null) {
      return {
        targetPosition: activeTarget.center,
        strength: ACTIVE_TARGET_CAMERA_ASSIST_STRENGTH
      };
    }

    // Keep this branch commented instead of deleted; proposed-target nudging may
    // come back later after the Lux readability pass has settled.
    // if (this.proposedRuntimeTarget !== null) {
    //   return {
    //     targetPosition: this.proposedRuntimeTarget.center,
    //     strength: PROPOSED_TARGET_CAMERA_ASSIST_STRENGTH
    //   };
    // }

    return null;
  }

  private resolveTargetingLuxHomePosition(): Vector3 | null {
    const telemetry = this.currentPlayerControllerTelemetry;

    if (telemetry === null) {
      return null;
    }

    this.targetingLuxHomePosition.set(
      lerpScalar(
        telemetry.feetPosition.x,
        telemetry.eyePosition.x,
        TARGETING_LUX_HOME_HEIGHT_FACTOR
      ),
      lerpScalar(
        telemetry.feetPosition.y,
        telemetry.eyePosition.y,
        TARGETING_LUX_HOME_HEIGHT_FACTOR
      ),
      lerpScalar(
        telemetry.feetPosition.z,
        telemetry.eyePosition.z,
        TARGETING_LUX_HOME_HEIGHT_FACTOR
      )
    );

    return this.targetingLuxHomePosition;
  }

  private hideRuntimeTargetingVisuals() {
    this.targetingVisualGroup.visible = false;
    this.targetingLuxGroup.visible = false;
    this.targetingActiveGroup.visible = false;
    this.targetingLuxInitialized = false;
    this.targetingLuxFlightState = "hidden";
  }

  private updateRuntimeActiveTargetIndicator(
    visualPlacement: ReturnType<typeof resolveRuntimeTargetVisualPlacement>
  ) {
    this.targetingActiveGroup.position.set(
      visualPlacement.activeMarkerPosition.x,
      visualPlacement.activeMarkerPosition.y,
      visualPlacement.activeMarkerPosition.z
    );
    this.targetingActiveGroup.quaternion.identity();
    this.targetingActiveGroup.scale.setScalar(
      visualPlacement.activeMarkerScale
    );
    this.targetingActiveCameraRight
      .setFromMatrixColumn(this.camera.matrixWorld, 0)
      .normalize();
    this.targetingActiveCameraUp
      .setFromMatrixColumn(this.camera.matrixWorld, 1)
      .normalize();

    const orbitAngle =
      this.targetingVisualTime * TARGETING_ACTIVE_ARROW_ORBIT_RATE;
    const localRadius =
      visualPlacement.activeMarkerRadius / visualPlacement.activeMarkerScale;

    this.targetingActiveArrows.forEach((arrow, index) => {
      const angle =
        orbitAngle + (index / TARGETING_ACTIVE_ARROW_COUNT) * Math.PI * 2;
      arrow.position
        .copy(this.targetingActiveCameraRight)
        .multiplyScalar(Math.cos(angle) * localRadius)
        .addScaledVector(
          this.targetingActiveCameraUp,
          Math.sin(angle) * localRadius
        );
      this.targetingActiveArrowDirection
        .copy(arrow.position)
        .multiplyScalar(-1);

      if (this.targetingActiveArrowDirection.lengthSq() > Number.EPSILON) {
        this.targetingActiveArrowDirection.normalize();
        arrow.quaternion.setFromUnitVectors(
          this.targetingActiveArrowLocalTipAxis,
          this.targetingActiveArrowDirection
        );
      }
    });
  }

  private updateRuntimeTargetingVisuals(dt: number) {
    const activeTarget = this.resolveActiveRuntimeTarget();
    const visualTarget = activeTarget ?? this.proposedRuntimeTarget;
    const luxHomePosition = this.resolveTargetingLuxHomePosition();
    const shouldShow =
      visualTarget !== null &&
      this.runtimeScene !== null &&
      this.sceneReady &&
      this.activeController === this.thirdPersonController &&
      this.currentDialogue === null &&
      !this.isActiveExternalCameraSource() &&
      this.resolveActiveRuntimeCameraRig() === null &&
      this.resolveDialogueAttentionNpc() === null;
    const dtSeconds = Math.max(0, dt);

    if (!shouldShow || visualTarget === null) {
      if (
        this.targetingLuxFlightState !== "hidden" &&
        this.targetingLuxInitialized &&
        luxHomePosition !== null
      ) {
        this.targetingLuxFlightState = "returning";
        this.targetingVisualTime += dtSeconds;

        const returnAlpha =
          1 - Math.exp(-TARGETING_LUX_RETURN_RATE * dtSeconds);
        this.targetingLuxGroup.position.lerp(luxHomePosition, returnAlpha);

        if (
          this.targetingLuxGroup.position.distanceTo(luxHomePosition) <=
          TARGETING_LUX_HIDE_DISTANCE
        ) {
          this.hideRuntimeTargetingVisuals();
          return;
        }

        const returnPulse =
          0.9 +
          Math.sin(this.targetingVisualTime * TARGETING_LUX_PULSE_RATE) * 0.08;
        this.targetingLuxMesh.scale.setScalar(returnPulse);
        this.targetingLuxGlowMesh.scale.setScalar(
          0.9 + (returnPulse - 0.9) * 1.6
        );
        this.targetingLuxLight.intensity = 0.9;
        this.targetingLuxLight.distance = 2.6;
        this.targetingLuxGroup.lookAt(this.camera.position);
        this.targetingVisualGroup.visible = true;
        this.targetingLuxGroup.visible = true;
        this.targetingActiveGroup.visible = false;
        return;
      }

      this.hideRuntimeTargetingVisuals();
      return;
    }

    this.targetingVisualTime += dtSeconds;
    const visualPlacement = resolveRuntimeTargetVisualPlacement(visualTarget);
    const bob =
      Math.sin(this.targetingVisualTime * TARGETING_LUX_BOB_RATE) * 0.08;
    const sway =
      Math.sin(this.targetingVisualTime * TARGETING_LUX_SWAY_RATE) *
      TARGETING_LUX_SWAY_DISTANCE;
    const pulse =
      1 + Math.sin(this.targetingVisualTime * TARGETING_LUX_PULSE_RATE) * 0.12;
    this.targetingLuxSwayDirection
      .setFromMatrixColumn(this.camera.matrixWorld, 0)
      .normalize();
    this.targetingLuxTargetPosition.set(
      visualPlacement.luxPosition.x,
      visualPlacement.luxPosition.y + bob,
      visualPlacement.luxPosition.z
    );
    this.targetingLuxTargetPosition.addScaledVector(
      this.targetingLuxSwayDirection,
      sway
    );

    if (
      !this.targetingLuxInitialized ||
      this.targetingLuxFlightState === "hidden"
    ) {
      this.targetingLuxGroup.position.copy(
        luxHomePosition ?? this.targetingLuxTargetPosition
      );
      this.targetingLuxInitialized = true;
      this.targetingLuxFlightState = "outbound";
    } else if (this.targetingLuxFlightState === "returning") {
      this.targetingLuxFlightState = "outbound";
    }

    const alpha =
      1 -
      Math.exp(
        -(this.targetingLuxFlightState === "outbound"
          ? TARGETING_LUX_FLIGHT_RATE
          : TARGETING_LUX_FOLLOW_RATE) * dtSeconds
      );
    this.targetingLuxGroup.position.lerp(
      this.targetingLuxTargetPosition,
      alpha
    );

    if (
      this.targetingLuxFlightState === "outbound" &&
      this.targetingLuxGroup.position.distanceTo(
        this.targetingLuxTargetPosition
      ) <= TARGETING_LUX_HIDE_DISTANCE
    ) {
      this.targetingLuxFlightState = "following";
    }

    this.targetingLuxMesh.scale.setScalar(pulse);
    this.targetingLuxGlowMesh.scale.setScalar(1.05 + (pulse - 1) * 1.8);
    this.targetingLuxLight.intensity = activeTarget === null ? 1.15 : 1.45;
    this.targetingLuxLight.distance = activeTarget === null ? 3 : 3.6;
    this.targetingLuxGroup.lookAt(this.camera.position);
    this.targetingVisualGroup.visible = true;
    this.targetingLuxGroup.visible = true;
    this.targetingActiveGroup.visible = activeTarget !== null;

    if (activeTarget !== null) {
      this.updateRuntimeActiveTargetIndicator(visualPlacement);
    }
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

  private handleRuntimePointerDown = (event: PointerEvent) => {
    if (!this.sceneReady) {
      return;
    }

    this.audioSystem.handleUserGesture();

    if (
      this.activeRuntimeCameraRig === null ||
      !this.activeRuntimeCameraRig.lookAround.enabled ||
      this.isRuntimePaused() ||
      event.button !== 0
    ) {
      return;
    }

    this.cameraRigLookDragging = true;
    this.lastCameraRigPointerClientX = event.clientX;
    this.lastCameraRigPointerClientY = event.clientY;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private handleRuntimeKeyDown = (event: KeyboardEvent) => {
    if (this.runtimeScene === null || !this.sceneReady) {
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

    if (event.code === "Tab") {
      event.preventDefault();
      this.activateOrCycleRuntimeTarget();
      this.previousTargetCycleInputActive = true;
      return;
    }

    if (event.code === "Escape" && this.activeRuntimeTargetReference !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.clearActiveRuntimeTarget();
      return;
    }

    if (
      event.code === this.runtimeScene.playerInputBindings.keyboard.pauseTime
    ) {
      event.preventDefault();
      this.toggleManualPause();
      this.previousPauseInputActive = true;
    }
  };

  private handleRuntimeKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };

  private handleRuntimePointerMove = (event: PointerEvent) => {
    if (
      !this.cameraRigLookDragging ||
      this.activeRuntimeCameraRig === null ||
      !this.activeRuntimeCameraRig.lookAround.enabled ||
      this.isRuntimePaused()
    ) {
      return;
    }

    const deltaX = event.clientX - this.lastCameraRigPointerClientX;
    const deltaY = event.clientY - this.lastCameraRigPointerClientY;
    this.lastCameraRigPointerClientX = event.clientX;
    this.lastCameraRigPointerClientY = event.clientY;
    this.cameraRigLookYawRadians = clampScalar(
      this.cameraRigLookYawRadians -
        deltaX * CAMERA_RIG_POINTER_LOOK_SENSITIVITY,
      (-this.activeRuntimeCameraRig.lookAround.yawLimitDegrees * Math.PI) / 180,
      (this.activeRuntimeCameraRig.lookAround.yawLimitDegrees * Math.PI) / 180
    );
    this.cameraRigLookPitchRadians = clampScalar(
      this.cameraRigLookPitchRadians -
        deltaY * CAMERA_RIG_POINTER_LOOK_SENSITIVITY,
      (-this.activeRuntimeCameraRig.lookAround.pitchLimitDegrees * Math.PI) /
        180,
      (this.activeRuntimeCameraRig.lookAround.pitchLimitDegrees * Math.PI) / 180
    );
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private handleRuntimePointerUp = (event: PointerEvent) => {
    if (!this.cameraRigLookDragging) {
      return;
    }

    this.cameraRigLookDragging = false;
    event.stopImmediatePropagation();
  };

  private handleRuntimeWheel = (event: WheelEvent) => {
    if (this.activeRuntimeCameraRig === null) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private handleRuntimeBlur = () => {
    this.pressedKeys.clear();
    this.previousPauseInputActive = false;
    this.previousTargetCycleInputActive = false;
    this.cameraRigLookDragging = false;
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
