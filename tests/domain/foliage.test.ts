import { describe, expect, it } from "vitest";

import {
  createProjectAssetStorageKey,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import {
  createEmptySceneDocument,
  createSceneDocumentFromProject,
  createEmptyProjectDocument
} from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import { BUNDLED_FOLIAGE_PROTOTYPES } from "../../src/foliage/bundled-foliage-manifest";
import {
  FOLIAGE_PROTOTYPE_LOD_LEVELS,
  createFoliageLayer,
  createFoliagePrototype,
  type FoliagePrototypeLod
} from "../../src/foliage/foliage";

function createModelAsset(id: string): ModelAssetRecord {
  return {
    id,
    kind: "model",
    sourceName: `${id}.glb`,
    mimeType: "model/gltf-binary",
    storageKey: createProjectAssetStorageKey(id),
    byteLength: 1024,
    metadata: {
      kind: "model",
      format: "glb",
      sceneName: null,
      nodeCount: 1,
      meshCount: 1,
      materialNames: [],
      textureNames: [],
      animationNames: [],
      boundingBox: null,
      warnings: []
    }
  };
}

function createProjectAssetLods(modelAssetId: string): FoliagePrototypeLod[] {
  return FOLIAGE_PROTOTYPE_LOD_LEVELS.map((level) => ({
    level,
    source: "projectAsset",
    modelAssetId,
    maxDistance: 20 + level * 20,
    castShadow: level < 2
  }));
}

describe("foliage document foundations", () => {
  it("accepts scene foliage layers that reference bundled prototype ids", () => {
    const bundledPrototype = BUNDLED_FOLIAGE_PROTOTYPES[0];
    const document = createEmptySceneDocument();
    const layer = createFoliageLayer({
      id: "foliage-layer-meadow",
      name: "Meadow",
      prototypeIds: [bundledPrototype.id]
    });

    document.foliageLayers[layer.id] = layer;

    expect(validateSceneDocument(document).errors).toEqual([]);
  });

  it("accepts custom project-asset sourced foliage prototypes", () => {
    const modelAsset = createModelAsset("asset-custom-foliage");
    const document = createEmptySceneDocument();
    const prototype = createFoliagePrototype({
      id: "foliage-custom-clover",
      label: "Custom Clover",
      category: "grass",
      lods: createProjectAssetLods(modelAsset.id)
    });
    const layer = createFoliageLayer({
      id: "foliage-layer-custom",
      name: "Custom Foliage",
      prototypeIds: [prototype.id]
    });

    document.assets[modelAsset.id] = modelAsset;
    document.foliagePrototypes[prototype.id] = prototype;
    document.foliageLayers[layer.id] = layer;

    expect(validateSceneDocument(document).errors).toEqual([]);
  });

  it("validates layer ranges and prototype references", () => {
    const document = createEmptySceneDocument();
    const layer = createFoliageLayer({
      id: "foliage-layer-invalid",
      name: "Invalid",
      prototypeIds: ["missing-foliage-prototype"]
    });

    document.foliageLayers[layer.id] = {
      ...layer,
      minScale: 2,
      maxScale: 1,
      maxSlopeDegrees: 120,
      noiseStrength: 1.5
    };

    expect(validateSceneDocument(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid-foliage-layer-scale-range" }),
        expect.objectContaining({ code: "invalid-foliage-layer-max-slope" }),
        expect.objectContaining({
          code: "invalid-foliage-layer-noise-strength"
        }),
        expect.objectContaining({ code: "missing-foliage-layer-prototype" })
      ])
    );
  });

  it("validates custom project-asset LOD references", () => {
    const document = createEmptySceneDocument();
    const prototype = createFoliagePrototype({
      id: "foliage-missing-model",
      label: "Missing Model",
      category: "other",
      lods: createProjectAssetLods("asset-missing")
    });

    document.foliagePrototypes[prototype.id] = prototype;

    expect(validateSceneDocument(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-foliage-prototype-model-asset"
        })
      ])
    );
  });

  it("keeps project custom prototypes global and layers scene-local", () => {
    const modelAsset = createModelAsset("asset-project-foliage");
    const project = createEmptyProjectDocument({
      assets: {
        [modelAsset.id]: modelAsset
      }
    });
    const prototype = createFoliagePrototype({
      id: "foliage-project-reed",
      label: "Project Reed",
      category: "grass",
      lods: createProjectAssetLods(modelAsset.id)
    });
    const layer = createFoliageLayer({
      id: "foliage-layer-project-reed",
      name: "Project Reed Layer",
      prototypeIds: [prototype.id]
    });

    project.foliagePrototypes[prototype.id] = prototype;
    project.scenes[project.activeSceneId]!.foliageLayers[layer.id] = layer;

    const sceneDocument = createSceneDocumentFromProject(project);

    expect(sceneDocument.foliagePrototypes).toEqual(project.foliagePrototypes);
    expect(sceneDocument.foliageLayers).toEqual(
      project.scenes[project.activeSceneId]!.foliageLayers
    );
    expect(validateSceneDocument(sceneDocument).errors).toEqual([]);
  });
});
