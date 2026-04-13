# architecture.md

Use this as a selective reference doc.

Do not read this file end-to-end by default.
Read only the headings relevant to the active slice after reading `AGENTS.md`, `CHAT_CONTEXT.md`, and inspecting the current code.

If examples in this file lag behind the code, trust the code for current behavior and update the docs when your slice materially changes direction.

## Overview

This project is a browser-based 3D scene authoring tool with a built-in runtime runner.

It has two primary modes:

1. **Editor mode**
   - author interactive 3D environments using whitebox solids, entities, materials, and imported assets

2. **Runner mode**
   - load and play those scenes in-browser using configurable navigation and interaction modes

The architecture is designed to preserve intuitive level-authoring ergonomics while staying web-native and maintainable.

---

## Architectural goals

### Primary goals

- fast and precise whitebox-based scene authoring
- modern browser runtime delivery
- native support for imported GLB/GLTF assets
- robust material/texture workflows
- instant edit -> play iteration
- deterministic save/load/build behavior
- clean separation between authoring model and runtime rendering

### Secondary goals

- embeddable runner
- future prefab ecosystem
- future collaboration support
- future scripting/plugin seams
- future export targets beyond the built-in runtime

### Non-goals

- replacing Blender
- becoming a full game engine
- full visual scripting in v1
- photoreal renderer competition
- deeply general engine/editor abstractions before needed

---

## Early binding decisions

These decisions are intentionally fixed for the early slices so implementation chats do not invent different interpretations.

### Coordinate system and units

- world space is right-handed and **Y-up**
- `+X` is right and `+Y` is up
- scene units are meter-like and should be treated consistently by editor transforms, runtime movement, collision, and audio distance settings

### Initial repo shape

Start simple.

Recommended initial layout:

```txt
src/
  app/
  core/
  document/
  commands/
  geometry/
  viewport-three/
  runtime-three/
  entities/
  materials/
  assets/
  serialization/
  shared-ui/
tests/
  unit/
  domain/
  geometry/
  serialization/
  browser/
  e2e/
fixtures/
  documents/
  assets/
  exports/
```

Do not introduce `/apps` + `/packages` or monorepo packaging until the current codebase actually needs it.

### Canonical state ownership

- keep canonical editor state outside the React component tree
- React renders state and dispatches commands
- a thin external editor store/service is the correct place for the document, selection, tool mode, and command history

### Persistence strategy

- version the canonical document from day one
- M0-M2 may use local draft persistence plus explicit JSON import/export for the document
- once binary assets are introduced, user-facing save/load must move to a portable project package built around canonical scene JSON plus referenced assets
- canonical scene JSON remains the source document format, but JSON alone is no longer a portable project once external assets exist
- deployable runner output is a separate downstream package, not the editable project format
- saved projects must keep binary assets via embedded data or project-packaged storage
- never persist only ephemeral Blob URLs or runtime-only browser object references

### Current box-solid foundation

The first implemented shape was an axis-aligned box with stable face IDs.
That is historical starting context, not the long-term geometry constraint.

Use stable face IDs:

```ts
type BoxFaceId =
  | "posX"
  | "negX"
  | "posY"
  | "negY"
  | "posZ"
  | "negZ";
```

`posY` is the top face and `negY` is the bottom face.

Recommended early box shape:

```ts
interface BoxBrush {
  id: string;
  kind: "box";
  center: Vec3;
  size: Vec3;
  faces: Record<BoxFaceId, BrushFace>;
  layerId?: string;
  groupId?: string;
}
```

`size` values should be positive and non-zero.

### Whitebox geometry direction

The product is moving away from grid-bound brush thinking toward intuitive whitebox solids for level blocking.

Directionally, this means:

