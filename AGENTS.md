# AGENTS.md

## Project identity

This repository contains a browser-based brush/solid editor for creating lightweight interactive 3D scenes, plus a built-in browser runner for playing those scenes.

The product goal is:

- Hammer / TrenchBroom style spatial authoring
- modern browser delivery
- glTF asset import/export
- fast edit -> run iteration
- lightweight interactive runtime with spatial audio, navigation modes, and simple entity-driven logic

This is not a general-purpose DCC.
This is not a full game engine.
This is a focused authoring + runtime tool for browser-delivered 3D spaces.

---

## Product pillars

1. **Brushes are sacred**
   - Layout authoring must remain faster than Blender.
   - Brush editing is a first-class workflow, not a legacy compatibility mode.
   - The editor must feel immediate, precise, and grid-friendly.

2. **Imported assets are first-class**
   - glTF / GLB import must feel native.
   - Imported meshes, materials, textures, and animations must coexist cleanly with brush-authored worlds.
   - Imported assets complement brushes; they do not replace them.

3. **The runner is built in**
   - Every meaningful authoring step should be testable in-browser.
   - Switching from edit mode to play mode should be nearly instant.
   - The runner is part of the product, not a demo app.

4. **Web-native sharing matters**
   - Scenes should be easy to load, embed, preview, and eventually share by URL.
   - The browser is a target platform, not a secondary export target.

---

## Architectural stance

When making design decisions, prefer:

- plain three.js over unnecessary abstraction
- explicit data models over implicit scene graph state
- deterministic rebuilds over hidden mutations
- command-based editing over ad hoc state changes
- typed scene entities over free-form JSON blobs
- vertical slices over speculative infrastructure
- boring, maintainable code over cleverness

The project uses:

- React for application shell and editor UI
- three.js for viewport and runtime rendering
- a canonical editor document model independent of three.js
- command pattern for undo/redo
- runtime entity systems for navigation, triggers, audio, and interaction
- glTF / GLB as the main interchange asset format
- JSON as the canonical authoring format

Do not collapse editor state into raw three.js objects.
Do not make the three.js scene the source of truth.
Do not make glTF the canonical editor save format.

---

## Early binding decisions

These defaults are intentionally fixed for the early slices unless a later slice explicitly changes them.

### Coordinate system

- world space is right-handed and **Y-up**
- `+X` is right, `+Y` is up
- scene units are meter-like and should be used consistently for movement, collision, and audio distances

### Early repo shape

- start as a single Vite app
- keep domain folders under `src/`
- do not introduce `/apps` + `/packages` or a monorepo split until the current code actually needs it

### State ownership

- do not use the React tree as the canonical state container
- keep canonical editor state in a thin external editor store/service
- React renders and dispatches commands; it does not own the document

### Persistence

- the canonical scene document is versioned from day one
- M0-M2 may use local draft persistence plus explicit JSON import/export
- when binary assets arrive, they must survive reloads via embedded data or project-scoped packaged storage
- never rely on ephemeral Blob URLs as the only persisted asset reference

### Early brush defaults

- Slice 1.1 box brushes are axis-aligned only
- arbitrary brush rotation is explicitly deferred
- canonical box face IDs are fixed and stable:
  - `posX`
  - `negX`
  - `posY`
  - `negY`
  - `posZ`
  - `negZ`
- `posY` is the top face and `negY` is the bottom face

### Model placement

- placed imported models are **model instances**, not typed entities
- keep model instances in a document collection separate from `entities`

### Runtime interaction scope

- keep trigger/action/target links explicit and typed
- do not activate actions for systems that do not exist yet
- add sound and animation actions only when those runtime systems are implemented

### Early clipping scope

- until a dedicated convex-brush slice exists, clipping must be constrained to results representable by currently supported brush kinds
- unsupported clip cases must fail clearly instead of inventing new hidden geometry rules

---

## Non-goals

Unless explicitly added to the roadmap, do not turn this project into:

- a general CAD package
- a Blender replacement
- a multiplayer MMO editor
- a full node-based visual scripting environment
- a full physics sandbox
- a photoreal AAA renderer
- a React Three Fiber showcase
- an ECS research project

We may add optional scripting, plugins, collaboration, or advanced baking later.
They are not v1 priorities.

