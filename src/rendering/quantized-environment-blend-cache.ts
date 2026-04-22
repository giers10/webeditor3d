import {
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";

import type { WorldEnvironmentBlendTextureResolver } from "./world-background-renderer";

const DEFAULT_QUANTIZED_BLEND_BUCKET_COUNT = 8;
const DEFAULT_BLEND_RENDER_TARGET_WIDTH = 512;
const DEFAULT_BLEND_RENDER_TARGET_HEIGHT = 256;

const BLEND_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BLEND_FRAGMENT_SHADER = `
uniform sampler2D uBaseTexture;
uniform sampler2D uOverlayTexture;
uniform float uBlendAmount;
uniform float uBaseTextureIsSrgb;
uniform float uOverlayTextureIsSrgb;
varying vec2 vUv;

vec3 srgbToLinear(vec3 color) {
  bvec3 cutoff = lessThanEqual(color, vec3(0.04045));
  vec3 lower = color / 12.92;
  vec3 higher = pow((color + 0.055) / 1.055, vec3(2.4));
  return mix(higher, lower, vec3(cutoff));
}

vec3 decodeTextureColor(sampler2D map, vec2 uv, float isSrgb) {
  vec3 color = texture2D(map, uv).rgb;
  return mix(color, srgbToLinear(color), isSrgb);
}

void main() {
  vec3 baseColor = decodeTextureColor(uBaseTexture, vUv, uBaseTextureIsSrgb);
  vec3 overlayColor = decodeTextureColor(
    uOverlayTexture,
    vUv,
    uOverlayTextureIsSrgb
  );

  gl_FragColor = vec4(
    mix(baseColor, overlayColor, clamp(uBlendAmount, 0.0, 1.0)),
    1.0
  );
}
`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultBuildScheduler(callback: () => void) {
  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    window.requestAnimationFrame(() => {
      callback();
    });
    return;
  }

  setTimeout(callback, 0);
}

function getTextureCacheKey(texture: Texture): string {
  return texture.uuid;
}

function getOrderedPairCacheKey(
  baseTexture: Texture,
  overlayTexture: Texture
): string {
  return `${getTextureCacheKey(baseTexture)}->${getTextureCacheKey(overlayTexture)}`;
}

function isSrgbTexture(texture: Texture): boolean {
  return texture.colorSpace === SRGBColorSpace;
}

function resolveTextureDimensions(texture: Texture): {
  width: number;
  height: number;
} {
  const image = texture.image as
    | {
        width?: number;
        height?: number;
      }
    | undefined;
  const sourceData = texture.source.data as
    | {
        width?: number;
        height?: number;
      }
    | null;

  return {
    width: Math.max(
      1,
      Math.floor(
        image?.width ??
          sourceData?.width ??
          DEFAULT_BLEND_RENDER_TARGET_WIDTH
      )
    ),
    height: Math.max(
      1,
      Math.floor(
        image?.height ??
          sourceData?.height ??
          DEFAULT_BLEND_RENDER_TARGET_HEIGHT
      )
    )
  };
}

export interface CachedEnvironmentBlendTexture {
  texture: Texture;
  dispose: () => void;
}

export interface QuantizedEnvironmentBlendCacheOptions {
  bucketCount?: number;
  buildBlendTexture: (
    baseTexture: Texture,
    overlayTexture: Texture,
    blendAmount: number
  ) => CachedEnvironmentBlendTexture;
  disposeBuildResources?: () => void;
  onTextureReady?: () => void;
  scheduleBuild?: (callback: () => void) => void;
}

interface QueuedEnvironmentBlendBuild {
  baseTexture: Texture;
  overlayTexture: Texture;
  bucketIndex: number;
  blendAmount: number;
  key: string;
  pairKey: string;
}

export function quantizeEnvironmentBlendBucket(
  blendAmount: number,
  bucketCount: number = DEFAULT_QUANTIZED_BLEND_BUCKET_COUNT
): number {
  const safeBucketCount = Math.max(1, Math.floor(bucketCount));
  return Math.round(clamp(blendAmount, 0, 1) * safeBucketCount);
}

export function getQuantizedEnvironmentBlendAmount(
  bucketIndex: number,
  bucketCount: number = DEFAULT_QUANTIZED_BLEND_BUCKET_COUNT
): number {
  const safeBucketCount = Math.max(1, Math.floor(bucketCount));
  return clamp(bucketIndex / safeBucketCount, 0, 1);
}

export function createQuantizedEnvironmentBlendCacheKey(
  baseTexture: Texture,
  overlayTexture: Texture,
  bucketIndex: number
): string {
  return `${getOrderedPairCacheKey(baseTexture, overlayTexture)}@${bucketIndex}`;
}

