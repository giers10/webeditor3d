import { compareEntityInstances, getEntityKindLabel, getEntityInstances, type EntityInstance } from "./entity-instances";

function getSortedEntitiesByKind(entities: Record<string, EntityInstance>, kind: EntityInstance["kind"]): EntityInstance[] {
  return Object.values(entities)
    .filter((entity) => entity.kind === kind)
    .sort(compareEntityInstances);
}

export function getEntityDisplayLabel(entity: EntityInstance, entities: Record<string, EntityInstance>): string {
  const typedEntities = getSortedEntitiesByKind(entities, entity.kind);
  const entityIndex = typedEntities.findIndex((candidate) => candidate.id === entity.id);
  const baseLabel = getEntityKindLabel(entity.kind);

  return entityIndex <= 0 ? baseLabel : `${baseLabel} ${entityIndex + 1}`;
}

export function getEntityDisplayLabelById(entityId: string, entities: Record<string, EntityInstance>): string {
  const entity = entities[entityId];

  if (entity === undefined) {
    return "Entity";
  }

  return getEntityDisplayLabel(entity, entities);
}

export function getSortedEntityDisplayLabels(entities: Record<string, EntityInstance>): Array<{ entity: EntityInstance; label: string }> {
  return getEntityInstances(entities).map((entity) => ({
    entity,
    label: getEntityDisplayLabel(entity, entities)
  }));
}
