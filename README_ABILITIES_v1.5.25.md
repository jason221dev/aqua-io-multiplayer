# aqua.io v1.5.25 — sensitivity / ability-identity / animation pass

Baseline: `AquaIO_v1.5.24_Close_Camera_Rival_Feedback_Source.zip` (all files retained). The playable `index.html` is identical to the separately exported `PLAY_AquaIO_v1.5.25_Abilities_Animations.html`. This build is not a deployment.

## Main-menu controller sensitivity

One **Controller Sensitivity** slider (60%–160% in steps of 5%, default 100%) in the main menu, shown to **Fish** and **Fisherman** roles, above the orientation-swap option. The current percentage is displayed and stored in `localStorage` key `aqua.steerSensitivity` (storage-denied environments simply use 100%). Fish left-thumb horizontal turns and rise/dive steering, right-thumb heading/pitch swipes, and desktop R/F vertical steering use this multiplier. For Fisherman, boat turning and cast-aim thumbstick use it; boat throttle is deliberately not scaled. Server-authoritative multiplayer actions receive the already adjusted stick position. Sensitivity does **not** change species movement speed, game physics, or camera follow distance.

## All 13 ability upgrades

| Species | Ability | Previous cooldown → new cooldown (s) | Previous duration → new duration (s) | Specific gameplay identity |
|---|---|---:|---:|---|
| Guppy | Quick dart | 5.8 → **4.6** | 0.95 → **1.65** | Sidestep impulse 380; active invulnerability/evasion 0.65s; near chaser overshoots 0.65s. |
| Sardine | School surge | 8.3 → **6.7** | 1.7 → **2.9** | Area 265; 18–55% squad burst; useful solo. |
| Pufferfish | Inflate | 16.8 → **12.8** | 1.95 → **3.4** | Still **3× combat mass** without permanent water mass; reduced movement penalty (0.62× vs 0.46×), 2s toxin slow. |
| Barracuda | Strike lunge | 9.9 → **7.8** | 0.8 → **1.4** | Lock cone broadened, range 350; speed multiplier 1.8; hit refunds 55% of cooldown and miss adds 1.2s. |
| Piranha | Frenzy | 14.5 → **11.0** | 2.5 → **3.9** | Four 8% speed stacks, catch extends remaining time by 0.48s (cap 5.3s). |
| Goldfish | Shimmer | 10.2 → **8.5** | 1.65 → **2.8** | **Three** timed dazzle pulses; no self-shield, preserving evasion-based play. |
| Koi | Lotus dash | 9.4 → **8.0** | 1.7 → **2.9** | Surface leap unchanged; deep activation always has dash and a short 0.42s shield, improved to 1.45s near kelp. |
| Clownfish | Anemone shield | 12.8 → **10.3** | 1.35 → **2.8** | Self-shield for active window; protects nearby clowns 1.6s, sting/slow on guarded contact lasts 1.4s. |
| Electric eel | Shock pulse | 11.1 → **9.3** | 1.6 → **2.65** | Radius 195; **two** distinct stun waves, with 1.4s central stun, reel interruptions and attack cancel; protected/torpedo enemies resist. |
| Tuna | Torpedo | 9.7 → **8.1** | 0.9 → **1.5** | Ramp 1.4× to 3.0×, committed heading, unstunnable while torpedoing. |
| Angelfish | Whirl | 7.2 → **6.4** | 1.3 → **2.5** | 170-radius vortex, stronger growing pull (175), resistance for larger, shielded, or blocked fish. |
| Seahorse | Camouflage | 9.7 → **7.7** | 2.25 → **3.7** | 170 speed cap/220 in kelp, +90% extra bite growth and reveal when biting or swimming too fast. |
| Sunfish | Moon glide | 9.2 → **7.9** | 2.3 → **3.9** | Surface-band plankton attraction radius 195, max pull 170, longer steady gliding with limited steering. |

The original 6-second respawn protection, 200 competing fish, 60 edible school minnows, continuous jump/re-entry and existing camera framing are preserved. Fishermen retain the same authoritative hook/tension/net checks. All abilities remain vulnerable to expiry, geometry contact, or their specific counterplay. Barracuda/tuna still need **physical contact** to eat; no remote predation was introduced. Puffer water mass is temporary only.

## Eating, swallowing and growth

* `eatEvent` now writes `biteAt` and `biteSize` for **all** real predator fish, not only the locally controlled fish. This also makes AI/rival mouths respond to kills when their detailed rigs are rendered.
* Articulated jaws close in two beats, followed by a longer **0.75-second travelling throat bulge**. Bite anticipation remains driven by actual prey position.
* Player prey miniatures follow a smoother curve toward the world-space mouth and shrink, spin and arc before vanishing. Active swallow miniatures remain capped at 10 to prevent unbounded allocations.
* Persistent growth pulses are animated using existing shared glow texture and a single reusable sprite per detailed rig, based on authoritative `growthAt` instead of guessing from view state. The existing smoothing of `displayMass` keeps growth from snapping.
* Species-specific ability aura frequency/size and expanding ability rings are visually distinct. Rival and player ability feedback still share **one** opacity / effect state contract. Species VFX profiles are immutable and cached rather than created for every one of 200 rivals per render frame.

## Lobby ability demos

The animated 3D showcase uses a 6.8s three-stage cycle with longer skill-display time. Fish now animate jaw opening and closing, an internal gulp and a growth reaction. Food/interception demos move mini-fish toward the hero's mouth, scale them down and use a timed feeding ripple; other demos continue demonstrating shield impacts, camouflage, shock waves, ambush, escape, fish schooling, swimming propulsion, kelp, and plankton collection. The storyboard descriptions have been revised to reflect changed values, including Guppy 0.65s, Puffer 3.4s, Sardine 55%, Barracuda 55% cooldown refund, Piranha 32% chain bonus, Tuna 3.0×, Seahorse +90%, and Eel two pulses.

## Test coverage and limitations

`npm test` exercises historical regressions and the **11 new v1.5.25 tests** covering all species' duration upgrades and unique names, guppy/puffer/sardine/goldfish/eel/koi mechanics, rival animation event state, menu sensitivity, lobby visuals, and syntax parsing. `npm run check-sync` confirms byte-equivalence of the server simulation and embedded client sim, and `npm run test:online` verifies server WebSocket behavior, remote fish slots and networking. The legacy v1.5.15 assertion that species parameters were unchanged was revised specifically because the request is to rebalance those parameters. The v1.5.24 feedback isolation test was updated to load the new immutable VFX-profile constant.

Chromium headless loading via `page.set_content` confirmed the menu loads, no page-level JavaScript exceptions, the slider visibly changes from 100% to 145% and updates the runtime multiplier, and the game enters play. Its WebGL context failed in the sandbox; a runtime 3D screenshot, shader compilation on a real GPU and actual phone GPU/FPS test remain **unverified**. Do not treat those tests as claims that hardware-level graphics have been visually verified. The old gameplay regression tests provide only static/CPU-backed checks where noted. Next practical validation: test on Android touch in portrait/landscape and desktop browser WebGL, then tune performance/FX for the target device.

## Run

```bash
npm test
npm run check-sync
npm run test:online
npm start
```

Open the exported HTML directly for offline single-player. Run `npm start` from the source ZIP's `aqua.io` directory for WebSocket multiplayer. No external graphics or fonts need to download at startup.
