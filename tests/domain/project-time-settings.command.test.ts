import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createSetProjectTimeSettingsCommand } from "../../src/commands/set-project-time-settings-command";
import { cloneProjectTimeSettings } from "../../src/document/project-time-settings";

describe("createSetProjectTimeSettingsCommand", () => {
  it("updates project time settings and restores them through undo", () => {
    const store = createEditorStore();
    const originalTime = cloneProjectTimeSettings(
      store.getState().projectDocument.time
    );
    const nextTime = cloneProjectTimeSettings(originalTime);
    nextTime.startDayNumber = 4;
    nextTime.startTimeOfDayHours = 18.5;
    nextTime.dayLengthMinutes = 12;
    nextTime.sunriseTimeOfDayHours = 5.75;
    nextTime.sunsetTimeOfDayHours = 20.25;
    nextTime.night.lightIntensityFactor = 0.28;

    store.executeCommand(
      createSetProjectTimeSettingsCommand({
        label: "Set project time",
        time: nextTime
      })
    );

    expect(store.getState().projectDocument.time).toEqual(nextTime);
    expect(store.getState().document.time).toEqual(nextTime);

    expect(store.undo()).toBe(true);
    expect(store.getState().projectDocument.time).toEqual(originalTime);
    expect(store.getState().document.time).toEqual(originalTime);
  });
});