---

## Core product vocabulary

Use these terms consistently:

- **Document**: canonical editor state
- **Brush**: author-authored solid/primitive in canonical brush form
- **Face**: one editable surface of a brush
- **Material**: logical authoring material definition
- **Texture**: image resource backing material channels
- **Asset**: imported external resource, usually GLB/GLTF or audio and related media
- **Model Instance**: placed scene instance of an imported asset
- **Prefab**: reusable asset/entity package placeable in scenes
- **Entity**: typed scene object with runtime/editor semantics
- **Runner**: browser runtime that loads and plays scenes
- **Viewport**: editor rendering surface
- **Command**: undoable state transition
- **Tool**: editor interaction mode such as select, move, box-create, face-edit
- **Build**: deterministic transformation from document -> runtime scene data
- **Export**: transformation to external deliverables such as GLB

Avoid vague terms like “object”, “thing”, “item”, or “component” when a more precise domain term exists.

---

## Repo expectations for agents

When working in this repo:

1. Read:
   - `AGENTS.md`
   - `architecture.md`
   - `roadmap.md`
   - `testing.md`

2. Respect the current vertical slice.
   - Do not “prepare for future flexibility” by adding unnecessary systems.
   - Implement the smallest coherent version that preserves the architecture.

3. Preserve layering.
   - `document` owns canonical state.
   - `commands` apply valid state changes.
   - `geometry` owns derived brush and collider generation.
   - `viewport-three` renders editor state.
   - `runtime-three` plays runtime state.
   - `entities` owns typed non-brush scene objects.
   - `assets` adapts external asset/audio/media formats.
   - `serialization` persists canonical state.

4. Do not bypass command infrastructure for editor mutations.
   - If the user can do it in the editor, it should usually be represented as a command.

5. If persisted schema changes, update compatibility explicitly.
   - bump the document schema version when required
   - add or update migrations
   - add at least one migration or compatibility test

6. Prefer explicit typing and explicit invariants.
   - Avoid permissive `any`, loose maps, or magic strings when a discriminated union or typed schema is appropriate.

7. Keep systems testable.
   - Geometry generation should be testable outside the browser UI.
   - Serialization should be round-trip tested.
   - Runtime interactions should be testable through deterministic fixtures where possible.

8. Keep browser concerns in mind.
   - Gracefully handle pointer lock failure, audio unlock requirements, missing gamepads, and asset load failures.
   - Avoid architecture that assumes native desktop privileges.

---

## Code quality rules

### General

- TypeScript only
- strict typing enabled
- prefer pure functions for transforms/build steps
- isolate impure browser/three.js side effects
- no silent catch-and-ignore
- no dead feature flags without roadmap justification
- no hidden singleton globals unless explicitly part of infrastructure

### Naming

- use descriptive names
- prefer domain names over generic utility names
- avoid abbreviations unless they are standard and obvious
- function names should describe intent, not implementation detail

Good:
- `buildRuntimeSceneFromDocument`
- `applyMaterialToSelectedFaces`
- `createBoxBrushCommand`

Bad:
- `handleThing`
- `updateData`
- `doBuild`

### File organization

- small files where it helps clarity
- split by domain, not by arbitrary technical categories
- avoid giant “misc” or “utils” dumping grounds
- every folder should have a clear reason to exist

### Comments

- explain *why*, not what the code obviously does
- use comments to document invariants, constraints, and tricky browser behavior
- remove stale comments promptly

### Error handling

- fail loudly in development
- surface usable diagnostics in the editor UI
- never corrupt the document silently
- preserve previous valid state on failed builds where possible

---

## Data model rules

The canonical authoring state must remain independent from three.js scene graph objects.

### Required separation

Maintain these layers:

1. **Authoring model**
   - JSON-serializable
   - versioned
   - typed
   - stable across runtime/editor rebuilds

2. **Editor view model**
   - three.js meshes, helpers, overlays, gizmos
   - disposable and rebuildable

3. **Runtime model**
   - play-mode scene graph
   - controllers, triggers, emitters, colliders, animation mixers

Do not let editor-only helpers leak into the canonical document.
Do not store raw three.js objects inside canonical document state.

### Brush rules