- floating point transforms are allowed
- free object rotation is allowed
- the grid becomes a snap/reference aid, not a hard restriction
- object, face, edge, and vertex editing should share one coherent transform-driven interaction model
- non-planar quad faces are acceptable; derived rendering/build should triangulate them deterministically
- solids do not need to remain convex
- collision should come from the solid-collider pipeline rather than assumptions about convexity or axis alignment

Near-term implementation can keep existing `BoxBrush`/box-solid structures where useful, but future geometry slices should treat them as the first whitebox solid type rather than the entire long-term model.

### Early UV representation

Store actual UV transform values canonically per face.

```ts
interface FaceUvState {
  offset: Vec2;
  scale: Vec2;
  rotationQuarterTurns: 0 | 1 | 2 | 3;
  flipU: boolean;
  flipV: boolean;
}
```

In early slices, “fit to face” is a command that rewrites explicit UV values.
Do not persist a separate procedural fit flag yet.

### Model instances vs entities

Placed imported models are not typed entities.

- imported assets live in the asset registry
- placed scene instances of those assets live in `modelInstances`
- typed runtime/editor objects such as `PlayerStart` or `TriggerVolume` live in `entities`

### Imported model collision scope

Imported model collision should extend the current architecture, not replace it.

- authored collision settings belong on `modelInstances`
- generated collider data is derived from:
  - imported model asset geometry
  - model instance transform
  - authored collision settings
- do not make cooked/generated collider bytes the canonical source document by default
- for non-box imported-model collider support and broad-phase/narrow-phase pruning, prefer integrating Rapier as a collision/query subsystem over inventing custom collision code in-house
- broad-phase and narrow-phase pair pruning should be delegated to that collision/query layer rather than re-implemented manually in app code
- do not turn this into a full general-purpose physics sandbox unless the product actually needs one
- near-term slices may adapt or replace the current handcrafted runner collision path so brushes and imported models can participate in one coherent collision/query system

### Trigger/action/target scope

Keep interaction links explicit and typed.
Only activate actions for systems that already exist.

- teleport/visibility actions can land before audio/animation systems
- sound actions should land with the audio slice
- animation actions should land with the animation slice

### Whitebox editing scope

The geometry roadmap should prioritize:

- object transforms
- component selection modes
- face/edge/vertex editing
- robust derived triangulation/collision for edited solids

before adding topology-changing tools such as clipping/extrusion in earnest.

---

## System model

The architecture is based on three major representations:

### 1. Canonical authoring document

The editor’s source of truth.

Properties:
- JSON-serializable
- versioned
- typed
- deterministic
- independent of three.js runtime objects

Contains:
- world settings
- whitebox solid definitions
- face UV/material assignments
- entity instances
- model instances
- interaction links
- asset references
- prefab references
- editor metadata
- layer/group structures if the current slice truly needs them

### 2. Editor viewport representation

A transient three.js rendering of editor state.

Properties:
- rebuildable
- disposable
- optimized for interaction and visualization
- may include helpers, overlays, and selection visuals

Contains:
- preview meshes
- wireframes
- selection outlines
- gizmos
- helper icons
- grids and snap guides
- temporary tool feedback

### 3. Runtime representation

A play-mode representation derived from the document.

Properties:
- optimized for navigation and interaction
- independent from editor overlays and helpers
- suitable for embedding and scene playback

Contains:
- renderable meshes
- collision data
- runtime entities
- model instance runtime bindings
- trigger bindings
- animation mixers
- audio emitters
- navigation/controller systems

These three representations must remain conceptually separate.

---

## High-level module layout

Keep the initial repo simple, but preserve domain boundaries in code.

Recommended domain layout inside `src/`:

- `core`
- `document`
- `commands`
- `geometry`
- `viewport-three`
- `runtime-three`
- `entities`
- `materials`
- `assets`
- `serialization`
- `shared-ui`

Longer-term, this may evolve into `/apps` + `/packages` if real pressure appears.
Do not start there by default.

---

## Module responsibilities

## `core`

Purpose:

- shared domain types and low-level interfaces

