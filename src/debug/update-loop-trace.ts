export type UpdateLoopTracePayload = Record<string, unknown>;

interface UpdateLoopTraceEvent {
  label: string;
  timestamp: number;
  payload: UpdateLoopTracePayload;
}

interface UpdateLoopCameraState {
  target: {
    x: number;
    y: number;
    z: number;
  };
  perspectiveOrbit: {
    radius: number;
    theta: number;
    phi: number;
  };
  orthographicZoom: number;
}

interface UpdateLoopSelection {
  kind: string;
  ids?: readonly string[];
  brushId?: string;
  faceId?: string;
  edgeId?: string;
  vertexId?: string;
  pathId?: string;
  pointId?: string;
}

const TRACE_WINDOW_MS = 1000;
const TRACE_LABEL_THRESHOLD = 20;
const TRACE_TOTAL_THRESHOLD = 50;
const TRACE_MAX_EVENTS = 250;
const TRACE_WARNING_THROTTLE_MS = 750;
const TRACE_PAYLOAD_STRING_LIMIT = 180;
const TRACE_TABLE_PAYLOAD_LIMIT = 360;

const traceEvents: UpdateLoopTraceEvent[] = [];
let lastWarningTime = 0;

export function isUpdateLoopTraceEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  try {
    const queryEnabled =
      new URLSearchParams(window.location.search).get("debugUpdateLoop") ===
      "1";
    const storageEnabled =
      window.localStorage.getItem("webeditor3d.debugUpdateLoop") === "1";

    return queryEnabled || storageEnabled;
  } catch {
    return false;
  }
}

export function traceUpdateLoopEvent(
  label: string,
  payload: UpdateLoopTracePayload = {}
): void {
  if (!isUpdateLoopTraceEnabled()) {
    return;
  }

  const timestamp = getTraceNow();
  const summarizedPayload = summarizeTracePayload(payload);

  traceEvents.push({
    label,
    timestamp,
    payload: summarizedPayload
  });

  pruneTraceEvents(timestamp);
  maybeWarnForHighFrequencyUpdates(label, timestamp);
}

export function summarizeUpdateLoopCameraState(
  cameraState: UpdateLoopCameraState | null | undefined
): UpdateLoopTracePayload | null {
  if (cameraState === null || cameraState === undefined) {
    return null;
  }

  return {
    target: {
      x: roundTraceNumber(cameraState.target.x),
      y: roundTraceNumber(cameraState.target.y),
      z: roundTraceNumber(cameraState.target.z)
    },
    perspectiveOrbit: {
      radius: roundTraceNumber(cameraState.perspectiveOrbit.radius),
      theta: roundTraceNumber(cameraState.perspectiveOrbit.theta),
      phi: roundTraceNumber(cameraState.perspectiveOrbit.phi)
    },
    orthographicZoom: roundTraceNumber(cameraState.orthographicZoom)
  };
}

export function summarizeUpdateLoopCameraStateDeltas(
  previousCameraState: UpdateLoopCameraState | null | undefined,
  nextCameraState: UpdateLoopCameraState | null | undefined
): UpdateLoopTracePayload | null {
  if (
    previousCameraState === null ||
    previousCameraState === undefined ||
    nextCameraState === null ||
    nextCameraState === undefined
  ) {
    return null;
  }

  return {
    targetX: roundTraceNumber(
      nextCameraState.target.x - previousCameraState.target.x
    ),
    targetY: roundTraceNumber(
      nextCameraState.target.y - previousCameraState.target.y
    ),
    targetZ: roundTraceNumber(
      nextCameraState.target.z - previousCameraState.target.z
    ),
    radius: roundTraceNumber(
      nextCameraState.perspectiveOrbit.radius -
        previousCameraState.perspectiveOrbit.radius
    ),
    theta: roundTraceNumber(
      nextCameraState.perspectiveOrbit.theta -
        previousCameraState.perspectiveOrbit.theta
    ),
    phi: roundTraceNumber(
      nextCameraState.perspectiveOrbit.phi -
        previousCameraState.perspectiveOrbit.phi
    ),
    orthographicZoom: roundTraceNumber(
      nextCameraState.orthographicZoom - previousCameraState.orthographicZoom
    )
  };
}

