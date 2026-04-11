import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
import { createCreateSceneCommand } from "../commands/create-scene-command";
import { createDeleteBoxBrushCommand } from "../commands/delete-box-brush-command";
import { createDeleteEntityCommand } from "../commands/delete-entity-command";
import { createDuplicateSelectionCommand } from "../commands/duplicate-selection-command";
import { createImportAudioAssetCommand } from "../commands/import-audio-asset-command";
import { createImportBackgroundImageAssetCommand } from "../commands/import-background-image-asset-command";
import { createImportModelAssetCommand } from "../commands/import-model-asset-command";
import { createDeleteModelInstanceCommand } from "../commands/delete-model-instance-command";
import { createCommitTransformSessionCommand } from "../commands/commit-transform-session-command";
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createRotateBoxBrushCommand } from "../commands/rotate-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../commands/set-box-brush-face-material-command";
import { createSetBoxBrushNameCommand } from "../commands/set-box-brush-name-command";
import { createSetBoxBrushVolumeSettingsCommand } from "../commands/set-box-brush-volume-settings-command";
import { createSetEntityNameCommand } from "../commands/set-entity-name-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createSetActiveSceneCommand } from "../commands/set-active-scene-command";
import { createDeleteInteractionLinkCommand } from "../commands/delete-interaction-link-command";
import { createSetModelInstanceNameCommand } from "../commands/set-model-instance-name-command";
import { createSetProjectNameCommand } from "../commands/set-project-name-command";
import { createSetSceneLoadingScreenCommand } from "../commands/set-scene-loading-screen-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import { createSetWorldSettingsCommand } from "../commands/set-world-settings-command";
import { createUpsertEntityCommand } from "../commands/upsert-entity-command";
import { createUpsertModelInstanceCommand } from "../commands/upsert-model-instance-command";
import { createUpsertInteractionLinkCommand } from "../commands/upsert-interaction-link-command";
import {
  getSelectedBrushEdgeId,
  getSelectedBrushFaceId,
  getSelectedBrushVertexId,
  getSingleSelectedBrushId,
  getSingleSelectedEntityId,
  getSingleSelectedModelInstanceId,
  isBrushFaceSelected,
  isBrushSelected,
  type EditorSelection
} from "../core/selection";
import {
  createTransformSession,
  doesTransformSessionChangeTarget,
  getTransformAxisLabel,
  getTransformAxisSpaceLabel,
  getTransformOperationLabel,
  getTransformTargetLabel,
  resolveTransformTarget,
  supportsLocalTransformAxisConstraint,
  supportsTransformAxisConstraint,
  supportsTransformOperation,
  type ActiveTransformSession,
  type TransformAxis,
  type TransformOperation,
  type TransformSessionSource
} from "../core/transform-session";
import type { Vec2, Vec3 } from "../core/vector";
import {
  MODEL_INSTANCE_COLLISION_MODES,
  areModelInstancesEqual,
  createModelInstance,
  createModelInstancePlacementPosition,
  DEFAULT_MODEL_INSTANCE_POSITION,
  DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
  DEFAULT_MODEL_INSTANCE_SCALE,
  normalizeModelInstanceName,
  type ModelInstance,
  type ModelInstanceCollisionMode
} from "../assets/model-instances";
import {
  getModelInstanceDisplayLabelById,
  getSortedModelInstanceDisplayLabels
} from "../assets/model-instance-labels";
import {
  importAudioAssetFromFile,
  loadAudioAssetFromStorage,
  type LoadedAudioAsset
} from "../assets/audio-assets";
import {
  importModelAssetFromFile,
  importModelAssetFromFiles,
  loadModelAssetFromStorage,
  disposeModelTemplate,
  type ImportedModelAssetResult,
  type LoadedModelAsset
} from "../assets/gltf-model-import";
import {
  importBackgroundImageAssetFromFile,
  loadImageAssetFromStorage,
  disposeLoadedImageAsset,
  type ImportedImageAssetResult,
  type LoadedImageAsset
} from "../assets/image-assets";
import type {
  AudioAssetRecord,
  ImageAssetRecord,
  ModelAssetRecord,
  ProjectAssetRecord
} from "../assets/project-assets";
import { getProjectAssetKindLabel } from "../assets/project-assets";
import {
  getWhiteboxSelectionModeLabel,
  type WhiteboxSelectionMode
} from "../core/whitebox-selection-mode";
import {
  BOX_BRUSH_VOLUME_MODES,
  BOX_EDGE_LABELS,
  BOX_FACE_IDS,
  BOX_FACE_LABELS,
  BOX_VERTEX_LABELS,
  DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
  DEFAULT_BOX_BRUSH_CENTER,
  DEFAULT_BOX_BRUSH_ROTATION_DEGREES,
  DEFAULT_BOX_BRUSH_SIZE,
  MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
  createDefaultFaceUvState,
  normalizeBrushName,
  type BoxBrush,
  type BoxBrushVolumeMode,
  type FaceUvRotationQuarterTurns,
  type FaceUvState
} from "../document/brushes";
import {
  ADVANCED_RENDERING_WATER_REFLECTION_MODES,
  BOX_VOLUME_RENDER_PATHS,
  ADVANCED_RENDERING_SHADOW_MAP_SIZES,
  ADVANCED_RENDERING_SHADOW_TYPES,
  ADVANCED_RENDERING_TONE_MAPPING_MODES,
  areWorldSettingsEqual,
  changeWorldBackgroundMode,
  cloneWorldSettings,
  type WorldBackgroundMode,
  type AdvancedRenderingSettings,
  type BoxVolumeRenderPath,
  type AdvancedRenderingWaterReflectionMode,
  type AdvancedRenderingShadowMapSize,
  type AdvancedRenderingShadowType,
  type AdvancedRenderingToneMappingMode,
  type WorldSettings
} from "../document/world-settings";
import {
  areSceneLoadingScreenSettingsEqual,
  cloneSceneLoadingScreenSettings,
  createSceneDocumentFromProject,
  DEFAULT_PROJECT_NAME,
  type SceneLoadingScreenSettings
} from "../document/scene-document";
import {
  formatSceneDiagnosticSummary,
  validateProjectDocument,
  validateSceneDocument
} from "../document/scene-document-validation";
import {
  getBrowserProjectAssetStorageAccess,
  type ProjectAssetStorage
} from "../assets/project-asset-storage";
import {
  DEFAULT_GRID_SIZE,
  snapPositiveSizeToGrid,
  snapVec3ToGrid
} from "../geometry/grid-snapping";
import { createFitToFaceBoxBrushFaceUvState } from "../geometry/box-face-uvs";
import {
  DEFAULT_ENTITY_POSITION,
  DEFAULT_INTERACTABLE_PROMPT,
  DEFAULT_INTERACTABLE_RADIUS,
  DEFAULT_POINT_LIGHT_COLOR_HEX,
  DEFAULT_POINT_LIGHT_DISTANCE,
  DEFAULT_POINT_LIGHT_INTENSITY,
  DEFAULT_PLAYER_START_BOX_SIZE,
  DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
  DEFAULT_PLAYER_START_CAPSULE_RADIUS,
  DEFAULT_PLAYER_START_EYE_HEIGHT,
  DEFAULT_PLAYER_START_NAVIGATION_MODE,
  PLAYER_START_MOVEMENT_TEMPLATE_KINDS,
  DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID,
  DEFAULT_SOUND_EMITTER_VOLUME,
  DEFAULT_SCENE_ENTRY_YAW_DEGREES,
  DEFAULT_SCENE_EXIT_PROMPT,
  DEFAULT_SCENE_EXIT_RADIUS,
  DEFAULT_SOUND_EMITTER_REF_DISTANCE,
  DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
  DEFAULT_TELEPORT_TARGET_YAW_DEGREES,
  PLAYER_START_COLLIDER_MODES,
  PLAYER_START_GAMEPAD_ACTION_BINDINGS,
  PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS,
  PLAYER_START_GAMEPAD_BINDINGS,
  PLAYER_START_LOCOMOTION_ACTIONS,
  PLAYER_START_MOVEMENT_ACTIONS,
  PLAYER_START_NAVIGATION_MODES,
  DEFAULT_SPOT_LIGHT_ANGLE_DEGREES,
  DEFAULT_SPOT_LIGHT_COLOR_HEX,
  DEFAULT_SPOT_LIGHT_DISTANCE,
  DEFAULT_SPOT_LIGHT_DIRECTION,
  DEFAULT_SPOT_LIGHT_INTENSITY,
  DEFAULT_TRIGGER_VOLUME_SIZE,
  areEntityInstancesEqual,
  clonePlayerStartInputBindings,
  clonePlayerStartMovementTemplate,
  createInteractableEntity,
  createPointLightEntity,
  inferPlayerStartMovementTemplateKind,
  createPlayerStartInputBindings,
  createPlayerStartMovementTemplate,
  createPlayerStartEntity,
  createSceneEntryEntity,
  createSceneExitEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity,
  getEntityInstances,
  getEntityKindLabel,
  getPrimaryPlayerStartEntity,
  normalizeEntityName,
  normalizeYawDegrees,
  normalizeInteractablePrompt,
  type PlayerStartGamepadActionBinding,
  type PlayerStartGamepadCameraLookBinding,
  type PlayerStartColliderMode,
  type PlayerStartGamepadBinding,
  type PlayerStartInputAction,
  type PlayerStartInputBindings,
  type PlayerStartKeyboardBindingCode,
  type PlayerStartLocomotionAction,
  type PlayerStartMovementAction,
  type PlayerStartMovementTemplate,
  type PlayerStartNavigationMode,
  type EntityInstance,
  type EntityKind
} from "../entities/entity-instances";
import {
  getEntityDisplayLabelById,
  getSortedEntityDisplayLabels
} from "../entities/entity-labels";
import {
  areInteractionLinksEqual,
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createStopAnimationInteractionLink,
  createStopSoundInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink,
  getInteractionLinksForSource,
  type InteractionLink,
  type InteractionTriggerKind
} from "../interactions/interaction-links";
import {
  STARTER_MATERIAL_LIBRARY,
  type MaterialDef
} from "../materials/starter-material-library";
import { RunnerCanvas } from "../runner-web/RunnerCanvas";
import type {
  FirstPersonTelemetry,
  RuntimeLocomotionState
} from "../runtime-three/navigation-controller";
import type { RuntimeInteractionPrompt } from "../runtime-three/runtime-interaction-system";
import { createDefaultRuntimeGlobalState, type RuntimeGlobalState } from "../runtime-three/runtime-global-state";
import type { RuntimeSceneExitTransitionRequest } from "../runtime-three/runtime-host";
import {
  buildRuntimeSceneFromDocument,
  type RuntimeNavigationMode,
  type RuntimeSceneDefinition
} from "../runtime-three/runtime-scene-build";
import { validateRuntimeSceneBuild } from "../runtime-three/runtime-scene-validation";
import { EditorAutosaveController } from "../serialization/editor-autosave";
import { Panel } from "../shared-ui/Panel";
import {
  loadProjectPackage,
  PROJECT_PACKAGE_FILE_EXTENSION,
  saveProjectPackage
} from "../serialization/project-package";
import {
  HierarchicalMenu,
  type HierarchicalMenuItem,
  type HierarchicalMenuPosition
} from "../shared-ui/HierarchicalMenu";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import { ViewportPanel } from "../viewport-three/ViewportPanel";
import type { CreationViewportToolPreview } from "../viewport-three/viewport-transient-state";
import {
  getViewportViewModeLabel,
  type ViewportViewMode
} from "../viewport-three/viewport-view-modes";
import {
  VIEWPORT_PANEL_IDS,
  getViewportDisplayModeLabel,
  getViewportLayoutModeLabel,
  getViewportPanelLabel,
  type ViewportDisplayMode,
  type ViewportLayoutMode,
  type ViewportPanelId,
  type ViewportQuadSplit
} from "../viewport-three/viewport-layout";
import type { EditorStore } from "./editor-store";
import { useEditorStoreState } from "./use-editor-store";

interface AppProps {
  store: EditorStore;
  initialStatusMessage?: string;
}

interface Vec2Draft {
  x: string;
  y: string;
}

interface Vec3Draft {
  x: string;
  y: string;
  z: string;
}

interface PlayerStartMovementTemplateNumberDraft {
  moveSpeed: string;
  maxSpeed: string;
  jumpSpeed: string;
  jumpBufferMs: string;
  coyoteTimeMs: string;
  variableJumpMaxHoldMs: string;
  bunnyHopBoost: string;
  sprintSpeedMultiplier: string;
  crouchSpeedMultiplier: string;
}

type InteractionSourceEntity = Extract<
  EntityInstance,
  { kind: "triggerVolume" | "interactable" }
>;

function getModelInstanceCollisionModeDescription(
  mode: ModelInstanceCollisionMode
): string {
  switch (mode) {
    case "none":
      return "No generated collider is built for this model instance.";
    case "terrain":
      return "Builds a Rapier heightfield from a regular-grid terrain mesh. Unsupported terrain sources fail with build diagnostics.";
    case "static":
      return "Builds a fixed Rapier triangle-mesh collider from the imported model geometry.";
    case "static-simple":
      return "Builds a fixed compound collider by voxel-boxifying the imported mesh surface into merged structural slabs.";
    case "dynamic":
      return "Builds convex compound pieces for Rapier queries. In this slice they participate as fixed world collision, not fully simulated rigid bodies.";
    case "simple":
      return "Builds one cheap oriented box from the imported model bounds.";
  }
}

function getPlayerStartColliderModeDescription(
  mode: PlayerStartColliderMode
): string {
  switch (mode) {
    case "capsule":
      return "Uses a capsule player collider for standard grounded first-person traversal.";
    case "box":
      return "Uses an axis-aligned box player collider for sharper footprint bounds.";
    case "none":
      return "Disables player collision detection. First-person traversal continues without world clipping.";
  }
}

function getPlayerStartMovementTemplateLabel(
  kind: PlayerStartMovementTemplate["kind"]
): string {
  switch (kind) {
    case "default":
      return "Default";
    case "responsive":
      return "Responsive";
    case "custom":
      return "Custom";
  }
}

function getPlayerStartMovementTemplateDescription(
  kind: PlayerStartMovementTemplate["kind"]
): string {
  switch (kind) {
    case "default":
      return "Shared movement basis for First Person and Third Person with real jump, sprint, and crouch support on the runtime controller path.";
    case "responsive":
      return "Adds authored jump assists like jump buffering, coyote time, and variable jump height while keeping the same core movement basis.";
    case "custom":
      return "Uses the exact authored movement settings from the controls below.";
  }
}

function getPlayerStartInputActionLabel(
  action: PlayerStartInputAction
): string {
  switch (action) {
    case "moveForward":
      return "Forward";
    case "moveBackward":
      return "Backward";
    case "moveLeft":
      return "Left";
    case "moveRight":
      return "Right";
    case "jump":
      return "Jump";
    case "sprint":
      return "Sprint";
    case "crouch":
      return "Crouch";
  }
}

function formatPlayerStartKeyboardBindingLabel(
  code: PlayerStartKeyboardBindingCode
): string {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }

  switch (code) {
    case "ArrowUp":
      return "Arrow Up";
    case "ArrowLeft":
      return "Arrow Left";
    case "ArrowDown":
      return "Arrow Down";
    case "ArrowRight":
      return "Arrow Right";
    case "Space":
      return "Space";
    case "Tab":
      return "Tab";
    case "Enter":
      return "Enter";
    case "Backspace":
      return "Backspace";
    case "Escape":
      return "Escape";
    default:
      return code.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
}

function formatPlayerStartGamepadBindingLabel(
  binding: PlayerStartGamepadBinding
): string {
  switch (binding) {
    case "leftStickUp":
      return "Left Stick Up";
    case "leftStickDown":
      return "Left Stick Down";
    case "leftStickLeft":
      return "Left Stick Left";
    case "leftStickRight":
      return "Left Stick Right";
    case "dpadUp":
      return "D-Pad Up";
    case "dpadDown":
      return "D-Pad Down";
    case "dpadLeft":
      return "D-Pad Left";
    case "dpadRight":
      return "D-Pad Right";
  }
}

function formatPlayerStartGamepadActionBindingLabel(
  binding: PlayerStartGamepadActionBinding
): string {
  switch (binding) {
    case "buttonSouth":
      return "South Button";
    case "buttonEast":
      return "East Button";
    case "buttonWest":
      return "West Button";
    case "buttonNorth":
      return "North Button";
    case "leftShoulder":
      return "Left Shoulder";
    case "rightShoulder":
      return "Right Shoulder";
    case "leftTrigger":
      return "Left Trigger";
    case "rightTrigger":
      return "Right Trigger";
    case "leftStickPress":
      return "Left Stick Press";
    case "rightStickPress":
      return "Right Stick Press";
  }
}

function formatPlayerStartGamepadCameraLookBindingLabel(
  binding: PlayerStartGamepadCameraLookBinding
): string {
  switch (binding) {
    case "rightStick":
      return "Right Stick";
  }
}

const STARTER_MATERIAL_ORDER = new Map(
  STARTER_MATERIAL_LIBRARY.map((material, index) => [material.id, index])
);
const MIN_VIEWPORT_QUAD_SPLIT = 0.2;
const MAX_VIEWPORT_QUAD_SPLIT = 0.8;

type ViewportQuadResizeMode = "vertical" | "horizontal" | "center";
type NumberInputStep = number | "any";

function formatVec3(vector: Vec3): string {
  return `${vector.x}, ${vector.y}, ${vector.z}`;
}

function resolveOptionalPositiveNumber(
  value: string,
  fallback: number
): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function getWhiteboxInputStep(enabled: boolean, step: number): NumberInputStep {
  return enabled ? step : "any";
}

function formatDiagnosticCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function clampViewportQuadSplitValue(value: number): number {
  return Math.min(
    MAX_VIEWPORT_QUAD_SPLIT,
    Math.max(MIN_VIEWPORT_QUAD_SPLIT, value)
  );
}

function createViewportQuadPanelsStyle(
  viewportQuadSplit: ViewportQuadSplit
): CSSProperties {
  return {
    "--viewport-quad-split-x": String(viewportQuadSplit.x),
    "--viewport-quad-split-y": String(viewportQuadSplit.y)
  } as CSSProperties;
}

function getViewportQuadResizeCursor(
  resizeMode: ViewportQuadResizeMode
): string {
  switch (resizeMode) {
    case "vertical":
      return "col-resize";
    case "horizontal":
      return "row-resize";
    case "center":
      return "move";
  }
}

function createVec2Draft(vector: Vec2): Vec2Draft {
  return {
    x: String(vector.x),
    y: String(vector.y)
  };
}

function createVec3Draft(vector: Vec3): Vec3Draft {
  return {
    x: String(vector.x),
    y: String(vector.y),
    z: String(vector.z)
  };
}

function createPlayerStartMovementTemplateNumberDraft(
  template: PlayerStartMovementTemplate
): PlayerStartMovementTemplateNumberDraft {
  return {
    moveSpeed: String(template.moveSpeed),
    maxSpeed: String(template.maxSpeed),
    jumpSpeed: String(template.jump.speed),
    jumpBufferMs: String(template.jump.bufferMs),
    coyoteTimeMs: String(template.jump.coyoteTimeMs),
    variableJumpMaxHoldMs: String(template.jump.maxHoldMs),
    bunnyHopBoost: String(template.jump.bunnyHopBoost),
    sprintSpeedMultiplier: String(template.sprint.speedMultiplier),
    crouchSpeedMultiplier: String(template.crouch.speedMultiplier)
  };
}

function readVec2Draft(draft: Vec2Draft, label: string): Vec2 {
  const vector = {
    x: Number(draft.x),
    y: Number(draft.y)
  };

  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new Error(`${label} values must be finite numbers.`);
  }

  return vector;
}

function readPositiveVec2Draft(draft: Vec2Draft, label: string): Vec2 {
  const vector = readVec2Draft(draft, label);

  if (vector.x <= 0 || vector.y <= 0) {
    throw new Error(`${label} values must remain positive.`);
  }

  return vector;
}

function readPositiveVec3Draft(draft: Vec3Draft, label: string): Vec3 {
  const vector = readVec3Draft(draft, label);

  if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
    throw new Error(`${label} values must remain positive.`);
  }

  return vector;
}

function readVec3Draft(draft: Vec3Draft, label: string): Vec3 {
  const vector = {
    x: Number(draft.x),
    y: Number(draft.y),
    z: Number(draft.z)
  };

  if (
    !Number.isFinite(vector.x) ||
    !Number.isFinite(vector.y) ||
    !Number.isFinite(vector.z)
  ) {
    throw new Error(`${label} values must be finite numbers.`);
  }

  return vector;
}

function readYawDegreesDraft(source: string): number {
  const yawDegrees = Number(source);

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Player start yaw must be a finite number.");
  }

  return normalizeYawDegrees(yawDegrees);
}

function readInteractablePromptDraft(source: string): string {
  return normalizeInteractablePrompt(source);
}

function readNonNegativeNumberDraft(source: string, label: string): number {
  const value = Number(source);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${label} must be a finite number greater than or equal to zero.`
    );
  }

  return value;
}

function readFiniteNumberDraft(source: string, label: string): number {
  const value = Number(source);

  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function readPositiveIntegerDraft(source: string, label: string): number {
  const value = Number(source);

  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function readWaterFoamContactLimitDraft(source: string): number {
  const value = readPositiveIntegerDraft(source, "Water foam contact limit");

  if (value > MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT) {
    throw new Error(
      `Water foam contact limit must be ${MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT} or less.`
    );
  }

  return value;
}

function readPositiveNumberDraft(source: string, label: string): number {
  const value = Number(source);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than zero.`);
  }

  return value;
}

function areVec2Equal(left: Vec2, right: Vec2): boolean {
  return left.x === right.x && left.y === right.y;
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function maybeSnapVec3(vector: Vec3, enabled: boolean, step: number): Vec3 {
  if (!enabled) {
    return vector;
  }

  return {
    x: Math.round(vector.x / step) * step,
    y: Math.round(vector.y / step) * step,
    z: Math.round(vector.z / step) * step
  };
}

function maybeSnapPositiveSize(
  size: Vec3,
  enabled: boolean,
  step: number
): Vec3 {
  const clampComponent = (value: number) => Math.max(0.01, Math.abs(value));

  if (!enabled) {
    return {
      x: clampComponent(size.x),
      y: clampComponent(size.y),
      z: clampComponent(size.z)
    };
  }

  return {
    x: Math.max(0.01, Math.round(Math.abs(size.x) / step) * step),
    y: Math.max(0.01, Math.round(Math.abs(size.y) / step) * step),
    z: Math.max(0.01, Math.round(Math.abs(size.z) / step) * step)
  };
}

function areFaceUvStatesEqual(left: FaceUvState, right: FaceUvState): boolean {
  return (
    areVec2Equal(left.offset, right.offset) &&
    areVec2Equal(left.scale, right.scale) &&
    left.rotationQuarterTurns === right.rotationQuarterTurns &&
    left.flipU === right.flipU &&
    left.flipV === right.flipV
  );
}

function getSelectedBoxBrush(
  selection: EditorSelection,
  brushes: BoxBrush[]
): BoxBrush | null {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return null;
  }

  return brushes.find((brush) => brush.id === selectedBrushId) ?? null;
}

function getSelectedEntity(
  selection: EditorSelection,
  entities: EntityInstance[]
): EntityInstance | null {
  const selectedEntityId = getSingleSelectedEntityId(selection);

  if (selectedEntityId === null) {
    return null;
  }

  return entities.find((entity) => entity.id === selectedEntityId) ?? null;
}

function getSelectedModelInstance(
  selection: EditorSelection,
  modelInstances: ModelInstance[]
): ModelInstance | null {
  const selectedModelInstanceId = getSingleSelectedModelInstanceId(selection);

  if (selectedModelInstanceId === null) {
    return null;
  }

  return (
    modelInstances.find(
      (modelInstance) => modelInstance.id === selectedModelInstanceId
    ) ?? null
  );
}

function isModelAsset(asset: ProjectAssetRecord): asset is ModelAssetRecord {
  return asset.kind === "model";
}

function isImageAsset(asset: ProjectAssetRecord): asset is ImageAssetRecord {
  return asset.kind === "image";
}

function isAudioAsset(asset: ProjectAssetRecord): asset is AudioAssetRecord {
  return asset.kind === "audio";
}

function formatByteLength(byteLength: number): string {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  const kilobytes = byteLength / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function formatModelBoundingBoxLabel(asset: ModelAssetRecord): string {
  if (asset.metadata.boundingBox === null) {
    return "Bounds unavailable";
  }

  const { size } = asset.metadata.boundingBox;

  return `Bounds ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m`;
}

function formatModelAssetSummary(asset: ModelAssetRecord): string {
  const details = [
    asset.metadata.format.toUpperCase(),
    formatByteLength(asset.byteLength),
    `${asset.metadata.meshCount} mesh${asset.metadata.meshCount === 1 ? "" : "es"}`,
    `${asset.metadata.materialNames.length} material${asset.metadata.materialNames.length === 1 ? "" : "s"}`,
    `${asset.metadata.textureNames.length} texture${asset.metadata.textureNames.length === 1 ? "" : "s"}`
  ];

  if (asset.metadata.animationNames.length > 0) {
    details.push(
      `${asset.metadata.animationNames.length} animation${asset.metadata.animationNames.length === 1 ? "" : "s"}`
    );
  }

  return details.join(" | ");
}

function formatImageAssetSummary(asset: ImageAssetRecord): string {
  const details = [
    `${asset.metadata.width} x ${asset.metadata.height}`,
    asset.metadata.hasAlpha ? "alpha" : "opaque",
    formatByteLength(asset.byteLength)
  ];

  return details.join(" | ");
}

function formatAudioAssetSummary(asset: AudioAssetRecord): string {
  const details = [
    asset.metadata.durationSeconds === null
      ? "duration unavailable"
      : `${asset.metadata.durationSeconds.toFixed(2)}s`,
    asset.metadata.channelCount === null
      ? "channels unavailable"
      : `${asset.metadata.channelCount} channel${asset.metadata.channelCount === 1 ? "" : "s"}`,
    asset.metadata.sampleRateHz === null
      ? "sample rate unavailable"
      : `${asset.metadata.sampleRateHz} Hz`,
    formatByteLength(asset.byteLength)
  ];

  return details.join(" | ");
}

function formatAssetHoverStatus(asset: ProjectAssetRecord): string {
  const details = [
    `${getProjectAssetKindLabel(asset.kind)} asset`,
    asset.mimeType,
    asset.kind === "model"
      ? formatModelAssetSummary(asset)
      : asset.kind === "image"
        ? formatImageAssetSummary(asset)
        : formatAudioAssetSummary(asset),
    `Storage key: ${asset.storageKey}`
  ];

  if (asset.kind === "model") {
    details.push(formatModelBoundingBoxLabel(asset));
  }

  if (asset.metadata.warnings.length > 0) {
    details.push(`Warnings: ${asset.metadata.warnings.join(" | ")}`);
  }

  return `${asset.sourceName} | ${details.join(" | ")}`;
}

function getBrushLabel(brush: BoxBrush, index: number): string {
  return brush.name ?? `Whitebox Box ${index + 1}`;
}

function getBrushLabelById(brushId: string, brushes: BoxBrush[]): string {
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);
  return brushIndex === -1
    ? "Whitebox Box"
    : getBrushLabel(brushes[brushIndex], brushIndex);
}

function getSelectedBrushLabel(
  selection: EditorSelection,
  brushes: BoxBrush[]
): string {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return "No solid selected";
  }

  return getBrushLabelById(selectedBrushId, brushes);
}

