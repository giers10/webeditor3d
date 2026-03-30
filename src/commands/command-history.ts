import type { CommandContext, EditorCommand } from "./command";

export class CommandHistory {
  private readonly undoStack: EditorCommand[] = [];
  private readonly redoStack: EditorCommand[] = [];

  execute(command: EditorCommand, context: CommandContext) {
    command.execute(context);
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  undo(context: CommandContext): EditorCommand | null {
    const command = this.undoStack.pop();

    if (command === undefined) {
      return null;
    }

    command.undo(context);
    this.redoStack.push(command);
    return command;
  }

  redo(context: CommandContext): EditorCommand | null {
    const command = this.redoStack.pop();

    if (command === undefined) {
      return null;
    }

    command.execute(context);
    this.undoStack.push(command);
    return command;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
