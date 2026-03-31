import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";

export interface PlayerStartEntity {
  id: string;
  kind: "playerStart";
  position: Vec3;
  yawDegrees: number;
}

export type EntityInstance = PlayerStartEntity;

export const DEFAULT_PLAYER_START_POSITION: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};

export const DEFAULT_PLAYER_START_YAW_DEGREES = 0;

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

export function normalizeYawDegrees(yawDegrees: number): number {
  const normalizedYaw = yawDegrees % 360;
  return normalizedYaw < 0 ? normalizedYaw + 360 : normalizedYaw;
}

export function createPlayerStartEntity(
  overrides: Partial<Pick<PlayerStartEntity, "id" | "position" | "yawDegrees">> = {}
): PlayerStartEntity {
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_PLAYER_START_YAW_DEGREES;

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Player start yaw must be a finite number.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-player-start"),
    kind: "playerStart",
    position: cloneVec3(overrides.position ?? DEFAULT_PLAYER_START_POSITION),
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function cloneEntityInstance(entity: EntityInstance): EntityInstance {
  switch (entity.kind) {
    case "playerStart":
      return createPlayerStartEntity(entity);
  }
}

export function cloneEntityRegistry(entities: Record<string, EntityInstance>): Record<string, EntityInstance> {
  return Object.fromEntries(Object.entries(entities).map(([entityId, entity]) => [entityId, cloneEntityInstance(entity)]));
}

export function getPlayerStartEntities(entities: Record<string, EntityInstance>): PlayerStartEntity[] {
  return Object.values(entities)
    .filter((entity): entity is PlayerStartEntity => entity.kind === "playerStart")
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function getPrimaryPlayerStartEntity(entities: Record<string, EntityInstance>): PlayerStartEntity | null {
  return getPlayerStartEntities(entities)[0] ?? null;
}
