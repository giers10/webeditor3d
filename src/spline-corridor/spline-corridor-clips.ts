export interface SplineCorridorPathClipInterval {
  junctionId: string;
  startDistance: number;
  endDistance: number;
}

export type SplineCorridorPathClipIntervalMap = Map<
  string,
  SplineCorridorPathClipInterval[]
>;

export function isDistanceInSplineCorridorClipIntervals(
  distance: number,
  intervals: readonly SplineCorridorPathClipInterval[] | undefined
): boolean {
  if (intervals === undefined || intervals.length === 0) {
    return false;
  }

  return intervals.some(
    (interval) =>
      distance >= interval.startDistance && distance <= interval.endDistance
  );
}

export function mergeSplineCorridorPathClipIntervals(
  intervals: readonly SplineCorridorPathClipInterval[]
): SplineCorridorPathClipInterval[] {
  if (intervals.length <= 1) {
    return [...intervals];
  }

  const sortedIntervals = [...intervals].sort(
    (left, right) => left.startDistance - right.startDistance
  );
  const merged: SplineCorridorPathClipInterval[] = [];

  for (const interval of sortedIntervals) {
    const previous = merged[merged.length - 1];

    if (previous === undefined || interval.startDistance > previous.endDistance) {
      merged.push({ ...interval });
      continue;
    }

    previous.endDistance = Math.max(previous.endDistance, interval.endDistance);
  }

  return merged;
}

