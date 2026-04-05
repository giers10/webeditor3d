import { describe, expect, it } from "vitest";
import { createEditorStore } from "../../src/app/editor-store";
import { createSetPlayerStartCommand } from "../../src/commands/set-player-start-command";
describe("player start command", () => {
    it("restores the previous tool mode across undo and redo when placing PlayerStart", () => {
        const store = createEditorStore();
        store.setToolMode("create");
        store.executeCommand(createSetPlayerStartCommand({
            position: {
                x: 2,
                y: 0,
                z: -2
            },
            yawDegrees: 90
        }));
        const placedPlayerStart = Object.values(store.getState().document.entities)[0];
        expect(placedPlayerStart).toBeDefined();
        expect(store.getState().toolMode).toBe("select");
        expect(store.undo()).toBe(true);
        expect(store.getState().toolMode).toBe("create");
        expect(store.getState().document.entities).toEqual({});
        expect(store.redo()).toBe(true);
        expect(store.getState().toolMode).toBe("select");
        expect(store.getState().document.entities[placedPlayerStart.id]).toEqual(placedPlayerStart);
    });
    it("restores the previous tool mode across undo and redo when moving PlayerStart", () => {
        const store = createEditorStore();
        store.executeCommand(createSetPlayerStartCommand({
            position: {
                x: 0,
                y: 0,
                z: 0
            },
            yawDegrees: 0
        }));
        const existingPlayerStart = Object.values(store.getState().document.entities)[0];
        store.setToolMode("create");
        store.executeCommand(createSetPlayerStartCommand({
            entityId: existingPlayerStart.id,
            position: {
                x: 4,
                y: 0,
                z: 1
            },
            yawDegrees: 180
        }));
        expect(store.getState().toolMode).toBe("select");
        expect(store.getState().document.entities[existingPlayerStart.id]).toMatchObject({
            position: {
                x: 4,
                y: 0,
                z: 1
            },
            yawDegrees: 180
        });
        expect(store.undo()).toBe(true);
        expect(store.getState().toolMode).toBe("create");
        expect(store.getState().document.entities[existingPlayerStart.id]).toEqual(existingPlayerStart);
        expect(store.redo()).toBe(true);
        expect(store.getState().toolMode).toBe("select");
        expect(store.getState().document.entities[existingPlayerStart.id]).toMatchObject({
            position: {
                x: 4,
                y: 0,
                z: 1
            },
            yawDegrees: 180
        });
    });
});
