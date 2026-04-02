import { compareEntityInstances, getEntityKindLabel, getEntityInstances, type EntityInstance } from "./entity-instances";
import type { ProjectAssetRecord } from "../assets/project-assets";

function getSortedEntitiesByKind(entities: Record<string, EntityInstance>, kind: EntityInstance["kind"]): EntityInstance[] {
  return Object.values(entities)
    .filter((entity) => entity.kind === kind)
    .sort(compareEntityInstances);
}

function getSoundEmitterLabelSuffix(entity: EntityInstance & { kind: "soundEmitter" }, assets?: Record<string, ProjectAssetRecord>): string {
  if (entity.audioAssetId === null) {
    return "No Audio Asset";
  }

  const asset = assets?.[entity.audioAssetId];

  if (asset === undefined) {
    return `Missing Audio Asset (${entity.audioAssetId})`;
  }

  if (asset.kind !== "audio") {
    return `Invalid Audio Asset (${asset.sourceName})`;
  }

  return asset.sourceName;
}

export function getEntityDisplayLabel(
  entity: EntityInstance,
  entities: Record<string, EntityInstance>,
  assets?: Record<string, ProjectAssetRecord>
): string {
  if (entity.name !== undefined) {
    return entity.name;
  }

  const typedEntities = getSortedEntitiesByKind(entities, entity.kind);
  const entityIndex = typedEntities.findIndex((candidate) => candidate.id === entity.id);
  const baseLabel = getEntityKindLabel(entity.kind);
  const numberedLabel = entityIndex <= 0 ? baseLabel : `${baseLabel} ${entityIndex + 1}`;

  if (entity.kind !== "soundEmitter" || assets === undefined) {
    return numberedLabel;
  }

  return `${numberedLabel} · ${getSoundEmitterLabelSuffix(entity, assets)}`;
}

export function getEntityDisplayLabelById(
  entityId: string,
  entities: Record<string, EntityInstance>,
  assets?: Record<string, ProjectAssetRecord>
): string {
  const entity = entities[entityId];

  if (entity === undefined) {
    return "Entity";
  }

  return getEntityDisplayLabel(entity, entities, assets);
}

export function getSortedEntityDisplayLabels(
  entities: Record<string, EntityInstance>,
  assets?: Record<string, ProjectAssetRecord>
): Array<{ entity: EntityInstance; label: string }> {
  return getEntityInstances(entities).map((entity) => ({
    entity,
    label: getEntityDisplayLabel(entity, entities, assets)
  }));
}
