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
          type: "setVisibility",
          target: {
            kind: "brush",
            brushId: "brush-a"
          },
          mode: "toggle"
        }
      ]
    });

    const onAddTeleportStep = vi.fn();
    const onAddVisibilityStep = vi.fn();
    const onAddPlayAnimationStep = vi.fn();
    const onAddStopAnimationStep = vi.fn();
    const onAddPlaySoundStep = vi.fn();
    const onAddStopSoundStep = vi.fn();
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
        sceneTransitionTargetOptions={[
          {
            targetKey: "scene-house::entry-front",
            label: "House · Front Entry"
          }
        ]}
        visibilityTargetOptions={[
          { targetKey: "brush:brush-a", label: "Wall A" },
          { targetKey: "brush:brush-b", label: "Wall B" }
        ]}
        modelAnimationTargetOptions={[
          { targetKey: "modelInstance:model-a", label: "Model A" }
        ]}
        soundTargetOptions={[{ targetKey: "entity:sound-a", label: "Sound A" }]}
        selectedSequenceId={sequence.id}
        onSelectSequence={() => {}}
        onAddSequence={() => {}}
        onDeleteSequence={() => {}}
        onSetSequenceTitle={() => {}}
        onAddHeldControlStep={() => {}}
        onAddImpulseControlStep={() => {}}
        onAddDialogueStep={() => {}}
        onAddTeleportStep={onAddTeleportStep}
        onAddSceneTransitionStep={() => {}}
        onAddVisibilityStep={onAddVisibilityStep}
        onAddPlayAnimationStep={onAddPlayAnimationStep}
        onAddStopAnimationStep={onAddStopAnimationStep}
        onAddPlaySoundStep={onAddPlaySoundStep}
        onAddStopSoundStep={onAddStopSoundStep}
        onDeleteStep={() => {}}
        onSetControlStepTarget={() => {}}
        onSetControlStepEffectOption={() => {}}
        onSetControlStepNumericValue={() => {}}
        onSetControlStepColorValue={() => {}}
        onSetControlStepAnimationClip={() => {}}
        onSetControlStepAnimationLoop={() => {}}
        onSetControlStepPathId={() => {}}
        onSetControlStepPathSpeed={() => {}}
        onSetControlStepPathLoop={() => {}}
        onSetDialogueStepDialogueId={() => {}}
        onSetTeleportStepTarget={onSetTeleportStepTarget}
        onSetSceneTransitionStepTarget={() => {}}
        onSetVisibilityStepTarget={onSetVisibilityStepTarget}
        onSetVisibilityStepMode={onSetVisibilityStepMode}
      />
    );

    fireEvent.change(screen.getByLabelText("Teleport Target"), {
      target: { value: "teleport-b" }
    });
    fireEvent.change(screen.getByLabelText("Target"), {
      target: { value: "brush:brush-b" }
    });
    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "hide" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Teleport Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Visibility Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Play Animation Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Stop Animation Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Play Sound Effect" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Stop Sound Effect" }));

    expect(onSetTeleportStepTarget).toHaveBeenCalledWith(
      "sequence-main",
      0,
      "teleport-b"
    );
    expect(onSetVisibilityStepTarget).toHaveBeenCalledWith(
      "sequence-main",
      1,
      "brush:brush-b"
    );
    expect(onSetVisibilityStepMode).toHaveBeenCalledWith(
      "sequence-main",
      1,
      "hide"
    );
    expect(onAddTeleportStep).toHaveBeenCalledWith("sequence-main", "teleport-a");
    expect(onAddVisibilityStep).toHaveBeenCalledWith(
      "sequence-main",
      "brush:brush-a"
    );
    expect(onAddPlayAnimationStep).toHaveBeenCalledWith(
      "sequence-main",
      "modelInstance:model-a"
    );
    expect(onAddStopAnimationStep).toHaveBeenCalledWith(
      "sequence-main",
      "modelInstance:model-a"
    );
    expect(onAddPlaySoundStep).toHaveBeenCalledWith(
      "sequence-main",
      "entity:sound-a"
    );
    expect(onAddStopSoundStep).toHaveBeenCalledWith(
      "sequence-main",
      "entity:sound-a"
    );
  });

  it("edits actor animation and path effects through the sequence editor", () => {
    const onSetControlStepAnimationClip = vi.fn();
    const onSetControlStepAnimationLoop = vi.fn();
    const onSetControlStepPathId = vi.fn();
    const onSetControlStepPathSpeed = vi.fn();
    const onSetControlStepPathLoop = vi.fn();

    render(
      <ProjectSequencesPanel
        sequences={{
          sequences: {
            "sequence-actor": createProjectSequence({
              id: "sequence-actor",
              title: "Actor Routine",
              effects: [
                {
                  stepClass: "held",
                  type: "controlEffect",
                  effect: {
                    type: "playActorAnimation",
                    target: {
                      kind: "actor",
                      actorId: "actor-guard"
                    },
                    clipName: "Idle",
                    loop: true
                  }
                },
                {
                  stepClass: "held",
                  type: "controlEffect",
                  effect: {
                    type: "followActorPath",
                    target: {
                      kind: "actor",
                      actorId: "actor-guard"
                    },
                    pathId: "path-a",
                    speed: 1,
                    loop: false,
                    progressMode: "deriveFromTime"
                  }
                }
              ]
            })
          }
        }}
        dialogues={{ dialogues: {} }}
        targetOptions={[
          {
            key: "actor:actor-guard",
            target: {
              kind: "actor",
              actorId: "actor-guard"
            },
            label: "Guard",
            subtitle: "NPC",
            groupLabel: "Actors",
            defaults: {
              actorAnimationClipNames: ["Idle", "Wave"],
              actorPathOptions: [
                { pathId: "path-a", label: "Patrol A", loop: false },
                { pathId: "path-b", label: "Patrol B", loop: true }
              ],
              actorPathSpeed: 1.2
            }
          }
        ]}
        teleportTargetOptions={[]}
        sceneTransitionTargetOptions={[]}
        visibilityTargetOptions={[]}
        modelAnimationTargetOptions={[]}
        soundTargetOptions={[]}
        selectedSequenceId="sequence-actor"
        onSelectSequence={() => {}}
        onAddSequence={() => {}}
        onDeleteSequence={() => {}}
        onSetSequenceTitle={() => {}}
        onAddHeldControlStep={() => {}}
        onAddImpulseControlStep={() => {}}
        onAddDialogueStep={() => {}}
        onAddTeleportStep={() => {}}
        onAddSceneTransitionStep={() => {}}
        onAddVisibilityStep={() => {}}
        onAddPlayAnimationStep={() => {}}
        onAddStopAnimationStep={() => {}}
        onAddPlaySoundStep={() => {}}
        onAddStopSoundStep={() => {}}
        onDeleteStep={() => {}}
        onSetControlStepTarget={() => {}}
        onSetControlStepEffectOption={() => {}}
        onSetControlStepNumericValue={() => {}}
        onSetControlStepColorValue={() => {}}
        onSetControlStepAnimationClip={onSetControlStepAnimationClip}
        onSetControlStepAnimationLoop={onSetControlStepAnimationLoop}
        onSetControlStepPathId={onSetControlStepPathId}
        onSetControlStepPathSpeed={onSetControlStepPathSpeed}
        onSetControlStepPathLoop={onSetControlStepPathLoop}
        onSetDialogueStepDialogueId={() => {}}
        onSetTeleportStepTarget={() => {}}
        onSetSceneTransitionStepTarget={() => {}}
        onSetVisibilityStepTarget={() => {}}
        onSetVisibilityStepMode={() => {}}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Idle"), {
      target: { value: "Wave" }
    });
    fireEvent.click(screen.getByLabelText("Loop"));
    fireEvent.change(screen.getByDisplayValue("Patrol A"), {
      target: { value: "path-b" }
    });
    fireEvent.blur(screen.getByDisplayValue("1"), {
      target: { value: "1.6" }
    });
    fireEvent.click(screen.getAllByLabelText("Loop")[1]!);

    expect(onSetControlStepAnimationClip).toHaveBeenCalledWith(
      "sequence-actor",
      0,
      "Wave"
    );
    expect(onSetControlStepAnimationLoop).toHaveBeenCalledWith(
      "sequence-actor",
      0,
      false
    );
    expect(onSetControlStepPathId).toHaveBeenCalledWith(
      "sequence-actor",
      1,
      "path-b"
    );
    expect(onSetControlStepPathSpeed).toHaveBeenCalledWith(
      "sequence-actor",
      1,
      1.6
    );
    expect(onSetControlStepPathLoop).toHaveBeenCalledWith(
      "sequence-actor",
      1,
      true
    );
  });
});