Contains:

- IDs
- enums
- discriminated unions
- shared constants
- small foundational helpers

Rules:

- no React
- no DOM
- no three.js
- no serialization side effects

Examples:

- `BrushId`
- `EntityType`
- `MaterialId`
- `SceneVersion`

---

## `document`

Purpose:

- canonical editor state model

Contains:

- root scene document
- typed records/collections
- validation entry points
- document migrations
- default factories
- invariants

Rules:

- must remain serializable
- no three.js object references
- should be testable in isolation

Example persisted project structure:

```ts
interface ProjectDocument {
  version: number;
  name: string;
  time: ProjectTimeSettings;
  activeSceneId: string;
  scenes: Record<string, ProjectScene>;
  materials: Record<string, MaterialDef>;
  textures: Record<string, TextureDef>;
  assets: Record<string, AssetRecord>;
}

interface ProjectScene {
  id: string;
  name: string;
  loadingScreen: SceneLoadingScreenSettings;
  world: WorldSettings;
  brushes: Record<string, Brush>;
  modelInstances: Record<string, ModelInstance>;
  entities: Record<string, EntityInstance>;
  interactionLinks: Record<string, InteractionLink>;
}
```

Imported model collision settings should be represented canonically on the relevant `ModelInstance` records or a tightly related typed sub-structure, not as hidden renderer/runtime state.

`WorldSettings` is the correct home for:

- background mode and background color/gradient
- global ambient light settings
- one authored global directional light / sun for early slices
- fog settings where supported

`ProjectTimeSettings` is the correct home for project-wide clock and day/night settings that persist across scene transitions.

Time architecture direction:

- the project clock is global and should survive scene transitions inside a run session
- scenes may opt in/out of time-driven lighting, but should not own separate main clock progression
- authored day/night semantics such as sunrise, sunset, and day phases belong in project-level time settings or a tightly related typed structure
- runtime should derive visible day/night state from:
  - project time
  - authored day/night settings
  - scene world settings
- do not hide time semantics only inside renderer-side constants; keep reusable pure resolution logic where practical
- generic schedules, NPC routines, dialogue variants, and interaction availability should eventually resolve from:
  - global time
  - world/quest flags
  - scene/location context
- unloaded scenes should be reconstructible from those rules rather than fully simulated in the background
- future loop/reset mechanics should clear or reinitialize cycle-scoped state, then re-resolve current world state deterministically

Do not model global world lighting as ad hoc hidden viewport state.

---

## `commands`

Purpose:

- explicit, undoable state transitions

Commands mutate the document through controlled APIs.

Examples:

- create brush
- delete brush
- move brush
- resize brush
- assign material to selected faces
- place entity
- place model instance
- import asset reference
- change world settings

Recommended command shape:

```ts
interface Command {
  id: string;
  label: string;
  execute(ctx: CommandContext): void;
  undo(ctx: CommandContext): void;
}
```

Command context should expose:

- current document
- selection
- services needed for mutation bookkeeping
- optional event hooks

Rules:

- editor-authored state changes should flow through commands
- commands must be deterministic
- commands should be replayable where practical
- commands must preserve document validity

---

## `geometry`

Purpose:

- brush kernel and derived geometry generation

Contains:

- primitive definitions
- tessellation/build logic
- plane/face operations
- UV projection math
- snap/grid helpers
- collision mesh generation
- optional later clipping helpers

This is one of the most critical modules.

### Canonical whitebox representation

Whitebox solids should not be stored as hidden renderer-only mesh state.

Preferred progression:

#### Current transition

- box-based whitebox solids with stable face identity
- object transforms plus component selection/editing
- derived triangulation for rendering and collision

#### Later

- richer whitebox solid topology tools
- clipping/extrusion/bevel-like operations if they fit the product cleanly
- broader solid editing without turning the product into arbitrary mesh modeling

### Derived outputs

