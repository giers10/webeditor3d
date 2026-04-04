# AGENTS.md

## Project identity

This repository contains a browser-based engine/editor for creating interactive 3D environments, with a built-in browser runner for immediate playtesting.

The product goal is:

- intuitive whiteboxing and scene assembly for interactive 3D spaces
- modern browser delivery
- glTF asset import, with optional later interchange export
- fast edit -> run iteration
- lightweight interactive runtime with spatial audio, navigation modes, and simple entity-driven logic

This is not a general-purpose DCC.
This is not an unlimited AAA engine platform.
This is a focused engine/editor for browser-delivered interactive 3D environments.

---

## Product pillars

1. **Interactive environments come first**
   - The tool exists to build playable interactive 3D spaces for the web.
   - The editor and runner are one product, not separate concerns.
   - One-click edit -> run must remain central.

2. **Whiteboxing is sacred**
   - Layout authoring must remain faster and more direct than using a general DCC for the same task.
   - Whiteboxing is a first-class workflow, not a temporary preproduction mode.
   - The editor must feel immediate and precise, with snapping available as a helper rather than a hard restriction.

3. **Imported assets are first-class**
   - glTF / GLB import must feel native.
   - Imported meshes, materials, textures, and animations must coexist cleanly with whitebox-authored worlds.
   - Imported assets complement whiteboxing; they do not replace it.

4. **The runner is built in**
   - Every meaningful authoring step should be testable in-browser.
   - Switching from edit mode to play mode should be nearly instant.
   - The runner is part of the product, not a demo app.

5. **Web-native sharing matters**
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
- glTF / GLB as the main imported 3D asset format
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
- once binary assets matter, user-facing save/load must become a portable project package containing canonical scene JSON plus referenced assets
- canonical scene JSON remains the source document format, but by itself is no longer a portable project once external assets exist
- runner/deployment output is a separate downstream package, not the editable project format
- when binary assets arrive, they must survive reloads via embedded data or project-scoped packaged storage
- never rely on ephemeral Blob URLs as the only persisted asset reference

### Current box-solid defaults

- early slices began with axis-aligned box brushes
- canonical box face IDs are fixed and stable:
  - `posX`
  - `negX`
  - `posY`
  - `negY`
  - `posZ`
  - `negZ`
- `posY` is the top face and `negY` is the bottom face
- future geometry slices may evolve these box-authored solids into freely transformable whitebox solids while preserving stable face identity where practical

### Whitebox geometry direction

- the product is moving from grid-bound brush thinking toward intuitive whitebox solids for level blocking
- floating point position, rotation, and scale are allowed
- the grid is a snap/reference aid, not a hard authoring law
- whitebox boxes should support object, face, edge, and vertex interaction modes
- non-planar quads are acceptable; rendering/build should triangulate them deterministically
- whitebox solids do not need to stay convex
- derived collision for whitebox solids should come from the solid-collider path, not from an assumption that all geometry is convex or axis-aligned

### Model placement

- placed imported models are **model instances**, not typed entities
- keep model instances in a document collection separate from `entities`

### Imported model collision scope

- collision authoring for imported models belongs on `modelInstances`, not on asset records
- the canonical source of truth is authored collision settings, not cooked collider bytes
- generated collider data may be cached or rebuilt, but it is derived from:
  - imported model asset geometry
  - model instance transform
  - authored collision settings
- for imported-model collider support beyond simple boxes, prefer integrating a real collision/query library such as Rapier over inventing custom broad-phase/narrow-phase code in-house
- let the collision/query layer own broad-phase and narrow-phase pruning instead of re-implementing that manually in app code
- do not turn this slice into a full physics sandbox or general rigidbody architecture rewrite unless the roadmap explicitly asks for that
- near-term slices may adapt or replace the current handcrafted runner collision path where necessary so brush and imported-model colliders can participate in one coherent collision/query system

### Runtime interaction scope

- keep trigger/action/target links explicit and typed
- do not activate actions for systems that do not exist yet
- add sound and animation actions only when those runtime systems are implemented

### Whitebox editing scope

