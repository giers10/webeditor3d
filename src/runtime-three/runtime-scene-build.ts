import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { Vec3 } from "../core/vector";
import { getModelInstances } from "../assets/model-instances";
import {
  createActorControlTargetRef,
  createActiveSceneControlTargetRef,
  createAmbientLightIntensityControlChannelDescriptor,
  createControlTargetDescriptor,
  createDefaultResolvedControlSource,
  createEmptyRuntimeResolvedControlState,
  createInteractionControlTargetRef,
  createLightControlTargetRef,
  createLightIntensityControlChannelDescriptor,
  createModelInstanceControlTargetRef,
  createResolvedAmbientLightColorState,
  createResolvedActorAnimationPlaybackState,
  createResolvedActorPathAssignmentState,
  createResolvedAmbientLightIntensityChannelValue,
  createResolvedInteractionEnabledState,
  createResolvedLightColorState,
  createResolvedLightEnabledState,
  createResolvedLightIntensityChannelValue,
  createResolvedModelAnimationPlaybackState,
  createResolvedModelInstanceVisibilityState,
  createResolvedSoundPlaybackState,
  createResolvedSoundVolumeChannelValue,
  createResolvedSunLightColorState,
  createResolvedSunLightIntensityChannelValue,
  createRuntimeControlSurfaceDefinition,
  createSoundEmitterControlTargetRef,
  createSoundVolumeControlChannelDescriptor,
  createSunLightIntensityControlChannelDescriptor,
  type RuntimeControlSurfaceDefinition
} from "../controls/control-surface";
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
import {
  cloneProjectTimeSettings,
  type ProjectTimeSettings
} from "../document/project-time-settings";
import {
  getScenePaths,
  resolveScenePath,
  type ScenePath,
  type ScenePathPoint
} from "../document/paths";
import {
  cloneWorldSettings,
  type WorldSettings
} from "../document/world-settings";
import {
  type CharacterColliderSettings,
  clonePlayerStartInputBindings,
  createPlayerStartMovementTemplate,
  createPlayerStartInputBindings,
  getEntityInstances,
  getPrimaryEnabledPlayerStartEntity,
  type EntityInstance,
  type PlayerStartInputBindings,
  type PlayerStartJumpSettings,
  type PlayerStartMovementCapabilities,
  type PlayerStartCrouchSettings,
  type PlayerStartSprintSettings,
  type PlayerStartMovementTemplate
} from "../entities/entity-instances";
import { getBoxBrushBounds } from "../geometry/box-brush";
import { buildBoxBrushDerivedMeshData } from "../geometry/box-brush-mesh";
import {
  buildGeneratedModelCollider,
  type GeneratedColliderBounds,
  type GeneratedModelCollider
} from "../geometry/model-instance-collider-generation";
import {
  cloneInteractionLink,
  getInteractionLinks,
  type InteractionLink
} from "../interactions/interaction-links";
import {
  cloneMaterialDef,
  type MaterialDef
} from "../materials/starter-material-library";
import { cloneProjectScheduler } from "../scheduler/project-scheduler";
import {
  applyRuntimeProjectScheduleToControlState,
  createRuntimeProjectSchedulerState,
  resolveRuntimeProjectScheduleState,
  type RuntimeProjectSchedulerState,
  type RuntimeResolvedProjectScheduleState
} from "./runtime-project-scheduler";
import { assertRuntimeSceneBuildable } from "./runtime-scene-validation";
import type { RuntimeClockState } from "./runtime-project-time";
import {
  FIRST_PERSON_PLAYER_SHAPE,
  type FirstPersonPlayerShape
} from "./player-collision";

export type RuntimeNavigationMode = "firstPerson" | "thirdPerson";

export interface RuntimeBrushFace {
  materialId: string | null;
  material: MaterialDef | null;
  uv: FaceUvState;
}

export interface RuntimeBoxBrushInstance {
  id: string;
  kind: "box";
  visible: boolean;
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

export interface RuntimeNpcCollider {
  kind: "character";
  source: "npc";
  entityId: string;
  position: Vec3;
  rotationDegrees: Vec3;
  shape: FirstPersonPlayerShape;
  worldBounds: {
    min: Vec3;
    max: Vec3;
  };
}

export type RuntimeSceneCollider =
  | RuntimeBrushTriMeshCollider
  | GeneratedModelCollider
  | RuntimeNpcCollider;

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
  movement: RuntimePlayerMovement;
  inputBindings: PlayerStartInputBindings;
  collider: FirstPersonPlayerShape;
}

export interface RuntimePlayerMovement {
  templateKind: PlayerStartMovementTemplate["kind"];
  moveSpeed: number;
  maxSpeed: number;
  maxStepHeight: number;
  capabilities: PlayerStartMovementCapabilities;
  jump: PlayerStartJumpSettings;
  sprint: PlayerStartSprintSettings;
  crouch: PlayerStartCrouchSettings;
}

