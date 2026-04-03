import { createOpaqueId } from "./ids";
import type { EditorSelection } from "./selection";
import type { Vec3 } from "./vector";
import type { SceneDocument } from "../document/scene-document";
import {
  cloneEntityInstance,
  getEntityKindLabel,
  type EntityInstance,
  type EntityKind
} from "../entities/entity-instances";
import { cloneModelInstance, getModelInstanceKindLabel } from "../assets/model-instances";
import type { ViewportPanelId } from "../viewport-three/viewport-layout";

export type TransformOperation = "translate" | "rotate" | "scale";
export type TransformAxis = "x" | "y" | "z";
export type TransformSessionSource = "keyboard" | "gizmo" | "toolbar";

export interface YawEntityRotationState {
  kind: "yaw";
  yawDegrees: number;
}

export interface DirectionEntityRotationState {
  kind: "direction";
  direction: Vec3;
}

export interface NoEntityRotationState {
  kind: "none";
}

export type EntityTransformRotationState = NoEntityRotationState | YawEntityRotationState | DirectionEntityRotationState;

export interface BrushTransformTarget {
  kind: "brush";
  brushId: string;
  initialCenter: Vec3;
}

export interface ModelInstanceTransformTarget {
  kind: "modelInstance";
  modelInstanceId: string;
  assetId: string;
  initialPosition: Vec3;
  initialRotationDegrees: Vec3;
  initialScale: Vec3;
}

export interface EntityTransformTarget {
  kind: "entity";
  entityId: string;
  entityKind: EntityKind;
  initialPosition: Vec3;
  initialRotation: EntityTransformRotationState;
}

export type TransformTarget = BrushTransformTarget | ModelInstanceTransformTarget | EntityTransformTarget;

export interface BrushTransformPreview {
  kind: "brush";
  center: Vec3;
}

export interface ModelInstanceTransformPreview {
  kind: "modelInstance";
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
}

export interface EntityTransformPreview {
  kind: "entity";
  position: Vec3;
  rotation: EntityTransformRotationState;
}

export type TransformPreview = BrushTransformPreview | ModelInstanceTransformPreview | EntityTransformPreview;

export interface ActiveTransformSession {
  kind: "active";
  id: string;
  source: TransformSessionSource;
  sourcePanelId: ViewportPanelId;
  operation: TransformOperation;
  axisConstraint: TransformAxis | null;
  target: TransformTarget;
  preview: TransformPreview;
}

export type TransformSessionState = ActiveTransformSession | { kind: "none" };

export interface TransformTargetResolution {
  target: TransformTarget | null;
  message: string | null;
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function cloneEntityTransformRotationState(rotation: EntityTransformRotationState): EntityTransformRotationState {
  switch (rotation.kind) {
    case "none":
      return {
        kind: "none"
      };
    case "yaw":
      return {
        kind: "yaw",
        yawDegrees: rotation.yawDegrees
      };
    case "direction":
      return {
        kind: "direction",
        direction: cloneVec3(rotation.direction)
      };
  }
}

function areEntityTransformRotationsEqual(left: EntityTransformRotationState, right: EntityTransformRotationState): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "none":
      return true;
    case "yaw":
      return right.kind === "yaw" && left.yawDegrees === right.yawDegrees;
    case "direction":
      return right.kind === "direction" && areVec3Equal(left.direction, right.direction);
  }
}

export function createInactiveTransformSession(): TransformSessionState {
  return {
    kind: "none"
  };
}

export function cloneTransformTarget(target: TransformTarget): TransformTarget {
  switch (target.kind) {
    case "brush":
      return {
        kind: "brush",
        brushId: target.brushId,
        initialCenter: cloneVec3(target.initialCenter)
      };
    case "modelInstance":
      return {
        kind: "modelInstance",
        modelInstanceId: target.modelInstanceId,
        assetId: target.assetId,
        initialPosition: cloneVec3(target.initialPosition),
        initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
        initialScale: cloneVec3(target.initialScale)
      };
    case "entity":
      return {
        kind: "entity",
        entityId: target.entityId,
        entityKind: target.entityKind,
        initialPosition: cloneVec3(target.initialPosition),
        initialRotation: cloneEntityTransformRotationState(target.initialRotation)
      };
  }
}

export function cloneTransformPreview(preview: TransformPreview): TransformPreview {
  switch (preview.kind) {
    case "brush":
      return {
        kind: "brush",
        center: cloneVec3(preview.center)
      };
    case "modelInstance":
      return {
        kind: "modelInstance",
        position: cloneVec3(preview.position),
        rotationDegrees: cloneVec3(preview.rotationDegrees),
        scale: cloneVec3(preview.scale)
      };
    case "entity":
      return {
        kind: "entity",
        position: cloneVec3(preview.position),
        rotation: cloneEntityTransformRotationState(preview.rotation)
      };
  }
}

