# testing.md

## Philosophy

This project is a tool and a runtime.

That means we must test both:

- **correctness of authored data and transformations**
- **actual browser behavior experienced by the user**

We do not rely on a single testing style.
We use a layered strategy:

1. unit tests
2. domain/model tests
3. geometry and serialization tests
4. browser-level integration tests
5. end-to-end tests
6. manual QA for spatial/editor ergonomics

The goal is not maximal test count.
The goal is confidence in the edit -> save/load -> run loop.

Early in the roadmap, “save/load” may mean local draft persistence plus JSON import/export.
Once scenes depend on external binary assets, “save/load” must expand to cover the portable project package path as well.

---

## Testing priorities

Highest-priority confidence areas:

1. document validity and migrations
2. undo/redo correctness
3. whitebox geometry generation correctness
4. per-face material/UV persistence
5. runtime build correctness
6. asset import survival
7. imported-model collider generation and runtime collision correctness
8. project package portability once binary assets exist
9. runner navigation/input reliability
10. spatial audio and interaction basics
11. critical regressions caught in CI

---

## Test stack

Recommended baseline:

- **Vitest** for unit and integration tests
- **Vitest Browser Mode** where real browser behavior is needed at component/integration level
- **Playwright** for end-to-end testing
- optional lightweight golden fixtures for serialized documents and runtime builds

No snapshot-heavy strategy by default.
Prefer explicit assertions over giant snapshots.

---

## Global testing rules

### Schema changes

Whenever the persisted `SceneDocument` schema changes:

- make the compatibility decision explicit
- bump the version when needed
- add at least one migration or compatibility test

### Persistence coverage

For every author-authored feature that persists:

- add a round-trip save/load test
- cover the current persistence path used by the product at that milestone
- once asset-bearing scenes exist, cover the project package path where relevant
- avoid assuming that runtime-only state is persisted

### Small fixtures

Prefer tiny, explicit fixtures over large assets or giant snapshots.

---

## Test categories

## 1. Pure unit tests

Purpose:

- fast confidence on isolated logic

Scope:

- math helpers
- snapping helpers
- ID utilities
- small schema defaults
- validation helpers
- transform calculations
- UV helper logic
- entity defaulting logic

Characteristics:

- no DOM
- no WebGL
- no three.js renderer boot if avoidable
- deterministic
- extremely fast

Examples:

- `snapValue(1.23, 0.5) -> 1.0`
- UV rotate/flip calculations
- axis/local transform constraint calculations
- entity schema default application
- command label generation if logic matters

---

## 2. Domain/model tests

Purpose:

- validate the canonical document model and command behavior

Scope:

- document factories
- migrations
- command execution
- command undo/redo
- selection semantics where model-driven
- validation rules

Examples:

- create whitebox-solid command adds valid geometry
- undo removes it cleanly
- redo restores the same result
- invalid entity reference is detected
- old scene version migrates correctly

These tests should not need a browser renderer.

---

## 3. Geometry tests

Purpose:

- verify whitebox geometry/kernel correctness

Scope:

- primitive generation
- face generation
- edge/vertex derivation where canonical
- topology expectations
- collision mesh generation
- imported-model collider generation
- Rapier-backed collider/query integration where relevant
- UV projection generation
- clipping results
- derived mesh determinism

Examples:

- box-based whitebox solid creates expected face count
- stairs generator creates expected step count
- fit-to-face UV produces finite values
- edited solids triangulate without NaNs or invalid indices
- generated geometry contains no NaNs
- rebuild is deterministic for the same input
- non-planar quad faces triangulate deterministically
- non-convex whitebox solids either derive valid output or fail clearly when unsupported
- imported model collider generation produces finite valid data for the selected mode
- imported-model collider generation honors the authored mode semantics:
  - terrain -> heightfield
  - static -> triangle mesh
  - dynamic -> compound convex pieces
  - simple -> primitive or convex hull
- unsupported imported-model collision modes fail clearly instead of producing silent garbage

### Geometry test principles

- assert invariants, not fragile exact arrays unless necessary
- prefer bounded numeric comparisons
- verify no degenerate triangles where required
- test edge cases: tiny sizes, float transforms, component edits, unsupported cases failing clearly

Geometry is a high-risk area and deserves dense testing.

---

## 4. Serialization tests

Purpose:

- ensure document persistence is trustworthy

Scope:

- save/load round trips
- migration paths
- invalid file handling
- missing refs behavior
- canonical normalization if any

Examples:

- scene round-trips without losing face materials
- UV state survives save/load
- floating point transforms survive save/load without accidental snapping
- imported asset refs survive save/load
- project package export/import preserves asset-backed scenes
- unsupported version throws an understandable error
- migration from v1 to v2 preserves semantics

