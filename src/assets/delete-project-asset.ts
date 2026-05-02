import type { ProjectDocument, ProjectScene } from "../document/scene-document";
import { createDefaultWorldSettings } from "../document/world-settings";
import { foliagePrototypeReferencesProjectAsset } from "../foliage/foliage";

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
        case "control":
          switch (link.action.effect.type) {
            case "setProjectTimePaused":
            case "activateCameraRigOverride":
            case "clearCameraRigOverride":
            case "setActorPresence":
            case "playActorAnimation":
            case "followActorPath":
              return false;
            case "playModelAnimation":
            case "stopModelAnimation":
            case "setModelInstanceVisible":
              return removedModelInstanceIds.has(
                link.action.effect.target.modelInstanceId
              );
            case "playSound":
            case "stopSound":
              return silencedSoundEmitterIds.has(
                link.action.effect.target.entityId
              );
            case "setSoundVolume":
            case "setInteractionEnabled":
            case "setLightEnabled":
            case "setLightIntensity":
            case "setLightColor":
            case "setAmbientLightIntensity":
            case "setAmbientLightColor":
            case "setSunLightIntensity":
            case "setSunLightColor":
              return false;
          }
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
  asset: ProjectAssetRecord,
  removedFoliagePrototypeIds: ReadonlySet<string>
): ProjectScene {
  let nextWorld = scene.world;
  let nextModelInstances = scene.modelInstances;
  let nextEntities = scene.entities;
  let nextFoliageLayers = scene.foliageLayers;
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

  if (asset.kind === "image") {
    const nextTimeOfDay = { ...nextWorld.timeOfDay };
    let didChangeTimeOfDay = false;

    for (const phase of ["dawn", "dusk"] as const) {
      const profile = nextTimeOfDay[phase];
      if (
        profile.background.mode === "image" &&
        profile.background.assetId === asset.id
      ) {
        nextTimeOfDay[phase] = {
          ...profile,
          background: {
            ...profile.background,
            assetId: ""
          }
        };
        didChangeTimeOfDay = true;
      }
    }

    if (didChangeTimeOfDay) {
      nextWorld = {
        ...nextWorld,
        timeOfDay: nextTimeOfDay
      };
    }
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

  if (removedFoliagePrototypeIds.size > 0) {
    const updatedFoliageLayers: ProjectScene["foliageLayers"] = {};
    let didChangeFoliageLayers = false;

    for (const [layerId, layer] of Object.entries(scene.foliageLayers)) {
      const nextPrototypeIds = layer.prototypeIds.filter(
        (prototypeId) => !removedFoliagePrototypeIds.has(prototypeId)
      );

      if (nextPrototypeIds.length !== layer.prototypeIds.length) {
        updatedFoliageLayers[layerId] = {
          ...layer,
          prototypeIds: nextPrototypeIds
        };
        didChangeFoliageLayers = true;
        continue;
      }

      updatedFoliageLayers[layerId] = layer;
    }

    if (didChangeFoliageLayers) {
      nextFoliageLayers = updatedFoliageLayers;
    }
  }

  if (
    nextWorld === scene.world &&
    nextModelInstances === scene.modelInstances &&
    nextEntities === scene.entities &&
    nextFoliageLayers === scene.foliageLayers &&
    nextInteractionLinks === scene.interactionLinks
  ) {
    return scene;
  }

  return {
    ...scene,
    world: nextWorld,
    modelInstances: nextModelInstances,
    entities: nextEntities,
    foliageLayers: nextFoliageLayers,
    interactionLinks: nextInteractionLinks
  };
}

function cleanupFoliagePrototypesForDeletedAsset(
  foliagePrototypes: ProjectDocument["foliagePrototypes"],
  asset: ProjectAssetRecord
): {
  foliagePrototypes: ProjectDocument["foliagePrototypes"];
  removedFoliagePrototypeIds: ReadonlySet<string>;
} {
  if (asset.kind !== "model") {
    return {
      foliagePrototypes,
      removedFoliagePrototypeIds: new Set()
    };
  }

  const nextFoliagePrototypes: ProjectDocument["foliagePrototypes"] = {};
  const removedFoliagePrototypeIds = new Set<string>();

  for (const [prototypeId, prototype] of Object.entries(foliagePrototypes)) {
    if (foliagePrototypeReferencesProjectAsset(prototype, asset.id)) {
      removedFoliagePrototypeIds.add(prototypeId);
      continue;
    }

    nextFoliagePrototypes[prototypeId] = prototype;
  }

  return {
    foliagePrototypes:
      removedFoliagePrototypeIds.size > 0
        ? nextFoliagePrototypes
        : foliagePrototypes,
    removedFoliagePrototypeIds
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

  const foliageCleanup = cleanupFoliagePrototypesForDeletedAsset(
    projectDocument.foliagePrototypes,
    asset
  );
  const nextScenes: ProjectDocument["scenes"] = {};
  let didChangeScenes = false;

  for (const [sceneId, scene] of Object.entries(projectDocument.scenes)) {
    const nextScene = cleanupSceneForDeletedAsset(
      scene,
      asset,
      foliageCleanup.removedFoliagePrototypeIds
    );
    nextScenes[sceneId] = nextScene;
    didChangeScenes ||= nextScene !== scene;
  }

  return {
    ...projectDocument,
    assets: nextAssets,
    foliagePrototypes: foliageCleanup.foliagePrototypes,
    scenes: didChangeScenes ? nextScenes : projectDocument.scenes
  };
}
