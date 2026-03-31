import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  CanvasTexture,
  Color,
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
  Plane,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";

import { isBrushFaceSelected, isBrushSelected, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import type { SceneDocument, WorldSettings } from "../document/scene-document";
import { getPlayerStartEntities } from "../entities/entity-instances";
import { BOX_FACE_IDS, DEFAULT_BOX_BRUSH_SIZE, type BoxBrush, type BoxFaceId } from "../document/brushes";
import { applyBoxBrushFaceUvsToGeometry } from "../geometry/box-face-uvs";
import { DEFAULT_GRID_SIZE, snapValueToGrid } from "../geometry/grid-snapping";
import { createStarterMaterialSignature, createStarterMaterialTexture } from "../materials/starter-material-textures";
import type { MaterialDef } from "../materials/starter-material-library";

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
const BOX_CREATE_PREVIEW_FILL = 0x89b6ff;
const BOX_CREATE_PREVIEW_EDGE = 0xf3be8f;

interface CachedMaterialTexture {
  signature: string;
  texture: CanvasTexture;
}

interface PlayerStartRenderObjects {
  group: Group;
  meshes: Mesh[];
}

export class ViewportHost {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly brushGroup = new Group();
  private readonly entityGroup = new Group();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly boxCreateIntersection = new Vector3();
  private readonly boxCreatePlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly brushRenderObjects = new Map<string, BrushRenderObjects>();
  private readonly playerStartRenderObjects = new Map<string, PlayerStartRenderObjects>();
  private readonly materialTextureCache = new Map<string, CachedMaterialTexture>();
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
  private lastBoxCreatePreviewCenter: Vec3 | null = null;

  constructor() {
    this.camera.position.set(10, 9, 10);
    this.camera.lookAt(new Vector3(0, 0, 0));

    const gridHelper = new GridHelper(40, 40, 0xcf8354, 0x4e596b);
    const axesHelper = new AxesHelper(2);

    this.scene.add(gridHelper);
    this.scene.add(axesHelper);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.scene.add(this.brushGroup);
    this.scene.add(this.entityGroup);
    this.boxCreatePreviewMesh.visible = false;
    this.boxCreatePreviewEdges.visible = false;
    this.scene.add(this.boxCreatePreviewMesh);
    this.scene.add(this.boxCreatePreviewEdges);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mount(container: HTMLElement) {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("pointerleave", this.handlePointerLeave);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);

    this.render();
  }

  updateWorld(world: WorldSettings) {
    this.scene.background = new Color(world.background.colorHex);
    this.ambientLight.color.set(world.ambientLight.colorHex);
    this.ambientLight.intensity = world.ambientLight.intensity;
    this.sunLight.color.set(world.sunLight.colorHex);
    this.sunLight.intensity = world.sunLight.intensity;
    this.sunLight.position.set(world.sunLight.direction.x, world.sunLight.direction.y, world.sunLight.direction.z).normalize().multiplyScalar(18);
  }

  updateDocument(document: SceneDocument, selection: EditorSelection) {
    this.rebuildBrushMeshes(document, selection);
    this.rebuildPlayerStartMarkers(document, selection);
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

    if (toolMode !== "box-create") {
      this.setBoxCreatePreview(null);
    }
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
    this.renderer.domElement.removeEventListener("pointerleave", this.handlePointerLeave);
    this.clearBrushMeshes();
    this.clearPlayerStartMarkers();
    this.boxCreatePreviewHandler = null;
    this.setBoxCreatePreview(null);

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
  }

  private rebuildPlayerStartMarkers(document: SceneDocument, selection: EditorSelection) {
    this.clearPlayerStartMarkers();

    for (const playerStart of getPlayerStartEntities(document.entities)) {
      const selected = selection.kind === "entities" && selection.ids.includes(playerStart.id);
      const markerColor = selected ? PLAYER_START_SELECTED_COLOR : PLAYER_START_COLOR;
      const group = new Group();
      group.position.set(playerStart.position.x, playerStart.position.y, playerStart.position.z);
      group.rotation.y = (playerStart.yawDegrees * Math.PI) / 180;

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
        mesh.userData.entityId = playerStart.id;
        mesh.userData.entityKind = "playerStart";
        group.add(mesh);
      }

      this.entityGroup.add(group);
      this.playerStartRenderObjects.set(playerStart.id, {
        group,
        meshes: [base, body, arrowHead]
      });
    }
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

  private clearPlayerStartMarkers() {
    for (const renderObjects of this.playerStartRenderObjects.values()) {
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

    this.playerStartRenderObjects.clear();
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
    this.renderer.setSize(width, height, false);
  }

  private handlePointerDown = (event: PointerEvent) => {
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

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(
      [
        ...Array.from(this.playerStartRenderObjects.values(), (renderObjects) => renderObjects.group),
        ...Array.from(this.brushRenderObjects.values(), (renderObjects) => renderObjects.mesh)
      ],
      true
    );

    if (hits.length === 0) {
      this.brushSelectionChangeHandler?.({
        kind: "none"
      });
      return;
    }

    const hit = hits[0];
    const entityId = hit.object.userData.entityId;

    if (typeof entityId === "string") {
      this.brushSelectionChangeHandler?.({
        kind: "entities",
        ids: [entityId]
      });
      return;
    }

    const brushId = hit.object.userData.brushId;
    const faceMaterialIndex = hit.face?.materialIndex;
    const faceId = typeof faceMaterialIndex === "number" ? BOX_FACE_IDS[faceMaterialIndex] ?? null : null;

    if (typeof brushId !== "string") {
      return;
    }

    if (faceId !== null) {
      this.brushSelectionChangeHandler?.({
        kind: "brushFace",
        brushId,
        faceId
      });
      return;
    }

    this.brushSelectionChangeHandler?.({
      kind: "brushes",
      ids: [brushId]
    });
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.toolMode !== "box-create") {
      return;
    }

    this.setBoxCreatePreview(this.getBoxCreatePreviewCenter(event));
  };

  private handlePointerLeave = () => {
    if (this.toolMode !== "box-create") {
      return;
    }

    this.setBoxCreatePreview(null);
  };

  private getBoxCreatePreviewCenter(event: PointerEvent): Vec3 | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.raycaster.ray.intersectPlane(this.boxCreatePlane, this.boxCreateIntersection) === null) {
      return null;
    }

    return {
      x: snapValueToGrid(this.boxCreateIntersection.x, DEFAULT_GRID_SIZE),
      y: DEFAULT_BOX_BRUSH_SIZE.y * 0.5,
      z: snapValueToGrid(this.boxCreateIntersection.z, DEFAULT_GRID_SIZE)
    };
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
    this.renderer.render(this.scene, this.camera);
  };
}
