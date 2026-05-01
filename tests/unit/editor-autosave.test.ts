import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorAutosaveController } from "../../src/serialization/editor-autosave";

function createSavedResult(message = "Autosave updated.") {
  return {
    status: "saved" as const,
    message
  };
}

describe("EditorAutosaveController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces repeated autosave schedules into one async save", async () => {
    const saveDraft = vi.fn(async () => createSavedResult());
    const autosave = new EditorAutosaveController({
      debounceMs: 200,
      saveDraft
    });

    autosave.schedule("document");
    autosave.schedule("document");
    autosave.schedule("document");

    await vi.advanceTimersByTimeAsync(199);
    expect(saveDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      document: true,
      viewportLayout: false
    });
  });

  it("flushes a pending autosave immediately", async () => {
    const saveDraft = vi.fn(async () => createSavedResult());
    const autosave = new EditorAutosaveController({
      debounceMs: 200,
      saveDraft
    });

    autosave.schedule("viewport");
    const flushResult = await autosave.flush();

    expect(flushResult).toEqual({
      status: "saved",
      message: "Autosave updated."
    });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      document: false,
      viewportLayout: true
    });

    await vi.advanceTimersByTimeAsync(200);
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("reports autosave failures through the completion callback", async () => {
    const onComplete = vi.fn();
    const autosave = new EditorAutosaveController({
      debounceMs: 100,
      onComplete,
      saveDraft: async () => ({
        status: "error" as const,
        message: "Autosave could not be saved. quota exceeded"
      })
    });

    autosave.schedule("document");
    await vi.advanceTimersByTimeAsync(100);

    expect(onComplete).toHaveBeenCalledWith({
      status: "error",
      message: "Autosave could not be saved. quota exceeded"
    });
  });

  it("coalesces in-flight autosaves into one latest follow-up save", async () => {
    const resolvers: Array<(result: ReturnType<typeof createSavedResult>) => void> =
      [];
    const saveDraft = vi.fn(
      () =>
        new Promise<ReturnType<typeof createSavedResult>>((resolve) => {
          resolvers.push(resolve);
        })
    );
    const autosave = new EditorAutosaveController({
      debounceMs: 10,
      saveDraft
    });

    autosave.schedule("document");
    await vi.advanceTimersByTimeAsync(10);

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenLastCalledWith({
      document: true,
      viewportLayout: false
    });

    autosave.schedule("viewport");
    autosave.schedule("document");
    await vi.advanceTimersByTimeAsync(10);

    expect(saveDraft).toHaveBeenCalledTimes(1);

    resolvers[0]!(createSavedResult("first"));
    await vi.runAllTimersAsync();

    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenLastCalledWith({
      document: true,
      viewportLayout: true
    });

    resolvers[1]!(createSavedResult("second"));
    await vi.runAllTimersAsync();

    expect(saveDraft).toHaveBeenCalledTimes(2);
  });
});
