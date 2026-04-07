import { ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";

import { MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT } from "../../src/document/brushes";
import { createBoxBrush } from "../../src/document/brushes";
import { buildBoxBrushDerivedMeshData } from "../../src/geometry/box-brush-mesh";
import { collectWaterContactPatches, createWaterMaterial } from "../../src/rendering/water-material";

describe("water material helpers", () => {
  it("builds contact foam patches for bounds that cross the water surface", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 8
        }
      },
      [
        {
          min: {
            x: -1,
            y: 0.8,
            z: -0.75
          },
          max: {
            x: 1,
            y: 1.35,
            z: 0.75
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]?.shape).toBe("box");
    expect(patches[0]?.x).toBeCloseTo(0, 5);
    expect(patches[0]?.z).toBeCloseTo(0, 5);
    expect(patches[0]?.halfWidth).toBeGreaterThan(0.9);
    expect(patches[0]?.halfDepth).toBeGreaterThan(0.7);
  });

  it("ignores bounds that do not overlap the water surface band", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 6,
          y: 2,
          z: 6
        }
      },
      [
        {
          min: {
            x: -1,
            y: -3,
            z: -1
          },
          max: {
            x: 1,
            y: -2,
            z: 1
          }
        }
      ]
    );

    expect(patches).toHaveLength(0);
  });

  it("preserves oriented contact regions for rotated boxes", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 2,
            y: 0.4,
            z: 1
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(Math.abs(patches[0]?.axisX ?? 0)).toBeGreaterThan(0.65);
    expect(Math.abs(patches[0]?.axisZ ?? 0)).toBeGreaterThan(0.65);
  });

  it("clips rotated contact regions to the water footprint", () => {
    const centeredPatch = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 0,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 3,
            y: 0.4,
            z: 1
          }
        }
      ]
    )[0];
    const clippedPatch = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          kind: "orientedBox",
          center: {
            x: 2.2,
            y: 1,
            z: 0
          },
          rotationDegrees: {
            x: 0,
            y: 45,
            z: 0
          },
          size: {
            x: 3,
            y: 0.4,
            z: 1
          }
        }
      ]
    )[0];

    expect(centeredPatch).toBeDefined();
    expect(clippedPatch).toBeDefined();
    expect(clippedPatch?.x ?? 999).toBeLessThan(2);
    expect((clippedPatch?.halfWidth ?? 0) * (clippedPatch?.halfDepth ?? 0)).toBeLessThan(
      (centeredPatch?.halfWidth ?? 0) * (centeredPatch?.halfDepth ?? 0)
    );
    expect(Math.abs(clippedPatch?.axisX ?? 0)).toBeGreaterThan(0.65);
    expect(Math.abs(clippedPatch?.axisZ ?? 0)).toBeGreaterThan(0.65);
  });

  it("creates a foam patch when a bounds source only touches the water footprint edge", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          min: {
            x: 2,
            y: 0.8,
            z: -0.7
          },
          max: {
            x: 3,
            y: 1.2,
            z: 0.7
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]?.x).toBeCloseTo(2, 5);
    expect(patches[0]?.halfWidth ?? 0).toBeGreaterThan(0.65);
    expect(patches[0]?.halfDepth ?? 0).toBeGreaterThan(0);
  });

  it("builds contact patches for transformed triangle meshes that cross the water surface", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 8,
          y: 2,
          z: 8
        }
      },
      [
        {
          kind: "triangleMesh",
          vertices: new Float32Array([
            -1, 0, -1,
            1, 0, -1,
            1, 0, 1,
            -1, 0, 1
          ]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
          transform: {
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            rotationDegrees: {
              x: 35,
              y: 28,
              z: 18
            },
            scale: {
              x: 2,
              y: 1,
              z: 1.4
            }
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
  expect(patches[0]?.shape).toBe("segment");
    expect(patches[0]?.halfWidth ?? 0).toBeGreaterThan(0.2);
    expect(Math.abs(patches[0]?.axisX ?? 0)).toBeGreaterThan(0.2);
    expect(Math.abs(patches[0]?.axisZ ?? 0)).toBeGreaterThan(0.2);
    expect(patches[0]?.halfDepth ?? 1).toBeLessThan(0.3);
  });

  it("creates foam for triangle mesh waterlines clipped to the water footprint edge", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 4,
          y: 2,
          z: 4
        }
      },
      [
        {
          kind: "triangleMesh",
          vertices: new Float32Array([
            1.6, -0.3, -0.8,
            2.4, 0.3, -0.8,
            2.4, 0.3, 0.8,
            1.6, -0.3, 0.8
          ]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
          transform: {
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            rotationDegrees: {
              x: 0,
              y: 0,
              z: 0
            },
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      ]
    );

    expect(patches.length).toBeGreaterThan(0);
    expect(patches[0]?.halfDepth ?? 0).toBeGreaterThan(0);
  });

  it("uses narrow waterline bands for large sloped triangle surfaces", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 12,
          y: 2,
          z: 12
        }
      },
      [
        {
          kind: "triangleMesh",
          mergeProfile: "aggressive",
          vertices: new Float32Array([
            -4, -1, -3,
            4, 1.4, -3,
            4, 1.4, 3,
            -4, -1, 3
          ]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
          transform: {
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            rotationDegrees: {
              x: 0,
              y: 0,
              z: 0
            },
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
  expect(patches[0]?.shape).toBe("segment");
    expect(patches[0]?.halfWidth ?? 0).toBeGreaterThan(1.5);
    expect(patches[0]?.halfDepth ?? 1).toBeLessThan(0.3);
  });

  it("merges adjacent triangle mesh strips into one longer foam band", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [
        {
          kind: "triangleMesh",
          mergeProfile: "aggressive",
          vertices: new Float32Array([
            -2, 0, -1,
            0, 0, -1,
            0, 0, 1,
            -2, 0, 1,
            2, 0, -1,
            2, 0, 1
          ]),
          indices: new Uint32Array([
            0, 1, 2,
            0, 2, 3,
            1, 4, 5,
            1, 5, 2
          ]),
          transform: {
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            rotationDegrees: {
              x: 32,
              y: 20,
              z: 12
            },
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      ]
    );

    expect(patches).toHaveLength(1);
    expect(patches[0]?.halfWidth ?? 0).toBeGreaterThan(1.2);
    expect(patches[0]?.halfDepth ?? 0).toBeGreaterThan(0.05);
  });

  it("keeps foam patches for both long and short edges of a box intersecting the water surface", () => {
    const intersectingBox = createBoxBrush({
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      size: {
        x: 4,
        y: 4,
        z: 2
      }
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(intersectingBox);

    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [
        {
          kind: "triangleMesh",
          vertices: derivedMesh.colliderVertices,
          indices: derivedMesh.colliderIndices,
          transform: {
            position: intersectingBox.center,
            rotationDegrees: intersectingBox.rotationDegrees,
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      ]
    );

    expect(patches.length).toBeGreaterThanOrEqual(4);

    const sortedByWidth = [...patches].sort((left, right) => right.halfWidth - left.halfWidth);
    const longEdgeHalfWidth = sortedByWidth[0]?.halfWidth ?? 0;
    const shortEdgeHalfWidth = sortedByWidth[sortedByWidth.length - 1]?.halfWidth ?? 0;

    expect(longEdgeHalfWidth).toBeGreaterThan(1.7);
    expect(shortEdgeHalfWidth).toBeGreaterThan(0.7);
  });

  it("only uses aggressive merging for explicitly marked triangle meshes", () => {
    const sharedSource = {
      kind: "triangleMesh" as const,
      vertices: new Float32Array([
        -0.4, -0.3, -2,
        -0.25, 0.3, -2,
        -0.25, 0.3, 2,
        -0.4, -0.3, 2,
        0.25, -0.3, -2,
        0.4, 0.3, -2,
        0.4, 0.3, 2,
        0.25, -0.3, 2
      ]),
      indices: new Uint32Array([
        0, 1, 2,
        0, 2, 3,
        4, 5, 6,
        4, 6, 7
      ]),
      transform: {
        position: {
          x: 0,
          y: 1,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        scale: {
          x: 1,
          y: 1,
          z: 1
        }
      }
    };

    const defaultPatches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [sharedSource]
    );
    const aggressivePatches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [{
        ...sharedSource,
        mergeProfile: "aggressive" as const
      }]
    );

    expect(defaultPatches.length).toBeGreaterThan(1);
    expect(aggressivePatches).toHaveLength(1);
  });

  it("does not merge sharply bent triangle mesh strips even in aggressive mode", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 10,
          y: 2,
          z: 10
        }
      },
      [
        {
          kind: "triangleMesh",
          mergeProfile: "aggressive",
          vertices: new Float32Array([
            -2, 0, -1,
            0, 0, -1,
            0, 0, 1,
            -2, 0, 1,
            2, 1.6, -1,
            2, 1.6, 1
          ]),
          indices: new Uint32Array([
            0, 1, 2,
            0, 2, 3,
            1, 4, 5,
            1, 5, 2
          ]),
          transform: {
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            rotationDegrees: {
              x: 0,
              y: 0,
              z: 0
            },
            scale: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      ]
    );

    expect(patches.length).toBeGreaterThan(1);
  });

  it("caps the authored foam contact patch count per water surface", () => {
    const patches = collectWaterContactPatches(
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        rotationDegrees: {
          x: 0,
          y: 0,
          z: 0
        },
        size: {
          x: 12,
          y: 2,
          z: 12
        }
      },
      [
        { min: { x: -5, y: 0.8, z: -1 }, max: { x: -4, y: 1.2, z: 1 } },
        { min: { x: -3, y: 0.8, z: -1 }, max: { x: -2, y: 1.2, z: 1 } },
        { min: { x: -1, y: 0.8, z: -1 }, max: { x: 0, y: 1.2, z: 1 } },
        { min: { x: 1, y: 0.8, z: -1 }, max: { x: 2, y: 1.2, z: 1 } }
      ],
      2
    );

    expect(patches).toHaveLength(2);
  });

  it("builds a shared quality shader material for visible tinted water", () => {
    const result = createWaterMaterial({
      colorHex: "#4da6d9",
      surfaceOpacity: 0.55,
      waveStrength: 0.35,
      opacity: 0.71,
      quality: true,
      wireframe: false,
      isTopFace: true,
      time: 0,
      halfSize: {
        x: 4,
        z: 4
      },
      contactPatches: [],
      reflection: {
        texture: null,
        enabled: true
      }
    });

    expect(result.material).toBeInstanceOf(ShaderMaterial);

    const material = result.material as ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.fog).toBe(true);
    expect(material.uniforms["fogColor"]).toBeDefined();
    expect(material.uniforms["fogDensity"]).toBeDefined();
    expect(material.uniforms["surfaceOpacity"]?.value).toBeGreaterThan(0.14);
    expect(material.uniforms["waveStrength"]?.value).toBe(0.35);
    expect(material.uniforms["surfaceDisplacementEnabled"]?.value).toBe(0);
    expect(material.uniforms["isTopFace"]?.value).toBe(1);
    expect(material.vertexShader).toContain("surfaceDisplacementEnabled");
    expect(result.contactPatchesUniform?.value).toHaveLength(MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT);
    expect(result.contactPatchShapesUniform?.value).toHaveLength(MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT);
    expect(result.reflectionTextureUniform).not.toBeNull();
    expect(result.reflectionMatrixUniform).not.toBeNull();
    expect(result.reflectionEnabledUniform?.value).toBe(0);
    expect(result.animationUniform).toBe(material.uniforms["time"]);
    expect(result.reflectionEnabledUniform).toBe(material.uniforms["reflectionEnabled"]);

    if (result.animationUniform !== null && result.reflectionEnabledUniform !== null) {
      result.animationUniform.value = 2.5;
      result.reflectionEnabledUniform.value = 0.36;
      expect(material.uniforms["time"]?.value).toBe(2.5);
      expect(material.uniforms["reflectionEnabled"]?.value).toBe(0.36);
    }
  });
});