### Required pattern

For every substantial document feature, add at least:

- one round-trip save/load test
- one migration or backward-compatibility consideration if schema changed

For authored imported-model collision settings, also add at least:

- one round-trip test for the selected collision mode/settings
- one validation/build-path test for missing asset or incompatible collision-mode assumptions where relevant
- one runtime/query-path test proving the generated collider participates in the actual collision/query layer rather than only existing as dead metadata

---

## 5. Browser integration tests

Purpose:

- verify real browser behavior that pure tests cannot cover

Use for:

- pointer interactions
- keyboard shortcut handling
- focus issues
- canvas/UI interaction boundaries
- panel interactions
- browser API edge behavior
- audio unlock flows where practical
- pointer lock flows where practical

Examples:

- clicking viewport selects a brush
- dragging a gizmo updates inspector values
- applying material through UI changes a selected face
- entering play mode mounts the runtime canvas
- pointer lock request path is handled correctly

---

## 6. End-to-end tests

Purpose:

- verify the actual user flows across the product

Playwright covers:

- page loading
- cross-browser execution
- real input simulation
- visible UI assertions
- route/deployment behavior
- screenshot and trace capture on failures

### Required e2e flows for early milestones

#### E2E-01 Empty app boots
- app loads
- viewport visible
- no fatal console errors

#### E2E-02 Create box brush
- create box brush
- select it
- persist through the current save path
- reload
- brush still exists

#### E2E-03 Apply material
- create room or brush
- assign material to a face
- persist through the current save path
- reload
- material persists

#### E2E-04 Run scene
- place `PlayerStart`
- enter run mode
- runtime loads
- first-person or orbit mode active

#### E2E-04b World environment
- author non-default world lighting/background settings
- save or persist through the current path
- reload
- editor and runner still reflect those settings

#### E2E-05 Import asset
- import test GLB
- place a model instance
- reload
- instance remains visible

#### E2E-06 Trigger action
- create trigger and target
- run scene
- activate trigger
- target effect occurs

#### E2E-07 Project package portability
- export a project package
- import or reopen it in the editor
- asset-backed scene remains usable

These flows should expand with milestones.

---

## 7. Manual QA

Some qualities are hard to fully automate, especially in spatial tools.

Manual QA is required for:

- authoring feel
- camera comfort
- snapping quality
- transform ergonomics
- texture workflow speed
- runtime movement feel
- browser UX polish
- spatial audio perception

### Manual QA checklist style

Every slice should include:

- setup
- expected steps
- expected result
- known limitations
- browser(s) tested
- screenshots or short recordings if helpful

### Transform ergonomics slice checklist

- Setup: open the editor with at least one whitebox box selected in the perspective viewport.
- Steps: orbit/pan the camera away from the origin, run `G`, `R`, and `S`, then commit with click or `Enter`, cancel with `Escape`, and delete the selected target.
- Expected result: the active viewport camera keeps its exact framing and does not snap back to the world origin after commit, cancel, or delete.
- Steps: start a translate or rotate session on a rotated whitebox box or rotated model instance, press `X`, `Y`, or `Z`, then press the same axis again.
- Expected result: the first press constrains to the world axis, the second press switches to the target's local axis, and unsupported local toggles surface a clear status message.
- Steps: toggle the viewport grid off and on, then pan the perspective camera far from the origin.
- Expected result: the grid hides immediately when disabled and, when re-enabled, stays world-aligned while appearing effectively infinite around the current camera framing.
- Known limitations: local axis toggling is intentionally constrained to the supported target/operation combinations surfaced by the editor status messages.

---

## Test directory guidance

Suggested structure:

```txt
src/
  ...
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
  packages/
  exports/
```

Alternative layouts are fine if the categories remain conceptually clear.

---

## Naming conventions

Use descriptive names.

Good:

- `create-box-brush.command.test.ts`
- `scene-roundtrip.materials.test.ts`
- `runtime-trigger-teleport.e2e.ts`

Bad:

- `misc.test.ts`
- `editor2.test.ts`
- `utils.spec.ts`

Test names should tell a future reader:

- what behavior is being protected
- what broke if it fails

---

## Core invariants to protect

The following invariants are important enough to deserve repeated coverage:

### Document invariants

- IDs are unique
- references resolve or fail clearly
- version is known/migratable
- entity payload matches type schema
- model instances are not mixed into entity collections

### Command invariants

- execute changes state correctly
- undo restores previous state
- redo reproduces execute result
- command history remains coherent

### Geometry invariants

