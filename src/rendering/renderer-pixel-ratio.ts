const DEFAULT_MAX_RENDERER_PIXEL_RATIO = 2;
const SAFARI_MAX_RENDERER_PIXEL_RATIO = 1;

export function isSafariUserAgent(userAgent: string): boolean {
  return (
    userAgent.includes("Safari/") &&
    !userAgent.includes("Chrome/") &&
    !userAgent.includes("Chromium/") &&
    !userAgent.includes("CriOS/") &&
    !userAgent.includes("Edg/") &&
    !userAgent.includes("OPR/") &&
    !userAgent.includes("Firefox/")
  );
}

export function resolveRendererPixelRatio(options: {
  devicePixelRatio: number;
  userAgent: string;
}): number {
  const devicePixelRatio = Number.isFinite(options.devicePixelRatio)
    ? Math.max(1, options.devicePixelRatio)
    : 1;
  const maxPixelRatio = isSafariUserAgent(options.userAgent)
    ? SAFARI_MAX_RENDERER_PIXEL_RATIO
    : DEFAULT_MAX_RENDERER_PIXEL_RATIO;

  return Math.min(devicePixelRatio, maxPixelRatio);
}

export function getRendererPixelRatio(): number {
  return resolveRendererPixelRatio({
    devicePixelRatio:
      typeof window === "undefined" ? 1 : window.devicePixelRatio,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent
  });
}
