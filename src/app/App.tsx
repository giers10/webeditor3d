import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
import { createImportAudioAssetCommand } from "../commands/import-audio-asset-command";
import { createImportBackgroundImageAssetCommand } from "../commands/import-background-image-asset-command";
import { createImportModelAssetCommand } from "../commands/import-model-asset-command";
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../commands/set-box-brush-face-material-command";
import { createSetBoxBrushNameCommand } from "../commands/set-box-brush-name-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createDeleteInteractionLinkCommand } from "../commands/delete-interaction-link-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import { createSetWorldSettingsCommand } from "../commands/set-world-settings-command";
import { createUpsertEntityCommand } from "../commands/upsert-entity-command";
import { createUpsertModelInstanceCommand } from "../commands/upsert-model-instance-command";
import { createUpsertInteractionLinkCommand } from "../commands/upsert-interaction-link-command";
import {
  getSelectedBrushFaceId,
  getSingleSelectedBrushId,
  getSingleSelectedEntityId,
  getSingleSelectedModelInstanceId,
  isBrushFaceSelected,
  isBrushSelected,
  type EditorSelection
} from "../core/selection";
import type { Vec2, Vec3 } from "../core/vector";
import {
  areModelInstancesEqual,
  createModelInstance,
  DEFAULT_MODEL_INSTANCE_POSITION,
  DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
  DEFAULT_MODEL_INSTANCE_SCALE,
  type ModelInstance
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
import type { AudioAssetRecord, ImageAssetRecord, ModelAssetRecord, ProjectAssetRecord } from "../assets/project-assets";
import { getProjectAssetKindLabel } from "../assets/project-assets";
import {
  BOX_FACE_IDS,
  DEFAULT_BOX_BRUSH_CENTER,
  DEFAULT_BOX_BRUSH_SIZE,
  createDefaultFaceUvState,
  normalizeBrushName,
  type BoxBrush,
  type BoxFaceId,
  type FaceUvRotationQuarterTurns,
  type FaceUvState
} from "../document/brushes";
import { areWorldSettingsEqual, changeWorldBackgroundMode, type WorldBackgroundMode, type WorldSettings } from "../document/scene-document";
import { formatSceneDiagnosticSummary, validateSceneDocument } from "../document/scene-document-validation";
import { getBrowserProjectAssetStorageAccess, type ProjectAssetStorage } from "../assets/project-asset-storage";
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";
import { createFitToFaceBoxBrushFaceUvState } from "../geometry/box-face-uvs";
import {
  DEFAULT_ENTITY_POSITION,
  DEFAULT_INTERACTABLE_PROMPT,
  DEFAULT_INTERACTABLE_RADIUS,
  DEFAULT_POINT_LIGHT_COLOR_HEX,
  DEFAULT_POINT_LIGHT_DISTANCE,
  DEFAULT_POINT_LIGHT_INTENSITY,
  DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID,
  DEFAULT_SOUND_EMITTER_VOLUME,
  DEFAULT_SOUND_EMITTER_REF_DISTANCE,
  DEFAULT_SOUND_EMITTER_MAX_DISTANCE,
  DEFAULT_TELEPORT_TARGET_YAW_DEGREES,
  DEFAULT_SPOT_LIGHT_ANGLE_DEGREES,
  DEFAULT_SPOT_LIGHT_COLOR_HEX,
  DEFAULT_SPOT_LIGHT_DISTANCE,
  DEFAULT_SPOT_LIGHT_DIRECTION,
  DEFAULT_SPOT_LIGHT_INTENSITY,
  DEFAULT_TRIGGER_VOLUME_SIZE,
  areEntityInstancesEqual,
  createInteractableEntity,
  createPointLightEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity,
  getEntityInstances,
  getEntityKindLabel,
  getPrimaryPlayerStartEntity,
  normalizeYawDegrees,
  normalizeInteractablePrompt,
  type EntityInstance,
  type EntityKind
} from "../entities/entity-instances";
import { getEntityDisplayLabelById, getSortedEntityDisplayLabels } from "../entities/entity-labels";
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
import { STARTER_MATERIAL_LIBRARY, type MaterialDef } from "../materials/starter-material-library";
import { RunnerCanvas } from "../runner-web/RunnerCanvas";
import type { FirstPersonTelemetry } from "../runtime-three/navigation-controller";
import type { RuntimeInteractionPrompt } from "../runtime-three/runtime-interaction-system";
import { buildRuntimeSceneFromDocument, type RuntimeNavigationMode, type RuntimeSceneDefinition } from "../runtime-three/runtime-scene-build";
import { validateRuntimeSceneBuild } from "../runtime-three/runtime-scene-validation";
import { Panel } from "../shared-ui/Panel";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import { ViewportCanvas } from "../viewport-three/ViewportCanvas";
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

type InteractionSourceEntity = Extract<EntityInstance, { kind: "triggerVolume" | "interactable" }>;

const FACE_LABELS: Record<BoxFaceId, string> = {
  posX: "+X Right",
  negX: "-X Left",
  posY: "+Y Top",
  negY: "-Y Bottom",
  posZ: "+Z Front",
  negZ: "-Z Back"
};

const STARTER_MATERIAL_ORDER = new Map(STARTER_MATERIAL_LIBRARY.map((material, index) => [material.id, index]));

function formatVec3(vector: Vec3): string {
  return `${vector.x}, ${vector.y}, ${vector.z}`;
}

function formatDiagnosticCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getViewportCaption(toolMode: "select" | "box-create" | "play", brushCount: number): string {
  if (toolMode === "play") {
    return "Runner is active.";
  }

  if (toolMode === "box-create") {
    return `Box Create is active. Click the grid to place a ${DEFAULT_BOX_BRUSH_SIZE.x} x ${DEFAULT_BOX_BRUSH_SIZE.y} x ${DEFAULT_BOX_BRUSH_SIZE.z} box.`;
  }

  return `${brushCount} box brush${brushCount === 1 ? "" : "es"} loaded. Middle-drag orbits, Shift + middle-drag pans, wheel zooms, and Numpad Comma frames the selection.`;
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

  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
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
    throw new Error(`${label} must be a finite number greater than or equal to zero.`);
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

function areFaceUvStatesEqual(left: FaceUvState, right: FaceUvState): boolean {
  return (
    areVec2Equal(left.offset, right.offset) &&
    areVec2Equal(left.scale, right.scale) &&
    left.rotationQuarterTurns === right.rotationQuarterTurns &&
    left.flipU === right.flipU &&
    left.flipV === right.flipV
  );
}

function getSelectedBoxBrush(selection: EditorSelection, brushes: BoxBrush[]): BoxBrush | null {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return null;
  }

  return brushes.find((brush) => brush.id === selectedBrushId) ?? null;
}

function getSelectedEntity(selection: EditorSelection, entities: EntityInstance[]): EntityInstance | null {
  const selectedEntityId = getSingleSelectedEntityId(selection);

  if (selectedEntityId === null) {
    return null;
  }

  return entities.find((entity) => entity.id === selectedEntityId) ?? null;
}

function getSelectedModelInstance(selection: EditorSelection, modelInstances: ModelInstance[]): ModelInstance | null {
  const selectedModelInstanceId = getSingleSelectedModelInstanceId(selection);

  if (selectedModelInstanceId === null) {
    return null;
  }

  return modelInstances.find((modelInstance) => modelInstance.id === selectedModelInstanceId) ?? null;
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
    details.push(`${asset.metadata.animationNames.length} animation${asset.metadata.animationNames.length === 1 ? "" : "s"}`);
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
    asset.metadata.durationSeconds === null ? "duration unavailable" : `${asset.metadata.durationSeconds.toFixed(2)}s`,
    asset.metadata.channelCount === null ? "channels unavailable" : `${asset.metadata.channelCount} channel${asset.metadata.channelCount === 1 ? "" : "s"}`,
    asset.metadata.sampleRateHz === null ? "sample rate unavailable" : `${asset.metadata.sampleRateHz} Hz`,
    formatByteLength(asset.byteLength)
  ];

  return details.join(" | ");
}

function createModelInstancePlacementPosition(asset: ModelAssetRecord, anchor: Vec3 | null): Vec3 {
  const boundingBox = asset.metadata.boundingBox;

  if (anchor !== null) {
    const floorOffset = boundingBox === null ? 0 : -boundingBox.min.y;

    return {
      x: anchor.x,
      y: anchor.y + floorOffset,
      z: anchor.z
    };
  }

  return {
    x: DEFAULT_MODEL_INSTANCE_POSITION.x,
    y: boundingBox === null ? DEFAULT_MODEL_INSTANCE_POSITION.y : Math.max(DEFAULT_MODEL_INSTANCE_POSITION.y, -boundingBox.min.y),
    z: DEFAULT_MODEL_INSTANCE_POSITION.z
  };
}

function getBrushLabel(brush: BoxBrush, index: number): string {
  return brush.name ?? `Box Brush ${index + 1}`;
}

function getBrushLabelById(brushId: string, brushes: BoxBrush[]): string {
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);
  return brushIndex === -1 ? "Box Brush" : getBrushLabel(brushes[brushIndex], brushIndex);
}