From canonical whitebox data, generate:

- editor mesh
- pick mesh
- highlight mesh
- collision mesh
- runtime mesh
- export mesh

These should be rebuildable from canonical brush data.

---

## `viewport-three`

Purpose:

- render editor state and provide spatial interaction

Contains:

- editor three.js scene
- cameras
- grid
- picking
- transform gizmos
- editor overlays
- tool previews

Responsibilities:

- convert document selections/build results into visible editor objects
- handle hit testing
- manage editor cameras and view modes
- render helper visuals
- support high-frequency tool feedback

Suggested internal subsystems:

- `ViewportHost`
- `EditorSceneRenderer`
- `PickService`
- `CameraController`
- `GridRenderer`
- `SelectionOverlay`
- `ToolPreviewRenderer`
- `GizmoBridge`

### Cameras

Target minimum by milestone:

- perspective in early slices
- top/front/side orthographic views when the viewport-layout slice lands

---

## `runtime-three`

Purpose:

- play scenes in-browser

Responsibilities:

- load built runtime scene
- create player/controller
- evaluate interactions
- play animations
- manage audio
- expose embeddable runtime APIs

### Major subsystems

- `RuntimeLoader`
- `RuntimeScene`
- `ControllerManager`
- `InteractionSystem`
- `TriggerSystem`
- `AudioSystem`
- `AnimationSystem`
- `RuntimeUIBridge`

### Collision strategy progression

Near-term runtime collision is intentionally narrower than a full game-engine physics stack.

- early runner slices use deterministic explicit collision data for navigation and authored interactions
- imported model collision should first plug into that same runtime build/query path
- only introduce a broader physics world when dynamic rigid bodies, richer contact response, or other product requirements make it necessary

### Navigation modes

Initial modes:

- first-person
- third-person

Later optional modes:

- free-fly
- click-to-move
- click-to-teleport
- controller-supported variants where applicable

Every new movement mode or controller feature must ship with default keyboard and standard-gamepad bindings, even if the authored inspector UI stays simple.

These modes should share a common interface:

```ts
interface NavigationController {
  id: string;
  activate(ctx: RuntimeContext): void;
  deactivate(ctx: RuntimeContext): void;
  update(dt: number): void;
}
```

---

## `entities`

Purpose:

- typed non-brush scene objects

Entities bridge authoring and runtime behavior.

Early entity types:

- `PlayerStart`
- `SoundEmitter`
- `TriggerVolume`
- `Interactable`
- `TeleportTarget`

Later entity types may include:

- `PointLight`
- `SpotLight`
- `Door`
- `Waypoint`
- `AmbientZone`
- `CameraZone`

### Entity design rules

- entities are typed
- entity schemas are explicit
- defaults live centrally
- runtime builders convert document entities into runtime objects
- editor icons/gizmos for entities are separate from runtime representation
- model instances remain separate from entities

### Example schema

```ts
type EntityInstance =
  | PlayerStartEntity
  | SoundEmitterEntity
  | TriggerVolumeEntity
  | InteractableEntity
  | TeleportTargetEntity;
```

Avoid a generic “script blob” as the initial design.
Typed entities are easier to validate, render, test, and expose in UI.

---

## `materials`

Purpose:

- authoring material registry and editor material behavior

Contains:

- logical material definitions
- material library metadata
- thumbnail info
- material categories/tags
- material-to-runtime conversion

The editor material model should be a stable abstraction.
It does not need to map 1:1 to raw three.js materials internally.

Example:

```ts
interface MaterialDef {
  id: string;
  name: string;
  shadingModel: "basic" | "standard" | "unlit";
  baseColorTexture?: TextureRef;
  normalTexture?: TextureRef;
  roughnessTexture?: TextureRef;
  emissiveTexture?: TextureRef;
  transparent?: boolean;
  doubleSided?: boolean;
  tags: string[];
}
```

### Per-face editing

A major design requirement:

