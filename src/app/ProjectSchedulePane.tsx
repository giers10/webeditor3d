import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  HOURS_PER_DAY,
  formatTimeOfDayHours
} from "../document/project-time-settings";
import { formatControlEffectValue, getControlTargetRefKey } from "../controls/control-surface";
import {
  formatProjectScheduleDaySelection,
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
  getProjectSequenceHeldSteps
} from "../sequencer/project-sequence-steps";
import {
  getProjectSequences,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

interface ProjectSequencerPaneProps {
  targetOptions: ProjectScheduleTargetOption[];
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
  selectedRoutineId: string | null;
  onSelectRoutine(routineId: string | null): void;
  onAddRoutine(targetKey: string): void;
  onDeleteRoutine(routineId: string): void;
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

function getRoutineSummary(
  routine: ProjectScheduleRoutine,
  sequences: ProjectSequenceLibrary
): string {
  const summaryParts = [
    formatProjectScheduleDaySelection(routine.days),
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
    summaryParts.push(formatControlEffectValue(routine.effects[0]!));
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

  const effect = routine.effects[0];

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

function groupTargetOptions(
  targetOptions: ProjectScheduleTargetOption[]
): Array<{ groupLabel: string; options: ProjectScheduleTargetOption[] }> {
  const grouped = new Map<string, ProjectScheduleTargetOption[]>();

  for (const option of targetOptions) {
    const entries = grouped.get(option.groupLabel) ?? [];
    entries.push(option);
    grouped.set(option.groupLabel, entries);
  }

  return [...grouped.entries()].map(([groupLabel, options]) => ({
    groupLabel,
    options
  }));
}

export function ProjectSequencerPane({
  targetOptions,
  scheduler,
  sequences,
  selectedRoutineId,
  onSelectRoutine,
  onAddRoutine,
  onDeleteRoutine,
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
  onSetActorRoutinePathLoop
}: ProjectSequencerPaneProps) {
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
  const selectedEffectOptionId =
    selectedRoutine === null ||
    selectedRoutine.target.kind === "actor" ||
    selectedRoutine.sequenceId !== null
      ? null
      : getProjectScheduleEffectOptionId(selectedRoutine.effects[0]!);
  const selectedEffectOptions =
    selectedTargetOption === null || selectedTargetOption.target.kind === "actor"
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
            Time-windowed sequencer clips over typed control targets and global
            project time.
          </div>
        </div>
        <div className="schedule-pane__actions">
          <button
            className="toolbar__button toolbar__button--compact"
            type="button"
            disabled={targetOptions.length === 0}
            onClick={() =>
              onAddRoutine(
                selectedTargetOption?.key ?? targetOptions[0]?.key ?? ""
              )
            }
          >
            Add Clip
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
                  (routine) =>
                    getControlTargetRefKey(routine.target) === targetOption.key
                )
                .sort((left, right) => left.startHour - right.startHour);

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
                  <div className="schedule-row__track">
                    <div className="schedule-row__grid" />
                    {routines.map((routine) =>
                      getProjectScheduleTimelineSegments(routine).map(
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
                            }`.trim()}
                            type="button"
                            title={`${routine.title} · ${getRoutineSummary(routine, sequences)}`}
                            style={{
                              left: `${(segment.startHour / HOURS_PER_DAY) * 100}%`,
                              width: `${((segment.endHour - segment.startHour) / HOURS_PER_DAY) * 100}%`
                            }}
                            onClick={() => onSelectRoutine(routine.id)}
                          >
                            <span className="schedule-block__title">
                              {routine.title}
                            </span>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="schedule-pane__editor">
          {selectedRoutine === null || selectedTargetOption === null ? (
            <div className="schedule-pane__empty">
              Select a clip block or create a new sequencer clip.
            </div>
          ) : (
            <>
              <div className="form-section">
                <div className="label">Routine</div>
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
                  <span className="label">Target</span>
                  <select
                    className="select-input"
                    value={selectedTargetOption.key}
                    onChange={(event) =>
                      onSetRoutineTarget(selectedRoutine.id, event.currentTarget.value)
                    }
                  >
                    {groupTargetOptions(targetOptions).map((group) => (
                      <optgroup key={group.groupLabel} label={group.groupLabel}>
                        {group.options.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label} ({option.subtitle})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {selectedRoutine.target.kind === "actor" ? (
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
                ) : (
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
                )}
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
                <div className="label">Legacy Day Filter</div>
                <div className="schedule-pane__summary">
                  {formatProjectScheduleDaySelection(selectedRoutine.days)}
                </div>
                <div className="material-summary">
                  Day-specific routine filters are preserved for compatibility.
                  New sequencer authoring should prefer timeline clips; a later
                  multi-day timeline will replace this legacy filter.
                </div>
              </div>

              <div className="form-section">
                <div className="label">Window</div>
                <div className="vector-inputs vector-inputs--two">
                  <label className="form-field">
                    <span className="label">Start</span>
                    <input
                      key={`${selectedRoutine.id}-start`}
                      className="text-input"
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      defaultValue={selectedRoutine.startHour}
                      onBlur={(event) =>
                        onSetRoutineStartHour(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineStartHour(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
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
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      defaultValue={selectedRoutine.endHour}
                      onBlur={(event) =>
                        onSetRoutineEndHour(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineEndHour(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
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

              {selectedRoutine.target.kind === "actor" ? (
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
              ) : (
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
              )}

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
                  Delete Routine
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export const ProjectSchedulePane = ProjectSequencerPane;
