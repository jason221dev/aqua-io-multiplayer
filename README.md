# aqua.io — two-phone multiplayer test server

This package builds on the optimized deterministic `aqua.io` refactor. It adds a small, dependency-free Node.js **WebSocket game server**, lobby, room codes, authoritative match ticking, role-specific snapshots, reconnection tokens, and the multiplayer controls in the existing HTML client.

**Status:** Local integration-tested; **not deployed**. The Render service must be connected/created by the user before an HTTPS public match URL exists.

## Quick run (local / same Wi-Fi)

Requires Node.js **20+** (Node 22 recommended).

```bash
npm start
# Server: http://localhost:3000
```

From another device on the same Wi-Fi: `http://YOUR-COMPUTER-LAN-IP:3000`. Ordinary HTTP LAN testing does not guarantee device orientation permission; use the on-screen touch rod. For physical rod calibration, deploy to **HTTPS** on Render.

### Test a live match

1. Open the server's URL on phone A. Choose **Fish** (one of the 13 fish species) or **Fisherman**, then press **MULTIPLAYER · TEST ROOM**.
2. Leave the room code blank and press **CREATE / JOIN**. Read or copy the generated six-character room code.
3. Open the same server URL on phone B. Choose the other role, tap **MULTIPLAYER · TEST ROOM**, enter phone A's code, and press **CREATE / JOIN**.
4. The match starts **automatically** when both are connected. Alternatively, the host may press **START NOW** with AI filling the other slots.
5. Each device sends control input to the server; fish movement, collisions, hook races, lure fishing, mass growth, abilities and scoring run only on the server.
6. If disconnected, refresh and rejoin using the same room code in the same browser tab. The tab's session token reclaims the original slot while the room exists.

### Render Free deployment

1. Upload this directory to a GitHub repository, or otherwise provide its code to Render.
2. In Render, create a **Web Service** using the repository and choose the **Free** plan where available. The included `render.yaml` supplies a blueprint configuration.
3. Runtime Node.js; build `npm install --omit=dev`; start `npm start`; health endpoint `/health`. Render supplies `PORT`.
4. Open the generated `https://...onrender.com` URL on both phones. HTTPS is also necessary for supported motion-sensor permissions.
5. The test server retains rooms **in memory only**. Free-instance restarts or idle suspension discard active matches.

Do not infer a live public endpoint until the deployment succeeds.

## Limits for this free test package

- Four simultaneous rooms maximum. Every simulation has **8 fish slots and 2 fisherman slots**, with **320 ambient fish**. The two-phone test lobby currently auto-starts when 2 humans join, rejects late joins, and backfills remaining slots with AI. Larger fully human lobbies require a configurable ready-up phase.
- One authoritative simulation per room, 60 Hz server steps, 10 Hz full state snapshots, 20 Hz client input frames.
- Browser clients interpolate received positions for smooth local display. Results remain server-authoritative; the client does not simulate remote matches independently.
- **No database, matchmaking service, accounts, persistent rankings, admin dashboard or production-grade autoscaling.**
- Connection interruptions can be rejoined while the room remains live; automatic live reconnection and rewind/lag compensation are future work.
- Fisherman hook requests must correspond to the current bite and a measured new reel stroke or rod raise. Device measurements are not cryptographically verifiable: stronger anti-cheat/lag compensation is a production task.
- Fish roles cannot receive fisher reel/rod/aim internals. The server sends the fish-shaped lure location and appearance, not fishing-line mechanics. Angler views retain the line.
- Room state is visible only to participants with the room code; for a public launch add account authentication, stronger room access controls, IP rate limiting, and managed WebSocket libraries.
- Client loads Three.js and Google Fonts over their CDNs; the game requires network access to these external resources unless they are bundled separately.
- Bandwidth is high: JSON snapshots (potentially tens of KB per frame after field trimming) at 10 Hz. Reduce frequency or implement binary/delta compression before scaling.

## API and files

- `server.js`: HTTP server, room orchestration, authority, input clamps, private state filtering, 60 Hz match step.
- `ws_lite.js`: minimal RFC 6455, masked inbound JSON, ping/pong, size limits. Built for testing; no compression/fragmented messages.
- `index.html`: existing 3D game, plus new multiplayer lobby and network-client adapter. Offline fish and fisherman play is retained.
- `aqua_sim.js`: original optimized deterministic simulation, **unchanged**; generated from the `SIM` region in HTML.
- `extract_sim.js`: source synchronization validation.
- `tests/test_online.js`: full local WebSocket integration test with two clients, rooms, role privacy, both movement inputs, nonparticipant rejection and reconnect.
- `test_sim.js`, `tests/parity.js`, `tests/test_hardening.js`, `tests/test_static.js`: pre-existing logic, equivalence and hardening checks.

Run:

```bash
node extract_sim.js --check
node tests/test_online.js
node tests/test_hardening.js
node tests/test_static.js
node tests/parity.js
# node test_sim.js   # original full test suite, resource intensive
```

## Remaining production tasks

Priority 1: device browser tests (rod calibration, Android WebGL/FPS, real touch gestures), UDP-like resilience via client interpolation/prediction, authoritative hook timing with lag compensation, and server-side metrics.

Priority 2: join-in-progress/spectators, reconnect timeout policies, regional matchmaking, delta state/binary encoding, concurrent-room load testing, authentication, persistence and deployment monitoring.
