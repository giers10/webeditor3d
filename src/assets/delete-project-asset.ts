import type { ProjectDocument, ProjectScene } from "../document/scene-document";
import { createDefaultWorldSettings } from "../document/world-settings";

import type { ProjectAssetRecord } from "./project-assets";

function removeInvalidatedInteractionLinks(
  interactionLinks: ProjectScene["interactionLinks"],
  removedModelInstanceIds: ReadonlySet<string>,
  silencedSoundEmitterIds: ReadonlySet<string>
): ProjectScene["interactionLinks"] {
  let didChange = false;
  const nextInteractionLinks: ProjectScene["interactionLinks"] = {};

  for (const [linkId, link] of Object.entries(interactionLinks)) {
    const shouldRemove = (() => {
      switch (link.action.type) {
        case "playAnimation":
        case "stopAnimation":
          return removedModelInstanceIds.has(link.action.targetModelInstanceId);
        case "playSound":
        case "stopSound":
          return silencedSoundEmitterIds.has(link.action.targetSoundEmitterId);
        default:
          return false;
      }
    })();

    if (shouldRemove) {
      didChange = true;
      continue;
    }

    nextInteractionLinks[linkId] = link;
  }

  return didChange ? nextInteractionLinks : interactionLinks;
}

function cleanupSceneForDeletedAsset(
  scene: ProjectScene,
  asset: ProjectAssetRecord
): ProjectScene {
  let nextWorld = scene.world;
  let nextModelInstances = scene.modelInstances;
  let nextEntities = scene.entities;
  const removedModelInstanceIds = new Set<string>();
  const silencedSoundEmitterIds = new Set<string>();

  if (
    asset.kind === "image" &&
    scene.world.background.mode === "image" &&
    scene.world.background.assetId === asset.id
  ) {
    nextWorld = {
      ...scene.world,
      background: createDefaultWorldSettings().background
    };
  }

  if (asset.kind === "model") {
    const remainingModelInstances: ProjectScene["modelInstances"] = {};
    const updatedEntities: ProjectScene["entities"] = {};
    let didChangeEntities = false;

    for (const [modelInstanceId, modelInstance] of Object.entries(
      scene.modelInstances
    )) {
      if (modelInstance.assetId === asset.id) {
        removedModelInstanceIds.add(modelInstanceId);
        continue;
      }

      remainingModelInstances[modelInstanceId] = modelInstance;
    }

    if (removedModelInstanceIds.size > 0) {
      nextModelInstances = remainingModelInstances;
    }

    for (const [entityId, entity] of Object.entries(scene.entities)) {
      if (entity.kind === "npc" && entity.modelAssetId === asset.id) {
        updatedEntities[entityId] = {
          ...entity,
          modelAssetId: null
        };
        didChangeEntities = true;
        continue;
      }

      updatedEntities[entityId] = entity;
    }

    if (didChangeEntities) {
      nextEntities = updatedEntities;
    }
  }

  if (asset.kind === "audio") {
    const updatedEntities: ProjectScene["entities"] = {};
    let didChangeEntities = false;

    for (const [entityId, entity] of Object.entries(scene.entities)) {
      if (entity.kind === "soundEmitter" && entity.audioAssetId === asset.id) {
        silencedSoundEmitterIds.add(entityId);
        updatedEntities[entityId] = {
          ...entity,
          audioAssetId: null,
          autoplay: false
        };
        didChangeEntities = true;
        continue;
      }

      updatedEntities[entityId] = entity;
    }

    if (didChangeEntities) {
      nextEntities = updatedEntities;
    }
  }

  const nextInteractionLinks = removeInvalidatedInteractionLinks(
    scene.interactionLinks,
    removedModelInstanceIds,
    silencedSoundEmitterIds
  );

  if (
    nextWorld === scene.world &&
    nextModelInstances === scene.modelInstances &&
    nextEntities === scene.entities &&
    nextInteractionLinks === scene.interactionLinks
  ) {
    return scene;
  }

  return {
    ...scene,
    world: nextWorld,
    modelInstances: nextModelInstances,
    entities: nextEntities,
    interactionLinks: nextInteractionLinks
  };
}

export function deleteProjectAssetFromProjectDocument(
  projectDocument: ProjectDocument,
  assetId: string
): ProjectDocument {
  const asset = projectDocument.assets[assetId];

  if (asset === undefined) {
    throw new Error(`Project asset ${assetId} does not exist.`);
  }

  const nextAssets = {
    ...projectDocument.assets
  };
  delete nextAssets[assetId];

  const nextScenes: ProjectDocument["scenes"] = {};
  let didChangeScenes = false;

  for (const [sceneId, scene] of Object.entries(projectDocument.scenes)) {
    const nextScene = cleanupSceneForDeletedAsset(scene, asset);
    nextScenes[sceneId] = nextScene;
    didChangeScenes ||= nextScene !== scene;
  }

  return {
    ...projectDocument,
    assets: nextAssets,
    scenes: didChangeScenes ? nextScenes : projectDocument.scenes
  };
}