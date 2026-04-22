import {
  AmbientLight,
  AxesHelper,
  BufferGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Euler,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Spherical,
  TorusGeometry,
  SpotLight,
  TextureLoader,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";
import { EffectComposer } from "postprocessing";

import {
  applyEditorSelectionClick,
  areEditorSelectionsEqual,
  isBrushEdgeSelected,
  isBrushFaceSelected,
  isBrushSelected,
  isBrushVertexSelected,
  isModelInstanceSelected,
  isPathPointSelected,
  isPathSelected,
  isTerrainSelected,
  type EditorSelection
} from "../core/selection";
import {
  getTerrainBrushCommandLabel,
  type ArmedTerrainBrushState,
  type TerrainBrushStrokeCommit
} from "../core/terrain-brush";
import { getWhiteboxSelectionFeedbackLabel } from "../core/whitebox-selection-feedback";
import type { WhiteboxSelectionMode } from "../core/whitebox-selection-mode";
import {
  cloneTransformSession,
  createInactiveTransformSession,
  createTransformPreviewFromTarget,
  createTransformSession,
  resolveTransformTarget,
  supportsLocalTransformAxisConstraint,
  supportsTransformOperation,
  supportsTransformSurfaceSnapTarget,
  supportsTransformAxisConstraint,
  type ActiveTransformSession,
  type TransformAxis,
  type TransformAxisSpace,
  type TransformPreview,
  type TransformSessionState
} from "../core/transform-session";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import {
  createModelInstanceRenderGroup,
  disposeModelInstance
} from "../assets/model-instance-rendering";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import {
  createModelInstance,
  createModelInstancePlacementPosition,
  DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
  DEFAULT_MODEL_INSTANCE_SCALE,
  getModelInstances,
  type ModelInstance
} from "../assets/model-instances";
import type { SceneDocument } from "../document/scene-document";
import {
  getScenePaths,
  type ScenePath
} from "../document/paths";
import {
  areTerrainsEqual,
  cloneTerrain,
  getTerrains,
  type Terrain
} from "../document/terrains";
import {
  areAdvancedRenderingSettingsEqual,
  cloneAdvancedRenderingSettings,
  type AdvancedRenderingSettings
} from "../document/world-settings";
import type { WorldSettings } from "../document/world-settings";
import {
  createNpcAlwaysPresence,
  createNpcColliderSettings,
  DEFAULT_INTERACTABLE_RADIUS,
  DEFAULT_NPC_YAW_DEGREES,
  DEFAULT_PLAYER_START_BOX_SIZE,
  DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
  DEFAULT_PLAYER_START_CAPSULE_RADIUS,
  DEFAULT_PLAYER_START_EYE_HEIGHT,
  DEFAULT_PLAYER_START_YAW_DEGREES,
  DEFAULT_POINT_LIGHT_DISTANCE,
  DEFAULT_SCENE_ENTRY_YAW_DEGREES,
  DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
  DEFAULT_SOUND_EMITTER_REF_DISTANCE,
  DEFAULT_SPOT_LIGHT_ANGLE_DEGREES,
  DEFAULT_SPOT_LIGHT_DIRECTION,
  DEFAULT_SPOT_LIGHT_DISTANCE,
  DEFAULT_TELEPORT_TARGET_YAW_DEGREES,
  DEFAULT_TRIGGER_VOLUME_SIZE,
  getNpcColliderHeight,
  getPlayerStartColliderHeight,
  getEntityInstances,
  normalizeYawDegrees,
  type EntityInstance,
  type NpcEntity,
  type PlayerStartEntity,
  type PointLightEntity,
  type SpotLightEntity
} from "../entities/entity-instances";
import {
  cloneBrushGeometry,
  createConeBrush,
  createRadialPrismBrush,
  createTorusBrush,
  createWedgeBrush,
  deriveBrushSizeFromGeometry,
  scaleBrushGeometryToSize,
  updateBrush,
  DEFAULT_BOX_BRUSH_SIZE,
  DEFAULT_TORUS_BRUSH_SIZE,
  type Brush,
  type BrushGeometry,
  type BoxBrush,
  type WhiteboxEdgeId,
  type WhiteboxFaceId,
  type WhiteboxVertexId
} from "../document/brushes";
import {
  getBrushEdgeAxis,
  getBrushEdgeScaleAxes,
  getBrushEdgeWorldSegment,
  getBrushFaceAxis,
  getBrushFaceWorldCenter,
  getBrushLocalVertexPosition,
  getBrushVertexWorldPosition,
  transformBrushWorldPointToLocal,
  transformBrushWorldVectorToLocal
} from "../geometry/whitebox-brush";
import {
  buildBoxBrushDerivedMeshData
} from "../geometry/box-brush-mesh";
import { buildTerrainDerivedMeshData } from "../geometry/terrain-mesh";
import {
  applyTerrainBrushStamp,
  createTerrainBrushPreviewPoints,
  getTerrainBrushStrokeSpacing
} from "../geometry/terrain-brush";
import {
  getBrushEdgeIds,
  getBrushEdgeVertexIds,
  getBrushFaceIds,
  getBrushFaceVertexIds,
  getBrushVertexIds
} from "../geometry/whitebox-topology";
import { createModelColliderDebugGroup } from "../geometry/model-instance-collider-debug-mesh";
import { buildGeneratedModelCollider } from "../geometry/model-instance-collider-generation";
import { DEFAULT_GRID_SIZE, snapValueToGrid } from "../geometry/grid-snapping";
import {
  createStarterMaterialSignature,
  createStarterMaterialTextureSet,
  disposeStarterMaterialTextureSet,
  type StarterMaterialTextureSet
} from "../materials/starter-material-textures";
import type { MaterialDef } from "../materials/starter-material-library";
import {
  applyAdvancedRenderingLightShadowFlags,
  applyAdvancedRenderingRenderableShadowFlags,
  configureAdvancedRenderingRenderer,
  createAdvancedRenderingComposer,
  resolveBoxVolumeRenderPaths
} from "../rendering/advanced-rendering";
import { createFogQualityMaterial } from "../rendering/fog-material";
import { updatePlanarReflectionCamera } from "../rendering/planar-reflection";
import {
  createTerrainLayerBlendMaterial,
  getTerrainLayerPreviewColor,
  getTerrainLayerTexture
} from "../rendering/terrain-layer-material";
import {
  resolveWorldEnvironmentState,
  WorldBackgroundRenderer
} from "../rendering/world-background-renderer";
import {
  createRendererQuantizedEnvironmentBlendCache,
  type QuantizedEnvironmentBlendCache
} from "../rendering/quantized-environment-blend-cache";
import {
  applyWhiteboxBevelToMaterial,
  shouldApplyWhiteboxBevel
} from "../rendering/whitebox-bevel-material";
import {
  collectWaterContactPatches,
  createWaterMaterial
} from "../rendering/water-material";
import { resolveViewportFocusTarget } from "./viewport-focus";
import {
  createSoundEmitterMarkerMeshes
} from "./viewport-entity-markers";
import {
  resolveRuntimeDayNightWorldState,
  type RuntimeClockState
} from "../runtime-three/runtime-project-time";
import { deriveBoxLightVolumePointLights } from "../runtime-three/light-volume-utils";
import type { RuntimeSceneDefinition } from "../runtime-three/runtime-scene-build";
import { resolveTransformPointerDownIntent } from "./transform-pointer-intent";
import { resolveDominantLocalAxisForWorldAxis } from "./transform-axis-mapping";
import {
  SURFACE_SNAP_OFFSET,
  applyRigidDeltaToTransformPreview,
  computeSurfaceSnapDelta,
  createAxisAlignedBoxSurfaceSnapSupportPoints,
  createBrushSurfaceSnapSupportPoints,
  createModelBoundingBoxSurfaceSnapSupportPoints,
  resolveSurfaceSnapHitFromIntersections
} from "./transform-surface-snap";
import {
  getViewportViewModeDefinition,
  isOrthographicViewportViewMode,
  type ViewportGridPlane,
  type ViewportViewMode
} from "./viewport-view-modes";
import {
  areViewportPanelCameraStatesEqual,
  type ViewportDisplayMode,
  type ViewportPanelCameraState,
  type ViewportPanelId
} from "./viewport-layout";
import {
  areViewportToolPreviewsEqual,
  type CreationTarget,
  type CreationViewportToolPreview,
  type ViewportToolPreview
} from "./viewport-transient-state";

interface BrushRenderObjects {
  mesh: Mesh<BufferGeometry, Material[]>;
  faceIdsInOrder: WhiteboxFaceId[];
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
  edgeHelpers: Array<{
    id: WhiteboxEdgeId;
    line: Line<BufferGeometry, LineBasicMaterial>;
  }>;
  vertexHelpers: Array<{
    id: WhiteboxVertexId;
    mesh: Mesh<SphereGeometry, MeshBasicMaterial>;
  }>;
}

interface PathRenderObjects {
  line: Line<BufferGeometry, LineBasicMaterial>;
  pointMeshes: Array<{
    pointId: string;
    mesh: Mesh<SphereGeometry, MeshBasicMaterial>;
  }>;
}

interface TerrainRenderObjects {
  mesh: Mesh<BufferGeometry, Material>;
}

interface TerrainBrushHit {
  terrainId: string;
  point: Vec3;
}

interface LightVolumeRenderObjects {
  group: Group;
  lights: PointLight[];
}

interface ActiveTerrainBrushStroke {
  pointerId: number;
  previewTerrain: Terrain;
  referenceHeight: number | null;
  lastAppliedPoint: {
    x: number;
    z: number;
  };
  toolState: ArmedTerrainBrushState;
}

interface ViewportWaterSurfaceBinding {
  brush: BoxBrush;
  reflectionTextureUniform: { value: unknown } | null;
  reflectionMatrixUniform: { value: Matrix4 } | null;
  reflectionEnabledUniform: { value: number } | null;
  reflectionRenderTarget: WebGLRenderTarget | null;
  lastReflectionUpdateTime: number;
}

const BRUSH_SELECTED_EDGE_COLOR = 0xf7d2aa;
const BRUSH_HOVERED_EDGE_COLOR = 0xb7cbec;
const BRUSH_EDGE_COLOR = 0x0d1017;
const FALLBACK_FACE_COLOR = 0xf2ece2;
const HOVERED_FACE_FALLBACK_COLOR = 0xd9a56f;
const SELECTED_FACE_FALLBACK_COLOR = 0xcf7b42;
const HOVERED_FACE_EMISSIVE = 0x2f1d11;
const SELECTED_FACE_EMISSIVE = 0x4a2814;
const WHITEBOX_COMPONENT_COLOR = 0xb7cbec;
const WHITEBOX_COMPONENT_HOVERED_COLOR = 0xf3be8f;
const WHITEBOX_COMPONENT_SELECTED_COLOR = 0xcf7b42;
const WHITEBOX_COMPONENT_DEFAULT_OPACITY = 0.42;
const WHITEBOX_COMPONENT_HOVERED_OPACITY = 0.94;
const WHITEBOX_COMPONENT_SELECTED_OPACITY = 1;
const WHITEBOX_VERTEX_RADIUS = 0.08;
const WHITEBOX_EDGE_PICK_THRESHOLD = 0.16;
const PLAYER_START_COLOR = 0x7cb7ff;
const PLAYER_START_SELECTED_COLOR = 0xf3be8f;
const SOUND_EMITTER_COLOR = 0x72d7c9;
const SOUND_EMITTER_SELECTED_COLOR = 0xf4d37d;
const TRIGGER_VOLUME_COLOR = 0x9f8cff;
const TRIGGER_VOLUME_SELECTED_COLOR = 0xf0b07f;
const TELEPORT_TARGET_COLOR = 0x7ee0ff;
const TELEPORT_TARGET_SELECTED_COLOR = 0xf6c48a;
const SCENE_ENTRY_COLOR = 0x75f0d8;
const SCENE_ENTRY_SELECTED_COLOR = 0xf6c48a;
const NPC_COLOR = 0xa0df7a;
const NPC_SELECTED_COLOR = 0xf4cd83;
const INTERACTABLE_COLOR = 0x92de7e;
const INTERACTABLE_SELECTED_COLOR = 0xf1cf7e;
const PATH_COLOR = 0x4b82d6;
const PATH_HOVERED_COLOR = 0x86b6ff;
const PATH_SELECTED_COLOR = 0xf3be8f;
const PATH_POINT_COLOR = 0xb7cbec;
const PATH_POINT_HOVERED_COLOR = 0xf3be8f;
const PATH_POINT_SELECTED_COLOR = 0xcf7b42;
const PATH_POINT_RADIUS = 0.12;
const PATH_POINT_HOVERED_SCALE = 1.18;
const PATH_POINT_SELECTED_SCALE = 1.35;
const TERRAIN_BASE_COLOR = 0x708b57;
const TERRAIN_HOVERED_COLOR = 0x89a765;
const TERRAIN_SELECTED_COLOR = 0xe0c17f;
const TERRAIN_ACTIVE_COLOR = 0xf0d8a2;
const TERRAIN_ACTIVE_EMISSIVE = 0x5c4623;
const TERRAIN_SELECTED_EMISSIVE = 0x3f2d17;
const TERRAIN_HOVERED_EMISSIVE = 0x24311b;
const TERRAIN_BRUSH_PREVIEW_RAISE_COLOR = 0x8dd977;
const TERRAIN_BRUSH_PREVIEW_LOWER_COLOR = 0xe17b75;
const TERRAIN_BRUSH_PREVIEW_SMOOTH_COLOR = 0x7dbbf1;
const TERRAIN_BRUSH_PREVIEW_FLATTEN_COLOR = 0xf1d37d;
const TERRAIN_BRUSH_PREVIEW_PAINT_COLOR = 0x8eb9ff;
const TERRAIN_BRUSH_PREVIEW_OFFSET = 0.05;
const BOX_CREATE_PREVIEW_FILL = 0x89b6ff;
const BOX_CREATE_PREVIEW_EDGE = 0xf3be8f;
const PLACEMENT_PREVIEW_COLOR_HEX = "#89b6ff";
const MIN_CAMERA_DISTANCE = 1.5;
const MAX_CAMERA_DISTANCE = 400;
const ORBIT_ROTATION_SPEED = 0.0085;
const ZOOM_SPEED = 0.0014;
const MIN_POLAR_ANGLE = 0.12;
const MAX_POLAR_ANGLE = Math.PI - 0.12;
const FOCUS_MARGIN = 1.35;
const ORTHOGRAPHIC_CAMERA_DISTANCE = 100;
const ORTHOGRAPHIC_FRUSTUM_HEIGHT = 20;
const MIN_ORTHOGRAPHIC_ZOOM = 0.25;
const MAX_ORTHOGRAPHIC_ZOOM = 20;
const GIZMO_AXIS_COLORS: Record<TransformAxis, number> = {
  x: 0xea655b,
  y: 0x6ed06f,
  z: 0x55a2ff
};
const GIZMO_ACTIVE_COLOR = 0xf7d2aa;
const GIZMO_INACTIVE_OPACITY = 0.82;
const GIZMO_ACTIVE_OPACITY = 1;
const GIZMO_TRANSLATE_LENGTH = 1.2;
const GIZMO_SCALE_LENGTH = 1;
const GIZMO_ROTATE_RADIUS = 1.05;
const GIZMO_ROTATE_TUBE = 0.035;
const GIZMO_PICK_THICKNESS = 0.18;
const GIZMO_PICK_RING_TUBE = 0.14;
const GIZMO_CENTER_HANDLE_SIZE = 0.16;
const GIZMO_SCREEN_SIZE_PERSPECTIVE = 0.11;
const GIZMO_SCREEN_SIZE_ORTHOGRAPHIC = 1.4;
const GIZMO_RENDER_ORDER = 4_000;
const SCALE_SNAP_STEP = 0.1;
const MIN_SCALE_COMPONENT = 0.1;
const MIN_BOX_SIZE_COMPONENT = 0.01;
const WATER_REFLECTION_UPDATE_INTERVAL_MS = 96;
const VIEWPORT_GRID_VISUAL_SIZE = 400;
const VIEWPORT_GRID_VISUAL_DIVISIONS = 400;

interface CachedMaterialTexture {
  signature: string;
  textureSet: StarterMaterialTextureSet;
}

interface EntityRenderObjects {
  group: Group;
  meshes: Mesh[];
  dispose?: () => void;
}

interface LocalLightRenderObjects {
  group: Group;
  light: PointLight | SpotLight;
}

export class ViewportHost {
  private readonly scene = new Scene();
  private readonly worldBackgroundRenderer = new WorldBackgroundRenderer();
  private readonly axesHelper = new AxesHelper(2);
  private readonly perspectiveCamera = new PerspectiveCamera(60, 1, 0.1, 1000);
  private readonly orthographicCamera = new OrthographicCamera(
    -10,
    10,
    10,
    -10,
    0.1,
    1000
  );
  private readonly renderer = new WebGLRenderer({
    antialias: false,
    alpha: true
  });
  private readonly cameraTarget = new Vector3(0, 0, 0);
  private readonly cameraOffset = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly cameraRight = new Vector3();
  private readonly cameraUp = new Vector3();
  private readonly transformAxisDelta = new Vector3();
  private readonly fogLocalCameraPosition = new Vector3();
  private readonly cameraSpherical = new Spherical();
  private readonly gridHelpers: Record<ViewportGridPlane, GridHelper> = {
    xz: new GridHelper(
      VIEWPORT_GRID_VISUAL_SIZE,
      VIEWPORT_GRID_VISUAL_DIVISIONS,
      0xcf8354,
      0x4e596b
    ),
    xy: new GridHelper(
      VIEWPORT_GRID_VISUAL_SIZE,
      VIEWPORT_GRID_VISUAL_DIVISIONS,
      0xcf8354,
      0x4e596b
    ),
    yz: new GridHelper(
      VIEWPORT_GRID_VISUAL_SIZE,
      VIEWPORT_GRID_VISUAL_DIVISIONS,
      0xcf8354,
      0x4e596b
    )
  };
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly localLightGroup = new Group();
  private readonly brushGroup = new Group();
  private readonly terrainGroup = new Group();
  private readonly terrainBrushPreviewGroup = new Group();
  private readonly terrainBrushPreviewLine = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: TERRAIN_BRUSH_PREVIEW_RAISE_COLOR,
      depthTest: false
    })
  );
  private readonly terrainBrushPreviewCenter = new Mesh(
    new SphereGeometry(1, 12, 12),
    new MeshBasicMaterial({
      color: TERRAIN_BRUSH_PREVIEW_RAISE_COLOR,
      depthTest: false
    })
  );
  private readonly pathGroup = new Group();
  private readonly entityGroup = new Group();
  private readonly modelGroup = new Group();
  private readonly waterReflectionCamera = new PerspectiveCamera();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly boxCreateIntersection = new Vector3();
  private readonly boxCreatePlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly transformPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly transformIntersection = new Vector3();
  private readonly transformGizmoGroup = new Group();
  private readonly brushRenderObjects = new Map<string, BrushRenderObjects>();
  private readonly terrainRenderObjects = new Map<string, TerrainRenderObjects>();
  private readonly pathRenderObjects = new Map<string, PathRenderObjects>();
  private readonly entityRenderObjects = new Map<string, EntityRenderObjects>();
  private readonly localLightRenderObjects = new Map<
    string,
    LocalLightRenderObjects
  >();
  private readonly modelRenderObjects = new Map<string, Group>();
  private readonly materialTextureCache = new Map<
    string,
    CachedMaterialTexture
  >();
  private readonly materialTextureLoader = new TextureLoader();
  private readonly environmentBlendCache: QuantizedEnvironmentBlendCache;
  private currentDocument: SceneDocument | null = null;
  private currentWorld: WorldSettings | null = null;
  private currentSimulationScene: RuntimeSceneDefinition | null = null;
  private currentSimulationClock: RuntimeClockState | null = null;
  private currentAdvancedRenderingSettings: AdvancedRenderingSettings | null =
    null;
  private advancedRenderingComposer: EffectComposer | null = null;
  private currentSelection: EditorSelection = {
    kind: "none"
  };
  private currentActiveSelectionId: string | null = null;
  private hoveredSelection: EditorSelection = {
    kind: "none"
  };
  private whiteboxSelectionMode: WhiteboxSelectionMode = "object";
  private whiteboxSnapEnabled = true;
  private whiteboxSnapStep = DEFAULT_GRID_SIZE;
  private viewportGridVisible = true;
  private projectAssets: Record<string, ProjectAssetRecord> = {};
  private loadedModelAssets: Record<string, LoadedModelAsset> = {};
  private loadedImageAssets: Record<string, LoadedImageAsset> = {};
  private volumeTime = 0;
  private previousFrameTime = 0;
  private readonly volumeAnimatedUniforms: Array<{ value: number }> = [];
  private readonly viewportWaterSurfaceBindings: ViewportWaterSurfaceBinding[] =
    [];
  private preservedViewportWaterReflectionTargets: Map<
    string,
    WebGLRenderTarget | null
  > | null = null;
  private readonly boxCreatePreviewMesh = new Mesh(
    new BoxGeometry(
      DEFAULT_BOX_BRUSH_SIZE.x,
      DEFAULT_BOX_BRUSH_SIZE.y,
      DEFAULT_BOX_BRUSH_SIZE.z
    ),
    new MeshStandardMaterial({
      color: BOX_CREATE_PREVIEW_FILL,
      emissive: BOX_CREATE_PREVIEW_FILL,
      emissiveIntensity: 0.12,
      roughness: 0.68,
      metalness: 0.02,
      transparent: true,
      opacity: 0.22
    })
  );
  private readonly boxCreatePreviewEdges = new LineSegments(
    new EdgesGeometry(this.boxCreatePreviewMesh.geometry),
    new LineBasicMaterial({
      color: BOX_CREATE_PREVIEW_EDGE
    })
  );
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private renderEnabled = false;
  private container: HTMLElement | null = null;
  private brushSelectionChangeHandler:
    | ((selection: EditorSelection) => void)
    | null = null;
  private whiteboxHoverLabelChangeHandler:
    | ((label: string | null) => void)
    | null = null;
  private creationPreviewChangeHandler:
    | ((toolPreview: ViewportToolPreview) => void)
    | null = null;
  private creationCommitHandler:
    | ((toolPreview: CreationViewportToolPreview) => boolean)
    | null = null;
  private cameraStateChangeHandler:
    | ((cameraState: ViewportPanelCameraState) => void)
    | null = null;
  private transformSessionChangeHandler:
    | ((transformSession: TransformSessionState) => void)
    | null = null;
  private transformCommitHandler:
    | ((transformSession: ActiveTransformSession) => void)
    | null = null;
  private transformCancelHandler: (() => void) | null = null;
  private terrainBrushCommitHandler:
    | ((commit: TerrainBrushStrokeCommit) => boolean)
    | null = null;
  private toolMode: ToolMode = "select";
  private viewMode: ViewportViewMode = "perspective";
  private displayMode: ViewportDisplayMode = "normal";
  private panelId: ViewportPanelId = "topLeft";
  private creationPreview: CreationViewportToolPreview | null = null;
  private currentTerrainBrushState: ArmedTerrainBrushState | null = null;
  private terrainBrushHover: TerrainBrushHit | null = null;
  private activeTerrainBrushStroke: ActiveTerrainBrushStroke | null = null;
  private creationPreviewTargetKey: string | null = null;
  private creationPreviewObject: Group | null = null;
  private currentTransformSession: TransformSessionState =
    createInactiveTransformSession();
  private activeCameraDragPointerId: number | null = null;
  private lastCameraDragClientPosition: { x: number; y: number } | null = null;
  private activeTransformDrag: {
    pointerId: number;
    sessionId: string;
    axisConstraint: TransformAxis | null;
    axisConstraintSpace: TransformAxisSpace;
    initialClientPosition: {
      x: number;
      y: number;
    };
  } | null = null;
  private lastCanvasPointerPosition: { x: number; y: number } | null = null;
  private keyboardTransformPointerOrigin: {
    sessionId: string;
    clientX: number;
    clientY: number;
  } | null = null;
  // Click-through cycling: track the last click position and the last picked object
  // so repeated clicks at the same spot cycle through overlapping objects.
  private lastClickPointer: { x: number; y: number } | null = null;
  private lastClickSelectionKey: string | null = null;

  constructor() {
    this.perspectiveCamera.position.set(10, 9, 10);
    this.perspectiveCamera.lookAt(this.cameraTarget);
    this.updatePerspectiveCameraSphericalFromPose();
    this.updateOrthographicCameraFrustum();

    this.gridHelpers.xy.rotation.x = Math.PI * 0.5;
    this.gridHelpers.yz.rotation.z = Math.PI * 0.5;

    for (const gridHelper of Object.values(this.gridHelpers)) {
      const gridMaterial = gridHelper.material as LineBasicMaterial;
      const centerLineMaterial = (
        gridHelper.children[0] as
          | LineSegments<BufferGeometry, LineBasicMaterial>
          | undefined
      )?.material;

      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.48;

      if (centerLineMaterial !== undefined) {
        centerLineMaterial.transparent = true;
        centerLineMaterial.opacity = 0.8;
      }
    }

    this.scene.add(this.gridHelpers.xz);
    this.scene.add(this.gridHelpers.xy);
    this.scene.add(this.gridHelpers.yz);
    this.scene.add(this.axesHelper);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.localLightGroup);
    this.scene.add(this.brushGroup);
    this.scene.add(this.terrainGroup);
    this.terrainBrushPreviewGroup.visible = false;
    this.terrainBrushPreviewLine.frustumCulled = false;
    this.terrainBrushPreviewCenter.frustumCulled = false;
    this.terrainBrushPreviewCenter.renderOrder = 2;
    this.terrainBrushPreviewGroup.add(this.terrainBrushPreviewLine);
    this.terrainBrushPreviewGroup.add(this.terrainBrushPreviewCenter);
    this.scene.add(this.terrainBrushPreviewGroup);
    this.scene.add(this.pathGroup);
    this.scene.add(this.entityGroup);
    this.scene.add(this.modelGroup);
    this.transformGizmoGroup.visible = false;
    this.scene.add(this.transformGizmoGroup);
    this.boxCreatePreviewMesh.visible = false;
    this.boxCreatePreviewEdges.visible = false;
    this.scene.add(this.boxCreatePreviewMesh);
    this.scene.add(this.boxCreatePreviewEdges);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearAlpha(0);
    this.environmentBlendCache = createRendererQuantizedEnvironmentBlendCache(
      this.renderer,
      {
        onTextureReady: () => {
          this.applyWorld();
        }
      }
    );
    this.applyViewModePose();
  }

  setPanelId(panelId: ViewportPanelId) {
    this.panelId = panelId;
  }

  mount(container: HTMLElement) {
    this.container = container;
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      "pointerdown",
      this.handlePointerDown
    );
    this.renderer.domElement.addEventListener(
      "pointermove",
      this.handlePointerMove
    );
    this.renderer.domElement.addEventListener(
      "pointerup",
      this.handlePointerUp
    );
    this.renderer.domElement.addEventListener(
      "pointercancel",
      this.handlePointerUp
    );
    this.renderer.domElement.addEventListener(
      "pointerleave",
      this.handlePointerLeave
    );
    this.renderer.domElement.addEventListener("wheel", this.handleWheel, {
      passive: false
    });
    this.renderer.domElement.addEventListener("auxclick", this.handleAuxClick);
    this.renderer.domElement.addEventListener(
      "contextmenu",
      this.handleContextMenu
    );
    window.addEventListener("pointermove", this.handleWindowPointerMove);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);

    if (this.renderEnabled) {
      this.render();
    }
  }

  setRenderEnabled(enabled: boolean) {
    if (this.renderEnabled === enabled) {
      return;
    }

    this.renderEnabled = enabled;

    if (!enabled) {
      if (this.animationFrame !== 0) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
      this.previousFrameTime = 0;
      return;
    }

    if (this.container !== null && this.animationFrame === 0) {
      this.render();
    }
  }

  updateWorld(world: WorldSettings) {
    this.currentWorld = world;
    this.applyWorld();
  }

  updateSimulation(
    runtimeScene: RuntimeSceneDefinition | null,
    clock: RuntimeClockState | null
  ) {
    this.currentSimulationScene = runtimeScene;
    this.currentSimulationClock = clock;
    this.applyWorld();

    if (this.currentDocument === null) {
      return;
    }

    this.rebuildLocalLights(this.currentDocument);
    this.rebuildEntityMarkers(this.currentDocument, this.currentSelection);
    this.rebuildModelInstances(this.currentDocument, this.currentSelection);
  }

  updateDocument(
    document: SceneDocument,
    selection: EditorSelection,
    activeSelectionId: string | null
  ) {
    this.activeTerrainBrushStroke = null;
    this.currentDocument = document;
    this.currentSelection = selection;
    this.currentActiveSelectionId = activeSelectionId;
    this.setHoveredSelection({
      kind: "none"
    });
    this.rebuildLocalLights(document);
    this.rebuildBrushMeshes(document, selection);
    this.rebuildTerrains(document, selection, activeSelectionId);
    this.rebuildPaths(document, selection);
    this.rebuildEntityMarkers(document, selection);
    this.rebuildModelInstances(document, selection);
    this.applyTransformPreview();
    this.syncTransformGizmo();
    this.syncTerrainBrushPreview();
  }

  updateAssets(
    projectAssets: Record<string, ProjectAssetRecord>,
    loadedModelAssets: Record<string, LoadedModelAsset>,
    loadedImageAssets: Record<string, LoadedImageAsset>
  ) {
    this.projectAssets = projectAssets;
    this.loadedModelAssets = loadedModelAssets;
    this.loadedImageAssets = loadedImageAssets;
    this.environmentBlendCache.clear();

    if (this.currentWorld !== null) {
      this.applyWorld();
    }

    if (this.currentDocument !== null) {
      this.rebuildEntityMarkers(this.currentDocument, this.currentSelection);
      this.rebuildModelInstances(this.currentDocument, this.currentSelection);
      this.applyTransformPreview();
      this.syncTransformGizmo();
    }

    if (
      this.creationPreview?.target.kind === "model-instance" ||
      (this.creationPreview?.target.kind === "entity" &&
        this.creationPreview.target.entityKind === "npc")
    ) {
      const currentPreview = this.creationPreview;
      this.creationPreview = null;
      this.clearCreationPreviewObject();
      this.syncCreationPreview(currentPreview);
    }
  }

  setBrushSelectionChangeHandler(
    handler: ((selection: EditorSelection) => void) | null
  ) {
    this.brushSelectionChangeHandler = handler;
  }

  setWhiteboxHoverLabelChangeHandler(
    handler: ((label: string | null) => void) | null
  ) {
    this.whiteboxHoverLabelChangeHandler = handler;
    this.emitWhiteboxHoverLabelChange();
  }

  setCreationPreviewChangeHandler(
    handler: ((toolPreview: ViewportToolPreview) => void) | null
  ) {
    this.creationPreviewChangeHandler = handler;
  }

  setCreationCommitHandler(
    handler: ((toolPreview: CreationViewportToolPreview) => boolean) | null
  ) {
    this.creationCommitHandler = handler;
  }

  setCameraStateChangeHandler(
    handler: ((cameraState: ViewportPanelCameraState) => void) | null
  ) {
    this.cameraStateChangeHandler = handler;
  }

  setTransformSessionChangeHandler(
    handler: ((transformSession: TransformSessionState) => void) | null
  ) {
    this.transformSessionChangeHandler = handler;
  }

  setTransformCommitHandler(
    handler: ((transformSession: ActiveTransformSession) => void) | null
  ) {
    this.transformCommitHandler = handler;
  }

  setTransformCancelHandler(handler: (() => void) | null) {
    this.transformCancelHandler = handler;
  }

  setTerrainBrushCommitHandler(
    handler: ((commit: TerrainBrushStrokeCommit) => boolean) | null
  ) {
    this.terrainBrushCommitHandler = handler;
  }

  setCameraState(cameraState: ViewportPanelCameraState) {
    if (
      areViewportPanelCameraStatesEqual(
        this.createCameraStateSnapshot(),
        cameraState
      )
    ) {
      return;
    }

    this.cameraTarget.set(
      cameraState.target.x,
      cameraState.target.y,
      cameraState.target.z
    );
    this.cameraSpherical.radius = cameraState.perspectiveOrbit.radius;
    this.cameraSpherical.theta = cameraState.perspectiveOrbit.theta;
    this.cameraSpherical.phi = cameraState.perspectiveOrbit.phi;
    this.orthographicCamera.zoom = cameraState.orthographicZoom;
    this.applyViewModePose();
  }

  setCreationPreview(toolPreview: CreationViewportToolPreview | null) {
    this.syncCreationPreview(toolPreview);
  }

  setWhiteboxSnapSettings(enabled: boolean, step: number) {
    this.whiteboxSnapEnabled = enabled;
    this.whiteboxSnapStep = step;

    if (this.creationPreview !== null) {
      this.syncCreationPreview(this.creationPreview);
    }

    this.applyTransformPreview();
  }

  setGridVisible(visible: boolean) {
    if (this.viewportGridVisible === visible) {
      return;
    }

    this.viewportGridVisible = visible;
    this.updateGridPresentation();
  }

  setWhiteboxSelectionMode(mode: WhiteboxSelectionMode) {
    if (this.whiteboxSelectionMode === mode) {
      return;
    }

    this.whiteboxSelectionMode = mode;
    this.lastClickPointer = null;
    this.lastClickSelectionKey = null;
    this.setHoveredSelection({
      kind: "none"
    });
    this.refreshBrushPresentation();
    this.syncTransformGizmo();
  }

  setTransformSession(transformSession: TransformSessionState) {
    const previousTransformSession = this.currentTransformSession;
    let rebuiltPreviewFromPointer = false;
    this.currentTransformSession = cloneTransformSession(transformSession);

    if (this.currentTransformSession.kind === "none") {
      this.activeTransformDrag = null;
      this.keyboardTransformPointerOrigin = null;
    } else if (
      this.currentTransformSession.sourcePanelId === this.panelId &&
      this.currentTransformSession.source !== "gizmo" &&
      (this.keyboardTransformPointerOrigin === null ||
        this.keyboardTransformPointerOrigin.sessionId !==
          this.currentTransformSession.id)
    ) {
      const pointerOrigin = this.getPointerOriginForTransformSession();
      this.keyboardTransformPointerOrigin = {
        sessionId: this.currentTransformSession.id,
        clientX: pointerOrigin.x,
        clientY: pointerOrigin.y
      };
    }

    if (
      previousTransformSession.kind === "active" &&
      this.currentTransformSession.kind === "active" &&
      previousTransformSession.id === this.currentTransformSession.id &&
      (previousTransformSession.surfaceSnapEnabled !==
        this.currentTransformSession.surfaceSnapEnabled ||
        previousTransformSession.axisConstraint !==
          this.currentTransformSession.axisConstraint ||
        previousTransformSession.axisConstraintSpace !==
          this.currentTransformSession.axisConstraintSpace) &&
      this.currentTransformSession.sourcePanelId === this.panelId &&
      this.currentTransformSession.source !== "gizmo" &&
      this.keyboardTransformPointerOrigin !== null &&
      this.keyboardTransformPointerOrigin.sessionId ===
        this.currentTransformSession.id &&
      this.lastCanvasPointerPosition !== null
    ) {
      this.currentTransformSession = this.buildTransformPreviewFromPointer(
        this.currentTransformSession,
        {
          x: this.keyboardTransformPointerOrigin.clientX,
          y: this.keyboardTransformPointerOrigin.clientY
        },
        this.lastCanvasPointerPosition,
        this.currentTransformSession.axisConstraint,
        this.currentTransformSession.axisConstraintSpace
      );
      rebuiltPreviewFromPointer = true;
    }

    this.applyTransformPreview();
    this.syncTransformGizmo();

    if (rebuiltPreviewFromPointer) {
      this.transformSessionChangeHandler?.(this.currentTransformSession);
    }
  }

  setToolMode(toolMode: ToolMode) {
    this.toolMode = toolMode;
    this.lastClickPointer = null;
    this.lastClickSelectionKey = null;
    this.setHoveredSelection({
      kind: "none"
    });

    if (toolMode !== "select") {
      this.cancelActiveTerrainBrushStroke(false);
      this.setTerrainBrushHover(null);
    } else {
      this.syncTerrainBrushPreview();
    }

    if (toolMode !== "create") {
      this.syncCreationPreview(null);
    }
  }

  setTerrainBrushState(terrainBrushState: ArmedTerrainBrushState | null) {
    const terrainChanged =
      this.currentTerrainBrushState?.terrainId !== terrainBrushState?.terrainId;
    const toolChanged =
      this.currentTerrainBrushState?.tool !== terrainBrushState?.tool;
    const layerChanged =
      this.currentTerrainBrushState?.tool === "paint" &&
      terrainBrushState?.tool === "paint"
        ? this.currentTerrainBrushState.layerIndex !==
          terrainBrushState.layerIndex
        : this.currentTerrainBrushState?.tool === "paint" ||
            terrainBrushState?.tool === "paint";

    this.currentTerrainBrushState = terrainBrushState;

    if (
      terrainChanged ||
      toolChanged ||
      layerChanged ||
      terrainBrushState === null
    ) {
      this.cancelActiveTerrainBrushStroke(false);
    }

    if (terrainBrushState === null || this.toolMode !== "select") {
      this.setTerrainBrushHover(null);
      return;
    }

    if (
      this.terrainBrushHover !== null &&
      this.terrainBrushHover.terrainId !== terrainBrushState.terrainId
    ) {
      this.terrainBrushHover = null;
    }

    if (this.lastCanvasPointerPosition !== null) {
      this.setTerrainBrushHover(
        this.getTerrainBrushHitAtClientPosition(
          this.lastCanvasPointerPosition.x,
          this.lastCanvasPointerPosition.y
        )
      );
    } else {
      this.syncTerrainBrushPreview();
    }
  }

  setViewMode(viewMode: ViewportViewMode) {
    if (this.viewMode === viewMode) {
      return;
    }

    this.viewMode = viewMode;
    this.lastClickPointer = null;
    this.lastClickSelectionKey = null;
    this.setHoveredSelection({
      kind: "none"
    });

    this.applyViewModePose();
    this.syncTerrainBrushPreview();

    if (this.currentAdvancedRenderingSettings !== null) {
      this.syncAdvancedRenderingComposer(this.currentAdvancedRenderingSettings);
    }
  }

  setDisplayMode(displayMode: ViewportDisplayMode) {
    if (this.displayMode === displayMode) {
      return;
    }

    this.displayMode = displayMode;
    this.applyWorld();

    if (this.currentDocument !== null) {
      this.updateDocument(
        this.currentDocument,
        this.currentSelection,
        this.currentActiveSelectionId
      );
    }
  }

  focusSelection(document: SceneDocument, selection: EditorSelection) {
    const focusTarget = resolveViewportFocusTarget(document, selection);

    if (focusTarget === null) {
      return;
    }

    this.cameraTarget.set(
      focusTarget.center.x,
      focusTarget.center.y,
      focusTarget.center.z
    );

    if (this.viewMode === "perspective") {
      const verticalHalfFov = (this.perspectiveCamera.fov * Math.PI) / 360;
      const horizontalHalfFov = Math.atan(
        Math.tan(verticalHalfFov) *
          Math.max(this.perspectiveCamera.aspect, 0.0001)
      );
      const fitAngle = Math.max(
        0.1,
        Math.min(verticalHalfFov, horizontalHalfFov)
      );
      const fitDistance = Math.min(
        MAX_CAMERA_DISTANCE,
        Math.max(
          MIN_CAMERA_DISTANCE,
          (focusTarget.radius / Math.sin(fitAngle)) * FOCUS_MARGIN
        )
      );

      this.cameraSpherical.radius = fitDistance;
      this.cameraSpherical.makeSafe();
      this.applyPerspectiveCameraPose();
      this.emitCameraStateChange();
      return;
    }

    const containerWidth = Math.max(1, this.container?.clientWidth ?? 1);
    const containerHeight = Math.max(1, this.container?.clientHeight ?? 1);
    const aspect = containerWidth / containerHeight;
    const visibleWidth = ORTHOGRAPHIC_FRUSTUM_HEIGHT * aspect;
    const fitSize = Math.max(0.5, focusTarget.radius * 2 * FOCUS_MARGIN);
    const fitZoom =
      Math.min(visibleWidth, ORTHOGRAPHIC_FRUSTUM_HEIGHT) / fitSize;

    this.orthographicCamera.zoom = Math.min(
      MAX_ORTHOGRAPHIC_ZOOM,
      Math.max(MIN_ORTHOGRAPHIC_ZOOM, fitZoom)
    );
    this.applyOrthographicCameraPose();
    this.emitCameraStateChange();
  }

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.handlePointerDown
    );
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.handlePointerMove
    );
    this.renderer.domElement.removeEventListener(
      "pointerup",
      this.handlePointerUp
    );
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.handlePointerUp
    );
    this.renderer.domElement.removeEventListener(
      "pointerleave",
      this.handlePointerLeave
    );
    this.renderer.domElement.removeEventListener("wheel", this.handleWheel);
    this.renderer.domElement.removeEventListener(
      "auxclick",
      this.handleAuxClick
    );
    this.renderer.domElement.removeEventListener(
      "contextmenu",
      this.handleContextMenu
    );
    window.removeEventListener("pointermove", this.handleWindowPointerMove);
    this.clearLocalLights();
    this.clearBrushMeshes();
    this.clearTerrains();
    this.clearPaths();
    this.clearEntityMarkers();
    this.creationPreviewChangeHandler = null;
    this.creationCommitHandler = null;
    this.cameraStateChangeHandler = null;
    this.transformSessionChangeHandler = null;
    this.transformCommitHandler = null;
    this.transformCancelHandler = null;
    this.currentTransformSession = createInactiveTransformSession();
    this.clearTransformGizmo();
    this.activeTransformDrag = null;
    this.keyboardTransformPointerOrigin = null;
    this.syncCreationPreview(null);
    this.advancedRenderingComposer?.dispose();
    this.advancedRenderingComposer = null;
    this.currentAdvancedRenderingSettings = null;
    this.renderer.autoClear = true;

    for (const cachedTexture of this.materialTextureCache.values()) {
      disposeStarterMaterialTextureSet(cachedTexture.textureSet);
    }

    this.materialTextureCache.clear();
    this.boxCreatePreviewMesh.geometry.dispose();
    this.boxCreatePreviewMesh.material.dispose();
    this.boxCreatePreviewEdges.geometry.dispose();
    this.boxCreatePreviewEdges.material.dispose();
    this.terrainBrushPreviewLine.geometry.dispose();
    this.terrainBrushPreviewLine.material.dispose();
    this.terrainBrushPreviewCenter.geometry.dispose();
    this.terrainBrushPreviewCenter.material.dispose();
    this.environmentBlendCache.dispose();
    this.worldBackgroundRenderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.dispose();

    if (
      this.container !== null &&
      this.container.contains(this.renderer.domElement)
    ) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.container = null;
  }

  private getActiveCamera() {
    return this.viewMode === "perspective"
      ? this.perspectiveCamera
      : this.orthographicCamera;
  }

  private createCameraStateSnapshot(): ViewportPanelCameraState {
    return {
      target: {
        x: this.cameraTarget.x,
        y: this.cameraTarget.y,
        z: this.cameraTarget.z
      },
      perspectiveOrbit: {
        radius: this.cameraSpherical.radius,
        theta: this.cameraSpherical.theta,
        phi: this.cameraSpherical.phi
      },
      orthographicZoom: this.orthographicCamera.zoom
    };
  }

  private emitCameraStateChange() {
    this.cameraStateChangeHandler?.(this.createCameraStateSnapshot());
  }

  private updatePerspectiveCameraSphericalFromPose() {
    this.cameraOffset
      .copy(this.perspectiveCamera.position)
      .sub(this.cameraTarget);
    this.cameraSpherical.setFromVector3(this.cameraOffset);
    this.cameraSpherical.radius = Math.min(
      MAX_CAMERA_DISTANCE,
      Math.max(MIN_CAMERA_DISTANCE, this.cameraSpherical.radius)
    );
    this.cameraSpherical.phi = Math.min(
      MAX_POLAR_ANGLE,
      Math.max(MIN_POLAR_ANGLE, this.cameraSpherical.phi)
    );
    this.cameraSpherical.makeSafe();
  }

  private updateOrthographicCameraFrustum() {
    if (this.container === null) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    const aspect = width / height;
    const halfHeight = ORTHOGRAPHIC_FRUSTUM_HEIGHT * 0.5;
    const halfWidth = halfHeight * aspect;

    this.orthographicCamera.left = -halfWidth;
    this.orthographicCamera.right = halfWidth;
    this.orthographicCamera.top = halfHeight;
    this.orthographicCamera.bottom = -halfHeight;
  }

  private applyPerspectiveCameraPose() {
    this.cameraSpherical.radius = Math.min(
      MAX_CAMERA_DISTANCE,
      Math.max(MIN_CAMERA_DISTANCE, this.cameraSpherical.radius)
    );
    this.cameraSpherical.phi = Math.min(
      MAX_POLAR_ANGLE,
      Math.max(MIN_POLAR_ANGLE, this.cameraSpherical.phi)
    );
    this.cameraSpherical.makeSafe();
    this.cameraOffset.setFromSpherical(this.cameraSpherical);
    this.perspectiveCamera.position
      .copy(this.cameraTarget)
      .add(this.cameraOffset);
    this.perspectiveCamera.lookAt(this.cameraTarget);
  }

  private applyOrthographicCameraPose() {
    const definition = getViewportViewModeDefinition(this.viewMode);

    if (
      !isOrthographicViewportViewMode(this.viewMode) ||
      definition.cameraDirection === null
    ) {
      return;
    }

    this.orthographicCamera.up.set(
      definition.cameraUp.x,
      definition.cameraUp.y,
      definition.cameraUp.z
    );
    this.orthographicCamera.position.set(
      this.cameraTarget.x +
        definition.cameraDirection.x * ORTHOGRAPHIC_CAMERA_DISTANCE,
      this.cameraTarget.y +
        definition.cameraDirection.y * ORTHOGRAPHIC_CAMERA_DISTANCE,
      this.cameraTarget.z +
        definition.cameraDirection.z * ORTHOGRAPHIC_CAMERA_DISTANCE
    );
    this.orthographicCamera.lookAt(this.cameraTarget);
    this.orthographicCamera.zoom = Math.min(
      MAX_ORTHOGRAPHIC_ZOOM,
      Math.max(MIN_ORTHOGRAPHIC_ZOOM, this.orthographicCamera.zoom)
    );
    this.orthographicCamera.updateProjectionMatrix();
  }

  private applyViewModePose() {
    this.updateGridPresentation();

    const definition = getViewportViewModeDefinition(this.viewMode);
    if (definition.cameraType === "perspective") {
      this.applyPerspectiveCameraPose();
      return;
    }

    this.updateOrthographicCameraFrustum();
    this.applyOrthographicCameraPose();
  }

  private updateGridPresentation() {
    const definition = getViewportViewModeDefinition(this.viewMode);
    const visibleGridPlane = this.viewportGridVisible
      ? definition.gridPlane
      : null;

    this.gridHelpers.xz.visible = visibleGridPlane === "xz";
    this.gridHelpers.xy.visible = visibleGridPlane === "xy";
    this.gridHelpers.yz.visible = visibleGridPlane === "yz";
    this.updateGridPositioning();
  }

  private updateGridPositioning() {
    const align = (value: number) =>
      Math.round(value / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE;

    this.gridHelpers.xz.position.set(
      align(this.cameraTarget.x),
      0,
      align(this.cameraTarget.z)
    );
    this.gridHelpers.xy.position.set(
      align(this.cameraTarget.x),
      align(this.cameraTarget.y),
      0
    );
    this.gridHelpers.yz.position.set(
      0,
      align(this.cameraTarget.y),
      align(this.cameraTarget.z)
    );
  }

  private createWireframeDisplayMaterial(
    material: Material
  ): MeshBasicMaterial {
    const source = material as Material & {
      color?: { getHex(): number };
      transparent?: boolean;
      opacity?: number;
    };

    return new MeshBasicMaterial({
      color: source.color?.getHex() ?? FALLBACK_FACE_COLOR,
      wireframe: true,
      transparent: source.transparent === true || (source.opacity ?? 1) < 1,
      opacity: source.opacity ?? 1,
      depthWrite: false
    });
  }

  private applyWireframePresentation(object: Object3D) {
    object.traverse((child) => {
      const maybeMesh = child as Mesh & { isMesh?: boolean };

      if (maybeMesh.isMesh !== true) {
        return;
      }

      if (Array.isArray(maybeMesh.material)) {
        const originalMaterials = maybeMesh.material;
        maybeMesh.material = originalMaterials.map((material) =>
          this.createWireframeDisplayMaterial(material)
        );
        for (const material of originalMaterials) {
          material.dispose();
        }
        return;
      }

      const originalMaterial = maybeMesh.material;
      maybeMesh.material =
        this.createWireframeDisplayMaterial(originalMaterial);
      originalMaterial.dispose();
    });
  }

  private getBoxCreatePlane() {
    switch (this.viewMode) {
      case "perspective":
      case "top":
        return this.boxCreatePlane.set(new Vector3(0, 1, 0), 0);
      case "front":
        return this.boxCreatePlane.set(new Vector3(0, 0, 1), 0);
      case "side":
        return this.boxCreatePlane.set(new Vector3(1, 0, 0), 0);
      default:
        return this.boxCreatePlane.set(new Vector3(0, 1, 0), 0);
    }
  }

  private applyWorld() {
    if (this.currentWorld === null) {
      return;
    }

    const world = this.currentSimulationScene?.world ?? this.currentWorld;
    const resolvedWorld =
      this.currentSimulationScene !== null && this.currentSimulationClock !== null
        ? resolveRuntimeDayNightWorldState(
            world,
            this.currentSimulationScene.time,
            this.currentSimulationClock
          )
        : null;
    const rendererSettings =
      this.displayMode !== "normal"
        ? {
          ...cloneAdvancedRenderingSettings(world.advancedRendering),
          enabled: false
        }
        : world.advancedRendering;
    const displayedAmbientLight =
      resolvedWorld?.ambientLight ?? world.ambientLight;
    const displayedSunLight = resolvedWorld?.sunLight ?? world.sunLight;
    const displayedBackground = resolvedWorld?.background ?? world.background;
    const backgroundTexture =
      displayedBackground.mode === "image" &&
      displayedBackground.assetId.trim().length > 0
        ? (this.loadedImageAssets[displayedBackground.assetId]?.texture ?? null)
        : null;
    const backgroundOverlayState =
      resolvedWorld?.nightBackgroundOverlay === undefined ||
      resolvedWorld?.nightBackgroundOverlay === null
        ? null
        : {
            texture:
              this.loadedImageAssets[
                resolvedWorld.nightBackgroundOverlay.assetId
              ]?.texture ?? null,
            opacity: resolvedWorld.nightBackgroundOverlay.opacity,
            environmentIntensity:
              resolvedWorld.nightBackgroundOverlay.environmentIntensity
          };

    this.ambientLight.color.set(displayedAmbientLight.colorHex);
    this.ambientLight.intensity = displayedAmbientLight.intensity;
    this.sunLight.color.set(displayedSunLight.colorHex);
    this.sunLight.intensity = displayedSunLight.intensity;
    this.sunLight.position
      .set(
        displayedSunLight.direction.x,
        displayedSunLight.direction.y,
        displayedSunLight.direction.z
      )
      .normalize()
      .multiplyScalar(18);
    this.ambientLight.visible = this.displayMode !== "wireframe";
    this.sunLight.visible = this.displayMode !== "wireframe";
    this.localLightGroup.visible = this.displayMode !== "wireframe";

    if (this.displayMode !== "normal") {
      this.scene.background = null;
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
    } else {
      const environmentState = resolveWorldEnvironmentState(
        displayedBackground,
        backgroundTexture,
        backgroundOverlayState,
        this.environmentBlendCache
      );

      this.worldBackgroundRenderer.update(
        displayedBackground,
        backgroundTexture,
        backgroundOverlayState
      );
      this.scene.background = null;
      this.scene.environment = environmentState.texture;
      this.scene.environmentIntensity = environmentState.intensity;
    }

    configureAdvancedRenderingRenderer(this.renderer, rendererSettings);
    this.syncAdvancedRenderingComposer(rendererSettings);
    this.applyShadowState();
  }

  private syncAdvancedRenderingComposer(settings: AdvancedRenderingSettings) {
    const shouldUseComposer =
      settings.enabled &&
      this.displayMode === "normal" &&
      this.viewMode === "perspective";
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

      this.currentAdvancedRenderingSettings = settings.enabled
        ? cloneAdvancedRenderingSettings(settings)
        : null;
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
      this.perspectiveCamera,
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
      advancedRendering.enabled &&
      advancedRendering.shadows.enabled &&
      this.displayMode === "normal";
    const shadowSettings =
      this.displayMode === "normal"
        ? advancedRendering
        : {
            ...advancedRendering,
            enabled: false
          };

    applyAdvancedRenderingLightShadowFlags(this.sunLight, shadowSettings);

    for (const renderObjects of this.localLightRenderObjects.values()) {
      applyAdvancedRenderingLightShadowFlags(
        renderObjects.group,
        shadowSettings
      );
    }

    for (const renderObjects of this.brushRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(
        renderObjects.mesh,
        shadowsEnabled
      );
    }

    for (const renderObjects of this.terrainRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(
        renderObjects.mesh,
        shadowsEnabled
      );
    }

    for (const renderObjects of this.entityRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(
        renderObjects.group,
        shadowsEnabled
      );
    }

    for (const renderGroup of this.modelRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(renderGroup, shadowsEnabled);
    }
  }

  private getPointerOriginForTransformSession() {
    if (this.lastCanvasPointerPosition !== null) {
      return this.lastCanvasPointerPosition;
    }

    const bounds = this.renderer.domElement.getBoundingClientRect();

    return {
      x: bounds.left + bounds.width * 0.5,
      y: bounds.top + bounds.height * 0.5
    };
  }

  private axisVector(axis: TransformAxis): Vector3 {
    switch (axis) {
      case "x":
        return new Vector3(1, 0, 0);
      case "y":
        return new Vector3(0, 1, 0);
      case "z":
        return new Vector3(0, 0, 1);
    }
  }

  private createRotationQuaternion(rotationDegrees: Vec3): Quaternion {
    return new Quaternion().setFromEuler(
      new Euler(
        (rotationDegrees.x * Math.PI) / 180,
        (rotationDegrees.y * Math.PI) / 180,
        (rotationDegrees.z * Math.PI) / 180,
        "XYZ"
      )
    );
  }

  private getTransformTargetOrientation(
    session: ActiveTransformSession
  ): Quaternion | null {
    const target = session.target;
    const preview = session.preview;

    switch (target.kind) {
      case "brush":
        if (preview.kind !== "brush") {
          return null;
        }

        return this.createRotationQuaternion(preview.rotationDegrees);
      case "brushes":
        if (preview.kind !== "brushes") {
          return null;
        }

        const activeBrushPreview = preview.items.find(
          (item) => item.brushId === target.activeBrushId
        );

        return this.createRotationQuaternion(
          activeBrushPreview?.rotationDegrees ?? { x: 0, y: 0, z: 0 }
        );
      case "modelInstance":
        if (preview.kind !== "modelInstance") {
          return null;
        }

        return this.createRotationQuaternion(preview.rotationDegrees);
      case "modelInstances":
        if (preview.kind !== "modelInstances") {
          return null;
        }

        const activeModelInstancePreview = preview.items.find(
          (item) => item.modelInstanceId === target.activeModelInstanceId
        );

        return this.createRotationQuaternion(
          activeModelInstancePreview?.rotationDegrees ?? { x: 0, y: 0, z: 0 }
        );
      case "pathPoint":
        return null;
      case "entity":
        if (preview.kind !== "entity") {
          return null;
        }

        switch (preview.rotation.kind) {
          case "yaw":
            return this.createRotationQuaternion({
              x: 0,
              y: preview.rotation.yawDegrees,
              z: 0
            });
          case "direction":
            return new Quaternion().setFromUnitVectors(
              new Vector3(0, 1, 0),
              new Vector3(
                preview.rotation.direction.x,
                preview.rotation.direction.y,
                preview.rotation.direction.z
              ).normalize()
            );
          case "none":
            return null;
        }
      case "entities":
        if (preview.kind !== "entities") {
          return null;
        }

        const activeEntityPreview = preview.items.find(
          (item) => item.entityId === target.activeEntityId
        );

        if (activeEntityPreview === undefined) {
          return null;
        }

        switch (activeEntityPreview.rotation.kind) {
          case "yaw":
            return this.createRotationQuaternion({
              x: 0,
              y:
                activeEntityPreview.rotation.kind === "yaw"
                  ? activeEntityPreview.rotation.yawDegrees
                  : 0,
              z: 0
            });
          case "direction": {
            const rotation = activeEntityPreview.rotation;

            if (rotation?.kind !== "direction") {
              return null;
            }

            return new Quaternion().setFromUnitVectors(
              new Vector3(0, 1, 0),
              new Vector3(
                rotation.direction.x,
                rotation.direction.y,
                rotation.direction.z
              ).normalize()
            );
          }
          case "none":
          case undefined:
            return null;
        }
      case "brushFace":
      case "brushEdge":
      case "brushVertex":
        if (preview.kind !== "brush") {
          return null;
        }

        return this.createRotationQuaternion(preview.rotationDegrees);
    }
  }

  private getConstraintAxisWorldVector(
    session: ActiveTransformSession,
    axis: TransformAxis,
    axisSpace: TransformAxisSpace
  ): Vector3 {
    const worldAxis = this.axisVector(axis);

    if (axisSpace !== "local") {
      return worldAxis;
    }

    const orientation = this.getTransformTargetOrientation(session);

    if (orientation === null) {
      return worldAxis;
    }

    return worldAxis.applyQuaternion(orientation).normalize();
  }

  private getQuaternionEulerDegrees(quaternion: Quaternion): Vec3 {
    const euler = new Euler().setFromQuaternion(quaternion, "XYZ");

    return {
      x: this.normalizeDegrees((euler.x * 180) / Math.PI),
      y: this.normalizeDegrees((euler.y * 180) / Math.PI),
      z: this.normalizeDegrees((euler.z * 180) / Math.PI)
    };
  }

  private resolveObjectScaleConstraintAxis(
    session: ActiveTransformSession,
    worldAxis: TransformAxis
  ): TransformAxis {
    if (
      session.target.kind !== "brush" &&
      session.target.kind !== "modelInstance"
    ) {
      return worldAxis;
    }

    return resolveDominantLocalAxisForWorldAxis(
      session.target.initialRotationDegrees,
      worldAxis
    );
  }

  private normalizeDegrees(value: number): number {
    const normalized = value % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  private snapScaleValue(value: number): number {
    return Math.max(
      MIN_SCALE_COMPONENT,
      Math.round(value / SCALE_SNAP_STEP) * SCALE_SNAP_STEP
    );
  }

  private snapWhiteboxPositionValue(value: number): number {
    return this.whiteboxSnapEnabled
      ? snapValueToGrid(value, this.whiteboxSnapStep)
      : value;
  }

  private snapWhiteboxSizeValue(value: number): number {
    if (!Number.isFinite(value)) {
      throw new Error("Whitebox box size values must be finite numbers.");
    }

    if (!this.whiteboxSnapEnabled) {
      return Math.max(MIN_BOX_SIZE_COMPONENT, Math.abs(value));
    }

    return Math.max(
      MIN_BOX_SIZE_COMPONENT,
      snapValueToGrid(Math.abs(value), this.whiteboxSnapStep)
    );
  }

  private getAxisComponent(vector: Vec3, axis: TransformAxis): number {
    switch (axis) {
      case "x":
        return vector.x;
      case "y":
        return vector.y;
      case "z":
        return vector.z;
    }
  }

  private setAxisComponent(
    vector: Vec3,
    axis: TransformAxis,
    value: number
  ): Vec3 {
    switch (axis) {
      case "x":
        return {
          ...vector,
          x: value
        };
      case "y":
        return {
          ...vector,
          y: value
        };
      case "z":
        return {
          ...vector,
          z: value
        };
    }
  }

  private getEffectiveRotationAxis(
    session: ActiveTransformSession
  ): TransformAxis {
    if (session.target.kind === "brushFace") {
      const previewBrush = this.createPreviewBrushForSession(session);
      return previewBrush === null
        ? "y"
        : getBrushFaceAxis(previewBrush, session.target.faceId);
    }

    if (session.target.kind === "brushEdge") {
      const previewBrush = this.createPreviewBrushForSession(session);
      return previewBrush === null
        ? "y"
        : getBrushEdgeAxis(previewBrush, session.target.edgeId);
    }

    if (
      session.target.kind === "entity" &&
      session.target.initialRotation.kind === "yaw"
    ) {
      return "y";
    }

    return session.axisConstraint ?? "y";
  }

  private getTransformPivotPosition(session: ActiveTransformSession): Vec3 {
    if (session.preview.kind === "brush") {
      const previewBrush = this.createPreviewBrushForSession(session);

      if (previewBrush !== null) {
        if (session.target.kind === "brushFace") {
          return getBrushFaceWorldCenter(previewBrush, session.target.faceId);
        }

        if (session.target.kind === "brushEdge") {
          return getBrushEdgeWorldSegment(previewBrush, session.target.edgeId)
            .center;
        }

        if (session.target.kind === "brushVertex") {
          return getBrushVertexWorldPosition(
            previewBrush,
            session.target.vertexId
          );
        }
      }
    }

    switch (session.preview.kind) {
      case "brush":
        return session.preview.center;
      case "brushes":
        return session.preview.pivot;
      case "modelInstance":
        return session.preview.position;
      case "modelInstances":
        return session.preview.pivot;
      case "pathPoint":
        return session.preview.position;
      case "entity":
        return session.preview.position;
      case "entities":
        return session.preview.pivot;
    }
  }

  private createPreviewBrushForSession(
    session: ActiveTransformSession
  ): Brush | null {
    if (session.preview.kind !== "brush") {
      return null;
    }

    if (
      session.target.kind !== "brush" &&
      session.target.kind !== "brushFace" &&
      session.target.kind !== "brushEdge" &&
      session.target.kind !== "brushVertex"
    ) {
      return null;
    }

    const currentBrush = this.currentDocument?.brushes[session.target.brushId];

    if (currentBrush === undefined) {
      return null;
    }

    return updateBrush(currentBrush, {
      center: {
        ...session.preview.center
      },
      rotationDegrees: {
        ...session.preview.rotationDegrees
      },
      size: {
        ...session.preview.size
      },
      geometry: cloneBrushGeometry(session.preview.geometry)
    });
  }

  private clearTransformGizmo() {
    for (const child of [...this.transformGizmoGroup.children]) {
      this.transformGizmoGroup.remove(child);

      child.traverse((object) => {
        const maybeMesh = object as Mesh & { isMesh?: boolean };

        if (maybeMesh.isMesh === true) {
          maybeMesh.geometry.dispose();

          if (Array.isArray(maybeMesh.material)) {
            for (const material of maybeMesh.material) {
              material.dispose();
            }
          } else {
            maybeMesh.material.dispose();
          }
        }
      });
    }

    this.transformGizmoGroup.visible = false;
  }

  private markTransformHandleObject<TObject extends Object3D>(
    object: TObject
  ): TObject {
    object.renderOrder = GIZMO_RENDER_ORDER;

    object.traverse((child) => {
      child.renderOrder = GIZMO_RENDER_ORDER;
    });

    return object;
  }

  private createTransformHandleMaterial(
    color: number,
    isActive: boolean,
    transparent = false
  ) {
    return new MeshBasicMaterial({
      color,
      transparent: transparent || isActive,
      opacity: transparent
        ? 0.001
        : isActive
          ? GIZMO_ACTIVE_OPACITY
          : GIZMO_INACTIVE_OPACITY,
      depthWrite: false,
      depthTest: false
    });
  }

  private createTranslateHandle(axis: TransformAxis, isActive: boolean): Group {
    const axisVector = this.axisVector(axis);
    const color = isActive ? GIZMO_ACTIVE_COLOR : GIZMO_AXIS_COLORS[axis];
    const group = new Group();
    const line = new Mesh(
      new CylinderGeometry(0.025, 0.025, GIZMO_TRANSLATE_LENGTH, 10),
      this.createTransformHandleMaterial(color, isActive)
    );
    const arrow = new Mesh(
      new ConeGeometry(0.09, 0.28, 12),
      this.createTransformHandleMaterial(color, isActive)
    );
    const pick = new Mesh(
      new CylinderGeometry(
        GIZMO_PICK_THICKNESS,
        GIZMO_PICK_THICKNESS,
        GIZMO_TRANSLATE_LENGTH + 0.36,
        10
      ),
      this.createTransformHandleMaterial(color, isActive, true)
    );

    line.position.copy(axisVector).multiplyScalar(GIZMO_TRANSLATE_LENGTH * 0.5);
    arrow.position
      .copy(axisVector)
      .multiplyScalar(GIZMO_TRANSLATE_LENGTH + 0.18);
    pick.position
      .copy(axisVector)
      .multiplyScalar((GIZMO_TRANSLATE_LENGTH + 0.36) * 0.5);

    if (axis === "x") {
      line.rotation.z = -Math.PI * 0.5;
      arrow.rotation.z = -Math.PI * 0.5;
      pick.rotation.z = -Math.PI * 0.5;
    } else if (axis === "z") {
      line.rotation.x = Math.PI * 0.5;
      arrow.rotation.x = Math.PI * 0.5;
      pick.rotation.x = Math.PI * 0.5;
    }

    pick.userData.transformAxisConstraint = axis;

    group.add(line);
    group.add(arrow);
    group.add(pick);
    return this.markTransformHandleObject(group);
  }

  private createRotateHandle(axis: TransformAxis, isActive: boolean): Group {
    const color = isActive ? GIZMO_ACTIVE_COLOR : GIZMO_AXIS_COLORS[axis];
    const group = new Group();
    const ring = new Mesh(
      new TorusGeometry(GIZMO_ROTATE_RADIUS, GIZMO_ROTATE_TUBE, 8, 48),
      this.createTransformHandleMaterial(color, isActive)
    );
    const pick = new Mesh(
      new TorusGeometry(GIZMO_ROTATE_RADIUS, GIZMO_PICK_RING_TUBE, 8, 36),
      this.createTransformHandleMaterial(color, isActive, true)
    );

    if (axis === "x") {
      ring.rotation.y = Math.PI * 0.5;
      pick.rotation.y = Math.PI * 0.5;
    } else if (axis === "y") {
      ring.rotation.x = Math.PI * 0.5;
      pick.rotation.x = Math.PI * 0.5;
    }

    pick.userData.transformAxisConstraint = axis;
    group.add(ring);
    group.add(pick);
    return this.markTransformHandleObject(group);
  }

  private createScaleHandle(axis: TransformAxis, isActive: boolean): Group {
    const axisVector = this.axisVector(axis);
    const color = isActive ? GIZMO_ACTIVE_COLOR : GIZMO_AXIS_COLORS[axis];
    const group = new Group();
    const line = new Mesh(
      new CylinderGeometry(0.022, 0.022, GIZMO_SCALE_LENGTH, 10),
      this.createTransformHandleMaterial(color, isActive)
    );
    const cube = new Mesh(
      new BoxGeometry(0.16, 0.16, 0.16),
      this.createTransformHandleMaterial(color, isActive)
    );
    const pick = new Mesh(
      new CylinderGeometry(
        GIZMO_PICK_THICKNESS,
        GIZMO_PICK_THICKNESS,
        GIZMO_SCALE_LENGTH + 0.3,
        10
      ),
      this.createTransformHandleMaterial(color, isActive, true)
    );

    line.position.copy(axisVector).multiplyScalar(GIZMO_SCALE_LENGTH * 0.5);
    cube.position.copy(axisVector).multiplyScalar(GIZMO_SCALE_LENGTH + 0.12);
    pick.position
      .copy(axisVector)
      .multiplyScalar((GIZMO_SCALE_LENGTH + 0.3) * 0.5);

    if (axis === "x") {
      line.rotation.z = -Math.PI * 0.5;
      pick.rotation.z = -Math.PI * 0.5;
    } else if (axis === "z") {
      line.rotation.x = Math.PI * 0.5;
      pick.rotation.x = Math.PI * 0.5;
    }

    pick.userData.transformAxisConstraint = axis;

    group.add(line);
    group.add(cube);
    group.add(pick);
    return this.markTransformHandleObject(group);
  }

  private createUniformScaleHandle(isActive: boolean): Mesh {
    const mesh = new Mesh(
      new BoxGeometry(
        GIZMO_CENTER_HANDLE_SIZE,
        GIZMO_CENTER_HANDLE_SIZE,
        GIZMO_CENTER_HANDLE_SIZE
      ),
      this.createTransformHandleMaterial(
        isActive ? GIZMO_ACTIVE_COLOR : 0xe6edf8,
        isActive
      )
    );
    mesh.userData.transformAxisConstraint = null;
    return this.markTransformHandleObject(mesh);
  }

  private isBrushDisplayedInViewport(brushId: string): boolean {
    const brush = this.currentDocument?.brushes[brushId];
    return brush?.enabled === true && brush.visible === true;
  }

  private isEntityDisplayedInViewport(entityId: string): boolean {
    const entity = this.currentDocument?.entities[entityId];
    return entity?.enabled === true && entity.visible === true;
  }

  private isModelInstanceDisplayedInViewport(modelInstanceId: string): boolean {
    const modelInstance = this.currentDocument?.modelInstances[modelInstanceId];
    return modelInstance?.enabled === true && modelInstance.visible === true;
  }

  private isPathDisplayedInViewport(pathId: string): boolean {
    const path = this.currentDocument?.paths[pathId];
    return path?.enabled === true && path.visible === true;
  }

  private isTransformTargetDisplayedInViewport(session: ActiveTransformSession): boolean {
    switch (session.target.kind) {
      case "brush":
      case "brushFace":
      case "brushEdge":
      case "brushVertex":
        return this.isBrushDisplayedInViewport(session.target.brushId);
      case "brushes":
        return session.target.items.every((item) =>
          this.isBrushDisplayedInViewport(item.brushId)
        );
      case "pathPoint":
        return this.isPathDisplayedInViewport(session.target.pathId);
      case "entity":
        return this.isEntityDisplayedInViewport(session.target.entityId);
      case "entities":
        return session.target.items.every((item) =>
          this.isEntityDisplayedInViewport(item.entityId)
        );
      case "modelInstance":
        return this.isModelInstanceDisplayedInViewport(
          session.target.modelInstanceId
        );
      case "modelInstances":
        return session.target.items.every((item) =>
          this.isModelInstanceDisplayedInViewport(item.modelInstanceId)
        );
    }
  }

  private getDisplayedTransformSession(): ActiveTransformSession | null {
    if (this.currentTransformSession.kind === "active") {
      return this.isTransformTargetDisplayedInViewport(this.currentTransformSession)
        ? this.currentTransformSession
        : null;
    }

    if (this.toolMode !== "select" || this.currentDocument === null) {
      return null;
    }

    const transformTarget = resolveTransformTarget(
      this.currentDocument,
      this.currentSelection,
      this.whiteboxSelectionMode,
      this.currentActiveSelectionId
    ).target;

    if (
      transformTarget === null ||
      !supportsTransformOperation(transformTarget, "translate")
    ) {
      return null;
    }

    const selectionSession: ActiveTransformSession = {
      kind: "active",
      id: "__selection-translate-gizmo__",
      source: "gizmo",
      sourcePanelId: this.panelId,
      operation: "translate",
      surfaceSnapEnabled: false,
      axisConstraint: null,
      axisConstraintSpace: "world",
      target: transformTarget,
      preview: createTransformPreviewFromTarget(transformTarget)
    };

    return this.isTransformTargetDisplayedInViewport(selectionSession)
      ? selectionSession
      : null;
  }

  private syncTransformGizmo() {
    this.clearTransformGizmo();

    const session = this.getDisplayedTransformSession();

    if (session === null) {
      return;
    }

    const effectiveRotationAxis =
      session.operation === "rotate"
        ? this.getEffectiveRotationAxis(session)
        : null;

    if (session.operation === "translate") {
      this.transformGizmoGroup.add(
        this.createTranslateHandle("x", session.axisConstraint === "x")
      );
      this.transformGizmoGroup.add(
        this.createTranslateHandle("y", session.axisConstraint === "y")
      );
      this.transformGizmoGroup.add(
        this.createTranslateHandle("z", session.axisConstraint === "z")
      );
    } else if (session.operation === "rotate") {
      for (const axis of ["x", "y", "z"] as const) {
        if (!supportsTransformAxisConstraint(session, axis)) {
          continue;
        }

        this.transformGizmoGroup.add(
          this.createRotateHandle(axis, effectiveRotationAxis === axis)
        );
      }
    } else if (
      session.operation === "scale" &&
      (session.target.kind === "modelInstance" ||
        session.target.kind === "brush" ||
        session.target.kind === "brushFace" ||
        session.target.kind === "brushEdge")
    ) {
      for (const axis of ["x", "y", "z"] as const) {
        this.transformGizmoGroup.add(
          this.createScaleHandle(axis, session.axisConstraint === axis)
        );
      }
      this.transformGizmoGroup.add(
        this.createUniformScaleHandle(session.axisConstraint === null)
      );
    }

    this.transformGizmoGroup.visible =
      this.transformGizmoGroup.children.length > 0;
    this.updateTransformGizmoPose();
  }

  private updateTransformGizmoPose() {
    const session = this.getDisplayedTransformSession();

    if (session === null || !this.transformGizmoGroup.visible) {
      return;
    }

    const pivot = this.getTransformPivotPosition(session);
    const pivotVector = new Vector3(pivot.x, pivot.y, pivot.z);

    this.transformGizmoGroup.position.copy(pivotVector);
    this.transformGizmoGroup.quaternion.identity();

    if (
      session.axisConstraint !== null &&
      session.axisConstraintSpace === "local" &&
      supportsLocalTransformAxisConstraint(session, session.axisConstraint)
    ) {
      const orientation = this.getTransformTargetOrientation(session);

      if (orientation !== null) {
        this.transformGizmoGroup.quaternion.copy(orientation);
      }
    }

    let scale =
      GIZMO_SCREEN_SIZE_ORTHOGRAPHIC /
      Math.max(this.orthographicCamera.zoom, 0.0001);

    if (this.viewMode === "perspective") {
      scale = Math.max(
        0.5,
        pivotVector.distanceTo(this.perspectiveCamera.position) *
          GIZMO_SCREEN_SIZE_PERSPECTIVE
      );
    }

    this.transformGizmoGroup.scale.setScalar(scale);
  }

  private getTransformPlaneForPivot(pivot: Vec3): Plane {
    switch (this.viewMode) {
      case "perspective":
      case "top":
        return this.transformPlane.set(new Vector3(0, 1, 0), -pivot.y);
      case "front":
        return this.transformPlane.set(new Vector3(0, 0, 1), -pivot.z);
      case "side":
        return this.transformPlane.set(new Vector3(1, 0, 0), -pivot.x);
    }
  }

  private setPointerFromClientPosition(
    clientX: number,
    clientY: number
  ): boolean {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return false;
    }

    this.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((clientY - bounds.top) / bounds.height) * 2 - 1);
    return true;
  }

  private getPointerPlaneIntersection(
    clientX: number,
    clientY: number,
    plane: Plane
  ): Vector3 | null {
    if (!this.setPointerFromClientPosition(clientX, clientY)) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    if (
      this.raycaster.ray.intersectPlane(plane, this.transformIntersection) ===
      null
    ) {
      return null;
    }

    return this.transformIntersection.clone();
  }

  private getFallbackWorldUnitsPerPixel(pivot: Vec3): number {
    if (this.container === null) {
      return 0;
    }

    const height = Math.max(1, this.container.clientHeight);

    if (this.viewMode === "perspective") {
      const pivotVector = new Vector3(pivot.x, pivot.y, pivot.z);
      const distance = pivotVector.distanceTo(this.perspectiveCamera.position);
      const visibleHeight =
        2 * Math.tan((this.perspectiveCamera.fov * Math.PI) / 360) * distance;
      return visibleHeight / height;
    }

    return ORTHOGRAPHIC_FRUSTUM_HEIGHT / this.orthographicCamera.zoom / height;
  }

  private getMovementDistanceAlongWorldAxis(
    axisVector: Vector3,
    pivot: Vec3,
    origin: { x: number; y: number },
    current: { x: number; y: number }
  ): number {
    const pivotVector = new Vector3(pivot.x, pivot.y, pivot.z);
    const projectedStart = pivotVector.clone().project(this.getActiveCamera());
    const projectedEnd = pivotVector
      .clone()
      .add(axisVector.clone().normalize())
      .project(this.getActiveCamera());
    const screenDelta = new Vector2(
      projectedEnd.x - projectedStart.x,
      projectedEnd.y - projectedStart.y
    );
    const pointerDelta = new Vector2(
      current.x - origin.x,
      current.y - origin.y
    );

    if (this.container !== null) {
      screenDelta.set(
        screenDelta.x * this.container.clientWidth * 0.5,
        -screenDelta.y * this.container.clientHeight * 0.5
      );
    }

    const axisLength = screenDelta.length();

    if (axisLength >= 0.0001) {
      screenDelta.normalize();
      return pointerDelta.dot(screenDelta) / axisLength;
    }

    return -(current.y - origin.y) * this.getFallbackWorldUnitsPerPixel(pivot);
  }

  private getAxisMovementDistance(
    axis: TransformAxis,
    pivot: Vec3,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    session?: ActiveTransformSession,
    axisSpace: TransformAxisSpace = "world"
  ): number {
    const axisVector =
      session === undefined
        ? this.axisVector(axis)
        : this.getConstraintAxisWorldVector(session, axis, axisSpace);
    return this.getMovementDistanceAlongWorldAxis(
      axisVector,
      pivot,
      origin,
      current
    );
  }

  private buildTransformPreviewFromPointer(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ): ActiveTransformSession {
    const nextSession = cloneTransformSession(
      session
    ) as ActiveTransformSession;
    nextSession.axisConstraint = axisConstraint;
    nextSession.axisConstraintSpace =
      axisConstraint === null ? "world" : axisConstraintSpace;

    switch (session.operation) {
      case "translate":
        nextSession.preview = this.buildTranslatedPreview(
          session,
          origin,
          current,
          axisConstraint,
          nextSession.axisConstraintSpace
        );
        return nextSession;
      case "rotate":
        nextSession.preview = this.buildRotatedPreview(
          session,
          origin,
          current,
          axisConstraint,
          nextSession.axisConstraintSpace
        );
        return nextSession;
      case "scale":
        nextSession.preview = this.buildScaledPreview(
          session,
          origin,
          current,
          axisConstraint
        );
        return nextSession;
    }
  }

  private buildTranslatedPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ) {
    if (
      session.target.kind === "brushes" ||
      session.target.kind === "entities" ||
      session.target.kind === "modelInstances"
    ) {
      const preview = this.buildBatchTranslatedPreview(
        session,
        origin,
        current,
        axisConstraint,
        axisConstraintSpace
      );

      return this.applySurfaceSnapMoveToTranslatedPreview(
        session,
        preview,
        current,
        axisConstraint,
        axisConstraintSpace
      );
    }

    if (
      session.target.kind === "brushFace" ||
      session.target.kind === "brushEdge" ||
      session.target.kind === "brushVertex"
    ) {
      return this.buildComponentTranslatedBrushPreview(
        session,
        origin,
        current,
        axisConstraint,
        axisConstraintSpace
      );
    }

    const initialPosition =
      session.target.kind === "brush"
        ? session.target.initialCenter
        : session.target.kind === "modelInstance"
          ? session.target.initialPosition
          : session.target.kind === "pathPoint"
            ? session.target.initialPosition
          : session.target.initialPosition;
    let nextPosition = {
      ...initialPosition
    };

    if (axisConstraint === null) {
      const plane = this.getTransformPlaneForPivot(initialPosition);
      const startIntersection = this.getPointerPlaneIntersection(
        origin.x,
        origin.y,
        plane
      );
      const currentIntersection = this.getPointerPlaneIntersection(
        current.x,
        current.y,
        plane
      );

      if (startIntersection !== null && currentIntersection !== null) {
        const delta = currentIntersection.sub(startIntersection);

        switch (this.viewMode) {
          case "perspective":
          case "top":
            nextPosition = {
              ...initialPosition,
              x: this.snapWhiteboxPositionValue(initialPosition.x + delta.x),
              z: this.snapWhiteboxPositionValue(initialPosition.z + delta.z)
            };
            break;
          case "front":
            nextPosition = {
              ...initialPosition,
              x: this.snapWhiteboxPositionValue(initialPosition.x + delta.x),
              y: this.snapWhiteboxPositionValue(initialPosition.y + delta.y)
            };
            break;
          case "side":
            nextPosition = {
              ...initialPosition,
              y: this.snapWhiteboxPositionValue(initialPosition.y + delta.y),
              z: this.snapWhiteboxPositionValue(initialPosition.z + delta.z)
            };
            break;
        }
      }
    } else if (
      axisConstraintSpace === "local" &&
      supportsLocalTransformAxisConstraint(session, axisConstraint)
    ) {
      const axisVector = this.getConstraintAxisWorldVector(
        session,
        axisConstraint,
        axisConstraintSpace
      );
      const axisDelta = this.getMovementDistanceAlongWorldAxis(
        axisVector,
        initialPosition,
        origin,
        current
      );
      const snappedAxisDelta = this.whiteboxSnapEnabled
        ? snapValueToGrid(axisDelta, this.whiteboxSnapStep)
        : axisDelta;

      this.transformAxisDelta.copy(axisVector).multiplyScalar(snappedAxisDelta);
      nextPosition = {
        x: initialPosition.x + this.transformAxisDelta.x,
        y: initialPosition.y + this.transformAxisDelta.y,
        z: initialPosition.z + this.transformAxisDelta.z
      };
    } else {
      const axisDelta = this.getAxisMovementDistance(
        axisConstraint,
        initialPosition,
        origin,
        current
      );
      nextPosition = this.setAxisComponent(
        nextPosition,
        axisConstraint,
        this.snapWhiteboxPositionValue(
          this.getAxisComponent(initialPosition, axisConstraint) + axisDelta
        )
      );
    }

    let preview: TransformPreview;

    if (session.target.kind === "brush") {
      preview = {
        kind: "brush" as const,
        center: nextPosition,
        rotationDegrees: {
          ...session.target.initialRotationDegrees
        },
        size: {
          ...session.target.initialSize
        },
        geometry: cloneBrushGeometry(session.target.initialGeometry)
      };
    } else if (session.target.kind === "modelInstance") {
      preview = {
        kind: "modelInstance" as const,
        position: nextPosition,
        rotationDegrees: {
          ...session.target.initialRotationDegrees
        },
        scale: {
          ...session.target.initialScale
        }
      };
    } else if (session.target.kind === "pathPoint") {
      preview = {
        kind: "pathPoint" as const,
        position: nextPosition
      };
    } else {
      preview = {
        kind: "entity" as const,
        position: nextPosition,
        rotation:
          session.target.initialRotation.kind === "yaw"
            ? {
                kind: "yaw" as const,
                yawDegrees: session.target.initialRotation.yawDegrees
              }
            : session.target.initialRotation.kind === "direction"
              ? {
                  kind: "direction" as const,
                  direction: {
                    ...session.target.initialRotation.direction
                  }
                }
              : {
                  kind: "none" as const
                }
      };
    }

    return this.applySurfaceSnapMoveToTranslatedPreview(
      session,
      preview,
      current,
      axisConstraint,
      axisConstraintSpace
    );
  }

  private buildRotatedPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ) {
    if (
      session.target.kind === "brushes" ||
      session.target.kind === "entities" ||
      session.target.kind === "modelInstances"
    ) {
      return this.buildBatchRotatedPreview(
        session,
        origin,
        current,
        axisConstraint,
        axisConstraintSpace
      );
    }

    if (
      session.target.kind === "brushFace" ||
      session.target.kind === "brushEdge"
    ) {
      return this.buildComponentRotatedBrushPreview(
        session,
        origin,
        current,
        axisConstraint
      );
    }

    const effectiveAxis =
      axisConstraint ?? this.getEffectiveRotationAxis(session);
    const pointerDeltaDegrees =
      (current.x - origin.x - (current.y - origin.y)) * 0.5;
    const pointerDeltaRadians = (pointerDeltaDegrees * Math.PI) / 180;

    if (session.target.kind === "brush") {
      let nextRotationDegrees = {
        ...session.target.initialRotationDegrees
      };

      if (axisConstraint !== null) {
        const initialOrientation = this.createRotationQuaternion(
          session.target.initialRotationDegrees
        );
        const deltaRotation = new Quaternion().setFromAxisAngle(
          this.axisVector(effectiveAxis),
          pointerDeltaRadians
        );

        nextRotationDegrees = this.getQuaternionEulerDegrees(
          axisConstraintSpace === "local" &&
            supportsLocalTransformAxisConstraint(session, effectiveAxis)
            ? initialOrientation.multiply(deltaRotation)
            : deltaRotation.multiply(initialOrientation)
        );
      } else {
        nextRotationDegrees[effectiveAxis] = this.normalizeDegrees(
          nextRotationDegrees[effectiveAxis] + pointerDeltaDegrees
        );
      }

      return {
        kind: "brush" as const,
        center: {
          ...session.target.initialCenter
        },
        rotationDegrees: nextRotationDegrees,
        size: {
          ...session.target.initialSize
        },
        geometry: cloneBrushGeometry(session.target.initialGeometry)
      };
    }

    if (session.target.kind === "modelInstance") {
      let nextRotationDegrees = {
        ...session.target.initialRotationDegrees
      };

      if (axisConstraint !== null) {
        const initialOrientation = this.createRotationQuaternion(
          session.target.initialRotationDegrees
        );
        const deltaRotation = new Quaternion().setFromAxisAngle(
          this.axisVector(effectiveAxis),
          pointerDeltaRadians
        );

        nextRotationDegrees = this.getQuaternionEulerDegrees(
          axisConstraintSpace === "local" &&
            supportsLocalTransformAxisConstraint(session, effectiveAxis)
            ? initialOrientation.multiply(deltaRotation)
            : deltaRotation.multiply(initialOrientation)
        );
      } else {
        nextRotationDegrees[effectiveAxis] = this.normalizeDegrees(
          nextRotationDegrees[effectiveAxis] + pointerDeltaDegrees
        );
      }

      return {
        kind: "modelInstance" as const,
        position: {
          ...session.target.initialPosition
        },
        rotationDegrees: nextRotationDegrees,
        scale: {
          ...session.target.initialScale
        }
      };
    }

    if (session.target.kind !== "entity") {
      throw new Error(
        "Rotation previews are only supported for model instances and rotatable entities."
      );
    }

    if (session.target.initialRotation.kind === "yaw") {
      if (
        axisConstraint !== null &&
        axisConstraintSpace === "local" &&
        supportsLocalTransformAxisConstraint(session, effectiveAxis)
      ) {
        const initialOrientation = this.createRotationQuaternion({
          x: 0,
          y: session.target.initialRotation.yawDegrees,
          z: 0
        });
        const deltaRotation = new Quaternion().setFromAxisAngle(
          this.axisVector("y"),
          pointerDeltaRadians
        );
        const nextRotationDegrees = this.getQuaternionEulerDegrees(
          initialOrientation.multiply(deltaRotation)
        );

        return {
          kind: "entity" as const,
          position: {
            ...session.target.initialPosition
          },
          rotation: {
            kind: "yaw" as const,
            yawDegrees: normalizeYawDegrees(nextRotationDegrees.y)
          }
        };
      }

      return {
        kind: "entity" as const,
        position: {
          ...session.target.initialPosition
        },
        rotation: {
          kind: "yaw" as const,
          yawDegrees: normalizeYawDegrees(
            session.target.initialRotation.yawDegrees + pointerDeltaDegrees
          )
        }
      };
    }

    if (session.target.initialRotation.kind === "direction") {
      const initialOrientation = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        new Vector3(
          session.target.initialRotation.direction.x,
          session.target.initialRotation.direction.y,
          session.target.initialRotation.direction.z
        ).normalize()
      );
      const deltaRotation = new Quaternion().setFromAxisAngle(
        this.axisVector(effectiveAxis),
        pointerDeltaRadians
      );
      const nextOrientation =
        axisConstraint !== null &&
        axisConstraintSpace === "local" &&
        supportsLocalTransformAxisConstraint(session, effectiveAxis)
          ? initialOrientation.multiply(deltaRotation)
          : deltaRotation.multiply(initialOrientation);
      const direction = new Vector3(0, 1, 0)
        .applyQuaternion(nextOrientation)
        .normalize();

      return {
        kind: "entity" as const,
        position: {
          ...session.target.initialPosition
        },
        rotation: {
          kind: "direction" as const,
          direction: {
            x: direction.x,
            y: direction.y,
            z: direction.z
          }
        }
      };
    }

    return {
      kind: "entity" as const,
      position: {
        ...session.target.initialPosition
      },
      rotation: {
        kind: "none" as const
      }
    };
  }

  private buildScaledPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null
  ) {
    if (
      session.target.kind === "brushes" ||
      session.target.kind === "modelInstances"
    ) {
      return this.buildBatchScaledPreview(
        session,
        origin,
        current,
        axisConstraint
      );
    }

    if (
      session.target.kind === "brushFace" ||
      session.target.kind === "brushEdge"
    ) {
      return this.buildComponentScaledBrushPreview(
        session,
        origin,
        current,
        axisConstraint
      );
    }

    if (session.target.kind === "brush") {
      const nextSize = {
        ...session.target.initialSize
      };

      if (axisConstraint === null) {
        const uniformFactor =
          1 + (current.x - origin.x - (current.y - origin.y)) * 0.01;
        nextSize.x = this.snapWhiteboxSizeValue(
          session.target.initialSize.x * uniformFactor
        );
        nextSize.y = this.snapWhiteboxSizeValue(
          session.target.initialSize.y * uniformFactor
        );
        nextSize.z = this.snapWhiteboxSizeValue(
          session.target.initialSize.z * uniformFactor
        );
      } else {
        const scaleAxis = this.resolveObjectScaleConstraintAxis(
          session,
          axisConstraint
        );
        const scaleFactor =
          1 +
          this.getAxisMovementDistance(
            axisConstraint,
            session.target.initialCenter,
            origin,
            current
          ) *
            0.45;
        nextSize[scaleAxis] = this.snapWhiteboxSizeValue(
          session.target.initialSize[scaleAxis] * scaleFactor
        );
      }

      return {
        kind: "brush" as const,
        center: {
          ...session.target.initialCenter
        },
        rotationDegrees: {
          ...session.target.initialRotationDegrees
        },
        size: nextSize,
        geometry: scaleBrushGeometryToSize(
          session.target.initialGeometry,
          nextSize
        )
      };
    }

    if (session.target.kind !== "modelInstance") {
      throw new Error(
        "Scale previews are only supported for model instances and whitebox boxes."
      );
    }

    const nextScale = {
      ...session.target.initialScale
    };

    if (axisConstraint === null) {
      const uniformFactor =
        1 + (current.x - origin.x - (current.y - origin.y)) * 0.01;
      nextScale.x = this.snapScaleValue(
        session.target.initialScale.x * uniformFactor
      );
      nextScale.y = this.snapScaleValue(
        session.target.initialScale.y * uniformFactor
      );
      nextScale.z = this.snapScaleValue(
        session.target.initialScale.z * uniformFactor
      );
    } else {
      const scaleAxis = this.resolveObjectScaleConstraintAxis(
        session,
        axisConstraint
      );
      const scaleFactor =
        1 +
        this.getAxisMovementDistance(
          axisConstraint,
          session.target.initialPosition,
          origin,
          current
        ) *
          0.45;
      nextScale[scaleAxis] = this.snapScaleValue(
        session.target.initialScale[scaleAxis] * scaleFactor
      );
    }

    return {
      kind: "modelInstance" as const,
      position: {
        ...session.target.initialPosition
      },
      rotationDegrees: {
        ...session.target.initialRotationDegrees
      },
      scale: nextScale
    };
  }

  private scalePositionAroundPivot(
    position: Vec3,
    pivot: Vec3,
    scaleFactor: number,
    axisConstraint: TransformAxis | null
  ): Vec3 {
    if (axisConstraint === null) {
      return {
        x: this.snapWhiteboxPositionValue(
          pivot.x + (position.x - pivot.x) * scaleFactor
        ),
        y: this.snapWhiteboxPositionValue(
          pivot.y + (position.y - pivot.y) * scaleFactor
        ),
        z: this.snapWhiteboxPositionValue(
          pivot.z + (position.z - pivot.z) * scaleFactor
        )
      };
    }

    return {
      x:
        axisConstraint === "x"
          ? this.snapWhiteboxPositionValue(
              pivot.x + (position.x - pivot.x) * scaleFactor
            )
          : position.x,
      y:
        axisConstraint === "y"
          ? this.snapWhiteboxPositionValue(
              pivot.y + (position.y - pivot.y) * scaleFactor
            )
          : position.y,
      z:
        axisConstraint === "z"
          ? this.snapWhiteboxPositionValue(
              pivot.z + (position.z - pivot.z) * scaleFactor
            )
          : position.z
    };
  }

  private buildBatchTranslatedPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ) {
    if (
      session.target.kind !== "brushes" &&
      session.target.kind !== "modelInstances" &&
      session.target.kind !== "entities"
    ) {
      throw new Error("Batch translate preview requires a batch target.");
    }

    const target = session.target;
    const initialPivot = target.initialPivot;
    let nextPivot = {
      ...initialPivot
    };

    if (axisConstraint === null) {
      const plane = this.getTransformPlaneForPivot(initialPivot);
      const startIntersection = this.getPointerPlaneIntersection(
        origin.x,
        origin.y,
        plane
      );
      const currentIntersection = this.getPointerPlaneIntersection(
        current.x,
        current.y,
        plane
      );

      if (startIntersection !== null && currentIntersection !== null) {
        const delta = currentIntersection.sub(startIntersection);

        switch (this.viewMode) {
          case "perspective":
          case "top":
            nextPivot = {
              ...initialPivot,
              x: this.snapWhiteboxPositionValue(initialPivot.x + delta.x),
              z: this.snapWhiteboxPositionValue(initialPivot.z + delta.z)
            };
            break;
          case "front":
            nextPivot = {
              ...initialPivot,
              x: this.snapWhiteboxPositionValue(initialPivot.x + delta.x),
              y: this.snapWhiteboxPositionValue(initialPivot.y + delta.y)
            };
            break;
          case "side":
            nextPivot = {
              ...initialPivot,
              y: this.snapWhiteboxPositionValue(initialPivot.y + delta.y),
              z: this.snapWhiteboxPositionValue(initialPivot.z + delta.z)
            };
            break;
        }
      }
    } else if (
      axisConstraintSpace === "local" &&
      supportsLocalTransformAxisConstraint(session, axisConstraint)
    ) {
      const axisVector = this.getConstraintAxisWorldVector(
        session,
        axisConstraint,
        axisConstraintSpace
      );
      const axisDelta = this.getMovementDistanceAlongWorldAxis(
        axisVector,
        initialPivot,
        origin,
        current
      );
      const snappedAxisDelta = this.whiteboxSnapEnabled
        ? snapValueToGrid(axisDelta, this.whiteboxSnapStep)
        : axisDelta;
      const worldDelta = axisVector.clone().multiplyScalar(snappedAxisDelta);

      nextPivot = {
        x: initialPivot.x + worldDelta.x,
        y: initialPivot.y + worldDelta.y,
        z: initialPivot.z + worldDelta.z
      };
    } else {
      const axisDelta = this.getAxisMovementDistance(
        axisConstraint,
        initialPivot,
        origin,
        current
      );

      nextPivot = this.setAxisComponent(
        nextPivot,
        axisConstraint,
        this.snapWhiteboxPositionValue(
          this.getAxisComponent(initialPivot, axisConstraint) + axisDelta
        )
      );
    }

    const worldDelta = {
      x: nextPivot.x - initialPivot.x,
      y: nextPivot.y - initialPivot.y,
      z: nextPivot.z - initialPivot.z
    };

    if (target.kind === "brushes") {
      return {
        kind: "brushes" as const,
        pivot: nextPivot,
        items: target.items.map((item) => ({
          brushId: item.brushId,
          center: {
            x: item.initialCenter.x + worldDelta.x,
            y: item.initialCenter.y + worldDelta.y,
            z: item.initialCenter.z + worldDelta.z
          },
          rotationDegrees: {
            ...item.initialRotationDegrees
          },
          size: {
            ...item.initialSize
          },
          geometry: cloneBrushGeometry(item.initialGeometry)
        }))
      };
    }

    if (target.kind === "modelInstances") {
      return {
        kind: "modelInstances" as const,
        pivot: nextPivot,
        items: target.items.map((item) => ({
          modelInstanceId: item.modelInstanceId,
          position: {
            x: item.initialPosition.x + worldDelta.x,
            y: item.initialPosition.y + worldDelta.y,
            z: item.initialPosition.z + worldDelta.z
          },
          rotationDegrees: {
            ...item.initialRotationDegrees
          },
          scale: {
            ...item.initialScale
          }
        }))
      };
    }

    return {
      kind: "entities" as const,
      pivot: nextPivot,
      items: target.items.map((item) => ({
        entityId: item.entityId,
        position: {
          x: item.initialPosition.x + worldDelta.x,
          y: item.initialPosition.y + worldDelta.y,
          z: item.initialPosition.z + worldDelta.z
        },
        rotation:
          item.initialRotation.kind === "yaw"
            ? {
                kind: "yaw" as const,
                yawDegrees: item.initialRotation.yawDegrees
              }
            : item.initialRotation.kind === "direction"
              ? {
                  kind: "direction" as const,
                  direction: {
                    ...item.initialRotation.direction
                  }
                }
              : {
                  kind: "none" as const
                }
      }))
    };
  }

  private applySurfaceSnapMoveToTranslatedPreview(
    session: ActiveTransformSession,
    preview: TransformPreview,
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ): TransformPreview {
    if (
      !session.surfaceSnapEnabled ||
      !supportsTransformSurfaceSnapTarget(session.target)
    ) {
      return preview;
    }

    const hit = this.getSurfaceSnapHitAtPointer(session, current);

    if (hit === null) {
      return preview;
    }

    const supportPoints = this.collectSurfaceSnapSupportPoints(session, preview);
    const axisVector =
      axisConstraint === null
        ? null
        : this.getConstraintAxisWorldVector(
            session,
            axisConstraint,
            axisConstraintSpace
          );
    const delta = computeSurfaceSnapDelta({
      supportPoints,
      hit,
      axisVector:
        axisVector === null
          ? null
          : {
              x: axisVector.x,
              y: axisVector.y,
              z: axisVector.z
            },
      surfaceOffset: SURFACE_SNAP_OFFSET
    });

    return delta === null
      ? preview
      : applyRigidDeltaToTransformPreview(preview, delta);
  }

  private getSurfaceSnapHitAtPointer(
    session: ActiveTransformSession,
    current: { x: number; y: number }
  ) {
    if (!this.setPointerFromClientPosition(current.x, current.y)) {
      return null;
    }

    const excludedIds = this.getSurfaceSnapExcludedIds(session);
    const raycastObjects = this.getSurfaceSnapRaycastObjects(excludedIds);

    if (raycastObjects.length === 0) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    return resolveSurfaceSnapHitFromIntersections({
      hits: this.raycaster.intersectObjects(raycastObjects, true),
      rayDirection: {
        x: this.raycaster.ray.direction.x,
        y: this.raycaster.ray.direction.y,
        z: this.raycaster.ray.direction.z
      },
      isObjectExcluded: (object) =>
        this.isSurfaceSnapObjectExcluded(object, excludedIds)
    });
  }

  private getSurfaceSnapExcludedIds(session: ActiveTransformSession) {
    const brushIds = new Set<string>();
    const entityIds = new Set<string>();
    const modelInstanceIds = new Set<string>();

    switch (session.target.kind) {
      case "brush":
        brushIds.add(session.target.brushId);
        break;
      case "brushes":
        for (const item of session.target.items) {
          brushIds.add(item.brushId);
        }
        break;
      case "entity":
        entityIds.add(session.target.entityId);
        break;
      case "entities":
        for (const item of session.target.items) {
          entityIds.add(item.entityId);
        }
        break;
      case "modelInstance":
        modelInstanceIds.add(session.target.modelInstanceId);
        break;
      case "modelInstances":
        for (const item of session.target.items) {
          modelInstanceIds.add(item.modelInstanceId);
        }
        break;
      case "brushFace":
      case "brushEdge":
      case "brushVertex":
      case "pathPoint":
        break;
    }

    return {
      brushIds,
      entityIds,
      modelInstanceIds
    };
  }

  private isSurfaceSnapObjectExcluded(
    object: Object3D,
    excludedIds: {
      brushIds: ReadonlySet<string>;
      entityIds: ReadonlySet<string>;
      modelInstanceIds: ReadonlySet<string>;
    }
  ): boolean {
    let current: Object3D | null = object;

    while (current !== null) {
      const brushId = current.userData.brushId;

      if (
        typeof brushId === "string" &&
        excludedIds.brushIds.has(brushId)
      ) {
        return true;
      }

      const entityId = current.userData.entityId;

      if (
        typeof entityId === "string" &&
        excludedIds.entityIds.has(entityId)
      ) {
        return true;
      }

      const modelInstanceId = current.userData.modelInstanceId;

      if (
        typeof modelInstanceId === "string" &&
        excludedIds.modelInstanceIds.has(modelInstanceId)
      ) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }

  private getSurfaceSnapRaycastObjects(excludedIds: {
    brushIds: ReadonlySet<string>;
    entityIds: ReadonlySet<string>;
    modelInstanceIds: ReadonlySet<string>;
  }): Object3D[] {
    const raycastObjects: Object3D[] = [];

    for (const [brushId, renderObjects] of this.brushRenderObjects) {
      if (excludedIds.brushIds.has(brushId)) {
        continue;
      }

      raycastObjects.push(renderObjects.mesh);
    }

    if (this.currentDocument !== null) {
      for (const [entityId, renderObjects] of this.entityRenderObjects) {
        if (excludedIds.entityIds.has(entityId)) {
          continue;
        }

        const entity = this.currentDocument.entities[entityId];

        if (entity?.kind !== "triggerVolume") {
          continue;
        }

        raycastObjects.push(renderObjects.group);
      }
    }

    for (const [modelInstanceId, renderGroup] of this.modelRenderObjects) {
      if (excludedIds.modelInstanceIds.has(modelInstanceId)) {
        continue;
      }

      raycastObjects.push(renderGroup);
    }

    return raycastObjects;
  }

  private collectSurfaceSnapSupportPoints(
    session: ActiveTransformSession,
    preview: TransformPreview
  ): Vec3[] {
    switch (session.target.kind) {
      case "brush":
        return preview.kind === "brush"
          ? createBrushSurfaceSnapSupportPoints(preview)
          : [];
      case "brushes":
        return preview.kind === "brushes"
          ? preview.items.flatMap((item) =>
              createBrushSurfaceSnapSupportPoints(item)
            )
          : [];
      case "modelInstance":
        return preview.kind === "modelInstance"
          ? createModelBoundingBoxSurfaceSnapSupportPoints({
              position: preview.position,
              rotationDegrees: preview.rotationDegrees,
              scale: preview.scale,
              boundingBox: this.getModelAssetBoundingBox(session.target.assetId)
            })
          : [];
      case "modelInstances":
        if (preview.kind !== "modelInstances") {
          return [];
        }

        const modelInstancesTarget = session.target;

        return preview.items.flatMap((item, index) =>
          createModelBoundingBoxSurfaceSnapSupportPoints({
            position: item.position,
            rotationDegrees: item.rotationDegrees,
            scale: item.scale,
            boundingBox: this.getModelAssetBoundingBox(
              modelInstancesTarget.items[index]?.assetId ?? ""
            )
          })
        );
      case "entity": {
        if (
          preview.kind !== "entity" ||
          session.target.entityKind !== "triggerVolume" ||
          this.currentDocument === null
        ) {
          return [];
        }

        const entity = this.currentDocument.entities[session.target.entityId];

        return entity?.kind === "triggerVolume"
          ? createAxisAlignedBoxSurfaceSnapSupportPoints(
              preview.position,
              entity.size
            )
          : [];
      }
      case "entities": {
        if (preview.kind !== "entities" || this.currentDocument === null) {
          return [];
        }

        const supportPoints: Vec3[] = [];

        for (const [index, item] of session.target.items.entries()) {
          if (item.entityKind !== "triggerVolume") {
            continue;
          }

          const previewItem = preview.items[index];

          if (previewItem === undefined) {
            continue;
          }

          const entity = this.currentDocument.entities[item.entityId];

          if (entity?.kind !== "triggerVolume") {
            continue;
          }

          supportPoints.push(
            ...createAxisAlignedBoxSurfaceSnapSupportPoints(
              previewItem.position,
              entity.size
            )
          );
        }

        return supportPoints;
      }
      case "brushFace":
      case "brushEdge":
      case "brushVertex":
      case "pathPoint":
        return [];
    }
  }

  private getModelAssetBoundingBox(assetId: string) {
    const asset = this.projectAssets[assetId];
    return asset?.kind === "model" ? asset.metadata.boundingBox : null;
  }

  private buildBatchRotatedPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ) {
    if (
      session.target.kind !== "brushes" &&
      session.target.kind !== "modelInstances" &&
      session.target.kind !== "entities"
    ) {
      throw new Error("Batch rotate preview requires a batch target.");
    }

    const target = session.target;
    const effectiveAxis =
      axisConstraint ?? this.getEffectiveRotationAxis(session);
    const pointerDeltaDegrees =
      (current.x - origin.x - (current.y - origin.y)) * 0.5;
    const pointerDeltaRadians = (pointerDeltaDegrees * Math.PI) / 180;
    const pivotWorld = target.initialPivot;
    const rotationAxis =
      axisConstraint !== null &&
      axisConstraintSpace === "local" &&
      supportsLocalTransformAxisConstraint(session, effectiveAxis)
        ? this.getConstraintAxisWorldVector(
            session,
            effectiveAxis,
            axisConstraintSpace
          )
        : this.axisVector(effectiveAxis);
    const normalizedRotationAxis = rotationAxis.clone().normalize();
    const deltaRotation = new Quaternion().setFromAxisAngle(
      normalizedRotationAxis,
      pointerDeltaRadians
    );
    const pivotVector = new Vector3(pivotWorld.x, pivotWorld.y, pivotWorld.z);

    if (target.kind === "brushes") {
      return {
        kind: "brushes" as const,
        pivot: {
          ...pivotWorld
        },
        items: target.items.map((item) => {
          const nextCenter = new Vector3(
            item.initialCenter.x - pivotWorld.x,
            item.initialCenter.y - pivotWorld.y,
            item.initialCenter.z - pivotWorld.z
          )
            .applyAxisAngle(normalizedRotationAxis, pointerDeltaRadians)
            .add(pivotVector);

          let nextRotationDegrees = {
            ...item.initialRotationDegrees
          };

          if (axisConstraint === null) {
            nextRotationDegrees[effectiveAxis] = this.normalizeDegrees(
              nextRotationDegrees[effectiveAxis] + pointerDeltaDegrees
            );
          } else {
            nextRotationDegrees = this.getQuaternionEulerDegrees(
              deltaRotation
                .clone()
                .multiply(
                  this.createRotationQuaternion(item.initialRotationDegrees)
                )
            );
          }

          return {
            brushId: item.brushId,
            center: {
              x: nextCenter.x,
              y: nextCenter.y,
              z: nextCenter.z
            },
            rotationDegrees: nextRotationDegrees,
            size: {
              ...item.initialSize
            },
            geometry: cloneBrushGeometry(item.initialGeometry)
          };
        })
      };
    }

    if (target.kind === "modelInstances") {
      return {
        kind: "modelInstances" as const,
        pivot: {
          ...pivotWorld
        },
        items: target.items.map((item) => {
          const nextPosition = new Vector3(
            item.initialPosition.x - pivotWorld.x,
            item.initialPosition.y - pivotWorld.y,
            item.initialPosition.z - pivotWorld.z
          )
            .applyAxisAngle(normalizedRotationAxis, pointerDeltaRadians)
            .add(pivotVector);

          let nextRotationDegrees = {
            ...item.initialRotationDegrees
          };

          if (axisConstraint === null) {
            nextRotationDegrees[effectiveAxis] = this.normalizeDegrees(
              nextRotationDegrees[effectiveAxis] + pointerDeltaDegrees
            );
          } else {
            nextRotationDegrees = this.getQuaternionEulerDegrees(
              deltaRotation
                .clone()
                .multiply(
                  this.createRotationQuaternion(item.initialRotationDegrees)
                )
            );
          }

          return {
            modelInstanceId: item.modelInstanceId,
            position: {
              x: nextPosition.x,
              y: nextPosition.y,
              z: nextPosition.z
            },
            rotationDegrees: nextRotationDegrees,
            scale: {
              ...item.initialScale
            }
          };
        })
      };
    }

    return {
      kind: "entities" as const,
      pivot: {
        ...pivotWorld
      },
      items: target.items.map((item) => {
        const nextPosition = new Vector3(
          item.initialPosition.x - pivotWorld.x,
          item.initialPosition.y - pivotWorld.y,
          item.initialPosition.z - pivotWorld.z
        )
          .applyAxisAngle(normalizedRotationAxis, pointerDeltaRadians)
          .add(pivotVector);

        if (item.initialRotation.kind === "yaw") {
          if (axisConstraint === null) {
            return {
              entityId: item.entityId,
              position: {
                x: nextPosition.x,
                y: nextPosition.y,
                z: nextPosition.z
              },
              rotation: {
                kind: "yaw" as const,
                yawDegrees: normalizeYawDegrees(
                  item.initialRotation.yawDegrees + pointerDeltaDegrees
                )
              }
            };
          }

          const nextRotationDegrees = this.getQuaternionEulerDegrees(
            deltaRotation.clone().multiply(
              this.createRotationQuaternion({
                x: 0,
                y: item.initialRotation.yawDegrees,
                z: 0
              })
            )
          );

          return {
            entityId: item.entityId,
            position: {
              x: nextPosition.x,
              y: nextPosition.y,
              z: nextPosition.z
            },
            rotation: {
              kind: "yaw" as const,
              yawDegrees: normalizeYawDegrees(nextRotationDegrees.y)
            }
          };
        }

        if (item.initialRotation.kind === "direction") {
          const direction = new Vector3(
            item.initialRotation.direction.x,
            item.initialRotation.direction.y,
            item.initialRotation.direction.z
          )
            .applyQuaternion(deltaRotation)
            .normalize();

          return {
            entityId: item.entityId,
            position: {
              x: nextPosition.x,
              y: nextPosition.y,
              z: nextPosition.z
            },
            rotation: {
              kind: "direction" as const,
              direction: {
                x: direction.x,
                y: direction.y,
                z: direction.z
              }
            }
          };
        }

        return {
          entityId: item.entityId,
          position: {
            x: nextPosition.x,
            y: nextPosition.y,
            z: nextPosition.z
          },
          rotation: {
            kind: "none" as const
          }
        };
      })
    };
  }

  private buildBatchScaledPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null
  ) {
    if (
      session.target.kind !== "brushes" &&
      session.target.kind !== "modelInstances"
    ) {
      throw new Error("Batch scale preview requires a scalable batch target.");
    }

    const target = session.target;
    const initialPivot = target.initialPivot;
    const scaleFactor =
      axisConstraint === null
        ? 1 + (current.x - origin.x - (current.y - origin.y)) * 0.01
        : 1 +
          this.getAxisMovementDistance(
            axisConstraint,
            initialPivot,
            origin,
            current
          ) *
            0.45;

    if (target.kind === "brushes") {
      return {
        kind: "brushes" as const,
        pivot: {
          ...initialPivot
        },
        items: target.items.map((item) => {
          const nextSize = {
            ...item.initialSize
          };

          if (axisConstraint === null) {
            nextSize.x = this.snapWhiteboxSizeValue(
              item.initialSize.x * scaleFactor
            );
            nextSize.y = this.snapWhiteboxSizeValue(
              item.initialSize.y * scaleFactor
            );
            nextSize.z = this.snapWhiteboxSizeValue(
              item.initialSize.z * scaleFactor
            );
          } else {
            const scaleAxis = resolveDominantLocalAxisForWorldAxis(
              item.initialRotationDegrees,
              axisConstraint
            );
            nextSize[scaleAxis] = this.snapWhiteboxSizeValue(
              item.initialSize[scaleAxis] * scaleFactor
            );
          }

          return {
            brushId: item.brushId,
            center: this.scalePositionAroundPivot(
              item.initialCenter,
              initialPivot,
              scaleFactor,
              axisConstraint
            ),
            rotationDegrees: {
              ...item.initialRotationDegrees
            },
            size: nextSize,
            geometry: scaleBrushGeometryToSize(item.initialGeometry, nextSize)
          };
        })
      };
    }

    return {
      kind: "modelInstances" as const,
      pivot: {
        ...initialPivot
      },
      items: target.items.map((item) => {
        const nextScale = {
          ...item.initialScale
        };

        if (axisConstraint === null) {
          nextScale.x = this.snapScaleValue(item.initialScale.x * scaleFactor);
          nextScale.y = this.snapScaleValue(item.initialScale.y * scaleFactor);
          nextScale.z = this.snapScaleValue(item.initialScale.z * scaleFactor);
        } else {
          const scaleAxis = resolveDominantLocalAxisForWorldAxis(
            item.initialRotationDegrees,
            axisConstraint
          );
          nextScale[scaleAxis] = this.snapScaleValue(
            item.initialScale[scaleAxis] * scaleFactor
          );
        }

        return {
          modelInstanceId: item.modelInstanceId,
          position: this.scalePositionAroundPivot(
            item.initialPosition,
            initialPivot,
            scaleFactor,
            axisConstraint
          ),
          rotationDegrees: {
            ...item.initialRotationDegrees
          },
          scale: nextScale
        };
      })
    };
  }

  private createTargetPreviewBrush(
    session: ActiveTransformSession
  ): Brush | null {
    if (
      session.target.kind !== "brush" &&
      session.target.kind !== "brushFace" &&
      session.target.kind !== "brushEdge" &&
      session.target.kind !== "brushVertex"
    ) {
      return null;
    }

    const currentBrush = this.currentDocument?.brushes[session.target.brushId];

    if (currentBrush === undefined) {
      return null;
    }

    return updateBrush(currentBrush, {
      center: {
        ...session.target.initialCenter
      },
      rotationDegrees: {
        ...session.target.initialRotationDegrees
      },
      size: {
        ...session.target.initialSize
      },
      geometry: cloneBrushGeometry(session.target.initialGeometry)
    });
  }

  private createBrushPreviewFromGeometry(
    brush: Brush,
    geometry: BrushGeometry
  ): {
    kind: "brush";
    center: Vec3;
    rotationDegrees: Vec3;
    size: Vec3;
    geometry: BrushGeometry;
  } {
    const nextGeometry = cloneBrushGeometry(geometry);

    return {
      kind: "brush",
      center: {
        ...brush.center
      },
      rotationDegrees: {
        ...brush.rotationDegrees
      },
      size: deriveBrushSizeFromGeometry(nextGeometry),
      geometry: nextGeometry
    };
  }

  private getComponentTargetVertexIds(
    target: ActiveTransformSession["target"]
  ): WhiteboxVertexId[] {
    if (
      target.kind !== "brushFace" &&
      target.kind !== "brushEdge" &&
      target.kind !== "brushVertex"
    ) {
      return [];
    }

    const brush = this.currentDocument?.brushes[target.brushId];

    if (brush === undefined) {
      return [];
    }

    switch (target.kind) {
      case "brushFace":
        return [...getBrushFaceVertexIds(brush, target.faceId)];
      case "brushEdge": {
        const [start, end] = getBrushEdgeVertexIds(brush, target.edgeId);
        return [start, end];
      }
      case "brushVertex":
        return [target.vertexId];
      default:
        return [];
    }
  }

  private applyDeltaToVertices(
    brush: Brush,
    vertexIds: WhiteboxVertexId[],
    delta: Vec3
  ): BrushGeometry {
    const nextGeometry = cloneBrushGeometry(brush.geometry);

    for (const vertexId of vertexIds) {
      const vertex = nextGeometry.vertices[vertexId];
      vertex.x = this.snapWhiteboxPositionValue(vertex.x + delta.x);
      vertex.y = this.snapWhiteboxPositionValue(vertex.y + delta.y);
      vertex.z = this.snapWhiteboxPositionValue(vertex.z + delta.z);
    }

    return nextGeometry;
  }

  private buildComponentTranslatedBrushPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null,
    axisConstraintSpace: TransformAxisSpace
  ) {
    const initialBrush = this.createTargetPreviewBrush(session);

    if (initialBrush === null) {
      throw new Error(
        "Cannot build a component translation preview without a box brush target."
      );
    }

    const initialPivot = this.getTransformPivotPosition({
      ...session,
      preview: {
        kind: "brush",
        center: { ...initialBrush.center },
        rotationDegrees: { ...initialBrush.rotationDegrees },
        size: { ...initialBrush.size },
        geometry: cloneBrushGeometry(initialBrush.geometry)
      }
    });
    let worldDelta = {
      x: 0,
      y: 0,
      z: 0
    };

    if (axisConstraint === null) {
      const plane = this.getTransformPlaneForPivot(initialPivot);
      const startIntersection = this.getPointerPlaneIntersection(
        origin.x,
        origin.y,
        plane
      );
      const currentIntersection = this.getPointerPlaneIntersection(
        current.x,
        current.y,
        plane
      );

      if (startIntersection !== null && currentIntersection !== null) {
        const delta = currentIntersection.sub(startIntersection);
        worldDelta = {
          x: delta.x,
          y: delta.y,
          z: delta.z
        };
      }
    } else {
      if (
        axisConstraintSpace === "local" &&
        supportsLocalTransformAxisConstraint(session, axisConstraint)
      ) {
        const axisVector = this.getConstraintAxisWorldVector(
          session,
          axisConstraint,
          axisConstraintSpace
        );
        const axisDelta = this.getMovementDistanceAlongWorldAxis(
          axisVector,
          initialPivot,
          origin,
          current
        );
        const snappedAxisDelta = this.whiteboxSnapEnabled
          ? snapValueToGrid(axisDelta, this.whiteboxSnapStep)
          : axisDelta;
        const localDelta = {
          x: 0,
          y: 0,
          z: 0
        };
        localDelta[axisConstraint] = snappedAxisDelta;
        const vertexIds = this.getComponentTargetVertexIds(session.target);
        const nextGeometry = this.applyDeltaToVertices(
          initialBrush,
          vertexIds,
          localDelta
        );

        return this.createBrushPreviewFromGeometry(initialBrush, nextGeometry);
      }

      const axisDelta = this.getAxisMovementDistance(
        axisConstraint,
        initialPivot,
        origin,
        current
      );
      worldDelta = this.setAxisComponent(worldDelta, axisConstraint, axisDelta);
    }

    const localDelta = transformBrushWorldVectorToLocal(
      initialBrush,
      worldDelta
    );
    const vertexIds = this.getComponentTargetVertexIds(session.target);
    const nextGeometry = this.applyDeltaToVertices(
      initialBrush,
      vertexIds,
      localDelta
    );

    return this.createBrushPreviewFromGeometry(initialBrush, nextGeometry);
  }

  private buildComponentRotatedBrushPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null
  ) {
    const initialBrush = this.createTargetPreviewBrush(session);

    if (initialBrush === null) {
      throw new Error(
        "Cannot build a component rotation preview without a box brush target."
      );
    }

    const effectiveAxis =
      axisConstraint ?? this.getEffectiveRotationAxis(session);
    const pointerDeltaDegrees =
      (current.x - origin.x - (current.y - origin.y)) * 0.5;
    const pivotWorld = this.getTransformPivotPosition({
      ...session,
      preview: {
        kind: "brush",
        center: { ...initialBrush.center },
        rotationDegrees: { ...initialBrush.rotationDegrees },
        size: { ...initialBrush.size },
        geometry: cloneBrushGeometry(initialBrush.geometry)
      }
    });
    const pivotLocal = transformBrushWorldPointToLocal(
      initialBrush,
      pivotWorld
    );
    const rotationAxis = this.axisVector(effectiveAxis).normalize();
    const vertexIds = this.getComponentTargetVertexIds(session.target);
    const nextGeometry = cloneBrushGeometry(initialBrush.geometry);

    for (const vertexId of vertexIds) {
      const vertex = getBrushLocalVertexPosition(initialBrush, vertexId);
      const next = new Vector3(
        vertex.x - pivotLocal.x,
        vertex.y - pivotLocal.y,
        vertex.z - pivotLocal.z
      )
        .applyAxisAngle(rotationAxis, (pointerDeltaDegrees * Math.PI) / 180)
        .add(new Vector3(pivotLocal.x, pivotLocal.y, pivotLocal.z));
      nextGeometry.vertices[vertexId] = {
        x: this.snapWhiteboxPositionValue(next.x),
        y: this.snapWhiteboxPositionValue(next.y),
        z: this.snapWhiteboxPositionValue(next.z)
      };
    }

    return this.createBrushPreviewFromGeometry(initialBrush, nextGeometry);
  }

  private buildComponentScaledBrushPreview(
    session: ActiveTransformSession,
    origin: { x: number; y: number },
    current: { x: number; y: number },
    axisConstraint: TransformAxis | null
  ) {
    const initialBrush = this.createTargetPreviewBrush(session);

    if (initialBrush === null) {
      throw new Error(
        "Cannot build a component scale preview without a box brush target."
      );
    }

    const pivotWorld = this.getTransformPivotPosition({
      ...session,
      preview: {
        kind: "brush",
        center: { ...initialBrush.center },
        rotationDegrees: { ...initialBrush.rotationDegrees },
        size: { ...initialBrush.size },
        geometry: cloneBrushGeometry(initialBrush.geometry)
      }
    });
    const pivotLocal = transformBrushWorldPointToLocal(
      initialBrush,
      pivotWorld
    );
    const nextGeometry = cloneBrushGeometry(initialBrush.geometry);
    const vertexIds = this.getComponentTargetVertexIds(session.target);

    if (session.target.kind === "brushFace") {
      const axis =
        axisConstraint ?? getBrushFaceAxis(initialBrush, session.target.faceId);
      const scaleFactor =
        1 +
        this.getAxisMovementDistance(axis, pivotWorld, origin, current) * 0.45;

      for (const vertexId of vertexIds) {
        const vertex = nextGeometry.vertices[vertexId];
        vertex[axis] = this.snapWhiteboxPositionValue(
          pivotLocal[axis] + (vertex[axis] - pivotLocal[axis]) * scaleFactor
        );
      }
    } else if (session.target.kind === "brushEdge") {
      const affectedAxes = getBrushEdgeScaleAxes(
        initialBrush,
        session.target.edgeId
      ).filter((axis) => axisConstraint === null || axisConstraint === axis);

      for (const axis of affectedAxes) {
        const scaleFactor =
          1 +
          this.getAxisMovementDistance(axis, pivotWorld, origin, current) *
            0.45;

        for (const vertexId of vertexIds) {
          const vertex = nextGeometry.vertices[vertexId];
          vertex[axis] = this.snapWhiteboxPositionValue(
            pivotLocal[axis] + (vertex[axis] - pivotLocal[axis]) * scaleFactor
          );
        }
      }
    }

    return this.createBrushPreviewFromGeometry(initialBrush, nextGeometry);
  }

  private updateBrushRenderObjectGeometry(brush: Brush) {
    const renderObjects = this.brushRenderObjects.get(brush.id);

    if (renderObjects === undefined) {
      return;
    }

    const nextGeometry = buildBoxBrushDerivedMeshData(brush).geometry;
    renderObjects.mesh.geometry.dispose();
    renderObjects.mesh.geometry = nextGeometry;
    renderObjects.edges.geometry.dispose();
    renderObjects.edges.geometry = new EdgesGeometry(nextGeometry);

    for (const edgeHelper of renderObjects.edgeHelpers) {
      const segment = getBrushEdgeWorldSegment(brush, edgeHelper.id);
      const nextEdgeGeometry = new BufferGeometry().setFromPoints([
        new Vector3(segment.start.x, segment.start.y, segment.start.z),
        new Vector3(segment.end.x, segment.end.y, segment.end.z)
      ]);
      edgeHelper.line.geometry.dispose();
      edgeHelper.line.geometry = nextEdgeGeometry;
    }

    for (const vertexHelper of renderObjects.vertexHelpers) {
      const vertex = getBrushVertexWorldPosition(brush, vertexHelper.id);
      vertexHelper.mesh.position.set(vertex.x, vertex.y, vertex.z);
    }
  }

  private applyBrushRenderObjectTransform(
    brushId: string,
    center: Vec3,
    rotationDegrees: Vec3
  ) {
    const renderObjects = this.brushRenderObjects.get(brushId);

    if (renderObjects === undefined) {
      return;
    }

    renderObjects.mesh.position.set(center.x, center.y, center.z);
    renderObjects.mesh.rotation.set(
      (rotationDegrees.x * Math.PI) / 180,
      (rotationDegrees.y * Math.PI) / 180,
      (rotationDegrees.z * Math.PI) / 180
    );
    renderObjects.mesh.scale.set(1, 1, 1);
    renderObjects.edges.position.set(center.x, center.y, center.z);
    renderObjects.edges.rotation.set(
      (rotationDegrees.x * Math.PI) / 180,
      (rotationDegrees.y * Math.PI) / 180,
      (rotationDegrees.z * Math.PI) / 180
    );
    renderObjects.edges.scale.set(1, 1, 1);
  }

  private applySpotLightGroupTransform(
    group: Group,
    position: Vec3,
    direction: Vec3
  ) {
    const forward = new Vector3(
      direction.x,
      direction.y,
      direction.z
    ).normalize();
    const orientation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      forward
    );
    group.position.set(position.x, position.y, position.z);
    group.quaternion.copy(orientation);
  }

  private applyEntityRenderObjectTransform(entity: EntityInstance) {
    const renderObjects = this.entityRenderObjects.get(entity.id);

    if (renderObjects === undefined) {
      return;
    }

    switch (entity.kind) {
      case "pointLight":
      case "soundEmitter":
      case "triggerVolume":
      case "interactable":
        renderObjects.group.position.set(
          entity.position.x,
          entity.position.y,
          entity.position.z
        );
        renderObjects.group.rotation.set(0, 0, 0);
        renderObjects.group.quaternion.identity();
        break;
      case "spotLight":
        this.applySpotLightGroupTransform(
          renderObjects.group,
          entity.position,
          entity.direction
        );
        break;
      case "playerStart":
      case "sceneEntry":
      case "npc":
      case "teleportTarget":
        renderObjects.group.position.set(
          entity.position.x,
          entity.position.y,
          entity.position.z
        );
        renderObjects.group.rotation.set(
          0,
          (entity.yawDegrees * Math.PI) / 180,
          0
        );
        break;
    }
  }

  private applyLocalLightRenderObjectTransform(entity: EntityInstance) {
    const renderObjects = this.localLightRenderObjects.get(entity.id);

    if (renderObjects === undefined) {
      return;
    }

    switch (entity.kind) {
      case "pointLight":
        renderObjects.group.position.set(
          entity.position.x,
          entity.position.y,
          entity.position.z
        );
        renderObjects.group.rotation.set(0, 0, 0);
        renderObjects.group.quaternion.identity();
        break;
      case "spotLight":
        this.applySpotLightGroupTransform(
          renderObjects.group,
          entity.position,
          entity.direction
        );
        break;
      default:
        break;
    }
  }

  private applyModelInstanceRenderObjectTransform(
    modelInstance: ModelInstance
  ) {
    const renderGroup = this.modelRenderObjects.get(modelInstance.id);

    if (renderGroup === undefined) {
      return;
    }

    renderGroup.position.set(
      modelInstance.position.x,
      modelInstance.position.y,
      modelInstance.position.z
    );
    renderGroup.rotation.set(
      (modelInstance.rotationDegrees.x * Math.PI) / 180,
      (modelInstance.rotationDegrees.y * Math.PI) / 180,
      (modelInstance.rotationDegrees.z * Math.PI) / 180
    );
    renderGroup.scale.set(
      modelInstance.scale.x,
      modelInstance.scale.y,
      modelInstance.scale.z
    );
  }

  private resetRenderObjectTransformsFromDocument() {
    if (this.currentDocument === null) {
      return;
    }

    for (const brush of Object.values(this.currentDocument.brushes)) {
      this.updateBrushRenderObjectGeometry(brush);
      this.applyBrushRenderObjectTransform(
        brush.id,
        brush.center,
        brush.rotationDegrees
      );
    }

    for (const entity of getEntityInstances(this.currentDocument.entities)) {
      this.applyEntityRenderObjectTransform(entity);
      this.applyLocalLightRenderObjectTransform(entity);
    }

    for (const modelInstance of getModelInstances(
      this.currentDocument.modelInstances
    )) {
      this.applyModelInstanceRenderObjectTransform(modelInstance);
    }

    for (const path of getScenePaths(this.currentDocument.paths)) {
      this.updatePathRenderObjectState(path);
    }
  }

  private applyTransformPreview() {
    this.resetRenderObjectTransformsFromDocument();

    if (this.currentTransformSession.kind !== "active") {
      return;
    }

    switch (this.currentTransformSession.target.kind) {
      case "brush":
      case "brushFace":
      case "brushEdge":
      case "brushVertex":
        if (this.currentTransformSession.preview.kind === "brush") {
          const previewBrush = this.createPreviewBrushForSession(
            this.currentTransformSession
          );

          if (previewBrush !== null) {
            this.updateBrushRenderObjectGeometry(previewBrush);
          }

          this.applyBrushRenderObjectTransform(
            this.currentTransformSession.target.brushId,
            this.currentTransformSession.preview.center,
            this.currentTransformSession.preview.rotationDegrees
          );
        }
        break;
      case "brushes":
        if (this.currentTransformSession.preview.kind === "brushes") {
          for (const previewItem of this.currentTransformSession.preview.items) {
            const brush = this.currentDocument?.brushes[previewItem.brushId];

            if (brush === undefined) {
              continue;
            }

            this.updateBrushRenderObjectGeometry(
              updateBrush(brush, {
                center: previewItem.center,
                rotationDegrees: previewItem.rotationDegrees,
                size: previewItem.size,
                geometry: previewItem.geometry as never
              })
            );
            this.applyBrushRenderObjectTransform(
              previewItem.brushId,
              previewItem.center,
              previewItem.rotationDegrees
            );
          }
        }
        break;
      case "modelInstance":
        if (this.currentTransformSession.preview.kind === "modelInstance") {
          this.applyModelInstanceRenderObjectTransform({
            ...createModelInstance({
              id: this.currentTransformSession.target.modelInstanceId,
              assetId: this.currentTransformSession.target.assetId,
              position: this.currentTransformSession.preview.position,
              rotationDegrees:
                this.currentTransformSession.preview.rotationDegrees,
              scale: this.currentTransformSession.preview.scale
            })
          });
        }
        break;
      case "modelInstances":
        if (this.currentTransformSession.preview.kind === "modelInstances") {
          for (const previewItem of this.currentTransformSession.preview.items) {
            const modelInstance =
              this.currentDocument?.modelInstances[previewItem.modelInstanceId];

            if (modelInstance === undefined) {
              continue;
            }

            this.applyModelInstanceRenderObjectTransform(
              createModelInstance({
                ...modelInstance,
                position: previewItem.position,
                rotationDegrees: previewItem.rotationDegrees,
                scale: previewItem.scale
              })
            );
          }
        }
        break;
      case "pathPoint": {
        const activeTransformSession = this.currentTransformSession;

        if (
          activeTransformSession.kind !== "active" ||
          activeTransformSession.target.kind !== "pathPoint" ||
          activeTransformSession.preview.kind !== "pathPoint" ||
          this.currentDocument === null
        ) {
          break;
        }

        const currentPath =
          this.currentDocument.paths[activeTransformSession.target.pathId];

        if (currentPath === undefined) {
          break;
        }

        const previewPointId = activeTransformSession.target.pointId;
        const previewPosition = activeTransformSession.preview.position;

        this.updatePathRenderObjectState(
          {
            ...currentPath,
            points: currentPath.points.map((point) =>
              point.id === previewPointId
                ? {
                    ...point,
                    position: previewPosition
                  }
                : point
            )
          }
        );
        break;
      }
      case "entity": {
        if (
          this.currentTransformSession.preview.kind !== "entity" ||
          this.currentDocument === null
        ) {
          break;
        }

        const currentEntity =
          this.currentDocument.entities[
            this.currentTransformSession.target.entityId
          ];

        if (currentEntity === undefined) {
          break;
        }

        switch (currentEntity.kind) {
          case "pointLight":
          case "soundEmitter":
          case "triggerVolume":
          case "interactable":
            this.applyEntityRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position
            });
            this.applyLocalLightRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position
            });
            break;
          case "spotLight":
            this.applyEntityRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position,
              direction:
                this.currentTransformSession.preview.rotation.kind ===
                "direction"
                  ? this.currentTransformSession.preview.rotation.direction
                  : currentEntity.direction
            });
            this.applyLocalLightRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position,
              direction:
                this.currentTransformSession.preview.rotation.kind ===
                "direction"
                  ? this.currentTransformSession.preview.rotation.direction
                  : currentEntity.direction
            });
            break;
          case "playerStart":
          case "sceneEntry":
          case "npc":
          case "teleportTarget":
            this.applyEntityRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position,
              yawDegrees:
                this.currentTransformSession.preview.rotation.kind === "yaw"
                  ? this.currentTransformSession.preview.rotation.yawDegrees
                  : currentEntity.yawDegrees
            });
            this.applyLocalLightRenderObjectTransform({
              ...currentEntity,
              position: this.currentTransformSession.preview.position,
              yawDegrees:
                this.currentTransformSession.preview.rotation.kind === "yaw"
                  ? this.currentTransformSession.preview.rotation.yawDegrees
                  : currentEntity.yawDegrees
            });
            break;
        }
        break;
      }
      case "entities":
        if (
          this.currentTransformSession.preview.kind !== "entities" ||
          this.currentDocument === null
        ) {
          break;
        }

        for (const previewItem of this.currentTransformSession.preview.items) {
          const currentEntity = this.currentDocument.entities[previewItem.entityId];

          if (currentEntity === undefined) {
            continue;
          }

          switch (currentEntity.kind) {
            case "pointLight":
            case "soundEmitter":
            case "triggerVolume":
            case "interactable":
              this.applyEntityRenderObjectTransform({
                ...currentEntity,
                position: previewItem.position
              });
              this.applyLocalLightRenderObjectTransform({
                ...currentEntity,
                position: previewItem.position
              });
              break;
            case "spotLight":
              this.applyEntityRenderObjectTransform({
                ...currentEntity,
                position: previewItem.position,
                direction:
                  previewItem.rotation.kind === "direction"
                    ? previewItem.rotation.direction
                    : currentEntity.direction
              });
              this.applyLocalLightRenderObjectTransform({
                ...currentEntity,
                position: previewItem.position,
                direction:
                  previewItem.rotation.kind === "direction"
                    ? previewItem.rotation.direction
                    : currentEntity.direction
              });
              break;
            case "playerStart":
            case "sceneEntry":
            case "npc":
            case "teleportTarget":
              this.applyEntityRenderObjectTransform({
                ...currentEntity,
                position: previewItem.position,
                yawDegrees:
                  previewItem.rotation.kind === "yaw"
                    ? previewItem.rotation.yawDegrees
                    : currentEntity.yawDegrees
              });
              break;
          }
        }
        break;
    }
  }

  private rebuildLocalLights(document: SceneDocument) {
    this.clearLocalLights();

    if (this.currentSimulationScene !== null) {
      for (const pointLight of this.currentSimulationScene.localLights.pointLights) {
        const renderObjects = this.createPointLightRuntimeObjects(pointLight);
        renderObjects.group.visible =
          pointLight.enabled && this.displayMode !== "wireframe";
        this.localLightGroup.add(renderObjects.group);
        this.localLightRenderObjects.set(pointLight.entityId, renderObjects);
      }

      for (const spotLight of this.currentSimulationScene.localLights.spotLights) {
        const renderObjects = this.createSpotLightRuntimeObjects(spotLight);
        renderObjects.group.visible =
          spotLight.enabled && this.displayMode !== "wireframe";
        this.localLightGroup.add(renderObjects.group);
        this.localLightRenderObjects.set(spotLight.entityId, renderObjects);
      }

      this.applyShadowState();
      return;
    }

    for (const entity of getEntityInstances(document.entities)) {
      if (!entity.enabled) {
        continue;
      }

      switch (entity.kind) {
        case "pointLight": {
          const renderObjects = this.createPointLightRuntimeObjects(entity);
          this.localLightGroup.add(renderObjects.group);
          this.localLightRenderObjects.set(entity.id, renderObjects);
          break;
        }
        case "spotLight": {
          const renderObjects = this.createSpotLightRuntimeObjects(entity);
          this.localLightGroup.add(renderObjects.group);
          this.localLightRenderObjects.set(entity.id, renderObjects);
          break;
        }
      }
    }

    this.applyShadowState();
  }

  private rebuildBrushMeshes(
    document: SceneDocument,
    selection: EditorSelection
  ) {
    this.clearBrushMeshes();
    const volumeRenderPaths = resolveBoxVolumeRenderPaths(
      document.world.advancedRendering
    );

    for (const brush of Object.values(document.brushes)) {
      if (!brush.enabled || !brush.visible) {
        continue;
      }

      const derivedMesh = buildBoxBrushDerivedMeshData(brush);
      const geometry = derivedMesh.geometry;
      const contactPatches =
        brush.kind === "box" && brush.volume.mode === "water"
          ? this.collectViewportWaterContactPatches(document, brush)
          : [];

      const materials =
        this.createFogMaterialSet(brush, volumeRenderPaths) ??
        derivedMesh.faceIdsInOrder.map((faceId) =>
          this.createFaceMaterial(
            brush,
            faceId,
            document.materials[brush.faces[faceId].materialId ?? ""],
            this.getFaceHighlightState(brush.id, faceId),
            volumeRenderPaths,
            contactPatches
          )
        );
      const mesh = new Mesh(geometry, materials);
      const brushSelected = isBrushSelected(selection, brush.id);

      this.configureFogVolumeMesh(mesh, materials);

      mesh.userData.brushId = brush.id;
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({
          color: brushSelected ? BRUSH_SELECTED_EDGE_COLOR : BRUSH_EDGE_COLOR
        })
      );
      edges.visible = this.displayMode !== "wireframe";

      const edgeHelpers = getBrushEdgeIds(brush).map((edgeId) =>
        this.createEdgeHelper(brush, edgeId)
      );
      const vertexHelpers = getBrushVertexIds(brush).map((vertexId) =>
        this.createVertexHelper(brush, vertexId)
      );

      this.brushGroup.add(mesh);
      this.brushGroup.add(edges);
      for (const edgeHelper of edgeHelpers) {
        this.brushGroup.add(edgeHelper.line);
      }
      for (const vertexHelper of vertexHelpers) {
        this.brushGroup.add(vertexHelper.mesh);
      }
      this.brushRenderObjects.set(brush.id, {
        mesh,
        faceIdsInOrder: derivedMesh.faceIdsInOrder,
        edges,
        edgeHelpers,
        vertexHelpers
      });
      this.applyBrushRenderObjectTransform(
        brush.id,
        brush.center,
        brush.rotationDegrees
      );
    }

    this.refreshBrushPresentation();
    this.applyShadowState();
  }

  private resolveTerrainLayerMaterial(materialId: string | null): MaterialDef | null {
    if (materialId === null || this.currentDocument === null) {
      return null;
    }

    return this.currentDocument.materials[materialId] ?? null;
  }

  private createTerrainMaterial(terrain: Terrain): Material {
    const selected = isTerrainSelected(this.currentSelection, terrain.id);
    const hovered = isTerrainSelected(this.hoveredSelection, terrain.id);
    const active = selected && this.currentActiveSelectionId === terrain.id;
    const color = active
      ? TERRAIN_ACTIVE_COLOR
      : selected
        ? TERRAIN_SELECTED_COLOR
        : hovered
          ? TERRAIN_HOVERED_COLOR
          : TERRAIN_BASE_COLOR;

    if (this.displayMode === "wireframe") {
      return new MeshBasicMaterial({
        color,
        wireframe: true
      });
    }

    const layerTextures = terrain.layers.map((layer) =>
      getTerrainLayerTexture(
        this.resolveTerrainLayerMaterial(layer.materialId),
        (material) => this.getOrCreateTextureSet(material).baseColor
      )
    ) as [Texture, Texture, Texture, Texture];

    return createTerrainLayerBlendMaterial({
      layerTextures,
      emissiveHex: active
        ? TERRAIN_ACTIVE_EMISSIVE
        : selected
          ? TERRAIN_SELECTED_EMISSIVE
          : hovered
            ? TERRAIN_HOVERED_EMISSIVE
            : 0x000000,
      emissiveIntensity: active ? 0.26 : selected ? 0.18 : hovered ? 0.08 : 0
    });
  }

  private rebuildTerrains(
    document: SceneDocument,
    _selection: EditorSelection,
    _activeSelectionId: string | null
  ) {
    this.clearTerrains();

    for (const terrain of getTerrains(document.terrains)) {
      const displayedTerrain =
        this.getDisplayedTerrainState(terrain.id) ?? terrain;

      if (!displayedTerrain.enabled || !displayedTerrain.visible) {
        continue;
      }

      const derivedMesh = buildTerrainDerivedMeshData(displayedTerrain);
      const mesh = new Mesh(
        derivedMesh.geometry,
        this.createTerrainMaterial(displayedTerrain)
      );

      mesh.position.set(
        displayedTerrain.position.x,
        displayedTerrain.position.y,
        displayedTerrain.position.z
      );
      mesh.userData.terrainId = displayedTerrain.id;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.terrainGroup.add(mesh);
      this.terrainRenderObjects.set(displayedTerrain.id, {
        mesh
      });
    }

    this.applyShadowState();
    this.syncTerrainBrushPreview();
  }

  private createPathLineGeometry(path: ScenePath): BufferGeometry {
    const points = path.points.map(
      (point) =>
        new Vector3(point.position.x, point.position.y, point.position.z)
    );

    if (path.loop && points.length > 1) {
      points.push(
        new Vector3(
          path.points[0].position.x,
          path.points[0].position.y,
          path.points[0].position.z
        )
      );
    }

    return new BufferGeometry().setFromPoints(points);
  }

  private rebuildPaths(document: SceneDocument, selection: EditorSelection) {
    this.clearPaths();

    for (const path of getScenePaths(document.paths)) {
      if (!path.enabled || !path.visible) {
        continue;
      }

      const line = new Line(
        this.createPathLineGeometry(path),
        new LineBasicMaterial({
          color: isPathSelected(selection, path.id)
            ? PATH_SELECTED_COLOR
            : PATH_COLOR
        })
      );
      line.userData.pathId = path.id;

      const pointMeshes = path.points.map((point) => {
        const mesh = new Mesh(
          new SphereGeometry(PATH_POINT_RADIUS, 12, 12),
          new MeshBasicMaterial({
            color: isPathSelected(selection, path.id)
              ? PATH_POINT_SELECTED_COLOR
              : PATH_POINT_COLOR
          })
        );

        mesh.position.set(point.position.x, point.position.y, point.position.z);
        mesh.userData.pathId = path.id;
        mesh.userData.pathPointId = point.id;
        this.pathGroup.add(mesh);

        return {
          pointId: point.id,
          mesh
        };
      });

      this.pathGroup.add(line);
      this.pathRenderObjects.set(path.id, {
        line,
        pointMeshes
      });
    }

    this.refreshPathPresentation();
  }

  private updatePathRenderObjectState(path: ScenePath) {
    const renderObjects = this.pathRenderObjects.get(path.id);

    if (renderObjects === undefined) {
      return;
    }

    renderObjects.line.geometry.dispose();
    renderObjects.line.geometry = this.createPathLineGeometry(path);

    for (const pointMesh of renderObjects.pointMeshes) {
      const point = path.points.find(
        (candidatePoint) => candidatePoint.id === pointMesh.pointId
      );

      if (point === undefined) {
        continue;
      }

      pointMesh.mesh.position.set(
        point.position.x,
        point.position.y,
        point.position.z
      );
    }
  }

  private configureFogVolumeMesh(
    mesh: Mesh<BufferGeometry, Material[]>,
    materials: Material[]
  ) {
    const fogMaterials = Array.from(
      new Set(
        materials.filter(
          (material): material is ShaderMaterial =>
            material instanceof ShaderMaterial &&
            material.uniforms["localCameraPosition"] !== undefined
        )
      )
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

  private createFogMaterialSet(
    brush: Brush,
    volumeRenderPaths: {
      fog: "performance" | "quality";
      water: "performance" | "quality";
    }
  ): Material[] | null {
    if (
      brush.volume.mode !== "fog" ||
      this.displayMode === "wireframe" ||
      this.displayMode === "authoring"
    ) {
      return null;
    }

    const faceIds = getBrushFaceIds(brush);
    const highlightStates = faceIds.map((faceId) =>
      this.getFaceHighlightState(brush.id, faceId)
    );
    const selectedFace = highlightStates.includes("selected");
    const hoveredFace = !selectedFace && highlightStates.includes("hovered");
    const quality = volumeRenderPaths.fog === "quality";
    const densityBoost = selectedFace ? 1.08 : hoveredFace ? 1.04 : 1;
    const opacityBoost = selectedFace ? 0.08 : hoveredFace ? 0.04 : 0;

    if (quality) {
      const fogMaterial = createFogQualityMaterial({
        colorHex: brush.volume.fog.colorHex,
        density: brush.volume.fog.density * densityBoost,
        padding: brush.volume.fog.padding,
        time: this.volumeTime,
        halfSize: {
          x: brush.size.x * 0.5,
          y: brush.size.y * 0.5,
          z: brush.size.z * 0.5
        },
        opacityMultiplier: densityBoost,
        colorLift: selectedFace ? 0.08 : hoveredFace ? 0.04 : 0
      });

      this.volumeAnimatedUniforms.push(fogMaterial.animationUniform);
      return faceIds.map(() => fogMaterial.material);
    }

    const baseOpacity = Math.max(
      0.08,
      Math.min(0.82, brush.volume.fog.density * 0.9 + 0.1)
    );
    const fogMaterial = new MeshStandardMaterial({
      color: brush.volume.fog.colorHex,
      emissive: brush.volume.fog.colorHex,
      emissiveIntensity: 0.04,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: Math.min(0.92, baseOpacity + opacityBoost),
      depthWrite: false
    });

    return faceIds.map(() => fogMaterial);
  }

  private rebuildEntityMarkers(
    document: SceneDocument,
    selection: EditorSelection
  ) {
    this.clearEntityMarkers();
    const runtimeNpcDefinitionsByEntityId = new Map(
      (this.currentSimulationScene?.npcDefinitions ?? []).map((npc) => [
        npc.entityId,
        npc
      ])
    );
    const runtimeInteractablesByEntityId = new Map(
      (this.currentSimulationScene?.entities.interactables ?? []).map(
        (interactable) => [interactable.entityId, interactable]
      )
    );
    for (const entity of getEntityInstances(document.entities)) {
      if (!entity.enabled || !entity.visible) {
        continue;
      }

      const selected =
        selection.kind === "entities" && selection.ids.includes(entity.id);
      let renderObjects: EntityRenderObjects | null = null;

      switch (entity.kind) {
        case "npc": {
          const runtimeNpc = runtimeNpcDefinitionsByEntityId.get(entity.id);

          if (runtimeNpc !== undefined) {
            if (!runtimeNpc.active || !runtimeNpc.visible) {
              continue;
            }

            renderObjects = this.createNpcRenderObjects(
              {
                ...entity,
                position: runtimeNpc.position,
                yawDegrees: runtimeNpc.yawDegrees
              },
              selected
            );
            break;
          }

          renderObjects = this.createEntityRenderObjects(entity, selected);
          break;
        }
        case "interactable": {
          const runtimeInteractable =
            runtimeInteractablesByEntityId.get(entity.id) ?? null;
          renderObjects = this.createInteractableRenderObjects(
            entity.id,
            entity.position,
            entity.radius,
            selected,
            runtimeInteractable?.interactionEnabled ?? entity.interactionEnabled
          );
          break;
        }
        default:
          renderObjects = this.createEntityRenderObjects(entity, selected);
          break;
      }

      if (this.displayMode === "wireframe") {
        this.applyWireframePresentation(renderObjects.group);
      }

      this.entityGroup.add(renderObjects.group);
      this.entityRenderObjects.set(entity.id, renderObjects);
    }

    this.applyShadowState();
  }

  private rebuildModelInstances(
    document: SceneDocument,
    selection: EditorSelection
  ) {
    this.clearModelInstances();

    const runtimeModelInstances = this.currentSimulationScene?.modelInstances ?? null;
    const authoredModelInstancesById = new Map(
      getModelInstances(document.modelInstances).map((modelInstance) => [
        modelInstance.id,
        modelInstance
      ])
    );
    const displayedModelInstances =
      runtimeModelInstances?.map((runtimeModelInstance) => {
        const authoredModelInstance =
          authoredModelInstancesById.get(runtimeModelInstance.instanceId);

        return createModelInstance({
          id: runtimeModelInstance.instanceId,
          assetId: runtimeModelInstance.assetId,
          name: runtimeModelInstance.name ?? authoredModelInstance?.name,
          enabled: authoredModelInstance?.enabled ?? true,
          visible: runtimeModelInstance.visible,
          position: runtimeModelInstance.position,
          rotationDegrees: runtimeModelInstance.rotationDegrees,
          scale: runtimeModelInstance.scale,
          collision:
            authoredModelInstance?.collision ?? {
              mode: "none",
              visible: false
            },
          animationClipName: runtimeModelInstance.animationClipName,
          animationAutoplay: runtimeModelInstance.animationAutoplay
        });
      }) ?? getModelInstances(document.modelInstances);

    for (const modelInstance of displayedModelInstances) {
      if (!modelInstance.enabled || !modelInstance.visible) {
        continue;
      }

      const selected = isModelInstanceSelected(selection, modelInstance.id);
      const asset = this.projectAssets[modelInstance.assetId];
      const loadedAsset = this.loadedModelAssets[modelInstance.assetId];
      const renderGroup = createModelInstanceRenderGroup(
        modelInstance,
        asset,
        loadedAsset,
        selected,
        undefined,
        this.displayMode === "wireframe" ? "wireframe" : "normal"
      );

      if (asset?.kind === "model" && modelInstance.collision.visible) {
        try {
          const generatedCollider = buildGeneratedModelCollider(
            modelInstance,
            asset,
            loadedAsset
          );

          if (generatedCollider !== null) {
            renderGroup.add(createModelColliderDebugGroup(generatedCollider));
          }
        } catch {
          // Validation surfaces unsupported collider modes; the viewport keeps rendering the model.
        }
      }

      this.modelGroup.add(renderGroup);
      this.modelRenderObjects.set(modelInstance.id, renderGroup);
    }

    this.applyShadowState();
  }

  private createEntityRenderObjects(
    entity: EntityInstance,
    selected: boolean
  ): EntityRenderObjects {
    switch (entity.kind) {
      case "pointLight":
        return this.createPointLightGizmoRenderObjects(
          entity.id,
          entity.position,
          entity.distance,
          entity.colorHex,
          selected
        );
      case "spotLight":
        return this.createSpotLightGizmoRenderObjects(
          entity.id,
          entity.position,
          entity.direction,
          entity.distance,
          entity.angleDegrees,
          entity.colorHex,
          selected
        );
      case "playerStart":
        return this.createPlayerStartRenderObjects(
          entity.id,
          entity.position,
          entity.yawDegrees,
          entity.collider,
          selected
        );
      case "sceneEntry":
        return this.createTeleportTargetRenderObjects(
          entity.id,
          entity.position,
          entity.yawDegrees,
          selected,
          selected ? SCENE_ENTRY_SELECTED_COLOR : SCENE_ENTRY_COLOR
        );
      case "soundEmitter":
        return this.createSoundEmitterRenderObjects(
          entity.id,
          entity.position,
          entity.refDistance,
          entity.maxDistance,
          selected
        );
      case "npc":
        return this.createNpcRenderObjects(entity, selected);
      case "triggerVolume":
        return this.createTriggerVolumeRenderObjects(
          entity.id,
          entity.position,
          entity.size,
          selected
        );
      case "teleportTarget":
        return this.createTeleportTargetRenderObjects(
          entity.id,
          entity.position,
          entity.yawDegrees,
          selected
        );
      case "interactable":
        return this.createInteractableRenderObjects(
          entity.id,
          entity.position,
          entity.radius,
          selected,
          entity.interactionEnabled
        );
    }
  }

  private tagEntityMesh(
    mesh: Mesh,
    entityId: string,
    entityKind: EntityInstance["kind"],
    group: Group
  ) {
    mesh.userData.entityId = entityId;
    mesh.userData.entityKind = entityKind;
    group.add(mesh);
  }

  private tagEntityGroup(
    group: Group,
    entityId: string,
    entityKind: EntityInstance["kind"]
  ): Mesh[] {
    const meshes: Mesh[] = [];

    group.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      object.userData.entityId = entityId;
      object.userData.entityKind = entityKind;
      meshes.push(object);
    });

    return meshes;
  }

  private createPointLightGizmoRenderObjects(
    entityId: string,
    position: Vec3,
    distance: number,
    colorHex: string,
    selected: boolean
  ): EntityRenderObjects {
    const markerColor = colorHex;
    const displayRadius = Math.max(0.5, distance);
    const group = new Group();
    group.position.set(position.x, position.y, position.z);

    const core = new Mesh(
      new SphereGeometry(0.16, 16, 12),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.22 : 0.1,
        roughness: 0.28,
        metalness: 0.05
      })
    );

    const range = new Mesh(
      new SphereGeometry(displayRadius, 16, 12),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.08 : 0.03,
        roughness: 0.85,
        metalness: 0,
        transparent: true,
        opacity: selected ? 0.16 : 0.08,
        wireframe: true
      })
    );

    range.userData.nonPickable = true;

    for (const mesh of [core, range]) {
      this.tagEntityMesh(mesh, entityId, "pointLight", group);
    }

    return {
      group,
      meshes: [core, range]
    };
  }

  private createSpotLightGizmoRenderObjects(
    entityId: string,
    position: Vec3,
    direction: Vec3,
    distance: number,
    angleDegrees: number,
    colorHex: string,
    selected: boolean
  ): EntityRenderObjects {
    const markerColor = colorHex;
    const group = new Group();
    group.position.set(position.x, position.y, position.z);

    const forward = new Vector3(
      direction.x,
      direction.y,
      direction.z
    ).normalize();
    const coneLength = Math.max(0.85, distance);
    const coneRadius = Math.max(
      0.16,
      Math.tan((angleDegrees * Math.PI) / 360) * coneLength
    );
    const orientation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      forward
    );
    group.quaternion.copy(orientation);

    const core = new Mesh(
      new SphereGeometry(0.16, 14, 10),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.24 : 0.1,
        roughness: 0.28,
        metalness: 0.05
      })
    );

    const cone = new Mesh(
      new CylinderGeometry(coneRadius, 0, coneLength, 20, 1, true),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.08 : 0.03,
        roughness: 0.85,
        metalness: 0,
        transparent: true,
        opacity: selected ? 0.16 : 0.08,
        wireframe: true
      })
    );
    cone.position.y = coneLength * 0.5;
    cone.userData.nonPickable = true;

    for (const mesh of [core, cone]) {
      this.tagEntityMesh(mesh, entityId, "spotLight", group);
    }

    return {
      group,
      meshes: [core, cone]
    };
  }

  private createSpotLightRuntimeObjects(
    entity: Pick<
      SpotLightEntity,
      "position" | "direction" | "colorHex" | "intensity" | "distance" | "angleDegrees"
    >
  ): LocalLightRenderObjects {
    const group = new Group();
    const light = new SpotLight(
      entity.colorHex,
      entity.intensity,
      entity.distance,
      (entity.angleDegrees * Math.PI) / 180,
      0.18,
      1
    );
    const direction = new Vector3(
      entity.direction.x,
      entity.direction.y,
      entity.direction.z
    ).normalize();
    const orientation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction
    );

    group.position.set(entity.position.x, entity.position.y, entity.position.z);
    group.quaternion.copy(orientation);
    light.position.set(0, 0, 0);
    light.target.position.set(0, 1, 0);
    group.add(light);
    group.add(light.target);

    return {
      group,
      light
    };
  }

  private createPointLightRuntimeObjects(
    entity: Pick<
      PointLightEntity,
      "position" | "colorHex" | "intensity" | "distance"
    >
  ): LocalLightRenderObjects {
    const group = new Group();
    const light = new PointLight(
      entity.colorHex,
      entity.intensity,
      entity.distance
    );

    group.position.set(entity.position.x, entity.position.y, entity.position.z);
    light.position.set(0, 0, 0);
    group.add(light);

    return {
      group,
      light
    };
  }

  private createPlayerStartRenderObjects(
    entityId: string,
    position: Vec3,
    yawDegrees: number,
    collider: PlayerStartEntity["collider"],
    selected: boolean
  ): EntityRenderObjects {
    const markerColor = selected
      ? PLAYER_START_SELECTED_COLOR
      : PLAYER_START_COLOR;
    const group = new Group();
    group.position.set(position.x, position.y, position.z);
    const colliderMaterial = new MeshStandardMaterial({
      color: markerColor,
      emissive: markerColor,
      emissiveIntensity: selected ? 0.14 : 0.05,
      roughness: 0.5,
      metalness: 0.02,
      transparent: true,
      opacity: selected ? 0.4 : 0.24
    });
    const arrowMaterial = new MeshStandardMaterial({
      color: markerColor,
      emissive: markerColor,
      emissiveIntensity: selected ? 0.2 : 0.08,
      roughness: 0.38,
      metalness: 0.03
    });
    const meshes: Mesh[] = [];

    switch (collider.mode) {
      case "capsule": {
        const collisionMesh = new Mesh(
          new CapsuleGeometry(
            collider.capsuleRadius,
            Math.max(0, collider.capsuleHeight - collider.capsuleRadius * 2),
            6,
            12
          ),
          colliderMaterial
        );
        collisionMesh.position.y = collider.capsuleHeight * 0.5;
        this.tagEntityMesh(collisionMesh, entityId, "playerStart", group);
        meshes.push(collisionMesh);
        break;
      }
      case "box": {
        const collisionMesh = new Mesh(
          new BoxGeometry(
            collider.boxSize.x,
            collider.boxSize.y,
            collider.boxSize.z
          ),
          colliderMaterial
        );
        collisionMesh.position.y = collider.boxSize.y * 0.5;
        this.tagEntityMesh(collisionMesh, entityId, "playerStart", group);
        meshes.push(collisionMesh);
        break;
      }
      case "none":
        break;
    }

    const directionGroup = new Group();
    directionGroup.rotation.y = (yawDegrees * Math.PI) / 180;
    group.add(directionGroup);
    const colliderTop = getPlayerStartColliderHeight(collider) ?? 0.18;

    const body = new Mesh(new BoxGeometry(0.08, 0.08, 0.34), arrowMaterial);
    body.position.set(0, colliderTop + 0.12, 0.06);

    const arrowHead = new Mesh(new ConeGeometry(0.1, 0.22, 14), arrowMaterial);
    arrowHead.rotation.x = Math.PI * 0.5;
    arrowHead.position.set(0, colliderTop + 0.12, 0.28);

    for (const mesh of [body, arrowHead]) {
      this.tagEntityMesh(mesh, entityId, "playerStart", directionGroup);
      meshes.push(mesh);
    }

    return {
      group,
      meshes
    };
  }

  private createSoundEmitterRenderObjects(
    entityId: string,
    position: Vec3,
    refDistance: number,
    maxDistance: number,
    selected: boolean,
    markerColor = selected ? SOUND_EMITTER_SELECTED_COLOR : SOUND_EMITTER_COLOR
  ): EntityRenderObjects {
    const displayRefDistance = Math.max(0.4, refDistance);
    const displayMaxDistance = Math.max(displayRefDistance, maxDistance);
    const group = new Group();
    group.position.set(position.x, position.y, position.z);

    const speakerMeshes = createSoundEmitterMarkerMeshes(markerColor, selected);

    const refDistanceShell = new Mesh(
      new SphereGeometry(displayRefDistance, 16, 12),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.1 : 0.03,
        roughness: 0.8,
        metalness: 0,
        transparent: true,
        opacity: selected ? 0.18 : 0.09,
        wireframe: true
      })
    );
    refDistanceShell.userData.nonPickable = true;

    const maxDistanceShell = new Mesh(
      new SphereGeometry(displayMaxDistance, 16, 12),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.06 : 0.015,
        roughness: 0.82,
        metalness: 0,
        transparent: true,
        opacity: selected ? 0.12 : 0.06,
        wireframe: true
      })
    );
    maxDistanceShell.userData.nonPickable = true;

    for (const mesh of [...speakerMeshes, refDistanceShell, maxDistanceShell]) {
      this.tagEntityMesh(mesh, entityId, "soundEmitter", group);
    }

    return {
      group,
      meshes: [...speakerMeshes, refDistanceShell, maxDistanceShell]
    };
  }

  private createNpcColliderRenderObjects(
    entityId: string,
    position: Vec3,
    yawDegrees: number,
    collider: NpcEntity["collider"],
    selected: boolean,
    markerColor = selected ? NPC_SELECTED_COLOR : NPC_COLOR
  ): EntityRenderObjects {
    const group = new Group();
    group.position.set(position.x, position.y, position.z);
    const colliderMaterial = new MeshStandardMaterial({
      color: markerColor,
      emissive: markerColor,
      emissiveIntensity: selected ? 0.14 : 0.05,
      roughness: 0.5,
      metalness: 0.02,
      transparent: true,
      opacity: selected ? 0.46 : 0.28
    });
    const facingMaterial = new MeshStandardMaterial({
      color: markerColor,
      emissive: markerColor,
      emissiveIntensity: selected ? 0.22 : 0.08,
      roughness: 0.4,
      metalness: 0.03
    });
    const meshes: Mesh[] = [];

    switch (collider.mode) {
      case "capsule": {
        const collisionMesh = new Mesh(
          new CapsuleGeometry(
            collider.capsuleRadius,
            Math.max(0, collider.capsuleHeight - collider.capsuleRadius * 2),
            6,
            12
          ),
          colliderMaterial
        );
        collisionMesh.position.y = collider.capsuleHeight * 0.5;
        this.tagEntityMesh(collisionMesh, entityId, "npc", group);
        meshes.push(collisionMesh);
        break;
      }
      case "box": {
        const collisionMesh = new Mesh(
          new BoxGeometry(
            collider.boxSize.x,
            collider.boxSize.y,
            collider.boxSize.z
          ),
          colliderMaterial
        );
        collisionMesh.position.y = collider.boxSize.y * 0.5;
        this.tagEntityMesh(collisionMesh, entityId, "npc", group);
        meshes.push(collisionMesh);
        break;
      }
      case "none":
        break;
    }

    const facingGroup = new Group();
    facingGroup.rotation.y = (yawDegrees * Math.PI) / 180;
    group.add(facingGroup);
    const colliderTop = getNpcColliderHeight(collider) ?? 0.18;

    const body = new Mesh(new BoxGeometry(0.08, 0.08, 0.34), facingMaterial);
    body.position.set(0, colliderTop + 0.12, 0.06);

    const arrowHead = new Mesh(
      new ConeGeometry(0.1, 0.22, 14),
      facingMaterial
    );
    arrowHead.rotation.x = Math.PI * 0.5;
    arrowHead.position.set(0, colliderTop + 0.12, 0.28);

    for (const mesh of [body, arrowHead]) {
      this.tagEntityMesh(mesh, entityId, "npc", facingGroup);
      meshes.push(mesh);
    }

    return {
      group,
      meshes
    };
  }

  private createNpcRenderObjects(
    entity: NpcEntity,
    selected: boolean,
    previewShellColor?: number
  ): EntityRenderObjects {
    const asset =
      entity.modelAssetId === null
        ? null
        : this.projectAssets[entity.modelAssetId] ?? null;

    if (entity.modelAssetId !== null && asset?.kind === "model") {
      const loadedAsset = this.loadedModelAssets[entity.modelAssetId];
      const renderGroup = createModelInstanceRenderGroup(
        {
          id: entity.id,
          kind: "modelInstance",
          assetId: entity.modelAssetId,
          name: entity.name,
          visible: entity.visible,
          enabled: entity.enabled,
          position: entity.position,
          rotationDegrees: {
            x: 0,
            y: entity.yawDegrees,
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
        selected,
        previewShellColor,
        this.displayMode === "wireframe" ? "wireframe" : "normal"
      );

      return {
        group: renderGroup,
        meshes: this.tagEntityGroup(renderGroup, entity.id, "npc"),
        dispose: () => {
          disposeModelInstance(renderGroup);
        }
      };
    }

    return this.createNpcColliderRenderObjects(
      entity.id,
      entity.position,
      entity.yawDegrees,
      entity.collider,
      selected,
      previewShellColor ?? (selected ? NPC_SELECTED_COLOR : NPC_COLOR)
    );
  }

  private createTriggerVolumeRenderObjects(
    entityId: string,
    position: Vec3,
    size: Vec3,
    selected: boolean,
    markerColor = selected
      ? TRIGGER_VOLUME_SELECTED_COLOR
      : TRIGGER_VOLUME_COLOR
  ): EntityRenderObjects {
    const group = new Group();
    group.position.set(position.x, position.y, position.z);

    const fill = new Mesh(
      new BoxGeometry(size.x, size.y, size.z),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.1 : 0.03,
        roughness: 0.7,
        metalness: 0,
        transparent: true,
        opacity: selected ? 0.2 : 0.1
      })
    );

    const outline = new Mesh(
      new BoxGeometry(size.x, size.y, size.z),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.12 : 0.04,
        roughness: 0.9,
        metalness: 0,
        wireframe: true,
        transparent: true,
        opacity: 0.95
      })
    );

    for (const mesh of [fill, outline]) {
      this.tagEntityMesh(mesh, entityId, "triggerVolume", group);
    }

    return {
      group,
      meshes: [fill, outline]
    };
  }

  private createTeleportTargetRenderObjects(
    entityId: string,
    position: Vec3,
    yawDegrees: number,
    selected: boolean,
    markerColor = selected
      ? TELEPORT_TARGET_SELECTED_COLOR
      : TELEPORT_TARGET_COLOR
  ): EntityRenderObjects {
    const group = new Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = (yawDegrees * Math.PI) / 180;

    const ring = new Mesh(
      new TorusGeometry(0.28, 0.045, 8, 24),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.18 : 0.08,
        roughness: 0.42,
        metalness: 0.04
      })
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = 0.035;

    const stem = new Mesh(
      new CylinderGeometry(0.04, 0.04, 0.3, 12),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.12 : 0.04,
        roughness: 0.45,
        metalness: 0.02
      })
    );
    stem.position.y = 0.15;

    const arrowHead = new Mesh(
      new ConeGeometry(0.12, 0.24, 14),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.18 : 0.06,
        roughness: 0.36,
        metalness: 0.03
      })
    );
    arrowHead.rotation.x = Math.PI * 0.5;
    arrowHead.position.set(0, 0.15, 0.34);

    for (const mesh of [ring, stem, arrowHead]) {
      this.tagEntityMesh(mesh, entityId, "teleportTarget", group);
    }

    return {
      group,
      meshes: [ring, stem, arrowHead]
    };
  }

  private createInteractableRenderObjects(
    entityId: string,
    position: Vec3,
    radius: number,
    selected: boolean,
    interactionEnabled = true,
    markerColor = selected ? INTERACTABLE_SELECTED_COLOR : INTERACTABLE_COLOR
  ): EntityRenderObjects {
    const displayRadius = Math.max(0.45, radius);
    const group = new Group();
    group.position.set(position.x, position.y, position.z);
    const inactiveOpacity = selected ? 0.72 : 0.42;

    const core = new Mesh(
      new SphereGeometry(0.16, 12, 10),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.18 : interactionEnabled ? 0.08 : 0.025,
        roughness: 0.34,
        metalness: 0.04,
        transparent: !interactionEnabled,
        opacity: interactionEnabled ? 1 : inactiveOpacity
      })
    );

    const radiusRing = new Mesh(
      new TorusGeometry(displayRadius, 0.03, 8, 32),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.1 : interactionEnabled ? 0.04 : 0.015,
        roughness: 0.55,
        metalness: 0.02,
        transparent: !interactionEnabled,
        opacity: interactionEnabled ? 1 : 0.32
      })
    );
    radiusRing.rotation.x = Math.PI * 0.5;
    radiusRing.userData.nonPickable = true;

    for (const mesh of [core, radiusRing]) {
      this.tagEntityMesh(mesh, entityId, "interactable", group);
    }

    return {
      group,
      meshes: [core, radiusRing]
    };
  }

  private emitWhiteboxHoverLabelChange() {
    const label =
      this.currentDocument === null
        ? null
        : getWhiteboxSelectionFeedbackLabel(
            this.currentDocument,
            this.hoveredSelection
          );
    this.whiteboxHoverLabelChangeHandler?.(label);
  }

  private setHoveredSelection(selection: EditorSelection) {
    if (areEditorSelectionsEqual(this.hoveredSelection, selection)) {
      return;
    }

    this.hoveredSelection = selection;
    this.refreshBrushPresentation();
    this.refreshTerrainPresentation();
    this.refreshPathPresentation();
    this.emitWhiteboxHoverLabelChange();
  }

  private getFaceHighlightState(
    brushId: string,
    faceId: WhiteboxFaceId
  ): "none" | "hovered" | "selected" {
    if (isBrushFaceSelected(this.currentSelection, brushId, faceId)) {
      return "selected";
    }

    if (
      this.hoveredSelection.kind === "brushFace" &&
      this.hoveredSelection.brushId === brushId &&
      this.hoveredSelection.faceId === faceId
    ) {
      return "hovered";
    }

    return "none";
  }

  private getMaterialSwatchColorHex(
    material: MaterialDef,
    highlightState: "none" | "hovered" | "selected"
  ): number {
    const swatchColor = new Color(material.swatchColorHex);

    if (highlightState === "selected") {
      swatchColor.lerp(new Color(SELECTED_FACE_FALLBACK_COLOR), 0.42);
    } else if (highlightState === "hovered") {
      swatchColor.lerp(new Color(HOVERED_FACE_FALLBACK_COLOR), 0.28);
    }

    return swatchColor.getHex();
  }

  private createFaceMaterial(
    brush: Brush,
    faceId: WhiteboxFaceId,
    material: MaterialDef | undefined,
    highlightState: "none" | "hovered" | "selected",
    volumeRenderPaths: {
      fog: "performance" | "quality";
      water: "performance" | "quality";
    },
    contactPatches: ReturnType<typeof collectWaterContactPatches>
  ): Material {
    const face = brush.faces[faceId];
    const selectedFace = highlightState === "selected";
    const hoveredFace = highlightState === "hovered";
    const whiteboxBevelSettings = this.currentWorld?.advancedRendering;

    if (brush.volume.mode === "water") {
      if (brush.kind !== "box") {
        throw new Error(
          `Only whitebox boxes support water volume rendering (${brush.id}).`
        );
      }

      const quality = volumeRenderPaths.water === "quality";
      const baseOpacity = Math.max(
        0.08,
        Math.min(1, brush.volume.water.surfaceOpacity)
      );
      const isTopFace = faceId === "posY";
      const opacityBoost = isTopFace ? 0.16 : 0;
      const opacity = Math.min(
        1,
        baseOpacity +
          opacityBoost +
          (selectedFace ? 0.08 : hoveredFace ? 0.04 : 0)
      );

      const waterMaterial = createWaterMaterial({
        colorHex: brush.volume.water.colorHex,
        surfaceOpacity: brush.volume.water.surfaceOpacity,
        waveStrength: brush.volume.water.waveStrength,
        surfaceDisplacementEnabled:
          brush.volume.water.surfaceDisplacementEnabled,
        opacity,
        quality,
        wireframe: this.displayMode === "wireframe",
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
        waterMaterial.reflectionMatrixUniform !== null &&
        waterMaterial.reflectionEnabledUniform !== null
      ) {
        const preservedReflectionRenderTarget =
          this.claimPreservedViewportWaterReflectionTarget(brush.id);
        this.viewportWaterSurfaceBindings.push({
          brush,
          reflectionTextureUniform: waterMaterial.reflectionTextureUniform,
          reflectionMatrixUniform: waterMaterial.reflectionMatrixUniform,
          reflectionEnabledUniform: waterMaterial.reflectionEnabledUniform,
          reflectionRenderTarget:
            preservedReflectionRenderTarget ??
            (this.getWaterReflectionMode() !== "none"
              ? this.createWaterReflectionRenderTarget()
              : null),
          lastReflectionUpdateTime: Number.NEGATIVE_INFINITY
        });
      }

      return waterMaterial.material;
    }

    if (brush.volume.mode === "fog") {
      const quality = volumeRenderPaths.fog === "quality";
      const baseOpacity = Math.max(
        0.08,
        Math.min(0.82, brush.volume.fog.density * (quality ? 0.65 : 0.9) + 0.1)
      );
      const opacity = Math.min(
        0.92,
        baseOpacity + (selectedFace ? 0.08 : hoveredFace ? 0.04 : 0)
      );

      if (this.displayMode === "wireframe") {
        return new MeshBasicMaterial({
          color: brush.volume.fog.colorHex,
          wireframe: true,
          transparent: true,
          opacity: Math.min(1, opacity + 0.16),
          depthWrite: false
        });
      }

      if (this.displayMode === "authoring") {
        return new MeshBasicMaterial({
          color: brush.volume.fog.colorHex,
          transparent: true,
          opacity
        });
      }

      if (quality) {
        const fogMaterial = createFogQualityMaterial({
          colorHex: brush.volume.fog.colorHex,
          density:
            brush.volume.fog.density *
            (selectedFace ? 1.12 : hoveredFace ? 1.06 : 1),
          padding: brush.volume.fog.padding,
          time: this.volumeTime,
          halfSize: {
            x: brush.size.x * 0.5,
            y: brush.size.y * 0.5,
            z: brush.size.z * 0.5
          },
          opacityMultiplier: selectedFace ? 1.12 : hoveredFace ? 1.06 : 1,
          colorLift: selectedFace ? 0.08 : hoveredFace ? 0.04 : 0
        });

        this.volumeAnimatedUniforms.push(fogMaterial.animationUniform);
        return fogMaterial.material;
      }

      return new MeshStandardMaterial({
        color: brush.volume.fog.colorHex,
        emissive: brush.volume.fog.colorHex,
        emissiveIntensity: quality ? 0.08 : 0.04,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity,
        depthWrite: false
      });
    }

    if (this.displayMode === "authoring") {
      const colorHex =
        material === undefined || face.materialId === null
          ? selectedFace
            ? SELECTED_FACE_FALLBACK_COLOR
            : hoveredFace
              ? HOVERED_FACE_FALLBACK_COLOR
              : FALLBACK_FACE_COLOR
          : this.getMaterialSwatchColorHex(material, highlightState);

      return new MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: selectedFace ? 0.36 : hoveredFace ? 0.28 : 0.18,
        wireframe: false
      });
    }

    if (this.displayMode === "wireframe") {
      const colorHex =
        material === undefined || face.materialId === null
          ? selectedFace
            ? SELECTED_FACE_FALLBACK_COLOR
            : hoveredFace
              ? HOVERED_FACE_FALLBACK_COLOR
              : FALLBACK_FACE_COLOR
          : this.getMaterialSwatchColorHex(material, highlightState);

      return new MeshBasicMaterial({
        color: colorHex,
        wireframe: true,
        transparent: true,
        opacity: selectedFace ? 0.95 : hoveredFace ? 0.86 : 0.76,
        depthWrite: false
      });
    }

    if (material === undefined || face.materialId === null) {
      const faceMaterial = new MeshStandardMaterial({
        color: selectedFace
          ? SELECTED_FACE_FALLBACK_COLOR
          : hoveredFace
            ? HOVERED_FACE_FALLBACK_COLOR
            : FALLBACK_FACE_COLOR,
        emissive: selectedFace
          ? SELECTED_FACE_EMISSIVE
          : hoveredFace
            ? HOVERED_FACE_EMISSIVE
            : 0x000000,
        emissiveIntensity: selectedFace ? 0.28 : hoveredFace ? 0.18 : 0,
        roughness: 0.9,
        metalness: 0.05
      });

      if (
        whiteboxBevelSettings !== undefined &&
        shouldApplyWhiteboxBevel(whiteboxBevelSettings)
      ) {
        applyWhiteboxBevelToMaterial(
          faceMaterial,
          whiteboxBevelSettings.whiteboxBevel
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
      emissive: selectedFace
        ? SELECTED_FACE_EMISSIVE
        : hoveredFace
          ? HOVERED_FACE_EMISSIVE
          : 0x000000,
      emissiveIntensity: selectedFace ? 0.32 : hoveredFace ? 0.18 : 0,
      roughness: 1,
      metalnessMap: textureSet.metallic,
      metalness: textureSet.metallic === null ? 0.03 : 1,
      specularColorMap: textureSet.specular,
      specularColor: new Color(0xffffff),
      specularIntensity: textureSet.specular === null ? 0.2 : 1
    });

    if (
      whiteboxBevelSettings !== undefined &&
      shouldApplyWhiteboxBevel(whiteboxBevelSettings)
    ) {
      applyWhiteboxBevelToMaterial(
        faceMaterial,
        whiteboxBevelSettings.whiteboxBevel
      );
    }

    return faceMaterial;
  }

  private getWaterReflectionMode() {
    if (
      this.currentWorld === null ||
      !this.currentWorld.advancedRendering.enabled ||
      this.currentWorld.advancedRendering.waterPath !== "quality" ||
      this.displayMode !== "normal" ||
      this.viewMode !== "perspective"
    ) {
      return "none" as const;
    }

    return this.currentWorld.advancedRendering.waterReflectionMode;
  }

  private createWaterReflectionRenderTarget() {
    const canvasWidth =
      this.container?.clientWidth ?? this.renderer.domElement.width;
    const canvasHeight =
      this.container?.clientHeight ?? this.renderer.domElement.height;
    const width = Math.max(128, Math.round(Math.max(canvasWidth, 512) * 0.5));
    const height = Math.max(128, Math.round(Math.max(canvasHeight, 512) * 0.5));
    return new WebGLRenderTarget(width, height);
  }

  private resizeWaterReflectionTargets() {
    const canvasWidth =
      this.container?.clientWidth ?? this.renderer.domElement.width;
    const canvasHeight =
      this.container?.clientHeight ?? this.renderer.domElement.height;
    const width = Math.max(128, Math.round(Math.max(canvasWidth, 512) * 0.5));
    const height = Math.max(128, Math.round(Math.max(canvasHeight, 512) * 0.5));

    for (const binding of this.viewportWaterSurfaceBindings) {
      binding.reflectionRenderTarget?.setSize(width, height);
      binding.lastReflectionUpdateTime = Number.NEGATIVE_INFINITY;
    }
  }

  private resetViewportWaterSurfaceBindings(preserveRenderTargets: boolean) {
    const preservedReflectionTargets = new Map<
      string,
      WebGLRenderTarget | null
    >();

    this.volumeAnimatedUniforms.length = 0;

    for (const binding of this.viewportWaterSurfaceBindings) {
      if (
        preserveRenderTargets &&
        !preservedReflectionTargets.has(binding.brush.id)
      ) {
        preservedReflectionTargets.set(
          binding.brush.id,
          binding.reflectionRenderTarget
        );
        continue;
      }

      binding.reflectionRenderTarget?.dispose();
    }

    this.viewportWaterSurfaceBindings.length = 0;

    return preservedReflectionTargets;
  }

  private claimPreservedViewportWaterReflectionTarget(brushId: string) {
    if (this.preservedViewportWaterReflectionTargets === null) {
      return null;
    }

    const reflectionRenderTarget =
      this.preservedViewportWaterReflectionTargets.get(brushId) ?? null;
    this.preservedViewportWaterReflectionTargets.delete(brushId);
    return reflectionRenderTarget;
  }

  private disposePreservedViewportWaterReflectionTargets() {
    if (this.preservedViewportWaterReflectionTargets === null) {
      return;
    }

    for (const reflectionRenderTarget of this.preservedViewportWaterReflectionTargets.values()) {
      reflectionRenderTarget?.dispose();
    }

    this.preservedViewportWaterReflectionTargets = null;
  }

  private updateViewportWaterReflections() {
    const activeCamera = this.getActiveCamera();

    if (!(activeCamera instanceof PerspectiveCamera)) {
      for (const binding of this.viewportWaterSurfaceBindings) {
        if (binding.reflectionEnabledUniform !== null) {
          binding.reflectionEnabledUniform.value = 0;
        }
      }
      return;
    }

    const reflectionMode = this.getWaterReflectionMode();
    const now = performance.now();

    for (const binding of this.viewportWaterSurfaceBindings) {
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
        activeCamera,
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

      const hiddenObjects: Array<{ object: Object3D; visible: boolean }> = [];
      const hiddenObjectSet = new Set<Object3D>();
      const hideObject = (object: Object3D | null | undefined) => {
        if (
          object === null ||
          object === undefined ||
          hiddenObjectSet.has(object)
        ) {
          return;
        }

        hiddenObjectSet.add(object);
        hiddenObjects.push({ object, visible: object.visible });
        object.visible = false;
      };

      for (const waterBinding of this.viewportWaterSurfaceBindings) {
        const renderObjects = this.brushRenderObjects.get(
          waterBinding.brush.id
        );

        if (renderObjects !== undefined) {
          hideObject(renderObjects.mesh);
        }
      }

      for (const renderObjects of this.brushRenderObjects.values()) {
        hideObject(renderObjects.edges);

        for (const edgeHelper of renderObjects.edgeHelpers) {
          hideObject(edgeHelper.line);
        }

        for (const vertexHelper of renderObjects.vertexHelpers) {
          hideObject(vertexHelper.mesh);
        }
      }

      hideObject(this.axesHelper);
      hideObject(this.gridHelpers.xz);
      hideObject(this.gridHelpers.xy);
      hideObject(this.gridHelpers.yz);
      hideObject(this.entityGroup);
      hideObject(this.transformGizmoGroup);
      hideObject(this.boxCreatePreviewMesh);
      hideObject(this.boxCreatePreviewEdges);
      hideObject(this.creationPreviewObject);

      if (reflectionMode === "world") {
        hideObject(this.modelGroup);
      }

      const previousAutoClear = this.renderer.autoClear;
      const previousRenderTarget = this.renderer.getRenderTarget();
      const previousReflectionStates = this.viewportWaterSurfaceBindings.map(
        (waterBinding) => ({
          binding: waterBinding,
          enabled: waterBinding.reflectionEnabledUniform?.value ?? 0,
          texture: waterBinding.reflectionTextureUniform?.value ?? null
        })
      );
      try {
        for (const state of previousReflectionStates) {
          if (state.binding.reflectionEnabledUniform !== null) {
            state.binding.reflectionEnabledUniform.value = 0;
          }
        }
        binding.reflectionTextureUniform.value = null;
        this.renderer.autoClear = true;
        this.renderer.setRenderTarget(binding.reflectionRenderTarget);
        this.renderer.clear();
        this.renderer.render(this.scene, this.waterReflectionCamera);
      } finally {
        this.renderer.setRenderTarget(previousRenderTarget);
        this.renderer.autoClear = previousAutoClear;
        for (const state of previousReflectionStates) {
          if (state.binding.reflectionEnabledUniform !== null) {
            state.binding.reflectionEnabledUniform.value = state.enabled;
          }
          if (state.binding.reflectionTextureUniform !== null) {
            state.binding.reflectionTextureUniform.value = state.texture;
          }
        }

        for (const hiddenObject of hiddenObjects) {
          hiddenObject.object.visible = hiddenObject.visible;
        }
      }

      binding.reflectionTextureUniform.value =
        binding.reflectionRenderTarget.texture;
      binding.reflectionEnabledUniform.value = 0.36;
      binding.lastReflectionUpdateTime = now;
    }
  }

  private getOrCreateTextureSet(material: MaterialDef) {
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

  private collectViewportWaterContactPatches(
    document: SceneDocument,
    waterBrush: BoxBrush
  ) {
    const contactBounds: Parameters<typeof collectWaterContactPatches>[1] = [];

    for (const brush of Object.values(document.brushes)) {
      if (brush.id === waterBrush.id || brush.volume.mode !== "none") {
        continue;
      }

      const derivedMesh = buildBoxBrushDerivedMeshData(brush);

      contactBounds.push({
        kind: "triangleMesh",
        vertices: derivedMesh.colliderVertices,
        indices: derivedMesh.colliderIndices,
        transform: {
          position: brush.center,
          rotationDegrees: brush.rotationDegrees,
          scale: {
            x: 1,
            y: 1,
            z: 1
          }
        }
      });
    }

    for (const terrain of getTerrains(document.terrains)) {
      if (!terrain.enabled || !terrain.visible) {
        continue;
      }

      const derivedMesh = buildTerrainDerivedMeshData(terrain);

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

    for (const modelInstance of getModelInstances(document.modelInstances)) {
      if (modelInstance.collision.mode === "none") {
        continue;
      }

      const asset = this.projectAssets[modelInstance.assetId];

      if (asset?.kind !== "model") {
        continue;
      }

      try {
        const generatedCollider = buildGeneratedModelCollider(
          modelInstance,
          asset,
          this.loadedModelAssets[modelInstance.assetId]
        );

        if (generatedCollider !== null) {
          if (generatedCollider.kind === "trimesh") {
            contactBounds.push({
              kind: "triangleMesh",
              vertices: generatedCollider.vertices,
              indices: generatedCollider.indices,
              mergeProfile: "aggressive",
              transform: generatedCollider.transform
            });
          } else {
            contactBounds.push(generatedCollider.worldBounds);
          }
        }
      } catch {
        // Validation already surfaces unsupported collider modes; the viewport keeps rendering.
      }
    }

    return collectWaterContactPatches(
      {
        center: waterBrush.center,
        rotationDegrees: waterBrush.rotationDegrees,
        size: waterBrush.size
      },
      contactBounds,
      this.getViewportWaterFoamContactLimit(waterBrush)
    );
  }

  private getViewportWaterFoamContactLimit(brush: BoxBrush) {
    return brush.volume.mode === "water"
      ? brush.volume.water.foamContactLimit
      : 0;
  }

  private createEdgeHelper(
    brush: Brush,
    edgeId: WhiteboxEdgeId
  ): { id: WhiteboxEdgeId; line: Line<BufferGeometry, LineBasicMaterial> } {
    const segment = getBrushEdgeWorldSegment(brush, edgeId);
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(segment.start.x, segment.start.y, segment.start.z),
      new Vector3(segment.end.x, segment.end.y, segment.end.z)
    ]);
    const line = new Line(
      geometry,
      new LineBasicMaterial({
        color: WHITEBOX_COMPONENT_COLOR,
        transparent: true,
        opacity: WHITEBOX_COMPONENT_DEFAULT_OPACITY,
        depthTest: false
      })
    );

    line.userData.brushId = brush.id;
    line.userData.brushEdgeId = edgeId;

    return {
      id: edgeId,
      line
    };
  }

  private createVertexHelper(
    brush: Brush,
    vertexId: WhiteboxVertexId
  ): { id: WhiteboxVertexId; mesh: Mesh<SphereGeometry, MeshBasicMaterial> } {
    const position = getBrushVertexWorldPosition(brush, vertexId);
    const mesh = new Mesh(
      new SphereGeometry(WHITEBOX_VERTEX_RADIUS, 10, 8),
      new MeshBasicMaterial({
        color: WHITEBOX_COMPONENT_COLOR,
        transparent: true,
        opacity: WHITEBOX_COMPONENT_DEFAULT_OPACITY,
        depthTest: false
      })
    );

    mesh.position.set(position.x, position.y, position.z);
    mesh.userData.brushId = brush.id;
    mesh.userData.brushVertexId = vertexId;

    return {
      id: vertexId,
      mesh
    };
  }

  private refreshBrushPresentation() {
    if (this.currentDocument === null) {
      return;
    }

    const volumeRenderPaths = resolveBoxVolumeRenderPaths(
      this.currentDocument.world.advancedRendering
    );

    this.preservedViewportWaterReflectionTargets =
      this.resetViewportWaterSurfaceBindings(true);

    try {
      for (const brush of Object.values(this.currentDocument.brushes)) {
        const renderObjects = this.brushRenderObjects.get(brush.id);

        if (renderObjects === undefined) {
          continue;
        }

        const brushSelected = isBrushSelected(this.currentSelection, brush.id);
        const brushHovered =
          this.hoveredSelection.kind === "brushes" &&
          this.hoveredSelection.ids.includes(brush.id);
        renderObjects.edges.material.color.setHex(
          brushSelected
            ? BRUSH_SELECTED_EDGE_COLOR
            : brushHovered && this.whiteboxSelectionMode === "object"
              ? BRUSH_HOVERED_EDGE_COLOR
              : BRUSH_EDGE_COLOR
        );

        const previousMaterials = renderObjects.mesh.material;
        const contactPatches =
          brush.kind === "box" && brush.volume.mode === "water"
            ? this.collectViewportWaterContactPatches(
                this.currentDocument,
                brush
              )
            : [];
        renderObjects.mesh.material =
          this.createFogMaterialSet(brush, volumeRenderPaths) ??
          renderObjects.faceIdsInOrder.map((faceId) =>
            this.createFaceMaterial(
              brush,
              faceId,
              this.currentDocument?.materials[
                brush.faces[faceId].materialId ?? ""
              ],
              this.getFaceHighlightState(brush.id, faceId),
              volumeRenderPaths,
              contactPatches
            )
          );
        this.configureFogVolumeMesh(
          renderObjects.mesh,
          renderObjects.mesh.material
        );

        this.disposeUniqueMaterials(previousMaterials);

        const hoveredEdgeId =
          this.hoveredSelection.kind === "brushEdge" &&
          this.hoveredSelection.brushId === brush.id
            ? this.hoveredSelection.edgeId
            : null;
        const hoveredVertexId =
          this.hoveredSelection.kind === "brushVertex" &&
          this.hoveredSelection.brushId === brush.id
            ? this.hoveredSelection.vertexId
            : null;

        for (const edgeHelper of renderObjects.edgeHelpers) {
          const selected = isBrushEdgeSelected(
            this.currentSelection,
            brush.id,
            edgeHelper.id
          );
          const hovered = hoveredEdgeId === edgeHelper.id;

          edgeHelper.line.visible = this.whiteboxSelectionMode === "edge";
          edgeHelper.line.material.color.setHex(
            selected
              ? WHITEBOX_COMPONENT_SELECTED_COLOR
              : hovered
                ? WHITEBOX_COMPONENT_HOVERED_COLOR
                : WHITEBOX_COMPONENT_COLOR
          );
          edgeHelper.line.material.opacity = selected
            ? WHITEBOX_COMPONENT_SELECTED_OPACITY
            : hovered
              ? WHITEBOX_COMPONENT_HOVERED_OPACITY
              : WHITEBOX_COMPONENT_DEFAULT_OPACITY;
        }

        for (const vertexHelper of renderObjects.vertexHelpers) {
          const selected = isBrushVertexSelected(
            this.currentSelection,
            brush.id,
            vertexHelper.id
          );
          const hovered = hoveredVertexId === vertexHelper.id;

          vertexHelper.mesh.visible = this.whiteboxSelectionMode === "vertex";
          vertexHelper.mesh.material.color.setHex(
            selected
              ? WHITEBOX_COMPONENT_SELECTED_COLOR
              : hovered
                ? WHITEBOX_COMPONENT_HOVERED_COLOR
                : WHITEBOX_COMPONENT_COLOR
          );
          vertexHelper.mesh.material.opacity = selected
            ? WHITEBOX_COMPONENT_SELECTED_OPACITY
            : hovered
              ? WHITEBOX_COMPONENT_HOVERED_OPACITY
              : WHITEBOX_COMPONENT_DEFAULT_OPACITY;
        }
      }
    } finally {
      this.disposePreservedViewportWaterReflectionTargets();
    }
  }

  private refreshTerrainPresentation() {
    if (this.currentDocument === null) {
      return;
    }

    for (const terrain of Object.values(this.currentDocument.terrains)) {
      const renderObjects = this.terrainRenderObjects.get(terrain.id);

      if (renderObjects === undefined) {
        continue;
      }

      const displayedTerrain = this.getDisplayedTerrainState(terrain.id) ?? terrain;
      const previousMaterial = renderObjects.mesh.material;
      renderObjects.mesh.material = this.createTerrainMaterial(displayedTerrain);
      previousMaterial.dispose();
    }
  }

  private getDisplayedTerrainState(terrainId: string): Terrain | null {
    if (
      this.activeTerrainBrushStroke !== null &&
      this.activeTerrainBrushStroke.previewTerrain.id === terrainId
    ) {
      return this.activeTerrainBrushStroke.previewTerrain;
    }

    return this.currentDocument?.terrains[terrainId] ?? null;
  }

  private rebuildDisplayedTerrainState() {
    if (this.currentDocument === null) {
      return;
    }

    this.rebuildTerrains(
      this.currentDocument,
      this.currentSelection,
      this.currentActiveSelectionId
    );
  }

  private isTerrainBrushActive(): boolean {
    return (
      this.toolMode === "select" &&
      this.currentTerrainBrushState !== null &&
      this.currentDocument !== null &&
      this.currentSelection.kind === "terrains" &&
      this.currentSelection.ids.length === 1 &&
      this.currentSelection.ids[0] === this.currentTerrainBrushState.terrainId
    );
  }

  private getTerrainBrushPreviewColor(brushState: ArmedTerrainBrushState): number {
    switch (brushState.tool) {
      case "raise":
        return TERRAIN_BRUSH_PREVIEW_RAISE_COLOR;
      case "lower":
        return TERRAIN_BRUSH_PREVIEW_LOWER_COLOR;
      case "smooth":
        return TERRAIN_BRUSH_PREVIEW_SMOOTH_COLOR;
      case "flatten":
        return TERRAIN_BRUSH_PREVIEW_FLATTEN_COLOR;
      case "paint": {
        const terrain =
          this.getDisplayedTerrainState(brushState.terrainId) ??
          this.currentDocument?.terrains[brushState.terrainId] ??
          null;

        if (terrain === null) {
          return TERRAIN_BRUSH_PREVIEW_PAINT_COLOR;
        }

        const terrainLayer = terrain.layers[brushState.layerIndex] ?? null;
        const terrainMaterial =
          terrainLayer === null
            ? null
            : this.resolveTerrainLayerMaterial(terrainLayer.materialId);
        return getTerrainLayerPreviewColor(terrainMaterial);
      }
    }
  }

  private setTerrainBrushHover(hit: TerrainBrushHit | null) {
    this.terrainBrushHover = hit;
    this.syncTerrainBrushPreview();
  }

  private syncTerrainBrushPreview() {
    if (
      !this.isTerrainBrushActive() ||
      this.currentTerrainBrushState === null ||
      this.terrainBrushHover === null ||
      this.terrainBrushHover.terrainId !== this.currentTerrainBrushState.terrainId
    ) {
      this.terrainBrushPreviewGroup.visible = false;
      return;
    }

    const terrain = this.getDisplayedTerrainState(this.terrainBrushHover.terrainId);

    if (terrain === null) {
      this.terrainBrushPreviewGroup.visible = false;
      return;
    }

    const previewPoints = createTerrainBrushPreviewPoints(
      terrain,
      {
        x: this.terrainBrushHover.point.x,
        z: this.terrainBrushHover.point.z
      },
      this.currentTerrainBrushState.radius,
      40,
      TERRAIN_BRUSH_PREVIEW_OFFSET
    ).map((point) => new Vector3(point.x, point.y, point.z));

    if (previewPoints.length < 2) {
      this.terrainBrushPreviewGroup.visible = false;
      return;
    }

    const previousGeometry = this.terrainBrushPreviewLine.geometry;
    this.terrainBrushPreviewLine.geometry = new BufferGeometry().setFromPoints(
      previewPoints
    );
    previousGeometry.dispose();

    const previewColor = this.getTerrainBrushPreviewColor(
      this.currentTerrainBrushState
    );
    (this.terrainBrushPreviewLine.material as LineBasicMaterial).color.setHex(
      previewColor
    );
    (this.terrainBrushPreviewCenter.material as MeshBasicMaterial).color.setHex(
      previewColor
    );
    this.terrainBrushPreviewCenter.position.set(
      this.terrainBrushHover.point.x,
      this.terrainBrushHover.point.y + TERRAIN_BRUSH_PREVIEW_OFFSET,
      this.terrainBrushHover.point.z
    );
    this.terrainBrushPreviewCenter.scale.setScalar(
      Math.max(0.08, this.currentTerrainBrushState.radius * 0.04)
    );
    this.terrainBrushPreviewGroup.visible = true;
  }

  private extractTerrainIdFromObject(object: Object3D): string | null {
    let current: Object3D | null = object;

    while (current !== null) {
      const terrainId = current.userData.terrainId;

      if (typeof terrainId === "string") {
        return terrainId;
      }

      current = current.parent;
    }

    return null;
  }

  private getTerrainBrushRaycastObjects(): Object3D[] {
    const raycastObjects: Object3D[] = [];

    for (const renderObjects of this.brushRenderObjects.values()) {
      raycastObjects.push(renderObjects.mesh);
    }

    if (this.currentDocument !== null) {
      for (const [entityId, renderObjects] of this.entityRenderObjects) {
        const entity = this.currentDocument.entities[entityId];

        if (entity?.kind !== "triggerVolume") {
          continue;
        }

        raycastObjects.push(renderObjects.group);
      }
    }

    for (const renderObjects of this.terrainRenderObjects.values()) {
      raycastObjects.push(renderObjects.mesh);
    }

    for (const renderGroup of this.modelRenderObjects.values()) {
      raycastObjects.push(renderGroup);
    }

    return raycastObjects;
  }

  private getTerrainBrushHitAtClientPosition(
    clientX: number,
    clientY: number
  ): TerrainBrushHit | null {
    if (
      !this.isTerrainBrushActive() ||
      this.currentTerrainBrushState === null ||
      !this.setPointerFromClientPosition(clientX, clientY)
    ) {
      return null;
    }

    const raycastObjects = this.getTerrainBrushRaycastObjects();

    if (raycastObjects.length === 0) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());
    const hit = this.raycaster.intersectObjects(raycastObjects, true)[0];

    if (hit === undefined) {
      return null;
    }

    const terrainId = this.extractTerrainIdFromObject(hit.object);

    if (terrainId !== this.currentTerrainBrushState.terrainId) {
      return null;
    }

    return {
      terrainId,
      point: {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z
      }
    };
  }

  private applyTerrainBrushPoint(
    terrain: Terrain,
    point: {
      x: number;
      z: number;
    },
    toolState: ArmedTerrainBrushState,
    referenceHeight: number | null
  ): Terrain {
    return applyTerrainBrushStamp({
      terrain,
      center: point,
      settings: toolState,
      tool: toolState.tool,
      referenceHeight,
      layerIndex: toolState.tool === "paint" ? toolState.layerIndex : null
    });
  }

  private applyTerrainBrushSegment(
    terrain: Terrain,
    from: {
      x: number;
      z: number;
    },
    to: {
      x: number;
      z: number;
    },
    toolState: ArmedTerrainBrushState,
    referenceHeight: number | null
  ): {
    terrain: Terrain;
    lastAppliedPoint: {
      x: number;
      z: number;
    };
  } {
    const spacing = getTerrainBrushStrokeSpacing(terrain, toolState);
    const deltaX = to.x - from.x;
    const deltaZ = to.z - from.z;
    const distance = Math.hypot(deltaX, deltaZ);

    if (distance < spacing) {
      return {
        terrain,
        lastAppliedPoint: from
      };
    }

    let nextTerrain = terrain;
    let lastAppliedPoint = from;
    const stepCount = Math.floor(distance / spacing);

    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
      const t = Math.min(1, (stepIndex * spacing) / distance);
      const point = {
        x: from.x + deltaX * t,
        z: from.z + deltaZ * t
      };
      nextTerrain = this.applyTerrainBrushPoint(
        nextTerrain,
        point,
        toolState,
        referenceHeight
      );
      lastAppliedPoint = point;
    }

    return {
      terrain: nextTerrain,
      lastAppliedPoint
    };
  }

  private beginTerrainBrushStroke(event: PointerEvent): boolean {
    if (
      !this.isTerrainBrushActive() ||
      this.currentTerrainBrushState === null
    ) {
      return false;
    }

    event.preventDefault();
    const hit = this.getTerrainBrushHitAtClientPosition(
      event.clientX,
      event.clientY
    );
    this.setTerrainBrushHover(hit);

    if (hit === null) {
      return true;
    }

    const terrain = this.getDisplayedTerrainState(hit.terrainId);

    if (terrain === null) {
      return true;
    }

    const referenceHeight =
      this.currentTerrainBrushState.tool === "flatten"
        ? hit.point.y - terrain.position.y
        : null;
    const previewTerrain = this.applyTerrainBrushPoint(
      terrain,
      {
        x: hit.point.x,
        z: hit.point.z
      },
      this.currentTerrainBrushState,
      referenceHeight
    );

    this.activeTerrainBrushStroke = {
      pointerId: event.pointerId,
      previewTerrain,
      referenceHeight,
      lastAppliedPoint: {
        x: hit.point.x,
        z: hit.point.z
      },
      toolState: this.currentTerrainBrushState
    };
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.rebuildDisplayedTerrainState();
    return true;
  }

  private continueTerrainBrushStroke(event: PointerEvent): boolean {
    if (
      this.activeTerrainBrushStroke === null ||
      this.activeTerrainBrushStroke.pointerId !== event.pointerId
    ) {
      return false;
    }

    const hit = this.getTerrainBrushHitAtClientPosition(
      event.clientX,
      event.clientY
    );
    this.setTerrainBrushHover(hit);

    if (hit === null) {
      return true;
    }

    const segmentResult = this.applyTerrainBrushSegment(
      this.activeTerrainBrushStroke.previewTerrain,
      this.activeTerrainBrushStroke.lastAppliedPoint,
      {
        x: hit.point.x,
        z: hit.point.z
      },
      this.activeTerrainBrushStroke.toolState,
      this.activeTerrainBrushStroke.referenceHeight
    );

    if (
      !areTerrainsEqual(
        segmentResult.terrain,
        this.activeTerrainBrushStroke.previewTerrain
      ) ||
      segmentResult.lastAppliedPoint.x !==
        this.activeTerrainBrushStroke.lastAppliedPoint.x ||
      segmentResult.lastAppliedPoint.z !==
        this.activeTerrainBrushStroke.lastAppliedPoint.z
    ) {
      this.activeTerrainBrushStroke = {
        ...this.activeTerrainBrushStroke,
        previewTerrain: segmentResult.terrain,
        lastAppliedPoint: segmentResult.lastAppliedPoint
      };
      this.rebuildDisplayedTerrainState();
    }

    return true;
  }

  private cancelActiveTerrainBrushStroke(rebuildTerrain: boolean) {
    this.terrainBrushPreviewGroup.visible = false;

    if (this.activeTerrainBrushStroke === null) {
      return;
    }

    this.activeTerrainBrushStroke = null;

    if (rebuildTerrain) {
      this.rebuildDisplayedTerrainState();
    }
  }

  private finishTerrainBrushStroke(event: PointerEvent): boolean {
    if (
      this.activeTerrainBrushStroke === null ||
      this.activeTerrainBrushStroke.pointerId !== event.pointerId
    ) {
      return false;
    }

    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }

    const cancelled = event.type === "pointercancel";
    let finalPreviewTerrain = this.activeTerrainBrushStroke.previewTerrain;

    if (!cancelled) {
      const hit = this.getTerrainBrushHitAtClientPosition(
        event.clientX,
        event.clientY
      );

      if (hit !== null) {
        const segmentResult = this.applyTerrainBrushSegment(
          finalPreviewTerrain,
          this.activeTerrainBrushStroke.lastAppliedPoint,
          {
            x: hit.point.x,
            z: hit.point.z
          },
          this.activeTerrainBrushStroke.toolState,
          this.activeTerrainBrushStroke.referenceHeight
        );
        finalPreviewTerrain = segmentResult.terrain;

        if (
          segmentResult.lastAppliedPoint.x !== hit.point.x ||
          segmentResult.lastAppliedPoint.z !== hit.point.z
        ) {
          finalPreviewTerrain = this.applyTerrainBrushPoint(
            finalPreviewTerrain,
            {
              x: hit.point.x,
              z: hit.point.z
            },
            this.activeTerrainBrushStroke.toolState,
            this.activeTerrainBrushStroke.referenceHeight
          );
        }
      }
    }

    const baseTerrain =
      this.currentDocument?.terrains[this.activeTerrainBrushStroke.toolState.terrainId] ??
      null;
    const commit =
      !cancelled &&
      baseTerrain !== null &&
      !areTerrainsEqual(baseTerrain, finalPreviewTerrain);
    const toolState = this.activeTerrainBrushStroke.toolState;
    this.activeTerrainBrushStroke = null;
    this.terrainBrushPreviewGroup.visible = false;

    if (!commit) {
      this.rebuildDisplayedTerrainState();
      return true;
    }

    const committed =
      this.terrainBrushCommitHandler?.({
        terrain: cloneTerrain(finalPreviewTerrain),
        commandLabel: getTerrainBrushCommandLabel(toolState.tool),
        tool: toolState.tool
      }) === true;

    if (!committed) {
      this.rebuildDisplayedTerrainState();
    }

    return true;
  }

  private refreshPathPresentation() {
    if (this.currentDocument === null) {
      return;
    }

    for (const path of Object.values(this.currentDocument.paths)) {
      const renderObjects = this.pathRenderObjects.get(path.id);

      if (renderObjects === undefined) {
        continue;
      }

      const selected = isPathSelected(this.currentSelection, path.id);
      const hovered = isPathSelected(this.hoveredSelection, path.id);

      renderObjects.line.material.color.setHex(
        selected ? PATH_SELECTED_COLOR : hovered ? PATH_HOVERED_COLOR : PATH_COLOR
      );

      for (const pointMesh of renderObjects.pointMeshes) {
        const pointSelected = isPathPointSelected(
          this.currentSelection,
          path.id,
          pointMesh.pointId
        );
        const pointHovered = isPathPointSelected(
          this.hoveredSelection,
          path.id,
          pointMesh.pointId
        );

        pointMesh.mesh.material.color.setHex(
          pointSelected
            ? PATH_POINT_SELECTED_COLOR
            : pointHovered || selected
              ? PATH_POINT_HOVERED_COLOR
              : PATH_POINT_COLOR
        );
        pointMesh.mesh.scale.setScalar(
          pointSelected
            ? PATH_POINT_SELECTED_SCALE
            : pointHovered
              ? PATH_POINT_HOVERED_SCALE
              : 1
        );
      }
    }
  }

  private disposeUniqueMaterials(materials: Material[]) {
    for (const material of new Set(materials)) {
      material.dispose();
    }
  }

  private clearLocalLights() {
    for (const renderObjects of this.localLightRenderObjects.values()) {
      this.localLightGroup.remove(renderObjects.group);
    }

    this.localLightRenderObjects.clear();
  }

  private clearBrushMeshes() {
    for (const renderObjects of this.brushRenderObjects.values()) {
      this.brushGroup.remove(renderObjects.mesh);
      this.brushGroup.remove(renderObjects.edges);
      for (const edgeHelper of renderObjects.edgeHelpers) {
        this.brushGroup.remove(edgeHelper.line);
        edgeHelper.line.geometry.dispose();
        edgeHelper.line.material.dispose();
      }
      for (const vertexHelper of renderObjects.vertexHelpers) {
        this.brushGroup.remove(vertexHelper.mesh);
        vertexHelper.mesh.geometry.dispose();
        vertexHelper.mesh.material.dispose();
      }
      renderObjects.mesh.geometry.dispose();
      this.disposeUniqueMaterials(renderObjects.mesh.material);

      renderObjects.edges.geometry.dispose();
      renderObjects.edges.material.dispose();
    }

    this.brushRenderObjects.clear();
    this.disposePreservedViewportWaterReflectionTargets();
    this.resetViewportWaterSurfaceBindings(false);
  }

  private clearPaths() {
    for (const renderObjects of this.pathRenderObjects.values()) {
      this.pathGroup.remove(renderObjects.line);
      renderObjects.line.geometry.dispose();
      renderObjects.line.material.dispose();

      for (const pointMesh of renderObjects.pointMeshes) {
        this.pathGroup.remove(pointMesh.mesh);
        pointMesh.mesh.geometry.dispose();
        pointMesh.mesh.material.dispose();
      }
    }

    this.pathRenderObjects.clear();
  }

  private clearTerrains() {
    for (const renderObjects of this.terrainRenderObjects.values()) {
      this.terrainGroup.remove(renderObjects.mesh);
      renderObjects.mesh.geometry.dispose();
      renderObjects.mesh.material.dispose();
    }

    this.terrainRenderObjects.clear();
  }

  private clearEntityMarkers() {
    for (const renderObjects of this.entityRenderObjects.values()) {
      this.entityGroup.remove(renderObjects.group);

      if (renderObjects.dispose !== undefined) {
        renderObjects.dispose();
        continue;
      }

      for (const mesh of renderObjects.meshes) {
        mesh.geometry.dispose();

        if (Array.isArray(mesh.material)) {
          for (const material of mesh.material) {
            material.dispose();
          }
        } else {
          mesh.material.dispose();
        }
      }
    }

    this.entityRenderObjects.clear();
  }

  private clearModelInstances() {
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

    this.perspectiveCamera.aspect = width / height;
    this.perspectiveCamera.updateProjectionMatrix();
    this.updateOrthographicCameraFrustum();
    this.orthographicCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.advancedRenderingComposer?.setSize(width, height);
    this.resizeWaterReflectionTargets();
  }

  private pickTransformHandle(
    event: PointerEvent
  ): { axisConstraint: TransformAxis | null } | null {
    if (!this.transformGizmoGroup.visible) {
      return null;
    }

    if (!this.setPointerFromClientPosition(event.clientX, event.clientY)) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    const hits = this.raycaster.intersectObjects(
      this.transformGizmoGroup.children,
      true
    );

    for (const hit of hits) {
      const axisConstraint = hit.object.userData.transformAxisConstraint;

      if (
        axisConstraint === null ||
        axisConstraint === "x" ||
        axisConstraint === "y" ||
        axisConstraint === "z"
      ) {
        return {
          axisConstraint
        };
      }
    }

    return null;
  }

  private getBrushPickableObjects(): Object3D[] {
    switch (this.whiteboxSelectionMode) {
      case "object":
      case "face":
        return Array.from(
          this.brushRenderObjects.values(),
          (renderObjects) => renderObjects.mesh
        );
      case "edge":
        return Array.from(this.brushRenderObjects.values(), (renderObjects) =>
          renderObjects.edgeHelpers.map((helper) => helper.line)
        ).flat();
      case "vertex":
        return Array.from(this.brushRenderObjects.values(), (renderObjects) =>
          renderObjects.vertexHelpers.map((helper) => helper.mesh)
        ).flat();
    }
  }

  private createSelectionKey(selection: EditorSelection): string | null {
    switch (selection.kind) {
      case "none":
        return null;
      case "brushes":
        return selection.ids.length === 1 ? `brush:${selection.ids[0]}` : null;
      case "brushFace":
        return `brushFace:${selection.brushId}:${selection.faceId}`;
      case "brushEdge":
        return `brushEdge:${selection.brushId}:${selection.edgeId}`;
      case "brushVertex":
        return `brushVertex:${selection.brushId}:${selection.vertexId}`;
      case "terrains":
        return selection.ids.length === 1 ? `terrain:${selection.ids[0]}` : null;
      case "paths":
        return selection.ids.length === 1 ? `path:${selection.ids[0]}` : null;
      case "pathPoint":
        return `pathPoint:${selection.pathId}:${selection.pointId}`;
      case "entities":
        return selection.ids.length === 1 ? `entity:${selection.ids[0]}` : null;
      case "modelInstances":
        return selection.ids.length === 1 ? `model:${selection.ids[0]}` : null;
    }
  }

  private createSelectionFromHit(hit: {
    object: Object3D;
    face?: { materialIndex?: number } | null;
  }): EditorSelection | null {
    if (hit.object.userData.nonPickable === true) {
      return null;
    }

    const entityId = hit.object.userData.entityId;
    if (typeof entityId === "string") {
      return {
        kind: "entities",
        ids: [entityId]
      };
    }

    const pathId = hit.object.userData.pathId;
    const pathPointId = hit.object.userData.pathPointId;

    const terrainId = hit.object.userData.terrainId;
    if (typeof terrainId === "string") {
      return {
        kind: "terrains",
        ids: [terrainId]
      };
    }

    if (typeof pathId === "string" && typeof pathPointId === "string") {
      return {
        kind: "pathPoint",
        pathId,
        pointId: pathPointId
      };
    }

    if (typeof pathId === "string") {
      return {
        kind: "paths",
        ids: [pathId]
      };
    }

    const modelInstanceId = this.findModelInstanceId(hit.object);
    if (modelInstanceId !== null) {
      return {
        kind: "modelInstances",
        ids: [modelInstanceId]
      };
    }

    const brushId = hit.object.userData.brushId;

    if (typeof brushId !== "string") {
      return null;
    }

    const brushEdgeId = hit.object.userData.brushEdgeId;
    if (typeof brushEdgeId === "string") {
      return {
        kind: "brushEdge",
        brushId,
        edgeId: brushEdgeId as WhiteboxEdgeId
      };
    }

    const brushVertexId = hit.object.userData.brushVertexId;
    if (typeof brushVertexId === "string") {
      return {
        kind: "brushVertex",
        brushId,
        vertexId: brushVertexId as WhiteboxVertexId
      };
    }

    if (this.whiteboxSelectionMode === "face") {
      const faceMaterialIndex = hit.face?.materialIndex;
      const renderObjects = this.brushRenderObjects.get(brushId);
      const faceId =
        typeof faceMaterialIndex === "number" && renderObjects !== undefined
          ? (renderObjects.faceIdsInOrder[faceMaterialIndex] ?? null)
          : null;

      if (faceId === null) {
        return null;
      }

      return {
        kind: "brushFace",
        brushId,
        faceId
      };
    }

    if (this.whiteboxSelectionMode === "object") {
      return {
        kind: "brushes",
        ids: [brushId]
      };
    }

    return null;
  }

  private getSelectionCandidates(
    event: PointerEvent
  ): Array<{ key: string; selection: EditorSelection }> {
    if (!this.setPointerFromClientPosition(event.clientX, event.clientY)) {
      return [];
    }

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());
    this.raycaster.params.Line.threshold =
      this.whiteboxSelectionMode === "edge" ? WHITEBOX_EDGE_PICK_THRESHOLD : 1;

    const hits = this.raycaster.intersectObjects(
      [
        ...Array.from(
          this.entityRenderObjects.values(),
          (renderObjects) => renderObjects.group
        ),
        ...Array.from(this.pathRenderObjects.values(), (renderObjects) => [
          renderObjects.line,
          ...renderObjects.pointMeshes.map((pointMesh) => pointMesh.mesh)
        ]).flat(),
        ...Array.from(this.terrainRenderObjects.values(), (renderObjects) =>
          renderObjects.mesh
        ),
        ...Array.from(this.modelRenderObjects.values()),
        ...this.getBrushPickableObjects()
      ],
      true
    );
    const candidates: Array<{ key: string; selection: EditorSelection }> = [];
    const seenKeys = new Set<string>();

    for (const hit of hits) {
      const selection = this.createSelectionFromHit(hit);

      if (selection === null) {
        continue;
      }

      const key = this.createSelectionKey(selection);

      if (key === null || seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      candidates.push({
        key,
        selection
      });
    }

    return candidates;
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.lastCanvasPointerPosition = {
      x: event.clientX,
      y: event.clientY
    };

    if (event.button === 1) {
      event.preventDefault();
      this.activeCameraDragPointerId = event.pointerId;
      this.lastCameraDragClientPosition = {
        x: event.clientX,
        y: event.clientY
      };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button === 2) {
      event.preventDefault();

      if (this.currentTransformSession.kind === "active") {
        this.transformCancelHandler?.();
      }

      return;
    }

    if (event.button !== 0) {
      return;
    }

    const transformPointerIntent = resolveTransformPointerDownIntent(
      this.currentTransformSession,
      this.panelId
    );

    if (transformPointerIntent.commitActiveTransform) {
      if (this.currentTransformSession.kind !== "active") {
        throw new Error("Active transform intent resolved without an active session.");
      }

      event.preventDefault();
      this.transformCommitHandler?.(this.currentTransformSession);
      return;
    }

    if (!transformPointerIntent.allowGizmoInteraction) {
      return;
    }

    const transformHandle = this.pickTransformHandle(event);
    const interactionSession = this.getDisplayedTransformSession();

    if (transformHandle !== null && interactionSession !== null) {
      event.preventDefault();

      if (
        transformHandle.axisConstraint !== null &&
        !supportsTransformAxisConstraint(
          interactionSession,
          transformHandle.axisConstraint
        )
      ) {
        return;
      }

      const nextSession = this.buildTransformPreviewFromPointer(
        createTransformSession({
          source: "gizmo",
          sourcePanelId: this.panelId,
          operation: interactionSession.operation,
          surfaceSnapEnabled: interactionSession.surfaceSnapEnabled,
          axisConstraint: transformHandle.axisConstraint,
          axisConstraintSpace:
            transformHandle.axisConstraint === null
              ? "world"
              : interactionSession.axisConstraintSpace,
          target: interactionSession.target
        }),
        {
          x: event.clientX,
          y: event.clientY
        },
        {
          x: event.clientX,
          y: event.clientY
        },
        transformHandle.axisConstraint,
        transformHandle.axisConstraint === null
          ? "world"
          : interactionSession.axisConstraintSpace
      );

      this.currentTransformSession = nextSession;
      this.applyTransformPreview();
      this.syncTransformGizmo();
      this.transformSessionChangeHandler?.(nextSession);
      this.activeTransformDrag = {
        pointerId: event.pointerId,
        sessionId: nextSession.id,
        axisConstraint: transformHandle.axisConstraint,
        axisConstraintSpace: nextSession.axisConstraintSpace,
        initialClientPosition: {
          x: event.clientX,
          y: event.clientY
        }
      };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }

    if (this.toolMode === "create" && this.creationPreview !== null) {
      const previewCenter = this.getCreationPreviewCenter(
        event,
        this.creationPreview.target
      );
      const nextCreationPreview = {
        ...this.creationPreview,
        center: previewCenter
      };

      this.syncCreationPreview(nextCreationPreview);
      this.creationPreviewChangeHandler?.(nextCreationPreview);

      if (previewCenter !== null) {
        const committed =
          this.creationCommitHandler?.(nextCreationPreview) === true;

        if (committed) {
          this.syncCreationPreview(null);
          this.creationPreviewChangeHandler?.({ kind: "none" });
        }
      }

      return;
    }

    if (this.beginTerrainBrushStroke(event)) {
      return;
    }

    const candidates = this.getSelectionCandidates(event);

    if (candidates.length === 0) {
      this.lastClickPointer = null;
      this.lastClickSelectionKey = null;
      this.brushSelectionChangeHandler?.(
        applyEditorSelectionClick(this.currentSelection, null, event.shiftKey)
      );

      return;
    }

    // Determine whether this click is at the same spot as the last one.
    const POINTER_TOLERANCE = 0.01;
    const isSameSpot =
      this.lastClickPointer !== null &&
      Math.abs(this.pointer.x - this.lastClickPointer.x) < POINTER_TOLERANCE &&
      Math.abs(this.pointer.y - this.lastClickPointer.y) < POINTER_TOLERANCE;

    let candidateIndex = 0;

    if (isSameSpot && this.lastClickSelectionKey !== null) {
      // Find where the previously selected item sits in the new hit list and advance by one.
      const lastIndex = candidates.findIndex(
        (c) => c.key === this.lastClickSelectionKey
      );
      if (lastIndex !== -1) {
        candidateIndex = (lastIndex + 1) % candidates.length;
      }
    }

    this.lastClickPointer = { x: this.pointer.x, y: this.pointer.y };

    const chosen = candidates[candidateIndex];
    this.lastClickSelectionKey = chosen.key;
    this.brushSelectionChangeHandler?.(
      applyEditorSelectionClick(
        this.currentSelection,
        chosen.selection,
        event.shiftKey
      )
    );
  };

  private handlePointerMove = (event: PointerEvent) => {
    this.lastCanvasPointerPosition = {
      x: event.clientX,
      y: event.clientY
    };

    if (
      this.activeCameraDragPointerId === event.pointerId &&
      this.lastCameraDragClientPosition !== null
    ) {
      const deltaX = event.clientX - this.lastCameraDragClientPosition.x;
      const deltaY = event.clientY - this.lastCameraDragClientPosition.y;

      this.lastCameraDragClientPosition = {
        x: event.clientX,
        y: event.clientY
      };

      if (this.viewMode === "perspective" && !event.shiftKey) {
        this.orbitCamera(deltaX, deltaY);
      } else {
        this.panCamera(deltaX, deltaY);
      }

      return;
    }

    if (
      this.activeTransformDrag !== null &&
      this.activeTransformDrag.pointerId === event.pointerId &&
      this.currentTransformSession.kind === "active" &&
      this.currentTransformSession.id === this.activeTransformDrag.sessionId
    ) {
      const nextSession = this.buildTransformPreviewFromPointer(
        this.currentTransformSession,
        this.activeTransformDrag.initialClientPosition,
        {
          x: event.clientX,
          y: event.clientY
        },
        this.activeTransformDrag.axisConstraint,
        this.activeTransformDrag.axisConstraintSpace
      );

      this.currentTransformSession = nextSession;
      this.applyTransformPreview();
      this.syncTransformGizmo();
      this.transformSessionChangeHandler?.(nextSession);
      return;
    }

    if (this.continueTerrainBrushStroke(event)) {
      return;
    }

    if (this.isTerrainBrushActive()) {
      this.setHoveredSelection({
        kind: "none"
      });
      this.setTerrainBrushHover(
        this.getTerrainBrushHitAtClientPosition(event.clientX, event.clientY)
      );
      return;
    }

    if (this.toolMode === "select") {
      const hoveredCandidate = this.getSelectionCandidates(event)[0]
        ?.selection ?? { kind: "none" };
      this.setHoveredSelection(hoveredCandidate);
      return;
    }

    this.setHoveredSelection({
      kind: "none"
    });

    if (this.toolMode !== "create" || this.creationPreview === null) {
      return;
    }

    const previewCenter = this.getCreationPreviewCenter(
      event,
      this.creationPreview.target
    );
    const nextCreationPreview = {
      ...this.creationPreview,
      center: previewCenter
    };

    this.syncCreationPreview(nextCreationPreview);
    this.creationPreviewChangeHandler?.(nextCreationPreview);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (
      this.activeTransformDrag !== null &&
      this.activeTransformDrag.pointerId === event.pointerId
    ) {
      if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      }

      const completedSession =
        this.currentTransformSession.kind === "active"
          ? this.currentTransformSession
          : null;
      this.activeTransformDrag = null;

      if (completedSession !== null) {
        if (event.type === "pointercancel") {
          this.transformCancelHandler?.();
        } else {
          this.transformCommitHandler?.(completedSession);
        }
      }

      return;
    }

    if (this.finishTerrainBrushStroke(event)) {
      return;
    }

    if (this.activeCameraDragPointerId !== event.pointerId) {
      return;
    }

    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }

    this.activeCameraDragPointerId = null;
    this.lastCameraDragClientPosition = null;
    this.emitCameraStateChange();
  };

  private handlePointerLeave = () => {
    if (this.activeCameraDragPointerId !== null) {
      return;
    }

    this.setHoveredSelection({
      kind: "none"
    });
    this.setTerrainBrushHover(null);

    // Keep the shared creation preview alive across panel boundaries; the next
    // viewport panel will update it as the pointer continues moving.
  };

  private handleWindowPointerMove = (event: PointerEvent) => {
    if (
      this.currentTransformSession.kind !== "active" ||
      this.currentTransformSession.sourcePanelId !== this.panelId ||
      this.currentTransformSession.source === "gizmo" ||
      this.keyboardTransformPointerOrigin === null ||
      this.keyboardTransformPointerOrigin.sessionId !==
        this.currentTransformSession.id
    ) {
      return;
    }

    const nextSession = this.buildTransformPreviewFromPointer(
      this.currentTransformSession,
      {
        x: this.keyboardTransformPointerOrigin.clientX,
        y: this.keyboardTransformPointerOrigin.clientY
      },
      {
        x: event.clientX,
        y: event.clientY
      },
      this.currentTransformSession.axisConstraint,
      this.currentTransformSession.axisConstraintSpace
    );

    this.currentTransformSession = nextSession;
    this.applyTransformPreview();
    this.syncTransformGizmo();
    this.transformSessionChangeHandler?.(nextSession);
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    if (this.viewMode === "perspective") {
      this.cameraSpherical.radius = Math.min(
        MAX_CAMERA_DISTANCE,
        Math.max(
          MIN_CAMERA_DISTANCE,
          this.cameraSpherical.radius * Math.exp(event.deltaY * ZOOM_SPEED)
        )
      );
      this.applyPerspectiveCameraPose();
      this.emitCameraStateChange();
      return;
    }

    this.orthographicCamera.zoom = Math.min(
      MAX_ORTHOGRAPHIC_ZOOM,
      Math.max(
        MIN_ORTHOGRAPHIC_ZOOM,
        this.orthographicCamera.zoom * Math.exp(-event.deltaY * ZOOM_SPEED)
      )
    );
    this.orthographicCamera.updateProjectionMatrix();
    this.emitCameraStateChange();
  };

  private handleAuxClick = (event: MouseEvent) => {
    if (event.button === 1 || event.button === 2) {
      event.preventDefault();
    }
  };

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private findModelInstanceId(object: Object3D): string | null {
    let current: Object3D | null = object;

    while (current !== null) {
      const modelInstanceId = current.userData.modelInstanceId;

      if (typeof modelInstanceId === "string") {
        return modelInstanceId;
      }

      current = current.parent;
    }

    return null;
  }

  private orbitCamera(deltaX: number, deltaY: number) {
    this.cameraSpherical.theta -= deltaX * ORBIT_ROTATION_SPEED;
    this.cameraSpherical.phi -= deltaY * ORBIT_ROTATION_SPEED;
    this.applyPerspectiveCameraPose();
  }

  private panCamera(deltaX: number, deltaY: number) {
    if (this.container === null) {
      return;
    }

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    if (this.viewMode === "perspective") {
      const visibleHeight =
        2 *
        Math.tan((this.perspectiveCamera.fov * Math.PI) / 360) *
        this.cameraSpherical.radius;
      const visibleWidth =
        visibleHeight * Math.max(this.perspectiveCamera.aspect, 0.0001);

      this.perspectiveCamera.getWorldDirection(this.cameraForward);
      this.cameraRight
        .crossVectors(this.cameraForward, this.perspectiveCamera.up)
        .normalize();
      this.cameraUp
        .crossVectors(this.cameraRight, this.cameraForward)
        .normalize();

      this.cameraTarget
        .addScaledVector(this.cameraRight, (-deltaX / width) * visibleWidth)
        .addScaledVector(this.cameraUp, (deltaY / height) * visibleHeight);

      this.applyPerspectiveCameraPose();
      return;
    }

    const visibleHeight =
      ORTHOGRAPHIC_FRUSTUM_HEIGHT / this.orthographicCamera.zoom;
    const visibleWidth =
      (this.orthographicCamera.right - this.orthographicCamera.left) /
      this.orthographicCamera.zoom;

    this.orthographicCamera.getWorldDirection(this.cameraForward);
    this.cameraRight
      .crossVectors(this.cameraForward, this.orthographicCamera.up)
      .normalize();
    this.cameraUp
      .crossVectors(this.cameraRight, this.cameraForward)
      .normalize();

    this.cameraTarget
      .addScaledVector(this.cameraRight, (-deltaX / width) * visibleWidth)
      .addScaledVector(this.cameraUp, (deltaY / height) * visibleHeight);

    this.applyOrthographicCameraPose();
  }

  private getCreationPreviewCenter(
    event: PointerEvent,
    target: CreationTarget
  ): Vec3 | null {
    switch (target.kind) {
      case "box-brush":
      case "wedge-brush":
      case "cylinder-brush":
      case "cone-brush":
        return this.getBoxCreationPreviewCenter(event, DEFAULT_BOX_BRUSH_SIZE);
      case "torus-brush":
        return this.getBoxCreationPreviewCenter(event, DEFAULT_TORUS_BRUSH_SIZE);
      case "entity":
        switch (target.entityKind) {
          case "triggerVolume":
            return this.getBoxCreationPreviewCenter(
              event,
              DEFAULT_TRIGGER_VOLUME_SIZE
            );
          case "pointLight":
          case "playerStart":
          case "sceneEntry":
          case "npc":
          case "soundEmitter":
          case "teleportTarget":
          case "interactable":
          case "spotLight":
            return this.getPlanarCreationAnchor(event);
        }
      case "model-instance": {
        const anchor = this.getPlanarCreationAnchor(event);

        if (anchor === null) {
          return null;
        }

        const asset = this.projectAssets[target.assetId];

        if (asset === undefined || asset.kind !== "model") {
          return null;
        }

        return createModelInstancePlacementPosition(asset, anchor);
      }
    }
  }

  private getPlanarCreationAnchor(event: PointerEvent): Vec3 | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    if (
      this.raycaster.ray.intersectPlane(
        this.getBoxCreatePlane(),
        this.boxCreateIntersection
      ) === null
    ) {
      return null;
    }

    switch (this.viewMode) {
      case "perspective":
      case "top":
        return {
          x: this.snapWhiteboxPositionValue(this.boxCreateIntersection.x),
          y: this.snapWhiteboxPositionValue(0),
          z: this.snapWhiteboxPositionValue(this.boxCreateIntersection.z)
        };
      case "front":
        return {
          x: this.snapWhiteboxPositionValue(this.boxCreateIntersection.x),
          y: this.snapWhiteboxPositionValue(this.boxCreateIntersection.y),
          z: this.snapWhiteboxPositionValue(0)
        };
      case "side":
        return {
          x: this.snapWhiteboxPositionValue(0),
          y: this.snapWhiteboxPositionValue(this.boxCreateIntersection.y),
          z: this.snapWhiteboxPositionValue(this.boxCreateIntersection.z)
        };
    }
  }

  private getBoxCreationPreviewCenter(
    event: PointerEvent,
    size: Vec3
  ): Vec3 | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    if (
      this.raycaster.ray.intersectPlane(
        this.getBoxCreatePlane(),
        this.boxCreateIntersection
      ) === null
    ) {
      return null;
    }

    switch (this.viewMode) {
      case "perspective":
      case "top":
        return {
          x: this.snapWhiteboxPositionValue(this.boxCreateIntersection.x),
          y: this.snapWhiteboxPositionValue(size.y * 0.5),
          z: this.snapWhiteboxPositionValue(this.boxCreateIntersection.z)
        };
      case "front":
        return {
          x: this.snapWhiteboxPositionValue(this.boxCreateIntersection.x),
          y: this.snapWhiteboxPositionValue(this.boxCreateIntersection.y),
          z: this.snapWhiteboxPositionValue(size.z * 0.5)
        };
      case "side":
        return {
          x: this.snapWhiteboxPositionValue(size.x * 0.5),
          y: this.snapWhiteboxPositionValue(this.boxCreateIntersection.y),
          z: this.snapWhiteboxPositionValue(this.boxCreateIntersection.z)
        };
    }
  }

  private getCreationPreviewTargetKey(target: CreationTarget): string {
    switch (target.kind) {
      case "box-brush":
        return "box-brush";
      case "wedge-brush":
        return "wedge-brush";
      case "cylinder-brush":
        return `cylinder-brush:${target.sideCount}`;
      case "cone-brush":
        return `cone-brush:${target.sideCount}`;
      case "torus-brush":
        return `torus-brush:${target.majorSegmentCount}:${target.tubeSegmentCount}`;
      case "entity":
        return `entity:${target.entityKind}:${target.audioAssetId}:${target.modelAssetId}`;
      case "model-instance":
        return `model-instance:${target.assetId}`;
    }
  }

  private clearCreationPreviewObject() {
    if (this.creationPreviewObject === null) {
      this.creationPreviewTargetKey = null;
      return;
    }

    this.scene.remove(this.creationPreviewObject);
    disposeModelInstance(this.creationPreviewObject);
    this.creationPreviewObject = null;
    this.creationPreviewTargetKey = null;
  }

  private createBrushCreationPreviewObject(brush: Brush): Group {
    const geometry = buildBoxBrushDerivedMeshData(brush).geometry;
    const group = new Group();
    const mesh = new Mesh(
      geometry,
      new MeshStandardMaterial({
        color: BOX_CREATE_PREVIEW_FILL,
        emissive: BOX_CREATE_PREVIEW_FILL,
        emissiveIntensity: 0.12,
        roughness: 0.68,
        metalness: 0.02,
        transparent: true,
        opacity: 0.22
      })
    );
    const edges = new LineSegments(
      new EdgesGeometry(geometry),
      new LineBasicMaterial({
        color: BOX_CREATE_PREVIEW_EDGE
      })
    );
    group.add(mesh);
    group.add(edges);
    return group;
  }

  private createCreationPreviewObject(
    toolPreview: CreationViewportToolPreview
  ): Group {
    const previewPosition = toolPreview.center ?? {
      x: 0,
      y: 0,
      z: 0
    };

    switch (toolPreview.target.kind) {
      case "box-brush": {
        const fallbackGroup = new Group();
        fallbackGroup.visible = false;
        return fallbackGroup;
      }
      case "wedge-brush":
        return this.createBrushCreationPreviewObject(
          createWedgeBrush({
            center: previewPosition,
            size: DEFAULT_BOX_BRUSH_SIZE
          })
        );
      case "cylinder-brush":
        return this.createBrushCreationPreviewObject(
          createRadialPrismBrush({
            center: previewPosition,
            size: DEFAULT_BOX_BRUSH_SIZE,
            sideCount: toolPreview.target.sideCount
          })
        );
      case "cone-brush":
        return this.createBrushCreationPreviewObject(
          createConeBrush({
            center: previewPosition,
            size: DEFAULT_BOX_BRUSH_SIZE,
            sideCount: toolPreview.target.sideCount
          })
        );
      case "torus-brush":
        return this.createBrushCreationPreviewObject(
          createTorusBrush({
            center: previewPosition,
            size: DEFAULT_TORUS_BRUSH_SIZE,
            majorSegmentCount: toolPreview.target.majorSegmentCount,
            tubeSegmentCount: toolPreview.target.tubeSegmentCount
          })
        );
      case "entity": {
        let previewGroup: Group;

        switch (toolPreview.target.entityKind) {
          case "pointLight":
            previewGroup = this.createPointLightGizmoRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_POINT_LIGHT_DISTANCE,
              PLACEMENT_PREVIEW_COLOR_HEX,
              false
            ).group;
            break;
          case "spotLight":
            previewGroup = this.createSpotLightGizmoRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_SPOT_LIGHT_DIRECTION,
              DEFAULT_SPOT_LIGHT_DISTANCE,
              DEFAULT_SPOT_LIGHT_ANGLE_DEGREES,
              PLACEMENT_PREVIEW_COLOR_HEX,
              false
            ).group;
            break;
          case "playerStart":
            previewGroup = this.createPlayerStartRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_PLAYER_START_YAW_DEGREES,
              {
                mode: "capsule",
                eyeHeight: DEFAULT_PLAYER_START_EYE_HEIGHT,
                capsuleRadius: DEFAULT_PLAYER_START_CAPSULE_RADIUS,
                capsuleHeight: DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
                boxSize: DEFAULT_PLAYER_START_BOX_SIZE
              },
              false
            ).group;
            break;
          case "sceneEntry":
            previewGroup = this.createTeleportTargetRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_SCENE_ENTRY_YAW_DEGREES,
              false,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
          case "npc":
            previewGroup = this.createNpcRenderObjects(
              {
                id: "creation-preview",
                kind: "npc",
                name: undefined,
                visible: true,
                enabled: true,
                position: previewPosition,
                yawDegrees: DEFAULT_NPC_YAW_DEGREES,
                actorId: "creation-preview",
                presence: createNpcAlwaysPresence(),
                modelAssetId: toolPreview.target.modelAssetId ?? null,
                dialogues: [],
                defaultDialogueId: null,
                collider: createNpcColliderSettings()
              },
              false,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
          case "soundEmitter":
            previewGroup = this.createSoundEmitterRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_SOUND_EMITTER_REF_DISTANCE,
              DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
              false,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
          case "triggerVolume":
            previewGroup = this.createTriggerVolumeRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_TRIGGER_VOLUME_SIZE,
              false,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
          case "teleportTarget":
            previewGroup = this.createTeleportTargetRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_TELEPORT_TARGET_YAW_DEGREES,
              false,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
          case "interactable":
            previewGroup = this.createInteractableRenderObjects(
              "creation-preview",
              previewPosition,
              DEFAULT_INTERACTABLE_RADIUS,
              false,
              true,
              BOX_CREATE_PREVIEW_FILL
            ).group;
            break;
        }
        if (this.displayMode === "wireframe") {
          this.applyWireframePresentation(previewGroup);
        }

        return previewGroup;
      }
      case "model-instance": {
        const asset = this.projectAssets[toolPreview.target.assetId];
        const loadedAsset = this.loadedModelAssets[toolPreview.target.assetId];

        if (asset === undefined || asset.kind !== "model") {
          const fallbackGroup = new Group();
          fallbackGroup.visible = false;
          return fallbackGroup;
        }

        const dummyModelInstance = createModelInstance({
          assetId: toolPreview.target.assetId,
          position: previewPosition,
          rotationDegrees: DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
          scale: DEFAULT_MODEL_INSTANCE_SCALE
        });

        return createModelInstanceRenderGroup(
          dummyModelInstance,
          asset,
          loadedAsset,
          false,
          BOX_CREATE_PREVIEW_FILL,
          this.displayMode === "wireframe" ? "wireframe" : "normal"
        );
      }
    }

    throw new Error("Unsupported creation preview target.");
  }

  private syncCreationPreview(toolPreview: CreationViewportToolPreview | null) {
    const currentToolPreview =
      this.creationPreview === null
        ? { kind: "none" as const }
        : this.creationPreview;
    const nextToolPreview =
      toolPreview === null ? { kind: "none" as const } : toolPreview;

    if (areViewportToolPreviewsEqual(currentToolPreview, nextToolPreview)) {
      return;
    }

    this.creationPreview =
      toolPreview === null
        ? null
        : {
            kind: "create",
            sourcePanelId: toolPreview.sourcePanelId,
            target:
              toolPreview.target.kind === "entity"
                ? {
                    kind: "entity",
                    entityKind: toolPreview.target.entityKind,
                    audioAssetId: toolPreview.target.audioAssetId,
                    modelAssetId: toolPreview.target.modelAssetId
                  }
                : toolPreview.target.kind === "model-instance"
                  ? {
                      kind: "model-instance",
                      assetId: toolPreview.target.assetId
                    }
                  : toolPreview.target.kind === "wedge-brush"
                    ? {
                        kind: "wedge-brush"
                      }
                    : toolPreview.target.kind === "cylinder-brush"
                      ? {
                          kind: "cylinder-brush",
                          sideCount: toolPreview.target.sideCount
                        }
                      : toolPreview.target.kind === "cone-brush"
                        ? {
                            kind: "cone-brush",
                            sideCount: toolPreview.target.sideCount
                          }
                        : toolPreview.target.kind === "torus-brush"
                          ? {
                              kind: "torus-brush",
                              majorSegmentCount: toolPreview.target.majorSegmentCount,
                              tubeSegmentCount: toolPreview.target.tubeSegmentCount
                            }
                  : {
                      kind: "box-brush"
                    },
            center:
              toolPreview.center === null ? null : { ...toolPreview.center }
          };

    if (toolPreview === null) {
      this.boxCreatePreviewMesh.visible = false;
      this.boxCreatePreviewEdges.visible = false;
      this.clearCreationPreviewObject();
      return;
    }

    if (toolPreview.target.kind === "box-brush") {
      this.boxCreatePreviewMesh.visible = toolPreview.center !== null;
      this.boxCreatePreviewEdges.visible = toolPreview.center !== null;

      if (toolPreview.center !== null) {
        this.boxCreatePreviewMesh.position.set(
          toolPreview.center.x,
          toolPreview.center.y,
          toolPreview.center.z
        );
        this.boxCreatePreviewEdges.position.set(
          toolPreview.center.x,
          toolPreview.center.y,
          toolPreview.center.z
        );
      }

      this.clearCreationPreviewObject();
      this.creationPreviewTargetKey = null;
      return;
    }

    const nextTargetKey = this.getCreationPreviewTargetKey(toolPreview.target);

    this.boxCreatePreviewMesh.visible = false;
    this.boxCreatePreviewEdges.visible = false;

    if (
      this.creationPreviewObject !== null &&
      this.creationPreviewTargetKey === nextTargetKey
    ) {
      this.creationPreviewObject.visible = toolPreview.center !== null;

      if (toolPreview.center !== null) {
        this.creationPreviewObject.position.set(
          toolPreview.center.x,
          toolPreview.center.y,
          toolPreview.center.z
        );
      }

      this.creationPreviewTargetKey = nextTargetKey;
      return;
    }

    this.clearCreationPreviewObject();

    const creationPreviewObject = this.createCreationPreviewObject(toolPreview);
    creationPreviewObject.visible = toolPreview.center !== null;
    this.scene.add(creationPreviewObject);
    this.creationPreviewObject = creationPreviewObject;
    this.creationPreviewTargetKey = nextTargetKey;
  }

  private render = () => {
    if (!this.renderEnabled) {
      this.animationFrame = 0;
      return;
    }

    this.animationFrame = window.requestAnimationFrame(this.render);
    this.updateGridPositioning();
    this.updateTransformGizmoPose();
    const now = performance.now();
    const dt =
      this.previousFrameTime === 0
        ? 0
        : Math.min((now - this.previousFrameTime) / 1000, 1 / 20);
    this.previousFrameTime = now;
    this.volumeTime += dt;

    for (const uniform of this.volumeAnimatedUniforms) {
      uniform.value = this.volumeTime;
    }

    if (this.viewportWaterSurfaceBindings.length > 0) {
      this.updateViewportWaterReflections();
    }

    if (this.advancedRenderingComposer !== null) {
      this.worldBackgroundRenderer.syncToCamera(this.perspectiveCamera);
      this.advancedRenderingComposer.render();
      return;
    }

    const activeCamera = this.getActiveCamera();
    const previousAutoClear = this.renderer.autoClear;

    if (this.displayMode === "normal") {
      this.worldBackgroundRenderer.syncToCamera(activeCamera);
      this.renderer.autoClear = true;
      this.renderer.clear();
      this.renderer.render(this.worldBackgroundRenderer.scene, activeCamera);
      this.renderer.autoClear = false;
      this.renderer.render(this.scene, activeCamera);
      this.renderer.autoClear = previousAutoClear;
      return;
    }

    this.renderer.autoClear = true;
    this.renderer.render(this.scene, activeCamera);
    this.renderer.autoClear = previousAutoClear;
  };
}
