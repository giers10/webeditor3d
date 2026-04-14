import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createLightControlTargetRef,
  createPlaySoundControlEffect,
  createSetActorPresenceControlEffect,
  createSetLightEnabledControlEffect,
  createSoundEmitterControlTargetRef
} from "../../src/controls/control-surface";
import {
  createControlInteractionLink,
  createPlaySoundInteractionLink,
  createStartDialogueInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import {
  getInteractionLinkSequenceSteps,
  getProjectScheduleRoutineSequenceSteps
} from "../../src/sequencer/project-sequence-steps";

describe("project sequence steps", () => {
  it("normalizes existing interaction link actions into shared sequence steps", () => {
    const playSoundLink = createPlaySoundInteractionLink({
      id: "link-play-sound",
      sourceEntityId: "entity-trigger-main",
      targetSoundEmitterId: "entity-sound-main"
    });
    const dialogueLink = createStartDialogueInteractionLink({
      id: "link-start-dialogue",
      sourceEntityId: "entity-trigger-main",
      dialogueId: "dialogue-main"
    });
    const teleportLink = createTeleportPlayerInteractionLink({
      id: "link-teleport",
      sourceEntityId: "entity-trigger-main",
      targetEntityId: "entity-teleport-target"
    });
    const visibilityLink = createToggleVisibilityInteractionLink({
      id: "link-hide-brush",
      sourceEntityId: "entity-trigger-main",
      targetBrushId: "brush-main",
      visible: false
    });

    expect(getInteractionLinkSequenceSteps(playSoundLink)).toEqual([
      {
        type: "controlEffect",
        effect: createPlaySoundControlEffect({
          target: createSoundEmitterControlTargetRef("entity-sound-main")
        })
      }
    ]);
    expect(getInteractionLinkSequenceSteps(dialogueLink)).toEqual([
      {
        type: "startDialogue",
        dialogueId: "dialogue-main"
      }
    ]);
    expect(getInteractionLinkSequenceSteps(teleportLink)).toEqual([
      {
        type: "teleportPlayer",
        targetEntityId: "entity-teleport-target"
      }
    ]);
    expect(getInteractionLinkSequenceSteps(visibilityLink)).toEqual([
      {
        type: "toggleVisibility",
        targetBrushId: "brush-main",
        visible: false
      }
    ]);
  });

  it("projects schedule routines into shared sequence steps", () => {
    const actorTarget = createActorControlTargetRef("actor-guard");
    const lightTarget = createLightControlTargetRef(
      "pointLight",
      "entity-point-light-main"
    );
    const actorRoutine = createProjectScheduleRoutine({
      id: "routine-guard",
      title: "Guard Duty",
      target: actorTarget,
      effects: [
        createSetActorPresenceControlEffect({
          target: actorTarget,
          active: true
        })
      ]
    });
    const lightRoutine = createProjectScheduleRoutine({
      id: "routine-light",
      title: "Night Light",
      target: lightTarget,
      effect: createSetLightEnabledControlEffect({
        target: lightTarget,
        enabled: false
      })
    });
    const directControlLink = createControlInteractionLink({
      id: "link-light-control",
      sourceEntityId: "entity-trigger-main",
      effect: createSetLightEnabledControlEffect({
        target: lightTarget,
        enabled: false
      })
    });

    expect(getProjectScheduleRoutineSequenceSteps(actorRoutine)).toEqual([
      {
        type: "controlEffect",
        effect: createSetActorPresenceControlEffect({
          target: actorTarget,
          active: true
        })
      }
    ]);
    expect(getProjectScheduleRoutineSequenceSteps(lightRoutine)).toEqual(
      getInteractionLinkSequenceSteps(directControlLink)
    );
  });
});
