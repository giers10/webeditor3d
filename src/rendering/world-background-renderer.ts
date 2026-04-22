import {
  BackSide,
  Camera,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Texture
} from "three";

import type { WorldBackgroundSettings } from "../document/world-settings";

const BACKGROUND_SPHERE_RADIUS = 320;
const BACKGROUND_SPHERE_WIDTH_SEGMENTS = 48;
const BACKGROUND_SPHERE_HEIGHT_SEGMENTS = 24;
const DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR = "#0d1116";
const NIGHT_BACKGROUND_EPSILON = 1e-4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(left: number, right: number, amount: number) {
  return left + (right - left) * amount;
}

function resolveGradientColors(background: WorldBackgroundSettings) {
  if (background.mode === "solid") {
    return {
      topColorHex: background.colorHex,
      bottomColorHex: background.colorHex
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    topColorHex: DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR,
    bottomColorHex: DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR
  };
}

export interface WorldBackgroundOverlayState {
  texture: Texture | null;
  opacity: number;
  environmentIntensity: number;
}

export interface WorldEnvironmentState {
  texture: Texture | null;
  intensity: number;
}

export function resolveWorldEnvironmentState(
  background: WorldBackgroundSettings,
  backgroundTexture: Texture | null,
  overlay: WorldBackgroundOverlayState | null
): WorldEnvironmentState {
  const baseTexture = background.mode === "image" ? backgroundTexture : null;
  const baseIntensity =
    background.mode === "image" ? background.environmentIntensity : 0;
  const overlayTexture = overlay?.texture ?? null;
  const overlayOpacity = clamp(overlay?.opacity ?? 0, 0, 1);
  const overlayIntensity = overlay?.environmentIntensity ?? 0;

  if (
    baseTexture !== null &&
    overlayTexture !== null &&
    overlayOpacity > NIGHT_BACKGROUND_EPSILON &&
    overlayOpacity < 1 - NIGHT_BACKGROUND_EPSILON
  ) {
    if (overlayOpacity < 0.5) {
      return {
        texture: baseTexture,
        intensity: lerp(baseIntensity, 0, overlayOpacity * 2)
      };
    }

    return {
      texture: overlayTexture,
      intensity: lerp(0, overlayIntensity, (overlayOpacity - 0.5) * 2)
    };
  }

  if (overlayTexture !== null && overlayOpacity > NIGHT_BACKGROUND_EPSILON) {
    if (baseTexture === null) {
      return {
        texture: overlayTexture,
        intensity: overlayIntensity * overlayOpacity
      };
    }

    if (overlayOpacity >= 1 - NIGHT_BACKGROUND_EPSILON) {
      return {
        texture: overlayTexture,
        intensity: overlayIntensity
      };
    }
  }

  if (baseTexture !== null) {
    return {
      texture: baseTexture,
      intensity: baseIntensity
    };
  }

  if (overlayTexture !== null && overlayOpacity > NIGHT_BACKGROUND_EPSILON) {
    return {
      texture: overlayTexture,
      intensity: overlayIntensity * overlayOpacity
    };
  }

  return {
    texture: null,
    intensity: 1
  };
}

const GRADIENT_VERTEX_SHADER = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRADIENT_FRAGMENT_SHADER = `
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
varying vec3 vWorldPosition;

void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  float gradientAmount = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(uBottomColor, uTopColor, gradientAmount);
  gl_FragColor = vec4(color, 1.0);
}
`;

export class WorldBackgroundRenderer {
  readonly scene = new Scene();

  private readonly anchor = new Group();
  private readonly geometry = new SphereGeometry(
    BACKGROUND_SPHERE_RADIUS,
    BACKGROUND_SPHERE_WIDTH_SEGMENTS,
    BACKGROUND_SPHERE_HEIGHT_SEGMENTS
  );
  private readonly gradientMaterial = new ShaderMaterial({
    uniforms: {
      uTopColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      },
      uBottomColor: {
        value: new Color(DEFAULT_IMAGE_BACKGROUND_FALLBACK_COLOR)
      }
    },
    vertexShader: GRADIENT_VERTEX_SHADER,
    fragmentShader: GRADIENT_FRAGMENT_SHADER,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly imageMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly overlayMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: true,
    opacity: 0
  });
  private readonly gradientMesh = new Mesh(this.geometry, this.gradientMaterial);
  private readonly imageMesh = new Mesh(this.geometry, this.imageMaterial);
  private readonly overlayMesh = new Mesh(this.geometry, this.overlayMaterial);

  constructor() {
    this.gradientMesh.renderOrder = -1002;
    this.imageMesh.renderOrder = -1001;
    this.overlayMesh.renderOrder = -1000;

    for (const mesh of [this.gradientMesh, this.imageMesh, this.overlayMesh]) {
      mesh.frustumCulled = false;
    }

    this.anchor.add(this.gradientMesh);
    this.anchor.add(this.imageMesh);
    this.anchor.add(this.overlayMesh);
    this.scene.add(this.anchor);
  }

  update(
    background: WorldBackgroundSettings,
    backgroundTexture: Texture | null,
    overlay: WorldBackgroundOverlayState | null
  ) {
    const gradientColors = resolveGradientColors(background);
    this.gradientMaterial.uniforms.uTopColor.value.set(
      gradientColors.topColorHex
    );
    this.gradientMaterial.uniforms.uBottomColor.value.set(
      gradientColors.bottomColorHex
    );

    const showImageBackground =
      background.mode === "image" && backgroundTexture !== null;

    if (this.imageMaterial.map !== backgroundTexture) {
      this.imageMaterial.map = backgroundTexture;
      this.imageMaterial.needsUpdate = true;
    }

    this.gradientMesh.visible = !showImageBackground;
    this.imageMesh.visible = showImageBackground;

    const overlayTexture = overlay?.texture ?? null;
    const overlayOpacity =
      overlayTexture === null ? 0 : clamp(overlay?.opacity ?? 0, 0, 1);

    if (this.overlayMaterial.map !== overlayTexture) {
      this.overlayMaterial.map = overlayTexture;
      this.overlayMaterial.needsUpdate = true;
    }

    this.overlayMaterial.opacity = overlayOpacity;
    this.overlayMesh.visible = overlayOpacity > NIGHT_BACKGROUND_EPSILON;
  }

  syncToCamera(camera: Camera) {
    this.anchor.position.copy(camera.position);
  }

  dispose() {
    this.geometry.dispose();
    this.gradientMaterial.dispose();
    this.imageMaterial.dispose();
    this.overlayMaterial.dispose();
  }
}
