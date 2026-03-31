import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";

import { isBrushSelected, type EditorSelection } from "../core/selection";
import type { SceneDocument, WorldSettings } from "../document/scene-document";

interface BrushRenderObjects {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
}

const BRUSH_BASE_COLOR = 0x8c98a7;
const BRUSH_SELECTED_COLOR = 0xd9a26b;
const BRUSH_EDGE_COLOR = 0x0d1017;
const BRUSH_SELECTED_EDGE_COLOR = 0xf7d2aa;

export class ViewportHost {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly brushGroup = new Group();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly brushRenderObjects = new Map<string, BrushRenderObjects>();
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private container: HTMLElement | null = null;
  private brushSelectionChangeHandler: ((brushId: string | null) => void) | null = null;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mount(container: HTMLElement) {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
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
  }

  setBrushSelectionChangeHandler(handler: ((brushId: string | null) => void) | null) {
    this.brushSelectionChangeHandler = handler;
  }

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.clearBrushMeshes();
    this.renderer.dispose();

    if (this.container !== null && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.container = null;
  }

  private rebuildBrushMeshes(document: SceneDocument, selection: EditorSelection) {
    this.clearBrushMeshes();

    for (const brush of Object.values(document.brushes)) {
      const selected = isBrushSelected(selection, brush.id);
      const geometry = new BoxGeometry(brush.size.x, brush.size.y, brush.size.z);
      const material = new MeshStandardMaterial({
        color: selected ? BRUSH_SELECTED_COLOR : BRUSH_BASE_COLOR,
        transparent: true,
        opacity: selected ? 0.95 : 0.78,
        roughness: 0.9,
        metalness: 0.05
      });
      const mesh = new Mesh(geometry, material);

      mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
      mesh.userData.brushId = brush.id;
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({
          color: selected ? BRUSH_SELECTED_EDGE_COLOR : BRUSH_EDGE_COLOR
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

  private clearBrushMeshes() {
    for (const renderObjects of this.brushRenderObjects.values()) {
      this.brushGroup.remove(renderObjects.mesh);
      this.brushGroup.remove(renderObjects.edges);
      renderObjects.mesh.geometry.dispose();
      renderObjects.mesh.material.dispose();
      renderObjects.edges.geometry.dispose();
      renderObjects.edges.material.dispose();
    }

    this.brushRenderObjects.clear();
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
    const bounds = this.renderer.domElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(
      Array.from(this.brushRenderObjects.values(), (renderObjects) => renderObjects.mesh),
      false
    );

    if (hits.length === 0) {
      this.brushSelectionChangeHandler?.(null);
      return;
    }

    const brushId = hits[0].object.userData.brushId;

    if (typeof brushId === "string") {
      this.brushSelectionChangeHandler?.(brushId);
    }
  };

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);
    this.renderer.render(this.scene, this.camera);
  };
}
