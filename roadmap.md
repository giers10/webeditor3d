# roadmap.md

## Overview

This roadmap is organized as vertical slices.
Each slice must deliver an end-to-end usable capability across:

- document model
- commands
- viewport/editor behavior
- UI
- persistence
- runner behavior where relevant
- tests
- manual QA notes

We optimize for:

- proving the product loop early
- preserving architecture
- shipping coherent slices
- avoiding speculative complexity

If a roadmap item is too large for one implementation pass, split it into smaller end-to-end sub-slices rather than landing half-systems.

---

## Product north star

A browser-based brush editor with a built-in runner, enabling users to quickly create and share lightweight interactive 3D spaces with:

- brush-authored layout
- material/texture workflows
- imported GLB/GLTF assets
- spatial audio
- typed entities and simple interactions
- optional navigation modes

---

## Early project decisions

These are locked for the early milestones:

- world space is **Y-up**
- early repo shape is a single Vite app with domain folders under `src/`
- canonical document state lives outside the React tree
- the document is versioned from day one
- early box brushes are axis-aligned only with fixed face IDs
- placed imported models are `modelInstances`, not `entities`
- local draft persistence plus explicit JSON import/export is acceptable early
- broad roadmap items may be split into smaller implementation chats as long as each chat still lands a coherent vertical slice

---

## Milestone structure

### Milestone 0
Foundation and repo discipline

### Milestone 1
First real room: brush layout + materials + play mode

### Milestone 2
Entities and runtime interaction

### Milestone 3
Imported models, animation, and audio

### Milestone 4
Better brush editing and authoring ergonomics

### Milestone 5
Scene packaging, sharing, and quality improvements

### Milestone 6
Power-user systems and ecosystem growth

---

## Milestone 0 — Foundation

### Goals

Create the minimum project skeleton that supports fast vertical slicing without overbuilding.

### Deliverables

- repo structure established under a single app
- TypeScript + Vite + React app booting
- three.js viewport shell visible
- thin external editor store/document skeleton
- versioned scene document and migration entry point
- command history scaffold
- local draft save/load scaffold plus JSON import/export scaffold
- test runner setup
- Playwright basic smoke setup
- docs established and aligned

### Acceptance criteria

- app boots locally
- empty viewport renders
- empty document loads
- command stack can push a dummy command and undo/redo
- one smoke test passes
- docs exist and are consistent

### Out of scope

- real geometry tools
- real runtime
- real asset import
- full inspector

---

## Milestone 1 — First playable slice

### Vision

The user can create a box brush, assign materials to faces, save the scene, reload it, and run around it.

This is the first proof that the product is real.

### Slice 1.1 — Box brush authoring

#### Deliverables

- axis-aligned box brush schema
- stable box face IDs
- create box brush command
- select box brush
- move/resize box brush
- grid snapping
- viewport render of box brushes
- basic outliner presence
- save/load support

#### Acceptance criteria

- user can create at least one box brush
- box persists through save/load
- selection works reliably
- transform edits are undoable
- no arbitrary brush rotation is introduced yet

---

### Slice 1.2 — Face materials and UV basics

#### Deliverables

- material registry
- small local starter material library
- face selection
- apply material to a single face
- basic UV controls:
  - offset
  - scale
  - rotate 90-degree steps
  - flip U/V
  - fit to face by rewriting explicit UV values
- inspector integration
- material browser panel

#### Acceptance criteria

- user can texture a simple room quickly
- per-face assignments persist through save/load
- UV edits persist
- editor rendering reflects those changes immediately

---

### Slice 1.3 — Runner v1

#### Deliverables

- runtime build from document
- first-person navigation
- orbit visitor mode
- mode switch
- minimal typed `PlayerStart` support
- basic collision against axis-aligned box brush geometry
- play-from-editor action

#### Acceptance criteria

