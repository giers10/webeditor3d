import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import {
  HOURS_PER_DAY,
  formatTimeOfDayHours
} from "../document/project-time-settings";
import type { ProjectDialogueLibrary } from "../dialogues/project-dialogues";
import { formatControlEffectValue, getControlTargetRefKey } from "../controls/control-surface";
import { ProjectSequencesPanel } from "./ProjectSequencesPanel";
import {
  getProjectScheduleTimelineSegments,
  type ProjectScheduler,
  type ProjectScheduleRoutine
} from "../sequencer/project-sequencer";
import {
  getProjectScheduleEffectOptionId,
  getProjectScheduleTargetOptionForRoutine,
  listProjectScheduleEffectOptions,
  type ProjectScheduleEffectOptionId,
  type ProjectScheduleTargetOption
} from "../sequencer/project-sequencer-control-options";
import {
  findHeldSequenceControlEffect,
  getProjectScheduleRoutineHeldSteps,
  getProjectSequenceImpulseSteps,
  getProjectSequenceHeldSteps
} from "../sequencer/project-sequence-steps";
import {
  getProjectSequences,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

const MINUTES_PER_DAY = HOURS_PER_DAY * 60;
const MINIMUM_SEQUENCE_PLACEMENT_DURATION_MINUTES = 1;

interface RoutineDragState {
  routineId: string;
  mode: "move" | "resize-start" | "resize-end";
  originStartMinutes: number;
  originEndMinutes: number;
  originTargetKey: string;
  pointerStartX: number;
  trackWidth: number;
  draftStartMinutes: number;
  draftEndMinutes: number;
  draftTargetKey: string;
}

interface ProjectSequencerPaneProps {
  mode: "timeline" | "sequence";
  onSetMode(mode: "timeline" | "sequence"): void;
  targetOptions: ProjectScheduleTargetOption[];
  teleportTargetOptions: Array<{
    entityId: string;
    label: string;
  }>;
  sceneTransitionTargetOptions: Array<{
    targetKey: string;
    label: string;
  }>;
  visibilityTargetOptions: Array<{
    targetKey: string;
    label: string;
  }>;
  modelAnimationTargetOptions: Array<{
    targetKey: string;
    label: string;
  }>;
  soundTargetOptions: Array<{
    targetKey: string;
    label: string;
  }>;
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
  dialogues: ProjectDialogueLibrary;
  selectedRoutineId: string | null;
  selectedSequenceId: string | null;
  onSelectRoutine(routineId: string | null): void;
  onSelectSequence(sequenceId: string | null): void;
  onAddRoutine(targetKey: string): void;
  onAddSequence(): void;
  onDeleteRoutine(routineId: string): void;
  onDeleteSequence(sequenceId: string): void;
  onClose(): void;
  onSetRoutineTarget(routineId: string, targetKey: string): void;
  onSetRoutineTitle(routineId: string, title: string): void;
  onSetRoutineEnabled(routineId: string, enabled: boolean): void;
  onSetRoutineStartHour(routineId: string, startHour: number): void;
  onSetRoutineEndHour(routineId: string, endHour: number): void;
  onSetRoutinePriority(routineId: string, priority: number): void;
  onSetRoutineSequenceId(routineId: string, sequenceId: string | null): void;
  onSetRoutineEffectOption(
    routineId: string,
    effectOptionId: ProjectScheduleEffectOptionId
  ): void;
  onSetRoutineNumericValue(routineId: string, value: number): void;
  onSetRoutineColorValue(routineId: string, colorHex: string): void;
  onSetRoutineAnimationClip(routineId: string, clipName: string): void;
  onSetRoutineAnimationLoop(routineId: string, loop: boolean): void;
  onSetActorRoutinePresence(routineId: string, active: boolean): void;
  onSetActorRoutineAnimationClip(
    routineId: string,
    clipName: string | null
  ): void;
  onSetActorRoutineAnimationLoop(routineId: string, loop: boolean): void;
  onSetActorRoutinePath(routineId: string, pathId: string | null): void;
  onSetActorRoutinePathSpeed(routineId: string, speed: number): void;
  onSetActorRoutinePathLoop(routineId: string, loop: boolean): void;
  onSetSequenceTitle(sequenceId: string, title: string): void;
  onAddHeldControlStep(sequenceId: string, targetKey: string): void;
  onAddImpulseControlStep(sequenceId: string, targetKey: string): void;
  onAddDialogueStep(sequenceId: string, dialogueId: string): void;
  onAddTeleportStep(sequenceId: string, targetEntityId: string): void;
  onAddSceneTransitionStep(sequenceId: string, targetKey: string): void;
  onAddVisibilityStep(sequenceId: string, targetKey: string): void;
  onAddPlayAnimationStep(sequenceId: string, targetKey: string): void;
  onAddStopAnimationStep(sequenceId: string, targetKey: string): void;
  onAddPlaySoundStep(sequenceId: string, targetKey: string): void;
  onAddStopSoundStep(sequenceId: string, targetKey: string): void;
  onDeleteStep(sequenceId: string, stepIndex: number): void;
  onSetControlStepTarget(
    sequenceId: string,
    stepIndex: number,
    targetKey: string
  ): void;
  onSetControlStepEffectOption(
    sequenceId: string,
    stepIndex: number,
    effectOptionId: ProjectScheduleEffectOptionId
  ): void;
  onSetControlStepNumericValue(
    sequenceId: string,
    stepIndex: number,
    value: number
  ): void;
  onSetControlStepColorValue(
    sequenceId: string,
    stepIndex: number,
    colorHex: string
  ): void;
  onSetControlStepAnimationClip(
    sequenceId: string,
    stepIndex: number,
    clipName: string
  ): void;
  onSetControlStepAnimationLoop(
    sequenceId: string,
    stepIndex: number,
    loop: boolean
  ): void;
  onSetDialogueStepDialogueId(
    sequenceId: string,
    stepIndex: number,
    dialogueId: string
  ): void;
  onSetTeleportStepTarget(
    sequenceId: string,
    stepIndex: number,
    targetEntityId: string
  ): void;
  onSetSceneTransitionStepTarget(
    sequenceId: string,
    stepIndex: number,
    targetKey: string
  ): void;
  onSetVisibilityStepTarget(
    sequenceId: string,
    stepIndex: number,
    targetKey: string
  ): void;
  onSetVisibilityStepMode(
    sequenceId: string,
    stepIndex: number,
    mode: "toggle" | "show" | "hide"
  ): void;
}

function handleCommitOnEnter(
  event: ReactKeyboardEvent<HTMLInputElement>,
  commit: () => void
) {
  if (event.key !== "Enter") {
    return;
  }

  event.currentTarget.blur();
  commit();
}

function parseTimeOfDayInputHours(value: string, label: string): number {
  const match = /^(?<hours>\d{1,2}):(?<minutes>\d{2})$/.exec(value.trim());

  if (match?.groups === undefined) {
    throw new Error(`${label} must use HH:MM.`);
  }

  const hours = Number(match.groups.hours);
  const minutes = Number(match.groups.minutes);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours >= HOURS_PER_DAY ||
    minutes < 0 ||
    minutes >= 60
  ) {
    throw new Error(`${label} must be a valid time of day.`);
  }

  return hours + minutes / 60;
}