function describeSelection(
  selection: EditorSelection,
  brushes: BoxBrush[],
  modelInstances: Record<string, ModelInstance>,
  assets: Record<string, ProjectAssetRecord>,
  entities: Record<string, EntityInstance>
): string {
  switch (selection.kind) {
    case "none":
      return "No authored selection";
    case "brushes":
      return `${selection.ids.length} solid${selection.ids.length === 1 ? "" : "s"} selected (${getSelectedBrushLabel(selection, brushes)})`;
    case "brushFace":
      return `1 face selected (${BOX_FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "brushEdge":
      return `1 edge selected (${BOX_EDGE_LABELS[selection.edgeId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "brushVertex":
      return `1 vertex selected (${BOX_VERTEX_LABELS[selection.vertexId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "entities":
      return `${selection.ids.length} entity selected (${getEntityDisplayLabelById(selection.ids[0], entities, assets)})`;
    case "modelInstances":
      return `${selection.ids.length} model instance${selection.ids.length === 1 ? "" : "s"} selected (${getModelInstanceDisplayLabelById(selection.ids[0], modelInstances, assets)})`;
    default:
      return "Unknown selection";
  }
}

function getWhiteboxSelectionModeStatus(mode: WhiteboxSelectionMode): string {
  switch (mode) {
    case "object":
      return "Whitebox selection mode set to Object. Whole-solid transforms are available.";
    case "face":
      return "Whitebox selection mode set to Face. Click a face to edit materials and UVs.";
    case "edge":
      return "Whitebox selection mode set to Edge. Edge transforms land in the next slice.";
    case "vertex":
      return "Whitebox selection mode set to Vertex. Vertex transforms land in the next slice.";
  }
}

function getInteractionTriggerLabel(trigger: InteractionTriggerKind): string {
  switch (trigger) {
    case "enter":
      return "On Enter";
    case "exit":
      return "On Exit";
    case "click":
      return "On Click";
  }
}

function getInteractionActionLabel(link: InteractionLink): string {
  switch (link.action.type) {
    case "teleportPlayer":
      return "Teleport Player";
    case "toggleVisibility":
      return "Toggle Visibility";
    case "playAnimation":
      return "Play Animation";
    case "stopAnimation":
      return "Stop Animation";
    case "playSound":
      return "Play Sound";
    case "stopSound":
      return "Stop Sound";
  }
}

function getVisibilityModeSelectValue(
  visible: boolean | undefined
): "toggle" | "show" | "hide" {
  if (visible === true) {
    return "show";
  }

  if (visible === false) {
    return "hide";
  }

  return "toggle";
}

function readVisibilityModeSelectValue(
  value: "toggle" | "show" | "hide"
): boolean | undefined {
  switch (value) {
    case "toggle":
      return undefined;
    case "show":
      return true;
    case "hide":
      return false;
  }
}

function getDefaultTriggerVolumeLinkTrigger(
  triggerOnEnter: boolean,
  triggerOnExit: boolean
): InteractionTriggerKind {
  if (triggerOnEnter) {
    return "enter";
  }

  if (triggerOnExit) {
    return "exit";
  }

  return "enter";
}

function isInteractionSourceEntity(
  entity: EntityInstance | null
): entity is InteractionSourceEntity {
  return (
    entity !== null &&
    (entity.kind === "triggerVolume" || entity.kind === "interactable")
  );
}

function isSoundEmitterEntity(
  entity: EntityInstance | null
): entity is Extract<EntityInstance, { kind: "soundEmitter" }> {
  return entity !== null && entity.kind === "soundEmitter";
}

function getDefaultInteractionLinkTrigger(
  sourceEntity: InteractionSourceEntity
): InteractionTriggerKind {
  return sourceEntity.kind === "triggerVolume"
    ? getDefaultTriggerVolumeLinkTrigger(
        sourceEntity.triggerOnEnter,
        sourceEntity.triggerOnExit
      )
    : "click";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function selectionCanBeDuplicated(selection: EditorSelection): boolean {
  switch (selection.kind) {
    case "brushes":
    case "entities":
    case "modelInstances":
      return selection.ids.length > 0;
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return true;
    case "none":
      return false;
  }
}

function isCommitIncrementKey(key: string): boolean {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "PageUp" ||
    key === "PageDown"
  );
}

function blurActiveTextEntry() {
  const activeElement = document.activeElement;

  if (
    !(activeElement instanceof HTMLElement) ||
    !isTextEntryTarget(activeElement)
  ) {
    return;
  }

  activeElement.blur();
}

function sortDocumentMaterials(
  materials: Record<string, MaterialDef>
): MaterialDef[] {
  return Object.values(materials).sort((left, right) => {
    const leftStarterIndex =
      STARTER_MATERIAL_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightStarterIndex =
      STARTER_MATERIAL_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftStarterIndex !== rightStarterIndex) {
      return leftStarterIndex - rightStarterIndex;
    }

    return left.name.localeCompare(right.name);
  });
}

function getMaterialPreviewStyle(material: MaterialDef): CSSProperties {
  switch (material.pattern) {
    case "grid":
      return {
        backgroundColor: material.baseColorHex,
        backgroundImage: `linear-gradient(${material.accentColorHex} 2px, transparent 2px), linear-gradient(90deg, ${material.accentColorHex} 2px, transparent 2px)`,
        backgroundSize: "18px 18px"
      };
    case "checker":
      return {
        backgroundColor: material.baseColorHex,
        backgroundImage: `linear-gradient(45deg, ${material.accentColorHex} 25%, transparent 25%, transparent 75%, ${material.accentColorHex} 75%, ${material.accentColorHex}), linear-gradient(45deg, ${material.accentColorHex} 25%, transparent 25%, transparent 75%, ${material.accentColorHex} 75%, ${material.accentColorHex})`,
        backgroundPosition: "0 0, 9px 9px",
        backgroundSize: "18px 18px"
      };
    case "stripes":
      return {
        backgroundColor: material.baseColorHex,
        backgroundImage: `repeating-linear-gradient(135deg, ${material.accentColorHex} 0 9px, transparent 9px 18px)`
      };
    case "diamond":
      return {
        backgroundColor: material.baseColorHex,
        backgroundImage: `linear-gradient(45deg, ${material.accentColorHex} 12%, transparent 12%, transparent 88%, ${material.accentColorHex} 88%), linear-gradient(-45deg, ${material.accentColorHex} 12%, transparent 12%, transparent 88%, ${material.accentColorHex} 88%)`,
        backgroundSize: "22px 22px"
      };
  }
}

function rotateQuarterTurns(
  rotationQuarterTurns: FaceUvRotationQuarterTurns
): FaceUvRotationQuarterTurns {
  return ((rotationQuarterTurns + 1) % 4) as FaceUvRotationQuarterTurns;
}

function getTransformOperationPastTense(operation: TransformOperation): string {
  switch (operation) {
    case "translate":
      return "Moved";
    case "rotate":
      return "Rotated";
    case "scale":
      return "Scaled";
  }
}

function formatRunnerFeetPosition(position: Vec3 | null): string {
  if (position === null) {
    return "n/a";
  }

  return `${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`;
}

function formatRunnerLocomotionMode(
  locomotionState: RuntimeLocomotionState | undefined
): string {
  switch (locomotionState?.locomotionMode) {
    case "grounded":
      return "Grounded";
    case "airborne":
      return "Airborne";
    case "flying":
      return "Flying";
    case "swimming":
      return "Swimming";
    default:
      return "n/a";
  }
}

function formatRunnerGait(
  locomotionState: RuntimeLocomotionState | undefined
): string {
  switch (locomotionState?.gait) {
    case "idle":
      return "Idle";
    case "walk":
      return "Walk";
    case "sprint":
      return "Sprint";
    case "crouch":
      return "Crouch";
    default:
      return "n/a";
  }
}

function formatRunnerAirborneKind(
  locomotionState: RuntimeLocomotionState | undefined
): string {
  switch (locomotionState?.airborneKind) {
    case "jumping":
      return "Jumping";
    case "falling":
      return "Falling";
    case null:
    case undefined:
      return "n/a";
  }
}

function formatRunnerGroundContact(
  locomotionState: RuntimeLocomotionState | undefined
): string {
  if (locomotionState?.contact.groundNormal === null) {
    return "No ground";
  }

  if (locomotionState === undefined) {
    return "n/a";
  }

  const slope = locomotionState.contact.slopeDegrees;
  const distance = locomotionState.contact.groundDistance;

  return `${slope === null ? "?" : slope.toFixed(1)} deg @ ${distance === null ? "?" : distance.toFixed(2)}m`;
}

function formatRunnerMovementSignals(
  telemetry: FirstPersonTelemetry | null
): string {
  if (telemetry === null) {
    return "n/a";
  }

  const activeSignals: string[] = [];

  if (telemetry.signals.jumpStarted) {
    activeSignals.push("jump");
  }

  if (telemetry.signals.leftGround) {
    activeSignals.push("left ground");
  }

  if (telemetry.signals.startedFalling) {
    activeSignals.push("fall");
  }

  if (telemetry.signals.landed) {
    activeSignals.push("land");
  }

  if (telemetry.signals.enteredWater) {
    activeSignals.push("enter water");
  }

  if (telemetry.signals.exitedWater) {
    activeSignals.push("exit water");
  }

  if (telemetry.signals.wallContactStarted) {
    activeSignals.push("wall");
  }

  if (telemetry.signals.headBump) {
    activeSignals.push("head bump");
  }

  return activeSignals.length > 0 ? activeSignals.join(", ") : "none";
}

function formatRunnerAudioHook(telemetry: FirstPersonTelemetry | null): string {
  if (telemetry === null) {
    return "n/a";
  }

  const underwaterAmount = telemetry.hooks.audio.underwaterAmount;

  if (underwaterAmount >= 0.99) {
    return "submerged";
  }

  if (underwaterAmount <= 0.01) {
    return "dry";
  }

  return `wet ${underwaterAmount.toFixed(2)}`;
}

function formatRunnerAnimationHook(
  telemetry: FirstPersonTelemetry | null
): string {
  if (telemetry === null) {
    return "n/a";
  }

  const animationHook = telemetry.hooks.animation;

  if (animationHook.locomotionMode === "airborne") {
    return animationHook.airborneKind === "jumping" ? "jump" : "fall";
  }

  if (animationHook.locomotionMode === "swimming") {
    return `swim ${animationHook.movementAmount.toFixed(2)}`;
  }

  return animationHook.moving
    ? `${animationHook.gait} ${animationHook.movementAmount.toFixed(2)}`
    : "idle";
}

function formatWorldBackgroundLabel(world: WorldSettings): string {
  if (world.background.mode === "solid") {
    return "Solid";
  }

  if (world.background.mode === "verticalGradient") {
    return "Vertical Gradient";
  }

  return "Image";
}

function formatAdvancedRenderingShadowTypeLabel(
  type: AdvancedRenderingShadowType
): string {
  switch (type) {
    case "basic":
      return "Basic";
    case "pcf":
      return "PCF";
    case "pcfSoft":
      return "PCF Soft";
  }
}

function formatAdvancedRenderingToneMappingLabel(
  mode: AdvancedRenderingToneMappingMode
): string {
  switch (mode) {
    case "none":
      return "None";
    case "linear":
      return "Linear";
    case "reinhard":
      return "Reinhard";
    case "cineon":
      return "Cineon";
    case "acesFilmic":
      return "ACES Filmic";
  }
}

function formatAdvancedRenderingWaterReflectionModeLabel(
  mode: AdvancedRenderingWaterReflectionMode
): string {
  switch (mode) {
    case "none":
      return "Nothing";
    case "world":
      return "World";
    case "all":
      return "All";
  }
}

function formatBoxVolumeModeLabel(mode: BoxBrushVolumeMode): string {
  switch (mode) {
    case "none":
      return "None";
    case "water":
      return "Water";
    case "fog":
      return "Fog";
  }
}

function formatBoxVolumeRenderPathLabel(path: BoxVolumeRenderPath): string {
  switch (path) {
    case "performance":
      return "Performance";
    case "quality":
      return "Quality";
  }
}

function createProjectDownloadName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return `${slug.length > 0 ? slug : "project"}${PROJECT_PACKAGE_FILE_EXTENSION}`;
}

export function App({ store, initialStatusMessage }: AppProps) {
  const editorState = useEditorStoreState(store);
  const sceneList = Object.values(editorState.projectDocument.scenes);
  const activeProjectScene =
    editorState.projectDocument.scenes[editorState.activeSceneId];

  if (activeProjectScene === undefined) {
    throw new Error(
      `Active scene ${editorState.activeSceneId} does not exist in the project document.`
    );
  }

  const brushList = Object.values(editorState.document.brushes);
  const layoutMode = editorState.viewportLayoutMode;
  const activePanelId = editorState.activeViewportPanelId;
  const viewportToolPreview = editorState.viewportTransientState.toolPreview;
  const transformSession = editorState.viewportTransientState.transformSession;
  const entityList = getEntityInstances(editorState.document.entities);
  const entityDisplayList = getSortedEntityDisplayLabels(
    editorState.document.entities,
    editorState.document.assets
  );
  const primaryPlayerStart = getPrimaryPlayerStartEntity(
    editorState.document.entities
  );
  const materialList = sortDocumentMaterials(editorState.document.materials);
  const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);
  const selectedEntity = getSelectedEntity(editorState.selection, entityList);
  const selectedModelInstance = getSelectedModelInstance(
    editorState.selection,
    Object.values(editorState.document.modelInstances)
  );
  const whiteboxSelectionMode = editorState.whiteboxSelectionMode;
  const whiteboxSnapEnabled = editorState.whiteboxSnapEnabled;
  const viewportGridVisible = editorState.viewportGridVisible;
  const selectedFaceId = getSelectedBrushFaceId(editorState.selection);
  const selectedEdgeId = getSelectedBrushEdgeId(editorState.selection);
  const selectedVertexId = getSelectedBrushVertexId(editorState.selection);
  const selectedFace =
    selectedBrush !== null && selectedFaceId !== null
      ? selectedBrush.faces[selectedFaceId]
      : null;
  const selectedFaceMaterial =
    selectedFace !== null && selectedFace.materialId !== null
      ? (editorState.document.materials[selectedFace.materialId] ?? null)
      : null;
  const selectedModelAsset =
    selectedModelInstance !== null
      ? (editorState.document.assets[selectedModelInstance.assetId] ?? null)
      : null;
  const selectedModelAssetRecord =
    selectedModelAsset !== null && selectedModelAsset.kind === "model"
      ? selectedModelAsset
      : null;
  const selectedPlayerStart =
    selectedEntity?.kind === "playerStart" ? selectedEntity : null;
  const selectedSoundEmitter = isSoundEmitterEntity(selectedEntity)
    ? selectedEntity
    : null;
  const selectedSoundEmitterAsset =
    selectedSoundEmitter === null
      ? null
      : selectedSoundEmitter.audioAssetId === null
        ? null
        : (editorState.document.assets[selectedSoundEmitter.audioAssetId] ??
          null);
  const selectedSoundEmitterAudioAssetRecord =
    selectedSoundEmitterAsset !== null &&
    selectedSoundEmitterAsset.kind === "audio"
      ? selectedSoundEmitterAsset
      : null;
  const selectedTriggerVolume =
    selectedEntity?.kind === "triggerVolume" ? selectedEntity : null;
  const selectedSceneEntry =
    selectedEntity?.kind === "sceneEntry" ? selectedEntity : null;
  const selectedTeleportTarget =
    selectedEntity?.kind === "teleportTarget" ? selectedEntity : null;
  const selectedInteractable =
    selectedEntity?.kind === "interactable" ? selectedEntity : null;
  const selectedSceneExit =
    selectedEntity?.kind === "sceneExit" ? selectedEntity : null;
  const projectAssetList = Object.values(editorState.document.assets);
  const modelAssetList = projectAssetList.filter(isModelAsset);
  const imageAssetList = projectAssetList.filter(isImageAsset);
  const audioAssetList = projectAssetList.filter(isAudioAsset);
  const selectedPointLight =
    selectedEntity?.kind === "pointLight" ? selectedEntity : null;
  const selectedSpotLight =
    selectedEntity?.kind === "spotLight" ? selectedEntity : null;
  const modelInstanceDisplayList = getSortedModelInstanceDisplayLabels(
    editorState.document.modelInstances,
    editorState.document.assets
  );
  const selectedInteractionSource = isInteractionSourceEntity(selectedEntity)
    ? selectedEntity
    : null;
  const selectedTriggerVolumeLinks =
    selectedTriggerVolume === null
      ? []
      : getInteractionLinksForSource(
          editorState.document.interactionLinks,
          selectedTriggerVolume.id
        );
  const selectedInteractableLinks =
    selectedInteractable === null
      ? []
      : getInteractionLinksForSource(
          editorState.document.interactionLinks,
          selectedInteractable.id
        );
  const sceneTargetOptions = sceneList.map((scene) => ({
    id: scene.id,
    name: scene.name
  }));
  const sceneEntryOptionsBySceneId = Object.fromEntries(
    sceneTargetOptions.map(({ id }) => {
      const scene = editorState.projectDocument.scenes[id];
      const sceneEntries = getSortedEntityDisplayLabels(
        scene?.entities ?? {},
        editorState.projectDocument.assets
      ).filter(({ entity }) => entity.kind === "sceneEntry");

      return [
        id,
        sceneEntries as Array<{
          entity: Extract<EntityInstance, { kind: "sceneEntry" }>;
          label: string;
        }>
      ];
    })
  ) as Record<
    string,
    Array<{
      entity: Extract<EntityInstance, { kind: "sceneEntry" }>;
      label: string;
    }>
  >;
  const teleportTargetOptions = entityDisplayList.filter(
    ({ entity }) => entity.kind === "teleportTarget"
  );
  const soundEmitterOptions = entityDisplayList.filter(
    ({ entity }) => entity.kind === "soundEmitter"
  ) as Array<{
    entity: Extract<EntityInstance, { kind: "soundEmitter" }>;
    label: string;
  }>;
  const playableSoundEmitterOptions = soundEmitterOptions.filter(
    ({ entity }) => {
      if (entity.audioAssetId === null) {
        return false;
      }

      return editorState.document.assets[entity.audioAssetId]?.kind === "audio";
    }
  );
  const visibilityBrushOptions = brushList.map((brush, brushIndex) => ({
    brush,
    label: getBrushLabel(brush, brushIndex)
  }));

  const [projectNameDraft, setProjectNameDraft] = useState(
    editorState.projectDocument.name
  );
  const [sceneNameDraft, setSceneNameDraft] = useState(
    editorState.document.name
  );
  const [sceneLoadingHeadlineDraft, setSceneLoadingHeadlineDraft] = useState(
    activeProjectScene.loadingScreen.headline ?? ""
  );
  const [sceneLoadingDescriptionDraft, setSceneLoadingDescriptionDraft] =
    useState(activeProjectScene.loadingScreen.description ?? "");
  const [brushNameDraft, setBrushNameDraft] = useState("");
  const [entityNameDraft, setEntityNameDraft] = useState("");
  const [modelInstanceNameDraft, setModelInstanceNameDraft] = useState("");
  const [positionDraft, setPositionDraft] = useState(
    createVec3Draft(DEFAULT_BOX_BRUSH_CENTER)
  );
  const [rotationDraft, setRotationDraft] = useState(
    createVec3Draft(DEFAULT_BOX_BRUSH_ROTATION_DEGREES)
  );
  const [sizeDraft, setSizeDraft] = useState(
    createVec3Draft(DEFAULT_BOX_BRUSH_SIZE)
  );
  const [boxVolumeModeDraft, setBoxVolumeModeDraft] =
    useState<BoxBrushVolumeMode>("none");
  const [boxVolumeWaterColorDraft, setBoxVolumeWaterColorDraft] =
    useState("#4da6d9");
  const [
    boxVolumeWaterSurfaceOpacityDraft,
    setBoxVolumeWaterSurfaceOpacityDraft
  ] = useState("0.55");
  const [boxVolumeWaterWaveStrengthDraft, setBoxVolumeWaterWaveStrengthDraft] =
    useState("0.35");
  const [
    boxVolumeWaterFoamContactLimitDraft,
    setBoxVolumeWaterFoamContactLimitDraft
  ] = useState(String(DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT));
  const [
    boxVolumeWaterSurfaceDisplacementEnabledDraft,
    setBoxVolumeWaterSurfaceDisplacementEnabledDraft
  ] = useState(false);
  const [boxVolumeFogColorDraft, setBoxVolumeFogColorDraft] =
    useState("#9cb7c7");
  const [boxVolumeFogDensityDraft, setBoxVolumeFogDensityDraft] =
    useState("0.08");
  const [boxVolumeFogPaddingDraft, setBoxVolumeFogPaddingDraft] =
    useState("0.2");
  const [whiteboxSnapStepDraft, setWhiteboxSnapStepDraft] = useState(
    String(editorState.whiteboxSnapStep)
  );
  const [uvOffsetDraft, setUvOffsetDraft] = useState(
    createVec2Draft(createDefaultFaceUvState().offset)
  );
  const [uvScaleDraft, setUvScaleDraft] = useState(
    createVec2Draft(createDefaultFaceUvState().scale)
  );
  const [entityPositionDraft, setEntityPositionDraft] = useState(
    createVec3Draft(DEFAULT_ENTITY_POSITION)
  );
  const [pointLightColorDraft, setPointLightColorDraft] = useState(
    DEFAULT_POINT_LIGHT_COLOR_HEX
  );
  const [pointLightIntensityDraft, setPointLightIntensityDraft] = useState(
    String(DEFAULT_POINT_LIGHT_INTENSITY)
  );
  const [pointLightDistanceDraft, setPointLightDistanceDraft] = useState(
    String(DEFAULT_POINT_LIGHT_DISTANCE)
  );
  const [spotLightColorDraft, setSpotLightColorDraft] = useState(
    DEFAULT_SPOT_LIGHT_COLOR_HEX
  );
  const [spotLightIntensityDraft, setSpotLightIntensityDraft] = useState(
    String(DEFAULT_SPOT_LIGHT_INTENSITY)
  );
  const [spotLightDistanceDraft, setSpotLightDistanceDraft] = useState(
    String(DEFAULT_SPOT_LIGHT_DISTANCE)
  );
  const [spotLightAngleDraft, setSpotLightAngleDraft] = useState(
    String(DEFAULT_SPOT_LIGHT_ANGLE_DEGREES)
  );
  const [spotLightDirectionDraft, setSpotLightDirectionDraft] = useState(
    createVec3Draft(DEFAULT_SPOT_LIGHT_DIRECTION)
  );
  const [playerStartYawDraft, setPlayerStartYawDraft] = useState("0");
  const [playerStartNavigationModeDraft, setPlayerStartNavigationModeDraft] =
    useState<PlayerStartNavigationMode>(DEFAULT_PLAYER_START_NAVIGATION_MODE);
  const [playerStartMovementTemplateDraft, setPlayerStartMovementTemplateDraft] =
    useState<PlayerStartMovementTemplate>(createPlayerStartMovementTemplate());
  const [
    playerStartMovementTemplateNumberDraft,
    setPlayerStartMovementTemplateNumberDraft
  ] = useState<PlayerStartMovementTemplateNumberDraft>(
    createPlayerStartMovementTemplateNumberDraft(
      createPlayerStartMovementTemplate()
    )
  );
  const [playerStartColliderModeDraft, setPlayerStartColliderModeDraft] =
    useState<PlayerStartColliderMode>("capsule");
  const [playerStartEyeHeightDraft, setPlayerStartEyeHeightDraft] = useState(
    String(DEFAULT_PLAYER_START_EYE_HEIGHT)
  );
  const [playerStartCapsuleRadiusDraft, setPlayerStartCapsuleRadiusDraft] =
    useState(String(DEFAULT_PLAYER_START_CAPSULE_RADIUS));
  const [playerStartCapsuleHeightDraft, setPlayerStartCapsuleHeightDraft] =
    useState(String(DEFAULT_PLAYER_START_CAPSULE_HEIGHT));
  const [playerStartBoxSizeDraft, setPlayerStartBoxSizeDraft] = useState(
    createVec3Draft(DEFAULT_PLAYER_START_BOX_SIZE)
  );
  const [playerStartInputBindingsDraft, setPlayerStartInputBindingsDraft] =
    useState<PlayerStartInputBindings>(createPlayerStartInputBindings());
  const [playerStartKeyboardCaptureAction, setPlayerStartKeyboardCaptureAction] =
    useState<PlayerStartInputAction | null>(null);
  const [soundEmitterAudioAssetIdDraft, setSoundEmitterAudioAssetIdDraft] =
    useState(DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID ?? "");
  const [soundEmitterVolumeDraft, setSoundEmitterVolumeDraft] = useState(
    String(DEFAULT_SOUND_EMITTER_VOLUME)
  );
  const [soundEmitterRefDistanceDraft, setSoundEmitterRefDistanceDraft] =
    useState(String(DEFAULT_SOUND_EMITTER_REF_DISTANCE));
  const [soundEmitterMaxDistanceDraft, setSoundEmitterMaxDistanceDraft] =
    useState(String(DEFAULT_SOUND_EMITTER_MAX_DISTANCE));
  const [soundEmitterAutoplayDraft, setSoundEmitterAutoplayDraft] =
    useState(false);
  const [soundEmitterLoopDraft, setSoundEmitterLoopDraft] = useState(false);
  const [triggerVolumeSizeDraft, setTriggerVolumeSizeDraft] = useState(
    createVec3Draft(DEFAULT_TRIGGER_VOLUME_SIZE)
  );
  const [sceneEntryYawDraft, setSceneEntryYawDraft] = useState(
    String(DEFAULT_SCENE_ENTRY_YAW_DEGREES)
  );
  const [teleportTargetYawDraft, setTeleportTargetYawDraft] = useState(
    String(DEFAULT_TELEPORT_TARGET_YAW_DEGREES)
  );
  const [interactableRadiusDraft, setInteractableRadiusDraft] = useState(
    String(DEFAULT_INTERACTABLE_RADIUS)
  );
  const [interactablePromptDraft, setInteractablePromptDraft] = useState(
    DEFAULT_INTERACTABLE_PROMPT
  );
  const [interactableEnabledDraft, setInteractableEnabledDraft] =
    useState(true);
  const [sceneExitRadiusDraft, setSceneExitRadiusDraft] = useState(
    String(DEFAULT_SCENE_EXIT_RADIUS)
  );
  const [sceneExitPromptDraft, setSceneExitPromptDraft] = useState(
    DEFAULT_SCENE_EXIT_PROMPT
  );
  const [sceneExitEnabledDraft, setSceneExitEnabledDraft] = useState(true);
  const [sceneExitTargetSceneIdDraft, setSceneExitTargetSceneIdDraft] =
    useState("");
  const [sceneExitTargetEntryIdDraft, setSceneExitTargetEntryIdDraft] =
    useState("");
  const selectedSceneExitTargetEntryOptions = [
    ...(sceneEntryOptionsBySceneId[sceneExitTargetSceneIdDraft] ?? [])
  ];
  if (
    sceneExitTargetEntryIdDraft.trim().length > 0 &&
    !selectedSceneExitTargetEntryOptions.some(
      ({ entity }) => entity.id === sceneExitTargetEntryIdDraft
    )
  ) {
    selectedSceneExitTargetEntryOptions.push({
      entity: createSceneEntryEntity({
        id: sceneExitTargetEntryIdDraft,
        name: "Missing Scene Entry"
      }),
      label: `Missing Scene Entry (${sceneExitTargetEntryIdDraft})`
    });
  }
  const [modelPositionDraft, setModelPositionDraft] = useState(
    createVec3Draft(DEFAULT_MODEL_INSTANCE_POSITION)
  );
  const [modelRotationDraft, setModelRotationDraft] = useState(
    createVec3Draft(DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES)
  );
  const [modelScaleDraft, setModelScaleDraft] = useState(
    createVec3Draft(DEFAULT_MODEL_INSTANCE_SCALE)
  );
  const [ambientLightIntensityDraft, setAmbientLightIntensityDraft] = useState(
    String(editorState.document.world.ambientLight.intensity)
  );
  const [sunLightIntensityDraft, setSunLightIntensityDraft] = useState(
    String(editorState.document.world.sunLight.intensity)
  );
  const [sunDirectionDraft, setSunDirectionDraft] = useState(
    createVec3Draft(editorState.document.world.sunLight.direction)
  );
  const [
    backgroundEnvironmentIntensityDraft,
    setBackgroundEnvironmentIntensityDraft
  ] = useState(
    editorState.document.world.background.mode === "image"
      ? String(editorState.document.world.background.environmentIntensity)
      : "0.5"
  );
  const [
    advancedRenderingShadowBiasDraft,
    setAdvancedRenderingShadowBiasDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.shadows.bias)
  );
  const [
    advancedRenderingAmbientOcclusionIntensityDraft,
    setAdvancedRenderingAmbientOcclusionIntensityDraft
  ] = useState(
    String(
      editorState.document.world.advancedRendering.ambientOcclusion.intensity
    )
  );
  const [
    advancedRenderingAmbientOcclusionRadiusDraft,
    setAdvancedRenderingAmbientOcclusionRadiusDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.ambientOcclusion.radius)
  );
  const [
    advancedRenderingAmbientOcclusionSamplesDraft,
    setAdvancedRenderingAmbientOcclusionSamplesDraft
  ] = useState(
    String(
      editorState.document.world.advancedRendering.ambientOcclusion.samples
    )
  );
  const [
    advancedRenderingBloomIntensityDraft,
    setAdvancedRenderingBloomIntensityDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.bloom.intensity)
  );
  const [
    advancedRenderingBloomThresholdDraft,
    setAdvancedRenderingBloomThresholdDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.bloom.threshold)
  );
  const [
    advancedRenderingBloomRadiusDraft,
    setAdvancedRenderingBloomRadiusDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.bloom.radius)
  );
  const [
    advancedRenderingToneMappingExposureDraft,
    setAdvancedRenderingToneMappingExposureDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.toneMapping.exposure)
  );
  const [
    advancedRenderingDepthOfFieldFocusDistanceDraft,
    setAdvancedRenderingDepthOfFieldFocusDistanceDraft
  ] = useState(
    String(
      editorState.document.world.advancedRendering.depthOfField.focusDistance
    )
  );
  const [
    advancedRenderingDepthOfFieldFocalLengthDraft,
    setAdvancedRenderingDepthOfFieldFocalLengthDraft
  ] = useState(
    String(
      editorState.document.world.advancedRendering.depthOfField.focalLength
    )
  );
  const [
    advancedRenderingDepthOfFieldBokehScaleDraft,
    setAdvancedRenderingDepthOfFieldBokehScaleDraft
  ] = useState(
    String(editorState.document.world.advancedRendering.depthOfField.bokehScale)
  );
  const [statusMessage, setStatusMessage] = useState(
    initialStatusMessage ?? "Slice 3.5 advanced rendering ready."
  );
  const [assetStatusMessage, setAssetStatusMessage] = useState<string | null>(
    null
  );
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [hoveredViewportPanelId, setHoveredViewportPanelId] =
    useState<ViewportPanelId | null>(null);
  const [addMenuPosition, setAddMenuPosition] =
    useState<HierarchicalMenuPosition | null>(null);
  const [activeNavigationMode, setActiveNavigationMode] =
    useState<RuntimeNavigationMode>("thirdPerson");
  const [projectAssetStorage, setProjectAssetStorage] =
    useState<ProjectAssetStorage | null>(null);
  const [projectAssetStorageReady, setProjectAssetStorageReady] =
    useState(false);
  const [runtimeScene, setRuntimeScene] =
    useState<RuntimeSceneDefinition | null>(null);
  const [runtimeSceneId, setRuntimeSceneId] = useState<string | null>(null);
  const [runtimeSceneName, setRuntimeSceneName] = useState<string | null>(null);
  const [runtimeSceneLoadingScreen, setRuntimeSceneLoadingScreen] =
    useState<SceneLoadingScreenSettings | null>(null);
  const [runtimeGlobalState, setRuntimeGlobalState] =
    useState<RuntimeGlobalState>(createDefaultRuntimeGlobalState());
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [firstPersonTelemetry, setFirstPersonTelemetry] =
    useState<FirstPersonTelemetry | null>(null);
  const [runtimeInteractionPrompt, setRuntimeInteractionPrompt] =
    useState<RuntimeInteractionPrompt | null>(null);
  const [loadedModelAssets, setLoadedModelAssets] = useState<
    Record<string, LoadedModelAsset>
  >({});
  const [loadedImageAssets, setLoadedImageAssets] = useState<
    Record<string, LoadedImageAsset>
  >({});
  const [loadedAudioAssets, setLoadedAudioAssets] = useState<
    Record<string, LoadedAudioAsset>
  >({});
  const [focusRequest, setFocusRequest] = useState<{
    id: number;
    selection: EditorSelection;
    panelId: ViewportPanelId;
  }>({
    id: 0,
    panelId: "topLeft",
    selection: {
      kind: "none"
    }
  });
  const importProjectInputRef = useRef<HTMLInputElement | null>(null);
  const importModelInputRef = useRef<HTMLInputElement | null>(null);
  const importBackgroundImageInputRef = useRef<HTMLInputElement | null>(null);
  const importAudioInputRef = useRef<HTMLInputElement | null>(null);
  const viewportPanelsRef = useRef<HTMLDivElement | null>(null);
  const loadedModelAssetsRef = useRef<Record<string, LoadedModelAsset>>({});
  const loadedImageAssetsRef = useRef<Record<string, LoadedImageAsset>>({});
  const loadedAudioAssetsRef = useRef<Record<string, LoadedAudioAsset>>({});
  const autosaveControllerRef = useRef<EditorAutosaveController | null>(null);
  const lastAutosaveErrorRef = useRef<string | null>(null);
  const viewportQuadSplitRef = useRef(editorState.viewportQuadSplit);
  const lastPointerPositionRef = useRef<HierarchicalMenuPosition>({
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight * 0.5)
  });
  const [viewportQuadResizeMode, setViewportQuadResizeMode] =
    useState<ViewportQuadResizeMode | null>(null);
  const documentValidation = validateSceneDocument(editorState.document);
  const projectValidation = validateProjectDocument(editorState.projectDocument);
  const activeSceneProjectDiagnostics = projectValidation.diagnostics.filter(
    (diagnostic) =>
      diagnostic.path?.startsWith(`scenes.${editorState.activeSceneId}.`) &&
      (diagnostic.code === "missing-scene-exit-target-scene" ||
        diagnostic.code === "missing-scene-exit-target-entry" ||
        diagnostic.code === "scene-exit-target-entry-kind-mismatch")
  );
  const authoredNavigationMode: RuntimeNavigationMode =
    primaryPlayerStart?.navigationMode ?? "thirdPerson";
  const runValidation = validateRuntimeSceneBuild(editorState.document, {
    navigationMode: authoredNavigationMode,
    loadedModelAssets
  });
  const diagnostics = [
    ...documentValidation.errors,
    ...documentValidation.warnings,
    ...activeSceneProjectDiagnostics,
    ...runValidation.errors,
    ...runValidation.warnings
  ];
  const blockingDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error"
  );
  const warningDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning"
  );
  const documentStatusLabel =
    documentValidation.errors.length === 0
      ? "Valid"
      : formatDiagnosticCount(documentValidation.errors.length, "error");
  const lastCommandLabel = editorState.lastCommandLabel ?? "No commands yet";
  const runReadyLabel =
    blockingDiagnostics.length > 0
      ? "Blocked"
      : authoredNavigationMode === "firstPerson"
        ? "Ready for First Person"
        : "Ready for Third Person";
  const advancedRendering = editorState.document.world.advancedRendering;
  const hoveredAsset =
    hoveredAssetId === null
      ? null
      : (editorState.document.assets[hoveredAssetId] ?? null);
  const hoveredAssetStatusMessage =
    hoveredAsset === null ? null : formatAssetHoverStatus(hoveredAsset);
  const selectedTransformTarget = resolveTransformTarget(
    editorState.document,
    editorState.selection,
    whiteboxSelectionMode
  ).target;
  const canTranslateSelectedTarget =
    selectedTransformTarget !== null &&
    supportsTransformOperation(selectedTransformTarget, "translate");
  const canRotateSelectedTarget =
    selectedTransformTarget !== null &&
    supportsTransformOperation(selectedTransformTarget, "rotate");
  const canScaleSelectedTarget =
    selectedTransformTarget !== null &&
    supportsTransformOperation(selectedTransformTarget, "scale");
  const whiteboxSnapStep = editorState.whiteboxSnapStep;
  const whiteboxVectorInputStep = getWhiteboxInputStep(
    whiteboxSnapEnabled,
    whiteboxSnapStep
  );

  useEffect(() => {
    setPlayerStartKeyboardCaptureAction(null);
  }, [selectedPlayerStart?.id]);

  useEffect(() => {
    if (playerStartKeyboardCaptureAction === null) {
      return;
    }

    const handleWindowKeyCapture = (event: globalThis.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.repeat) {
        return;
      }

      if (event.code === "Escape") {
        setPlayerStartKeyboardCaptureAction(null);
        setStatusMessage("Cancelled Player Start key capture.");
        return;
      }

      const capturedCode = event.code.trim();

      if (capturedCode.length === 0) {
        return;
      }

      handlePlayerStartKeyboardBindingChange(
        playerStartKeyboardCaptureAction,
        capturedCode
      );
      setPlayerStartKeyboardCaptureAction(null);
      setStatusMessage(
        `Bound ${getPlayerStartInputActionLabel(playerStartKeyboardCaptureAction)} to ${formatPlayerStartKeyboardBindingLabel(capturedCode)}.`
      );
    };

    window.addEventListener("keydown", handleWindowKeyCapture, true);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyCapture, true);
    };
  }, [playerStartKeyboardCaptureAction]);

  useEffect(() => {
    setProjectNameDraft(editorState.projectDocument.name);
  }, [editorState.projectDocument.name]);

  useEffect(() => {
    setSceneNameDraft(editorState.document.name);
  }, [editorState.document.name]);

  useEffect(() => {
    setWhiteboxSnapStepDraft(String(editorState.whiteboxSnapStep));
  }, [editorState.activeSceneId, editorState.whiteboxSnapStep]);

  useEffect(() => {
    setSceneLoadingHeadlineDraft(
      activeProjectScene.loadingScreen.headline ?? ""
    );
    setSceneLoadingDescriptionDraft(
      activeProjectScene.loadingScreen.description ?? ""
    );
  }, [
    activeProjectScene.id,
    activeProjectScene.loadingScreen.headline,
    activeProjectScene.loadingScreen.description
  ]);

  useEffect(() => {
    setBrushNameDraft(selectedBrush?.name ?? "");
  }, [selectedBrush]);

  useEffect(() => {
    setEntityNameDraft(selectedEntity?.name ?? "");
  }, [selectedEntity]);

  useEffect(() => {
    setModelInstanceNameDraft(selectedModelInstance?.name ?? "");
  }, [selectedModelInstance]);

  useEffect(() => {
    if (selectedBrush === null) {
      setPositionDraft(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
      setRotationDraft(createVec3Draft(DEFAULT_BOX_BRUSH_ROTATION_DEGREES));
      setSizeDraft(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
      setBoxVolumeModeDraft("none");
      setBoxVolumeWaterFoamContactLimitDraft(
        String(DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT)
      );
      setBoxVolumeWaterSurfaceDisplacementEnabledDraft(false);
      return;
    }

    setPositionDraft(createVec3Draft(selectedBrush.center));
    setRotationDraft(createVec3Draft(selectedBrush.rotationDegrees));
    setSizeDraft(createVec3Draft(selectedBrush.size));

    setBoxVolumeModeDraft(selectedBrush.volume.mode);

    if (selectedBrush.volume.mode === "water") {
      setBoxVolumeWaterColorDraft(selectedBrush.volume.water.colorHex);
      setBoxVolumeWaterSurfaceOpacityDraft(
        String(selectedBrush.volume.water.surfaceOpacity)
      );
      setBoxVolumeWaterWaveStrengthDraft(
        String(selectedBrush.volume.water.waveStrength)
      );
      setBoxVolumeWaterFoamContactLimitDraft(
        String(selectedBrush.volume.water.foamContactLimit)
      );
      setBoxVolumeWaterSurfaceDisplacementEnabledDraft(
        selectedBrush.volume.water.surfaceDisplacementEnabled
      );
    }

    if (selectedBrush.volume.mode === "fog") {
      setBoxVolumeFogColorDraft(selectedBrush.volume.fog.colorHex);
      setBoxVolumeFogDensityDraft(String(selectedBrush.volume.fog.density));
      setBoxVolumeFogPaddingDraft(String(selectedBrush.volume.fog.padding));
    }
  }, [selectedBrush]);

  useEffect(() => {
    if (selectedFace === null) {
      const defaultUvState = createDefaultFaceUvState();
      setUvOffsetDraft(createVec2Draft(defaultUvState.offset));
      setUvScaleDraft(createVec2Draft(defaultUvState.scale));
      return;
    }

    setUvOffsetDraft(createVec2Draft(selectedFace.uv.offset));
    setUvScaleDraft(createVec2Draft(selectedFace.uv.scale));
  }, [selectedFace]);

  useEffect(() => {
    if (selectedEntity === null) {
      setEntityPositionDraft(createVec3Draft(DEFAULT_ENTITY_POSITION));
      setPointLightColorDraft(DEFAULT_POINT_LIGHT_COLOR_HEX);
      setPointLightIntensityDraft(String(DEFAULT_POINT_LIGHT_INTENSITY));
      setPointLightDistanceDraft(String(DEFAULT_POINT_LIGHT_DISTANCE));
      setSpotLightColorDraft(DEFAULT_SPOT_LIGHT_COLOR_HEX);
      setSpotLightIntensityDraft(String(DEFAULT_SPOT_LIGHT_INTENSITY));
      setSpotLightDistanceDraft(String(DEFAULT_SPOT_LIGHT_DISTANCE));
      setSpotLightAngleDraft(String(DEFAULT_SPOT_LIGHT_ANGLE_DEGREES));
      setSpotLightDirectionDraft(createVec3Draft(DEFAULT_SPOT_LIGHT_DIRECTION));
      setPlayerStartYawDraft("0");
      setPlayerStartNavigationModeDraft(DEFAULT_PLAYER_START_NAVIGATION_MODE);
      setPlayerStartMovementTemplateDraft(createPlayerStartMovementTemplate());
      setPlayerStartMovementTemplateNumberDraft(
        createPlayerStartMovementTemplateNumberDraft(
          createPlayerStartMovementTemplate()
        )
      );
      setPlayerStartColliderModeDraft("capsule");
      setPlayerStartEyeHeightDraft(String(DEFAULT_PLAYER_START_EYE_HEIGHT));
      setPlayerStartCapsuleRadiusDraft(
        String(DEFAULT_PLAYER_START_CAPSULE_RADIUS)
      );
      setPlayerStartCapsuleHeightDraft(
        String(DEFAULT_PLAYER_START_CAPSULE_HEIGHT)
      );
      setPlayerStartBoxSizeDraft(
        createVec3Draft(DEFAULT_PLAYER_START_BOX_SIZE)
      );
      setPlayerStartInputBindingsDraft(createPlayerStartInputBindings());
      setSoundEmitterAudioAssetIdDraft(
        DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID ?? ""
      );
      setSoundEmitterVolumeDraft(String(DEFAULT_SOUND_EMITTER_VOLUME));
      setSoundEmitterRefDistanceDraft(
        String(DEFAULT_SOUND_EMITTER_REF_DISTANCE)
      );
      setSoundEmitterMaxDistanceDraft(
        String(DEFAULT_SOUND_EMITTER_MAX_DISTANCE)
      );
      setSoundEmitterAutoplayDraft(false);
      setSoundEmitterLoopDraft(false);
      setTriggerVolumeSizeDraft(createVec3Draft(DEFAULT_TRIGGER_VOLUME_SIZE));
      setSceneEntryYawDraft(String(DEFAULT_SCENE_ENTRY_YAW_DEGREES));
      setTeleportTargetYawDraft(String(DEFAULT_TELEPORT_TARGET_YAW_DEGREES));
      setInteractableRadiusDraft(String(DEFAULT_INTERACTABLE_RADIUS));
      setInteractablePromptDraft(DEFAULT_INTERACTABLE_PROMPT);
      setInteractableEnabledDraft(true);
      setSceneExitRadiusDraft(String(DEFAULT_SCENE_EXIT_RADIUS));
      setSceneExitPromptDraft(DEFAULT_SCENE_EXIT_PROMPT);
      setSceneExitEnabledDraft(true);
      setSceneExitTargetSceneIdDraft(sceneTargetOptions[0]?.id ?? "");
      setSceneExitTargetEntryIdDraft(
        (sceneEntryOptionsBySceneId[sceneTargetOptions[0]?.id ?? ""]?.[0]
          ?.entity.id ?? "")
      );
      return;
    }

    setEntityPositionDraft(createVec3Draft(selectedEntity.position));

    switch (selectedEntity.kind) {
      case "pointLight":
        setPointLightColorDraft(selectedEntity.colorHex);
        setPointLightIntensityDraft(String(selectedEntity.intensity));
        setPointLightDistanceDraft(String(selectedEntity.distance));
        break;
      case "spotLight":
        setSpotLightColorDraft(selectedEntity.colorHex);
        setSpotLightIntensityDraft(String(selectedEntity.intensity));
        setSpotLightDistanceDraft(String(selectedEntity.distance));
        setSpotLightAngleDraft(String(selectedEntity.angleDegrees));
        setSpotLightDirectionDraft(createVec3Draft(selectedEntity.direction));
        break;
      case "playerStart":
        setPlayerStartYawDraft(String(selectedEntity.yawDegrees));
        setPlayerStartNavigationModeDraft(selectedEntity.navigationMode);
        setPlayerStartMovementTemplateDraft(
          clonePlayerStartMovementTemplate(selectedEntity.movementTemplate)
        );
        setPlayerStartMovementTemplateNumberDraft(
          createPlayerStartMovementTemplateNumberDraft(
            selectedEntity.movementTemplate
          )
        );
        setPlayerStartColliderModeDraft(selectedEntity.collider.mode);
        setPlayerStartEyeHeightDraft(String(selectedEntity.collider.eyeHeight));
        setPlayerStartCapsuleRadiusDraft(
          String(selectedEntity.collider.capsuleRadius)
        );
        setPlayerStartCapsuleHeightDraft(
          String(selectedEntity.collider.capsuleHeight)
        );
        setPlayerStartBoxSizeDraft(
          createVec3Draft(selectedEntity.collider.boxSize)
        );
        setPlayerStartInputBindingsDraft(
          clonePlayerStartInputBindings(selectedEntity.inputBindings)
        );
        break;
      case "sceneEntry":
        setSceneEntryYawDraft(String(selectedEntity.yawDegrees));
        break;
      case "soundEmitter":
        setSoundEmitterAudioAssetIdDraft(selectedEntity.audioAssetId ?? "");
        setSoundEmitterVolumeDraft(String(selectedEntity.volume));
        setSoundEmitterRefDistanceDraft(String(selectedEntity.refDistance));
        setSoundEmitterMaxDistanceDraft(String(selectedEntity.maxDistance));
        setSoundEmitterAutoplayDraft(selectedEntity.autoplay);
        setSoundEmitterLoopDraft(selectedEntity.loop);
        break;
      case "triggerVolume":
        setTriggerVolumeSizeDraft(createVec3Draft(selectedEntity.size));
        break;
      case "teleportTarget":
        setTeleportTargetYawDraft(String(selectedEntity.yawDegrees));
        break;
      case "interactable":
        setInteractableRadiusDraft(String(selectedEntity.radius));
        setInteractablePromptDraft(selectedEntity.prompt);
        setInteractableEnabledDraft(selectedEntity.enabled);
        break;
      case "sceneExit":
        setSceneExitRadiusDraft(String(selectedEntity.radius));
        setSceneExitPromptDraft(selectedEntity.prompt);
        setSceneExitEnabledDraft(selectedEntity.enabled);
        setSceneExitTargetSceneIdDraft(selectedEntity.targetSceneId);
        setSceneExitTargetEntryIdDraft(selectedEntity.targetEntryEntityId);
        break;
    }
  }, [editorState.projectDocument, selectedEntity]);

  useEffect(() => {
    if (selectedModelInstance === null) {
      setModelPositionDraft(createVec3Draft(DEFAULT_MODEL_INSTANCE_POSITION));
      setModelRotationDraft(
        createVec3Draft(DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES)
      );
      setModelScaleDraft(createVec3Draft(DEFAULT_MODEL_INSTANCE_SCALE));
      return;
    }

    setModelPositionDraft(createVec3Draft(selectedModelInstance.position));
    setModelRotationDraft(
      createVec3Draft(selectedModelInstance.rotationDegrees)
    );
    setModelScaleDraft(createVec3Draft(selectedModelInstance.scale));
  }, [selectedModelInstance]);

  useEffect(() => {
    setAmbientLightIntensityDraft(
      String(editorState.document.world.ambientLight.intensity)
    );
  }, [editorState.document.world.ambientLight.intensity]);

  useEffect(() => {
    if (editorState.document.world.background.mode === "image") {
      setBackgroundEnvironmentIntensityDraft(
        String(editorState.document.world.background.environmentIntensity)
      );
    }
  }, [editorState.document.world.background]);

  useEffect(() => {
    setSunLightIntensityDraft(
      String(editorState.document.world.sunLight.intensity)
    );
  }, [editorState.document.world.sunLight.intensity]);

  useEffect(() => {
    setSunDirectionDraft(
      createVec3Draft(editorState.document.world.sunLight.direction)
    );
  }, [editorState.document.world.sunLight.direction]);

  useEffect(() => {
    const advancedRendering = editorState.document.world.advancedRendering;
    setAdvancedRenderingShadowBiasDraft(String(advancedRendering.shadows.bias));
    setAdvancedRenderingAmbientOcclusionIntensityDraft(
      String(advancedRendering.ambientOcclusion.intensity)
    );
    setAdvancedRenderingAmbientOcclusionRadiusDraft(
      String(advancedRendering.ambientOcclusion.radius)
    );
    setAdvancedRenderingAmbientOcclusionSamplesDraft(
      String(advancedRendering.ambientOcclusion.samples)
    );
    setAdvancedRenderingBloomIntensityDraft(
      String(advancedRendering.bloom.intensity)
    );
    setAdvancedRenderingBloomThresholdDraft(
      String(advancedRendering.bloom.threshold)
    );
    setAdvancedRenderingBloomRadiusDraft(
      String(advancedRendering.bloom.radius)
    );
    setAdvancedRenderingToneMappingExposureDraft(
      String(advancedRendering.toneMapping.exposure)
    );
    setAdvancedRenderingDepthOfFieldFocusDistanceDraft(
      String(advancedRendering.depthOfField.focusDistance)
    );
    setAdvancedRenderingDepthOfFieldFocalLengthDraft(
      String(advancedRendering.depthOfField.focalLength)
    );
    setAdvancedRenderingDepthOfFieldBokehScaleDraft(
      String(advancedRendering.depthOfField.bokehScale)
    );
  }, [editorState.document.world.advancedRendering]);

  useEffect(() => {
    loadedImageAssetsRef.current = loadedImageAssets;
  }, [loadedImageAssets]);

  useEffect(() => {
    loadedModelAssetsRef.current = loadedModelAssets;
  }, [loadedModelAssets]);

  useEffect(() => {
    loadedAudioAssetsRef.current = loadedAudioAssets;
  }, [loadedAudioAssets]);

  useEffect(() => {
    viewportQuadSplitRef.current = editorState.viewportQuadSplit;
  }, [editorState.viewportQuadSplit]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const access = await getBrowserProjectAssetStorageAccess();

      if (cancelled) {
        return;
      }

      setProjectAssetStorage(access.storage);
      setAssetStatusMessage(access.diagnostic);
      setProjectAssetStorageReady(true);
    })().catch((error) => {
      if (cancelled) {
        return;
      }

      setProjectAssetStorage(null);
      setProjectAssetStorageReady(true);
      setAssetStatusMessage(getErrorMessage(error));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    autosaveControllerRef.current = new EditorAutosaveController({
      saveDraft: () => store.saveDraft(),
      onComplete: (result) => {
        if (result.status === "error") {
          if (lastAutosaveErrorRef.current !== result.message) {
            lastAutosaveErrorRef.current = result.message;
            setStatusMessage(result.message);
          }
          return;
        }

        lastAutosaveErrorRef.current = null;
      }
    });

    return () => {
      autosaveControllerRef.current?.dispose();
      autosaveControllerRef.current = null;
    };
  }, [store]);

  useEffect(() => {
    if (!editorState.storageAvailable) {
      return;
    }

    autosaveControllerRef.current?.schedule();
  }, [
    editorState.activeViewportPanelId,
    editorState.document,
    editorState.storageAvailable,
    editorState.viewportLayoutMode,
    editorState.viewportPanels,
    editorState.viewportQuadSplit
  ]);

  useEffect(() => {
    if (!editorState.storageAvailable) {
      return;
    }

    const flushAutosave = () => {
      autosaveControllerRef.current?.flush();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
      }
    };

    window.addEventListener("beforeunload", flushAutosave);
    window.addEventListener("pagehide", flushAutosave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushAutosave);
      window.removeEventListener("pagehide", flushAutosave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [editorState.storageAvailable]);

  useEffect(() => {
    if (!projectAssetStorageReady) {
      return;
    }

    let cancelled = false;
    const currentAssets = editorState.document.assets;
    const previousLoadedModelAssets = loadedModelAssetsRef.current;
    const previousLoadedImageAssets = loadedImageAssetsRef.current;
    const previousLoadedAudioAssets = loadedAudioAssetsRef.current;
    const previousLoadedModelAssetIds = new Set(
      Object.keys(previousLoadedModelAssets)
    );
    const previousLoadedImageAssetIds = new Set(
      Object.keys(previousLoadedImageAssets)
    );
    const previousLoadedAudioAssetIds = new Set(
      Object.keys(previousLoadedAudioAssets)
    );
    const nextLoadedModelAssets: Record<string, LoadedModelAsset> = {};
    const nextLoadedImageAssets: Record<string, LoadedImageAsset> = {};
    const nextLoadedAudioAssets: Record<string, LoadedAudioAsset> = {};
    const syncErrorMessages: string[] = [];

    const syncAssets = async () => {
      if (projectAssetStorage === null) {
        for (const loadedAsset of Object.values(previousLoadedModelAssets)) {
          disposeModelTemplate(loadedAsset.template);
        }

        for (const loadedAsset of Object.values(previousLoadedImageAssets)) {
          disposeLoadedImageAsset(loadedAsset);
        }

        if (!cancelled) {
          loadedModelAssetsRef.current = {};
          loadedImageAssetsRef.current = {};
          loadedAudioAssetsRef.current = {};
          setLoadedModelAssets({});
          setLoadedImageAssets({});
          setLoadedAudioAssets({});
        }

        return;
      }

      for (const asset of Object.values(currentAssets)) {
        if (isModelAsset(asset)) {
          previousLoadedModelAssetIds.delete(asset.id);

          const cachedLoadedAsset = previousLoadedModelAssets[asset.id];

          if (
            cachedLoadedAsset !== undefined &&
            cachedLoadedAsset.storageKey === asset.storageKey
          ) {
            nextLoadedModelAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedModelAssets[asset.id] = await loadModelAssetFromStorage(
              projectAssetStorage,
              asset
            );
          } catch (error) {
            syncErrorMessages.push(
              `Model asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`
            );
          }

          continue;
        }

        if (isImageAsset(asset)) {
          previousLoadedImageAssetIds.delete(asset.id);

          const cachedLoadedAsset = previousLoadedImageAssets[asset.id];

          if (
            cachedLoadedAsset !== undefined &&
            cachedLoadedAsset.storageKey === asset.storageKey
          ) {
            nextLoadedImageAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedImageAssets[asset.id] = await loadImageAssetFromStorage(
              projectAssetStorage,
              asset
            );
          } catch (error) {
            syncErrorMessages.push(
              `Image asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`
            );
          }
          continue;
        }

        if (isAudioAsset(asset)) {
          previousLoadedAudioAssetIds.delete(asset.id);

          const cachedLoadedAsset = previousLoadedAudioAssets[asset.id];

          if (
            cachedLoadedAsset !== undefined &&
            cachedLoadedAsset.storageKey === asset.storageKey
          ) {
            nextLoadedAudioAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedAudioAssets[asset.id] = await loadAudioAssetFromStorage(
              projectAssetStorage,
              asset
            );
          } catch (error) {
            syncErrorMessages.push(
              `Audio asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`
            );
          }
        }
      }

      if (cancelled) {
        for (const loadedAsset of Object.values(nextLoadedModelAssets)) {
          if (previousLoadedModelAssets[loadedAsset.assetId] !== loadedAsset) {
            disposeModelTemplate(loadedAsset.template);
          }
        }

        for (const loadedAsset of Object.values(nextLoadedImageAssets)) {
          if (previousLoadedImageAssets[loadedAsset.assetId] !== loadedAsset) {
            disposeLoadedImageAsset(loadedAsset);
          }
        }

        return;
      }

      for (const assetId of previousLoadedModelAssetIds) {
        const removedAsset = previousLoadedModelAssets[assetId];

        if (removedAsset !== undefined) {
          disposeModelTemplate(removedAsset.template);
        }
      }

      for (const assetId of previousLoadedImageAssetIds) {
        const removedAsset = previousLoadedImageAssets[assetId];

        if (removedAsset !== undefined) {
          disposeLoadedImageAsset(removedAsset);
        }
      }

      loadedModelAssetsRef.current = nextLoadedModelAssets;
      loadedImageAssetsRef.current = nextLoadedImageAssets;
      loadedAudioAssetsRef.current = nextLoadedAudioAssets;
      setLoadedModelAssets(nextLoadedModelAssets);
      setLoadedImageAssets(nextLoadedImageAssets);
      setLoadedAudioAssets(nextLoadedAudioAssets);
      setAssetStatusMessage(
        syncErrorMessages.length === 0 ? null : syncErrorMessages.join(" | ")
      );
    };

    void syncAssets();

    return () => {
      cancelled = true;
    };
  }, [
    editorState.document.assets,
    projectAssetStorage,
    projectAssetStorageReady
  ]);

  useEffect(() => {
    if (editorState.toolMode === "play") {
      return;
    }

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      lastPointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };

      const hoveredViewportPanelElement =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-viewport-panel-id]")
          : null;
      const hoveredPanelId =
        hoveredViewportPanelElement?.dataset.viewportPanelId;

      setHoveredViewportPanelId(
        hoveredPanelId === "topLeft" ||
          hoveredPanelId === "topRight" ||
          hoveredPanelId === "bottomLeft" ||
          hoveredPanelId === "bottomRight"
          ? hoveredPanelId
          : null
      );
    };

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      const hasPrimaryModifier =
        (event.metaKey || event.ctrlKey) && !event.altKey;

      if (hasPrimaryModifier && event.code === "KeyR" && !event.shiftKey) {
        event.preventDefault();
        handleEnterPlayMode();
        return;
      }

      if (hasPrimaryModifier && event.code === "KeyS") {
        event.preventDefault();
        void handleSaveProject();
        return;
      }

      if (hasPrimaryModifier && event.code === "KeyZ") {
        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      if (hasPrimaryModifier && event.code === "KeyY") {
        event.preventDefault();
        handleRedo();

        return;
      }

      if (event.key === "Escape" && addMenuPosition !== null) {
        event.preventDefault();
        setAddMenuPosition(null);
        return;
      }

      if (transformSession.kind === "active") {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelTransformSession();
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          commitTransformSession(transformSession);
          return;
        }

        if (!event.altKey && !event.ctrlKey && !event.metaKey) {
          if (event.code === "KeyX") {
            event.preventDefault();
            applyTransformAxisConstraint("x");
            return;
          }

          if (event.code === "KeyY") {
            event.preventDefault();
            applyTransformAxisConstraint("y");
            return;
          }

          if (event.code === "KeyZ") {
            event.preventDefault();
            applyTransformAxisConstraint("z");
            return;
          }
        }
      }

      if (event.key === "Escape" && editorState.toolMode === "create") {
        event.preventDefault();
        store.setToolMode("select");
        setStatusMessage("Cancelled the current creation preview.");
        return;
      }

      if (event.shiftKey && event.code === "KeyA") {
        event.preventDefault();
        setAddMenuPosition({
          x: lastPointerPositionRef.current.x,
          y: lastPointerPositionRef.current.y
        });
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        let transformOperation: TransformOperation | null = null;

        if (event.code === "KeyG") {
          transformOperation = "translate";
        } else if (event.code === "KeyR") {
          transformOperation = "rotate";
        } else if (event.code === "KeyS") {
          transformOperation = "scale";
        }

        if (transformOperation !== null) {
          event.preventDefault();
          beginTransformOperation(transformOperation, "keyboard");
          return;
        }
      }

      const isDeletionKey = event.key === "Delete" || event.key === "Backspace";
      const isDeleteShortcut =
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.code === "KeyX" || isDeletionKey);
      const isDuplicateShortcut =
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.code === "KeyD";

      if (addMenuPosition !== null) {
        if (isDeletionKey) {
          event.preventDefault();
        }
        return;
      }

      if (isDuplicateShortcut) {
        const duplicated = handleDuplicateSelection();

        if (duplicated) {
          event.preventDefault();
        }

        return;
      }

      if (isDeleteShortcut) {
        if (editorState.toolMode !== "create") {
          const deleted = handleDeleteSelectedSceneItem();

          if (deleted || isDeletionKey) {
            event.preventDefault();
          }
        } else if (isDeletionKey) {
          event.preventDefault();
        }
        return;
      }

      if (
        event.code !== "NumpadComma" &&
        !(
          event.key === "," &&
          event.location === globalThis.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD
        )
      ) {
        return;
      }

      event.preventDefault();

      if (
        editorState.selection.kind === "none" &&
        brushList.length === 0 &&
        entityList.length === 0
      ) {
        setStatusMessage("Nothing authored yet to frame in the viewport.");
        return;
      }

      setFocusRequest((current) => ({
        id: current.id + 1,
        panelId: activePanelId,
        selection: editorState.selection
      }));
      setStatusMessage(
        editorState.selection.kind === "none"
          ? "Framed the authored scene in the viewport."
          : "Framed the current selection."
      );
    };

    document.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      document.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [
    activePanelId,
    addMenuPosition,
    brushList.length,
    editorState.document,
    editorState.selection,
    editorState.toolMode,
    entityList.length,
    hoveredViewportPanelId,
    layoutMode,
    projectAssetStorage,
    projectAssetStorageReady,
    transformSession
  ]);

  useEffect(() => {
    if (layoutMode === "quad" || viewportQuadResizeMode === null) {
      return;
    }

    setViewportQuadResizeMode(null);
  }, [layoutMode, viewportQuadResizeMode]);

  useEffect(() => {
    if (layoutMode !== "quad" || viewportQuadResizeMode === null) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = getViewportQuadResizeCursor(
      viewportQuadResizeMode
    );
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const viewportPanels = viewportPanelsRef.current;

      if (viewportPanels === null) {
        return;
      }

      const rect = viewportPanels.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const nextViewportQuadSplit = {
        ...viewportQuadSplitRef.current
      };

      if (viewportQuadResizeMode !== "horizontal") {
        nextViewportQuadSplit.x = clampViewportQuadSplitValue(
          (event.clientX - rect.left) / rect.width
        );
      }

      if (viewportQuadResizeMode !== "vertical") {
        nextViewportQuadSplit.y = clampViewportQuadSplitValue(
          (event.clientY - rect.top) / rect.height
        );
      }

      store.setViewportQuadSplit(nextViewportQuadSplit);
    };

    const stopViewportResize = () => {
      setViewportQuadResizeMode(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopViewportResize);
    window.addEventListener("pointercancel", stopViewportResize);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopViewportResize);
      window.removeEventListener("pointercancel", stopViewportResize);
    };
  }, [layoutMode, store, viewportQuadResizeMode]);

  useEffect(() => {
    if (editorState.toolMode !== "play") {
      return;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      const pointerCaptured =
        activeNavigationMode === "firstPerson" &&
        firstPersonTelemetry?.pointerLocked === true;

      if (pointerCaptured) {
        return;
      }

      event.preventDefault();
      handleExitPlayMode();
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [activeNavigationMode, editorState.toolMode, firstPersonTelemetry]);

  const applyProjectName = () => {
    const normalizedName = projectNameDraft.trim() || DEFAULT_PROJECT_NAME;

    if (normalizedName === editorState.projectDocument.name) {
      return;
    }

    store.executeCommand(createSetProjectNameCommand(normalizedName));
    setStatusMessage(`Project renamed to ${normalizedName}.`);
  };

  const applySceneName = () => {
    const normalizedName = sceneNameDraft.trim() || "Untitled Scene";

    if (normalizedName === editorState.document.name) {
      return;
    }

    store.executeCommand(createSetSceneNameCommand(normalizedName));
    setStatusMessage(`Scene renamed to ${normalizedName}.`);
  };

  const handleCreateScene = () => {
    store.executeCommand(createCreateSceneCommand());
    setStatusMessage("Created a new scene.");
  };

  const handleActiveSceneChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSceneId = event.currentTarget.value;

    if (nextSceneId === editorState.activeSceneId) {
      return;
    }

    const nextScene = editorState.projectDocument.scenes[nextSceneId];

    if (nextScene === undefined) {
      return;
    }

    store.executeCommand(createSetActiveSceneCommand(nextSceneId));
    setStatusMessage(`Switched to scene ${nextScene.name}.`);
  };

  const applySceneLoadingScreen = (
    loadingScreen: SceneLoadingScreenSettings,
    label: string,
    successMessage: string
  ) => {
    if (
      areSceneLoadingScreenSettingsEqual(
        activeProjectScene.loadingScreen,
        loadingScreen
      )
    ) {
      return;
    }

    store.executeCommand(
      createSetSceneLoadingScreenCommand({
        sceneId: activeProjectScene.id,
        label,
        loadingScreen
      })
    );
    setStatusMessage(successMessage);
  };

  const applySceneLoadingColor = (colorHex: string) => {
    applySceneLoadingScreen(
      {
        ...cloneSceneLoadingScreenSettings(activeProjectScene.loadingScreen),
        colorHex
      },
      "Update scene loading overlay color",
      "Updated the runner loading overlay color."
    );
  };

  const applySceneLoadingHeadline = () => {
    const normalizedHeadline = sceneLoadingHeadlineDraft.trim();

    applySceneLoadingScreen(
      {
        ...cloneSceneLoadingScreenSettings(activeProjectScene.loadingScreen),
        headline: normalizedHeadline.length === 0 ? null : normalizedHeadline
      },
      "Update scene loading overlay headline",
      normalizedHeadline.length === 0
        ? "Cleared the runner loading overlay headline."
        : "Updated the runner loading overlay headline."
    );
  };

  const applySceneLoadingDescription = () => {
    const normalizedDescription = sceneLoadingDescriptionDraft.trim();

    applySceneLoadingScreen(
      {
        ...cloneSceneLoadingScreenSettings(activeProjectScene.loadingScreen),
        description:
          normalizedDescription.length === 0 ? null : normalizedDescription
      },
      "Update scene loading overlay description",
      normalizedDescription.length === 0
        ? "Cleared the runner loading overlay description."
        : "Updated the runner loading overlay description."
    );
  };

  const requestViewportFocus = (
    selection: EditorSelection,
    status?: string
  ) => {
    setFocusRequest((current) => ({
      id: current.id + 1,
      panelId: activePanelId,
      selection
    }));

    if (status !== undefined) {
      setStatusMessage(status);
    }
  };

  const openAddMenuAt = (position: HierarchicalMenuPosition) => {
    setHoveredAssetId(null);
    setAddMenuPosition(position);
  };

  const closeAddMenu = () => {
    setHoveredAssetId(null);
    setAddMenuPosition(null);
  };

  const handleOpenAddMenuFromButton = (
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    openAddMenuAt({
      x: rect.left,
      y: rect.bottom + 8
    });
  };

  const handleSetViewportLayoutMode = (nextLayoutMode: ViewportLayoutMode) => {
    if (editorState.viewportLayoutMode === nextLayoutMode) {
      return;
    }

    blurActiveTextEntry();
    store.setViewportLayoutMode(nextLayoutMode);
    setStatusMessage(
      `Switched the viewport to ${getViewportLayoutModeLabel(nextLayoutMode)}.`
    );
  };

  const handleActivateViewportPanel = (panelId: ViewportPanelId) => {
    if (editorState.activeViewportPanelId === panelId) {
      return;
    }

    blurActiveTextEntry();
    store.setActiveViewportPanel(panelId);
    setStatusMessage("Activated the viewport panel.");
  };

  const handleSetViewportPanelViewMode = (
    panelId: ViewportPanelId,
    nextViewMode: ViewportViewMode
  ) => {
    if (editorState.viewportPanels[panelId].viewMode === nextViewMode) {
      return;
    }

    blurActiveTextEntry();
    store.setViewportPanelViewMode(panelId, nextViewMode);

    setStatusMessage(
      `Set the viewport panel to ${getViewportViewModeLabel(nextViewMode)} view.`
    );
  };

  const handleSetViewportPanelDisplayMode = (
    panelId: ViewportPanelId,
    nextDisplayMode: ViewportDisplayMode
  ) => {
    if (editorState.viewportPanels[panelId].displayMode === nextDisplayMode) {
      return;
    }

    blurActiveTextEntry();
    store.setViewportPanelDisplayMode(panelId, nextDisplayMode);
    setStatusMessage(
      `Set the viewport panel to ${getViewportDisplayModeLabel(nextDisplayMode)} display.`
    );
  };

  const handleUndo = () => {
    if (store.undo()) {
      setStatusMessage("Undid the last action.");
    } else {
      setStatusMessage("Nothing to undo.");
    }
  };

  const handleRedo = () => {
    if (store.redo()) {
      setStatusMessage("Redid the last action.");
    } else {
      setStatusMessage("Nothing to redo.");
    }
  };

  const beginTransformOperation = (
    operation: TransformOperation,
    source: TransformSessionSource
  ) => {
    if (editorState.toolMode !== "select") {
      return;
    }

    const transformSourcePanelId =
      layoutMode === "quad"
        ? (hoveredViewportPanelId ?? activePanelId)
        : activePanelId;

    const transformTargetResult = resolveTransformTarget(
      editorState.document,
      editorState.selection,
      whiteboxSelectionMode
    );
    const transformTarget = transformTargetResult.target;

    if (transformTarget === null) {
      setStatusMessage(
        transformTargetResult.message ??
          "Select a single brush, entity, or model instance before transforming it."
      );
      return;
    }

    if (!supportsTransformOperation(transformTarget, operation)) {
      setStatusMessage(
        `${getTransformOperationLabel(operation)} is not supported for ${getTransformTargetLabel(transformTarget)}.`
      );
      return;
    }

    blurActiveTextEntry();
    closeAddMenu();

    if (editorState.activeViewportPanelId !== transformSourcePanelId) {
      store.setActiveViewportPanel(transformSourcePanelId);
    }

    store.setTransformSession(
      createTransformSession({
        source,
        sourcePanelId: transformSourcePanelId,
        operation,
        target: transformTarget
      })
    );
    setStatusMessage(
      `${getTransformOperationLabel(operation)} ${getTransformTargetLabel(transformTarget).toLowerCase()} in ${getViewportPanelLabel(
        transformSourcePanelId
      )}. Move the pointer, press X/Y/Z to constrain, press the same axis again for local when supported, click or press Enter to commit, Escape cancels.`
    );
  };

  const cancelTransformSession = (
    status = "Cancelled the current transform."
  ) => {
    if (transformSession.kind === "none") {
      return;
    }

    store.clearTransformSession();
    setStatusMessage(status);
  };

  const commitTransformSession = (
    activeTransformSession: ActiveTransformSession
  ) => {
    if (!doesTransformSessionChangeTarget(activeTransformSession)) {
      store.clearTransformSession();
      setStatusMessage("No transform change was committed.");
      return;
    }

    try {
      store.clearTransformSession();
      store.executeCommand(
        createCommitTransformSessionCommand(
          editorState.document,
          activeTransformSession
        )
      );
      setStatusMessage(
        `${getTransformOperationPastTense(activeTransformSession.operation)} ${getTransformTargetLabel(activeTransformSession.target).toLowerCase()}.`
      );
    } catch (error) {
      store.clearTransformSession();
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyTransformAxisConstraint = (axis: TransformAxis) => {
    if (transformSession.kind !== "active") {
      return;
    }

    if (!supportsTransformAxisConstraint(transformSession, axis)) {
      const supportedAxes = (["x", "y", "z"] as const)
        .filter((candidateAxis) =>
          supportsTransformAxisConstraint(transformSession, candidateAxis)
        )
        .map((candidateAxis) => candidateAxis.toUpperCase())
        .join("/");
      setStatusMessage(
        supportedAxes.length === 0
          ? `${getTransformOperationLabel(transformSession.operation)} does not support axis constraints for ${getTransformTargetLabel(transformSession.target)}.`
          : `${getTransformOperationLabel(transformSession.operation)} on ${getTransformTargetLabel(transformSession.target)} only supports ${supportedAxes}.`
      );
      return;
    }

    const nextAxisConstraintSpace =
      transformSession.axisConstraint === axis
        ? transformSession.axisConstraintSpace === "world"
          ? "local"
          : "world"
        : "world";

    if (
      nextAxisConstraintSpace === "local" &&
      !supportsLocalTransformAxisConstraint(transformSession, axis)
    ) {
      setStatusMessage(
        `Local ${getTransformAxisLabel(axis)} is not supported for ${getTransformOperationLabel(transformSession.operation).toLowerCase()} on ${getTransformTargetLabel(
          transformSession.target
        )}.`
      );
      return;
    }

    store.setTransformAxisConstraint(axis, nextAxisConstraintSpace);
    setStatusMessage(
      `Constrained ${getTransformOperationLabel(transformSession.operation).toLowerCase()} to ${getTransformAxisSpaceLabel(
        nextAxisConstraintSpace
      ).toLowerCase()} ${getTransformAxisLabel(axis)}.`
    );
  };

  const handleViewportQuadResizeStart =
    (resizeMode: ViewportQuadResizeMode) =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (layoutMode !== "quad") {
        return;
      }

      const viewportPanels = viewportPanelsRef.current;

      if (viewportPanels === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      blurActiveTextEntry();

      const rect = viewportPanels.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        const nextViewportQuadSplit = {
          ...viewportQuadSplitRef.current
        };

        if (resizeMode !== "horizontal") {
          nextViewportQuadSplit.x = clampViewportQuadSplitValue(
            (event.clientX - rect.left) / rect.width
          );
        }

        if (resizeMode !== "vertical") {
          nextViewportQuadSplit.y = clampViewportQuadSplitValue(
            (event.clientY - rect.top) / rect.height
          );
        }

        store.setViewportQuadSplit(nextViewportQuadSplit);
      }

      setViewportQuadResizeMode(resizeMode);
    };

  const beginCreation = (
    toolPreview: CreationViewportToolPreview,
    status: string
  ) => {
    blurActiveTextEntry();
    closeAddMenu();
    store.setToolMode("create");
    store.setViewportToolPreview(toolPreview);
    setStatusMessage(status);
  };

  const completeCreation = (status: string) => {
    store.setToolMode("select");
    store.clearViewportToolPreview();
    setStatusMessage(status);
  };

  const beginBoxCreation = () => {
    beginCreation(
      {
        kind: "create",
        sourcePanelId: activePanelId,
        target: {
          kind: "box-brush"
        },
        center: null
      },
      `Previewing a whitebox box. Click in the viewport to create it${whiteboxSnapEnabled ? ` on the ${whiteboxSnapStep}m grid` : ""}.`
    );
  };

  const handleWhiteboxSnapToggle = () => {
    const nextEnabled = !whiteboxSnapEnabled;
    store.setWhiteboxSnapEnabled(nextEnabled);
    setStatusMessage(
      nextEnabled
        ? `Grid snap enabled at ${whiteboxSnapStep}m.`
        : "Grid snap disabled for whitebox transforms."
    );
  };

  const handleViewportGridToggle = () => {
    const nextVisible = !viewportGridVisible;
    store.setViewportGridVisible(nextVisible);
    setStatusMessage(
      nextVisible ? "Viewport grid enabled." : "Viewport grid hidden."
    );
  };

  const handleWhiteboxSnapStepBlur = () => {
    const normalizedStep = resolveOptionalPositiveNumber(
      whiteboxSnapStepDraft,
      DEFAULT_GRID_SIZE
    );
    setWhiteboxSnapStepDraft(String(normalizedStep));
    store.setWhiteboxSnapStep(normalizedStep);
  };

  const handleWhiteboxSelectionModeChange = (mode: WhiteboxSelectionMode) => {
    if (whiteboxSelectionMode === mode) {
      return;
    }

    blurActiveTextEntry();
    store.setWhiteboxSelectionMode(mode);
    setStatusMessage(getWhiteboxSelectionModeStatus(mode));
  };

  const applySelection = (
    selection: EditorSelection,
    source: "outliner" | "viewport" | "inspector" | "runner",
    options: { focusViewport?: boolean } = {}
  ) => {
    blurActiveTextEntry();
    store.setSelection(selection);

    const suffix =
      source === "outliner" && options.focusViewport
        ? " and framed it in the viewport"
        : "";

    switch (selection.kind) {
      case "none":
        setStatusMessage(
          `${source === "viewport" ? "Viewport" : "Editor"} selection cleared${suffix}.`
        );
        break;
      case "brushes":
        setStatusMessage(
          `Selected ${getBrushLabelById(selection.ids[0], brushList)} from the ${source}${suffix}.`
        );
        break;
      case "brushFace":
        setStatusMessage(
          `Selected ${BOX_FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`
        );
        break;
      case "brushEdge":
        setStatusMessage(
          `Selected ${BOX_EDGE_LABELS[selection.edgeId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`
        );
        break;
      case "brushVertex":
        setStatusMessage(
          `Selected ${BOX_VERTEX_LABELS[selection.vertexId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`
        );
        break;
      case "entities":
        setStatusMessage(
          `Selected ${getEntityDisplayLabelById(selection.ids[0], editorState.document.entities, editorState.document.assets)} from the ${source}${suffix}.`
        );
        break;
      case "modelInstances":
        setStatusMessage(
          `Selected ${getModelInstanceDisplayLabelById(selection.ids[0], editorState.document.modelInstances, editorState.document.assets)} from the ${source}${suffix}.`
        );
        break;
      default:
        setStatusMessage(`Selection updated from the ${source}${suffix}.`);
        break;
    }

    if (options.focusViewport) {
      requestViewportFocus(selection);
    }
  };

  const applyPositionChange = () => {
    if (
      selectedBrush === null ||
      editorState.selection.kind !== "brushes" ||
      whiteboxSelectionMode !== "object"
    ) {
      setStatusMessage(
        "Switch to Object mode and select a whitebox box before moving it."
      );
      return;
    }

    try {
      const nextCenter = maybeSnapVec3(
        readVec3Draft(positionDraft, "Whitebox box position"),
        whiteboxSnapEnabled,
        whiteboxSnapStep
      );

      if (areVec3Equal(nextCenter, selectedBrush.center)) {
        return;
      }

      store.executeCommand(
        createMoveBoxBrushCommand({
          brushId: selectedBrush.id,
          center: nextCenter,
          snapToGrid: false
        })
      );
      setStatusMessage("Moved selected whitebox box.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyRotationChange = () => {
    if (
      selectedBrush === null ||
      editorState.selection.kind !== "brushes" ||
      whiteboxSelectionMode !== "object"
    ) {
      setStatusMessage(
        "Switch to Object mode and select a whitebox box before rotating it."
      );
      return;
    }

    try {
      const nextRotationDegrees = readVec3Draft(
        rotationDraft,
        "Whitebox box rotation"
      );

      if (areVec3Equal(nextRotationDegrees, selectedBrush.rotationDegrees)) {
        return;
      }

      store.executeCommand(
        createRotateBoxBrushCommand({
          brushId: selectedBrush.id,
          rotationDegrees: nextRotationDegrees
        })
      );
      setStatusMessage("Rotated selected whitebox box.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySizeChange = () => {
    if (
      selectedBrush === null ||
      editorState.selection.kind !== "brushes" ||
      whiteboxSelectionMode !== "object"
    ) {
      setStatusMessage(
        "Switch to Object mode and select a whitebox box before scaling it."
      );
      return;
    }

    try {
      const nextSize = maybeSnapPositiveSize(
        readVec3Draft(sizeDraft, "Whitebox box size"),
        whiteboxSnapEnabled,
        whiteboxSnapStep
      );

      if (areVec3Equal(nextSize, selectedBrush.size)) {
        return;
      }

      store.executeCommand(
        createResizeBoxBrushCommand({
          brushId: selectedBrush.id,
          size: nextSize,
          snapToGrid: false
        })
      );
      setStatusMessage("Scaled selected whitebox box.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyBoxVolumeSettings = (
    mutate: (next: BoxBrush["volume"]) => BoxBrush["volume"],
    label: string,
    successMessage: string
  ) => {
    if (selectedBrush === null) {
      setStatusMessage("Select a whitebox box before editing volume settings.");
      return;
    }

    try {
      const nextVolume = mutate(selectedBrush.volume);

      store.executeCommand(
        createSetBoxBrushVolumeSettingsCommand({
          brushId: selectedBrush.id,
          volume: nextVolume,
          label
        })
      );
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyBoxVolumeModeChange = (mode: BoxBrushVolumeMode) => {
    if (selectedBrush === null) {
      setStatusMessage(
        "Select a whitebox box before changing the volume mode."
      );
      return;
    }

    if (selectedBrush.volume.mode === mode) {
      return;
    }

    applyBoxVolumeSettings(
      (currentVolume) => {
        if (mode === "none") {
          return {
            mode: "none"
          };
        }

        if (mode === "water") {
          return currentVolume.mode === "water"
            ? currentVolume
            : {
                mode: "water",
                water: {
                  colorHex: boxVolumeWaterColorDraft,
                  surfaceOpacity: readNonNegativeNumberDraft(
                    boxVolumeWaterSurfaceOpacityDraft,
                    "Water surface opacity"
                  ),
                  waveStrength: readNonNegativeNumberDraft(
                    boxVolumeWaterWaveStrengthDraft,
                    "Water wave strength"
                  ),
                  foamContactLimit: readWaterFoamContactLimitDraft(
                    boxVolumeWaterFoamContactLimitDraft
                  ),
                  surfaceDisplacementEnabled:
                    boxVolumeWaterSurfaceDisplacementEnabledDraft
                }
              };
        }

        return currentVolume.mode === "fog"
          ? currentVolume
          : {
              mode: "fog",
              fog: {
                colorHex: boxVolumeFogColorDraft,
                density: readNonNegativeNumberDraft(
                  boxVolumeFogDensityDraft,
                  "Fog density"
                ),
                padding: readNonNegativeNumberDraft(
                  boxVolumeFogPaddingDraft,
                  "Fog padding"
                )
              }
            };
      },
      `Set box volume mode to ${mode}`,
      `Set selected whitebox box volume mode to ${formatBoxVolumeModeLabel(mode)}.`
    );
  };

  const resolveDraftBoxWaterSettings = (
    overrides: {
      colorHex?: string;
      surfaceOpacity?: number;
      waveStrength?: number;
      foamContactLimit?: number;
      surfaceDisplacementEnabled?: boolean;
    } = {}
  ) => ({
    colorHex: overrides.colorHex ?? boxVolumeWaterColorDraft,
    surfaceOpacity:
      overrides.surfaceOpacity ??
      readNonNegativeNumberDraft(
        boxVolumeWaterSurfaceOpacityDraft,
        "Water surface opacity"
      ),
    waveStrength:
      overrides.waveStrength ??
      readNonNegativeNumberDraft(
        boxVolumeWaterWaveStrengthDraft,
        "Water wave strength"
      ),
    foamContactLimit:
      overrides.foamContactLimit ??
      readWaterFoamContactLimitDraft(boxVolumeWaterFoamContactLimitDraft),
    surfaceDisplacementEnabled:
      overrides.surfaceDisplacementEnabled ??
      boxVolumeWaterSurfaceDisplacementEnabledDraft
  });

  const applyBoxWaterSettings = (
    overrides: {
      colorHex?: string;
      surfaceOpacity?: number;
      waveStrength?: number;
      foamContactLimit?: number;
      surfaceDisplacementEnabled?: boolean;
    } = {}
  ) => {
    if (selectedBrush === null || selectedBrush.volume.mode !== "water") {
      return;
    }

    applyBoxVolumeSettings(
      () => ({
        mode: "water",
        water: resolveDraftBoxWaterSettings(overrides)
      }),
      "Set box water settings",
      "Updated selected whitebox water settings."
    );
  };

  const applyBoxWaterColorDraft = (colorHex: string) => {
    if (selectedBrush === null || selectedBrush.volume.mode !== "water") {
      return;
    }

    applyBoxVolumeSettings(
      () => ({
        mode: "water",
        water: resolveDraftBoxWaterSettings({ colorHex })
      }),
      "Set box water color",
      "Updated selected whitebox water color."
    );
  };

  const applyBoxFogSettings = () => {
    if (selectedBrush === null || selectedBrush.volume.mode !== "fog") {
      return;
    }

    applyBoxVolumeSettings(
      () => ({
        mode: "fog",
        fog: {
          colorHex: boxVolumeFogColorDraft,
          density: readNonNegativeNumberDraft(
            boxVolumeFogDensityDraft,
            "Fog density"
          ),
          padding: readNonNegativeNumberDraft(
            boxVolumeFogPaddingDraft,
            "Fog padding"
          )
        }
      }),
      "Set box fog settings",
      "Updated selected whitebox fog settings."
    );
  };

  const applyBoxFogColorDraft = (colorHex: string) => {
    if (selectedBrush === null || selectedBrush.volume.mode !== "fog") {
      return;
    }

    applyBoxVolumeSettings(
      () => ({
        mode: "fog",
        fog: {
          colorHex,
          density: readNonNegativeNumberDraft(
            boxVolumeFogDensityDraft,
            "Fog density"
          ),
          padding: readNonNegativeNumberDraft(
            boxVolumeFogPaddingDraft,
            "Fog padding"
          )
        }
      }),
      "Set box fog color",
      "Updated selected whitebox fog color."
    );
  };

  const commitEntityChange = (
    currentEntity: EntityInstance,
    nextEntity: EntityInstance,
    successMessage: string
  ) => {
    if (areEntityInstancesEqual(currentEntity, nextEntity)) {
      return;
    }

    store.executeCommand(
      createUpsertEntityCommand({
        entity: nextEntity,
        label: `Update ${getEntityKindLabel(nextEntity.kind).toLowerCase()}`
      })
    );
    setStatusMessage(successMessage);
  };

  const beginEntityCreation = (
    kind: EntityKind,
    options: { audioAssetId?: string | null } = {}
  ) => {
    if (kind === "sceneExit" && resolveDefaultSceneExitDestination() === null) {
      setStatusMessage("Author a Scene Entry before placing a Scene Exit.");
      return;
    }

    beginCreation(
      {
        kind: "create",
        sourcePanelId: activePanelId,
        target: {
          kind: "entity",
          entityKind: kind,
          audioAssetId: options.audioAssetId ?? null
        },
        center: null
      },
      `Previewing ${getEntityKindLabel(kind)}. Click in the viewport to place it.`
    );
  };

  const beginModelInstanceCreation = (assetId: string) => {
    const asset = editorState.document.assets[assetId];

    if (asset === undefined || asset.kind !== "model") {
      setStatusMessage("Select a model asset before placing a model instance.");
      return;
    }

    beginCreation(
      {
        kind: "create",
        sourcePanelId: activePanelId,
        target: {
          kind: "model-instance",
          assetId: asset.id
        },
        center: null
      },
      `Previewing ${asset.sourceName}. Click in the viewport to place it.`
    );
  };

  const resolveDefaultSceneExitDestination = (
    preferredSceneId = editorState.activeSceneId
  ): {
    targetSceneId: string;
    targetEntryEntityId: string;
  } | null => {
    const preferredOrder = [
      ...sceneTargetOptions
        .map(({ id }) => id)
        .filter((sceneId) => sceneId !== preferredSceneId),
      preferredSceneId
    ];

    for (const sceneId of preferredOrder) {
      const firstSceneEntry = sceneEntryOptionsBySceneId[sceneId]?.[0]?.entity;

      if (firstSceneEntry !== undefined) {
        return {
          targetSceneId: sceneId,
          targetEntryEntityId: firstSceneEntry.id
        };
      }
    }

    return null;
  };

  const buildRuntimeSceneForProjectScene = (
    sceneId: string,
    options: { sceneEntryId?: string | null } = {}
  ): RuntimeSceneDefinition => {
    const sceneDocument = createSceneDocumentFromProject(
      editorState.projectDocument,
      sceneId
    );

    return buildRuntimeSceneFromDocument(sceneDocument, {
      loadedModelAssets,
      sceneEntryId: options.sceneEntryId
    });
  };

  const applyRuntimeSceneSession = (
    sceneId: string,
    nextRuntimeScene: RuntimeSceneDefinition
  ) => {
    const projectScene = editorState.projectDocument.scenes[sceneId];

    if (projectScene === undefined) {
      throw new Error(`Project scene ${sceneId} does not exist.`);
    }

    setRuntimeScene(nextRuntimeScene);
    setRuntimeSceneId(projectScene.id);
    setRuntimeSceneName(projectScene.name);
    setRuntimeSceneLoadingScreen(
      cloneSceneLoadingScreenSettings(projectScene.loadingScreen)
    );
    setActiveNavigationMode(nextRuntimeScene.navigationMode);
  };

  const handleRunnerSceneExitActivated = (
    request: RuntimeSceneExitTransitionRequest
  ) => {
    if (runtimeSceneId === null || runtimeSceneName === null) {
      setRuntimeMessage("Scene transition failed: run mode is not active.");
      return;
    }

    const sourceScene = editorState.projectDocument.scenes[runtimeSceneId];
    const targetScene = editorState.projectDocument.scenes[request.targetSceneId];

    if (sourceScene === undefined) {
      setRuntimeMessage(
        `Scene transition failed: source scene ${runtimeSceneId} is no longer available.`
      );
      return;
    }

    if (targetScene === undefined) {
      setRuntimeMessage(
        `Scene transition failed: target scene ${request.targetSceneId} does not exist.`
      );
      return;
    }

    const targetEntry = targetScene.entities[request.targetEntryEntityId];

    if (targetEntry === undefined) {
      setRuntimeMessage(
        `Scene transition failed: target Scene Entry ${request.targetEntryEntityId} does not exist in ${targetScene.name}.`
      );
      return;
    }

    if (targetEntry.kind !== "sceneEntry") {
      setRuntimeMessage(
        `Scene transition failed: target ${request.targetEntryEntityId} in ${targetScene.name} is not a Scene Entry.`
      );
      return;
    }

    try {
      const nextRuntimeScene = buildRuntimeSceneForProjectScene(targetScene.id, {
        sceneEntryId: targetEntry.id
      });

      applyRuntimeSceneSession(targetScene.id, nextRuntimeScene);
      setRuntimeMessage(null);
      setFirstPersonTelemetry(null);
      setRuntimeInteractionPrompt(null);
      setRuntimeGlobalState((currentState) => ({
        ...currentState,
        transitionCount: currentState.transitionCount + 1,
        lastSceneTransition: {
          fromSceneId: sourceScene.id,
          fromSceneName: sourceScene.name,
          toSceneId: targetScene.id,
          toSceneName: targetScene.name,
          viaExitEntityId: request.sourceExitEntityId,
          targetEntryEntityId: targetEntry.id
        }
      }));
      setStatusMessage(`Loaded ${targetScene.name}.`);
    } catch (error) {
      const message = getErrorMessage(error);
      setRuntimeMessage(`Scene transition failed: ${message}`);
      setStatusMessage(`Scene transition failed: ${message}`);
    }
  };

  const handleCommitCreation = (
    creationPreview: CreationViewportToolPreview
  ): boolean => {
    try {
      if (creationPreview.target.kind === "box-brush") {
        const center =
          creationPreview.center === null ? undefined : creationPreview.center;

        store.executeCommand(
          createCreateBoxBrushCommand(
            center === undefined
              ? {
                  snapToGrid: whiteboxSnapEnabled,
                  gridSize: whiteboxSnapStep
                }
              : {
                  center,
                  snapToGrid: whiteboxSnapEnabled,
                  gridSize: whiteboxSnapStep
                }
          )
        );
        completeCreation(
          center === undefined
            ? whiteboxSnapEnabled
              ? `Created a whitebox box on the ${whiteboxSnapStep}m grid.`
              : "Created a whitebox box."
            : whiteboxSnapEnabled
              ? `Created a whitebox box at snapped center ${formatVec3(center)}.`
              : `Created a whitebox box at ${formatVec3(center)}.`
        );
        return true;
      }

      if (creationPreview.target.kind === "model-instance") {
        const asset =
          editorState.document.assets[creationPreview.target.assetId];

        if (asset === undefined || asset.kind !== "model") {
          setStatusMessage(
            "Select a model asset before placing a model instance."
          );
          return false;
        }

        const nextModelInstance = createModelInstance({
          assetId: asset.id,
          position:
            creationPreview.center === null
              ? createModelInstancePlacementPosition(asset, null)
              : creationPreview.center,
          rotationDegrees: DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
          scale: DEFAULT_MODEL_INSTANCE_SCALE
        });

        store.executeCommand(
          createUpsertModelInstanceCommand({
            modelInstance: nextModelInstance,
            label: `Place ${asset.sourceName}`
          })
        );
        completeCreation(`Placed ${asset.sourceName}.`);
        return true;
      }

      const position = creationPreview.center ?? DEFAULT_ENTITY_POSITION;

      switch (creationPreview.target.entityKind) {
        case "pointLight":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createPointLightEntity({
                position
              }),
              label: "Place point light"
            })
          );
          completeCreation("Placed Point Light.");
          return true;
        case "spotLight":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createSpotLightEntity({
                position
              }),
              label: "Place spot light"
            })
          );
          completeCreation("Placed Spot Light.");
          return true;
        case "playerStart":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createPlayerStartEntity({
                position
              }),
              label: "Place player start"
            })
          );
          completeCreation("Placed Player Start.");
          return true;
        case "sceneEntry":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createSceneEntryEntity({
                position
              }),
              label: "Place scene entry"
            })
          );
          completeCreation("Placed Scene Entry.");
          return true;
        case "soundEmitter": {
          const placedAudioAssetId =
            creationPreview.target.audioAssetId ??
            audioAssetList[0]?.id ??
            null;

          store.executeCommand(
            createUpsertEntityCommand({
              entity: createSoundEmitterEntity({
                position,
                audioAssetId: placedAudioAssetId
              }),
              label: "Place sound emitter"
            })
          );
          completeCreation(
            placedAudioAssetId === null
              ? "Placed Sound Emitter."
              : `Placed Sound Emitter using ${editorState.document.assets[placedAudioAssetId]?.sourceName ?? "the authored audio asset"}.`
          );
          return true;
        }
        case "triggerVolume":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createTriggerVolumeEntity({
                position
              }),
              label: "Place trigger volume"
            })
          );
          completeCreation("Placed Trigger Volume.");
          return true;
        case "teleportTarget":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createTeleportTargetEntity({
                position
              }),
              label: "Place teleport target"
            })
          );
          completeCreation("Placed Teleport Target.");
          return true;
        case "interactable":
          store.executeCommand(
            createUpsertEntityCommand({
              entity: createInteractableEntity({
                position
              }),
              label: "Place interactable"
            })
          );
          completeCreation("Placed Interactable.");
          return true;
        case "sceneExit": {
          const destination = resolveDefaultSceneExitDestination();

          if (destination === null) {
            setStatusMessage(
              "Author a Scene Entry before placing a Scene Exit."
            );
            return false;
          }

          store.executeCommand(
            createUpsertEntityCommand({
              entity: createSceneExitEntity({
                position,
                targetSceneId: destination.targetSceneId,
                targetEntryEntityId: destination.targetEntryEntityId
              }),
              label: "Place scene exit"
            })
          );
          completeCreation("Placed Scene Exit.");
          return true;
        }
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }

    return false;
  };

  const commitModelInstanceChange = (
    currentModelInstance: ModelInstance,
    nextModelInstance: ModelInstance,
    successMessage: string
  ) => {
    if (areModelInstancesEqual(currentModelInstance, nextModelInstance)) {
      return;
    }

    store.executeCommand(
      createUpsertModelInstanceCommand({
        modelInstance: nextModelInstance,
        label: `Update ${getModelInstanceDisplayLabelById(currentModelInstance.id, editorState.document.modelInstances, editorState.document.assets).toLowerCase()}`
      })
    );
    setStatusMessage(successMessage);
  };

  const applyModelInstanceChange = () => {
    if (selectedModelInstance === null) {
      setStatusMessage("Select a model instance before editing it.");
      return;
    }

    try {
      const nextModelInstance = createModelInstance({
        id: selectedModelInstance.id,
        assetId: selectedModelInstance.assetId,
        name: selectedModelInstance.name,
        collision: selectedModelInstance.collision,
        position: readVec3Draft(modelPositionDraft, "Model instance position"),
        rotationDegrees: readVec3Draft(
          modelRotationDraft,
          "Model instance rotation"
        ),
        scale: readPositiveVec3Draft(modelScaleDraft, "Model instance scale"),
        animationClipName: selectedModelInstance.animationClipName,
        animationAutoplay: selectedModelInstance.animationAutoplay
      });

      commitModelInstanceChange(
        selectedModelInstance,
        nextModelInstance,
        "Updated model instance."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const setPlayerStartMovementTemplateEditorDraft = (
    template: PlayerStartMovementTemplate
  ) => {
    setPlayerStartMovementTemplateDraft(template);
    setPlayerStartMovementTemplateNumberDraft(
      createPlayerStartMovementTemplateNumberDraft(template)
    );
  };

  const buildPlayerStartMovementTemplateFromDraft = (
    overrides: {
      kind?: PlayerStartMovementTemplate["kind"];
      capabilities?: Partial<PlayerStartMovementTemplate["capabilities"]>;
      jump?: Partial<PlayerStartMovementTemplate["jump"]>;
      sprint?: Partial<PlayerStartMovementTemplate["sprint"]>;
      crouch?: Partial<PlayerStartMovementTemplate["crouch"]>;
    } = {}
  ): PlayerStartMovementTemplate => {
    const rawTemplate = createPlayerStartMovementTemplate({
      kind: overrides.kind ?? playerStartMovementTemplateDraft.kind,
      moveSpeed: readPositiveNumberDraft(
        playerStartMovementTemplateNumberDraft.moveSpeed,
        "Player Start move speed"
      ),
      maxSpeed: readNonNegativeNumberDraft(
        playerStartMovementTemplateNumberDraft.maxSpeed,
        "Player Start max speed"
      ),
      capabilities: {
        ...playerStartMovementTemplateDraft.capabilities,
        ...overrides.capabilities
      },
      jump: {
        ...playerStartMovementTemplateDraft.jump,
        ...overrides.jump,
        speed: readPositiveNumberDraft(
          playerStartMovementTemplateNumberDraft.jumpSpeed,
          "Player Start jump speed"
        ),
        bufferMs: readNonNegativeNumberDraft(
          playerStartMovementTemplateNumberDraft.jumpBufferMs,
          "Player Start jump buffer"
        ),
        coyoteTimeMs: readNonNegativeNumberDraft(
          playerStartMovementTemplateNumberDraft.coyoteTimeMs,
          "Player Start coyote time"
        ),
        maxHoldMs: readPositiveNumberDraft(
          playerStartMovementTemplateNumberDraft.variableJumpMaxHoldMs,
          "Player Start variable jump max hold"
        ),
        bunnyHopBoost: readNonNegativeNumberDraft(
          playerStartMovementTemplateNumberDraft.bunnyHopBoost,
          "Player Start bunny hop boost"
        )
      },
      sprint: {
        ...playerStartMovementTemplateDraft.sprint,
        ...overrides.sprint,
        speedMultiplier: readPositiveNumberDraft(
          playerStartMovementTemplateNumberDraft.sprintSpeedMultiplier,
          "Player Start sprint speed multiplier"
        )
      },
      crouch: {
        ...playerStartMovementTemplateDraft.crouch,
        ...overrides.crouch,
        speedMultiplier: readPositiveNumberDraft(
          playerStartMovementTemplateNumberDraft.crouchSpeedMultiplier,
          "Player Start crouch speed multiplier"
        )
      }
    });

    return createPlayerStartMovementTemplate({
      ...rawTemplate,
      kind: overrides.kind ?? inferPlayerStartMovementTemplateKind(rawTemplate)
    });
  };

  const commitPlayerStartMovementTemplateDraft = (
    overrides: {
      kind?: PlayerStartMovementTemplate["kind"];
      capabilities?: Partial<PlayerStartMovementTemplate["capabilities"]>;
      jump?: Partial<PlayerStartMovementTemplate["jump"]>;
      sprint?: Partial<PlayerStartMovementTemplate["sprint"]>;
      crouch?: Partial<PlayerStartMovementTemplate["crouch"]>;
    } = {},
    options: {
      schedule?: boolean;
    } = {}
  ) => {
    try {
      const nextTemplate = buildPlayerStartMovementTemplateFromDraft(overrides);
      setPlayerStartMovementTemplateDraft(nextTemplate);

      if (options.schedule === true) {
        scheduleDraftCommit(() =>
          applyPlayerStartChange({
            movementTemplate: nextTemplate
          })
        );
        return;
      }

      applyPlayerStartChange({
        movementTemplate: nextTemplate
      });
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyPlayerStartChange = (
    overrides: {
      colliderMode?: PlayerStartColliderMode;
      movementTemplate?: PlayerStartMovementTemplate;
      navigationMode?: PlayerStartNavigationMode;
      inputBindings?: PlayerStartInputBindings;
    } = {}
  ) => {
    if (selectedPlayerStart === null) {
      setStatusMessage("Select a Player Start before editing it.");
      return;
    }

    try {
      const snappedPosition = snapVec3ToGrid(
        readVec3Draft(entityPositionDraft, "Player Start position"),
        DEFAULT_GRID_SIZE
      );
      const yawDegrees = readYawDegreesDraft(playerStartYawDraft);
      const navigationMode =
        overrides.navigationMode ?? playerStartNavigationModeDraft;
      const movementTemplate =
        overrides.movementTemplate ?? playerStartMovementTemplateDraft;
      const colliderMode =
        overrides.colliderMode ?? playerStartColliderModeDraft;
      const inputBindings =
        overrides.inputBindings ?? playerStartInputBindingsDraft;
      const nextEntity = createPlayerStartEntity({
        id: selectedPlayerStart.id,
        name: selectedPlayerStart.name,
        position: snappedPosition,
        yawDegrees,
        navigationMode,
        movementTemplate,
        inputBindings,
        collider: {
          mode: colliderMode,
          eyeHeight: readPositiveNumberDraft(
            playerStartEyeHeightDraft,
            "Player Start eye height"
          ),
          capsuleRadius: readPositiveNumberDraft(
            playerStartCapsuleRadiusDraft,
            "Player Start capsule radius"
          ),
          capsuleHeight: readPositiveNumberDraft(
            playerStartCapsuleHeightDraft,
            "Player Start capsule height"
          ),
          boxSize: readPositiveVec3Draft(
            playerStartBoxSizeDraft,
            "Player Start box size"
          )
        }
      });

      commitEntityChange(
        selectedPlayerStart,
        nextEntity,
        "Updated Player Start."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handlePlayerStartKeyboardBindingChange = (
    action: PlayerStartInputAction,
    nextCode: PlayerStartKeyboardBindingCode
  ) => {
    const nextBindings = createPlayerStartInputBindings({
      keyboard: {
        ...playerStartInputBindingsDraft.keyboard,
        [action]: nextCode
      } as PlayerStartInputBindings["keyboard"],
      gamepad: playerStartInputBindingsDraft.gamepad
    });

    setPlayerStartInputBindingsDraft(nextBindings);
    scheduleDraftCommit(() =>
      applyPlayerStartChange({
        inputBindings: nextBindings
      })
    );
  };

  const handlePlayerStartMovementGamepadBindingChange = (
    action: PlayerStartMovementAction,
    nextBinding: PlayerStartGamepadBinding
  ) => {
    const nextBindings = createPlayerStartInputBindings({
      keyboard: playerStartInputBindingsDraft.keyboard,
      gamepad: {
        ...playerStartInputBindingsDraft.gamepad,
        [action]: nextBinding
      } as PlayerStartInputBindings["gamepad"]
    });

    setPlayerStartInputBindingsDraft(nextBindings);
    scheduleDraftCommit(() =>
      applyPlayerStartChange({
        inputBindings: nextBindings
      })
    );
  };

  const handlePlayerStartGamepadActionBindingChange = (
    action: PlayerStartLocomotionAction,
    nextBinding: PlayerStartGamepadActionBinding
  ) => {
    const nextBindings = createPlayerStartInputBindings({
      keyboard: playerStartInputBindingsDraft.keyboard,
      gamepad: {
        ...playerStartInputBindingsDraft.gamepad,
        [action]: nextBinding
      } as PlayerStartInputBindings["gamepad"]
    });

    setPlayerStartInputBindingsDraft(nextBindings);
    scheduleDraftCommit(() =>
      applyPlayerStartChange({
        inputBindings: nextBindings
      })
    );
  };

  const handlePlayerStartGamepadCameraLookBindingChange = (
    nextBinding: PlayerStartGamepadCameraLookBinding
  ) => {
    const nextBindings = createPlayerStartInputBindings({
      keyboard: playerStartInputBindingsDraft.keyboard,
      gamepad: {
        ...playerStartInputBindingsDraft.gamepad,
        cameraLook: nextBinding
      }
    });

    setPlayerStartInputBindingsDraft(nextBindings);
    scheduleDraftCommit(() =>
      applyPlayerStartChange({
        inputBindings: nextBindings
      })
    );
  };

  const applySceneEntryChange = () => {
    if (selectedSceneEntry === null) {
      setStatusMessage("Select a Scene Entry before editing it.");
      return;
    }

    try {
      const nextEntity = createSceneEntryEntity({
        id: selectedSceneEntry.id,
        name: selectedSceneEntry.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Scene Entry position"),
          DEFAULT_GRID_SIZE
        ),
        yawDegrees: readYawDegreesDraft(sceneEntryYawDraft)
      });

      commitEntityChange(selectedSceneEntry, nextEntity, "Updated Scene Entry.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyPointLightChange = (overrides: { colorHex?: string } = {}) => {
    if (selectedPointLight === null) {
      setStatusMessage("Select a Point Light before editing it.");
      return;
    }

    try {
      const nextEntity = createPointLightEntity({
        id: selectedPointLight.id,
        name: selectedPointLight.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Point Light position"),
          DEFAULT_GRID_SIZE
        ),
        colorHex: overrides.colorHex ?? pointLightColorDraft,
        intensity: readNonNegativeNumberDraft(
          pointLightIntensityDraft,
          "Point Light intensity"
        ),
        distance: readPositiveNumberDraft(
          pointLightDistanceDraft,
          "Point Light distance"
        )
      });

      commitEntityChange(
        selectedPointLight,
        nextEntity,
        "Updated Point Light."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySpotLightChange = (overrides: { colorHex?: string } = {}) => {
    if (selectedSpotLight === null) {
      setStatusMessage("Select a Spot Light before editing it.");
      return;
    }

    try {
      const nextEntity = createSpotLightEntity({
        id: selectedSpotLight.id,
        name: selectedSpotLight.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Spot Light position"),
          DEFAULT_GRID_SIZE
        ),
        direction: readVec3Draft(
          spotLightDirectionDraft,
          "Spot Light direction"
        ),
        colorHex: overrides.colorHex ?? spotLightColorDraft,
        intensity: readNonNegativeNumberDraft(
          spotLightIntensityDraft,
          "Spot Light intensity"
        ),
        distance: readPositiveNumberDraft(
          spotLightDistanceDraft,
          "Spot Light distance"
        ),
        angleDegrees: readPositiveNumberDraft(
          spotLightAngleDraft,
          "Spot Light angle"
        )
      });

      commitEntityChange(selectedSpotLight, nextEntity, "Updated Spot Light.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySelectedEntityDraftChange = () => {
    if (selectedEntity === null) {
      return;
    }

    switch (selectedEntity.kind) {
      case "pointLight":
        applyPointLightChange();
        break;
      case "spotLight":
        applySpotLightChange();
        break;
      case "playerStart":
        applyPlayerStartChange();
        break;
      case "sceneEntry":
        applySceneEntryChange();
        break;
      case "soundEmitter":
        applySoundEmitterChange();
        break;
      case "triggerVolume":
        applyTriggerVolumeChange();
        break;
      case "teleportTarget":
        applyTeleportTargetChange();
        break;
      case "interactable":
        applyInteractableChange();
        break;
      case "sceneExit":
        applySceneExitChange();
        break;
    }
  };

  const applySoundEmitterChange = (
    overrides: {
      audioAssetId?: string | null;
      autoplay?: boolean;
      loop?: boolean;
    } = {}
  ) => {
    if (selectedSoundEmitter === null) {
      setStatusMessage("Select a Sound Emitter before editing it.");
      return;
    }

    try {
      const trimmedAudioAssetId = soundEmitterAudioAssetIdDraft.trim();
      const nextAudioAssetId =
        overrides.audioAssetId !== undefined
          ? overrides.audioAssetId
          : trimmedAudioAssetId.length === 0
            ? null
            : trimmedAudioAssetId;
      const nextEntity = createSoundEmitterEntity({
        id: selectedSoundEmitter.id,
        name: selectedSoundEmitter.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Sound Emitter position"),
          DEFAULT_GRID_SIZE
        ),
        audioAssetId: nextAudioAssetId,
        volume: readNonNegativeNumberDraft(
          soundEmitterVolumeDraft,
          "Sound Emitter volume"
        ),
        refDistance: readPositiveNumberDraft(
          soundEmitterRefDistanceDraft,
          "Sound Emitter ref distance"
        ),
        maxDistance: readPositiveNumberDraft(
          soundEmitterMaxDistanceDraft,
          "Sound Emitter max distance"
        ),
        autoplay: overrides.autoplay ?? soundEmitterAutoplayDraft,
        loop: overrides.loop ?? soundEmitterLoopDraft
      });

      commitEntityChange(
        selectedSoundEmitter,
        nextEntity,
        "Updated Sound Emitter."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyTriggerVolumeChange = () => {
    if (selectedTriggerVolume === null) {
      setStatusMessage("Select a Trigger Volume before editing it.");
      return;
    }

    try {
      // Derive triggerOnEnter/triggerOnExit from the actual links so the flags
      // stay in sync automatically — no manual checkbox needed.
      const links = getInteractionLinksForSource(
        editorState.document.interactionLinks,
        selectedTriggerVolume.id
      );
      const triggerOnEnter = links.some((l) => l.trigger === "enter");
      const triggerOnExit = links.some((l) => l.trigger === "exit");

      const nextEntity = createTriggerVolumeEntity({
        id: selectedTriggerVolume.id,
        name: selectedTriggerVolume.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Trigger Volume position"),
          DEFAULT_GRID_SIZE
        ),
        size: snapPositiveSizeToGrid(
          readVec3Draft(triggerVolumeSizeDraft, "Trigger Volume size"),
          DEFAULT_GRID_SIZE
        ),
        triggerOnEnter,
        triggerOnExit
      });

      commitEntityChange(
        selectedTriggerVolume,
        nextEntity,
        "Updated Trigger Volume."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyTeleportTargetChange = () => {
    if (selectedTeleportTarget === null) {
      setStatusMessage("Select a Teleport Target before editing it.");
      return;
    }

    try {
      const nextEntity = createTeleportTargetEntity({
        id: selectedTeleportTarget.id,
        name: selectedTeleportTarget.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Teleport Target position"),
          DEFAULT_GRID_SIZE
        ),
        yawDegrees: readYawDegreesDraft(teleportTargetYawDraft)
      });

      commitEntityChange(
        selectedTeleportTarget,
        nextEntity,
        "Updated Teleport Target."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyInteractableChange = (overrides: { enabled?: boolean } = {}) => {
    if (selectedInteractable === null) {
      setStatusMessage("Select an Interactable before editing it.");
      return;
    }

    try {
      const nextEntity = createInteractableEntity({
        id: selectedInteractable.id,
        name: selectedInteractable.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Interactable position"),
          DEFAULT_GRID_SIZE
        ),
        radius: readPositiveNumberDraft(
          interactableRadiusDraft,
          "Interactable radius"
        ),
        prompt: readInteractablePromptDraft(interactablePromptDraft),
        enabled: overrides.enabled ?? interactableEnabledDraft
      });

      commitEntityChange(
        selectedInteractable,
        nextEntity,
        "Updated Interactable."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySceneExitChange = (
    overrides: {
      enabled?: boolean;
      targetSceneId?: string;
      targetEntryEntityId?: string;
    } = {}
  ) => {
    if (selectedSceneExit === null) {
      setStatusMessage("Select a Scene Exit before editing it.");
      return;
    }

    try {
      const nextEntity = createSceneExitEntity({
        id: selectedSceneExit.id,
        name: selectedSceneExit.name,
        position: snapVec3ToGrid(
          readVec3Draft(entityPositionDraft, "Scene Exit position"),
          DEFAULT_GRID_SIZE
        ),
        radius: readPositiveNumberDraft(
          sceneExitRadiusDraft,
          "Scene Exit radius"
        ),
        prompt: readInteractablePromptDraft(sceneExitPromptDraft),
        enabled: overrides.enabled ?? sceneExitEnabledDraft,
        targetSceneId: overrides.targetSceneId ?? sceneExitTargetSceneIdDraft,
        targetEntryEntityId:
          overrides.targetEntryEntityId ?? sceneExitTargetEntryIdDraft
      });

      commitEntityChange(selectedSceneExit, nextEntity, "Updated Scene Exit.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const commitInteractionLinkChange = (
    currentLink: InteractionLink,
    nextLink: InteractionLink,
    successMessage: string,
    label = "Update interaction link"
  ) => {
    if (areInteractionLinksEqual(currentLink, nextLink)) {
      return;
    }

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link: nextLink,
        label
      })
    );
    setStatusMessage(successMessage);
  };

  const getInteractionSourceEntityForLink = (
    link: InteractionLink
  ): InteractionSourceEntity | null => {
    const sourceEntity = editorState.document.entities[link.sourceEntityId];
    return sourceEntity?.kind === "triggerVolume" ||
      sourceEntity?.kind === "interactable"
      ? sourceEntity
      : null;
  };

  const handleAddTeleportInteractionLink = () => {
    if (selectedInteractionSource === null) {
      setStatusMessage(
        "Select a Trigger Volume or Interactable before adding links."
      );
      return;
    }

    const defaultTarget = teleportTargetOptions[0]?.entity;

    if (
      defaultTarget === undefined ||
      defaultTarget.kind !== "teleportTarget"
    ) {
      setStatusMessage(
        "Author a Teleport Target before adding a teleport link."
      );
      return;
    }

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link: createTeleportPlayerInteractionLink({
          sourceEntityId: selectedInteractionSource.id,
          trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
          targetEntityId: defaultTarget.id
        }),
        label: "Add teleport interaction link"
      })
    );
    setStatusMessage(
      `Added a teleport link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`
    );
  };

  const handleAddVisibilityInteractionLink = () => {
    if (selectedInteractionSource === null) {
      setStatusMessage(
        "Select a Trigger Volume or Interactable before adding links."
      );
      return;
    }

    const defaultTarget = visibilityBrushOptions[0]?.brush;

    if (defaultTarget === undefined) {
      setStatusMessage(
        "Author at least one whitebox solid before adding a visibility link."
      );
      return;
    }

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link: createToggleVisibilityInteractionLink({
          sourceEntityId: selectedInteractionSource.id,
          trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
          targetBrushId: defaultTarget.id
        }),
        label: "Add visibility interaction link"
      })
    );
    setStatusMessage(
      `Added a visibility link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`
    );
  };

  const handleAddSoundInteractionLink = (
    actionType: "playSound" | "stopSound"
  ) => {
    if (selectedInteractionSource === null) {
      setStatusMessage(
        "Select a Trigger Volume or Interactable before adding links."
      );
      return;
    }

    const defaultTarget = playableSoundEmitterOptions[0]?.entity;

    if (defaultTarget === undefined) {
      setStatusMessage(
        "Author a Sound Emitter with an audio asset before adding sound links."
      );
      return;
    }

    const link =
      actionType === "playSound"
        ? createPlaySoundInteractionLink({
            sourceEntityId: selectedInteractionSource.id,
            trigger: getDefaultInteractionLinkTrigger(
              selectedInteractionSource
            ),
            targetSoundEmitterId: defaultTarget.id
          })
        : createStopSoundInteractionLink({
            sourceEntityId: selectedInteractionSource.id,
            trigger: getDefaultInteractionLinkTrigger(
              selectedInteractionSource
            ),
            targetSoundEmitterId: defaultTarget.id
          });

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link,
        label:
          actionType === "playSound"
            ? "Add play sound link"
            : "Add stop sound link"
      })
    );
    setStatusMessage(
      `Added a ${actionType === "playSound" ? "play sound" : "stop sound"} link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`
    );
  };

  const handleDeleteInteractionLink = (linkId: string) => {
    try {
      store.executeCommand(createDeleteInteractionLinkCommand(linkId));
      setStatusMessage("Deleted interaction link.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const confirmDeleteSceneItem = (label: string) =>
    globalThis.window.confirm(
      `Delete ${label}?\n\nThis can be undone with Undo.`
    );

  const handleDeleteBrush = (brushId: string) => {
    const label = getBrushLabelById(brushId, brushList);

    if (!confirmDeleteSceneItem(label)) {
      return false;
    }

    try {
      store.executeCommand(createDeleteBoxBrushCommand(brushId));
      setStatusMessage(`Deleted ${label}.`);
      return true;
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      return false;
    }
  };

  const handleDeleteEntity = (entityId: string) => {
    const label = getEntityDisplayLabelById(
      entityId,
      editorState.document.entities,
      editorState.document.assets
    );

    if (!confirmDeleteSceneItem(label)) {
      return false;
    }

    try {
      store.executeCommand(createDeleteEntityCommand(entityId));
      setStatusMessage(`Deleted ${label}.`);
      return true;
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      return false;
    }
  };

  const handleDeleteModelInstance = (modelInstanceId: string) => {
    const label = getModelInstanceDisplayLabelById(
      modelInstanceId,
      editorState.document.modelInstances,
      editorState.document.assets
    );

    if (!confirmDeleteSceneItem(label)) {
      return false;
    }

    try {
      store.executeCommand(createDeleteModelInstanceCommand(modelInstanceId));
      setStatusMessage(`Deleted ${label}.`);
      return true;
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      return false;
    }
  };

  const handleDeleteSelectedSceneItem = () => {
    const selectedBrushId = getSingleSelectedBrushId(editorState.selection);

    if (selectedBrushId !== null) {
      return handleDeleteBrush(selectedBrushId);
    }

    const selectedEntityId = getSingleSelectedEntityId(editorState.selection);

    if (selectedEntityId !== null) {
      return handleDeleteEntity(selectedEntityId);
    }

    const selectedModelInstanceId = getSingleSelectedModelInstanceId(
      editorState.selection
    );

    if (selectedModelInstanceId !== null) {
      return handleDeleteModelInstance(selectedModelInstanceId);
    }

    return false;
  };

  const handleDuplicateSelection = () => {
    if (!selectionCanBeDuplicated(editorState.selection)) {
      return false;
    }

    try {
      store.executeCommand(createDuplicateSelectionCommand());

      const duplicatedState = store.getState();
      const duplicatedSelection = duplicatedState.selection;
      const canGrabDuplicatedSelection =
        (duplicatedSelection.kind === "brushes" ||
          duplicatedSelection.kind === "entities" ||
          duplicatedSelection.kind === "modelInstances") &&
        duplicatedSelection.ids.length === 1;

      if (canGrabDuplicatedSelection) {
        const transformSourcePanelId =
          layoutMode === "quad"
            ? (hoveredViewportPanelId ?? activePanelId)
            : activePanelId;
        const transformTargetResult = resolveTransformTarget(
          duplicatedState.document,
          duplicatedSelection,
          whiteboxSelectionMode
        );
        const transformTarget = transformTargetResult.target;

        if (transformTarget === null) {
          setStatusMessage(
            transformTargetResult.message ??
              "Duplicated selection, but could not start move transform."
          );
          return true;
        }

        if (duplicatedState.activeViewportPanelId !== transformSourcePanelId) {
          store.setActiveViewportPanel(transformSourcePanelId);
        }

        store.setTransformSession(
          createTransformSession({
            source: "keyboard",
            sourcePanelId: transformSourcePanelId,
            operation: "translate",
            target: transformTarget
          })
        );

        setStatusMessage(
          `Move ${getTransformTargetLabel(transformTarget).toLowerCase()} in ${getViewportPanelLabel(
            transformSourcePanelId
          )}. Move the pointer, press X/Y/Z to constrain, press the same axis again for local when supported, click or press Enter to commit, Escape cancels.`
        );
      } else {
        setStatusMessage("Duplicated selection.");
      }

      return true;
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      return false;
    }
  };

  const updateInteractionLinkTrigger = (
    link: InteractionLink,
    trigger: InteractionTriggerKind
  ) => {
    const sourceEntity = getInteractionSourceEntityForLink(link);

    if (sourceEntity?.kind === "interactable" && trigger !== "click") {
      setStatusMessage("Interactable links always use the click trigger.");
      return;
    }

    if (sourceEntity?.kind === "triggerVolume" && trigger === "click") {
      setStatusMessage(
        "Trigger Volume links may only use enter or exit triggers."
      );
      return;
    }

    let nextLink: InteractionLink;

    switch (link.action.type) {
      case "teleportPlayer":
        nextLink = createTeleportPlayerInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetEntityId: link.action.targetEntityId
        });
        break;
      case "toggleVisibility":
        nextLink = createToggleVisibilityInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetBrushId: link.action.targetBrushId,
          visible: link.action.visible
        });
        break;
      case "playAnimation":
        nextLink = createPlayAnimationInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetModelInstanceId: link.action.targetModelInstanceId,
          clipName: link.action.clipName,
          loop: link.action.loop
        });
        break;
      case "stopAnimation":
        nextLink = createStopAnimationInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetModelInstanceId: link.action.targetModelInstanceId
        });
        break;
      case "playSound":
        nextLink = createPlaySoundInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetSoundEmitterId: link.action.targetSoundEmitterId
        });
        break;
      case "stopSound":
        nextLink = createStopSoundInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger,
          targetSoundEmitterId: link.action.targetSoundEmitterId
        });
        break;
    }

    commitInteractionLinkChange(
      link,
      nextLink,
      `Updated ${getInteractionTriggerLabel(trigger).toLowerCase()} trigger link.`
    );
  };

  const updateInteractionLinkActionType = (
    link: InteractionLink,
    actionType: InteractionLink["action"]["type"]
  ) => {
    const sourceEntity = getInteractionSourceEntityForLink(link);

    if (sourceEntity === null || link.action.type === actionType) {
      return;
    }

    if (actionType === "teleportPlayer") {
      const defaultTarget = teleportTargetOptions[0]?.entity;

      if (
        defaultTarget === undefined ||
        defaultTarget.kind !== "teleportTarget"
      ) {
        setStatusMessage(
          "Author a Teleport Target before switching this link to teleport."
        );
        return;
      }

      commitInteractionLinkChange(
        link,
        createTeleportPlayerInteractionLink({
          id: link.id,
          sourceEntityId: sourceEntity.id,
          trigger: link.trigger,
          targetEntityId: defaultTarget.id
        }),
        "Switched link action to teleport player."
      );
      return;
    }

    if (actionType === "playAnimation") {
      const targetModelInstance =
        (link.action.type === "playAnimation" ||
        link.action.type === "stopAnimation"
          ? editorState.document.modelInstances[
              link.action.targetModelInstanceId
            ]
          : undefined) ?? modelInstanceDisplayList[0]?.modelInstance;

      if (targetModelInstance === undefined) {
        setStatusMessage(
          "Place a model instance before switching this link to play animation."
        );
        return;
      }

      const asset = editorState.document.assets[targetModelInstance.assetId];
      const firstClip =
        asset?.kind === "model" ? (asset.metadata.animationNames[0] ?? "") : "";

      if (firstClip === "") {
        setStatusMessage("The model instance has no animation clips.");
        return;
      }

      commitInteractionLinkChange(
        link,
        createPlayAnimationInteractionLink({
          id: link.id,
          sourceEntityId: sourceEntity.id,
          trigger: link.trigger,
          targetModelInstanceId: targetModelInstance.id,
          clipName: firstClip
        }),
        "Switched link action to play animation."
      );
      return;
    }

    if (actionType === "stopAnimation") {
      const targetModelInstance =
        (link.action.type === "playAnimation" ||
        link.action.type === "stopAnimation"
          ? editorState.document.modelInstances[
              link.action.targetModelInstanceId
            ]
          : undefined) ?? modelInstanceDisplayList[0]?.modelInstance;

      if (targetModelInstance === undefined) {
        setStatusMessage(
          "Place a model instance before switching this link to stop animation."
        );
        return;
      }

      commitInteractionLinkChange(
        link,
        createStopAnimationInteractionLink({
          id: link.id,
          sourceEntityId: sourceEntity.id,
          trigger: link.trigger,
          targetModelInstanceId: targetModelInstance.id
        }),
        "Switched link action to stop animation."
      );
      return;
    }

    if (actionType === "playSound" || actionType === "stopSound") {
      const targetSoundEmitter =
        (link.action.type === "playSound" || link.action.type === "stopSound"
          ? editorState.document.entities[link.action.targetSoundEmitterId]
          : undefined) ?? playableSoundEmitterOptions[0]?.entity;

      if (
        targetSoundEmitter === undefined ||
        targetSoundEmitter.kind !== "soundEmitter"
      ) {
        setStatusMessage(
          "Author a Sound Emitter with an audio asset before switching this link to sound playback."
        );
        return;
      }

      if (actionType === "playSound") {
        commitInteractionLinkChange(
          link,
          createPlaySoundInteractionLink({
            id: link.id,
            sourceEntityId: sourceEntity.id,
            trigger: link.trigger,
            targetSoundEmitterId: targetSoundEmitter.id
          }),
          "Switched link action to play sound."
        );
      } else {
        commitInteractionLinkChange(
          link,
          createStopSoundInteractionLink({
            id: link.id,
            sourceEntityId: sourceEntity.id,
            trigger: link.trigger,
            targetSoundEmitterId: targetSoundEmitter.id
          }),
          "Switched link action to stop sound."
        );
      }

      return;
    }

    const defaultBrush = visibilityBrushOptions[0]?.brush;

    if (defaultBrush === undefined) {
      setStatusMessage(
        "Author at least one whitebox solid before switching this link to visibility."
      );
      return;
    }

    commitInteractionLinkChange(
      link,
      createToggleVisibilityInteractionLink({
        id: link.id,
        sourceEntityId: sourceEntity.id,
        trigger: link.trigger,
        targetBrushId: defaultBrush.id
      }),
      "Switched link action to toggle visibility."
    );
  };

  const updateTeleportInteractionLinkTarget = (
    link: InteractionLink,
    targetEntityId: string
  ) => {
    if (link.action.type !== "teleportPlayer") {
      return;
    }

    commitInteractionLinkChange(
      link,
      createTeleportPlayerInteractionLink({
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        targetEntityId
      }),
      "Updated teleport link target."
    );
  };

  const updateVisibilityInteractionLinkTarget = (
    link: InteractionLink,
    targetBrushId: string
  ) => {
    if (link.action.type !== "toggleVisibility") {
      return;
    }

    commitInteractionLinkChange(
      link,
      createToggleVisibilityInteractionLink({
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        targetBrushId,
        visible: link.action.visible
      }),
      "Updated visibility link target."
    );
  };

  const updateVisibilityInteractionMode = (
    link: InteractionLink,
    mode: "toggle" | "show" | "hide"
  ) => {
    if (link.action.type !== "toggleVisibility") {
      return;
    }

    commitInteractionLinkChange(
      link,
      createToggleVisibilityInteractionLink({
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        targetBrushId: link.action.targetBrushId,
        visible: readVisibilityModeSelectValue(mode)
      }),
      "Updated visibility link mode."
    );
  };

  const updateSoundInteractionLinkTarget = (
    link: InteractionLink,
    targetSoundEmitterId: string
  ) => {
    if (link.action.type !== "playSound" && link.action.type !== "stopSound") {
      return;
    }

    if (link.action.type === "playSound") {
      commitInteractionLinkChange(
        link,
        createPlaySoundInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger: link.trigger,
          targetSoundEmitterId
        }),
        "Updated play sound link target."
      );
    } else {
      commitInteractionLinkChange(
        link,
        createStopSoundInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger: link.trigger,
          targetSoundEmitterId
        }),
        "Updated stop sound link target."
      );
    }
  };

  const updateAnimationInteractionLinkTarget = (
    link: InteractionLink,
    targetModelInstanceId: string
  ) => {
    if (
      link.action.type !== "playAnimation" &&
      link.action.type !== "stopAnimation"
    ) {
      return;
    }

    if (link.action.type === "playAnimation") {
      commitInteractionLinkChange(
        link,
        createPlayAnimationInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger: link.trigger,
          targetModelInstanceId,
          clipName: link.action.clipName,
          loop: link.action.loop
        }),
        "Updated play animation link target."
      );
    } else {
      commitInteractionLinkChange(
        link,
        createStopAnimationInteractionLink({
          id: link.id,
          sourceEntityId: link.sourceEntityId,
          trigger: link.trigger,
          targetModelInstanceId
        }),
        "Updated stop animation link target."
      );
    }
  };

  const updatePlayAnimationLinkClip = (
    link: InteractionLink,
    clipName: string
  ) => {
    if (link.action.type !== "playAnimation") {
      return;
    }

    commitInteractionLinkChange(
      link,
      createPlayAnimationInteractionLink({
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        targetModelInstanceId: link.action.targetModelInstanceId,
        clipName,
        loop: link.action.loop
      }),
      "Updated play animation clip."
    );
  };

  const updatePlayAnimationLinkLoop = (
    link: InteractionLink,
    loop: boolean
  ) => {
    if (link.action.type !== "playAnimation") {
      return;
    }

    commitInteractionLinkChange(
      link,
      createPlayAnimationInteractionLink({
        id: link.id,
        sourceEntityId: link.sourceEntityId,
        trigger: link.trigger,
        targetModelInstanceId: link.action.targetModelInstanceId,
        clipName: link.action.clipName,
        loop
      }),
      "Updated play animation loop setting."
    );
  };

  const handleAddPlayAnimationLink = (
    sourceEntity: InteractionSourceEntity
  ) => {
    const firstInstance = modelInstanceDisplayList[0];

    if (firstInstance === undefined) {
      setStatusMessage(
        "Place a model instance before adding an animation link."
      );
      return;
    }

    const asset =
      editorState.document.assets[firstInstance.modelInstance.assetId];
    const firstClip =
      asset?.kind === "model" ? (asset.metadata.animationNames[0] ?? "") : "";

    if (firstClip === "") {
      setStatusMessage("The model instance has no animation clips.");
      return;
    }

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link: createPlayAnimationInteractionLink({
          sourceEntityId: sourceEntity.id,
          trigger: getDefaultInteractionLinkTrigger(sourceEntity),
          targetModelInstanceId: firstInstance.modelInstance.id,
          clipName: firstClip
        }),
        label: "Add play animation link"
      })
    );
    setStatusMessage("Added a play animation link.");
  };

  const handleAddStopAnimationLink = (
    sourceEntity: InteractionSourceEntity
  ) => {
    const firstInstance = modelInstanceDisplayList[0];

    if (firstInstance === undefined) {
      setStatusMessage(
        "Place a model instance before adding an animation link."
      );
      return;
    }

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link: createStopAnimationInteractionLink({
          sourceEntityId: sourceEntity.id,
          trigger: getDefaultInteractionLinkTrigger(sourceEntity),
          targetModelInstanceId: firstInstance.modelInstance.id
        }),
        label: "Add stop animation link"
      })
    );
    setStatusMessage("Added a stop animation link.");
  };

  const renderInteractionLinksSection = (
    sourceEntity: InteractionSourceEntity,
    links: InteractionLink[],
    addTeleportTestId: string,
    addVisibilityTestId: string,
    addPlaySoundTestId: string,
    addStopSoundTestId: string
  ) => (
    <div className="form-section">
      <div className="label">Links</div>
      {links.length === 0 ? (
        <div className="outliner-empty">
          {sourceEntity.kind === "triggerVolume"
            ? "No trigger links authored yet."
            : "No click links authored yet."}
        </div>
      ) : (
        <div className="outliner-list">
          {links.map((link, index) => (
            <div key={link.id} className="outliner-item">
              <div className="outliner-item__select">
                <span className="outliner-item__title">{`Link ${index + 1}`}</span>
                <span className="outliner-item__meta">
                  {getInteractionActionLabel(link)}
                </span>
              </div>

              <div className="form-section">
                <div className="vector-inputs vector-inputs--two">
                  <label className="form-field">
                    <span className="label">Trigger</span>
                    {sourceEntity.kind === "triggerVolume" ? (
                      <select
                        data-testid={`interaction-link-trigger-${link.id}`}
                        className="text-input"
                        value={link.trigger}
                        onChange={(event) =>
                          updateInteractionLinkTrigger(
                            link,
                            event.currentTarget.value as InteractionTriggerKind
                          )
                        }
                      >
                        <option value="enter">On Enter</option>
                        <option value="exit">On Exit</option>
                      </select>
                    ) : (
                      <input
                        data-testid={`interaction-link-trigger-${link.id}`}
                        className="text-input"
                        type="text"
                        value={getInteractionTriggerLabel(link.trigger)}
                        readOnly
                      />
                    )}
                  </label>
                  <label className="form-field">
                    <span className="label">Action</span>
                    <select
                      data-testid={`interaction-link-action-${link.id}`}
                      className="text-input"
                      value={link.action.type}
                      onChange={(event) =>
                        updateInteractionLinkActionType(
                          link,
                          event.currentTarget
                            .value as InteractionLink["action"]["type"]
                        )
                      }
                    >
                      <option value="teleportPlayer">Teleport Player</option>
                      <option value="toggleVisibility">
                        Toggle Visibility
                      </option>
                      <option value="playAnimation">Play Animation</option>
                      <option value="stopAnimation">Stop Animation</option>
                      <option value="playSound">Play Sound</option>
                      <option value="stopSound">Stop Sound</option>
                    </select>
                  </label>
                </div>
              </div>

              {link.action.type === "teleportPlayer" ? (
                <div className="form-section">
                  <label className="form-field">
                    <span className="label">Target</span>
                    <select
                      data-testid={`interaction-link-teleport-target-${link.id}`}
                      className="text-input"
                      value={link.action.targetEntityId}
                      onChange={(event) =>
                        updateTeleportInteractionLinkTarget(
                          link,
                          event.currentTarget.value
                        )
                      }
                    >
                      {teleportTargetOptions.map(({ entity, label }) => (
                        <option key={entity.id} value={entity.id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : link.action.type === "toggleVisibility" ? (
                <div className="form-section">
                  <div className="vector-inputs vector-inputs--two">
                    <label className="form-field">
                      <span className="label">Solid</span>
                      <select
                        data-testid={`interaction-link-visibility-target-${link.id}`}
                        className="text-input"
                        value={link.action.targetBrushId}
                        onChange={(event) =>
                          updateVisibilityInteractionLinkTarget(
                            link,
                            event.currentTarget.value
                          )
                        }
                      >
                        {visibilityBrushOptions.map(({ brush, label }) => (
                          <option key={brush.id} value={brush.id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="label">Mode</span>
                      <select
                        data-testid={`interaction-link-visibility-mode-${link.id}`}
                        className="text-input"
                        value={getVisibilityModeSelectValue(
                          link.action.visible
                        )}
                        onChange={(event) =>
                          updateVisibilityInteractionMode(
                            link,
                            event.currentTarget.value as ReturnType<
                              typeof getVisibilityModeSelectValue
                            >
                          )
                        }
                      >
                        <option value="toggle">Toggle</option>
                        <option value="show">Show</option>
                        <option value="hide">Hide</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : link.action.type === "playAnimation" ? (
                <div className="form-section">
                  <div className="vector-inputs vector-inputs--two">
                    <label className="form-field">
                      <span className="label">Instance</span>
                      <select
                        data-testid={`interaction-link-play-anim-instance-${link.id}`}
                        className="text-input"
                        value={link.action.targetModelInstanceId}
                        onChange={(event) =>
                          updateAnimationInteractionLinkTarget(
                            link,
                            event.currentTarget.value
                          )
                        }
                      >
                        {modelInstanceDisplayList.map(
                          ({ modelInstance, label }) => (
                            <option
                              key={modelInstance.id}
                              value={modelInstance.id}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="label">Clip</span>
                      <select
                        data-testid={`interaction-link-play-anim-clip-${link.id}`}
                        className="text-input"
                        value={link.action.clipName}
                        onChange={(event) =>
                          updatePlayAnimationLinkClip(
                            link,
                            event.currentTarget.value
                          )
                        }
                      >
                        {(
                          editorState.document.assets[
                            editorState.document.modelInstances[
                              link.action.targetModelInstanceId
                            ]?.assetId ?? ""
                          ] as
                            | {
                                kind: "model";
                                metadata: { animationNames: string[] };
                              }
                            | undefined
                        )?.metadata.animationNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        )) ?? (
                          <option value={link.action.clipName}>
                            {link.action.clipName}
                          </option>
                        )}
                      </select>
                    </label>
                  </div>
                  <label className="form-field">
                    <input
                      type="checkbox"
                      data-testid={`interaction-link-play-anim-loop-${link.id}`}
                      checked={link.action.loop !== false}
                      onChange={(event) =>
                        updatePlayAnimationLinkLoop(
                          link,
                          event.currentTarget.checked
                        )
                      }
                    />
                    <span className="label">Loop</span>
                  </label>
                </div>
              ) : link.action.type === "playSound" ||
                link.action.type === "stopSound" ? (
                <div className="form-section">
                  <label className="form-field">
                    <span className="label">Emitter</span>
                    <select
                      data-testid={`interaction-link-sound-target-${link.id}`}
                      className="text-input"
                      value={link.action.targetSoundEmitterId}
                      onChange={(event) =>
                        updateSoundInteractionLinkTarget(
                          link,
                          event.currentTarget.value
                        )
                      }
                    >
                      {soundEmitterOptions.map(({ entity, label }) => (
                        <option key={entity.id} value={entity.id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="form-section">
                  <label className="form-field">
                    <span className="label">Instance</span>
                    <select
                      data-testid={`interaction-link-stop-anim-instance-${link.id}`}
                      className="text-input"
                      value={link.action.targetModelInstanceId}
                      onChange={(event) =>
                        updateAnimationInteractionLinkTarget(
                          link,
                          event.currentTarget.value
                        )
                      }
                    >
                      {modelInstanceDisplayList.map(
                        ({ modelInstance, label }) => (
                          <option
                            key={modelInstance.id}
                            value={modelInstance.id}
                          >
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>
              )}

              <div className="inline-actions">
                <button
                  className="toolbar__button"
                  type="button"
                  data-testid={`delete-interaction-link-${link.id}`}
                  onClick={() => handleDeleteInteractionLink(link.id)}
                >
                  Delete Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button
          className="toolbar__button"
          type="button"
          data-testid={addTeleportTestId}
          disabled={teleportTargetOptions.length === 0}
          onClick={handleAddTeleportInteractionLink}
        >
          Add Teleport Link
        </button>
        <button
          className="toolbar__button"
          type="button"
          data-testid={addVisibilityTestId}
          disabled={visibilityBrushOptions.length === 0}
          onClick={handleAddVisibilityInteractionLink}
        >
          Add Visibility Link
        </button>
        <button
          className="toolbar__button"
          type="button"
          disabled={modelInstanceDisplayList.length === 0}
          onClick={() => handleAddPlayAnimationLink(sourceEntity)}
        >
          Add Play Anim Link
        </button>
        <button
          className="toolbar__button"
          type="button"
          disabled={modelInstanceDisplayList.length === 0}
          onClick={() => handleAddStopAnimationLink(sourceEntity)}
        >
          Add Stop Anim Link
        </button>
        <button
          className="toolbar__button"
          type="button"
          data-testid={addPlaySoundTestId}
          disabled={playableSoundEmitterOptions.length === 0}
          onClick={() => handleAddSoundInteractionLink("playSound")}
        >
          Add Play Sound Link
        </button>
        <button
          className="toolbar__button"
          type="button"
          data-testid={addStopSoundTestId}
          disabled={playableSoundEmitterOptions.length === 0}
          onClick={() => handleAddSoundInteractionLink("stopSound")}
        >
          Add Stop Sound Link
        </button>
      </div>
    </div>
  );

  const applyWorldSettings = (
    nextWorld: WorldSettings,
    label: string,
    successMessage: string
  ) => {
    if (areWorldSettingsEqual(editorState.document.world, nextWorld)) {
      return;
    }

    try {
      store.executeCommand(
        createSetWorldSettingsCommand({
          label,
          world: nextWorld
        })
      );
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingSettings = (
    label: string,
    successMessage: string,
    mutate: (advancedRendering: AdvancedRenderingSettings) => void
  ) => {
    const nextWorld = cloneWorldSettings(editorState.document.world);
    mutate(nextWorld.advancedRendering);
    applyWorldSettings(nextWorld, label, successMessage);
  };

  const applyWorldBackgroundMode = (
    mode: WorldBackgroundMode,
    imageAssetId?: string
  ) => {
    if (mode === "image") {
      const currentBackgroundAssetId =
        editorState.document.world.background.mode === "image"
          ? editorState.document.world.background.assetId
          : null;
      const nextImageAssetId =
        imageAssetId ??
        (currentBackgroundAssetId !== null &&
        editorState.document.assets[currentBackgroundAssetId]?.kind === "image"
          ? currentBackgroundAssetId
          : imageAssetList[0]?.id);

      if (nextImageAssetId === undefined) {
        setStatusMessage(
          "Import an image asset before using an image background."
        );
        return;
      }

      applyWorldSettings(
        {
          ...editorState.document.world,
          background: changeWorldBackgroundMode(
            editorState.document.world.background,
            "image",
            nextImageAssetId
          )
        },
        "Set world background image",
        `World background set to ${editorState.document.assets[nextImageAssetId]?.sourceName ?? nextImageAssetId}.`
      );
      return;
    }

    applyWorldSettings(
      {
        ...editorState.document.world,
        background: changeWorldBackgroundMode(
          editorState.document.world.background,
          mode
        )
      },
      "Set world background mode",
      mode === "solid"
        ? "World background set to a solid color."
        : "World background set to a vertical gradient."
    );
  };

  const applyWorldBackgroundColor = (colorHex: string) => {
    if (editorState.document.world.background.mode !== "solid") {
      return;
    }

    applyWorldSettings(
      {
        ...editorState.document.world,
        background: {
          mode: "solid",
          colorHex
        }
      },
      "Set world background color",
      "Updated the world background color."
    );
  };

  const applyWorldGradientColor = (
    edge: "top" | "bottom",
    colorHex: string
  ) => {
    if (editorState.document.world.background.mode !== "verticalGradient") {
      return;
    }

    applyWorldSettings(
      {
        ...editorState.document.world,
        background:
          edge === "top"
            ? {
                ...editorState.document.world.background,
                topColorHex: colorHex
              }
            : {
                ...editorState.document.world.background,
                bottomColorHex: colorHex
              }
      },
      edge === "top"
        ? "Set world gradient top color"
        : "Set world gradient bottom color",
      edge === "top"
        ? "Updated the world gradient top color."
        : "Updated the world gradient bottom color."
    );
  };

  const applyBackgroundEnvironmentIntensity = () => {
    if (editorState.document.world.background.mode !== "image") {
      return;
    }

    const intensity = readNonNegativeNumberDraft(
      backgroundEnvironmentIntensityDraft,
      "Environment intensity"
    );
    applyWorldSettings(
      {
        ...editorState.document.world,
        background: {
          ...editorState.document.world.background,
          environmentIntensity: intensity
        }
      },
      "Set background environment intensity",
      "Updated the background environment intensity."
    );
  };

  const applyAmbientLightColor = (colorHex: string) => {
    applyWorldSettings(
      {
        ...editorState.document.world,
        ambientLight: {
          ...editorState.document.world.ambientLight,
          colorHex
        }
      },
      "Set world ambient light color",
      "Updated the world ambient light color."
    );
  };

  const applyAmbientLightIntensity = () => {
    try {
      applyWorldSettings(
        {
          ...editorState.document.world,
          ambientLight: {
            ...editorState.document.world.ambientLight,
            intensity: readNonNegativeNumberDraft(
              ambientLightIntensityDraft,
              "Ambient light intensity"
            )
          }
        },
        "Set world ambient light intensity",
        "Updated the world ambient light intensity."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySunLightColor = (colorHex: string) => {
    applyWorldSettings(
      {
        ...editorState.document.world,
        sunLight: {
          ...editorState.document.world.sunLight,
          colorHex
        }
      },
      "Set world sun color",
      "Updated the world sun color."
    );
  };

  const applySunLightIntensity = () => {
    try {
      applyWorldSettings(
        {
          ...editorState.document.world,
          sunLight: {
            ...editorState.document.world.sunLight,
            intensity: readNonNegativeNumberDraft(
              sunLightIntensityDraft,
              "Sun intensity"
            )
          }
        },
        "Set world sun intensity",
        "Updated the world sun intensity."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySunLightDirection = () => {
    try {
      const direction = readVec3Draft(sunDirectionDraft, "Sun direction");

      if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
        throw new Error("Sun direction must not be the zero vector.");
      }

      applyWorldSettings(
        {
          ...editorState.document.world,
          sunLight: {
            ...editorState.document.world.sunLight,
            direction
          }
        },
        "Set world sun direction",
        "Updated the world sun direction."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingEnabled = (enabled: boolean) => {
    applyAdvancedRenderingSettings(
      "Set advanced rendering",
      enabled ? "Advanced rendering enabled." : "Advanced rendering disabled.",
      (advancedRendering) => {
        advancedRendering.enabled = enabled;
      }
    );
  };

  const applyAdvancedRenderingShadowsEnabled = (enabled: boolean) => {
    applyAdvancedRenderingSettings(
      "Set advanced rendering shadows",
      enabled
        ? "Advanced rendering shadows enabled."
        : "Advanced rendering shadows disabled.",
      (advancedRendering) => {
        advancedRendering.shadows.enabled = enabled;
      }
    );
  };

  const applyAdvancedRenderingShadowMapSize = (
    shadowMapSize: AdvancedRenderingShadowMapSize
  ) => {
    applyAdvancedRenderingSettings(
      "Set advanced rendering shadow map size",
      "Updated the shadow map size.",
      (advancedRendering) => {
        advancedRendering.shadows.mapSize = shadowMapSize;
      }
    );
  };

  const applyAdvancedRenderingShadowType = (
    shadowType: AdvancedRenderingShadowType
  ) => {
    applyAdvancedRenderingSettings(
      "Set advanced rendering shadow type",
      "Updated the shadow map type.",
      (advancedRendering) => {
        advancedRendering.shadows.type = shadowType;
      }
    );
  };

  const applyAdvancedRenderingShadowBias = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set advanced rendering shadow bias",
        "Updated the shadow bias.",
        (advancedRendering) => {
          advancedRendering.shadows.bias = readFiniteNumberDraft(
            advancedRenderingShadowBiasDraft,
            "Shadow bias"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingAmbientOcclusionEnabled = (enabled: boolean) => {
    applyAdvancedRenderingSettings(
      "Set ambient occlusion",
      enabled ? "Ambient occlusion enabled." : "Ambient occlusion disabled.",
      (advancedRendering) => {
        advancedRendering.ambientOcclusion.enabled = enabled;
      }
    );
  };

  const applyAdvancedRenderingAmbientOcclusionIntensity = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set ambient occlusion intensity",
        "Updated the ambient occlusion intensity.",
        (advancedRendering) => {
          advancedRendering.ambientOcclusion.intensity =
            readNonNegativeNumberDraft(
              advancedRenderingAmbientOcclusionIntensityDraft,
              "Ambient occlusion intensity"
            );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingAmbientOcclusionRadius = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set ambient occlusion radius",
        "Updated the ambient occlusion radius.",
        (advancedRendering) => {
          advancedRendering.ambientOcclusion.radius =
            readNonNegativeNumberDraft(
              advancedRenderingAmbientOcclusionRadiusDraft,
              "Ambient occlusion radius"
            );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingAmbientOcclusionSamples = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set ambient occlusion samples",
        "Updated the ambient occlusion samples.",
        (advancedRendering) => {
          advancedRendering.ambientOcclusion.samples = readPositiveIntegerDraft(
            advancedRenderingAmbientOcclusionSamplesDraft,
            "Ambient occlusion samples"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingBloomEnabled = (enabled: boolean) => {
    applyAdvancedRenderingSettings(
      "Set bloom",
      enabled ? "Bloom enabled." : "Bloom disabled.",
      (advancedRendering) => {
        advancedRendering.bloom.enabled = enabled;
      }
    );
  };

  const applyAdvancedRenderingBloomIntensity = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set bloom intensity",
        "Updated the bloom intensity.",
        (advancedRendering) => {
          advancedRendering.bloom.intensity = readNonNegativeNumberDraft(
            advancedRenderingBloomIntensityDraft,
            "Bloom intensity"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingBloomThreshold = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set bloom threshold",
        "Updated the bloom threshold.",
        (advancedRendering) => {
          advancedRendering.bloom.threshold = readNonNegativeNumberDraft(
            advancedRenderingBloomThresholdDraft,
            "Bloom threshold"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingBloomRadius = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set bloom radius",
        "Updated the bloom radius.",
        (advancedRendering) => {
          advancedRendering.bloom.radius = readNonNegativeNumberDraft(
            advancedRenderingBloomRadiusDraft,
            "Bloom radius"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingToneMappingMode = (
    mode: AdvancedRenderingToneMappingMode
  ) => {
    applyAdvancedRenderingSettings(
      "Set tone mapping mode",
      "Updated the tone mapping mode.",
      (advancedRendering) => {
        advancedRendering.toneMapping.mode = mode;
      }
    );
  };

  const applyAdvancedRenderingToneMappingExposure = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set tone mapping exposure",
        "Updated the tone mapping exposure.",
        (advancedRendering) => {
          advancedRendering.toneMapping.exposure = readPositiveNumberDraft(
            advancedRenderingToneMappingExposureDraft,
            "Tone mapping exposure"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingDepthOfFieldEnabled = (enabled: boolean) => {
    applyAdvancedRenderingSettings(
      "Set depth of field",
      enabled ? "Depth of field enabled." : "Depth of field disabled.",
      (advancedRendering) => {
        advancedRendering.depthOfField.enabled = enabled;
      }
    );
  };

  const applyAdvancedRenderingDepthOfFieldFocusDistance = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set focus distance",
        "Updated the focus distance.",
        (advancedRendering) => {
          advancedRendering.depthOfField.focusDistance =
            readNonNegativeNumberDraft(
              advancedRenderingDepthOfFieldFocusDistanceDraft,
              "Focus distance"
            );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingDepthOfFieldFocalLength = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set focal length",
        "Updated the focal length.",
        (advancedRendering) => {
          advancedRendering.depthOfField.focalLength = readPositiveNumberDraft(
            advancedRenderingDepthOfFieldFocalLengthDraft,
            "Focal length"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingDepthOfFieldBokehScale = () => {
    try {
      applyAdvancedRenderingSettings(
        "Set bokeh scale",
        "Updated the bokeh scale.",
        (advancedRendering) => {
          advancedRendering.depthOfField.bokehScale = readPositiveNumberDraft(
            advancedRenderingDepthOfFieldBokehScaleDraft,
            "Bokeh scale"
          );
        }
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyAdvancedRenderingFogPath = (path: BoxVolumeRenderPath) => {
    applyAdvancedRenderingSettings(
      "Set fog render path",
      `Fog render path set to ${formatBoxVolumeRenderPathLabel(path)}.`,
      (advancedRendering) => {
        advancedRendering.fogPath = path;
      }
    );
  };

  const applyAdvancedRenderingWaterPath = (path: BoxVolumeRenderPath) => {
    applyAdvancedRenderingSettings(
      "Set water render path",
      `Water render path set to ${formatBoxVolumeRenderPathLabel(path)}.`,
      (advancedRendering) => {
        advancedRendering.waterPath = path;
      }
    );
  };

  const applyAdvancedRenderingWaterReflectionMode = (
    mode: AdvancedRenderingWaterReflectionMode
  ) => {
    applyAdvancedRenderingSettings(
      "Set water reflection mode",
      `Water reflection mode set to ${formatAdvancedRenderingWaterReflectionModeLabel(mode)}.`,
      (advancedRendering) => {
        advancedRendering.waterReflectionMode = mode;
      }
    );
  };

  const applyBrushNameChange = () => {
    if (selectedBrush === null) {
      setStatusMessage("Select a whitebox box before renaming it.");
      return;
    }

    const nextName = normalizeBrushName(brushNameDraft);

    if (selectedBrush.name === nextName) {
      return;
    }

    try {
      store.executeCommand(
        createSetBoxBrushNameCommand({
          brushId: selectedBrush.id,
          name: brushNameDraft
        })
      );
      setStatusMessage(
        nextName === undefined
          ? "Cleared the authored brush name."
          : `Renamed brush to ${nextName}.`
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyEntityNameChange = () => {
    if (selectedEntity === null) {
      setStatusMessage("Select an entity before renaming it.");
      return;
    }

    const nextName = normalizeEntityName(entityNameDraft);

    if (selectedEntity.name === nextName) {
      return;
    }

    try {
      store.executeCommand(
        createSetEntityNameCommand({
          entityId: selectedEntity.id,
          name: entityNameDraft
        })
      );
      setStatusMessage(
        nextName === undefined
          ? "Cleared the authored entity name."
          : `Renamed entity to ${nextName}.`
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyModelInstanceNameChange = () => {
    if (selectedModelInstance === null) {
      setStatusMessage("Select a model instance before renaming it.");
      return;
    }

    const nextName = normalizeModelInstanceName(modelInstanceNameDraft);

    if (selectedModelInstance.name === nextName) {
      return;
    }

    try {
      store.executeCommand(
        createSetModelInstanceNameCommand({
          modelInstanceId: selectedModelInstance.id,
          name: modelInstanceNameDraft
        })
      );
      setStatusMessage(
        nextName === undefined
          ? "Cleared the authored model instance name."
          : `Renamed model instance to ${nextName}.`
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleInlineNameInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    resetDraft: () => void
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetDraft();
      event.currentTarget.blur();
    }
  };

  const handleDraftVectorKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    applyChange: () => void
  ) => {
    if (event.key === "Enter") {
      applyChange();
    }
  };

  const scheduleDraftCommit = (applyChange: () => void) => {
    window.setTimeout(() => {
      applyChange();
    }, 0);
  };

  const handleNumberInputPointerUp = (
    _event: ReactPointerEvent<HTMLInputElement>,
    applyChange: () => void
  ) => {
    scheduleDraftCommit(applyChange);
  };

  const handleNumberInputKeyUp = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    applyChange: () => void
  ) => {
    if (!isCommitIncrementKey(event.key)) {
      return;
    }

    scheduleDraftCommit(applyChange);
  };

  const handleSaveProject = async () => {
    try {
      if (!projectAssetStorageReady && projectAssetList.length > 0) {
        throw new Error(
          "Project save failed: project asset storage is still initializing for this asset-backed scene."
        );
      }

      const projectBytes = await saveProjectPackage(
        editorState.projectDocument,
        projectAssetStorage
      );
      const blobBytes = new Uint8Array(projectBytes);
      const blob = new Blob([blobBytes.buffer as ArrayBuffer], {
        type: "application/zip"
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = createProjectDownloadName(
        editorState.projectDocument.name
      );
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      setStatusMessage(`Saved project ${anchor.download}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleLoadProjectButtonClick = () => {
    importProjectInputRef.current?.click();
  };

  const handleLoadProjectChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    try {
      const projectBytes = new Uint8Array(await file.arrayBuffer());
      const nextDocument = await loadProjectPackage(
        projectBytes,
        projectAssetStorage
      );
      store.replaceDocument(nextDocument);
      setStatusMessage(`Loaded project ${file.name}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      input.value = "";
    }
  };

  const handleImportModelButtonClick = () => {
    importModelInputRef.current?.click();
  };

  const handleImportBackgroundImageButtonClick = () => {
    importBackgroundImageInputRef.current?.click();
  };

  const handleImportAudioButtonClick = () => {
    importAudioInputRef.current?.click();
  };

  const handleImportModelChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage(
        "Imported model assets require project asset storage. IndexedDB is unavailable in this browser."
      );
      input.value = "";
      return;
    }

    let importedModelForCleanup: ImportedModelAssetResult | null = null;

    try {
      const importedModel =
        files.length === 1
          ? await importModelAssetFromFile(files[0], projectAssetStorage)
          : await importModelAssetFromFiles(files, projectAssetStorage);
      importedModelForCleanup = importedModel;

      store.executeCommand(
        createImportModelAssetCommand({
          asset: importedModel.asset,
          modelInstance: importedModel.modelInstance,
          label: `Import ${importedModel.asset.sourceName}`
        })
      );

      loadedModelAssetsRef.current = {
        ...loadedModelAssetsRef.current,
        [importedModel.asset.id]: importedModel.loadedAsset
      };
      setLoadedModelAssets((currentLoadedAssets) => ({
        ...currentLoadedAssets,
        [importedModel.asset.id]: importedModel.loadedAsset
      }));
      setAssetStatusMessage(null);
      setStatusMessage(
        `Imported ${importedModel.asset.sourceName} and placed a model instance.`
      );
    } catch (error) {
      if (importedModelForCleanup !== null) {
        await projectAssetStorage
          .deleteAsset(importedModelForCleanup.asset.storageKey)
          .catch(() => undefined);
        disposeModelTemplate(importedModelForCleanup.loadedAsset.template);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const handleImportBackgroundImageChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage(
        "Imported background images require project asset storage. IndexedDB is unavailable in this browser."
      );
      input.value = "";
      return;
    }

    let importedImageForCleanup: ImportedImageAssetResult | null = null;

    try {
      const importedImage = await importBackgroundImageAssetFromFile(
        file,
        projectAssetStorage
      );
      importedImageForCleanup = importedImage;

      store.executeCommand(
        createImportBackgroundImageAssetCommand({
          asset: importedImage.asset,
          world: {
            ...editorState.document.world,
            background: changeWorldBackgroundMode(
              editorState.document.world.background,
              "image",
              importedImage.asset.id
            )
          },
          label: `Import ${importedImage.asset.sourceName} as background`
        })
      );

      loadedImageAssetsRef.current = {
        ...loadedImageAssetsRef.current,
        [importedImage.asset.id]: importedImage.loadedAsset
      };
      setLoadedImageAssets((currentLoadedAssets) => ({
        ...currentLoadedAssets,
        [importedImage.asset.id]: importedImage.loadedAsset
      }));
      setAssetStatusMessage(null);
      setStatusMessage(
        `Imported ${importedImage.asset.sourceName} and set it as the world background.`
      );
    } catch (error) {
      if (importedImageForCleanup !== null) {
        await projectAssetStorage
          .deleteAsset(importedImageForCleanup.asset.storageKey)
          .catch(() => undefined);
        disposeLoadedImageAsset(importedImageForCleanup.loadedAsset);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const handleImportAudioChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage(
        "Imported audio assets require project asset storage. IndexedDB is unavailable in this browser."
      );
      input.value = "";
      return;
    }

    let importedAudioForCleanup: {
      asset: AudioAssetRecord;
      loadedAsset: LoadedAudioAsset;
    } | null = null;

    try {
      const importedAudio = await importAudioAssetFromFile(
        file,
        projectAssetStorage
      );
      importedAudioForCleanup = importedAudio;

      store.executeCommand(
        createImportAudioAssetCommand({
          asset: importedAudio.asset,
          label: `Import ${importedAudio.asset.sourceName}`
        })
      );

      loadedAudioAssetsRef.current = {
        ...loadedAudioAssetsRef.current,
        [importedAudio.asset.id]: importedAudio.loadedAsset
      };
      setLoadedAudioAssets((currentLoadedAssets) => ({
        ...currentLoadedAssets,
        [importedAudio.asset.id]: importedAudio.loadedAsset
      }));
      setAssetStatusMessage(null);
      setStatusMessage(
        `Imported ${importedAudio.asset.sourceName} and registered it as an audio asset.`
      );
    } catch (error) {
      if (importedAudioForCleanup !== null) {
        await projectAssetStorage
          .deleteAsset(importedAudioForCleanup.asset.storageKey)
          .catch(() => undefined);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const applyFaceMaterial = (materialId: string) => {
    if (
      selectedBrush === null ||
      selectedFaceId === null ||
      selectedFace === null
    ) {
      setStatusMessage("Select a single box face before applying a material.");
      return;
    }

    if (selectedFace.materialId === materialId) {
      setStatusMessage(
        `${BOX_FACE_LABELS[selectedFaceId]} already uses that material.`
      );
      return;
    }

    try {
      store.executeCommand(
        createSetBoxBrushFaceMaterialCommand({
          brushId: selectedBrush.id,
          faceId: selectedFaceId,
          materialId
        })
      );
      setStatusMessage(
        `Applied ${editorState.document.materials[materialId]?.name ?? materialId} to ${BOX_FACE_LABELS[selectedFaceId]}.`
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const clearFaceMaterial = () => {
    if (
      selectedBrush === null ||
      selectedFaceId === null ||
      selectedFace === null
    ) {
      setStatusMessage(
        "Select a single box face before clearing its material."
      );
      return;
    }

    if (selectedFace.materialId === null) {
      setStatusMessage(
        `${BOX_FACE_LABELS[selectedFaceId]} already uses the fallback face material.`
      );
      return;
    }

    store.executeCommand(
      createSetBoxBrushFaceMaterialCommand({
        brushId: selectedBrush.id,
        faceId: selectedFaceId,
        materialId: null
      })
    );
    setStatusMessage(
      `Cleared the authored material on ${BOX_FACE_LABELS[selectedFaceId]}.`
    );
  };

  const applyFaceUvState = (
    uvState: FaceUvState,
    label: string,
    successMessage: string
  ) => {
    if (
      selectedBrush === null ||
      selectedFaceId === null ||
      selectedFace === null
    ) {
      setStatusMessage("Select a single box face before editing UVs.");
      return;
    }

    if (areFaceUvStatesEqual(selectedFace.uv, uvState)) {
      setStatusMessage("That face UV state is already current.");
      return;
    }

    try {
      store.executeCommand(
        createSetBoxBrushFaceUvStateCommand({
          brushId: selectedBrush.id,
          faceId: selectedFaceId,
          uvState,
          label
        })
      );
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleApplyUvDraft = () => {
    if (selectedFace === null) {
      setStatusMessage("Select a single box face before editing UVs.");
      return;
    }

    try {
      applyFaceUvState(
        {
          ...selectedFace.uv,
          offset: readVec2Draft(uvOffsetDraft, "Face UV offset"),
          scale: readPositiveVec2Draft(uvScaleDraft, "Face UV scale")
        },
        "Set face UV offset and scale",
        "Updated face UV offset and scale."
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleRotateUv = () => {
    if (selectedFace === null) {
      setStatusMessage("Select a single box face before rotating UVs.");
      return;
    }

    applyFaceUvState(
      {
        ...selectedFace.uv,
        rotationQuarterTurns: rotateQuarterTurns(
          selectedFace.uv.rotationQuarterTurns
        )
      },
      "Rotate face UV 90 degrees",
      "Rotated face UVs 90 degrees."
    );
  };

  const handleFlipUv = (axis: "u" | "v") => {
    if (selectedFace === null) {
      setStatusMessage("Select a single box face before flipping UVs.");
      return;
    }

    applyFaceUvState(
      {
        ...selectedFace.uv,
        flipU: axis === "u" ? !selectedFace.uv.flipU : selectedFace.uv.flipU,
        flipV: axis === "v" ? !selectedFace.uv.flipV : selectedFace.uv.flipV
      },
      axis === "u" ? "Flip face UV U" : "Flip face UV V",
      axis === "u" ? "Flipped face UVs on U." : "Flipped face UVs on V."
    );
  };

  const handleFitUvToFace = () => {
    if (selectedBrush === null || selectedFaceId === null) {
      setStatusMessage("Select a single box face before fitting UVs.");
      return;
    }

    applyFaceUvState(
      createFitToFaceBoxBrushFaceUvState(selectedBrush, selectedFaceId),
      "Fit face UV to face",
      "Fit the selected face UVs to the face bounds."
    );
  };

  const handleEnterPlayMode = () => {
    if (blockingDiagnostics.length > 0) {
      setStatusMessage(
        `Run mode blocked: ${formatSceneDiagnosticSummary(blockingDiagnostics)}`
      );
      return;
    }

    try {
      const nextRuntimeScene = buildRuntimeSceneForProjectScene(
        editorState.activeSceneId
      );

      applyRuntimeSceneSession(editorState.activeSceneId, nextRuntimeScene);
      setRuntimeMessage(null);
      setFirstPersonTelemetry(null);
      setRuntimeInteractionPrompt(null);
      setRuntimeGlobalState(createDefaultRuntimeGlobalState());
      store.enterPlayMode();
      setStatusMessage(
        nextRuntimeScene.navigationMode === "firstPerson"
          ? "Entered run mode with first-person navigation."
          : "Entered run mode with third-person navigation."
      );
    } catch (error) {
      setStatusMessage(`Run mode could not start: ${getErrorMessage(error)}`);
    }
  };

  const handleExitPlayMode = () => {
    setRuntimeScene(null);
    setRuntimeSceneId(null);
    setRuntimeSceneName(null);
    setRuntimeSceneLoadingScreen(null);
    setRuntimeGlobalState(createDefaultRuntimeGlobalState());
    setRuntimeMessage(null);
    setFirstPersonTelemetry(null);
    setRuntimeInteractionPrompt(null);
    setActiveNavigationMode("thirdPerson");
    store.exitPlayMode();
    setStatusMessage("Returned to editor mode.");
  };

  const createAssetMenuHoverHandler =
    (assetId: string) => (hovered: boolean) => {
      setHoveredAssetId((current) =>
        hovered ? assetId : current === assetId ? null : current
      );
    };

  const createDisabledMenuAction = (
    label: string,
    testId: string
  ): HierarchicalMenuItem => ({
    kind: "action",
    label,
    testId,
    disabled: true,
    onSelect: () => undefined
  });

  const addMenuItems: HierarchicalMenuItem[] = [
    {
      kind: "action",
      label: "Whitebox Box",
      testId: "add-menu-box",
      onSelect: beginBoxCreation
    },
    {
      kind: "group",
      label: "Entities",
      testId: "add-menu-entities",
      children: [
        {
          kind: "action",
          label: "Player Start",
          testId: "add-menu-player-start",
          onSelect: () => beginEntityCreation("playerStart")
        },
        {
          kind: "action",
          label: "Scene Entry",
          testId: "add-menu-scene-entry",
          onSelect: () => beginEntityCreation("sceneEntry")
        },
        {
          kind: "action",
          label: "Sound Emitter",
          testId: "add-menu-sound-emitter",
          onSelect: () =>
            beginEntityCreation("soundEmitter", {
              audioAssetId: audioAssetList[0]?.id ?? null
            })
        },
        {
          kind: "action",
          label: "Trigger Volume",
          testId: "add-menu-trigger-volume",
          onSelect: () => beginEntityCreation("triggerVolume")
        },
        {
          kind: "action",
          label: "Teleport Target",
          testId: "add-menu-teleport-target",
          onSelect: () => beginEntityCreation("teleportTarget")
        },
        {
          kind: "action",
          label: "Interactable",
          testId: "add-menu-interactable",
          onSelect: () => beginEntityCreation("interactable")
        },
        {
          kind: "action",
          label: "Scene Exit",
          testId: "add-menu-scene-exit",
          onSelect: () => beginEntityCreation("sceneExit")
        }
      ]
    },
    {
      kind: "group",
      label: "Lights",
      testId: "add-menu-lights",
      children: [
        {
          kind: "action",
          label: "Point Light",
          testId: "add-menu-point-light",
          onSelect: () => beginEntityCreation("pointLight")
        },
        {
          kind: "action",
          label: "Spot Light",
          testId: "add-menu-spot-light",
          onSelect: () => beginEntityCreation("spotLight")
        }
      ]
    },
    {
      kind: "group",
      label: "Assets",
      testId: "add-menu-assets",
      children: [
        {
          kind: "group",
          label: "3D Models",
          testId: "add-menu-assets-models",
          children:
            modelAssetList.length === 0
              ? [
                  createDisabledMenuAction(
                    "No imported 3D models",
                    "add-menu-assets-models-empty"
                  )
                ]
              : modelAssetList.map((asset) => ({
                  kind: "action" as const,
                  label: asset.sourceName,
                  testId: `add-menu-model-asset-${asset.id}`,
                  onSelect: () => beginModelInstanceCreation(asset.id),
                  onHoverChange: createAssetMenuHoverHandler(asset.id)
                }))
        },
        {
          kind: "group",
          label: "Environments",
          testId: "add-menu-assets-environments",
          children:
            imageAssetList.length === 0
              ? [
                  createDisabledMenuAction(
                    "No imported environments",
                    "add-menu-assets-environments-empty"
                  )
                ]
              : imageAssetList.map((asset) => ({
                  kind: "action" as const,
                  label: asset.sourceName,
                  testId: `add-menu-image-asset-${asset.id}`,
                  onSelect: () => applyWorldBackgroundMode("image", asset.id),
                  onHoverChange: createAssetMenuHoverHandler(asset.id)
                }))
        },
        {
          kind: "group",
          label: "Audio",
          testId: "add-menu-assets-audio",
          children:
            audioAssetList.length === 0
              ? [
                  createDisabledMenuAction(
                    "No imported audio",
                    "add-menu-assets-audio-empty"
                  )
                ]
              : audioAssetList.map((asset) => ({
                  kind: "action" as const,
                  label: asset.sourceName,
                  testId: `add-menu-audio-asset-${asset.id}`,
                  onSelect: () =>
                    beginEntityCreation("soundEmitter", {
                      audioAssetId: asset.id
                    }),
                  onHoverChange: createAssetMenuHoverHandler(asset.id)
                }))
        }
      ]
    },
    {
      kind: "group",
      label: "Import",
      testId: "add-menu-import",
      children: [
        {
          kind: "action",
          label: "3D Model (GLB/GLTF)",
          testId: "import-menu-model",
          disabled: !projectAssetStorageReady || projectAssetStorage === null,
          onSelect: handleImportModelButtonClick
        },
        {
          kind: "action",
          label: "Environment",
          testId: "import-menu-environment",
          disabled: !projectAssetStorageReady || projectAssetStorage === null,
          onSelect: handleImportBackgroundImageButtonClick
        },
        {
          kind: "action",
          label: "Audio",
          testId: "import-menu-audio",
          disabled: !projectAssetStorageReady || projectAssetStorage === null,
          onSelect: handleImportAudioButtonClick
        }
      ]
    }
  ];

  const viewportPanelsStyle =
    layoutMode === "quad"
      ? createViewportQuadPanelsStyle(editorState.viewportQuadSplit)
      : undefined;

  if (editorState.toolMode === "play" && runtimeScene !== null) {
    return (
      <div className="app-shell app-shell--play">
        <header className="toolbar">
          <div className="toolbar__brand">
            <div className="toolbar__title">WebEditor3D</div>
            <div className="toolbar__subtitle">
              Slice 3.1 GLB/GLTF import and unified creation
            </div>
          </div>

          <div className="toolbar__actions">
            <div className="toolbar__group">
              <button
                className="toolbar__button toolbar__button--accent"
                type="button"
                data-testid="exit-run-mode"
                onClick={handleExitPlayMode}
              >
                Return To Editor
              </button>
            </div>
          </div>
        </header>

        <div className="runner-workspace">
          <main className="runner-region">
            <RunnerCanvas
              runtimeScene={runtimeScene}
              sceneName={runtimeSceneName ?? activeProjectScene.name}
              sceneLoadingScreen={
                runtimeSceneLoadingScreen ?? activeProjectScene.loadingScreen
              }
              projectAssets={editorState.document.assets}
              loadedModelAssets={loadedModelAssets}
              loadedImageAssets={loadedImageAssets}
              loadedAudioAssets={loadedAudioAssets}
              navigationMode={activeNavigationMode}
              onRuntimeMessageChange={setRuntimeMessage}
              onFirstPersonTelemetryChange={setFirstPersonTelemetry}
              onInteractionPromptChange={setRuntimeInteractionPrompt}
              onSceneExitActivated={handleRunnerSceneExitActivated}
            />
          </main>

          <aside className="side-column">
            <Panel title="Runner">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="label">Scene</div>
                  <div className="value" data-testid="runner-scene-name">
                    {runtimeSceneName ?? activeProjectScene.name}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Navigation</div>
                  <div className="value">
                    {activeNavigationMode === "firstPerson"
                      ? "First Person"
                      : "Third Person"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Spawn Source</div>
                  <div className="value">
                    {runtimeScene.spawn.source === "playerStart"
                      ? "Player Start"
                      : runtimeScene.spawn.source === "sceneEntry"
                        ? "Scene Entry"
                      : "Fallback"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Transitions</div>
                  <div
                    className="value"
                    data-testid="runner-transition-count"
                  >
                    {runtimeGlobalState.transitionCount}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Pointer Lock</div>
                  <div className="value">
                    {activeNavigationMode === "firstPerson"
                      ? firstPersonTelemetry?.pointerLocked
                        ? "active"
                        : "idle"
                      : "not used"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Grounded</div>
                  <div className="value">
                    {firstPersonTelemetry === null
                      ? "n/a"
                      : firstPersonTelemetry.grounded
                        ? "yes"
                        : "no"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Locomotion</div>
                  <div className="value">
                    {formatRunnerLocomotionMode(
                      firstPersonTelemetry?.locomotionState
                    )}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Gait</div>
                  <div className="value">
                    {formatRunnerGait(firstPersonTelemetry?.locomotionState)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Airborne</div>
                  <div className="value">
                    {formatRunnerAirborneKind(
                      firstPersonTelemetry?.locomotionState
                    )}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Planar Speed</div>
                  <div className="value">
                    {firstPersonTelemetry === null
                      ? "n/a"
                      : `${firstPersonTelemetry.locomotionState.planarSpeed.toFixed(2)} m/s`}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Ground Contact</div>
                  <div className="value">
                    {formatRunnerGroundContact(
                      firstPersonTelemetry?.locomotionState
                    )}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Water Volume</div>
                  <div className="value">
                    {firstPersonTelemetry === null
                      ? "n/a"
                      : firstPersonTelemetry.inWaterVolume
                        ? "inside"
                        : "outside"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Fog Volume</div>
                  <div className="value">
                    {firstPersonTelemetry === null
                      ? "n/a"
                      : firstPersonTelemetry.inFogVolume
                        ? "inside"
                        : "outside"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Signals</div>
                  <div className="value">
                    {formatRunnerMovementSignals(firstPersonTelemetry)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Audio Hook</div>
                  <div className="value">
                    {formatRunnerAudioHook(firstPersonTelemetry)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Animation Hook</div>
                  <div className="value">
                    {formatRunnerAnimationHook(firstPersonTelemetry)}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="label">Player Feet Position</div>
                <div className="value" data-testid="runner-player-position">
                  {formatRunnerFeetPosition(
                    firstPersonTelemetry?.feetPosition ??
                      runtimeScene.spawn.position
                  )}
                </div>
                <div
                  className="material-summary"
                  data-testid="runner-spawn-state"
                >
                  Spawn:{" "}
                  {runtimeScene.spawn.source === "playerStart"
                    ? "Player Start"
                    : runtimeScene.spawn.source === "sceneEntry"
                      ? "Scene Entry"
                    : "Fallback"}{" "}
                  at {formatRunnerFeetPosition(runtimeScene.spawn.position)}
                </div>
              </div>

              <div className="stat-card">
                <div className="label">Interaction</div>
                <div className="value" data-testid="runner-interaction-state">
                  {runtimeInteractionPrompt === null ? "No target" : "Ready"}
                </div>
                <div
                  className="material-summary"
                  data-testid="runner-interaction-summary"
                >
                  {runtimeInteractionPrompt === null
                    ? "Aim at an authored Interactable or Scene Exit and click when a prompt appears."
                    : `Click "${runtimeInteractionPrompt.prompt}" within ${runtimeInteractionPrompt.range.toFixed(1)}m.`}
                </div>
              </div>

              {runtimeMessage === null ? null : (
                <div className="info-banner">{runtimeMessage}</div>
              )}
              {runtimeGlobalState.lastSceneTransition === null ? null : (
                <div className="info-banner">
                  Last transition: {runtimeGlobalState.lastSceneTransition.fromSceneName} to{" "}
                  {runtimeGlobalState.lastSceneTransition.toSceneName}
                </div>
              )}
              {
                <div
                  className="info-banner"
                  data-testid="runner-interaction-help"
                >
                  Mouse click activates the current prompt target.
                  Keyboard/controller fallback is not active yet.
                </div>
              }
            </Panel>
          </aside>
        </div>

        <footer className="status-bar">
          <div
            className="status-bar__item status-bar__item--message"
            title={statusMessage}
          >
            <span className="status-bar__strong">Status:</span> {statusMessage}
          </div>
          <div className="status-bar__item">
            <span className="status-bar__strong">Spawn:</span>{" "}
            {runtimeScene.spawn.source === "playerStart"
              ? "Authored Player Start"
              : runtimeScene.spawn.source === "sceneEntry"
                ? "Scene Entry arrival"
              : "Fallback runtime spawn"}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar__scene-controls">
          <label className="toolbar__project-name">
            <span className="visually-hidden">Project Name</span>
            <input
              data-testid="toolbar-project-name"
              className="text-input toolbar__project-name-input"
              type="text"
              value={projectNameDraft}
              onChange={(event) =>
                setProjectNameDraft(event.currentTarget.value)
              }
              onBlur={applyProjectName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyProjectName();
                }
              }}
            />
          </label>
          <label className="toolbar__scene-picker">
            <span className="visually-hidden">Active Scene</span>
            <select
              data-testid="toolbar-scene-select"
              className="select-input toolbar__scene-select"
              value={editorState.activeSceneId}
              onChange={handleActiveSceneChange}
            >
              {sceneList.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="toolbar__button"
            type="button"
            data-testid="toolbar-new-scene"
            onClick={handleCreateScene}
          >
            New Scene
          </button>
          <label className="toolbar__scene-name">
            <span className="visually-hidden">Scene Name</span>
            <input
              data-testid="toolbar-scene-name"
              className="text-input toolbar__scene-name-input"
              type="text"
              value={sceneNameDraft}
              onChange={(event) => setSceneNameDraft(event.currentTarget.value)}
              onBlur={applySceneName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applySceneName();
                }
              }}
            />
          </label>
          <div className="toolbar__group">
            <button
              className="toolbar__button"
              type="button"
              data-testid="save-project-button"
              onClick={() => void handleSaveProject()}
            >
              Save Project
            </button>
            <button
              className="toolbar__button"
              type="button"
              data-testid="load-project-button"
              onClick={handleLoadProjectButtonClick}
            >
              Load Project
            </button>
            <button
              className={`toolbar__button toolbar__button--accent ${blockingDiagnostics.length > 0 ? "toolbar__button--warn" : ""}`}
              type="button"
              data-testid="enter-run-mode"
              onClick={handleEnterPlayMode}
            >
              Run Scene
            </button>
          </div>

          <div className="toolbar__group">
            <button
              className="toolbar__button"
              type="button"
              data-testid="toolbar-undo-button"
              disabled={!editorState.canUndo}
              onClick={handleUndo}
            >
              Undo
            </button>
            <button
              className="toolbar__button"
              type="button"
              data-testid="toolbar-redo-button"
              disabled={!editorState.canRedo}
              onClick={handleRedo}
            >
              Redo
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-column">
          <Panel title="Outliner">
            {assetStatusMessage === null ? null : (
              <div className="info-banner" data-testid="asset-status-message">
                {assetStatusMessage}
              </div>
            )}

            {projectAssetStorageReady && projectAssetStorage === null ? (
              <div className="outliner-empty">
                Project asset storage is unavailable. Imported assets cannot be
                persisted.
              </div>
            ) : null}
            <div className="outliner-section">
              <div className="label">Whitebox Solids</div>
              {brushList.length === 0 ? (
                <div className="outliner-empty">
                  Use Add &gt; Whitebox Box and click in the viewport to create
                  the first solid.
                </div>
              ) : (
                <div
                  className="outliner-list"
                  data-testid="outliner-brush-list"
                >
                  {brushList.map((brush, brushIndex) => {
                    const label = getBrushLabel(brush, brushIndex);
                    const isSelected = selectedBrush?.id === brush.id;

                    return (
                      <div
                        key={brush.id}
                        className={`outliner-item outliner-item--compact ${isBrushSelected(editorState.selection, brush.id) ? "outliner-item--selected" : ""}`}
                      >
                        <div className="outliner-item__row">
                          {isSelected ? (
                            <input
                              className="outliner-item__rename"
                              data-testid="selected-brush-name"
                              type="text"
                              value={brushNameDraft}
                              placeholder={`Whitebox Box ${brushIndex + 1}`}
                              onChange={(event) =>
                                setBrushNameDraft(event.currentTarget.value)
                              }
                              onBlur={applyBrushNameChange}
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) =>
                                handleInlineNameInputKeyDown(event, () => {
                                  setBrushNameDraft(selectedBrush?.name ?? "");
                                })
                              }
                            />
                          ) : (
                            <button
                              className="outliner-item__select"
                              type="button"
                              data-testid={`outliner-brush-${brush.id}`}
                              onClick={() =>
                                applySelection(
                                  {
                                    kind: "brushes",
                                    ids: [brush.id]
                                  },
                                  "outliner",
                                  {
                                    focusViewport: true
                                  }
                                )
                              }
                            >
                              <span className="outliner-item__title">
                                {label}
                              </span>
                            </button>
                          )}
                          <button
                            className="outliner-item__delete"
                            type="button"
                            data-testid={`outliner-delete-brush-${brush.id}`}
                            aria-label={`Delete ${label}`}
                            onClick={() => handleDeleteBrush(brush.id)}
                          >
                            x
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="outliner-section">
              <div className="label">Model Instances</div>
              {modelInstanceDisplayList.length === 0 ? (
                <div className="outliner-empty">
                  No model instances placed yet.
                </div>
              ) : (
                <div
                  className="outliner-list"
                  data-testid="outliner-model-instance-list"
                >
                  {modelInstanceDisplayList.map(({ modelInstance, label }) => {
                    const isSelected =
                      editorState.selection.kind === "modelInstances" &&
                      editorState.selection.ids.includes(modelInstance.id);

                    return (
                      <div
                        key={modelInstance.id}
                        className={`outliner-item ${isSelected ? "outliner-item--selected" : ""} outliner-item--compact`}
                      >
                        <div className="outliner-item__row">
                          {isSelected ? (
                            <input
                              className="outliner-item__rename"
                              data-testid="selected-model-instance-name"
                              type="text"
                              value={modelInstanceNameDraft}
                              placeholder={
                                editorState.document.assets[
                                  modelInstance.assetId
                                ]?.sourceName ?? "Model Instance"
                              }
                              onChange={(event) =>
                                setModelInstanceNameDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={applyModelInstanceNameChange}
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) =>
                                handleInlineNameInputKeyDown(event, () => {
                                  setModelInstanceNameDraft(
                                    selectedModelInstance?.name ?? ""
                                  );
                                })
                              }
                            />
                          ) : (
                            <button
                              data-testid={`outliner-model-instance-${modelInstance.id}`}
                              className="outliner-item__select"
                              type="button"
                              onClick={() =>
                                applySelection(
                                  {
                                    kind: "modelInstances",
                                    ids: [modelInstance.id]
                                  },
                                  "outliner",
                                  {
                                    focusViewport: true
                                  }
                                )
                              }
                            >
                              <span className="outliner-item__title">
                                {label}
                              </span>
                            </button>
                          )}
                          <button
                            className="outliner-item__delete"
                            type="button"
                            data-testid={`outliner-delete-model-instance-${modelInstance.id}`}
                            aria-label={`Delete ${label}`}
                            onClick={() =>
                              handleDeleteModelInstance(modelInstance.id)
                            }
                          >
                            x
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="outliner-section">
              <div className="label">Entities</div>

              {entityDisplayList.length === 0 ? (
                <div className="outliner-empty">No entities authored yet.</div>
              ) : null}

              {entityDisplayList.length === 0 ? null : (
                <div className="outliner-list">
                  {entityDisplayList.map(({ entity, label }) => {
                    const isSelected =
                      editorState.selection.kind === "entities" &&
                      editorState.selection.ids.includes(entity.id);

                    return (
                      <div
                        key={entity.id}
                        className={`outliner-item ${isSelected ? "outliner-item--selected" : ""} outliner-item--compact`}
                      >
                        <div className="outliner-item__row">
                          {isSelected ? (
                            <input
                              className="outliner-item__rename"
                              data-testid="selected-entity-name"
                              type="text"
                              value={entityNameDraft}
                              placeholder={getEntityKindLabel(entity.kind)}
                              onChange={(event) =>
                                setEntityNameDraft(event.currentTarget.value)
                              }
                              onBlur={applyEntityNameChange}
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) =>
                                handleInlineNameInputKeyDown(event, () => {
                                  setEntityNameDraft(
                                    selectedEntity?.name ?? ""
                                  );
                                })
                              }
                            />
                          ) : (
                            <button
                              data-testid={`outliner-entity-${entity.id}`}
                              className="outliner-item__select"
                              type="button"
                              onClick={() =>
                                applySelection(
                                  {
                                    kind: "entities",
                                    ids: [entity.id]
                                  },
                                  "outliner",
                                  {
                                    focusViewport: true
                                  }
                                )
                              }
                            >
                              <span className="outliner-item__title">
                                {label}
                              </span>
                            </button>
                          )}
                          <button
                            className="outliner-item__delete"
                            type="button"
                            data-testid={`outliner-delete-entity-${entity.id}`}
                            aria-label={`Delete ${label}`}
                            onClick={() => handleDeleteEntity(entity.id)}
                          >
                            x
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </aside>

        <main
          className={`viewport-region viewport-region--${layoutMode}`}
          data-testid="viewport-shell"
        >
          <div
            ref={viewportPanelsRef}
            className={`viewport-region__panels viewport-region__panels--${layoutMode} ${
              viewportQuadResizeMode === null
                ? ""
                : "viewport-region__panels--resizing"
            }`.trim()}
            style={viewportPanelsStyle}
          >
            {VIEWPORT_PANEL_IDS.map((panelId) => (
              <ViewportPanel
                key={panelId}
                panelId={panelId}
                className={`viewport-panel--${panelId}`}
                panelState={editorState.viewportPanels[panelId]}
                layoutMode={layoutMode}
                isActive={activePanelId === panelId}
                world={editorState.document.world}
                sceneDocument={editorState.document}
                projectAssets={editorState.document.assets}
                loadedModelAssets={loadedModelAssets}
                loadedImageAssets={loadedImageAssets}
                whiteboxSelectionMode={whiteboxSelectionMode}
                whiteboxSnapEnabled={whiteboxSnapEnabled}
                whiteboxSnapStepDraft={whiteboxSnapStepDraft}
                whiteboxSnapStep={whiteboxSnapStep}
                viewportGridVisible={viewportGridVisible}
                selection={editorState.selection}
                toolMode={editorState.toolMode}
                toolPreview={viewportToolPreview}
                transformSession={transformSession}
                canTranslateSelectedTarget={canTranslateSelectedTarget}
                canRotateSelectedTarget={canRotateSelectedTarget}
                canScaleSelectedTarget={canScaleSelectedTarget}
                cameraState={editorState.viewportPanels[panelId].cameraState}
                focusRequestId={
                  focusRequest.panelId === panelId ? focusRequest.id : 0
                }
                focusSelection={focusRequest.selection}
                isAddMenuOpen={addMenuPosition !== null}
                onActivatePanel={handleActivateViewportPanel}
                onOpenAddMenu={handleOpenAddMenuFromButton}
                onSetViewportLayoutMode={handleSetViewportLayoutMode}
                onSetPanelViewMode={handleSetViewportPanelViewMode}
                onSetPanelDisplayMode={handleSetViewportPanelDisplayMode}
                onCommitCreation={handleCommitCreation}
                onCameraStateChange={(cameraState) => {
                  store.setViewportPanelCameraState(panelId, cameraState);
                }}
                onToolPreviewChange={(toolPreview) => {
                  store.setViewportToolPreview(toolPreview);
                }}
                onBeginTransformOperation={(operation) =>
                  beginTransformOperation(operation, "toolbar")
                }
                onWhiteboxSelectionModeChange={
                  handleWhiteboxSelectionModeChange
                }
                onViewportGridToggle={handleViewportGridToggle}
                onWhiteboxSnapToggle={handleWhiteboxSnapToggle}
                onWhiteboxSnapStepDraftChange={setWhiteboxSnapStepDraft}
                onWhiteboxSnapStepBlur={handleWhiteboxSnapStepBlur}
                onTransformSessionChange={(nextTransformSession) => {
                  store.setTransformSession(nextTransformSession);
                }}
                onTransformCommit={commitTransformSession}
                onTransformCancel={() => cancelTransformSession()}
                onSelectionChange={(selection) =>
                  applySelection(selection, "viewport")
                }
              />
            ))}
            {layoutMode !== "quad" ? null : (
              <>
                <div
                  className="viewport-region__splitter viewport-region__splitter--vertical"
                  data-testid="viewport-quad-splitter-vertical"
                  onPointerDown={handleViewportQuadResizeStart("vertical")}
                />
                <div
                  className="viewport-region__splitter viewport-region__splitter--horizontal"
                  data-testid="viewport-quad-splitter-horizontal"
                  onPointerDown={handleViewportQuadResizeStart("horizontal")}
                />
                <div
                  className="viewport-region__splitter viewport-region__splitter--center"
                  data-testid="viewport-quad-splitter-center"
                  onPointerDown={handleViewportQuadResizeStart("center")}
                />
              </>
            )}
          </div>
        </main>

        <aside className="side-column">
          {editorState.selection.kind === "none" ? (
            <>
              <Panel title="Scene">
                <div className="stat-card">
                  <div className="label">Active Scene</div>
                  <div className="value">{activeProjectScene.name}</div>
                  <div className="material-summary">
                    Runner overlay data is authored per scene and shown during
                    initial runtime load and future scene transitions.
                  </div>
                </div>

                <div className="form-section">
                  <div className="label">Runner Loading Overlay</div>
                  <label className="form-field">
                    <span className="label">Fade Color</span>
                    <input
                      data-testid="scene-loading-color"
                      className="color-input"
                      type="color"
                      value={activeProjectScene.loadingScreen.colorHex}
                      onChange={(event) =>
                        applySceneLoadingColor(event.currentTarget.value)
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">Headline</span>
                    <input
                      data-testid="scene-loading-headline"
                      className="text-input"
                      type="text"
                      placeholder="Optional hint or location title"
                      value={sceneLoadingHeadlineDraft}
                      onChange={(event) =>
                        setSceneLoadingHeadlineDraft(event.currentTarget.value)
                      }
                      onBlur={applySceneLoadingHeadline}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          applySceneLoadingHeadline();
                        }
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">Description</span>
                    <input
                      data-testid="scene-loading-description"
                      className="text-input"
                      type="text"
                      placeholder="Optional loading note or gameplay tip"
                      value={sceneLoadingDescriptionDraft}
                      onChange={(event) =>
                        setSceneLoadingDescriptionDraft(
                          event.currentTarget.value
                        )
                      }
                      onBlur={applySceneLoadingDescription}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          applySceneLoadingDescription();
                        }
                      }}
                    />
                  </label>
                  <div className="material-summary">
                    Scene name is always shown automatically. Headline and
                    description are optional.
                  </div>
                </div>
              </Panel>

              <Panel title="World">
                <div className="stat-card">
                  <div className="label">Background</div>
                  <div
                    className="value"
                    data-testid="world-background-mode-value"
                  >
                    {formatWorldBackgroundLabel(editorState.document.world)}
                  </div>
                  <div
                    className="world-background-preview"
                    data-testid="world-background-preview"
                    style={createWorldBackgroundStyle(
                      editorState.document.world.background,
                      editorState.document.world.background.mode === "image"
                        ? (loadedImageAssets[
                            editorState.document.world.background.assetId
                          ]?.sourceUrl ?? null)
                        : null
                    )}
                  />
                  <div className="material-summary">
                    {editorState.document.world.background.mode === "solid"
                      ? editorState.document.world.background.colorHex
                      : editorState.document.world.background.mode ===
                          "verticalGradient"
                        ? `${editorState.document.world.background.topColorHex} -> ${editorState.document.world.background.bottomColorHex}`
                        : (editorState.document.assets[
                            editorState.document.world.background.assetId
                          ]?.sourceName ??
                          editorState.document.world.background.assetId)}
                  </div>
                  {editorState.document.world.background.mode !==
                  "image" ? null : (
                    <div
                      className="material-summary"
                      data-testid="world-background-asset-value"
                    >
                      Background Asset:{" "}
                      {editorState.document.assets[
                        editorState.document.world.background.assetId
                      ]?.sourceName ??
                        editorState.document.world.background.assetId}
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <div className="label">Background Mode</div>
                  <div className="inline-actions">
                    <button
                      className={`toolbar__button ${editorState.document.world.background.mode === "solid" ? "toolbar__button--active" : ""}`}
                      type="button"
                      data-testid="world-background-mode-solid"
                      onClick={() => applyWorldBackgroundMode("solid")}
                    >
                      Solid
                    </button>
                    <button
                      className={`toolbar__button ${
                        editorState.document.world.background.mode ===
                        "verticalGradient"
                          ? "toolbar__button--active"
                          : ""
                      }`}
                      type="button"
                      data-testid="world-background-mode-gradient"
                      onClick={() =>
                        applyWorldBackgroundMode("verticalGradient")
                      }
                    >
                      Gradient
                    </button>
                    <button
                      className={`toolbar__button ${editorState.document.world.background.mode === "image" ? "toolbar__button--active" : ""}`}
                      type="button"
                      data-testid="world-background-mode-image"
                      onClick={() => applyWorldBackgroundMode("image")}
                    >
                      Image
                    </button>
                  </div>
                </div>

                {editorState.document.world.background.mode === "image" && (
                  <div className="form-section">
                    <div className="label">Environment Intensity</div>
                    <label className="form-field">
                      <span className="label">Intensity</span>
                      <input
                        data-testid="world-background-environment-intensity"
                        className="text-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={backgroundEnvironmentIntensityDraft}
                        onChange={(event) =>
                          setBackgroundEnvironmentIntensityDraft(
                            event.currentTarget.value
                          )
                        }
                        onBlur={applyBackgroundEnvironmentIntensity}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applyBackgroundEnvironmentIntensity
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(
                            event,
                            applyBackgroundEnvironmentIntensity
                          )
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applyBackgroundEnvironmentIntensity
                          )
                        }
                      />
                    </label>
                  </div>
                )}

                {editorState.document.world.background.mode !== "image" && (
                  <div className="form-section">
                    <div className="label">Background Colors</div>
                    {editorState.document.world.background.mode === "solid" ? (
                      <label className="form-field">
                        <span className="label">Color</span>
                        <input
                          data-testid="world-background-solid-color"
                          className="color-input"
                          type="color"
                          value={editorState.document.world.background.colorHex}
                          onChange={(event) =>
                            applyWorldBackgroundColor(event.currentTarget.value)
                          }
                        />
                      </label>
                    ) : (
                      <div className="vector-inputs vector-inputs--two">
                        <label className="form-field">
                          <span className="label">Top</span>
                          <input
                            data-testid="world-background-top-color"
                            className="color-input"
                            type="color"
                            value={
                              editorState.document.world.background.topColorHex
                            }
                            onChange={(event) =>
                              applyWorldGradientColor(
                                "top",
                                event.currentTarget.value
                              )
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="label">Bottom</span>
                          <input
                            data-testid="world-background-bottom-color"
                            className="color-input"
                            type="color"
                            value={
                              editorState.document.world.background
                                .bottomColorHex
                            }
                            onChange={(event) =>
                              applyWorldGradientColor(
                                "bottom",
                                event.currentTarget.value
                              )
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-section">
                  <div className="label">Ambient Light</div>
                  <div className="vector-inputs vector-inputs--two">
                    <label className="form-field">
                      <span className="label">Color</span>
                      <input
                        data-testid="world-ambient-color"
                        className="color-input"
                        type="color"
                        value={editorState.document.world.ambientLight.colorHex}
                        onChange={(event) =>
                          applyAmbientLightColor(event.currentTarget.value)
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Intensity</span>
                      <input
                        data-testid="world-ambient-intensity"
                        className="text-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={ambientLightIntensityDraft}
                        onChange={(event) =>
                          setAmbientLightIntensityDraft(
                            event.currentTarget.value
                          )
                        }
                        onBlur={applyAmbientLightIntensity}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applyAmbientLightIntensity
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(
                            event,
                            applyAmbientLightIntensity
                          )
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applyAmbientLightIntensity
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <div className="label">Sun Light</div>
                  <div className="vector-inputs vector-inputs--two">
                    <label className="form-field">
                      <span className="label">Color</span>
                      <input
                        data-testid="world-sun-color"
                        className="color-input"
                        type="color"
                        value={editorState.document.world.sunLight.colorHex}
                        onChange={(event) =>
                          applySunLightColor(event.currentTarget.value)
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Intensity</span>
                      <input
                        data-testid="world-sun-intensity"
                        className="text-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={sunLightIntensityDraft}
                        onChange={(event) =>
                          setSunLightIntensityDraft(event.currentTarget.value)
                        }
                        onBlur={applySunLightIntensity}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applySunLightIntensity
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(event, applySunLightIntensity)
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applySunLightIntensity
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">Dir X</span>
                      <input
                        data-testid="world-sun-direction-x"
                        className="text-input"
                        type="number"
                        step="0.1"
                        value={sunDirectionDraft.x}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSunDirectionDraft((draft) => ({
                            ...draft,
                            x: nextValue
                          }));
                        }}
                        onBlur={applySunLightDirection}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applySunLightDirection
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(event, applySunLightDirection)
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applySunLightDirection
                          )
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Dir Y</span>
                      <input
                        data-testid="world-sun-direction-y"
                        className="text-input"
                        type="number"
                        step="0.1"
                        value={sunDirectionDraft.y}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSunDirectionDraft((draft) => ({
                            ...draft,
                            y: nextValue
                          }));
                        }}
                        onBlur={applySunLightDirection}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applySunLightDirection
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(event, applySunLightDirection)
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applySunLightDirection
                          )
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Dir Z</span>
                      <input
                        data-testid="world-sun-direction-z"
                        className="text-input"
                        type="number"
                        step="0.1"
                        value={sunDirectionDraft.z}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSunDirectionDraft((draft) => ({
                            ...draft,
                            z: nextValue
                          }));
                        }}
                        onBlur={applySunLightDirection}
                        onKeyDown={(event) =>
                          handleDraftVectorKeyDown(
                            event,
                            applySunLightDirection
                          )
                        }
                        onKeyUp={(event) =>
                          handleNumberInputKeyUp(event, applySunLightDirection)
                        }
                        onPointerUp={(event) =>
                          handleNumberInputPointerUp(
                            event,
                            applySunLightDirection
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <div className="label">Advanced Rendering</div>
                  <label className="form-field form-field--toggle">
                    <span className="label">Advanced Rendering</span>
                    <input
                      type="checkbox"
                      checked={advancedRendering.enabled}
                      onChange={(event) =>
                        applyAdvancedRenderingEnabled(
                          event.currentTarget.checked
                        )
                      }
                    />
                  </label>

                  {!advancedRendering.enabled ? null : (
                    <>
                      <div className="form-section">
                        <div className="label">Shadows</div>
                        <label className="form-field form-field--toggle">
                          <span className="label">Enabled</span>
                          <input
                            type="checkbox"
                            checked={advancedRendering.shadows.enabled}
                            onChange={(event) =>
                              applyAdvancedRenderingShadowsEnabled(
                                event.currentTarget.checked
                              )
                            }
                          />
                        </label>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Shadow Map Size</span>
                            <select
                              className="select-input"
                              value={advancedRendering.shadows.mapSize}
                              onChange={(event) =>
                                applyAdvancedRenderingShadowMapSize(
                                  Number(
                                    event.currentTarget.value
                                  ) as AdvancedRenderingShadowMapSize
                                )
                              }
                            >
                              {ADVANCED_RENDERING_SHADOW_MAP_SIZES.map(
                                (size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="label">Shadow Type</span>
                            <select
                              className="select-input"
                              value={advancedRendering.shadows.type}
                              onChange={(event) =>
                                applyAdvancedRenderingShadowType(
                                  event.currentTarget
                                    .value as AdvancedRenderingShadowType
                                )
                              }
                            >
                              {ADVANCED_RENDERING_SHADOW_TYPES.map(
                                (shadowType) => (
                                  <option key={shadowType} value={shadowType}>
                                    {formatAdvancedRenderingShadowTypeLabel(
                                      shadowType
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        </div>
                        <label className="form-field">
                          <span className="label">Bias</span>
                          <input
                            className="text-input"
                            type="number"
                            step="0.0001"
                            value={advancedRenderingShadowBiasDraft}
                            onChange={(event) =>
                              setAdvancedRenderingShadowBiasDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={applyAdvancedRenderingShadowBias}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyAdvancedRenderingShadowBias
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyAdvancedRenderingShadowBias
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyAdvancedRenderingShadowBias
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Ambient Occlusion</div>
                        <label className="form-field form-field--toggle">
                          <span className="label">Enabled</span>
                          <input
                            type="checkbox"
                            checked={advancedRendering.ambientOcclusion.enabled}
                            onChange={(event) =>
                              applyAdvancedRenderingAmbientOcclusionEnabled(
                                event.currentTarget.checked
                              )
                            }
                          />
                        </label>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Intensity</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                advancedRenderingAmbientOcclusionIntensityDraft
                              }
                              onChange={(event) =>
                                setAdvancedRenderingAmbientOcclusionIntensityDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={
                                applyAdvancedRenderingAmbientOcclusionIntensity
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionIntensity
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionIntensity
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionIntensity
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Radius</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                advancedRenderingAmbientOcclusionRadiusDraft
                              }
                              onChange={(event) =>
                                setAdvancedRenderingAmbientOcclusionRadiusDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={
                                applyAdvancedRenderingAmbientOcclusionRadius
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionRadius
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionRadius
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingAmbientOcclusionRadius
                                )
                              }
                            />
                          </label>
                        </div>
                        <label className="form-field">
                          <span className="label">Samples</span>
                          <input
                            className="text-input"
                            type="number"
                            min="1"
                            step="1"
                            value={
                              advancedRenderingAmbientOcclusionSamplesDraft
                            }
                            onChange={(event) =>
                              setAdvancedRenderingAmbientOcclusionSamplesDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={
                              applyAdvancedRenderingAmbientOcclusionSamples
                            }
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyAdvancedRenderingAmbientOcclusionSamples
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyAdvancedRenderingAmbientOcclusionSamples
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyAdvancedRenderingAmbientOcclusionSamples
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Bloom</div>
                        <label className="form-field form-field--toggle">
                          <span className="label">Enabled</span>
                          <input
                            type="checkbox"
                            checked={advancedRendering.bloom.enabled}
                            onChange={(event) =>
                              applyAdvancedRenderingBloomEnabled(
                                event.currentTarget.checked
                              )
                            }
                          />
                        </label>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Intensity</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={advancedRenderingBloomIntensityDraft}
                              onChange={(event) =>
                                setAdvancedRenderingBloomIntensityDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={applyAdvancedRenderingBloomIntensity}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingBloomIntensity
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingBloomIntensity
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingBloomIntensity
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Threshold</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.05"
                              value={advancedRenderingBloomThresholdDraft}
                              onChange={(event) =>
                                setAdvancedRenderingBloomThresholdDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={applyAdvancedRenderingBloomThreshold}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingBloomThreshold
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingBloomThreshold
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingBloomThreshold
                                )
                              }
                            />
                          </label>
                        </div>
                        <label className="form-field">
                          <span className="label">Radius</span>
                          <input
                            className="text-input"
                            type="number"
                            min="0"
                            step="0.05"
                            value={advancedRenderingBloomRadiusDraft}
                            onChange={(event) =>
                              setAdvancedRenderingBloomRadiusDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={applyAdvancedRenderingBloomRadius}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyAdvancedRenderingBloomRadius
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyAdvancedRenderingBloomRadius
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyAdvancedRenderingBloomRadius
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Tone Mapping</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Mode</span>
                            <select
                              className="select-input"
                              value={advancedRendering.toneMapping.mode}
                              onChange={(event) =>
                                applyAdvancedRenderingToneMappingMode(
                                  event.currentTarget
                                    .value as AdvancedRenderingToneMappingMode
                                )
                              }
                            >
                              {ADVANCED_RENDERING_TONE_MAPPING_MODES.map(
                                (mode) => (
                                  <option key={mode} value={mode}>
                                    {formatAdvancedRenderingToneMappingLabel(
                                      mode
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="label">Exposure</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0.001"
                              step="0.1"
                              value={advancedRenderingToneMappingExposureDraft}
                              onChange={(event) =>
                                setAdvancedRenderingToneMappingExposureDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={applyAdvancedRenderingToneMappingExposure}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingToneMappingExposure
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingToneMappingExposure
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingToneMappingExposure
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Depth of Field</div>
                        <label className="form-field form-field--toggle">
                          <span className="label">Enabled</span>
                          <input
                            type="checkbox"
                            checked={advancedRendering.depthOfField.enabled}
                            onChange={(event) =>
                              applyAdvancedRenderingDepthOfFieldEnabled(
                                event.currentTarget.checked
                              )
                            }
                          />
                        </label>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Focus Distance</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                advancedRenderingDepthOfFieldFocusDistanceDraft
                              }
                              onChange={(event) =>
                                setAdvancedRenderingDepthOfFieldFocusDistanceDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={
                                applyAdvancedRenderingDepthOfFieldFocusDistance
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocusDistance
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocusDistance
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocusDistance
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Focal Length</span>
                            <input
                              className="text-input"
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={
                                advancedRenderingDepthOfFieldFocalLengthDraft
                              }
                              onChange={(event) =>
                                setAdvancedRenderingDepthOfFieldFocalLengthDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={
                                applyAdvancedRenderingDepthOfFieldFocalLength
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocalLength
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocalLength
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyAdvancedRenderingDepthOfFieldFocalLength
                                )
                              }
                            />
                          </label>
                        </div>
                        <label className="form-field">
                          <span className="label">Bokeh Scale</span>
                          <input
                            className="text-input"
                            type="number"
                            min="0.001"
                            step="0.1"
                            value={advancedRenderingDepthOfFieldBokehScaleDraft}
                            onChange={(event) =>
                              setAdvancedRenderingDepthOfFieldBokehScaleDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={
                              applyAdvancedRenderingDepthOfFieldBokehScale
                            }
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyAdvancedRenderingDepthOfFieldBokehScale
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyAdvancedRenderingDepthOfFieldBokehScale
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyAdvancedRenderingDepthOfFieldBokehScale
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Volume Rendering Paths</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Fog</span>
                            <select
                              className="select-input"
                              value={advancedRendering.fogPath}
                              onChange={(event) =>
                                applyAdvancedRenderingFogPath(
                                  event.currentTarget
                                    .value as BoxVolumeRenderPath
                                )
                              }
                            >
                              {BOX_VOLUME_RENDER_PATHS.map((path) => (
                                <option key={path} value={path}>
                                  {formatBoxVolumeRenderPathLabel(path)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="label">Water</span>
                            <select
                              className="select-input"
                              value={advancedRendering.waterPath}
                              onChange={(event) =>
                                applyAdvancedRenderingWaterPath(
                                  event.currentTarget
                                    .value as BoxVolumeRenderPath
                                )
                              }
                            >
                              {BOX_VOLUME_RENDER_PATHS.map((path) => (
                                <option key={path} value={path}>
                                  {formatBoxVolumeRenderPathLabel(path)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {advancedRendering.waterPath === "quality" ? (
                          <label className="form-field">
                            <span className="label">Water Reflection</span>
                            <select
                              data-testid="advanced-rendering-water-reflection-mode"
                              className="select-input"
                              value={advancedRendering.waterReflectionMode}
                              onChange={(event) =>
                                applyAdvancedRenderingWaterReflectionMode(
                                  event.currentTarget
                                    .value as AdvancedRenderingWaterReflectionMode
                                )
                              }
                            >
                              {ADVANCED_RENDERING_WATER_REFLECTION_MODES.map(
                                (mode) => (
                                  <option key={mode} value={mode}>
                                    {formatAdvancedRenderingWaterReflectionModeLabel(
                                      mode
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </Panel>
            </>
          ) : (
            <Panel title="Inspector">
              <div className="stat-card">
                <div className="label">Selection</div>
                <div className="value">
                  {describeSelection(
                    editorState.selection,
                    brushList,
                    editorState.document.modelInstances,
                    editorState.document.assets,
                    editorState.document.entities
                  )}
                </div>
              </div>

              {selectedModelInstance !== null ? (
                <>
                  <div className="stat-card">
                    <div className="label">Model Asset</div>
                    <div className="value">
                      {selectedModelAsset?.sourceName ?? "Missing Asset"}
                    </div>
                    <div className="material-summary">
                      {selectedModelAssetRecord === null
                        ? "This model instance references an asset that is missing from the registry."
                        : formatModelAssetSummary(selectedModelAssetRecord)}
                    </div>
                    {selectedModelAssetRecord === null ? null : (
                      <div className="material-summary">
                        {formatModelBoundingBoxLabel(selectedModelAssetRecord)}
                      </div>
                    )}
                  </div>

                  <div className="form-section">
                    <div className="label">Position</div>
                    <div className="vector-inputs">
                      <label className="form-field">
                        <span className="label">X</span>
                        <input
                          data-testid="model-instance-position-x"
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={modelPositionDraft.x}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelPositionDraft((draft) => ({
                              ...draft,
                              x: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Y</span>
                        <input
                          data-testid="model-instance-position-y"
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={modelPositionDraft.y}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelPositionDraft((draft) => ({
                              ...draft,
                              y: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Z</span>
                        <input
                          data-testid="model-instance-position-z"
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={modelPositionDraft.z}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelPositionDraft((draft) => ({
                              ...draft,
                              z: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="label">Rotation</div>
                    <div className="vector-inputs">
                      <label className="form-field">
                        <span className="label">X</span>
                        <input
                          data-testid="model-instance-rotation-x"
                          className="text-input"
                          type="number"
                          step="1"
                          value={modelRotationDraft.x}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelRotationDraft((draft) => ({
                              ...draft,
                              x: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Y</span>
                        <input
                          data-testid="model-instance-rotation-y"
                          className="text-input"
                          type="number"
                          step="1"
                          value={modelRotationDraft.y}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelRotationDraft((draft) => ({
                              ...draft,
                              y: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Z</span>
                        <input
                          data-testid="model-instance-rotation-z"
                          className="text-input"
                          type="number"
                          step="1"
                          value={modelRotationDraft.z}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelRotationDraft((draft) => ({
                              ...draft,
                              z: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="label">Scale</div>
                    <div className="vector-inputs">
                      <label className="form-field">
                        <span className="label">X</span>
                        <input
                          data-testid="model-instance-scale-x"
                          className="text-input"
                          type="number"
                          min="0.001"
                          step="0.1"
                          value={modelScaleDraft.x}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelScaleDraft((draft) => ({
                              ...draft,
                              x: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Y</span>
                        <input
                          data-testid="model-instance-scale-y"
                          className="text-input"
                          type="number"
                          min="0.001"
                          step="0.1"
                          value={modelScaleDraft.y}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelScaleDraft((draft) => ({
                              ...draft,
                              y: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Z</span>
                        <input
                          data-testid="model-instance-scale-z"
                          className="text-input"
                          type="number"
                          min="0.001"
                          step="0.1"
                          value={modelScaleDraft.z}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setModelScaleDraft((draft) => ({
                              ...draft,
                              z: nextValue
                            }));
                          }}
                          onBlur={applyModelInstanceChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyModelInstanceChange
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="label">Collision</div>
                    <label className="form-field">
                      <span className="label">Mode</span>
                      <select
                        data-testid="model-instance-collision-mode"
                        className="select-input"
                        value={selectedModelInstance.collision.mode}
                        onChange={(event) => {
                          store.executeCommand(
                            createUpsertModelInstanceCommand({
                              modelInstance: {
                                ...selectedModelInstance,
                                collision: {
                                  ...selectedModelInstance.collision,
                                  mode: event.target
                                    .value as ModelInstanceCollisionMode
                                }
                              },
                              label: "Set model collision mode"
                            })
                          );
                        }}
                      >
                        {MODEL_INSTANCE_COLLISION_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <input
                        data-testid="model-instance-collision-visible"
                        type="checkbox"
                        checked={selectedModelInstance.collision.visible}
                        onChange={(event) => {
                          store.executeCommand(
                            createUpsertModelInstanceCommand({
                              modelInstance: {
                                ...selectedModelInstance,
                                collision: {
                                  ...selectedModelInstance.collision,
                                  visible: event.target.checked
                                }
                              },
                              label: event.target.checked
                                ? "Show model collision debug"
                                : "Hide model collision debug"
                            })
                          );
                        }}
                      />
                      <span className="label">
                        Show generated collision debug
                      </span>
                    </label>
                    <div className="material-summary">
                      {getModelInstanceCollisionModeDescription(
                        selectedModelInstance.collision.mode
                      )}
                    </div>
                  </div>

                  {selectedModelAssetRecord !== null &&
                    selectedModelAssetRecord.metadata.animationNames.length >
                      0 && (
                      <div className="form-section">
                        <div className="label">Animation</div>
                        <label className="form-field">
                          <span className="label">Clip</span>
                          <select
                            className="select-input"
                            value={
                              selectedModelInstance.animationClipName ?? ""
                            }
                            onChange={(e) => {
                              const clipName = e.target.value || undefined;
                              store.executeCommand(
                                createUpsertModelInstanceCommand({
                                  modelInstance: {
                                    ...selectedModelInstance,
                                    animationClipName: clipName
                                  },
                                  label: "Set animation clip"
                                })
                              );
                            }}
                          >
                            <option value="">— none —</option>
                            {selectedModelAssetRecord.metadata.animationNames.map(
                              (name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                        <label className="form-field">
                          <input
                            type="checkbox"
                            checked={
                              selectedModelInstance.animationAutoplay ?? false
                            }
                            onChange={(e) => {
                              store.executeCommand(
                                createUpsertModelInstanceCommand({
                                  modelInstance: {
                                    ...selectedModelInstance,
                                    animationAutoplay: e.target.checked
                                  },
                                  label: "Set animation autoplay"
                                })
                              );
                            }}
                          />
                          <span className="label">Autoplay on scene load</span>
                        </label>
                      </div>
                    )}

                  <div className="inline-actions">
                    <button
                      className="toolbar__button"
                      type="button"
                      data-testid="apply-model-instance"
                      onClick={applyModelInstanceChange}
                    >
                      Apply Transform
                    </button>
                  </div>
                </>
              ) : selectedEntity !== null ? (
                <>
                  <div className="stat-card">
                    <div className="label">Entity Kind</div>
                    <div className="value">
                      {getEntityKindLabel(selectedEntity.kind)}
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="label">Position</div>
                    <div className="vector-inputs">
                      <label className="form-field">
                        <span className="label">X</span>
                        <input
                          data-testid={
                            selectedEntity.kind === "playerStart"
                              ? "player-start-position-x"
                              : `${selectedEntity.kind}-position-x`
                          }
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={entityPositionDraft.x}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setEntityPositionDraft((draft) => ({
                              ...draft,
                              x: nextValue
                            }));
                          }}
                          onBlur={applySelectedEntityDraftChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Y</span>
                        <input
                          data-testid={
                            selectedEntity.kind === "playerStart"
                              ? "player-start-position-y"
                              : `${selectedEntity.kind}-position-y`
                          }
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={entityPositionDraft.y}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setEntityPositionDraft((draft) => ({
                              ...draft,
                              y: nextValue
                            }));
                          }}
                          onBlur={applySelectedEntityDraftChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span className="label">Z</span>
                        <input
                          data-testid={
                            selectedEntity.kind === "playerStart"
                              ? "player-start-position-z"
                              : `${selectedEntity.kind}-position-z`
                          }
                          className="text-input"
                          type="number"
                          step={DEFAULT_GRID_SIZE}
                          value={entityPositionDraft.z}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setEntityPositionDraft((draft) => ({
                              ...draft,
                              z: nextValue
                            }));
                          }}
                          onBlur={applySelectedEntityDraftChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applySelectedEntityDraftChange
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  {selectedPointLight !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Light</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Color</span>
                            <input
                              data-testid="point-light-color"
                              className="color-input"
                              type="color"
                              value={pointLightColorDraft}
                              onChange={(event) => {
                                const nextColorHex = event.currentTarget.value;
                                setPointLightColorDraft(nextColorHex);
                                scheduleDraftCommit(() =>
                                  applyPointLightChange({
                                    colorHex: nextColorHex
                                  })
                                );
                              }}
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Intensity</span>
                            <input
                              data-testid="point-light-intensity"
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={pointLightIntensityDraft}
                              onChange={(event) =>
                                setPointLightIntensityDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applyPointLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyPointLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyPointLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyPointLightChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Range</div>
                        <label className="form-field">
                          <span className="label">Distance</span>
                          <input
                            data-testid="point-light-distance"
                            className="text-input"
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={pointLightDistanceDraft}
                            onChange={(event) =>
                              setPointLightDistanceDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={() => applyPointLightChange()}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyPointLightChange
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyPointLightChange
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyPointLightChange
                              )
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : null}

                  {selectedSpotLight !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Light</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Color</span>
                            <input
                              data-testid="spot-light-color"
                              className="color-input"
                              type="color"
                              value={spotLightColorDraft}
                              onChange={(event) => {
                                const nextColorHex = event.currentTarget.value;
                                setSpotLightColorDraft(nextColorHex);
                                scheduleDraftCommit(() =>
                                  applySpotLightChange({
                                    colorHex: nextColorHex
                                  })
                                );
                              }}
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Intensity</span>
                            <input
                              data-testid="spot-light-intensity"
                              className="text-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={spotLightIntensityDraft}
                              onChange={(event) =>
                                setSpotLightIntensityDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Range</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Distance</span>
                            <input
                              data-testid="spot-light-distance"
                              className="text-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={spotLightDistanceDraft}
                              onChange={(event) =>
                                setSpotLightDistanceDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Angle</span>
                            <input
                              data-testid="spot-light-angle"
                              className="text-input"
                              type="number"
                              min="1"
                              max="179"
                              step="1"
                              value={spotLightAngleDraft}
                              onChange={(event) =>
                                setSpotLightAngleDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Direction</div>
                        <div className="vector-inputs">
                          <label className="form-field">
                            <span className="label">X</span>
                            <input
                              data-testid="spot-light-direction-x"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={spotLightDirectionDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSpotLightDirectionDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Y</span>
                            <input
                              data-testid="spot-light-direction-y"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={spotLightDirectionDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSpotLightDirectionDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Z</span>
                            <input
                              data-testid="spot-light-direction-z"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={spotLightDirectionDraft.z}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSpotLightDirectionDraft((draft) => ({
                                  ...draft,
                                  z: nextValue
                                }));
                              }}
                              onBlur={() => applySpotLightChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySpotLightChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selectedPlayerStart !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Yaw</div>
                        <label className="form-field">
                          <span className="label">Degrees</span>
                          <input
                            data-testid="player-start-yaw"
                            className="text-input"
                            type="number"
                            step="1"
                            value={playerStartYawDraft}
                            onChange={(event) =>
                              setPlayerStartYawDraft(event.currentTarget.value)
                            }
                            onBlur={() => applyPlayerStartChange()}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyPlayerStartChange
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyPlayerStartChange
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyPlayerStartChange
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Navigation</div>
                        <label className="form-field">
                          <span className="label">Mode</span>
                          <select
                            data-testid="player-start-navigation-mode"
                            className="select-input"
                            value={playerStartNavigationModeDraft}
                            onChange={(event) => {
                              const nextMode = event.currentTarget
                                .value as PlayerStartNavigationMode;
                              setPlayerStartNavigationModeDraft(nextMode);
                              scheduleDraftCommit(() =>
                                applyPlayerStartChange({
                                  navigationMode: nextMode
                                })
                              );
                            }}
                          >
                            {PLAYER_START_NAVIGATION_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode === "firstPerson"
                                  ? "First Person"
                                  : "Third Person"}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Movement Template</div>
                        <label className="form-field">
                          <span className="label">Template</span>
                          <select
                            data-testid="player-start-movement-template"
                            className="select-input"
                            value={playerStartMovementTemplateDraft.kind}
                            onChange={(event) => {
                              const nextKind = event.currentTarget
                                .value as PlayerStartMovementTemplate["kind"];
                              const nextTemplate =
                                nextKind === "custom"
                                  ? createPlayerStartMovementTemplate({
                                      kind: "custom",
                                      moveSpeed:
                                        playerStartMovementTemplateDraft.moveSpeed,
                                      maxSpeed:
                                        playerStartMovementTemplateDraft.maxSpeed,
                                      capabilities:
                                        playerStartMovementTemplateDraft.capabilities,
                                      jump: playerStartMovementTemplateDraft.jump,
                                      sprint:
                                        playerStartMovementTemplateDraft.sprint,
                                      crouch:
                                        playerStartMovementTemplateDraft.crouch
                                    })
                                  : createPlayerStartMovementTemplate({
                                      kind: nextKind
                                    });
                              setPlayerStartMovementTemplateEditorDraft(
                                nextTemplate
                              );
                              scheduleDraftCommit(() =>
                                applyPlayerStartChange({
                                  movementTemplate: nextTemplate
                                })
                              );
                            }}
                          >
                            {PLAYER_START_MOVEMENT_TEMPLATE_KINDS.map(
                              (templateKind) => (
                                <option
                                  key={templateKind}
                                  value={templateKind}
                                >
                                  {getPlayerStartMovementTemplateLabel(
                                    templateKind
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                        <div className="material-summary">
                          {getPlayerStartMovementTemplateDescription(
                            playerStartMovementTemplateDraft.kind
                          )}
                        </div>

                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Base Speed</span>
                            <input
                              data-testid="player-start-movement-move-speed"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step="0.1"
                              value={playerStartMovementTemplateNumberDraft.moveSpeed}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPlayerStartMovementTemplateNumberDraft(
                                  (draft) => ({
                                    ...draft,
                                    moveSpeed: nextValue
                                  })
                                );
                              }}
                              onBlur={() =>
                                commitPlayerStartMovementTemplateDraft()
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="form-section">
                          <div className="label">Jump</div>
                          <label className="form-field form-field--toggle">
                            <span className="label">Enabled</span>
                            <input
                              data-testid="player-start-movement-jump-enabled"
                              type="checkbox"
                              checked={
                                playerStartMovementTemplateDraft.capabilities.jump
                              }
                              onChange={(event) =>
                                commitPlayerStartMovementTemplateDraft(
                                  {
                                    capabilities: {
                                      jump: event.currentTarget.checked
                                    }
                                  },
                                  {
                                    schedule: true
                                  }
                                )
                              }
                            />
                          </label>
                          <div className="vector-inputs vector-inputs--two">
                            <label className="form-field">
                              <span className="label">Speed</span>
                              <input
                                data-testid="player-start-movement-jump-speed"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartMovementTemplateNumberDraft.jumpSpeed}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartMovementTemplateNumberDraft(
                                    (draft) => ({
                                      ...draft,
                                      jumpSpeed: nextValue
                                    })
                                  );
                                }}
                                onBlur={() =>
                                  commitPlayerStartMovementTemplateDraft()
                                }
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Buffer ms</span>
                              <input
                                data-testid="player-start-movement-jump-buffer"
                                className="text-input"
                                type="number"
                                min="0"
                                step="1"
                                value={playerStartMovementTemplateNumberDraft.jumpBufferMs}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartMovementTemplateNumberDraft(
                                    (draft) => ({
                                      ...draft,
                                      jumpBufferMs: nextValue
                                    })
                                  );
                                }}
                                onBlur={() =>
                                  commitPlayerStartMovementTemplateDraft()
                                }
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                              />
                            </label>
                          </div>
                          <div className="vector-inputs vector-inputs--two">
                            <label className="form-field">
                              <span className="label">Coyote ms</span>
                              <input
                                data-testid="player-start-movement-coyote-time"
                                className="text-input"
                                type="number"
                                min="0"
                                step="1"
                                value={playerStartMovementTemplateNumberDraft.coyoteTimeMs}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartMovementTemplateNumberDraft(
                                    (draft) => ({
                                      ...draft,
                                      coyoteTimeMs: nextValue
                                    })
                                  );
                                }}
                                onBlur={() =>
                                  commitPlayerStartMovementTemplateDraft()
                                }
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Max Hold ms</span>
                              <input
                                data-testid="player-start-movement-variable-jump-max-hold"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="1"
                                value={playerStartMovementTemplateNumberDraft.variableJumpMaxHoldMs}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartMovementTemplateNumberDraft(
                                    (draft) => ({
                                      ...draft,
                                      variableJumpMaxHoldMs: nextValue
                                    })
                                  );
                                }}
                                onBlur={() =>
                                  commitPlayerStartMovementTemplateDraft()
                                }
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    commitPlayerStartMovementTemplateDraft
                                  )
                                }
                              />
                            </label>
                          </div>
                          <label className="form-field form-field--toggle">
                            <span className="label">Variable Height</span>
                            <input
                              data-testid="player-start-movement-variable-jump-enabled"
                              type="checkbox"
                              checked={
                                playerStartMovementTemplateDraft.jump.variableHeight
                              }
                              onChange={(event) =>
                                commitPlayerStartMovementTemplateDraft(
                                  {
                                    jump: {
                                      variableHeight:
                                        event.currentTarget.checked
                                    }
                                  },
                                  {
                                    schedule: true
                                  }
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="form-section">
                          <div className="label">Sprint</div>
                          <label className="form-field form-field--toggle">
                            <span className="label">Enabled</span>
                            <input
                              data-testid="player-start-movement-sprint-enabled"
                              type="checkbox"
                              checked={
                                playerStartMovementTemplateDraft.capabilities.sprint
                              }
                              onChange={(event) =>
                                commitPlayerStartMovementTemplateDraft(
                                  {
                                    capabilities: {
                                      sprint: event.currentTarget.checked
                                    }
                                  },
                                  {
                                    schedule: true
                                  }
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Speed Multiplier</span>
                            <input
                              data-testid="player-start-movement-sprint-multiplier"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step="0.05"
                              value={playerStartMovementTemplateNumberDraft.sprintSpeedMultiplier}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPlayerStartMovementTemplateNumberDraft(
                                  (draft) => ({
                                    ...draft,
                                    sprintSpeedMultiplier: nextValue
                                  })
                                );
                              }}
                              onBlur={() =>
                                commitPlayerStartMovementTemplateDraft()
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="form-section">
                          <div className="label">Crouch</div>
                          <label className="form-field form-field--toggle">
                            <span className="label">Enabled</span>
                            <input
                              data-testid="player-start-movement-crouch-enabled"
                              type="checkbox"
                              checked={
                                playerStartMovementTemplateDraft.capabilities.crouch
                              }
                              onChange={(event) =>
                                commitPlayerStartMovementTemplateDraft(
                                  {
                                    capabilities: {
                                      crouch: event.currentTarget.checked
                                    }
                                  },
                                  {
                                    schedule: true
                                  }
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Speed Multiplier</span>
                            <input
                              data-testid="player-start-movement-crouch-multiplier"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step="0.05"
                              value={playerStartMovementTemplateNumberDraft.crouchSpeedMultiplier}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPlayerStartMovementTemplateNumberDraft(
                                  (draft) => ({
                                    ...draft,
                                    crouchSpeedMultiplier: nextValue
                                  })
                                );
                              }}
                              onBlur={() =>
                                commitPlayerStartMovementTemplateDraft()
                              }
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  commitPlayerStartMovementTemplateDraft
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Player Collider</div>
                        <label className="form-field">
                          <span className="label">Mode</span>
                          <select
                            data-testid="player-start-collider-mode"
                            className="select-input"
                            value={playerStartColliderModeDraft}
                            onChange={(event) => {
                              const nextMode = event.currentTarget
                                .value as PlayerStartColliderMode;
                              setPlayerStartColliderModeDraft(nextMode);
                              scheduleDraftCommit(() =>
                                applyPlayerStartChange({
                                  colliderMode: nextMode
                                })
                              );
                            }}
                          >
                            {PLAYER_START_COLLIDER_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-field">
                          <span className="label">Eye Height</span>
                          <input
                            data-testid="player-start-eye-height"
                            className="text-input"
                            type="number"
                            min="0.01"
                            step="0.1"
                            value={playerStartEyeHeightDraft}
                            onChange={(event) =>
                              setPlayerStartEyeHeightDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={() => applyPlayerStartChange()}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applyPlayerStartChange
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applyPlayerStartChange
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applyPlayerStartChange
                              )
                            }
                          />
                        </label>

                        {playerStartColliderModeDraft === "capsule" ? (
                          <div className="vector-inputs">
                            <label className="form-field">
                              <span className="label">Radius</span>
                              <input
                                data-testid="player-start-capsule-radius"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartCapsuleRadiusDraft}
                                onChange={(event) =>
                                  setPlayerStartCapsuleRadiusDraft(
                                    event.currentTarget.value
                                  )
                                }
                                onBlur={() => applyPlayerStartChange()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Height</span>
                              <input
                                data-testid="player-start-capsule-height"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartCapsuleHeightDraft}
                                onChange={(event) =>
                                  setPlayerStartCapsuleHeightDraft(
                                    event.currentTarget.value
                                  )
                                }
                                onBlur={() => applyPlayerStartChange()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                              />
                            </label>
                          </div>
                        ) : null}

                        {playerStartColliderModeDraft === "box" ? (
                          <div className="vector-inputs">
                            <label className="form-field">
                              <span className="label">Size X</span>
                              <input
                                data-testid="player-start-box-size-x"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartBoxSizeDraft.x}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartBoxSizeDraft((draft) => ({
                                    ...draft,
                                    x: nextValue
                                  }));
                                }}
                                onBlur={() => applyPlayerStartChange()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Size Y</span>
                              <input
                                data-testid="player-start-box-size-y"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartBoxSizeDraft.y}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartBoxSizeDraft((draft) => ({
                                    ...draft,
                                    y: nextValue
                                  }));
                                }}
                                onBlur={() => applyPlayerStartChange()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Size Z</span>
                              <input
                                data-testid="player-start-box-size-z"
                                className="text-input"
                                type="number"
                                min="0.01"
                                step="0.1"
                                value={playerStartBoxSizeDraft.z}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setPlayerStartBoxSizeDraft((draft) => ({
                                    ...draft,
                                    z: nextValue
                                  }));
                                }}
                                onBlur={() => applyPlayerStartChange()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyPlayerStartChange
                                  )
                                }
                              />
                            </label>
                          </div>
                        ) : null}

                        <div className="material-summary">
                          {getPlayerStartColliderModeDescription(
                            playerStartColliderModeDraft
                          )}
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Input Bindings</div>
                        {PLAYER_START_MOVEMENT_ACTIONS.map((action) => (
                          <div
                            key={action}
                            className="vector-inputs vector-inputs--two"
                          >
                            <label className="form-field">
                              <span className="label">
                                {getPlayerStartInputActionLabel(action)} Key
                              </span>
                              <button
                                type="button"
                                data-testid={`player-start-keyboard-binding-${action}`}
                                className="toolbar__button"
                                onClick={() => {
                                  setPlayerStartKeyboardCaptureAction(action);
                                  setStatusMessage(
                                    `Press any key for ${getPlayerStartInputActionLabel(action)}. Press Escape to cancel.`
                                  );
                                }}
                              >
                                {playerStartKeyboardCaptureAction === action
                                  ? "Press Any Key..."
                                  : formatPlayerStartKeyboardBindingLabel(
                                      playerStartInputBindingsDraft.keyboard[
                                        action
                                      ]
                                    )}
                              </button>
                            </label>
                            <label className="form-field">
                              <span className="label">
                                {getPlayerStartInputActionLabel(action)} Pad
                              </span>
                              <select
                                data-testid={`player-start-gamepad-binding-${action}`}
                                className="select-input"
                                value={playerStartInputBindingsDraft.gamepad[action]}
                                onChange={(event) =>
                                  handlePlayerStartMovementGamepadBindingChange(
                                    action,
                                    event.currentTarget
                                      .value as PlayerStartGamepadBinding
                                  )
                                }
                              >
                                {PLAYER_START_GAMEPAD_BINDINGS.map((binding) => (
                                  <option key={binding} value={binding}>
                                    {formatPlayerStartGamepadBindingLabel(binding)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ))}

                        {PLAYER_START_LOCOMOTION_ACTIONS.map((action) => (
                          <div
                            key={action}
                            className="vector-inputs vector-inputs--two"
                          >
                            <label className="form-field">
                              <span className="label">
                                {getPlayerStartInputActionLabel(action)} Key
                              </span>
                              <button
                                type="button"
                                data-testid={`player-start-keyboard-binding-${action}`}
                                className="toolbar__button"
                                onClick={() => {
                                  setPlayerStartKeyboardCaptureAction(action);
                                  setStatusMessage(
                                    `Press any key for ${getPlayerStartInputActionLabel(action)}. Press Escape to cancel.`
                                  );
                                }}
                              >
                                {playerStartKeyboardCaptureAction === action
                                  ? "Press Any Key..."
                                  : formatPlayerStartKeyboardBindingLabel(
                                      playerStartInputBindingsDraft.keyboard[
                                        action
                                      ]
                                    )}
                              </button>
                            </label>
                            <label className="form-field">
                              <span className="label">
                                {getPlayerStartInputActionLabel(action)} Pad
                              </span>
                              <select
                                data-testid={`player-start-gamepad-binding-${action}`}
                                className="select-input"
                                value={playerStartInputBindingsDraft.gamepad[action]}
                                onChange={(event) =>
                                  handlePlayerStartGamepadActionBindingChange(
                                    action,
                                    event.currentTarget
                                      .value as PlayerStartGamepadActionBinding
                                  )
                                }
                              >
                                {PLAYER_START_GAMEPAD_ACTION_BINDINGS.map(
                                  (binding) => (
                                    <option key={binding} value={binding}>
                                      {formatPlayerStartGamepadActionBindingLabel(
                                        binding
                                      )}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          </div>
                        ))}

                        <label className="form-field">
                          <span className="label">Camera Pad</span>
                          <select
                            data-testid="player-start-gamepad-camera-look-binding"
                            className="select-input"
                            value={playerStartInputBindingsDraft.gamepad.cameraLook}
                            onChange={(event) =>
                              handlePlayerStartGamepadCameraLookBindingChange(
                                event.currentTarget
                                  .value as PlayerStartGamepadCameraLookBinding
                              )
                            }
                          >
                            {PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS.map(
                              (binding) => (
                                <option key={binding} value={binding}>
                                  {formatPlayerStartGamepadCameraLookBindingLabel(
                                    binding
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <div className="material-summary">
                          These bindings feed the same typed movement,
                          locomotion, and camera actions in First Person and
                          Third Person. Mouse look stays available as before.
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selectedSceneEntry !== null ? (
                    <div className="form-section">
                      <div className="label">Arrival Facing</div>
                      <label className="form-field">
                        <span className="label">Yaw</span>
                        <input
                          data-testid="scene-entry-yaw"
                          className="text-input"
                          type="number"
                          step="1"
                          value={sceneEntryYawDraft}
                          onChange={(event) =>
                            setSceneEntryYawDraft(event.currentTarget.value)
                          }
                          onBlur={applySceneEntryChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(event, applySceneEntryChange)
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(event, applySceneEntryChange)
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applySceneEntryChange
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedSoundEmitter !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Audio Asset</div>
                        <div className="stat-card">
                          <div className="value">
                            {selectedSoundEmitter.audioAssetId === null
                              ? "Unassigned"
                              : (selectedSoundEmitterAudioAssetRecord?.sourceName ??
                                "Missing Audio Asset")}
                          </div>
                          <div className="material-summary">
                            {selectedSoundEmitter.audioAssetId === null
                              ? "Choose an audio asset to make this emitter playable."
                              : selectedSoundEmitterAudioAssetRecord === null
                                ? `This sound emitter references ${selectedSoundEmitter.audioAssetId}, but the asset is missing or not audio.`
                                : formatAudioAssetSummary(
                                    selectedSoundEmitterAudioAssetRecord
                                  )}
                          </div>
                        </div>
                        <label className="form-field">
                          <span className="label">Audio</span>
                          <select
                            data-testid="sound-emitter-audio-asset"
                            className="text-input"
                            value={soundEmitterAudioAssetIdDraft}
                            onChange={(event) => {
                              const nextAudioAssetId =
                                event.currentTarget.value.trim();
                              setSoundEmitterAudioAssetIdDraft(
                                nextAudioAssetId
                              );
                              scheduleDraftCommit(() =>
                                applySoundEmitterChange({
                                  audioAssetId:
                                    nextAudioAssetId.length === 0
                                      ? null
                                      : nextAudioAssetId
                                })
                              );
                            }}
                          >
                            <option value="">— none —</option>
                            {audioAssetList.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.sourceName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Volume</div>
                        <label className="form-field">
                          <span className="label">Amount</span>
                          <input
                            data-testid="sound-emitter-volume"
                            className="text-input"
                            type="number"
                            min="0"
                            step="0.1"
                            value={soundEmitterVolumeDraft}
                            onChange={(event) =>
                              setSoundEmitterVolumeDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={() => applySoundEmitterChange()}
                            onKeyDown={(event) =>
                              handleDraftVectorKeyDown(
                                event,
                                applySoundEmitterChange
                              )
                            }
                            onKeyUp={(event) =>
                              handleNumberInputKeyUp(
                                event,
                                applySoundEmitterChange
                              )
                            }
                            onPointerUp={(event) =>
                              handleNumberInputPointerUp(
                                event,
                                applySoundEmitterChange
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Distance</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Ref Distance</span>
                            <input
                              data-testid="sound-emitter-ref-distance"
                              className="text-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={soundEmitterRefDistanceDraft}
                              onChange={(event) =>
                                setSoundEmitterRefDistanceDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySoundEmitterChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Max Distance</span>
                            <input
                              data-testid="sound-emitter-max-distance"
                              className="text-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={soundEmitterMaxDistanceDraft}
                              onChange={(event) =>
                                setSoundEmitterMaxDistanceDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySoundEmitterChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySoundEmitterChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Playback</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Autoplay</span>
                            <input
                              data-testid="sound-emitter-autoplay"
                              type="checkbox"
                              checked={soundEmitterAutoplayDraft}
                              onChange={(event) => {
                                const nextAutoplay =
                                  event.currentTarget.checked;
                                setSoundEmitterAutoplayDraft(nextAutoplay);
                                scheduleDraftCommit(() =>
                                  applySoundEmitterChange({
                                    autoplay: nextAutoplay
                                  })
                                );
                              }}
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Loop</span>
                            <input
                              data-testid="sound-emitter-loop"
                              type="checkbox"
                              checked={soundEmitterLoopDraft}
                              onChange={(event) => {
                                const nextLoop = event.currentTarget.checked;
                                setSoundEmitterLoopDraft(nextLoop);
                                scheduleDraftCommit(() =>
                                  applySoundEmitterChange({ loop: nextLoop })
                                );
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selectedTriggerVolume !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Size</div>
                        <div className="vector-inputs">
                          <label className="form-field">
                            <span className="label">X</span>
                            <input
                              data-testid="trigger-volume-size-x"
                              className="text-input"
                              type="number"
                              min={DEFAULT_GRID_SIZE}
                              step={DEFAULT_GRID_SIZE}
                              value={triggerVolumeSizeDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setTriggerVolumeSizeDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onBlur={applyTriggerVolumeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Y</span>
                            <input
                              data-testid="trigger-volume-size-y"
                              className="text-input"
                              type="number"
                              min={DEFAULT_GRID_SIZE}
                              step={DEFAULT_GRID_SIZE}
                              value={triggerVolumeSizeDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setTriggerVolumeSizeDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onBlur={applyTriggerVolumeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Z</span>
                            <input
                              data-testid="trigger-volume-size-z"
                              className="text-input"
                              type="number"
                              min={DEFAULT_GRID_SIZE}
                              step={DEFAULT_GRID_SIZE}
                              value={triggerVolumeSizeDraft.z}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setTriggerVolumeSizeDraft((draft) => ({
                                  ...draft,
                                  z: nextValue
                                }));
                              }}
                              onBlur={applyTriggerVolumeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyTriggerVolumeChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      {renderInteractionLinksSection(
                        selectedTriggerVolume,
                        selectedTriggerVolumeLinks,
                        "add-trigger-teleport-link",
                        "add-trigger-visibility-link",
                        "add-trigger-play-sound-link",
                        "add-trigger-stop-sound-link"
                      )}
                    </>
                  ) : null}

                  {selectedTeleportTarget !== null ? (
                    <div className="form-section">
                      <div className="label">Yaw</div>
                      <label className="form-field">
                        <span className="label">Degrees</span>
                        <input
                          data-testid="teleport-target-yaw"
                          className="text-input"
                          type="number"
                          step="1"
                          value={teleportTargetYawDraft}
                          onChange={(event) =>
                            setTeleportTargetYawDraft(event.currentTarget.value)
                          }
                          onBlur={applyTeleportTargetChange}
                          onKeyDown={(event) =>
                            handleDraftVectorKeyDown(
                              event,
                              applyTeleportTargetChange
                            )
                          }
                          onKeyUp={(event) =>
                            handleNumberInputKeyUp(
                              event,
                              applyTeleportTargetChange
                            )
                          }
                          onPointerUp={(event) =>
                            handleNumberInputPointerUp(
                              event,
                              applyTeleportTargetChange
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedInteractable !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Interaction</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Range</span>
                            <input
                              data-testid="interactable-radius"
                              className="text-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={interactableRadiusDraft}
                              onChange={(event) =>
                                setInteractableRadiusDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applyInteractableChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyInteractableChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyInteractableChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyInteractableChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Enabled</span>
                            <input
                              data-testid="interactable-enabled"
                              type="checkbox"
                              checked={interactableEnabledDraft}
                              onChange={(event) => {
                                const nextEnabled = event.currentTarget.checked;
                                setInteractableEnabledDraft(nextEnabled);
                                scheduleDraftCommit(() =>
                                  applyInteractableChange({
                                    enabled: nextEnabled
                                  })
                                );
                              }}
                            />
                          </label>
                        </div>
                        <div className="material-summary">
                          Range defines how close the player must be before the
                          click prompt can activate.
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Prompt</div>
                        <label className="form-field">
                          <span className="label">Text</span>
                          <input
                            data-testid="interactable-prompt"
                            className="text-input"
                            type="text"
                            value={interactablePromptDraft}
                            onChange={(event) =>
                              setInteractablePromptDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={() => applyInteractableChange()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                applyInteractableChange();
                              }
                            }}
                          />
                        </label>
                      </div>

                      {renderInteractionLinksSection(
                        selectedInteractable,
                        selectedInteractableLinks,
                        "add-interactable-teleport-link",
                        "add-interactable-visibility-link",
                        "add-interactable-play-sound-link",
                        "add-interactable-stop-sound-link"
                      )}
                    </>
                  ) : null}

                  {selectedSceneExit !== null ? (
                    <>
                      <div className="form-section">
                        <div className="label">Transition</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">Range</span>
                            <input
                              data-testid="scene-exit-radius"
                              className="text-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={sceneExitRadiusDraft}
                              onChange={(event) =>
                                setSceneExitRadiusDraft(
                                  event.currentTarget.value
                                )
                              }
                              onBlur={() => applySceneExitChange()}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applySceneExitChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applySceneExitChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySceneExitChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Enabled</span>
                            <input
                              data-testid="scene-exit-enabled"
                              type="checkbox"
                              checked={sceneExitEnabledDraft}
                              onChange={(event) => {
                                const nextEnabled = event.currentTarget.checked;
                                setSceneExitEnabledDraft(nextEnabled);
                                scheduleDraftCommit(() =>
                                  applySceneExitChange({
                                    enabled: nextEnabled
                                  })
                                );
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Prompt</div>
                        <label className="form-field">
                          <span className="label">Text</span>
                          <input
                            data-testid="scene-exit-prompt"
                            className="text-input"
                            type="text"
                            value={sceneExitPromptDraft}
                            onChange={(event) =>
                              setSceneExitPromptDraft(
                                event.currentTarget.value
                              )
                            }
                            onBlur={() => applySceneExitChange()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                applySceneExitChange();
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="form-section">
                        <div className="label">Destination</div>
                        <label className="form-field">
                          <span className="label">Scene</span>
                          <select
                            data-testid="scene-exit-target-scene"
                            className="select-input"
                            value={sceneExitTargetSceneIdDraft}
                            onChange={(event) => {
                              const nextSceneId = event.currentTarget.value;
                              const nextEntryId =
                                sceneEntryOptionsBySceneId[nextSceneId]?.[0]
                                  ?.entity.id ?? "";
                              setSceneExitTargetSceneIdDraft(nextSceneId);
                              setSceneExitTargetEntryIdDraft(nextEntryId);
                              scheduleDraftCommit(() =>
                                applySceneExitChange({
                                  targetSceneId: nextSceneId,
                                  targetEntryEntityId: nextEntryId
                                })
                              );
                            }}
                          >
                            {sceneTargetOptions.map((scene) => (
                              <option key={scene.id} value={scene.id}>
                                {scene.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-field">
                          <span className="label">Entry</span>
                          <select
                            data-testid="scene-exit-target-entry"
                            className="select-input"
                            value={sceneExitTargetEntryIdDraft}
                            onChange={(event) => {
                              const nextEntryId = event.currentTarget.value;
                              setSceneExitTargetEntryIdDraft(nextEntryId);
                              scheduleDraftCommit(() =>
                                applySceneExitChange({
                                  targetEntryEntityId: nextEntryId
                                })
                              );
                            }}
                          >
                            {selectedSceneExitTargetEntryOptions.map(
                              ({ entity, label }) => (
                                <option key={entity.id} value={entity.id}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                        <div className="material-summary">
                          Scene Exits load the target scene through the runner
                          overlay and spawn at the selected Scene Entry.
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              ) : selectedBrush === null ? (
                <div className="outliner-empty">
                  Select a whitebox solid or entity to edit authored properties.
                </div>
              ) : (
                <>
                  <div className="stat-card">
                    <div className="label">Whitebox Solid Type</div>
                    <div className="value">box</div>
                  </div>

                  <div className="stat-card">
                    <div className="label">Selection Mode</div>
                    <div className="value">
                      {getWhiteboxSelectionModeLabel(whiteboxSelectionMode)}
                    </div>
                  </div>

                  {whiteboxSelectionMode !== "object" ? (
                    <div className="outliner-empty">
                      {whiteboxSelectionMode === "face"
                        ? "Face mode keeps whole-solid transforms out of the way. Select a face to edit its material or UV transform."
                        : whiteboxSelectionMode === "edge"
                          ? "Edge mode is selection-only in this slice. Edge transforms land next."
                          : "Vertex mode is selection-only in this slice. Vertex transforms land next."}
                    </div>
                  ) : (
                    <>
                      <div className="form-section">
                        <div className="label">Center</div>
                        <div className="vector-inputs">
                          <label className="form-field">
                            <span className="label">X</span>
                            <input
                              data-testid="brush-center-x"
                              className="text-input"
                              type="number"
                              step={whiteboxVectorInputStep}
                              value={positionDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPositionDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onBlur={applyPositionChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Y</span>
                            <input
                              data-testid="brush-center-y"
                              className="text-input"
                              type="number"
                              step={whiteboxVectorInputStep}
                              value={positionDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPositionDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onBlur={applyPositionChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Z</span>
                            <input
                              data-testid="brush-center-z"
                              className="text-input"
                              type="number"
                              step={whiteboxVectorInputStep}
                              value={positionDraft.z}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setPositionDraft((draft) => ({
                                  ...draft,
                                  z: nextValue
                                }));
                              }}
                              onBlur={applyPositionChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyPositionChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Rotation</div>
                        <div className="vector-inputs">
                          <label className="form-field">
                            <span className="label">X</span>
                            <input
                              data-testid="brush-rotation-x"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={rotationDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setRotationDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onBlur={applyRotationChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Y</span>
                            <input
                              data-testid="brush-rotation-y"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={rotationDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setRotationDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onBlur={applyRotationChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Z</span>
                            <input
                              data-testid="brush-rotation-z"
                              className="text-input"
                              type="number"
                              step="0.1"
                              value={rotationDraft.z}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setRotationDraft((draft) => ({
                                  ...draft,
                                  z: nextValue
                                }));
                              }}
                              onBlur={applyRotationChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applyRotationChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Size</div>
                        <div className="vector-inputs">
                          <label className="form-field">
                            <span className="label">X</span>
                            <input
                              data-testid="brush-size-x"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step={whiteboxVectorInputStep}
                              value={sizeDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSizeDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onBlur={applySizeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(event, applySizeChange)
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(event, applySizeChange)
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySizeChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Y</span>
                            <input
                              data-testid="brush-size-y"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step={whiteboxVectorInputStep}
                              value={sizeDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSizeDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onBlur={applySizeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(event, applySizeChange)
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(event, applySizeChange)
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySizeChange
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">Z</span>
                            <input
                              data-testid="brush-size-z"
                              className="text-input"
                              type="number"
                              min="0.01"
                              step={whiteboxVectorInputStep}
                              value={sizeDraft.z}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setSizeDraft((draft) => ({
                                  ...draft,
                                  z: nextValue
                                }));
                              }}
                              onBlur={applySizeChange}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(event, applySizeChange)
                              }
                              onKeyUp={(event) =>
                                handleNumberInputKeyUp(event, applySizeChange)
                              }
                              onPointerUp={(event) =>
                                handleNumberInputPointerUp(
                                  event,
                                  applySizeChange
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Volume Mode</div>
                        <label className="form-field">
                          <span className="label">Mode</span>
                          <select
                            data-testid="brush-volume-mode"
                            className="select-input"
                            value={boxVolumeModeDraft}
                            onChange={(event) => {
                              const nextMode = event.currentTarget
                                .value as BoxBrushVolumeMode;
                              setBoxVolumeModeDraft(nextMode);
                              applyBoxVolumeModeChange(nextMode);
                            }}
                          >
                            {BOX_BRUSH_VOLUME_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {formatBoxVolumeModeLabel(mode)}
                              </option>
                            ))}
                          </select>
                        </label>

                        {boxVolumeModeDraft === "water" ? (
                          <>
                            <div className="vector-inputs vector-inputs--two">
                              <label className="form-field">
                                <span className="label">Color</span>
                                <input
                                  data-testid="brush-water-color"
                                  className="color-input"
                                  type="color"
                                  value={boxVolumeWaterColorDraft}
                                  onChange={(event) => {
                                    const nextColorHex =
                                      event.currentTarget.value;
                                    setBoxVolumeWaterColorDraft(nextColorHex);
                                    scheduleDraftCommit(() =>
                                      applyBoxWaterColorDraft(nextColorHex)
                                    );
                                  }}
                                />
                              </label>
                              <label className="form-field">
                                <span className="label">Surface Opacity</span>
                                <input
                                  data-testid="brush-water-surface-opacity"
                                  className="text-input"
                                  type="number"
                                  min="0"
                                  step="0.05"
                                  value={boxVolumeWaterSurfaceOpacityDraft}
                                  onChange={(event) =>
                                    setBoxVolumeWaterSurfaceOpacityDraft(
                                      event.currentTarget.value
                                    )
                                  }
                                  onBlur={() => applyBoxWaterSettings()}
                                  onKeyDown={(event) =>
                                    handleDraftVectorKeyDown(
                                      event,
                                      applyBoxWaterSettings
                                    )
                                  }
                                  onKeyUp={(event) =>
                                    handleNumberInputKeyUp(
                                      event,
                                      applyBoxWaterSettings
                                    )
                                  }
                                  onPointerUp={(event) =>
                                    handleNumberInputPointerUp(
                                      event,
                                      applyBoxWaterSettings
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <label className="form-field">
                              <span className="label">Wave Strength</span>
                              <input
                                data-testid="brush-water-wave-strength"
                                className="text-input"
                                type="number"
                                min="0"
                                step="0.05"
                                value={boxVolumeWaterWaveStrengthDraft}
                                onChange={(event) =>
                                  setBoxVolumeWaterWaveStrengthDraft(
                                    event.currentTarget.value
                                  )
                                }
                                onBlur={() => applyBoxWaterSettings()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="label">Foam Contact Limit</span>
                              <input
                                data-testid="brush-water-foam-contact-limit"
                                className="text-input"
                                type="number"
                                min="1"
                                max={String(
                                  MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT
                                )}
                                step="1"
                                value={boxVolumeWaterFoamContactLimitDraft}
                                onChange={(event) =>
                                  setBoxVolumeWaterFoamContactLimitDraft(
                                    event.currentTarget.value
                                  )
                                }
                                onBlur={() => applyBoxWaterSettings()}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyBoxWaterSettings
                                  )
                                }
                              />
                            </label>
                            <label className="form-field form-field--toggle">
                              <span className="label">
                                Vertical Surface Motion
                              </span>
                              <input
                                data-testid="brush-water-surface-displacement-enabled"
                                type="checkbox"
                                checked={
                                  boxVolumeWaterSurfaceDisplacementEnabledDraft
                                }
                                onChange={(event) => {
                                  const nextSurfaceDisplacementEnabled =
                                    event.currentTarget.checked;
                                  setBoxVolumeWaterSurfaceDisplacementEnabledDraft(
                                    nextSurfaceDisplacementEnabled
                                  );
                                  scheduleDraftCommit(() =>
                                    applyBoxWaterSettings({
                                      surfaceDisplacementEnabled:
                                        nextSurfaceDisplacementEnabled
                                    })
                                  );
                                }}
                              />
                            </label>
                          </>
                        ) : null}

                        {boxVolumeModeDraft === "fog" ? (
                          <>
                            <div className="vector-inputs vector-inputs--two">
                              <label className="form-field">
                                <span className="label">Color</span>
                                <input
                                  data-testid="brush-fog-color"
                                  className="color-input"
                                  type="color"
                                  value={boxVolumeFogColorDraft}
                                  onChange={(event) => {
                                    const nextColorHex =
                                      event.currentTarget.value;
                                    setBoxVolumeFogColorDraft(nextColorHex);
                                    scheduleDraftCommit(() =>
                                      applyBoxFogColorDraft(nextColorHex)
                                    );
                                  }}
                                />
                              </label>
                              <label className="form-field">
                                <span className="label">Density</span>
                                <input
                                  data-testid="brush-fog-density"
                                  className="text-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={boxVolumeFogDensityDraft}
                                  onChange={(event) =>
                                    setBoxVolumeFogDensityDraft(
                                      event.currentTarget.value
                                    )
                                  }
                                  onBlur={applyBoxFogSettings}
                                  onKeyDown={(event) =>
                                    handleDraftVectorKeyDown(
                                      event,
                                      applyBoxFogSettings
                                    )
                                  }
                                  onKeyUp={(event) =>
                                    handleNumberInputKeyUp(
                                      event,
                                      applyBoxFogSettings
                                    )
                                  }
                                  onPointerUp={(event) =>
                                    handleNumberInputPointerUp(
                                      event,
                                      applyBoxFogSettings
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <label className="form-field">
                              <span className="label">Padding</span>
                              <input
                                data-testid="brush-fog-padding"
                                className="text-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={boxVolumeFogPaddingDraft}
                                onChange={(event) =>
                                  setBoxVolumeFogPaddingDraft(
                                    event.currentTarget.value
                                  )
                                }
                                onBlur={applyBoxFogSettings}
                                onKeyDown={(event) =>
                                  handleDraftVectorKeyDown(
                                    event,
                                    applyBoxFogSettings
                                  )
                                }
                                onKeyUp={(event) =>
                                  handleNumberInputKeyUp(
                                    event,
                                    applyBoxFogSettings
                                  )
                                }
                                onPointerUp={(event) =>
                                  handleNumberInputPointerUp(
                                    event,
                                    applyBoxFogSettings
                                  )
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}

                  <div className="form-section">
                    <div className="label">Faces</div>
                    <div className="face-grid">
                      {BOX_FACE_IDS.map((faceId) => (
                        <button
                          key={faceId}
                          type="button"
                          data-testid={`face-button-${faceId}`}
                          className={`face-chip ${isBrushFaceSelected(editorState.selection, selectedBrush.id, faceId) ? "face-chip--active" : ""}`}
                          onClick={() => {
                            store.setWhiteboxSelectionMode("face");
                            applySelection(
                              {
                                kind: "brushFace",
                                brushId: selectedBrush.id,
                                faceId
                              },
                              "inspector"
                            );
                          }}
                        >
                          <span className="face-chip__title">
                            {BOX_FACE_LABELS[faceId]}
                          </span>
                          <span className="face-chip__meta">{faceId}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {whiteboxSelectionMode === "edge" ? (
                    selectedEdgeId === null ? (
                      <div className="outliner-empty">
                        Select an edge in the viewport to inspect it. Edge
                        transforms land in the next slice.
                      </div>
                    ) : (
                      <div className="stat-card">
                        <div className="label">Active Edge</div>
                        <div className="value">
                          {BOX_EDGE_LABELS[selectedEdgeId]}
                        </div>
                        <div className="material-summary">
                          Edge selection is visible in the viewport. Persistent
                          edge transforms are still deferred.
                        </div>
                      </div>
                    )
                  ) : whiteboxSelectionMode === "vertex" ? (
                    selectedVertexId === null ? (
                      <div className="outliner-empty">
                        Select a vertex in the viewport to inspect it. Vertex
                        transforms land in the next slice.
                      </div>
                    ) : (
                      <div className="stat-card">
                        <div className="label">Active Vertex</div>
                        <div className="value">
                          {BOX_VERTEX_LABELS[selectedVertexId]}
                        </div>
                        <div className="material-summary">
                          Vertex selection is visible in the viewport.
                          Persistent vertex transforms are still deferred.
                        </div>
                      </div>
                    )
                  ) : whiteboxSelectionMode !== "face" ? (
                    <div className="outliner-empty">
                      Switch to Face mode or choose a face chip to edit
                      materials and UVs.
                    </div>
                  ) : selectedFace === null || selectedFaceId === null ? (
                    <div className="outliner-empty">
                      Select a face to edit its material and UV transform.
                    </div>
                  ) : (
                    <>
                      <div className="stat-card">
                        <div className="label">Active Face</div>
                        <div className="value">
                          {BOX_FACE_LABELS[selectedFaceId]}
                        </div>
                        <div
                          className="material-summary"
                          data-testid="selected-face-material-name"
                        >
                          Material:{" "}
                          {selectedFaceMaterial?.name ?? "Fallback face color"}
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">Material</div>
                        <div className="material-browser">
                          {materialList.map((material) => (
                            <button
                              key={material.id}
                              type="button"
                              data-testid={`material-button-${material.id}`}
                              className={`material-item ${selectedFace.materialId === material.id ? "material-item--active" : ""}`}
                              onClick={() => applyFaceMaterial(material.id)}
                            >
                              <span
                                className="material-item__preview"
                                style={getMaterialPreviewStyle(material)}
                                aria-hidden="true"
                              />
                              <span className="material-item__text">
                                <span className="material-item__title">
                                  {material.name}
                                </span>
                                <span className="material-item__meta">
                                  {material.tags.join(" | ")}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="inline-actions">
                          <button
                            className="toolbar__button"
                            type="button"
                            onClick={clearFaceMaterial}
                          >
                            Clear Material
                          </button>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">UV Offset</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">U</span>
                            <input
                              data-testid="face-uv-offset-x"
                              className="text-input"
                              type="number"
                              step="0.125"
                              value={uvOffsetDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setUvOffsetDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  handleApplyUvDraft
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">V</span>
                            <input
                              data-testid="face-uv-offset-y"
                              className="text-input"
                              type="number"
                              step="0.125"
                              value={uvOffsetDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setUvOffsetDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  handleApplyUvDraft
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <div className="label">UV Scale</div>
                        <div className="vector-inputs vector-inputs--two">
                          <label className="form-field">
                            <span className="label">U</span>
                            <input
                              data-testid="face-uv-scale-x"
                              className="text-input"
                              type="number"
                              min="0.001"
                              step="0.125"
                              value={uvScaleDraft.x}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setUvScaleDraft((draft) => ({
                                  ...draft,
                                  x: nextValue
                                }));
                              }}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  handleApplyUvDraft
                                )
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="label">V</span>
                            <input
                              data-testid="face-uv-scale-y"
                              className="text-input"
                              type="number"
                              min="0.001"
                              step="0.125"
                              value={uvScaleDraft.y}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setUvScaleDraft((draft) => ({
                                  ...draft,
                                  y: nextValue
                                }));
                              }}
                              onKeyDown={(event) =>
                                handleDraftVectorKeyDown(
                                  event,
                                  handleApplyUvDraft
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="inline-actions">
                        <button
                          className="toolbar__button"
                          type="button"
                          data-testid="apply-face-uv"
                          onClick={handleApplyUvDraft}
                        >
                          Apply UV Offset/Scale
                        </button>
                        <button
                          className="toolbar__button"
                          type="button"
                          onClick={handleRotateUv}
                        >
                          Rotate 90
                        </button>
                        <button
                          className="toolbar__button"
                          type="button"
                          onClick={() => handleFlipUv("u")}
                        >
                          Flip U
                        </button>
                        <button
                          className="toolbar__button"
                          type="button"
                          onClick={() => handleFlipUv("v")}
                        >
                          Flip V
                        </button>
                        <button
                          className="toolbar__button"
                          type="button"
                          onClick={handleFitUvToFace}
                        >
                          Fit To Face
                        </button>
                      </div>

                      <div className="stat-card">
                        <div className="label">UV Flags</div>
                        <div className="value">
                          Rotation {selectedFace.uv.rotationQuarterTurns * 90}°
                        </div>
                        <div className="material-summary">
                          U {selectedFace.uv.flipU ? "flipped" : "normal"} · V{" "}
                          {selectedFace.uv.flipV ? "flipped" : "normal"}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </Panel>
          )}
        </aside>
      </div>

      {addMenuPosition === null ? null : (
        <HierarchicalMenu
          title="Add"
          position={addMenuPosition}
          items={addMenuItems}
          onClose={closeAddMenu}
        />
      )}

      <footer className="status-bar">
        <div
          className="status-bar__item status-bar__item--message"
          data-testid="status-message"
          title={statusMessage}
        >
          <span className="status-bar__strong">Status:</span> {statusMessage}
        </div>
        <div
          className="status-bar__item"
          data-testid="status-whitebox-selection-mode"
        >
          <span className="status-bar__strong">Whitebox:</span>{" "}
          {getWhiteboxSelectionModeLabel(whiteboxSelectionMode)}
        </div>
        <div className="status-bar__item" data-testid="status-document">
          <span className="status-bar__strong">Document:</span>{" "}
          {documentStatusLabel}
        </div>
        <div className="status-bar__item" data-testid="status-run-preflight">
          <span className="status-bar__strong">Run:</span> {runReadyLabel}
        </div>
        <div className="status-bar__item" data-testid="status-warnings">
          <span className="status-bar__strong">Warnings:</span>{" "}
          {warningDiagnostics.length}
        </div>
        {hoveredAssetStatusMessage === null ? null : (
          <div
            className="status-bar__item status-bar__item--asset"
            data-testid="status-asset-hover"
            title={hoveredAssetStatusMessage}
          >
            <span className="status-bar__strong">Asset:</span>{" "}
            {hoveredAssetStatusMessage}
          </div>
        )}
        <div
          className="status-bar__item"
          data-testid="status-last-command"
          title={lastCommandLabel}
        >
          <span className="status-bar__strong">Last:</span> {lastCommandLabel}
        </div>
      </footer>

      <input
        ref={importProjectInputRef}
        className="visually-hidden"
        type="file"
        accept={`${PROJECT_PACKAGE_FILE_EXTENSION},.zip,application/zip`}
        onChange={handleLoadProjectChange}
      />
      <input
        ref={importModelInputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream"
        onChange={handleImportModelChange}
      />
      <input
        ref={importBackgroundImageInputRef}
        className="visually-hidden"
        type="file"
        accept=".avif,.exr,.gif,.hdr,.jpg,.jpeg,.png,.svg,.webp,image/*"
        onChange={handleImportBackgroundImageChange}
      />
      <input
        ref={importAudioInputRef}
        className="visually-hidden"
        type="file"
        accept=".aac,.flac,.m4a,.mp3,.oga,.ogg,.wav,.webm,audio/*"
        onChange={handleImportAudioChange}
      />
    </div>
  );
}
