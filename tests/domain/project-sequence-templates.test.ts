import { describe, expect, it } from "vitest";

import { createInteractionControlTargetRef } from "../../src/controls/control-surface";
import { createDefaultInteractionProjectSequence } from "../../src/sequencer/project-sequence-templates";
import type { ProjectDialogue } from "../../src/dialogues/project-dialogues";
import type { ProjectScheduleTargetOption } from "../../src/scheduler/project-schedule-control-options";

describe("project sequence templates", () => {
  it("prefers a dialogue impulse step when a project dialogue exists", () => {
    const dialogue: ProjectDialogue = {
      id: "dialogue-merchant",
      title: "Merchant",
      lines: [
        {
          id: "dialogue-line-merchant-1",
          speakerName: "Merchant",
          text: "Fresh fruit."
        }
      ]
    };

    const sequence = createDefaultInteractionProjectSequence({
      source: {
        id: "entity-interactable-merchant",
        kind: "interactable",
        name: "Merchant Stall"
      },
      dialogues: [dialogue],
      targetOptions: []
    });

    expect(sequence).toEqual(
      expect.objectContaining({
        title: "Merchant Stall Dialogue",
        steps: [
          {
            stepClass: "impulse",
            type: "startDialogue",
            dialogueId: "dialogue-merchant"
          }
        ]
      })
    );
  });

  it("falls back to an impulse control step for the selected interactable when no dialogue exists", () => {
    const targetOption: ProjectScheduleTargetOption = {
      key: "interaction:interactable:entity-interactable-gate",
      target: createInteractionControlTargetRef(
        "interactable",
        "entity-interactable-gate"
      ),
      label: "Gate Lever",
      subtitle: "Main Scene",
      groupLabel: "Interactions",
      defaults: {}
    };

    const sequence = createDefaultInteractionProjectSequence({
      source: {
        id: "entity-interactable-gate",
        kind: "interactable",
        name: "Gate Lever"
      },
      dialogues: [],
      targetOptions: [targetOption]
    });

    expect(sequence).toEqual(
      expect.objectContaining({
        title: "Gate Lever Sequence",
        steps: [
          {
            stepClass: "impulse",
            type: "controlEffect",
            effect: {
              type: "setInteractionEnabled",
              target: createInteractionControlTargetRef(
                "interactable",
                "entity-interactable-gate"
              ),
              enabled: true
            }
          }
        ]
      })
    );
  });
});
