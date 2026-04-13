import { createOpaqueId } from "./ids";
import type { EditorSelection } from "./selection";
import type { WhiteboxSelectionMode } from "./whitebox-selection-mode";
import type { Vec3 } from "./vector";
import {
  BOX_VERTEX_IDS,
  BOX_EDGE_LABELS,
  BOX_FACE_LABELS,
  BOX_VERTEX_LABELS,
  cloneBoxBrushGeometry,
  type BoxBrushGeometry,
  type BoxEdgeId,
  type BoxFaceId,
  type BoxVertexId
} from "../document/brushes";
import { getScenePathPoint } from "../document/paths";
import type { SceneDocument } from "../document/scene-document";
import {
  cloneEntityInstance,
  getEntityKindLabel,
  type EntityInstance,
  type EntityKind
} from "../entities/entity-instances";
import {
  cloneModelInstance,
  getModelInstanceKindLabel
} from "../assets/model-instances";
import type { ViewportPanelId } from "../viewport-three/viewport-layout";

export type TransformOperation = "translate" | "rotate" | "scale";
export type TransformAxis = "x" | "y" | "z";
export type TransformAxisSpace = "world" | "local";
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

export type EntityTransformRotationState =
  | NoEntityRotationState
  | YawEntityRotationState
  | DirectionEntityRotationState;

export interface BrushTransformTarget {
  kind: "brush";
  brushId: string;
  initialCenter: Vec3;
  initialRotationDegrees: Vec3;
  initialSize: Vec3;
  initialGeometry: BoxBrushGeometry;
}

export interface BrushFaceTransformTarget {
  kind: "brushFace";
  brushId: string;
  faceId: BoxFaceId;
  initialCenter: Vec3;
  initialRotationDegrees: Vec3;
  initialSize: Vec3;
  initialGeometry: BoxBrushGeometry;
}

export interface BrushEdgeTransformTarget {
  kind: "brushEdge";
  brushId: string;
  edgeId: BoxEdgeId;
  initialCenter: Vec3;
  initialRotationDegrees: Vec3;
  initialSize: Vec3;
  initialGeometry: BoxBrushGeometry;
}

export interface BrushVertexTransformTarget {
  kind: "brushVertex";
  brushId: string;
  vertexId: BoxVertexId;
  initialCenter: Vec3;
  initialRotationDegrees: Vec3;
  initialSize: Vec3;
  initialGeometry: BoxBrushGeometry;
}

export interface ModelInstanceTransformTarget {
  kind: "modelInstance";
  modelInstanceId: string;
  assetId: string;
  initialPosition: Vec3;
  initialRotationDegrees: Vec3;
  initialScale: Vec3;
}

export interface PathPointTransformTarget {
  kind: "pathPoint";
  pathId: string;
  pointId: string;
  initialPosition: Vec3;
}

export interface EntityTransformTarget {
  kind: "entity";
  entityId: string;
  entityKind: EntityKind;
  initialPosition: Vec3;
  initialRotation: EntityTransformRotationState;
}

export type TransformTarget =
  | BrushTransformTarget
  | BrushFaceTransformTarget
  | BrushEdgeTransformTarget
  | BrushVertexTransformTarget
  | ModelInstanceTransformTarget
  | PathPointTransformTarget
  | EntityTransformTarget;

export interface BrushTransformPreview {
  kind: "brush";
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  geometry: BoxBrushGeometry;
}

function areBrushGeometriesEqual(
  left: BoxBrushGeometry,
  right: BoxBrushGeometry
): boolean {
  return BOX_VERTEX_IDS.every((vertexId) => {
    const leftVertex = left.vertices[vertexId];
    const rightVertex = right.vertices[vertexId];
    return areVec3Equal(leftVertex, rightVertex);
  });
}

export interface ModelInstanceTransformPreview {
  kind: "modelInstance";
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
}

export interface PathPointTransformPreview {
  kind: "pathPoint";
  position: Vec3;
}

export interface EntityTransformPreview {
  kind: "entity";
  position: Vec3;
  rotation: EntityTransformRotationState;
}

export type TransformPreview =
  | BrushTransformPreview
  | ModelInstanceTransformPreview
  | PathPointTransformPreview
  | EntityTransformPreview;

