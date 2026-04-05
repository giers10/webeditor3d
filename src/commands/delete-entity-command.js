import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection } from "../core/selection";
import { cloneEntityInstance } from "../entities/entity-instances";
function selectionIncludesEntity(selection, entityId) {
    return selection.kind === "entities" && selection.ids.includes(entityId);
}
export function createDeleteEntityCommand(entityId) {
    let previousEntity = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: "Delete entity",
        execute(context) {
            const currentDocument = context.getDocument();
            const currentEntity = currentDocument.entities[entityId];
            if (currentEntity === undefined) {
                throw new Error(`Entity ${entityId} does not exist.`);
            }
            if (previousEntity === null) {
                previousEntity = cloneEntityInstance(currentEntity);
            }
            if (previousSelection === null) {
                previousSelection = cloneEditorSelection(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            const nextEntities = {
                ...currentDocument.entities
            };
            delete nextEntities[entityId];
            context.setDocument({
                ...currentDocument,
                entities: nextEntities
            });
            if (selectionIncludesEntity(context.getSelection(), entityId)) {
                context.setSelection({
                    kind: "none"
                });
            }
            context.setToolMode("select");
        },
        undo(context) {
            if (previousEntity === null) {
                return;
            }
            const currentDocument = context.getDocument();
            context.setDocument({
                ...currentDocument,
                entities: {
                    ...currentDocument.entities,
                    [previousEntity.id]: cloneEntityInstance(previousEntity)
                }
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
