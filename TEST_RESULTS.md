# Validation results — aqua.io multiplayer test server

Tested in the isolated working environment with Node.js 22.16.0.

| Check | Result |
| --- | --- |
| Node server syntax | Passed |
| Browser client JavaScript syntax | Passed (static parsing) |
| Embedded simulation matches `aqua_sim.js` | Passed |
| Existing optimized simulation hardening | Passed |
| Existing static/UI reference assertions | Passed |
| Deterministic baseline parity | Passed — 600 frames each of fish, fisherman, mixed, 33 snapshots |
| Live localhost WebSocket tests | **16/16 passed**: HTTP health; create room; join; auto-start; participant snapshot; fisher privacy; own fisher controls; tick progression; fish movement; boat movement; forged hook rejection; HTML served; independent rooms; late join rejection; reconnect token; refreshed world |
| Actual remote Render deployment | Not performed — Render connection is not available |
| Two physical Android browser clients | Not yet tested |
| Live 3D WebGL and haptics | Not verified in this environment |

The network server was tested over localhost with real WebSocket clients, not by simulating messages inside the same function. Free Render service CPU/FPS, network latencies and bandwidth have not been measured.
