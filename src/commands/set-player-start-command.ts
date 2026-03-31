import type { Vec3 } from "../core/vector";
import { createPlayerStartEntity } from "../entities/entity-instances";

import type { EditorCommand } from "./command";
import { createUpsertEntityCommand } from "./upsert-entity-command";

interface SetPlayerStartCommandOptions {
  entityId?: string;
  position: Vec3;
  yawDegrees: number;
}

export function createSetPlayerStartCommand(options: SetPlayerStartCommandOptions): EditorCommand {
  return createUpsertEntityCommand({
    entity: createPlayerStartEntity({
      id: options.entityId,
      position: options.position,
      yawDegrees: options.yawDegrees
    }),
    label: options.entityId === undefined ? "Place player start" : "Move player start"
  });
}
