import { createOpaqueId } from "../core/ids";
export const INTERACTION_TRIGGER_KINDS = ["enter", "exit", "click"];
function assertNonEmptyString(value, label) {
    if (value.trim().length === 0) {
        throw new Error(`${label} must be non-empty.`);
    }
}
function cloneAction(action) {
    switch (action.type) {
        case "teleportPlayer":
            return {
                type: "teleportPlayer",
                targetEntityId: action.targetEntityId
            };
        case "toggleVisibility":
            return {
                type: "toggleVisibility",
                targetBrushId: action.targetBrushId,
                visible: action.visible
            };
        case "playAnimation":
            return {
                type: "playAnimation",
                targetModelInstanceId: action.targetModelInstanceId,
                clipName: action.clipName,
                loop: action.loop
            };
        case "stopAnimation":
            return {
                type: "stopAnimation",
                targetModelInstanceId: action.targetModelInstanceId
            };
        case "playSound":
            return {
                type: "playSound",
                targetSoundEmitterId: action.targetSoundEmitterId
            };
        case "stopSound":
            return {
                type: "stopSound",
                targetSoundEmitterId: action.targetSoundEmitterId
            };
    }
}
export function isInteractionTriggerKind(value) {
    return value === "enter" || value === "exit" || value === "click";
}
export function createTeleportPlayerInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetEntityId, "Teleport target entity id");
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "teleportPlayer",
            targetEntityId: options.targetEntityId
        }
    };
}
export function createToggleVisibilityInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetBrushId, "Visibility target brush id");
    if (options.visible !== undefined && typeof options.visible !== "boolean") {
        throw new Error("Visibility action visible must be a boolean when authored.");
    }
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "toggleVisibility",
            targetBrushId: options.targetBrushId,
            visible: options.visible
        }
    };
}
export function createPlayAnimationInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetModelInstanceId, "Play animation target model instance id");
    assertNonEmptyString(options.clipName, "Play animation clip name");
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "playAnimation",
            targetModelInstanceId: options.targetModelInstanceId,
            clipName: options.clipName,
            loop: options.loop
        }
    };
}
export function createStopAnimationInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetModelInstanceId, "Stop animation target model instance id");
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "stopAnimation",
            targetModelInstanceId: options.targetModelInstanceId
        }
    };
}
export function createPlaySoundInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetSoundEmitterId, "Play sound target sound emitter id");
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "playSound",
            targetSoundEmitterId: options.targetSoundEmitterId
        }
    };
}
export function createStopSoundInteractionLink(options) {
    assertNonEmptyString(options.sourceEntityId, "Interaction source entity id");
    assertNonEmptyString(options.targetSoundEmitterId, "Stop sound target sound emitter id");
    return {
        id: options.id ?? createOpaqueId("interaction-link"),
        sourceEntityId: options.sourceEntityId,
        trigger: options.trigger ?? "enter",
        action: {
            type: "stopSound",
            targetSoundEmitterId: options.targetSoundEmitterId
        }
    };
}
export function cloneInteractionLink(link) {
    return {
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        action: cloneAction(link.action)
    };
}
export function areInteractionLinksEqual(left, right) {
    if (left.id !== right.id || left.sourceEntityId !== right.sourceEntityId || left.trigger !== right.trigger) {
        return false;
    }
    if (left.action.type !== right.action.type) {
        return false;
    }
    switch (left.action.type) {
        case "teleportPlayer":
            return left.action.targetEntityId === right.action.targetEntityId;
        case "toggleVisibility":
            return (left.action.targetBrushId === right.action.targetBrushId &&
                left.action.visible === right.action.visible);
        case "playAnimation":
            return (left.action.targetModelInstanceId === right.action.targetModelInstanceId &&
                left.action.clipName === right.action.clipName &&
                left.action.loop === right.action.loop);
        case "stopAnimation":
            return left.action.targetModelInstanceId === right.action.targetModelInstanceId;
        case "playSound":
            return left.action.targetSoundEmitterId === right.action.targetSoundEmitterId;
        case "stopSound":
            return left.action.targetSoundEmitterId === right.action.targetSoundEmitterId;
        default: {
            // Exhaustive check — TypeScript should never reach here
            const _exhaustive = left.action;
            void _exhaustive;
            return false;
        }
    }
}
export function cloneInteractionLinkRegistry(links) {
    return Object.fromEntries(Object.entries(links).map(([linkId, link]) => [linkId, cloneInteractionLink(link)]));
}
export function compareInteractionLinks(left, right) {
    if (left.sourceEntityId !== right.sourceEntityId) {
        return left.sourceEntityId.localeCompare(right.sourceEntityId);
    }
    if (left.trigger !== right.trigger) {
        return left.trigger.localeCompare(right.trigger);
    }
    return left.id.localeCompare(right.id);
}
export function getInteractionLinks(links) {
    return Object.values(links).sort(compareInteractionLinks);
}
export function getInteractionLinksForSource(links, sourceEntityId) {
    return getInteractionLinks(links).filter((link) => link.sourceEntityId === sourceEntityId);
}
