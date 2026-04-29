import { describe, expect, it } from "vitest";

import { createPlayerStartInputBindings } from "../../src/entities/entity-instances";
import {
  resolvePlayerStartClearTargetInput,
  resolvePlayerStartClimbInput,
  resolvePlayerStartInteractInput,
  resolvePlayerStartPauseInput
} from "../../src/runtime-three/player-input-bindings";

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

describe("player-input-bindings interact input", () => {
  it("resolves authored keyboard interact bindings", () => {
    const bindings = createPlayerStartInputBindings({
      keyboard: {
        interact: "KeyE"
      }
    });

    expect(
      resolvePlayerStartInteractInput(new Set(["MouseLeft"]), bindings, [])
    ).toBe(0);
    expect(
      resolvePlayerStartInteractInput(new Set(["KeyE"]), bindings, [])
    ).toBe(1);
  });

  it("resolves the authored gamepad interact binding from the standard west button", () => {
    const bindings = createPlayerStartInputBindings({
      gamepad: {
        interact: "buttonWest"
      }
    });

    expect(
      resolvePlayerStartInteractInput(new Set<string>(), bindings, [
        createMockGamepad([2])
      ])
    ).toBe(1);
  });
});

describe("player-input-bindings clear-target input", () => {
  it("resolves authored keyboard clear-target bindings", () => {
    const bindings = createPlayerStartInputBindings({
      keyboard: {
        clearTarget: "KeyQ"
      }
    });

    expect(
      resolvePlayerStartClearTargetInput(new Set(["Escape"]), bindings, [])
    ).toBe(0);
    expect(
      resolvePlayerStartClearTargetInput(new Set(["KeyQ"]), bindings, [])
    ).toBe(1);
  });

  it("resolves the authored gamepad clear-target binding from the standard north button", () => {
    const bindings = createPlayerStartInputBindings({
      gamepad: {
        clearTarget: "buttonNorth"
      }
    });

    expect(
      resolvePlayerStartClearTargetInput(new Set<string>(), bindings, [
        createMockGamepad([3])
      ])
    ).toBe(1);
  });
});

describe("player-input-bindings climb input", () => {
  it("resolves authored keyboard climb bindings", () => {
    const bindings = createPlayerStartInputBindings({
      keyboard: {
        climb: "KeyR"
      }
    });

    expect(resolvePlayerStartClimbInput(new Set(["KeyE"]), bindings, [])).toBe(
      0
    );
    expect(resolvePlayerStartClimbInput(new Set(["KeyR"]), bindings, [])).toBe(
      1
    );
  });

  it("resolves the default gamepad climb binding from the standard right shoulder button", () => {
    const bindings = createPlayerStartInputBindings();

    expect(
      resolvePlayerStartClimbInput(new Set<string>(), bindings, [
        createMockGamepad([5])
      ])
    ).toBe(1);
  });
});