function normalizeMinuteOfDay(minute: number): number {
  const wrappedMinute = minute % MINUTES_PER_DAY;
  return wrappedMinute < 0 ? wrappedMinute + MINUTES_PER_DAY : wrappedMinute;
}

function convertHoursToMinuteOfDay(hours: number): number {
  return normalizeMinuteOfDay(Math.round(hours * 60));
}

function convertMinuteOfDayToHours(minute: number): number {
  return normalizeMinuteOfDay(minute) / 60;
}

function getMinuteDistance(startMinutes: number, endMinutes: number): number {
  return endMinutes > startMinutes
    ? endMinutes - startMinutes
    : MINUTES_PER_DAY - startMinutes + endMinutes;
}

function resolveRoutineDragState(
  dragState: RoutineDragState,
  clientX: number,
  clientY: number
): RoutineDragState {
  const deltaMinutes = Math.round(
    ((clientX - dragState.pointerStartX) / dragState.trackWidth) * MINUTES_PER_DAY
  );

  switch (dragState.mode) {
    case "move": {
      const durationMinutes = getMinuteDistance(
        dragState.originStartMinutes,
        dragState.originEndMinutes
      );
      const draftStartMinutes = normalizeMinuteOfDay(
        dragState.originStartMinutes + deltaMinutes
      );
      const draftEndMinutes = normalizeMinuteOfDay(
        draftStartMinutes + durationMinutes
      );
      const pointerTargetElement = document.elementFromPoint(clientX, clientY);
      const draftTargetKey =
        pointerTargetElement instanceof HTMLElement
          ? pointerTargetElement
              .closest<HTMLElement>("[data-sequencer-target-key]")
              ?.dataset.sequencerTargetKey ?? dragState.originTargetKey
          : dragState.originTargetKey;

      return {
        ...dragState,
        draftStartMinutes,
        draftEndMinutes,
        draftTargetKey
      };
    }
    case "resize-start": {
      let draftStartMinutes = normalizeMinuteOfDay(
        dragState.originStartMinutes + deltaMinutes
      );

      if (
        getMinuteDistance(draftStartMinutes, dragState.originEndMinutes) <
        MINIMUM_SEQUENCE_PLACEMENT_DURATION_MINUTES
      ) {
        draftStartMinutes = normalizeMinuteOfDay(
          dragState.originEndMinutes - MINIMUM_SEQUENCE_PLACEMENT_DURATION_MINUTES
        );
      }

      return {
        ...dragState,
        draftStartMinutes
      };
    }
    case "resize-end": {
      let draftEndMinutes = normalizeMinuteOfDay(
        dragState.originEndMinutes + deltaMinutes
      );

      if (
        getMinuteDistance(dragState.originStartMinutes, draftEndMinutes) <
        MINIMUM_SEQUENCE_PLACEMENT_DURATION_MINUTES
      ) {
        draftEndMinutes = normalizeMinuteOfDay(
          dragState.originStartMinutes + MINIMUM_SEQUENCE_PLACEMENT_DURATION_MINUTES
        );
      }

      return {
        ...dragState,
        draftEndMinutes
      };
    }
  }
}

