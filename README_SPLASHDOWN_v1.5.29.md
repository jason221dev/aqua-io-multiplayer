# Aqua.io v1.5.29 — Splashdown rendering performance pass

## User-reported regression

Frame rate becomes unplayable when multiple fish splash into the aquarium after release from the singular shared respawn net.

## Code-path findings

The baseline v1.5.28c keeps queued fish in inexpensive instanced net silhouettes. At the release tick, all fish become active simultaneously; they land within a narrow footprint and are immediately submitted to the aquarium's animated rival-fish renderer. Before this pass, **every rival inside the ~540–650 game-unit detail threshold** used the highly tessellated near fish mesh. The detailed silhouette has 2,574–5,743 triangles per fish, varying by species; the low-detail version has 404–1,537. Both share a species material and preserve the fish's location, facing, effective body dimensions, and inflation/camouflage.

With 199 rivals in the same near field, an average-species proxy is about **600,444 rival triangles** per view. Limiting high-detail meshes to the 20 closest rivals on a coarse-pointer mobile device and using existing low-detail meshes for the remaining 179 lowers that proxy to **159,251 rival triangles** (approximately **73.5% less rival geometry submitted**); these counts exclude the player's detailed fish, minnows, ship and aquarium environment. They are analytical triangle counts, **not measured GPU frame times or predicted FPS**.

A synthetic 200-competitor CPU stress run with 1, 40, 100 and 199 fish simultaneously released produced simulation tick peaks below 8ms in the main post-release segments on the benchmark CPU. That supports prioritizing render-side load, but **does not establish the Android GPU bottleneck conclusively**.

## Changes

1. **Crowd-aware near-detail budget**: At most 20 near-LOD instanced rival fish on coarse-pointer devices (52 on desktop). Nearest-to-camera rivals are prioritized. All other living rivals continue to render through the original low-LOD species meshes. No positions, sizes, species, collisions, abilities, population counts, visibility distance or AI decisions are altered.
2. **Mobile multisample avoidance**: Disable WebGL hardware MSAA for coarse-pointer devices (retain for desktop). Improves mobile bandwidth/headroom at the expense of some model-edge smoothness; the existing pixel-density renderer remains.
3. **Faster adaptive resolution recovery**: The original quality governor required 90 frames to lower resolution. On an overloaded phone, that could take many seconds. The new governor uses short samples, rapidly reduces resolution during sustained very-low FPS, floors at 62%, and recovers conservatively to prevent resolution thrashing.
4. **On-device diagnostics**: Toggle **SHOW FPS / RENDER DIAGNOSTICS** on the main menu or append `?perf=1` to a hosted game URL. During play, the overlay reports actual browser requestAnimationFrame FPS, DPR, simulation CPU ms, draw-call CPU-submission ms, rendered near/far counts, triangles, WebGL draw calls, and the recent batch size/time. Draw CPU ms is **not GPU execution time**.
5. **Simulation unchanged**: `aqua_sim.js` and `server.js` are carried over byte-for-byte from v1.5.28c. The one-net drop, per-fish temporary protection, deterministic abilities, predators, continuous camera and online network model remain untouched.

## Regression and verification

- `npm test`: full existing regression suite plus new LOD budget, stable priority, large-roster and adaptation test passes.
- `npm run check-sync`: deployed multiplayer simulation is identical to browser simulation.
- `npm run test:online`: multiplayer integration and reconnect checks pass.
- Extracted standalone client script passes Node JavaScript parse check.
- No Android/physical WebGL profiler was available in this environment. The real-world frame-rate improvement and the remaining risk of GPU pixel fill-rate/thermal bottlenecks must be checked on the actual affected phone.

## How to reproduce and report on Android

1. Open the updated standalone HTML or hosted project, enable **SHOW FPS / RENDER DIAGNOSTICS** in the menu.
2. Enter **Free Roam** and play until you enter the singular holding net.
3. Record the **FPS, DRAW ms, SIM ms, DPR, near/far count, triangles and calls** just before and during the first 3 seconds after the net releases you.
4. Let the six-second protection expire, then repeat a second batch. Capture any drop under 20 FPS or a WebGL context error.
5. If FPS is poor while DRAW ms and SIM ms remain low, investigate GPU fill-rate/thermal throttling with Android Chrome remote debugging. If SIM ms rises, profile the authoritative tick and its close-contact collisions separately.
