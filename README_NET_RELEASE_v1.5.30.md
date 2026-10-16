# Aqua.io v1.5.30 — Smooth shared-net release

## Report
The large FPS collapse at the first splashdown improved in v1.5.29, but subsequent ten-second shared-net releases still cause short frame hitches.

## Changes

1. **Staged high-detail return.** For batches of at least six fish, the mobile renderer begins the release with at most three high-detail rival models and smoothly restores the established 20-model cap over 1.5 seconds. Desktop restores its 52-model cap in the same interval. **All active rivals remain visible in their species-specific far-LOD instanced meshes** throughout. No fish is hidden, delayed, or moved. Local fish retains full detail.
2. **No renderer resize at the drop boundary.** The existing adaptive-resolution governor defers resizing the WebGL drawing buffer for the final 0.9 seconds before release and the first 1.55 seconds after release, then resumes normal quality adaptation. This avoids a potential expensive GPU framebuffer reallocation during splashdown.
3. **Splash-effect object recycling.** The simulation reuses expiring/trimmed splash and spray objects (up to 256 splash and 220 droplet pool objects), avoiding repeated per-release garbage collection pressure. Particle emission order, random calls, locations, duration, RNG and snapshot content remain identical to v1.5.29. This optimization is mirrored exactly in the standalone HTML and multiplayer server engine.
4. **Hitch diagnostics.** The opt-in FPS overlay reports the worst frame time and count of frames longer than 50 ms for each approximately 0.7-second reporting window, alongside FPS, simulation and drawing CPU times. It now measures uncapped real frame deltas so long freezes are not understated. Enable from the menu or `?perf=1`.

## Tests

- Full `npm test` suite passed.
- `npm run check-sync` passed: browser and server simulation are byte-for-byte synchronized.
- `npm run test:online` passed.
- Dedicated multi-batch test compares full authoritative state (including RNG, positions, fish mass, protection, net release, splashes, droplets, foods, and abilities) with unmodified v1.5.29 through three consecutive net releases. All compared states matched.
- Tests assert release LOD staging, retained full-quality for single fish, and the resize-exclusion window.
- No physical phone GPU/WebGL test was possible in the current environment. This patch is a targeted mitigation of synchronous release workload, not proof of a specific FPS gain on Android.

## Recommended on-device check

Play Free Roam at 200 fish. Enable FPS diagnostics, note `PEAK ...ms` and `HITCHES>50ms` in two to three subsequent releases at ten-second boundaries. Compare v1.5.29 versus v1.5.30 in the same browser/device settings. If hitches persist with low SIM/DRAW CPU ms, capture Chrome GPU-trace data for actual GPU frame duration.