function getRoutineSummary(
  routine: ProjectScheduleRoutine,
  sequences: ProjectSequenceLibrary
): string {
  const summaryParts = [
    `${formatTimeOfDayHours(routine.startHour)}-${formatTimeOfDayHours(routine.endHour)}`
  ];
  const heldSteps = getProjectScheduleRoutineHeldSteps(routine, sequences);

  if (routine.target.kind === "actor") {
    const presenceEffect = findHeldSequenceControlEffect(
      heldSteps,
      "setActorPresence"
    );
    const animationEffect = findHeldSequenceControlEffect(
      heldSteps,
      "playActorAnimation"
    );
    const pathEffect = findHeldSequenceControlEffect(
      heldSteps,
      "followActorPath"
    );

    summaryParts.push(presenceEffect?.active === false ? "Hidden" : "Present");

    if (animationEffect !== null) {
      summaryParts.push(formatControlEffectValue(animationEffect));
    }

    if (pathEffect !== null) {
      summaryParts.push(formatControlEffectValue(pathEffect));
    }
  } else {
    const effect = heldSteps[0];

    if (routine.target.kind === "global" && routine.sequenceId !== null) {
      summaryParts.push("Impulse Sequence");
    } else if (effect?.type === "controlEffect") {
      summaryParts.push(formatControlEffectValue(effect.effect));
    }
  }

  summaryParts.push(`P${routine.priority}`);
  return summaryParts.join(" · ");
}

function isRoutineEffectInactive(
  routine: ProjectScheduleRoutine,
  sequences: ProjectSequenceLibrary
): boolean {
  const heldSteps = getProjectScheduleRoutineHeldSteps(routine, sequences);

  if (routine.target.kind === "actor") {
    return (
      findHeldSequenceControlEffect(heldSteps, "setActorPresence")?.active === false
    );
  }

  const effect =
    heldSteps[0]?.type === "controlEffect" ? heldSteps[0].effect : undefined;

  if (effect === undefined) {
    return false;
  }

  switch (effect.type) {
    case "stopModelAnimation":
    case "stopSound":
      return true;
    case "setModelInstanceVisible":
      return !effect.visible;
    case "setInteractionEnabled":
    case "setLightEnabled":
      return !effect.enabled;
    default:
      return false;
  }
}

function getRoutineNumericValue(routine: ProjectScheduleRoutine): number | null {
  const effect = routine.effects[0];

  if (effect === undefined) {
    return null;
  }

  switch (effect.type) {
    case "setSoundVolume":
      return effect.volume;
    case "setLightIntensity":
    case "setAmbientLightIntensity":
    case "setSunLightIntensity":
      return effect.intensity;
    default:
      return null;
  }
}

function getRoutineColorValue(routine: ProjectScheduleRoutine): string | null {
  const effect = routine.effects[0];

  if (effect === undefined) {
    return null;
  }

  switch (effect.type) {
    case "setLightColor":
    case "setAmbientLightColor":
    case "setSunLightColor":
      return effect.colorHex;
    default:
      return null;
  }
}

