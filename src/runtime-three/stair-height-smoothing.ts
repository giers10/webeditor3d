const HEIGHT_EPSILON = 1e-4;
const STAIR_SMOOTHING_RISE_RATE = 10;
const STAIR_SMOOTHING_FALL_RATE = 14;
const STAIR_SMOOTHING_DELTA_MULTIPLIER = 1.5;

export function smoothGroundedStairHeight(options: {
  currentSmoothedFeetY: number;
  targetFeetY: number;
  grounded: boolean;
  dt: number;
  maxStepHeight: number;
}): number {
  if (options.dt <= 0 || !options.grounded || options.maxStepHeight <= 0) {
    return options.targetFeetY;
  }

  const delta = options.targetFeetY - options.currentSmoothedFeetY;

  if (Math.abs(delta) <= HEIGHT_EPSILON) {
    return options.targetFeetY;
  }

  const maxSmoothableDelta = Math.max(
    0.04,
    options.maxStepHeight * STAIR_SMOOTHING_DELTA_MULTIPLIER
  );

  if (Math.abs(delta) > maxSmoothableDelta) {
    return options.targetFeetY;
  }

  const rate = delta >= 0 ? STAIR_SMOOTHING_RISE_RATE : STAIR_SMOOTHING_FALL_RATE;
  const alpha = 1 - Math.exp(-rate * options.dt);

  return options.currentSmoothedFeetY + delta * alpha;
}