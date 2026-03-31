import type { Vec3 } from "../core/vector";
import type { BoxBrush, BoxFaceId, FaceUvState } from "../document/brushes";
import type { SceneDocument, WorldSettings } from "../document/scene-document";
import { getPrimaryPlayerStartEntity } from "../entities/entity-instances";
import { getBoxBrushBounds } from "../geometry/box-brush";
import { cloneMaterialDef, type MaterialDef } from "../materials/starter-material-library";
import { cloneFaceUvState } from "../document/brushes";

export type RuntimeNavigationMode = "firstPerson" | "orbitVisitor";

export interface RuntimeBrushFace {
  materialId: string | null;
  material: MaterialDef | null;
  uv: FaceUvState;
}

export interface RuntimeBoxBrushInstance {
  id: string;
  kind: "box";
  center: Vec3;
  size: Vec3;
  faces: Record<BoxFaceId, RuntimeBrushFace>;
}

export interface RuntimeBoxCollider {
  kind: "box";
  brushId: string;
  min: Vec3;
  max: Vec3;
}

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
}

export interface RuntimeSpawnPoint {
  source: "playerStart" | "fallback";
  entityId: string | null;
  position: Vec3;
  yawDegrees: number;
}

export interface RuntimeSceneDefinition {
  world: WorldSettings;
  brushes: RuntimeBoxBrushInstance[];
  colliders: RuntimeBoxCollider[];
  sceneBounds: RuntimeSceneBounds | null;
  playerStart: RuntimePlayerStart | null;
  spawn: RuntimeSpawnPoint;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function buildRuntimeBrush(brush: BoxBrush, document: SceneDocument): RuntimeBoxBrushInstance {
  return {
    id: brush.id,
    kind: "box",
    center: cloneVec3(brush.center),
    size: cloneVec3(brush.size),
    faces: {
      posX: {
        materialId: brush.faces.posX.materialId,
        material: brush.faces.posX.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.posX.materialId]),
        uv: cloneFaceUvState(brush.faces.posX.uv)
      },
      negX: {
        materialId: brush.faces.negX.materialId,
        material: brush.faces.negX.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.negX.materialId]),
        uv: cloneFaceUvState(brush.faces.negX.uv)
      },
      posY: {
        materialId: brush.faces.posY.materialId,
        material: brush.faces.posY.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.posY.materialId]),
        uv: cloneFaceUvState(brush.faces.posY.uv)
      },
      negY: {
        materialId: brush.faces.negY.materialId,
        material: brush.faces.negY.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.negY.materialId]),
        uv: cloneFaceUvState(brush.faces.negY.uv)
      },
      posZ: {
        materialId: brush.faces.posZ.materialId,
        material: brush.faces.posZ.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.posZ.materialId]),
        uv: cloneFaceUvState(brush.faces.posZ.uv)
      },
      negZ: {
        materialId: brush.faces.negZ.materialId,
        material: brush.faces.negZ.materialId === null ? null : cloneMaterialDef(document.materials[brush.faces.negZ.materialId]),
        uv: cloneFaceUvState(brush.faces.negZ.uv)
      }
    }
  };
}

function buildRuntimeCollider(brush: BoxBrush): RuntimeBoxCollider {
  const bounds = getBoxBrushBounds(brush);

  return {
    kind: "box",
    brushId: brush.id,
    min: cloneVec3(bounds.min),
    max: cloneVec3(bounds.max)
  };
}

function combineColliderBounds(colliders: RuntimeBoxCollider[]): RuntimeSceneBounds | null {
  if (colliders.length === 0) {
    return null;
  }

  const min = cloneVec3(colliders[0].min);
  const max = cloneVec3(colliders[0].max);

  for (const collider of colliders.slice(1)) {
    min.x = Math.min(min.x, collider.min.x);
    min.y = Math.min(min.y, collider.min.y);
    min.z = Math.min(min.z, collider.min.z);
    max.x = Math.max(max.x, collider.max.x);
    max.y = Math.max(max.y, collider.max.y);
    max.z = Math.max(max.z, collider.max.z);
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

export function buildRuntimeSceneFromDocument(document: SceneDocument): RuntimeSceneDefinition {
  const brushes = Object.values(document.brushes).map((brush) => buildRuntimeBrush(brush, document));
  const colliders = Object.values(document.brushes).map((brush) => buildRuntimeCollider(brush));
  const sceneBounds = combineColliderBounds(colliders);
  const playerStartEntity = getPrimaryPlayerStartEntity(document.entities);
  const playerStart =
    playerStartEntity === null
      ? null
      : {
          entityId: playerStartEntity.id,
          position: cloneVec3(playerStartEntity.position),
          yawDegrees: playerStartEntity.yawDegrees
        };

  return {
    world: {
      background: {
        ...document.world.background
      },
      ambientLight: {
        ...document.world.ambientLight
      },
      sunLight: {
        ...document.world.sunLight,
        direction: cloneVec3(document.world.sunLight.direction)
      }
    },
    brushes,
    colliders,
    sceneBounds,
    playerStart,
    spawn:
      playerStart === null
        ? buildFallbackSpawn(sceneBounds)
        : {
            source: "playerStart",
            entityId: playerStart.entityId,
            position: cloneVec3(playerStart.position),
            yawDegrees: playerStart.yawDegrees
          }
  };
}
