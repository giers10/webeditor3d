import { createOpaqueId } from "../core/ids";
import { cloneEntityInstance, normalizeEntityName } from "../entities/entity-instances";
export function createSetEntityNameCommand(options) {
    const normalizedName = normalizeEntityName(options.name);
    let previousName;
    return {
        id: createOpaqueId("command"),
        label: normalizedName === undefined ? "Clear entity name" : `Rename entity to ${normalizedName}`,
        execute(context) {
            const currentDocument = context.getDocument();
            const entity = currentDocument.entities[options.entityId];
            if (entity === undefined) {
                throw new Error(`Entity ${options.entityId} does not exist.`);
            }
            if (previousName === undefined) {
                previousName = entity.name;
            }
            context.setDocument({
                ...currentDocument,
                entities: {
                    ...currentDocument.entities,
                    [entity.id]: cloneEntityInstance({
                        ...entity,
                        name: normalizedName
                    })
                }
            });
        },
        undo(context) {
            const currentDocument = context.getDocument();
            const entity = currentDocument.entities[options.entityId];
            if (entity === undefined) {
                throw new Error(`Entity ${options.entityId} does not exist.`);
            }
            context.setDocument({
                ...currentDocument,
                entities: {
                    ...currentDocument.entities,
                    [entity.id]: cloneEntityInstance({
                        ...entity,
                        name: previousName
                    })
                }
            });
        }
    };
}
