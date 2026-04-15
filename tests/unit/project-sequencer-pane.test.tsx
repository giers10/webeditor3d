import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createActorControlTargetRef,
  createProjectGlobalControlTargetRef,
  getControlTargetRefKey
} from "../../src/controls/control-surface";
import { createEmptyProjectDialogueLibrary } from "../../src/dialogues/project-dialogues";
import { ProjectSequencerPane } from "../../src/app/ProjectSequencerPane";
import {
  createEmptyProjectScheduler,
  createProjectScheduleRoutine
} from "../../src/scheduler/project-scheduler";
import type { ProjectScheduleTargetOption } from "../../src/scheduler/project-schedule-control-options";
import { createEmptyProjectSequenceLibrary } from "../../src/sequencer/project-sequences";

describe("ProjectSequencerPane", () => {
  function renderPane({
    scheduler = createEmptyProjectScheduler(),
    targetOptions,
    selectedRoutineId = null,
    onSetRoutineTarget = vi.fn(),
    onSetRoutineStartHour = vi.fn(),
    onSetRoutineEndHour = vi.fn()
  }: {
    scheduler?: ReturnType<typeof createEmptyProjectScheduler>;
    targetOptions: ProjectScheduleTargetOption[];
    selectedRoutineId?: string | null;
    onSetRoutineTarget?: ReturnType<typeof vi.fn>;
    onSetRoutineStartHour?: ReturnType<typeof vi.fn>;
    onSetRoutineEndHour?: ReturnType<typeof vi.fn>;
  }) {
    return render(
      <ProjectSequencerPane
        mode="timeline"
        onSetMode={vi.fn()}
        targetOptions={targetOptions}
        teleportTargetOptions={[]}
        sceneTransitionTargetOptions={[]}
        visibilityTargetOptions={[]}
        modelAnimationTargetOptions={[]}
        soundTargetOptions={[]}
        scheduler={scheduler}
        sequences={createEmptyProjectSequenceLibrary()}
        dialogues={createEmptyProjectDialogueLibrary()}
        selectedRoutineId={selectedRoutineId}
        selectedSequenceId={null}
        onSelectRoutine={vi.fn()}
        onSelectSequence={vi.fn()}
        onAddRoutine={vi.fn()}
        onAddSequence={vi.fn()}
        onDeleteRoutine={vi.fn()}
        onDeleteSequence={vi.fn()}
        onClose={vi.fn()}
        onSetRoutineTarget={onSetRoutineTarget}
        onSetRoutineTitle={vi.fn()}
        onSetRoutineEnabled={vi.fn()}
        onSetRoutineStartHour={onSetRoutineStartHour}
        onSetRoutineEndHour={onSetRoutineEndHour}
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
  }

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

    renderPane({
      scheduler,
      targetOptions: [
        {
          key: getControlTargetRefKey(target),
          target,
          label: "Project Events",
          subtitle: "One-shot project events",
          groupLabel: "Project",
          defaults: {}
        }
      ],
      selectedRoutineId: routine.id
    });

    expect(
      screen.getByText(/Project event placements run attached sequences only/i)
    ).toBeVisible();
    expect(screen.queryByText("Target")).toBeNull();
    expect(screen.queryByText("Legacy Day Filter")).toBeNull();
  });

  it("moves sequence placements horizontally and between target rows", () => {
    const actorA = createActorControlTargetRef("actor-a");
    const actorB = createActorControlTargetRef("actor-b");
    const routine = createProjectScheduleRoutine({
      id: "routine-a",
      title: "Morning Patrol",
      target: actorA,
      startHour: 9,
      endHour: 10,
      priority: 0,
      effects: []
    });
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines[routine.id] = routine;
    const onSetRoutineTarget = vi.fn();
    const onSetRoutineStartHour = vi.fn();
    const onSetRoutineEndHour = vi.fn();

    const { container } = renderPane({
      scheduler,
      targetOptions: [
        {
          key: getControlTargetRefKey(actorA),
          target: actorA,
          label: "Guard A",
          subtitle: "NPC",
          groupLabel: "Actors",
          defaults: {
            actorAnimationClipNames: [],
            actorPathOptions: []
          }
        },
        {
          key: getControlTargetRefKey(actorB),
          target: actorB,
          label: "Guard B",
          subtitle: "NPC",
          groupLabel: "Actors",
          defaults: {
            actorAnimationClipNames: [],
            actorPathOptions: []
          }
        }
      ],
      selectedRoutineId: routine.id,
      onSetRoutineTarget,
      onSetRoutineStartHour,
      onSetRoutineEndHour
    });

    const tracks = container.querySelectorAll<HTMLElement>(
      "[data-sequencer-track='true']"
    );
    expect(tracks).toHaveLength(2);

    Object.defineProperty(tracks[0], "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width: 1440,
        height: 64,
        top: 0,
        left: 0,
        right: 1440,
        bottom: 64,
        toJSON: () => ({})
      })
    });

    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn((x: number, y: number) =>
      y >= 100 ? tracks[1] : tracks[0]
    );

    const block = screen.getByRole("button", { name: /morning patrol/i });

    fireEvent.pointerDown(block, { button: 0, clientX: 540, clientY: 24 });
    fireEvent.pointerMove(window, { clientX: 600, clientY: 120 });
    fireEvent.pointerUp(window, { clientX: 600, clientY: 120 });

    document.elementFromPoint = originalElementFromPoint;

    expect(onSetRoutineTarget).toHaveBeenCalledWith(
      routine.id,
      getControlTargetRefKey(actorB)
    );
    expect(onSetRoutineStartHour).toHaveBeenCalledWith(routine.id, 10);
    expect(onSetRoutineEndHour).toHaveBeenCalledWith(routine.id, 11);
  });

  it("resizes sequence placements from both edges with minute precision", () => {
    const actor = createActorControlTargetRef("actor-a");
    const routine = createProjectScheduleRoutine({
      id: "routine-a",
      title: "Morning Patrol",
      target: actor,
      startHour: 9,
      endHour: 10,
      priority: 0,
      effects: []
    });
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines[routine.id] = routine;
    const onSetRoutineStartHour = vi.fn();
    const onSetRoutineEndHour = vi.fn();

    const { container } = renderPane({
      scheduler,
      targetOptions: [
        {
          key: getControlTargetRefKey(actor),
          target: actor,
          label: "Guard A",
          subtitle: "NPC",
          groupLabel: "Actors",
          defaults: {
            actorAnimationClipNames: [],
            actorPathOptions: []
          }
        }
      ],
      selectedRoutineId: routine.id,
      onSetRoutineStartHour,
      onSetRoutineEndHour
    });

    const track = container.querySelector<HTMLElement>("[data-sequencer-track='true']");
    expect(track).not.toBeNull();

    Object.defineProperty(track, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width: 1440,
        height: 64,
        top: 0,
        left: 0,
        right: 1440,
        bottom: 64,
        toJSON: () => ({})
      })
    });

    fireEvent.pointerDown(screen.getByLabelText("Resize start of Morning Patrol"), {
      button: 0,
      clientX: 540,
      clientY: 24
    });
    fireEvent.pointerMove(window, { clientX: 525, clientY: 24 });
    fireEvent.pointerUp(window, { clientX: 525, clientY: 24 });

    expect(onSetRoutineStartHour).toHaveBeenLastCalledWith(routine.id, 8.75);

    onSetRoutineStartHour.mockClear();
    onSetRoutineEndHour.mockClear();

    fireEvent.pointerDown(screen.getByLabelText("Resize end of Morning Patrol"), {
      button: 0,
      clientX: 600,
      clientY: 24
    });
    fireEvent.pointerMove(window, { clientX: 630, clientY: 24 });
    fireEvent.pointerUp(window, { clientX: 630, clientY: 24 });

    expect(onSetRoutineEndHour).toHaveBeenLastCalledWith(routine.id, 10.5);
  });
});