export interface RuntimeSceneEntry {
  entityId: string;
  position: Vec3;
  yawDegrees: number;
}

export interface RuntimeNpc {
  entityId: string;
  actorId: string;
  name?: string;
  visible: boolean;
  position: Vec3;
  yawDegrees: number;
  modelAssetId: string | null;
  collider: FirstPersonPlayerShape;
  activeRoutineTitle: string | null;
  animationClipName: string | null;
  animationLoop: boolean | undefined;
  resolvedPath: RuntimeResolvedNpcPathState | null;
}

export interface RuntimeNpcDefinition extends RuntimeNpc {
  active: boolean;
  activeRoutineId: string | null;
  authoredPosition: Vec3;
  authoredYawDegrees: number;
}

export interface RuntimeResolvedNpcPathState {
  pathId: string;
  progressMode: "deriveFromTime";
  speed: number;
  loop: boolean;
  elapsedHours: number;
  distance: number;
  progress: number;
  position: Vec3;
  tangent: Vec3;
  yawDegrees: number | null;
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
  interactionEnabled: boolean;
}

export interface RuntimeSceneExit {
  entityId: string;
  position: Vec3;
  radius: number;
  prompt: string;
  interactionEnabled: boolean;
  targetSceneId: string;
  targetEntryEntityId: string;
}

export interface RuntimePointLight {
  entityId: string;
  enabled: boolean;
  position: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
}

export interface RuntimeSpotLight {
  entityId: string;
  enabled: boolean;
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
  visible: boolean;
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  animationClipName?: string;
  animationAutoplay?: boolean;
  animationLoop?: boolean;
}

export interface RuntimePathPoint {
  pointId: string;
  position: Vec3;
}

export interface RuntimePathSegment {
  index: number;
  startPointId: string;
  endPointId: string;
  start: Vec3;
  end: Vec3;
  length: number;
  distanceStart: number;
  distanceEnd: number;
  tangent: Vec3;
}

export interface RuntimePath {
  id: string;
  name?: string;
  visible: boolean;
  enabled: boolean;
  loop: boolean;
  points: RuntimePathPoint[];
  segments: RuntimePathSegment[];
  totalLength: number;
}

export interface RuntimeEntityCollection {
  playerStarts: RuntimePlayerStart[];
  sceneEntries: RuntimeSceneEntry[];
  npcs: RuntimeNpc[];
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
  time: ProjectTimeSettings;
  scheduler: RuntimeProjectSchedulerState;
  world: WorldSettings;
  control: RuntimeControlSurfaceDefinition;
  localLights: RuntimeLocalLightCollection;
  brushes: RuntimeBoxBrushInstance[];
  volumes: RuntimeBoxVolumeCollection;
  staticColliders: RuntimeSceneCollider[];
  colliders: RuntimeSceneCollider[];
  sceneBounds: RuntimeSceneBounds | null;
  modelInstances: RuntimeModelInstance[];
  paths: RuntimePath[];
  npcDefinitions: RuntimeNpcDefinition[];
  entities: RuntimeEntityCollection;
  interactionLinks: InteractionLink[];
  playerStart: RuntimePlayerStart | null;
  playerCollider: FirstPersonPlayerShape;
  playerMovement: RuntimePlayerMovement;
  playerInputBindings: PlayerStartInputBindings;
  navigationMode: RuntimeNavigationMode;
  spawn: RuntimeSpawnPoint;
}

export interface BuildRuntimeSceneOptions {
  navigationMode?: RuntimeNavigationMode;
  loadedModelAssets?: Record<string, LoadedModelAsset>;
  runtimeClock?: RuntimeClockState;
  sceneEntryId?: string | null;
}

