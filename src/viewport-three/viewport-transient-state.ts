import type { Vec3 } from "../core/vector";
import type { ToolMode } from "../core/tool-mode";
import type { EntityKind } from "../entities/entity-instances";
import type { ViewportPanelId } from "./viewport-layout";

export type CreationTarget =
  | {
      kind: "box-brush";
    }
  | {
      kind: "entity";
      entityKind: EntityKind;
      audioAssetId: string | null;
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

  return {
    kind: "create",
    sourcePanelId: toolPreview.sourcePanelId,
    target:
      toolPreview.target.kind === "entity"
        ? {
            kind: "entity",
            entityKind: toolPreview.target.entityKind,
            audioAssetId: toolPreview.target.audioAssetId
          }
        : toolPreview.target.kind === "model-instance"
          ? {
              kind: "model-instance",
              assetId: toolPreview.target.assetId
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

export function isViewportToolPreviewCompatible(toolMode: ToolMode, toolPreview: ViewportToolPreview): boolean {
  if (toolPreview.kind === "none") {
    return true;
  }

  return toolMode === "create" && toolPreview.kind === "create";
}
