import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";

import { isBrushFaceSelected, isBrushSelected, type EditorSelection } from "../core/selection";
import type { SceneDocument, WorldSettings } from "../document/scene-document";
import { BOX_FACE_IDS, type BoxBrush, type BoxFaceId } from "../document/brushes";
import { applyBoxBrushFaceUvsToGeometry } from "../geometry/box-face-uvs";
import type { MaterialDef } from "../materials/starter-material-library";

interface BrushRenderObjects {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial[]>;
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
}

interface CachedMaterialTexture {
  signature: string;
  texture: CanvasTexture;
}

const BRUSH_BASE_COLOR = 0x8c98a7;
const BRUSH_SELECTED_EDGE_COLOR = 0xf7d2aa;
const BRUSH_EDGE_COLOR = 0x0d1017;
const FALLBACK_FACE_COLOR = 0x747d89;
const SELECTED_FACE_FALLBACK_COLOR = 0xcf7b42;
const SELECTED_FACE_EMISSIVE = 0x4a2814;

function createMaterialSignature(material: MaterialDef): string {
  return `${material.baseColorHex}|${material.accentColorHex}|${material.pattern}`;
}

function fillMaterialPattern(context: CanvasRenderingContext2D, material: MaterialDef, size: number) {
  context.fillStyle = material.baseColorHex;
  context.fillRect(0, 0, size, size);
  context.strokeStyle = material.accentColorHex;
  context.fillStyle = material.accentColorHex;

  switch (material.pattern) {
    case "grid":
      context.lineWidth = Math.max(2, size / 32);

      for (let offset = 0; offset <= size; offset += size / 4) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, size);
        context.stroke();

        context.beginPath();
        context.moveTo(0, offset);
        context.lineTo(size, offset);
        context.stroke();
      }
      break;
    case "checker": {
      const checkerSize = size / 4;

      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          if ((row + column) % 2 === 0) {
            context.fillRect(column * checkerSize, row * checkerSize, checkerSize, checkerSize);
          }
        }
      }
      break;
    }
    case "stripes":
      context.lineWidth = size / 6;

      for (let offset = -size; offset <= size * 2; offset += size / 3) {
        context.beginPath();
        context.moveTo(offset, size);
        context.lineTo(offset + size, 0);
        context.stroke();
      }
      break;
    case "diamond":
      context.lineWidth = Math.max(2, size / 28);

      for (let offset = -size; offset <= size; offset += size / 3) {
        context.beginPath();
        context.moveTo(size * 0.5, offset);
        context.lineTo(size - offset, size * 0.5);
        context.lineTo(size * 0.5, size - offset);
        context.lineTo(-offset, size * 0.5);
        context.closePath();
        context.stroke();
      }
      break;
  }
}

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
  private readonly materialTextureCache = new Map<string, CachedMaterialTexture>();
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private container: HTMLElement | null = null;
  private brushSelectionChangeHandler: ((selection: EditorSelection) => void) | null = null;

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

  setBrushSelectionChangeHandler(handler: ((selection: EditorSelection) => void) | null) {
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

    for (const cachedTexture of this.materialTextureCache.values()) {
      cachedTexture.texture.dispose();
    }

    this.materialTextureCache.clear();
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
    const signature = createMaterialSignature(material);
    const cachedTexture = this.materialTextureCache.get(material.id);

    if (cachedTexture !== undefined && cachedTexture.signature === signature) {
      return cachedTexture.texture;
    }

    cachedTexture?.texture.dispose();

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("2D canvas context is unavailable for starter material texture generation.");
    }

    fillMaterialPattern(context, material, canvas.width);

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

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
      this.brushSelectionChangeHandler?.({
        kind: "none"
      });
      return;
    }

    const hit = hits[0];
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

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);
    this.renderer.render(this.scene, this.camera);
  };
}
