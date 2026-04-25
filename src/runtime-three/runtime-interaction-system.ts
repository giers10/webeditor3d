import type { Vec3 } from "../core/vector";
import type { ControlEffect } from "../controls/control-surface";
import {
  type InteractionLink
} from "../interactions/interaction-links";
import {
  getInteractionLinkImpulseSteps,
  type ImpulseSequenceStep,
  type SequenceVisibilityMode,
  type SequenceVisibilityTarget
} from "../sequencer/project-sequence-steps";

import type {
  RuntimeInteractable,
  RuntimeNpc,
  RuntimeSceneDefinition,
  RuntimeTeleportTarget,
  RuntimeTriggerVolume
} from "./runtime-scene-build";

const DEFAULT_INTERACTABLE_TARGET_RADIUS = 0.75;
const DEFAULT_NPC_DIALOGUE_TARGET_RADIUS = 1.5;

export interface RuntimeDialogueStartSource {
  kind: "interactionLink" | "npc" | "direct";
  sourceEntityId: string | null;
  linkId: string | null;
  trigger: InteractionLink["trigger"] | null;
}

export interface RuntimeInteractionDispatcher {
  teleportPlayer(target: RuntimeTeleportTarget, link: InteractionLink): void;
  startSceneTransition(
    request: {
      sourceEntityId: string | null;
      targetSceneId: string;
      targetEntryEntityId: string;
    },
    link: InteractionLink | null
  ): void;
  toggleBrushVisibility(
    brushId: string,
    visible: boolean | undefined,
    link: InteractionLink
  ): void;
  setVisibility?(
    target: SequenceVisibilityTarget,
    mode: SequenceVisibilityMode,
    link: InteractionLink
  ): void;
  playAnimation(
    instanceId: string,
    clipName: string,
    loop: boolean | undefined,
    link: InteractionLink
  ): void;
  stopAnimation(instanceId: string, link: InteractionLink): void;
  playSound(soundEmitterId: string, link: InteractionLink): void;
  stopSound(soundEmitterId: string, link: InteractionLink): void;
  startNpcDialogue?(
    npcEntityId: string,
    dialogueId: string | null,
    source?: RuntimeDialogueStartSource
  ): void;
  dispatchControlEffect?(effect: ControlEffect, link: InteractionLink): void;
}

export interface RuntimeInteractionPrompt {
  sourceEntityId: string;
  prompt: string;
  distance: number;
  range: number;
}

export type RuntimeTargetCandidateKind = "npc" | "interactable";

export interface RuntimeTargetReference {
  kind: RuntimeTargetCandidateKind;
  entityId: string;
}

export interface RuntimeTargetCandidate extends RuntimeTargetReference {
  prompt: string;
  position: Vec3;
  center: Vec3;
  distance: number;
  range: number;
  viewDot: number;
  score: number;
}

