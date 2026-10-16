# Aqua.io v1.5.28 — Net Respawn and Gameplay Performance

**Baseline:** v1.5.27 Deterministic Species Abilities. This pass is a performance-only release. It does **not** change playable species, ability durations, the 200 competitors, 60 minnows, six-second spawn protection, the 10-second shared-net batch, movement speeds, eating/size rules, or continuous water-entry and chase-camera design.

## Changes

1. **Pirate-ship LOS/collisions:** Replaced repeatedly allocated temporary segment vectors and per-obstacle axis arrays with scalar math and conservative, precomputed collider bounds. Skip ship solids and rigging that cannot intersect the given LOS segment. Ship segment-distance and overlap checks retain the same acceptance decisions.
2. **Swept ship movement:** Preflight each whole fish movement path once against expanded ship obstruction bounds; if no collision is possible, retain the identical substep arithmetic without the repeated full wreck collision pass. For potentially blocked paths, retain the original collision resolution and three-step unstick behavior.
3. **Offline physics:** Match the multiplayer server's **30Hz fixed tick** rather than simulating 200 competitors once for every browser frame (often 60Hz or faster). Render and controls remain on `requestAnimationFrame`. Catch-up capped to two fixed steps per frame to prevent runaway work after a long pause/stall. Multiplayer authoritative timing is not changed.
4. **Shared net:** Keep the singular 10-second respawn net, the batch grouping, and all individual fish silhouettes. Holding-fish instance transforms refresh **20 times per second**, or immediately on queue changes, rather than reallocating grouping/instance positions on every display frame. The net's own motion remains display-frame smooth.
5. **Adaptive pixel cost:** On touch screens start at **1.35 DPR maximum**, then reduce or recover resolution in small steps after sustained measured wall-frame slowdown/recovery. It never hides fish, changes world simulation, modifies camera controls, reduces multiplayer roster, or alters UI scale. Existing online low-res behavior remains.

## Measured performance (Node.js; not mobile-GPU FPS)

Run `node tools/profile_respawn_v1528.js` to reproduce the same single-process profile. The headless simulation benchmark previously measured at 200 competing fish:

| Phase | v1.5.27 baseline avg CPU per 30Hz tick | v1.5.28 optimized sample | Note |
|---|---:|---:|---|
| First ~4 seconds | 7.07 ms | 3.64 ms | Startup/JIT/AI warm-up varied across runs |
| Waiting in net (~4–9.7s) | 5.27 ms | 2.95 ms | Same 200 AI competitors |
| Net batch (~9.7–10.4s) | 3.31 ms | 2.17 ms | Batch processing not GPU render |
| After release (~10.4–12s) | 2.92 ms | 2.24 ms | Same protective release and flight mechanics |
| Later (~12–40s) | 2.88 ms | 1.90 ms | ~34% less CPU in sampled run |

These measurements are illustrative and can vary with JIT, system load and seed. They do **not** measure phone WebGL rendering or establish an FPS guarantee. The render-side quality governor is designed for slower GPUs.

## Verification

`npm test` includes all existing tests and `tests/test_performance_v1528.js`:
- 30,000 pseudorandom ship line-of-sight rays give identical block/unblock decisions to the v1.5.27 core.
- 12,000 randomized swept fish collisions give identical resultant positions/velocities to v1.5.27.
- For 8, 60, and 200 competing fish: repeated deterministic simulation of a full ten-second release matches the original, including exact coordinate equality, velocities, mass, alive/holding flags, spawn protection, queue composition, and respawn-batch records.
- Existing regression and multiplayer integration suites remain enabled, including the ability, observer, camera, shared-net, and client/server simulation synchronization checks.

**Visual caveat:** Headless WebGL is unavailable in this container, so actual frame times and 3D rendering after net release must be checked on an Android/WebGL-capable device. For best results compare a fresh browser load of v1.5.27 and v1.5.28 using the same device orientation and graphics conditions.

## v1.5.28b follow-up (CPU-only, behavior-identical)

