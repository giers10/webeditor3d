import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { Vec3 } from "../core/vector";
import { getModelInstances } from "../assets/model-instances";
import {
  cloneBoxBrushGeometry,
  cloneBoxBrushVolumeSettings,
  cloneFaceUvState,
  type BoxBrush,
  type BoxBrushGeometry,
  type BoxBrushVolumeSettings,
  type BoxFaceId,
  type FaceUvState
} from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";
import { cloneWorldSettings, type WorldSettings } from "../document/world-settings";
import {
  getEntityInstances,
  getPrimaryPlayerStartEntity,
  type EntityInstance
} from "../entities/entity-instances";
import { getBoxBrushBounds } from "../geometry/box-brush";
import { buildBoxBrushDerivedMeshData } from "../geometry/box-brush-mesh";
import { buildGeneratedModelCollider, type GeneratedColliderBounds, type GeneratedModelCollider } from "../geometry/model-instance-collider-generation";
import { cloneInteractionLink, getInteractionLinks, type InteractionLink } from "../interactions/interaction-links";
import { cloneMaterialDef, type MaterialDef } from "../materials/starter-material-library";
import { assertRuntimeSceneBuildable } from "./runtime-scene-validation";
import { FIRST_PERSON_PLAYER_SHAPE, type FirstPersonPlayerShape } from "./player-collision";

export type RuntimeNavigationMode = "firstPerson" | "thirdPerson";

export interface RuntimeBrushFace {
  materialId: string | null;
  material: MaterialDef | null;
  uv: FaceUvState;
}

export interface RuntimeBoxBrushInstance {
  id: string;
  kind: "box";
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  geometry: BoxBrushGeometry;
  faces: Record<BoxFaceId, RuntimeBrushFace>;
  volume: BoxBrushVolumeSettings;
}

export interface RuntimeFogVolume {
  brushId: string;
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  colorHex: string;
  density: number;
  padding: number;
}

export interface RuntimeWaterVolume {
  brushId: string;
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  colorHex: string;
  surfaceOpacity: number;
  waveStrength: number;
}

export interface RuntimeBoxVolumeCollection {
  fog: RuntimeFogVolume[];
  water: RuntimeWaterVolume[];
}

export interface RuntimeBrushTriMeshCollider {
  kind: "trimesh";
  source: "brush";
  brushId: string;
  center: Vec3;
  rotationDegrees: Vec3;
  vertices: Float32Array;
  indices: Uint32Array;
  worldBounds: {
    min: Vec3;
    max: Vec3;
  };
}

export type RuntimeSceneCollider = RuntimeBrushTriMeshCollider | GeneratedModelCollider;

export interface RuntimeSceneBounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
}

export interface RuntimePlayerStart {
  entityId: string;
  position: Vec3;
  yawDegrees: number;
  navigationMode: RuntimeNavigationMode;
  collider: FirstPersonPlayerShape;
}

export interface RuntimeSceneEntry {
  entityId: string;
  position: Vec3;
  yawDegrees: number;
}

export interface RuntimeSoundEmitter {
  entityId: string;
  position: Vec3;
  audioAssetId: string | null;
  volume: number;
  refDistance: number;
  maxDistance: number;
  autoplay: boolean;
  loop: boolean;
}

export interface RuntimeTriggerVolume {
  entityId: string;
  position: Vec3;
  size: Vec3;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
}

export interface RuntimeTeleportTarget {
  entityId: string;
  position: Vec3;
  yawDegrees: number;
}

export interface RuntimeInteractable {
  entityId: string;
  position: Vec3;
  radius: number;
  prompt: string;
  enabled: boolean;
}

export interface RuntimeSceneExit {
  entityId: string;
  position: Vec3;
  radius: number;
  prompt: string;
  enabled: boolean;
  targetSceneId: string;
  targetEntryEntityId: string;
}

export interface RuntimePointLight {
  entityId: string;
  position: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
}

export interface RuntimeSpotLight {
  entityId: string;
  position: Vec3;
  direction: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
  angleDegrees: number;
}