export interface ActiveTransformSession {
  kind: "active";
  id: string;
  source: TransformSessionSource;
  sourcePanelId: ViewportPanelId;
  operation: TransformOperation;
  axisConstraint: TransformAxis | null;
  axisConstraintSpace: TransformAxisSpace;
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

function cloneEntityTransformRotationState(
  rotation: EntityTransformRotationState
): EntityTransformRotationState {
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

function areEntityTransformRotationsEqual(
  left: EntityTransformRotationState,
  right: EntityTransformRotationState
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "none":
      return true;
    case "yaw":
      return right.kind === "yaw" && left.yawDegrees === right.yawDegrees;
    case "direction":
      return (
        right.kind === "direction" &&
        areVec3Equal(left.direction, right.direction)
      );
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
        initialCenter: cloneVec3(target.initialCenter),
        initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
        initialSize: cloneVec3(target.initialSize),
        initialGeometry: cloneBoxBrushGeometry(target.initialGeometry)
      };
    case "brushFace":
      return {
        kind: "brushFace",
        brushId: target.brushId,
        faceId: target.faceId,
        initialCenter: cloneVec3(target.initialCenter),
        initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
        initialSize: cloneVec3(target.initialSize),
        initialGeometry: cloneBoxBrushGeometry(target.initialGeometry)
      };
    case "brushEdge":
      return {
        kind: "brushEdge",
        brushId: target.brushId,
        edgeId: target.edgeId,
        initialCenter: cloneVec3(target.initialCenter),
        initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
        initialSize: cloneVec3(target.initialSize),
        initialGeometry: cloneBoxBrushGeometry(target.initialGeometry)
      };
    case "brushVertex":
      return {
        kind: "brushVertex",
        brushId: target.brushId,
        vertexId: target.vertexId,
        initialCenter: cloneVec3(target.initialCenter),
        initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
        initialSize: cloneVec3(target.initialSize),
        initialGeometry: cloneBoxBrushGeometry(target.initialGeometry)
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
    case "pathPoint":
      return {
        kind: "pathPoint",
        pathId: target.pathId,
        pointId: target.pointId,
        initialPosition: cloneVec3(target.initialPosition)
      };
    case "entity":
      return {
        kind: "entity",
        entityId: target.entityId,
        entityKind: target.entityKind,
        initialPosition: cloneVec3(target.initialPosition),
        initialRotation: cloneEntityTransformRotationState(
          target.initialRotation
        )
      };
  }
}

export function cloneTransformPreview(
  preview: TransformPreview
): TransformPreview {
  switch (preview.kind) {
    case "brush":
      return {
        kind: "brush",
        center: cloneVec3(preview.center),
        rotationDegrees: cloneVec3(preview.rotationDegrees),
        size: cloneVec3(preview.size),
        geometry: cloneBoxBrushGeometry(preview.geometry)
      };
    case "modelInstance":
      return {
        kind: "modelInstance",
        position: cloneVec3(preview.position),
        rotationDegrees: cloneVec3(preview.rotationDegrees),
        scale: cloneVec3(preview.scale)
      };
    case "pathPoint":
      return {
        kind: "pathPoint",
        position: cloneVec3(preview.position)
      };
    case "entity":
      return {
        kind: "entity",
        position: cloneVec3(preview.position),
        rotation: cloneEntityTransformRotationState(preview.rotation)
      };
  }
}

export function cloneTransformSession(
  session: TransformSessionState
): TransformSessionState {
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
    axisConstraintSpace: session.axisConstraintSpace,
    target: cloneTransformTarget(session.target),
    preview: cloneTransformPreview(session.preview)
  };
}

export function areTransformSessionsEqual(
  left: TransformSessionState,
  right: TransformSessionState
): boolean {
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
    left.axisConstraintSpace === right.axisConstraintSpace &&
    areTransformTargetsEqual(left.target, right.target) &&
    areTransformPreviewsEqual(left.preview, right.preview)
  );
}