export function resolveRuntimeNavigationMode(
  playerStartEntity: ReturnType<typeof getPrimaryEnabledPlayerStartEntity>,
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

function createRuntimeCharacterShape(
  collider: CharacterColliderSettings
): FirstPersonPlayerShape {
  switch (collider.mode) {
    case "capsule":
      return {
        mode: "capsule",
        radius: collider.capsuleRadius,
        height: collider.capsuleHeight,
        eyeHeight: collider.eyeHeight
      };
    case "box":
      return {
        mode: "box",
        size: cloneVec3(collider.boxSize),
        eyeHeight: collider.eyeHeight
      };
    case "none":
      return {
        mode: "none",
        eyeHeight: collider.eyeHeight
      };
  }
}

function cloneRuntimeCharacterShape(
  shape: FirstPersonPlayerShape
): FirstPersonPlayerShape {
  switch (shape.mode) {
    case "capsule":
      return {
        mode: "capsule",
        radius: shape.radius,
        height: shape.height,
        eyeHeight: shape.eyeHeight
      };
    case "box":
      return {
        mode: "box",
        size: cloneVec3(shape.size),
        eyeHeight: shape.eyeHeight
      };
    case "none":
      return {
        mode: "none",
        eyeHeight: shape.eyeHeight
      };
  }
}

function cloneRuntimeResolvedNpcPathState(
  pathState: RuntimeResolvedNpcPathState
): RuntimeResolvedNpcPathState {
  return {
    pathId: pathState.pathId,
    progressMode: pathState.progressMode,
    speed: pathState.speed,
    loop: pathState.loop,
    elapsedHours: pathState.elapsedHours,
    distance: pathState.distance,
    progress: pathState.progress,
    position: cloneVec3(pathState.position),
    tangent: cloneVec3(pathState.tangent),
    yawDegrees: pathState.yawDegrees
  };
}

export function createRuntimeNpcFromDefinition(
  npc: RuntimeNpcDefinition
): RuntimeNpc {
  return {
    entityId: npc.entityId,
    actorId: npc.actorId,
    name: npc.name,
    visible: npc.visible,
    position: cloneVec3(npc.position),
    yawDegrees: npc.yawDegrees,
    modelAssetId: npc.modelAssetId,
    collider: cloneRuntimeCharacterShape(npc.collider),
    activeRoutineTitle: npc.activeRoutineTitle,
    animationClipName: npc.animationClipName,
    animationLoop: npc.animationLoop,
    resolvedPath:
      npc.resolvedPath === null
        ? null
        : cloneRuntimeResolvedNpcPathState(npc.resolvedPath)
  };
}

function clonePlayerStartMovementCapabilities(
  capabilities: PlayerStartMovementCapabilities
): PlayerStartMovementCapabilities {
  return {
    jump: capabilities.jump,
    sprint: capabilities.sprint,
    crouch: capabilities.crouch
  };
}

function clonePlayerStartJumpSettings(
  jump: PlayerStartJumpSettings
): PlayerStartJumpSettings {
  return {
    speed: jump.speed,
    bufferMs: jump.bufferMs,
    coyoteTimeMs: jump.coyoteTimeMs,
    variableHeight: jump.variableHeight,
    maxHoldMs: jump.maxHoldMs,
    moveWhileJumping: jump.moveWhileJumping,
    moveWhileFalling: jump.moveWhileFalling,
    directionOnly: jump.directionOnly,
    bunnyHop: jump.bunnyHop,
    bunnyHopBoost: jump.bunnyHopBoost
  };
}

function clonePlayerStartSprintSettings(
  sprint: PlayerStartSprintSettings
): PlayerStartSprintSettings {
  return {
    speedMultiplier: sprint.speedMultiplier
  };
}

function clonePlayerStartCrouchSettings(
  crouch: PlayerStartCrouchSettings
): PlayerStartCrouchSettings {
  return {
    speedMultiplier: crouch.speedMultiplier
  };
}

function cloneRuntimePlayerMovement(
  movement: RuntimePlayerMovement
): RuntimePlayerMovement {
  return {
    templateKind: movement.templateKind,
    moveSpeed: movement.moveSpeed,
    maxSpeed: movement.maxSpeed,
    maxStepHeight: movement.maxStepHeight,
    capabilities: clonePlayerStartMovementCapabilities(movement.capabilities),
    jump: clonePlayerStartJumpSettings(movement.jump),
    sprint: clonePlayerStartSprintSettings(movement.sprint),
    crouch: clonePlayerStartCrouchSettings(movement.crouch)
  };
}

function buildRuntimePlayerMovement(
  template: PlayerStartMovementTemplate | undefined
): RuntimePlayerMovement {
  const resolvedTemplate = createPlayerStartMovementTemplate(template);

  return {
    templateKind: resolvedTemplate.kind,
    moveSpeed: resolvedTemplate.moveSpeed,
    maxSpeed: resolvedTemplate.maxSpeed,
    maxStepHeight: resolvedTemplate.maxStepHeight,
    capabilities: clonePlayerStartMovementCapabilities(
      resolvedTemplate.capabilities
    ),
    jump: clonePlayerStartJumpSettings(resolvedTemplate.jump),
    sprint: clonePlayerStartSprintSettings(resolvedTemplate.sprint),
    crouch: clonePlayerStartCrouchSettings(resolvedTemplate.crouch)
  };
}

function resolveRuntimeMaterial(
  document: SceneDocument,
  materialId: string | null
): MaterialDef | null {
  if (materialId === null) {
    return null;
  }

  const material = document.materials[materialId];

  if (material === undefined) {
    throw new Error(`Runtime build could not resolve material ${materialId}.`);
  }

  return cloneMaterialDef(material);
}

function buildRuntimeBrush(
  brush: BoxBrush,
  document: SceneDocument
): RuntimeBoxBrushInstance {
  return {
    id: brush.id,
    kind: "box",
    visible: brush.visible,
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
    throw new Error(
      `Cannot build water volume from non-water brush ${brush.id}.`
    );
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

function buildRuntimeModelInstance(
  modelInstance: SceneDocument["modelInstances"][string]
): RuntimeModelInstance {
  return {
    instanceId: modelInstance.id,
    assetId: modelInstance.assetId,
    name: modelInstance.name,
    visible: modelInstance.visible,
    position: cloneVec3(modelInstance.position),
    rotationDegrees: cloneVec3(modelInstance.rotationDegrees),
    scale: cloneVec3(modelInstance.scale),
    animationClipName: modelInstance.animationClipName,
    animationAutoplay: modelInstance.animationAutoplay,
    animationLoop: undefined
  };
}

function buildRuntimePathPoint(point: ScenePathPoint): RuntimePathPoint {
  return {
    pointId: point.id,
    position: cloneVec3(point.position)
  };
}

function buildRuntimePath(path: ScenePath): RuntimePath {
  const resolvedPath = resolveScenePath(path);

  return {
    id: path.id,
    name: path.name,
    visible: path.visible,
    enabled: path.enabled,
    loop: path.loop,
    points: resolvedPath.points.map(buildRuntimePathPoint),
    segments: resolvedPath.segments.map((segment) => ({
      index: segment.index,
      startPointId: segment.startPointId,
      endPointId: segment.endPointId,
      start: cloneVec3(segment.start),
      end: cloneVec3(segment.end),
      length: segment.length,
      distanceStart: segment.distanceStart,
      distanceEnd: segment.distanceEnd,
      tangent: cloneVec3(segment.tangent)
    })),
    totalLength: resolvedPath.totalLength
  };
}

function createRuntimePathLookup(
  paths: RuntimePath[]
): ReadonlyMap<string, RuntimePath> {
  return new Map(paths.map((path) => [path.id, path]));
}

function cloneResolvedActorPathToNpcPathState(
  pathState: NonNullable<
    RuntimeResolvedProjectScheduleState["actors"][number]["resolvedPath"]
  >
): RuntimeResolvedNpcPathState {
  return {
    pathId: pathState.pathId,
    progressMode: pathState.progressMode,
    speed: pathState.speed,
    loop: pathState.loop,
    elapsedHours: pathState.elapsedHours,
    distance: pathState.distance,
    progress: pathState.progress,
    position: cloneVec3(pathState.position),
    tangent: cloneVec3(pathState.tangent),
    yawDegrees: pathState.yawDegrees
  };
}

function applyActorScheduleStateToNpcDefinition(
  npc: RuntimeNpcDefinition,
  actorState: RuntimeResolvedProjectScheduleState["actors"][number] | null
) {
  npc.active = actorState?.active ?? true;
  npc.activeRoutineId = actorState?.activeRoutineId ?? null;
  npc.activeRoutineTitle = actorState?.activeRoutineTitle ?? null;
  npc.animationClipName = actorState?.animationEffect?.clipName ?? null;
  npc.animationLoop = actorState?.animationEffect?.loop;
  npc.resolvedPath =
    actorState?.resolvedPath === null || actorState?.resolvedPath === undefined
      ? null
      : cloneResolvedActorPathToNpcPathState(actorState.resolvedPath);

  if (npc.resolvedPath !== null) {
    npc.position = cloneVec3(npc.resolvedPath.position);
    npc.yawDegrees = npc.resolvedPath.yawDegrees ?? npc.authoredYawDegrees;
    return;
  }

  npc.position = cloneVec3(npc.authoredPosition);
  npc.yawDegrees = npc.authoredYawDegrees;
}

function getColliderBounds(
  collider: RuntimeSceneCollider
): GeneratedColliderBounds {
  return {
    min: cloneVec3(collider.worldBounds.min),
    max: cloneVec3(collider.worldBounds.max)
  };
}

export function buildRuntimeNpcCollider(
  npc: RuntimeNpc | RuntimeNpcDefinition
): RuntimeNpcCollider | null {
  if (npc.collider.mode === "none") {
    return null;
  }

  const rotationDegrees = {
    x: 0,
    y: npc.yawDegrees,
    z: 0
  };

  switch (npc.collider.mode) {
    case "capsule": {
      return {
        kind: "character",
        source: "npc",
        entityId: npc.entityId,
        position: cloneVec3(npc.position),
        rotationDegrees,
        shape: {
          mode: "capsule",
          radius: npc.collider.radius,
          height: npc.collider.height,
          eyeHeight: npc.collider.eyeHeight
        },
        worldBounds: {
          min: {
            x: npc.position.x - npc.collider.radius,
            y: npc.position.y,
            z: npc.position.z - npc.collider.radius
          },
          max: {
            x: npc.position.x + npc.collider.radius,
            y: npc.position.y + npc.collider.height,
            z: npc.position.z + npc.collider.radius
          }
        }
      };
    }
    case "box": {
      const halfExtents = {
        x: npc.collider.size.x * 0.5,
        y: npc.collider.size.y * 0.5,
        z: npc.collider.size.z * 0.5
      };
      const yawRadians = (rotationDegrees.y * Math.PI) / 180;
      const cosine = Math.abs(Math.cos(yawRadians));
      const sine = Math.abs(Math.sin(yawRadians));
      const rotatedHalfX = halfExtents.x * cosine + halfExtents.z * sine;
      const rotatedHalfZ = halfExtents.x * sine + halfExtents.z * cosine;

      return {
        kind: "character",
        source: "npc",
        entityId: npc.entityId,
        position: cloneVec3(npc.position),
        rotationDegrees,
        shape: {
          mode: "box",
          size: cloneVec3(npc.collider.size),
          eyeHeight: npc.collider.eyeHeight
        },
        worldBounds: {
          min: {
            x: npc.position.x - rotatedHalfX,
            y: npc.position.y,
            z: npc.position.z - rotatedHalfZ
          },
          max: {
            x: npc.position.x + rotatedHalfX,
            y: npc.position.y + npc.collider.size.y,
            z: npc.position.z + rotatedHalfZ
          }
        }
      };
    }
  }
}

function combineColliderBounds(
  colliders: RuntimeSceneCollider[]
): RuntimeSceneBounds | null {
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

function buildFallbackSpawn(
  sceneBounds: RuntimeSceneBounds | null
): RuntimeSpawnPoint {
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
  npcDefinitions: RuntimeNpcDefinition[];
  scheduler: RuntimeResolvedProjectScheduleState;
}

function buildRuntimeControlSurface(
  document: SceneDocument,
  collections: RuntimeSceneCollections,
  modelInstances: RuntimeModelInstance[]
): RuntimeControlSurfaceDefinition {
  const targets: RuntimeControlSurfaceDefinition["targets"] = [];
  const channels: RuntimeControlSurfaceDefinition["channels"] = [];
  const resolved = createEmptyRuntimeResolvedControlState();
  const defaultSource = createDefaultResolvedControlSource();
  const seenActorIds = new Set<string>();
  const sceneTarget = createActiveSceneControlTargetRef();
  const ambientLightDescriptor =
    createAmbientLightIntensityControlChannelDescriptor({
      target: sceneTarget,
      defaultValue: document.world.ambientLight.intensity
    });
  const sunLightDescriptor = createSunLightIntensityControlChannelDescriptor({
    target: sceneTarget,
    defaultValue: document.world.sunLight.intensity
  });

  targets.push(
    createControlTargetDescriptor(sceneTarget, [
      "ambientLightIntensity",
      "ambientLightColor",
      "sunLightIntensity",
      "sunLightColor"
    ])
  );
  channels.push(ambientLightDescriptor, sunLightDescriptor);
  resolved.discrete.push(
    createResolvedAmbientLightColorState({
      target: sceneTarget,
      value: document.world.ambientLight.colorHex,
      source: defaultSource
    }),
    createResolvedSunLightColorState({
      target: sceneTarget,
      value: document.world.sunLight.colorHex,
      source: defaultSource
    })
  );
  resolved.channels.push(
    createResolvedAmbientLightIntensityChannelValue({
      descriptor: ambientLightDescriptor,
      value: document.world.ambientLight.intensity,
      source: defaultSource
    }),
    createResolvedSunLightIntensityChannelValue({
      descriptor: sunLightDescriptor,
      value: document.world.sunLight.intensity,
      source: defaultSource
    })
  );

  for (const npc of collections.npcDefinitions) {
    if (seenActorIds.has(npc.actorId)) {
      continue;
    }

    seenActorIds.add(npc.actorId);
    const target = createActorControlTargetRef(npc.actorId);
    const capabilities: Array<
      "actorPresence" | "actorAnimationPlayback" | "actorPathFollow"
    > = ["actorPresence"];
    const actorModelAsset =
      npc.modelAssetId === null ? undefined : document.assets[npc.modelAssetId];

    if (
      actorModelAsset !== undefined &&
      actorModelAsset.kind === "model" &&
      actorModelAsset.metadata.animationNames.length > 0
    ) {
      capabilities.push("actorAnimationPlayback");
    }

    if (getScenePaths(document.paths).some((path) => path.enabled)) {
      capabilities.push("actorPathFollow");
    }

    targets.push(
      createControlTargetDescriptor(target, capabilities)
    );
    resolved.discrete.push(
      createResolvedActorAnimationPlaybackState({
        target,
        clipName: null,
        loop: undefined,
        source: defaultSource
      }),
      createResolvedActorPathAssignmentState({
        target,
        pathId: null,
        speed: null,
        loop: false,
        progressMode: null,
        source: defaultSource
      })
    );
  }

  for (const pointLight of collections.localLights.pointLights) {
    const target = createLightControlTargetRef(
      "pointLight",
      pointLight.entityId
    );
    const descriptor = createLightIntensityControlChannelDescriptor({
      target,
      defaultValue: pointLight.intensity
    });

    targets.push(
      createControlTargetDescriptor(target, [
        "lightEnabled",
        "lightIntensity",
        "lightColor"
      ])
    );
    channels.push(descriptor);
    resolved.discrete.push(
      createResolvedLightEnabledState({
        target,
        value: pointLight.enabled,
        source: defaultSource
      }),
      createResolvedLightColorState({
        target,
        value: pointLight.colorHex,
        source: defaultSource
      })
    );
    resolved.channels.push(
      createResolvedLightIntensityChannelValue({
        descriptor,
        value: pointLight.intensity,
        source: defaultSource
      })
    );
  }

  for (const spotLight of collections.localLights.spotLights) {
    const target = createLightControlTargetRef("spotLight", spotLight.entityId);
    const descriptor = createLightIntensityControlChannelDescriptor({
      target,
      defaultValue: spotLight.intensity
    });

    targets.push(
      createControlTargetDescriptor(target, [
        "lightEnabled",
        "lightIntensity",
        "lightColor"
      ])
    );
    channels.push(descriptor);
    resolved.discrete.push(
      createResolvedLightEnabledState({
        target,
        value: spotLight.enabled,
        source: defaultSource
      }),
      createResolvedLightColorState({
        target,
        value: spotLight.colorHex,
        source: defaultSource
      })
    );
    resolved.channels.push(
      createResolvedLightIntensityChannelValue({
        descriptor,
        value: spotLight.intensity,
        source: defaultSource
      })
    );
  }

  for (const soundEmitter of collections.entities.soundEmitters) {
    if (soundEmitter.audioAssetId === null) {
      continue;
    }

    const target = createSoundEmitterControlTargetRef(soundEmitter.entityId);
    const descriptor = createSoundVolumeControlChannelDescriptor({
      target,
      defaultValue: soundEmitter.volume
    });

    targets.push(
      createControlTargetDescriptor(target, ["soundPlayback", "soundVolume"])
    );
    channels.push(descriptor);
    resolved.discrete.push(
      createResolvedSoundPlaybackState({
        target,
        value: soundEmitter.autoplay,
        source: defaultSource
      })
    );
    resolved.channels.push(
      createResolvedSoundVolumeChannelValue({
        descriptor,
        value: soundEmitter.volume,
        source: defaultSource
      })
    );
  }

  for (const interactable of collections.entities.interactables) {
    const target = createInteractionControlTargetRef(
      "interactable",
      interactable.entityId
    );

    targets.push(
      createControlTargetDescriptor(target, ["interactionAvailability"])
    );
    resolved.discrete.push(
      createResolvedInteractionEnabledState({
        target,
        value: interactable.interactionEnabled,
        source: defaultSource
      })
    );
  }

  for (const sceneExit of collections.entities.sceneExits) {
    const target = createInteractionControlTargetRef(
      "sceneExit",
      sceneExit.entityId
    );

    targets.push(
      createControlTargetDescriptor(target, ["interactionAvailability"])
    );
    resolved.discrete.push(
      createResolvedInteractionEnabledState({
        target,
        value: sceneExit.interactionEnabled,
        source: defaultSource
      })
    );
  }

  for (const modelInstance of modelInstances) {
    const authoredModelInstance =
      document.modelInstances[modelInstance.instanceId];
    const asset =
      authoredModelInstance === undefined
        ? undefined
        : document.assets[authoredModelInstance.assetId];
    const target = createModelInstanceControlTargetRef(modelInstance.instanceId);
    const hasAnimationPlayback =
      asset !== undefined &&
      asset.kind === "model" &&
      asset.metadata.animationNames.length > 0;
    const capabilities: Array<"animationPlayback" | "modelVisibility"> = [
      "modelVisibility"
    ];

    if (hasAnimationPlayback) {
      capabilities.unshift("animationPlayback");
    }

    targets.push(createControlTargetDescriptor(target, capabilities));
    resolved.discrete.push(
      createResolvedModelInstanceVisibilityState({
        target,
        value: modelInstance.visible,
        source: defaultSource
      })
    );

    if (hasAnimationPlayback) {
      resolved.discrete.push(
        createResolvedModelAnimationPlaybackState({
          target,
          clipName:
            modelInstance.animationAutoplay === true &&
            typeof modelInstance.animationClipName === "string"
              ? modelInstance.animationClipName
              : null,
          loop: modelInstance.animationLoop,
          source: defaultSource
        })
      );
    }
  }

  return createRuntimeControlSurfaceDefinition({
    targets,
    channels,
    baselineResolved: resolved,
    resolved: applyRuntimeProjectScheduleToControlState(
      resolved,
      collections.scheduler,
      resolved
    )
  });
}

function buildRuntimeSceneCollections(
  document: SceneDocument,
  runtimeClock: RuntimeClockState | null,
  paths: RuntimePath[]
): RuntimeSceneCollections {
  const runtimeEntities: RuntimeEntityCollection = {
    playerStarts: [],
    sceneEntries: [],
    npcs: [],
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
  const npcDefinitions: RuntimeNpcDefinition[] = [];

  for (const entity of getEntityInstances(document.entities)) {
    if (!entity.enabled) {
      continue;
    }

    switch (entity.kind) {
      case "pointLight":
        localLights.pointLights.push({
          entityId: entity.id,
          enabled: entity.visible,
          position: cloneVec3(entity.position),
          colorHex: entity.colorHex,
          intensity: entity.intensity,
          distance: entity.distance
        });
        break;
      case "spotLight":
        localLights.spotLights.push({
          entityId: entity.id,
          enabled: entity.visible,
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
          navigationMode: entity.navigationMode,
          movement: buildRuntimePlayerMovement(entity.movementTemplate),
          inputBindings: clonePlayerStartInputBindings(entity.inputBindings),
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
      case "npc": {
        const npc: RuntimeNpcDefinition = {
          entityId: entity.id,
          actorId: entity.actorId,
          name: entity.name,
          visible: entity.visible,
          position: cloneVec3(entity.position),
          active: true,
          activeRoutineId: null,
          activeRoutineTitle: null,
          authoredPosition: cloneVec3(entity.position),
          yawDegrees: entity.yawDegrees,
          authoredYawDegrees: entity.yawDegrees,
          modelAssetId: entity.modelAssetId,
          collider: createRuntimeCharacterShape(entity.collider),
          animationClipName: null,
          animationLoop: undefined,
          resolvedPath: null
        };
        npcDefinitions.push(npc);
        break;
      }
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
          interactionEnabled: entity.interactionEnabled
        });
        break;
      case "sceneExit":
        runtimeEntities.sceneExits.push({
          entityId: entity.id,
          position: cloneVec3(entity.position),
          radius: entity.radius,
          prompt: entity.prompt,
          interactionEnabled: entity.interactionEnabled,
          targetSceneId: entity.targetSceneId,
          targetEntryEntityId: entity.targetEntryEntityId
        });
        break;
      default:
        assertNever(entity);
    }
  }

  const scheduler = resolveRuntimeProjectScheduleState({
    scheduler: document.scheduler,
    actorIds: npcDefinitions.map((npc) => npc.actorId),
    dayNumber:
      runtimeClock === null
        ? document.time.startDayNumber
        : runtimeClock.dayCount + 1,
    timeOfDayHours:
      runtimeClock === null
        ? document.time.startTimeOfDayHours
        : runtimeClock.timeOfDayHours,
    pathsById: createRuntimePathLookup(paths)
  });
  const scheduleByActorId = new Map(
    scheduler.actors.map((actorState) => [actorState.actorId, actorState])
  );

  for (const npc of npcDefinitions) {
    const actorState = scheduleByActorId.get(npc.actorId);
    applyActorScheduleStateToNpcDefinition(npc, actorState ?? null);

    if (npc.active) {
      runtimeEntities.npcs.push(createRuntimeNpcFromDefinition(npc));
    }
  }

  return {
    entities: runtimeEntities,
    localLights,
    npcDefinitions,
    scheduler
  };
}

function assertNever(value: never): never {
  throw new Error(
    `Unsupported runtime entity: ${String((value as EntityInstance).kind)}`
  );
}

function buildRuntimePlayerShape(
  playerStartEntity: ReturnType<typeof getPrimaryEnabledPlayerStartEntity>
): FirstPersonPlayerShape {
  if (playerStartEntity === null) {
    return FIRST_PERSON_PLAYER_SHAPE;
  }

  return createRuntimeCharacterShape(playerStartEntity.collider);
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

export function buildRuntimeSceneFromDocument(
  document: SceneDocument,
  options: BuildRuntimeSceneOptions = {}
): RuntimeSceneDefinition {
  const playerStartEntity = getPrimaryEnabledPlayerStartEntity(
    document.entities
  );
  const navigationMode = resolveRuntimeNavigationMode(
    playerStartEntity,
    options.navigationMode
  );

  assertRuntimeSceneBuildable(document, {
    navigationMode,
    loadedModelAssets: options.loadedModelAssets
  });

  const enabledBrushes = Object.values(document.brushes).filter(
    (brush) => brush.enabled
  );
  const brushes = enabledBrushes.map((brush) =>
    buildRuntimeBrush(brush, document)
  );
  const staticColliders: RuntimeSceneCollider[] = [];
  const volumes: RuntimeBoxVolumeCollection = {
    fog: [],
    water: []
  };

  for (const brush of enabledBrushes) {
    if (brush.volume.mode === "none") {
      staticColliders.push(buildRuntimeCollider(brush));
      continue;
    }

    if (brush.volume.mode === "fog") {
      volumes.fog.push(buildRuntimeFogVolume(brush));
      continue;
    }

    volumes.water.push(buildRuntimeWaterVolume(brush));
  }
  const enabledModelInstances = getModelInstances(
    document.modelInstances
  ).filter((modelInstance) => modelInstance.enabled);
  const modelInstances = enabledModelInstances.map(buildRuntimeModelInstance);
  const paths = getScenePaths(document.paths)
    .filter((path) => path.enabled)
    .map(buildRuntimePath);
  const collections = buildRuntimeSceneCollections(
    document,
    options.runtimeClock ?? null
  );
  const control = buildRuntimeControlSurface(
    document,
    collections,
    modelInstances
  );
  const enabledBrushIds = new Set(enabledBrushes.map((brush) => brush.id));
  const enabledModelInstanceIds = new Set(
    enabledModelInstances.map((modelInstance) => modelInstance.id)
  );
  const enabledEntityIds = new Set(
    getEntityInstances(document.entities)
      .filter((entity) => entity.enabled)
      .map((entity) => entity.id)
  );
  const interactionLinks = getInteractionLinks(document.interactionLinks)
    .filter((link) => {
      if (!enabledEntityIds.has(link.sourceEntityId)) {
        return false;
      }

      switch (link.action.type) {
        case "teleportPlayer":
          return enabledEntityIds.has(link.action.targetEntityId);
        case "toggleVisibility":
          return enabledBrushIds.has(link.action.targetBrushId);
        case "playAnimation":
        case "stopAnimation":
          return enabledModelInstanceIds.has(link.action.targetModelInstanceId);
        case "playSound":
        case "stopSound":
          return enabledEntityIds.has(link.action.targetSoundEmitterId);
        case "control":
          switch (link.action.effect.target.kind) {
            case "entity":
            case "interaction":
              return enabledEntityIds.has(link.action.effect.target.entityId);
            case "modelInstance":
              return enabledModelInstanceIds.has(
                link.action.effect.target.modelInstanceId
              );
          }
      }
    })
    .map((link) => cloneInteractionLink(link));
  const playerCollider = buildRuntimePlayerShape(playerStartEntity);
  const playerMovement = buildRuntimePlayerMovement(
    playerStartEntity?.movementTemplate
  );
  const playerInputBindings = createPlayerStartInputBindings(
    playerStartEntity?.inputBindings
  );
  const colliders = [...staticColliders];

  for (const npc of collections.entities.npcs) {
    const collider = buildRuntimeNpcCollider(npc);

    if (collider !== null) {
      colliders.push(collider);
    }
  }

  for (const modelInstance of enabledModelInstances) {
    const asset = document.assets[modelInstance.assetId];

    if (asset === undefined || asset.kind !== "model") {
      continue;
    }

    const generatedCollider = buildGeneratedModelCollider(
      modelInstance,
      asset,
      options.loadedModelAssets?.[modelInstance.assetId]
    );

    if (generatedCollider !== null) {
      staticColliders.push(generatedCollider);
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
          movement: cloneRuntimePlayerMovement(playerMovement),
          inputBindings: clonePlayerStartInputBindings(playerInputBindings),
          collider: playerCollider
        };

  return {
    time: cloneProjectTimeSettings(document.time),
    scheduler: createRuntimeProjectSchedulerState({
      document: cloneProjectScheduler(document.scheduler),
      resolved: collections.scheduler
    }),
    world: cloneWorldSettings(document.world),
    control,
    localLights: collections.localLights,
    brushes,
    volumes,
    staticColliders,
    colliders,
    sceneBounds: combinedSceneBounds,
    modelInstances,
    paths,
    npcDefinitions: collections.npcDefinitions,
    entities: collections.entities,
    interactionLinks,
    playerStart,
    playerCollider,
    playerMovement,
    playerInputBindings,
    navigationMode,
    spawn: resolveRuntimeSpawn(
      playerStart,
      collections.entities.sceneEntries,
      combinedSceneBounds,
      options.sceneEntryId
    )
  };
}
