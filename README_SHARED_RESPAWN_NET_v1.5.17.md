# Aqua.io v1.5.17 — One Shared Respawn Net

- One and only one aquarium net holds all queued respawning fish. Every fish is rendered inside that same mesh as a lightweight, species-specific instance; occupancy adjusts its size.
- The net bobs above the water while collecting fish, then tips over the randomized release location each 10-second wave. A release ring highlights the splash zone.
- Fish are released together by the authoritative simulation with six seconds of spawn protection.
- Free Roam predator-follow remains six seconds before joining the next scheduled wave.
- Observers never enter the net; Last Fish Standing never respawns.
- Online motion packets synchronize the queue, current wave, next release time, and per-fish holding state so every client renders the same net.
- `npm test`, `npm run check-sync`, and `npm run test:online` pass.
- Headless browser WebGL rendering is not certified on a physical Android device.
