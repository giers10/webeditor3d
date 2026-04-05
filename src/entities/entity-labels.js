import { compareEntityInstances, getEntityKindLabel, getEntityInstances } from "./entity-instances";
function getSortedEntitiesByKind(entities, kind) {
    return Object.values(entities)
        .filter((entity) => entity.kind === kind)
        .sort(compareEntityInstances);
}
function getSoundEmitterLabelSuffix(entity, assets) {
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
export function getEntityDisplayLabel(entity, entities, assets) {
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
export function getEntityDisplayLabelById(entityId, entities, assets) {
    const entity = entities[entityId];
    if (entity === undefined) {
        return "Entity";
    }
    return getEntityDisplayLabel(entity, entities, assets);
}
export function getSortedEntityDisplayLabels(entities, assets) {
    return getEntityInstances(entities).map((entity) => ({
        entity,
        label: getEntityDisplayLabel(entity, entities, assets)
    }));
}
