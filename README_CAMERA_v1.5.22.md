# Aqua.io v1.5.22 — continuous leap-to-water chase camera

Root cause: v1.5.21 updated camera pitch *only after splashdown*, so the camera still followed the previous swim-control angle throughout most of the ballistic flight. On touchdown it began rotating toward the fish's descending trajectory, producing a visually abrupt catch-up even though the simulation's water crossing was continuous.

Fix: the player's actual camera pitch uses a separate, rate-limited damped follow rig. As the fish rises, turns at the apex and dives into the water, the camera blends toward its physical velocity tangent before reaching the surface. The same rig persists across air/water states; its flight influence decays back to joystick-controlled swim pitch after landing. There is no phase-specific view reset or second catch-up timer. The swim controller still automatically aligns with the downward entry tangent when propulsion is held. Freecam and observer tail-on chase are unchanged. No fish physics were changed.

Checks: `npm test`, `npm run check-sync`, `npm run test:online` plus the frame-rate/touchdown camera regression tests. WebGL appearance requires on-device confirmation.
