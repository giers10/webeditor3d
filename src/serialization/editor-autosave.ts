import type { SaveSceneDocumentDraftResult } from "./local-draft-storage";

export type EditorAutosaveScope = "document" | "viewport" | "all";

export interface EditorAutosaveRequest {
  document: boolean;
  viewportLayout: boolean;
}

export interface EditorAutosaveControllerOptions {
  debounceMs?: number;
  onComplete?: (result: SaveSceneDocumentDraftResult) => void;
  saveDraft: (
    request: EditorAutosaveRequest
  ) => Promise<SaveSceneDocumentDraftResult> | SaveSceneDocumentDraftResult;
}

const UP_TO_DATE_RESULT: SaveSceneDocumentDraftResult = {
  status: "saved",
  message: "Autosave is already up to date."
};

function createEmptyRequest(): EditorAutosaveRequest {
  return {
    document: false,
    viewportLayout: false
  };
}

function hasPendingWork(request: EditorAutosaveRequest): boolean {
  return request.document || request.viewportLayout;
}

function mergeScopeIntoRequest(
  request: EditorAutosaveRequest,
  scope: EditorAutosaveScope
) {
  if (scope === "document" || scope === "all") {
    request.document = true;
  }

  if (scope === "viewport" || scope === "all") {
    request.viewportLayout = true;
  }
}

export class EditorAutosaveController {
  private readonly debounceMs: number;
  private readonly onComplete:
    | ((result: SaveSceneDocumentDraftResult) => void)
    | undefined;
  private readonly saveDraft: (
    request: EditorAutosaveRequest
  ) => Promise<SaveSceneDocumentDraftResult> | SaveSceneDocumentDraftResult;
  private timeoutId: number | null = null;
  private pendingRequest = createEmptyRequest();
  private inFlight = false;
  private drainPromise: Promise<SaveSceneDocumentDraftResult> | null = null;

  constructor(options: EditorAutosaveControllerOptions) {
    this.debounceMs = options.debounceMs ?? 200;
    this.onComplete = options.onComplete;
    this.saveDraft = options.saveDraft;
  }

  schedule(scope: EditorAutosaveScope = "all") {
    mergeScopeIntoRequest(this.pendingRequest, scope);
    this.clearPendingTimeout();
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      void this.drain();
    }, this.debounceMs);
  }

  flush(scope?: EditorAutosaveScope): Promise<SaveSceneDocumentDraftResult> {
    if (scope !== undefined) {
      mergeScopeIntoRequest(this.pendingRequest, scope);
    }

    this.clearPendingTimeout();
    return this.drain();
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

  private drain(): Promise<SaveSceneDocumentDraftResult> {
    if (this.inFlight) {
      return this.drainPromise ?? Promise.resolve(UP_TO_DATE_RESULT);
    }

    this.drainPromise = this.runPendingSaves();
    return this.drainPromise;
  }

  private async runPendingSaves(): Promise<SaveSceneDocumentDraftResult> {
    this.inFlight = true;
    let lastResult = UP_TO_DATE_RESULT;

    try {
      while (hasPendingWork(this.pendingRequest)) {
        const request = this.pendingRequest;
        this.pendingRequest = createEmptyRequest();
        lastResult = await this.saveDraft({ ...request });
        this.onComplete?.(lastResult);
      }

      return lastResult;
    } finally {
      this.inFlight = false;
      this.drainPromise = null;

      if (hasPendingWork(this.pendingRequest)) {
        void this.drain();
      }
    }
  }
}
