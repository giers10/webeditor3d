import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { formatControlEffectValue, getControlTargetRefKey } from "../controls/control-surface";
import {
  getProjectScheduleEffectOptionId,
  getProjectScheduleTargetOptionByKey,
  listProjectScheduleEffectOptions,
  type ProjectScheduleEffectOptionId,
  type ProjectScheduleTargetOption
} from "../scheduler/project-schedule-control-options";
import {
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
  targetOptions: ProjectScheduleTargetOption[];
  npcTalkTargetOptions: Array<{
    npcEntityId: string;
    label: string;
    defaultDialogueId: string | null;
    dialogues: Array<{
      dialogueId: string;
      label: string;
    }>;
  }>;
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
  preferredControlTargetKey?: string | null;
  selectedSequenceId: string | null;
  onSelectSequence(sequenceId: string | null): void;
  onAddSequence(): void;
  onDeleteSequence(sequenceId: string): void;
  onSetSequenceTitle(sequenceId: string, title: string): void;
  onAddControlEffect(
    sequenceId: string,
    targetKey: string,
    effectOptionId: ProjectScheduleEffectOptionId
  ): void;
  onAddNpcTalkEffect(
    sequenceId: string,
    npcEntityId: string,
    dialogueId: string | null
  ): void;
  onAddTeleportStep(sequenceId: string, targetEntityId: string): void;
  onAddSceneTransitionStep(sequenceId: string, targetKey: string): void;
  onAddVisibilityStep(sequenceId: string, targetKey: string): void;
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
  onSetControlStepPathId(
    sequenceId: string,
    stepIndex: number,
    pathId: string
  ): void;
  onSetControlStepPathSpeed(
    sequenceId: string,
    stepIndex: number,
    speed: number
  ): void;
  onSetControlStepPathLoop(
    sequenceId: string,
    stepIndex: number,
    loop: boolean
  ): void;
  onSetControlStepPathSmooth(
    sequenceId: string,
    stepIndex: number,
    smoothPath: boolean
  ): void;
  onSetNpcTalkStepNpcEntityId(
    sequenceId: string,
    stepIndex: number,
    npcEntityId: string
  ): void;
  onSetNpcTalkStepDialogueId(
    sequenceId: string,
    stepIndex: number,
    dialogueId: string | null
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
  targetOptions,
  npcTalkTargetOptions,
  teleportTargetOptions,
  sceneTransitionTargetOptions,
  visibilityTargetOptions,
  preferredControlTargetKey = null,
  selectedSequenceId,
  onSelectSequence,
  onAddSequence,
  onDeleteSequence,
  onSetSequenceTitle,
  onAddControlEffect,
  onAddNpcTalkEffect,
  onAddTeleportStep,
  onAddSceneTransitionStep,
  onAddVisibilityStep,
  onDeleteStep,
  onSetControlStepTarget,
  onSetControlStepEffectOption,
  onSetControlStepNumericValue,
  onSetControlStepColorValue,
  onSetControlStepAnimationClip,
  onSetControlStepAnimationLoop,
  onSetControlStepPathId,
  onSetControlStepPathSpeed,
  onSetControlStepPathLoop,
  onSetControlStepPathSmooth,
  onSetNpcTalkStepNpcEntityId,
  onSetNpcTalkStepDialogueId,
  onSetTeleportStepTarget,
  onSetSceneTransitionStepTarget,
  onSetVisibilityStepTarget,
  onSetVisibilityStepMode
}: ProjectSequencesPanelProps) {
  const sequenceList = getProjectSequences(sequences);
  const editableTargetOptions = targetOptions.filter(
    (targetOption) => listProjectScheduleEffectOptions(targetOption).length > 0
  );
  const preferredControlTargetOption =
    editableTargetOptions.find(
      (targetOption) => targetOption.key === preferredControlTargetKey
    ) ?? null;
  const addableControlTargetOptions =
    preferredControlTargetOption === null
      ? editableTargetOptions
      : [preferredControlTargetOption];
  const addableControlEffects = addableControlTargetOptions.flatMap((targetOption) =>
    listProjectScheduleEffectOptions(targetOption).map((effectOption) => ({
      targetKey: targetOption.key,
      effectOptionId: effectOption.id,
      label:
        preferredControlTargetOption === null
          ? `Add ${targetOption.label} ${effectOption.label} Effect`
          : `Add ${effectOption.label} Effect`
    }))
  );
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
                    {sequence.effects.length === 1 ? "" : "s"}
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
            A sequence is a reusable bundle of engine effects. Some effects stay
            active while a timeline placement is active. Others fire once when the
            sequence starts.
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
              Add an effect to define what this sequence does.
            </div>
          ) : (
            <div className="outliner-list">
              {selectedSequence.effects.map((effect, effectIndex) => {
                if (effect.type === "controlEffect") {
                  const targetKey = getControlTargetRefKey(effect.effect.target);
                  const targetOption =
                    getProjectScheduleTargetOptionByKey(targetOptions, targetKey);
                  const isSceneLightingEffect =
                    targetOption?.target.kind === "scene";
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
                          {isSceneLightingEffect ? (
                            <div className="material-summary">
                              This effect applies to the active scene lighting.
                            </div>
                          ) : (
                            <>
                              <div className="vector-inputs vector-inputs--two">
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
                                    {editableTargetOptions.map((option) => (
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
                            </>
                          )}

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

                          {effect.effect.type === "playModelAnimation" ||
                          effect.effect.type === "playActorAnimation" ? (
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
                                  {(
                                    effect.effect.type === "playActorAnimation"
                                      ? targetOption.defaults.actorAnimationClipNames
                                      : targetOption.defaults.animationClipNames
                                  )?.map((clipName) => (
                                    <option key={clipName} value={clipName}>
                                      {clipName}
                                    </option>
                                  ))}
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

                          {effect.effect.type === "followActorPath" ? (
                            <>
                              <label className="form-field">
                                <span className="label">Path</span>
                                <select
                                  className="select-input"
                                  value={effect.effect.pathId}
                                  onChange={(event) =>
                                    onSetControlStepPathId(
                                      selectedSequence.id,
                                      effectIndex,
                                      event.currentTarget.value
                                    )
                                  }
                                >
                                  {(targetOption.defaults.actorPathOptions ?? []).map(
                                    (pathOption) => (
                                      <option
                                        key={pathOption.pathId}
                                        value={pathOption.pathId}
                                      >
                                        {pathOption.label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>
                              <label className="form-field">
                                <span className="label">Speed</span>
                                <input
                                  key={`${selectedSequence.id}-${effectIndex}-path-speed`}
                                  className="text-input"
                                  type="number"
                                  min="0.01"
                                  step="0.1"
                                  defaultValue={effect.effect.speed}
                                  onBlur={(event) =>
                                    onSetControlStepPathSpeed(
                                      selectedSequence.id,
                                      effectIndex,
                                      Number(event.currentTarget.value)
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    commitOnEnter(event, () =>
                                      onSetControlStepPathSpeed(
                                        selectedSequence.id,
                                        effectIndex,
                                        Number(event.currentTarget.value)
                                      )
                                    )
                                  }
                                />
                              </label>
                              <label className="form-field form-field--inline">
                                <input
                                  type="checkbox"
                                  checked={effect.effect.loop}
                                  onChange={(event) =>
                                    onSetControlStepPathLoop(
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

                if (effect.type === "makeNpcTalk") {
                  const selectedNpcOption =
                    npcTalkTargetOptions.find(
                      (option) => option.npcEntityId === effect.npcEntityId
                    ) ?? null;
                  const dialogueOptions = selectedNpcOption?.dialogues ?? [];
                  const resolvedDialogueId =
                    effect.dialogueId !== null &&
                    dialogueOptions.some(
                      (option) => option.dialogueId === effect.dialogueId
                    )
                      ? effect.dialogueId
                      : "";

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
                      {selectedNpcOption === null ? (
                        <div className="material-summary">
                          The targeted NPC no longer exists or no longer exposes any
                          authored dialogues.
                        </div>
                      ) : (
                        <>
                          <label className="form-field">
                            <span className="label">NPC</span>
                            <select
                              className="select-input"
                              value={effect.npcEntityId}
                              onChange={(event) =>
                                onSetNpcTalkStepNpcEntityId(
                                  selectedSequence.id,
                                  effectIndex,
                                  event.currentTarget.value
                                )
                              }
                            >
                              {npcTalkTargetOptions.map((option) => (
                                <option key={option.npcEntityId} value={option.npcEntityId}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="label">Dialogue</span>
                            <select
                              className="select-input"
                              value={resolvedDialogueId}
                              onChange={(event) =>
                                onSetNpcTalkStepDialogueId(
                                  selectedSequence.id,
                                  effectIndex,
                                  event.currentTarget.value.trim().length === 0
                                    ? null
                                    : event.currentTarget.value
                                )
                              }
                            >
                              <option value="">Use NPC Default</option>
                              {dialogueOptions.map((dialogue) => (
                                <option
                                  key={dialogue.dialogueId}
                                  value={dialogue.dialogueId}
                                >
                                  {dialogue.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
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

                if (effect.type === "startSceneTransition") {
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
                        <span className="label">Destination</span>
                        <select
                          className="select-input"
                          value={`${effect.targetSceneId}::${effect.targetEntryEntityId}`}
                          onChange={(event) =>
                            onSetSceneTransitionStepTarget(
                              selectedSequence.id,
                              effectIndex,
                              event.currentTarget.value
                            )
                          }
                        >
                          {sceneTransitionTargetOptions.map((target) => (
                            <option key={target.targetKey} value={target.targetKey}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                }

                if (effect.type === "setVisibility") {
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
                          <span className="label">Target</span>
                          <select
                            className="select-input"
                            value={
                              effect.target.kind === "brush"
                                ? `brush:${effect.target.brushId}`
                                : `modelInstance:${effect.target.modelInstanceId}`
                            }
                            onChange={(event) =>
                              onSetVisibilityStepTarget(
                                selectedSequence.id,
                                effectIndex,
                                event.currentTarget.value
                              )
                            }
                          >
                            {visibilityTargetOptions.map((target) => (
                              <option key={target.targetKey} value={target.targetKey}>
                                {target.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-field">
                          <span className="label">Mode</span>
                          <select
                            className="select-input"
                            value={effect.mode}
                            onChange={(event) =>
                              onSetVisibilityStepMode(
                                selectedSequence.id,
                                effectIndex,
                                event.currentTarget.value as SequenceVisibilityMode
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
            {addableControlEffects.map((effectButton) => (
              <button
                key={`${effectButton.targetKey}:${effectButton.effectOptionId}`}
                className="toolbar__button toolbar__button--compact"
                type="button"
                onClick={() =>
                  onAddControlEffect(
                    selectedSequence.id,
                    effectButton.targetKey,
                    effectButton.effectOptionId
                  )
                }
              >
                {effectButton.label}
              </button>
            ))}
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={npcTalkTargetOptions.length === 0}
              onClick={() =>
                onAddNpcTalkEffect(
                  selectedSequence.id,
                  npcTalkTargetOptions[0]?.npcEntityId ?? "",
                  npcTalkTargetOptions[0]?.defaultDialogueId ??
                    npcTalkTargetOptions[0]?.dialogues[0]?.dialogueId ??
                    null
                )
              }
            >
              Add Make NPC Talk Effect
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
              disabled={sceneTransitionTargetOptions.length === 0}
              onClick={() =>
                onAddSceneTransitionStep(
                  selectedSequence.id,
                  sceneTransitionTargetOptions[0]?.targetKey ?? ""
                )
              }
            >
              Add Scene Transition Effect
            </button>
            <button
              className="toolbar__button toolbar__button--compact"
              type="button"
              disabled={visibilityTargetOptions.length === 0}
              onClick={() =>
                onAddVisibilityStep(
                  selectedSequence.id,
                  visibilityTargetOptions[0]?.targetKey ?? ""
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