export interface RuntimeLocalLightCollection {
  pointLights: RuntimePointLight[];
  spotLights: RuntimeSpotLight[];
}

export interface RuntimeModelInstance {
  instanceId: string;
  assetId: string;
  name?: string;
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  animationClipName?: string;
  animationAutoplay?: boolean;
}

export interface RuntimeEntityCollection {
  playerStarts: RuntimePlayerStart[];
  sceneEntries: RuntimeSceneEntry[];
  soundEmitters: RuntimeSoundEmitter[];
  triggerVolumes: RuntimeTriggerVolume[];
  teleportTargets: RuntimeTeleportTarget[];
  interactables: RuntimeInteractable[];
  sceneExits: RuntimeSceneExit[];
}

export interface RuntimeSpawnPoint {
  source: "playerStart" | "sceneEntry" | "fallback";
  entityId: string | null;
  position: Vec3;
  yawDegrees: number;
}

export interface RuntimeSceneDefinition {
  world: WorldSettings;
  localLights: RuntimeLocalLightCollection;
  brushes: RuntimeBoxBrushInstance[];
  volumes: RuntimeBoxVolumeCollection;
  colliders: RuntimeSceneCollider[];
  sceneBounds: RuntimeSceneBounds | null;
  modelInstances: RuntimeModelInstance[];
  entities: RuntimeEntityCollection;
  interactionLinks: InteractionLink[];
  playerStart: RuntimePlayerStart | null;
  playerCollider: FirstPersonPlayerShape;
  navigationMode: RuntimeNavigationMode;
  spawn: RuntimeSpawnPoint;
}

export interface BuildRuntimeSceneOptions {
  navigationMode?: RuntimeNavigationMode;
  loadedModelAssets?: Record<string, LoadedModelAsset>;
  sceneEntryId?: string | null;
}

export function resolveRuntimeNavigationMode(
  playerStartEntity: ReturnType<typeof getPrimaryPlayerStartEntity>,
  authoredOverride?: RuntimeNavigationMode
): RuntimeNavigationMode {
  if (authoredOverride !== undefined) {
    return authoredOverride;
  }

  return playerStartEntity?.navigationMode ?? "thirdPerson";
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function resolveRuntimeMaterial(document: SceneDocument, materialId: string | null): MaterialDef | null {
  if (materialId === null) {
    return null;
  }

  const material = document.materials[materialId];

  if (material === undefined) {
    throw new Error(`Runtime build could not resolve material ${materialId}.`);
  }

  return cloneMaterialDef(material);
}

function buildRuntimeBrush(brush: BoxBrush, document: SceneDocument): RuntimeBoxBrushInstance {
  return {
    id: brush.id,
    kind: "box",
    center: cloneVec3(brush.center),
    rotationDegrees: cloneVec3(brush.rotationDegrees),
    size: cloneVec3(brush.size),
    geometry: cloneBoxBrushGeometry(brush.geometry),
    volume: cloneBoxBrushVolumeSettings(brush.volume),
    faces: {
      posX: {
        materialId: brush.faces.posX.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.posX.materialId),
        uv: cloneFaceUvState(brush.faces.posX.uv)
      },
      negX: {
        materialId: brush.faces.negX.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.negX.materialId),
        uv: cloneFaceUvState(brush.faces.negX.uv)
      },
      posY: {
        materialId: brush.faces.posY.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.posY.materialId),
        uv: cloneFaceUvState(brush.faces.posY.uv)
      },
      negY: {
        materialId: brush.faces.negY.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.negY.materialId),
        uv: cloneFaceUvState(brush.faces.negY.uv)
      },
      posZ: {
        materialId: brush.faces.posZ.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.posZ.materialId),
        uv: cloneFaceUvState(brush.faces.posZ.uv)
      },
      negZ: {
        materialId: brush.faces.negZ.materialId,
        material: resolveRuntimeMaterial(document, brush.faces.negZ.materialId),
        uv: cloneFaceUvState(brush.faces.negZ.uv)
      }
    }
  };
}

