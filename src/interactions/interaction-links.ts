import { createOpaqueId } from "../core/ids";

export const INTERACTION_TRIGGER_KINDS = ["enter", "exit", "click"] as const;
export type InteractionTriggerKind = (typeof INTERACTION_TRIGGER_KINDS)[number];

export interface TeleportPlayerAction {
  type: "teleportPlayer";
  targetEntityId: string;
}

export interface ToggleVisibilityAction {
  type: "toggleVisibility";
  targetBrushId: string;
  visible?: boolean;
}

export type InteractionAction = TeleportPlayerAction | ToggleVisibilityAction;

export interface InteractionLink {
  id: string;
  sourceEntityId: string;
  trigger: InteractionTriggerKind;
  action: InteractionAction;
}

export interface CreateTeleportPlayerInteractionLinkOptions {
  id?: string;
  sourceEntityId: string;
  trigger?: InteractionTriggerKind;
  targetEntityId: string;
}

export interface CreateToggleVisibilityInteractionLinkOptions {
  id?: string;
  sourceEntityId: string;
  trigger?: InteractionTriggerKind;
  targetBrushId: string;
  visible?: boolean;
}

function assertNonEmptyString(value: string, label: string) {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }
}

function cloneAction(action: InteractionAction): InteractionAction {
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
  }
}

export function isInteractionTriggerKind(value: unknown): value is InteractionTriggerKind {
  return value === "enter" || value === "exit" || value === "click";
}

export function createTeleportPlayerInteractionLink(options: CreateTeleportPlayerInteractionLinkOptions): InteractionLink {
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

export function createToggleVisibilityInteractionLink(options: CreateToggleVisibilityInteractionLinkOptions): InteractionLink {
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

export function cloneInteractionLink(link: InteractionLink): InteractionLink {
  return {
    id: link.id,
    sourceEntityId: link.sourceEntityId,
    trigger: link.trigger,
    action: cloneAction(link.action)
  };
}

export function areInteractionLinksEqual(left: InteractionLink, right: InteractionLink): boolean {
  if (left.id !== right.id || left.sourceEntityId !== right.sourceEntityId || left.trigger !== right.trigger) {
    return false;
  }

  if (left.action.type !== right.action.type) {
    return false;
  }

  switch (left.action.type) {
    case "teleportPlayer":
      return left.action.targetEntityId === (right.action as TeleportPlayerAction).targetEntityId;
    case "toggleVisibility":
      return (
        left.action.targetBrushId === (right.action as ToggleVisibilityAction).targetBrushId &&
        left.action.visible === (right.action as ToggleVisibilityAction).visible
      );
  }
}

export function cloneInteractionLinkRegistry(links: Record<string, InteractionLink>): Record<string, InteractionLink> {
  return Object.fromEntries(Object.entries(links).map(([linkId, link]) => [linkId, cloneInteractionLink(link)]));
}

export function compareInteractionLinks(left: InteractionLink, right: InteractionLink): number {
  if (left.sourceEntityId !== right.sourceEntityId) {
    return left.sourceEntityId.localeCompare(right.sourceEntityId);
  }

  if (left.trigger !== right.trigger) {
    return left.trigger.localeCompare(right.trigger);
  }

  return left.id.localeCompare(right.id);
}

export function getInteractionLinks(links: Record<string, InteractionLink>): InteractionLink[] {
  return Object.values(links).sort(compareInteractionLinks);
}

export function getInteractionLinksForSource(links: Record<string, InteractionLink>, sourceEntityId: string): InteractionLink[] {
  return getInteractionLinks(links).filter((link) => link.sourceEntityId === sourceEntityId);
}
