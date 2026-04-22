import { Texture } from "three";
import { describe, expect, it, vi } from "vitest";

import {
  createQuantizedEnvironmentBlendCacheKey,
  getQuantizedEnvironmentBlendAmount,
  QuantizedEnvironmentBlendCache,
  quantizeEnvironmentBlendBucket
} from "../../src/rendering/quantized-environment-blend-cache";

describe("quantized environment blend cache helpers", () => {
  it("quantizes twilight blend amounts into fixed buckets", () => {
    expect(quantizeEnvironmentBlendBucket(0, 8)).toBe(0);
    expect(quantizeEnvironmentBlendBucket(0.24, 8)).toBe(2);
    expect(quantizeEnvironmentBlendBucket(0.51, 8)).toBe(4);
    expect(quantizeEnvironmentBlendBucket(1, 8)).toBe(8);
    expect(getQuantizedEnvironmentBlendAmount(5, 8)).toBeCloseTo(0.625);
  });

  it("keys cached blends by ordered source pair and bucket", () => {
    const dayTexture = new Texture();
    const nightTexture = new Texture();

    expect(
      createQuantizedEnvironmentBlendCacheKey(dayTexture, nightTexture, 3)
    ).not.toBe(
      createQuantizedEnvironmentBlendCacheKey(nightTexture, dayTexture, 3)
    );
    expect(
      createQuantizedEnvironmentBlendCacheKey(dayTexture, nightTexture, 2)
    ).not.toBe(
      createQuantizedEnvironmentBlendCacheKey(dayTexture, nightTexture, 3)
    );
  });
});

describe("QuantizedEnvironmentBlendCache", () => {
  it("queues exact bucket builds, reuses the nearest cached bucket while pending, and disposes cached entries", () => {
    const scheduledBuilds: Array<() => void> = [];
    const disposeSpies: Array<ReturnType<typeof vi.fn>> = [];
    const buildBlendTexture = vi.fn(
      (
        _baseTexture: Texture,
        _overlayTexture: Texture,
        _blendAmount: number
      ) => {
        const dispose = vi.fn();
        disposeSpies.push(dispose);

        return {
          texture: new Texture(),
          dispose
        };
      }
    );
    const onTextureReady = vi.fn();
    const cache = new QuantizedEnvironmentBlendCache({
      bucketCount: 8,
      buildBlendTexture,
      onTextureReady,
      scheduleBuild: (callback) => {
        scheduledBuilds.push(callback);
      }
    });
    const dayTexture = new Texture();
    const nightTexture = new Texture();

    expect(cache.resolveBlendTexture(dayTexture, nightTexture, 0.26)).toBeNull();
    expect(buildBlendTexture).not.toHaveBeenCalled();
    expect(scheduledBuilds).toHaveLength(1);

    scheduledBuilds.shift()?.();

    expect(buildBlendTexture).toHaveBeenCalledWith(
      dayTexture,
      nightTexture,
      0.25
    );
    expect(onTextureReady).toHaveBeenCalledTimes(1);

    const firstBlendTexture = cache.resolveBlendTexture(
      dayTexture,
      nightTexture,
      0.24
    );

    expect(firstBlendTexture).not.toBeNull();
    expect(
      cache.resolveBlendTexture(dayTexture, nightTexture, 0.62)
    ).toBe(firstBlendTexture);
    expect(scheduledBuilds).toHaveLength(1);

    scheduledBuilds.shift()?.();

    const laterBlendTexture = cache.resolveBlendTexture(
      dayTexture,
      nightTexture,
      0.62
    );

    expect(laterBlendTexture).not.toBe(firstBlendTexture);
    expect(onTextureReady).toHaveBeenCalledTimes(2);

    cache.clear();

    expect(disposeSpies).toHaveLength(2);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);
    expect(disposeSpies[1]).toHaveBeenCalledTimes(1);
  });

  it("returns the authored single-image environment at the quantized endpoints and disposes builder resources", () => {
    const disposeBuildResources = vi.fn();
    const buildBlendTexture = vi.fn();
    const cache = new QuantizedEnvironmentBlendCache({
      bucketCount: 8,
      buildBlendTexture,
      disposeBuildResources,
      scheduleBuild: () => undefined
    });
    const dayTexture = new Texture();
    const nightTexture = new Texture();

    expect(cache.resolveBlendTexture(dayTexture, nightTexture, 0.01)).toBe(
      dayTexture
    );
    expect(cache.resolveBlendTexture(dayTexture, nightTexture, 0.99)).toBe(
      nightTexture
    );
    expect(buildBlendTexture).not.toHaveBeenCalled();

    cache.dispose();

    expect(disposeBuildResources).toHaveBeenCalledTimes(1);
  });
});