function buildRuntimeFogVolume(brush: BoxBrush): RuntimeFogVolume {
  if (brush.volume.mode !== "fog") {
    throw new Error(`Cannot build fog volume from non-fog brush ${brush.id}.`);
  }

  return {
    brushId: brush.id,
    center: cloneVec3(brush.center),
    rotationDegrees: cloneVec3(brush.rotationDegrees),
    size: cloneVec3(brush.size),
    colorHex: brush.volume.fog.colorHex,
    density: brush.volume.fog.density,
    padding: brush.volume.fog.padding
  };
}

function buildRuntimeWaterVolume(brush: BoxBrush): RuntimeWaterVolume {
  if (brush.volume.mode !== "water") {
    throw new Error(`Cannot build water volume from non-water brush ${brush.id}.`);
  }

  return {
    brushId: brush.id,
    center: cloneVec3(brush.center),
    rotationDegrees: cloneVec3(brush.rotationDegrees),
    size: cloneVec3(brush.size),
    colorHex: brush.volume.water.colorHex,
    surfaceOpacity: brush.volume.water.surfaceOpacity,
    waveStrength: brush.volume.water.waveStrength
  };
}

function buildRuntimeCollider(brush: BoxBrush): RuntimeBrushTriMeshCollider {
  const bounds = getBoxBrushBounds(brush);
  const derivedMesh = buildBoxBrushDerivedMeshData(brush);

  return {
    kind: "trimesh",
    source: "brush",
    brushId: brush.id,
    center: cloneVec3(brush.center),
    rotationDegrees: cloneVec3(brush.rotationDegrees),
    vertices: derivedMesh.colliderVertices,
    indices: derivedMesh.colliderIndices,
    worldBounds: {
      min: cloneVec3(bounds.min),
      max: cloneVec3(bounds.max)
    }
  };
}

function buildRuntimeModelInstance(modelInstance: SceneDocument["modelInstances"][string]): RuntimeModelInstance {
  return {
    instanceId: modelInstance.id,
    assetId: modelInstance.assetId,
    name: modelInstance.name,
    position: cloneVec3(modelInstance.position),
    rotationDegrees: cloneVec3(modelInstance.rotationDegrees),
    scale: cloneVec3(modelInstance.scale),
    animationClipName: modelInstance.animationClipName,
    animationAutoplay: modelInstance.animationAutoplay
  };
}

function getColliderBounds(collider: RuntimeSceneCollider): GeneratedColliderBounds {
  if (collider.source === "brush") {
    return {
      min: cloneVec3(collider.worldBounds.min),
      max: cloneVec3(collider.worldBounds.max)
    };
  }

  return {
    min: cloneVec3(collider.worldBounds.min),
    max: cloneVec3(collider.worldBounds.max)
  };
}

function combineColliderBounds(colliders: RuntimeSceneCollider[]): RuntimeSceneBounds | null {
  if (colliders.length === 0) {
    return null;
  }

  const firstBounds = getColliderBounds(colliders[0]);
  const min = cloneVec3(firstBounds.min);
  const max = cloneVec3(firstBounds.max);

  for (const collider of colliders.slice(1)) {
    const bounds = getColliderBounds(collider);
    min.x = Math.min(min.x, bounds.min.x);
    min.y = Math.min(min.y, bounds.min.y);
    min.z = Math.min(min.z, bounds.min.z);
    max.x = Math.max(max.x, bounds.max.x);
    max.y = Math.max(max.y, bounds.max.y);
    max.z = Math.max(max.z, bounds.max.z);
  }

  return {
    min,
    max,
    center: {
      x: (min.x + max.x) * 0.5,
      y: (min.y + max.y) * 0.5,
      z: (min.z + max.z) * 0.5
    },
    size: {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z
    }
  };
}

