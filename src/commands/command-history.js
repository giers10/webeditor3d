export class CommandHistory {
    undoStack = [];
    redoStack = [];
    execute(command, context) {
        command.execute(context);
        this.undoStack.push(command);
        this.redoStack.length = 0;
    }
    undo(context) {
        const command = this.undoStack.pop();
        if (command === undefined) {
            return null;
        }
        command.undo(context);
        this.redoStack.push(command);
        return command;
    }
    redo(context) {
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
    canUndo() {
        return this.undoStack.length > 0;
    }
    canRedo() {
        return this.redoStack.length > 0;
    }
}