- per-face material assignment
- per-face UV controls
- quick apply workflow
- stable face IDs on canonical brushes

---

## `assets`

Purpose:

- external asset and media import/export

Contains:

- GLB/GLTF loaders
- audio import helpers
- preview generation
- asset metadata extraction
- export assembly
- optional optimization integration

### Asset principles

Imported assets should become one or more of:

- registered project assets
- placed model instances
- reusable prefab inputs
- material/texture records where useful
- environment/sky assets where useful

Do not treat imported assets as opaque blobs forever.
Extract useful metadata and register them meaningfully.

### Asset registry entries should capture

- asset ID
- source name
- type
- stable persistence reference
- contained scene/nodes when relevant
- materials
- textures
- animations
- bounding box / dimensions if feasible
- import-time notes or warnings
- preview thumbnail if practical, but thumbnail generation must not block the import path

### Imported asset placement

There should be a clear distinction between:

- asset record
- model instance
- prefab definition

### Imported model collision authoring

Imported models need an explicit authored collision path that coexists with brush collision.

Recommended authored settings shape:

```ts
type ModelInstanceCollisionMode =
  | "none"
  | "terrain"
  | "static"
  | "static-simple"
  | "dynamic"
  | "simple";

interface ModelInstanceCollisionSettings {
  mode: ModelInstanceCollisionMode;
  visible: boolean;
  simpleShape?: "box" | "sphere" | "capsule" | "convexHull";
  terrainResolution?: number;
  dynamicQuality?: "low" | "medium" | "high";
}
```

Rules:

- these settings are canonical authoring data
- generated collider geometry is derived/cacheable data
- collision generation is triggered by authored settings, not hidden import-time guesses
- `modelInstances` remain separate from `entities`
- collision debug rendering should be visually inspectable in editor and runner when enabled
- preferred implementation path is:
  - Rapier 3D WASM provides the collision/query layer
  - Rapier owns broad-phase and narrow-phase pruning
  - the editor document owns authored collider settings
  - generated collider geometry/handles are derived runtime/cache data
- collision modes should mean exactly:
  - `none` = no collider
  - `terrain` = heightfield collider, static only
  - `static` = triangle mesh collider, fixed only
  - `static-simple` = voxel-boxified fixed compound collider for static environment use
  - `dynamic` = convex decomposition into compound collider, dynamic/kinematic capable
  - `simple` = one cheap primitive or one convex hull
- initial support may be staged, but unsupported modes must fail clearly instead of silently degrading to random approximations

### Collision strategy progression

- early slices used handcrafted box-based player collision because only brush boxes existed
- once imported-model colliders require terrain, trimesh, convex hull, or compound collision, the preferred next step is a Rapier-backed collision/query layer
- this does not require a full gameplay physics sandbox in the same slice
- a valid intermediate state is:
  - fixed/queryable colliders for brushes and imported models
  - existing first-person movement adapted to query against Rapier-backed colliders
  - dynamic collider generation represented canonically even if full rigidbody simulation lands later

---

## `serialization`

Purpose:

- persistence of canonical authoring state

Contains:

- save/load functions
- migrations
- compatibility guards
- validation hooks
- round-trip checks

### Canonical save format

Use project JSON as the canonical save format.

Reasons:

- preserves editor semantics
- easy to version
- easy to diff
- easier to migrate than overloading glTF with editor-only metadata
- decouples authoring from runtime/export packaging

Canonical document format is not the same thing as the portable project format.

Once scenes reference external binary assets, JSON alone is no longer enough to move a project between machines.
At that point, the user-facing save/load format should be a **project package** built around:

- `scene.json`
- referenced asset payloads

`scene.json` may still contain multiple authored scenes inside one project document; the file name does not imply a single loaded runtime scene.

Recommended logical shape:

```txt
project/
  scene.json
  assets/
    ...
```

The project package may be represented as:

