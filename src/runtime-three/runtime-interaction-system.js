const DEFAULT_INTERACTABLE_TARGET_RADIUS = 0.75;
function subtractVec3(left, right) {
    return {
        x: left.x - right.x,
        y: left.y - right.y,
        z: left.z - right.z
    };
}
function scaleVec3(vector, scalar) {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
        z: vector.z * scalar
    };
}
function dotVec3(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}
function lengthSquaredVec3(vector) {
    return dotVec3(vector, vector);
}
function distanceBetweenVec3(left, right) {
    return Math.sqrt(lengthSquaredVec3(subtractVec3(left, right)));
}
function normalizeVec3(vector) {
    const lengthSquared = lengthSquaredVec3(vector);
    if (lengthSquared <= Number.EPSILON) {
        return null;
    }
    return scaleVec3(vector, 1 / Math.sqrt(lengthSquared));
}
function isPointInsideTriggerVolume(position, triggerVolume) {
    const halfSize = {
        x: triggerVolume.size.x * 0.5,
        y: triggerVolume.size.y * 0.5,
        z: triggerVolume.size.z * 0.5
    };
    return (position.x >= triggerVolume.position.x - halfSize.x &&
        position.x <= triggerVolume.position.x + halfSize.x &&
        position.y >= triggerVolume.position.y - halfSize.y &&
        position.y <= triggerVolume.position.y + halfSize.y &&
        position.z >= triggerVolume.position.z - halfSize.z &&
        position.z <= triggerVolume.position.z + halfSize.z);
}
function raySphereHitDistance(origin, direction, center, radius) {
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
function resolveTeleportTarget(runtimeScene, entityId) {
    return runtimeScene.entities.teleportTargets.find((teleportTarget) => teleportTarget.entityId === entityId) ?? null;
}
function hasTriggerLinks(runtimeScene, sourceEntityId, trigger) {
    return runtimeScene.interactionLinks.some((link) => link.sourceEntityId === sourceEntityId && link.trigger === trigger);
}
function getInteractableTargetRadius(interactable) {
    return Math.min(DEFAULT_INTERACTABLE_TARGET_RADIUS, interactable.radius);
}
export class RuntimeInteractionSystem {
    occupiedTriggerVolumes = new Set();
    reset() {
        this.occupiedTriggerVolumes.clear();
    }
    updatePlayerPosition(feetPosition, runtimeScene, dispatcher) {
        for (const triggerVolume of runtimeScene.entities.triggerVolumes) {
            const containsPlayer = isPointInsideTriggerVolume(feetPosition, triggerVolume);
            const wasOccupied = this.occupiedTriggerVolumes.has(triggerVolume.entityId);
            if (!wasOccupied && containsPlayer && hasTriggerLinks(runtimeScene, triggerVolume.entityId, "enter")) {
                this.dispatchLinks(triggerVolume.entityId, "enter", runtimeScene, dispatcher);
            }
            else if (wasOccupied && !containsPlayer && hasTriggerLinks(runtimeScene, triggerVolume.entityId, "exit")) {
                this.dispatchLinks(triggerVolume.entityId, "exit", runtimeScene, dispatcher);
            }
            if (containsPlayer) {
                this.occupiedTriggerVolumes.add(triggerVolume.entityId);
            }
            else {
                this.occupiedTriggerVolumes.delete(triggerVolume.entityId);
            }
        }
    }
    resolveClickInteractionPrompt(interactionOrigin, rayOrigin, rayDirection, runtimeScene) {
        const normalizedViewDirection = normalizeVec3(rayDirection);
        if (normalizedViewDirection === null) {
            return null;
        }
        let bestPrompt = null;
        let bestHitDistance = Number.POSITIVE_INFINITY;
        for (const interactable of runtimeScene.entities.interactables) {
            if (!interactable.enabled || !hasTriggerLinks(runtimeScene, interactable.entityId, "click")) {
                continue;
            }
            const distance = distanceBetweenVec3(interactionOrigin, interactable.position);
            if (distance > interactable.radius) {
                continue;
            }
            const hitDistance = raySphereHitDistance(rayOrigin, normalizedViewDirection, interactable.position, getInteractableTargetRadius(interactable));
            if (hitDistance === null) {
                continue;
            }
            const nextPrompt = {
                sourceEntityId: interactable.entityId,
                prompt: interactable.prompt,
                distance,
                range: interactable.radius
            };
            if (hitDistance < bestHitDistance ||
                (hitDistance === bestHitDistance &&
                    (bestPrompt === null ||
                        distance < bestPrompt.distance ||
                        (distance === bestPrompt.distance && interactable.entityId.localeCompare(bestPrompt.sourceEntityId) < 0)))) {
                bestHitDistance = hitDistance;
                bestPrompt = nextPrompt;
            }
        }
        return bestPrompt;
    }
    dispatchClickInteraction(sourceEntityId, runtimeScene, dispatcher) {
        this.dispatchLinks(sourceEntityId, "click", runtimeScene, dispatcher);
    }
    dispatchLinks(sourceEntityId, trigger, runtimeScene, dispatcher) {
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
