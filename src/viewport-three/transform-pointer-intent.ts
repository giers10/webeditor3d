import type { TransformSessionState } from "../core/transform-session";
import type { ViewportPanelId } from "./viewport-layout";

export interface TransformPointerDownIntent {
  commitActiveTransform: boolean;
  allowGizmoInteraction: boolean;
}

export function resolveTransformPointerDownIntent(
  transformSession: TransformSessionState,
  panelId: ViewportPanelId
): TransformPointerDownIntent {
  if (transformSession.kind !== "active") {
    return {
      commitActiveTransform: false,
      allowGizmoInteraction: true
    };
  }

  if (transformSession.sourcePanelId !== panelId) {
    return {
      commitActiveTransform: false,
      allowGizmoInteraction: false
    };
  }

  return {
    commitActiveTransform: true,
    allowGizmoInteraction: false
  };
}
