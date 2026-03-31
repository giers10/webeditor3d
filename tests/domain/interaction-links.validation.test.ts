import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import { createPlayerStartEntity, createTeleportTargetEntity, createTriggerVolumeEntity } from "../../src/entities/entity-instances";
import { createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink } from "../../src/interactions/interaction-links";

describe("interaction link validation", () => {
  it("accepts valid Trigger Volume teleport and visibility links", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-main"
    });
    const brush = createBoxBrush({
      id: "brush-door"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [teleportTarget.id]: teleportTarget
      },
      interactionLinks: {
        "link-teleport": createTeleportPlayerInteractionLink({
          id: "link-teleport",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetEntityId: teleportTarget.id
        }),
        "link-visibility": createToggleVisibilityInteractionLink({
          id: "link-visibility",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetBrushId: brush.id,
          visible: false
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("detects invalid interaction link source and target references", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [playerStart.id]: playerStart,
        [triggerVolume.id]: triggerVolume
      },
      interactionLinks: {
        "link-invalid-source": createTeleportPlayerInteractionLink({
          id: "link-invalid-source",
          sourceEntityId: playerStart.id,
          trigger: "enter",
          targetEntityId: "entity-missing-teleport-target"
        }),
        "link-invalid-visibility": createToggleVisibilityInteractionLink({
          id: "link-invalid-visibility",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetBrushId: "brush-missing"
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-interaction-source-kind",
          path: "interactionLinks.link-invalid-source.sourceEntityId"
        }),
        expect.objectContaining({
          code: "missing-teleport-target-entity",
          path: "interactionLinks.link-invalid-source.action.targetEntityId"
        }),
        expect.objectContaining({
          code: "missing-visibility-target-brush",
          path: "interactionLinks.link-invalid-visibility.action.targetBrushId"
        })
      ])
    );
  });
});
