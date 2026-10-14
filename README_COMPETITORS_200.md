# aqua.io — All-Competitive 200-Fish Edition

**Playable test:** https://aqua-io-binary-staging.onrender.com/?v=all-compete-200

## Gameplay
- Standard single-player and multiplayer matches contain **200 competing fish total**, not 8 competing fish plus ambient fish.
- All 200 fish spawn alive at **mass 100**, including human-controlled fish and autonomous rivals. Species abilities still differ.
- **Zero ambient NPC fish.** Every visible fish is part of the competitive roster and can grow, eat opponents, escape fishermen, die and (in Free Roam) respawn.
- **320 glowing food pellets** are arranged in seven floating swarms just below the water surface. Pellets increase mass when eaten and replenish in their respective clusters. Bots seek food at the surface before growing large enough to eat rivals.
- **Last Fish Standing:** a caught/eaten rival is eliminated permanently, and the match ends with one surviving fish (or zero).
- **Free Roam:** no time limit; eaten/caught fish respawn at starting mass. The 200-fish roster size remains fixed.
- **Up to two fishermen** per match, controlled by human or AI.
- **Free Roam late joining** reclaims an AI slot, retaining the 200-fish limit.

## Engineering
- Standalone single-player now uses instanced meshes for 199 remote competing fish rather than thousands of individual meshes, keeping the local user's model fully detailed.
- Competitive simulation uses a reused spatial grid and cached neighbor offsets; 200-fish AI thinks at staggered intervals. The free-hosting server uses a 30 Hz simulation with interpolated binary motion to reduce CPU use. Real-device FPS and 200-human capacity must still be tested.
- Experimental 400-player test configuration remains selectable via `ROOM_CAP=400`, but requires stronger hosting and load tests.

## Tests
`node test_sim.js`, `node tests/test_population_200.js`, `node tests/test_online.js`, `node tests/test_modes.js`, `node tests/test_modes_online.js`, `node tests/test_binary_live.js`, `node tests/parity.js`, `node extract_sim.js --check`.