import { describe, expect, it } from "vitest";

import {
  isSafariUserAgent,
  resolveRendererPixelRatio
} from "../../src/rendering/renderer-pixel-ratio";

describe("renderer pixel ratio", () => {
  it("caps Safari renderer pixel ratio more aggressively", () => {
    const safariUserAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

    expect(isSafariUserAgent(safariUserAgent)).toBe(true);
    expect(
      resolveRendererPixelRatio({
        devicePixelRatio: 2,
        userAgent: safariUserAgent
      })
    ).toBe(1);
  });

  it("keeps the existing non-Safari high-DPI cap", () => {
    const chromeUserAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    expect(isSafariUserAgent(chromeUserAgent)).toBe(false);
    expect(
      resolveRendererPixelRatio({
        devicePixelRatio: 3,
        userAgent: chromeUserAgent
      })
    ).toBe(2);
  });
});
