import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from "three";

import { applyBoxBrushFaceUvsToGeometry } from "../geometry/box-face-uvs";
import { createStarterMaterialSignature, createStarterMaterialTexture } from "../materials/starter-material-textures";

import { FirstPersonNavigationController } from "./first-person-navigation-controller";
import type { FirstPersonTelemetry, NavigationController, RuntimeControllerContext } from "./navigation-controller";
import { RuntimeInteractionSystem, type RuntimeInteractionDispatcher, type RuntimeInteractionPrompt } from "./runtime-interaction-system";
import { OrbitVisitorNavigationController } from "./orbit-visitor-navigation-controller";
import type { RuntimeBoxBrushInstance, RuntimeNavigationMode, RuntimeSceneDefinition, RuntimeTeleportTarget } from "./runtime-scene-build";

interface CachedMaterialTexture {
  signature: string;
  texture: ReturnType<typeof createStarterMaterialTexture>;
}

const FALLBACK_FACE_COLOR = 0x747d89;

export class RuntimeHost {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.05, 1000);
  private readonly cameraForward = new Vector3();
  private readonly domElement: HTMLCanvasElement;
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private readonly brushGroup = new Group();
  private readonly firstPersonController = new FirstPersonNavigationController();
  private readonly orbitVisitorController = new OrbitVisitorNavigationController();
  private readonly interactionSystem = new RuntimeInteractionSystem();
  private readonly brushMeshes = new Map<string, Mesh<BoxGeometry, MeshStandardMaterial[]>>();
  private readonly materialTextureCache = new Map<string, CachedMaterialTexture>();
  private readonly controllerContext: RuntimeControllerContext;
  private readonly renderer: WebGLRenderer | null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private previousFrameTime = 0;
  private container: HTMLElement | null = null;
  private activeController: NavigationController | null = null;
  private runtimeScene: RuntimeSceneDefinition | null = null;
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
    this.scene.add(this.brushGroup);
    this.renderer = enableRendering ? new WebGLRenderer({ antialias: true, alpha: true }) : null;
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

  mount(container: HTMLElement) {
    this.container = container;
    container.appendChild(this.domElement);
    this.domElement.addEventListener("click", this.handleRuntimeClick);
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
    this.interactionSystem.reset();
    this.setInteractionPrompt(null);
    this.applyWorld(runtimeScene);
    this.rebuildBrushMeshes(runtimeScene.brushes);
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
    this.clearBrushMeshes();

    for (const cachedTexture of this.materialTextureCache.values()) {
      cachedTexture.texture.dispose();
    }

    this.materialTextureCache.clear();
    this.renderer?.dispose();
    this.domElement.removeEventListener("click", this.handleRuntimeClick);

    if (this.container !== null && this.container.contains(this.domElement)) {
      this.container.removeChild(this.domElement);
    }

    this.container = null;
  }

  private applyWorld(runtimeScene: RuntimeSceneDefinition) {
    this.scene.background = null;
    this.ambientLight.color.set(runtimeScene.world.ambientLight.colorHex);
    this.ambientLight.intensity = runtimeScene.world.ambientLight.intensity;
    this.sunLight.color.set(runtimeScene.world.sunLight.colorHex);
    this.sunLight.intensity = runtimeScene.world.sunLight.intensity;
    this.sunLight.position
      .set(
        runtimeScene.world.sunLight.direction.x,
        runtimeScene.world.sunLight.direction.y,
        runtimeScene.world.sunLight.direction.z
      )
      .normalize()
      .multiplyScalar(18);
  }

  private rebuildBrushMeshes(brushes: RuntimeBoxBrushInstance[]) {
    this.clearBrushMeshes();

    for (const brush of brushes) {
      const geometry = new BoxGeometry(brush.size.x, brush.size.y, brush.size.z);
      applyBoxBrushFaceUvsToGeometry(geometry, brush);

      const materials = [
        this.createFaceMaterial(brush.faces.posX.material),
        this.createFaceMaterial(brush.faces.negX.material),
        this.createFaceMaterial(brush.faces.posY.material),
        this.createFaceMaterial(brush.faces.negY.material),
        this.createFaceMaterial(brush.faces.posZ.material),
        this.createFaceMaterial(brush.faces.negZ.material)
      ];

      const mesh = new Mesh(geometry, materials);
      mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
      this.brushGroup.add(mesh);
      this.brushMeshes.set(brush.id, mesh);
    }
  }

  private createFaceMaterial(material: RuntimeBoxBrushInstance["faces"]["posX"]["material"]): MeshStandardMaterial {
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

  private clearBrushMeshes() {
    for (const mesh of this.brushMeshes.values()) {
      this.brushGroup.remove(mesh);
      mesh.geometry.dispose();

      for (const material of mesh.material) {
        material.dispose();
      }
    }

    this.brushMeshes.clear();
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
  }

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);

    const now = performance.now();
    const dt = Math.min((now - this.previousFrameTime) / 1000, 1 / 20);
    this.previousFrameTime = now;

    this.activeController?.update(dt);

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

  private createInteractionDispatcher(): RuntimeInteractionDispatcher {
    return {
      teleportPlayer: (target) => {
        this.applyTeleportPlayerAction(target);
      },
      toggleBrushVisibility: (brushId, visible) => {
        this.applyToggleBrushVisibilityAction(brushId, visible);
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
    if (this.runtimeScene === null || this.activeController !== this.firstPersonController || this.currentInteractionPrompt === null) {
      return;
    }

    this.interactionSystem.dispatchClickInteraction(this.currentInteractionPrompt.sourceEntityId, this.runtimeScene, this.createInteractionDispatcher());
  };
}
