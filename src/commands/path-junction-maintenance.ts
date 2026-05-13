import { cloneScenePath, type ScenePath } from "../document/paths";
import type { SceneDocument } from "../document/scene-document";
import {
  cloneSplineCorridorJunction,
  type SplineCorridorJunctionRegistry
} from "../document/spline-corridor-junctions";
import { reattachSplineCorridorJunctionsToPaths } from "../spline-corridor/spline-corridor-junctions";

export function cloneSplineCorridorJunctionRegistry(
  junctions: SplineCorridorJunctionRegistry
): SplineCorridorJunctionRegistry {
  return Object.fromEntries(
    Object.entries(junctions).map(([junctionId, junction]) => [
      junctionId,
      cloneSplineCorridorJunction(junction)
    ])
  );
}

export function setScenePathAndReattachJunctions(
  document: SceneDocument,
  path: ScenePath
): SceneDocument {
  const nextPath = cloneScenePath(path);
  const nextPaths = {
    ...document.paths,
    [nextPath.id]: nextPath
  };

  return {
    ...document,
    paths: nextPaths,
    splineCorridorJunctions: reattachSplineCorridorJunctionsToPaths({
      paths: Object.values(nextPaths),
      junctions: document.splineCorridorJunctions,
      changedPathIds: [nextPath.id],
      terrains: Object.values(document.terrains)
    })
  };
}
