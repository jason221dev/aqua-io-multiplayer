# aqua.io v1.5.26 — Six species ability reworks

**Baseline:** `AquaIO_v1.5.25_Ability_Animation_Source.zip`. This is an in-place modification of its complete source tree, retaining the 60-minnow school, 200 competing fish, menu sensitivity control, eating/swallowing/growth animations, close chase camera, ordinary swimming jumps, single-player observer, shared respawn net, fisherman and multiplayer logic. Older README documents in this package describe their original builds, not current six-species behavior.

## Requested changes — implemented

| Species | Active ability | Effect | Ability window | Cooldown |
|---|---|---|---:|---:|
| Koi | **Lotus suction** (replaces ability-triggered leap/dash) | Pull **surface pellets and live school minnows** toward Koi within **350 game units (3D distance)**, including pulling surface pellets down into deeper water. Attraction respects ship obstruction and arena boundaries. Pellets must physically reach the fish to be eaten; minnows remain normal contact prey. Ordinary swimming breaches and continuous re-entry still work. | **2.9 s** | **8.0 s** |
| Electric eel | **Shock pulse** | **350-unit** 3D radius, two pulses separated by 0.98 s. **All nearby competing fish and school minnows** are stunned for **0.65 s per hit**; each pulse sets **3.2 s of aftershock**, reducing movement speed to **50%** once stun ends. Overrides protections or torpedo stun immunity; also interrupts attacks and nearby fisherman reeling. | **2.65 s** | **9.3 s** |
| Piranha | **Frenzy lock** | Automatically selects and steers toward the **nearest eligible edible target**, including competitors and school minnows. Retains lock until target is consumed or becomes ineligible; automatically selects the next. Same real-contact predation rules and 8% chain speed stacks (max four), plus catch-duration extensions. Lock reference is serialized for multiplayer. | **3.9 s**, extendable on catch to 5.3 s remaining | **11.0 s** |
| Tuna | **Torpedo** | Speed ramps from 1.4× to 3.0× with committed direction. **4× duration**, **2× cooldown** versus v1.5.25; Eel shock can now interrupt it per the all-opponents instruction. | **6.0 s** (was 1.5 s) | **16.2 s** (was 8.1 s) |
| Seahorse | **Camouflage** | **4× active invisibility duration** when swimming carefully. Sprinting, electric shock, or a concealed ambush bite ends camouflage. Existing +90% growth bonus for concealed bites remains. | **14.8 s** (was 3.7 s) | **7.7 s** |
| Goldfish | **Shimmer** | All **competing opponents** within **350 units** are forced to steer directly away from the Goldfish continuously while its ability is active, regardless of their own steering commands. The existing three dazzle pulses remain as supplemental disruption; Shimmer grants no shield. | **2.8 s** | **8.5 s** |

### Implementation details

- These are **server-authoritative simulation effects**, not display-only visuals. The `aqua_sim.js` simulation module and HTML-embedded client source are byte-equivalent, including new state (`eelSlowT`, Piranha lock reference / generation).
- Suction processes food as part of the moving fish/food loop and then school minnows **after** the school movement update. Neither source of food is consumed at range, and suction skips obstructed lines through ship hulls.
- Eel applies stun/slow to minnows in the independent school update as well as competing fish and ordinary NPCs. At-rest targets are frozen briefly, then recover to exactly half their normal swim speed until the aftershock expires.
- Goldfish directed fleeing takes priority over AI steering, human steering and Tuna's committed direction while in range. Eel's stun takes priority over fleeing. School minnows are affected by Eel and Koi; Goldfish's enemy-only repulsion affects the competing roster.
- Piranha maintains target identity until the prey dies, becomes protected/too large, is blocked by the ship or changes NPC life generation. Killing a prey explicitly invalidates the lock; revived ambient NPC references do not silently masquerade as the old target. Snapshot/restore retains this information.
- The lobby 3D tutorial stories, ability names, highlights and demonstration animations have been adjusted. Koi draws in multiple tiny fish and food particles; Goldfish scatters rival fish; Eel stuns a group of nearby fish; Piranha shows chained targets; Tuna/Seahorse tutorial labels display their new timings. Actual shader/GPU rendering remains device-dependent.

### Verification (October 15, 2026)

- `npm test` — existing regression tests **pass**, with historical assertions updated only where directly superseded by the requested rules; **10 new v1.5.26 checks pass**.
- `npm run check-sync` — byte-for-byte client/server simulation synchronization **passes**.
- `npm run test:online` — multiplayer transport/integration suite **passes**.
- Headless Chromium — **menu loads, sensitivity updates from 100% to 145%, play state enters, no page-level JS exceptions**.
- **Limit:** Headless Chromium in this sandbox cannot initialize WebGL (`Error creating WebGL context`), so the newly staged lobby 3D animations and gameplay visuals are **not visually verified on GPU hardware**. Test on Android Chrome/WebGL and an actual multiplayer device before deployment.

### Commands

```bash
npm test
npm run check-sync
npm run test:online
npm start
```

Open `index.html` directly for offline play (browser allowing WebGL required), or run `npm start` from this directory for multiplayer. Separate standalone HTML export is the same `index.html`.
