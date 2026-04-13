import type { ProjectDocument } from "../document/scene-document";

import { getEntityInstances } from "./entity-instances";

export interface NpcActorUsage {
  actorId: string;
  sceneId: string;
  sceneName: string;
  entityId: string;
  entityName?: string;
}

export function listNpcActorUsages(
  projectDocument: ProjectDocument,
  actorId: string
): NpcActorUsage[] {
  const normalizedActorId = actorId.trim();

  if (normalizedActorId.length === 0) {
    return [];
  }

  const usages: NpcActorUsage[] = [];

  for (const scene of Object.values(projectDocument.scenes)) {
    for (const entity of getEntityInstances(scene.entities)) {
      if (entity.kind !== "npc" || entity.actorId !== normalizedActorId) {
        continue;
      }

      usages.push({
        actorId: normalizedActorId,
        sceneId: scene.id,
        sceneName: scene.name,
        entityId: entity.id,
        entityName: entity.name
      });
    }
  }

  usages.sort((left, right) => {
    return (
      left.sceneName.localeCompare(right.sceneName) ||
      left.sceneId.localeCompare(right.sceneId) ||
      (left.entityName ?? "").localeCompare(right.entityName ?? "") ||
      left.entityId.localeCompare(right.entityId)
    );
  });

  return usages;
}