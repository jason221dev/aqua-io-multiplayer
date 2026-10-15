# Aqua.io v1.5.19 — Gameplay and Multiplayer Audit

This version is based on the actual v1.5.18 full source tree. All 13 fish abilities, the one shared respawn net, predator camera, Observer Mode, two AI fishermen, the shipwreck, and 100-mass lure behavior remain intact.

## Corrections

1. **Distant spectator jitter**: a fish being followed now receives high-frequency authoritative motion packets even when it is far from the eliminated player's original location. Applies to Last Fish Standing's predator succession and Free Roam's six-second eater follow. Ordinary distant fish continue to be rate-limited.
2. **Respawn-net animation order**: the authoritative simulation preselects the next random drop point. The one shared net travels there during the final 1.55 seconds before the batch boundary, visibly carrying fish. At the exact 10-second boundary, all queued fish enter together with six seconds of spawn protection, and the empty net returns to the rack. Last Fish Standing never queues respawns.
3. **Determinism**: the advance-known drop point uses a dedicated deterministic RNG stream. It does not consume draws from the gameplay RNG used by seeded fish/AI/balance scenarios. Snapshot/restore includes both RNG states and the scheduled drop.
4. **Multiplayer throughput**: the shared respawn state and signature are prepared once per room motion update rather than once per socket.
5. **WebSocket buffer allocation**: complete, unfragmented incoming frames reuse their current buffer rather than concatenating with an empty buffer; fragmented TCP frames still assemble properly.

## Automated QA

`npm test`, `npm run check-sync`, and `npm run test:online` all pass. New regressions cover near-cadence distant spectator packets, rate-limiting of unrelated remote fish, deterministic spawn point and seeded gameplay RNG, exact 10-second batch release, snapshot parity, and WebSocket framing/fragmentation.

40-second / 200-fish deterministic simulation scenarios included both Free Roam and Last Fish Standing, with no invalid positions or mass values, and AI fisherman catches were observed. These are CPU-side simulations, not graphics performance or large multiplayer load benchmarks.

## Remaining QA / limitations

* Physical Android and desktop WebGL testing is required to certify visible net animation, fish models, camera smoothness, 3D occlusion, and device thermals. Headless Chromium starts without JS errors but this environment does not provide a usable WebGL context.
* 200-player live-network load, weak Wi-Fi/high-latency testing, disconnections during batch release, and accessibility testing have not been completed.
* The audit does not constitute a certified exhaustive formal verification of every game mode, fish ability or graphics path.