export function cloneTransformSession(session: TransformSessionState): TransformSessionState {
  if (session.kind === "none") {
    return session;
  }

  return {
    kind: "active",
    id: session.id,
    source: session.source,
    sourcePanelId: session.sourcePanelId,
    operation: session.operation,
    axisConstraint: session.axisConstraint,
    target: cloneTransformTarget(session.target),
    preview: cloneTransformPreview(session.preview)
  };
}

export function areTransformSessionsEqual(left: TransformSessionState, right: TransformSessionState): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "none" || right.kind === "none") {
    return true;
  }

  return (
    left.id === right.id &&
    left.source === right.source &&
    left.sourcePanelId === right.sourcePanelId &&
    left.operation === right.operation &&
    left.axisConstraint === right.axisConstraint &&
    areTransformTargetsEqual(left.target, right.target) &&
    areTransformPreviewsEqual(left.preview, right.preview)
  );
}

function areTransformTargetsEqual(left: TransformTarget, right: TransformTarget): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "brush":
      return right.kind === "brush" && left.brushId === right.brushId && areVec3Equal(left.initialCenter, right.initialCenter);
    case "modelInstance":
      return (
        right.kind === "modelInstance" &&
        left.modelInstanceId === right.modelInstanceId &&
        left.assetId === right.assetId &&
        areVec3Equal(left.initialPosition, right.initialPosition) &&
        areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
        areVec3Equal(left.initialScale, right.initialScale)
      );
    case "entity":
      return (
        right.kind === "entity" &&
        left.entityId === right.entityId &&
        left.entityKind === right.entityKind &&
        areVec3Equal(left.initialPosition, right.initialPosition) &&
        areEntityTransformRotationsEqual(left.initialRotation, right.initialRotation)
      );
  }
}

function areTransformPreviewsEqual(left: TransformPreview, right: TransformPreview): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "brush":
      return right.kind === "brush" && areVec3Equal(left.center, right.center);
    case "modelInstance":
      return (
        right.kind === "modelInstance" &&
        areVec3Equal(left.position, right.position) &&
        areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
        areVec3Equal(left.scale, right.scale)
      );
    case "entity":
      return right.kind === "entity" && areVec3Equal(left.position, right.position) && areEntityTransformRotationsEqual(left.rotation, right.rotation);
  }
}

export function createTransformSession(options: {
  source: TransformSessionSource;
  sourcePanelId: ViewportPanelId;
  operation: TransformOperation;
  axisConstraint?: TransformAxis | null;
  target: TransformTarget;
}): ActiveTransformSession {
  return {
    kind: "active",
    id: createOpaqueId("transform-session"),
    source: options.source,
    sourcePanelId: options.sourcePanelId,
    operation: options.operation,
    axisConstraint: options.axisConstraint ?? null,
    target: cloneTransformTarget(options.target),
    preview: createTransformPreviewFromTarget(options.target)
  };
}

export function createTransformPreviewFromTarget(target: TransformTarget): TransformPreview {
  switch (target.kind) {
    case "brush":
      return {
        kind: "brush",
        center: cloneVec3(target.initialCenter)
      };
    case "modelInstance":
      return {
        kind: "modelInstance",
        position: cloneVec3(target.initialPosition),
        rotationDegrees: cloneVec3(target.initialRotationDegrees),
        scale: cloneVec3(target.initialScale)
      };
    case "entity":
      return {
        kind: "entity",
        position: cloneVec3(target.initialPosition),
        rotation: cloneEntityTransformRotationState(target.initialRotation)
      };
  }
}

export function doesTransformSessionChangeTarget(session: ActiveTransformSession): boolean {
  switch (session.target.kind) {
    case "brush":
      return session.preview.kind === "brush" && !areVec3Equal(session.preview.center, session.target.initialCenter);
    case "modelInstance":
      return (
        session.preview.kind === "modelInstance" &&
        (!areVec3Equal(session.preview.position, session.target.initialPosition) ||
          !areVec3Equal(session.preview.rotationDegrees, session.target.initialRotationDegrees) ||
          !areVec3Equal(session.preview.scale, session.target.initialScale))
      );
    case "entity":
      return (
        session.preview.kind === "entity" &&
        (!areVec3Equal(session.preview.position, session.target.initialPosition) ||
          !areEntityTransformRotationsEqual(session.preview.rotation, session.target.initialRotation))
      );
  }
}

export function getTransformOperationLabel(operation: TransformOperation): string {
  switch (operation) {
    case "translate":
      return "Move";
    case "rotate":
      return "Rotate";
    case "scale":
      return "Scale";
  }
}

