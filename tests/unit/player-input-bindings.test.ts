import { describe, expect, it } from "vitest";

import { createPlayerStartInputBindings } from "../../src/entities/entity-instances";
import { resolvePlayerStartPauseInput } from "../../src/runtime-three/player-input-bindings";

function createMockGamepad(pressedButtons: number[] = []): Gamepad {
  return {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressedButtons.includes(index),
      touched: false,
      value: pressedButtons.includes(index) ? 1 : 0
    })),
    id: "mock-standard-gamepad",
    index: 0,
    mapping: "standard",
    timestamp: 0,
    vibrationActuator: null,
    hapticActuators: []
  } as unknown as Gamepad;
}

describe("player-input-bindings pause input", () => {
  it("resolves authored keyboard pause bindings", () => {
    const bindings = createPlayerStartInputBindings({
      keyboard: {
        pauseTime: "KeyO"
      }
    });

    expect(resolvePlayerStartPauseInput(new Set(["KeyP"]), bindings, [])).toBe(
      0
    );
    expect(resolvePlayerStartPauseInput(new Set(["KeyO"]), bindings, [])).toBe(
      1
    );
  });

  it("resolves the authored gamepad pause binding from the standard menu button", () => {
    const bindings = createPlayerStartInputBindings({
      gamepad: {
        pauseTime: "buttonMenu"
      }
    });

    expect(
      resolvePlayerStartPauseInput(new Set<string>(), bindings, [
        createMockGamepad([9])
      ])
    ).toBe(1);
  });
});
