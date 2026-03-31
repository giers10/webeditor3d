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
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../commands/set-box-brush-face-material-command";
import { createSetBoxBrushNameCommand } from "../commands/set-box-brush-name-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createSetPlayerStartCommand } from "../commands/set-player-start-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import { createSetWorldSettingsCommand } from "../commands/set-world-settings-command";
import {
  getSelectedBrushFaceId,
  getSingleSelectedBrushId,
  getSingleSelectedEntityId,
  isBrushFaceSelected,
  isBrushSelected,
  type EditorSelection
} from "../core/selection";
import type { Vec2, Vec3 } from "../core/vector";
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
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";
import { createFitToFaceBoxBrushFaceUvState } from "../geometry/box-face-uvs";
import {
  DEFAULT_PLAYER_START_POSITION,
  getPlayerStartEntities,
  getPrimaryPlayerStartEntity,
  normalizeYawDegrees,
  type PlayerStartEntity
} from "../entities/entity-instances";
import { STARTER_MATERIAL_LIBRARY, type MaterialDef } from "../materials/starter-material-library";
import { RunnerCanvas } from "../runner-web/RunnerCanvas";
import type { FirstPersonTelemetry } from "../runtime-three/navigation-controller";
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

function readNonNegativeNumberDraft(source: string, label: string): number {
  const value = Number(source);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number greater than or equal to zero.`);
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

function arePlayerStartsEqual(left: PlayerStartEntity, rightPosition: Vec3, rightYawDegrees: number): boolean {
  return areVec3Equal(left.position, rightPosition) && left.yawDegrees === normalizeYawDegrees(rightYawDegrees);
}

function getSelectedBoxBrush(selection: EditorSelection, brushes: BoxBrush[]): BoxBrush | null {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return null;
  }

  return brushes.find((brush) => brush.id === selectedBrushId) ?? null;
}

function getSelectedPlayerStart(selection: EditorSelection, playerStarts: PlayerStartEntity[]): PlayerStartEntity | null {
  const selectedEntityId = getSingleSelectedEntityId(selection);

  if (selectedEntityId === null) {
    return null;
  }

  return playerStarts.find((entity) => entity.id === selectedEntityId) ?? null;
}

function getBrushLabel(brush: BoxBrush, index: number): string {
  return brush.name ?? `Box Brush ${index + 1}`;
}

function getBrushLabelById(brushId: string, brushes: BoxBrush[]): string {
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);
  return brushIndex === -1 ? "Box Brush" : getBrushLabel(brushes[brushIndex], brushIndex);
}

function getPlayerStartLabel(index: number): string {
  return index === 0 ? "Player Start" : `Player Start ${index + 1}`;
}

function getPlayerStartLabelById(entityId: string, playerStarts: PlayerStartEntity[]): string {
  const playerStartIndex = playerStarts.findIndex((playerStart) => playerStart.id === entityId);
  return playerStartIndex === -1 ? "Player Start" : getPlayerStartLabel(playerStartIndex);
}

function getSelectedBrushLabel(selection: EditorSelection, brushes: BoxBrush[]): string {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return "No brush selected";
  }

  return getBrushLabelById(selectedBrushId, brushes);
}

function describeSelection(selection: EditorSelection, brushes: BoxBrush[], playerStarts: PlayerStartEntity[]): string {
  switch (selection.kind) {
    case "none":
      return "No authored selection";
    case "brushes":
      return `${selection.ids.length} brush selected (${getSelectedBrushLabel(selection, brushes)})`;
    case "brushFace":
      return `1 face selected (${FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "entities":
      return `${selection.ids.length} entity selected (${getPlayerStartLabelById(selection.ids[0], playerStarts)})`;
    case "modelInstances":
      return `${selection.ids.length} model instances selected`;
    default:
      return "Unknown selection";
  }
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
  return world.background.mode === "solid" ? "Solid" : "Vertical Gradient";
}

export function App({ store, initialStatusMessage }: AppProps) {
  const editorState = useEditorStoreState(store);
  const brushList = Object.values(editorState.document.brushes);
  const playerStartList = getPlayerStartEntities(editorState.document.entities);
  const primaryPlayerStart = getPrimaryPlayerStartEntity(editorState.document.entities);
  const materialList = sortDocumentMaterials(editorState.document.materials);
  const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);
  const selectedPlayerStart = getSelectedPlayerStart(editorState.selection, playerStartList);
  const selectedFaceId = getSelectedBrushFaceId(editorState.selection);
  const selectedFace = selectedBrush !== null && selectedFaceId !== null ? selectedBrush.faces[selectedFaceId] : null;
  const selectedFaceMaterial =
    selectedFace !== null && selectedFace.materialId !== null ? editorState.document.materials[selectedFace.materialId] ?? null : null;
  const editablePlayerStart = selectedPlayerStart ?? primaryPlayerStart;

  const [sceneNameDraft, setSceneNameDraft] = useState(editorState.document.name);
  const [brushNameDraft, setBrushNameDraft] = useState("");
  const [positionDraft, setPositionDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
  const [sizeDraft, setSizeDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
  const [uvOffsetDraft, setUvOffsetDraft] = useState(createVec2Draft(createDefaultFaceUvState().offset));
  const [uvScaleDraft, setUvScaleDraft] = useState(createVec2Draft(createDefaultFaceUvState().scale));
  const [playerStartPositionDraft, setPlayerStartPositionDraft] = useState(createVec3Draft(DEFAULT_PLAYER_START_POSITION));
  const [playerStartYawDraft, setPlayerStartYawDraft] = useState("0");
  const [ambientLightIntensityDraft, setAmbientLightIntensityDraft] = useState(String(editorState.document.world.ambientLight.intensity));
  const [sunLightIntensityDraft, setSunLightIntensityDraft] = useState(String(editorState.document.world.sunLight.intensity));
  const [sunDirectionDraft, setSunDirectionDraft] = useState(createVec3Draft(editorState.document.world.sunLight.direction));
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Slice 1.5 world environment settings ready.");
  const [preferredNavigationMode, setPreferredNavigationMode] = useState<RuntimeNavigationMode>(
    primaryPlayerStart === null ? "orbitVisitor" : "firstPerson"
  );
  const [activeNavigationMode, setActiveNavigationMode] = useState<RuntimeNavigationMode>(
    primaryPlayerStart === null ? "orbitVisitor" : "firstPerson"
  );
  const [runtimeScene, setRuntimeScene] = useState<RuntimeSceneDefinition | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [firstPersonTelemetry, setFirstPersonTelemetry] = useState<FirstPersonTelemetry | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: number; selection: EditorSelection }>({
    id: 0,
    selection: {
      kind: "none"
    }
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
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
    if (editablePlayerStart === null) {
      setPlayerStartPositionDraft(createVec3Draft(DEFAULT_PLAYER_START_POSITION));
      setPlayerStartYawDraft("0");
      return;
    }

    setPlayerStartPositionDraft(createVec3Draft(editablePlayerStart.position));
    setPlayerStartYawDraft(String(editablePlayerStart.yawDegrees));
  }, [editablePlayerStart]);

  useEffect(() => {
    setAmbientLightIntensityDraft(String(editorState.document.world.ambientLight.intensity));
  }, [editorState.document.world.ambientLight.intensity]);

  useEffect(() => {
    setSunLightIntensityDraft(String(editorState.document.world.sunLight.intensity));
  }, [editorState.document.world.sunLight.intensity]);

  useEffect(() => {
    setSunDirectionDraft(createVec3Draft(editorState.document.world.sunLight.direction));
  }, [editorState.document.world.sunLight.direction]);

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

      if (editorState.selection.kind === "none" && brushList.length === 0 && playerStartList.length === 0) {
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
  }, [editorState.selection, editorState.toolMode, brushList.length, playerStartList.length]);

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
        setStatusMessage(`Selected ${getPlayerStartLabelById(selection.ids[0], playerStartList)} from the ${source}${suffix}.`);
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

  const applyPlayerStartChange = () => {
    try {
      const snappedPosition = snapVec3ToGrid(readVec3Draft(playerStartPositionDraft, "Player start position"), DEFAULT_GRID_SIZE);
      const yawDegrees = readYawDegreesDraft(playerStartYawDraft);

      if (editablePlayerStart !== null && arePlayerStartsEqual(editablePlayerStart, snappedPosition, yawDegrees)) {
        return;
      }

      store.executeCommand(
        createSetPlayerStartCommand({
          entityId: editablePlayerStart?.id,
          position: snappedPosition,
          yawDegrees
        })
      );
      setStatusMessage(editablePlayerStart === null ? "Placed Player Start." : "Updated Player Start.");
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

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

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
      event.currentTarget.value = "";
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
            <div className="toolbar__subtitle">Slice 1.4 first-room polish</div>
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
              navigationMode={activeNavigationMode}
              onRuntimeMessageChange={setRuntimeMessage}
              onFirstPersonTelemetryChange={setFirstPersonTelemetry}
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

              {runtimeMessage === null ? null : <div className="info-banner">{runtimeMessage}</div>}
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
            <button className="toolbar__button" type="button" onClick={handleImportButtonClick}>
              Import JSON
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
          <Panel title="Materials">
            <div className="material-browser">
              {materialList.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  data-testid={`material-button-${material.id}`}
                  className={`material-item ${selectedFace?.materialId === material.id ? "material-item--active" : ""}`}
                  disabled={selectedFace === null}
                  onClick={() => applyFaceMaterial(material.id)}
                >
                  <span className="material-item__preview" style={getMaterialPreviewStyle(material)} aria-hidden="true" />
                  <span className="material-item__text">
                    <span className="material-item__title">{material.name}</span>
                    <span className="material-item__meta">{material.tags.join(" • ")}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="inline-actions">
              <button className="toolbar__button" type="button" disabled={selectedFace === null} onClick={clearFaceMaterial}>
                Clear Face Material
              </button>
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
              <div className="label">Entities</div>
              {playerStartList.length === 0 ? (
                <>
                  <div className="outliner-empty">No Player Start authored yet.</div>
                  <div className="inline-actions">
                    <button className="toolbar__button" type="button" data-testid="place-player-start" onClick={applyPlayerStartChange}>
                      Place Player Start
                    </button>
                  </div>
                </>
              ) : (
                <div className="outliner-list">
                  {playerStartList.map((playerStart, index) => (
                    <button
                      key={playerStart.id}
                      data-testid={`outliner-entity-${playerStart.id}`}
                      className={`outliner-item ${
                        editorState.selection.kind === "entities" && editorState.selection.ids.includes(playerStart.id)
                          ? "outliner-item--selected"
                          : ""
                      }`}
                      type="button"
                      onClick={() =>
                        applySelection(
                          {
                            kind: "entities",
                            ids: [playerStart.id]
                          },
                          "outliner",
                          {
                            focusViewport: true
                          }
                        )
                      }
                    >
                      <span className="outliner-item__title">{getPlayerStartLabel(index)}</span>
                      <span className="outliner-item__meta">Entity</span>
                    </button>
                  ))}
                </div>
              )}
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
            selection={editorState.selection}
            toolMode={editorState.toolMode}
            focusRequestId={focusRequest.id}
            focusSelection={focusRequest.selection}
            onSelectionChange={(selection) => applySelection(selection, "viewport")}
            onCreateBoxBrush={handleCreateBoxBrush}
          />
        </main>

        <aside className="side-column">
          <Panel title="Inspector">
            <div className="stat-card">
              <div className="label">Selection</div>
              <div className="value">{describeSelection(editorState.selection, brushList, playerStartList)}</div>
            </div>

            {selectedPlayerStart !== null ? (
              <>
                <div className="stat-card">
                  <div className="label">Entity Kind</div>
                  <div className="value">Player Start</div>
                </div>

                <div className="form-section">
                  <div className="label">Position</div>
                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">X</span>
                      <input
                        data-testid="player-start-position-x"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={playerStartPositionDraft.x}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPlayerStartPositionDraft((draft) => ({ ...draft, x: nextValue }));
                        }}
                        onBlur={applyPlayerStartChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPlayerStartChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPlayerStartChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        data-testid="player-start-position-y"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={playerStartPositionDraft.y}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPlayerStartPositionDraft((draft) => ({ ...draft, y: nextValue }));
                        }}
                        onBlur={applyPlayerStartChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPlayerStartChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPlayerStartChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        data-testid="player-start-position-z"
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={playerStartPositionDraft.z}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setPlayerStartPositionDraft((draft) => ({ ...draft, z: nextValue }));
                        }}
                        onBlur={applyPlayerStartChange}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
                        onKeyUp={(event) => handleNumberInputKeyUp(event, applyPlayerStartChange)}
                        onPointerUp={(event) => handleNumberInputPointerUp(event, applyPlayerStartChange)}
                      />
                    </label>
                  </div>
                </div>

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
              </>
            ) : selectedBrush === null ? (
              <div className="outliner-empty">Select a brush or Player Start to edit authored properties.</div>
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
        onChange={handleImportChange}
      />
    </div>
  );
}
