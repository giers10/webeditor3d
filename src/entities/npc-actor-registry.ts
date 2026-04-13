import type { ProjectDocument } from "../document/scene-document";

import { getEntityInstances } from "./entity-instances";

export interface NpcActorUsage {
  actorId: string;
  sceneId: string;
  sceneName: string;
  entityId: string;
  entityName?: string;
}

export interface ProjectNpcActorRecord {
  actorId: string;
  label: string;
  usages: NpcActorUsage[];
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

export function listProjectNpcActors(
  projectDocument: ProjectDocument
): ProjectNpcActorRecord[] {
  const actorUsages = new Map<string, NpcActorUsage[]>();

  for (const scene of Object.values(projectDocument.scenes)) {
    for (const entity of getEntityInstances(scene.entities)) {
      if (entity.kind !== "npc") {
        continue;
      }

      const usages = actorUsages.get(entity.actorId) ?? [];
      usages.push({
        actorId: entity.actorId,
        sceneId: scene.id,
        sceneName: scene.name,
        entityId: entity.id,
        entityName: entity.name
      });
      actorUsages.set(entity.actorId, usages);
    }
  }

  return [...actorUsages.entries()]
    .map(([actorId, usages]) => {
      usages.sort((left, right) => {
        return (
          left.sceneName.localeCompare(right.sceneName) ||
          left.sceneId.localeCompare(right.sceneId) ||
          (left.entityName ?? "").localeCompare(right.entityName ?? "") ||
          left.entityId.localeCompare(right.entityId)
        );
      });

      return {
        actorId,
        label: usages[0]?.entityName?.trim() || actorId,
        usages
      };
    })
    .sort((left, right) => {
      return (
        left.label.localeCompare(right.label) ||
        left.actorId.localeCompare(right.actorId)
      );
    });
}
