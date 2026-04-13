# CHAT_CONTEXT.md

This file is the small startup brief for new implementation chats.

Read this after `AGENTS.md`.
Then inspect the code.
Then open only the relevant sections of `architecture.md`, `roadmap.md`, and `testing.md`.

The large docs are reference docs, not mandatory full reads.

---

## Current Status

As of now, the repo is no longer in the very early “empty skeleton” phase.

Broadly implemented already:

- foundational document/command/persistence/test setup
- box-based room authoring and per-face materials / UVs
- built-in runner with edit -> run loop
- world settings / lighting / environment basics
- typed entities and trigger/action/target interaction flow
- GLB/GLTF model import and model instances
- local lights, animation playback, spatial audio
- advanced rendering
- better material-library workflow
- runner package / embeddable runner work
- multi-viewport editor foundations
- unified creation/placement foundations
- transform foundations
- project-wide time foundation with a running global clock
- first day/night lighting override tied to project time

Important consequence:

- many roadmap sections are now historical context, not literal todo items
- do not assume Milestone 0-3 are untouched just because they are still documented

When in doubt, inspect the current code before trusting old milestone wording.

---

## Current Product Direction

The product is a browser-native engine/editor for interactive 3D environments.

Key direction:

- intuitive whiteboxing / level blocking
- imported assets as first-class content
- typed entities and runtime interactions
- fast built-in runner workflow

The geometry direction is shifting from old grid-bound “brush” thinking toward whitebox solids:

- floating point transforms allowed
- free object rotation allowed
- grid is optional snap/reference help
- object / face / edge / vertex editing should converge on one transform-driven model
- non-planar quads are acceptable if triangulated deterministically
- non-convex whitebox solids are acceptable if the solid mesh/collider path supports them

Old code and docs may still say “brush” in places.
Treat current box-brush structures as the starting point for whitebox solids unless the slice deliberately changes that.

---

## Hard Current Assumptions

- world is right-handed and Y-up
- canonical state lives outside the React tree
- document/project state remains source of truth
- editor changes should flow through commands
- model instances remain separate from entities
- world settings own global background / ambient / sun / fog
- local authored lights stay in typed entities
- project save/load and runner export are separate concerns
- project time is global, not per scene
- current day/night logic exists, but it is still a small dedicated driver rather than a generic schedule system
- scheduler/notebook work should sit on top of a shared control surface, not a growing pile of one-off scheduler-only effect types
- when a new capability is added that is meaningfully steerable over time, prefer making it control-surface-addressable and scheduler-available instead of adding isolated time fields

Imported model collision:

- authored collision settings belong on `modelInstances`
- generated collider data is derived, not canonical
- if non-box collider support needs broad-phase/narrow-phase pruning, prefer Rapier over custom app-side collision math

---

## Reading Strategy

Default:

1. read `AGENTS.md`
2. read this file
3. inspect the code paths touched by the slice
4. open only the relevant sections of:
   - `architecture.md`
   - `roadmap.md`
   - `testing.md`

Open the larger docs only when needed:

- `architecture.md`
  - data-model boundaries
  - runtime/editor integration
  - geometry/collision semantics
  - persistence/export/package architecture

- `roadmap.md`
  - whether a direction is already chosen
  - whether something is intentionally deferred
  - how a large topic should be split into slices

- `testing.md`
  - what test layers to add
  - schema/migration expectations
  - browser/e2e guidance

If the slice is small and local, do not reread unrelated doc sections.

---

## What To Be Careful About

- do not restart architecture just because the original docs were written earlier
- extend existing paths instead of introducing parallel systems
- if docs and code disagree on current behavior, trust the code and update docs if your slice changes direction materially
- keep responses brief and verification scoped to the actual slice

---

## Likely Near-Term Themes

The next large topics are more likely to be things like:

- whitebox-solid editing model
- multi-scene / project structure
- richer runtime systems
- authored day/night refinement on top of project-global time
- later deterministic schedule/routine/event systems driven by global time + flags + scene context
- scheduler/control-surface convergence so newly steerable runtime features are naturally available in the notebook
- remaining packaging / portability work
- future primitives and topology tools after the whitebox direction is coherent

Do not assume the old prompt list is still the whole plan.
