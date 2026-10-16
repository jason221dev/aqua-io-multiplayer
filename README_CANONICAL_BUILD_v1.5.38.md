# Aqua.io v1.5.38 — canonical browser/server build

## Authoritative sources

- `aqua_sim.js`: single deterministic simulation implementation consumed through `require()` by Node and inlined in standalone browser output.
- `motion_v2.js`: single binary transport implementation, including `META_FIELDS`, `packFishMeta`, and `unpackFishMeta`; used by the authoritative server and emitted into browser output.
- `index.template.html`: hand-edited UI, Three.js, controls, renderer and HTML source. Two deliberately unique placeholders `/* AQUA_BUILD_MOTION_V2 */` and `/* AQUA_BUILD_SIM */` are expanded by the build.
- `index.html`: **generated standalone artifact**, committed for compatibility with Render and download/offline play. Do not manually edit the generated duplicate sections.

## Commands

`npm run build` regenerates `index.html` from canonical sources, deterministically and without a bundler or external downloads.

`npm run build:check` fails nonzero if `index.html` is missing or stale; `npm test`, `npm start`, and `npm run test:online` each enforce the check through npm lifecycle hooks.

`npm run check-sync` also tests the browser/server simulation and the metadata round-trip. `npm run test:online` runs live WebSocket integration tests.

Render's `npm install --omit=dev` build and `npm start` launch remain compatible; stale artifacts intentionally fail startup rather than serving a mismatched client.

## Scope

The gameplay simulation, 200 rivals, 60 minnows, single net, and ability rules are unchanged. Version 1.5.38 is an architecture and transport-consistency release. No GPU/FPS claims are made.
