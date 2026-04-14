import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectSequencesPanel } from "../../src/app/ProjectSequencesPanel";
import { createProjectSequence } from "../../src/sequencer/project-sequences";

describe("ProjectSequencesPanel", () => {
  it("edits teleport and visibility sequence effects through the sequence editor", () => {
    const sequence = createProjectSequence({
      id: "sequence-main",
      title: "Console Sequence",
      effects: [
        {
          stepClass: "impulse",
          type: "teleportPlayer",
          targetEntityId: "teleport-a"
        },
        {
          stepClass: "impulse",
          type: "toggleVisibility",
          targetBrushId: "brush-a",
          visible: undefined
        }
      ]
    });

    const onAddTeleportStep = vi.fn();
    const onAddVisibilityStep = vi.fn();
    const onSetTeleportStepTarget = vi.fn();
    const onSetVisibilityStepTarget = vi.fn();
    const onSetVisibilityStepMode = vi.fn();

    render(
      <ProjectSequencesPanel
        sequences={{
          sequences: {
            [sequence.id]: sequence
          }
        }}
        dialogues={{ dialogues: {} }}
        targetOptions={[]}
        teleportTargetOptions={[
          { entityId: "teleport-a", label: "North Gate" },
          { entityId: "teleport-b", label: "South Gate" }
        ]}
        visibilityTargetOptions={[
          { brushId: "brush-a", label: "Wall A" },
          { brushId: "brush-b", label: "Wall B" }
        ]}
        selectedSequenceId={sequence.id}
        onSelectSequence={() => {}}
        onAddSequence={() => {}}
        onDeleteSequence={() => {}}
        onSetSequenceTitle={() => {}}
        onAddHeldControlStep={() => {}}
        onAddImpulseControlStep={() => {}}
        onAddDialogueStep={() => {}}
        onAddTeleportStep={onAddTeleportStep}
        onAddVisibilityStep={onAddVisibilityStep}
        onDeleteStep={() => {}}
        onSetControlStepTarget={() => {}}
        onSetControlStepEffectOption={() => {}}
        onSetControlStepNumericValue={() => {}}
        onSetControlStepColorValue={() => {}}
        onSetControlStepAnimationClip={() => {}}
        onSetControlStepAnimationLoop={() => {}}
        onSetDialogueStepDialogueId={() => {}}
        onSetTeleportStepTarget={onSetTeleportStepTarget}
        onSetVisibilityStepTarget={onSetVisibilityStepTarget}
        onSetVisibilityStepMode={onSetVisibilityStepMode}
      />
    );

    fireEvent.change(screen.getByLabelText("Teleport Target"), {
      target: { value: "teleport-b" }
    });
    fireEvent.change(screen.getByLabelText("Whitebox Solid"), {
      target: { value: "brush-b" }
    });
    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "hide" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Teleport Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Visibility Effect" }));

    expect(onSetTeleportStepTarget).toHaveBeenCalledWith(
      "sequence-main",
      0,
      "teleport-b"
    );
    expect(onSetVisibilityStepTarget).toHaveBeenCalledWith(
      "sequence-main",
      1,
      "brush-b"
    );
    expect(onSetVisibilityStepMode).toHaveBeenCalledWith(
      "sequence-main",
      1,
      "hide"
    );
    expect(onAddTeleportStep).toHaveBeenCalledWith("sequence-main", "teleport-a");
    expect(onAddVisibilityStep).toHaveBeenCalledWith("sequence-main", "brush-a");
  });
});
