# FishForge v4: input-gated water re-entry

A breaching fish follows the inverted parabolic flight path and enters the water nose-down, retaining its horizontal momentum.

**The only required player input is holding the movement controller.** During the brief ~0.22-second splash momentum blend, the incoming forward/downward velocity blends into the requested movement vector. The client automatically resets its retained pitch to the downward landing tangent without changing yaw; the player never needs to adjust pitch to dive after splash.

There is **no forced depth, no 145-unit dive and no autonomous underwater propulsion**. The fish can level off or steer freely at any depth. Releasing the controller stops normal underwater motion immediately, even within the splash blend. Existing special-ability exceptions (e.g. a committed barracuda strike) are unchanged.

## Tests

- `node tests/test_auto_dive.js` — held/released controller, natural trajectory, client pitch
- `node tests/test_breach_parabola.js` — air arc, splash intersection, snapshots
- `npm test` — full game, multiplayer and UI regression
- `node tests/test_fishforge_v4.js` — model/LOD geometry

Preserves multiplayer protocol, fish abilities, FishForge v4 models, and v1.5.7 rollback route. Real Android WebGL validation is pending.
