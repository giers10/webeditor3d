import { describe, expect, it } from "vitest";

import {
  createActorControlTargetRef,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect
} from "../../src/controls/control-surface";
import {
  createProjectScheduleEffectFromOption,
  getProjectScheduleEffectOptionId,
  listProjectScheduleEffectOptions,
  type ProjectScheduleTargetOption
} from "../../src/scheduler/project-schedule-control-options";

describe("project schedule control options", () => {
  const actorTargetOption: ProjectScheduleTargetOption = {
    key: "actor:guard",
    target: createActorControlTargetRef("guard"),
    label: "Guard",
    subtitle: "NPC",
    groupLabel: "Actors",
    defaults: {
      actorAnimationClipNames: ["Idle", "Walk"],
      actorAnimationLoop: true,
      actorPathOptions: [
        { pathId: "path-a", label: "Patrol A", loop: false },
        { pathId: "path-b", label: "Patrol B", loop: true }
      ],
      actorPathSpeed: 1.25
    }
  };

  it("lists actor animation and path as normal effect options", () => {
    expect(listProjectScheduleEffectOptions(actorTargetOption)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "actor.present" }),
        expect.objectContaining({ id: "actor.hidden" }),
        expect.objectContaining({ id: "actor.playAnimation" }),
        expect.objectContaining({ id: "actor.followPath" })
      ])
    );
  });

  it("roundtrips actor animation and follow-path through option ids", () => {
    const animationEffect = createPlayActorAnimationControlEffect({
      target: createActorControlTargetRef("guard"),
      clipName: "Walk",
      loop: false
    });
    const pathEffect = createFollowActorPathControlEffect({
      target: createActorControlTargetRef("guard"),
      pathId: "path-b",
      speed: 1.75,
      loop: true
    });

    expect(getProjectScheduleEffectOptionId(animationEffect)).toBe(
      "actor.playAnimation"
    );
    expect(getProjectScheduleEffectOptionId(pathEffect)).toBe("actor.followPath");

    expect(
      createProjectScheduleEffectFromOption({
        targetOption: actorTargetOption,
        effectOptionId: "actor.playAnimation",
        previousEffect: animationEffect
      })
    ).toEqual(
      expect.objectContaining({
        type: "playActorAnimation",
        clipName: "Walk",
        loop: false
      })
    );

    expect(
      createProjectScheduleEffectFromOption({
        targetOption: actorTargetOption,
        effectOptionId: "actor.followPath",
        previousEffect: pathEffect
      })
    ).toEqual(
      expect.objectContaining({
        type: "followActorPath",
        pathId: "path-b",
        speed: 1.75,
        loop: true
      })
    );
  });
});