function areTransformTargetsEqual(
  left: TransformTarget,
  right: TransformTarget
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "brush":
      return (
        right.kind === "brush" &&
        left.brushId === right.brushId &&
        areVec3Equal(left.initialCenter, right.initialCenter) &&
        areVec3Equal(
          left.initialRotationDegrees,
          right.initialRotationDegrees
        ) &&
        areVec3Equal(left.initialSize, right.initialSize) &&
        areBrushGeometriesEqual(left.initialGeometry, right.initialGeometry)
      );
    case "brushFace":
      return (
        right.kind === "brushFace" &&
        left.brushId === right.brushId &&
        left.faceId === right.faceId &&
        areVec3Equal(left.initialCenter, right.initialCenter) &&
        areVec3Equal(
          left.initialRotationDegrees,
          right.initialRotationDegrees
        ) &&
        areVec3Equal(left.initialSize, right.initialSize) &&
        areBrushGeometriesEqual(left.initialGeometry, right.initialGeometry)
      );
    case "brushEdge":
      return (
        right.kind === "brushEdge" &&
        left.brushId === right.brushId &&
        left.edgeId === right.edgeId &&
        areVec3Equal(left.initialCenter, right.initialCenter) &&
        areVec3Equal(
          left.initialRotationDegrees,
          right.initialRotationDegrees
        ) &&
        areVec3Equal(left.initialSize, right.initialSize) &&
        areBrushGeometriesEqual(left.initialGeometry, right.initialGeometry)
      );
    case "brushVertex":
      return (
        right.kind === "brushVertex" &&
        left.brushId === right.brushId &&
        left.vertexId === right.vertexId &&
        areVec3Equal(left.initialCenter, right.initialCenter) &&
        areVec3Equal(
          left.initialRotationDegrees,
          right.initialRotationDegrees
        ) &&
        areVec3Equal(left.initialSize, right.initialSize) &&
        areBrushGeometriesEqual(left.initialGeometry, right.initialGeometry)
      );
    case "modelInstance":
      return (
        right.kind === "modelInstance" &&
        left.modelInstanceId === right.modelInstanceId &&
        left.assetId === right.assetId &&
        areVec3Equal(left.initialPosition, right.initialPosition) &&
        areVec3Equal(
          left.initialRotationDegrees,
          right.initialRotationDegrees
        ) &&
        areVec3Equal(left.initialScale, right.initialScale)
      );
    case "pathPoint":
      return (
        right.kind === "pathPoint" &&
        left.pathId === right.pathId &&
        left.pointId === right.pointId &&
        areVec3Equal(left.initialPosition, right.initialPosition)
      );
    case "entity":
      return (
        right.kind === "entity" &&
        left.entityId === right.entityId &&
        left.entityKind === right.entityKind &&
        areVec3Equal(left.initialPosition, right.initialPosition) &&
        areEntityTransformRotationsEqual(
          left.initialRotation,
          right.initialRotation
        )
      );
  }
}

function areTransformPreviewsEqual(
  left: TransformPreview,
  right: TransformPreview
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "brush":
      return (
        right.kind === "brush" &&
        areVec3Equal(left.center, right.center) &&
        areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
        areVec3Equal(left.size, right.size) &&
        areBrushGeometriesEqual(left.geometry, right.geometry)
      );
    case "modelInstance":
      return (
        right.kind === "modelInstance" &&
        areVec3Equal(left.position, right.position) &&
        areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
        areVec3Equal(left.scale, right.scale)
      );
    case "pathPoint":
      return (
        right.kind === "pathPoint" &&
        areVec3Equal(left.position, right.position)
      );
    case "entity":
      return (
        right.kind === "entity" &&
        areVec3Equal(left.position, right.position) &&
        areEntityTransformRotationsEqual(left.rotation, right.rotation)
      );
  }
}

export function createTransformSession(options: {
  source: TransformSessionSource;
  sourcePanelId: ViewportPanelId;
  operation: TransformOperation;
  axisConstraint?: TransformAxis | null;
  axisConstraintSpace?: TransformAxisSpace;
  target: TransformTarget;
}): ActiveTransformSession {
  return {
    kind: "active",
    id: createOpaqueId("transform-session"),
    source: options.source,
    sourcePanelId: options.sourcePanelId,
    operation: options.operation,
    axisConstraint: options.axisConstraint ?? null,
    axisConstraintSpace: options.axisConstraintSpace ?? "world",
    target: cloneTransformTarget(options.target),
    preview: createTransformPreviewFromTarget(options.target)
  };
}

