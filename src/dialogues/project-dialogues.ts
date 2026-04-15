import { createOpaqueId } from "../core/ids";

export interface ProjectDialogueLine {
  id: string;
  text: string;
}

export interface ProjectDialogue {
  id: string;
  title: string;
  lines: ProjectDialogueLine[];
}

export interface ProjectDialogueLibrary {
  dialogues: Record<string, ProjectDialogue>;
}

export function createEmptyProjectDialogueLibrary(): ProjectDialogueLibrary {
  return {
    dialogues: {}
  };
}

export function createProjectDialogueLine(
  overrides: Partial<ProjectDialogueLine> = {}
): ProjectDialogueLine {
  return {
    id: overrides.id ?? createOpaqueId("dialogue-line"),
    text: overrides.text ?? "..."
  };
}

export function createProjectDialogue(
  overrides: Partial<Pick<ProjectDialogue, "id" | "title">> & {
    lines?: ProjectDialogueLine[];
  } = {}
): ProjectDialogue {
  return {
    id: overrides.id ?? createOpaqueId("dialogue"),
    title: overrides.title?.trim() || "Untitled Dialogue",
    lines:
      overrides.lines?.map(cloneProjectDialogueLine) ?? [
        createProjectDialogueLine()
      ]
  };
}

export function cloneProjectDialogueLine(
  line: ProjectDialogueLine
): ProjectDialogueLine {
  return {
    id: line.id,
    text: line.text
  };
}

export function cloneProjectDialogue(
  dialogue: ProjectDialogue
): ProjectDialogue {
  return {
    id: dialogue.id,
    title: dialogue.title,
    lines: dialogue.lines.map(cloneProjectDialogueLine)
  };
}

export function cloneProjectDialogueLibrary(
  library: ProjectDialogueLibrary
): ProjectDialogueLibrary {
  return {
    dialogues: Object.fromEntries(
      Object.entries(library.dialogues).map(([dialogueId, dialogue]) => [
        dialogueId,
        cloneProjectDialogue(dialogue)
      ])
    )
  };
}

export function areProjectDialogueLinesEqual(
  left: ProjectDialogueLine,
  right: ProjectDialogueLine
): boolean {
  return left.id === right.id && left.text === right.text;
}

export function areProjectDialoguesEqual(
  left: ProjectDialogue,
  right: ProjectDialogue
): boolean {
  if (
    left.id !== right.id ||
    left.title !== right.title ||
    left.lines.length !== right.lines.length
  ) {
    return false;
  }

  return left.lines.every((line, index) =>
    areProjectDialogueLinesEqual(line, right.lines[index]!)
  );
}

export function areProjectDialogueLibrariesEqual(
  left: ProjectDialogueLibrary,
  right: ProjectDialogueLibrary
): boolean {
  const leftIds = Object.keys(left.dialogues);
  const rightIds = Object.keys(right.dialogues);

  if (leftIds.length !== rightIds.length) {
    return false;
  }

  return leftIds.every((dialogueId) => {
    const rightDialogue = right.dialogues[dialogueId];
    return (
      rightDialogue !== undefined &&
      areProjectDialoguesEqual(left.dialogues[dialogueId]!, rightDialogue)
    );
  });
}

export function getProjectDialogues(
  library: ProjectDialogueLibrary
): ProjectDialogue[] {
  return Object.values(library.dialogues).sort((left, right) => {
    const titleCompare = left.title.localeCompare(right.title);

    if (titleCompare !== 0) {
      return titleCompare;
    }

    return left.id.localeCompare(right.id);
  });
}