export class QuantizedEnvironmentBlendCache
  implements WorldEnvironmentBlendTextureResolver
{
  private readonly bucketCount: number;
  private readonly buildBlendTexture: QuantizedEnvironmentBlendCacheOptions["buildBlendTexture"];
  private readonly disposeBuildResources: (() => void) | undefined;
  private readonly onTextureReady: (() => void) | undefined;
  private readonly scheduleBuildCallback: (callback: () => void) => void;
  private readonly entries = new Map<string, CachedEnvironmentBlendTexture>();
  private readonly pairEntries = new Map<
    string,
    Map<number, CachedEnvironmentBlendTexture>
  >();
  private readonly pendingKeys = new Set<string>();
  private readonly failedKeys = new Set<string>();
  private pendingBuilds: QueuedEnvironmentBlendBuild[] = [];
  private buildScheduled = false;
  private disposed = false;

  constructor(options: QuantizedEnvironmentBlendCacheOptions) {
    this.bucketCount = Math.max(
      1,
      Math.floor(
        options.bucketCount ?? DEFAULT_QUANTIZED_BLEND_BUCKET_COUNT
      )
    );
    this.buildBlendTexture = options.buildBlendTexture;
    this.disposeBuildResources = options.disposeBuildResources;
    this.onTextureReady = options.onTextureReady;
    this.scheduleBuildCallback = options.scheduleBuild ?? defaultBuildScheduler;
  }

  resolveBlendTexture(
    baseTexture: Texture,
    overlayTexture: Texture,
    blendAmount: number
  ): Texture | null {
    const bucketIndex = quantizeEnvironmentBlendBucket(
      blendAmount,
      this.bucketCount
    );

    if (bucketIndex <= 0) {
      return baseTexture;
    }

    if (bucketIndex >= this.bucketCount) {
      return overlayTexture;
    }

    const key = createQuantizedEnvironmentBlendCacheKey(
      baseTexture,
      overlayTexture,
      bucketIndex
    );
    const cachedEntry = this.entries.get(key);

    if (cachedEntry !== undefined) {
      return cachedEntry.texture;
    }

    if (!this.failedKeys.has(key)) {
      this.queueBuild({
        baseTexture,
        overlayTexture,
        bucketIndex,
        blendAmount: getQuantizedEnvironmentBlendAmount(
          bucketIndex,
          this.bucketCount
        ),
        key,
        pairKey: getOrderedPairCacheKey(baseTexture, overlayTexture)
      });
    }

    return this.findNearestCachedTexture(
      getOrderedPairCacheKey(baseTexture, overlayTexture),
      bucketIndex
    );
  }

  clear() {
    this.pendingBuilds = [];
    this.pendingKeys.clear();
    this.failedKeys.clear();

    for (const entry of this.entries.values()) {
      entry.dispose();
    }

    this.entries.clear();
    this.pairEntries.clear();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.clear();
    this.disposeBuildResources?.();
  }

  private queueBuild(request: QueuedEnvironmentBlendBuild) {
    if (
      this.disposed ||
      this.entries.has(request.key) ||
      this.pendingKeys.has(request.key)
    ) {
      return;
    }

    this.pendingKeys.add(request.key);
    this.pendingBuilds.push(request);

    if (this.buildScheduled) {
      return;
    }

    this.buildScheduled = true;
    this.scheduleBuildCallback(() => {
      this.buildScheduled = false;
      this.processNextBuild();
    });
  }

  private processNextBuild() {
    if (this.disposed) {
      return;
    }

    const nextBuild = this.pendingBuilds.shift();

    if (nextBuild === undefined) {
      return;
    }

    this.pendingKeys.delete(nextBuild.key);

    if (this.entries.has(nextBuild.key) || this.failedKeys.has(nextBuild.key)) {
      this.schedulePendingBuilds();
      return;
    }

    try {
      const builtEntry = this.buildBlendTexture(
        nextBuild.baseTexture,
        nextBuild.overlayTexture,
        nextBuild.blendAmount
      );
      this.entries.set(nextBuild.key, builtEntry);
      let pairEntries = this.pairEntries.get(nextBuild.pairKey);

      if (pairEntries === undefined) {
        pairEntries = new Map<number, CachedEnvironmentBlendTexture>();
        this.pairEntries.set(nextBuild.pairKey, pairEntries);
      }

      pairEntries.set(nextBuild.bucketIndex, builtEntry);
      this.onTextureReady?.();
    } catch (error) {
      this.failedKeys.add(nextBuild.key);
      console.warn(
        "Failed to build quantized environment blend texture.",
        error
      );
    }

    this.schedulePendingBuilds();
  }

  private schedulePendingBuilds() {
    if (this.disposed || this.buildScheduled || this.pendingBuilds.length === 0) {
      return;
    }

    this.buildScheduled = true;
    this.scheduleBuildCallback(() => {
      this.buildScheduled = false;
      this.processNextBuild();
    });
  }

  private findNearestCachedTexture(
    pairKey: string,
    bucketIndex: number
  ): Texture | null {
    const pairEntries = this.pairEntries.get(pairKey);

    if (pairEntries === undefined || pairEntries.size === 0) {
      return null;
    }

    let nearestTexture: Texture | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const [availableBucketIndex, entry] of pairEntries.entries()) {
      const distance = Math.abs(availableBucketIndex - bucketIndex);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTexture = entry.texture;
      }
    }

    return nearestTexture;
  }
}

