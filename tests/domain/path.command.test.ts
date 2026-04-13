import { describe, expect, it } from "vitest";

import { createEditorStore } from "../../src/app/editor-store";
import { createDeletePathCommand } from "../../src/commands/delete-path-command";
import { createSetPathNameCommand } from "../../src/commands/set-path-name-command";
import { createUpsertPathCommand } from "../../src/commands/upsert-path-command";
import { createScenePath } from "../../src/document/paths";
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
});
