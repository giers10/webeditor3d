import { describe, expect, it } from "vitest";

import {
  applyControlEffectToResolvedState,
  createActorControlTargetRef,
  createDefaultResolvedControlSource,
  createEmptyRuntimeResolvedControlState,
  createLightControlTargetRef,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect,
  createSetActorPresenceControlEffect
} from "../../src/controls/control-surface";
import { createSetLightIntensityControlEffect } from "../../src/controls/control-surface";
import {
  createEmptyProjectScheduler,
  createProjectScheduleRoutine,
  createProjectScheduleSelectedDaysSelection
} from "../../src/scheduler/project-scheduler";
import {
  createEmptyProjectSequenceLibrary,
  createProjectSequence
} from "../../src/sequencer/project-sequences";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "../../src/runtime-three/runtime-project-scheduler";

describe("runtime project scheduler", () => {
  it("resolves cross-midnight actor routines and keeps unscheduled actors implicitly active", () => {
    const actorTarget = createActorControlTargetRef("actor-night-watch");
    const scheduler = createEmptyProjectScheduler();
    const sequences = createEmptyProjectSequenceLibrary();
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
        sequences,
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
        sequences,
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
        sequences,
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
    const sequences = createEmptyProjectSequenceLibrary();
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
      sequences,
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

  it("resolves actor held steps from referenced project sequences", () => {
    const actorTarget = createActorControlTargetRef("actor-sequenced-vendor");
    const scheduler = createEmptyProjectScheduler();
    const sequences = createEmptyProjectSequenceLibrary();
    sequences.sequences["sequence-vendor-open"] = createProjectSequence({
      id: "sequence-vendor-open",
      title: "Vendor Open Sequence",
      steps: [
        {
          stepClass: "held",
          type: "controlEffect",
          effect: createSetActorPresenceControlEffect({
            target: actorTarget,
            active: true
          })
        },
        {
          stepClass: "held",
          type: "controlEffect",
          effect: createPlayActorAnimationControlEffect({
            target: actorTarget,
            clipName: "Wave",
            loop: true
          })
        }
      ]
    });
    scheduler.routines["routine-vendor-open"] = createProjectScheduleRoutine({
      id: "routine-vendor-open",
      title: "Vendor Open",
      target: actorTarget,
      startHour: 8,
      endHour: 16,
      sequenceId: "sequence-vendor-open",
      effect: createSetActorPresenceControlEffect({
        target: actorTarget,
        active: false
      })
    });

    const resolved = resolveRuntimeProjectScheduleState({
      scheduler,
      sequences,
      actorIds: ["actor-sequenced-vendor"],
      dayNumber: 1,
      timeOfDayHours: 10
    });

    expect(resolved.actors[0]).toEqual(
      expect.objectContaining({
        actorId: "actor-sequenced-vendor",
        active: true,
        activeRoutineId: "routine-vendor-open",
        activeRoutineTitle: "Vendor Open",
        animationEffect: expect.objectContaining({
          type: "playActorAnimation",
          clipName: "Wave",
          loop: true
        })
      })
    );
  });

  it("applies non-actor scheduler effects over baseline control state and restores defaults when inactive", () => {
    const lightTarget = createLightControlTargetRef(
      "pointLight",
      "entity-point-light-main"
    );
    const scheduler = createEmptyProjectScheduler();
    const sequences = createEmptyProjectSequenceLibrary();
    scheduler.routines["routine-night-light"] = createProjectScheduleRoutine({
      id: "routine-night-light",
      title: "Night Light",
      target: lightTarget,
      startHour: 18,
      endHour: 6,
      effect: createSetLightIntensityControlEffect({
        target: lightTarget,
        intensity: 3.5
      })
    });

    const baselineResolved = applyControlEffectToResolvedState(
      createEmptyRuntimeResolvedControlState(),
      createSetLightIntensityControlEffect({
        target: lightTarget,
        intensity: 1.25
      }),
      createDefaultResolvedControlSource()
    );
    const activeSchedule = resolveRuntimeProjectScheduleState({
      scheduler,
      sequences,
      actorIds: [],
      dayNumber: 1,
      timeOfDayHours: 21
    });
    const activeResolved = applyRuntimeProjectScheduleToControlState(
      baselineResolved,
      activeSchedule,
      baselineResolved
    );
    const inactiveSchedule = resolveRuntimeProjectScheduleState({
      scheduler,
      sequences,
      actorIds: [],
      dayNumber: 2,
      timeOfDayHours: 9
    });
    const inactiveResolved = applyRuntimeProjectScheduleToControlState(
      activeResolved,
      inactiveSchedule,
      baselineResolved
    );

    expect(activeSchedule.controls).toEqual([
      expect.objectContaining({
        routineId: "routine-night-light",
        title: "Night Light",
        resolutionKey: "channel:light.intensity:entity:pointLight:entity-point-light-main"
      })
    ]);
    expect(activeResolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "scheduler",
            scheduleId: "routine-night-light"
          }
        })
      ])
    );
    expect(inactiveResolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 1.25,
          source: {
            kind: "default"
          }
        })
      ])
    );
  });

  it("resolves actor animation and deterministic follow-path state from the active routine window", () => {
    const actorTarget = createActorControlTargetRef("actor-patrol");
    const scheduler = createEmptyProjectScheduler();
    const sequences = createEmptyProjectSequenceLibrary();
    scheduler.routines["routine-patrol"] = createProjectScheduleRoutine({
      id: "routine-patrol",
      title: "Patrolling",
      target: actorTarget,
      startHour: 22,
      endHour: 2,
      effects: [
        createSetActorPresenceControlEffect({
          target: actorTarget,
          active: true
        }),
        createPlayActorAnimationControlEffect({
          target: actorTarget,
          clipName: "Walk",
          loop: true
        }),
        createFollowActorPathControlEffect({
          target: actorTarget,
          pathId: "path-patrol",
          speed: 2,
          loop: false,
          progressMode: "deriveFromTime"
        })
      ]
    });

    const resolved = resolveRuntimeProjectScheduleState({
      scheduler,
      sequences,
      actorIds: ["actor-patrol"],
      dayNumber: 2,
      timeOfDayHours: 1,
      pathsById: new Map([
        [
          "path-patrol",
          {
            id: "path-patrol",
            loop: false,
            points: [
              {
                position: { x: 0, y: 0, z: 0 }
              },
              {
                position: { x: 8, y: 0, z: 0 }
              }
            ],
            segments: [
              {
                start: { x: 0, y: 0, z: 0 },
                end: { x: 8, y: 0, z: 0 },
                length: 8,
                distanceStart: 0,
                distanceEnd: 8,
                tangent: { x: 1, y: 0, z: 0 }
              }
            ],
            totalLength: 8
          }
        ]
      ])
    });
    const actorState = resolved.actors[0];
    const resolvedControl = applyRuntimeProjectScheduleToControlState(
      createEmptyRuntimeResolvedControlState(),
      resolved
    );

    expect(actorState).toEqual(
      expect.objectContaining({
        actorId: "actor-patrol",
        active: true,
        activeRoutineId: "routine-patrol",
        activeRoutineTitle: "Patrolling",
        animationEffect: expect.objectContaining({
          type: "playActorAnimation",
          clipName: "Walk"
        }),
        pathEffect: expect.objectContaining({
          type: "followActorPath",
          pathId: "path-patrol",
          speed: 2
        }),
        resolvedPath: expect.objectContaining({
          progress: 0.75,
          elapsedHours: 3,
          position: {
            x: 6,
            y: 0,
            z: 0
          },
          yawDegrees: 90
        })
      })
    );
    expect(resolvedControl.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "actorPresence",
          value: true,
          source: {
            kind: "scheduler",
            scheduleId: "routine-patrol"
          }
        }),
        expect.objectContaining({
          type: "actorAnimationPlayback",
          clipName: "Walk",
          source: {
            kind: "scheduler",
            scheduleId: "routine-patrol"
          }
        }),
        expect.objectContaining({
          type: "actorPathAssignment",
          pathId: "path-patrol",
          speed: 2,
          source: {
            kind: "scheduler",
            scheduleId: "routine-patrol"
          }
        })
      ])
    );
  });
});