export function getTransformAxisLabel(axis: TransformAxis): string {
  return axis.toUpperCase();
}

export function getTransformTargetLabel(target: TransformTarget): string {
  switch (target.kind) {
    case "brush":
      return "Box Brush";
    case "modelInstance":
      return getModelInstanceKindLabel();
    case "entity":
      return getEntityKindLabel(target.entityKind);
  }
}

export function getSupportedTransformOperations(target: TransformTarget): TransformOperation[] {
  switch (target.kind) {
    case "brush":
      return ["translate"];
    case "modelInstance":
      return ["translate", "rotate", "scale"];
    case "entity":
      return target.initialRotation.kind === "none" ? ["translate"] : ["translate", "rotate"];
  }
}

export function supportsTransformOperation(target: TransformTarget, operation: TransformOperation): boolean {
  return getSupportedTransformOperations(target).includes(operation);
}

export function supportsTransformAxisConstraint(session: ActiveTransformSession, axis: TransformAxis): boolean {
  switch (session.operation) {
    case "translate":
      return true;
    case "scale":
      return session.target.kind === "modelInstance";
    case "rotate":
      if (session.target.kind === "entity" && session.target.initialRotation.kind === "yaw") {
        return axis === "y";
      }

      return session.target.kind !== "brush";
  }
}

function resolveEntityRotation(entity: EntityInstance): EntityTransformRotationState {
  switch (entity.kind) {
    case "playerStart":
    case "teleportTarget":
      return {
        kind: "yaw",
        yawDegrees: entity.yawDegrees
      };
    case "spotLight":
      return {
        kind: "direction",
        direction: cloneVec3(entity.direction)
      };
    case "pointLight":
    case "soundEmitter":
    case "triggerVolume":
    case "interactable":
      return {
        kind: "none"
      };
  }
}

function createBrushTransformTarget(document: SceneDocument, brushId: string): TransformTargetResolution {
  const brush = document.brushes[brushId];

  if (brush === undefined || brush.kind !== "box") {
    return {
      target: null,
      message: "Select a supported box brush before transforming it."
    };
  }

  return {
    target: {
      kind: "brush",
      brushId: brush.id,
      initialCenter: cloneVec3(brush.center)
    },
    message: null
  };
}

function createEntityTransformTarget(document: SceneDocument, entityId: string): TransformTargetResolution {
  const entity = document.entities[entityId];

  if (entity === undefined) {
    return {
      target: null,
      message: "Select an authored entity before transforming it."
    };
  }

  const clonedEntity = cloneEntityInstance(entity);

  return {
    target: {
      kind: "entity",
      entityId: clonedEntity.id,
      entityKind: clonedEntity.kind,
      initialPosition: cloneVec3(clonedEntity.position),
      initialRotation: resolveEntityRotation(clonedEntity)
    },
    message: null
  };
}

function createModelInstanceTransformTarget(document: SceneDocument, modelInstanceId: string): TransformTargetResolution {
  const modelInstance = document.modelInstances[modelInstanceId];

  if (modelInstance === undefined) {
    return {
      target: null,
      message: "Select a model instance before transforming it."
    };
  }

  const clonedModelInstance = cloneModelInstance(modelInstance);

  return {
    target: {
      kind: "modelInstance",
      modelInstanceId: clonedModelInstance.id,
      assetId: clonedModelInstance.assetId,
      initialPosition: cloneVec3(clonedModelInstance.position),
      initialRotationDegrees: cloneVec3(clonedModelInstance.rotationDegrees),
      initialScale: cloneVec3(clonedModelInstance.scale)
    },
    message: null
  };
}

export function resolveTransformTarget(document: SceneDocument, selection: EditorSelection): TransformTargetResolution {
  switch (selection.kind) {
    case "none":
      return {
        target: null,
        message: "Select a single brush, entity, or model instance before transforming it."
      };
    case "brushFace":
      return createBrushTransformTarget(document, selection.brushId);
    case "brushes":
      if (selection.ids.length !== 1) {
        return {
          target: null,
          message: "Select a single brush before transforming it."
        };
      }

      return createBrushTransformTarget(document, selection.ids[0]);
    case "entities":
      if (selection.ids.length !== 1) {
        return {
          target: null,
          message: "Select a single entity before transforming it."
        };
      }

      return createEntityTransformTarget(document, selection.ids[0]);
    case "modelInstances":
      if (selection.ids.length !== 1) {
        return {
          target: null,
          message: "Select a single model instance before transforming it."
        };
      }

      return createModelInstanceTransformTarget(document, selection.ids[0]);
  }
}