- a folder
- a zip/archive of that folder

Runner/deployment output is separate from this and should not become the editable source package by default.

### Migration rule

Every persisted schema change must be accompanied by:

- an explicit compatibility decision
- a version bump when needed
- a migration or compatibility test

Suggested load flow:

```ts
load -> detect version -> migrate stepwise -> validate -> use
```

Never silently reinterpret incompatible files.

---

## `shared-ui`

Purpose:

- reusable React UI elements across editor and runner shells

Contains:

- inspector controls
- outliner items
- browser panels
- dialogs
- status bars
- toasts
- property editors

This module should not own domain logic.
It should render state supplied by domain modules.

---

## Application layout

## `editor-web`

Main responsibilities:

- boot the editor app shell
- host React UI panels
- instantiate the editor viewport
- connect store/document/commands
- switch into play mode or launch runner context
- manage local draft persistence plus project package import/export actions

Suggested major areas:

- toolbar or command bar
- viewport region
- outliner
- inspector
- material browser
- asset browser
- status / validation panel

## `runner-web`

Main responsibilities:

- load a built or live scene
- initialize runtime systems
- expose navigation modes
- provide minimal UI overlay
- support embedding

Long-term, the runner may exist both:

- inside the editor for play mode
- as a standalone deployable viewer/player

---

## State management

Use a thin store for app/editor state orchestration.
Do not use the React tree as the canonical state container.

Recommended separation:

### Canonical/editor state

- scene document
- selection
- tool mode
- command history
- active project persistence state

### UI state

- panel visibility
- focused inspector tabs
- search queries
- dialog state
- viewport mode/layout

### Ephemeral viewport state

- hover hit
- drag preview
- temporary gizmo state
- frame timing
- pointer capture state

### Runtime ephemeral state

- active controller
- playing sounds
- trigger occupancy
- animation playback state
- project clock state

Keep ephemeral rendering and interaction state out of the serialized document.

---

## Build pipeline

The project has multiple derived outputs conceptually.
These should not be conflated.

### 1. Frontend app build

Standard web app bundling.

### 2. Runtime scene build

Transforms the document into runtime-usable data.

### 3. Project package build/import

Produces or reads the portable editable project format.
This is the user-facing save/load path once external assets exist.

### 4. Runner package build

Produces the deployable/playable output for sharing or embedding.

### 5. Optional later interchange export

Produces formats such as GLB/GLTF when that becomes worth implementing.

### Runtime scene build stages

Recommended conceptual pipeline:

```txt
SceneDocument
-> validate
-> resolve assets/materials/entities/model instances
-> build brush meshes
-> build model-instance collider data
-> build colliders
-> build runtime entity graph
-> assemble runtime scene package
```

In the near-term architecture, `build colliders` may include a mix of:

- brush-derived colliders
- imported-model-instance-derived colliders

without requiring a full general-purpose physics world.

### Project package build stages

```txt
SceneDocument
-> validate
-> resolve referenced project assets
-> emit scene.json
-> copy/embed referenced assets
-> produce portable project package
```

Recommended package shape:

```txt
project/
  scene.json
  assets/
    ...
```

The concrete output may be:

- a structured folder
- a zip/archive of that folder

But the logical model should remain “canonical scene JSON plus referenced assets”.

### Runner package build stages

```txt
SceneDocument
-> validate
-> build runtime scene data
-> resolve required assets
-> emit standalone runner package
-> optional post-process
```

### Optional later interchange export stages

```txt
SceneDocument
-> validate
-> build export scene graph
-> attach materials/textures/assets
-> emit GLTF/GLB
-> optional post-process
```

---

## Validation

Validation should exist at multiple boundaries.

### Document validation

Checks:

- missing references
- invalid entity property values
- invalid material refs
- invalid brush params
- duplicate IDs
- unsupported schema versions

### Build validation

Checks:

