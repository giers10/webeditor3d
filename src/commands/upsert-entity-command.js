import { cloneEditorSelection } from "../core/selection";
import { createOpaqueId } from "../core/ids";
import { cloneEntityInstance, getEntityKindLabel } from "../entities/entity-instances";
function setSingleEntitySelection(entityId) {
    return {
        kind: "entities",
        ids: [entityId]
    };
}
function createDefaultEntityCommandLabel(entity, isNewEntity) {
    const action = isNewEntity ? "Place" : "Update";
    return `${action} ${getEntityKindLabel(entity.kind).toLowerCase()}`;
}
export function createUpsertEntityCommand(options) {
    const nextEntity = cloneEntityInstance(options.entity);
    let previousEntity = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? createDefaultEntityCommandLabel(nextEntity, true),
        execute(context) {
            const currentDocument = context.getDocument();
            const currentEntity = currentDocument.entities[nextEntity.id];
            if (currentEntity !== undefined && currentEntity.kind !== nextEntity.kind) {
                throw new Error(`Entity ${nextEntity.id} is a ${currentEntity.kind}, not a ${nextEntity.kind}.`);
            }
            if (previousSelection === null) {
                previousSelection = cloneEditorSelection(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            if (previousEntity === null && currentEntity !== undefined) {
                previousEntity = cloneEntityInstance(currentEntity);
            }
            context.setDocument({
                ...currentDocument,
                entities: {
                    ...currentDocument.entities,
                    [nextEntity.id]: cloneEntityInstance(nextEntity)
                }
            });
            context.setSelection(setSingleEntitySelection(nextEntity.id));
            context.setToolMode("select");
        },
        undo(context) {
            const currentDocument = context.getDocument();
            const nextEntities = {
                ...currentDocument.entities
            };
            if (previousEntity === null) {
                delete nextEntities[nextEntity.id];
            }
            else {
                nextEntities[nextEntity.id] = cloneEntityInstance(previousEntity);
            }
            context.setDocument({
                ...currentDocument,
                entities: nextEntities
            });
            if (previousSelection !== null) {
                context.setSelection(previousSelection);
            }
            if (previousToolMode !== null) {
                context.setToolMode(previousToolMode);
            }
        }
    };
}
