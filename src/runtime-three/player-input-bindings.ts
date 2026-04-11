import type {
  PlayerStartGamepadActionBinding,
  PlayerStartGamepadCameraLookBinding,
  PlayerStartGamepadBinding,
  PlayerStartInputBindings
} from "../entities/entity-instances";

const GAMEPAD_AXIS_DEADZONE = 0.18;

export interface PlayerStartMovementActionState {
  moveForward: number;
  moveBackward: number;
  moveLeft: number;
  moveRight: number;
}

export interface PlayerStartActionInputState
  extends PlayerStartMovementActionState {
  jump: number;
  sprint: number;
  crouch: number;
}

export interface PlayerStartLookInputState {
  horizontal: number;
  vertical: number;
}

function clampUnitInterval(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function readGamepadButtonStrength(button: GamepadButton | undefined): number {
  if (button === undefined) {
    return 0;
  }

  return clampUnitInterval(button.pressed ? Math.max(button.value, 1) : button.value);
}

function readCenteredAxisValue(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  const magnitude = Math.abs(value);

  if (magnitude <= GAMEPAD_AXIS_DEADZONE) {
    return 0;
  }

  const normalizedMagnitude = clampUnitInterval(
    (magnitude - GAMEPAD_AXIS_DEADZONE) / (1 - GAMEPAD_AXIS_DEADZONE)
  );

  return Math.sign(value) * normalizedMagnitude;
}

function readPositiveAxisStrength(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value <= GAMEPAD_AXIS_DEADZONE) {
    return 0;
  }

  return clampUnitInterval(
    (value - GAMEPAD_AXIS_DEADZONE) / (1 - GAMEPAD_AXIS_DEADZONE)
  );
}

function readNegativeAxisStrength(value: number | undefined): number {
  return readPositiveAxisStrength(
    value === undefined || !Number.isFinite(value) ? value : -value
  );
}

function readSingleGamepadBinding(
  gamepad: Gamepad,
  binding: PlayerStartGamepadBinding
): number {
  switch (binding) {
    case "leftStickUp":
      return readNegativeAxisStrength(gamepad.axes[1]);
    case "leftStickDown":
      return readPositiveAxisStrength(gamepad.axes[1]);
    case "leftStickLeft":
      return readNegativeAxisStrength(gamepad.axes[0]);
    case "leftStickRight":
      return readPositiveAxisStrength(gamepad.axes[0]);
    case "dpadUp":
      return readGamepadButtonStrength(gamepad.buttons[12]);
    case "dpadDown":
      return readGamepadButtonStrength(gamepad.buttons[13]);
    case "dpadLeft":
      return readGamepadButtonStrength(gamepad.buttons[14]);
    case "dpadRight":
      return readGamepadButtonStrength(gamepad.buttons[15]);
  }
}

function readGamepadBindingStrength(
  gamepads: ArrayLike<Gamepad | null> | null | undefined,
  binding: PlayerStartGamepadBinding
): number {
  if (gamepads === undefined || gamepads === null) {
    return 0;
  }

  let strength = 0;

  for (let index = 0; index < gamepads.length; index += 1) {
    const gamepad = gamepads[index];

    if (gamepad === null || gamepad === undefined || gamepad.connected === false) {
      continue;
    }

    strength = Math.max(strength, readSingleGamepadBinding(gamepad, binding));
  }

  return strength;
}

function readSingleGamepadActionBinding(
  gamepad: Gamepad,
  binding: PlayerStartGamepadActionBinding
): number {
  switch (binding) {
    case "buttonSouth":
      return readGamepadButtonStrength(gamepad.buttons[0]);
    case "buttonEast":
      return readGamepadButtonStrength(gamepad.buttons[1]);
    case "buttonWest":
      return readGamepadButtonStrength(gamepad.buttons[2]);
    case "buttonNorth":
      return readGamepadButtonStrength(gamepad.buttons[3]);
    case "leftShoulder":
      return readGamepadButtonStrength(gamepad.buttons[4]);
    case "rightShoulder":
      return readGamepadButtonStrength(gamepad.buttons[5]);
    case "leftTrigger":
      return readGamepadButtonStrength(gamepad.buttons[6]);
    case "rightTrigger":
      return readGamepadButtonStrength(gamepad.buttons[7]);
    case "leftStickPress":
      return readGamepadButtonStrength(gamepad.buttons[10]);
    case "rightStickPress":
      return readGamepadButtonStrength(gamepad.buttons[11]);
  }
}