export function ProjectSequencerPane({
  mode,
  onSetMode,
  targetOptions,
  teleportTargetOptions,
  sceneTransitionTargetOptions,
  visibilityTargetOptions,
  modelAnimationTargetOptions,
  soundTargetOptions,
  scheduler,
  sequences,
  dialogues,
  selectedRoutineId,
  selectedSequenceId,
  onSelectRoutine,
  onSelectSequence,
  onAddRoutine,
  onAddSequence,
  onDeleteRoutine,
  onDeleteSequence,
  onClose,
  onSetRoutineTarget,
  onSetRoutineTitle,
  onSetRoutineEnabled,
  onSetRoutineStartHour,
  onSetRoutineEndHour,
  onSetRoutinePriority,
  onSetRoutineSequenceId,
  onSetRoutineEffectOption,
  onSetRoutineNumericValue,
  onSetRoutineColorValue,
  onSetRoutineAnimationClip,
  onSetRoutineAnimationLoop,
  onSetActorRoutinePresence,
  onSetActorRoutineAnimationClip,
  onSetActorRoutineAnimationLoop,
  onSetActorRoutinePath,
  onSetActorRoutinePathSpeed,
  onSetActorRoutinePathLoop,
  onSetSequenceTitle,
  onAddHeldControlStep,
  onAddImpulseControlStep,
  onAddDialogueStep,
  onAddTeleportStep,
  onAddSceneTransitionStep,
  onAddVisibilityStep,
  onAddPlayAnimationStep,
  onAddStopAnimationStep,
  onAddPlaySoundStep,
  onAddStopSoundStep,
  onDeleteStep,
  onSetControlStepTarget,
  onSetControlStepEffectOption,
  onSetControlStepNumericValue,
  onSetControlStepColorValue,
  onSetControlStepAnimationClip,
  onSetControlStepAnimationLoop,
  onSetDialogueStepDialogueId,
  onSetTeleportStepTarget,
  onSetSceneTransitionStepTarget,
  onSetVisibilityStepTarget,
  onSetVisibilityStepMode
}: ProjectSequencerPaneProps) {
  const [routineDragState, setRoutineDragState] = useState<RoutineDragState | null>(
    null
  );
  const routineDragStateRef = useRef<RoutineDragState | null>(null);
  const routineDragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    routineDragStateRef.current = routineDragState;
  }, [routineDragState]);

  useEffect(() => {
    return () => {
      routineDragCleanupRef.current?.();
    };
  }, []);

  const beginRoutineDrag = (
    event: ReactPointerEvent<HTMLElement>,
    routine: ProjectScheduleRoutine,
    mode: RoutineDragState["mode"]
  ) => {
    if (event.button !== 0) {
      return;
    }

    const trackElement = event.currentTarget.closest<HTMLElement>(
      "[data-sequencer-track='true']"
    );

    if (trackElement === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectRoutine(routine.id);

    const nextDragState: RoutineDragState = {
      routineId: routine.id,
      mode,
      originStartMinutes: convertHoursToMinuteOfDay(routine.startHour),
      originEndMinutes: convertHoursToMinuteOfDay(routine.endHour),
      originTargetKey: getControlTargetRefKey(routine.target),
      pointerStartX: event.clientX,
      trackWidth: Math.max(trackElement.getBoundingClientRect().width, 1),
      draftStartMinutes: convertHoursToMinuteOfDay(routine.startHour),
      draftEndMinutes: convertHoursToMinuteOfDay(routine.endHour),
      draftTargetKey: getControlTargetRefKey(routine.target)
    };

    routineDragCleanupRef.current?.();

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const currentDragState = routineDragStateRef.current;

      if (currentDragState === null) {
        return;
      }

      const updatedDragState = resolveRoutineDragState(
        currentDragState,
        pointerEvent.clientX,
        pointerEvent.clientY
      );

      routineDragStateRef.current = updatedDragState;
      setRoutineDragState(updatedDragState);
    };

    const handlePointerUp = () => {
      const finalDragState = routineDragStateRef.current;

      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      routineDragCleanupRef.current = null;
      setRoutineDragState(null);
      routineDragStateRef.current = null;

      if (finalDragState === null) {
        return;
      }

      if (finalDragState.draftTargetKey !== finalDragState.originTargetKey) {
        onSetRoutineTarget(finalDragState.routineId, finalDragState.draftTargetKey);
      }

      if (finalDragState.draftStartMinutes !== finalDragState.originStartMinutes) {
        onSetRoutineStartHour(
          finalDragState.routineId,
          convertMinuteOfDayToHours(finalDragState.draftStartMinutes)
        );
      }

      if (finalDragState.draftEndMinutes !== finalDragState.originEndMinutes) {
        onSetRoutineEndHour(
          finalDragState.routineId,
          convertMinuteOfDayToHours(finalDragState.draftEndMinutes)
        );
      }
    };

    routineDragCleanupRef.current = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      routineDragCleanupRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    routineDragStateRef.current = nextDragState;
    setRoutineDragState(nextDragState);
  };

  const getRenderedRoutineTargetKey = (routine: ProjectScheduleRoutine): string =>
    routineDragState?.routineId === routine.id
      ? routineDragState.draftTargetKey
      : getControlTargetRefKey(routine.target);

  const getRenderedRoutine = (
    routine: ProjectScheduleRoutine
  ): ProjectScheduleRoutine =>
    routineDragState?.routineId === routine.id
      ? {
          ...routine,
          startHour: convertMinuteOfDayToHours(routineDragState.draftStartMinutes),
          endHour: convertMinuteOfDayToHours(routineDragState.draftEndMinutes)
        }
      : routine;

  const selectedRoutine =
    selectedRoutineId === null ? null : scheduler.routines[selectedRoutineId] ?? null;
  const selectedRoutineHeldSteps =
    selectedRoutine === null
      ? []
      : getProjectScheduleRoutineHeldSteps(selectedRoutine, sequences);
  const selectedTargetOption =
    selectedRoutine === null
      ? null
      : getProjectScheduleTargetOptionForRoutine(
          targetOptions,
          selectedRoutine.target
        );
  const selectedRoutineUsesInlineControlEffect =
    selectedRoutine !== null &&
    selectedRoutine.sequenceId === null &&
    selectedRoutine.target.kind !== "actor" &&
    selectedRoutine.target.kind !== "global";
  const selectedEffectOptionId =
    !selectedRoutineUsesInlineControlEffect
      ? null
      : selectedRoutine.effects[0] === undefined
        ? null
        : getProjectScheduleEffectOptionId(selectedRoutine.effects[0]);
  const selectedEffectOptions =
    selectedTargetOption === null ||
    selectedTargetOption.target.kind === "actor" ||
    selectedTargetOption.target.kind === "global"
      ? []
      : listProjectScheduleEffectOptions(selectedTargetOption);
  const selectedActorPresenceEffect =
    selectedRoutine === null || selectedRoutine.target.kind !== "actor"
      ? null
      : findHeldSequenceControlEffect(selectedRoutineHeldSteps, "setActorPresence");
  const selectedActorAnimationEffect =
    selectedRoutine === null || selectedRoutine.target.kind !== "actor"
      ? null
      : findHeldSequenceControlEffect(selectedRoutineHeldSteps, "playActorAnimation");
  const selectedActorPathEffect =
    selectedRoutine === null || selectedRoutine.target.kind !== "actor"
      ? null
      : findHeldSequenceControlEffect(selectedRoutineHeldSteps, "followActorPath");
  const compatibleHeldSequences =
    selectedRoutine === null
      ? []
      : selectedRoutine.target.kind === "global"
        ? getProjectSequences(sequences).filter(
            (sequence) => getProjectSequenceImpulseSteps(sequence).length > 0
          )
        : getProjectSequences(sequences).filter((sequence) => {
          const heldSteps = getProjectSequenceHeldSteps(sequence);

          if (heldSteps.length === 0) {
            return false;
          }

          return heldSteps.every(
            (step) =>
              step.type === "controlEffect" &&
              getControlTargetRefKey(step.effect.target) ===
                getControlTargetRefKey(selectedRoutine.target)
          );
        });
  const hourTicks = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

  return (
    <section className="schedule-pane" data-testid="project-sequencer-pane">
      <div className="schedule-pane__header">
        <div>
          <div className="label">Sequencer</div>
          <div className="schedule-pane__summary">
            {mode === "timeline"
              ? "Place sequences over global project time."
              : "Compose reusable sequences from engine effects for timeline and interaction playback."}
          </div>
        </div>
        <div className="schedule-pane__actions">
          {mode !== "timeline" ? (
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              onClick={() => onSetMode("timeline")}
            >
              Timeline
            </button>
          ) : null}
          {mode !== "sequence" ? (
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              onClick={() => onSetMode("sequence")}
            >
              Sequence Editor
            </button>
          ) : null}
          <button
            className="toolbar__button toolbar__button--compact"
            type="button"
            disabled={mode === "timeline" ? targetOptions.length === 0 : false}
            onClick={() => {
              if (mode === "timeline") {
                onAddRoutine(selectedTargetOption?.key ?? targetOptions[0]?.key ?? "");
                return;
              }

              onAddSequence();
            }}
          >
            {mode === "timeline" ? "Add Sequence" : "Create Sequence"}
          </button>
          <button
            className="toolbar__button toolbar__button--compact"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="schedule-pane__body">
        {mode === "sequence" ? (
          <div className="schedule-pane__editor" style={{ width: "100%" }}>
            <ProjectSequencesPanel
              sequences={sequences}
              dialogues={dialogues}
              targetOptions={targetOptions}
              teleportTargetOptions={teleportTargetOptions}
              sceneTransitionTargetOptions={sceneTransitionTargetOptions}
              visibilityTargetOptions={visibilityTargetOptions}
              modelAnimationTargetOptions={modelAnimationTargetOptions}
              soundTargetOptions={soundTargetOptions}
              selectedSequenceId={selectedSequenceId}
              onSelectSequence={onSelectSequence}
              onAddSequence={onAddSequence}
              onDeleteSequence={onDeleteSequence}
              onSetSequenceTitle={onSetSequenceTitle}
              onAddHeldControlStep={onAddHeldControlStep}
              onAddImpulseControlStep={onAddImpulseControlStep}
              onAddDialogueStep={onAddDialogueStep}
              onAddTeleportStep={onAddTeleportStep}
              onAddSceneTransitionStep={onAddSceneTransitionStep}
              onAddVisibilityStep={onAddVisibilityStep}
              onAddPlayAnimationStep={onAddPlayAnimationStep}
              onAddStopAnimationStep={onAddStopAnimationStep}
              onAddPlaySoundStep={onAddPlaySoundStep}
              onAddStopSoundStep={onAddStopSoundStep}
              onDeleteStep={onDeleteStep}
              onSetControlStepTarget={onSetControlStepTarget}
              onSetControlStepEffectOption={onSetControlStepEffectOption}
              onSetControlStepNumericValue={onSetControlStepNumericValue}
              onSetControlStepColorValue={onSetControlStepColorValue}
              onSetControlStepAnimationClip={onSetControlStepAnimationClip}
              onSetControlStepAnimationLoop={onSetControlStepAnimationLoop}
              onSetDialogueStepDialogueId={onSetDialogueStepDialogueId}
              onSetTeleportStepTarget={onSetTeleportStepTarget}
              onSetSceneTransitionStepTarget={onSetSceneTransitionStepTarget}
              onSetVisibilityStepTarget={onSetVisibilityStepTarget}
              onSetVisibilityStepMode={onSetVisibilityStepMode}
            />
          </div>
        ) : (
        <>
        <div className="schedule-pane__timeline">
          <div className="schedule-ruler">
            <div className="schedule-ruler__label">Targets</div>
            <div className="schedule-ruler__track">
              {hourTicks.map((hour) => (
                <div key={hour} className="schedule-ruler__tick">
                  <span>{String(hour).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>

          {targetOptions.length === 0 ? (
            <div className="schedule-pane__empty">
              No sequencer-addressable control targets are authored in this
              project yet.
            </div>
          ) : (
            targetOptions.map((targetOption) => {
              const routines = Object.values(scheduler.routines)
                .filter(
                  (routine) => getRenderedRoutineTargetKey(routine) === targetOption.key
                )
                .sort(
                  (left, right) =>
                    getRenderedRoutine(left).startHour -
                    getRenderedRoutine(right).startHour
                );

              return (
                <div key={targetOption.key} className="schedule-row">
                  <div className="schedule-row__label">
                    <button
                      className="schedule-row__add"
                      type="button"
                      onClick={() => onAddRoutine(targetOption.key)}
                    >
                      +
                    </button>
                    <div className="schedule-row__meta">
                      <div className="schedule-row__title">{targetOption.label}</div>
                      <div className="schedule-row__subtitle">
                        {targetOption.groupLabel} · {targetOption.subtitle}
                      </div>
                    </div>
                  </div>
                  <div
                    className="schedule-row__track"
                    data-sequencer-target-key={targetOption.key}
                    data-sequencer-track="true"
                  >
                    <div className="schedule-row__grid" />
                    {routines.map((routine) => {
                      const renderedRoutine = getRenderedRoutine(routine);

                      return getProjectScheduleTimelineSegments(renderedRoutine).map(
                        (segment) => (
                          <button
                            key={segment.key}
                            className={`schedule-block ${
                              selectedRoutineId === routine.id
                                ? "schedule-block--selected"
                                : ""
                            } ${
                              isRoutineEffectInactive(routine, sequences)
                                ? "schedule-block--inactive"
                                : ""
                            } ${
                              routine.enabled ? "" : "schedule-block--disabled"
                            } ${
                              routineDragState?.routineId === routine.id
                                ? "schedule-block--dragging"
                                : ""
                            }`.trim()}
                            type="button"
                            title={`${routine.title} · ${getRoutineSummary(routine, sequences)}`}
                            style={{
                              left: `${(segment.startHour / HOURS_PER_DAY) * 100}%`,
                              width: `${((segment.endHour - segment.startHour) / HOURS_PER_DAY) * 100}%`
                            }}
                            onPointerDown={(event) =>
                              beginRoutineDrag(event, routine, "move")
                            }
                            onClick={() => onSelectRoutine(routine.id)}
                          >
                            <span
                              className="schedule-block__resize-handle schedule-block__resize-handle--start"
                              aria-label={`Resize start of ${routine.title}`}
                              onPointerDown={(event) =>
                                beginRoutineDrag(event, routine, "resize-start")
                              }
                            />
                            <span className="schedule-block__title">
                              {routine.title}
                            </span>
                            <span
                              className="schedule-block__resize-handle schedule-block__resize-handle--end"
                              aria-label={`Resize end of ${routine.title}`}
                              onPointerDown={(event) =>
                                beginRoutineDrag(event, routine, "resize-end")
                              }
                            />
                          </button>
                        )
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="schedule-pane__editor">
          {selectedRoutine === null || selectedTargetOption === null ? (
            <div className="schedule-pane__empty">
              Select a sequence placement or create a new one.
            </div>
          ) : (
            <>
              <div className="form-section">
                <div className="label">Sequence Placement</div>
                <label className="form-field">
                  <span className="label">Title</span>
                  <input
                    key={`${selectedRoutine.id}-title`}
                    className="text-input"
                    type="text"
                    defaultValue={selectedRoutine.title}
                    onBlur={(event) =>
                      onSetRoutineTitle(
                        selectedRoutine.id,
                        event.currentTarget.value
                      )
                    }
                    onKeyDown={(event) =>
                      handleCommitOnEnter(event, () =>
                        onSetRoutineTitle(
                          selectedRoutine.id,
                          event.currentTarget.value
                        )
                      )
                    }
                  />
                </label>
                <label className="form-field">
                  <span className="label">Sequence</span>
                  <select
                    className="select-input"
                    value={selectedRoutine.sequenceId ?? ""}
                    onChange={(event) =>
                      onSetRoutineSequenceId(
                        selectedRoutine.id,
                        event.currentTarget.value === ""
                          ? null
                          : event.currentTarget.value
                      )
                    }
                  >
                    <option value="">This Placement (inline effects)</option>
                    {compatibleHeldSequences.map((sequence) => (
                      <option key={sequence.id} value={sequence.id}>
                        {sequence.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="inline-actions">
                  <button
                    className="toolbar__button toolbar__button--compact"
                    type="button"
                    onClick={() => {
                      onSelectSequence(selectedRoutine.sequenceId ?? selectedSequenceId);
                      onSetMode("sequence");
                    }}
                  >
                    Edit Sequences
                  </button>
                </div>
                {selectedRoutine.sequenceId !== null ? (
                  <div className="material-summary">
                    This placement resolves held effects from the selected
                    sequence. Inline effects stay preserved as fallback, but are
                    not edited while a sequence is attached.
                  </div>
                ) : null}
                {selectedRoutine.sequenceId === null &&
                compatibleHeldSequences.length === 0 ? (
                  <div className="material-summary">
                    {selectedRoutine.target.kind === "global"
                      ? "No compatible impulse sequence is authored yet for this project event lane. Use Sequence Editor to author one-shot effects like scene transitions, dialogue starts, or teleports."
                      : "No compatible sequence with held effects is authored for this target yet. Use Sequence Editor to author effects, or keep this placement on its own inline effects."}
                  </div>
                ) : null}
                {selectedRoutine.sequenceId === null &&
                selectedRoutine.target.kind === "actor" ? (
                  <>
                    <label className="form-field">
                      <span className="label">Presence</span>
                      <select
                        className="select-input"
                        value={
                          selectedActorPresenceEffect?.active === false
                            ? "hidden"
                            : "present"
                        }
                        onChange={(event) =>
                          onSetActorRoutinePresence(
                            selectedRoutine.id,
                            event.currentTarget.value !== "hidden"
                          )
                        }
                      >
                        <option value="present">Present</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </label>
                  </>
                ) : selectedRoutine.target.kind === "global" ? (
                  <div className="material-summary">
                    Project event placements run attached sequences only. Add or
                    pick a sequence with impulse effects like scene transitions,
                    dialogue starts, teleports, or other one-shot engine events.
                  </div>
                ) : selectedRoutine.sequenceId === null ? (
                  <label className="form-field">
                    <span className="label">Effect</span>
                    <select
                      className="select-input"
                      value={selectedEffectOptionId ?? ""}
                      onChange={(event) =>
                        onSetRoutineEffectOption(
                          selectedRoutine.id,
                          event.currentTarget.value as ProjectScheduleEffectOptionId
                        )
                      }
                    >
                      {selectedEffectOptions.map((effectOption) => (
                        <option key={effectOption.id} value={effectOption.id}>
                          {effectOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="form-field form-field--inline">
                  <input
                    type="checkbox"
                    checked={selectedRoutine.enabled}
                    onChange={(event) =>
                      onSetRoutineEnabled(
                        selectedRoutine.id,
                        event.currentTarget.checked
                      )
                    }
                  />
                  <span className="label">Enabled</span>
                </label>
              </div>

              <div className="form-section">
                <div className="label">Window</div>
                <div className="vector-inputs vector-inputs--two">
                  <label className="form-field">
                    <span className="label">Start</span>
                    <input
                      key={`${selectedRoutine.id}-start`}
                      className="text-input"
                      type="time"
                      step="60"
                      defaultValue={formatTimeOfDayHours(selectedRoutine.startHour)}
                      onBlur={(event) =>
                        onSetRoutineStartHour(
                          selectedRoutine.id,
                          parseTimeOfDayInputHours(
                            event.currentTarget.value,
                            "Clip start"
                          )
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineStartHour(
                            selectedRoutine.id,
                            parseTimeOfDayInputHours(
                              event.currentTarget.value,
                              "Clip start"
                            )
                          )
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">End</span>
                    <input
                      key={`${selectedRoutine.id}-end`}
                      className="text-input"
                      type="time"
                      step="60"
                      defaultValue={formatTimeOfDayHours(selectedRoutine.endHour)}
                      onBlur={(event) =>
                        onSetRoutineEndHour(
                          selectedRoutine.id,
                          parseTimeOfDayInputHours(
                            event.currentTarget.value,
                            "Clip end"
                          )
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineEndHour(
                            selectedRoutine.id,
                            parseTimeOfDayInputHours(
                              event.currentTarget.value,
                              "Clip end"
                            )
                          )
                        )
                      }
                    />
                  </label>
                </div>
                <label className="form-field">
                  <span className="label">Priority</span>
                  <input
                    key={`${selectedRoutine.id}-priority`}
                    className="text-input"
                    type="number"
                    step="1"
                    defaultValue={selectedRoutine.priority}
                    onBlur={(event) =>
                      onSetRoutinePriority(
                        selectedRoutine.id,
                        Number(event.currentTarget.value)
                      )
                    }
                    onKeyDown={(event) =>
                      handleCommitOnEnter(event, () =>
                        onSetRoutinePriority(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      )
                    }
                  />
                </label>
              </div>

              {selectedRoutine.sequenceId === null &&
              selectedRoutine.target.kind === "actor" ? (
                <>
                  <div className="form-section">
                    <div className="label">Animation</div>
                    <label className="form-field">
                      <span className="label">Clip</span>
                      <select
                        className="select-input"
                        value={selectedActorAnimationEffect?.clipName ?? ""}
                        onChange={(event) =>
                          onSetActorRoutineAnimationClip(
                            selectedRoutine.id,
                            event.currentTarget.value === ""
                              ? null
                              : event.currentTarget.value
                          )
                        }
                      >
                        <option value="">None</option>
                        {(selectedTargetOption.defaults.actorAnimationClipNames ?? []).map(
                          (clipName) => (
                            <option key={clipName} value={clipName}>
                              {clipName}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="form-field form-field--inline">
                      <input
                        type="checkbox"
                        checked={selectedActorAnimationEffect?.loop !== false}
                        disabled={selectedActorAnimationEffect === null}
                        onChange={(event) =>
                          onSetActorRoutineAnimationLoop(
                            selectedRoutine.id,
                            event.currentTarget.checked
                          )
                        }
                      />
                      <span className="label">Loop</span>
                    </label>
                    {(selectedTargetOption.defaults.actorAnimationClipNames ?? [])
                      .length === 0 ? (
                      <div className="schedule-pane__summary">
                        Animation clips are available only when this actor has one
                        uniquely bound NPC model with imported clips.
                      </div>
                    ) : null}
                  </div>

                  <div className="form-section">
                    <div className="label">Path</div>
                    <label className="form-field">
                      <span className="label">Path</span>
                      <select
                        className="select-input"
                        value={selectedActorPathEffect?.pathId ?? ""}
                        onChange={(event) =>
                          onSetActorRoutinePath(
                            selectedRoutine.id,
                            event.currentTarget.value === ""
                              ? null
                              : event.currentTarget.value
                          )
                        }
                      >
                        <option value="">None</option>
                        {(selectedTargetOption.defaults.actorPathOptions ?? []).map(
                          (pathOption) => (
                            <option key={pathOption.pathId} value={pathOption.pathId}>
                              {pathOption.label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="label">Speed</span>
                      <input
                        key={`${selectedRoutine.id}-actor-path-speed`}
                        className="text-input"
                        type="number"
                        min="0.01"
                        step="0.1"
                        defaultValue={
                          selectedActorPathEffect?.speed ??
                          selectedTargetOption.defaults.actorPathSpeed ??
                          1
                        }
                        disabled={selectedActorPathEffect === null}
                        onBlur={(event) =>
                          onSetActorRoutinePathSpeed(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
                          )
                        }
                        onKeyDown={(event) =>
                          handleCommitOnEnter(event, () =>
                            onSetActorRoutinePathSpeed(
                              selectedRoutine.id,
                              Number(event.currentTarget.value)
                            )
                          )
                        }
                      />
                    </label>
                    <label className="form-field form-field--inline">
                      <input
                        type="checkbox"
                        checked={selectedActorPathEffect?.loop ?? false}
                        disabled={selectedActorPathEffect === null}
                        onChange={(event) =>
                          onSetActorRoutinePathLoop(
                            selectedRoutine.id,
                            event.currentTarget.checked
                          )
                        }
                      />
                      <span className="label">Loop</span>
                    </label>
                    {(selectedTargetOption.defaults.actorPathOptions ?? []).length ===
                    0 ? (
                      <div className="schedule-pane__summary">
                        Paths are available only when this actor has one uniquely
                        bound NPC usage in a scene with enabled authored paths.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : selectedRoutine.target.kind === "global" ? null : selectedRoutine.sequenceId === null ? (
                <>
                  {selectedEffectOptions.find(
                    (effectOption) => effectOption.id === selectedEffectOptionId
                  )?.valueKind === "number" ? (
                    <div className="form-section">
                      <div className="label">Value</div>
                      <label className="form-field">
                        <span className="label">
                          {selectedEffectOptions.find(
                            (effectOption) =>
                              effectOption.id === selectedEffectOptionId
                          )?.valueLabel ?? "Value"}
                        </span>
                        <input
                          key={`${selectedRoutine.id}-numeric`}
                          className="text-input"
                          type="number"
                          min={
                            selectedEffectOptions.find(
                              (effectOption) =>
                                effectOption.id === selectedEffectOptionId
                            )?.min ?? 0
                          }
                          step={
                            selectedEffectOptions.find(
                              (effectOption) =>
                                effectOption.id === selectedEffectOptionId
                            )?.step ?? 0.1
                          }
                          defaultValue={getRoutineNumericValue(selectedRoutine) ?? 0}
                          onBlur={(event) =>
                            onSetRoutineNumericValue(
                              selectedRoutine.id,
                              Number(event.currentTarget.value)
                            )
                          }
                          onKeyDown={(event) =>
                            handleCommitOnEnter(event, () =>
                              onSetRoutineNumericValue(
                                selectedRoutine.id,
                                Number(event.currentTarget.value)
                              )
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedEffectOptions.find(
                    (effectOption) => effectOption.id === selectedEffectOptionId
                  )?.valueKind === "color" ? (
                    <div className="form-section">
                      <div className="label">Value</div>
                      <label className="form-field">
                        <span className="label">
                          {selectedEffectOptions.find(
                            (effectOption) =>
                              effectOption.id === selectedEffectOptionId
                          )?.valueLabel ?? "Color"}
                        </span>
                        <input
                          className="color-input"
                          type="color"
                          value={getRoutineColorValue(selectedRoutine) ?? "#ffffff"}
                          onChange={(event) =>
                            onSetRoutineColorValue(
                              selectedRoutine.id,
                              event.currentTarget.value
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedEffectOptions.find(
                    (effectOption) => effectOption.id === selectedEffectOptionId
                  )?.valueKind === "animation" ? (
                    <div className="form-section">
                      <div className="label">Animation</div>
                      <label className="form-field">
                        <span className="label">Clip</span>
                        <select
                          className="select-input"
                          value={
                            selectedRoutine.effects[0]?.type === "playModelAnimation"
                              ? selectedRoutine.effects[0].clipName
                              : selectedTargetOption.defaults.animationClipNames?.[0] ??
                                ""
                          }
                          onChange={(event) =>
                            onSetRoutineAnimationClip(
                              selectedRoutine.id,
                              event.currentTarget.value
                            )
                          }
                        >
                          {(selectedTargetOption.defaults.animationClipNames ?? []).map(
                            (clipName) => (
                              <option key={clipName} value={clipName}>
                                {clipName}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                      <label className="form-field form-field--inline">
                        <input
                          type="checkbox"
                          checked={
                            selectedRoutine.effects[0]?.type ===
                            "playModelAnimation"
                              ? selectedRoutine.effects[0].loop !== false
                              : true
                          }
                          onChange={(event) =>
                            onSetRoutineAnimationLoop(
                              selectedRoutine.id,
                              event.currentTarget.checked
                            )
                          }
                        />
                        <span className="label">Loop</span>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="form-section">
                <div className="label">Details</div>
                <div className="schedule-pane__summary">
                  {selectedTargetOption.groupLabel} · {selectedTargetOption.label}
                </div>
                <div className="schedule-pane__summary">
                  {getRoutineSummary(selectedRoutine, sequences)}
                </div>
              </div>

              <div className="form-section">
                <button
                  className="toolbar__button toolbar__button--compact"
                  type="button"
                  onClick={() => onDeleteRoutine(selectedRoutine.id)}
                >
                  Delete Clip
                </button>
              </div>
            </>
          )}
        </aside>
        </>
        )}
      </div>
    </section>
  );
}

export const ProjectSchedulePane = ProjectSequencerPane;
