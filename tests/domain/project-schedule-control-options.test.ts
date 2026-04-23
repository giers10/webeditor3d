import { describe, expect, it } from "vitest";

import {
  createActivateCameraRigOverrideControlEffect,
  createActorControlTargetRef,
  createCameraRigControlTargetRef,
  createClearCameraRigOverrideControlEffect,
  createFollowActorPathControlEffect,
  createPlayActorAnimationControlEffect
} from "../../src/controls/control-surface";
import {
  createProjectScheduleEffectFromOption,
  getProjectScheduleEffectOptionId,
  listProjectInteractionControlEffectOptions,
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

  const cameraRigTargetOption: ProjectScheduleTargetOption = {
    key: "entity:cameraRig:entity-camera-rig-main",
    target: createCameraRigControlTargetRef("entity-camera-rig-main"),
    label: "Overlook Camera",
    subtitle: "Scene",
    groupLabel: "Camera Rigs",
    defaults: {}
  };

  it("lists actor animation and path as normal effect options", () => {
    expect(listProjectScheduleEffectOptions(actorTargetOption)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "actor.playAnimation" }),
        expect.objectContaining({ id: "actor.followPath" })
      ])
    );
  });

  it("lists camera override options for camera rig targets", () => {
    expect(listProjectScheduleEffectOptions(cameraRigTargetOption)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "camera.activate" }),
        expect.objectContaining({ id: "camera.clear" })
      ])
    );
  });

  it("filters out scheduler-only actor control effects for interaction authoring", () => {
    expect(listProjectInteractionControlEffectOptions(actorTargetOption)).toEqual(
      []
    );
    expect(
      listProjectInteractionControlEffectOptions(cameraRigTargetOption)
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "camera.activate" }),
        expect.objectContaining({ id: "camera.clear" })
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
      loop: true,
      smoothPath: false
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
        loop: true,
        smoothPath: false
      })
    );
  });

  it("roundtrips camera override effects through option ids", () => {
    const activateEffect = createActivateCameraRigOverrideControlEffect({
      target: createCameraRigControlTargetRef("entity-camera-rig-main")
    });
    const clearEffect = createClearCameraRigOverrideControlEffect({
      target: createCameraRigControlTargetRef("entity-camera-rig-main")
    });

    expect(getProjectScheduleEffectOptionId(activateEffect)).toBe(
      "camera.activate"
    );
    expect(getProjectScheduleEffectOptionId(clearEffect)).toBe("camera.clear");

    expect(
      createProjectScheduleEffectFromOption({
        targetOption: cameraRigTargetOption,
        effectOptionId: "camera.activate"
      })
    ).toEqual(activateEffect);
    expect(
      createProjectScheduleEffectFromOption({
        targetOption: cameraRigTargetOption,
        effectOptionId: "camera.clear"
      })
    ).toEqual(clearEffect);
  });
});
