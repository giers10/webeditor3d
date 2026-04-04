# CHAT_CONTEXT.md

This file is the lightweight startup context for new Codex chats.

Read this after `AGENTS.md`.
Then inspect only the relevant sections of `architecture.md`, `roadmap.md`, and `testing.md` for the active slice.

This file does not replace the full docs.
It exists to keep new chats focused and to reduce repeated context load.

---

## Product summary

This repo is a browser-based 3D scene authoring tool with a built-in runner.

Core loop:

1. author a scene
2. save/load it reliably
3. run it in-browser immediately

The product prioritizes:

- brush-first spatial authoring
- imported assets as first-class additions
- typed entities and simple interactions
- browser-native delivery

It is not:

- a full game engine
- a Blender replacement
- a general CAD tool
- an R3F showcase

---

## Hard architectural rules

- The canonical `SceneDocument` is the source of truth.
- The document must stay independent from three.js objects.
- Editor-authored mutations should flow through commands.
- The editor viewport is derived from the document.
- The runner is a sibling system, not an editor hack.
- Canonical document format is project JSON, not glTF/GLB.
- Portable save/load for asset-bearing scenes should use a project package built around that JSON.
- Runner/deployment output is downstream from the document/runtime build and is separate from editable project save/load.
- Model instances are separate from typed entities.

---

## Early binding decisions

These are fixed for the early milestones unless a later slice explicitly changes them.

### Coordinates and units

- world is right-handed and **Y-up**
- `+X` is right
- `+Y` is up
- units are meter-like

### Repo shape

- keep the repo as a single Vite app
- keep domain folders under `src/`
- do not split into a monorepo early

### State ownership

- do not use the React tree as the canonical state container
- keep canonical state in a thin external editor store/service

### Persistence

- version the document from day one
- keep migrations explicit
- early project persistence can be local draft storage plus JSON import/export
- once binary assets exist, portable save/load should use a project package such as `scene.json` plus bundled assets
- canonical JSON stays the source document format underneath that project package
- runner package output is a separate deployable artifact
- binary assets must survive reload via embedded or project-scoped persistent storage
- never rely on Blob URLs as the only persisted asset reference

### Early box brushes

- first brush kind is an axis-aligned box
- arbitrary brush rotation is deferred
- stable box face IDs are:
  - `posX`
  - `negX`
  - `posY`
  - `negY`
  - `posZ`
  - `negZ`
- `posY` is top and `negY` is bottom

### Early UV data

Per face, keep explicit UV transform values such as:

- `offset`
- `scale`
- `rotationQuarterTurns`
- `flipU`
- `flipV`

“Fit to face” should rewrite explicit values, not add a magical persistent flag.

### Model placement

- imported assets live in the asset registry
- placed imported models live in `modelInstances`
- typed scene objects like `PlayerStart`, `TriggerVolume`, or lights live in `entities`
- collision authoring for imported models belongs on `modelInstances`, not asset records
- generated imported-model collider data should be derived from asset geometry + instance transform + authored settings
- for imported-model collider types beyond simple boxes, prefer a Rapier-backed collision/query layer over extending the handcrafted collision code indefinitely
- broad-phase and narrow-phase pruning should come from that collision/query layer, not custom app code

### Interaction scope

- keep `Trigger -> Action -> Target` typed and explicit
- do not add actions for systems that do not exist yet

### World environment vs local lights

- global background / ambient / sun / fog belong in `world` settings
- local authored lights belong in typed entity schemas
- true skyboxes or environment textures belong after persistent asset storage exists

---

## What a good slice looks like

Each slice should land the smallest coherent end-to-end version of the feature across the layers it touches:

- document data
- commands
- viewport behavior
- runner behavior if relevant
- persistence
- UI
- tests

Do not land speculative scaffolding with no immediate slice use.

If a roadmap item is too large, split it into smaller vertical slices.

---

## Required habits for implementation

- Inspect the current repo first.
- Extend the current implementation instead of restarting architecture.
- If persisted schema changes, update versioning/migrations and add a compatibility test.
- Run the narrowest relevant checks you can.
- Report what was actually verified.

---

## Early slice ordering to keep in mind

- M0: foundation, document, commands, persistence, test setup
- M1: axis-aligned box brushes, face materials/UVs, runner, first-room polish, world lighting basics
- M2: typed entities, simple trigger/action/target interactions, click interactions
- M3: GLB/GLTF import, local lights + skyboxes, animation, spatial audio

That ordering matters because:

- world settings do not need entity or asset pipelines
- local lights need the entity system
- skyboxes need persistent asset storage
- animation and audio actions should land only with those runtime systems

---

## When to open the full docs

Open the relevant full sections when:

- persistence schema changes
- runtime/editor boundaries are being touched
- a slice adds new tests or new failure modes
- geometry semantics are non-trivial
- import/export behavior changes

Otherwise, stay focused on the active slice and keep the implementation small.
