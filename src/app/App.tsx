import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type KeyboardEvent } from "react";

import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { createSetBoxBrushFaceMaterialCommand } from "../commands/set-box-brush-face-material-command";
import { createSetBoxBrushFaceUvStateCommand } from "../commands/set-box-brush-face-uv-state-command";
import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import {
  getSelectedBrushFaceId,
  getSingleSelectedBrushId,
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
  type BoxBrush,
  type BoxFaceId,
  type FaceUvState,
  type FaceUvRotationQuarterTurns
} from "../document/brushes";
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";
import { createFitToFaceBoxBrushFaceUvState } from "../geometry/box-face-uvs";
import { STARTER_MATERIAL_LIBRARY, type MaterialDef } from "../materials/starter-material-library";
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

function getBrushLabel(index: number): string {
  return `Box Brush ${index + 1}`;
}

function getBrushLabelById(brushId: string, brushes: BoxBrush[]): string {
  const brushIndex = brushes.findIndex((brush) => brush.id === brushId);
  return brushIndex === -1 ? "Box Brush" : getBrushLabel(brushIndex);
}

function getSelectedBrushLabel(selection: EditorSelection, brushes: BoxBrush[]): string {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return "No brush selected";
  }

  return getBrushLabelById(selectedBrushId, brushes);
}

function describeSelection(selection: EditorSelection, brushes: BoxBrush[]): string {
  switch (selection.kind) {
    case "none":
      return "No authored selection";
    case "brushes":
      return `${selection.ids.length} brush selected (${getSelectedBrushLabel(selection, brushes)})`;
    case "brushFace":
      return `1 face selected (${FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushes)})`;
    case "entities":
      return `${selection.ids.length} entities selected`;
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

export function App({ store, initialStatusMessage }: AppProps) {
  const editorState = useEditorStoreState(store);
  const brushList = Object.values(editorState.document.brushes);
  const materialList = sortDocumentMaterials(editorState.document.materials);
  const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);
  const selectedFaceId = getSelectedBrushFaceId(editorState.selection);
  const selectedFace = selectedBrush !== null && selectedFaceId !== null ? selectedBrush.faces[selectedFaceId] : null;
  const selectedFaceMaterial =
    selectedFace !== null && selectedFace.materialId !== null ? editorState.document.materials[selectedFace.materialId] ?? null : null;

  const [sceneNameDraft, setSceneNameDraft] = useState(editorState.document.name);
  const [positionDraft, setPositionDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
  const [sizeDraft, setSizeDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
  const [uvOffsetDraft, setUvOffsetDraft] = useState(createVec2Draft(createDefaultFaceUvState().offset));
  const [uvScaleDraft, setUvScaleDraft] = useState(createVec2Draft(createDefaultFaceUvState().scale));
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Face material authoring ready.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSceneNameDraft(editorState.document.name);
  }, [editorState.document.name]);

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

  const applySceneName = () => {
    const normalizedName = sceneNameDraft.trim() || "Untitled Scene";

    if (normalizedName === editorState.document.name) {
      setStatusMessage("Scene name is already current.");
      return;
    }

    store.executeCommand(createSetSceneNameCommand(normalizedName));
    setStatusMessage(`Scene renamed to ${normalizedName}.`);
  };

  const handleCreateBoxBrush = () => {
    try {
      store.executeCommand(createCreateBoxBrushCommand());
      setStatusMessage(`Created a box brush snapped to the ${DEFAULT_GRID_SIZE}m grid.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySelection = (selection: EditorSelection, source: "outliner" | "viewport" | "inspector") => {
    store.setSelection(selection);

    switch (selection.kind) {
      case "none":
        setStatusMessage(`${source === "viewport" ? "Viewport" : "Editor"} selection cleared.`);
        break;
      case "brushes":
        setStatusMessage(`Selected ${getBrushLabelById(selection.ids[0], brushList)} from the ${source}.`);
        break;
      case "brushFace":
        setStatusMessage(`Selected ${FACE_LABELS[selection.faceId]} on ${getBrushLabelById(selection.brushId, brushList)} from the ${source}.`);
        break;
      default:
        setStatusMessage(`Selection updated from the ${source}.`);
        break;
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

  const handleDraftVectorKeyDown = (event: KeyboardEvent<HTMLInputElement>, applyChange: () => void) => {
    if (event.key === "Enter") {
      applyChange();
    }
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
    const exportedJson = store.exportDocumentJson();
    const blob = new Blob([exportedJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = `${editorState.document.name.replace(/\s+/g, "-").toLowerCase() || "scene"}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    setStatusMessage("Scene document exported as JSON.");
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

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar__brand">
          <div className="toolbar__title">WebEditor3D</div>
          <div className="toolbar__subtitle">Slice 1.2 face materials and UV basics</div>
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
              Box
            </button>
            <button
              className={`toolbar__button ${editorState.toolMode === "play" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("play")}
            >
              Play
            </button>
            <button className="toolbar__button toolbar__button--accent" type="button" data-testid="create-box-brush" onClick={handleCreateBoxBrush}>
              Create Box Brush
            </button>
          </div>

          <div className="toolbar__group">
            <button className="toolbar__button" type="button" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button className="toolbar__button" type="button" onClick={handleLoadDraft}>
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
          <Panel title="Document">
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
                <div className="value">{editorState.toolMode}</div>
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

            <ul className="placeholder-list">
              <li>Materials live in the canonical document registry and ship with a tiny starter library.</li>
              <li>Each box face persists its own material id and explicit UV transform values.</li>
            </ul>
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
          </Panel>
        </aside>

        <main className="viewport-region">
          <div className="viewport-region__header">
            <div className="viewport-region__title">Viewport</div>
            <div className="viewport-region__caption">
              {brushList.length} box brushes loaded. Click a brush face in the viewport or use the face selector to texture it.
            </div>
          </div>
          <ViewportCanvas
            world={editorState.document.world}
            sceneDocument={editorState.document}
            selection={editorState.selection}
            onBrushSelectionChange={(selection) => applySelection(selection, "viewport")}
          />
        </main>

        <aside className="side-column">
          <Panel title="Inspector">
            <div className="stat-card">
              <div className="label">Selection</div>
              <div className="value">{describeSelection(editorState.selection, brushList)}</div>
            </div>

            {selectedBrush === null ? (
              <ul className="placeholder-list">
                <li>Select a box brush to edit transforms and choose individual faces.</li>
                <li>All authored transforms remain axis-aligned and snapped to the grid in this slice.</li>
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
            <ul className="placeholder-list">
              <li>Built-in runner authoring is still pending.</li>
              <li>This slice keeps face materials and UV state canonical so the runner can consume them later.</li>
            </ul>
          </Panel>
        </aside>
      </div>

      <footer className="status-bar">
        <div>
          <span className="status-bar__strong">Status:</span> {statusMessage}
        </div>
        <div>
          <span className="status-bar__strong">History:</span> {editorState.lastCommandLabel ?? "No commands yet"}
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