export function createTransformPreviewFromTarget(
  target: TransformTarget
): TransformPreview {
  switch (target.kind) {
    case "brush":
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return {
        kind: "brush",
        center: cloneVec3(target.initialCenter),
        rotationDegrees: cloneVec3(target.initialRotationDegrees),
        size: cloneVec3(target.initialSize),
        geometry: cloneBoxBrushGeometry(target.initialGeometry)
      };
    case "modelInstance":
      return {
        kind: "modelInstance",
        position: cloneVec3(target.initialPosition),
        rotationDegrees: cloneVec3(target.initialRotationDegrees),
        scale: cloneVec3(target.initialScale)
      };
    case "pathPoint":
      return {
        kind: "pathPoint",
        position: cloneVec3(target.initialPosition)
      };
    case "entity":
      return {
        kind: "entity",
        position: cloneVec3(target.initialPosition),
        rotation: cloneEntityTransformRotationState(target.initialRotation)
      };
  }
}

export function doesTransformSessionChangeTarget(
  session: ActiveTransformSession
): boolean {
  switch (session.target.kind) {
    case "brush":
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return (
        session.preview.kind === "brush" &&
        (!areVec3Equal(session.preview.center, session.target.initialCenter) ||
          !areVec3Equal(
            session.preview.rotationDegrees,
            session.target.initialRotationDegrees
          ) ||
          !areVec3Equal(session.preview.size, session.target.initialSize) ||
          !areBrushGeometriesEqual(
            session.preview.geometry,
            session.target.initialGeometry
          ))
      );
    case "modelInstance":
      return (
        session.preview.kind === "modelInstance" &&
        (!areVec3Equal(
          session.preview.position,
          session.target.initialPosition
        ) ||
          !areVec3Equal(
            session.preview.rotationDegrees,
            session.target.initialRotationDegrees
          ) ||
          !areVec3Equal(session.preview.scale, session.target.initialScale))
      );
    case "pathPoint":
      return (
        session.preview.kind === "pathPoint" &&
        !areVec3Equal(
          session.preview.position,
          session.target.initialPosition
        )
      );
    case "entity":
      return (
        session.preview.kind === "entity" &&
        (!areVec3Equal(
          session.preview.position,
          session.target.initialPosition
        ) ||
          !areEntityTransformRotationsEqual(
            session.preview.rotation,
            session.target.initialRotation
          ))
      );
  }
}

