# aqua.io v1.5.27 — Deterministic species AI and marker-free rivals

**Source baseline:** Complete v1.5.26 multiplayer source (all existing assets and modes retained). The authoritative `aqua_sim.js` and inline browser simulation are synchronized by `node tools/sync_sim.js`. This package includes the standalone game, dedicated source/server, and tests.

## Requested changes

1. **No opponent ability indicators.** The 3D gameplay renderer does not allocate or draw floating rival aura sprites, ability rings, shield spheres, status-flash sprites, or mark rings. The player's own feedback remains. Barracuda's player targeting no longer displays a reticle over another fish. Gameplay ability mechanics are unchanged. Rivals retain physical visible state: species silhouettes, authentic Pufferfish inflation, Seahorse/kelp camouflage opacity, normal movement, contact and predation outcomes. The lobby ability tutorial still displays its own demonstration overlays.
2. **Deterministic activation for all 13 AI-controlled competitor species.** AI fish decide whether to activate their own unique ability based on exact authoritative fish/food positions, mass, cooldown, protection, swimming speed and environmental constraints. No random chance controls ability activation; abilities do not fire just because an irrelevant generic danger threshold was reached. The existing seeded stochastic **non-ability** wandering, food placement and fisherman logic remains unchanged.
3. **Tuna:** Torpedo duration **6.0 → 3.0 seconds** (half), while keeping its **16.2-second** cooldown and 1.4× to 3× ramp.
4. **Seahorse:** Camouflage duration **14.8 → 7.4 seconds** (half), keeping its **7.7-second** cooldown, concealment conditions and +90% ambush growth.

## AI activation conditions (not new powers)

| Species | Ability | Deterministic AI activation |
|---|---|---|
| Guppy | Quick dart | Larger dangerous competing fish within 230 units |
| Sardine | School surge | A predator within 250; or food/prey near a sardine ally; or nearby prey/food requiring a solo speed burst |
| Pufferfish | Inflate | An opponent in the temporary 3× combat-mass conversion window within 210; a larger predator within 165; or close edible prey |
| Barracuda | Strike lunge | An edible, unshielded target inside its forward 350-unit lock cone |
| Piranha | Frenzy lock | Eligible edible target within 400; auto-targeting/retargeting then works as before |
| Goldfish | Shimmer | Competing opponent within 350; forced outward flight is unchanged |
| Koi | Lotus suction | Plankton or school minnows within 350 in 3D, without solid ship obstruction |
| Clownfish | Anemone shield | Larger predator within 235, or close threatening activity while allies are present |
| Electric eel | Shock pulse | Opponent or school minnow within 350; 0.65-second stun and 50% slow remain unchanged |
| Tuna | Torpedo | A forward edible fish within 400 or close predator within 175, with room before arena limits |
| Angelfish | Whirl | Edible prey within 170-unit whirlpool range |
| Seahorse | Camouflage | Predator within 270 or edible target within 230, at sufficiently slow swimming speed to maintain concealment |
| Sunfish | Moon glide | Near the surface with plankton within the 195-unit magnet radius |

All AI decisions are recomputed at the existing throttled AI think cadence. Activation occurs only while ready, alive, underwater, not hooked, and not stunned; the same authoritative ability logic runs for players and AI. Abilities do not remotely consume prey, and the 350-unit species rules from v1.5.26 are preserved.

## Test commands and limitations

```bash
npm test
npm run check-sync
npm run test:online
npm start
```

`tests/test_deterministic_ai_v1527.js` exercises all 13 species, including a seeded 200-competitor/60-minnow match in which every species activates its special ability, readiness gates, quiet-world nonactivation, snapshot/restore replay, both halved durations and absence of rival overlay submissions. Historical test expectations specific to the prior opponent-overlay design and the previous durations were updated to match the new spec; all other regression checks remain.

As with v1.5.26, automated script/CPU/browser startup tests cannot establish exact appearance or framerate on a GPU-backed Android WebGL implementation. Perform device testing on a supported WebGL browser before shipping.