export function summarizeUpdateLoopSelection(
  selection: UpdateLoopSelection | null | undefined
): UpdateLoopTracePayload | null {
  if (selection === null || selection === undefined) {
    return null;
  }

  switch (selection.kind) {
    case "none":
      return {
        kind: selection.kind
      };
    case "brushFace":
      return {
        kind: selection.kind,
        brushId: selection.brushId ?? null,
        faceId: selection.faceId ?? null
      };
    case "brushEdge":
      return {
        kind: selection.kind,
        brushId: selection.brushId ?? null,
        edgeId: selection.edgeId ?? null
      };
    case "brushVertex":
      return {
        kind: selection.kind,
        brushId: selection.brushId ?? null,
        vertexId: selection.vertexId ?? null
      };
    case "pathPoint":
      return {
        kind: selection.kind,
        pathId: selection.pathId ?? null,
        pointId: selection.pointId ?? null
      };
    default:
      return {
        kind: selection.kind,
        ids: summarizeStringList(selection.ids ?? [])
      };
  }
}

function getTraceNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function pruneTraceEvents(timestamp: number): void {
  const oldestAllowedTimestamp = timestamp - TRACE_WINDOW_MS;

  while (
    traceEvents.length > 0 &&
    traceEvents[0].timestamp < oldestAllowedTimestamp
  ) {
    traceEvents.shift();
  }

  while (traceEvents.length > TRACE_MAX_EVENTS) {
    traceEvents.shift();
  }
}

function maybeWarnForHighFrequencyUpdates(
  triggerLabel: string,
  timestamp: number
): void {
  if (timestamp - lastWarningTime < TRACE_WARNING_THROTTLE_MS) {
    return;
  }

  const countsByLabel = new Map<string, number>();
  const lastEventByLabel = new Map<string, UpdateLoopTraceEvent>();

  for (const event of traceEvents) {
    countsByLabel.set(event.label, (countsByLabel.get(event.label) ?? 0) + 1);
    lastEventByLabel.set(event.label, event);
  }

  const triggerLabelCount = countsByLabel.get(triggerLabel) ?? 0;
  const labelExceeded = triggerLabelCount > TRACE_LABEL_THRESHOLD;
  const totalExceeded = traceEvents.length > TRACE_TOTAL_THRESHOLD;

  if (!labelExceeded && !totalExceeded) {
    return;
  }

  lastWarningTime = timestamp;

  const rows = [...countsByLabel.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => {
      const lastEvent = lastEventByLabel.get(label);

      return {
        source: label,
        countInLastMs: count,
        lastAtMs: lastEvent?.timestamp.toFixed(1) ?? "",
        lastPayload:
          lastEvent === undefined
            ? ""
            : stringifyTracePayloadForTable(lastEvent.payload)
      };
    });

  console.groupCollapsed("[update-loop-trace] high frequency updates", {
    triggerLabel,
    triggerLabelCount,
    totalCount: traceEvents.length,
    windowMs: TRACE_WINDOW_MS
  });
  console.table(rows);
  console.log(
    "Last payloads",
    Object.fromEntries(
      [...lastEventByLabel.entries()].map(([label, event]) => [
        label,
        event.payload
      ])
    )
  );

  if (labelExceeded) {
    console.trace(`[update-loop-trace] threshold source: ${triggerLabel}`);
  }

  console.groupEnd();
}

function summarizeTracePayload(
  payload: UpdateLoopTracePayload
): UpdateLoopTracePayload {
  return summarizeTraceValue(payload, 0) as UpdateLoopTracePayload;
}

function summarizeTraceValue(value: unknown, depth: number): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? roundTraceNumber(value) : String(value);
  }

  if (typeof value === "string") {
    return value.length <= TRACE_PAYLOAD_STRING_LIMIT
      ? value
      : `${value.slice(0, TRACE_PAYLOAD_STRING_LIMIT)}...`;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (depth >= 3) {
      return `[array length=${value.length}]`;
    }

    const summarized = value
      .slice(0, 8)
      .map((item) => summarizeTraceValue(item, depth + 1));

    if (value.length > summarized.length) {
      summarized.push(`... ${value.length - summarized.length} more`);
    }

    return summarized;
  }

  if (depth >= 3) {
    return "[object]";
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, 16);

  for (const [key, entryValue] of entries) {
    result[key] = summarizeTraceValue(entryValue, depth + 1);
  }

  const extraKeyCount = Object.keys(value).length - entries.length;

  if (extraKeyCount > 0) {
    result.__extraKeys = extraKeyCount;
  }

  return result;
}

function summarizeStringList(values: readonly string[]): UpdateLoopTracePayload {
  return {
    count: values.length,
    firstIds: values.slice(0, 5)
  };
}

function stringifyTracePayloadForTable(payload: UpdateLoopTracePayload): string {
  const json = JSON.stringify(payload);

  if (json.length <= TRACE_TABLE_PAYLOAD_LIMIT) {
    return json;
  }

  return `${json.slice(0, TRACE_TABLE_PAYLOAD_LIMIT)}...`;
}

function roundTraceNumber(value: number): number {
  return Number(value.toFixed(6));
}
