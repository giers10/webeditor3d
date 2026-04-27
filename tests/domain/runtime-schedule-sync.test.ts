import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createLightControlTargetRef,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect,
  createSetActorPresenceControlEffect,
  createSetLightIntensityControlEffect
} from "../../src/controls/control-surface";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createNpcEntity,
  createPointLightEntity
} from "../../src/entities/entity-instances";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { createProjectSequence } from "../../src/sequencer/project-sequences";
import {
  applyRuntimeProjectScheduleToControlState,
  resolveRuntimeProjectScheduleState
} from "../../src/runtime-three/runtime-project-scheduler";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import {
  commitRuntimeScheduleSyncResult,
  createRuntimeScheduleSyncContext,
  syncRuntimeSceneScheduleToClock
} from "../../src/runtime-three/runtime-schedule-sync";

describe("runtime schedule sync", () => {
  it("matches direct scheduler resolution while applying actor path and animation state", () => {
    const actorTarget = createActorControlTargetRef("actor-patroller");
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: actorTarget.actorId,
      yawDegrees: 15
    });
    const path = createScenePath({
      id: "path-patrol",
      points: [
        {
          id: "path-point-start",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-end",
          position: {
            x: 8,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.paths[path.id] = path;
    document.scheduler.routines["routine-patrol"] =
      createProjectScheduleRoutine({
        id: "routine-patrol",
        title: "Patrolling",
        target: actorTarget,
        startHour: 9,
        endHour: 13,
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
            pathId: path.id,
            speed: 2,
            loop: false,
            progressMode: "deriveFromTime"
          })
        ]
      });
    const runtimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: {
        timeOfDayHours: 6,
        dayCount: 0,
        dayLengthMinutes: 24
      }
    });
    const context = createRuntimeScheduleSyncContext(runtimeScene);
    const clock = {
      timeOfDayHours: 11,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    const directResolvedScheduler = resolveRuntimeProjectScheduleState({
      scheduler: runtimeScene.scheduler.document,
      sequences: runtimeScene.sequences,
      actorIds: runtimeScene.npcDefinitions.map(
        (definition) => definition.actorId
      ),
      dayNumber: clock.dayCount + 1,
      timeOfDayHours: clock.timeOfDayHours,
      pathsById: context.pathsById
    });
    const directResolvedControl = applyRuntimeProjectScheduleToControlState(
      runtimeScene.control.resolved,
      directResolvedScheduler,
      runtimeScene.control.baselineResolved
    );

    const result = syncRuntimeSceneScheduleToClock({
      runtimeScene,
      clock,
      context
    });
    commitRuntimeScheduleSyncResult(runtimeScene, result);

    expect(result.resolvedScheduler).toEqual(directResolvedScheduler);
    expect(result.resolvedControl).toEqual(directResolvedControl);
    expect(result.npcChanges).toHaveLength(1);
    expect(result.npcEntityCollectionChanged).toBe(true);
    expect(runtimeScene.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: "Patrolling",
        animationClipName: "Walk",
        yawDegrees: 90,
        position: {
          x: 4,
          y: 0,
          z: 0
        },
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 0.5
        })
      })
    );
    expect(runtimeScene.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: "Patrolling",
        animationClipName: "Walk",
        position: {
          x: 4,
          y: 0,
          z: 0
        }
      })
    ]);
  });

  it("reuses scene-stable scheduler inputs and leaves NPC collections untouched when output is unchanged", () => {
    const npc = createNpcEntity({
      id: "entity-npc-stable",
      actorId: "actor-stable"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const context = createRuntimeScheduleSyncContext(runtimeScene);
    const clock = {
      timeOfDayHours: 6,
      dayCount: 0,
      dayLengthMinutes: 24
    };

    const firstResult = syncRuntimeSceneScheduleToClock({
      runtimeScene,
      clock,
      context
    });
    const npcEntities = runtimeScene.entities.npcs;
    const colliders = runtimeScene.colliders;
    const pathsById = context.pathsById;
    const actorStatesByActorId = context.actorStatesByActorId;
    const actorIds = context.actorIds;
    const secondResult = syncRuntimeSceneScheduleToClock({
      runtimeScene,
      clock,
      context
    });

    expect(firstResult.npcChanges).toHaveLength(0);
    expect(secondResult.npcChanges).toHaveLength(0);
    expect(context.pathsById).toBe(pathsById);
    expect(context.actorIds).toBe(actorIds);
    expect(context.actorStatesByActorId).toBe(actorStatesByActorId);
    expect(runtimeScene.entities.npcs).toBe(npcEntities);
    expect(runtimeScene.colliders).toBe(colliders);
  });

  it("resolves scheduled controls and impulse routines through the shared helper", () => {
    const pointLight = createPointLightEntity({
      id: "entity-point-light-night-lamp",
      intensity: 1.25
    });
    const document = createEmptySceneDocument();
    document.entities[pointLight.id] = pointLight;
    document.sequences.sequences["sequence-transition"] = createProjectSequence({
      id: "sequence-transition",
      title: "Transition",
      effects: [
        {
          stepClass: "impulse",
          type: "startSceneTransition",
          targetSceneId: "scene-house",
          targetEntryEntityId: "entry-house"
        }
      ]
    });
    document.scheduler.routines["routine-night-lamp"] =
      createProjectScheduleRoutine({
        id: "routine-night-lamp",
        title: "Night Lamp",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 20,
        endHour: 4,
        effect: createSetLightIntensityControlEffect({
          target: createLightControlTargetRef("pointLight", pointLight.id),
          intensity: 3.5
        })
      });
    document.scheduler.routines["routine-transition"] =
      createProjectScheduleRoutine({
        id: "routine-transition",
        title: "Transition Window",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 20,
        endHour: 22,
        sequenceId: "sequence-transition",
        effects: []
      });
    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const context = createRuntimeScheduleSyncContext(runtimeScene);
    const clock = {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    const directResolvedScheduler = resolveRuntimeProjectScheduleState({
      scheduler: runtimeScene.scheduler.document,
      sequences: runtimeScene.sequences,
      actorIds: context.actorIds,
      dayNumber: clock.dayCount + 1,
      timeOfDayHours: clock.timeOfDayHours,
      pathsById: context.pathsById
    });
    const directResolvedControl = applyRuntimeProjectScheduleToControlState(
      runtimeScene.control.resolved,
      directResolvedScheduler,
      runtimeScene.control.baselineResolved
    );

    const result = syncRuntimeSceneScheduleToClock({
      runtimeScene,
      clock,
      context
    });

    expect(result.resolvedScheduler).toEqual(directResolvedScheduler);
    expect(result.resolvedControl).toEqual(directResolvedControl);
    expect(result.resolvedScheduler.impulses).toEqual([
      expect.objectContaining({
        routineId: "routine-transition",
        effects: [
          expect.objectContaining({
            type: "startSceneTransition",
            targetSceneId: "scene-house",
            targetEntryEntityId: "entry-house"
          })
        ]
      })
    ]);
    expect(result.nextActiveImpulseRoutineIds).toEqual(
      new Set(["routine-transition"])
    );
    expect(result.resolvedControl.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "scheduler",
            scheduleId: "routine-night-lamp"
          }
        })
      ])
    );
  });
});