- unbuildable geometry
- unresolved assets
- incompatible runtime entity setups
- missing audio files
- invalid trigger targets

### Runtime validation

Checks:

- controller mode availability
- audio unlock restrictions
- failed asset loads
- unsupported browser features where relevant

Errors should surface clearly in the editor UI.

---

## Selection and picking architecture

Selection should not depend on raw scene traversal alone.
Use explicit mapping between visible pickable objects and domain IDs.

Recommended approach:

- maintain pick proxies or metadata bindings
- raycast against known pick layers
- convert hit -> domain selection result
- route through a selection service

Selection result examples:

- brush
- brush face
- entity
- model instance
- gizmo handle
- helper
- empty space

This makes picking predictable and testable.

---

## Tool architecture

Tools should be explicit modes with shared lifecycle hooks.

Example interface:

```ts
interface EditorTool {
  id: string;
  label: string;
  activate(ctx: ToolContext): void;
  deactivate(ctx: ToolContext): void;
  onPointerDown(e: ToolPointerEvent): void;
  onPointerMove(e: ToolPointerEvent): void;
  onPointerUp(e: ToolPointerEvent): void;
  onKeyDown?(e: KeyboardEvent): void;
  renderOverlay?(): void;
}
```

### Initial tool set

- select
- move
- scale
- create box brush
- material apply
- place entity

### Later tools

- face edit
- clip brush
- rotate brush
- vertex/edge editing
- prefab place

---

## Runner interaction architecture

Keep runtime interaction simple and data-driven first.

Prefer:
`Trigger -> Action -> Target`

Example link shape:

```ts
interface InteractionLink {
  id: string;
  sourceEntityId: string;
  trigger: "enter" | "exit" | "click";
  action:
    | { type: "teleportPlayer"; targetEntityId: string }
    | { type: "toggleVisibility"; targetId: string; visible?: boolean }
    | { type: "playAnimation"; targetModelInstanceId: string; clipName: string }
    | { type: "stopAnimation"; targetModelInstanceId: string; clipName?: string }
    | { type: "playSound"; targetEntityId: string }
    | { type: "stopSound"; targetEntityId: string };
}
```

Rules:

- trigger kinds are only valid for compatible entity types
- keep link validation explicit
- do not activate sound or animation actions before those systems exist

---

## Audio architecture

Audio should be a first-class runtime system.

### Core concepts

- listener
- positional emitter
- one-shot sound
- looped sound
- trigger-controlled playback

### Initial requirements

- spatial audio emitters
- distance falloff settings
- loop support
- runtime start/stop
- browser audio unlock handling

### Future requirements

- directional cones
- area ambience blending
- occlusion/obstruction
- subtitles/captions
- mixer buses

---

## Failure philosophy

The editor must remain trustworthy.

If something fails:

- preserve the last valid document
- show the failure clearly
- make it debuggable
- do not silently corrupt state
- do not hide build errors behind generic toasts

Categories:

- validation errors
- asset import failures
- geometry build failures
- runtime initialization failures
- browser capability restrictions

---

## Example end-to-end flow

### Editing a box room

1. User creates a box brush
2. Tool dispatches a create-box command
3. Document updates
4. Geometry rebuilds the derived preview mesh
5. Viewport updates the visible scene
6. User applies a material to a wall face
7. Command updates face material/UV state
8. Material preview refreshes
9. User hits Run
10. Runtime build validates the document and constructs runtime scene data
11. Runner starts in the selected navigation mode
12. User walks the scene with runtime interactions active

This is the core product loop.

---

## Minimal viable architecture boundary summary

Must remain separate:

- canonical document vs three.js objects
- editor viewport vs runtime scene
- command layer vs ad hoc mutation
- authoring JSON vs export/package output
- brush data vs generated mesh
- asset records vs model instances
- entities vs model instances
- UI state vs document state

If these boundaries hold, the product can grow safely.
If they collapse, the codebase will become brittle quickly.