- brushes are not stored as triangle soup
- face material assignments are per-face
- UV transforms are canonical editor data
- runtime mesh generation is derived data
- collision generation is derived data
- early boxes are axis-aligned and use fixed face IDs

### Entity rules

- entities must be typed
- entity schemas must be explicit
- entity defaults must be centralized
- entity validation must happen at document/build boundaries
- model instances remain separate from entities

---

## Performance rules

Performance matters, but premature micro-optimization does not.

Priorities:

1. editor responsiveness during common operations
2. deterministic rebuild behavior
3. predictable memory usage
4. runtime smoothness for modest scenes
5. export/build correctness

When optimizing:

- measure first
- optimize hotspots, not aesthetics
- document assumptions
- prefer algorithmic improvements over clever hacks

Expected hotspots:

- picking/raycasting
- brush rebuilds / CSG
- face highlighting
- large texture browser lists
- imported asset previews
- runtime trigger scanning if implemented naively

---

## UX rules

The editor should feel like a real authoring tool, not a tech demo.

Prioritize:

- fast selection
- robust snapping
- visible grid and transform feedback
- obvious active tool state
- low-friction material application
- quick play testing
- understandable errors

Every new feature should answer:
- What does the user see?
- What does the user click/drag/type?
- How is failure communicated?
- How is the action undone?
- How is the result tested?

---

## Vertical slice policy

We build in vertical slices.
Each slice must deliver a complete, usable capability across all relevant layers.

A good slice includes:
- document changes
- commands
- viewport behavior
- UI panel updates
- runner behavior if relevant
- persistence
- tests
- manual QA notes

A bad slice is “just backend structure” or “just a partial UI”.

Do not land architectural scaffolding that has no immediate use in the current slice.

If a roadmap item is too large for one pass, split it into smaller end-to-end sub-slices instead of landing half-systems.

---

## Typical slice shape

For each slice, agents should aim to deliver:

1. domain model changes
2. command(s)
3. viewport interaction/tooling
4. UI affordance
5. serialization support
6. runtime/build support if needed
7. tests
8. docs update if behavior changed materially

---

## Decision heuristics

When uncertain:

### Prefer plain three.js over extra abstraction
Unless abstraction clearly simplifies repeated patterns.

### Prefer canonical JSON over reusing runtime/export data structures
The editor’s needs are different from export/runtime needs.

### Prefer typed entity schemas over generic script bags
Especially in early versions.

### Prefer constrained capabilities that feel good over flexible capabilities that feel vague
Example:
- better to have one excellent box-brush tool than five half-working primitive tools

### Prefer immediate usability over speculative extensibility
But preserve clean seams for future extensions.

---

## What agents must not do

Do not:

- rewrite broad project structure without a strong reason
- introduce new framework dependencies casually
- add R3F because “we might want it later”
- introduce ECS because “games use ECS”
- over-generalize the entity system
- replace canonical brush data with raw mesh editing
- implement hidden magic behaviors without schema support
- remove tests to get green CI
- make visual changes without noting them in the slice summary
- ignore browser restrictions around input/audio

---

## Required deliverables in implementation responses

When making meaningful changes, include:

1. what changed
2. why it changed
3. which files were added/updated
4. how to run/test it
5. known limitations
6. follow-up suggestions only if directly relevant

If the environment prevents verification, state exactly what was and was not verified.

---

## Definition of done for a slice

A slice is done when:

- the feature can be used end-to-end
- the feature is represented in canonical document data
- the feature can be saved and loaded
- the feature is test-covered appropriately
- the feature has manual verification notes
- the feature does not violate the architecture
- obvious failures produce usable diagnostics
- undo/redo works if the feature is editor-authored

---

## Preferred stack unless changed deliberately

- TypeScript
- React
- Vite
- three.js
- Vitest
- Playwright
- ESLint
- Prettier
- a small state store if needed
- minimal dependencies overall

Add dependencies only when they clearly save time and complexity over building in-house.

---

## Final instruction to agents

Build the smallest coherent thing that feels real.

The product should always trend toward:
- spatial immediacy
- authoring clarity
- browser-native practicality
- fast iteration
- strong foundations for brushes, assets, entities, and runner behavior

If forced to choose, preserve the integrity of:
1. the canonical document model
2. the brush workflow
3. the edit -> run loop
