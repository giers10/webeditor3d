export function shouldAutoCapturePointerLockOnActivate(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor;
  const isSafari =
    vendor.includes("Apple") &&
    userAgent.includes("Safari/") &&
    !userAgent.includes("Chrome/") &&
    !userAgent.includes("Chromium/") &&
    !userAgent.includes("CriOS/") &&
    !userAgent.includes("Edg/") &&
    !userAgent.includes("OPR/") &&
    !userAgent.includes("Firefox/");

  return !isSafari;
}