class RendererEnvironmentBlendTextureBuilder {
  private readonly pmremGenerator: PMREMGenerator;
  private readonly blendScene = new Scene();
  private readonly blendCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly blendMaterial = new ShaderMaterial({
    uniforms: {
      uBaseTexture: {
        value: null
      },
      uOverlayTexture: {
        value: null
      },
      uBlendAmount: {
        value: 0
      },
      uBaseTextureIsSrgb: {
        value: 1
      },
      uOverlayTextureIsSrgb: {
        value: 1
      }
    },
    vertexShader: BLEND_VERTEX_SHADER,
    fragmentShader: BLEND_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly blendMesh = new Mesh(
    new PlaneGeometry(2, 2),
    this.blendMaterial
  );
  private readonly scratchTarget: WebGLRenderTarget;

  constructor(
    private readonly renderer: WebGLRenderer,
    options: {
      targetWidth?: number;
      targetHeight?: number;
    } = {}
  ) {
    this.pmremGenerator = new PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.blendMesh.frustumCulled = false;
    this.blendScene.add(this.blendMesh);
    this.scratchTarget = new WebGLRenderTarget(
      options.targetWidth ?? DEFAULT_BLEND_RENDER_TARGET_WIDTH,
      options.targetHeight ?? DEFAULT_BLEND_RENDER_TARGET_HEIGHT,
      {
        depthBuffer: false,
        stencilBuffer: false,
        magFilter: LinearFilter,
        minFilter: LinearFilter,
        type: HalfFloatType
      }
    );
    this.scratchTarget.texture.colorSpace = LinearSRGBColorSpace;
    this.scratchTarget.texture.mapping = EquirectangularReflectionMapping;
    this.scratchTarget.texture.generateMipmaps = false;
  }

  build(
    baseTexture: Texture,
    overlayTexture: Texture,
    blendAmount: number
  ): CachedEnvironmentBlendTexture {
    const previousRenderTarget = this.renderer.getRenderTarget();
    const previousAutoClear = this.renderer.autoClear;
    const previousXrEnabled = this.renderer.xr.enabled;
    const previousToneMapping = this.renderer.toneMapping;
    const previousOutputColorSpace = this.renderer.outputColorSpace;

    try {
      this.renderer.xr.enabled = false;
      this.renderer.autoClear = true;
      this.renderer.toneMapping = NoToneMapping;
      this.renderer.outputColorSpace = LinearSRGBColorSpace;
      this.blendMaterial.uniforms.uBaseTexture.value = baseTexture;
      this.blendMaterial.uniforms.uOverlayTexture.value = overlayTexture;
      this.blendMaterial.uniforms.uBlendAmount.value = blendAmount;
      this.blendMaterial.uniforms.uBaseTextureIsSrgb.value = isSrgbTexture(
        baseTexture
      )
        ? 1
        : 0;
      this.blendMaterial.uniforms.uOverlayTextureIsSrgb.value = isSrgbTexture(
        overlayTexture
      )
        ? 1
        : 0;

      this.renderer.setRenderTarget(this.scratchTarget);
      this.renderer.clear();
      this.renderer.render(this.blendScene, this.blendCamera);

      const pmremTarget = this.pmremGenerator.fromEquirectangular(
        this.scratchTarget.texture
      );

      return {
        texture: pmremTarget.texture,
        dispose: () => {
          pmremTarget.dispose();
        }
      };
    } finally {
      this.renderer.setRenderTarget(previousRenderTarget);
      this.renderer.autoClear = previousAutoClear;
      this.renderer.xr.enabled = previousXrEnabled;
      this.renderer.toneMapping = previousToneMapping;
      this.renderer.outputColorSpace = previousOutputColorSpace;
    }
  }

  dispose() {
    this.scratchTarget.dispose();
    this.blendMesh.geometry.dispose();
    this.blendMaterial.dispose();
    this.pmremGenerator.dispose();
  }
}

class RendererPmremBlendTextureBuilder {
  private readonly blendScene = new Scene();
  private readonly blendCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly blendMaterial = new ShaderMaterial({
    uniforms: {
      uBaseTexture: {
        value: null
      },
      uOverlayTexture: {
        value: null
      },
      uBlendAmount: {
        value: 0
      },
      uBaseTextureIsSrgb: {
        value: 0
      },
      uOverlayTextureIsSrgb: {
        value: 0
      }
    },
    vertexShader: BLEND_VERTEX_SHADER,
    fragmentShader: BLEND_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  private readonly blendMesh = new Mesh(
    new PlaneGeometry(2, 2),
    this.blendMaterial
  );

  constructor(private readonly renderer: WebGLRenderer) {
    this.blendMesh.frustumCulled = false;
    this.blendScene.add(this.blendMesh);
  }

  build(
    baseTexture: Texture,
    overlayTexture: Texture,
    blendAmount: number
  ): CachedEnvironmentBlendTexture {
    const { width, height } = resolveTextureDimensions(baseTexture);
    const target = new WebGLRenderTarget(width, height, {
      depthBuffer: false,
      stencilBuffer: false,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      type: HalfFloatType
    });
    target.texture.colorSpace = LinearSRGBColorSpace;
    target.texture.mapping = baseTexture.mapping;
    target.texture.generateMipmaps = false;

    const previousRenderTarget = this.renderer.getRenderTarget();
    const previousAutoClear = this.renderer.autoClear;
    const previousXrEnabled = this.renderer.xr.enabled;
    const previousToneMapping = this.renderer.toneMapping;
    const previousOutputColorSpace = this.renderer.outputColorSpace;

    try {
      this.renderer.xr.enabled = false;
      this.renderer.autoClear = true;
      this.renderer.toneMapping = NoToneMapping;
      this.renderer.outputColorSpace = LinearSRGBColorSpace;
      this.blendMaterial.uniforms.uBaseTexture.value = baseTexture;
      this.blendMaterial.uniforms.uOverlayTexture.value = overlayTexture;
      this.blendMaterial.uniforms.uBlendAmount.value = blendAmount;
      this.blendMaterial.uniforms.uBaseTextureIsSrgb.value = isSrgbTexture(
        baseTexture
      )
        ? 1
        : 0;
      this.blendMaterial.uniforms.uOverlayTextureIsSrgb.value = isSrgbTexture(
        overlayTexture
      )
        ? 1
        : 0;

      this.renderer.setRenderTarget(target);
      this.renderer.clear();
      this.renderer.render(this.blendScene, this.blendCamera);

      return {
        texture: target.texture,
        dispose: () => {
          target.dispose();
        }
      };
    } finally {
      this.renderer.setRenderTarget(previousRenderTarget);
      this.renderer.autoClear = previousAutoClear;
      this.renderer.xr.enabled = previousXrEnabled;
      this.renderer.toneMapping = previousToneMapping;
      this.renderer.outputColorSpace = previousOutputColorSpace;
    }
  }

  dispose() {
    this.blendMesh.geometry.dispose();
    this.blendMaterial.dispose();
  }
}

export function createRendererQuantizedEnvironmentBlendCache(
  renderer: WebGLRenderer,
  options: Omit<
    QuantizedEnvironmentBlendCacheOptions,
    "buildBlendTexture" | "disposeBuildResources"
  > & {
    targetWidth?: number;
    targetHeight?: number;
  } = {}
): QuantizedEnvironmentBlendCache {
  const builder = new RendererEnvironmentBlendTextureBuilder(renderer, {
    targetWidth: options.targetWidth,
    targetHeight: options.targetHeight
  });

  return new QuantizedEnvironmentBlendCache({
    ...options,
    buildBlendTexture: (baseTexture, overlayTexture, blendAmount) =>
      builder.build(baseTexture, overlayTexture, blendAmount),
    disposeBuildResources: () => {
      builder.dispose();
    }
  });
}

export function createRendererQuantizedPmremBlendCache(
  renderer: WebGLRenderer,
  options: Omit<
    QuantizedEnvironmentBlendCacheOptions,
    "buildBlendTexture" | "disposeBuildResources"
  > = {}
): QuantizedEnvironmentBlendCache {
  const builder = new RendererPmremBlendTextureBuilder(renderer);

  return new QuantizedEnvironmentBlendCache({
    ...options,
    buildBlendTexture: (baseTexture, overlayTexture, blendAmount) =>
      builder.build(baseTexture, overlayTexture, blendAmount),
    disposeBuildResources: () => {
      builder.dispose();
    }
  });
}