export interface RuntimePlayerTriggerProbe {
  feetPosition: Vec3;
  eyePosition: Vec3;
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function lengthSquaredVec3(vector: Vec3): number {
  return dotVec3(vector, vector);
}

function distanceBetweenVec3(left: Vec3, right: Vec3): number {
  return Math.sqrt(lengthSquaredVec3(subtractVec3(left, right)));
}

function normalizeVec3(vector: Vec3): Vec3 | null {
  const lengthSquared = lengthSquaredVec3(vector);

  if (lengthSquared <= Number.EPSILON) {
    return null;
  }

  return scaleVec3(vector, 1 / Math.sqrt(lengthSquared));
}

function isPointInsideTriggerVolume(
  position: Vec3,
  triggerVolume: RuntimeTriggerVolume
): boolean {
  const halfSize = {
    x: triggerVolume.size.x * 0.5,
    y: triggerVolume.size.y * 0.5,
    z: triggerVolume.size.z * 0.5
  };

  return (
    position.x >= triggerVolume.position.x - halfSize.x &&
    position.x <= triggerVolume.position.x + halfSize.x &&
    position.y >= triggerVolume.position.y - halfSize.y &&
    position.y <= triggerVolume.position.y + halfSize.y &&
    position.z >= triggerVolume.position.z - halfSize.z &&
    position.z <= triggerVolume.position.z + halfSize.z
  );
}

function isVec3(value: Vec3 | RuntimePlayerTriggerProbe): value is Vec3 {
  return "x" in value;
}

function rayAxisAlignedBoxHitDistance(
  origin: Vec3,
  direction: Vec3,
  bounds: { min: Vec3; max: Vec3 }
): number | null {
  let near = Number.NEGATIVE_INFINITY;
  let far = Number.POSITIVE_INFINITY;

  for (const axis of ["x", "y", "z"] as const) {
    const axisOrigin = origin[axis];
    const axisDirection = direction[axis];
    const axisMin = bounds.min[axis];
    const axisMax = bounds.max[axis];

    if (Math.abs(axisDirection) <= Number.EPSILON) {
      if (axisOrigin < axisMin || axisOrigin > axisMax) {
        return null;
      }
      continue;
    }

    const inverseDirection = 1 / axisDirection;
    let entry = (axisMin - axisOrigin) * inverseDirection;
    let exit = (axisMax - axisOrigin) * inverseDirection;

    if (entry > exit) {
      const swap = entry;
      entry = exit;
      exit = swap;
    }

    near = Math.max(near, entry);
    far = Math.min(far, exit);

    if (near > far) {
      return null;
    }
  }

  if (far < 0) {
    return null;
  }

  return near >= 0 ? near : 0;
}

function distanceToAxisAlignedBox(
  position: Vec3,
  bounds: { min: Vec3; max: Vec3 }
): number {
  const dx =
    position.x < bounds.min.x
      ? bounds.min.x - position.x
      : position.x > bounds.max.x
        ? position.x - bounds.max.x
        : 0;
  const dy =
    position.y < bounds.min.y
      ? bounds.min.y - position.y
      : position.y > bounds.max.y
        ? position.y - bounds.max.y
        : 0;
  const dz =
    position.z < bounds.min.z
      ? bounds.min.z - position.z
      : position.z > bounds.max.z
        ? position.z - bounds.max.z
        : 0;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isPlayerInsideTriggerVolume(
  feetPosition: Vec3,
  eyePosition: Vec3,
  triggerVolume: RuntimeTriggerVolume
): boolean {
  if (
    isPointInsideTriggerVolume(feetPosition, triggerVolume) ||
    isPointInsideTriggerVolume(eyePosition, triggerVolume)
  ) {
    return true;
  }

  const halfSize = {
    x: triggerVolume.size.x * 0.5,
    y: triggerVolume.size.y * 0.5,
    z: triggerVolume.size.z * 0.5
  };

  return (
    rayAxisAlignedBoxHitDistance(
      feetPosition,
      subtractVec3(eyePosition, feetPosition),
      {
        min: {
          x: triggerVolume.position.x - halfSize.x,
          y: triggerVolume.position.y - halfSize.y,
          z: triggerVolume.position.z - halfSize.z
        },
        max: {
          x: triggerVolume.position.x + halfSize.x,
          y: triggerVolume.position.y + halfSize.y,
          z: triggerVolume.position.z + halfSize.z
        }
      }
    ) !== null
  );
}

function raySphereHitDistance(
  origin: Vec3,
  direction: Vec3,
  center: Vec3,
  radius: number
): number | null {
  const offset = subtractVec3(origin, center);
  const halfB = dotVec3(offset, direction);
  const c = dotVec3(offset, offset) - radius * radius;
  const discriminant = halfB * halfB - c;

  if (discriminant < 0) {
    return null;
  }

  const discriminantRoot = Math.sqrt(discriminant);
  const nearestHit = -halfB - discriminantRoot;

  if (nearestHit >= 0) {
    return nearestHit;
  }

  const farHit = -halfB + discriminantRoot;
  return farHit >= 0 ? 0 : null;
}

function resolveTeleportTarget(
  runtimeScene: RuntimeSceneDefinition,
  entityId: string
): RuntimeTeleportTarget | null {
  return (
    runtimeScene.entities.teleportTargets.find(
      (teleportTarget) => teleportTarget.entityId === entityId
    ) ?? null
  );
}

function hasTriggerLinks(
  runtimeScene: RuntimeSceneDefinition,
  sourceEntityId: string,
  trigger: InteractionLink["trigger"]
): boolean {
  return runtimeScene.interactionLinks.some(
    (link) =>
      link.sourceEntityId === sourceEntityId &&
      resolveEffectiveInteractionTrigger(runtimeScene, link) === trigger
  );
}

function resolveEffectiveInteractionTrigger(
  runtimeScene: RuntimeSceneDefinition,
  link: InteractionLink
): InteractionLink["trigger"] {
  if (
    runtimeScene.entities.interactables.some(
      (entity) => entity.entityId === link.sourceEntityId
    ) ||
    runtimeScene.entities.npcs.some((entity) => entity.entityId === link.sourceEntityId)
  ) {
    return "click";
  }

  if (
    runtimeScene.entities.triggerVolumes.some(
      (entity) => entity.entityId === link.sourceEntityId
    )
  ) {
    return link.trigger === "click" ? "enter" : link.trigger;
  }

  return link.trigger;
}

function getInteractableTargetRadius(
  interactable: RuntimeInteractable
): number {
  return Math.min(DEFAULT_INTERACTABLE_TARGET_RADIUS, interactable.radius);
}

function getNpcDialoguePrompt(
  npc: RuntimeNpc,
  hasClickLinks: boolean
): string {
  const trimmedName = npc.name?.trim() ?? "";
  const hasNpcDialogue =
    npc.defaultDialogueId !== null || npc.dialogues.length > 0;

  if (!hasClickLinks) {
    return trimmedName.length > 0 ? `Talk to ${trimmedName}` : "Talk";
  }

  if (hasNpcDialogue) {
    return trimmedName.length > 0 ? `Talk to ${trimmedName}` : "Talk";
  }

  return trimmedName.length > 0
    ? `Interact with ${trimmedName}`
    : hasClickLinks
      ? "Interact"
      : "Talk";
}

function getNpcDialogueTargetBounds(npc: RuntimeNpc): {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  range: number;
} {
  switch (npc.collider.mode) {
    case "capsule": {
      return {
        min: {
          x: npc.position.x - npc.collider.radius,
          y: npc.position.y,
          z: npc.position.z - npc.collider.radius
        },
        max: {
          x: npc.position.x + npc.collider.radius,
          y: npc.position.y + npc.collider.height,
          z: npc.position.z + npc.collider.radius
        },
        center: {
          x: npc.position.x,
          y: npc.position.y + npc.collider.height * 0.5,
          z: npc.position.z
        },
        range: Math.max(
          DEFAULT_NPC_DIALOGUE_TARGET_RADIUS,
          npc.collider.height * 0.5
        )
      };
    }
    case "box": {
      return {
        min: {
          x: npc.position.x - npc.collider.size.x * 0.5,
          y: npc.position.y,
          z: npc.position.z - npc.collider.size.z * 0.5
        },
        max: {
          x: npc.position.x + npc.collider.size.x * 0.5,
          y: npc.position.y + npc.collider.size.y,
          z: npc.position.z + npc.collider.size.z * 0.5
        },
        center: {
          x: npc.position.x,
          y: npc.position.y + npc.collider.size.y * 0.5,
          z: npc.position.z
        },
        range: Math.max(
          DEFAULT_NPC_DIALOGUE_TARGET_RADIUS,
          Math.max(
            npc.collider.size.x,
            npc.collider.size.y,
            npc.collider.size.z
          ) * 0.5
        )
      };
    }
    case "none":
      return {
        min: {
          x: npc.position.x - DEFAULT_NPC_DIALOGUE_TARGET_RADIUS * 0.5,
          y: npc.position.y,
          z: npc.position.z - DEFAULT_NPC_DIALOGUE_TARGET_RADIUS * 0.5
        },
        max: {
          x: npc.position.x + DEFAULT_NPC_DIALOGUE_TARGET_RADIUS * 0.5,
          y: npc.position.y + 1.8,
          z: npc.position.z + DEFAULT_NPC_DIALOGUE_TARGET_RADIUS * 0.5
        },
        center: {
          x: npc.position.x,
          y: npc.position.y + 0.9,
          z: npc.position.z
        },
        range: DEFAULT_NPC_DIALOGUE_TARGET_RADIUS
      };
  }
}

interface RuntimeInteractionTargetSource {
  kind: RuntimeTargetCandidateKind;
  entityId: string;
  prompt: string;
  position: Vec3;
  center: Vec3;
  distance: number;
  range: number;
  bounds?: { min: Vec3; max: Vec3 };
  targetRadius?: number;
}

function collectRuntimeInteractionTargetSources(
  interactionOrigin: Vec3,
  runtimeScene: RuntimeSceneDefinition
): RuntimeInteractionTargetSource[] {
  const candidates: RuntimeInteractionTargetSource[] = [];

  for (const interactable of runtimeScene.entities.interactables) {
    if (
      !interactable.interactionEnabled ||
      !hasTriggerLinks(runtimeScene, interactable.entityId, "click")
    ) {
      continue;
    }

    const distance = distanceBetweenVec3(interactionOrigin, interactable.position);

    if (distance > interactable.radius) {
      continue;
    }

    candidates.push({
      kind: "interactable",
      entityId: interactable.entityId,
      prompt: interactable.prompt,
      position: interactable.position,
      center: interactable.position,
      distance,
      range: interactable.radius,
      targetRadius: getInteractableTargetRadius(interactable)
    });
  }

  for (const npc of runtimeScene.entities.npcs) {
    if (!npc.visible) {
      continue;
    }

    const hasClickLinks = hasTriggerLinks(runtimeScene, npc.entityId, "click");

    if (!hasClickLinks) {
      continue;
    }

    const bounds = getNpcDialogueTargetBounds(npc);
    const distance = distanceToAxisAlignedBox(interactionOrigin, bounds);

    if (distance > bounds.range) {
      continue;
    }

    candidates.push({
      kind: "npc",
      entityId: npc.entityId,
      prompt: getNpcDialoguePrompt(npc, hasClickLinks),
      position: npc.position,
      center: bounds.center,
      distance,
      range: bounds.range,
      bounds
    });
  }

  return candidates;
}

export function resolveRuntimeTargetCandidates(options: {
  interactionOrigin: Vec3;
  cameraPosition: Vec3;
  cameraForward: Vec3;
  runtimeScene: RuntimeSceneDefinition;
  previousProposedTargetEntityId?: string | null;
}): RuntimeTargetCandidate[] {
  const normalizedViewDirection = normalizeVec3(options.cameraForward);

  if (normalizedViewDirection === null) {
    return [];
  }

  const previousId = options.previousProposedTargetEntityId ?? null;
  const candidates: RuntimeTargetCandidate[] = [];

  for (const source of collectRuntimeInteractionTargetSources(
    options.interactionOrigin,
    options.runtimeScene
  )) {
    const toTarget = subtractVec3(source.center, options.cameraPosition);
    const cameraDistanceSquared = lengthSquaredVec3(toTarget);

    if (cameraDistanceSquared <= Number.EPSILON) {
      continue;
    }

    const cameraDistance = Math.sqrt(cameraDistanceSquared);
    const viewDirection = scaleVec3(toTarget, 1 / cameraDistance);
    const viewDot = dotVec3(viewDirection, normalizedViewDirection);

    if (viewDot <= 0.05) {
      continue;
    }

    const interactionDistanceScore =
      1 / (1 + source.distance / Math.max(source.range, 0.001));
    const cameraDistanceScore = 1 / (1 + cameraDistance * 0.12);
    const stabilityBonus = source.entityId === previousId ? 0.12 : 0;
    const score =
      viewDot * 2 +
      interactionDistanceScore * 0.6 +
      cameraDistanceScore * 0.4 +
      stabilityBonus;

    candidates.push({
      kind: source.kind,
      entityId: source.entityId,
      prompt: source.prompt,
      position: source.position,
      center: source.center,
      distance: source.distance,
      range: source.range,
      viewDot,
      score
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.distance - b.distance ||
      a.entityId.localeCompare(b.entityId)
  );
  return candidates;
}

export function resolveStableRuntimeTargetProposal(
  candidates: RuntimeTargetCandidate[],
  previousProposedTargetEntityId: string | null,
  minScoreLead = 0.12
): RuntimeTargetCandidate | null {
  const best = candidates[0] ?? null;

  if (
    best === null ||
    previousProposedTargetEntityId === null ||
    best.entityId === previousProposedTargetEntityId
  ) {
    return best;
  }

  const previous =
    candidates.find(
      (candidate) => candidate.entityId === previousProposedTargetEntityId
    ) ?? null;

  if (previous !== null && best.score < previous.score + minScoreLead) {
    return previous;
  }

  return best;
}

function updateBestPrompt(
  currentBestPrompt: RuntimeInteractionPrompt | null,
  currentBestHitDistance: number,
  candidateEntityId: string,
  candidatePrompt: string,
  candidateDistance: number,
  candidateRange: number,
  candidateHitDistance: number
): { prompt: RuntimeInteractionPrompt | null; hitDistance: number } {
  const nextPrompt: RuntimeInteractionPrompt = {
    sourceEntityId: candidateEntityId,
    prompt: candidatePrompt,
    distance: candidateDistance,
    range: candidateRange
  };

  if (
    candidateHitDistance < currentBestHitDistance ||
    (candidateHitDistance === currentBestHitDistance &&
      (currentBestPrompt === null ||
        candidateDistance < currentBestPrompt.distance ||
        (candidateDistance === currentBestPrompt.distance &&
          candidateEntityId.localeCompare(currentBestPrompt.sourceEntityId) <
            0)))
  ) {
    return {
      prompt: nextPrompt,
      hitDistance: candidateHitDistance
    };
  }

  return {
    prompt: currentBestPrompt,
    hitDistance: currentBestHitDistance
  };
}

export class RuntimeInteractionSystem {
  private readonly occupiedTriggerVolumes = new Set<string>();

  reset() {
    this.occupiedTriggerVolumes.clear();
  }

  updatePlayerPosition(
    playerProbe: Vec3 | RuntimePlayerTriggerProbe,
    runtimeScene: RuntimeSceneDefinition,
    dispatcher: RuntimeInteractionDispatcher
  ) {
    const feetPosition = isVec3(playerProbe)
      ? playerProbe
      : playerProbe.feetPosition;
    const eyePosition = isVec3(playerProbe)
      ? playerProbe
      : playerProbe.eyePosition;

    for (const triggerVolume of runtimeScene.entities.triggerVolumes) {
      const containsPlayer = isPlayerInsideTriggerVolume(
        feetPosition,
        eyePosition,
        triggerVolume
      );
      const wasOccupied = this.occupiedTriggerVolumes.has(
        triggerVolume.entityId
      );

      if (
        !wasOccupied &&
        containsPlayer &&
        hasTriggerLinks(runtimeScene, triggerVolume.entityId, "enter")
      ) {
        this.dispatchLinks(
          triggerVolume.entityId,
          "enter",
          runtimeScene,
          dispatcher
        );
      } else if (
        wasOccupied &&
        !containsPlayer &&
        hasTriggerLinks(runtimeScene, triggerVolume.entityId, "exit")
      ) {
        this.dispatchLinks(
          triggerVolume.entityId,
          "exit",
          runtimeScene,
          dispatcher
        );
      }

      if (containsPlayer) {
        this.occupiedTriggerVolumes.add(triggerVolume.entityId);
      } else {
        this.occupiedTriggerVolumes.delete(triggerVolume.entityId);
      }
    }
  }

  resolveClickInteractionPrompt(
    interactionOrigin: Vec3,
    rayOrigin: Vec3,
    rayDirection: Vec3,
    runtimeScene: RuntimeSceneDefinition
  ): RuntimeInteractionPrompt | null {
    const normalizedViewDirection = normalizeVec3(rayDirection);

    if (normalizedViewDirection === null) {
      return null;
    }

    let bestPrompt: RuntimeInteractionPrompt | null = null;
    let bestHitDistance = Number.POSITIVE_INFINITY;

    for (const interactable of runtimeScene.entities.interactables) {
      if (
        !interactable.interactionEnabled ||
        !hasTriggerLinks(runtimeScene, interactable.entityId, "click")
      ) {
        continue;
      }

      const distance = distanceBetweenVec3(
        interactionOrigin,
        interactable.position
      );

      if (distance > interactable.radius) {
        continue;
      }

      const hitDistance = raySphereHitDistance(
        rayOrigin,
        normalizedViewDirection,
        interactable.position,
        getInteractableTargetRadius(interactable)
      );

      if (hitDistance === null) {
        continue;
      }
      const next = updateBestPrompt(
        bestPrompt,
        bestHitDistance,
        interactable.entityId,
        interactable.prompt,
        distance,
        interactable.radius,
        hitDistance
      );
      bestPrompt = next.prompt;
      bestHitDistance = next.hitDistance;
    }

    for (const npc of runtimeScene.entities.npcs) {
      if (!npc.visible) {
        continue;
      }

      const hasClickLinks = hasTriggerLinks(runtimeScene, npc.entityId, "click");

      if (!hasClickLinks) {
        continue;
      }

      const bounds = getNpcDialogueTargetBounds(npc);
      const distance = distanceToAxisAlignedBox(interactionOrigin, bounds);

      if (distance > bounds.range) {
        continue;
      }

      const hitDistance = rayAxisAlignedBoxHitDistance(
        rayOrigin,
        normalizedViewDirection,
        bounds
      );

      if (hitDistance === null) {
        continue;
      }

      const next = updateBestPrompt(
        bestPrompt,
        bestHitDistance,
        npc.entityId,
        getNpcDialoguePrompt(npc, hasClickLinks),
        distance,
        bounds.range,
        hitDistance
      );
      bestPrompt = next.prompt;
      bestHitDistance = next.hitDistance;
    }

    return bestPrompt;
  }

  dispatchClickInteraction(
    sourceEntityId: string,
    runtimeScene: RuntimeSceneDefinition,
    dispatcher: RuntimeInteractionDispatcher
  ) {
    const npc =
      runtimeScene.entities.npcs.find(
        (candidate) => candidate.entityId === sourceEntityId
      ) ?? null;

    if (npc !== null) {
      this.dispatchLinks(sourceEntityId, "click", runtimeScene, dispatcher);
      return;
    }

    this.dispatchLinks(sourceEntityId, "click", runtimeScene, dispatcher);
  }

  private dispatchLinks(
    sourceEntityId: string,
    trigger: InteractionLink["trigger"],
    runtimeScene: RuntimeSceneDefinition,
    dispatcher: RuntimeInteractionDispatcher
  ) {
    for (const link of runtimeScene.interactionLinks) {
      if (
        link.sourceEntityId !== sourceEntityId ||
        resolveEffectiveInteractionTrigger(runtimeScene, link) !== trigger
      ) {
        continue;
      }

      for (const step of getInteractionLinkImpulseSteps(link, runtimeScene.sequences)) {
        this.dispatchSequenceStep(step, link, runtimeScene, dispatcher);
      }
    }
  }

  private dispatchSequenceStep(
    step: ImpulseSequenceStep,
    link: InteractionLink,
    runtimeScene: RuntimeSceneDefinition,
    dispatcher: RuntimeInteractionDispatcher
  ) {
    switch (step.type) {
      case "controlEffect":
        if (dispatcher.dispatchControlEffect !== undefined) {
          dispatcher.dispatchControlEffect(step.effect, link);
          return;
        }

        switch (step.effect.type) {
          case "playModelAnimation":
            dispatcher.playAnimation(
              step.effect.target.modelInstanceId,
              step.effect.clipName,
              step.effect.loop,
              link
            );
            return;
          case "stopModelAnimation":
            dispatcher.stopAnimation(step.effect.target.modelInstanceId, link);
            return;
          case "playSound":
            dispatcher.playSound(step.effect.target.entityId, link);
            return;
          case "stopSound":
            dispatcher.stopSound(step.effect.target.entityId, link);
            return;
          default:
            throw new Error(
              `Runtime control step ${step.effect.type} could not be dispatched because the runtime dispatcher does not support control effects.`
            );
        }
      case "teleportPlayer": {
        const teleportTarget = resolveTeleportTarget(
          runtimeScene,
          step.targetEntityId
        );

        if (teleportTarget !== null) {
          dispatcher.teleportPlayer(teleportTarget, link);
        }
        return;
      }
      case "startSceneTransition":
        dispatcher.startSceneTransition(
          {
            sourceEntityId: link.sourceEntityId,
            targetSceneId: step.targetSceneId,
            targetEntryEntityId: step.targetEntryEntityId
          },
          link
        );
        return;
      case "setVisibility":
        if (dispatcher.setVisibility !== undefined) {
          dispatcher.setVisibility(step.target, step.mode, link);
          return;
        }

        if (step.target.kind === "brush") {
          dispatcher.toggleBrushVisibility(
            step.target.brushId,
            step.mode === "toggle" ? undefined : step.mode === "show",
            link
          );
          return;
        }

        throw new Error(
          "Runtime visibility steps targeting model instances require dispatcher.setVisibility support."
        );
      case "makeNpcTalk":
        dispatcher.startNpcDialogue?.(step.npcEntityId, step.dialogueId, {
          kind: "interactionLink",
          sourceEntityId: link.sourceEntityId,
          linkId: link.id,
          trigger: link.trigger
        });
        return;
    }
  }
}
