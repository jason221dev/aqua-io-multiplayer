# aqua.io — 200 competitors plus an edible school of 30 mini fish

## Rules
- Exactly **200 competing fish**, including human player fish and autonomous opponents. All start at mass **100**.
- Exactly **30 separate mini-fish** appear as one roaming sardine school. They are environmental **food**, not ordinary ambient fish or competing participants.
- Up to **two fishermen** share the arena.
- Floating food swarms remain at the surface (320 particles in 7 patches).
- The mini-fish school chooses deterministic roaming waypoints, evades competitors as a group, maintains a compact formation, and grows a competitor when eaten. Eaten minis vanish temporarily and rejoin the school at mass 16.
- The mini-fish do **not** count toward Last Fish Standing victory or defeat; Free Roam and Last Fish Standing remain untimed.
- Solo gameplay and the standard authoritative multiplayer server both spawn the school. Each mini fish is in the existing NPC-format snapshot and v2 binary delta updates but carries `mini: true` and has dedicated schooling/feeding logic. No other ambient NPCs spawn in the standard 200-competitor mode.
- Large experimental match capacity remains a separate server configuration; capacity at 400 clients is not validated by this release.

## Testing
Run from this directory:

```sh
node extract_sim.js --check
node tests/test_mini_school.js
node tests/test_population_200.js
node test_sim.js
node tests/test_online.js
node tests/test_binary_live.js
node tests/test_modes_online.js
```

## Deployment
Render service: `aqua-io-binary-staging`, branch `staging/binary-delta-v2`, free plan. The existing production-test service `aqua-io-multiplayer-test` is unchanged.