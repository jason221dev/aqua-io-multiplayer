# Aqua.io v1.5.13 — verified deployment source

This directory is the authoritative runtime and the root of the GitHub `main` branch. `index.html` is the playable, fully self-contained single-player client; with `server.js`, WebSocket multiplayer is enabled. `aqua_sim.js` is extracted from the exact inline simulation block in `index.html`.

## Requirements preserved
- Fisherman netting: physical near-surface catch, grace period, animated net and one scored catch; NET appears only when the authoritative catch predicate succeeds.
- Shipwreck: solid hull, railings, sails and rigging; designated breaches, cabin access and hatch remain swimmable.
- Free Roam: follow eater for six seconds; respawn with six-second protection.
- Last Fish Standing: follow actual eater until conclusion; follow successor when eater is eaten; fallback to largest survivor when eater is caught; no respawning.
- Single-player Observer Mode: free camera, follow largest, return to fish. Observing grants no immunity.
- Multiplayer: authoritative simulation, stable metadata for predator succession even at long distances, and no server-controlled observer movement.

## Run locally
`npm start` (Node 20+); navigate to http://localhost:3000/.
`npm test` checks gameplay, collision, survival, camera contracts and metadata chain.
`npm run check-sync` verifies client/server simulation parity.
`npm run test:online` runs full multiplayer WebSocket integration and remote spectator-chain transport checks (Node 22+).

## Build validation and limitations
Automated tests cover deterministic rules and the DOM contract; final real-device WebGL rendering, device-specific touch behavior, and multiplayer load at scale require physical-device testing.

### v1.5.14: True Observer Mode

Single-player observer withdraws the fish from the simulation; Free Roam allows a fresh protected spawn while Last Fish Standing requires NEW MATCH. See README_OBSERVER_FIX_v1.5.14.md.
