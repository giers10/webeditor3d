import { createPlayerStartEntity } from "../entities/entity-instances";
import { createUpsertEntityCommand } from "./upsert-entity-command";
export function createSetPlayerStartCommand(options) {
    return createUpsertEntityCommand({
        entity: createPlayerStartEntity({
            id: options.entityId,
            position: options.position,
            yawDegrees: options.yawDegrees
        }),
        label: options.entityId === undefined ? "Place player start" : "Move player start"
    });
}
