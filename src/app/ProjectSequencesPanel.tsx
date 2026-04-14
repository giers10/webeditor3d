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
  getSequenceEffectLabel,
  type SequenceEffect,
  type SequenceVisibilityMode
} from "../sequencer/project-sequence-steps";
import {
  getProjectSequences,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

interface ProjectSequencesPanelProps {
  sequences: ProjectSequenceLibrary;
  dialogues: ProjectDialogueLibrary;
  targetOptions: ProjectScheduleTargetOption[];
  teleportTargetOptions: Array<{
    entityId: string;
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
  selectedSequenceId: string | null;
  onSelectSequence(sequenceId: string | null): void;
  onAddSequence(): void;
  onDeleteSequence(sequenceId: string): void;
  onSetSequenceTitle(sequenceId: string, title: string): void;
  onAddHeldControlStep(sequenceId: string, targetKey: string): void;
  onAddImpulseControlStep(sequenceId: string, targetKey: string): void;
  onAddDialogueStep(sequenceId: string, dialogueId: string): void;
  onAddTeleportStep(sequenceId: string, targetEntityId: string): void;
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
  onSetVisibilityStepTarget(
    sequenceId: string,
    stepIndex: number,
    targetKey: string
  ): void;
  onSetVisibilityStepMode(
    sequenceId: string,
    stepIndex: number,
    mode: SequenceVisibilityMode
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

function getControlEffectNumericValue(
  effect: Extract<SequenceEffect, { type: "controlEffect" }>
): number | null {
  switch (effect.effect.type) {
    case "setSoundVolume":
      return effect.effect.volume;
    case "setLightIntensity":
    case "setAmbientLightIntensity":
    case "setSunLightIntensity":
      return effect.effect.intensity;
    default:
      return null;
  }
}

function getControlEffectColorValue(
  effect: Extract<SequenceEffect, { type: "controlEffect" }>
): string | null {
  switch (effect.effect.type) {
    case "setLightColor":
    case "setAmbientLightColor":
    case "setSunLightColor":
      return effect.effect.colorHex;
    default:
      return null;
  }
}

export function ProjectSequencesPanel({
  sequences,
  dialogues,
  targetOptions,
  teleportTargetOptions,
  visibilityTargetOptions,
  modelAnimationTargetOptions,
  soundTargetOptions,
  selectedSequenceId,
  onSelectSequence,
  onAddSequence,
  onDeleteSequence,
  onSetSequenceTitle,
  onAddHeldControlStep,
  onAddImpulseControlStep,
  onAddDialogueStep,
  onAddTeleportStep,
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
  onSetVisibilityStepTarget,
  onSetVisibilityStepMode
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
                    {sequence.effects.length} effect
                    {sequence.effects.length === 1 ? "" : "s"} ·{" "}
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
          Create Sequence
        </button>
      </div>

      {selectedSequence === null ? (
        <div className="outliner-empty">
          Select a sequence to edit its title and effects.
        </div>
      ) : (
        <div className="form-section">
          <div className="material-summary">
            A sequence is a reusable bundle of engine effects. Held effects stay
            active for the whole placement window. Impulse effects fire when the
            sequence starts from an interaction or future event trigger.
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

          <div className="label">Effects</div>
          {selectedSequence.effects.length === 0 ? (
            <div className="outliner-empty">
              Add held control, impulse control, or dialogue effects.
            </div>
          ) : (
            <div className="outliner-list">
              {selectedSequence.effects.map((effect, effectIndex) => {
                if (effect.type === "controlEffect") {
                  const targetKey = getControlTargetRefKey(effect.effect.target);
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
                            return getProjectScheduleEffectOptionId(effect.effect);
                          } catch {
                            return null;
                          }
                        })();

                  return (
                    <div key={`${selectedSequence.id}-${effectIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceEffectLabel(effect)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, effectIndex)}
                        >
                          x
                        </button>
                      </div>

                      {targetOption === null || effectOptionId === null ? (
                        <div className="material-summary">
                          {formatControlEffectValue(effect.effect)}. This effect is
                          preserved, but the current editor can only edit targets
                          and effects exposed through the existing control catalog.
                        </div>
                      ) : (
                        <>
                          <div className="vector-inputs vector-inputs--two">
                            <label className="form-field">
                              <span className="label">Class</span>
                              <input
                                className="text-input"
                                type="text"
                                value={effect.stepClass === "held" ? "Held" : "Impulse"}
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
                                    effectIndex,
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
                                  effectIndex,
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
                                key={`${selectedSequence.id}-${effectIndex}-numeric`}
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
                                defaultValue={getControlEffectNumericValue(effect) ?? 0}
                                onBlur={(event) =>
                                  onSetControlStepNumericValue(
                                    selectedSequence.id,
                                    effectIndex,
                                    Number(event.currentTarget.value)
                                  )
                                }
                                onKeyDown={(event) =>
                                  commitOnEnter(event, () =>
                                    onSetControlStepNumericValue(
                                      selectedSequence.id,
                                      effectIndex,
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
                                value={getControlEffectColorValue(effect) ?? "#ffffff"}
                                onChange={(event) =>
                                  onSetControlStepColorValue(
                                    selectedSequence.id,
                                    effectIndex,
                                    event.currentTarget.value
                                  )
                                }
                              />
                            </label>
                          ) : null}

                          {effect.effect.type === "playModelAnimation" ? (
                            <>
                              <label className="form-field">
                                <span className="label">Clip</span>
                                <select
                                  className="select-input"
                                  value={effect.effect.clipName}
                                  onChange={(event) =>
                                    onSetControlStepAnimationClip(
                                      selectedSequence.id,
                                      effectIndex,
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
                                  checked={effect.effect.loop !== false}
                                  onChange={(event) =>
                                    onSetControlStepAnimationLoop(
                                      selectedSequence.id,
                                      effectIndex,
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

                if (effect.type === "startDialogue") {
                  return (
                    <div key={`${selectedSequence.id}-${effectIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceEffectLabel(effect)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, effectIndex)}
                        >
                          x
                        </button>
                      </div>
                      <label className="form-field">
                        <span className="label">Dialogue</span>
                        <select
                          className="select-input"
                          value={effect.dialogueId}
                          onChange={(event) =>
                            onSetDialogueStepDialogueId(
                              selectedSequence.id,
                              effectIndex,
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

                if (effect.type === "teleportPlayer") {
                  return (
                    <div key={`${selectedSequence.id}-${effectIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceEffectLabel(effect)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, effectIndex)}
                        >
                          x
                        </button>
                      </div>
                      <label className="form-field">
                        <span className="label">Teleport Target</span>
                        <select
                          className="select-input"
                          value={effect.targetEntityId}
                          onChange={(event) =>
                            onSetTeleportStepTarget(
                              selectedSequence.id,
                              effectIndex,
                              event.currentTarget.value
                            )
                          }
                        >
                          {teleportTargetOptions.map((target) => (
                            <option key={target.entityId} value={target.entityId}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                }

                if (effect.type === "toggleVisibility") {
                  return (
                    <div key={`${selectedSequence.id}-${effectIndex}`} className="outliner-item">
                      <div className="outliner-item__row">
                        <div className="outliner-item__meta">
                          {getSequenceEffectLabel(effect)}
                        </div>
                        <button
                          className="outliner-item__delete"
                          type="button"
                          onClick={() => onDeleteStep(selectedSequence.id, effectIndex)}
                        >
                          x
                        </button>
                      </div>
                      <div className="vector-inputs vector-inputs--two">
                        <label className="form-field">
                          <span className="label">Whitebox Solid</span>
                          <select
                            className="select-input"
                            value={effect.targetBrushId}
                            onChange={(event) =>
                              onSetVisibilityStepTarget(
                                selectedSequence.id,
                                effectIndex,
                                event.currentTarget.value
                              )
                            }
                          >
                            {visibilityTargetOptions.map((target) => (
                              <option key={target.brushId} value={target.brushId}>
                                {target.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-field">
                          <span className="label">Mode</span>
                          <select
                            className="select-input"
                            value={getVisibilityModeSelectValue(effect.visible)}
                            onChange={(event) =>
                              onSetVisibilityStepMode(
                                selectedSequence.id,
                                effectIndex,
                                event.currentTarget.value as "toggle" | "show" | "hide"
                              )
                            }
                          >
                            <option value="toggle">Toggle</option>
                            <option value="show">Show</option>
                            <option value="hide">Hide</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`${selectedSequence.id}-${effectIndex}`} className="outliner-item">
                    <div className="outliner-item__row">
                      <div className="outliner-item__meta">
                        {getSequenceEffectLabel(effect)}
                      </div>
                      <button
                        className="outliner-item__delete"
                        type="button"
                        onClick={() => onDeleteStep(selectedSequence.id, effectIndex)}
                      >
                        x
                      </button>
                    </div>
                    <div className="material-summary">
                      This effect is preserved, but the current editor does not
                      expose direct editing for it yet.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="inline-actions">
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={targetOptions.length === 0}
              onClick={() =>
                onAddHeldControlStep(selectedSequence.id, targetOptions[0]?.key ?? "")
              }
            >
              Add Held Effect
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={targetOptions.length === 0}
              onClick={() =>
                onAddImpulseControlStep(selectedSequence.id, targetOptions[0]?.key ?? "")
              }
            >
              Add Impulse Effect
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={dialogueList.length === 0}
              onClick={() =>
                onAddDialogueStep(selectedSequence.id, dialogueList[0]?.id ?? "")
              }
            >
              Add Dialogue Effect
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={teleportTargetOptions.length === 0}
              onClick={() =>
                onAddTeleportStep(
                  selectedSequence.id,
                  teleportTargetOptions[0]?.entityId ?? ""
                )
              }
            >
              Add Teleport Effect
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={visibilityTargetOptions.length === 0}
              onClick={() =>
                onAddVisibilityStep(
                  selectedSequence.id,
                  visibilityTargetOptions[0]?.brushId ?? ""
                )
              }
            >
              Add Visibility Effect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
