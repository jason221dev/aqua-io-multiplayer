# Aqua.io v1.5.18 — Tail-on spectator chase

Observer Follow Largest and automatic post-elimination predator follow now derive chase yaw from the fish's actual heading instead of orbiting at a fixed global angle. Yaw uses shortest-arc damping; vertical heading adjusts pitch with clamps. On stopping, follow retains the last facing direction. Free Camera, manual fish/fisher controls, shared respawn net, and predator succession are unchanged.

Run `npm test`, `npm run check-sync`, and `npm run test:online` to validate. Browser smoke passed without JavaScript errors; mobile WebGL animation requires real-device visual inspection.