function buildFallbackSpawn(sceneBounds: RuntimeSceneBounds | null): RuntimeSpawnPoint {
  if (sceneBounds === null) {
    return {
      source: "fallback",
      entityId: null,
      position: {
        x: 0,
        y: 0,
        z: -4
      },
      yawDegrees: 0
    };
  }

  return {
    source: "fallback",
    entityId: null,
    position: {
      x: sceneBounds.center.x,
      y: sceneBounds.max.y + 0.1,
      z: sceneBounds.max.z + 3
    },
    yawDegrees: 180
  };
}

interface RuntimeSceneCollections {
  entities: RuntimeEntityCollection;
  localLights: RuntimeLocalLightCollection;
}

function buildRuntimeSceneCollections(document: SceneDocument): RuntimeSceneCollections {
  const runtimeEntities: RuntimeEntityCollection = {
    playerStarts: [],
    sceneEntries: [],
    soundEmitters: [],
    triggerVolumes: [],
    teleportTargets: [],
    interactables: [],
    sceneExits: []
  };
  const localLights: RuntimeLocalLightCollection = {
    pointLights: [],
    spotLights: []
  };

  for (const entity of getEntityInstances(document.entities)) {
    switch (entity.kind) {
      case "pointLight":
        localLights.pointLights.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          colorHex: entity.colorHex,
          intensity: entity.intensity,
          distance: entity.distance
        });
        break;
      case "spotLight":
        localLights.spotLights.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          direction: cloneVec3(entity.direction),
          colorHex: entity.colorHex,
          intensity: entity.intensity,
          distance: entity.distance,
          angleDegrees: entity.angleDegrees
        });
        break;
      case "playerStart":
        runtimeEntities.playerStarts.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          yawDegrees: entity.yawDegrees,
          collider: buildRuntimePlayerShape(entity)
        });
        break;
      case "sceneEntry":
        runtimeEntities.sceneEntries.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          yawDegrees: entity.yawDegrees
        });
        break;
      case "soundEmitter":
        runtimeEntities.soundEmitters.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          audioAssetId: entity.audioAssetId,
          volume: entity.volume,
          refDistance: entity.refDistance,
          maxDistance: entity.maxDistance,
          autoplay: entity.autoplay,
          loop: entity.loop
        });
        break;
      case "triggerVolume":
        runtimeEntities.triggerVolumes.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          size: cloneVec3(entity.size),
          // Derive from links so flags are always correct regardless of stored entity state
          triggerOnEnter: Object.values(document.interactionLinks).some(
            (l) => l.sourceEntityId === entity.id && l.trigger === "enter"
          ),
          triggerOnExit: Object.values(document.interactionLinks).some(
            (l) => l.sourceEntityId === entity.id && l.trigger === "exit"
          )
        });
        break;
      case "teleportTarget":
        runtimeEntities.teleportTargets.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          yawDegrees: entity.yawDegrees
        });
        break;
      case "interactable":
        runtimeEntities.interactables.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          radius: entity.radius,
          prompt: entity.prompt,
          enabled: entity.enabled
        });
        break;
      case "sceneExit":
        runtimeEntities.sceneExits.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          radius: entity.radius,
          prompt: entity.prompt,
          enabled: entity.enabled,
          targetSceneId: entity.targetSceneId,
          targetEntryEntityId: entity.targetEntryEntityId
        });
        break;
      default:
        assertNever(entity);
    }
  }

  return {
    entities: runtimeEntities,
    localLights
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported runtime entity: ${String((value as EntityInstance).kind)}`);
}

function buildRuntimePlayerShape(
  playerStartEntity: ReturnType<typeof getPrimaryPlayerStartEntity>
): FirstPersonPlayerShape {
  if (playerStartEntity === null) {
    return FIRST_PERSON_PLAYER_SHAPE;
  }

  switch (playerStartEntity.collider.mode) {
    case "capsule":
      return {
        mode: "capsule",
        radius: playerStartEntity.collider.capsuleRadius,
        height: playerStartEntity.collider.capsuleHeight,
        eyeHeight: playerStartEntity.collider.eyeHeight
      };
    case "box":
      return {
        mode: "box",
        size: cloneVec3(playerStartEntity.collider.boxSize),
        eyeHeight: playerStartEntity.collider.eyeHeight
      };
    case "none":
      return {
        mode: "none",
        eyeHeight: playerStartEntity.collider.eyeHeight
      };
  }
}

function resolveRuntimeSpawn(
  playerStart: RuntimePlayerStart | null,
  sceneEntries: RuntimeSceneEntry[],
  sceneBounds: RuntimeSceneBounds | null,
  sceneEntryId: string | null | undefined
): RuntimeSpawnPoint {
  if (sceneEntryId !== undefined && sceneEntryId !== null) {
    const sceneEntry =
      sceneEntries.find((entry) => entry.entityId === sceneEntryId) ?? null;

    if (sceneEntry === null) {
      throw new Error(
        `Runtime build could not resolve Scene Entry ${sceneEntryId}.`
      );
    }

    return {
      source: "sceneEntry",
      entityId: sceneEntry.entityId,
      position: cloneVec3(sceneEntry.position),
      yawDegrees: sceneEntry.yawDegrees
    };
  }

  if (playerStart !== null) {
    return {
      source: "playerStart",
      entityId: playerStart.entityId,
      position: cloneVec3(playerStart.position),
      yawDegrees: playerStart.yawDegrees
    };
  }

  return buildFallbackSpawn(sceneBounds);
}

export function buildRuntimeSceneFromDocument(document: SceneDocument, options: BuildRuntimeSceneOptions = {}): RuntimeSceneDefinition {
  const playerStartEntity = getPrimaryPlayerStartEntity(document.entities);
  const navigationMode = resolveRuntimeNavigationMode(
    playerStartEntity,
    options.navigationMode
  );

  assertRuntimeSceneBuildable(document, {
    navigationMode,
    loadedModelAssets: options.loadedModelAssets
  });

  const brushes = Object.values(document.brushes).map((brush) => buildRuntimeBrush(brush, document));
  const colliders: RuntimeSceneCollider[] = [];
  const volumes: RuntimeBoxVolumeCollection = {
    fog: [],
    water: []
  };

  for (const brush of Object.values(document.brushes)) {
    if (brush.volume.mode === "none") {
      colliders.push(buildRuntimeCollider(brush));
      continue;
    }

    if (brush.volume.mode === "fog") {
      volumes.fog.push(buildRuntimeFogVolume(brush));
      continue;
    }

    volumes.water.push(buildRuntimeWaterVolume(brush));
  }
  const modelInstances = getModelInstances(document.modelInstances).map(buildRuntimeModelInstance);
  const collections = buildRuntimeSceneCollections(document);
  const interactionLinks = getInteractionLinks(document.interactionLinks).map((link) => cloneInteractionLink(link));
  const playerCollider = buildRuntimePlayerShape(playerStartEntity);

  for (const modelInstance of getModelInstances(document.modelInstances)) {
    const asset = document.assets[modelInstance.assetId];

    if (asset === undefined || asset.kind !== "model") {
      continue;
    }

    const generatedCollider = buildGeneratedModelCollider(modelInstance, asset, options.loadedModelAssets?.[modelInstance.assetId]);

    if (generatedCollider !== null) {
      colliders.push(generatedCollider);
    }
  }

  const combinedSceneBounds = combineColliderBounds(colliders);
  const playerStart =
    playerStartEntity === null
      ? null
      : {
          entityId: playerStartEntity.id,
          position: cloneVec3(playerStartEntity.position),
          yawDegrees: playerStartEntity.yawDegrees,
          navigationMode,
          collider: playerCollider
        };

  return {
    world: cloneWorldSettings(document.world),
    localLights: collections.localLights,
    brushes,
    volumes,
    colliders,
    sceneBounds: combinedSceneBounds,
    modelInstances,
    entities: collections.entities,
    interactionLinks,
    playerStart,
    playerCollider,
    navigationMode,
    spawn: resolveRuntimeSpawn(
      playerStart,
      collections.entities.sceneEntries,
      combinedSceneBounds,
      options.sceneEntryId
    )
  };
}
