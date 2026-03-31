import { getSingleSelectedBrushId, getSingleSelectedEntityId, type EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";
import type { BoxBrush } from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";

const PLAYER_START_FOCUS_HALF_EXTENTS: Vec3 = {
  x: 0.35,
  y: 0.3,
  z: 0.55
};

interface FocusBoundsAccumulator {
  min: Vec3;
  max: Vec3;
}

export interface ViewportFocusTarget {
  center: Vec3;
  radius: number;
}

function createEmptyBoundsAccumulator(): FocusBoundsAccumulator {
  return {
    min: {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      z: Number.POSITIVE_INFINITY
    },
    max: {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
      z: Number.NEGATIVE_INFINITY
    }
  };
}

function includeBounds(bounds: FocusBoundsAccumulator, min: Vec3, max: Vec3) {
  bounds.min.x = Math.min(bounds.min.x, min.x);
  bounds.min.y = Math.min(bounds.min.y, min.y);
  bounds.min.z = Math.min(bounds.min.z, min.z);
  bounds.max.x = Math.max(bounds.max.x, max.x);
  bounds.max.y = Math.max(bounds.max.y, max.y);
  bounds.max.z = Math.max(bounds.max.z, max.z);
}

function finishBounds(bounds: FocusBoundsAccumulator): ViewportFocusTarget | null {
  if (!Number.isFinite(bounds.min.x) || !Number.isFinite(bounds.max.x)) {
    return null;
  }

  const center = {
    x: (bounds.min.x + bounds.max.x) * 0.5,
    y: (bounds.min.y + bounds.max.y) * 0.5,
    z: (bounds.min.z + bounds.max.z) * 0.5
  };
  const radius = Math.max(
    0.5,
    Math.hypot(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z) * 0.5
  );

  return {
    center,
    radius
  };
}

function createBrushFocusTarget(brush: BoxBrush): ViewportFocusTarget {
  return {
    center: {
      ...brush.center
    },
    radius: Math.max(0.5, Math.hypot(brush.size.x, brush.size.y, brush.size.z) * 0.5)
  };
}

function createPlayerStartFocusTarget(position: Vec3): ViewportFocusTarget {
  return {
    center: {
      x: position.x,
      y: position.y + PLAYER_START_FOCUS_HALF_EXTENTS.y,
      z: position.z
    },
    radius: Math.max(
      0.45,
      Math.hypot(
        PLAYER_START_FOCUS_HALF_EXTENTS.x,
        PLAYER_START_FOCUS_HALF_EXTENTS.y,
        PLAYER_START_FOCUS_HALF_EXTENTS.z
      )
    )
  };
}

function includeBrush(bounds: FocusBoundsAccumulator, brush: BoxBrush) {
  const halfSize = {
    x: brush.size.x * 0.5,
    y: brush.size.y * 0.5,
    z: brush.size.z * 0.5
  };

  includeBounds(
    bounds,
    {
      x: brush.center.x - halfSize.x,
      y: brush.center.y - halfSize.y,
      z: brush.center.z - halfSize.z
    },
    {
      x: brush.center.x + halfSize.x,
      y: brush.center.y + halfSize.y,
      z: brush.center.z + halfSize.z
    }
  );
}

function includePlayerStart(bounds: FocusBoundsAccumulator, position: Vec3) {
  includeBounds(
    bounds,
    {
      x: position.x - PLAYER_START_FOCUS_HALF_EXTENTS.x,
      y: position.y,
      z: position.z - PLAYER_START_FOCUS_HALF_EXTENTS.z
    },
    {
      x: position.x + PLAYER_START_FOCUS_HALF_EXTENTS.x,
      y: position.y + PLAYER_START_FOCUS_HALF_EXTENTS.y * 2,
      z: position.z + PLAYER_START_FOCUS_HALF_EXTENTS.z
    }
  );
}

function getSceneFocusTarget(document: SceneDocument): ViewportFocusTarget | null {
  const bounds = createEmptyBoundsAccumulator();

  for (const brush of Object.values(document.brushes)) {
    includeBrush(bounds, brush);
  }

  for (const entity of Object.values(document.entities)) {
    if (entity.kind === "playerStart") {
      includePlayerStart(bounds, entity.position);
    }
  }

  return finishBounds(bounds);
}

export function resolveViewportFocusTarget(document: SceneDocument, selection: EditorSelection): ViewportFocusTarget | null {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId !== null) {
    const brush = document.brushes[selectedBrushId];

    if (brush !== undefined && brush.kind === "box") {
      return createBrushFocusTarget(brush);
    }
  }

  const selectedEntityId = getSingleSelectedEntityId(selection);

  if (selectedEntityId !== null) {
    const entity = document.entities[selectedEntityId];

    if (entity?.kind === "playerStart") {
      return createPlayerStartFocusTarget(entity.position);
    }
  }

  return getSceneFocusTarget(document);
}
