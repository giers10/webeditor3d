import { describe, expect, it } from "vitest";

import { createAddPathPointCommand } from "../../src/commands/add-path-point-command";
import { createEditorStore } from "../../src/app/editor-store";
import { createDeletePathCommand } from "../../src/commands/delete-path-command";
import { createDeletePathPointCommand } from "../../src/commands/delete-path-point-command";
import { createSetPathNameCommand } from "../../src/commands/set-path-name-command";
import { createUpsertPathCommand } from "../../src/commands/upsert-path-command";
import { createScenePath, createScenePathPoint } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";

describe("path commands", () => {
  it("creates, renames, and deletes authored paths through undo and redo", () => {
    const store = createEditorStore({
      initialDocument: createEmptySceneDocument({
        name: "Path Command Scene"
      })
    });
    const path = createScenePath({
      id: "path-patrol",
      points: [
        {
          id: "path-point-a",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });

    store.executeCommand(
      createUpsertPathCommand({
        path,
        label: "Create patrol path"
      })
    );

    expect(store.getState().document.paths[path.id]).toEqual(path);
    expect(store.getState().selection).toEqual({
      kind: "paths",
      ids: [path.id]
    });

    store.executeCommand(
      createSetPathNameCommand({
        pathId: path.id,
        name: "Patrol Route"
      })
    );

    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    store.executeCommand(createDeletePathCommand(path.id));

    expect(store.getState().document.paths[path.id]).toBeUndefined();
    expect(store.getState().selection).toEqual({
      kind: "none"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBeUndefined();

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toBeUndefined();

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toEqual(path);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toBeUndefined();
  });

  it("adds and deletes path points with undo and redo while keeping point selection coherent", () => {
    const path = createScenePath({
      id: "path-point-ops",
      points: [
        {
          id: "path-point-start",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-end",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const nextPoint = createScenePathPoint({
      id: "path-point-new",
      position: {
        x: 3,
        y: 0,
        z: 0
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Point Command Scene"
        }),
        paths: {
          [path.id]: path
        }
      }
    });

    store.setSelection({
      kind: "paths",
      ids: [path.id]
    });

    store.executeCommand(
      createAddPathPointCommand({
        pathId: path.id,
        point: nextPoint
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    store.executeCommand(
      createDeletePathPointCommand({
        pathId: path.id,
        pointId: nextPoint.id
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
    expect(store.getState().selection).toEqual({
      kind: "paths",
      ids: [path.id]
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
  });
});
