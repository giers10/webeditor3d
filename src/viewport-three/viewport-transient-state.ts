import type { Vec3 } from "../core/vector";
import type { ToolMode } from "../core/tool-mode";
import {
  areTransformSessionsEqual,
  cloneTransformSession,
  createInactiveTransformSession,
  type TransformSessionState
} from "../core/transform-session";
import type { EntityKind } from "../entities/entity-instances";
import type { ViewportPanelId } from "./viewport-layout";

export type CreationTarget =
  | {
      kind: "box-brush";
    }
  | {
      kind: "wedge-brush";
    }
  | {
      kind: "cylinder-brush";
      sideCount: number;
    }
  | {
      kind: "cone-brush";
      sideCount: number;
    }
  | {
      kind: "torus-brush";
      majorSegmentCount: number;
      tubeSegmentCount: number;
    }
  | {
      kind: "entity";
      entityKind: EntityKind;
      audioAssetId: string | null;
      modelAssetId: string | null;
    }
  | {
      kind: "model-instance";
      assetId: string;
    };

export interface CreationViewportToolPreview {
  kind: "create";
  sourcePanelId: ViewportPanelId;
  target: CreationTarget;
  center: Vec3 | null;
}

export type ViewportToolPreview = CreationViewportToolPreview | { kind: "none" };

export interface ViewportTransientState {
  toolPreview: ViewportToolPreview;
  transformSession: TransformSessionState;
}

export function createDefaultViewportTransientState(): ViewportTransientState {
  return {
    toolPreview: {
      kind: "none"
    },
    transformSession: createInactiveTransformSession()
  };
}

export function cloneViewportToolPreview(toolPreview: ViewportToolPreview): ViewportToolPreview {
  if (toolPreview.kind === "none") {
    return toolPreview;
  }

  return {
    kind: "create",
    sourcePanelId: toolPreview.sourcePanelId,
    target:
      toolPreview.target.kind === "entity"
        ? {
            kind: "entity",
            entityKind: toolPreview.target.entityKind,
            audioAssetId: toolPreview.target.audioAssetId,
            modelAssetId: toolPreview.target.modelAssetId
          }
        : toolPreview.target.kind === "model-instance"
          ? {
              kind: "model-instance",
              assetId: toolPreview.target.assetId
            }
          : toolPreview.target.kind === "wedge-brush"
            ? {
                kind: "wedge-brush"
              }
            : toolPreview.target.kind === "cylinder-brush"
              ? {
                  kind: "cylinder-brush",
                  sideCount: toolPreview.target.sideCount
                }
              : toolPreview.target.kind === "cone-brush"
                ? {
                    kind: "cone-brush",
                    sideCount: toolPreview.target.sideCount
                  }
                : toolPreview.target.kind === "torus-brush"
                  ? {
                      kind: "torus-brush",
                      majorSegmentCount: toolPreview.target.majorSegmentCount,
                      tubeSegmentCount: toolPreview.target.tubeSegmentCount
                    }
          : {
              kind: "box-brush"
            },
    center: toolPreview.center === null ? null : { ...toolPreview.center }
  };
}

export function areViewportToolPreviewsEqual(left: ViewportToolPreview, right: ViewportToolPreview): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "none" || right.kind === "none") {
    return true;
  }

  if (left.kind !== "create" || right.kind !== "create") {
    return false;
  }

  if (left.sourcePanelId !== right.sourcePanelId) {
    return false;
  }

  if (left.target.kind !== right.target.kind) {
    return false;
  }

  if (left.target.kind === "entity" && right.target.kind === "entity") {
    if (
      left.target.entityKind !== right.target.entityKind ||
      left.target.audioAssetId !== right.target.audioAssetId ||
      left.target.modelAssetId !== right.target.modelAssetId
    ) {
      return false;
    }
  }

  if (left.target.kind === "model-instance" && right.target.kind === "model-instance" && left.target.assetId !== right.target.assetId) {
    return false;
  }

  if (
    left.target.kind === "cylinder-brush" &&
    right.target.kind === "cylinder-brush" &&
    left.target.sideCount !== right.target.sideCount
  ) {
    return false;
  }

  if (
    left.target.kind === "cone-brush" &&
    right.target.kind === "cone-brush" &&
    left.target.sideCount !== right.target.sideCount
  ) {
    return false;
  }

  if (
    left.target.kind === "torus-brush" &&
    right.target.kind === "torus-brush" &&
    (left.target.majorSegmentCount !== right.target.majorSegmentCount ||
      left.target.tubeSegmentCount !== right.target.tubeSegmentCount)
  ) {
    return false;
  }

  if (left.center === null || right.center === null) {
    return left.center === right.center;
  }

  return left.center.x === right.center.x && left.center.y === right.center.y && left.center.z === right.center.z;
}

export function isViewportToolPreviewCompatible(toolMode: ToolMode, toolPreview: ViewportToolPreview): boolean {
  if (toolPreview.kind === "none") {
    return true;
  }

  return toolMode === "create" && toolPreview.kind === "create";
}

export function cloneViewportTransientState(transientState: ViewportTransientState): ViewportTransientState {
  return {
    toolPreview: cloneViewportToolPreview(transientState.toolPreview),
    transformSession: cloneTransformSession(transientState.transformSession)
  };
}

export function areViewportTransientStatesEqual(left: ViewportTransientState, right: ViewportTransientState): boolean {
  return areViewportToolPreviewsEqual(left.toolPreview, right.toolPreview) && areTransformSessionsEqual(left.transformSession, right.transformSession);
}
