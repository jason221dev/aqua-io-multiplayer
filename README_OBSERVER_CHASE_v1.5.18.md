# Aqua.io v1.5.18 — Tail-On Spectator Chase Camera

## Change
Observer **Follow Largest** now places its chase camera directly behind the followed fish's swimming heading, with shortest-angle yaw smoothing and rise/dive-aware pitch smoothing. The same behavior applies to the post-elimination predator-follow camera in Free Roam and Last Fish Standing. This replaces the old idle camera orbit when auto-following.

- Heading uses normalized horizontal velocity while moving and preserves `hx/hz` at near-zero speed (the fish's retained facing direction).
- Camera yaw points backward from the fish's forward vector, so the player's view is centered on the tail, not the left or right side.
- Pitch follows actual vertical movement with bounded elevation so diving and surfacing don't abruptly flip the view.
- Transitions are smoothly interpolated with wrap-safe angular interpolation; shipwreck-aware spring arm and camera collision avoidance remain in place.
- Free Camera, manual fish controls, fisherman controls, auto-respawn holding net, predator chain, 6-second shield, and all 13 species abilities are unchanged.

## Verification
`npm test` passes, including 10 new `tests/test_observer_chase_orientation.js` checks for cardinal/diagonal heading, stopped fish, diving/surfacing, edge cases, and both spectator paths.

`npm run check-sync` confirms browser/client simulation matches `aqua_sim.js`.

`npm run test:online` passes authoritative WebSocket integration and remote predator succession checks.

Headless Chromium smoke test confirmed application startup, observer state, and the orientation helper without JavaScript errors. Full mobile WebGL rendering and perceived smoothness still need real-device QA.
