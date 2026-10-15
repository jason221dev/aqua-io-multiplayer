# Aqua.io v1.5.12 — deployed multiplayer build

Full 200-fish simulation, Fisherman, shipwreck, FishForge v4, fisherman netting, 6-second spawn shield, 6-second Free Roam predator replay, and unlimited predator succession in Last Fish Standing.

## Observer Mode (single player)

While swimming in single-player, tap OBSERVE, then FREE CAMERA or FOLLOW LARGEST. Free Camera provides touch left-stick fly, right-side orbit, R/F altitude (↑/↓ on screen), WASD movement, and RETURN TO FISH. The player remains vulnerable while watching. Multiplayer retains the predator-follow spectator view after elimination, without free-camera privileges.

## Deployment

The `index.html` contains its renderer and movement codec inline and can be opened as a standalone single-player HTML. `server.js` implements Node HTTP + WebSocket for authoritative multiplayer and exposes `/health` and `/ws`. The `aqua_sim.js` comes from the exact simulation region of `index.html` to preserve server/client gameplay parity.

Run: `npm start` (Node 20+). Test: `npm test`.
