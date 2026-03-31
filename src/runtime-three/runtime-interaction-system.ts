import type { Vec3 } from "../core/vector";
import type { InteractionLink } from "../interactions/interaction-links";

import type { RuntimeSceneDefinition, RuntimeTeleportTarget, RuntimeTriggerVolume } from "./runtime-scene-build";

export interface RuntimeInteractionDispatcher {
  teleportPlayer(target: RuntimeTeleportTarget, link: InteractionLink): void;
  toggleBrushVisibility(brushId: string, visible: boolean | undefined, link: InteractionLink): void;
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

function resolveTeleportTarget(runtimeScene: RuntimeSceneDefinition, entityId: string): RuntimeTeleportTarget | null {
  return runtimeScene.entities.teleportTargets.find((teleportTarget) => teleportTarget.entityId === entityId) ?? null;
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

      if (!wasOccupied && containsPlayer && triggerVolume.triggerOnEnter) {
        this.dispatchLinks(triggerVolume.entityId, "enter", runtimeScene, dispatcher);
      } else if (wasOccupied && !containsPlayer && triggerVolume.triggerOnExit) {
        this.dispatchLinks(triggerVolume.entityId, "exit", runtimeScene, dispatcher);
      }

      if (containsPlayer) {
        this.occupiedTriggerVolumes.add(triggerVolume.entityId);
      } else {
        this.occupiedTriggerVolumes.delete(triggerVolume.entityId);
      }
    }
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
      }
    }
  }
}
