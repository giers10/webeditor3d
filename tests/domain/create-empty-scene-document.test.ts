import { describe, expect, it } from "vitest";

import { SCENE_DOCUMENT_VERSION, createEmptySceneDocument } from "../../src/document/scene-document";
import { STARTER_MATERIAL_LIBRARY } from "../../src/materials/starter-material-library";

describe("createEmptySceneDocument", () => {
  it("creates a versioned empty scene document", () => {
    const document = createEmptySceneDocument();

    expect(document.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(document.name).toBe("Untitled Scene");
    expect(document.world).toEqual({
      background: {
        mode: "solid",
        colorHex: "#2f3947"
      },
      ambientLight: {
        colorHex: "#f7f1e8",
        intensity: 1
      },
      sunLight: {
        colorHex: "#fff1d5",
        intensity: 1.75,
        direction: {
          x: -0.6,
          y: 1,
          z: 0.35
        }
      },
      advancedRendering: {
        enabled: false,
        shadows: {
          enabled: false,
          mapSize: 2048,
          type: "pcfSoft",
          bias: -0.0005
        },
        ambientOcclusion: {
          enabled: false,
          intensity: 1,
          radius: 0.5,
          samples: 8
        },
        bloom: {
          enabled: false,
          intensity: 0.75,
          threshold: 0.85,
          radius: 0.35
        },
        toneMapping: {
          mode: "acesFilmic",
          exposure: 1
        },
        depthOfField: {
          enabled: false,
          focusDistance: 10,
          focalLength: 0.03,
          bokehScale: 1.5
        },
        whiteboxBevel: {
          enabled: false,
          edgeWidth: 0.14,
          normalStrength: 0.75
        },
        fogPath: "performance",
        waterPath: "performance",
        waterReflectionMode: "none"
      }
    });
    expect(document.brushes).toEqual({});
    expect(document.entities).toEqual({});
    expect(document.modelInstances).toEqual({});
    expect(document.interactionLinks).toEqual({});
    expect(Object.keys(document.materials)).toEqual(STARTER_MATERIAL_LIBRARY.map((material) => material.id));
  });
});
