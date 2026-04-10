import type { SaveSceneDocumentDraftResult } from "./local-draft-storage";

export interface EditorAutosaveControllerOptions {
  debounceMs?: number;
  onComplete?: (result: SaveSceneDocumentDraftResult) => void;
  saveDraft: () => SaveSceneDocumentDraftResult;
}

export class EditorAutosaveController {
  private readonly debounceMs: number;
  private readonly onComplete: ((result: SaveSceneDocumentDraftResult) => void) | undefined;
  private readonly saveDraft: () => SaveSceneDocumentDraftResult;
  private timeoutId: number | null = null;

  constructor(options: EditorAutosaveControllerOptions) {
    this.debounceMs = options.debounceMs ?? 200;
    this.onComplete = options.onComplete;
    this.saveDraft = options.saveDraft;
  }

  schedule() {
    this.clearPendingTimeout();
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      this.runSave();
    }, this.debounceMs);
  }

  flush(): SaveSceneDocumentDraftResult {
    this.clearPendingTimeout();
    return this.runSave();
  }

  dispose() {
    this.clearPendingTimeout();
  }

  private clearPendingTimeout() {
    if (this.timeoutId === null) {
      return;
    }

    window.clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private runSave(): SaveSceneDocumentDraftResult {
    const result = this.saveDraft();
    this.onComplete?.(result);
    return result;
  }
}