Profile-guided, verified with the full `npm test` suite (including the bitwise v1.5.27 equivalence test) and `npm run check-sync`.

- **Predation pass:** cheap axis-distance reject runs first; combat mass is cached per tick; positions are read from typed arrays in the O(n²) loop.
- **Position snapshots:** `step` reuses pooled snapshot objects instead of allocating ~260 per tick.
- **`nearPlayers`:** walks only occupied grid buckets when fewer than the 125/343 neighbour cells, and uses an insertion sort on short candidate lists (same deterministic order).
- **Goldfish repulsion:** scans a per-tick goldfish list rather than every fish for every fish.

Benchmark (200 fish, 1,500 ticks, `node tools/bench_sim.js <dir containing aqua_sim.js>`): about 6.3 ms/tick for v1.5.28, about 5.5 for the first pass, about 5.0 for this pass (~20% less sim CPU in total). Node only, not phone GPU frame time.


## v1.5.28c — Profile-guided active food and kelp pass

This pass extends the uploaded v1.5.28b core and preserves its deterministic gameplay behavior.

1. **Food collision hot lines:** Original lines 1477–1482 in `step` iterated all 320 allocated food slots for each eligible fish. At typical mid-match occupancy, most of these slots are empty. A single ordered active-food list is rebuilt at the start of each tick, after `updateSurfaceFood`, then used by fish contacts, Koi suction, Sunfish magnet, bot food pursuit and ability decisions. Captured pellets remain in the list for that tick but are still skipped by the existing `alive` flag, so sequential bite results and food ownership do not change. Methods called outside the simulation tick retain direct access to the full food roster for editor/test compatibility.
2. **Kelp membership:** Reject points outside the conservative x/y/z ellipsoid bounds before the unchanged exact ellipsoid equation; this avoids unnecessary division and multiplication for distant fish. The original membership test is evaluated for every potentially colliding point.
3. **Profiler and reproducible benchmark:** `tools/profile_hotlines_v1528c.js` profiles 200 fish using Node's CPU Profiler and prints sampled source lines. `tools/bench_compare_v1528c.js` alternates old/new engines to account for warm-up. The baseline is bundled in `audit/baseline_aqua_sim_v1528b.js`.

### Four-run CPU benchmark (200 fish; 1200 ticks per run)

| Phase | Uploaded v1.5.28b (ms/tick) | v1.5.28c (ms/tick) | Measured improvement |
|---|---:|---:|---:|
| Early | 2.432 | 1.891 | 22.2% |
| Held | 1.676 | 1.366 | 18.5% |
| Post-release | 1.068 | 1.026 | 3.9% |
| Later | 1.078 | 0.875 | 18.8% |

These are Node.js simulation-only timings and do not predict physical Android FPS, GPU limits or WebGL rendering jank. Warm-up, thermal throttling, and CPU contention may alter results.

### Verification

- Existing 178 regression checks passed.
- Additional v1.5.28c test: 90,000 kelp comparisons across three procedural worlds all match the baseline.
- Complete snapshot equivalence against uploaded v1.5.28b at 200/60/8 competitors across 1,230/600/480 ticks respectively, including later replenishment and repeated net releases.
- Browser/server simulation code identical (`npm run check-sync`).
- Multiplayer online smoke checks passed (`npm run test:online`).
- Rendering is not GPU-profiled here; validate performance after multiple respawns on an actual phone.

### Commands

```bash
npm test
npm run check-sync
npm run test:online
npm run bench
npm run profile:cpu
```

### Repeated interleaved benchmark variability

A second four-run interleaved repeat showed early 2.356 → 1.774 ms/tick, held 1.710 → 1.317, post-release 1.101 → 1.173, and late 1.043 → 0.869. Across the combined eight paired runs (two batches of four), means were approximately: early 2.394 → 1.833, held 1.693 → 1.342, post-release 1.085 → 1.100, later 1.061 → 0.872 ms/tick. Thus, **post-release CPU time is effectively unchanged within run-to-run noise**; the consistent CPU improvements are early, while queued, and later in the match. GPU rendering and frame hitches remain unmeasured.