- user can press Run and navigate the scene
- first-person works with keyboard/mouse
- orbit visitor works
- leaving run mode returns to editor state safely
- `PlayerStart` does not need to be rebuilt later as a separate foundation

---

### Slice 1.4 — End-to-end polish for “first room”

#### Deliverables

- status/errors panel
- document validation basics
- improved snapping feedback
- basic toolbar
- coherent save/load UX for the current persistence path
- basic scene settings if needed

#### Acceptance criteria

- creating a tiny room feels coherent
- failures are visible
- no obvious corruption issues
- smoke tests cover the loop

---

## Milestone 2 — Entity-driven interactions

### Vision

The user can place non-brush entities and author simple interactive scenes without scripting.

### Slice 2.1 — Entity system foundation

#### Deliverables

- typed entity base
- entity registry
- entity icons/helpers in viewport
- entity placement workflow
- entity inspector
- save/load support
- extension of the existing `PlayerStart` path rather than a parallel rewrite

#### Initial entity types

- PlayerStart
- SoundEmitter
- TriggerVolume
- TeleportTarget
- Interactable

#### Acceptance criteria

- entities can be placed, selected, edited, saved, and loaded
- runtime build can consume them
- model instances remain separate from entities

---

### Slice 2.2 — Trigger -> Action -> Target foundation

#### Deliverables

- typed trigger/action/target schema
- action dispatch pipeline
- editor UI for linking
- runtime evaluation

#### Initial trigger sources

- TriggerVolume enter
- TriggerVolume exit

#### Initial actions

- teleport player
- toggle visibility

Sound and animation actions are intentionally deferred until their runtime systems exist.

#### Acceptance criteria

- user can build a basic non-scripted interaction without code
- links survive save/load
- runtime behavior is deterministic

---

### Slice 2.3 — Click interactions and runner prompts

#### Deliverables

- click target support
- prompt UI
- action-on-click behavior
- interaction distance settings
- compatibility with the existing trigger/action/target system

#### Acceptance criteria

- user can click an entity to trigger something
- prompts are understandable
- keyboard/controller fallback rules are documented

---

## Milestone 3 — Assets, animation, audio

### Vision

The tool becomes more than brush-only by supporting imported GLB/GLTF assets and native spatial audio.

### Slice 3.1 — GLB/GLTF import

#### Deliverables

- import workflow
- asset registry
- persistent project storage for imported binary data
- place imported model instance
- transform model instance
- save/load support for asset refs and model instances

#### Acceptance criteria

- user can import a GLB/GLTF and place it in scene
- asset metadata is preserved
- imported assets survive reload
- runtime renders imported model instances correctly

---

### Slice 3.2 — Animation playback

#### Deliverables

- detect imported animations
- animation config on model instances or equivalent explicit target config
- play/stop animation actions
- animation trigger binding

#### Acceptance criteria

- imported animated asset can be triggered in runner
- editor exposes basic animation controls/settings

---

### Slice 3.3 — Spatial audio

#### Deliverables

- audio asset import/reference
- positional emitter runtime support
- distance settings
- loop/one-shot settings
- triggerable playback
- browser audio unlock UX
- play/stop sound actions integrated into the trigger system

#### Acceptance criteria

- sound emits from authored world positions
- playback is spatial in runner
- author can test it locally with clear UX

---

## Milestone 4 — Better brush ergonomics

### Vision

The editor starts feeling closer to the old-school map-editor joy.

These roadmap items may be delivered as multiple smaller implementation chats if that produces cleaner vertical slices.

### Slice 4.1 — More brush primitives

#### Deliverables

- wedge/ramp
- cylinder prism
- stairs
- arch

#### Acceptance criteria

- each new primitive is:
  - creatable
  - editable
  - save/load safe
  - renderable in runner
  - covered by geometry tests

---

### Slice 4.2 — Brush clipping

#### Deliverables

- clip tool
- split/keep side options
- preview visualization
- undo/redo support

#### Acceptance criteria

