import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { describe, it } from "vitest";

import {
  formatSceneDiagnostic,
  validateProjectDocument,
  validateProjectSchedulingResources,
  validateSceneDocument,
  validateSceneDocumentLocalBuildContent
} from "../src/document/scene-document-validation";
import { createSceneDocumentFromProject } from "../src/document/scene-document";
import { parseProjectDocumentJson } from "../src/serialization/scene-document-json";

describe("diagnose project 5", () => {
  it("prints validation diagnostics", () => {
    const entries = unzipSync(
      readFileSync("/Users/giers/webeditor3d/untitled-project-5.we3d")
    );
    const sceneJson = entries["scene.json"];

    if (sceneJson === undefined) {
      throw new Error("Missing scene.json");
    }

    const project = parseProjectDocumentJson(strFromU8(sceneJson));
    const activeScene = createSceneDocumentFromProject(
      project,
      project.activeSceneId
    );
    const projectValidation = validateProjectDocument(project, {
      terrainSampleValues: "skip"
    });
    const schedulingValidation = validateProjectSchedulingResources(project);
    const activeSceneFullValidation = validateSceneDocument(activeScene, {
      terrainSampleValues: "skip"
    });
    const activeSceneLocalValidation = validateSceneDocumentLocalBuildContent(
      activeScene,
      {
        terrainSampleValues: "skip"
      }
    );

    const summarize = (
      name: string,
      diagnostics: Array<{ message: string; path?: string }>
    ) => {
      console.log(`\n${name}: ${diagnostics.length}`);
      for (const diagnostic of diagnostics) {
        console.log(formatSceneDiagnostic(diagnostic as never));
      }
    };

    console.log(
      JSON.stringify(
        {
          projectName: project.name,
          activeSceneId: project.activeSceneId,
          activeSceneName: project.scenes[project.activeSceneId]?.name,
          sceneCount: Object.keys(project.scenes).length,
          sequenceIds: Object.keys(project.sequences.sequences),
          schedulerRoutineIds: Object.keys(project.scheduler.routines)
        },
        null,
        2
      )
    );
    summarize("project errors", projectValidation.errors);
    summarize("scheduling errors", schedulingValidation.errors);
    summarize("active scene full errors", activeSceneFullValidation.errors);
    summarize("active scene local build errors", activeSceneLocalValidation.errors);
  });
});
