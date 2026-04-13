# AGENTS.md

## Purpose

This is the mandatory high-signal brief for agents working in this repo.

Read this file first.
Then read `CHAT_CONTEXT.md`.
After that, inspect the code and open only the relevant sections of `architecture.md`, `roadmap.md`, and `testing.md`.

Do not read the large docs end-to-end by default.

When docs and code disagree:

1. trust the code for current behavior
2. trust `AGENTS.md` + `CHAT_CONTEXT.md` for current intent
3. use the larger docs as selective reference
4. update stale docs if your slice materially changes behavior

---

## Product

This repo is a browser-based engine/editor for interactive 3D environments with a built-in runner.

Core loop:

1. author
2. save/load
3. run immediately in-browser

Primary product priorities:

- intuitive whiteboxing / level blocking
- imported assets as first-class content
- typed entities and simple interactions
- very fast edit -> run iteration
- web-native delivery and sharing

This is not:

- a Blender replacement
- a general CAD tool
- an unlimited engine platform
- a full physics sandbox unless the roadmap explicitly says so

---

## Hard Rules

### Canonical state

- The canonical `SceneDocument` / project state is the source of truth.
- Do not store three.js objects in canonical document state.
- Do not make the three.js scene graph the source of truth.
- Editor-authored mutations should go through commands.

### Layering

- `document` owns canonical state
- `commands` own undoable mutations
- `geometry` owns derived solid/mesh/collider generation
- `viewport-three` owns editor rendering and interaction helpers
- `runtime-three` owns play-mode runtime behavior
- `entities` own typed non-model scene objects
- `assets` own imported external resources and adapters
- `serialization` owns save/load/versioning/migrations

### Persistence

- The document is versioned from day one.
- If persisted schema changes, update version/migration/validation and add at least one compatibility test.
- Canonical save format is project JSON.
- Once binary assets matter, user-facing save/load must be a portable project package containing canonical JSON plus referenced assets.
- Runner/deployment output is separate from editable save/load.
- Never rely on Blob URLs as the only persisted asset reference.

### Models, entities, world

- Imported assets live in the asset registry.
- Placed imported models live in `modelInstances`.
- `modelInstances` are not `entities`.
- Typed runtime/editor objects such as `PlayerStart`, `TriggerVolume`, and lights live in `entities`.
- Global ambient/sun/background/fog belong in `world` settings.
- Local authored lights belong in typed entity schemas.

### Project time and living-world direction

- Project time is a global project-level system, not a separate main clock per scene.
- Scene world settings may opt in/out of time-driven lighting, but scenes should not own independent core time progression.
- Near-term time slices should prioritize authored day/night control:
  - sunrise/sunset
  - day phases
  - night/dawn/dusk appearance
  - scene-level lighting opt-in/out
- Do not build a large generic schedule editor before the runtime hooks it would drive are real.
- Long-term world logic should resolve deterministically from:
  - global time
  - persistent/cycle flags
  - scene/location context
- Prefer deterministic resolution over fully simulating unloaded scenes.
- NPC presence, routines, dialogue variants, interaction availability, and path progress should eventually be reconstructible from authored rules plus global state.
- If loop/reset mechanics are added later, they should reset/re-resolve cycle-scoped state rather than trying to rewind arbitrary runtime simulation.

### Imported model collision

- Collision authoring for imported models belongs on `modelInstances`, not assets.
- Supported imported-model collision modes must stay explicit and typed.
- Generated collision data is derived data, not canonical source data.
- If broad-phase/narrow-phase pruning or non-box collider support is needed, prefer Rapier over custom collision math.
- Collision mode meanings are fixed unless deliberately changed:
  - `none` = no collider
  - `terrain` = heightfield collider, static only
  - `static` = triangle mesh collider, fixed only
  - `static-simple` = voxel-boxified fixed compound collider for static environment use
  - `dynamic` = convex decomposition into compound collider, dynamic/kinematic capable
  - `simple` = one cheap primitive or one convex hull

### Whiteboxing direction

- The product is moving away from grid-bound brush thinking toward whitebox solids.
- Floating point position/rotation/scale are allowed.
- The grid is a snap/reference helper, not a hard law.
- Whiteboxing should converge on one coherent transform-driven interaction model.
- Object / face / edge / vertex editing are valid goals.
- Non-planar quads are acceptable if derived triangulation is deterministic.
- Whitebox solids do not have to remain convex.
- Collision should come from the solid collider path, not old axis-aligned assumptions.

---

## Implementation Strategy

### Default workflow

1. Inspect the current repo first.
2. Extend the existing implementation.
3. Keep the slice as small and vertical as possible.
4. Reuse existing paths instead of adding parallel architecture.
5. Verify with the narrowest relevant checks.

### Vertical slices

Good slice:

- document changes
- commands
- viewport/editor behavior
- UI
- persistence
- runner behavior if relevant
- tests
- brief manual QA notes

Bad slice:

- scaffolding with no user-facing payoff
- duplicate systems
- speculative abstractions

### Read selectively

Only open full reference sections when needed:

- `architecture.md` for non-trivial runtime/editor/data-model boundaries
- `roadmap.md` for future direction and accepted scope
- `testing.md` for which test layers to add

If the slice is local and obvious, do not reload half the repo’s docs.

---

## Code Rules

### Do

- use TypeScript only
- keep types explicit
- prefer pure functions for transforms/build steps
- isolate browser/three.js side effects
- fail loudly in development
- surface useful diagnostics instead of silently ignoring errors
- keep geometry/collision generation testable outside the browser where practical

### Don’t

- add R3F casually
- add ECS casually
- over-generalize the entity system
- replace canonical whitebox data with hidden renderer-only mutations
- invent hidden magic behavior without schema support
- remove tests to get green CI
- silently corrupt state on failure

---

## UX Rules

Prioritize:

- fast selection
- direct transforms
- understandable tool state
- visible feedback
- quick play testing
- clear failure modes

Every meaningful feature should answer:

- what the user sees
- what the user clicks/drags/types
- how it is undone
- how failure is shown
- how it is tested

---

## Testing Rules

At minimum, match the slice:

- pure/domain tests for deterministic logic
- serialization tests for persisted features
- runtime/build tests where runtime behavior changes
- browser/e2e only when real browser behavior matters

If schema changes:

- add round-trip coverage
- add migration/compatibility coverage

Prefer small explicit fixtures over giant snapshots.

---

## Vocabulary

Use precise terms:

- `Document`: canonical editor state
- `Whitebox Solid`: author-authored blockout / gameplay-space solid
- `Box Solid`: the first whitebox solid shape; old code may still say “box brush”
- `Face` / `Edge` / `Vertex`: editable parts of a whitebox solid
- `Asset`: imported external resource
- `Model Instance`: placed instance of an imported asset
- `Entity`: typed scene object with editor/runtime semantics
- `Collider`: derived runtime collision representation
- `Project Package`: portable editable bundle
- `Runner Package`: deployable playable output
- `Build`: deterministic document -> runtime transformation

Avoid vague terms like “thing” or “object” when a domain term exists.

---

## Required Closeout

For meaningful changes, report briefly:

1. what changed
2. why
3. files touched
4. how you verified it
5. known limitations

If you could not verify something, say so plainly.