function getSelectedBrushLabel(selection: EditorSelection, brushes: BoxBrush[]): string {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return "No brush selected";
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
      return `${selection.ids.length} brush selected (${getSelectedBrushLabel(selection, brushes)})`;
    case "brushFace":
      return `1 face selected (${FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "entities":
      return `${selection.ids.length} entity selected (${getEntityDisplayLabelById(selection.ids[0], entities, assets)})`;
    case "modelInstances":
      return `${selection.ids.length} model instance${selection.ids.length === 1 ? "" : "s"} selected (${getModelInstanceDisplayLabelById(selection.ids[0], modelInstances, assets)})`;
    default:
      return "Unknown selection";
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

function getVisibilityModeSelectValue(visible: boolean | undefined): "toggle" | "show" | "hide" {
  if (visible === true) {
    return "show";
  }

  if (visible === false) {
    return "hide";
  }

  return "toggle";
}

function readVisibilityModeSelectValue(value: "toggle" | "show" | "hide"): boolean | undefined {
  switch (value) {
    case "toggle":
      return undefined;
    case "show":
      return true;
    case "hide":
      return false;
  }
}

function getDefaultTriggerVolumeLinkTrigger(triggerOnEnter: boolean, triggerOnExit: boolean): InteractionTriggerKind {
  if (triggerOnEnter) {
    return "enter";
  }

  if (triggerOnExit) {
    return "exit";
  }

  return "enter";
}

function isInteractionSourceEntity(entity: EntityInstance | null): entity is InteractionSourceEntity {
  return entity !== null && (entity.kind === "triggerVolume" || entity.kind === "interactable");
}

function isSoundEmitterEntity(entity: EntityInstance | null): entity is Extract<EntityInstance, { kind: "soundEmitter" }> {
  return entity !== null && entity.kind === "soundEmitter";
}

function getDefaultInteractionLinkTrigger(sourceEntity: InteractionSourceEntity): InteractionTriggerKind {
  return sourceEntity.kind === "triggerVolume"
    ? getDefaultTriggerVolumeLinkTrigger(sourceEntity.triggerOnEnter, sourceEntity.triggerOnExit)
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

function isCommitIncrementKey(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown" || key === "PageUp" || key === "PageDown";
}

function blurActiveTextEntry() {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLElement) || !isTextEntryTarget(activeElement)) {
    return;
  }

  activeElement.blur();
}

function sortDocumentMaterials(materials: Record<string, MaterialDef>): MaterialDef[] {
  return Object.values(materials).sort((left, right) => {
    const leftStarterIndex = STARTER_MATERIAL_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightStarterIndex = STARTER_MATERIAL_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER;

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

function rotateQuarterTurns(rotationQuarterTurns: FaceUvRotationQuarterTurns): FaceUvRotationQuarterTurns {
  return ((rotationQuarterTurns + 1) % 4) as FaceUvRotationQuarterTurns;
}

function formatRunnerFeetPosition(position: Vec3 | null): string {
  if (position === null) {
    return "n/a";
  }

  return `${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`;
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

export function App({ store, initialStatusMessage }: AppProps) {
  const editorState = useEditorStoreState(store);
  const brushList = Object.values(editorState.document.brushes);
  const entityList = getEntityInstances(editorState.document.entities);
  const entityDisplayList = getSortedEntityDisplayLabels(editorState.document.entities, editorState.document.assets);
  const primaryPlayerStart = getPrimaryPlayerStartEntity(editorState.document.entities);
  const materialList = sortDocumentMaterials(editorState.document.materials);
  const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);
  const selectedEntity = getSelectedEntity(editorState.selection, entityList);
  const selectedModelInstance = getSelectedModelInstance(editorState.selection, Object.values(editorState.document.modelInstances));
  const selectedFaceId = getSelectedBrushFaceId(editorState.selection);
  const selectedFace = selectedBrush !== null && selectedFaceId !== null ? selectedBrush.faces[selectedFaceId] : null;
  const selectedFaceMaterial =
    selectedFace !== null && selectedFace.materialId !== null ? editorState.document.materials[selectedFace.materialId] ?? null : null;
  const selectedModelAsset =
    selectedModelInstance !== null ? (editorState.document.assets[selectedModelInstance.assetId] ?? null) : null;
  const selectedModelAssetRecord = selectedModelAsset !== null && selectedModelAsset.kind === "model" ? selectedModelAsset : null;
  const selectedPlayerStart = selectedEntity?.kind === "playerStart" ? selectedEntity : null;
  const selectedSoundEmitter = isSoundEmitterEntity(selectedEntity) ? selectedEntity : null;
  const selectedSoundEmitterAsset =
    selectedSoundEmitter === null
      ? null
      : selectedSoundEmitter.audioAssetId === null
        ? null
        : editorState.document.assets[selectedSoundEmitter.audioAssetId] ?? null;
  const selectedSoundEmitterAudioAssetRecord =
    selectedSoundEmitterAsset !== null && selectedSoundEmitterAsset.kind === "audio" ? selectedSoundEmitterAsset : null;
  const selectedTriggerVolume = selectedEntity?.kind === "triggerVolume" ? selectedEntity : null;
  const selectedTeleportTarget = selectedEntity?.kind === "teleportTarget" ? selectedEntity : null;
  const selectedInteractable = selectedEntity?.kind === "interactable" ? selectedEntity : null;
  const projectAssetList = Object.values(editorState.document.assets);
  const modelAssetList = projectAssetList.filter(isModelAsset);
  const imageAssetList = projectAssetList.filter(isImageAsset);
  const audioAssetList = projectAssetList.filter(isAudioAsset);
  const selectedPointLight = selectedEntity?.kind === "pointLight" ? selectedEntity : null;
  const selectedSpotLight = selectedEntity?.kind === "spotLight" ? selectedEntity : null;
  const modelInstanceDisplayList = getSortedModelInstanceDisplayLabels(editorState.document.modelInstances, editorState.document.assets);
  const selectedInteractionSource = isInteractionSourceEntity(selectedEntity) ? selectedEntity : null;
  const selectedTriggerVolumeLinks =
    selectedTriggerVolume === null
      ? []
      : getInteractionLinksForSource(editorState.document.interactionLinks, selectedTriggerVolume.id);
  const selectedInteractableLinks =
    selectedInteractable === null ? [] : getInteractionLinksForSource(editorState.document.interactionLinks, selectedInteractable.id);
  const teleportTargetOptions = entityDisplayList.filter(({ entity }) => entity.kind === "teleportTarget");
  const soundEmitterOptions = entityDisplayList.filter(({ entity }) => entity.kind === "soundEmitter") as Array<{
    entity: Extract<EntityInstance, { kind: "soundEmitter" }>;
    label: string;
  }>;
  const playableSoundEmitterOptions = soundEmitterOptions.filter(({ entity }) => {
    if (entity.audioAssetId === null) {
      return false;
    }

    return editorState.document.assets[entity.audioAssetId]?.kind === "audio";
  });
  const visibilityBrushOptions = brushList.map((brush, brushIndex) => ({
    brush,
    label: getBrushLabel(brush, brushIndex)
  }));

  const [sceneNameDraft, setSceneNameDraft] = useState(editorState.document.name);
  const [brushNameDraft, setBrushNameDraft] = useState("");
  const [positionDraft, setPositionDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
  const [sizeDraft, setSizeDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
  const [uvOffsetDraft, setUvOffsetDraft] = useState(createVec2Draft(createDefaultFaceUvState().offset));
  const [uvScaleDraft, setUvScaleDraft] = useState(createVec2Draft(createDefaultFaceUvState().scale));
  const [entityPositionDraft, setEntityPositionDraft] = useState(createVec3Draft(DEFAULT_ENTITY_POSITION));
  const [pointLightColorDraft, setPointLightColorDraft] = useState(DEFAULT_POINT_LIGHT_COLOR_HEX);
  const [pointLightIntensityDraft, setPointLightIntensityDraft] = useState(String(DEFAULT_POINT_LIGHT_INTENSITY));
  const [pointLightDistanceDraft, setPointLightDistanceDraft] = useState(String(DEFAULT_POINT_LIGHT_DISTANCE));
  const [spotLightColorDraft, setSpotLightColorDraft] = useState(DEFAULT_SPOT_LIGHT_COLOR_HEX);
  const [spotLightIntensityDraft, setSpotLightIntensityDraft] = useState(String(DEFAULT_SPOT_LIGHT_INTENSITY));
  const [spotLightDistanceDraft, setSpotLightDistanceDraft] = useState(String(DEFAULT_SPOT_LIGHT_DISTANCE));
  const [spotLightAngleDraft, setSpotLightAngleDraft] = useState(String(DEFAULT_SPOT_LIGHT_ANGLE_DEGREES));
  const [spotLightDirectionDraft, setSpotLightDirectionDraft] = useState(createVec3Draft(DEFAULT_SPOT_LIGHT_DIRECTION));
  const [playerStartYawDraft, setPlayerStartYawDraft] = useState("0");
  const [soundEmitterAudioAssetIdDraft, setSoundEmitterAudioAssetIdDraft] = useState(DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID ?? "");
  const [soundEmitterVolumeDraft, setSoundEmitterVolumeDraft] = useState(String(DEFAULT_SOUND_EMITTER_VOLUME));
  const [soundEmitterRefDistanceDraft, setSoundEmitterRefDistanceDraft] = useState(String(DEFAULT_SOUND_EMITTER_REF_DISTANCE));
  const [soundEmitterMaxDistanceDraft, setSoundEmitterMaxDistanceDraft] = useState(String(DEFAULT_SOUND_EMITTER_MAX_DISTANCE));
  const [soundEmitterAutoplayDraft, setSoundEmitterAutoplayDraft] = useState(false);
  const [soundEmitterLoopDraft, setSoundEmitterLoopDraft] = useState(false);
  const [triggerVolumeSizeDraft, setTriggerVolumeSizeDraft] = useState(createVec3Draft(DEFAULT_TRIGGER_VOLUME_SIZE));
  const [teleportTargetYawDraft, setTeleportTargetYawDraft] = useState(String(DEFAULT_TELEPORT_TARGET_YAW_DEGREES));
  const [interactableRadiusDraft, setInteractableRadiusDraft] = useState(String(DEFAULT_INTERACTABLE_RADIUS));
  const [interactablePromptDraft, setInteractablePromptDraft] = useState(DEFAULT_INTERACTABLE_PROMPT);
  const [interactableEnabledDraft, setInteractableEnabledDraft] = useState(true);
  const [modelPositionDraft, setModelPositionDraft] = useState(createVec3Draft(DEFAULT_MODEL_INSTANCE_POSITION));
  const [modelRotationDraft, setModelRotationDraft] = useState(createVec3Draft(DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES));
  const [modelScaleDraft, setModelScaleDraft] = useState(createVec3Draft(DEFAULT_MODEL_INSTANCE_SCALE));
  const [ambientLightIntensityDraft, setAmbientLightIntensityDraft] = useState(String(editorState.document.world.ambientLight.intensity));
  const [sunLightIntensityDraft, setSunLightIntensityDraft] = useState(String(editorState.document.world.sunLight.intensity));
  const [sunDirectionDraft, setSunDirectionDraft] = useState(createVec3Draft(editorState.document.world.sunLight.direction));
  const [backgroundEnvironmentIntensityDraft, setBackgroundEnvironmentIntensityDraft] = useState(
    editorState.document.world.background.mode === "image" ? String(editorState.document.world.background.environmentIntensity) : "0.5"
  );
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Slice 3.4 spatial audio ready.");
  const [assetStatusMessage, setAssetStatusMessage] = useState<string | null>(null);
  const [preferredNavigationMode, setPreferredNavigationMode] = useState<RuntimeNavigationMode>(
    primaryPlayerStart === null ? "orbitVisitor" : "firstPerson"
  );
  const [activeNavigationMode, setActiveNavigationMode] = useState<RuntimeNavigationMode>(
    primaryPlayerStart === null ? "orbitVisitor" : "firstPerson"
  );
  const [projectAssetStorage, setProjectAssetStorage] = useState<ProjectAssetStorage | null>(null);
  const [projectAssetStorageReady, setProjectAssetStorageReady] = useState(false);
  const [runtimeScene, setRuntimeScene] = useState<RuntimeSceneDefinition | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [firstPersonTelemetry, setFirstPersonTelemetry] = useState<FirstPersonTelemetry | null>(null);
  const [runtimeInteractionPrompt, setRuntimeInteractionPrompt] = useState<RuntimeInteractionPrompt | null>(null);
  const [loadedModelAssets, setLoadedModelAssets] = useState<Record<string, LoadedModelAsset>>({});
  const [loadedImageAssets, setLoadedImageAssets] = useState<Record<string, LoadedImageAsset>>({});
  const [loadedAudioAssets, setLoadedAudioAssets] = useState<Record<string, LoadedAudioAsset>>({});
  const [focusRequest, setFocusRequest] = useState<{ id: number; selection: EditorSelection }>({
    id: 0,
    selection: {
      kind: "none"
    }
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importModelInputRef = useRef<HTMLInputElement | null>(null);
  const importBackgroundImageInputRef = useRef<HTMLInputElement | null>(null);
  const importAudioInputRef = useRef<HTMLInputElement | null>(null);
  const loadedModelAssetsRef = useRef<Record<string, LoadedModelAsset>>({});
  const loadedImageAssetsRef = useRef<Record<string, LoadedImageAsset>>({});
  const loadedAudioAssetsRef = useRef<Record<string, LoadedAudioAsset>>({});
  const documentValidation = validateSceneDocument(editorState.document);
  const runValidation = validateRuntimeSceneBuild(editorState.document, preferredNavigationMode);
  const diagnostics = [...documentValidation.errors, ...documentValidation.warnings, ...runValidation.errors, ...runValidation.warnings];
  const blockingDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const warningDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const documentStatusLabel =
    documentValidation.errors.length === 0 ? "Valid" : formatDiagnosticCount(documentValidation.errors.length, "error");
  const lastCommandLabel = editorState.lastCommandLabel ?? "No commands yet";
  const runReadyLabel =
    blockingDiagnostics.length > 0
      ? "Blocked"
      : preferredNavigationMode === "firstPerson"
        ? "Ready for First Person"
        : "Ready for Orbit Visitor";

  useEffect(() => {
    setSceneNameDraft(editorState.document.name);
  }, [editorState.document.name]);

  useEffect(() => {
    setBrushNameDraft(selectedBrush?.name ?? "");
  }, [selectedBrush]);

  useEffect(() => {
    if (selectedBrush === null) {
      setPositionDraft(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
      setSizeDraft(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
      return;
    }

    setPositionDraft(createVec3Draft(selectedBrush.center));
    setSizeDraft(createVec3Draft(selectedBrush.size));
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
      setSoundEmitterAudioAssetIdDraft(DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID ?? "");
      setSoundEmitterVolumeDraft(String(DEFAULT_SOUND_EMITTER_VOLUME));
      setSoundEmitterRefDistanceDraft(String(DEFAULT_SOUND_EMITTER_REF_DISTANCE));
      setSoundEmitterMaxDistanceDraft(String(DEFAULT_SOUND_EMITTER_MAX_DISTANCE));
      setSoundEmitterAutoplayDraft(false);
      setSoundEmitterLoopDraft(false);
      setTriggerVolumeSizeDraft(createVec3Draft(DEFAULT_TRIGGER_VOLUME_SIZE));
      setTeleportTargetYawDraft(String(DEFAULT_TELEPORT_TARGET_YAW_DEGREES));
      setInteractableRadiusDraft(String(DEFAULT_INTERACTABLE_RADIUS));
      setInteractablePromptDraft(DEFAULT_INTERACTABLE_PROMPT);
      setInteractableEnabledDraft(true);
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
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedModelInstance === null) {
      setModelPositionDraft(createVec3Draft(DEFAULT_MODEL_INSTANCE_POSITION));
      setModelRotationDraft(createVec3Draft(DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES));
      setModelScaleDraft(createVec3Draft(DEFAULT_MODEL_INSTANCE_SCALE));
      return;
    }

    setModelPositionDraft(createVec3Draft(selectedModelInstance.position));
    setModelRotationDraft(createVec3Draft(selectedModelInstance.rotationDegrees));
    setModelScaleDraft(createVec3Draft(selectedModelInstance.scale));
  }, [selectedModelInstance]);

  useEffect(() => {
    setAmbientLightIntensityDraft(String(editorState.document.world.ambientLight.intensity));
  }, [editorState.document.world.ambientLight.intensity]);

  useEffect(() => {
    if (editorState.document.world.background.mode === "image") {
      setBackgroundEnvironmentIntensityDraft(String(editorState.document.world.background.environmentIntensity));
    }
  }, [editorState.document.world.background]);

  useEffect(() => {
    setSunLightIntensityDraft(String(editorState.document.world.sunLight.intensity));
  }, [editorState.document.world.sunLight.intensity]);

  useEffect(() => {
    setSunDirectionDraft(createVec3Draft(editorState.document.world.sunLight.direction));
  }, [editorState.document.world.sunLight.direction]);

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
    if (!projectAssetStorageReady) {
      return;
    }

    let cancelled = false;
    const currentAssets = editorState.document.assets;
    const previousLoadedModelAssets = loadedModelAssetsRef.current;
    const previousLoadedImageAssets = loadedImageAssetsRef.current;
    const previousLoadedAudioAssets = loadedAudioAssetsRef.current;
    const previousLoadedModelAssetIds = new Set(Object.keys(previousLoadedModelAssets));
    const previousLoadedImageAssetIds = new Set(Object.keys(previousLoadedImageAssets));
    const previousLoadedAudioAssetIds = new Set(Object.keys(previousLoadedAudioAssets));
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

          if (cachedLoadedAsset !== undefined && cachedLoadedAsset.storageKey === asset.storageKey) {
            nextLoadedModelAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedModelAssets[asset.id] = await loadModelAssetFromStorage(projectAssetStorage, asset);
          } catch (error) {
            syncErrorMessages.push(`Model asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`);
          }

          continue;
        }

        if (isImageAsset(asset)) {
          previousLoadedImageAssetIds.delete(asset.id);

          const cachedLoadedAsset = previousLoadedImageAssets[asset.id];

          if (cachedLoadedAsset !== undefined && cachedLoadedAsset.storageKey === asset.storageKey) {
            nextLoadedImageAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedImageAssets[asset.id] = await loadImageAssetFromStorage(projectAssetStorage, asset);
          } catch (error) {
            syncErrorMessages.push(`Image asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`);
          }
          continue;
        }

        if (isAudioAsset(asset)) {
          previousLoadedAudioAssetIds.delete(asset.id);

          const cachedLoadedAsset = previousLoadedAudioAssets[asset.id];

          if (cachedLoadedAsset !== undefined && cachedLoadedAsset.storageKey === asset.storageKey) {
            nextLoadedAudioAssets[asset.id] = cachedLoadedAsset;
            continue;
          }

          try {
            nextLoadedAudioAssets[asset.id] = await loadAudioAssetFromStorage(projectAssetStorage, asset);
          } catch (error) {
            syncErrorMessages.push(`Audio asset ${asset.sourceName} could not be restored: ${getErrorMessage(error)}`);
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
      setAssetStatusMessage(syncErrorMessages.length === 0 ? null : syncErrorMessages.join(" | "));
    };

    void syncAssets();

    return () => {
      cancelled = true;
    };
  }, [editorState.document.assets, projectAssetStorage, projectAssetStorageReady]);

  useEffect(() => {
    if (editorState.toolMode === "play") {
      return;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (
        event.code !== "NumpadComma" &&
        !(event.key === "," && event.location === globalThis.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD)
      ) {
        return;
      }

      event.preventDefault();

      if (editorState.selection.kind === "none" && brushList.length === 0 && entityList.length === 0) {
        setStatusMessage("Nothing authored yet to frame in the viewport.");
        return;
      }

      setFocusRequest((current) => ({
        id: current.id + 1,
        selection: editorState.selection
      }));
      setStatusMessage(editorState.selection.kind === "none" ? "Framed the authored scene in the viewport." : "Framed the current selection.");
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [editorState.selection, editorState.toolMode, brushList.length, entityList.length]);

  const applySceneName = () => {
    const normalizedName = sceneNameDraft.trim() || "Untitled Scene";

    if (normalizedName === editorState.document.name) {
      return;
    }

    store.executeCommand(createSetSceneNameCommand(normalizedName));
    setStatusMessage(`Scene renamed to ${normalizedName}.`);
  };

  const requestViewportFocus = (selection: EditorSelection, status?: string) => {
    setFocusRequest((current) => ({
      id: current.id + 1,
      selection
    }));

    if (status !== undefined) {
      setStatusMessage(status);
    }
  };

  const handleCreateBoxBrush = (center?: Vec3) => {
    try {
      store.executeCommand(createCreateBoxBrushCommand(center === undefined ? {} : { center }));
      setStatusMessage(
        center === undefined
          ? `Created a box brush snapped to the ${DEFAULT_GRID_SIZE}m grid.`
          : `Created a box brush at snapped center ${formatVec3(center)}.`
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySelection = (
    selection: EditorSelection,
    source: "outliner" | "viewport" | "inspector" | "runner",
    options: { focusViewport?: boolean } = {}
  ) => {
    blurActiveTextEntry();
    store.setSelection(selection);

    const suffix = source === "outliner" && options.focusViewport ? " and framed it in the viewport" : "";

    switch (selection.kind) {
      case "none":
        setStatusMessage(`${source === "viewport" ? "Viewport" : "Editor"} selection cleared${suffix}.`);
        break;
      case "brushes":
        setStatusMessage(`Selected ${getBrushLabelById(selection.ids[0], brushList)} from the ${source}${suffix}.`);
        break;
      case "brushFace":
        setStatusMessage(
          `Selected ${FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`
        );
        break;
      case "entities":
        setStatusMessage(`Selected ${getEntityDisplayLabelById(selection.ids[0], editorState.document.entities, editorState.document.assets)} from the ${source}${suffix}.`);
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
    if (selectedBrush === null) {
      setStatusMessage("Select a box brush before moving it.");
      return;
    }

    try {
      const snappedCenter = snapVec3ToGrid(readVec3Draft(positionDraft, "Box brush position"), DEFAULT_GRID_SIZE);

      if (areVec3Equal(snappedCenter, selectedBrush.center)) {
        return;
      }

      store.executeCommand(
        createMoveBoxBrushCommand({
          brushId: selectedBrush.id,
          center: snappedCenter
        })
      );
      setStatusMessage("Moved selected box brush.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySizeChange = () => {
    if (selectedBrush === null) {
      setStatusMessage("Select a box brush before resizing it.");
      return;
    }

    try {
      const snappedSize = snapPositiveSizeToGrid(readVec3Draft(sizeDraft, "Box brush size"), DEFAULT_GRID_SIZE);

      if (areVec3Equal(snappedSize, selectedBrush.size)) {
        return;
      }

      store.executeCommand(
        createResizeBoxBrushCommand({
          brushId: selectedBrush.id,
          size: snappedSize
        })
      );
      setStatusMessage("Resized selected box brush.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const commitEntityChange = (currentEntity: EntityInstance, nextEntity: EntityInstance, successMessage: string) => {
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

  const resolveNewEntityPosition = (kind: EntityKind): Vec3 => {
    if (selectedBrush !== null) {
      if (kind === "triggerVolume") {
        return snapVec3ToGrid(selectedBrush.center, DEFAULT_GRID_SIZE);
      }

      return snapVec3ToGrid(
        {
          x: selectedBrush.center.x,
          y: selectedBrush.center.y + selectedBrush.size.y * 0.5,
          z: selectedBrush.center.z
        },
        DEFAULT_GRID_SIZE
      );
    }

    if (selectedEntity !== null) {
      return snapVec3ToGrid(selectedEntity.position, DEFAULT_GRID_SIZE);
    }

    return snapVec3ToGrid(DEFAULT_ENTITY_POSITION, DEFAULT_GRID_SIZE);
  };

  const handlePlaceEntity = (kind: EntityKind) => {
    try {
      const basePosition = resolveNewEntityPosition(kind);
      let nextEntity: EntityInstance;

      switch (kind) {
        case "pointLight":
          nextEntity = createPointLightEntity({
            position: basePosition
          });
          break;
        case "spotLight":
          nextEntity = createSpotLightEntity({
            position: basePosition
          });
          break;
        case "playerStart":
          nextEntity = createPlayerStartEntity({
            position: basePosition
          });
          break;
        case "soundEmitter":
          nextEntity = createSoundEmitterEntity({
            position: basePosition,
            audioAssetId: audioAssetList[0]?.id ?? undefined
          });
          break;
        case "triggerVolume":
          nextEntity =
            selectedBrush === null
              ? createTriggerVolumeEntity({
                  position: basePosition
                })
              : createTriggerVolumeEntity({
                  position: basePosition,
                  size: selectedBrush.size
                });
          break;
        case "teleportTarget":
          nextEntity = createTeleportTargetEntity({
            position: basePosition
          });
          break;
        case "interactable":
          nextEntity = createInteractableEntity({
            position: basePosition
          });
          break;
      }

      store.executeCommand(
        createUpsertEntityCommand({
          entity: nextEntity,
          label: `Place ${getEntityKindLabel(kind).toLowerCase()}`
        })
      );
      setStatusMessage(`Placed ${getEntityKindLabel(kind)}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const commitModelInstanceChange = (currentModelInstance: ModelInstance, nextModelInstance: ModelInstance, successMessage: string) => {
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

  const handlePlaceModelInstance = (assetId: string) => {
    const asset = editorState.document.assets[assetId];

    if (asset === undefined || asset.kind !== "model") {
      setStatusMessage("Select a model asset before placing a model instance.");
      return;
    }

    try {
      const anchorPosition =
        selectedBrush !== null
          ? {
              x: selectedBrush.center.x,
              y: selectedBrush.center.y + selectedBrush.size.y * 0.5,
              z: selectedBrush.center.z
            }
          : selectedModelInstance?.position ?? null;
      const nextModelInstance = createModelInstance({
        assetId: asset.id,
        position: createModelInstancePlacementPosition(asset, anchorPosition),
        rotationDegrees: DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
        scale: DEFAULT_MODEL_INSTANCE_SCALE
      });

      store.executeCommand(
        createUpsertModelInstanceCommand({
          modelInstance: nextModelInstance,
          label: `Place ${asset.sourceName}`
        })
      );
      setStatusMessage(`Placed ${asset.sourceName}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
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
        position: readVec3Draft(modelPositionDraft, "Model instance position"),
        rotationDegrees: readVec3Draft(modelRotationDraft, "Model instance rotation"),
        scale: readPositiveVec3Draft(modelScaleDraft, "Model instance scale")
      });

      commitModelInstanceChange(selectedModelInstance, nextModelInstance, "Updated model instance.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applyPlayerStartChange = () => {
    if (selectedPlayerStart === null) {
      setStatusMessage("Select a Player Start before editing it.");
      return;
    }

    try {
      const snappedPosition = snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Player Start position"), DEFAULT_GRID_SIZE);
      const yawDegrees = readYawDegreesDraft(playerStartYawDraft);
      const nextEntity = createPlayerStartEntity({
        id: selectedPlayerStart.id,
        position: snappedPosition,
        yawDegrees
      });

      commitEntityChange(selectedPlayerStart, nextEntity, "Updated Player Start.");
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
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Point Light position"), DEFAULT_GRID_SIZE),
        colorHex: overrides.colorHex ?? pointLightColorDraft,
        intensity: readNonNegativeNumberDraft(pointLightIntensityDraft, "Point Light intensity"),
        distance: readPositiveNumberDraft(pointLightDistanceDraft, "Point Light distance")
      });

      commitEntityChange(selectedPointLight, nextEntity, "Updated Point Light.");
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
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Spot Light position"), DEFAULT_GRID_SIZE),
        direction: readVec3Draft(spotLightDirectionDraft, "Spot Light direction"),
        colorHex: overrides.colorHex ?? spotLightColorDraft,
        intensity: readNonNegativeNumberDraft(spotLightIntensityDraft, "Spot Light intensity"),
        distance: readPositiveNumberDraft(spotLightDistanceDraft, "Spot Light distance"),
        angleDegrees: readPositiveNumberDraft(spotLightAngleDraft, "Spot Light angle")
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
    }
  };

  const applySoundEmitterChange = (
    overrides: { audioAssetId?: string | null; autoplay?: boolean; loop?: boolean } = {}
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
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Sound Emitter position"), DEFAULT_GRID_SIZE),
        audioAssetId: nextAudioAssetId,
        volume: readNonNegativeNumberDraft(soundEmitterVolumeDraft, "Sound Emitter volume"),
        refDistance: readPositiveNumberDraft(soundEmitterRefDistanceDraft, "Sound Emitter ref distance"),
        maxDistance: readPositiveNumberDraft(soundEmitterMaxDistanceDraft, "Sound Emitter max distance"),
        autoplay: overrides.autoplay ?? soundEmitterAutoplayDraft,
        loop: overrides.loop ?? soundEmitterLoopDraft
      });

      commitEntityChange(selectedSoundEmitter, nextEntity, "Updated Sound Emitter.");
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
      const links = getInteractionLinksForSource(editorState.document.interactionLinks, selectedTriggerVolume.id);
      const triggerOnEnter = links.some((l) => l.trigger === "enter");
      const triggerOnExit = links.some((l) => l.trigger === "exit");

      const nextEntity = createTriggerVolumeEntity({
        id: selectedTriggerVolume.id,
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Trigger Volume position"), DEFAULT_GRID_SIZE),
        size: snapPositiveSizeToGrid(readVec3Draft(triggerVolumeSizeDraft, "Trigger Volume size"), DEFAULT_GRID_SIZE),
        triggerOnEnter,
        triggerOnExit
      });

      commitEntityChange(selectedTriggerVolume, nextEntity, "Updated Trigger Volume.");
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
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Teleport Target position"), DEFAULT_GRID_SIZE),
        yawDegrees: readYawDegreesDraft(teleportTargetYawDraft)
      });

      commitEntityChange(selectedTeleportTarget, nextEntity, "Updated Teleport Target.");
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
        position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Interactable position"), DEFAULT_GRID_SIZE),
        radius: readPositiveNumberDraft(interactableRadiusDraft, "Interactable radius"),
        prompt: readInteractablePromptDraft(interactablePromptDraft),
        enabled: overrides.enabled ?? interactableEnabledDraft
      });

      commitEntityChange(selectedInteractable, nextEntity, "Updated Interactable.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const commitInteractionLinkChange = (currentLink: InteractionLink, nextLink: InteractionLink, successMessage: string, label = "Update interaction link") => {
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

  const getInteractionSourceEntityForLink = (link: InteractionLink): InteractionSourceEntity | null => {
    const sourceEntity = editorState.document.entities[link.sourceEntityId];
    return sourceEntity?.kind === "triggerVolume" || sourceEntity?.kind === "interactable" ? sourceEntity : null;
  };

  const handleAddTeleportInteractionLink = () => {
    if (selectedInteractionSource === null) {
      setStatusMessage("Select a Trigger Volume or Interactable before adding links.");
      return;
    }

    const defaultTarget = teleportTargetOptions[0]?.entity;

    if (defaultTarget === undefined || defaultTarget.kind !== "teleportTarget") {
      setStatusMessage("Author a Teleport Target before adding a teleport link.");
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
    setStatusMessage(`Added a teleport link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`);
  };

  const handleAddVisibilityInteractionLink = () => {
    if (selectedInteractionSource === null) {
      setStatusMessage("Select a Trigger Volume or Interactable before adding links.");
      return;
    }

    const defaultTarget = visibilityBrushOptions[0]?.brush;

    if (defaultTarget === undefined) {
      setStatusMessage("Author at least one brush before adding a visibility link.");
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
    setStatusMessage(`Added a visibility link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`);
  };

  const handleAddSoundInteractionLink = (actionType: "playSound" | "stopSound") => {
    if (selectedInteractionSource === null) {
      setStatusMessage("Select a Trigger Volume or Interactable before adding links.");
      return;
    }

    const defaultTarget = playableSoundEmitterOptions[0]?.entity;

    if (defaultTarget === undefined) {
      setStatusMessage("Author a Sound Emitter with an audio asset before adding sound links.");
      return;
    }

    const link =
      actionType === "playSound"
        ? createPlaySoundInteractionLink({
            sourceEntityId: selectedInteractionSource.id,
            trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
            targetSoundEmitterId: defaultTarget.id
          })
        : createStopSoundInteractionLink({
            sourceEntityId: selectedInteractionSource.id,
            trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
            targetSoundEmitterId: defaultTarget.id
          });

    store.executeCommand(
      createUpsertInteractionLinkCommand({
        link,
        label: actionType === "playSound" ? "Add play sound link" : "Add stop sound link"
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

  const updateInteractionLinkTrigger = (link: InteractionLink, trigger: InteractionTriggerKind) => {
    const sourceEntity = getInteractionSourceEntityForLink(link);

    if (sourceEntity?.kind === "interactable" && trigger !== "click") {
      setStatusMessage("Interactable links always use the click trigger.");
      return;
    }

    if (sourceEntity?.kind === "triggerVolume" && trigger === "click") {
      setStatusMessage("Trigger Volume links may only use enter or exit triggers.");
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

    commitInteractionLinkChange(link, nextLink, `Updated ${getInteractionTriggerLabel(trigger).toLowerCase()} trigger link.`);
  };

  const updateInteractionLinkActionType = (link: InteractionLink, actionType: InteractionLink["action"]["type"]) => {
    const sourceEntity = getInteractionSourceEntityForLink(link);

    if (sourceEntity === null || link.action.type === actionType) {
      return;
    }

    if (actionType === "teleportPlayer") {
      const defaultTarget = teleportTargetOptions[0]?.entity;

      if (defaultTarget === undefined || defaultTarget.kind !== "teleportTarget") {
        setStatusMessage("Author a Teleport Target before switching this link to teleport.");
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
        (link.action.type === "playAnimation" || link.action.type === "stopAnimation"
          ? editorState.document.modelInstances[link.action.targetModelInstanceId]
          : undefined) ?? modelInstanceDisplayList[0]?.modelInstance;

      if (targetModelInstance === undefined) {
        setStatusMessage("Place a model instance before switching this link to play animation.");
        return;
      }

      const asset = editorState.document.assets[targetModelInstance.assetId];
      const firstClip = asset?.kind === "model" ? (asset.metadata.animationNames[0] ?? "") : "";

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
        (link.action.type === "playAnimation" || link.action.type === "stopAnimation"
          ? editorState.document.modelInstances[link.action.targetModelInstanceId]
          : undefined) ?? modelInstanceDisplayList[0]?.modelInstance;

      if (targetModelInstance === undefined) {
        setStatusMessage("Place a model instance before switching this link to stop animation.");
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

      if (targetSoundEmitter === undefined || targetSoundEmitter.kind !== "soundEmitter") {
        setStatusMessage("Author a Sound Emitter with an audio asset before switching this link to sound playback.");
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
      setStatusMessage("Author at least one brush before switching this link to visibility.");
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

  const updateTeleportInteractionLinkTarget = (link: InteractionLink, targetEntityId: string) => {
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

  const updateVisibilityInteractionLinkTarget = (link: InteractionLink, targetBrushId: string) => {
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

  const updateVisibilityInteractionMode = (link: InteractionLink, mode: "toggle" | "show" | "hide") => {
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

  const updateSoundInteractionLinkTarget = (link: InteractionLink, targetSoundEmitterId: string) => {
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

  const updateAnimationInteractionLinkTarget = (link: InteractionLink, targetModelInstanceId: string) => {
    if (link.action.type !== "playAnimation" && link.action.type !== "stopAnimation") {
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

  const updatePlayAnimationLinkClip = (link: InteractionLink, clipName: string) => {
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

  const updatePlayAnimationLinkLoop = (link: InteractionLink, loop: boolean) => {
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

  const handleAddPlayAnimationLink = (sourceEntity: InteractionSourceEntity) => {
    const firstInstance = modelInstanceDisplayList[0];

    if (firstInstance === undefined) {
      setStatusMessage("Place a model instance before adding an animation link.");
      return;
    }

    const asset = editorState.document.assets[firstInstance.modelInstance.assetId];
    const firstClip = asset?.kind === "model" ? (asset.metadata.animationNames[0] ?? "") : "";

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

  const handleAddStopAnimationLink = (sourceEntity: InteractionSourceEntity) => {
    const firstInstance = modelInstanceDisplayList[0];

    if (firstInstance === undefined) {
      setStatusMessage("Place a model instance before adding an animation link.");
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
          {sourceEntity.kind === "triggerVolume" ? "No trigger links authored yet." : "No click links authored yet."}
        </div>
      ) : (
        <div className="outliner-list">
          {links.map((link, index) => (
            <div key={link.id} className="outliner-item">
              <div className="outliner-item__select">
                <span className="outliner-item__title">{`Link ${index + 1}`}</span>
                <span className="outliner-item__meta">{getInteractionActionLabel(link)}</span>
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
                        onChange={(event) => updateInteractionLinkTrigger(link, event.currentTarget.value as InteractionTriggerKind)}
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
                      onChange={(event) => updateInteractionLinkActionType(link, event.currentTarget.value as InteractionLink["action"]["type"])}
                    >
                      <option value="teleportPlayer">Teleport Player</option>
                      <option value="toggleVisibility">Toggle Visibility</option>
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
                      onChange={(event) => updateTeleportInteractionLinkTarget(link, event.currentTarget.value)}
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
                      <span className="label">Brush</span>
                      <select
                        data-testid={`interaction-link-visibility-target-${link.id}`}
                        className="text-input"
                        value={link.action.targetBrushId}
                        onChange={(event) => updateVisibilityInteractionLinkTarget(link, event.currentTarget.value)}
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
                        value={getVisibilityModeSelectValue(link.action.visible)}
                        onChange={(event) =>
                          updateVisibilityInteractionMode(link, event.currentTarget.value as ReturnType<typeof getVisibilityModeSelectValue>)
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
                        onChange={(event) => updateAnimationInteractionLinkTarget(link, event.currentTarget.value)}
                      >
                        {modelInstanceDisplayList.map(({ modelInstance, label }) => (
                          <option key={modelInstance.id} value={modelInstance.id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="label">Clip</span>
                      <select
                        data-testid={`interaction-link-play-anim-clip-${link.id}`}
                        className="text-input"
                        value={link.action.clipName}
                        onChange={(event) => updatePlayAnimationLinkClip(link, event.currentTarget.value)}
                      >
                        {(editorState.document.assets[
                          editorState.document.modelInstances[link.action.targetModelInstanceId]?.assetId ?? ""
                        ] as { kind: "model"; metadata: { animationNames: string[] } } | undefined)?.metadata.animationNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        )) ?? <option value={link.action.clipName}>{link.action.clipName}</option>}
                      </select>
                    </label>
                  </div>
                  <label className="form-field">
                    <input
                      type="checkbox"
                      data-testid={`interaction-link-play-anim-loop-${link.id}`}
                      checked={link.action.loop !== false}
                      onChange={(event) => updatePlayAnimationLinkLoop(link, event.currentTarget.checked)}
                    />
                    <span className="label">Loop</span>
                  </label>
                </div>
              ) : link.action.type === "playSound" || link.action.type === "stopSound" ? (
                <div className="form-section">
                  <label className="form-field">
                    <span className="label">Emitter</span>
                    <select
                      data-testid={`interaction-link-sound-target-${link.id}`}
                      className="text-input"
                      value={link.action.targetSoundEmitterId}
                      onChange={(event) => updateSoundInteractionLinkTarget(link, event.currentTarget.value)}
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
                      onChange={(event) => updateAnimationInteractionLinkTarget(link, event.currentTarget.value)}
                    >
                      {modelInstanceDisplayList.map(({ modelInstance, label }) => (
                        <option key={modelInstance.id} value={modelInstance.id}>
                          {label}
                        </option>
                      ))}
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

  const applyWorldSettings = (nextWorld: WorldSettings, label: string, successMessage: string) => {
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

  const applyWorldBackgroundMode = (mode: WorldBackgroundMode, imageAssetId?: string) => {
    if (mode === "image") {
      const currentBackgroundAssetId =
        editorState.document.world.background.mode === "image" ? editorState.document.world.background.assetId : null;
      const nextImageAssetId =
        imageAssetId ??
        (currentBackgroundAssetId !== null && editorState.document.assets[currentBackgroundAssetId]?.kind === "image"
          ? currentBackgroundAssetId
          : imageAssetList[0]?.id);

      if (nextImageAssetId === undefined) {
        setStatusMessage("Import an image asset before using an image background.");
        return;
      }

      applyWorldSettings(
        {
          ...editorState.document.world,
          background: changeWorldBackgroundMode(editorState.document.world.background, "image", nextImageAssetId)
        },
        "Set world background image",
        `World background set to ${editorState.document.assets[nextImageAssetId]?.sourceName ?? nextImageAssetId}.`
      );
      return;
    }

    applyWorldSettings(
      {
        ...editorState.document.world,
        background: changeWorldBackgroundMode(editorState.document.world.background, mode)
      },
      "Set world background mode",
      mode === "solid" ? "World background set to a solid color." : "World background set to a vertical gradient."
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

  const applyWorldGradientColor = (edge: "top" | "bottom", colorHex: string) => {
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
      edge === "top" ? "Set world gradient top color" : "Set world gradient bottom color",
      edge === "top" ? "Updated the world gradient top color." : "Updated the world gradient bottom color."
    );
  };

  const applyBackgroundEnvironmentIntensity = () => {
    if (editorState.document.world.background.mode !== "image") {
      return;
    }

    const intensity = readNonNegativeNumberDraft(backgroundEnvironmentIntensityDraft, "Environment intensity");
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
            intensity: readNonNegativeNumberDraft(ambientLightIntensityDraft, "Ambient light intensity")
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
            intensity: readNonNegativeNumberDraft(sunLightIntensityDraft, "Sun intensity")
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

  const applyBrushNameChange = () => {
    if (selectedBrush === null) {
      setStatusMessage("Select a box brush before renaming it.");
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
      setStatusMessage(nextName === undefined ? "Cleared the authored brush name." : `Renamed brush to ${nextName}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleDraftVectorKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, applyChange: () => void) => {
    if (event.key === "Enter") {
      applyChange();
    }
  };

  const scheduleDraftCommit = (applyChange: () => void) => {
    window.setTimeout(() => {
      applyChange();
    }, 0);
  };

  const handleNumberInputPointerUp = (_event: ReactPointerEvent<HTMLInputElement>, applyChange: () => void) => {
    scheduleDraftCommit(applyChange);
  };

  const handleNumberInputKeyUp = (event: ReactKeyboardEvent<HTMLInputElement>, applyChange: () => void) => {
    if (!isCommitIncrementKey(event.key)) {
      return;
    }

    scheduleDraftCommit(applyChange);
  };

  const handleSaveDraft = () => {
    const result = store.saveDraft();
    setStatusMessage(result.message);
  };

  const handleLoadDraft = () => {
    const result = store.loadDraft();
    setStatusMessage(result.message);
  };

  const handleExportJson = () => {
    try {
      const exportedJson = store.exportDocumentJson();
      const blob = new Blob([exportedJson], { type: "application/json" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = `${editorState.document.name.replace(/\s+/g, "-").toLowerCase() || "scene"}.json`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      setStatusMessage("Scene document exported as JSON.");
    } catch (error) {
      const message = getErrorMessage(error);
      setStatusMessage(message);
    }
  };

  const handleImportJsonButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportJsonChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    try {
      const source = await file.text();
      store.importDocumentJson(source);
      setStatusMessage(`Imported ${file.name}.`);
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

  const handleImportModelChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage("Imported model assets require project asset storage. IndexedDB is unavailable in this browser.");
      input.value = "";
      return;
    }

    let importedModelForCleanup: ImportedModelAssetResult | null = null;

    try {
      const importedModel = files.length === 1
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
      setStatusMessage(`Imported ${importedModel.asset.sourceName} and placed a model instance.`);
    } catch (error) {
      if (importedModelForCleanup !== null) {
        await projectAssetStorage.deleteAsset(importedModelForCleanup.asset.storageKey).catch(() => undefined);
        disposeModelTemplate(importedModelForCleanup.loadedAsset.template);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const handleImportBackgroundImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage("Imported background images require project asset storage. IndexedDB is unavailable in this browser.");
      input.value = "";
      return;
    }

    let importedImageForCleanup: ImportedImageAssetResult | null = null;

    try {
      const importedImage = await importBackgroundImageAssetFromFile(file, projectAssetStorage);
      importedImageForCleanup = importedImage;

      store.executeCommand(
        createImportBackgroundImageAssetCommand({
          asset: importedImage.asset,
          world: {
            ...editorState.document.world,
            background: changeWorldBackgroundMode(editorState.document.world.background, "image", importedImage.asset.id)
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
      setStatusMessage(`Imported ${importedImage.asset.sourceName} and set it as the world background.`);
    } catch (error) {
      if (importedImageForCleanup !== null) {
        await projectAssetStorage.deleteAsset(importedImageForCleanup.asset.storageKey).catch(() => undefined);
        disposeLoadedImageAsset(importedImageForCleanup.loadedAsset);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const handleImportAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file === undefined) {
      return;
    }

    if (projectAssetStorage === null) {
      setAssetStatusMessage("Imported audio assets require project asset storage. IndexedDB is unavailable in this browser.");
      input.value = "";
      return;
    }

    let importedAudioForCleanup: { asset: AudioAssetRecord; loadedAsset: LoadedAudioAsset } | null = null;

    try {
      const importedAudio = await importAudioAssetFromFile(file, projectAssetStorage);
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
      setStatusMessage(`Imported ${importedAudio.asset.sourceName} and registered it as an audio asset.`);
    } catch (error) {
      if (importedAudioForCleanup !== null) {
        await projectAssetStorage.deleteAsset(importedAudioForCleanup.asset.storageKey).catch(() => undefined);
      }

      const message = getErrorMessage(error);
      setStatusMessage(message);
      setAssetStatusMessage(message);
    } finally {
      input.value = "";
    }
  };

  const applyFaceMaterial = (materialId: string) => {
    if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
      setStatusMessage("Select a single box face before applying a material.");
      return;
    }

    if (selectedFace.materialId === materialId) {
      setStatusMessage(`${FACE_LABELS[selectedFaceId]} already uses that material.`);
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
      setStatusMessage(`Applied ${editorState.document.materials[materialId]?.name ?? materialId} to ${FACE_LABELS[selectedFaceId]}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const clearFaceMaterial = () => {
    if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
      setStatusMessage("Select a single box face before clearing its material.");
      return;
    }

    if (selectedFace.materialId === null) {
      setStatusMessage(`${FACE_LABELS[selectedFaceId]} already uses the fallback face material.`);
      return;
    }

    store.executeCommand(
      createSetBoxBrushFaceMaterialCommand({
        brushId: selectedBrush.id,
        faceId: selectedFaceId,
        materialId: null
      })
    );
    setStatusMessage(`Cleared the authored material on ${FACE_LABELS[selectedFaceId]}.`);
  };

  const applyFaceUvState = (uvState: FaceUvState, label: string, successMessage: string) => {
    if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
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
        rotationQuarterTurns: rotateQuarterTurns(selectedFace.uv.rotationQuarterTurns)
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
      setStatusMessage(`Run mode blocked: ${formatSceneDiagnosticSummary(blockingDiagnostics)}`);
      return;
    }

    try {
      const nextRuntimeScene = buildRuntimeSceneFromDocument(editorState.document, {
        navigationMode: preferredNavigationMode
      });
      const nextNavigationMode = preferredNavigationMode;

      setRuntimeScene(nextRuntimeScene);
      setRuntimeMessage(
        nextRuntimeScene.spawn.source === "playerStart"
          ? "Running from the authored Player Start."
          : "No Player Start is authored yet. Orbit Visitor opened first, with a fallback FPS spawn still available."
      );
      setFirstPersonTelemetry(null);
      setRuntimeInteractionPrompt(null);
      setActiveNavigationMode(nextNavigationMode);
      store.enterPlayMode();
      setStatusMessage(
        nextNavigationMode === "firstPerson"
          ? "Entered run mode with first-person navigation."
          : "Entered run mode with Orbit Visitor."
      );
    } catch (error) {
      setStatusMessage(`Run mode could not start: ${getErrorMessage(error)}`);
    }
  };

  const handleExitPlayMode = () => {
    setRuntimeScene(null);
    setRuntimeMessage(null);
    setFirstPersonTelemetry(null);
    setRuntimeInteractionPrompt(null);
    store.exitPlayMode();
    setStatusMessage("Returned to editor mode.");
  };

  const handleSetPreferredNavigationMode = (navigationMode: RuntimeNavigationMode) => {
    setPreferredNavigationMode(navigationMode);

    if (navigationMode === "firstPerson" && primaryPlayerStart === null) {
      setStatusMessage("First Person selected. Author a Player Start before running, or switch back to Orbit Visitor.");
    }

    if (editorState.toolMode === "play") {
      setActiveNavigationMode(navigationMode);
      setStatusMessage(navigationMode === "firstPerson" ? "Runner switched to first-person navigation." : "Runner switched to Orbit Visitor.");
    }
  };

  if (editorState.toolMode === "play" && runtimeScene !== null) {
    return (
      <div className="app-shell app-shell--play">
        <header className="toolbar">
            <div className="toolbar__brand">
              <div className="toolbar__title">WebEditor3D</div>
              <div className="toolbar__subtitle">Slice 3.1 GLB/GLTF import and model placement</div>
            </div>

          <div className="toolbar__actions">
            <div className="toolbar__group">
              <button
                className={`toolbar__button ${activeNavigationMode === "firstPerson" ? "toolbar__button--active" : ""}`}
                type="button"
                data-testid="runner-mode-first-person"
                onClick={() => handleSetPreferredNavigationMode("firstPerson")}
              >
                First Person
              </button>
              <button
                className={`toolbar__button ${activeNavigationMode === "orbitVisitor" ? "toolbar__button--active" : ""}`}
                type="button"
                data-testid="runner-mode-orbit-visitor"
                onClick={() => handleSetPreferredNavigationMode("orbitVisitor")}
              >
                Orbit Visitor
              </button>
            </div>

            <div className="toolbar__group">
              <button className="toolbar__button toolbar__button--accent" type="button" data-testid="exit-run-mode" onClick={handleExitPlayMode}>
                Return To Editor
              </button>
            </div>
          </div>
        </header>

        <div className="runner-workspace">
          <main className="runner-region">
            <RunnerCanvas
              runtimeScene={runtimeScene}
              projectAssets={editorState.document.assets}
              loadedModelAssets={loadedModelAssets}
              loadedImageAssets={loadedImageAssets}
              loadedAudioAssets={loadedAudioAssets}
              navigationMode={activeNavigationMode}
              onRuntimeMessageChange={setRuntimeMessage}
              onFirstPersonTelemetryChange={setFirstPersonTelemetry}
              onInteractionPromptChange={setRuntimeInteractionPrompt}
            />
          </main>

          <aside className="side-column">
            <Panel title="Runner">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="label">Navigation</div>
                  <div className="value">{activeNavigationMode === "firstPerson" ? "First Person" : "Orbit Visitor"}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Spawn Source</div>
                  <div className="value">{runtimeScene.spawn.source === "playerStart" ? "Player Start" : "Fallback"}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Pointer Lock</div>
                  <div className="value">
                    {activeNavigationMode === "firstPerson" ? (firstPersonTelemetry?.pointerLocked ? "active" : "idle") : "not used"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Grounded</div>
                  <div className="value">{firstPersonTelemetry?.grounded ? "yes" : activeNavigationMode === "firstPerson" ? "no" : "n/a"}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="label">FPS Feet Position</div>
                <div className="value" data-testid="runner-player-position">
                  {formatRunnerFeetPosition(firstPersonTelemetry?.feetPosition ?? runtimeScene.spawn.position)}
                </div>
                <div className="material-summary" data-testid="runner-spawn-state">
                  Spawn: {runtimeScene.spawn.source === "playerStart" ? "Player Start" : "Fallback"} at{" "}
                  {formatRunnerFeetPosition(runtimeScene.spawn.position)}
                </div>
              </div>

              <div className="stat-card">
                <div className="label">Interaction</div>
                <div className="value" data-testid="runner-interaction-state">
                  {activeNavigationMode === "firstPerson" ? (runtimeInteractionPrompt === null ? "No target" : "Ready") : "Not available"}
                </div>
                <div className="material-summary" data-testid="runner-interaction-summary">
                  {activeNavigationMode === "firstPerson"
                    ? runtimeInteractionPrompt === null
                      ? "Aim at an authored Interactable and click when a prompt appears."
                      : `Click "${runtimeInteractionPrompt.prompt}" within ${runtimeInteractionPrompt.range.toFixed(1)}m.`
                    : "Switch to First Person to use click interactions."}
                </div>
              </div>

              {runtimeMessage === null ? null : <div className="info-banner">{runtimeMessage}</div>}
              {activeNavigationMode === "firstPerson" ? (
                <div className="info-banner" data-testid="runner-interaction-help">
                  Mouse click activates the current prompt target. Keyboard/controller fallback is not active yet.
                </div>
              ) : null}
            </Panel>
          </aside>
        </div>

        <footer className="status-bar">
          <div>
            <span className="status-bar__strong">Status:</span> {statusMessage}
          </div>
          <div>
            <span className="status-bar__strong">Spawn:</span>{" "}
            {runtimeScene.spawn.source === "playerStart" ? "Authored Player Start" : "Fallback runtime spawn"}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="toolbar">
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

        <div className="toolbar__actions">
          <div className="toolbar__group">
            <button className="toolbar__button" type="button" disabled={!editorState.storageAvailable} onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button className="toolbar__button" type="button" disabled={!editorState.storageAvailable} onClick={handleLoadDraft}>
              Load Draft
            </button>
            <button className="toolbar__button" type="button" onClick={handleExportJson}>
              Export JSON
            </button>
            <button className="toolbar__button" type="button" onClick={handleImportJsonButtonClick}>
              Import JSON
            </button>
            <button
              className="toolbar__button"
              type="button"
              onClick={handleImportModelButtonClick}
              disabled={!projectAssetStorageReady || projectAssetStorage === null}
            >
              Import Model
            </button>
          </div>

          <div className="toolbar__group">
            <button
              className={`toolbar__button ${editorState.toolMode === "select" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("select")}
            >
              Select
            </button>
            <button
              className={`toolbar__button ${editorState.toolMode === "box-create" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("box-create")}
            >
              Box Create
            </button>
          </div>

          <div className="toolbar__group">
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
              className={`toolbar__button ${preferredNavigationMode === "firstPerson" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => handleSetPreferredNavigationMode("firstPerson")}
            >
              First Person
            </button>
            <button
              className={`toolbar__button ${preferredNavigationMode === "orbitVisitor" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => handleSetPreferredNavigationMode("orbitVisitor")}
            >
              Orbit Visitor
            </button>
          </div>

          <div className="toolbar__group">
            <button className="toolbar__button" type="button" disabled={!editorState.canUndo} onClick={() => store.undo()}>
              Undo
            </button>
            <button className="toolbar__button" type="button" disabled={!editorState.canRedo} onClick={() => store.redo()}>
              Redo
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-column">
          <Panel title="Assets">
            <div className="inline-actions">
              <button
                className="toolbar__button toolbar__button--accent"
                type="button"
                data-testid="import-model-asset"
                onClick={handleImportModelButtonClick}
                disabled={!projectAssetStorageReady || projectAssetStorage === null}
              >
                Import GLB/GLTF
              </button>
              <button
                className="toolbar__button toolbar__button--accent"
                type="button"
                data-testid="import-background-image-asset"
                onClick={handleImportBackgroundImageButtonClick}
                disabled={!projectAssetStorageReady || projectAssetStorage === null}
              >
                Import Background Image
              </button>
              <button
                className="toolbar__button toolbar__button--accent"
                type="button"
                data-testid="import-audio-asset"
                onClick={handleImportAudioButtonClick}
                disabled={!projectAssetStorageReady || projectAssetStorage === null}
              >
                Import Audio
              </button>
            </div>

            {assetStatusMessage === null ? null : (
              <div className="info-banner" data-testid="asset-status-message">
                {assetStatusMessage}
              </div>
            )}

            {projectAssetStorageReady && projectAssetStorage === null ? (
              <div className="outliner-empty">Project asset storage is unavailable. Imported assets cannot be persisted.</div>
            ) : null}

            <div data-testid="asset-list">
              <div className="outliner-section">
                <div className="label">Model Assets</div>
                {modelAssetList.length === 0 ? (
                  <div className="outliner-empty">No imported model assets yet. Import a GLB or GLTF to register the first model asset.</div>
                ) : (
                  <div className="outliner-list">
                    {modelAssetList.map((asset) => (
                      <div key={asset.id} className="outliner-item asset-item">
                        <div className="outliner-item__select">
                          <span className="outliner-item__title">{asset.sourceName}</span>
                          <span className="outliner-item__meta">{getProjectAssetKindLabel(asset.kind)}</span>
                        </div>

                        <div className="asset-item__summary">
                          {formatByteLength(asset.byteLength)} | {asset.mimeType}
                        </div>
                        <div className="asset-item__summary">Storage key: {asset.storageKey}</div>
                        <div className="asset-item__summary">{formatModelAssetSummary(asset)}</div>
                        <div className="asset-item__summary">{formatModelBoundingBoxLabel(asset)}</div>
                        {asset.metadata.materialNames.length === 0 ? null : (
                          <div className="asset-item__summary">Materials: {asset.metadata.materialNames.join(", ")}</div>
                        )}
                        {asset.metadata.textureNames.length === 0 ? null : (
                          <div className="asset-item__summary">Textures: {asset.metadata.textureNames.join(", ")}</div>
                        )}
                        {asset.metadata.animationNames.length === 0 ? null : (
                          <div className="asset-item__summary">Animations: {asset.metadata.animationNames.join(", ")}</div>
                        )}
                        {asset.metadata.warnings.length === 0 ? null : (
                          <div className="asset-item__warnings">{asset.metadata.warnings.join(" | ")}</div>
                        )}

                        <div className="inline-actions">
                          <button
                            className="toolbar__button"
                            type="button"
                            data-testid={`place-model-instance-${asset.id}`}
                            onClick={() => handlePlaceModelInstance(asset.id)}
                          >
                            Place Instance
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="outliner-section">
                <div className="label">Image Assets</div>
                {imageAssetList.length === 0 ? (
                  <div className="outliner-empty">No imported background images yet. Import a 2:1 panorama to register the first background asset.</div>
                ) : (
                  <div className="outliner-list">
                    {imageAssetList.map((asset) => (
                      <div
                        key={asset.id}
                        className={`outliner-item asset-item ${
                          editorState.document.world.background.mode === "image" && editorState.document.world.background.assetId === asset.id
                            ? "outliner-item--selected"
                            : ""
                        }`}
                      >
                        <div className="outliner-item__select">
                          <span className="outliner-item__title">{asset.sourceName}</span>
                          <span className="outliner-item__meta">{getProjectAssetKindLabel(asset.kind)}</span>
                        </div>

                        <div className="asset-item__summary">
                          {formatByteLength(asset.byteLength)} | {asset.mimeType}
                        </div>
                        <div className="asset-item__summary">Storage key: {asset.storageKey}</div>
                        <div className="asset-item__summary">{formatImageAssetSummary(asset)}</div>
                        {asset.metadata.warnings.length === 0 ? null : (
                          <div className="asset-item__warnings">{asset.metadata.warnings.join(" | ")}</div>
                        )}

                        <div className="inline-actions">
                          <button
                            className={`toolbar__button ${
                              editorState.document.world.background.mode === "image" && editorState.document.world.background.assetId === asset.id
                                ? "toolbar__button--active"
                                : ""
                            }`}
                            type="button"
                            data-testid={`use-background-asset-${asset.id}`}
                            onClick={() => applyWorldBackgroundMode("image", asset.id)}
                          >
                            Use as Background
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="outliner-section">
                <div className="label">Audio Assets</div>
                {audioAssetList.length === 0 ? (
                  <div className="outliner-empty">No imported audio assets yet. Import a playable audio file to register the first audio asset.</div>
                ) : (
                  <div className="outliner-list">
                    {audioAssetList.map((asset) => (
                      <div key={asset.id} className="outliner-item asset-item">
                        <div className="outliner-item__select">
                          <span className="outliner-item__title">{asset.sourceName}</span>
                          <span className="outliner-item__meta">{getProjectAssetKindLabel(asset.kind)}</span>
                        </div>

                        <div className="asset-item__summary">
                          {formatByteLength(asset.byteLength)} | {asset.mimeType}
                        </div>
                        <div className="asset-item__summary">Storage key: {asset.storageKey}</div>
                        <div className="asset-item__summary">{formatAudioAssetSummary(asset)}</div>
                        {asset.metadata.warnings.length === 0 ? null : (
                          <div className="asset-item__warnings">{asset.metadata.warnings.join(" | ")}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Outliner">
            <div className="outliner-section">
              <div className="label">Brushes</div>
              {brushList.length === 0 ? (
                <div className="outliner-empty">Switch to Box Create and click in the viewport to place the first brush.</div>
              ) : (
                <div className="outliner-list" data-testid="outliner-brush-list">
                  {brushList.map((brush, brushIndex) => (
                    <div
                      key={brush.id}
                      className={`outliner-item ${isBrushSelected(editorState.selection, brush.id) ? "outliner-item--selected" : ""}`}
                    >
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
                        <span className="outliner-item__title">{getBrushLabel(brush, brushIndex)}</span>
                        <span className="outliner-item__meta">Brush</span>
                      </button>

                      {selectedBrush?.id !== brush.id ? null : (
                        <label className="form-field outliner-item__editor">
                          <span className="label">Name</span>
                          <input
                            className="text-input text-input--dense"
                            data-testid="selected-brush-name"
                            type="text"
                            value={brushNameDraft}
                            placeholder={`Box Brush ${brushIndex + 1}`}
                            onChange={(event) => setBrushNameDraft(event.currentTarget.value)}
                            onBlur={applyBrushNameChange}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                applyBrushNameChange();
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="outliner-section">
              <div className="label">Model Instances</div>
              {modelInstanceDisplayList.length === 0 ? (
                <div className="outliner-empty">No model instances placed yet.</div>
              ) : (
                <div className="outliner-list" data-testid="outliner-model-instance-list">
                  {modelInstanceDisplayList.map(({ modelInstance, label }) => (
                    <button
                      key={modelInstance.id}
                      data-testid={`outliner-model-instance-${modelInstance.id}`}
                      className={`outliner-item ${
                        editorState.selection.kind === "modelInstances" && editorState.selection.ids.includes(modelInstance.id)
                          ? "outliner-item--selected"
                          : ""
                      }`}
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
                      <span className="outliner-item__title">{label}</span>
                      <span className="outliner-item__meta">{editorState.document.assets[modelInstance.assetId]?.sourceName ?? modelInstance.assetId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="outliner-section">
              <div className="label">Entities</div>
              {entityDisplayList.length === 0 ? <div className="outliner-empty">No entities authored yet.</div> : null}

              <div className="inline-actions">
                <button className="toolbar__button" type="button" data-testid="place-player-start" onClick={() => handlePlaceEntity("playerStart")}>
                  Add Player Start
                </button>
                <button
                  className="toolbar__button"
                  type="button"
                  data-testid="add-entity-soundEmitter"
                  onClick={() => handlePlaceEntity("soundEmitter")}
                >
                  Add Sound Emitter
                </button>
              </div>

              <div className="inline-actions">
                <button
                  className="toolbar__button"
                  type="button"
                  data-testid="add-entity-triggerVolume"
                  onClick={() => handlePlaceEntity("triggerVolume")}
                >
                  Add Trigger Volume
                </button>
                <button
                  className="toolbar__button"
                  type="button"
                  data-testid="add-entity-teleportTarget"
                  onClick={() => handlePlaceEntity("teleportTarget")}
                >
                  Add Teleport Target
                </button>
              </div>

              <div className="inline-actions">
                <button
                  className="toolbar__button"
                  type="button"
                  data-testid="add-entity-interactable"
                  onClick={() => handlePlaceEntity("interactable")}
                >
                  Add Interactable
                </button>
              </div>

              {entityDisplayList.length === 0 ? null : (
                <div className="outliner-list">
                  {entityDisplayList.map(({ entity, label }) => (
                    <button
                      key={entity.id}
                      data-testid={`outliner-entity-${entity.id}`}
                      className={`outliner-item ${
                        editorState.selection.kind === "entities" && editorState.selection.ids.includes(entity.id)
                          ? "outliner-item--selected"
                          : ""
                      }`}
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
                      <span className="outliner-item__title">{label}</span>
                      <span className="outliner-item__meta">{getEntityKindLabel(entity.kind)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="inline-actions">
                <button className="toolbar__button" type="button" data-testid="add-entity-pointLight" onClick={() => handlePlaceEntity("pointLight")}>
                  Add Point Light
                </button>
                <button className="toolbar__button" type="button" data-testid="add-entity-spotLight" onClick={() => handlePlaceEntity("spotLight")}>
                  Add Spot Light
                </button>
              </div>
            </div>
          </Panel>
        </aside>

        <main className="viewport-region">
          <div className="viewport-region__header">
            <div className="viewport-region__title">Viewport</div>
            <div className="viewport-region__caption">{getViewportCaption(editorState.toolMode, brushList.length)}</div>
          </div>
          <ViewportCanvas
            world={editorState.document.world}
            sceneDocument={editorState.document}
            projectAssets={editorState.document.assets}
            loadedModelAssets={loadedModelAssets}
            loadedImageAssets={loadedImageAssets}
            selection={editorState.selection}
            toolMode={editorState.toolMode}
            focusRequestId={focusRequest.id}
            focusSelection={focusRequest.selection}
            onSelectionChange={(selection) => applySelection(selection, "viewport")}
            onCreateBoxBrush={handleCreateBoxBrush}
          />
        </main>

        <aside className="side-column">
          {editorState.selection.kind === "none" ? (
          <Panel title="World">
            <div className="stat-card">
              <div className="label">Background</div>
              <div className="value" data-testid="world-background-mode-value">
                {formatWorldBackgroundLabel(editorState.document.world)}
              </div>
              <div
                className="world-background-preview"
                data-testid="world-background-preview"
                style={createWorldBackgroundStyle(
                  editorState.document.world.background,
                  editorState.document.world.background.mode === "image"
                    ? loadedImageAssets[editorState.document.world.background.assetId]?.sourceUrl ?? null
                    : null
                )}
              />
              <div className="material-summary">
                {editorState.document.world.background.mode === "solid"
                  ? editorState.document.world.background.colorHex
                  : editorState.document.world.background.mode === "verticalGradient"
                    ? `${editorState.document.world.background.topColorHex} -> ${editorState.document.world.background.bottomColorHex}`
                    : editorState.document.assets[editorState.document.world.background.assetId]?.sourceName ??
                      editorState.document.world.background.assetId}
              </div>
              {editorState.document.world.background.mode !== "image" ? null : (
                <div className="material-summary" data-testid="world-background-asset-value">
                  Background Asset:{" "}
                  {editorState.document.assets[editorState.document.world.background.assetId]?.sourceName ??
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
                    editorState.document.world.background.mode === "verticalGradient" ? "toolbar__button--active" : ""
                  }`}
                  type="button"
                  data-testid="world-background-mode-gradient"
                  onClick={() => applyWorldBackgroundMode("verticalGradient")}
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
                    onChange={(event) => setBackgroundEnvironmentIntensityDraft(event.currentTarget.value)}
                    onBlur={applyBackgroundEnvironmentIntensity}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applyBackgroundEnvironmentIntensity)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applyBackgroundEnvironmentIntensity)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applyBackgroundEnvironmentIntensity)}
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
                      onChange={(event) => applyWorldBackgroundColor(event.currentTarget.value)}
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
                        value={editorState.document.world.background.topColorHex}
                        onChange={(event) => applyWorldGradientColor("top", event.currentTarget.value)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Bottom</span>
                      <input
                        data-testid="world-background-bottom-color"
                        className="color-input"
                        type="color"
                        value={editorState.document.world.background.bottomColorHex}
                        onChange={(event) => applyWorldGradientColor("bottom", event.currentTarget.value)}
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
                    onChange={(event) => applyAmbientLightColor(event.currentTarget.value)}
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
                    onChange={(event) => setAmbientLightIntensityDraft(event.currentTarget.value)}
                    onBlur={applyAmbientLightIntensity}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applyAmbientLightIntensity)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applyAmbientLightIntensity)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applyAmbientLightIntensity)}
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
                    onChange={(event) => applySunLightColor(event.currentTarget.value)}
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
                    onChange={(event) => setSunLightIntensityDraft(event.currentTarget.value)}
                    onBlur={applySunLightIntensity}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applySunLightIntensity)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applySunLightIntensity)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applySunLightIntensity)}
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
                      setSunDirectionDraft((draft) => ({ ...draft, x: nextValue }));
                    }}
                    onBlur={applySunLightDirection}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applySunLightDirection)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applySunLightDirection)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applySunLightDirection)}
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
                      setSunDirectionDraft((draft) => ({ ...draft, y: nextValue }));
                    }}
                    onBlur={applySunLightDirection}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applySunLightDirection)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applySunLightDirection)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applySunLightDirection)}
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
                      setSunDirectionDraft((draft) => ({ ...draft, z: nextValue }));
                    }}
                    onBlur={applySunLightDirection}
                    onKeyDown={(event) => handleDraftVectorKeyDown(event, applySunLightDirection)}
                    onKeyUp={(event) => handleNumberInputKeyUp(event, applySunLightDirection)}
                    onPointerUp={(event) => handleNumberInputPointerUp(event, applySunLightDirection)}
                  />
                </label>
              </div>
            </div>
          </Panel>
          ) : (
          <Panel title="Inspector">
            <div className="stat-card">
              <div className="label">Selection</div>
              <div className="value">
                {describeSelection(editorState.selection, brushList, editorState.document.modelInstances, editorState.document.assets, editorState.document.entities)}
              </div>
            </div>

            {selectedModelInstance !== null ? (
              <>
                <div className="stat-card">
                  <div className="label">Model Asset</div>
                  <div className="value">{selectedModelAsset?.sourceName ?? "Missing Asset"}</div>
                  <div className="material-summary">
                    {selectedModelAssetRecord === null
                      ? "This model instance references an asset that is missing from the registry."
                      : formatModelAssetSummary(selectedModelAssetRecord)}
                  </div>
                  {selectedModelAssetRecord === null ? null : (
                    <div className="material-summary">{formatModelBoundingBoxLabel(selectedModelAssetRecord)}</div>
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
                          setModelPositionDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelPositionDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelPositionDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelRotationDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelRotationDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelRotationDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelScaleDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelScaleDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
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
                          setModelScaleDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applyModelInstanceChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyModelInstanceChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyModelInstanceChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyModelInstanceChange)}
                      />
                    </label>
                  </div>
                </div>

                {selectedModelAssetRecord !== null && selectedModelAssetRecord.metadata.animationNames.length > 0 && (
                  <div className="form-section">
                    <div className="label">Animation</div>
                    <label className="form-field">
                      <span className="label">Clip</span>
                      <select
                        className="select-input"
                        value={selectedModelInstance.animationClipName ?? ""}
                        onChange={(e) => {
                          const clipName = e.target.value || undefined;
                          store.executeCommand(
                            createUpsertModelInstanceCommand({
                              modelInstance: { ...selectedModelInstance, animationClipName: clipName },
                              label: "Set animation clip"
                            })
                          );
                        }}
                      >
                        <option value="">— none —</option>
                        {selectedModelAssetRecord.metadata.animationNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <input
                        type="checkbox"
                        checked={selectedModelInstance.animationAutoplay ?? false}
                        onChange={(e) => {
                          store.executeCommand(
                            createUpsertModelInstanceCommand({
                              modelInstance: { ...selectedModelInstance, animationAutoplay: e.target.checked },
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
                  <button className="toolbar__button" type="button" data-testid="apply-model-instance" onClick={applyModelInstanceChange}>
                    Apply Transform
                  </button>
                </div>
              </>
            ) : selectedEntity !== null ? (
              <>
                <div className="stat-card">
                  <div className="label">Entity Kind</div>
                  <div className="value">{getEntityKindLabel(selectedEntity.kind)}</div>
                </div>

                <div className="form-section">
                  <div className="label">Position</div>
                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">X</span>
                      <input
                        data-testid={selectedEntity.kind === "playerStart" ? "player-start-position-x" : `${selectedEntity.kind}-position-x`}
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={entityPositionDraft.x}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setEntityPositionDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applySelectedEntityDraftChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        data-testid={selectedEntity.kind === "playerStart" ? "player-start-position-y" : `${selectedEntity.kind}-position-y`}
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={entityPositionDraft.y}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setEntityPositionDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applySelectedEntityDraftChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        data-testid={selectedEntity.kind === "playerStart" ? "player-start-position-z" : `${selectedEntity.kind}-position-z`}
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={entityPositionDraft.z}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setEntityPositionDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applySelectedEntityDraftChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange)}
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
                              scheduleDraftCommit(() => applyPointLightChange({ colorHex: nextColorHex }));
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
                            onChange={(event) => setPointLightIntensityDraft(event.currentTarget.value)}
                            onBlur={() => applyPointLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPointLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applyPointLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applyPointLightChange)}
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
                          onChange={(event) => setPointLightDistanceDraft(event.currentTarget.value)}
                          onBlur={() => applyPointLightChange()}
                          onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPointLightChange)}
                          onKeyUp={(event) => handleNumberInputKeyUp(event, applyPointLightChange)}
                          onPointerUp={(event) => handleNumberInputPointerUp(event, applyPointLightChange)}
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
                              scheduleDraftCommit(() => applySpotLightChange({ colorHex: nextColorHex }));
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
                            onChange={(event) => setSpotLightIntensityDraft(event.currentTarget.value)}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
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
                            onChange={(event) => setSpotLightDistanceDraft(event.currentTarget.value)}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
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
                            onChange={(event) => setSpotLightAngleDraft(event.currentTarget.value)}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
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
                              setSpotLightDirectionDraft((draft) => ({ ...draft, x: nextValue }));
                            }}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
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
                              setSpotLightDirectionDraft((draft) => ({ ...draft, y: nextValue }));
                            }}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
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
                              setSpotLightDirectionDraft((draft) => ({ ...draft, z: nextValue }));
                            }}
                            onBlur={() => applySpotLightChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySpotLightChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySpotLightChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySpotLightChange)}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}

                {selectedPlayerStart !== null ? (
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
                        onChange={(event) => setPlayerStartYawDraft(event.currentTarget.value)}
                        onBlur={applyPlayerStartChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPlayerStartChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPlayerStartChange)}
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
                            : selectedSoundEmitterAudioAssetRecord?.sourceName ?? "Missing Audio Asset"}
                        </div>
                        <div className="material-summary">
                          {selectedSoundEmitter.audioAssetId === null
                            ? "Choose an audio asset to make this emitter playable."
                            : selectedSoundEmitterAudioAssetRecord === null
                              ? `This sound emitter references ${selectedSoundEmitter.audioAssetId}, but the asset is missing or not audio.`
                              : formatAudioAssetSummary(selectedSoundEmitterAudioAssetRecord)}
                        </div>
                      </div>
                      <label className="form-field">
                        <span className="label">Audio</span>
                        <select
                          data-testid="sound-emitter-audio-asset"
                          className="text-input"
                          value={soundEmitterAudioAssetIdDraft}
                          onChange={(event) => {
                            const nextAudioAssetId = event.currentTarget.value.trim();
                            setSoundEmitterAudioAssetIdDraft(nextAudioAssetId);
                            scheduleDraftCommit(() =>
                              applySoundEmitterChange({
                                audioAssetId: nextAudioAssetId.length === 0 ? null : nextAudioAssetId
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
                          onChange={(event) => setSoundEmitterVolumeDraft(event.currentTarget.value)}
                          onBlur={() => applySoundEmitterChange()}
                          onKeyDown={(event) => handleDraftVectorKeyDown(event, applySoundEmitterChange)}
                          onKeyUp={(event) => handleNumberInputKeyUp(event, applySoundEmitterChange)}
                          onPointerUp={(event) => handleNumberInputPointerUp(event, applySoundEmitterChange)}
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
                            onChange={(event) => setSoundEmitterRefDistanceDraft(event.currentTarget.value)}
                            onBlur={() => applySoundEmitterChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySoundEmitterChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySoundEmitterChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySoundEmitterChange)}
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
                            onChange={(event) => setSoundEmitterMaxDistanceDraft(event.currentTarget.value)}
                            onBlur={() => applySoundEmitterChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applySoundEmitterChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applySoundEmitterChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applySoundEmitterChange)}
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
                              const nextAutoplay = event.currentTarget.checked;
                              setSoundEmitterAutoplayDraft(nextAutoplay);
                              scheduleDraftCommit(() => applySoundEmitterChange({ autoplay: nextAutoplay }));
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
                              scheduleDraftCommit(() => applySoundEmitterChange({ loop: nextLoop }));
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
                              setTriggerVolumeSizeDraft((draft) => ({ ...draft, x: nextValue }));
                            }}
                            onBlur={applyTriggerVolumeChange}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange)}
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
                              setTriggerVolumeSizeDraft((draft) => ({ ...draft, y: nextValue }));
                            }}
                            onBlur={applyTriggerVolumeChange}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange)}
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
                              setTriggerVolumeSizeDraft((draft) => ({ ...draft, z: nextValue }));
                            }}
                            onBlur={applyTriggerVolumeChange}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange)}
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
                        onChange={(event) => setTeleportTargetYawDraft(event.currentTarget.value)}
                        onBlur={applyTeleportTargetChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyTeleportTargetChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyTeleportTargetChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyTeleportTargetChange)}
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
                            onChange={(event) => setInteractableRadiusDraft(event.currentTarget.value)}
                            onBlur={() => applyInteractableChange()}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, applyInteractableChange)}
                            onKeyUp={(event) => handleNumberInputKeyUp(event, applyInteractableChange)}
                            onPointerUp={(event) => handleNumberInputPointerUp(event, applyInteractableChange)}
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
                              scheduleDraftCommit(() => applyInteractableChange({ enabled: nextEnabled }));
                            }}
                          />
                        </label>
                      </div>
                      <div className="material-summary">Range defines how close the player must be before the click prompt can activate.</div>
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
                          onChange={(event) => setInteractablePromptDraft(event.currentTarget.value)}
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
              </>
            ) : selectedBrush === null ? (
              <div className="outliner-empty">Select a brush or entity to edit authored properties.</div>
            ) : (
              <>
                <div className="stat-card">
                  <div className="label">Brush Kind</div>
                  <div className="value">box</div>
                </div>

                <div className="form-section">
                  <div className="label">Center</div>
                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">X</span>
                      <input
                        data-testid="brush-center-x"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.x}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPositionDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applyPositionChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPositionChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPositionChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        data-testid="brush-center-y"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.y}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPositionDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applyPositionChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPositionChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPositionChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        data-testid="brush-center-z"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.z}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPositionDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applyPositionChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPositionChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPositionChange)}
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
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.x}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSizeDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applySizeChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySizeChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySizeChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        data-testid="brush-size-y"
                        className="text-input"
                        type="number"
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.y}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSizeDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applySizeChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySizeChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySizeChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        data-testid="brush-size-z"
                        className="text-input"
                        type="number"
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.z}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setSizeDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applySizeChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applySizeChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applySizeChange)}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <div className="label">Faces</div>
                  <div className="face-grid">
                    {BOX_FACE_IDS.map((faceId) => (
                      <button
                        key={faceId}
                        type="button"
                        data-testid={`face-button-${faceId}`}
                        className={`face-chip ${isBrushFaceSelected(editorState.selection, selectedBrush.id, faceId) ? "face-chip--active" : ""}`}
                        onClick={() =>
                          applySelection(
                            {
                              kind: "brushFace",
                              brushId: selectedBrush.id,
                              faceId
                            },
                            "inspector"
                          )
                        }
                      >
                        <span className="face-chip__title">{FACE_LABELS[faceId]}</span>
                        <span className="face-chip__meta">{faceId}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFace === null || selectedFaceId === null ? (
                  <div className="outliner-empty">Select a face to edit its material and UV transform.</div>
                ) : (
                  <>
                    <div className="stat-card">
                      <div className="label">Active Face</div>
                      <div className="value">{FACE_LABELS[selectedFaceId]}</div>
                      <div className="material-summary" data-testid="selected-face-material-name">
                        Material: {selectedFaceMaterial?.name ?? "Fallback face color"}
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
                            <span className="material-item__preview" style={getMaterialPreviewStyle(material)} aria-hidden="true" />
                            <span className="material-item__text">
                              <span className="material-item__title">{material.name}</span>
                              <span className="material-item__meta">{material.tags.join(" | ")}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="inline-actions">
                        <button className="toolbar__button" type="button" onClick={clearFaceMaterial}>
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
                              setUvOffsetDraft((draft) => ({ ...draft, x: nextValue }));
                            }}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, handleApplyUvDraft)}
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
                              setUvOffsetDraft((draft) => ({ ...draft, y: nextValue }));
                            }}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, handleApplyUvDraft)}
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
                              setUvScaleDraft((draft) => ({ ...draft, x: nextValue }));
                            }}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, handleApplyUvDraft)}
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
                              setUvScaleDraft((draft) => ({ ...draft, y: nextValue }));
                            }}
                            onKeyDown={(event) => handleDraftVectorKeyDown(event, handleApplyUvDraft)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="inline-actions">
                      <button className="toolbar__button" type="button" data-testid="apply-face-uv" onClick={handleApplyUvDraft}>
                        Apply UV Offset/Scale
                      </button>
                      <button className="toolbar__button" type="button" onClick={handleRotateUv}>
                        Rotate 90
                      </button>
                      <button className="toolbar__button" type="button" onClick={() => handleFlipUv("u")}>
                        Flip U
                      </button>
                      <button className="toolbar__button" type="button" onClick={() => handleFlipUv("v")}>
                        Flip V
                      </button>
                      <button className="toolbar__button" type="button" onClick={handleFitUvToFace}>
                        Fit To Face
                      </button>
                    </div>

                    <div className="stat-card">
                      <div className="label">UV Flags</div>
                      <div className="value">Rotation {selectedFace.uv.rotationQuarterTurns * 90}°</div>
                      <div className="material-summary">
                        U {selectedFace.uv.flipU ? "flipped" : "normal"} · V {selectedFace.uv.flipV ? "flipped" : "normal"}
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

      <footer className="status-bar">
        <div className="status-bar__item" data-testid="status-message">
          <span className="status-bar__strong">Status:</span> {statusMessage}
        </div>
        <div className="status-bar__item" data-testid="status-document">
          <span className="status-bar__strong">Document:</span> {documentStatusLabel}
        </div>
        <div className="status-bar__item" data-testid="status-run-preflight">
          <span className="status-bar__strong">Run:</span> {runReadyLabel}
        </div>
        <div className="status-bar__item" data-testid="status-warnings">
          <span className="status-bar__strong">Warnings:</span> {warningDiagnostics.length}
        </div>
        <div className="status-bar__item" data-testid="status-last-command">
          <span className="status-bar__strong">Last:</span> {lastCommandLabel}
        </div>
      </footer>

      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={handleImportJsonChange}
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