export function getTransformOperationLabel(
  operation: TransformOperation
): string {
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

export function getTransformAxisSpaceLabel(
  axisSpace: TransformAxisSpace
): string {
  switch (axisSpace) {
    case "world":
      return "World";
    case "local":
      return "Local";
  }
}

export function getTransformTargetLabel(target: TransformTarget): string {
  switch (target.kind) {
    case "brush":
      return "Whitebox Box";
    case "brushFace":
      return `Whitebox Face (${BOX_FACE_LABELS[target.faceId]})`;
    case "brushEdge":
      return `Whitebox Edge (${BOX_EDGE_LABELS[target.edgeId]})`;
    case "brushVertex":
      return `Whitebox Vertex (${BOX_VERTEX_LABELS[target.vertexId]})`;
    case "modelInstance":
      return getModelInstanceKindLabel();
    case "pathPoint":
      return "Path Point";
    case "entity":
      return getEntityKindLabel(target.entityKind);
  }
}

export function getSupportedTransformOperations(
  target: TransformTarget
): TransformOperation[] {
  switch (target.kind) {
    case "brush":
    case "brushFace":
    case "brushEdge":
      return ["translate", "rotate", "scale"];
    case "brushVertex":
    case "pathPoint":
      return ["translate"];
    case "modelInstance":
      return ["translate", "rotate", "scale"];
    case "entity":
      return target.initialRotation.kind === "none"
        ? ["translate"]
        : ["translate", "rotate"];
  }
}

export function supportsTransformOperation(
  target: TransformTarget,
  operation: TransformOperation
): boolean {
  return getSupportedTransformOperations(target).includes(operation);
}

export function supportsTransformAxisConstraint(
  session: ActiveTransformSession,
  axis: TransformAxis
): boolean {
  switch (session.operation) {
    case "translate":
      return true;
    case "scale":
      if (
        session.target.kind === "modelInstance" ||
        session.target.kind === "brush"
      ) {
        return true;
      }

      if (
        session.target.kind === "brushVertex" ||
        session.target.kind === "pathPoint"
      ) {
        return false;
      }

      if (session.target.kind === "brushFace") {
        const normalAxis =
          session.target.faceId === "posX" || session.target.faceId === "negX"
            ? "x"
            : session.target.faceId === "posY" ||
                session.target.faceId === "negY"
              ? "y"
              : "z";
        return axis === normalAxis;
      }

      if (session.target.kind === "brushEdge") {
        if (session.target.edgeId.startsWith("edgeX_")) {
          return axis !== "x";
        }

        if (session.target.edgeId.startsWith("edgeY_")) {
          return axis !== "y";
        }

        return axis !== "z";
      }

      return false;
    case "rotate":
      if (
        session.target.kind === "entity" &&
        session.target.initialRotation.kind === "yaw"
      ) {
        return axis === "y";
      }

      if (session.target.kind === "brushFace") {
        const normalAxis =
          session.target.faceId === "posX" || session.target.faceId === "negX"
            ? "x"
            : session.target.faceId === "posY" ||
                session.target.faceId === "negY"
              ? "y"
              : "z";
        return axis === normalAxis;
      }

      if (session.target.kind === "brushEdge") {
        if (session.target.edgeId.startsWith("edgeX_")) {
          return axis === "x";
        }

        if (session.target.edgeId.startsWith("edgeY_")) {
          return axis === "y";
        }

        return axis === "z";
      }

      if (session.target.kind === "brushVertex") {
        return false;
      }

      return true;
  }
}

export function supportsLocalTransformAxisConstraint(
  session: ActiveTransformSession,
  axis: TransformAxis
): boolean {
  if (!supportsTransformAxisConstraint(session, axis)) {
    return false;
  }

  if (session.operation === "scale") {
    return false;
  }

  switch (session.target.kind) {
    case "brush":
    case "modelInstance":
      return true;
    case "entity":
      return session.target.initialRotation.kind !== "none";
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return session.operation === "translate";
    case "pathPoint":
      return false;
  }
}

function resolveEntityRotation(
  entity: EntityInstance
): EntityTransformRotationState {
  switch (entity.kind) {
    case "playerStart":
    case "sceneEntry":
    case "npc":
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
    case "sceneExit":
      return {
        kind: "none"
      };
  }
}

function createBrushTransformTarget(
  document: SceneDocument,
  brushId: string
): TransformTargetResolution {
  const brush = document.brushes[brushId];

  if (brush === undefined || brush.kind !== "box") {
    return {
      target: null,
      message: "Select a supported whitebox box before transforming it."
    };
  }

  return {
    target: {
      kind: "brush",
      brushId: brush.id,
      initialCenter: cloneVec3(brush.center),
      initialRotationDegrees: cloneVec3(brush.rotationDegrees),
      initialSize: cloneVec3(brush.size),
      initialGeometry: cloneBoxBrushGeometry(brush.geometry)
    },
    message: null
  };
}

function createBrushFaceTransformTarget(
  document: SceneDocument,
  brushId: string,
  faceId: BoxFaceId
): TransformTargetResolution {
  const brushResolution = createBrushTransformTarget(document, brushId);

  if (
    brushResolution.target === null ||
    brushResolution.target.kind !== "brush"
  ) {
    return brushResolution;
  }

  return {
    target: {
      kind: "brushFace",
      brushId,
      faceId,
      initialCenter: cloneVec3(brushResolution.target.initialCenter),
      initialRotationDegrees: cloneVec3(
        brushResolution.target.initialRotationDegrees
      ),
      initialSize: cloneVec3(brushResolution.target.initialSize),
      initialGeometry: cloneBoxBrushGeometry(
        brushResolution.target.initialGeometry
      )
    },
    message: null
  };
}

function createBrushEdgeTransformTarget(
  document: SceneDocument,
  brushId: string,
  edgeId: BoxEdgeId
): TransformTargetResolution {
  const brushResolution = createBrushTransformTarget(document, brushId);

  if (
    brushResolution.target === null ||
    brushResolution.target.kind !== "brush"
  ) {
    return brushResolution;
  }

  return {
    target: {
      kind: "brushEdge",
      brushId,
      edgeId,
      initialCenter: cloneVec3(brushResolution.target.initialCenter),
      initialRotationDegrees: cloneVec3(
        brushResolution.target.initialRotationDegrees
      ),
      initialSize: cloneVec3(brushResolution.target.initialSize),
      initialGeometry: cloneBoxBrushGeometry(
        brushResolution.target.initialGeometry
      )
    },
    message: null
  };
}

function createBrushVertexTransformTarget(
  document: SceneDocument,
  brushId: string,
  vertexId: BoxVertexId
): TransformTargetResolution {
  const brushResolution = createBrushTransformTarget(document, brushId);

  if (
    brushResolution.target === null ||
    brushResolution.target.kind !== "brush"
  ) {
    return brushResolution;
  }

  return {
    target: {
      kind: "brushVertex",
      brushId,
      vertexId,
      initialCenter: cloneVec3(brushResolution.target.initialCenter),
      initialRotationDegrees: cloneVec3(
        brushResolution.target.initialRotationDegrees
      ),
      initialSize: cloneVec3(brushResolution.target.initialSize),
      initialGeometry: cloneBoxBrushGeometry(
        brushResolution.target.initialGeometry
      )
    },
    message: null
  };
}

function createEntityTransformTarget(
  document: SceneDocument,
  entityId: string
): TransformTargetResolution {
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

function createModelInstanceTransformTarget(
  document: SceneDocument,
  modelInstanceId: string
): TransformTargetResolution {
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

function createPathPointTransformTarget(
  document: SceneDocument,
  pathId: string,
  pointId: string
): TransformTargetResolution {
  const path = document.paths[pathId];

  if (path === undefined) {
    return {
      target: null,
      message: "Select a path point before transforming it."
    };
  }

  const point = getScenePathPoint(path, pointId);

  if (point === null) {
    return {
      target: null,
      message: "Select a valid path point before transforming it."
    };
  }

  return {
    target: {
      kind: "pathPoint",
      pathId,
      pointId,
      initialPosition: cloneVec3(point.position)
    },
    message: null
  };
}

export function resolveTransformTarget(
  document: SceneDocument,
  selection: EditorSelection,
  whiteboxSelectionMode: WhiteboxSelectionMode = "object"
): TransformTargetResolution {
  switch (selection.kind) {
    case "none":
      return {
        target: null,
        message:
          "Select a single brush, path point, entity, or model instance before transforming it."
      };
    case "brushFace":
      if (whiteboxSelectionMode !== "face") {
        return {
          target: null,
          message: "Switch to Face mode to transform a selected whitebox face."
        };
      }

      return createBrushFaceTransformTarget(
        document,
        selection.brushId,
        selection.faceId
      );
    case "brushEdge":
      if (whiteboxSelectionMode !== "edge") {
        return {
          target: null,
          message: "Switch to Edge mode to transform a selected whitebox edge."
        };
      }

      return createBrushEdgeTransformTarget(
        document,
        selection.brushId,
        selection.edgeId
      );
    case "brushVertex":
      if (whiteboxSelectionMode !== "vertex") {
        return {
          target: null,
          message:
            "Switch to Vertex mode to transform a selected whitebox vertex."
        };
      }

      return createBrushVertexTransformTarget(
        document,
        selection.brushId,
        selection.vertexId
      );
    case "brushes":
      if (whiteboxSelectionMode !== "object") {
        return {
          target: null,
          message: "Switch to Object mode to transform the whole whitebox box."
        };
      }

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
    case "paths":
      return {
        target: null,
        message:
          "Select a path point before transforming a path."
      };
    case "pathPoint":
      return createPathPointTransformTarget(
        document,
        selection.pathId,
        selection.pointId
      );
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
