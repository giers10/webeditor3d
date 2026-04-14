import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDialoguesPanel } from "../../src/app/ProjectDialoguesPanel";
import { createProjectDialogue } from "../../src/dialogues/project-dialogues";

describe("ProjectDialoguesPanel", () => {
  it("lets the user type into title, speaker, and text fields without crashing", () => {
    const dialogue = createProjectDialogue({
      id: "dialogue-market",
      title: "Market Greeting",
      lines: [
        {
          id: "dialogue-line-1",
          speakerName: "Merchant",
          text: "Fresh fruit."
        }
      ]
    });

    render(
      <ProjectDialoguesPanel
        dialogues={{
          dialogues: {
            [dialogue.id]: dialogue
          }
        }}
        selectedDialogueId={dialogue.id}
        onSelectDialogue={() => {}}
        onAddDialogue={() => {}}
        onDeleteDialogue={() => {}}
        onSetDialogueTitle={vi.fn()}
        onAddDialogueLine={() => {}}
        onDeleteDialogueLine={() => {}}
        onSetDialogueLineSpeaker={vi.fn()}
        onSetDialogueLineText={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue("Market Greeting");
    const speakerInput = screen.getByDisplayValue("Merchant");
    const textInput = screen.getByDisplayValue("Fresh fruit.");

    fireEvent.change(titleInput, {
      target: {
        value: "Morning Market"
      }
    });
    fireEvent.change(speakerInput, {
      target: {
        value: "Vendor"
      }
    });
    fireEvent.change(textInput, {
      target: {
        value: "Fresh fruit and bread."
      }
    });

    expect(titleInput).toHaveValue("Morning Market");
    expect(speakerInput).toHaveValue("Vendor");
    expect(textInput).toHaveValue("Fresh fruit and bread.");
  });
});