function readGamepadActionBindingStrength(
  gamepads: ArrayLike<Gamepad | null> | null | undefined,
  binding: PlayerStartGamepadActionBinding
): number {
  if (gamepads === undefined || gamepads === null) {
    return 0;
  }

  let strength = 0;

  for (let index = 0; index < gamepads.length; index += 1) {
    const gamepad = gamepads[index];

    if (gamepad === null || gamepad === undefined || gamepad.connected === false) {
      continue;
    }

    strength = Math.max(strength, readSingleGamepadActionBinding(gamepad, binding));
  }

  return strength;
}

function readSingleGamepadCameraLook(
  gamepad: Gamepad,
  binding: PlayerStartGamepadCameraLookBinding
): PlayerStartLookInputState {
  switch (binding) {
    case "rightStick":
      return {
        horizontal: readCenteredAxisValue(gamepad.axes[2]),
        vertical: -readCenteredAxisValue(gamepad.axes[3])
      };
  }
}

function readGamepadCameraLook(
  gamepads: ArrayLike<Gamepad | null> | null | undefined,
  binding: PlayerStartGamepadCameraLookBinding
): PlayerStartLookInputState {
  if (gamepads === undefined || gamepads === null) {
    return {
      horizontal: 0,
      vertical: 0
    };
  }

  let horizontal = 0;
  let vertical = 0;

  for (let index = 0; index < gamepads.length; index += 1) {
    const gamepad = gamepads[index];

    if (gamepad === null || gamepad === undefined || gamepad.connected === false) {
      continue;
    }

    const look = readSingleGamepadCameraLook(gamepad, binding);

    if (Math.abs(look.horizontal) > Math.abs(horizontal)) {
      horizontal = look.horizontal;
    }

    if (Math.abs(look.vertical) > Math.abs(vertical)) {
      vertical = look.vertical;
    }
  }

  return {
    horizontal,
    vertical
  };
}

export function getAvailableGamepads(): ArrayLike<Gamepad | null> | undefined {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.getGamepads !== "function"
  ) {
    return undefined;
  }

  return navigator.getGamepads();
}

export function resolvePlayerStartMovementActions(
  pressedKeys: ReadonlySet<string>,
  bindings: PlayerStartInputBindings,
  gamepads: ArrayLike<Gamepad | null> | null | undefined = getAvailableGamepads()
): PlayerStartMovementActionState {
  const actionInputs = resolvePlayerStartActionInputs(
    pressedKeys,
    bindings,
    gamepads
  );

  return {
    moveForward: actionInputs.moveForward,
    moveBackward: actionInputs.moveBackward,
    moveLeft: actionInputs.moveLeft,
    moveRight: actionInputs.moveRight
  };
}

export function resolvePlayerStartActionInputs(
  pressedKeys: ReadonlySet<string>,
  bindings: PlayerStartInputBindings,
  gamepads: ArrayLike<Gamepad | null> | null | undefined = getAvailableGamepads()
): PlayerStartActionInputState {
  return {
    moveForward: Math.max(
      pressedKeys.has(bindings.keyboard.moveForward) ? 1 : 0,
      readGamepadBindingStrength(gamepads, bindings.gamepad.moveForward)
    ),
    moveBackward: Math.max(
      pressedKeys.has(bindings.keyboard.moveBackward) ? 1 : 0,
      readGamepadBindingStrength(gamepads, bindings.gamepad.moveBackward)
    ),
    moveLeft: Math.max(
      pressedKeys.has(bindings.keyboard.moveLeft) ? 1 : 0,
      readGamepadBindingStrength(gamepads, bindings.gamepad.moveLeft)
    ),
    moveRight: Math.max(
      pressedKeys.has(bindings.keyboard.moveRight) ? 1 : 0,
      readGamepadBindingStrength(gamepads, bindings.gamepad.moveRight)
    ),
    jump: Math.max(
      pressedKeys.has(bindings.keyboard.jump) ? 1 : 0,
      readGamepadActionBindingStrength(gamepads, bindings.gamepad.jump)
    ),
    sprint: Math.max(
      pressedKeys.has(bindings.keyboard.sprint) ? 1 : 0,
      readGamepadActionBindingStrength(gamepads, bindings.gamepad.sprint)
    ),
    crouch: Math.max(
      pressedKeys.has(bindings.keyboard.crouch) ? 1 : 0,
      readGamepadActionBindingStrength(gamepads, bindings.gamepad.crouch)
    )
  };
}

export function resolvePlayerStartLookInput(
  bindings: PlayerStartInputBindings,
  gamepads: ArrayLike<Gamepad | null> | null | undefined = getAvailableGamepads()
): PlayerStartLookInputState {
  return readGamepadCameraLook(gamepads, bindings.gamepad.cameraLook);
}