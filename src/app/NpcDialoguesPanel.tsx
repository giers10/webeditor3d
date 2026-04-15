import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { type ProjectDialogue } from "../dialogues/project-dialogues";

interface NpcDialoguesPanelProps {
  dialogues: ProjectDialogue[];
  defaultDialogueId: string | null;
  selectedDialogueId: string | null;
  onSelectDialogue(dialogueId: string | null): void;
  onSetDefaultDialogueId(dialogueId: string | null): void;
  onAddDialogue(): void;
  onDeleteDialogue(dialogueId: string): void;
  onSetDialogueTitle(dialogueId: string, title: string): void;
  onAddDialogueLine(dialogueId: string): void;
  onDeleteDialogueLine(dialogueId: string, lineId: string): void;
  onSetDialogueLineSpeaker(
    dialogueId: string,
    lineId: string,
    speakerName: string | null
  ): void;
  onSetDialogueLineText(dialogueId: string, lineId: string, text: string): void;
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

export function NpcDialoguesPanel({
  dialogues,
  defaultDialogueId,
  selectedDialogueId,
  onSelectDialogue,
  onSetDefaultDialogueId,
  onAddDialogue,
  onDeleteDialogue,
  onSetDialogueTitle,
  onAddDialogueLine,
  onDeleteDialogueLine,
  onSetDialogueLineSpeaker,
  onSetDialogueLineText
}: NpcDialoguesPanelProps) {
  const selectedDialogue =
    selectedDialogueId === null
      ? null
      : dialogues.find((dialogue) => dialogue.id === selectedDialogueId) ?? null;
  const resolvedDefaultDialogueId =
    defaultDialogueId !== null &&
    dialogues.some((dialogue) => dialogue.id === defaultDialogueId)
      ? defaultDialogueId
      : null;
  const defaultDialogue =
    resolvedDefaultDialogueId === null
      ? null
      : dialogues.find((dialogue) => dialogue.id === resolvedDefaultDialogueId) ?? null;
  const [titleDraft, setTitleDraft] = useState(selectedDialogue?.title ?? "");
  const [lineDrafts, setLineDrafts] = useState<
    Record<string, { speakerName: string; text: string }>
  >({});

  useEffect(() => {
    setTitleDraft(selectedDialogue?.title ?? "");
    setLineDrafts(
      selectedDialogue === null
        ? {}
        : Object.fromEntries(
            selectedDialogue.lines.map((line) => [
              line.id,
              {
                speakerName: line.speakerName ?? "",
                text: line.text
              }
            ])
          )
    );
  }, [selectedDialogueId, selectedDialogue]);

  const commitTitle = () => {
    if (selectedDialogue === null) {
      return;
    }

    onSetDialogueTitle(selectedDialogue.id, titleDraft);
  };

  const getLineDraft = (dialogue: ProjectDialogue, lineId: string) =>
    lineDrafts[lineId] ??
    (() => {
      const line = dialogue.lines.find((candidate) => candidate.id === lineId);
      return {
        speakerName: line?.speakerName ?? "",
        text: line?.text ?? ""
      };
    })();

  return (
    <div className="form-section">
      <div className="stat-card">
        <div className="value">
          {defaultDialogue?.title ??
            (dialogues.length === 0 ? "No Dialogues" : "No Default Dialogue")}
        </div>
        <div className="material-summary">
          {dialogues.length === 0
            ? "Author one or more dialogues for this NPC. Sequences can later make this NPC talk, and direct NPC clicks use the default dialogue."
            : defaultDialogue === null
              ? "Pick a default dialogue for direct NPC click/talk behavior."
              : `${defaultDialogue.lines.length} line${defaultDialogue.lines.length === 1 ? "" : "s"} in the default NPC dialogue.`}
        </div>
      </div>

      <label className="form-field">
        <span className="label">Default Dialogue</span>
        <select
          data-testid="npc-default-dialogue"
          className="select-input"
          value={resolvedDefaultDialogueId ?? ""}
          onChange={(event) =>
            onSetDefaultDialogueId(
              event.currentTarget.value.trim().length === 0
                ? null
                : event.currentTarget.value
            )
          }
        >
          <option value="">— none —</option>
          {dialogues.map((dialogue) => (
            <option key={dialogue.id} value={dialogue.id}>
              {dialogue.title}
            </option>
          ))}
        </select>
      </label>

      <div className="label">Dialogues</div>
      {dialogues.length === 0 ? (
        <div className="outliner-empty">No NPC dialogues authored yet.</div>
      ) : (
        <div className="outliner-list">
          {dialogues.map((dialogue) => (
            <div
              key={dialogue.id}
              className={`outliner-item outliner-item--compact ${
                selectedDialogue?.id === dialogue.id
                  ? "outliner-item--selected"
                  : ""
              }`.trim()}
            >
              <div className="outliner-item__row">
                <button
                  className="outliner-item__select"
                  type="button"
                  onClick={() => onSelectDialogue(dialogue.id)}
                >
                  <span className="outliner-item__title">{dialogue.title}</span>
                  <span className="outliner-item__meta">
                    {dialogue.lines.length} line
                    {dialogue.lines.length === 1 ? "" : "s"}
                  </span>
                </button>
                <button
                  className="outliner-item__delete"
                  type="button"
                  aria-label={`Delete ${dialogue.title}`}
                  onClick={() => onDeleteDialogue(dialogue.id)}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button className="toolbar__button" type="button" onClick={onAddDialogue}>
          Add Dialogue
        </button>
      </div>

      {selectedDialogue === null ? (
        <div className="outliner-empty">
          Select a dialogue to edit its title and lines.
        </div>
      ) : (
        <div className="form-section">
          <label className="form-field">
            <span className="label">Title</span>
            <input
              className="text-input"
              type="text"
              value={titleDraft}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setTitleDraft(nextValue);
              }}
              onBlur={commitTitle}
              onKeyDown={(event) => commitOnEnter(event, commitTitle)}
            />
          </label>

          <div className="label">Lines</div>
          <div className="outliner-list">
            {selectedDialogue.lines.map((line, index) => {
              const draft = getLineDraft(selectedDialogue, line.id);

              return (
                <div key={line.id} className="outliner-item">
                  <div className="outliner-item__row">
                    <div className="outliner-item__meta">{`Line ${index + 1}`}</div>
                    <button
                      className="outliner-item__delete"
                      type="button"
                      aria-label={`Delete line ${index + 1}`}
                      onClick={() => onDeleteDialogueLine(selectedDialogue.id, line.id)}
                    >
                      x
                    </button>
                  </div>
                  <label className="form-field">
                    <span className="label">Speaker</span>
                    <input
                      className="text-input"
                      type="text"
                      placeholder="Optional"
                      value={draft.speakerName}
                      onChange={(event) => {
                        const nextSpeakerName = event.currentTarget.value;

                        setLineDrafts((current) => ({
                          ...current,
                          [line.id]: {
                            ...draft,
                            speakerName: nextSpeakerName
                          }
                        }));
                      }}
                      onBlur={() =>
                        onSetDialogueLineSpeaker(
                          selectedDialogue.id,
                          line.id,
                          draft.speakerName
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">Text</span>
                    <textarea
                      className="text-input"
                      rows={3}
                      value={draft.text}
                      onChange={(event) => {
                        const nextText = event.currentTarget.value;

                        setLineDrafts((current) => ({
                          ...current,
                          [line.id]: {
                            ...draft,
                            text: nextText
                          }
                        }));
                      }}
                      onBlur={() =>
                        onSetDialogueLineText(
                          selectedDialogue.id,
                          line.id,
                          draft.text
                        )
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="inline-actions">
            <button
              className="toolbar__button"
              type="button"
              onClick={() => onAddDialogueLine(selectedDialogue.id)}
            >
              Add Line
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
