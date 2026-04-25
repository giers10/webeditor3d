import { describe, expect, it } from "vitest";

import type { InteractionLink } from "../../src/interactions/interaction-links";
import {
  resolveRuntimeTargetCandidates,
  resolveRuntimeTargetReference,
  resolveStableRuntimeTargetProposal,
  RuntimeInteractionSystem,
  type RuntimeTargetCandidate
} from "../../src/runtime-three/runtime-interaction-system";
import type {
  RuntimeInteractable,
  RuntimeNpc,
  RuntimeSceneDefinition
} from "../../src/runtime-three/runtime-scene-build";

function createClickLink(sourceEntityId: string): InteractionLink {
  return {
    id: `link-${sourceEntityId}`,
    sourceEntityId,
    trigger: "click",
    action: {
      type: "runSequence",
      sequenceId: "noop"
    }
  };
}

function createNpc(overrides: Partial<RuntimeNpc> & { entityId: string }): RuntimeNpc {
  return {
    entityId: overrides.entityId,
    actorId: overrides.actorId ?? "",
    name: overrides.name,
    visible: overrides.visible ?? true,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    yawDegrees: overrides.yawDegrees ?? 0,
    modelAssetId: overrides.modelAssetId ?? null,
    dialogues: overrides.dialogues ?? [],
    defaultDialogueId: overrides.defaultDialogueId ?? null,
    collider:
      overrides.collider ?? {
        mode: "capsule",
        radius: 0.35,
        height: 1.8,
        eyeHeight: 1.6
      },
    activeRoutineTitle: overrides.activeRoutineTitle ?? null,
    animationClipName: overrides.animationClipName ?? null,
    animationLoop: overrides.animationLoop,
    resolvedPath: overrides.resolvedPath ?? null
  };
}

function createInteractable(
  overrides: Partial<RuntimeInteractable> & { entityId: string }
): RuntimeInteractable {
  return {
    entityId: overrides.entityId,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    radius: overrides.radius ?? 4,
    prompt: overrides.prompt ?? "Interact",
    interactionEnabled: overrides.interactionEnabled ?? true
  };
}

function createRuntimeSceneFixture(options: {
  npcs?: RuntimeNpc[];
  interactables?: RuntimeInteractable[];
  links?: InteractionLink[];
}): RuntimeSceneDefinition {
  return {
    entities: {
      npcs: options.npcs ?? [],
      interactables: options.interactables ?? [],
      playerStarts: [],
      sceneEntries: [],
      cameraRigs: [],
      soundEmitters: [],
      triggerVolumes: [],
      teleportTargets: []
    },
    interactionLinks: options.links ?? []
  } as unknown as RuntimeSceneDefinition;
}

describe("runtime interaction targeting", () => {
  it("orders visible NPC and interactable targets by view and distance score", () => {
    const centerNpc = createNpc({
      entityId: "npc-center",
      name: "Center",
      position: { x: 0, y: 0, z: 3 }
    });
    const sideInteractable = createInteractable({
      entityId: "interactable-side",
      position: { x: 1.5, y: 1, z: 3 },
      radius: 4,
      prompt: "Use"
    });
    const scene = createRuntimeSceneFixture({
      npcs: [centerNpc],
      interactables: [sideInteractable],
      links: [createClickLink(centerNpc.entityId), createClickLink(sideInteractable.entityId)]
    });

    const candidates = resolveRuntimeTargetCandidates({
      interactionOrigin: { x: 0, y: 1, z: 2.5 },
      cameraPosition: { x: 0, y: 1.6, z: 0 },
      cameraForward: { x: 0, y: 0, z: 1 },
      runtimeScene: scene
    });

    expect(candidates.map((candidate) => candidate.entityId)).toEqual([
      "npc-center",
      "interactable-side"
    ]);
  });

  it("keeps a previous proposed target stable across small score changes", () => {
    const candidates: RuntimeTargetCandidate[] = [
      {
        kind: "npc",
        entityId: "new-best",
        prompt: "Talk",
        position: { x: 0, y: 0, z: 0 },
        center: { x: 0, y: 1, z: 0 },
        distance: 1,
        range: 2,
        viewDot: 0.99,
        score: 2.05
      },
      {
        kind: "interactable",
        entityId: "previous",
        prompt: "Use",
        position: { x: 0, y: 0, z: 0 },
        center: { x: 0, y: 1, z: 0 },
        distance: 1,
        range: 2,
        viewDot: 0.95,
        score: 2
      }
    ];

    expect(
      resolveStableRuntimeTargetProposal(candidates, "previous")?.entityId
    ).toBe("previous");
  });

  it("proposes farther in-view targets without broadening click prompt range", () => {
    const distantNpc = createNpc({
      entityId: "npc-distant",
      name: "Far Guard",
      position: { x: 0, y: 0, z: 14.4 }
    });
    const distantInteractable = createInteractable({
      entityId: "interactable-distant",
      position: { x: 1.2, y: 1, z: 13.5 },
      radius: 1,
      prompt: "Use"
    });
    const scene = createRuntimeSceneFixture({
      npcs: [distantNpc],
      interactables: [distantInteractable],
      links: [
        createClickLink(distantNpc.entityId),
        createClickLink(distantInteractable.entityId)
      ]
    });
    const candidates = resolveRuntimeTargetCandidates({
      interactionOrigin: { x: 0, y: 1, z: 0 },
      cameraPosition: { x: 0, y: 1.6, z: -1 },
      cameraForward: { x: 0, y: 0, z: 1 },
      runtimeScene: scene
    });
    const system = new RuntimeInteractionSystem();

    expect(candidates.map((candidate) => candidate.entityId)).toEqual(
      expect.arrayContaining(["interactable-distant", "npc-distant"])
    );
    expect(
      system.resolveClickInteractionPrompt(
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 1.6, z: -1 },
        { x: 0, y: 0, z: 1 },
        scene
      )
    ).toBeNull();
  });

  it("keeps click prompt resolution coherent with the shared target sources", () => {
    const npc = createNpc({
      entityId: "npc-talk",
      name: "Guard",
      position: { x: 0, y: 0, z: 3 }
    });
    const scene = createRuntimeSceneFixture({
      npcs: [npc],
      links: [createClickLink(npc.entityId)]
    });
    const system = new RuntimeInteractionSystem();

    const prompt = system.resolveClickInteractionPrompt(
      { x: 0, y: 1, z: 2.5 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      scene
    );

    expect(prompt?.sourceEntityId).toBe(npc.entityId);
    expect(prompt?.prompt).toBe("Interact with Guard");
  });

  it("invalidates resolved targets when the runtime target is no longer usable", () => {
    const interactable = createInteractable({
      entityId: "switch",
      interactionEnabled: false
    });
    const scene = createRuntimeSceneFixture({
      interactables: [interactable],
      links: [createClickLink(interactable.entityId)]
    });

    expect(
      resolveRuntimeTargetReference(scene, {
        kind: "interactable",
        entityId: interactable.entityId
      })
    ).toBeNull();
  });
});
