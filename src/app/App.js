import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
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
import { createSetEntityNameCommand } from "../commands/set-entity-name-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createDeleteInteractionLinkCommand } from "../commands/delete-interaction-link-command";
import { createSetModelInstanceNameCommand } from "../commands/set-model-instance-name-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import { createSetWorldSettingsCommand } from "../commands/set-world-settings-command";
import { createUpsertEntityCommand } from "../commands/upsert-entity-command";
import { createUpsertModelInstanceCommand } from "../commands/upsert-model-instance-command";
import { createUpsertInteractionLinkCommand } from "../commands/upsert-interaction-link-command";
import { getSelectedBrushEdgeId, getSelectedBrushFaceId, getSelectedBrushVertexId, getSingleSelectedBrushId, getSingleSelectedEntityId, getSingleSelectedModelInstanceId, isBrushFaceSelected, isBrushSelected } from "../core/selection";
import { createTransformSession, doesTransformSessionChangeTarget, getTransformOperationLabel, getTransformTargetLabel, resolveTransformTarget, supportsTransformAxisConstraint, supportsTransformOperation } from "../core/transform-session";
import { MODEL_INSTANCE_COLLISION_MODES, areModelInstancesEqual, createModelInstance, createModelInstancePlacementPosition, DEFAULT_MODEL_INSTANCE_POSITION, DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES, DEFAULT_MODEL_INSTANCE_SCALE, normalizeModelInstanceName } from "../assets/model-instances";
import { getModelInstanceDisplayLabelById, getSortedModelInstanceDisplayLabels } from "../assets/model-instance-labels";
import { importAudioAssetFromFile, loadAudioAssetFromStorage } from "../assets/audio-assets";
import { importModelAssetFromFile, importModelAssetFromFiles, loadModelAssetFromStorage, disposeModelTemplate } from "../assets/gltf-model-import";
import { importBackgroundImageAssetFromFile, loadImageAssetFromStorage, disposeLoadedImageAsset } from "../assets/image-assets";
import { getProjectAssetKindLabel } from "../assets/project-assets";
import { getWhiteboxSelectionModeLabel, WHITEBOX_SELECTION_MODES } from "../core/whitebox-selection-mode";
import { BOX_EDGE_LABELS, BOX_FACE_IDS, BOX_FACE_LABELS, BOX_VERTEX_LABELS, DEFAULT_BOX_BRUSH_CENTER, DEFAULT_BOX_BRUSH_ROTATION_DEGREES, DEFAULT_BOX_BRUSH_SIZE, createDefaultFaceUvState, normalizeBrushName } from "../document/brushes";
import { ADVANCED_RENDERING_SHADOW_MAP_SIZES, ADVANCED_RENDERING_SHADOW_TYPES, ADVANCED_RENDERING_TONE_MAPPING_MODES, areWorldSettingsEqual, changeWorldBackgroundMode, cloneWorldSettings } from "../document/world-settings";
import { formatSceneDiagnosticSummary, validateSceneDocument } from "../document/scene-document-validation";
import { getBrowserProjectAssetStorageAccess } from "../assets/project-asset-storage";
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";
import { createFitToFaceBoxBrushFaceUvState } from "../geometry/box-face-uvs";
import { DEFAULT_ENTITY_POSITION, DEFAULT_INTERACTABLE_PROMPT, DEFAULT_INTERACTABLE_RADIUS, DEFAULT_POINT_LIGHT_COLOR_HEX, DEFAULT_POINT_LIGHT_DISTANCE, DEFAULT_POINT_LIGHT_INTENSITY, DEFAULT_PLAYER_START_BOX_SIZE, DEFAULT_PLAYER_START_CAPSULE_HEIGHT, DEFAULT_PLAYER_START_CAPSULE_RADIUS, DEFAULT_PLAYER_START_EYE_HEIGHT, DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID, DEFAULT_SOUND_EMITTER_VOLUME, DEFAULT_SOUND_EMITTER_REF_DISTANCE, DEFAULT_SOUND_EMITTER_MAX_DISTANCE, DEFAULT_TELEPORT_TARGET_YAW_DEGREES, PLAYER_START_COLLIDER_MODES, DEFAULT_SPOT_LIGHT_ANGLE_DEGREES, DEFAULT_SPOT_LIGHT_COLOR_HEX, DEFAULT_SPOT_LIGHT_DISTANCE, DEFAULT_SPOT_LIGHT_DIRECTION, DEFAULT_SPOT_LIGHT_INTENSITY, DEFAULT_TRIGGER_VOLUME_SIZE, areEntityInstancesEqual, createInteractableEntity, createPointLightEntity, createPlayerStartEntity, createSoundEmitterEntity, createSpotLightEntity, createTeleportTargetEntity, createTriggerVolumeEntity, getEntityInstances, getEntityKindLabel, getPrimaryPlayerStartEntity, normalizeEntityName, normalizeYawDegrees, normalizeInteractablePrompt } from "../entities/entity-instances";
import { getEntityDisplayLabelById, getSortedEntityDisplayLabels } from "../entities/entity-labels";
import { areInteractionLinksEqual, createPlayAnimationInteractionLink, createPlaySoundInteractionLink, createStopAnimationInteractionLink, createStopSoundInteractionLink, createTeleportPlayerInteractionLink, createToggleVisibilityInteractionLink, getInteractionLinksForSource } from "../interactions/interaction-links";
import { STARTER_MATERIAL_LIBRARY } from "../materials/starter-material-library";
import { RunnerCanvas } from "../runner-web/RunnerCanvas";
import { buildRuntimeSceneFromDocument } from "../runtime-three/runtime-scene-build";
import { validateRuntimeSceneBuild } from "../runtime-three/runtime-scene-validation";
import { Panel } from "../shared-ui/Panel";
import { HierarchicalMenu } from "../shared-ui/HierarchicalMenu";
import { createWorldBackgroundStyle } from "../shared-ui/world-background-style";
import { ViewportPanel } from "../viewport-three/ViewportPanel";
import { getViewportViewModeLabel } from "../viewport-three/viewport-view-modes";
import { VIEWPORT_LAYOUT_MODES, VIEWPORT_PANEL_IDS, getViewportDisplayModeLabel, getViewportLayoutModeLabel, getViewportPanelLabel } from "../viewport-three/viewport-layout";
import { useEditorStoreState } from "./use-editor-store";
function getModelInstanceCollisionModeDescription(mode) {
    switch (mode) {
        case "none":
            return "No generated collider is built for this model instance.";
        case "terrain":
            return "Builds a Rapier heightfield from a regular-grid terrain mesh. Unsupported terrain sources fail with build diagnostics.";
        case "static":
            return "Builds a fixed Rapier triangle-mesh collider from the imported model geometry.";
        case "dynamic":
            return "Builds convex compound pieces for Rapier queries. In this slice they participate as fixed world collision, not fully simulated rigid bodies.";
        case "simple":
            return "Builds one cheap oriented box from the imported model bounds.";
    }
}
function getPlayerStartColliderModeDescription(mode) {
    switch (mode) {
        case "capsule":
            return "Uses a capsule player collider for standard grounded first-person traversal.";
        case "box":
            return "Uses an axis-aligned box player collider for sharper footprint bounds.";
        case "none":
            return "Disables player collision detection. First-person traversal continues without world clipping.";
    }
}
const STARTER_MATERIAL_ORDER = new Map(STARTER_MATERIAL_LIBRARY.map((material, index) => [material.id, index]));
const MIN_VIEWPORT_QUAD_SPLIT = 0.2;
const MAX_VIEWPORT_QUAD_SPLIT = 0.8;
function formatVec3(vector) {
    return `${vector.x}, ${vector.y}, ${vector.z}`;
}
function resolveOptionalPositiveNumber(value, fallback) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
function getWhiteboxInputStep(enabled, step) {
    return enabled ? step : "any";
}
function formatDiagnosticCount(count, label) {
    return `${count} ${label}${count === 1 ? "" : "s"}`;
}
function clampViewportQuadSplitValue(value) {
    return Math.min(MAX_VIEWPORT_QUAD_SPLIT, Math.max(MIN_VIEWPORT_QUAD_SPLIT, value));
}
function createViewportQuadPanelsStyle(viewportQuadSplit) {
    return {
        "--viewport-quad-split-x": String(viewportQuadSplit.x),
        "--viewport-quad-split-y": String(viewportQuadSplit.y)
    };
}
function getViewportQuadResizeCursor(resizeMode) {
    switch (resizeMode) {
        case "vertical":
            return "col-resize";
        case "horizontal":
            return "row-resize";
        case "center":
            return "move";
    }
}
function createVec2Draft(vector) {
    return {
        x: String(vector.x),
        y: String(vector.y)
    };
}
function createVec3Draft(vector) {
    return {
        x: String(vector.x),
        y: String(vector.y),
        z: String(vector.z)
    };
}
function readVec2Draft(draft, label) {
    const vector = {
        x: Number(draft.x),
        y: Number(draft.y)
    };
    if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
        throw new Error(`${label} values must be finite numbers.`);
    }
    return vector;
}
function readPositiveVec2Draft(draft, label) {
    const vector = readVec2Draft(draft, label);
    if (vector.x <= 0 || vector.y <= 0) {
        throw new Error(`${label} values must remain positive.`);
    }
    return vector;
}
function readPositiveVec3Draft(draft, label) {
    const vector = readVec3Draft(draft, label);
    if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
        throw new Error(`${label} values must remain positive.`);
    }
    return vector;
}
function readVec3Draft(draft, label) {
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
function readYawDegreesDraft(source) {
    const yawDegrees = Number(source);
    if (!Number.isFinite(yawDegrees)) {
        throw new Error("Player start yaw must be a finite number.");
    }
    return normalizeYawDegrees(yawDegrees);
}
function readInteractablePromptDraft(source) {
    return normalizeInteractablePrompt(source);
}
function readNonNegativeNumberDraft(source, label) {
    const value = Number(source);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${label} must be a finite number greater than or equal to zero.`);
    }
    return value;
}
function readFiniteNumberDraft(source, label) {
    const value = Number(source);
    if (!Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number.`);
    }
    return value;
}
function readPositiveIntegerDraft(source, label) {
    const value = Number(source);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
        throw new Error(`${label} must be a positive integer.`);
    }
    return value;
}
function readPositiveNumberDraft(source, label) {
    const value = Number(source);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${label} must be a finite number greater than zero.`);
    }
    return value;
}
function areVec2Equal(left, right) {
    return left.x === right.x && left.y === right.y;
}
function areVec3Equal(left, right) {
    return left.x === right.x && left.y === right.y && left.z === right.z;
}
function maybeSnapVec3(vector, enabled, step) {
    if (!enabled) {
        return vector;
    }
    return {
        x: Math.round(vector.x / step) * step,
        y: Math.round(vector.y / step) * step,
        z: Math.round(vector.z / step) * step
    };
}
function maybeSnapPositiveSize(size, enabled, step) {
    const clampComponent = (value) => Math.max(0.01, Math.abs(value));
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
function areFaceUvStatesEqual(left, right) {
    return (areVec2Equal(left.offset, right.offset) &&
        areVec2Equal(left.scale, right.scale) &&
        left.rotationQuarterTurns === right.rotationQuarterTurns &&
        left.flipU === right.flipU &&
        left.flipV === right.flipV);
}
function getSelectedBoxBrush(selection, brushes) {
    const selectedBrushId = getSingleSelectedBrushId(selection);
    if (selectedBrushId === null) {
        return null;
    }
    return brushes.find((brush) => brush.id === selectedBrushId) ?? null;
}
function getSelectedEntity(selection, entities) {
    const selectedEntityId = getSingleSelectedEntityId(selection);
    if (selectedEntityId === null) {
        return null;
    }
    return entities.find((entity) => entity.id === selectedEntityId) ?? null;
}
function getSelectedModelInstance(selection, modelInstances) {
    const selectedModelInstanceId = getSingleSelectedModelInstanceId(selection);
    if (selectedModelInstanceId === null) {
        return null;
    }
    return modelInstances.find((modelInstance) => modelInstance.id === selectedModelInstanceId) ?? null;
}
function isModelAsset(asset) {
    return asset.kind === "model";
}
function isImageAsset(asset) {
    return asset.kind === "image";
}
function isAudioAsset(asset) {
    return asset.kind === "audio";
}
function formatByteLength(byteLength) {
    if (byteLength < 1024) {
        return `${byteLength} B`;
    }
    const kilobytes = byteLength / 1024;
    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
    }
    return `${(kilobytes / 1024).toFixed(1)} MB`;
}
function formatModelBoundingBoxLabel(asset) {
    if (asset.metadata.boundingBox === null) {
        return "Bounds unavailable";
    }
    const { size } = asset.metadata.boundingBox;
    return `Bounds ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m`;
}
function formatModelAssetSummary(asset) {
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
function formatImageAssetSummary(asset) {
    const details = [
        `${asset.metadata.width} x ${asset.metadata.height}`,
        asset.metadata.hasAlpha ? "alpha" : "opaque",
        formatByteLength(asset.byteLength)
    ];
    return details.join(" | ");
}
function formatAudioAssetSummary(asset) {
    const details = [
        asset.metadata.durationSeconds === null ? "duration unavailable" : `${asset.metadata.durationSeconds.toFixed(2)}s`,
        asset.metadata.channelCount === null ? "channels unavailable" : `${asset.metadata.channelCount} channel${asset.metadata.channelCount === 1 ? "" : "s"}`,
        asset.metadata.sampleRateHz === null ? "sample rate unavailable" : `${asset.metadata.sampleRateHz} Hz`,
        formatByteLength(asset.byteLength)
    ];
    return details.join(" | ");
}
function formatAssetHoverStatus(asset) {
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
function getBrushLabel(brush, index) {
    return brush.name ?? `Whitebox Box ${index + 1}`;
}
function getBrushLabelById(brushId, brushes) {
    const brushIndex = brushes.findIndex((brush) => brush.id === brushId);
    return brushIndex === -1 ? "Whitebox Box" : getBrushLabel(brushes[brushIndex], brushIndex);
}
function getSelectedBrushLabel(selection, brushes) {
    const selectedBrushId = getSingleSelectedBrushId(selection);
    if (selectedBrushId === null) {
        return "No solid selected";
    }
    return getBrushLabelById(selectedBrushId, brushes);
}
function describeSelection(selection, brushes, modelInstances, assets, entities) {
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
function getWhiteboxSelectionModeStatus(mode) {
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
function getInteractionTriggerLabel(trigger) {
    switch (trigger) {
        case "enter":
            return "On Enter";
        case "exit":
            return "On Exit";
        case "click":
            return "On Click";
    }
}
function getInteractionActionLabel(link) {
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
function getVisibilityModeSelectValue(visible) {
    if (visible === true) {
        return "show";
    }
    if (visible === false) {
        return "hide";
    }
    return "toggle";
}
function readVisibilityModeSelectValue(value) {
    switch (value) {
        case "toggle":
            return undefined;
        case "show":
            return true;
        case "hide":
            return false;
    }
}
function getDefaultTriggerVolumeLinkTrigger(triggerOnEnter, triggerOnExit) {
    if (triggerOnEnter) {
        return "enter";
    }
    if (triggerOnExit) {
        return "exit";
    }
    return "enter";
}
function isInteractionSourceEntity(entity) {
    return entity !== null && (entity.kind === "triggerVolume" || entity.kind === "interactable");
}
function isSoundEmitterEntity(entity) {
    return entity !== null && entity.kind === "soundEmitter";
}
function getDefaultInteractionLinkTrigger(sourceEntity) {
    return sourceEntity.kind === "triggerVolume"
        ? getDefaultTriggerVolumeLinkTrigger(sourceEntity.triggerOnEnter, sourceEntity.triggerOnExit)
        : "click";
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "An unexpected error occurred.";
}
function isTextEntryTarget(target) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable);
}
function selectionCanBeDuplicated(selection) {
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
function isCommitIncrementKey(key) {
    return key === "ArrowUp" || key === "ArrowDown" || key === "PageUp" || key === "PageDown";
}
function blurActiveTextEntry() {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !isTextEntryTarget(activeElement)) {
        return;
    }
    activeElement.blur();
}
function sortDocumentMaterials(materials) {
    return Object.values(materials).sort((left, right) => {
        const leftStarterIndex = STARTER_MATERIAL_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightStarterIndex = STARTER_MATERIAL_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        if (leftStarterIndex !== rightStarterIndex) {
            return leftStarterIndex - rightStarterIndex;
        }
        return left.name.localeCompare(right.name);
    });
}
function getMaterialPreviewStyle(material) {
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
function rotateQuarterTurns(rotationQuarterTurns) {
    return ((rotationQuarterTurns + 1) % 4);
}
function getTransformOperationPastTense(operation) {
    switch (operation) {
        case "translate":
            return "Moved";
        case "rotate":
            return "Rotated";
        case "scale":
            return "Scaled";
    }
}
function getTransformOperationShortcut(operation) {
    switch (operation) {
        case "translate":
            return "G";
        case "rotate":
            return "R";
        case "scale":
            return "S";
    }
}
function formatRunnerFeetPosition(position) {
    if (position === null) {
        return "n/a";
    }
    return `${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`;
}
function formatWorldBackgroundLabel(world) {
    if (world.background.mode === "solid") {
        return "Solid";
    }
    if (world.background.mode === "verticalGradient") {
        return "Vertical Gradient";
    }
    return "Image";
}
function formatAdvancedRenderingShadowTypeLabel(type) {
    switch (type) {
        case "basic":
            return "Basic";
        case "pcf":
            return "PCF";
        case "pcfSoft":
            return "PCF Soft";
    }
}
function formatAdvancedRenderingToneMappingLabel(mode) {
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
export function App({ store, initialStatusMessage }) {
    const editorState = useEditorStoreState(store);
    const brushList = Object.values(editorState.document.brushes);
    const layoutMode = editorState.viewportLayoutMode;
    const activePanelId = editorState.activeViewportPanelId;
    const viewportToolPreview = editorState.viewportTransientState.toolPreview;
    const transformSession = editorState.viewportTransientState.transformSession;
    const entityList = getEntityInstances(editorState.document.entities);
    const entityDisplayList = getSortedEntityDisplayLabels(editorState.document.entities, editorState.document.assets);
    const primaryPlayerStart = getPrimaryPlayerStartEntity(editorState.document.entities);
    const materialList = sortDocumentMaterials(editorState.document.materials);
    const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);
    const selectedEntity = getSelectedEntity(editorState.selection, entityList);
    const selectedModelInstance = getSelectedModelInstance(editorState.selection, Object.values(editorState.document.modelInstances));
    const whiteboxSelectionMode = editorState.whiteboxSelectionMode;
    const selectedFaceId = getSelectedBrushFaceId(editorState.selection);
    const selectedEdgeId = getSelectedBrushEdgeId(editorState.selection);
    const selectedVertexId = getSelectedBrushVertexId(editorState.selection);
    const selectedFace = selectedBrush !== null && selectedFaceId !== null ? selectedBrush.faces[selectedFaceId] : null;
    const selectedFaceMaterial = selectedFace !== null && selectedFace.materialId !== null ? editorState.document.materials[selectedFace.materialId] ?? null : null;
    const selectedModelAsset = selectedModelInstance !== null ? (editorState.document.assets[selectedModelInstance.assetId] ?? null) : null;
    const selectedModelAssetRecord = selectedModelAsset !== null && selectedModelAsset.kind === "model" ? selectedModelAsset : null;
    const selectedPlayerStart = selectedEntity?.kind === "playerStart" ? selectedEntity : null;
    const selectedSoundEmitter = isSoundEmitterEntity(selectedEntity) ? selectedEntity : null;
    const selectedSoundEmitterAsset = selectedSoundEmitter === null
        ? null
        : selectedSoundEmitter.audioAssetId === null
            ? null
            : editorState.document.assets[selectedSoundEmitter.audioAssetId] ?? null;
    const selectedSoundEmitterAudioAssetRecord = selectedSoundEmitterAsset !== null && selectedSoundEmitterAsset.kind === "audio" ? selectedSoundEmitterAsset : null;
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
    const selectedTriggerVolumeLinks = selectedTriggerVolume === null
        ? []
        : getInteractionLinksForSource(editorState.document.interactionLinks, selectedTriggerVolume.id);
    const selectedInteractableLinks = selectedInteractable === null ? [] : getInteractionLinksForSource(editorState.document.interactionLinks, selectedInteractable.id);
    const teleportTargetOptions = entityDisplayList.filter(({ entity }) => entity.kind === "teleportTarget");
    const soundEmitterOptions = entityDisplayList.filter(({ entity }) => entity.kind === "soundEmitter");
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
    const [entityNameDraft, setEntityNameDraft] = useState("");
    const [modelInstanceNameDraft, setModelInstanceNameDraft] = useState("");
    const [positionDraft, setPositionDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
    const [rotationDraft, setRotationDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_ROTATION_DEGREES));
    const [sizeDraft, setSizeDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
    const [whiteboxSnapEnabled, setWhiteboxSnapEnabled] = useState(true);
    const [whiteboxSnapStepDraft, setWhiteboxSnapStepDraft] = useState(String(DEFAULT_GRID_SIZE));
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
    const [playerStartColliderModeDraft, setPlayerStartColliderModeDraft] = useState("capsule");
    const [playerStartEyeHeightDraft, setPlayerStartEyeHeightDraft] = useState(String(DEFAULT_PLAYER_START_EYE_HEIGHT));
    const [playerStartCapsuleRadiusDraft, setPlayerStartCapsuleRadiusDraft] = useState(String(DEFAULT_PLAYER_START_CAPSULE_RADIUS));
    const [playerStartCapsuleHeightDraft, setPlayerStartCapsuleHeightDraft] = useState(String(DEFAULT_PLAYER_START_CAPSULE_HEIGHT));
    const [playerStartBoxSizeDraft, setPlayerStartBoxSizeDraft] = useState(createVec3Draft(DEFAULT_PLAYER_START_BOX_SIZE));
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
    const [backgroundEnvironmentIntensityDraft, setBackgroundEnvironmentIntensityDraft] = useState(editorState.document.world.background.mode === "image" ? String(editorState.document.world.background.environmentIntensity) : "0.5");
    const [advancedRenderingShadowBiasDraft, setAdvancedRenderingShadowBiasDraft] = useState(String(editorState.document.world.advancedRendering.shadows.bias));
    const [advancedRenderingAmbientOcclusionIntensityDraft, setAdvancedRenderingAmbientOcclusionIntensityDraft] = useState(String(editorState.document.world.advancedRendering.ambientOcclusion.intensity));
    const [advancedRenderingAmbientOcclusionRadiusDraft, setAdvancedRenderingAmbientOcclusionRadiusDraft] = useState(String(editorState.document.world.advancedRendering.ambientOcclusion.radius));
    const [advancedRenderingAmbientOcclusionSamplesDraft, setAdvancedRenderingAmbientOcclusionSamplesDraft] = useState(String(editorState.document.world.advancedRendering.ambientOcclusion.samples));
    const [advancedRenderingBloomIntensityDraft, setAdvancedRenderingBloomIntensityDraft] = useState(String(editorState.document.world.advancedRendering.bloom.intensity));
    const [advancedRenderingBloomThresholdDraft, setAdvancedRenderingBloomThresholdDraft] = useState(String(editorState.document.world.advancedRendering.bloom.threshold));
    const [advancedRenderingBloomRadiusDraft, setAdvancedRenderingBloomRadiusDraft] = useState(String(editorState.document.world.advancedRendering.bloom.radius));
    const [advancedRenderingToneMappingExposureDraft, setAdvancedRenderingToneMappingExposureDraft] = useState(String(editorState.document.world.advancedRendering.toneMapping.exposure));
    const [advancedRenderingDepthOfFieldFocusDistanceDraft, setAdvancedRenderingDepthOfFieldFocusDistanceDraft] = useState(String(editorState.document.world.advancedRendering.depthOfField.focusDistance));
    const [advancedRenderingDepthOfFieldFocalLengthDraft, setAdvancedRenderingDepthOfFieldFocalLengthDraft] = useState(String(editorState.document.world.advancedRendering.depthOfField.focalLength));
    const [advancedRenderingDepthOfFieldBokehScaleDraft, setAdvancedRenderingDepthOfFieldBokehScaleDraft] = useState(String(editorState.document.world.advancedRendering.depthOfField.bokehScale));
    const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Slice 3.5 advanced rendering ready.");
    const [assetStatusMessage, setAssetStatusMessage] = useState(null);
    const [hoveredAssetId, setHoveredAssetId] = useState(null);
    const [hoveredViewportPanelId, setHoveredViewportPanelId] = useState(null);
    const [addMenuPosition, setAddMenuPosition] = useState(null);
    const [preferredNavigationMode, setPreferredNavigationMode] = useState(primaryPlayerStart === null ? "orbitVisitor" : "firstPerson");
    const [activeNavigationMode, setActiveNavigationMode] = useState(primaryPlayerStart === null ? "orbitVisitor" : "firstPerson");
    const [projectAssetStorage, setProjectAssetStorage] = useState(null);
    const [projectAssetStorageReady, setProjectAssetStorageReady] = useState(false);
    const [runtimeScene, setRuntimeScene] = useState(null);
    const [runtimeMessage, setRuntimeMessage] = useState(null);
    const [firstPersonTelemetry, setFirstPersonTelemetry] = useState(null);
    const [runtimeInteractionPrompt, setRuntimeInteractionPrompt] = useState(null);
    const [loadedModelAssets, setLoadedModelAssets] = useState({});
    const [loadedImageAssets, setLoadedImageAssets] = useState({});
    const [loadedAudioAssets, setLoadedAudioAssets] = useState({});
    const [focusRequest, setFocusRequest] = useState({
        id: 0,
        panelId: "topLeft",
        selection: {
            kind: "none"
        }
    });
    const importInputRef = useRef(null);
    const importModelInputRef = useRef(null);
    const importBackgroundImageInputRef = useRef(null);
    const importAudioInputRef = useRef(null);
    const viewportPanelsRef = useRef(null);
    const loadedModelAssetsRef = useRef({});
    const loadedImageAssetsRef = useRef({});
    const loadedAudioAssetsRef = useRef({});
    const viewportQuadSplitRef = useRef(editorState.viewportQuadSplit);
    const lastPointerPositionRef = useRef({
        x: Math.round(window.innerWidth * 0.5),
        y: Math.round(window.innerHeight * 0.5)
    });
    const [viewportQuadResizeMode, setViewportQuadResizeMode] = useState(null);
    const documentValidation = validateSceneDocument(editorState.document);
    const runValidation = validateRuntimeSceneBuild(editorState.document, {
        navigationMode: preferredNavigationMode,
        loadedModelAssets
    });
    const diagnostics = [...documentValidation.errors, ...documentValidation.warnings, ...runValidation.errors, ...runValidation.warnings];
    const blockingDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    const warningDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
    const documentStatusLabel = documentValidation.errors.length === 0 ? "Valid" : formatDiagnosticCount(documentValidation.errors.length, "error");
    const lastCommandLabel = editorState.lastCommandLabel ?? "No commands yet";
    const runReadyLabel = blockingDiagnostics.length > 0
        ? "Blocked"
        : preferredNavigationMode === "firstPerson"
            ? "Ready for First Person"
            : "Ready for Orbit Visitor";
    const advancedRendering = editorState.document.world.advancedRendering;
    const hoveredAsset = hoveredAssetId === null ? null : editorState.document.assets[hoveredAssetId] ?? null;
    const hoveredAssetStatusMessage = hoveredAsset === null ? null : formatAssetHoverStatus(hoveredAsset);
    const selectedTransformTarget = resolveTransformTarget(editorState.document, editorState.selection, whiteboxSelectionMode).target;
    const canTranslateSelectedTarget = selectedTransformTarget !== null && supportsTransformOperation(selectedTransformTarget, "translate");
    const canRotateSelectedTarget = selectedTransformTarget !== null && supportsTransformOperation(selectedTransformTarget, "rotate");
    const canScaleSelectedTarget = selectedTransformTarget !== null && supportsTransformOperation(selectedTransformTarget, "scale");
    const whiteboxSnapStep = resolveOptionalPositiveNumber(whiteboxSnapStepDraft, DEFAULT_GRID_SIZE);
    const whiteboxVectorInputStep = getWhiteboxInputStep(whiteboxSnapEnabled, whiteboxSnapStep);
    useEffect(() => {
        setSceneNameDraft(editorState.document.name);
    }, [editorState.document.name]);
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
            return;
        }
        setPositionDraft(createVec3Draft(selectedBrush.center));
        setRotationDraft(createVec3Draft(selectedBrush.rotationDegrees));
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
            setPlayerStartColliderModeDraft("capsule");
            setPlayerStartEyeHeightDraft(String(DEFAULT_PLAYER_START_EYE_HEIGHT));
            setPlayerStartCapsuleRadiusDraft(String(DEFAULT_PLAYER_START_CAPSULE_RADIUS));
            setPlayerStartCapsuleHeightDraft(String(DEFAULT_PLAYER_START_CAPSULE_HEIGHT));
            setPlayerStartBoxSizeDraft(createVec3Draft(DEFAULT_PLAYER_START_BOX_SIZE));
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
                setPlayerStartColliderModeDraft(selectedEntity.collider.mode);
                setPlayerStartEyeHeightDraft(String(selectedEntity.collider.eyeHeight));
                setPlayerStartCapsuleRadiusDraft(String(selectedEntity.collider.capsuleRadius));
                setPlayerStartCapsuleHeightDraft(String(selectedEntity.collider.capsuleHeight));
                setPlayerStartBoxSizeDraft(createVec3Draft(selectedEntity.collider.boxSize));
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
        const advancedRendering = editorState.document.world.advancedRendering;
        setAdvancedRenderingShadowBiasDraft(String(advancedRendering.shadows.bias));
        setAdvancedRenderingAmbientOcclusionIntensityDraft(String(advancedRendering.ambientOcclusion.intensity));
        setAdvancedRenderingAmbientOcclusionRadiusDraft(String(advancedRendering.ambientOcclusion.radius));
        setAdvancedRenderingAmbientOcclusionSamplesDraft(String(advancedRendering.ambientOcclusion.samples));
        setAdvancedRenderingBloomIntensityDraft(String(advancedRendering.bloom.intensity));
        setAdvancedRenderingBloomThresholdDraft(String(advancedRendering.bloom.threshold));
        setAdvancedRenderingBloomRadiusDraft(String(advancedRendering.bloom.radius));
        setAdvancedRenderingToneMappingExposureDraft(String(advancedRendering.toneMapping.exposure));
        setAdvancedRenderingDepthOfFieldFocusDistanceDraft(String(advancedRendering.depthOfField.focusDistance));
        setAdvancedRenderingDepthOfFieldFocalLengthDraft(String(advancedRendering.depthOfField.focalLength));
        setAdvancedRenderingDepthOfFieldBokehScaleDraft(String(advancedRendering.depthOfField.bokehScale));
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
        const nextLoadedModelAssets = {};
        const nextLoadedImageAssets = {};
        const nextLoadedAudioAssets = {};
        const syncErrorMessages = [];
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
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
        const handleWindowPointerMove = (event) => {
            lastPointerPositionRef.current = {
                x: event.clientX,
                y: event.clientY
            };
            const hoveredViewportPanelElement = event.target instanceof Element ? event.target.closest("[data-viewport-panel-id]") : null;
            const hoveredPanelId = hoveredViewportPanelElement?.dataset.viewportPanelId;
            setHoveredViewportPanelId(hoveredPanelId === "topLeft" || hoveredPanelId === "topRight" || hoveredPanelId === "bottomLeft" || hoveredPanelId === "bottomRight"
                ? hoveredPanelId
                : null);
        };
        const handleWindowKeyDown = (event) => {
            if (isTextEntryTarget(event.target)) {
                return;
            }
            const hasPrimaryModifier = (event.metaKey || event.ctrlKey) && !event.altKey;
            if (hasPrimaryModifier && event.code === "KeyR" && !event.shiftKey) {
                event.preventDefault();
                handleEnterPlayMode();
                return;
            }
            if (hasPrimaryModifier && event.code === "KeyS" && !event.shiftKey) {
                event.preventDefault();
                handleSaveDraft();
                return;
            }
            if (hasPrimaryModifier && event.code === "KeyZ") {
                event.preventDefault();
                if (event.shiftKey) {
                    if (store.redo()) {
                        setStatusMessage("Redid the last action.");
                    }
                    else {
                        setStatusMessage("Nothing to redo.");
                    }
                }
                else if (store.undo()) {
                    setStatusMessage("Undid the last action.");
                }
                else {
                    setStatusMessage("Nothing to undo.");
                }
                return;
            }
            if (hasPrimaryModifier && event.code === "KeyY") {
                event.preventDefault();
                if (store.redo()) {
                    setStatusMessage("Redid the last action.");
                }
                else {
                    setStatusMessage("Nothing to redo.");
                }
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
                let transformOperation = null;
                if (event.code === "KeyG") {
                    transformOperation = "translate";
                }
                else if (event.code === "KeyR") {
                    transformOperation = "rotate";
                }
                else if (event.code === "KeyS") {
                    transformOperation = "scale";
                }
                if (transformOperation !== null) {
                    event.preventDefault();
                    beginTransformOperation(transformOperation, "keyboard");
                    return;
                }
            }
            const isDeletionKey = event.key === "Delete" || event.key === "Backspace";
            const isDeleteShortcut = !event.altKey && !event.ctrlKey && !event.metaKey && (event.code === "KeyX" || isDeletionKey);
            if (addMenuPosition !== null) {
                if (isDeletionKey) {
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
                }
                else if (isDeletionKey) {
                    event.preventDefault();
                }
                return;
            }
            if (event.code !== "NumpadComma" &&
                !(event.key === "," && event.location === globalThis.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD)) {
                return;
            }
            event.preventDefault();
            if (editorState.selection.kind === "none" && brushList.length === 0 && entityList.length === 0) {
                setStatusMessage("Nothing authored yet to frame in the viewport.");
                return;
            }
            setFocusRequest((current) => ({
                id: current.id + 1,
                panelId: activePanelId,
                selection: editorState.selection
            }));
            setStatusMessage(editorState.selection.kind === "none" ? "Framed the authored scene in the viewport." : "Framed the current selection.");
        };
        document.addEventListener("pointermove", handleWindowPointerMove);
        window.addEventListener("pointermove", handleWindowPointerMove);
        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            document.removeEventListener("pointermove", handleWindowPointerMove);
            window.removeEventListener("pointermove", handleWindowPointerMove);
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, [activePanelId, addMenuPosition, brushList.length, editorState.selection, editorState.toolMode, entityList.length, hoveredViewportPanelId, layoutMode, transformSession]);
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
        document.body.style.cursor = getViewportQuadResizeCursor(viewportQuadResizeMode);
        document.body.style.userSelect = "none";
        const handlePointerMove = (event) => {
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
                nextViewportQuadSplit.x = clampViewportQuadSplitValue((event.clientX - rect.left) / rect.width);
            }
            if (viewportQuadResizeMode !== "vertical") {
                nextViewportQuadSplit.y = clampViewportQuadSplitValue((event.clientY - rect.top) / rect.height);
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
        const handleWindowKeyDown = (event) => {
            if (isTextEntryTarget(event.target)) {
                return;
            }
            if (event.key !== "Escape") {
                return;
            }
            const pointerCaptured = activeNavigationMode === "firstPerson" && firstPersonTelemetry?.pointerLocked === true;
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
    const applySceneName = () => {
        const normalizedName = sceneNameDraft.trim() || "Untitled Scene";
        if (normalizedName === editorState.document.name) {
            return;
        }
        store.executeCommand(createSetSceneNameCommand(normalizedName));
        setStatusMessage(`Scene renamed to ${normalizedName}.`);
    };
    const requestViewportFocus = (selection, status) => {
        setFocusRequest((current) => ({
            id: current.id + 1,
            panelId: activePanelId,
            selection
        }));
        if (status !== undefined) {
            setStatusMessage(status);
        }
    };
    const openAddMenuAt = (position) => {
        setHoveredAssetId(null);
        setAddMenuPosition(position);
    };
    const closeAddMenu = () => {
        setHoveredAssetId(null);
        setAddMenuPosition(null);
    };
    const handleOpenAddMenuFromButton = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        openAddMenuAt({
            x: rect.left,
            y: rect.bottom + 8
        });
    };
    const handleSetViewportLayoutMode = (nextLayoutMode) => {
        if (editorState.viewportLayoutMode === nextLayoutMode) {
            return;
        }
        blurActiveTextEntry();
        store.setViewportLayoutMode(nextLayoutMode);
        setStatusMessage(`Switched the viewport to ${getViewportLayoutModeLabel(nextLayoutMode)}.`);
    };
    const handleActivateViewportPanel = (panelId) => {
        if (editorState.activeViewportPanelId === panelId) {
            return;
        }
        blurActiveTextEntry();
        store.setActiveViewportPanel(panelId);
        setStatusMessage("Activated the viewport panel.");
    };
    const handleSetViewportPanelViewMode = (panelId, nextViewMode) => {
        if (editorState.viewportPanels[panelId].viewMode === nextViewMode) {
            return;
        }
        blurActiveTextEntry();
        store.setViewportPanelViewMode(panelId, nextViewMode);
        setStatusMessage(`Set the viewport panel to ${getViewportViewModeLabel(nextViewMode)} view.`);
    };
    const handleSetViewportPanelDisplayMode = (panelId, nextDisplayMode) => {
        if (editorState.viewportPanels[panelId].displayMode === nextDisplayMode) {
            return;
        }
        blurActiveTextEntry();
        store.setViewportPanelDisplayMode(panelId, nextDisplayMode);
        setStatusMessage(`Set the viewport panel to ${getViewportDisplayModeLabel(nextDisplayMode)} display.`);
    };
    const beginTransformOperation = (operation, source) => {
        if (editorState.toolMode !== "select") {
            return;
        }
        const transformSourcePanelId = layoutMode === "quad" ? hoveredViewportPanelId ?? activePanelId : activePanelId;
        const transformTargetResult = resolveTransformTarget(editorState.document, editorState.selection, whiteboxSelectionMode);
        const transformTarget = transformTargetResult.target;
        if (transformTarget === null) {
            setStatusMessage(transformTargetResult.message ?? "Select a single brush, entity, or model instance before transforming it.");
            return;
        }
        if (!supportsTransformOperation(transformTarget, operation)) {
            setStatusMessage(`${getTransformOperationLabel(operation)} is not supported for ${getTransformTargetLabel(transformTarget)}.`);
            return;
        }
        blurActiveTextEntry();
        closeAddMenu();
        if (editorState.activeViewportPanelId !== transformSourcePanelId) {
            store.setActiveViewportPanel(transformSourcePanelId);
        }
        store.setTransformSession(createTransformSession({
            source,
            sourcePanelId: transformSourcePanelId,
            operation,
            target: transformTarget
        }));
        setStatusMessage(`${getTransformOperationLabel(operation)} ${getTransformTargetLabel(transformTarget).toLowerCase()} in ${getViewportPanelLabel(transformSourcePanelId)}. Move the pointer, press X/Y/Z to constrain, click or press Enter to commit, Escape cancels.`);
    };
    const cancelTransformSession = (status = "Cancelled the current transform.") => {
        if (transformSession.kind === "none") {
            return;
        }
        store.clearTransformSession();
        setStatusMessage(status);
    };
    const commitTransformSession = (activeTransformSession) => {
        if (!doesTransformSessionChangeTarget(activeTransformSession)) {
            store.clearTransformSession();
            setStatusMessage("No transform change was committed.");
            return;
        }
        try {
            store.clearTransformSession();
            store.executeCommand(createCommitTransformSessionCommand(editorState.document, activeTransformSession));
            setStatusMessage(`${getTransformOperationPastTense(activeTransformSession.operation)} ${getTransformTargetLabel(activeTransformSession.target).toLowerCase()}.`);
        }
        catch (error) {
            store.clearTransformSession();
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyTransformAxisConstraint = (axis) => {
        if (transformSession.kind !== "active") {
            return;
        }
        if (!supportsTransformAxisConstraint(transformSession, axis)) {
            const supportedAxes = ["x", "y", "z"]
                .filter((candidateAxis) => supportsTransformAxisConstraint(transformSession, candidateAxis))
                .map((candidateAxis) => candidateAxis.toUpperCase())
                .join("/");
            setStatusMessage(supportedAxes.length === 0
                ? `${getTransformOperationLabel(transformSession.operation)} does not support axis constraints for ${getTransformTargetLabel(transformSession.target)}.`
                : `${getTransformOperationLabel(transformSession.operation)} on ${getTransformTargetLabel(transformSession.target)} only supports ${supportedAxes}.`);
            return;
        }
        store.setTransformAxisConstraint(axis);
        setStatusMessage(`Constrained ${getTransformOperationLabel(transformSession.operation).toLowerCase()} to ${axis.toUpperCase()}.`);
    };
    const handleViewportQuadResizeStart = (resizeMode) => (event) => {
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
                nextViewportQuadSplit.x = clampViewportQuadSplitValue((event.clientX - rect.left) / rect.width);
            }
            if (resizeMode !== "vertical") {
                nextViewportQuadSplit.y = clampViewportQuadSplitValue((event.clientY - rect.top) / rect.height);
            }
            store.setViewportQuadSplit(nextViewportQuadSplit);
        }
        setViewportQuadResizeMode(resizeMode);
    };
    const beginCreation = (toolPreview, status) => {
        blurActiveTextEntry();
        closeAddMenu();
        store.setToolMode("create");
        store.setViewportToolPreview(toolPreview);
        setStatusMessage(status);
    };
    const completeCreation = (status) => {
        store.setToolMode("select");
        store.clearViewportToolPreview();
        setStatusMessage(status);
    };
    const beginBoxCreation = () => {
        beginCreation({
            kind: "create",
            sourcePanelId: activePanelId,
            target: {
                kind: "box-brush"
            },
            center: null
        }, `Previewing a whitebox box. Click in the viewport to create it${whiteboxSnapEnabled ? ` on the ${whiteboxSnapStep}m grid` : ""}.`);
    };
    const handleWhiteboxSnapToggle = () => {
        const nextEnabled = !whiteboxSnapEnabled;
        setWhiteboxSnapEnabled(nextEnabled);
        setStatusMessage(nextEnabled ? `Grid snap enabled at ${whiteboxSnapStep}m.` : "Grid snap disabled for whitebox transforms.");
    };
    const handleWhiteboxSnapStepBlur = () => {
        const normalizedStep = resolveOptionalPositiveNumber(whiteboxSnapStepDraft, DEFAULT_GRID_SIZE);
        setWhiteboxSnapStepDraft(String(normalizedStep));
    };
    const handleWhiteboxSelectionModeChange = (mode) => {
        if (whiteboxSelectionMode === mode) {
            return;
        }
        blurActiveTextEntry();
        store.setWhiteboxSelectionMode(mode);
        setStatusMessage(getWhiteboxSelectionModeStatus(mode));
    };
    const applySelection = (selection, source, options = {}) => {
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
                setStatusMessage(`Selected ${BOX_FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`);
                break;
            case "brushEdge":
                setStatusMessage(`Selected ${BOX_EDGE_LABELS[selection.edgeId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`);
                break;
            case "brushVertex":
                setStatusMessage(`Selected ${BOX_VERTEX_LABELS[selection.vertexId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}${suffix}.`);
                break;
            case "entities":
                setStatusMessage(`Selected ${getEntityDisplayLabelById(selection.ids[0], editorState.document.entities, editorState.document.assets)} from the ${source}${suffix}.`);
                break;
            case "modelInstances":
                setStatusMessage(`Selected ${getModelInstanceDisplayLabelById(selection.ids[0], editorState.document.modelInstances, editorState.document.assets)} from the ${source}${suffix}.`);
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
        if (selectedBrush === null || editorState.selection.kind !== "brushes" || whiteboxSelectionMode !== "object") {
            setStatusMessage("Switch to Object mode and select a whitebox box before moving it.");
            return;
        }
        try {
            const nextCenter = maybeSnapVec3(readVec3Draft(positionDraft, "Whitebox box position"), whiteboxSnapEnabled, whiteboxSnapStep);
            if (areVec3Equal(nextCenter, selectedBrush.center)) {
                return;
            }
            store.executeCommand(createMoveBoxBrushCommand({
                brushId: selectedBrush.id,
                center: nextCenter,
                snapToGrid: false
            }));
            setStatusMessage("Moved selected whitebox box.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyRotationChange = () => {
        if (selectedBrush === null || editorState.selection.kind !== "brushes" || whiteboxSelectionMode !== "object") {
            setStatusMessage("Switch to Object mode and select a whitebox box before rotating it.");
            return;
        }
        try {
            const nextRotationDegrees = readVec3Draft(rotationDraft, "Whitebox box rotation");
            if (areVec3Equal(nextRotationDegrees, selectedBrush.rotationDegrees)) {
                return;
            }
            store.executeCommand(createRotateBoxBrushCommand({
                brushId: selectedBrush.id,
                rotationDegrees: nextRotationDegrees
            }));
            setStatusMessage("Rotated selected whitebox box.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applySizeChange = () => {
        if (selectedBrush === null || editorState.selection.kind !== "brushes" || whiteboxSelectionMode !== "object") {
            setStatusMessage("Switch to Object mode and select a whitebox box before scaling it.");
            return;
        }
        try {
            const nextSize = maybeSnapPositiveSize(readVec3Draft(sizeDraft, "Whitebox box size"), whiteboxSnapEnabled, whiteboxSnapStep);
            if (areVec3Equal(nextSize, selectedBrush.size)) {
                return;
            }
            store.executeCommand(createResizeBoxBrushCommand({
                brushId: selectedBrush.id,
                size: nextSize,
                snapToGrid: false
            }));
            setStatusMessage("Scaled selected whitebox box.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const commitEntityChange = (currentEntity, nextEntity, successMessage) => {
        if (areEntityInstancesEqual(currentEntity, nextEntity)) {
            return;
        }
        store.executeCommand(createUpsertEntityCommand({
            entity: nextEntity,
            label: `Update ${getEntityKindLabel(nextEntity.kind).toLowerCase()}`
        }));
        setStatusMessage(successMessage);
    };
    const beginEntityCreation = (kind, options = {}) => {
        beginCreation({
            kind: "create",
            sourcePanelId: activePanelId,
            target: {
                kind: "entity",
                entityKind: kind,
                audioAssetId: options.audioAssetId ?? null
            },
            center: null
        }, `Previewing ${getEntityKindLabel(kind)}. Click in the viewport to place it.`);
    };
    const beginModelInstanceCreation = (assetId) => {
        const asset = editorState.document.assets[assetId];
        if (asset === undefined || asset.kind !== "model") {
            setStatusMessage("Select a model asset before placing a model instance.");
            return;
        }
        beginCreation({
            kind: "create",
            sourcePanelId: activePanelId,
            target: {
                kind: "model-instance",
                assetId: asset.id
            },
            center: null
        }, `Previewing ${asset.sourceName}. Click in the viewport to place it.`);
    };
    const handleCommitCreation = (creationPreview) => {
        try {
            if (creationPreview.target.kind === "box-brush") {
                const center = creationPreview.center === null ? undefined : creationPreview.center;
                store.executeCommand(createCreateBoxBrushCommand(center === undefined
                    ? {
                        snapToGrid: whiteboxSnapEnabled,
                        gridSize: whiteboxSnapStep
                    }
                    : {
                        center,
                        snapToGrid: whiteboxSnapEnabled,
                        gridSize: whiteboxSnapStep
                    }));
                completeCreation(center === undefined
                    ? whiteboxSnapEnabled
                        ? `Created a whitebox box on the ${whiteboxSnapStep}m grid.`
                        : "Created a whitebox box."
                    : whiteboxSnapEnabled
                        ? `Created a whitebox box at snapped center ${formatVec3(center)}.`
                        : `Created a whitebox box at ${formatVec3(center)}.`);
                return true;
            }
            if (creationPreview.target.kind === "model-instance") {
                const asset = editorState.document.assets[creationPreview.target.assetId];
                if (asset === undefined || asset.kind !== "model") {
                    setStatusMessage("Select a model asset before placing a model instance.");
                    return false;
                }
                const nextModelInstance = createModelInstance({
                    assetId: asset.id,
                    position: creationPreview.center === null ? createModelInstancePlacementPosition(asset, null) : creationPreview.center,
                    rotationDegrees: DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES,
                    scale: DEFAULT_MODEL_INSTANCE_SCALE
                });
                store.executeCommand(createUpsertModelInstanceCommand({
                    modelInstance: nextModelInstance,
                    label: `Place ${asset.sourceName}`
                }));
                completeCreation(`Placed ${asset.sourceName}.`);
                return true;
            }
            const position = creationPreview.center ?? DEFAULT_ENTITY_POSITION;
            switch (creationPreview.target.entityKind) {
                case "pointLight":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createPointLightEntity({
                            position
                        }),
                        label: "Place point light"
                    }));
                    completeCreation("Placed Point Light.");
                    return true;
                case "spotLight":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createSpotLightEntity({
                            position
                        }),
                        label: "Place spot light"
                    }));
                    completeCreation("Placed Spot Light.");
                    return true;
                case "playerStart":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createPlayerStartEntity({
                            position
                        }),
                        label: "Place player start"
                    }));
                    completeCreation("Placed Player Start.");
                    return true;
                case "soundEmitter": {
                    const placedAudioAssetId = creationPreview.target.audioAssetId ?? audioAssetList[0]?.id ?? null;
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createSoundEmitterEntity({
                            position,
                            audioAssetId: placedAudioAssetId
                        }),
                        label: "Place sound emitter"
                    }));
                    completeCreation(placedAudioAssetId === null
                        ? "Placed Sound Emitter."
                        : `Placed Sound Emitter using ${editorState.document.assets[placedAudioAssetId]?.sourceName ?? "the authored audio asset"}.`);
                    return true;
                }
                case "triggerVolume":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createTriggerVolumeEntity({
                            position
                        }),
                        label: "Place trigger volume"
                    }));
                    completeCreation("Placed Trigger Volume.");
                    return true;
                case "teleportTarget":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createTeleportTargetEntity({
                            position
                        }),
                        label: "Place teleport target"
                    }));
                    completeCreation("Placed Teleport Target.");
                    return true;
                case "interactable":
                    store.executeCommand(createUpsertEntityCommand({
                        entity: createInteractableEntity({
                            position
                        }),
                        label: "Place interactable"
                    }));
                    completeCreation("Placed Interactable.");
                    return true;
            }
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
        return false;
    };
    const commitModelInstanceChange = (currentModelInstance, nextModelInstance, successMessage) => {
        if (areModelInstancesEqual(currentModelInstance, nextModelInstance)) {
            return;
        }
        store.executeCommand(createUpsertModelInstanceCommand({
            modelInstance: nextModelInstance,
            label: `Update ${getModelInstanceDisplayLabelById(currentModelInstance.id, editorState.document.modelInstances, editorState.document.assets).toLowerCase()}`
        }));
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
                rotationDegrees: readVec3Draft(modelRotationDraft, "Model instance rotation"),
                scale: readPositiveVec3Draft(modelScaleDraft, "Model instance scale"),
                animationClipName: selectedModelInstance.animationClipName,
                animationAutoplay: selectedModelInstance.animationAutoplay
            });
            commitModelInstanceChange(selectedModelInstance, nextModelInstance, "Updated model instance.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyPlayerStartChange = (overrides = {}) => {
        if (selectedPlayerStart === null) {
            setStatusMessage("Select a Player Start before editing it.");
            return;
        }
        try {
            const snappedPosition = snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Player Start position"), DEFAULT_GRID_SIZE);
            const yawDegrees = readYawDegreesDraft(playerStartYawDraft);
            const colliderMode = overrides.colliderMode ?? playerStartColliderModeDraft;
            const nextEntity = createPlayerStartEntity({
                id: selectedPlayerStart.id,
                name: selectedPlayerStart.name,
                position: snappedPosition,
                yawDegrees,
                collider: {
                    mode: colliderMode,
                    eyeHeight: readPositiveNumberDraft(playerStartEyeHeightDraft, "Player Start eye height"),
                    capsuleRadius: readPositiveNumberDraft(playerStartCapsuleRadiusDraft, "Player Start capsule radius"),
                    capsuleHeight: readPositiveNumberDraft(playerStartCapsuleHeightDraft, "Player Start capsule height"),
                    boxSize: readPositiveVec3Draft(playerStartBoxSizeDraft, "Player Start box size")
                }
            });
            commitEntityChange(selectedPlayerStart, nextEntity, "Updated Player Start.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyPointLightChange = (overrides = {}) => {
        if (selectedPointLight === null) {
            setStatusMessage("Select a Point Light before editing it.");
            return;
        }
        try {
            const nextEntity = createPointLightEntity({
                id: selectedPointLight.id,
                name: selectedPointLight.name,
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Point Light position"), DEFAULT_GRID_SIZE),
                colorHex: overrides.colorHex ?? pointLightColorDraft,
                intensity: readNonNegativeNumberDraft(pointLightIntensityDraft, "Point Light intensity"),
                distance: readPositiveNumberDraft(pointLightDistanceDraft, "Point Light distance")
            });
            commitEntityChange(selectedPointLight, nextEntity, "Updated Point Light.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applySpotLightChange = (overrides = {}) => {
        if (selectedSpotLight === null) {
            setStatusMessage("Select a Spot Light before editing it.");
            return;
        }
        try {
            const nextEntity = createSpotLightEntity({
                id: selectedSpotLight.id,
                name: selectedSpotLight.name,
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Spot Light position"), DEFAULT_GRID_SIZE),
                direction: readVec3Draft(spotLightDirectionDraft, "Spot Light direction"),
                colorHex: overrides.colorHex ?? spotLightColorDraft,
                intensity: readNonNegativeNumberDraft(spotLightIntensityDraft, "Spot Light intensity"),
                distance: readPositiveNumberDraft(spotLightDistanceDraft, "Spot Light distance"),
                angleDegrees: readPositiveNumberDraft(spotLightAngleDraft, "Spot Light angle")
            });
            commitEntityChange(selectedSpotLight, nextEntity, "Updated Spot Light.");
        }
        catch (error) {
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
    const applySoundEmitterChange = (overrides = {}) => {
        if (selectedSoundEmitter === null) {
            setStatusMessage("Select a Sound Emitter before editing it.");
            return;
        }
        try {
            const trimmedAudioAssetId = soundEmitterAudioAssetIdDraft.trim();
            const nextAudioAssetId = overrides.audioAssetId !== undefined
                ? overrides.audioAssetId
                : trimmedAudioAssetId.length === 0
                    ? null
                    : trimmedAudioAssetId;
            const nextEntity = createSoundEmitterEntity({
                id: selectedSoundEmitter.id,
                name: selectedSoundEmitter.name,
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Sound Emitter position"), DEFAULT_GRID_SIZE),
                audioAssetId: nextAudioAssetId,
                volume: readNonNegativeNumberDraft(soundEmitterVolumeDraft, "Sound Emitter volume"),
                refDistance: readPositiveNumberDraft(soundEmitterRefDistanceDraft, "Sound Emitter ref distance"),
                maxDistance: readPositiveNumberDraft(soundEmitterMaxDistanceDraft, "Sound Emitter max distance"),
                autoplay: overrides.autoplay ?? soundEmitterAutoplayDraft,
                loop: overrides.loop ?? soundEmitterLoopDraft
            });
            commitEntityChange(selectedSoundEmitter, nextEntity, "Updated Sound Emitter.");
        }
        catch (error) {
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
                name: selectedTriggerVolume.name,
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Trigger Volume position"), DEFAULT_GRID_SIZE),
                size: snapPositiveSizeToGrid(readVec3Draft(triggerVolumeSizeDraft, "Trigger Volume size"), DEFAULT_GRID_SIZE),
                triggerOnEnter,
                triggerOnExit
            });
            commitEntityChange(selectedTriggerVolume, nextEntity, "Updated Trigger Volume.");
        }
        catch (error) {
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
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Teleport Target position"), DEFAULT_GRID_SIZE),
                yawDegrees: readYawDegreesDraft(teleportTargetYawDraft)
            });
            commitEntityChange(selectedTeleportTarget, nextEntity, "Updated Teleport Target.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyInteractableChange = (overrides = {}) => {
        if (selectedInteractable === null) {
            setStatusMessage("Select an Interactable before editing it.");
            return;
        }
        try {
            const nextEntity = createInteractableEntity({
                id: selectedInteractable.id,
                name: selectedInteractable.name,
                position: snapVec3ToGrid(readVec3Draft(entityPositionDraft, "Interactable position"), DEFAULT_GRID_SIZE),
                radius: readPositiveNumberDraft(interactableRadiusDraft, "Interactable radius"),
                prompt: readInteractablePromptDraft(interactablePromptDraft),
                enabled: overrides.enabled ?? interactableEnabledDraft
            });
            commitEntityChange(selectedInteractable, nextEntity, "Updated Interactable.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const commitInteractionLinkChange = (currentLink, nextLink, successMessage, label = "Update interaction link") => {
        if (areInteractionLinksEqual(currentLink, nextLink)) {
            return;
        }
        store.executeCommand(createUpsertInteractionLinkCommand({
            link: nextLink,
            label
        }));
        setStatusMessage(successMessage);
    };
    const getInteractionSourceEntityForLink = (link) => {
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
        store.executeCommand(createUpsertInteractionLinkCommand({
            link: createTeleportPlayerInteractionLink({
                sourceEntityId: selectedInteractionSource.id,
                trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
                targetEntityId: defaultTarget.id
            }),
            label: "Add teleport interaction link"
        }));
        setStatusMessage(`Added a teleport link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`);
    };
    const handleAddVisibilityInteractionLink = () => {
        if (selectedInteractionSource === null) {
            setStatusMessage("Select a Trigger Volume or Interactable before adding links.");
            return;
        }
        const defaultTarget = visibilityBrushOptions[0]?.brush;
        if (defaultTarget === undefined) {
            setStatusMessage("Author at least one whitebox solid before adding a visibility link.");
            return;
        }
        store.executeCommand(createUpsertInteractionLinkCommand({
            link: createToggleVisibilityInteractionLink({
                sourceEntityId: selectedInteractionSource.id,
                trigger: getDefaultInteractionLinkTrigger(selectedInteractionSource),
                targetBrushId: defaultTarget.id
            }),
            label: "Add visibility interaction link"
        }));
        setStatusMessage(`Added a visibility link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`);
    };
    const handleAddSoundInteractionLink = (actionType) => {
        if (selectedInteractionSource === null) {
            setStatusMessage("Select a Trigger Volume or Interactable before adding links.");
            return;
        }
        const defaultTarget = playableSoundEmitterOptions[0]?.entity;
        if (defaultTarget === undefined) {
            setStatusMessage("Author a Sound Emitter with an audio asset before adding sound links.");
            return;
        }
        const link = actionType === "playSound"
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
        store.executeCommand(createUpsertInteractionLinkCommand({
            link,
            label: actionType === "playSound" ? "Add play sound link" : "Add stop sound link"
        }));
        setStatusMessage(`Added a ${actionType === "playSound" ? "play sound" : "stop sound"} link to the selected ${selectedInteractionSource.kind === "triggerVolume" ? "Trigger Volume" : "Interactable"}.`);
    };
    const handleDeleteInteractionLink = (linkId) => {
        try {
            store.executeCommand(createDeleteInteractionLinkCommand(linkId));
            setStatusMessage("Deleted interaction link.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const confirmDeleteSceneItem = (label) => globalThis.window.confirm(`Delete ${label}?\n\nThis can be undone with Undo.`);
    const handleDeleteBrush = (brushId) => {
        const label = getBrushLabelById(brushId, brushList);
        if (!confirmDeleteSceneItem(label)) {
            return false;
        }
        try {
            store.executeCommand(createDeleteBoxBrushCommand(brushId));
            setStatusMessage(`Deleted ${label}.`);
            return true;
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
            return false;
        }
    };
    const handleDeleteEntity = (entityId) => {
        const label = getEntityDisplayLabelById(entityId, editorState.document.entities, editorState.document.assets);
        if (!confirmDeleteSceneItem(label)) {
            return false;
        }
        try {
            store.executeCommand(createDeleteEntityCommand(entityId));
            setStatusMessage(`Deleted ${label}.`);
            return true;
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
            return false;
        }
    };
    const handleDeleteModelInstance = (modelInstanceId) => {
        const label = getModelInstanceDisplayLabelById(modelInstanceId, editorState.document.modelInstances, editorState.document.assets);
        if (!confirmDeleteSceneItem(label)) {
            return false;
        }
        try {
            store.executeCommand(createDeleteModelInstanceCommand(modelInstanceId));
            setStatusMessage(`Deleted ${label}.`);
            return true;
        }
        catch (error) {
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
        const selectedModelInstanceId = getSingleSelectedModelInstanceId(editorState.selection);
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
            setStatusMessage("Duplicated selection.");
            return true;
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
            return false;
        }
    };
    const updateInteractionLinkTrigger = (link, trigger) => {
        const sourceEntity = getInteractionSourceEntityForLink(link);
        if (sourceEntity?.kind === "interactable" && trigger !== "click") {
            setStatusMessage("Interactable links always use the click trigger.");
            return;
        }
        if (sourceEntity?.kind === "triggerVolume" && trigger === "click") {
            setStatusMessage("Trigger Volume links may only use enter or exit triggers.");
            return;
        }
        let nextLink;
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
    const updateInteractionLinkActionType = (link, actionType) => {
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
            commitInteractionLinkChange(link, createTeleportPlayerInteractionLink({
                id: link.id,
                sourceEntityId: sourceEntity.id,
                trigger: link.trigger,
                targetEntityId: defaultTarget.id
            }), "Switched link action to teleport player.");
            return;
        }
        if (actionType === "playAnimation") {
            const targetModelInstance = (link.action.type === "playAnimation" || link.action.type === "stopAnimation"
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
            commitInteractionLinkChange(link, createPlayAnimationInteractionLink({
                id: link.id,
                sourceEntityId: sourceEntity.id,
                trigger: link.trigger,
                targetModelInstanceId: targetModelInstance.id,
                clipName: firstClip
            }), "Switched link action to play animation.");
            return;
        }
        if (actionType === "stopAnimation") {
            const targetModelInstance = (link.action.type === "playAnimation" || link.action.type === "stopAnimation"
                ? editorState.document.modelInstances[link.action.targetModelInstanceId]
                : undefined) ?? modelInstanceDisplayList[0]?.modelInstance;
            if (targetModelInstance === undefined) {
                setStatusMessage("Place a model instance before switching this link to stop animation.");
                return;
            }
            commitInteractionLinkChange(link, createStopAnimationInteractionLink({
                id: link.id,
                sourceEntityId: sourceEntity.id,
                trigger: link.trigger,
                targetModelInstanceId: targetModelInstance.id
            }), "Switched link action to stop animation.");
            return;
        }
        if (actionType === "playSound" || actionType === "stopSound") {
            const targetSoundEmitter = (link.action.type === "playSound" || link.action.type === "stopSound"
                ? editorState.document.entities[link.action.targetSoundEmitterId]
                : undefined) ?? playableSoundEmitterOptions[0]?.entity;
            if (targetSoundEmitter === undefined || targetSoundEmitter.kind !== "soundEmitter") {
                setStatusMessage("Author a Sound Emitter with an audio asset before switching this link to sound playback.");
                return;
            }
            if (actionType === "playSound") {
                commitInteractionLinkChange(link, createPlaySoundInteractionLink({
                    id: link.id,
                    sourceEntityId: sourceEntity.id,
                    trigger: link.trigger,
                    targetSoundEmitterId: targetSoundEmitter.id
                }), "Switched link action to play sound.");
            }
            else {
                commitInteractionLinkChange(link, createStopSoundInteractionLink({
                    id: link.id,
                    sourceEntityId: sourceEntity.id,
                    trigger: link.trigger,
                    targetSoundEmitterId: targetSoundEmitter.id
                }), "Switched link action to stop sound.");
            }
            return;
        }
        const defaultBrush = visibilityBrushOptions[0]?.brush;
        if (defaultBrush === undefined) {
            setStatusMessage("Author at least one whitebox solid before switching this link to visibility.");
            return;
        }
        commitInteractionLinkChange(link, createToggleVisibilityInteractionLink({
            id: link.id,
            sourceEntityId: sourceEntity.id,
            trigger: link.trigger,
            targetBrushId: defaultBrush.id
        }), "Switched link action to toggle visibility.");
    };
    const updateTeleportInteractionLinkTarget = (link, targetEntityId) => {
        if (link.action.type !== "teleportPlayer") {
            return;
        }
        commitInteractionLinkChange(link, createTeleportPlayerInteractionLink({
            id: link.id,
            sourceEntityId: link.sourceEntityId,
            trigger: link.trigger,
            targetEntityId
        }), "Updated teleport link target.");
    };
    const updateVisibilityInteractionLinkTarget = (link, targetBrushId) => {
        if (link.action.type !== "toggleVisibility") {
            return;
        }
        commitInteractionLinkChange(link, createToggleVisibilityInteractionLink({
            id: link.id,
            sourceEntityId: link.sourceEntityId,
            trigger: link.trigger,
            targetBrushId,
            visible: link.action.visible
        }), "Updated visibility link target.");
    };
    const updateVisibilityInteractionMode = (link, mode) => {
        if (link.action.type !== "toggleVisibility") {
            return;
        }
        commitInteractionLinkChange(link, createToggleVisibilityInteractionLink({
            id: link.id,
            sourceEntityId: link.sourceEntityId,
            trigger: link.trigger,
            targetBrushId: link.action.targetBrushId,
            visible: readVisibilityModeSelectValue(mode)
        }), "Updated visibility link mode.");
    };
    const updateSoundInteractionLinkTarget = (link, targetSoundEmitterId) => {
        if (link.action.type !== "playSound" && link.action.type !== "stopSound") {
            return;
        }
        if (link.action.type === "playSound") {
            commitInteractionLinkChange(link, createPlaySoundInteractionLink({
                id: link.id,
                sourceEntityId: link.sourceEntityId,
                trigger: link.trigger,
                targetSoundEmitterId
            }), "Updated play sound link target.");
        }
        else {
            commitInteractionLinkChange(link, createStopSoundInteractionLink({
                id: link.id,
                sourceEntityId: link.sourceEntityId,
                trigger: link.trigger,
                targetSoundEmitterId
            }), "Updated stop sound link target.");
        }
    };
    const updateAnimationInteractionLinkTarget = (link, targetModelInstanceId) => {
        if (link.action.type !== "playAnimation" && link.action.type !== "stopAnimation") {
            return;
        }
        if (link.action.type === "playAnimation") {
            commitInteractionLinkChange(link, createPlayAnimationInteractionLink({
                id: link.id,
                sourceEntityId: link.sourceEntityId,
                trigger: link.trigger,
                targetModelInstanceId,
                clipName: link.action.clipName,
                loop: link.action.loop
            }), "Updated play animation link target.");
        }
        else {
            commitInteractionLinkChange(link, createStopAnimationInteractionLink({
                id: link.id,
                sourceEntityId: link.sourceEntityId,
                trigger: link.trigger,
                targetModelInstanceId
            }), "Updated stop animation link target.");
        }
    };
    const updatePlayAnimationLinkClip = (link, clipName) => {
        if (link.action.type !== "playAnimation") {
            return;
        }
        commitInteractionLinkChange(link, createPlayAnimationInteractionLink({
            id: link.id,
            sourceEntityId: link.sourceEntityId,
            trigger: link.trigger,
            targetModelInstanceId: link.action.targetModelInstanceId,
            clipName,
            loop: link.action.loop
        }), "Updated play animation clip.");
    };
    const updatePlayAnimationLinkLoop = (link, loop) => {
        if (link.action.type !== "playAnimation") {
            return;
        }
        commitInteractionLinkChange(link, createPlayAnimationInteractionLink({
            id: link.id,
            sourceEntityId: link.sourceEntityId,
            trigger: link.trigger,
            targetModelInstanceId: link.action.targetModelInstanceId,
            clipName: link.action.clipName,
            loop
        }), "Updated play animation loop setting.");
    };
    const handleAddPlayAnimationLink = (sourceEntity) => {
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
        store.executeCommand(createUpsertInteractionLinkCommand({
            link: createPlayAnimationInteractionLink({
                sourceEntityId: sourceEntity.id,
                trigger: getDefaultInteractionLinkTrigger(sourceEntity),
                targetModelInstanceId: firstInstance.modelInstance.id,
                clipName: firstClip
            }),
            label: "Add play animation link"
        }));
        setStatusMessage("Added a play animation link.");
    };
    const handleAddStopAnimationLink = (sourceEntity) => {
        const firstInstance = modelInstanceDisplayList[0];
        if (firstInstance === undefined) {
            setStatusMessage("Place a model instance before adding an animation link.");
            return;
        }
        store.executeCommand(createUpsertInteractionLinkCommand({
            link: createStopAnimationInteractionLink({
                sourceEntityId: sourceEntity.id,
                trigger: getDefaultInteractionLinkTrigger(sourceEntity),
                targetModelInstanceId: firstInstance.modelInstance.id
            }),
            label: "Add stop animation link"
        }));
        setStatusMessage("Added a stop animation link.");
    };
    const renderInteractionLinksSection = (sourceEntity, links, addTeleportTestId, addVisibilityTestId, addPlaySoundTestId, addStopSoundTestId) => (_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Links" }), links.length === 0 ? (_jsx("div", { className: "outliner-empty", children: sourceEntity.kind === "triggerVolume" ? "No trigger links authored yet." : "No click links authored yet." })) : (_jsx("div", { className: "outliner-list", children: links.map((link, index) => (_jsxs("div", { className: "outliner-item", children: [_jsxs("div", { className: "outliner-item__select", children: [_jsx("span", { className: "outliner-item__title", children: `Link ${index + 1}` }), _jsx("span", { className: "outliner-item__meta", children: getInteractionActionLabel(link) })] }), _jsx("div", { className: "form-section", children: _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Trigger" }), sourceEntity.kind === "triggerVolume" ? (_jsxs("select", { "data-testid": `interaction-link-trigger-${link.id}`, className: "text-input", value: link.trigger, onChange: (event) => updateInteractionLinkTrigger(link, event.currentTarget.value), children: [_jsx("option", { value: "enter", children: "On Enter" }), _jsx("option", { value: "exit", children: "On Exit" })] })) : (_jsx("input", { "data-testid": `interaction-link-trigger-${link.id}`, className: "text-input", type: "text", value: getInteractionTriggerLabel(link.trigger), readOnly: true }))] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Action" }), _jsxs("select", { "data-testid": `interaction-link-action-${link.id}`, className: "text-input", value: link.action.type, onChange: (event) => updateInteractionLinkActionType(link, event.currentTarget.value), children: [_jsx("option", { value: "teleportPlayer", children: "Teleport Player" }), _jsx("option", { value: "toggleVisibility", children: "Toggle Visibility" }), _jsx("option", { value: "playAnimation", children: "Play Animation" }), _jsx("option", { value: "stopAnimation", children: "Stop Animation" }), _jsx("option", { value: "playSound", children: "Play Sound" }), _jsx("option", { value: "stopSound", children: "Stop Sound" })] })] })] }) }), link.action.type === "teleportPlayer" ? (_jsx("div", { className: "form-section", children: _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Target" }), _jsx("select", { "data-testid": `interaction-link-teleport-target-${link.id}`, className: "text-input", value: link.action.targetEntityId, onChange: (event) => updateTeleportInteractionLinkTarget(link, event.currentTarget.value), children: teleportTargetOptions.map(({ entity, label }) => (_jsx("option", { value: entity.id, children: label }, entity.id))) })] }) })) : link.action.type === "toggleVisibility" ? (_jsx("div", { className: "form-section", children: _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Solid" }), _jsx("select", { "data-testid": `interaction-link-visibility-target-${link.id}`, className: "text-input", value: link.action.targetBrushId, onChange: (event) => updateVisibilityInteractionLinkTarget(link, event.currentTarget.value), children: visibilityBrushOptions.map(({ brush, label }) => (_jsx("option", { value: brush.id, children: label }, brush.id))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Mode" }), _jsxs("select", { "data-testid": `interaction-link-visibility-mode-${link.id}`, className: "text-input", value: getVisibilityModeSelectValue(link.action.visible), onChange: (event) => updateVisibilityInteractionMode(link, event.currentTarget.value), children: [_jsx("option", { value: "toggle", children: "Toggle" }), _jsx("option", { value: "show", children: "Show" }), _jsx("option", { value: "hide", children: "Hide" })] })] })] }) })) : link.action.type === "playAnimation" ? (_jsxs("div", { className: "form-section", children: [_jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Instance" }), _jsx("select", { "data-testid": `interaction-link-play-anim-instance-${link.id}`, className: "text-input", value: link.action.targetModelInstanceId, onChange: (event) => updateAnimationInteractionLinkTarget(link, event.currentTarget.value), children: modelInstanceDisplayList.map(({ modelInstance, label }) => (_jsx("option", { value: modelInstance.id, children: label }, modelInstance.id))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Clip" }), _jsx("select", { "data-testid": `interaction-link-play-anim-clip-${link.id}`, className: "text-input", value: link.action.clipName, onChange: (event) => updatePlayAnimationLinkClip(link, event.currentTarget.value), children: editorState.document.assets[editorState.document.modelInstances[link.action.targetModelInstanceId]?.assetId ?? ""]?.metadata.animationNames.map((name) => (_jsx("option", { value: name, children: name }, name))) ?? _jsx("option", { value: link.action.clipName, children: link.action.clipName }) })] })] }), _jsxs("label", { className: "form-field", children: [_jsx("input", { type: "checkbox", "data-testid": `interaction-link-play-anim-loop-${link.id}`, checked: link.action.loop !== false, onChange: (event) => updatePlayAnimationLinkLoop(link, event.currentTarget.checked) }), _jsx("span", { className: "label", children: "Loop" })] })] })) : link.action.type === "playSound" || link.action.type === "stopSound" ? (_jsx("div", { className: "form-section", children: _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Emitter" }), _jsx("select", { "data-testid": `interaction-link-sound-target-${link.id}`, className: "text-input", value: link.action.targetSoundEmitterId, onChange: (event) => updateSoundInteractionLinkTarget(link, event.currentTarget.value), children: soundEmitterOptions.map(({ entity, label }) => (_jsx("option", { value: entity.id, children: label }, entity.id))) })] }) })) : (_jsx("div", { className: "form-section", children: _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Instance" }), _jsx("select", { "data-testid": `interaction-link-stop-anim-instance-${link.id}`, className: "text-input", value: link.action.targetModelInstanceId, onChange: (event) => updateAnimationInteractionLinkTarget(link, event.currentTarget.value), children: modelInstanceDisplayList.map(({ modelInstance, label }) => (_jsx("option", { value: modelInstance.id, children: label }, modelInstance.id))) })] }) })), _jsx("div", { className: "inline-actions", children: _jsx("button", { className: "toolbar__button", type: "button", "data-testid": `delete-interaction-link-${link.id}`, onClick: () => handleDeleteInteractionLink(link.id), children: "Delete Link" }) })] }, link.id))) })), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { className: "toolbar__button", type: "button", "data-testid": addTeleportTestId, disabled: teleportTargetOptions.length === 0, onClick: handleAddTeleportInteractionLink, children: "Add Teleport Link" }), _jsx("button", { className: "toolbar__button", type: "button", "data-testid": addVisibilityTestId, disabled: visibilityBrushOptions.length === 0, onClick: handleAddVisibilityInteractionLink, children: "Add Visibility Link" }), _jsx("button", { className: "toolbar__button", type: "button", disabled: modelInstanceDisplayList.length === 0, onClick: () => handleAddPlayAnimationLink(sourceEntity), children: "Add Play Anim Link" }), _jsx("button", { className: "toolbar__button", type: "button", disabled: modelInstanceDisplayList.length === 0, onClick: () => handleAddStopAnimationLink(sourceEntity), children: "Add Stop Anim Link" }), _jsx("button", { className: "toolbar__button", type: "button", "data-testid": addPlaySoundTestId, disabled: playableSoundEmitterOptions.length === 0, onClick: () => handleAddSoundInteractionLink("playSound"), children: "Add Play Sound Link" }), _jsx("button", { className: "toolbar__button", type: "button", "data-testid": addStopSoundTestId, disabled: playableSoundEmitterOptions.length === 0, onClick: () => handleAddSoundInteractionLink("stopSound"), children: "Add Stop Sound Link" })] })] }));
    const applyWorldSettings = (nextWorld, label, successMessage) => {
        if (areWorldSettingsEqual(editorState.document.world, nextWorld)) {
            return;
        }
        try {
            store.executeCommand(createSetWorldSettingsCommand({
                label,
                world: nextWorld
            }));
            setStatusMessage(successMessage);
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingSettings = (label, successMessage, mutate) => {
        const nextWorld = cloneWorldSettings(editorState.document.world);
        mutate(nextWorld.advancedRendering);
        applyWorldSettings(nextWorld, label, successMessage);
    };
    const applyWorldBackgroundMode = (mode, imageAssetId) => {
        if (mode === "image") {
            const currentBackgroundAssetId = editorState.document.world.background.mode === "image" ? editorState.document.world.background.assetId : null;
            const nextImageAssetId = imageAssetId ??
                (currentBackgroundAssetId !== null && editorState.document.assets[currentBackgroundAssetId]?.kind === "image"
                    ? currentBackgroundAssetId
                    : imageAssetList[0]?.id);
            if (nextImageAssetId === undefined) {
                setStatusMessage("Import an image asset before using an image background.");
                return;
            }
            applyWorldSettings({
                ...editorState.document.world,
                background: changeWorldBackgroundMode(editorState.document.world.background, "image", nextImageAssetId)
            }, "Set world background image", `World background set to ${editorState.document.assets[nextImageAssetId]?.sourceName ?? nextImageAssetId}.`);
            return;
        }
        applyWorldSettings({
            ...editorState.document.world,
            background: changeWorldBackgroundMode(editorState.document.world.background, mode)
        }, "Set world background mode", mode === "solid" ? "World background set to a solid color." : "World background set to a vertical gradient.");
    };
    const applyWorldBackgroundColor = (colorHex) => {
        if (editorState.document.world.background.mode !== "solid") {
            return;
        }
        applyWorldSettings({
            ...editorState.document.world,
            background: {
                mode: "solid",
                colorHex
            }
        }, "Set world background color", "Updated the world background color.");
    };
    const applyWorldGradientColor = (edge, colorHex) => {
        if (editorState.document.world.background.mode !== "verticalGradient") {
            return;
        }
        applyWorldSettings({
            ...editorState.document.world,
            background: edge === "top"
                ? {
                    ...editorState.document.world.background,
                    topColorHex: colorHex
                }
                : {
                    ...editorState.document.world.background,
                    bottomColorHex: colorHex
                }
        }, edge === "top" ? "Set world gradient top color" : "Set world gradient bottom color", edge === "top" ? "Updated the world gradient top color." : "Updated the world gradient bottom color.");
    };
    const applyBackgroundEnvironmentIntensity = () => {
        if (editorState.document.world.background.mode !== "image") {
            return;
        }
        const intensity = readNonNegativeNumberDraft(backgroundEnvironmentIntensityDraft, "Environment intensity");
        applyWorldSettings({
            ...editorState.document.world,
            background: {
                ...editorState.document.world.background,
                environmentIntensity: intensity
            }
        }, "Set background environment intensity", "Updated the background environment intensity.");
    };
    const applyAmbientLightColor = (colorHex) => {
        applyWorldSettings({
            ...editorState.document.world,
            ambientLight: {
                ...editorState.document.world.ambientLight,
                colorHex
            }
        }, "Set world ambient light color", "Updated the world ambient light color.");
    };
    const applyAmbientLightIntensity = () => {
        try {
            applyWorldSettings({
                ...editorState.document.world,
                ambientLight: {
                    ...editorState.document.world.ambientLight,
                    intensity: readNonNegativeNumberDraft(ambientLightIntensityDraft, "Ambient light intensity")
                }
            }, "Set world ambient light intensity", "Updated the world ambient light intensity.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applySunLightColor = (colorHex) => {
        applyWorldSettings({
            ...editorState.document.world,
            sunLight: {
                ...editorState.document.world.sunLight,
                colorHex
            }
        }, "Set world sun color", "Updated the world sun color.");
    };
    const applySunLightIntensity = () => {
        try {
            applyWorldSettings({
                ...editorState.document.world,
                sunLight: {
                    ...editorState.document.world.sunLight,
                    intensity: readNonNegativeNumberDraft(sunLightIntensityDraft, "Sun intensity")
                }
            }, "Set world sun intensity", "Updated the world sun intensity.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applySunLightDirection = () => {
        try {
            const direction = readVec3Draft(sunDirectionDraft, "Sun direction");
            if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
                throw new Error("Sun direction must not be the zero vector.");
            }
            applyWorldSettings({
                ...editorState.document.world,
                sunLight: {
                    ...editorState.document.world.sunLight,
                    direction
                }
            }, "Set world sun direction", "Updated the world sun direction.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingEnabled = (enabled) => {
        applyAdvancedRenderingSettings("Set advanced rendering", enabled ? "Advanced rendering enabled." : "Advanced rendering disabled.", (advancedRendering) => {
            advancedRendering.enabled = enabled;
        });
    };
    const applyAdvancedRenderingShadowsEnabled = (enabled) => {
        applyAdvancedRenderingSettings("Set advanced rendering shadows", enabled ? "Advanced rendering shadows enabled." : "Advanced rendering shadows disabled.", (advancedRendering) => {
            advancedRendering.shadows.enabled = enabled;
        });
    };
    const applyAdvancedRenderingShadowMapSize = (shadowMapSize) => {
        applyAdvancedRenderingSettings("Set advanced rendering shadow map size", "Updated the shadow map size.", (advancedRendering) => {
            advancedRendering.shadows.mapSize = shadowMapSize;
        });
    };
    const applyAdvancedRenderingShadowType = (shadowType) => {
        applyAdvancedRenderingSettings("Set advanced rendering shadow type", "Updated the shadow map type.", (advancedRendering) => {
            advancedRendering.shadows.type = shadowType;
        });
    };
    const applyAdvancedRenderingShadowBias = () => {
        try {
            applyAdvancedRenderingSettings("Set advanced rendering shadow bias", "Updated the shadow bias.", (advancedRendering) => {
                advancedRendering.shadows.bias = readFiniteNumberDraft(advancedRenderingShadowBiasDraft, "Shadow bias");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingAmbientOcclusionEnabled = (enabled) => {
        applyAdvancedRenderingSettings("Set ambient occlusion", enabled ? "Ambient occlusion enabled." : "Ambient occlusion disabled.", (advancedRendering) => {
            advancedRendering.ambientOcclusion.enabled = enabled;
        });
    };
    const applyAdvancedRenderingAmbientOcclusionIntensity = () => {
        try {
            applyAdvancedRenderingSettings("Set ambient occlusion intensity", "Updated the ambient occlusion intensity.", (advancedRendering) => {
                advancedRendering.ambientOcclusion.intensity = readNonNegativeNumberDraft(advancedRenderingAmbientOcclusionIntensityDraft, "Ambient occlusion intensity");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingAmbientOcclusionRadius = () => {
        try {
            applyAdvancedRenderingSettings("Set ambient occlusion radius", "Updated the ambient occlusion radius.", (advancedRendering) => {
                advancedRendering.ambientOcclusion.radius = readNonNegativeNumberDraft(advancedRenderingAmbientOcclusionRadiusDraft, "Ambient occlusion radius");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingAmbientOcclusionSamples = () => {
        try {
            applyAdvancedRenderingSettings("Set ambient occlusion samples", "Updated the ambient occlusion samples.", (advancedRendering) => {
                advancedRendering.ambientOcclusion.samples = readPositiveIntegerDraft(advancedRenderingAmbientOcclusionSamplesDraft, "Ambient occlusion samples");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingBloomEnabled = (enabled) => {
        applyAdvancedRenderingSettings("Set bloom", enabled ? "Bloom enabled." : "Bloom disabled.", (advancedRendering) => {
            advancedRendering.bloom.enabled = enabled;
        });
    };
    const applyAdvancedRenderingBloomIntensity = () => {
        try {
            applyAdvancedRenderingSettings("Set bloom intensity", "Updated the bloom intensity.", (advancedRendering) => {
                advancedRendering.bloom.intensity = readNonNegativeNumberDraft(advancedRenderingBloomIntensityDraft, "Bloom intensity");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingBloomThreshold = () => {
        try {
            applyAdvancedRenderingSettings("Set bloom threshold", "Updated the bloom threshold.", (advancedRendering) => {
                advancedRendering.bloom.threshold = readNonNegativeNumberDraft(advancedRenderingBloomThresholdDraft, "Bloom threshold");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingBloomRadius = () => {
        try {
            applyAdvancedRenderingSettings("Set bloom radius", "Updated the bloom radius.", (advancedRendering) => {
                advancedRendering.bloom.radius = readNonNegativeNumberDraft(advancedRenderingBloomRadiusDraft, "Bloom radius");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingToneMappingMode = (mode) => {
        applyAdvancedRenderingSettings("Set tone mapping mode", "Updated the tone mapping mode.", (advancedRendering) => {
            advancedRendering.toneMapping.mode = mode;
        });
    };
    const applyAdvancedRenderingToneMappingExposure = () => {
        try {
            applyAdvancedRenderingSettings("Set tone mapping exposure", "Updated the tone mapping exposure.", (advancedRendering) => {
                advancedRendering.toneMapping.exposure = readPositiveNumberDraft(advancedRenderingToneMappingExposureDraft, "Tone mapping exposure");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingDepthOfFieldEnabled = (enabled) => {
        applyAdvancedRenderingSettings("Set depth of field", enabled ? "Depth of field enabled." : "Depth of field disabled.", (advancedRendering) => {
            advancedRendering.depthOfField.enabled = enabled;
        });
    };
    const applyAdvancedRenderingDepthOfFieldFocusDistance = () => {
        try {
            applyAdvancedRenderingSettings("Set focus distance", "Updated the focus distance.", (advancedRendering) => {
                advancedRendering.depthOfField.focusDistance = readNonNegativeNumberDraft(advancedRenderingDepthOfFieldFocusDistanceDraft, "Focus distance");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingDepthOfFieldFocalLength = () => {
        try {
            applyAdvancedRenderingSettings("Set focal length", "Updated the focal length.", (advancedRendering) => {
                advancedRendering.depthOfField.focalLength = readPositiveNumberDraft(advancedRenderingDepthOfFieldFocalLengthDraft, "Focal length");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const applyAdvancedRenderingDepthOfFieldBokehScale = () => {
        try {
            applyAdvancedRenderingSettings("Set bokeh scale", "Updated the bokeh scale.", (advancedRendering) => {
                advancedRendering.depthOfField.bokehScale = readPositiveNumberDraft(advancedRenderingDepthOfFieldBokehScaleDraft, "Bokeh scale");
            });
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
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
            store.executeCommand(createSetBoxBrushNameCommand({
                brushId: selectedBrush.id,
                name: brushNameDraft
            }));
            setStatusMessage(nextName === undefined ? "Cleared the authored brush name." : `Renamed brush to ${nextName}.`);
        }
        catch (error) {
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
            store.executeCommand(createSetEntityNameCommand({
                entityId: selectedEntity.id,
                name: entityNameDraft
            }));
            setStatusMessage(nextName === undefined ? "Cleared the authored entity name." : `Renamed entity to ${nextName}.`);
        }
        catch (error) {
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
            store.executeCommand(createSetModelInstanceNameCommand({
                modelInstanceId: selectedModelInstance.id,
                name: modelInstanceNameDraft
            }));
            setStatusMessage(nextName === undefined ? "Cleared the authored model instance name." : `Renamed model instance to ${nextName}.`);
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const handleInlineNameInputKeyDown = (event, resetDraft) => {
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
    const handleDraftVectorKeyDown = (event, applyChange) => {
        if (event.key === "Enter") {
            applyChange();
        }
    };
    const scheduleDraftCommit = (applyChange) => {
        window.setTimeout(() => {
            applyChange();
        }, 0);
    };
    const handleNumberInputPointerUp = (_event, applyChange) => {
        scheduleDraftCommit(applyChange);
    };
    const handleNumberInputKeyUp = (event, applyChange) => {
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
        }
        catch (error) {
            const message = getErrorMessage(error);
            setStatusMessage(message);
        }
    };
    const handleImportJsonButtonClick = () => {
        importInputRef.current?.click();
    };
    const handleImportJsonChange = async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (file === undefined) {
            return;
        }
        try {
            const source = await file.text();
            store.importDocumentJson(source);
            setStatusMessage(`Imported ${file.name}.`);
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
        finally {
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
    const handleImportModelChange = async (event) => {
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
        let importedModelForCleanup = null;
        try {
            const importedModel = files.length === 1
                ? await importModelAssetFromFile(files[0], projectAssetStorage)
                : await importModelAssetFromFiles(files, projectAssetStorage);
            importedModelForCleanup = importedModel;
            store.executeCommand(createImportModelAssetCommand({
                asset: importedModel.asset,
                modelInstance: importedModel.modelInstance,
                label: `Import ${importedModel.asset.sourceName}`
            }));
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
        }
        catch (error) {
            if (importedModelForCleanup !== null) {
                await projectAssetStorage.deleteAsset(importedModelForCleanup.asset.storageKey).catch(() => undefined);
                disposeModelTemplate(importedModelForCleanup.loadedAsset.template);
            }
            const message = getErrorMessage(error);
            setStatusMessage(message);
            setAssetStatusMessage(message);
        }
        finally {
            input.value = "";
        }
    };
    const handleImportBackgroundImageChange = async (event) => {
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
        let importedImageForCleanup = null;
        try {
            const importedImage = await importBackgroundImageAssetFromFile(file, projectAssetStorage);
            importedImageForCleanup = importedImage;
            store.executeCommand(createImportBackgroundImageAssetCommand({
                asset: importedImage.asset,
                world: {
                    ...editorState.document.world,
                    background: changeWorldBackgroundMode(editorState.document.world.background, "image", importedImage.asset.id)
                },
                label: `Import ${importedImage.asset.sourceName} as background`
            }));
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
        }
        catch (error) {
            if (importedImageForCleanup !== null) {
                await projectAssetStorage.deleteAsset(importedImageForCleanup.asset.storageKey).catch(() => undefined);
                disposeLoadedImageAsset(importedImageForCleanup.loadedAsset);
            }
            const message = getErrorMessage(error);
            setStatusMessage(message);
            setAssetStatusMessage(message);
        }
        finally {
            input.value = "";
        }
    };
    const handleImportAudioChange = async (event) => {
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
        let importedAudioForCleanup = null;
        try {
            const importedAudio = await importAudioAssetFromFile(file, projectAssetStorage);
            importedAudioForCleanup = importedAudio;
            store.executeCommand(createImportAudioAssetCommand({
                asset: importedAudio.asset,
                label: `Import ${importedAudio.asset.sourceName}`
            }));
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
        }
        catch (error) {
            if (importedAudioForCleanup !== null) {
                await projectAssetStorage.deleteAsset(importedAudioForCleanup.asset.storageKey).catch(() => undefined);
            }
            const message = getErrorMessage(error);
            setStatusMessage(message);
            setAssetStatusMessage(message);
        }
        finally {
            input.value = "";
        }
    };
    const applyFaceMaterial = (materialId) => {
        if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
            setStatusMessage("Select a single box face before applying a material.");
            return;
        }
        if (selectedFace.materialId === materialId) {
            setStatusMessage(`${BOX_FACE_LABELS[selectedFaceId]} already uses that material.`);
            return;
        }
        try {
            store.executeCommand(createSetBoxBrushFaceMaterialCommand({
                brushId: selectedBrush.id,
                faceId: selectedFaceId,
                materialId
            }));
            setStatusMessage(`Applied ${editorState.document.materials[materialId]?.name ?? materialId} to ${BOX_FACE_LABELS[selectedFaceId]}.`);
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const clearFaceMaterial = () => {
        if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
            setStatusMessage("Select a single box face before clearing its material.");
            return;
        }
        if (selectedFace.materialId === null) {
            setStatusMessage(`${BOX_FACE_LABELS[selectedFaceId]} already uses the fallback face material.`);
            return;
        }
        store.executeCommand(createSetBoxBrushFaceMaterialCommand({
            brushId: selectedBrush.id,
            faceId: selectedFaceId,
            materialId: null
        }));
        setStatusMessage(`Cleared the authored material on ${BOX_FACE_LABELS[selectedFaceId]}.`);
    };
    const applyFaceUvState = (uvState, label, successMessage) => {
        if (selectedBrush === null || selectedFaceId === null || selectedFace === null) {
            setStatusMessage("Select a single box face before editing UVs.");
            return;
        }
        if (areFaceUvStatesEqual(selectedFace.uv, uvState)) {
            setStatusMessage("That face UV state is already current.");
            return;
        }
        try {
            store.executeCommand(createSetBoxBrushFaceUvStateCommand({
                brushId: selectedBrush.id,
                faceId: selectedFaceId,
                uvState,
                label
            }));
            setStatusMessage(successMessage);
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const handleApplyUvDraft = () => {
        if (selectedFace === null) {
            setStatusMessage("Select a single box face before editing UVs.");
            return;
        }
        try {
            applyFaceUvState({
                ...selectedFace.uv,
                offset: readVec2Draft(uvOffsetDraft, "Face UV offset"),
                scale: readPositiveVec2Draft(uvScaleDraft, "Face UV scale")
            }, "Set face UV offset and scale", "Updated face UV offset and scale.");
        }
        catch (error) {
            setStatusMessage(getErrorMessage(error));
        }
    };
    const handleRotateUv = () => {
        if (selectedFace === null) {
            setStatusMessage("Select a single box face before rotating UVs.");
            return;
        }
        applyFaceUvState({
            ...selectedFace.uv,
            rotationQuarterTurns: rotateQuarterTurns(selectedFace.uv.rotationQuarterTurns)
        }, "Rotate face UV 90 degrees", "Rotated face UVs 90 degrees.");
    };
    const handleFlipUv = (axis) => {
        if (selectedFace === null) {
            setStatusMessage("Select a single box face before flipping UVs.");
            return;
        }
        applyFaceUvState({
            ...selectedFace.uv,
            flipU: axis === "u" ? !selectedFace.uv.flipU : selectedFace.uv.flipU,
            flipV: axis === "v" ? !selectedFace.uv.flipV : selectedFace.uv.flipV
        }, axis === "u" ? "Flip face UV U" : "Flip face UV V", axis === "u" ? "Flipped face UVs on U." : "Flipped face UVs on V.");
    };
    const handleFitUvToFace = () => {
        if (selectedBrush === null || selectedFaceId === null) {
            setStatusMessage("Select a single box face before fitting UVs.");
            return;
        }
        applyFaceUvState(createFitToFaceBoxBrushFaceUvState(selectedBrush, selectedFaceId), "Fit face UV to face", "Fit the selected face UVs to the face bounds.");
    };
    const handleEnterPlayMode = () => {
        if (blockingDiagnostics.length > 0) {
            setStatusMessage(`Run mode blocked: ${formatSceneDiagnosticSummary(blockingDiagnostics)}`);
            return;
        }
        try {
            const nextRuntimeScene = buildRuntimeSceneFromDocument(editorState.document, {
                navigationMode: preferredNavigationMode,
                loadedModelAssets
            });
            const nextNavigationMode = preferredNavigationMode;
            setRuntimeScene(nextRuntimeScene);
            setRuntimeMessage(nextRuntimeScene.spawn.source === "playerStart"
                ? "Running from the authored Player Start."
                : "No Player Start is authored yet. Orbit Visitor opened first, with a fallback FPS spawn still available.");
            setFirstPersonTelemetry(null);
            setRuntimeInteractionPrompt(null);
            setActiveNavigationMode(nextNavigationMode);
            store.enterPlayMode();
            setStatusMessage(nextNavigationMode === "firstPerson"
                ? "Entered run mode with first-person navigation."
                : "Entered run mode with Orbit Visitor.");
        }
        catch (error) {
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
    const handleSetPreferredNavigationMode = (navigationMode) => {
        setPreferredNavigationMode(navigationMode);
        if (navigationMode === "firstPerson" && primaryPlayerStart === null) {
            setStatusMessage("First Person selected. Author a Player Start before running, or switch back to Orbit Visitor.");
        }
        if (editorState.toolMode === "play") {
            setActiveNavigationMode(navigationMode);
            setStatusMessage(navigationMode === "firstPerson" ? "Runner switched to first-person navigation." : "Runner switched to Orbit Visitor.");
        }
    };
    const createAssetMenuHoverHandler = (assetId) => (hovered) => {
        setHoveredAssetId((current) => (hovered ? assetId : current === assetId ? null : current));
    };
    const createDisabledMenuAction = (label, testId) => ({
        kind: "action",
        label,
        testId,
        disabled: true,
        onSelect: () => undefined
    });
    const addMenuItems = [
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
                    label: "Sound Emitter",
                    testId: "add-menu-sound-emitter",
                    onSelect: () => beginEntityCreation("soundEmitter", { audioAssetId: audioAssetList[0]?.id ?? null })
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
                    children: modelAssetList.length === 0
                        ? [createDisabledMenuAction("No imported 3D models", "add-menu-assets-models-empty")]
                        : modelAssetList.map((asset) => ({
                            kind: "action",
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
                    children: imageAssetList.length === 0
                        ? [createDisabledMenuAction("No imported environments", "add-menu-assets-environments-empty")]
                        : imageAssetList.map((asset) => ({
                            kind: "action",
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
                    children: audioAssetList.length === 0
                        ? [createDisabledMenuAction("No imported audio", "add-menu-assets-audio-empty")]
                        : audioAssetList.map((asset) => ({
                            kind: "action",
                            label: asset.sourceName,
                            testId: `add-menu-audio-asset-${asset.id}`,
                            onSelect: () => beginEntityCreation("soundEmitter", { audioAssetId: asset.id }),
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
    const viewportPanelsStyle = layoutMode === "quad" ? createViewportQuadPanelsStyle(editorState.viewportQuadSplit) : undefined;
    if (editorState.toolMode === "play" && runtimeScene !== null) {
        return (_jsxs("div", { className: "app-shell app-shell--play", children: [_jsxs("header", { className: "toolbar", children: [_jsxs("div", { className: "toolbar__brand", children: [_jsx("div", { className: "toolbar__title", children: "WebEditor3D" }), _jsx("div", { className: "toolbar__subtitle", children: "Slice 3.1 GLB/GLTF import and unified creation" })] }), _jsxs("div", { className: "toolbar__actions", children: [_jsxs("div", { className: "toolbar__group", children: [_jsx("button", { className: `toolbar__button ${activeNavigationMode === "firstPerson" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "runner-mode-first-person", onClick: () => handleSetPreferredNavigationMode("firstPerson"), children: "First Person" }), _jsx("button", { className: `toolbar__button ${activeNavigationMode === "orbitVisitor" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "runner-mode-orbit-visitor", onClick: () => handleSetPreferredNavigationMode("orbitVisitor"), children: "Orbit Visitor" })] }), _jsx("div", { className: "toolbar__group", children: _jsx("button", { className: "toolbar__button toolbar__button--accent", type: "button", "data-testid": "exit-run-mode", onClick: handleExitPlayMode, children: "Return To Editor" }) })] })] }), _jsxs("div", { className: "runner-workspace", children: [_jsx("main", { className: "runner-region", children: _jsx(RunnerCanvas, { runtimeScene: runtimeScene, projectAssets: editorState.document.assets, loadedModelAssets: loadedModelAssets, loadedImageAssets: loadedImageAssets, loadedAudioAssets: loadedAudioAssets, navigationMode: activeNavigationMode, onRuntimeMessageChange: setRuntimeMessage, onFirstPersonTelemetryChange: setFirstPersonTelemetry, onInteractionPromptChange: setRuntimeInteractionPrompt }) }), _jsx("aside", { className: "side-column", children: _jsxs(Panel, { title: "Runner", children: [_jsxs("div", { className: "stat-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Navigation" }), _jsx("div", { className: "value", children: activeNavigationMode === "firstPerson" ? "First Person" : "Orbit Visitor" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Spawn Source" }), _jsx("div", { className: "value", children: runtimeScene.spawn.source === "playerStart" ? "Player Start" : "Fallback" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Pointer Lock" }), _jsx("div", { className: "value", children: activeNavigationMode === "firstPerson" ? (firstPersonTelemetry?.pointerLocked ? "active" : "idle") : "not used" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Grounded" }), _jsx("div", { className: "value", children: firstPersonTelemetry?.grounded ? "yes" : activeNavigationMode === "firstPerson" ? "no" : "n/a" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "FPS Feet Position" }), _jsx("div", { className: "value", "data-testid": "runner-player-position", children: formatRunnerFeetPosition(firstPersonTelemetry?.feetPosition ?? runtimeScene.spawn.position) }), _jsxs("div", { className: "material-summary", "data-testid": "runner-spawn-state", children: ["Spawn: ", runtimeScene.spawn.source === "playerStart" ? "Player Start" : "Fallback", " at", " ", formatRunnerFeetPosition(runtimeScene.spawn.position)] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Interaction" }), _jsx("div", { className: "value", "data-testid": "runner-interaction-state", children: activeNavigationMode === "firstPerson" ? (runtimeInteractionPrompt === null ? "No target" : "Ready") : "Not available" }), _jsx("div", { className: "material-summary", "data-testid": "runner-interaction-summary", children: activeNavigationMode === "firstPerson"
                                                    ? runtimeInteractionPrompt === null
                                                        ? "Aim at an authored Interactable and click when a prompt appears."
                                                        : `Click "${runtimeInteractionPrompt.prompt}" within ${runtimeInteractionPrompt.range.toFixed(1)}m.`
                                                    : "Switch to First Person to use click interactions." })] }), runtimeMessage === null ? null : _jsx("div", { className: "info-banner", children: runtimeMessage }), activeNavigationMode === "firstPerson" ? (_jsx("div", { className: "info-banner", "data-testid": "runner-interaction-help", children: "Mouse click activates the current prompt target. Keyboard/controller fallback is not active yet." })) : null] }) })] }), _jsxs("footer", { className: "status-bar", children: [_jsxs("div", { children: [_jsx("span", { className: "status-bar__strong", children: "Status:" }), " ", statusMessage] }), _jsxs("div", { children: [_jsx("span", { className: "status-bar__strong", children: "Spawn:" }), " ", runtimeScene.spawn.source === "playerStart" ? "Authored Player Start" : "Fallback runtime spawn"] })] })] }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "toolbar", children: [_jsxs("label", { className: "toolbar__scene-name", children: [_jsx("span", { className: "visually-hidden", children: "Scene Name" }), _jsx("input", { "data-testid": "toolbar-scene-name", className: "text-input toolbar__scene-name-input", type: "text", value: sceneNameDraft, onChange: (event) => setSceneNameDraft(event.currentTarget.value), onBlur: applySceneName, onKeyDown: (event) => {
                                    if (event.key === "Enter") {
                                        applySceneName();
                                    }
                                } })] }), _jsxs("div", { className: "toolbar__actions", children: [_jsxs("div", { className: "toolbar__group", children: [_jsx("button", { className: "toolbar__button toolbar__button--accent", type: "button", "data-testid": "outliner-add-button", "aria-haspopup": "menu", "aria-expanded": addMenuPosition !== null, onClick: handleOpenAddMenuFromButton, children: "Add" }), _jsx("button", { className: "toolbar__button", type: "button", disabled: !editorState.storageAvailable, onClick: handleSaveDraft, children: "Save Draft" }), _jsx("button", { className: "toolbar__button", type: "button", disabled: !editorState.storageAvailable, onClick: handleLoadDraft, children: "Load Draft" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: handleExportJson, children: "Export JSON" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: handleImportJsonButtonClick, children: "Import JSON" })] }), _jsx("div", { className: "toolbar__group", role: "group", "aria-label": "Viewport layout mode", children: VIEWPORT_LAYOUT_MODES.map((mode) => (_jsx("button", { className: `toolbar__button toolbar__button--compact ${editorState.viewportLayoutMode === mode ? "toolbar__button--active" : ""}`, type: "button", "data-testid": `viewport-layout-${mode}`, "aria-pressed": editorState.viewportLayoutMode === mode, onClick: () => handleSetViewportLayoutMode(mode), children: getViewportLayoutModeLabel(mode) }, mode))) }), _jsxs("div", { className: "toolbar__group", role: "group", "aria-label": "Transform operations", children: [_jsxs("button", { className: `toolbar__button ${transformSession.kind === "active" && transformSession.operation === "translate" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "transform-translate-button", "aria-pressed": transformSession.kind === "active" && transformSession.operation === "translate", disabled: editorState.toolMode !== "select" || !canTranslateSelectedTarget, onClick: () => beginTransformOperation("translate", "toolbar"), children: ["Move (", getTransformOperationShortcut("translate"), ")"] }), _jsxs("button", { className: `toolbar__button ${transformSession.kind === "active" && transformSession.operation === "rotate" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "transform-rotate-button", "aria-pressed": transformSession.kind === "active" && transformSession.operation === "rotate", disabled: editorState.toolMode !== "select" || !canRotateSelectedTarget, onClick: () => beginTransformOperation("rotate", "toolbar"), children: ["Rotate (", getTransformOperationShortcut("rotate"), ")"] }), _jsxs("button", { className: `toolbar__button ${transformSession.kind === "active" && transformSession.operation === "scale" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "transform-scale-button", "aria-pressed": transformSession.kind === "active" && transformSession.operation === "scale", disabled: editorState.toolMode !== "select" || !canScaleSelectedTarget, onClick: () => beginTransformOperation("scale", "toolbar"), children: ["Scale (", getTransformOperationShortcut("scale"), ")"] })] }), _jsx("div", { className: "toolbar__group", role: "group", "aria-label": "Whitebox selection mode", children: WHITEBOX_SELECTION_MODES.map((mode) => (_jsx("button", { className: `toolbar__button toolbar__button--compact ${whiteboxSelectionMode === mode ? "toolbar__button--active" : ""}`, type: "button", "data-testid": `whitebox-selection-mode-${mode}`, "aria-pressed": whiteboxSelectionMode === mode, onClick: () => handleWhiteboxSelectionModeChange(mode), children: getWhiteboxSelectionModeLabel(mode) }, mode))) }), _jsxs("div", { className: "toolbar__group", role: "group", "aria-label": "Whitebox snap settings", children: [_jsx("button", { className: `toolbar__button ${whiteboxSnapEnabled ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "whitebox-snap-toggle", "aria-pressed": whiteboxSnapEnabled, onClick: handleWhiteboxSnapToggle, children: whiteboxSnapEnabled ? "Grid Snap On" : "Grid Snap Off" }), _jsxs("label", { className: "toolbar__inline-field", children: [_jsx("span", { className: "label", children: "Step" }), _jsx("input", { "data-testid": "whitebox-snap-step", className: "text-input toolbar__inline-input", type: "number", min: "0.01", step: "0.1", value: whiteboxSnapStepDraft, onChange: (event) => setWhiteboxSnapStepDraft(event.currentTarget.value), onBlur: handleWhiteboxSnapStepBlur, onKeyDown: (event) => {
                                                    if (event.key === "Enter") {
                                                        handleWhiteboxSnapStepBlur();
                                                    }
                                                } })] })] }), _jsx("div", { className: "toolbar__group", children: _jsx("button", { className: `toolbar__button toolbar__button--accent ${blockingDiagnostics.length > 0 ? "toolbar__button--warn" : ""}`, type: "button", "data-testid": "enter-run-mode", onClick: handleEnterPlayMode, children: "Run Scene" }) }), _jsxs("div", { className: "toolbar__group", children: [_jsx("button", { className: `toolbar__button ${preferredNavigationMode === "firstPerson" ? "toolbar__button--active" : ""}`, type: "button", onClick: () => handleSetPreferredNavigationMode("firstPerson"), children: "First Person" }), _jsx("button", { className: `toolbar__button ${preferredNavigationMode === "orbitVisitor" ? "toolbar__button--active" : ""}`, type: "button", onClick: () => handleSetPreferredNavigationMode("orbitVisitor"), children: "Orbit Visitor" })] }), _jsxs("div", { className: "toolbar__group", children: [_jsx("button", { className: "toolbar__button", type: "button", disabled: !editorState.canUndo, onClick: () => store.undo(), children: "Undo" }), _jsx("button", { className: "toolbar__button", type: "button", disabled: !editorState.canRedo, onClick: () => store.redo(), children: "Redo" })] })] })] }), _jsxs("div", { className: "workspace", children: [_jsx("aside", { className: "side-column", children: _jsxs(Panel, { title: "Outliner", children: [assetStatusMessage === null ? null : (_jsx("div", { className: "info-banner", "data-testid": "asset-status-message", children: assetStatusMessage })), projectAssetStorageReady && projectAssetStorage === null ? (_jsx("div", { className: "outliner-empty", children: "Project asset storage is unavailable. Imported assets cannot be persisted." })) : null, _jsxs("div", { className: "outliner-section", children: [_jsx("div", { className: "label", children: "Whitebox Solids" }), brushList.length === 0 ? (_jsx("div", { className: "outliner-empty", children: "Use Add > Whitebox Box and click in the viewport to create the first solid." })) : (_jsx("div", { className: "outliner-list", "data-testid": "outliner-brush-list", children: brushList.map((brush, brushIndex) => {
                                                const label = getBrushLabel(brush, brushIndex);
                                                const isSelected = selectedBrush?.id === brush.id;
                                                return (_jsx("div", { className: `outliner-item outliner-item--compact ${isBrushSelected(editorState.selection, brush.id) ? "outliner-item--selected" : ""}`, children: _jsxs("div", { className: "outliner-item__row", children: [isSelected ? (_jsx("input", { className: "outliner-item__rename", "data-testid": "selected-brush-name", type: "text", value: brushNameDraft, placeholder: `Whitebox Box ${brushIndex + 1}`, onChange: (event) => setBrushNameDraft(event.currentTarget.value), onBlur: applyBrushNameChange, onFocus: (event) => event.currentTarget.select(), onKeyDown: (event) => handleInlineNameInputKeyDown(event, () => {
                                                                    setBrushNameDraft(selectedBrush?.name ?? "");
                                                                }) })) : (_jsx("button", { className: "outliner-item__select", type: "button", "data-testid": `outliner-brush-${brush.id}`, onClick: () => applySelection({
                                                                    kind: "brushes",
                                                                    ids: [brush.id]
                                                                }, "outliner", {
                                                                    focusViewport: true
                                                                }), children: _jsx("span", { className: "outliner-item__title", children: label }) })), _jsx("button", { className: "outliner-item__delete", type: "button", "data-testid": `outliner-delete-brush-${brush.id}`, "aria-label": `Delete ${label}`, onClick: () => handleDeleteBrush(brush.id), children: "x" })] }) }, brush.id));
                                            }) }))] }), _jsxs("div", { className: "outliner-section", children: [_jsx("div", { className: "label", children: "Model Instances" }), modelInstanceDisplayList.length === 0 ? (_jsx("div", { className: "outliner-empty", children: "No model instances placed yet." })) : (_jsx("div", { className: "outliner-list", "data-testid": "outliner-model-instance-list", children: modelInstanceDisplayList.map(({ modelInstance, label }) => {
                                                const isSelected = editorState.selection.kind === "modelInstances" && editorState.selection.ids.includes(modelInstance.id);
                                                return (_jsx("div", { className: `outliner-item ${isSelected ? "outliner-item--selected" : ""} outliner-item--compact`, children: _jsxs("div", { className: "outliner-item__row", children: [isSelected ? (_jsx("input", { className: "outliner-item__rename", "data-testid": "selected-model-instance-name", type: "text", value: modelInstanceNameDraft, placeholder: editorState.document.assets[modelInstance.assetId]?.sourceName ?? "Model Instance", onChange: (event) => setModelInstanceNameDraft(event.currentTarget.value), onBlur: applyModelInstanceNameChange, onFocus: (event) => event.currentTarget.select(), onKeyDown: (event) => handleInlineNameInputKeyDown(event, () => {
                                                                    setModelInstanceNameDraft(selectedModelInstance?.name ?? "");
                                                                }) })) : (_jsx("button", { "data-testid": `outliner-model-instance-${modelInstance.id}`, className: "outliner-item__select", type: "button", onClick: () => applySelection({
                                                                    kind: "modelInstances",
                                                                    ids: [modelInstance.id]
                                                                }, "outliner", {
                                                                    focusViewport: true
                                                                }), children: _jsx("span", { className: "outliner-item__title", children: label }) })), _jsx("button", { className: "outliner-item__delete", type: "button", "data-testid": `outliner-delete-model-instance-${modelInstance.id}`, "aria-label": `Delete ${label}`, onClick: () => handleDeleteModelInstance(modelInstance.id), children: "x" })] }) }, modelInstance.id));
                                            }) }))] }), _jsxs("div", { className: "outliner-section", children: [_jsx("div", { className: "label", children: "Entities" }), entityDisplayList.length === 0 ? _jsx("div", { className: "outliner-empty", children: "No entities authored yet." }) : null, entityDisplayList.length === 0 ? null : (_jsx("div", { className: "outliner-list", children: entityDisplayList.map(({ entity, label }) => {
                                                const isSelected = editorState.selection.kind === "entities" && editorState.selection.ids.includes(entity.id);
                                                return (_jsx("div", { className: `outliner-item ${isSelected ? "outliner-item--selected" : ""} outliner-item--compact`, children: _jsxs("div", { className: "outliner-item__row", children: [isSelected ? (_jsx("input", { className: "outliner-item__rename", "data-testid": "selected-entity-name", type: "text", value: entityNameDraft, placeholder: getEntityKindLabel(entity.kind), onChange: (event) => setEntityNameDraft(event.currentTarget.value), onBlur: applyEntityNameChange, onFocus: (event) => event.currentTarget.select(), onKeyDown: (event) => handleInlineNameInputKeyDown(event, () => {
                                                                    setEntityNameDraft(selectedEntity?.name ?? "");
                                                                }) })) : (_jsx("button", { "data-testid": `outliner-entity-${entity.id}`, className: "outliner-item__select", type: "button", onClick: () => applySelection({
                                                                    kind: "entities",
                                                                    ids: [entity.id]
                                                                }, "outliner", {
                                                                    focusViewport: true
                                                                }), children: _jsx("span", { className: "outliner-item__title", children: label }) })), _jsx("button", { className: "outliner-item__delete", type: "button", "data-testid": `outliner-delete-entity-${entity.id}`, "aria-label": `Delete ${label}`, onClick: () => handleDeleteEntity(entity.id), children: "x" })] }) }, entity.id));
                                            }) }))] })] }) }), _jsx("main", { className: `viewport-region viewport-region--${layoutMode}`, "data-testid": "viewport-shell", children: _jsxs("div", { ref: viewportPanelsRef, className: `viewport-region__panels viewport-region__panels--${layoutMode} ${viewportQuadResizeMode === null ? "" : "viewport-region__panels--resizing"}`.trim(), style: viewportPanelsStyle, children: [VIEWPORT_PANEL_IDS.map((panelId) => (_jsx(ViewportPanel, { panelId: panelId, className: `viewport-panel--${panelId}`, panelState: editorState.viewportPanels[panelId], layoutMode: layoutMode, isActive: activePanelId === panelId, world: editorState.document.world, sceneDocument: editorState.document, projectAssets: editorState.document.assets, loadedModelAssets: loadedModelAssets, loadedImageAssets: loadedImageAssets, whiteboxSelectionMode: whiteboxSelectionMode, whiteboxSnapEnabled: whiteboxSnapEnabled, whiteboxSnapStep: whiteboxSnapStep, selection: editorState.selection, toolMode: editorState.toolMode, toolPreview: viewportToolPreview, transformSession: transformSession, cameraState: editorState.viewportPanels[panelId].cameraState, focusRequestId: focusRequest.panelId === panelId ? focusRequest.id : 0, focusSelection: focusRequest.selection, onActivatePanel: handleActivateViewportPanel, onSetPanelViewMode: handleSetViewportPanelViewMode, onSetPanelDisplayMode: handleSetViewportPanelDisplayMode, onCommitCreation: handleCommitCreation, onCameraStateChange: (cameraState) => {
                                        store.setViewportPanelCameraState(panelId, cameraState);
                                    }, onToolPreviewChange: (toolPreview) => {
                                        store.setViewportToolPreview(toolPreview);
                                    }, onTransformSessionChange: (nextTransformSession) => {
                                        store.setTransformSession(nextTransformSession);
                                    }, onTransformCommit: commitTransformSession, onTransformCancel: () => cancelTransformSession(), onSelectionChange: (selection) => applySelection(selection, "viewport") }, panelId))), layoutMode !== "quad" ? null : (_jsxs(_Fragment, { children: [_jsx("div", { className: "viewport-region__splitter viewport-region__splitter--vertical", "data-testid": "viewport-quad-splitter-vertical", onPointerDown: handleViewportQuadResizeStart("vertical") }), _jsx("div", { className: "viewport-region__splitter viewport-region__splitter--horizontal", "data-testid": "viewport-quad-splitter-horizontal", onPointerDown: handleViewportQuadResizeStart("horizontal") }), _jsx("div", { className: "viewport-region__splitter viewport-region__splitter--center", "data-testid": "viewport-quad-splitter-center", onPointerDown: handleViewportQuadResizeStart("center") })] }))] }) }), _jsx("aside", { className: "side-column", children: editorState.selection.kind === "none" ? (_jsxs(Panel, { title: "World", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Background" }), _jsx("div", { className: "value", "data-testid": "world-background-mode-value", children: formatWorldBackgroundLabel(editorState.document.world) }), _jsx("div", { className: "world-background-preview", "data-testid": "world-background-preview", style: createWorldBackgroundStyle(editorState.document.world.background, editorState.document.world.background.mode === "image"
                                                ? loadedImageAssets[editorState.document.world.background.assetId]?.sourceUrl ?? null
                                                : null) }), _jsx("div", { className: "material-summary", children: editorState.document.world.background.mode === "solid"
                                                ? editorState.document.world.background.colorHex
                                                : editorState.document.world.background.mode === "verticalGradient"
                                                    ? `${editorState.document.world.background.topColorHex} -> ${editorState.document.world.background.bottomColorHex}`
                                                    : editorState.document.assets[editorState.document.world.background.assetId]?.sourceName ??
                                                        editorState.document.world.background.assetId }), editorState.document.world.background.mode !== "image" ? null : (_jsxs("div", { className: "material-summary", "data-testid": "world-background-asset-value", children: ["Background Asset:", " ", editorState.document.assets[editorState.document.world.background.assetId]?.sourceName ??
                                                    editorState.document.world.background.assetId] }))] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Background Mode" }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { className: `toolbar__button ${editorState.document.world.background.mode === "solid" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "world-background-mode-solid", onClick: () => applyWorldBackgroundMode("solid"), children: "Solid" }), _jsx("button", { className: `toolbar__button ${editorState.document.world.background.mode === "verticalGradient" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "world-background-mode-gradient", onClick: () => applyWorldBackgroundMode("verticalGradient"), children: "Gradient" }), _jsx("button", { className: `toolbar__button ${editorState.document.world.background.mode === "image" ? "toolbar__button--active" : ""}`, type: "button", "data-testid": "world-background-mode-image", onClick: () => applyWorldBackgroundMode("image"), children: "Image" })] })] }), editorState.document.world.background.mode === "image" && (_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Environment Intensity" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { "data-testid": "world-background-environment-intensity", className: "text-input", type: "number", min: "0", step: "0.1", value: backgroundEnvironmentIntensityDraft, onChange: (event) => setBackgroundEnvironmentIntensityDraft(event.currentTarget.value), onBlur: applyBackgroundEnvironmentIntensity, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyBackgroundEnvironmentIntensity), onKeyUp: (event) => handleNumberInputKeyUp(event, applyBackgroundEnvironmentIntensity), onPointerUp: (event) => handleNumberInputPointerUp(event, applyBackgroundEnvironmentIntensity) })] })] })), editorState.document.world.background.mode !== "image" && (_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Background Colors" }), editorState.document.world.background.mode === "solid" ? (_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Color" }), _jsx("input", { "data-testid": "world-background-solid-color", className: "color-input", type: "color", value: editorState.document.world.background.colorHex, onChange: (event) => applyWorldBackgroundColor(event.currentTarget.value) })] })) : (_jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Top" }), _jsx("input", { "data-testid": "world-background-top-color", className: "color-input", type: "color", value: editorState.document.world.background.topColorHex, onChange: (event) => applyWorldGradientColor("top", event.currentTarget.value) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Bottom" }), _jsx("input", { "data-testid": "world-background-bottom-color", className: "color-input", type: "color", value: editorState.document.world.background.bottomColorHex, onChange: (event) => applyWorldGradientColor("bottom", event.currentTarget.value) })] })] }))] })), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Ambient Light" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Color" }), _jsx("input", { "data-testid": "world-ambient-color", className: "color-input", type: "color", value: editorState.document.world.ambientLight.colorHex, onChange: (event) => applyAmbientLightColor(event.currentTarget.value) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { "data-testid": "world-ambient-intensity", className: "text-input", type: "number", min: "0", step: "0.1", value: ambientLightIntensityDraft, onChange: (event) => setAmbientLightIntensityDraft(event.currentTarget.value), onBlur: applyAmbientLightIntensity, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAmbientLightIntensity), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAmbientLightIntensity), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAmbientLightIntensity) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Sun Light" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Color" }), _jsx("input", { "data-testid": "world-sun-color", className: "color-input", type: "color", value: editorState.document.world.sunLight.colorHex, onChange: (event) => applySunLightColor(event.currentTarget.value) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { "data-testid": "world-sun-intensity", className: "text-input", type: "number", min: "0", step: "0.1", value: sunLightIntensityDraft, onChange: (event) => setSunLightIntensityDraft(event.currentTarget.value), onBlur: applySunLightIntensity, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySunLightIntensity), onKeyUp: (event) => handleNumberInputKeyUp(event, applySunLightIntensity), onPointerUp: (event) => handleNumberInputPointerUp(event, applySunLightIntensity) })] })] }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Dir X" }), _jsx("input", { "data-testid": "world-sun-direction-x", className: "text-input", type: "number", step: "0.1", value: sunDirectionDraft.x, onChange: (event) => {
                                                                const nextValue = event.currentTarget.value;
                                                                setSunDirectionDraft((draft) => ({ ...draft, x: nextValue }));
                                                            }, onBlur: applySunLightDirection, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySunLightDirection), onKeyUp: (event) => handleNumberInputKeyUp(event, applySunLightDirection), onPointerUp: (event) => handleNumberInputPointerUp(event, applySunLightDirection) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Dir Y" }), _jsx("input", { "data-testid": "world-sun-direction-y", className: "text-input", type: "number", step: "0.1", value: sunDirectionDraft.y, onChange: (event) => {
                                                                const nextValue = event.currentTarget.value;
                                                                setSunDirectionDraft((draft) => ({ ...draft, y: nextValue }));
                                                            }, onBlur: applySunLightDirection, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySunLightDirection), onKeyUp: (event) => handleNumberInputKeyUp(event, applySunLightDirection), onPointerUp: (event) => handleNumberInputPointerUp(event, applySunLightDirection) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Dir Z" }), _jsx("input", { "data-testid": "world-sun-direction-z", className: "text-input", type: "number", step: "0.1", value: sunDirectionDraft.z, onChange: (event) => {
                                                                const nextValue = event.currentTarget.value;
                                                                setSunDirectionDraft((draft) => ({ ...draft, z: nextValue }));
                                                            }, onBlur: applySunLightDirection, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySunLightDirection), onKeyUp: (event) => handleNumberInputKeyUp(event, applySunLightDirection), onPointerUp: (event) => handleNumberInputPointerUp(event, applySunLightDirection) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Advanced Rendering" }), _jsxs("label", { className: "form-field form-field--toggle", children: [_jsx("span", { className: "label", children: "Advanced Rendering" }), _jsx("input", { type: "checkbox", checked: advancedRendering.enabled, onChange: (event) => applyAdvancedRenderingEnabled(event.currentTarget.checked) })] }), !advancedRendering.enabled ? null : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Shadows" }), _jsxs("label", { className: "form-field form-field--toggle", children: [_jsx("span", { className: "label", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: advancedRendering.shadows.enabled, onChange: (event) => applyAdvancedRenderingShadowsEnabled(event.currentTarget.checked) })] }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Shadow Map Size" }), _jsx("select", { className: "select-input", value: advancedRendering.shadows.mapSize, onChange: (event) => applyAdvancedRenderingShadowMapSize(Number(event.currentTarget.value)), children: ADVANCED_RENDERING_SHADOW_MAP_SIZES.map((size) => (_jsx("option", { value: size, children: size }, size))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Shadow Type" }), _jsx("select", { className: "select-input", value: advancedRendering.shadows.type, onChange: (event) => applyAdvancedRenderingShadowType(event.currentTarget.value), children: ADVANCED_RENDERING_SHADOW_TYPES.map((shadowType) => (_jsx("option", { value: shadowType, children: formatAdvancedRenderingShadowTypeLabel(shadowType) }, shadowType))) })] })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Bias" }), _jsx("input", { className: "text-input", type: "number", step: "0.0001", value: advancedRenderingShadowBiasDraft, onChange: (event) => setAdvancedRenderingShadowBiasDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingShadowBias, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingShadowBias), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingShadowBias), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingShadowBias) })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Ambient Occlusion" }), _jsxs("label", { className: "form-field form-field--toggle", children: [_jsx("span", { className: "label", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: advancedRendering.ambientOcclusion.enabled, onChange: (event) => applyAdvancedRenderingAmbientOcclusionEnabled(event.currentTarget.checked) })] }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.1", value: advancedRenderingAmbientOcclusionIntensityDraft, onChange: (event) => setAdvancedRenderingAmbientOcclusionIntensityDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingAmbientOcclusionIntensity, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingAmbientOcclusionIntensity), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingAmbientOcclusionIntensity), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingAmbientOcclusionIntensity) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Radius" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.1", value: advancedRenderingAmbientOcclusionRadiusDraft, onChange: (event) => setAdvancedRenderingAmbientOcclusionRadiusDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingAmbientOcclusionRadius, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingAmbientOcclusionRadius), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingAmbientOcclusionRadius), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingAmbientOcclusionRadius) })] })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Samples" }), _jsx("input", { className: "text-input", type: "number", min: "1", step: "1", value: advancedRenderingAmbientOcclusionSamplesDraft, onChange: (event) => setAdvancedRenderingAmbientOcclusionSamplesDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingAmbientOcclusionSamples, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingAmbientOcclusionSamples), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingAmbientOcclusionSamples), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingAmbientOcclusionSamples) })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Bloom" }), _jsxs("label", { className: "form-field form-field--toggle", children: [_jsx("span", { className: "label", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: advancedRendering.bloom.enabled, onChange: (event) => applyAdvancedRenderingBloomEnabled(event.currentTarget.checked) })] }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.1", value: advancedRenderingBloomIntensityDraft, onChange: (event) => setAdvancedRenderingBloomIntensityDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingBloomIntensity, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingBloomIntensity), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingBloomIntensity), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingBloomIntensity) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Threshold" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.05", value: advancedRenderingBloomThresholdDraft, onChange: (event) => setAdvancedRenderingBloomThresholdDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingBloomThreshold, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingBloomThreshold), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingBloomThreshold), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingBloomThreshold) })] })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Radius" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.05", value: advancedRenderingBloomRadiusDraft, onChange: (event) => setAdvancedRenderingBloomRadiusDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingBloomRadius, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingBloomRadius), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingBloomRadius), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingBloomRadius) })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Tone Mapping" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Mode" }), _jsx("select", { className: "select-input", value: advancedRendering.toneMapping.mode, onChange: (event) => applyAdvancedRenderingToneMappingMode(event.currentTarget.value), children: ADVANCED_RENDERING_TONE_MAPPING_MODES.map((mode) => (_jsx("option", { value: mode, children: formatAdvancedRenderingToneMappingLabel(mode) }, mode))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Exposure" }), _jsx("input", { className: "text-input", type: "number", min: "0.001", step: "0.1", value: advancedRenderingToneMappingExposureDraft, onChange: (event) => setAdvancedRenderingToneMappingExposureDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingToneMappingExposure, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingToneMappingExposure), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingToneMappingExposure), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingToneMappingExposure) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Depth of Field" }), _jsxs("label", { className: "form-field form-field--toggle", children: [_jsx("span", { className: "label", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: advancedRendering.depthOfField.enabled, onChange: (event) => applyAdvancedRenderingDepthOfFieldEnabled(event.currentTarget.checked) })] }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Focus Distance" }), _jsx("input", { className: "text-input", type: "number", min: "0", step: "0.1", value: advancedRenderingDepthOfFieldFocusDistanceDraft, onChange: (event) => setAdvancedRenderingDepthOfFieldFocusDistanceDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingDepthOfFieldFocusDistance, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingDepthOfFieldFocusDistance), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingDepthOfFieldFocusDistance), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingDepthOfFieldFocusDistance) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Focal Length" }), _jsx("input", { className: "text-input", type: "number", min: "0.001", step: "0.001", value: advancedRenderingDepthOfFieldFocalLengthDraft, onChange: (event) => setAdvancedRenderingDepthOfFieldFocalLengthDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingDepthOfFieldFocalLength, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingDepthOfFieldFocalLength), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingDepthOfFieldFocalLength), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingDepthOfFieldFocalLength) })] })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Bokeh Scale" }), _jsx("input", { className: "text-input", type: "number", min: "0.001", step: "0.1", value: advancedRenderingDepthOfFieldBokehScaleDraft, onChange: (event) => setAdvancedRenderingDepthOfFieldBokehScaleDraft(event.currentTarget.value), onBlur: applyAdvancedRenderingDepthOfFieldBokehScale, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyAdvancedRenderingDepthOfFieldBokehScale), onKeyUp: (event) => handleNumberInputKeyUp(event, applyAdvancedRenderingDepthOfFieldBokehScale), onPointerUp: (event) => handleNumberInputPointerUp(event, applyAdvancedRenderingDepthOfFieldBokehScale) })] })] })] }))] })] })) : (_jsxs(Panel, { title: "Inspector", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Selection" }), _jsx("div", { className: "value", children: describeSelection(editorState.selection, brushList, editorState.document.modelInstances, editorState.document.assets, editorState.document.entities) })] }), selectedModelInstance !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Model Asset" }), _jsx("div", { className: "value", children: selectedModelAsset?.sourceName ?? "Missing Asset" }), _jsx("div", { className: "material-summary", children: selectedModelAssetRecord === null
                                                        ? "This model instance references an asset that is missing from the registry."
                                                        : formatModelAssetSummary(selectedModelAssetRecord) }), selectedModelAssetRecord === null ? null : (_jsx("div", { className: "material-summary", children: formatModelBoundingBoxLabel(selectedModelAssetRecord) }))] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Position" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "model-instance-position-x", className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: modelPositionDraft.x, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelPositionDraft((draft) => ({ ...draft, x: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "model-instance-position-y", className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: modelPositionDraft.y, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelPositionDraft((draft) => ({ ...draft, y: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "model-instance-position-z", className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: modelPositionDraft.z, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelPositionDraft((draft) => ({ ...draft, z: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Rotation" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "model-instance-rotation-x", className: "text-input", type: "number", step: "1", value: modelRotationDraft.x, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelRotationDraft((draft) => ({ ...draft, x: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "model-instance-rotation-y", className: "text-input", type: "number", step: "1", value: modelRotationDraft.y, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelRotationDraft((draft) => ({ ...draft, y: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "model-instance-rotation-z", className: "text-input", type: "number", step: "1", value: modelRotationDraft.z, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelRotationDraft((draft) => ({ ...draft, z: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Scale" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "model-instance-scale-x", className: "text-input", type: "number", min: "0.001", step: "0.1", value: modelScaleDraft.x, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelScaleDraft((draft) => ({ ...draft, x: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "model-instance-scale-y", className: "text-input", type: "number", min: "0.001", step: "0.1", value: modelScaleDraft.y, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelScaleDraft((draft) => ({ ...draft, y: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "model-instance-scale-z", className: "text-input", type: "number", min: "0.001", step: "0.1", value: modelScaleDraft.z, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setModelScaleDraft((draft) => ({ ...draft, z: nextValue }));
                                                                    }, onBlur: applyModelInstanceChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyModelInstanceChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyModelInstanceChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyModelInstanceChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Collision" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Mode" }), _jsx("select", { "data-testid": "model-instance-collision-mode", className: "select-input", value: selectedModelInstance.collision.mode, onChange: (event) => {
                                                                store.executeCommand(createUpsertModelInstanceCommand({
                                                                    modelInstance: {
                                                                        ...selectedModelInstance,
                                                                        collision: {
                                                                            ...selectedModelInstance.collision,
                                                                            mode: event.target.value
                                                                        }
                                                                    },
                                                                    label: "Set model collision mode"
                                                                }));
                                                            }, children: MODEL_INSTANCE_COLLISION_MODES.map((mode) => (_jsx("option", { value: mode, children: mode }, mode))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("input", { "data-testid": "model-instance-collision-visible", type: "checkbox", checked: selectedModelInstance.collision.visible, onChange: (event) => {
                                                                store.executeCommand(createUpsertModelInstanceCommand({
                                                                    modelInstance: {
                                                                        ...selectedModelInstance,
                                                                        collision: {
                                                                            ...selectedModelInstance.collision,
                                                                            visible: event.target.checked
                                                                        }
                                                                    },
                                                                    label: event.target.checked ? "Show model collision debug" : "Hide model collision debug"
                                                                }));
                                                            } }), _jsx("span", { className: "label", children: "Show generated collision debug" })] }), _jsx("div", { className: "material-summary", children: getModelInstanceCollisionModeDescription(selectedModelInstance.collision.mode) })] }), selectedModelAssetRecord !== null && selectedModelAssetRecord.metadata.animationNames.length > 0 && (_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Animation" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Clip" }), _jsxs("select", { className: "select-input", value: selectedModelInstance.animationClipName ?? "", onChange: (e) => {
                                                                const clipName = e.target.value || undefined;
                                                                store.executeCommand(createUpsertModelInstanceCommand({
                                                                    modelInstance: { ...selectedModelInstance, animationClipName: clipName },
                                                                    label: "Set animation clip"
                                                                }));
                                                            }, children: [_jsx("option", { value: "", children: "\u2014 none \u2014" }), selectedModelAssetRecord.metadata.animationNames.map((name) => (_jsx("option", { value: name, children: name }, name)))] })] }), _jsxs("label", { className: "form-field", children: [_jsx("input", { type: "checkbox", checked: selectedModelInstance.animationAutoplay ?? false, onChange: (e) => {
                                                                store.executeCommand(createUpsertModelInstanceCommand({
                                                                    modelInstance: { ...selectedModelInstance, animationAutoplay: e.target.checked },
                                                                    label: "Set animation autoplay"
                                                                }));
                                                            } }), _jsx("span", { className: "label", children: "Autoplay on scene load" })] })] })), _jsx("div", { className: "inline-actions", children: _jsx("button", { className: "toolbar__button", type: "button", "data-testid": "apply-model-instance", onClick: applyModelInstanceChange, children: "Apply Transform" }) })] })) : selectedEntity !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Entity Kind" }), _jsx("div", { className: "value", children: getEntityKindLabel(selectedEntity.kind) })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Position" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": selectedEntity.kind === "playerStart" ? "player-start-position-x" : `${selectedEntity.kind}-position-x`, className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: entityPositionDraft.x, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setEntityPositionDraft((draft) => ({ ...draft, x: nextValue }));
                                                                    }, onBlur: applySelectedEntityDraftChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": selectedEntity.kind === "playerStart" ? "player-start-position-y" : `${selectedEntity.kind}-position-y`, className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: entityPositionDraft.y, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setEntityPositionDraft((draft) => ({ ...draft, y: nextValue }));
                                                                    }, onBlur: applySelectedEntityDraftChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": selectedEntity.kind === "playerStart" ? "player-start-position-z" : `${selectedEntity.kind}-position-z`, className: "text-input", type: "number", step: DEFAULT_GRID_SIZE, value: entityPositionDraft.z, onChange: (event) => {
                                                                        const nextValue = event.currentTarget.value;
                                                                        setEntityPositionDraft((draft) => ({ ...draft, z: nextValue }));
                                                                    }, onBlur: applySelectedEntityDraftChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySelectedEntityDraftChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySelectedEntityDraftChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySelectedEntityDraftChange) })] })] })] }), selectedPointLight !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Light" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Color" }), _jsx("input", { "data-testid": "point-light-color", className: "color-input", type: "color", value: pointLightColorDraft, onChange: (event) => {
                                                                                const nextColorHex = event.currentTarget.value;
                                                                                setPointLightColorDraft(nextColorHex);
                                                                                scheduleDraftCommit(() => applyPointLightChange({ colorHex: nextColorHex }));
                                                                            } })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { "data-testid": "point-light-intensity", className: "text-input", type: "number", min: "0", step: "0.1", value: pointLightIntensityDraft, onChange: (event) => setPointLightIntensityDraft(event.currentTarget.value), onBlur: () => applyPointLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPointLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPointLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPointLightChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Range" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Distance" }), _jsx("input", { "data-testid": "point-light-distance", className: "text-input", type: "number", min: "0.1", step: "0.1", value: pointLightDistanceDraft, onChange: (event) => setPointLightDistanceDraft(event.currentTarget.value), onBlur: () => applyPointLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPointLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPointLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPointLightChange) })] })] })] })) : null, selectedSpotLight !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Light" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Color" }), _jsx("input", { "data-testid": "spot-light-color", className: "color-input", type: "color", value: spotLightColorDraft, onChange: (event) => {
                                                                                const nextColorHex = event.currentTarget.value;
                                                                                setSpotLightColorDraft(nextColorHex);
                                                                                scheduleDraftCommit(() => applySpotLightChange({ colorHex: nextColorHex }));
                                                                            } })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Intensity" }), _jsx("input", { "data-testid": "spot-light-intensity", className: "text-input", type: "number", min: "0", step: "0.1", value: spotLightIntensityDraft, onChange: (event) => setSpotLightIntensityDraft(event.currentTarget.value), onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Range" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Distance" }), _jsx("input", { "data-testid": "spot-light-distance", className: "text-input", type: "number", min: "0.1", step: "0.1", value: spotLightDistanceDraft, onChange: (event) => setSpotLightDistanceDraft(event.currentTarget.value), onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Angle" }), _jsx("input", { "data-testid": "spot-light-angle", className: "text-input", type: "number", min: "1", max: "179", step: "1", value: spotLightAngleDraft, onChange: (event) => setSpotLightAngleDraft(event.currentTarget.value), onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Direction" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "spot-light-direction-x", className: "text-input", type: "number", step: "0.1", value: spotLightDirectionDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSpotLightDirectionDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "spot-light-direction-y", className: "text-input", type: "number", step: "0.1", value: spotLightDirectionDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSpotLightDirectionDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "spot-light-direction-z", className: "text-input", type: "number", step: "0.1", value: spotLightDirectionDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSpotLightDirectionDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: () => applySpotLightChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySpotLightChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySpotLightChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySpotLightChange) })] })] })] })] })) : null, selectedPlayerStart !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Yaw" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Degrees" }), _jsx("input", { "data-testid": "player-start-yaw", className: "text-input", type: "number", step: "1", value: playerStartYawDraft, onChange: (event) => setPlayerStartYawDraft(event.currentTarget.value), onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Player Collider" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Mode" }), _jsx("select", { "data-testid": "player-start-collider-mode", className: "select-input", value: playerStartColliderModeDraft, onChange: (event) => {
                                                                        const nextMode = event.currentTarget.value;
                                                                        setPlayerStartColliderModeDraft(nextMode);
                                                                        scheduleDraftCommit(() => applyPlayerStartChange({ colliderMode: nextMode }));
                                                                    }, children: PLAYER_START_COLLIDER_MODES.map((mode) => (_jsx("option", { value: mode, children: mode }, mode))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Eye Height" }), _jsx("input", { "data-testid": "player-start-eye-height", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartEyeHeightDraft, onChange: (event) => setPlayerStartEyeHeightDraft(event.currentTarget.value), onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] }), playerStartColliderModeDraft === "capsule" ? (_jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Radius" }), _jsx("input", { "data-testid": "player-start-capsule-radius", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartCapsuleRadiusDraft, onChange: (event) => setPlayerStartCapsuleRadiusDraft(event.currentTarget.value), onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Height" }), _jsx("input", { "data-testid": "player-start-capsule-height", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartCapsuleHeightDraft, onChange: (event) => setPlayerStartCapsuleHeightDraft(event.currentTarget.value), onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] })] })) : null, playerStartColliderModeDraft === "box" ? (_jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Size X" }), _jsx("input", { "data-testid": "player-start-box-size-x", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartBoxSizeDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPlayerStartBoxSizeDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Size Y" }), _jsx("input", { "data-testid": "player-start-box-size-y", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartBoxSizeDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPlayerStartBoxSizeDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Size Z" }), _jsx("input", { "data-testid": "player-start-box-size-z", className: "text-input", type: "number", min: "0.01", step: "0.1", value: playerStartBoxSizeDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPlayerStartBoxSizeDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: () => applyPlayerStartChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPlayerStartChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPlayerStartChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPlayerStartChange) })] })] })) : null, _jsx("div", { className: "material-summary", children: getPlayerStartColliderModeDescription(playerStartColliderModeDraft) })] })] })) : null, selectedSoundEmitter !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Audio Asset" }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "value", children: selectedSoundEmitter.audioAssetId === null
                                                                        ? "Unassigned"
                                                                        : selectedSoundEmitterAudioAssetRecord?.sourceName ?? "Missing Audio Asset" }), _jsx("div", { className: "material-summary", children: selectedSoundEmitter.audioAssetId === null
                                                                        ? "Choose an audio asset to make this emitter playable."
                                                                        : selectedSoundEmitterAudioAssetRecord === null
                                                                            ? `This sound emitter references ${selectedSoundEmitter.audioAssetId}, but the asset is missing or not audio.`
                                                                            : formatAudioAssetSummary(selectedSoundEmitterAudioAssetRecord) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Audio" }), _jsxs("select", { "data-testid": "sound-emitter-audio-asset", className: "text-input", value: soundEmitterAudioAssetIdDraft, onChange: (event) => {
                                                                        const nextAudioAssetId = event.currentTarget.value.trim();
                                                                        setSoundEmitterAudioAssetIdDraft(nextAudioAssetId);
                                                                        scheduleDraftCommit(() => applySoundEmitterChange({
                                                                            audioAssetId: nextAudioAssetId.length === 0 ? null : nextAudioAssetId
                                                                        }));
                                                                    }, children: [_jsx("option", { value: "", children: "\u2014 none \u2014" }), audioAssetList.map((asset) => (_jsx("option", { value: asset.id, children: asset.sourceName }, asset.id)))] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Volume" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Amount" }), _jsx("input", { "data-testid": "sound-emitter-volume", className: "text-input", type: "number", min: "0", step: "0.1", value: soundEmitterVolumeDraft, onChange: (event) => setSoundEmitterVolumeDraft(event.currentTarget.value), onBlur: () => applySoundEmitterChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySoundEmitterChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySoundEmitterChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySoundEmitterChange) })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Distance" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Ref Distance" }), _jsx("input", { "data-testid": "sound-emitter-ref-distance", className: "text-input", type: "number", min: "0.1", step: "0.1", value: soundEmitterRefDistanceDraft, onChange: (event) => setSoundEmitterRefDistanceDraft(event.currentTarget.value), onBlur: () => applySoundEmitterChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySoundEmitterChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySoundEmitterChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySoundEmitterChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Max Distance" }), _jsx("input", { "data-testid": "sound-emitter-max-distance", className: "text-input", type: "number", min: "0.1", step: "0.1", value: soundEmitterMaxDistanceDraft, onChange: (event) => setSoundEmitterMaxDistanceDraft(event.currentTarget.value), onBlur: () => applySoundEmitterChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applySoundEmitterChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySoundEmitterChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySoundEmitterChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Playback" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Autoplay" }), _jsx("input", { "data-testid": "sound-emitter-autoplay", type: "checkbox", checked: soundEmitterAutoplayDraft, onChange: (event) => {
                                                                                const nextAutoplay = event.currentTarget.checked;
                                                                                setSoundEmitterAutoplayDraft(nextAutoplay);
                                                                                scheduleDraftCommit(() => applySoundEmitterChange({ autoplay: nextAutoplay }));
                                                                            } })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Loop" }), _jsx("input", { "data-testid": "sound-emitter-loop", type: "checkbox", checked: soundEmitterLoopDraft, onChange: (event) => {
                                                                                const nextLoop = event.currentTarget.checked;
                                                                                setSoundEmitterLoopDraft(nextLoop);
                                                                                scheduleDraftCommit(() => applySoundEmitterChange({ loop: nextLoop }));
                                                                            } })] })] })] })] })) : null, selectedTriggerVolume !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Size" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "trigger-volume-size-x", className: "text-input", type: "number", min: DEFAULT_GRID_SIZE, step: DEFAULT_GRID_SIZE, value: triggerVolumeSizeDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setTriggerVolumeSizeDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: applyTriggerVolumeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "trigger-volume-size-y", className: "text-input", type: "number", min: DEFAULT_GRID_SIZE, step: DEFAULT_GRID_SIZE, value: triggerVolumeSizeDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setTriggerVolumeSizeDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: applyTriggerVolumeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "trigger-volume-size-z", className: "text-input", type: "number", min: DEFAULT_GRID_SIZE, step: DEFAULT_GRID_SIZE, value: triggerVolumeSizeDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setTriggerVolumeSizeDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: applyTriggerVolumeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyTriggerVolumeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyTriggerVolumeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyTriggerVolumeChange) })] })] })] }), renderInteractionLinksSection(selectedTriggerVolume, selectedTriggerVolumeLinks, "add-trigger-teleport-link", "add-trigger-visibility-link", "add-trigger-play-sound-link", "add-trigger-stop-sound-link")] })) : null, selectedTeleportTarget !== null ? (_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Yaw" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Degrees" }), _jsx("input", { "data-testid": "teleport-target-yaw", className: "text-input", type: "number", step: "1", value: teleportTargetYawDraft, onChange: (event) => setTeleportTargetYawDraft(event.currentTarget.value), onBlur: applyTeleportTargetChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyTeleportTargetChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyTeleportTargetChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyTeleportTargetChange) })] })] })) : null, selectedInteractable !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Interaction" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Range" }), _jsx("input", { "data-testid": "interactable-radius", className: "text-input", type: "number", min: "0.1", step: "0.1", value: interactableRadiusDraft, onChange: (event) => setInteractableRadiusDraft(event.currentTarget.value), onBlur: () => applyInteractableChange(), onKeyDown: (event) => handleDraftVectorKeyDown(event, applyInteractableChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyInteractableChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyInteractableChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Enabled" }), _jsx("input", { "data-testid": "interactable-enabled", type: "checkbox", checked: interactableEnabledDraft, onChange: (event) => {
                                                                                const nextEnabled = event.currentTarget.checked;
                                                                                setInteractableEnabledDraft(nextEnabled);
                                                                                scheduleDraftCommit(() => applyInteractableChange({ enabled: nextEnabled }));
                                                                            } })] })] }), _jsx("div", { className: "material-summary", children: "Range defines how close the player must be before the click prompt can activate." })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Prompt" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Text" }), _jsx("input", { "data-testid": "interactable-prompt", className: "text-input", type: "text", value: interactablePromptDraft, onChange: (event) => setInteractablePromptDraft(event.currentTarget.value), onBlur: () => applyInteractableChange(), onKeyDown: (event) => {
                                                                        if (event.key === "Enter") {
                                                                            applyInteractableChange();
                                                                        }
                                                                    } })] })] }), renderInteractionLinksSection(selectedInteractable, selectedInteractableLinks, "add-interactable-teleport-link", "add-interactable-visibility-link", "add-interactable-play-sound-link", "add-interactable-stop-sound-link")] })) : null] })) : selectedBrush === null ? (_jsx("div", { className: "outliner-empty", children: "Select a whitebox solid or entity to edit authored properties." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Whitebox Solid Type" }), _jsx("div", { className: "value", children: "box" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Selection Mode" }), _jsx("div", { className: "value", children: getWhiteboxSelectionModeLabel(whiteboxSelectionMode) })] }), whiteboxSelectionMode !== "object" ? (_jsx("div", { className: "outliner-empty", children: whiteboxSelectionMode === "face"
                                                ? "Face mode keeps whole-solid transforms out of the way. Select a face to edit its material or UV transform."
                                                : whiteboxSelectionMode === "edge"
                                                    ? "Edge mode is selection-only in this slice. Edge transforms land next."
                                                    : "Vertex mode is selection-only in this slice. Vertex transforms land next." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Center" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "brush-center-x", className: "text-input", type: "number", step: whiteboxVectorInputStep, value: positionDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPositionDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: applyPositionChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPositionChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPositionChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPositionChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "brush-center-y", className: "text-input", type: "number", step: whiteboxVectorInputStep, value: positionDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPositionDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: applyPositionChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPositionChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPositionChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPositionChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "brush-center-z", className: "text-input", type: "number", step: whiteboxVectorInputStep, value: positionDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setPositionDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: applyPositionChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyPositionChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyPositionChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyPositionChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Rotation" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "brush-rotation-x", className: "text-input", type: "number", step: "0.1", value: rotationDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setRotationDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: applyRotationChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyRotationChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyRotationChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyRotationChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "brush-rotation-y", className: "text-input", type: "number", step: "0.1", value: rotationDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setRotationDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: applyRotationChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyRotationChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyRotationChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyRotationChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "brush-rotation-z", className: "text-input", type: "number", step: "0.1", value: rotationDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setRotationDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: applyRotationChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applyRotationChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applyRotationChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applyRotationChange) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Size" }), _jsxs("div", { className: "vector-inputs", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "X" }), _jsx("input", { "data-testid": "brush-size-x", className: "text-input", type: "number", min: "0.01", step: whiteboxVectorInputStep, value: sizeDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSizeDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onBlur: applySizeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySizeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySizeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySizeChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Y" }), _jsx("input", { "data-testid": "brush-size-y", className: "text-input", type: "number", min: "0.01", step: whiteboxVectorInputStep, value: sizeDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSizeDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onBlur: applySizeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySizeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySizeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySizeChange) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "Z" }), _jsx("input", { "data-testid": "brush-size-z", className: "text-input", type: "number", min: "0.01", step: whiteboxVectorInputStep, value: sizeDraft.z, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setSizeDraft((draft) => ({ ...draft, z: nextValue }));
                                                                            }, onBlur: applySizeChange, onKeyDown: (event) => handleDraftVectorKeyDown(event, applySizeChange), onKeyUp: (event) => handleNumberInputKeyUp(event, applySizeChange), onPointerUp: (event) => handleNumberInputPointerUp(event, applySizeChange) })] })] })] })] })), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Faces" }), _jsx("div", { className: "face-grid", children: BOX_FACE_IDS.map((faceId) => (_jsxs("button", { type: "button", "data-testid": `face-button-${faceId}`, className: `face-chip ${isBrushFaceSelected(editorState.selection, selectedBrush.id, faceId) ? "face-chip--active" : ""}`, onClick: () => {
                                                            store.setWhiteboxSelectionMode("face");
                                                            applySelection({
                                                                kind: "brushFace",
                                                                brushId: selectedBrush.id,
                                                                faceId
                                                            }, "inspector");
                                                        }, children: [_jsx("span", { className: "face-chip__title", children: BOX_FACE_LABELS[faceId] }), _jsx("span", { className: "face-chip__meta", children: faceId })] }, faceId))) })] }), whiteboxSelectionMode === "edge" ? (selectedEdgeId === null ? (_jsx("div", { className: "outliner-empty", children: "Select an edge in the viewport to inspect it. Edge transforms land in the next slice." })) : (_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Active Edge" }), _jsx("div", { className: "value", children: BOX_EDGE_LABELS[selectedEdgeId] }), _jsx("div", { className: "material-summary", children: "Edge selection is visible in the viewport. Persistent edge transforms are still deferred." })] }))) : whiteboxSelectionMode === "vertex" ? (selectedVertexId === null ? (_jsx("div", { className: "outliner-empty", children: "Select a vertex in the viewport to inspect it. Vertex transforms land in the next slice." })) : (_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Active Vertex" }), _jsx("div", { className: "value", children: BOX_VERTEX_LABELS[selectedVertexId] }), _jsx("div", { className: "material-summary", children: "Vertex selection is visible in the viewport. Persistent vertex transforms are still deferred." })] }))) : whiteboxSelectionMode !== "face" ? (_jsx("div", { className: "outliner-empty", children: "Switch to Face mode or choose a face chip to edit materials and UVs." })) : selectedFace === null || selectedFaceId === null ? (_jsx("div", { className: "outliner-empty", children: "Select a face to edit its material and UV transform." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "Active Face" }), _jsx("div", { className: "value", children: BOX_FACE_LABELS[selectedFaceId] }), _jsxs("div", { className: "material-summary", "data-testid": "selected-face-material-name", children: ["Material: ", selectedFaceMaterial?.name ?? "Fallback face color"] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "Material" }), _jsx("div", { className: "material-browser", children: materialList.map((material) => (_jsxs("button", { type: "button", "data-testid": `material-button-${material.id}`, className: `material-item ${selectedFace.materialId === material.id ? "material-item--active" : ""}`, onClick: () => applyFaceMaterial(material.id), children: [_jsx("span", { className: "material-item__preview", style: getMaterialPreviewStyle(material), "aria-hidden": "true" }), _jsxs("span", { className: "material-item__text", children: [_jsx("span", { className: "material-item__title", children: material.name }), _jsx("span", { className: "material-item__meta", children: material.tags.join(" | ") })] })] }, material.id))) }), _jsx("div", { className: "inline-actions", children: _jsx("button", { className: "toolbar__button", type: "button", onClick: clearFaceMaterial, children: "Clear Material" }) })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "UV Offset" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "U" }), _jsx("input", { "data-testid": "face-uv-offset-x", className: "text-input", type: "number", step: "0.125", value: uvOffsetDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setUvOffsetDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onKeyDown: (event) => handleDraftVectorKeyDown(event, handleApplyUvDraft) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "V" }), _jsx("input", { "data-testid": "face-uv-offset-y", className: "text-input", type: "number", step: "0.125", value: uvOffsetDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setUvOffsetDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onKeyDown: (event) => handleDraftVectorKeyDown(event, handleApplyUvDraft) })] })] })] }), _jsxs("div", { className: "form-section", children: [_jsx("div", { className: "label", children: "UV Scale" }), _jsxs("div", { className: "vector-inputs vector-inputs--two", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "U" }), _jsx("input", { "data-testid": "face-uv-scale-x", className: "text-input", type: "number", min: "0.001", step: "0.125", value: uvScaleDraft.x, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setUvScaleDraft((draft) => ({ ...draft, x: nextValue }));
                                                                            }, onKeyDown: (event) => handleDraftVectorKeyDown(event, handleApplyUvDraft) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { className: "label", children: "V" }), _jsx("input", { "data-testid": "face-uv-scale-y", className: "text-input", type: "number", min: "0.001", step: "0.125", value: uvScaleDraft.y, onChange: (event) => {
                                                                                const nextValue = event.currentTarget.value;
                                                                                setUvScaleDraft((draft) => ({ ...draft, y: nextValue }));
                                                                            }, onKeyDown: (event) => handleDraftVectorKeyDown(event, handleApplyUvDraft) })] })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { className: "toolbar__button", type: "button", "data-testid": "apply-face-uv", onClick: handleApplyUvDraft, children: "Apply UV Offset/Scale" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: handleRotateUv, children: "Rotate 90" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: () => handleFlipUv("u"), children: "Flip U" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: () => handleFlipUv("v"), children: "Flip V" }), _jsx("button", { className: "toolbar__button", type: "button", onClick: handleFitUvToFace, children: "Fit To Face" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "label", children: "UV Flags" }), _jsxs("div", { className: "value", children: ["Rotation ", selectedFace.uv.rotationQuarterTurns * 90, "\u00B0"] }), _jsxs("div", { className: "material-summary", children: ["U ", selectedFace.uv.flipU ? "flipped" : "normal", " \u00B7 V ", selectedFace.uv.flipV ? "flipped" : "normal"] })] })] }))] }))] })) })] }), addMenuPosition === null ? null : (_jsx(HierarchicalMenu, { title: "Add", position: addMenuPosition, items: addMenuItems, onClose: closeAddMenu })), _jsxs("footer", { className: "status-bar", children: [_jsxs("div", { className: "status-bar__item", "data-testid": "status-message", children: [_jsx("span", { className: "status-bar__strong", children: "Status:" }), " ", statusMessage] }), _jsxs("div", { className: "status-bar__item", "data-testid": "status-whitebox-selection-mode", children: [_jsx("span", { className: "status-bar__strong", children: "Whitebox:" }), " ", getWhiteboxSelectionModeLabel(whiteboxSelectionMode)] }), _jsxs("div", { className: "status-bar__item", "data-testid": "status-document", children: [_jsx("span", { className: "status-bar__strong", children: "Document:" }), " ", documentStatusLabel] }), _jsxs("div", { className: "status-bar__item", "data-testid": "status-run-preflight", children: [_jsx("span", { className: "status-bar__strong", children: "Run:" }), " ", runReadyLabel] }), _jsxs("div", { className: "status-bar__item", "data-testid": "status-warnings", children: [_jsx("span", { className: "status-bar__strong", children: "Warnings:" }), " ", warningDiagnostics.length] }), hoveredAssetStatusMessage === null ? null : (_jsxs("div", { className: "status-bar__item status-bar__item--asset", "data-testid": "status-asset-hover", children: [_jsx("span", { className: "status-bar__strong", children: "Asset:" }), " ", hoveredAssetStatusMessage] })), _jsxs("div", { className: "status-bar__item", "data-testid": "status-last-command", children: [_jsx("span", { className: "status-bar__strong", children: "Last:" }), " ", lastCommandLabel] })] }), _jsx("input", { ref: importInputRef, className: "visually-hidden", type: "file", accept: ".json,application/json", onChange: handleImportJsonChange }), _jsx("input", { ref: importModelInputRef, className: "visually-hidden", type: "file", multiple: true, accept: ".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream", onChange: handleImportModelChange }), _jsx("input", { ref: importBackgroundImageInputRef, className: "visually-hidden", type: "file", accept: ".avif,.exr,.gif,.hdr,.jpg,.jpeg,.png,.svg,.webp,image/*", onChange: handleImportBackgroundImageChange }), _jsx("input", { ref: importAudioInputRef, className: "visually-hidden", type: "file", accept: ".aac,.flac,.m4a,.mp3,.oga,.ogg,.wav,.webm,audio/*", onChange: handleImportAudioChange })] }));
}
