import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createDeletePathCommand } from "../../src/commands/delete-path-command";
import { createDeleteSplineCorridorJunctionCommand } from "../../src/commands/delete-spline-corridor-junction-command";
import { createUpsertPathCommand } from "../../src/commands/upsert-path-command";
import { createUpsertSplineCorridorJunctionCommand } from "../../src/commands/upsert-spline-corridor-junction-command";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";

describe("spline corridor junction commands", () => {
  it("creates, updates, deletes, undoes, and redoes junctions", () => {
    const store = createEditorStore({
      initialDocument: createEmptySceneDocument()
    });
    const pathA = createScenePath({ id: "path-junction-command-a" });
    const pathB = createScenePath({ id: "path-junction-command-b" });
    const junction = createSplineCorridorJunction({
      id: "junction-command",
      center: { x: 1, y: 0, z: 2 },
      radius: 2,
      connections: [
        { pathId: pathA.id, progress: 0.5, clipDistance: 2 },
        { pathId: pathB.id, progress: 0.25, clipDistance: 2 }
      ]
    });

    store.executeCommand(createUpsertPathCommand({ path: pathA }));
    store.executeCommand(createUpsertPathCommand({ path: pathB }));
    store.executeCommand(
      createUpsertSplineCorridorJunctionCommand({ junction })
    );

    expect(
      store.getState().document.splineCorridorJunctions[junction.id]
    ).toEqual(junction);

    store.executeCommand(
      createUpsertSplineCorridorJunctionCommand({
        junction: createSplineCorridorJunction({
          ...junction,
          radius: 3
        })
      })
    );

    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.radius
    ).toBe(3);

    store.executeCommand(createDeleteSplineCorridorJunctionCommand(junction.id));
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]
    ).toBeUndefined();

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.radius
    ).toBe(3);

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.radius
    ).toBe(2);

    expect(store.redo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.radius
    ).toBe(3);
  });

  it("removes invalid junction connections when deleting paths and restores them on undo", () => {
    const pathA = createScenePath({ id: "path-junction-delete-a" });
    const pathB = createScenePath({ id: "path-junction-delete-b" });
    const pathC = createScenePath({ id: "path-junction-delete-c" });
    const junction = createSplineCorridorJunction({
      id: "junction-delete",
      center: { x: 0, y: 0, z: 0 },
      connections: [
        { pathId: pathA.id, progress: 0, clipDistance: 1.5 },
        { pathId: pathB.id, progress: 0.5, clipDistance: 1.5 },
        { pathId: pathC.id, progress: 1, clipDistance: 1.5 }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument(),
        paths: {
          [pathA.id]: pathA,
          [pathB.id]: pathB,
          [pathC.id]: pathC
        },
        splineCorridorJunctions: {
          [junction.id]: junction
        }
      }
    });

    store.executeCommand(createDeletePathCommand(pathA.id));

    expect(
      store
        .getState()
        .document.splineCorridorJunctions[junction.id]?.connections.map(
          (connection) => connection.pathId
        )
    ).toEqual([pathB.id, pathC.id]);

    store.executeCommand(createDeletePathCommand(pathB.id));
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]
    ).toBeUndefined();

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]
        ?.connections
    ).toHaveLength(2);

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]
        ?.connections
    ).toHaveLength(3);
  });
});

