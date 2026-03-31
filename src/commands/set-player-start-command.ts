import type { EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";
import { createOpaqueId } from "../core/ids";
import { createPlayerStartEntity } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

interface SetPlayerStartCommandOptions {
  entityId?: string;
  position: Vec3;
  yawDegrees: number;
}

function setSinglePlayerStartSelection(entityId: string): EditorSelection {
  return {
    kind: "entities",
    ids: [entityId]
  };
}

export function createSetPlayerStartCommand(options: SetPlayerStartCommandOptions): EditorCommand {
  const nextEntity = createPlayerStartEntity({
    id: options.entityId,
    position: options.position,
    yawDegrees: options.yawDegrees
  });

  let previousEntity = null as typeof nextEntity | null;
  let previousSelection: EditorSelection | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.entityId === undefined ? "Place player start" : "Move player start",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentEntity = currentDocument.entities[nextEntity.id];

      if (currentEntity !== undefined && currentEntity.kind !== "playerStart") {
        throw new Error(`Entity ${nextEntity.id} is not a player start.`);
      }

      if (previousSelection === null) {
        previousSelection = context.getSelection().kind === "none" ? { kind: "none" } : structuredClone(context.getSelection());
      }

      if (previousEntity === null && currentEntity !== undefined) {
        previousEntity = currentEntity;
      }

      context.setDocument({
        ...currentDocument,
        entities: {
          ...currentDocument.entities,
          [nextEntity.id]: nextEntity
        }
      });
      context.setSelection(setSinglePlayerStartSelection(nextEntity.id));
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextEntities = {
        ...currentDocument.entities
      };

      if (previousEntity === null) {
        delete nextEntities[nextEntity.id];
      } else {
        nextEntities[nextEntity.id] = previousEntity;
      }

      context.setDocument({
        ...currentDocument,
        entities: nextEntities
      });

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }
    }
  };
}
