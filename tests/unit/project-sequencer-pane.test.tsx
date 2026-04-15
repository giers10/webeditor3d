import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createProjectGlobalControlTargetRef,
  getControlTargetRefKey
} from "../../src/controls/control-surface";
import { createEmptyProjectDialogueLibrary } from "../../src/dialogues/project-dialogues";
import { ProjectSequencerPane } from "../../src/app/ProjectSequencerPane";
import {
  createEmptyProjectScheduler,
  createProjectScheduleRoutine
} from "../../src/scheduler/project-scheduler";
import { createEmptyProjectSequenceLibrary } from "../../src/sequencer/project-sequences";

describe("ProjectSequencerPane", () => {
  it("renders project event placements without crashing when they have no inline effects", () => {
    const target = createProjectGlobalControlTargetRef();
    const routine = createProjectScheduleRoutine({
      id: "routine-project-events",
      title: "Project Events",
      target,
      startHour: 9,
      endHour: 17,
      priority: 0,
      effects: []
    });
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines[routine.id] = routine;

    render(
      <ProjectSequencerPane
        mode="timeline"
        onSetMode={vi.fn()}
        targetOptions={[
          {
            key: getControlTargetRefKey(target),
            target,
            label: "Project Events",
            subtitle: "One-shot project events",
            groupLabel: "Project",
            defaults: {}
          }
        ]}
        teleportTargetOptions={[]}
        sceneTransitionTargetOptions={[]}
        visibilityTargetOptions={[]}
        modelAnimationTargetOptions={[]}
        soundTargetOptions={[]}
        scheduler={scheduler}
        sequences={createEmptyProjectSequenceLibrary()}
        dialogues={createEmptyProjectDialogueLibrary()}
        selectedRoutineId={routine.id}
        selectedSequenceId={null}
        onSelectRoutine={vi.fn()}
        onSelectSequence={vi.fn()}
        onAddRoutine={vi.fn()}
        onAddSequence={vi.fn()}
        onDeleteRoutine={vi.fn()}
        onDeleteSequence={vi.fn()}
        onClose={vi.fn()}
        onSetRoutineTarget={vi.fn()}
        onSetRoutineTitle={vi.fn()}
        onSetRoutineEnabled={vi.fn()}
        onSetRoutineStartHour={vi.fn()}
        onSetRoutineEndHour={vi.fn()}
        onSetRoutinePriority={vi.fn()}
        onSetRoutineSequenceId={vi.fn()}
        onSetRoutineEffectOption={vi.fn()}
        onSetRoutineNumericValue={vi.fn()}
        onSetRoutineColorValue={vi.fn()}
        onSetRoutineAnimationClip={vi.fn()}
        onSetRoutineAnimationLoop={vi.fn()}
        onSetActorRoutinePresence={vi.fn()}
        onSetActorRoutineAnimationClip={vi.fn()}
        onSetActorRoutineAnimationLoop={vi.fn()}
        onSetActorRoutinePath={vi.fn()}
        onSetActorRoutinePathSpeed={vi.fn()}
        onSetActorRoutinePathLoop={vi.fn()}
        onSetSequenceTitle={vi.fn()}
        onAddHeldControlStep={vi.fn()}
        onAddImpulseControlStep={vi.fn()}
        onAddDialogueStep={vi.fn()}
        onAddTeleportStep={vi.fn()}
        onAddSceneTransitionStep={vi.fn()}
        onAddVisibilityStep={vi.fn()}
        onAddPlayAnimationStep={vi.fn()}
        onAddStopAnimationStep={vi.fn()}
        onAddPlaySoundStep={vi.fn()}
        onAddStopSoundStep={vi.fn()}
        onDeleteStep={vi.fn()}
        onSetControlStepTarget={vi.fn()}
        onSetControlStepEffectOption={vi.fn()}
        onSetControlStepNumericValue={vi.fn()}
        onSetControlStepColorValue={vi.fn()}
        onSetControlStepAnimationClip={vi.fn()}
        onSetControlStepAnimationLoop={vi.fn()}
        onSetDialogueStepDialogueId={vi.fn()}
        onSetTeleportStepTarget={vi.fn()}
        onSetSceneTransitionStepTarget={vi.fn()}
        onSetVisibilityStepTarget={vi.fn()}
        onSetVisibilityStepMode={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Project event placements run attached sequences only/i)
    ).toBeVisible();
  });
});
