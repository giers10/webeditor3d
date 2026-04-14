import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createEmptyRuntimeResolvedControlState,
  createSetActorPresenceControlEffect
} from "../../src/controls/control-surface";
import {
  createEmptyProjectScheduler,
  createProjectScheduleRoutine,
  createProjectScheduleSelectedDaysSelection
} from "../../src/scheduler/project-scheduler";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "../../src/runtime-three/runtime-project-scheduler";

describe("runtime project scheduler", () => {
  it("resolves cross-midnight actor routines and keeps unscheduled actors implicitly active", () => {
    const actorTarget = createActorControlTargetRef("actor-night-watch");
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines["routine-night-watch"] = createProjectScheduleRoutine({
      id: "routine-night-watch",
      title: "Night Watch",
      target: actorTarget,
      days: createProjectScheduleSelectedDaysSelection(["monday"]),
      startHour: 22,
      endHour: 2,
      effect: createSetActorPresenceControlEffect({
        target: actorTarget,
        active: true
      })
    });

    expect(
      resolveRuntimeProjectScheduleState({
        scheduler,
        actorIds: ["actor-night-watch", "actor-always-on"],
        dayNumber: 1,
        timeOfDayHours: 23
      }).actors
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: "actor-night-watch",
          hasRules: true,
          active: true,
          activeRoutineId: "routine-night-watch",
          activeRoutineTitle: "Night Watch"
        }),
        expect.objectContaining({
          actorId: "actor-always-on",
          hasRules: false,
          active: true,
          activeRoutineId: null,
          activeRoutineTitle: null
        })
      ])
    );

    expect(
      resolveRuntimeProjectScheduleState({
        scheduler,
        actorIds: ["actor-night-watch"],
        dayNumber: 2,
        timeOfDayHours: 1.5
      }).actors[0]
    ).toEqual(
      expect.objectContaining({
        actorId: "actor-night-watch",
        active: true,
        activeRoutineTitle: "Night Watch"
      })
    );

    expect(
      resolveRuntimeProjectScheduleState({
        scheduler,
        actorIds: ["actor-night-watch"],
        dayNumber: 2,
        timeOfDayHours: 3
      }).actors[0]
    ).toEqual(
      expect.objectContaining({
        actorId: "actor-night-watch",
        hasRules: true,
        active: false,
        activeRoutineId: null,
        activeRoutineTitle: null
      })
    );
  });

  it("prefers the highest-priority active routine and writes actor presence into resolved control state", () => {
    const actorTarget = createActorControlTargetRef("actor-market-vendor");
    const scheduler = createEmptyProjectScheduler();
    scheduler.routines["routine-open"] = createProjectScheduleRoutine({
      id: "routine-open",
      title: "Open Stall",
      target: actorTarget,
      startHour: 9,
      endHour: 18,
      priority: 0,
      effect: createSetActorPresenceControlEffect({
        target: actorTarget,
        active: true
      })
    });
    scheduler.routines["routine-break"] = createProjectScheduleRoutine({
      id: "routine-break",
      title: "Lunch Break",
      target: actorTarget,
      startHour: 12,
      endHour: 13.5,
      priority: 5,
      effect: createSetActorPresenceControlEffect({
        target: actorTarget,
        active: false
      })
    });

    const resolvedSchedule = resolveRuntimeProjectScheduleState({
      scheduler,
      actorIds: ["actor-market-vendor"],
      dayNumber: 1,
      timeOfDayHours: 12.25
    });
    const resolvedControl = applyRuntimeProjectScheduleToControlState(
      createEmptyRuntimeResolvedControlState(),
      resolvedSchedule
    );

    expect(resolvedSchedule.actors[0]).toEqual(
      expect.objectContaining({
        actorId: "actor-market-vendor",
        active: false,
        activeRoutineId: "routine-break",
        activeRoutineTitle: "Lunch Break"
      })
    );
    expect(resolvedControl.discrete).toEqual([
      expect.objectContaining({
        type: "actorPresence",
        target: {
          kind: "actor",
          actorId: "actor-market-vendor"
        },
        value: false,
        source: {
          kind: "scheduler",
          scheduleId: "routine-break"
        }
      })
    ]);
  });
});
