# WebEditor3D

WebEditor3D is a browser-based engine/editor for authoring interactive 3D
environments and running them immediately in the browser.

The core loop is:

1. author a scene
2. save or load the project
3. enter run mode without leaving the editor

The project is focused on fast whiteboxing, imported assets, typed entities,
simple interactions, and web-native delivery. It is not intended to replace
Blender, CAD tools, or a general-purpose engine platform.

## Current Capabilities

- Whitebox authoring with box, wedge, cylinder, cone, and torus primitives.
- Object transforms plus face, edge, and vertex selection foundations.
- Per-face materials, UV controls, climbable faces, water volumes, and light
  volume settings for whitebox solids.
- Authored terrain with sculpt and paint tools.
- GLB/GLTF model import, including multi-file GLTF packages and Draco assets.
- Imported image and audio assets stored in the project asset registry.
- Placed `modelInstances` with explicit collision modes.
- Typed entities such as `PlayerStart`, `SceneEntry`, `NPC`, `CameraRig`,
  `TriggerVolume`, `TeleportTarget`, `Interactable`, local lights, and sound
  emitters.
- Interaction links for runtime behavior such as teleport, visibility, audio,
  animation, control effects, and sequences.
- Multi-scene project state with scene loading screen settings.
- Project-wide time, day/night lighting, scheduler routines, sequence authoring,
  and dialogue foundations.
- Built-in runner with first-person and third-person navigation, Rapier
  collision, scene transitions, dialogue overlay, spatial audio, and animation
  playback.
- Multi-viewport editor layout with perspective, top, front, and side views.

## Getting Started

Use a current Node.js LTS release.

```bash
npm install
npm run dev
```

Vite will print a local URL, typically `http://localhost:5173/`.

## Common Scripts

```bash
npm run dev           # start the Vite dev server
npm run build         # typecheck and build the app
npm run typecheck     # run TypeScript without emitting files
npm run lint          # run ESLint
npm test              # run Vitest tests
npm run test:watch    # run Vitest in watch mode
npm run test:browser  # run Playwright browser tests
npm run test:e2e      # alias for Playwright browser tests
```

## Project Files

User-facing save/load uses portable `.we3d` project packages. A package is a zip
archive containing canonical project JSON plus referenced assets.

Important format boundaries:

- The editable project format is the `.we3d` project package.
- The canonical document is versioned and migrated through serialization code.
- Runtime output is separate from editable save/load.
- Blob URLs are transient loading details, not persisted asset references.

## Architecture Map

- `src/document`: canonical project and scene document state.
- `src/commands`: undoable editor mutations.
- `src/geometry`: derived whitebox, terrain, mesh, and collider generation.
- `src/viewport-three`: editor viewport rendering and interaction helpers.
- `src/runtime-three`: play-mode runtime, scene build, collision, scheduling,
  audio, navigation, interactions, and scene transitions.
- `src/assets`: imported model, image, audio, and asset storage adapters.
- `src/entities`: typed scene objects with editor/runtime semantics.
- `src/interactions`: authored trigger/action links.
- `src/controls`, `src/scheduler`, `src/sequencer`, `src/dialogues`: shared
  control surface, time-based orchestration, sequence steps, and dialogue data.
- `src/serialization`: JSON serialization, migrations, autosave, and `.we3d`
  package import/export.
- `src/app`: React editor shell and panels.
- `src/runner-web`: React wrapper for the built-in runner canvas.

## Development Notes

- `ProjectDocument` / `SceneDocument` is the source of truth.
- Editor-authored mutations should go through commands.
- Three.js scenes, meshes, materials, and runtime objects are derived state.
- Imported assets live in the asset registry.
- Placed imported assets live in `modelInstances`.
- Typed runtime/editor objects live in `entities`.
- Global ambient, sun, background, fog, and project time live in project/world
  settings.

## Verification

For a normal code change, run the narrowest relevant checks. Useful defaults are:

```bash
npm run typecheck
npm test
npm run test:browser
```

Use Playwright tests when browser behavior, rendering, input, or the built-in
runner is part of the change.

## License

No license file is currently included in this repository.
