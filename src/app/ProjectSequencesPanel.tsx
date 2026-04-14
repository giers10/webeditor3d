import type { KeyboardEvent as ReactKeyboardEvent } from "react";

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
  onAddHeldControlStep(sequenceId: string, targetKey: string): void;
  onAddImpulseControlStep(sequenceId: string, targetKey: string): void;
  onAddDialogueStep(sequenceId: string, dialogueId: string): void;
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

function getControlClipNumericValue(clip: Extract<SequenceClip, { type: "controlEffect" }>): number | null {
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

function getControlClipColorValue(clip: Extract<SequenceClip, { type: "controlEffect" }>): string | null {
  switch (clip.effect.type) {
    case "setLightColor":
    case "setAmbientLightColor":
    case "setSunLightColor":
      return clip.effect.colorHex;
    default:
      return null;
  }
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
  onAddHeldControlStep,
  onAddImpulseControlStep,
  onAddDialogueStep,
  onDeleteStep,
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
                    {getProjectSequenceImpulseSteps(sequence).length} impulse
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
          Select a sequence to edit its title and steps.
        </div>
      ) : (
        <div className="form-section">
          <div className="material-summary">
            Build a sequence from clips. Held clips resolve over a timeline
            placement; impulse clips can be started immediately from
            interaction links.
          </div>
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

          <div className="label">Steps</div>
          {selectedSequence.clips.length === 0 ? (
            <div className="outliner-empty">
              Add held control, impulse control, or dialogue clips. Interaction
              links can only run sequences that contain at least one impulse
              clip.
            </div>
          ) : (
            <div className="outliner-list">
              {selectedSequence.clips.map((clip, clipIndex) => {
                if (clip.type === "controlEffect") {
                  const targetKey = getControlTargetRefKey(clip.effect.target);
                  const targetOption =
                    getProjectScheduleTargetOptionByKey(targetOptions, targetKey);
                  const effectOptions =
                    targetOption === null
                      ? []
                      : listProjectScheduleEffectOptions(targetOption);
                  const effectOptionId =
                    targetOption === null
                      ? null
                      : (() => {
                          try {
                            return getProjectScheduleEffectOptionId(clip.effect);
                          } catch {
                            return null;
                          }
                        })();
                  const selectedEffectOption =
                    effectOptionId === null
                      ? null
                      : effectOptions.find((option) => option.id === effectOptionId) ??
                        null;

                  return (
                    <div key={`${selectedSequence.id}-${clipIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceClipLabel(clip)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, clipIndex)}
                        >
                          x
                        </button>
                      </div>

                      {targetOption === null || effectOptionId === null ? (
                        <div className="material-summary">
                          {formatControlEffectValue(clip.effect)}. This control clip
                          is preserved, but the current sequence editor can only edit
                          control targets/effects that are exposed through the
                          existing sequencer target catalog.
                        </div>
                      ) : (
                        <>
                          <div className="vector-inputs vector-inputs--two">
                            <label className="form-field">
                              <span className="label">Class</span>
                              <input
                                className="text-input"
                                type="text"
                                value={step.stepClass === "held" ? "Held" : "Impulse"}
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
                                    clipIndex,
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
                                  clipIndex,
                                  event.currentTarget
                                    .value as ProjectScheduleEffectOptionId
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

                          {selectedEffectOption?.valueKind === "number" ? (
                            <label className="form-field">
                              <span className="label">
                                {selectedEffectOption.valueLabel ?? "Value"}
                              </span>
                              <input
                                className="text-input"
                                type="number"
                                min={selectedEffectOption.min ?? 0}
                                step={selectedEffectOption.step ?? 0.1}
                                defaultValue={getControlClipNumericValue(clip) ?? 0}
                                onBlur={(event) =>
                                  onSetControlStepNumericValue(
                                    selectedSequence.id,
                                    clipIndex,
                                    Number(event.currentTarget.value)
                                  )
                                }
                                onKeyDown={(event) =>
                                  commitOnEnter(event, () =>
                                    onSetControlStepNumericValue(
                                      selectedSequence.id,
                                      clipIndex,
                                      Number(event.currentTarget.value)
                                    )
                                  )
                                }
                              />
                            </label>
                          ) : null}

                          {selectedEffectOption?.valueKind === "color" ? (
                            <label className="form-field">
                              <span className="label">
                                {selectedEffectOption.valueLabel ?? "Color"}
                              </span>
                              <input
                                className="color-input"
                                type="color"
                                value={getControlClipColorValue(clip) ?? "#ffffff"}
                                onChange={(event) =>
                                  onSetControlStepColorValue(
                                    selectedSequence.id,
                                    clipIndex,
                                    event.currentTarget.value
                                  )
                                }
                              />
                            </label>
                          ) : null}

                          {selectedEffectOption?.valueKind === "animation" ? (
                            <>
                              <label className="form-field">
                                <span className="label">Clip</span>
                                <select
                                  className="select-input"
                                  value={
                                    clip.effect.type === "playModelAnimation"
                                      ? clip.effect.clipName
                                      : targetOption.defaults.animationClipNames?.[0] ??
                                        ""
                                  }
                                  onChange={(event) =>
                                    onSetControlStepAnimationClip(
                                      selectedSequence.id,
                                      clipIndex,
                                      event.currentTarget.value
                                    )
                                  }
                                >
                                  {(targetOption.defaults.animationClipNames ?? []).map(
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
                                    clip.effect.type === "playModelAnimation"
                                      ? clip.effect.loop !== false
                                      : true
                                  }
                                  onChange={(event) =>
                                    onSetControlStepAnimationLoop(
                                      selectedSequence.id,
                                      clipIndex,
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
                    </div>
                  );
                }

                if (clip.type === "startDialogue") {
                  return (
                    <div key={`${selectedSequence.id}-${clipIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceClipLabel(clip)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, clipIndex)}
                        >
                          x
                        </button>
                      </div>

                      <label className="form-field">
                        <span className="label">Dialogue</span>
                        <select
                          className="select-input"
                          value={clip.dialogueId}
                          onChange={(event) =>
                            onSetDialogueStepDialogueId(
                              selectedSequence.id,
                              clipIndex,
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
                    </div>
                  );
                }

                return (
                  <div key={`${selectedSequence.id}-${clipIndex}`} className="outliner-item">
                    <div className="outliner-item__row">
                      <div className="outliner-item__meta">
                        {getSequenceClipLabel(clip)}
                      </div>
                      <button
                        className="outliner-item__delete"
                        type="button"
                        onClick={() => onDeleteStep(selectedSequence.id, clipIndex)}
                      >
                        x
                      </button>
                    </div>

                    <div className="material-summary">
                      This impulse clip is preserved, but the current sequence
                      editor only exposes direct dialogue authoring for authored
                      project sequences.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="inline-actions">
            <button
              className="toolbar__button"
              type="button"
              disabled={targetOptions.length === 0}
              onClick={() =>
                onAddHeldControlStep(selectedSequence.id, targetOptions[0]?.key ?? "")
              }
            >
              Add Held Control Clip
            </button>
            <button
              className="toolbar__button"
              type="button"
              disabled={targetOptions.length === 0}
              onClick={() =>
                onAddImpulseControlStep(
                  selectedSequence.id,
                  targetOptions[0]?.key ?? ""
                )
              }
            >
              Add Impulse Control Clip
            </button>
            <button
              className="toolbar__button"
              type="button"
              disabled={dialogueList.length === 0}
              onClick={() =>
                onAddDialogueStep(selectedSequence.id, dialogueList[0]?.id ?? "")
              }
            >
              Add Dialogue Clip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
