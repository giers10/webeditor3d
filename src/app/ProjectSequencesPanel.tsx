import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { formatControlEffectValue, getControlTargetRefKey } from "../controls/control-surface";
import { type ProjectDialogueLibrary, getProjectDialogues } from "../dialogues/project-dialogues";
import {
  getProjectScheduleEffectOptionId,
  getProjectScheduleTargetOptionByKey,
  listProjectScheduleEffectOptions,
  type ProjectScheduleEffectOptionId,
  type ProjectScheduleTargetOption
} from "../scheduler/project-schedule-control-options";
import {
  getProjectSequenceHeldSteps,
  getProjectSequenceImpulseSteps,
  getSequenceClipEndMinute,
  getSequenceClipLabel,
  type SequenceClip
} from "../sequencer/project-sequence-steps";
import {
  getProjectSequences,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

interface ProjectSequencesPanelProps {
  sequences: ProjectSequenceLibrary;
  dialogues: ProjectDialogueLibrary;
  targetOptions: ProjectScheduleTargetOption[];
  selectedSequenceId: string | null;
  onSelectSequence(sequenceId: string | null): void;
  onAddSequence(): void;
  onDeleteSequence(sequenceId: string): void;
  onSetSequenceTitle(sequenceId: string, title: string): void;
  onSetSequenceDurationMinutes(sequenceId: string, durationMinutes: number): void;
  onAddHeldControlStep(sequenceId: string, targetKey: string): void;
  onAddImpulseControlStep(sequenceId: string, targetKey: string): void;
  onAddDialogueStep(sequenceId: string, dialogueId: string): void;
  onDeleteStep(sequenceId: string, stepIndex: number): void;
  onSetClipTiming(
    sequenceId: string,
    stepIndex: number,
    timing: {
      startMinute: number;
      durationMinutes: number;
      lane: number;
    }
  ): void;
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
}

const SEQUENCE_TIMELINE_LANE_HEIGHT = 52;
const MIN_SEQUENCE_TIMELINE_LANES = 3;

type SequenceClipTimingDraft = Pick<
  SequenceClip,
  "startMinute" | "durationMinutes" | "lane"
>;

interface SequenceClipDragState {
  sequenceId: string;
  clipIndex: number;
  mode: "move" | "resize-start" | "resize-end";
  pointerId: number;
  originX: number;
  originY: number;
  containerWidth: number;
  sequenceDurationMinutes: number;
  initial: SequenceClipTimingDraft;
  preview: SequenceClipTimingDraft;
}

function commitOnEnter(
  event: ReactKeyboardEvent<HTMLInputElement>,
  commit: () => void
) {
  if (event.key !== "Enter") {
    return;
  }

  event.currentTarget.blur();
  commit();
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function formatSequenceMinuteValue(minutes: number): string {
  const normalized = Math.max(0, Math.trunc(minutes));
  const hours = Math.floor(normalized / 60);
  const remainderMinutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainderMinutes).padStart(2, "0")}`;
}

function getControlClipNumericValue(
  clip: Extract<SequenceClip, { type: "controlEffect" }>
): number | null {
  switch (clip.effect.type) {
    case "setSoundVolume":
      return clip.effect.volume;
    case "setLightIntensity":
    case "setAmbientLightIntensity":
    case "setSunLightIntensity":
      return clip.effect.intensity;
    default:
      return null;
  }
}

function getControlClipColorValue(
  clip: Extract<SequenceClip, { type: "controlEffect" }>
): string | null {
  switch (clip.effect.type) {
    case "setLightColor":
    case "setAmbientLightColor":
    case "setSunLightColor":
      return clip.effect.colorHex;
    default:
      return null;
  }
}

function getSequenceTimelineClipClassName(
  clip: SequenceClip,
  selected: boolean
): string {
  return [
    "sequence-timeline__clip",
    clip.stepClass === "held"
      ? "sequence-timeline__clip--held"
      : "sequence-timeline__clip--impulse",
    selected ? "sequence-timeline__clip--selected" : ""
  ]
    .filter((value) => value.length > 0)
    .join(" ");
}

export function ProjectSequencesPanel({
  sequences,
  dialogues,
  targetOptions,
  selectedSequenceId,
  onSelectSequence,
  onAddSequence,
  onDeleteSequence,
  onSetSequenceTitle,
  onSetSequenceDurationMinutes,
  onAddHeldControlStep,
  onAddImpulseControlStep,
  onAddDialogueStep,
  onDeleteStep,
  onSetClipTiming,
  onSetControlStepTarget,
  onSetControlStepEffectOption,
  onSetControlStepNumericValue,
  onSetControlStepColorValue,
  onSetControlStepAnimationClip,
  onSetControlStepAnimationLoop,
  onSetDialogueStepDialogueId
}: ProjectSequencesPanelProps) {
  const sequenceList = getProjectSequences(sequences);
  const dialogueList = getProjectDialogues(dialogues);
  const selectedSequence =
    selectedSequenceId === null
      ? null
      : sequences.sequences[selectedSequenceId] ?? null;
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<SequenceClipDragState | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedSequence === null || selectedSequence.clips.length === 0) {
      setSelectedClipIndex(null);
      return;
    }

    setSelectedClipIndex((current) =>
      current !== null && selectedSequence.clips[current] !== undefined ? current : 0
    );
  }, [selectedSequence]);

  useEffect(() => {
    if (dragState === null) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const deltaMinutes = Math.round(
        ((event.clientX - dragState.originX) / Math.max(1, dragState.containerWidth)) *
          dragState.sequenceDurationMinutes
      );
      const deltaLane = Math.round(
        (event.clientY - dragState.originY) / SEQUENCE_TIMELINE_LANE_HEIGHT
      );

      setDragState((current) => {
        if (current === null) {
          return current;
        }

        if (current.mode === "move") {
          const startMinute = clampInteger(
            current.initial.startMinute + deltaMinutes,
            0,
            Math.max(0, current.sequenceDurationMinutes - current.initial.durationMinutes)
          );

          return {
            ...current,
            preview: {
              startMinute,
              durationMinutes: current.initial.durationMinutes,
              lane: Math.max(0, current.initial.lane + deltaLane)
            }
          };
        }

        if (current.mode === "resize-start") {
          const startMinute = clampInteger(
            current.initial.startMinute + deltaMinutes,
            0,
            current.initial.startMinute + current.initial.durationMinutes - 1
          );

          return {
            ...current,
            preview: {
              startMinute,
              durationMinutes:
                current.initial.durationMinutes +
                current.initial.startMinute -
                startMinute,
              lane: current.initial.lane
            }
          };
        }

        return {
          ...current,
          preview: {
            startMinute: current.initial.startMinute,
            durationMinutes: clampInteger(
              current.initial.durationMinutes + deltaMinutes,
              1,
              current.sequenceDurationMinutes - current.initial.startMinute
            ),
            lane: current.initial.lane
          }
        };
      });
    };

    const handlePointerFinish = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const changed =
        dragState.preview.startMinute !== dragState.initial.startMinute ||
        dragState.preview.durationMinutes !== dragState.initial.durationMinutes ||
        dragState.preview.lane !== dragState.initial.lane;

      if (changed) {
        onSetClipTiming(dragState.sequenceId, dragState.clipIndex, dragState.preview);
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerFinish);
    window.addEventListener("pointercancel", handlePointerFinish);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerFinish);
      window.removeEventListener("pointercancel", handlePointerFinish);
    };
  }, [dragState, onSetClipTiming]);

  const displayedClips = useMemo(() => {
    if (selectedSequence === null) {
      return [];
    }

    return selectedSequence.clips.map((clip, clipIndex) =>
      dragState !== null &&
      dragState.sequenceId === selectedSequence.id &&
      dragState.clipIndex === clipIndex
        ? {
            ...clip,
            ...dragState.preview
          }
        : clip
    );
  }, [dragState, selectedSequence]);

  const selectedClip =
    selectedClipIndex === null ? null : displayedClips[selectedClipIndex] ?? null;
  const selectedControlClip =
    selectedClip?.type === "controlEffect" ? selectedClip : null;
  const selectedDialogueClip =
    selectedClip?.type === "startDialogue" ? selectedClip : null;
  const targetKey =
    selectedControlClip === null
      ? null
      : getControlTargetRefKey(selectedControlClip.effect.target);
  const targetOption =
    targetKey === null
      ? null
      : getProjectScheduleTargetOptionByKey(targetOptions, targetKey);
  const effectOptions =
    targetOption === null ? [] : listProjectScheduleEffectOptions(targetOption);
  const effectOptionId =
    selectedControlClip === null || targetOption === null
      ? null
      : (() => {
          try {
            return getProjectScheduleEffectOptionId(selectedControlClip.effect);
          } catch {
            return null;
          }
        })();
  const laneCount =
    displayedClips.length === 0
      ? MIN_SEQUENCE_TIMELINE_LANES
      : Math.max(
          MIN_SEQUENCE_TIMELINE_LANES,
          ...displayedClips.map((clip) => clip.lane + 1)
        );
  const hourMarkers =
    selectedSequence === null
      ? []
      : Array.from(
          { length: Math.floor(selectedSequence.durationMinutes / 60) + 1 },
          (_, index) => index * 60
        ).filter((minute) => minute <= selectedSequence.durationMinutes);
  const quarterHourMarkers =
    selectedSequence === null
      ? []
      : Array.from(
          { length: Math.floor(selectedSequence.durationMinutes / 15) + 1 },
          (_, index) => index * 15
        ).filter(
          (minute) =>
            minute > 0 &&
            minute < selectedSequence.durationMinutes &&
            minute % 60 !== 0
        );
  const defaultTargetKey =
    targetKey ?? targetOptions[0]?.key ?? "";

  const beginClipDrag = (
    clipIndex: number,
    mode: SequenceClipDragState["mode"],
    event: ReactPointerEvent<HTMLDivElement | HTMLSpanElement>
  ) => {
    if (selectedSequence === null) {
      return;
    }

    const clip = selectedSequence.clips[clipIndex];

    if (clip === undefined || timelineRef.current === null) {
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedClipIndex(clipIndex);
    setDragState({
      sequenceId: selectedSequence.id,
      clipIndex,
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      containerWidth: rect.width,
      sequenceDurationMinutes: selectedSequence.durationMinutes,
      initial: {
        startMinute: clip.startMinute,
        durationMinutes: clip.durationMinutes,
        lane: clip.lane
      },
      preview: {
        startMinute: clip.startMinute,
        durationMinutes: clip.durationMinutes,
        lane: clip.lane
      }
    });
  };

  return (
    <div className="form-section">
      <div className="label">Sequences</div>
      {sequenceList.length === 0 ? (
        <div className="outliner-empty">No project sequences authored yet.</div>
      ) : (
        <div className="outliner-list">
          {sequenceList.map((sequence) => (
            <div
              key={sequence.id}
              className={`outliner-item outliner-item--compact ${
                selectedSequence?.id === sequence.id
                  ? "outliner-item--selected"
                  : ""
              }`.trim()}
            >
              <div className="outliner-item__row">
                <button
                  className="outliner-item__select"
                  type="button"
                  onClick={() => onSelectSequence(sequence.id)}
                >
                  <span className="outliner-item__title">{sequence.title}</span>
                  <span className="outliner-item__meta">
                    {sequence.clips.length} clip
                    {sequence.clips.length === 1 ? "" : "s"} ·{" "}
                    {getProjectSequenceHeldSteps(sequence).length} held ·{" "}
                    {getProjectSequenceImpulseSteps(sequence).length} impulse ·{" "}
                    {formatSequenceMinuteValue(sequence.durationMinutes)}
                  </span>
                </button>
                <button
                  className="outliner-item__delete"
                  type="button"
                  aria-label={`Delete ${sequence.title}`}
                  onClick={() => onDeleteSequence(sequence.id)}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button className="toolbar__button" type="button" onClick={onAddSequence}>
          Add Sequence
        </button>
      </div>

      {selectedSequence === null ? (
        <div className="outliner-empty">
          Select a sequence to edit its timeline and clips.
        </div>
      ) : (
        <div className="form-section">
          <div className="material-summary">
            Build a sequence from timed clips. Held clips stay active over their
            clip span; impulse clips mark one-shot events on the same local
            timeline. Multiple clips can overlap on separate lanes.
          </div>

          <div className="vector-inputs vector-inputs--two">
            <label className="form-field">
              <span className="label">Title</span>
              <input
                className="text-input"
                type="text"
                defaultValue={selectedSequence.title}
                onBlur={(event) =>
                  onSetSequenceTitle(selectedSequence.id, event.currentTarget.value)
                }
                onKeyDown={(event) =>
                  commitOnEnter(event, () =>
                    onSetSequenceTitle(selectedSequence.id, event.currentTarget.value)
                  )
                }
              />
            </label>
            <label className="form-field">
              <span className="label">Length</span>
              <input
                key={`${selectedSequence.id}-duration`}
                className="text-input"
                type="number"
                min="1"
                step="1"
                defaultValue={selectedSequence.durationMinutes}
                onBlur={(event) =>
                  onSetSequenceDurationMinutes(
                    selectedSequence.id,
                    Number(event.currentTarget.value)
                  )
                }
                onKeyDown={(event) =>
                  commitOnEnter(event, () =>
                    onSetSequenceDurationMinutes(
                      selectedSequence.id,
                      Number(event.currentTarget.value)
                    )
                  )
                }
              />
            </label>
          </div>

          <div className="label">Clip Timeline</div>
          <div className="sequence-timeline">
            <div className="sequence-timeline__summary">
              Drag clips horizontally to move them in time, drag vertically to
              move them between lanes, and drag the handles to resize their
              length. Snapping is minute-precise.
            </div>
            <div className="sequence-timeline__ruler">
              {hourMarkers.map((minute) => (
                <div
                  key={minute}
                  className="sequence-timeline__hour"
                  style={{
                    left: `${(minute / selectedSequence.durationMinutes) * 100}%`
                  }}
                >
                  <span>{formatSequenceMinuteValue(minute)}</span>
                </div>
              ))}
            </div>
            <div
              ref={timelineRef}
              className="sequence-timeline__track"
              style={{
                height: `${laneCount * SEQUENCE_TIMELINE_LANE_HEIGHT}px`
              }}
            >
              {Array.from({ length: laneCount }, (_, lane) => (
                <div
                  key={`lane-${lane}`}
                  className="sequence-timeline__lane"
                  style={{ top: `${lane * SEQUENCE_TIMELINE_LANE_HEIGHT}px` }}
                >
                  <span className="sequence-timeline__lane-label">
                    Lane {lane + 1}
                  </span>
                </div>
              ))}
              {quarterHourMarkers.map((minute) => (
                <div
                  key={`minor-${minute}`}
                  className="sequence-timeline__minor-grid"
                  style={{
                    left: `${(minute / selectedSequence.durationMinutes) * 100}%`
                  }}
                />
              ))}
              {hourMarkers.map((minute) => (
                <div
                  key={`major-${minute}`}
                  className="sequence-timeline__major-grid"
                  style={{
                    left: `${(minute / selectedSequence.durationMinutes) * 100}%`
                  }}
                />
              ))}

              {displayedClips.map((clip, clipIndex) => (
                <div
                  key={`${selectedSequence.id}-${clipIndex}`}
                  className={getSequenceTimelineClipClassName(
                    clip,
                    selectedClipIndex === clipIndex
                  )}
                  style={{
                    left: `${(clip.startMinute / selectedSequence.durationMinutes) * 100}%`,
                    width: `${Math.max(
                      (clip.durationMinutes / selectedSequence.durationMinutes) * 100,
                      0
                    )}%`,
                    top: `${clip.lane * SEQUENCE_TIMELINE_LANE_HEIGHT + 8}px`,
                    zIndex:
                      selectedClipIndex === clipIndex || dragState?.clipIndex === clipIndex
                        ? 2
                        : 1
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedClipIndex(clipIndex)}
                  onPointerDown={(event) => beginClipDrag(clipIndex, "move", event)}
                >
                  <span
                    className="sequence-timeline__clip-handle sequence-timeline__clip-handle--start"
                    onPointerDown={(event) =>
                      beginClipDrag(clipIndex, "resize-start", event)
                    }
                  />
                  <span className="sequence-timeline__clip-title">
                    {getSequenceClipLabel(clip)}
                  </span>
                  <span className="sequence-timeline__clip-time">
                    {formatSequenceMinuteValue(clip.startMinute)} -{" "}
                    {formatSequenceMinuteValue(getSequenceClipEndMinute(clip))}
                  </span>
                  <span
                    className="sequence-timeline__clip-handle sequence-timeline__clip-handle--end"
                    onPointerDown={(event) =>
                      beginClipDrag(clipIndex, "resize-end", event)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="inline-actions">
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={defaultTargetKey.length === 0}
              onClick={() =>
                onAddHeldControlStep(selectedSequence.id, defaultTargetKey)
              }
            >
              Add Held Control Clip
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={defaultTargetKey.length === 0}
              onClick={() =>
                onAddImpulseControlStep(selectedSequence.id, defaultTargetKey)
              }
            >
              Add Impulse Control Clip
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={dialogueList.length === 0}
              onClick={() =>
                onAddDialogueStep(
                  selectedSequence.id,
                  dialogueList[0]?.id ?? ""
                )
              }
            >
              Add Dialogue Clip
            </button>
          </div>

          {selectedClip === null || selectedClipIndex === null ? (
            <div className="outliner-empty">
              Select a clip in the timeline to edit its target, timing, and
              payload.
            </div>
          ) : (
            <div className="form-section">
              <div className="outliner-item__row">
                <div className="label">Selected Clip</div>
                <button
                  className="outliner-item__delete"
                  type="button"
                  onClick={() => onDeleteStep(selectedSequence.id, selectedClipIndex)}
                >
                  x
                </button>
              </div>
              <div className="material-summary">{getSequenceClipLabel(selectedClip)}</div>

              <div className="vector-inputs vector-inputs--three">
                <label className="form-field">
                  <span className="label">Start</span>
                  <input
                    key={`${selectedSequence.id}-${selectedClipIndex}-start`}
                    className="text-input"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selectedClip.startMinute}
                    onBlur={(event) =>
                      onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                        startMinute: Number(event.currentTarget.value),
                        durationMinutes: selectedClip.durationMinutes,
                        lane: selectedClip.lane
                      })
                    }
                    onKeyDown={(event) =>
                      commitOnEnter(event, () =>
                        onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                          startMinute: Number(event.currentTarget.value),
                          durationMinutes: selectedClip.durationMinutes,
                          lane: selectedClip.lane
                        })
                      )
                    }
                  />
                </label>
                <label className="form-field">
                  <span className="label">Length</span>
                  <input
                    key={`${selectedSequence.id}-${selectedClipIndex}-duration`}
                    className="text-input"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={selectedClip.durationMinutes}
                    onBlur={(event) =>
                      onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                        startMinute: selectedClip.startMinute,
                        durationMinutes: Number(event.currentTarget.value),
                        lane: selectedClip.lane
                      })
                    }
                    onKeyDown={(event) =>
                      commitOnEnter(event, () =>
                        onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                          startMinute: selectedClip.startMinute,
                          durationMinutes: Number(event.currentTarget.value),
                          lane: selectedClip.lane
                        })
                      )
                    }
                  />
                </label>
                <label className="form-field">
                  <span className="label">Lane</span>
                  <input
                    key={`${selectedSequence.id}-${selectedClipIndex}-lane`}
                    className="text-input"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selectedClip.lane}
                    onBlur={(event) =>
                      onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                        startMinute: selectedClip.startMinute,
                        durationMinutes: selectedClip.durationMinutes,
                        lane: Number(event.currentTarget.value)
                      })
                    }
                    onKeyDown={(event) =>
                      commitOnEnter(event, () =>
                        onSetClipTiming(selectedSequence.id, selectedClipIndex, {
                          startMinute: selectedClip.startMinute,
                          durationMinutes: selectedClip.durationMinutes,
                          lane: Number(event.currentTarget.value)
                        })
                      )
                    }
                  />
                </label>
              </div>

              {selectedControlClip !== null ? (
                <>
                  {targetOption === null || effectOptionId === null ? (
                    <div className="material-summary">
                      {formatControlEffectValue(selectedControlClip.effect)}. This
                      control clip is preserved, but the current editor can only
                      edit targets and effects that are exposed through the current
                      control catalog.
                    </div>
                  ) : (
                    <>
                      <div className="vector-inputs vector-inputs--two">
                        <label className="form-field">
                          <span className="label">Class</span>
                          <input
                            className="text-input"
                            type="text"
                            value={
                              selectedControlClip.stepClass === "held"
                                ? "Held"
                                : "Impulse"
                            }
                            readOnly
                          />
                        </label>
                        <label className="form-field">
                          <span className="label">Target</span>
                          <select
                            className="select-input"
                            value={targetOption.key}
                            onChange={(event) =>
                              onSetControlStepTarget(
                                selectedSequence.id,
                                selectedClipIndex,
                                event.currentTarget.value
                              )
                            }
                          >
                            {targetOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.groupLabel} · {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="form-field">
                        <span className="label">Effect</span>
                        <select
                          className="select-input"
                          value={effectOptionId}
                          onChange={(event) =>
                            onSetControlStepEffectOption(
                              selectedSequence.id,
                              selectedClipIndex,
                              event.currentTarget.value as ProjectScheduleEffectOptionId
                            )
                          }
                        >
                          {effectOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {effectOptions.find((option) => option.id === effectOptionId)
                        ?.valueKind === "number" ? (
                        <label className="form-field">
                          <span className="label">
                            {effectOptions.find((option) => option.id === effectOptionId)
                              ?.valueLabel ?? "Value"}
                          </span>
                          <input
                            key={`${selectedSequence.id}-${selectedClipIndex}-numeric`}
                            className="text-input"
                            type="number"
                            min={
                              effectOptions.find((option) => option.id === effectOptionId)
                                ?.min ?? 0
                            }
                            step={
                              effectOptions.find((option) => option.id === effectOptionId)
                                ?.step ?? 0.1
                            }
                            defaultValue={getControlClipNumericValue(selectedControlClip) ?? 0}
                            onBlur={(event) =>
                              onSetControlStepNumericValue(
                                selectedSequence.id,
                                selectedClipIndex,
                                Number(event.currentTarget.value)
                              )
                            }
                            onKeyDown={(event) =>
                              commitOnEnter(event, () =>
                                onSetControlStepNumericValue(
                                  selectedSequence.id,
                                  selectedClipIndex,
                                  Number(event.currentTarget.value)
                                )
                              )
                            }
                          />
                        </label>
                      ) : null}

                      {effectOptions.find((option) => option.id === effectOptionId)
                        ?.valueKind === "color" ? (
                        <label className="form-field">
                          <span className="label">
                            {effectOptions.find((option) => option.id === effectOptionId)
                              ?.valueLabel ?? "Color"}
                          </span>
                          <input
                            className="color-input"
                            type="color"
                            value={getControlClipColorValue(selectedControlClip) ?? "#ffffff"}
                            onChange={(event) =>
                              onSetControlStepColorValue(
                                selectedSequence.id,
                                selectedClipIndex,
                                event.currentTarget.value
                              )
                            }
                          />
                        </label>
                      ) : null}

                      {selectedControlClip.effect.type === "playModelAnimation" ? (
                        <>
                          <label className="form-field">
                            <span className="label">Clip</span>
                            <select
                              className="select-input"
                              value={selectedControlClip.effect.clipName}
                              onChange={(event) =>
                                onSetControlStepAnimationClip(
                                  selectedSequence.id,
                                  selectedClipIndex,
                                  event.currentTarget.value
                                )
                              }
                            >
                              {targetOption.defaults.animationClipNames?.map((clipName) => (
                                <option key={clipName} value={clipName}>
                                  {clipName}
                                </option>
                              )) ?? []}
                            </select>
                          </label>
                          <label className="form-field form-field--inline">
                            <input
                              type="checkbox"
                              checked={selectedControlClip.effect.loop !== false}
                              onChange={(event) =>
                                onSetControlStepAnimationLoop(
                                  selectedSequence.id,
                                  selectedClipIndex,
                                  event.currentTarget.checked
                                )
                              }
                            />
                            <span className="label">Loop</span>
                          </label>
                        </>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {selectedDialogueClip !== null ? (
                <label className="form-field">
                  <span className="label">Dialogue</span>
                  <select
                    className="select-input"
                    value={selectedDialogueClip.dialogueId}
                    onChange={(event) =>
                      onSetDialogueStepDialogueId(
                        selectedSequence.id,
                        selectedClipIndex,
                        event.currentTarget.value
                      )
                    }
                  >
                    {dialogueList.map((dialogue) => (
                      <option key={dialogue.id} value={dialogue.id}>
                        {dialogue.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedClip.type === "teleportPlayer" ||
              selectedClip.type === "toggleVisibility" ? (
                <div className="material-summary">
                  This impulse clip is preserved, but the current editor only
                  exposes direct payload editing for dialogue and control clips.
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
