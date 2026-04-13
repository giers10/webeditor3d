import type { NpcPresence } from "../entities/entity-instances";

import {
  hasTimeWindowJustEnded,
  hasTimeWindowJustStarted,
  isWithinTimeWindow
} from "./runtime-project-time";

export function resolveNpcPresenceActive(
  presence: NpcPresence,
  timeOfDayHours: number
): boolean {
  switch (presence.mode) {
    case "always":
      return true;
    case "timeWindow":
      return isWithinTimeWindow(
        presence.startHour,
        presence.endHour,
        timeOfDayHours
      );
  }
}

export function hasNpcPresenceActivityChanged(
  presence: NpcPresence,
  previousTimeOfDayHours: number,
  currentTimeOfDayHours: number
): boolean {
  switch (presence.mode) {
    case "always":
      return false;
    case "timeWindow":
      return (
        hasTimeWindowJustStarted(
          previousTimeOfDayHours,
          currentTimeOfDayHours,
          presence.startHour,
          presence.endHour
        ) ||
        hasTimeWindowJustEnded(
          previousTimeOfDayHours,
          currentTimeOfDayHours,
          presence.startHour,
          presence.endHour
        )
      );
  }
}
