# Aqua.io v1.5.17 — One Shared Respawn Net

The Free Roam respawn system uses exactly one scalable aquarium holding net for the entire pending respawn queue. Fish of all 13 playable species remain represented within the same net, using instanced cartoon geometry to limit draw calls. The net hangs above the aquarium and gently sways while filling. Each scheduled 10-second cycle releases all queued fish together at one random aquarium location and shows the same net tipping over the drop point. Each fish starts with six seconds of spawn protection. A waiting fish's camera now follows the net instead of an unrelated active competitor.

Multiplayer synchronization now includes the queue, current respawn batches, next dump timestamp, and per-fish holding status in binary and JSON motion packets, maintaining a single consistent shared net on all clients.

The six-second predator replay, true Observer Mode, AI fisherman netting, 100-mass bait fish decoys, Ability Identity changes, and Last Fish Standing's no-respawn rule are preserved.

Validation: `npm test`, `npm run check-sync`, `npm run test:online` pass. Chromium startup and JavaScript checks pass, but a WebGL frame was not rendered in the headless verification environment; test the visual net on a real mobile device.
