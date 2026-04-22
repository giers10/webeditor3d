import {
  OrthographicCamera,
  PerspectiveCamera
} from "three";
import { describe, expect, it } from "vitest";

import {
  fitCelestialDirectionalShadow,
  resolveDominantCelestialShadowCaster
} from "../../src/rendering/celestial-shadows";

describe("celestial shadows", () => {
  it("chooses one deterministic dominant celestial shadow caster", () => {
    const sun = {
      colorHex: "#fff1d5",
      intensity: 1.6,
      direction: {
        x: 0.45,
        y: 0.88,
        z: 0.15
      }
    };
    const moon = {
      colorHex: "#99b5ff",
      intensity: 0.4,
      direction: {
        x: -0.45,
        y: 0.72,
        z: -0.2
      }
    };

    expect(resolveDominantCelestialShadowCaster(sun, moon)?.key).toBe("sun");
    expect(
      resolveDominantCelestialShadowCaster(
        {
          ...sun,
          intensity: 0.1
        },
        {
          ...moon,
          intensity: 0.35
        }
      )?.key
    ).toBe("moon");
    expect(
      resolveDominantCelestialShadowCaster(
        {
          ...sun,
          intensity: 0
        },
        null
      )
    ).toBeNull();
  });

  it("fits a bounded perspective shadow volume around the active view", () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    camera.position.set(0, 12, 24);
    camera.lookAt(0, 4, 0);
    camera.updateMatrixWorld();

    const fit = fitCelestialDirectionalShadow({
      activeCamera: camera,
      focusTarget: {
        center: {
          x: 0,
          y: 4,
          z: 0
        },
        radius: 6
      },
      lightDirection: {
        x: 0.45,
        y: 0.88,
        z: 0.15
      },
      mapSize: 2048,
      sceneBounds: {
        min: {
          x: -500,
          y: -10,
          z: -500
        },
        max: {
          x: 500,
          y: 40,
          z: 500
        }
      }
    });

    expect(fit).not.toBeNull();
    expect(fit?.cameraBounds.right).toBeGreaterThan(0);
    expect(fit?.cameraBounds.top).toBeGreaterThan(0);
    expect((fit?.cameraBounds.right ?? 0) - (fit?.cameraBounds.left ?? 0)).toBeGreaterThan(30);
    expect((fit?.cameraBounds.right ?? 0) - (fit?.cameraBounds.left ?? 0)).toBeLessThan(280);
    expect(fit?.cameraBounds.far).toBeGreaterThan(fit?.cameraBounds.near ?? 0);
    expect(fit?.normalBias ?? 0).toBeGreaterThan(0);
  });

  it("fits orthographic viewport shadows without collapsing depth coverage", () => {
    const camera = new OrthographicCamera(-12, 12, 10, -10, 0.1, 1000);
    camera.position.set(0, 30, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const fit = fitCelestialDirectionalShadow({
      activeCamera: camera,
      focusTarget: {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        radius: 8
      },
      lightDirection: {
        x: -0.25,
        y: 0.92,
        z: 0.3
      },
      mapSize: 1024,
      sceneBounds: {
        min: {
          x: -40,
          y: -2,
          z: -40
        },
        max: {
          x: 40,
          y: 18,
          z: 40
        }
      }
    });

    expect(fit).not.toBeNull();
    expect((fit?.cameraBounds.right ?? 0) - (fit?.cameraBounds.left ?? 0)).toBeGreaterThan(20);
    expect((fit?.cameraBounds.top ?? 0) - (fit?.cameraBounds.bottom ?? 0)).toBeGreaterThan(20);
    expect(fit?.cameraBounds.far).toBeGreaterThan(20);
  });
});
