import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

const KTX2_TRANSCODER_PATH = "/basis/";

let sharedKtx2Loader: KTX2Loader | null = null;
let sharedKtx2LoaderInitialized = false;
let fallbackRenderer: WebGLRenderer | null = null;

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function createSharedKtx2Loader(): KTX2Loader {
  const loader = new KTX2Loader();
  loader.setTranscoderPath(KTX2_TRANSCODER_PATH);
  return loader;
}

function disposeFallbackRendererIfSuperseded(renderer: WebGLRenderer) {
  if (fallbackRenderer === null || fallbackRenderer === renderer) {
    return;
  }

  fallbackRenderer.forceContextLoss();
  fallbackRenderer.dispose();
  fallbackRenderer = null;
}

export function getSharedKtx2LoaderIfInitialized(): KTX2Loader | null {
  return sharedKtx2LoaderInitialized ? sharedKtx2Loader : null;
}

export function initializeSharedKtx2Loader(
  renderer: WebGLRenderer
): KTX2Loader {
  if (sharedKtx2Loader === null) {
    sharedKtx2Loader = createSharedKtx2Loader();
  }

  sharedKtx2Loader.detectSupport(renderer);
  sharedKtx2LoaderInitialized = true;
  disposeFallbackRendererIfSuperseded(renderer);
  return sharedKtx2Loader;
}

function createFallbackRenderer(): WebGLRenderer {
  const parameters: WebGLRendererParameters = {
    antialias: false,
    alpha: false,
    powerPreference: "low-power"
  };

  return new WebGLRenderer(parameters);
}

export function ensureSharedKtx2LoaderInitialized(): KTX2Loader {
  if (sharedKtx2LoaderInitialized && sharedKtx2Loader !== null) {
    return sharedKtx2Loader;
  }

  try {
    if (fallbackRenderer === null) {
      fallbackRenderer = createFallbackRenderer();
    }

    return initializeSharedKtx2Loader(fallbackRenderer);
  } catch (error) {
    throw new Error(
      `KTX2 texture support could not be initialized. WebGL compressed texture support is required to load KTX2 model textures. ${getErrorDetail(error)}`
    );
  }
}