- clip operations are predictable and reversible
- resulting brushes remain valid
- unsupported clip cases fail clearly instead of silently producing ad hoc geometry

---

### Slice 4.3 — Better viewport layouts

#### Deliverables

- top/front/side orthographic views
- optional split layout
- improved transform workflows
- configurable snapping

#### Acceptance criteria

- level-authoring speed materially improves
- camera controls are documented and stable

---

## Milestone 5 — Material and ecosystem maturity

### Vision

The editor becomes attractive for repeated use, not just demos.

These items are also likely candidates for sub-slices if needed.

### Slice 5.1 — Better material library

#### Deliverables

- categories
- tags
- search
- favorites
- recent materials
- starter library expansion

#### Acceptance criteria

- material assignment feels fast
- modestly larger libraries remain usable

---

### Slice 5.2 — Prefabs and reusable assets

#### Deliverables

- prefab definition support
- prefab placement
- prefab instance updating rules
- prefab browser

#### Acceptance criteria

- user can create or import reusable building blocks
- instances remain manageable
- update behavior is explicit and documented

---

### Slice 5.3 — Export and packaging improvements

#### Deliverables

- GLB export improvements
- scene packaging options
- embeddable runner route or bundle
- production asset optimization hooks where easy and justified

#### Acceptance criteria

- user can reasonably share or deploy scenes
- runner package loads reliably in target browsers

---

## Milestone 6 — Power-user growth

### Vision

Expand capability without compromising the core.

### Candidate slices

- advanced UV tools
- nav waypoints authoring
- camera zones / guided tours
- ambient zones and audio buses
- lightweight scripting
- plugin/tool API
- collaborative editing groundwork
- remote asset libraries
- scene templates/starter kits

These are only pursued after the earlier core loop feels solid.

---

## Priority order inside the roadmap

When schedule pressure forces tradeoffs, prefer work that strengthens:

1. edit -> save/load -> run loop
2. brush ergonomics
3. material/texture speed
4. typed entities and interactions
5. imported asset support
6. runner stability and input/audio quality
7. ecosystem niceties

---

## Definition of “vertical slice complete”

A slice is complete only when:

- the feature is usable by a human end-to-end
- it is represented in the canonical document
- it supports save/load
- it is visible and usable in the UI
- it is test-covered appropriately
- obvious failure modes are handled
- it does not violate architecture boundaries

---

## Known risk areas

### High-risk technical areas

- brush geometry robustness
- per-face UV persistence
- picking accuracy
- collision generation from brush data
- imported asset/material compatibility
- browser audio unlock behavior
- input edge cases across browsers
- export correctness

### Process risks

- overbuilding infrastructure before a slice needs it
- letting the three.js scene graph become canonical state
- adding too many entity types too early
- under-testing geometry/serialization boundaries
- chasing polish before proving workflow

---

## Quality gates by milestone

### M0 quality gate
- app boots
- empty document loads
- docs stable
- tests run

### M1 quality gate
- user can make a textured room, save/reload it, and walk it

### M2 quality gate
- user can place interactive entities without code

### M3 quality gate
- user can import a GLB and combine it with brush scenes, animation, and audio

### M4 quality gate
- editor starts feeling genuinely ergonomic

### M5 quality gate
- project becomes reusable for real experiments / small productions

---

## Deferred items list

These are explicitly deferred unless reprioritized:

- full multiplayer collaboration
- advanced physics gameplay
- procedural generation systems
- full scripting VM
- lightmapping pipeline
- node-based materials
- native desktop packaging as a priority
- R3F integration as a core dependency
- custom rendering backend beyond three.js

---

## Expected first public “wow” moment

The first moment that will make the product feel truly exciting is likely this:

1. create a brutalist room with box brushes
2. texture faces quickly from the library
3. import an animated GLB sculpture or door
4. place a positional sound source
5. hit Run
6. walk through it in-browser with sound and interaction

The roadmap should always move toward making that loop feel better.
