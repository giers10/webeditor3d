import { BackSide, ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";

import { createFogQualityMaterial } from "../../src/rendering/fog-material";

describe("fog quality material", () => {
  it("builds a raymarched volumetric shader that stays animated through a shared time uniform", () => {
    const result = createFogQualityMaterial({
      colorHex: "#99aac4",
      density: 0.55,
      padding: 0.25,
      time: 1.5,
      halfSize: {
        x: 2,
        y: 1.5,
        z: 1
      }
    });

    expect(result.material).toBeInstanceOf(ShaderMaterial);

    const material = result.material as ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.fog).toBe(true);
    expect(material.side).toBe(BackSide);
    expect(material.uniforms["volumeFogDensity"]?.value).toBe(0.55);
    expect(material.uniforms["volumePadding"]?.value).toBeCloseTo(0.25, 5);
    expect(material.uniforms["volumeHalfSize"]?.value).toMatchObject({ x: 2, y: 1.5, z: 1 });
    expect(material.uniforms["localCameraPosition"]?.value).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(material.fragmentShader).toContain("intersectBox");
    expect(material.fragmentShader).toContain("sampleVolumeDensity");
    expect(material.fragmentShader).toContain("FOG_STEPS 10");
    expect(material.fragmentShader).toContain("uniform vec3 localCameraPosition");
    expect(result.animationUniform).toBe(material.uniforms["time"]);

    result.animationUniform.value = 3.25;
    expect(material.uniforms["time"]?.value).toBe(3.25);
  });

  it("clamps oversized padding and exposes viewport emphasis controls", () => {
    const result = createFogQualityMaterial({
      colorHex: "#c2d8f4",
      density: 0.4,
      padding: 10,
      time: 0,
      halfSize: {
        x: 1,
        y: 0.5,
        z: 0.75
      },
      opacityMultiplier: 1.3,
      colorLift: 0.2
    });

    const material = result.material as ShaderMaterial;
    expect(material.uniforms["volumePadding"]?.value).toBeCloseTo(0.41, 5);
    expect(material.uniforms["opacityMultiplier"]?.value).toBe(1.3);
    expect(material.uniforms["colorLift"]?.value).toBe(0.2);
    expect(material.vertexShader).toContain("vLocalPosition");
  });
});