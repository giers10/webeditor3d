import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  SphereGeometry,
  Spherical,
  TorusGeometry,
  SpotLight,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { EffectComposer } from "postprocessing";

import { isBrushFaceSelected, isBrushSelected, isModelInstanceSelected, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import { createModelInstanceRenderGroup, disposeModelInstance } from "../assets/model-instance-rendering";
import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { LoadedImageAsset } from "../assets/image-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import { getModelInstances } from "../assets/model-instances";
import type { SceneDocument } from "../document/scene-document";
import {
  areAdvancedRenderingSettingsEqual,
  cloneAdvancedRenderingSettings,
  type AdvancedRenderingSettings
} from "../document/world-settings";
import type { WorldSettings } from "../document/world-settings";
import {
  getEntityInstances,
  type EntityInstance,
  type PointLightEntity,
  type SpotLightEntity
} from "../entities/entity-instances";
import { BOX_FACE_IDS, DEFAULT_BOX_BRUSH_SIZE, type BoxBrush, type BoxFaceId } from "../document/brushes";
import { applyBoxBrushFaceUvsToGeometry } from "../geometry/box-face-uvs";
import { DEFAULT_GRID_SIZE, snapValueToGrid } from "../geometry/grid-snapping";
import { createStarterMaterialSignature, createStarterMaterialTexture } from "../materials/starter-material-textures";
import type { MaterialDef } from "../materials/starter-material-library";
import {
  applyAdvancedRenderingLightShadowFlags,
  applyAdvancedRenderingRenderableShadowFlags,
  configureAdvancedRenderingRenderer,
  createAdvancedRenderingComposer
} from "../rendering/advanced-rendering";
import { resolveViewportFocusTarget } from "./viewport-focus";
import { createSoundEmitterMarkerMeshes } from "./viewport-entity-markers";
import {
  getViewportViewModeDefinition,
  isOrthographicViewportViewMode,
  type ViewportGridPlane,
  type ViewportViewMode
} from "./viewport-view-modes";

interface BrushRenderObjects {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial[]>;
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
}

const BRUSH_SELECTED_EDGE_COLOR = 0xf7d2aa;
const BRUSH_EDGE_COLOR = 0x0d1017;
const FALLBACK_FACE_COLOR = 0x747d89;
const SELECTED_FACE_FALLBACK_COLOR = 0xcf7b42;
const SELECTED_FACE_EMISSIVE = 0x4a2814;
const PLAYER_START_COLOR = 0x7cb7ff;
const PLAYER_START_SELECTED_COLOR = 0xf3be8f;
const SOUND_EMITTER_COLOR = 0x72d7c9;
const SOUND_EMITTER_SELECTED_COLOR = 0xf4d37d;
const TRIGGER_VOLUME_COLOR = 0x9f8cff;
const TRIGGER_VOLUME_SELECTED_COLOR = 0xf0b07f;
const TELEPORT_TARGET_COLOR = 0x7ee0ff;
const TELEPORT_TARGET_SELECTED_COLOR = 0xf6c48a;
const INTERACTABLE_COLOR = 0x92de7e;
const INTERACTABLE_SELECTED_COLOR = 0xf1cf7e;
const BOX_CREATE_PREVIEW_FILL = 0x89b6ff;
const BOX_CREATE_PREVIEW_EDGE = 0xf3be8f;
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

interface CachedMaterialTexture {
  signature: string;
  texture: CanvasTexture;
}

interface EntityRenderObjects {
  group: Group;
  meshes: Mesh[];
}

interface LocalLightRenderObjects {
  group: Group;
}

export class ViewportHost {
  private readonly scene = new Scene();
  private readonly perspectiveCamera = new PerspectiveCamera(60, 1, 0.1, 1000);
  private readonly orthographicCamera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private readonly cameraTarget = new Vector3(0, 0, 0);
  private readonly cameraOffset = new Vector3();
  private readonly cameraForward = new Vector3();
  private readonly cameraRight = new Vector3();
  private readonly cameraUp = new Vector3();
  private readonly cameraSpherical = new Spherical();
  private readonly gridHelpers: Record<ViewportGridPlane, GridHelper> = {
    xz: new GridHelper(40, 40, 0xcf8354, 0x4e596b),
    xy: new GridHelper(40, 40, 0xcf8354, 0x4e596b),
    yz: new GridHelper(40, 40, 0xcf8354, 0x4e596b)
  };
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly localLightGroup = new Group();
  private readonly brushGroup = new Group();
  private readonly entityGroup = new Group();
  private readonly modelGroup = new Group();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly boxCreateIntersection = new Vector3();
  private readonly boxCreatePlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly brushRenderObjects = new Map<string, BrushRenderObjects>();
  private readonly entityRenderObjects = new Map<string, EntityRenderObjects>();
  private readonly localLightRenderObjects = new Map<string, LocalLightRenderObjects>();
  private readonly modelRenderObjects = new Map<string, Group>();
  private readonly materialTextureCache = new Map<string, CachedMaterialTexture>();
  private currentDocument: SceneDocument | null = null;
  private currentWorld: WorldSettings | null = null;
  private currentAdvancedRenderingSettings: AdvancedRenderingSettings | null = null;
  private advancedRenderingComposer: EffectComposer | null = null;
  private currentSelection: EditorSelection = {
    kind: "none"
  };
  private projectAssets: Record<string, ProjectAssetRecord> = {};
  private loadedModelAssets: Record<string, LoadedModelAsset> = {};
  private loadedImageAssets: Record<string, LoadedImageAsset> = {};
  private readonly boxCreatePreviewMesh = new Mesh(
    new BoxGeometry(DEFAULT_BOX_BRUSH_SIZE.x, DEFAULT_BOX_BRUSH_SIZE.y, DEFAULT_BOX_BRUSH_SIZE.z),
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
  private container: HTMLElement | null = null;
  private brushSelectionChangeHandler: ((selection: EditorSelection) => void) | null = null;
  private createBoxBrushHandler: ((center: Vec3) => void) | null = null;
  private boxCreatePreviewHandler: ((center: Vec3 | null) => void) | null = null;
  private toolMode: ToolMode = "select";
  private viewMode: ViewportViewMode = "perspective";
  private lastBoxCreatePreviewCenter: Vec3 | null = null;
  private activeCameraDragPointerId: number | null = null;
  private lastCameraDragClientPosition: { x: number; y: number } | null = null;
  // Click-through cycling: track the last click position and the last picked object
  // so repeated clicks at the same spot cycle through overlapping objects.
  private lastClickPointer: { x: number; y: number } | null = null;
  private lastClickSelectionKey: string | null = null;

  constructor() {
    this.perspectiveCamera.position.set(10, 9, 10);
    this.perspectiveCamera.lookAt(this.cameraTarget);
    this.updatePerspectiveCameraSphericalFromPose();
    this.updateOrthographicCameraFrustum();

    const axesHelper = new AxesHelper(2);

    this.gridHelpers.xy.rotation.x = Math.PI * 0.5;
    this.gridHelpers.yz.rotation.z = Math.PI * 0.5;
    this.gridHelpers.xz.visible = true;
    this.gridHelpers.xy.visible = false;
    this.gridHelpers.yz.visible = false;

    this.scene.add(this.gridHelpers.xz);
    this.scene.add(this.gridHelpers.xy);
    this.scene.add(this.gridHelpers.yz);
    this.scene.add(axesHelper);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.localLightGroup);
    this.scene.add(this.brushGroup);
    this.scene.add(this.entityGroup);
    this.scene.add(this.modelGroup);
    this.boxCreatePreviewMesh.visible = false;
    this.boxCreatePreviewEdges.visible = false;
    this.scene.add(this.boxCreatePreviewMesh);
    this.scene.add(this.boxCreatePreviewEdges);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearAlpha(0);
    this.applyViewModePose();
  }

  mount(container: HTMLElement) {
    this.container = container;
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.handlePointerUp);
    this.renderer.domElement.addEventListener("pointercancel", this.handlePointerUp);
    this.renderer.domElement.addEventListener("pointerleave", this.handlePointerLeave);
    this.renderer.domElement.addEventListener("wheel", this.handleWheel, { passive: false });
    this.renderer.domElement.addEventListener("auxclick", this.handleAuxClick);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);

    this.render();
  }

  updateWorld(world: WorldSettings) {
    this.currentWorld = world;
    this.applyWorld();
  }

  updateDocument(document: SceneDocument, selection: EditorSelection) {
    this.currentDocument = document;
    this.currentSelection = selection;
    this.rebuildLocalLights(document);
    this.rebuildBrushMeshes(document, selection);
    this.rebuildEntityMarkers(document, selection);
    this.rebuildModelInstances(document, selection);
  }

  updateAssets(
    projectAssets: Record<string, ProjectAssetRecord>,
    loadedModelAssets: Record<string, LoadedModelAsset>,
    loadedImageAssets: Record<string, LoadedImageAsset>
  ) {
    this.projectAssets = projectAssets;
    this.loadedModelAssets = loadedModelAssets;
    this.loadedImageAssets = loadedImageAssets;

    if (this.currentWorld !== null) {
      this.applyWorld();
    }

    if (this.currentDocument !== null) {
      this.rebuildModelInstances(this.currentDocument, this.currentSelection);
    }
  }

  setBrushSelectionChangeHandler(handler: ((selection: EditorSelection) => void) | null) {
    this.brushSelectionChangeHandler = handler;
  }

  setCreateBoxBrushHandler(handler: ((center: Vec3) => void) | null) {
    this.createBoxBrushHandler = handler;
  }

  setBoxCreatePreviewHandler(handler: ((center: Vec3 | null) => void) | null) {
    this.boxCreatePreviewHandler = handler;
    handler?.(this.lastBoxCreatePreviewCenter);
  }

  setToolMode(toolMode: ToolMode) {
    this.toolMode = toolMode;
    this.lastClickPointer = null;
    this.lastClickSelectionKey = null;

    if (toolMode !== "box-create") {
      this.setBoxCreatePreview(null);
    }
  }

  setViewMode(viewMode: ViewportViewMode) {
    if (this.viewMode === viewMode) {
      return;
    }

    this.viewMode = viewMode;
    this.lastClickPointer = null;
    this.lastClickSelectionKey = null;

    if (this.toolMode === "box-create") {
      this.setBoxCreatePreview(null);
    }

    this.applyViewModePose();

    if (this.currentAdvancedRenderingSettings !== null) {
      this.syncAdvancedRenderingComposer(this.currentAdvancedRenderingSettings);
    }
  }

  focusSelection(document: SceneDocument, selection: EditorSelection) {
    const focusTarget = resolveViewportFocusTarget(document, selection);

    if (focusTarget === null) {
      return;
    }

    this.cameraTarget.set(focusTarget.center.x, focusTarget.center.y, focusTarget.center.z);

    if (this.viewMode === "perspective") {
      const verticalHalfFov = (this.perspectiveCamera.fov * Math.PI) / 360;
      const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(this.perspectiveCamera.aspect, 0.0001));
      const fitAngle = Math.max(0.1, Math.min(verticalHalfFov, horizontalHalfFov));
      const fitDistance = Math.min(
        MAX_CAMERA_DISTANCE,
        Math.max(MIN_CAMERA_DISTANCE, (focusTarget.radius / Math.sin(fitAngle)) * FOCUS_MARGIN)
      );

      this.cameraSpherical.radius = fitDistance;
      this.cameraSpherical.makeSafe();
      this.applyPerspectiveCameraPose();
      return;
    }

    const containerWidth = Math.max(1, this.container?.clientWidth ?? 1);
    const containerHeight = Math.max(1, this.container?.clientHeight ?? 1);
    const aspect = containerWidth / containerHeight;
    const visibleWidth = ORTHOGRAPHIC_FRUSTUM_HEIGHT * aspect;
    const fitSize = Math.max(0.5, focusTarget.radius * 2 * FOCUS_MARGIN);
    const fitZoom = Math.min(visibleWidth, ORTHOGRAPHIC_FRUSTUM_HEIGHT) / fitSize;

    this.orthographicCamera.zoom = Math.min(MAX_ORTHOGRAPHIC_ZOOM, Math.max(MIN_ORTHOGRAPHIC_ZOOM, fitZoom));
    this.applyOrthographicCameraPose();
  }

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.handlePointerUp);
    this.renderer.domElement.removeEventListener("pointercancel", this.handlePointerUp);
    this.renderer.domElement.removeEventListener("pointerleave", this.handlePointerLeave);
    this.renderer.domElement.removeEventListener("wheel", this.handleWheel);
    this.renderer.domElement.removeEventListener("auxclick", this.handleAuxClick);
    this.clearLocalLights();
    this.clearBrushMeshes();
    this.clearEntityMarkers();
    this.boxCreatePreviewHandler = null;
    this.setBoxCreatePreview(null);
    this.advancedRenderingComposer?.dispose();
    this.advancedRenderingComposer = null;
    this.currentAdvancedRenderingSettings = null;
    this.renderer.autoClear = true;

    for (const cachedTexture of this.materialTextureCache.values()) {
      cachedTexture.texture.dispose();
    }

    this.materialTextureCache.clear();
    this.boxCreatePreviewMesh.geometry.dispose();
    this.boxCreatePreviewMesh.material.dispose();
    this.boxCreatePreviewEdges.geometry.dispose();
    this.boxCreatePreviewEdges.material.dispose();
    this.renderer.dispose();

    if (this.container !== null && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.container = null;
  }

  private getActiveCamera() {
    return this.viewMode === "perspective" ? this.perspectiveCamera : this.orthographicCamera;
  }

  private updatePerspectiveCameraSphericalFromPose() {
    this.cameraOffset.copy(this.perspectiveCamera.position).sub(this.cameraTarget);
    this.cameraSpherical.setFromVector3(this.cameraOffset);
    this.cameraSpherical.radius = Math.min(MAX_CAMERA_DISTANCE, Math.max(MIN_CAMERA_DISTANCE, this.cameraSpherical.radius));
    this.cameraSpherical.phi = Math.min(MAX_POLAR_ANGLE, Math.max(MIN_POLAR_ANGLE, this.cameraSpherical.phi));
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
    this.cameraSpherical.radius = Math.min(MAX_CAMERA_DISTANCE, Math.max(MIN_CAMERA_DISTANCE, this.cameraSpherical.radius));
    this.cameraSpherical.phi = Math.min(MAX_POLAR_ANGLE, Math.max(MIN_POLAR_ANGLE, this.cameraSpherical.phi));
    this.cameraSpherical.makeSafe();
    this.cameraOffset.setFromSpherical(this.cameraSpherical);
    this.perspectiveCamera.position.copy(this.cameraTarget).add(this.cameraOffset);
    this.perspectiveCamera.lookAt(this.cameraTarget);
  }

  private applyOrthographicCameraPose() {
    const definition = getViewportViewModeDefinition(this.viewMode);

    if (!isOrthographicViewportViewMode(this.viewMode) || definition.cameraDirection === null) {
      return;
    }

    this.orthographicCamera.up.set(definition.cameraUp.x, definition.cameraUp.y, definition.cameraUp.z);
    this.orthographicCamera.position.set(
      this.cameraTarget.x + definition.cameraDirection.x * ORTHOGRAPHIC_CAMERA_DISTANCE,
      this.cameraTarget.y + definition.cameraDirection.y * ORTHOGRAPHIC_CAMERA_DISTANCE,
      this.cameraTarget.z + definition.cameraDirection.z * ORTHOGRAPHIC_CAMERA_DISTANCE
    );
    this.orthographicCamera.lookAt(this.cameraTarget);
    this.orthographicCamera.zoom = Math.min(MAX_ORTHOGRAPHIC_ZOOM, Math.max(MIN_ORTHOGRAPHIC_ZOOM, this.orthographicCamera.zoom));
    this.orthographicCamera.updateProjectionMatrix();
  }

  private applyViewModePose() {
    const definition = getViewportViewModeDefinition(this.viewMode);

    this.gridHelpers.xz.visible = definition.gridPlane === "xz";
    this.gridHelpers.xy.visible = definition.gridPlane === "xy";
    this.gridHelpers.yz.visible = definition.gridPlane === "yz";

    if (definition.cameraType === "perspective") {
      this.applyPerspectiveCameraPose();
      return;
    }

    this.updateOrthographicCameraFrustum();
    this.applyOrthographicCameraPose();
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

    const world = this.currentWorld;
    this.ambientLight.color.set(world.ambientLight.colorHex);
    this.ambientLight.intensity = world.ambientLight.intensity;
    this.sunLight.color.set(world.sunLight.colorHex);
    this.sunLight.intensity = world.sunLight.intensity;
    this.sunLight.position.set(world.sunLight.direction.x, world.sunLight.direction.y, world.sunLight.direction.z).normalize().multiplyScalar(18);

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

    configureAdvancedRenderingRenderer(this.renderer, world.advancedRendering);
    this.syncAdvancedRenderingComposer(world.advancedRendering);
    this.applyShadowState();
  }

  private syncAdvancedRenderingComposer(settings: AdvancedRenderingSettings) {
    const shouldUseComposer = settings.enabled && this.viewMode === "perspective";
    const settingsChanged =
      this.currentAdvancedRenderingSettings === null ||
      !areAdvancedRenderingSettingsEqual(this.currentAdvancedRenderingSettings, settings);

    if (!shouldUseComposer) {
      if (this.advancedRenderingComposer !== null) {
        this.advancedRenderingComposer.dispose();
        this.advancedRenderingComposer = null;
      }

      this.currentAdvancedRenderingSettings = settings.enabled ? cloneAdvancedRenderingSettings(settings) : null;
      this.renderer.autoClear = true;
      return;
    }

    if (this.advancedRenderingComposer !== null && !settingsChanged) {
      return;
    }

    if (this.advancedRenderingComposer !== null) {
      this.advancedRenderingComposer.dispose();
    }

    this.advancedRenderingComposer = createAdvancedRenderingComposer(this.renderer, this.scene, this.perspectiveCamera, settings);
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

    for (const renderObjects of this.localLightRenderObjects.values()) {
      applyAdvancedRenderingLightShadowFlags(renderObjects.group, advancedRendering);
    }

    for (const renderObjects of this.brushRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(renderObjects.mesh, shadowsEnabled);
    }

    for (const renderGroup of this.modelRenderObjects.values()) {
      applyAdvancedRenderingRenderableShadowFlags(renderGroup, shadowsEnabled);
    }
  }

  private rebuildLocalLights(document: SceneDocument) {
    this.clearLocalLights();

    for (const entity of getEntityInstances(document.entities)) {
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

  private rebuildBrushMeshes(document: SceneDocument, selection: EditorSelection) {
    this.clearBrushMeshes();

    for (const brush of Object.values(document.brushes)) {
      const geometry = new BoxGeometry(brush.size.x, brush.size.y, brush.size.z);
      applyBoxBrushFaceUvsToGeometry(geometry, brush);

      const materials = BOX_FACE_IDS.map((faceId) =>
        this.createFaceMaterial(
          brush,
          faceId,
          document.materials[brush.faces[faceId].materialId ?? ""],
          isBrushFaceSelected(selection, brush.id, faceId)
        )
      );
      const mesh = new Mesh(geometry, materials);
      const brushSelected = isBrushSelected(selection, brush.id);

      mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
      mesh.userData.brushId = brush.id;
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({
          color: brushSelected ? BRUSH_SELECTED_EDGE_COLOR : BRUSH_EDGE_COLOR
        })
      );
      edges.position.copy(mesh.position);

      this.brushGroup.add(mesh);
      this.brushGroup.add(edges);
      this.brushRenderObjects.set(brush.id, {
        mesh,
        edges
      });
    }

    this.applyShadowState();
  }

  private rebuildEntityMarkers(document: SceneDocument, selection: EditorSelection) {
    this.clearEntityMarkers();

    for (const entity of getEntityInstances(document.entities)) {
      const selected = selection.kind === "entities" && selection.ids.includes(entity.id);
      const renderObjects = this.createEntityRenderObjects(entity, selected);

      this.entityGroup.add(renderObjects.group);
      this.entityRenderObjects.set(entity.id, renderObjects);
    }
  }

  private rebuildModelInstances(document: SceneDocument, selection: EditorSelection) {
    this.clearModelInstances();

    for (const modelInstance of getModelInstances(document.modelInstances)) {
      const selected = isModelInstanceSelected(selection, modelInstance.id);
      const asset = this.projectAssets[modelInstance.assetId];
      const loadedAsset = this.loadedModelAssets[modelInstance.assetId];
      const renderGroup = createModelInstanceRenderGroup(modelInstance, asset, loadedAsset, selected);

      this.modelGroup.add(renderGroup);
      this.modelRenderObjects.set(modelInstance.id, renderGroup);
    }

    this.applyShadowState();
  }

  private createEntityRenderObjects(entity: EntityInstance, selected: boolean): EntityRenderObjects {
    switch (entity.kind) {
      case "pointLight":
        return this.createPointLightGizmoRenderObjects(entity.id, entity.position, entity.distance, entity.colorHex, selected);
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
        return this.createPlayerStartRenderObjects(entity.id, entity.position, entity.yawDegrees, selected);
      case "soundEmitter":
        return this.createSoundEmitterRenderObjects(entity.id, entity.position, entity.refDistance, entity.maxDistance, selected);
      case "triggerVolume":
        return this.createTriggerVolumeRenderObjects(entity.id, entity.position, entity.size, selected);
      case "teleportTarget":
        return this.createTeleportTargetRenderObjects(entity.id, entity.position, entity.yawDegrees, selected);
      case "interactable":
        return this.createInteractableRenderObjects(entity.id, entity.position, entity.radius, selected);
    }
  }

  private tagEntityMesh(mesh: Mesh, entityId: string, entityKind: EntityInstance["kind"], group: Group) {
    mesh.userData.entityId = entityId;
    mesh.userData.entityKind = entityKind;
    group.add(mesh);
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

    const forward = new Vector3(direction.x, direction.y, direction.z).normalize();
    const coneLength = Math.max(0.85, distance);
    const coneRadius = Math.max(0.16, Math.tan((angleDegrees * Math.PI) / 360) * coneLength);
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), forward);
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

  private createSpotLightRuntimeObjects(entity: SpotLightEntity): LocalLightRenderObjects {
    const group = new Group();
    const light = new SpotLight(entity.colorHex, entity.intensity, entity.distance, (entity.angleDegrees * Math.PI) / 180, 0.18, 1);
    const direction = new Vector3(entity.direction.x, entity.direction.y, entity.direction.z).normalize();
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);

    group.position.set(entity.position.x, entity.position.y, entity.position.z);
    group.quaternion.copy(orientation);
    light.position.set(0, 0, 0);
    light.target.position.set(0, 1, 0);
    group.add(light);
    group.add(light.target);

    return {
      group
    };
  }

  private createPointLightRuntimeObjects(entity: PointLightEntity): LocalLightRenderObjects {
    const group = new Group();
    const light = new PointLight(entity.colorHex, entity.intensity, entity.distance);

    group.position.set(entity.position.x, entity.position.y, entity.position.z);
    light.position.set(0, 0, 0);
    group.add(light);

    return {
      group
    };
  }

  private createPlayerStartRenderObjects(entityId: string, position: Vec3, yawDegrees: number, selected: boolean): EntityRenderObjects {
    const markerColor = selected ? PLAYER_START_SELECTED_COLOR : PLAYER_START_COLOR;
    const group = new Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = (yawDegrees * Math.PI) / 180;

    const base = new Mesh(
      new CylinderGeometry(0.22, 0.22, 0.05, 18),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.18 : 0.08,
        roughness: 0.35,
        metalness: 0.08
      })
    );
    base.position.y = 0.025;

    const body = new Mesh(
      new BoxGeometry(0.12, 0.12, 0.46),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.14 : 0.06,
        roughness: 0.42,
        metalness: 0.02
      })
    );
    body.position.set(0, 0.16, 0.1);

    const arrowHead = new Mesh(
      new ConeGeometry(0.12, 0.28, 14),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.2 : 0.08,
        roughness: 0.38,
        metalness: 0.03
      })
    );
    arrowHead.rotation.x = Math.PI * 0.5;
    arrowHead.position.set(0, 0.16, 0.42);

    for (const mesh of [base, body, arrowHead]) {
      this.tagEntityMesh(mesh, entityId, "playerStart", group);
    }

    return {
      group,
      meshes: [base, body, arrowHead]
    };
  }

  private createSoundEmitterRenderObjects(
    entityId: string,
    position: Vec3,
    refDistance: number,
    maxDistance: number,
    selected: boolean
  ): EntityRenderObjects {
    const markerColor = selected ? SOUND_EMITTER_SELECTED_COLOR : SOUND_EMITTER_COLOR;
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

  private createTriggerVolumeRenderObjects(entityId: string, position: Vec3, size: Vec3, selected: boolean): EntityRenderObjects {
    const markerColor = selected ? TRIGGER_VOLUME_SELECTED_COLOR : TRIGGER_VOLUME_COLOR;
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

  private createTeleportTargetRenderObjects(entityId: string, position: Vec3, yawDegrees: number, selected: boolean): EntityRenderObjects {
    const markerColor = selected ? TELEPORT_TARGET_SELECTED_COLOR : TELEPORT_TARGET_COLOR;
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

  private createInteractableRenderObjects(entityId: string, position: Vec3, radius: number, selected: boolean): EntityRenderObjects {
    const markerColor = selected ? INTERACTABLE_SELECTED_COLOR : INTERACTABLE_COLOR;
    const displayRadius = Math.max(0.45, radius);
    const group = new Group();
    group.position.set(position.x, position.y, position.z);

    const core = new Mesh(
      new SphereGeometry(0.16, 12, 10),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.18 : 0.08,
        roughness: 0.34,
        metalness: 0.04
      })
    );

    const radiusRing = new Mesh(
      new TorusGeometry(displayRadius, 0.03, 8, 32),
      new MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: selected ? 0.1 : 0.04,
        roughness: 0.55,
        metalness: 0.02
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

  private createFaceMaterial(brush: BoxBrush, faceId: BoxFaceId, material: MaterialDef | undefined, selectedFace: boolean): MeshStandardMaterial {
    const face = brush.faces[faceId];

    if (material === undefined || face.materialId === null) {
      return new MeshStandardMaterial({
        color: selectedFace ? SELECTED_FACE_FALLBACK_COLOR : FALLBACK_FACE_COLOR,
        emissive: selectedFace ? SELECTED_FACE_EMISSIVE : 0x000000,
        emissiveIntensity: selectedFace ? 0.28 : 0,
        roughness: 0.9,
        metalness: 0.05
      });
    }

    return new MeshStandardMaterial({
      color: 0xffffff,
      map: this.getOrCreateTexture(material),
      emissive: selectedFace ? SELECTED_FACE_EMISSIVE : 0x000000,
      emissiveIntensity: selectedFace ? 0.32 : 0,
      roughness: 0.92,
      metalness: 0.02
    });
  }

  private getOrCreateTexture(material: MaterialDef): CanvasTexture {
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
    for (const renderObjects of this.localLightRenderObjects.values()) {
      this.localLightGroup.remove(renderObjects.group);
    }

    this.localLightRenderObjects.clear();
  }

  private clearBrushMeshes() {
    for (const renderObjects of this.brushRenderObjects.values()) {
      this.brushGroup.remove(renderObjects.mesh);
      this.brushGroup.remove(renderObjects.edges);
      renderObjects.mesh.geometry.dispose();

      for (const material of renderObjects.mesh.material) {
        material.dispose();
      }

      renderObjects.edges.geometry.dispose();
      renderObjects.edges.material.dispose();
    }

    this.brushRenderObjects.clear();
  }

  private clearEntityMarkers() {
    for (const renderObjects of this.entityRenderObjects.values()) {
      this.entityGroup.remove(renderObjects.group);

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
  }

  private handlePointerDown = (event: PointerEvent) => {
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

    if (event.button !== 0) {
      return;
    }

    if (this.toolMode === "box-create") {
      const previewCenter = this.getBoxCreatePreviewCenter(event);

      if (previewCenter !== null) {
        this.createBoxBrushHandler?.(previewCenter);
      }

      return;
    }

    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    const hits = this.raycaster.intersectObjects(
      [
        ...Array.from(this.entityRenderObjects.values(), (renderObjects) => renderObjects.group),
        ...Array.from(this.modelRenderObjects.values()),
        ...Array.from(this.brushRenderObjects.values(), (renderObjects) => renderObjects.mesh)
      ],
      true
    );

    if (hits.length === 0) {
      this.lastClickPointer = null;
      this.lastClickSelectionKey = null;
      this.brushSelectionChangeHandler?.({
        kind: "none"
      });
      return;
    }

    // Build a deduplicated list of selectable candidates from the hit list.
    // Multiple mesh parts of the same entity/model/brush collapse to one entry.
    const candidates: Array<{ key: string; object: (typeof hits)[0]["object"]; face: (typeof hits)[0]["face"] }> = [];
    const seenKeys = new Set<string>();

    for (const hit of hits) {
      // Skip indicator meshes that are intentionally non-pickable (wireframe shells, range spheres, etc.)
      if (hit.object.userData.nonPickable === true) {
        continue;
      }

      const entityId = hit.object.userData.entityId;
      const modelInstanceId = this.findModelInstanceId(hit.object);
      const brushId = hit.object.userData.brushId;

      let key: string;
      if (typeof entityId === "string") {
        key = `entity:${entityId}`;
      } else if (modelInstanceId !== null) {
        key = `model:${modelInstanceId}`;
      } else if (typeof brushId === "string") {
        const faceMaterialIndex = hit.face?.materialIndex;
        const faceId = typeof faceMaterialIndex === "number" ? BOX_FACE_IDS[faceMaterialIndex] ?? null : null;
        // In face-edit mode each face is a distinct candidate; in brush mode collapse to brush.
        key = faceId !== null ? `brushFace:${brushId}:${faceId}` : `brush:${brushId}`;
      } else {
        continue;
      }

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        candidates.push({ key, object: hit.object, face: hit.face });
      }
    }

    if (candidates.length === 0) {
      this.lastClickPointer = null;
      this.lastClickSelectionKey = null;
      this.brushSelectionChangeHandler?.({ kind: "none" });
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
      const lastIndex = candidates.findIndex((c) => c.key === this.lastClickSelectionKey);
      if (lastIndex !== -1) {
        candidateIndex = (lastIndex + 1) % candidates.length;
      }
    }

    this.lastClickPointer = { x: this.pointer.x, y: this.pointer.y };

    const chosen = candidates[candidateIndex];
    this.lastClickSelectionKey = chosen.key;

    // Dispatch the selection for the chosen candidate.
    const entityId = chosen.object.userData.entityId;
    if (typeof entityId === "string") {
      this.brushSelectionChangeHandler?.({ kind: "entities", ids: [entityId] });
      return;
    }

    const modelInstanceId = this.findModelInstanceId(chosen.object);
    if (modelInstanceId !== null) {
      this.brushSelectionChangeHandler?.({ kind: "modelInstances", ids: [modelInstanceId] });
      return;
    }

    const brushId = chosen.object.userData.brushId;
    const faceMaterialIndex = chosen.face?.materialIndex;
    const faceId = typeof faceMaterialIndex === "number" ? BOX_FACE_IDS[faceMaterialIndex] ?? null : null;

    if (typeof brushId !== "string") {
      return;
    }

    if (faceId !== null) {
      this.brushSelectionChangeHandler?.({ kind: "brushFace", brushId, faceId });
      return;
    }

    this.brushSelectionChangeHandler?.({ kind: "brushes", ids: [brushId] });
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.activeCameraDragPointerId === event.pointerId && this.lastCameraDragClientPosition !== null) {
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

    if (this.toolMode !== "box-create") {
      return;
    }

    this.setBoxCreatePreview(this.getBoxCreatePreviewCenter(event));
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.activeCameraDragPointerId !== event.pointerId) {
      return;
    }

    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }

    this.activeCameraDragPointerId = null;
    this.lastCameraDragClientPosition = null;
  };

  private handlePointerLeave = () => {
    if (this.activeCameraDragPointerId !== null) {
      return;
    }

    if (this.toolMode !== "box-create") {
      return;
    }

    this.setBoxCreatePreview(null);
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    if (this.viewMode === "perspective") {
      this.cameraSpherical.radius = Math.min(
        MAX_CAMERA_DISTANCE,
        Math.max(MIN_CAMERA_DISTANCE, this.cameraSpherical.radius * Math.exp(event.deltaY * ZOOM_SPEED))
      );
      this.applyPerspectiveCameraPose();
      return;
    }

    this.orthographicCamera.zoom = Math.min(
      MAX_ORTHOGRAPHIC_ZOOM,
      Math.max(MIN_ORTHOGRAPHIC_ZOOM, this.orthographicCamera.zoom * Math.exp(-event.deltaY * ZOOM_SPEED))
    );
    this.orthographicCamera.updateProjectionMatrix();
  };

  private handleAuxClick = (event: MouseEvent) => {
    if (event.button === 1) {
      event.preventDefault();
    }
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
      const visibleHeight = 2 * Math.tan((this.perspectiveCamera.fov * Math.PI) / 360) * this.cameraSpherical.radius;
      const visibleWidth = visibleHeight * Math.max(this.perspectiveCamera.aspect, 0.0001);

      this.perspectiveCamera.getWorldDirection(this.cameraForward);
      this.cameraRight.crossVectors(this.cameraForward, this.perspectiveCamera.up).normalize();
      this.cameraUp.crossVectors(this.cameraRight, this.cameraForward).normalize();

      this.cameraTarget
        .addScaledVector(this.cameraRight, (-deltaX / width) * visibleWidth)
        .addScaledVector(this.cameraUp, (deltaY / height) * visibleHeight);

      this.applyPerspectiveCameraPose();
      return;
    }

    const visibleHeight = ORTHOGRAPHIC_FRUSTUM_HEIGHT / this.orthographicCamera.zoom;
    const visibleWidth = (this.orthographicCamera.right - this.orthographicCamera.left) / this.orthographicCamera.zoom;

    this.orthographicCamera.getWorldDirection(this.cameraForward);
    this.cameraRight.crossVectors(this.cameraForward, this.orthographicCamera.up).normalize();
    this.cameraUp.crossVectors(this.cameraRight, this.cameraForward).normalize();

    this.cameraTarget
      .addScaledVector(this.cameraRight, (-deltaX / width) * visibleWidth)
      .addScaledVector(this.cameraUp, (deltaY / height) * visibleHeight);

    this.applyOrthographicCameraPose();
  }

  private getBoxCreatePreviewCenter(event: PointerEvent): Vec3 | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.getActiveCamera());

    if (this.raycaster.ray.intersectPlane(this.getBoxCreatePlane(), this.boxCreateIntersection) === null) {
      return null;
    }

    switch (this.viewMode) {
      case "perspective":
      case "top":
        return {
          x: snapValueToGrid(this.boxCreateIntersection.x, DEFAULT_GRID_SIZE),
          y: snapValueToGrid(DEFAULT_BOX_BRUSH_SIZE.y * 0.5, DEFAULT_GRID_SIZE),
          z: snapValueToGrid(this.boxCreateIntersection.z, DEFAULT_GRID_SIZE)
        };
      case "front":
        return {
          x: snapValueToGrid(this.boxCreateIntersection.x, DEFAULT_GRID_SIZE),
          y: snapValueToGrid(this.boxCreateIntersection.y, DEFAULT_GRID_SIZE),
          z: snapValueToGrid(DEFAULT_BOX_BRUSH_SIZE.z * 0.5, DEFAULT_GRID_SIZE)
        };
      case "side":
        return {
          x: snapValueToGrid(DEFAULT_BOX_BRUSH_SIZE.x * 0.5, DEFAULT_GRID_SIZE),
          y: snapValueToGrid(this.boxCreateIntersection.y, DEFAULT_GRID_SIZE),
          z: snapValueToGrid(this.boxCreateIntersection.z, DEFAULT_GRID_SIZE)
        };
    }
  }

  private setBoxCreatePreview(center: Vec3 | null) {
    if (
      (center === null && this.lastBoxCreatePreviewCenter === null) ||
      (center !== null &&
        this.lastBoxCreatePreviewCenter !== null &&
        center.x === this.lastBoxCreatePreviewCenter.x &&
        center.y === this.lastBoxCreatePreviewCenter.y &&
        center.z === this.lastBoxCreatePreviewCenter.z)
    ) {
      return;
    }

    this.lastBoxCreatePreviewCenter = center === null ? null : { ...center };
    this.boxCreatePreviewMesh.visible = center !== null;
    this.boxCreatePreviewEdges.visible = center !== null;

    if (center !== null) {
      this.boxCreatePreviewMesh.position.set(center.x, center.y, center.z);
      this.boxCreatePreviewEdges.position.set(center.x, center.y, center.z);
    }

    this.boxCreatePreviewHandler?.(this.lastBoxCreatePreviewCenter);
  }

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);

    if (this.advancedRenderingComposer !== null) {
      this.advancedRenderingComposer.render();
      return;
    }

    this.renderer.render(this.scene, this.getActiveCamera());
  };
}
