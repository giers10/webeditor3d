import type { Vec3 } from "../core/vector";
import type { InteractionLink } from "../interactions/interaction-links";

import type {
  RuntimeInteractable,
  RuntimeSceneDefinition,
  RuntimeSceneExit,
  RuntimeTeleportTarget,
  RuntimeTriggerVolume
} from "./runtime-scene-build";

const DEFAULT_INTERACTABLE_TARGET_RADIUS = 0.75;

export interface RuntimeInteractionDispatcher {
  teleportPlayer(target: RuntimeTeleportTarget, link: InteractionLink): void;
  activateSceneExit(sceneExit: RuntimeSceneExit): void;
  toggleBrushVisibility(brushId: string, visible: boolean | undefined, link: InteractionLink): void;
  playAnimation(instanceId: string, clipName: string, loop: boolean | undefined, link: InteractionLink): void;
  stopAnimation(instanceId: string, link: InteractionLink): void;
  playSound(soundEmitterId: string, link: InteractionLink): void;
  stopSound(soundEmitterId: string, link: InteractionLink): void;
}

export interface RuntimeInteractionPrompt {
  sourceEntityId: string;
  prompt: string;
  distance: number;
  range: number;
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

function isPointInsideTriggerVolume(position: Vec3, triggerVolume: RuntimeTriggerVolume): boolean {
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

function raySphereHitDistance(origin: Vec3, direction: Vec3, center: Vec3, radius: number): number | null {
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

function resolveTeleportTarget(runtimeScene: RuntimeSceneDefinition, entityId: string): RuntimeTeleportTarget | null {
  return runtimeScene.entities.teleportTargets.find((teleportTarget) => teleportTarget.entityId === entityId) ?? null;
}

function hasTriggerLinks(runtimeScene: RuntimeSceneDefinition, sourceEntityId: string, trigger: InteractionLink["trigger"]): boolean {
  return runtimeScene.interactionLinks.some((link) => link.sourceEntityId === sourceEntityId && link.trigger === trigger);
}

function getInteractableTargetRadius(interactable: RuntimeInteractable): number {
  return Math.min(DEFAULT_INTERACTABLE_TARGET_RADIUS, interactable.radius);
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
          candidateEntityId.localeCompare(currentBestPrompt.sourceEntityId) < 0)))
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

  updatePlayerPosition(feetPosition: Vec3, runtimeScene: RuntimeSceneDefinition, dispatcher: RuntimeInteractionDispatcher) {
    for (const triggerVolume of runtimeScene.entities.triggerVolumes) {
      const containsPlayer = isPointInsideTriggerVolume(feetPosition, triggerVolume);
      const wasOccupied = this.occupiedTriggerVolumes.has(triggerVolume.entityId);

      if (!wasOccupied && containsPlayer && hasTriggerLinks(runtimeScene, triggerVolume.entityId, "enter")) {
        this.dispatchLinks(triggerVolume.entityId, "enter", runtimeScene, dispatcher);
      } else if (wasOccupied && !containsPlayer && hasTriggerLinks(runtimeScene, triggerVolume.entityId, "exit")) {
        this.dispatchLinks(triggerVolume.entityId, "exit", runtimeScene, dispatcher);
      }

      if (containsPlayer) {
        this.occupiedTriggerVolumes.add(triggerVolume.entityId);
      } else {
        this.occupiedTriggerVolumes.delete(triggerVolume.entityId);
      }
    }
  }

  resolveClickInteractionPrompt(viewOrigin: Vec3, viewDirection: Vec3, runtimeScene: RuntimeSceneDefinition): RuntimeInteractionPrompt | null {
    const normalizedViewDirection = normalizeVec3(viewDirection);

    if (normalizedViewDirection === null) {
      return null;
    }

    let bestPrompt: RuntimeInteractionPrompt | null = null;
    let bestHitDistance = Number.POSITIVE_INFINITY;

    for (const interactable of runtimeScene.entities.interactables) {
      if (!interactable.enabled || !hasTriggerLinks(runtimeScene, interactable.entityId, "click")) {
        continue;
      }

      const distance = distanceBetweenVec3(viewOrigin, interactable.position);

      if (distance > interactable.radius) {
        continue;
      }

      const hitDistance = raySphereHitDistance(
        viewOrigin,
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

    for (const sceneExit of runtimeScene.entities.sceneExits) {
      if (!sceneExit.enabled) {
        continue;
      }

      const distance = distanceBetweenVec3(viewOrigin, sceneExit.position);

      if (distance > sceneExit.radius) {
        continue;
      }

      const hitDistance = raySphereHitDistance(
        viewOrigin,
        normalizedViewDirection,
        sceneExit.position,
        Math.min(DEFAULT_INTERACTABLE_TARGET_RADIUS, sceneExit.radius)
      );

      if (hitDistance === null) {
        continue;
      }

      const next = updateBestPrompt(
        bestPrompt,
        bestHitDistance,
        sceneExit.entityId,
        sceneExit.prompt,
        distance,
        sceneExit.radius,
        hitDistance
      );
      bestPrompt = next.prompt;
      bestHitDistance = next.hitDistance;
    }

    return bestPrompt;
  }

  dispatchClickInteraction(sourceEntityId: string, runtimeScene: RuntimeSceneDefinition, dispatcher: RuntimeInteractionDispatcher) {
    const sceneExit =
      runtimeScene.entities.sceneExits.find(
        (candidate) => candidate.entityId === sourceEntityId
      ) ?? null;

    if (sceneExit !== null) {
      dispatcher.activateSceneExit(sceneExit);
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
      if (link.sourceEntityId !== sourceEntityId || link.trigger !== trigger) {
        continue;
      }

      switch (link.action.type) {
        case "teleportPlayer": {
          const teleportTarget = resolveTeleportTarget(runtimeScene, link.action.targetEntityId);

          if (teleportTarget !== null) {
            dispatcher.teleportPlayer(teleportTarget, link);
          }
          break;
        }
        case "toggleVisibility":
          dispatcher.toggleBrushVisibility(link.action.targetBrushId, link.action.visible, link);
          break;
        case "playAnimation":
          dispatcher.playAnimation(link.action.targetModelInstanceId, link.action.clipName, link.action.loop, link);
          break;
        case "stopAnimation":
          dispatcher.stopAnimation(link.action.targetModelInstanceId, link);
          break;
        case "playSound":
          dispatcher.playSound(link.action.targetSoundEmitterId, link);
          break;
        case "stopSound":
          dispatcher.stopSound(link.action.targetSoundEmitterId, link);
          break;
      }
    }
  }
}
