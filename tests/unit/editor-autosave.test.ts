import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorAutosaveController } from "../../src/serialization/editor-autosave";

describe("EditorAutosaveController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces repeated autosave schedules into one save", () => {
    const saveDraft = vi.fn(() => ({
      status: "saved" as const,
      message: "Autosave updated."
    }));
    const autosave = new EditorAutosaveController({
      debounceMs: 200,
      saveDraft
    });

    autosave.schedule();
    autosave.schedule();
    autosave.schedule();

    vi.advanceTimersByTime(199);
    expect(saveDraft).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("flushes a pending autosave immediately", () => {
    const saveDraft = vi.fn(() => ({
      status: "saved" as const,
      message: "Autosave updated."
    }));
    const autosave = new EditorAutosaveController({
      debounceMs: 200,
      saveDraft
    });

    autosave.schedule();
    const flushResult = autosave.flush();

    expect(flushResult).toEqual({
      status: "saved",
      message: "Autosave updated."
    });
    expect(saveDraft).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("reports autosave failures through the completion callback", () => {
    const onComplete = vi.fn();
    const autosave = new EditorAutosaveController({
      debounceMs: 100,
      onComplete,
      saveDraft: () => ({
        status: "error" as const,
        message: "Autosave could not be saved. quota exceeded"
      })
    });

    autosave.schedule();
    vi.advanceTimersByTime(100);

    expect(onComplete).toHaveBeenCalledWith({
      status: "error",
      message: "Autosave could not be saved. quota exceeded"
    });
  });
});
