import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type KeyboardEvent } from "react";

import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../commands/set-box-brush-face-material-command";
import { createSetBoxBrushNameCommand } from "../commands/set-box-brush-name-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createSetPlayerStartCommand } from "../commands/set-player-start-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
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
const TOOL_LABELS = {
  select: "Select",
  "box-create": "Box Create",
  play: "Play"
} as const;

const DIAGNOSTIC_BADGE_LABELS = {
  document: "Document",
  build: "Run"
} as const;

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
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Slice 1.4 room-authoring workflow ready.");
  const [persistenceMessage, setPersistenceMessage] = useState("Local Draft is the current browser persistence path. Export JSON creates a portable copy.");
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
    if (editorState.toolMode === "play") {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (event.code !== "NumpadComma" && !(event.key === "," && event.location === event.DOM_KEY_LOCATION_NUMPAD)) {
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
      setStatusMessage("Scene name is already current.");
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
        setStatusMessage("Box brush position is already snapped to that grid location.");
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
        setStatusMessage("Box brush size is already snapped to those dimensions.");
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
        setStatusMessage("Player start already uses that authored position and yaw.");
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
      setStatusMessage(nextName === undefined ? "Brush name already uses the default label." : "Brush name is already current.");
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

  const handleDraftVectorKeyDown = (event: KeyboardEvent<HTMLInputElement>, applyChange: () => void) => {
    if (event.key === "Enter") {
      applyChange();
    }
  };

  const handleSaveDraft = () => {
    const result = store.saveDraft();
    setPersistenceMessage(
      result.status === "saved"
        ? "Local Draft saved. Refresh, reopen, or use Load Draft to restore this exact validated document."
        : result.message
    );
    setStatusMessage(result.message);
  };

  const handleLoadDraft = () => {
    const result = store.loadDraft();
    setPersistenceMessage(
      result.status === "loaded"
        ? "Local Draft loaded. The current in-memory document was replaced with the stored browser draft."
        : result.message
    );
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

      setPersistenceMessage("Exported a validated Scene Document JSON file for sharing or backup.");
      setStatusMessage("Scene document exported as JSON.");
    } catch (error) {
      const message = getErrorMessage(error);
      setPersistenceMessage(message);
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
      setPersistenceMessage("Imported JSON replaced the current document after migration and validation. Save Draft to make it the browser draft.");
      setStatusMessage(`Imported ${file.name}.`);
    } catch (error) {
      const message = getErrorMessage(error);
      setPersistenceMessage(message);
      setStatusMessage(message);
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

              {runtimeMessage === null ? null : (
                <ul className="placeholder-list">
                  <li>{runtimeMessage}</li>
                </ul>
              )}

              <ul className="placeholder-list">
                <li>First-person uses `WASD` plus mouse-look after pointer lock is captured.</li>
                <li>Orbit Visitor is the browser-safe fallback when pointer lock is unavailable or undesirable.</li>
                <li>Collision is axis-aligned box collision only in this slice.</li>
              </ul>
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
        <div className="toolbar__brand">
          <div className="toolbar__title">WebEditor3D</div>
          <div className="toolbar__subtitle">Slice 1.4 first-room polish</div>
        </div>

        <div className="toolbar__actions">
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
              className="toolbar__button toolbar__button--accent"
              type="button"
              data-testid="create-box-brush"
              onClick={() => handleCreateBoxBrush()}
            >
              Create Box
            </button>
            <button className="toolbar__button" type="button" data-testid="place-player-start-toolbar" onClick={handleSelectOrPlacePlayerStart}>
              {primaryPlayerStart === null ? "Place Player Start" : "Select Player Start"}
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
          <Panel title="Scene">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="label">Version</div>
                <div className="value">v{editorState.document.version}</div>
              </div>
              <div className="stat-card">
                <div className="label">Grid</div>
                <div className="value">{DEFAULT_GRID_SIZE}m snap</div>
              </div>
              <div className="stat-card">
                <div className="label">Tool Mode</div>
                <div className="value">{TOOL_LABELS[editorState.toolMode]}</div>
              </div>
              <div className="stat-card">
                <div className="label">Brushes</div>
                <div className="value">{brushList.length}</div>
              </div>
            </div>

            <label className="form-field">
              <span className="label">Scene Name</span>
              <input
                className="text-input"
                type="text"
                value={sceneNameDraft}
                onChange={(event) => setSceneNameDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySceneName();
                  }
                }}
              />
            </label>

            <div className="inline-actions">
              <button className="toolbar__button toolbar__button--accent" type="button" onClick={applySceneName}>
                Apply Scene Name Command
              </button>
            </div>

            <div className="form-section">
              <div className="label">Save / Load</div>
              <div className="inline-actions">
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
              <div className="info-banner" data-testid="persistence-message">
                {persistenceMessage}
              </div>
            </div>

            <ul className="placeholder-list">
              <li>Local Draft is the browser persistence path for this slice and auto-loads on refresh when available.</li>
              <li>JSON import replaces the current document only after migration and validation succeed.</li>
            </ul>
          </Panel>

          <Panel title="Status">
            <div className="stat-grid">
              <div className="stat-card" data-testid="document-validation-state">
                <div className="label">Document</div>
                <div className="value">
                  {documentValidation.errors.length === 0 ? "Valid" : formatDiagnosticCount(documentValidation.errors.length, "error")}
                </div>
              </div>
              <div className="stat-card" data-testid="run-validation-state">
                <div className="label">Run Preflight</div>
                <div className="value">{runReadyLabel}</div>
              </div>
              <div className="stat-card">
                <div className="label">Warnings</div>
                <div className="value">{warningDiagnostics.length}</div>
              </div>
              <div className="stat-card">
                <div className="label">Last Command</div>
                <div className="value">{editorState.lastCommandLabel ?? "No commands yet"}</div>
              </div>
            </div>

            {diagnostics.length === 0 ? (
              <ul className="placeholder-list" data-testid="diagnostics-list">
                <li>No validation or run-preflight issues are blocking the first-room workflow.</li>
              </ul>
            ) : (
              <div className="diagnostic-list" data-testid="diagnostics-list">
                {diagnostics.map((diagnostic, index) => (
                  <div
                    key={`${diagnostic.scope}-${diagnostic.code}-${diagnostic.path ?? index}`}
                    className={`diagnostic-item diagnostic-item--${diagnostic.severity}`}
                  >
                    <div className="diagnostic-item__header">
                      <span className={`diagnostic-badge diagnostic-badge--${diagnostic.severity}`}>{diagnostic.severity}</span>
                      <span className="diagnostic-item__scope">{DIAGNOSTIC_BADGE_LABELS[diagnostic.scope]}</span>
                    </div>
                    <div className="diagnostic-item__message">{diagnostic.message}</div>
                    {diagnostic.path === undefined ? null : <div className="diagnostic-item__path">{diagnostic.path}</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>

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

            <ul className="placeholder-list">
              <li>Select a face in the viewport or inspector, then click a starter material to apply it.</li>
            </ul>
          </Panel>

          <Panel title="Outliner">
            <div className="outliner-section">
              <div className="label">Brushes</div>
              {brushList.length === 0 ? (
                <ul className="placeholder-list">
                  <li>No authored brushes yet. Use Create Box Brush to place the first brush.</li>
                </ul>
              ) : (
                <div className="outliner-list" data-testid="outliner-brush-list">
                  {brushList.map((brush, brushIndex) => (
                    <button
                      key={brush.id}
                      className={`outliner-item ${isBrushSelected(editorState.selection, brush.id) ? "outliner-item--selected" : ""}`}
                      type="button"
                      onClick={() =>
                        applySelection(
                          {
                            kind: "brushes",
                            ids: [brush.id]
                          },
                          "outliner"
                        )
                      }
                    >
                      <span className="outliner-item__title">{getBrushLabel(brushIndex)}</span>
                      <span className="outliner-item__meta">
                        center {brush.center.x}, {brush.center.y}, {brush.center.z}
                      </span>
                      <span className="outliner-item__meta">
                        size {brush.size.x}, {brush.size.y}, {brush.size.z}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="outliner-section">
              <div className="label">Entities</div>
              {playerStartList.length === 0 ? (
                <ul className="placeholder-list">
                  <li>No Player Start authored yet. Place one before relying on first-person spawn.</li>
                </ul>
              ) : (
                <div className="outliner-list">
                  {playerStartList.map((playerStart, index) => (
                    <button
                      key={playerStart.id}
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
                          "outliner"
                        )
                      }
                    >
                      <span className="outliner-item__title">{getPlayerStartLabel(index)}</span>
                      <span className="outliner-item__meta">
                        position {playerStart.position.x}, {playerStart.position.y}, {playerStart.position.z}
                      </span>
                      <span className="outliner-item__meta">yaw {playerStart.yawDegrees}°</span>
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
                  <div className="material-summary">Used by first-person run mode as the authored spawn transform.</div>
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
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
                      onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPlayerStartChange)}
                    />
                  </label>
                  <button className="toolbar__button" type="button" data-testid="apply-player-start" onClick={applyPlayerStartChange}>
                    Apply Player Start Command
                  </button>
                </div>
              </>
            ) : selectedBrush === null ? (
              <ul className="placeholder-list">
                <li>Select a box brush to edit transforms and choose individual faces.</li>
                <li>Select Player Start to author the first-person spawn transform.</li>
              </ul>
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                      />
                    </label>
                  </div>
                  <button className="toolbar__button" type="button" data-testid="apply-brush-position" onClick={applyPositionChange}>
                    Apply Move Command
                  </button>
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
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
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                      />
                    </label>
                  </div>
                  <button className="toolbar__button" type="button" data-testid="apply-brush-size" onClick={applySizeChange}>
                    Apply Resize Command
                  </button>
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
                  <ul className="placeholder-list">
                    <li>Stable face ids are: posX, negX, posY, negY, posZ, negZ.</li>
                    <li>Select one face to apply a material and edit its UV transform.</li>
                  </ul>
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

                    <ul className="placeholder-list">
                      <li>Rotation: {selectedFace.uv.rotationQuarterTurns * 90}°</li>
                      <li>
                        Flip flags: U {selectedFace.uv.flipU ? "on" : "off"}, V {selectedFace.uv.flipV ? "on" : "off"}
                      </li>
                    </ul>
                  </>
                )}
              </>
            )}
          </Panel>

          <Panel title="Runner">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="label">Player Start</div>
                <div className="value">{primaryPlayerStart === null ? "Missing" : "Authored"}</div>
              </div>
              <div className="stat-card">
                <div className="label">Default Run Mode</div>
                <div className="value">{preferredNavigationMode === "firstPerson" ? "First Person" : "Orbit Visitor"}</div>
              </div>
            </div>

            {primaryPlayerStart === null ? (
              <ul className="placeholder-list">
                <li>No Player Start is authored yet. Orbit Visitor can still run, but first-person run is blocked until you place one.</li>
              </ul>
            ) : (
              <div className="stat-card">
                <div className="label">Authored Spawn</div>
                <div className="value">
                  {primaryPlayerStart.position.x}, {primaryPlayerStart.position.y}, {primaryPlayerStart.position.z}
                </div>
                <div className="material-summary">yaw {primaryPlayerStart.yawDegrees}°</div>
              </div>
            )}

            <div className="inline-actions">
              <button className="toolbar__button" type="button" data-testid="place-player-start" onClick={handleSelectOrPlacePlayerStart}>
                {primaryPlayerStart === null ? "Place Player Start" : "Select Player Start"}
              </button>
            </div>

            <div className="inline-actions">
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

            <div className="inline-actions">
              <button
                className={`toolbar__button toolbar__button--accent ${blockingDiagnostics.length > 0 ? "toolbar__button--warn" : ""}`}
                type="button"
                onClick={handleEnterPlayMode}
              >
                Enter Run Mode
              </button>
            </div>

            <ul className="placeholder-list">
              <li>First-person supports `WASD` movement plus mouse-look after pointer lock is active.</li>
              <li>Orbit Visitor provides the non-FPS fallback for browsers or users that do not want pointer lock.</li>
              <li>Collision is deterministic AABB collision against box-brush runtime colliders in this slice.</li>
            </ul>
          </Panel>
        </aside>
      </div>

      <footer className="status-bar">
        <div>
          <span className="status-bar__strong">Status:</span> {statusMessage}
        </div>
        <div>
          <span className="status-bar__strong">Diagnostics:</span>{" "}
          {diagnostics.length === 0
            ? "Ready"
            : `${formatDiagnosticCount(blockingDiagnostics.length, "error")}, ${formatDiagnosticCount(warningDiagnostics.length, "warning")}`}
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