- object, face, edge, and vertex editing should converge on one coherent transform-driven interaction model
- `G / R / S` style modal transforms with axis constraints are a good fit for whiteboxing
- clipping/extrusion/other topology tools should come after the whitebox-solid interaction model is coherent
- unsupported geometry edits must fail clearly instead of inventing hidden topology rules

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
- **Whitebox Solid**: author-authored blockout/level-shaping solid used for layout and gameplay space
- **Box Solid**: the first whitebox solid shape; current code may still refer to this historically as a box brush
- **Face**: one editable surface of a whitebox solid
- **Edge**: one editable edge of a whitebox solid
- **Vertex**: one editable point of a whitebox solid
- **Material**: logical authoring material definition
- **Texture**: image resource backing material channels
- **Asset**: imported external resource, usually GLB/GLTF or audio and related media
- **Model Instance**: placed scene instance of an imported asset
- **Collider**: runtime collision representation derived from brushes or imported models
- **Prefab**: reusable asset/entity package placeable in scenes
- **Entity**: typed scene object with runtime/editor semantics
- **Project Package**: portable editable bundle containing canonical scene JSON plus referenced assets
- **Runner Package**: deployable playable output for the built-in runner
- **Runner**: browser runtime that loads and plays scenes
- **Viewport**: editor rendering surface
- **Command**: undoable state transition
- **Tool**: editor interaction mode such as select, create, transform, or face-edit
- **Build**: deterministic transformation from document -> runtime scene data
- **Export**: downstream transformation to deployable or interchange deliverables such as runner packages or optional later GLB

Avoid vague terms like “object”, “thing”, “item”, or “component” when a more precise domain term exists.

---

## Repo expectations for agents

When working in this repo:

1. Read:
   - `AGENTS.md`
   - `CHAT_CONTEXT.md`
   - then inspect the relevant sections of `architecture.md`, `roadmap.md`, and `testing.md` for the active slice
   - if a slice touches persistence, runtime, or testing boundaries in a non-obvious way, read the relevant full doc sections before changing code

2. Respect the current vertical slice.
   - Do not “prepare for future flexibility” by adding unnecessary systems.
   - Implement the smallest coherent version that preserves the architecture.

3. Preserve layering.
   - `document` owns canonical state.
   - `commands` apply valid state changes.
   - `geometry` owns derived solid and collider generation.
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

### Whitebox geometry rules

- whitebox solids are canonical authoring objects, not raw renderer state
- face material assignments are per-face
- UV transforms are canonical editor data
- render triangulation is derived data
- collision generation is derived data
- non-planar quad faces are acceptable if the derived mesh triangulates them deterministically
- whitebox solids do not need to remain convex
- current box solids still use stable face IDs, even if later slices relax earlier axis-aligned constraints

### Entity rules

- entities must be typed
- entity schemas must be explicit
- entity defaults must be centralized
- entity validation must happen at document/build boundaries
- model instances remain separate from entities

### Imported model collision rules

- collision settings for imported models live on `modelInstances`
- supported collision modes must be explicit and typed
- generated collision geometry is derived data, not the canonical source document
- collision debug visibility is editor/runtime UI state driven by authored settings, not a hidden renderer-only toggle
- avoid implicit “always collide with render mesh” behavior
- if broad-phase/narrow-phase pruning or non-box collider support is needed, prefer Rapier over ad hoc custom collision math
- collision modes mean:
  - `none` = no collider
  - `terrain` = heightfield collider, static only
  - `static` = triangle mesh collider, fixed only
  - `dynamic` = convex decomposition into compound collider, dynamic/kinematic capable
  - `simple` = one cheap primitive or one convex hull

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
- whitebox mesh rebuilds / solid triangulation
- face highlighting
- large texture browser lists
- imported asset previews
- runtime trigger scanning if implemented naively

---

## UX rules

The editor should feel like a real authoring tool, not a tech demo.

Prioritize:

- fast selection
- trustworthy snapping when enabled
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
- better to have one excellent whitebox-solid editing flow than five half-working primitive tools

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
- replace canonical whitebox data with hidden renderer-only mesh mutations
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
- strong foundations for whiteboxing, assets, entities, and runner behavior

If forced to choose, preserve the integrity of:
1. the canonical document model
2. the whiteboxing workflow
3. the edit -> run loop