- generated meshes contain finite numeric values
- expected face counts/topology rules hold
- collision/output is deterministic
- invalid inputs fail safely

### Serialization invariants

- save/load preserves semantics
- unsupported versions do not silently corrupt
- migrations are explicit and tested
- binary asset persistence survives the current project-storage strategy
- project package export/import preserves semantics when that path exists

### Runtime invariants

- runner loads valid scenes
- missing optional systems fail gracefully
- navigation controller activation is exclusive and consistent
- interactions target the correct entities or model instances

---

## What to unit test vs what to e2e test

### Unit test

When logic is:

- deterministic
- isolated
- data-heavy
- performance-sensitive
- easier to debug outside the browser

Examples:

- brush face generation
- UV transforms
- validation
- migrations
- command sequencing

### E2E test

When behavior depends on:

- actual browser input behavior
- canvas and DOM interaction
- route/app boot
- browser APIs
- focus/pointer lock/input timing
- asset load flows

Examples:

- selecting and moving things via UI
- entering play mode
- first-person input behavior
- import workflow if browser-exposed
- prompt/click interactions

---

## Fixture strategy

Use small, explicit fixtures.

### Document fixtures

- minimal empty doc
- one-box-room
- textured-room
- lit-room
- trigger-scene
- imported-asset-scene
- packaged-project scene
- migration-old-version scene

### Asset fixtures

- tiny GLB static mesh
- tiny GLB animated mesh
- tiny environment image or skybox fixture
- simple audio file
- placeholder textures

Keep fixtures:

- tiny
- deterministic
- checked into the repo when legally safe
- documented

Do not use giant random assets in core CI.

---

## Browser support testing

At minimum, regularly test in:

- Chromium
- Firefox
- WebKit where relevant

Not every test must run in every browser in every iteration, but critical e2e coverage should include cross-browser confidence at appropriate cadence.

Early CI suggestion:

- smoke in Chromium on every push
- broader cross-browser on main branch / PR gate / nightly depending on cost

---

## CI expectations

Baseline CI pipeline should include:

1. install
2. typecheck
3. lint
4. unit/domain/geometry/serialization tests
5. browser integration tests where stable
6. Playwright smoke/e2e subset
7. test artifact upload on failure

### Required artifacts on e2e failure

Capture where possible:

- screenshots
- traces
- video if worth the storage cost
- console logs
- failed document/export fixture if relevant

These artifacts materially reduce debugging time.

---

## Performance testing

Do not overcomplicate early performance testing, but do track basic regressions.

Recommended early checks:

- app boot time smoke metric
- scene build time for a representative small scene
- brush rebuild time for representative test cases
- asset import of a small reference GLB
- runtime frame stability in a standard test scene

This can begin as manual/dev benchmarking and later become more formal if needed.

---

## Audio testing notes

Spatial audio is important, but automated audio verification is limited.

### Automate what we can

- sound entities load
- trigger paths call correct audio system methods
- invalid audio refs surface errors
- autoplay rules behave as expected in app state

### Manually verify

- perceived spatial positioning
- distance attenuation feel
- loop transition quality
- browser-specific unlock friction

Include manual audio QA notes in slices touching audio.

---

## Input testing notes

Input in browser apps is full of edge cases.

Explicitly test:

- keyboard focus transitions
- pointer lock enter/exit
- escape handling
- canvas vs panel focus
- gamepad absent/present behavior
- drag cancellation when pointer leaves element/window

Where automating is hard, document the manual verification steps.

---

## Regression policy

Every bug fix should add one of:

- a unit/domain/geometry test
- a browser integration test
- an e2e test
- a documented manual regression step if automation is genuinely not feasible yet

Do not accept “fixed” without protecting against recurrence.

---

## Done criteria from a testing perspective

A slice is not done until:

- happy path is covered
- one obvious failure path is covered
- save/load or persistence path is covered if the feature is author-authored
- manual QA notes are written
- test commands are documented if new setup is needed

---

## Minimum test commands to maintain

Keep the project easy to verify.

Recommended scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:browser": "vitest --browser --run",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:typecheck": "tsc --noEmit"
}
```

Exact commands may evolve, but the repo should always expose a simple path for:

- fast local checks
- browser checks
- e2e checks
- CI checks

---

## What we do not test aggressively yet

Initially, avoid over-investing in:

- screenshot snapshot forests
- fragile pixel-perfect rendering tests
- massive browser matrix on every commit
- giant scene stress tests before the core workflow is stable
- plugin systems we do not yet have

Test the heart of the product first:

- data integrity
- brush correctness
- interaction correctness
- runtime usability
