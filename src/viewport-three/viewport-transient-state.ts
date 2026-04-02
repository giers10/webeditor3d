import type { Vec3 } from "../core/vector";
import type { ToolMode } from "../core/tool-mode";
import type { EntityKind } from "../entities/entity-instances";
import type { ViewportPanelId } from "./viewport-layout";

export interface BoxCreateViewportToolPreview {
  kind: "box-create";
  sourcePanelId: ViewportPanelId;
  center: Vec3 | null;
}

export type ViewportPlacementPreviewTarget =
  | {
      kind: "entity";
      entityKind: EntityKind;
      audioAssetId: string | null;
    }
  | {
      kind: "model-instance";
      assetId: string;
    };

export interface PlacementViewportToolPreview {
  kind: "placement";
  sourcePanelId: ViewportPanelId;
  target: ViewportPlacementPreviewTarget;
  center: Vec3 | null;
}

export type ViewportToolPreview = BoxCreateViewportToolPreview | PlacementViewportToolPreview | { kind: "none" };

export interface ViewportTransientState {
  toolPreview: ViewportToolPreview;
}

export function createDefaultViewportTransientState(): ViewportTransientState {
  return {
    toolPreview: {
      kind: "none"
    }
  };
}

export function cloneViewportToolPreview(toolPreview: ViewportToolPreview): ViewportToolPreview {
  if (toolPreview.kind === "none") {
    return toolPreview;
  }

  if (toolPreview.kind === "placement") {
    return {
      kind: "placement",
      sourcePanelId: toolPreview.sourcePanelId,
      target:
        toolPreview.target.kind === "entity"
          ? {
              kind: "entity",
              entityKind: toolPreview.target.entityKind,
              audioAssetId: toolPreview.target.audioAssetId
            }
          : {
              kind: "model-instance",
              assetId: toolPreview.target.assetId
            },
      center: toolPreview.center === null ? null : { ...toolPreview.center }
    };
  }

  return {
    kind: "box-create",
    sourcePanelId: toolPreview.sourcePanelId,
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

  if (left.kind === "placement" && right.kind === "placement") {
    if (left.sourcePanelId !== right.sourcePanelId) {
      return false;
    }

    if (left.target.kind !== right.target.kind) {
      return false;
    }

    if (left.target.kind === "entity" && right.target.kind === "entity") {
      if (left.target.entityKind !== right.target.entityKind || left.target.audioAssetId !== right.target.audioAssetId) {
        return false;
      }
    }

    if (left.target.kind === "model-instance" && right.target.kind === "model-instance" && left.target.assetId !== right.target.assetId) {
      return false;
    }

    if (left.center === null || right.center === null) {
      return left.center === right.center;
    }

    return left.center.x === right.center.x && left.center.y === right.center.y && left.center.z === right.center.z;
  }

  if (left.sourcePanelId !== right.sourcePanelId) {
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

  if (toolMode === "box-create") {
    return toolPreview.kind === "box-create";
  }

  if (toolMode === "place") {
    return toolPreview.kind === "placement";
  }

  return false;
}
