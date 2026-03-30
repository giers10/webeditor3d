import {
  AmbientLight,
  AxesHelper,
  Color,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from "three";

import type { WorldSettings } from "../document/scene-document";

export class ViewportHost {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly ambientLight = new AmbientLight();
  private readonly sunLight = new DirectionalLight();
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private container: HTMLElement | null = null;

  constructor() {
    this.camera.position.set(8, 8, 8);
    this.camera.lookAt(new Vector3(0, 0, 0));

    const gridHelper = new GridHelper(40, 40, 0xc68d67, 0x4e596b);
    const axesHelper = new AxesHelper(2);

    this.scene.add(gridHelper);
    this.scene.add(axesHelper);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mount(container: HTMLElement, world: WorldSettings) {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.updateWorld(world);
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

  dispose() {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.dispose();

    if (this.container !== null && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.container = null;
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

  private render = () => {
    this.animationFrame = window.requestAnimationFrame(this.render);
    this.renderer.render(this.scene, this.camera);
  };
}
