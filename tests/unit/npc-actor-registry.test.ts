import { describe, expect, it } from "vitest";

import {
  createEmptyProjectDocument,
  createEmptyProjectScene
} from "../../src/document/scene-document";
import {
  createNpcEntity,
  createPointLightEntity
} from "../../src/entities/entity-instances";
import { listNpcActorUsages } from "../../src/entities/npc-actor-registry";

describe("listNpcActorUsages", () => {
  it("finds matching NPC actor ids across project scenes", () => {
    const villageNpc = createNpcEntity({
      id: "entity-npc-village-guide",
      name: "Village Guide",
      actorId: "actor-town-guide"
    });
    const plazaNpc = createNpcEntity({
      id: "entity-npc-plaza-guide",
      name: "Plaza Guide",
      actorId: "actor-town-guide"
    });
    const otherNpc = createNpcEntity({
      id: "entity-npc-baker",
      actorId: "actor-town-baker"
    });
    const project = createEmptyProjectDocument({
      sceneId: "scene-village",
      sceneName: "Village"
    });

    project.scenes["scene-village"].entities = {
      [villageNpc.id]: villageNpc,
      [otherNpc.id]: otherNpc,
      "entity-point-light": createPointLightEntity({
        id: "entity-point-light"
      })
    };
    project.scenes["scene-plaza"] = createEmptyProjectScene({
      id: "scene-plaza",
      name: "Plaza"
    });
    project.scenes["scene-plaza"].entities = {
      [plazaNpc.id]: plazaNpc
    };

    expect(listNpcActorUsages(project, "actor-town-guide")).toEqual([
      {
        actorId: "actor-town-guide",
        sceneId: "scene-plaza",
        sceneName: "Plaza",
        entityId: "entity-npc-plaza-guide",
        entityName: "Plaza Guide"
      },
      {
        actorId: "actor-town-guide",
        sceneId: "scene-village",
        sceneName: "Village",
        entityId: "entity-npc-village-guide",
        entityName: "Village Guide"
      }
    ]);
  });

  it("returns no usages for a blank actor id", () => {
    expect(listNpcActorUsages(createEmptyProjectDocument(), "   ")).toEqual([]);
  });
});