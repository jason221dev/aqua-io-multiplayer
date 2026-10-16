> **Latest release — v1.5.42 Animated Ability Showcase:** See [README_ABILITY_DEMOS_v1.5.42.md](README_ABILITY_DEMOS_v1.5.42.md).

> **Latest balance change (v1.5.39):** Piranha Frenzy duration halved to 1.95 seconds (2.65-second extension cap), no Frenzy speed bonuses. See [README_PIRANHA_v1.5.39.md](README_PIRANHA_v1.5.39.md).

> **v1.5.38:** Single-source browser/server simulation and transport via deterministic build. See [README_CANONICAL_BUILD_v1.5.38.md](README_CANONICAL_BUILD_v1.5.38.md).

> **Current release (v1.5.37):** Full-source audit and rendering/transport optimization. See [`AUDIT_v1.5.37.md`](AUDIT_v1.5.37.md). Prior species ability balance remains v1.5.35; v1.5.36 added the Eel status bolt.

> **Latest species ability balance (v1.5.35):** See [`README_BALANCE_v1.5.35.md`](README_BALANCE_v1.5.35.md) for the eight requested changes, tests, and remaining device-validation constraints. All older readmes are historical.

> **Latest ability correction (v1.5.34):** See [`README_SEAHORSE_STEALTH_v1.5.34.md`](README_SEAHORSE_STEALTH_v1.5.34.md) for opponent invisibility without predation immunity. Earlier documentation is historical.

> **Latest performance update (v1.5.28):** See [`README_PERFORMANCE_v1.5.28.md`](README_PERFORMANCE_v1.5.28.md) for net-respawn stutter mitigation, wreck-collision acceleration, 30Hz offline ticks, adaptive rendering and verification. All previous release documents remain historical.

> **Latest changes:** See [`README_ABILITIES_v1.5.27.md`](README_ABILITIES_v1.5.27.md) for deterministic species AI, removal of opponent ability markers, and updated Tuna/Seahorse durations. v1.5.26 documentation below remains historical.

> **Latest ability changes:** See [`README_ABILITIES_v1.5.26.md`](README_ABILITIES_v1.5.26.md) for the current Koi/Eel/Piranha/Tuna/Seahorse/Goldfish behavior. Older versioned documents are historical.

# Aqua.io v1.5.25 — controller sensitivity, ability balance, animations and lobby tutorials

See [README_ABILITIES_v1.5.25.md](README_ABILITIES_v1.5.25.md). Historical release notes follow.

# Aqua.io v1.5.24 — closer player camera, 60 minnows, rival feedback

See [README_CAMERA_FEEDBACK_v1.5.24.md](README_CAMERA_FEEDBACK_v1.5.24.md) for this update. Historical notes follow unchanged.

# Aqua.io v1.5.23 — gameplay and animation audit

See [AUDIT_v1.5.23.md](AUDIT_v1.5.23.md) for applied fixes, test evidence and remaining device checks. The older release notes below are retained verbatim.

See [README_LEAP_v1.5.22.md](README_LEAP_v1.5.22.md) for the latest leap and water-entry fixes.

See [README_NET_CONSISTENCY_v1.5.20.md](README_NET_CONSISTENCY_v1.5.20.md) for the synchronized single-net lifecycle, animation and protection rules.

# Aqua.io v1.5.20 — shared-net consistency pass

See [README_AUDIT_v1.5.19.md](README_AUDIT_v1.5.19.md) for verified fixes, tests, and limitations.

# Aqua.io v1.5.13 — Ability Identity / verified deployment source

This directory is the authoritative runtime and the root of the GitHub `main` branch. `index.html` is the playable, fully self-contained single-player client; with `server.js`, WebSocket multiplayer is enabled. `aqua_sim.js` is extracted from the exact inline simulation block in `index.html`.

## Requirements preserved
- Fisherman netting: physical near-surface catch, grace period, animated net and one scored catch; NET appears only when the authoritative catch predicate succeeds.
- Shipwreck: solid hull, railings, sails and rigging; designated breaches, cabin access and hatch remain swimmable.
- Free Roam: follow eater for six seconds; respawn with six-second protection.
- Last Fish Standing: follow actual eater until conclusion; follow successor when eater is eaten; fallback to largest survivor when eater is caught; no respawning.
- Single-player Observer Mode: free camera, follow largest, return to fish. While observing, the player is removed from competition (not merely rendered immune).
- Multiplayer: authoritative simulation, stable metadata for predator succession even at long distances, and no server-controlled observer movement.

## Run locally
`npm start` (Node 20+); navigate to http://localhost:3000/.
`npm test` checks gameplay, collision, survival, camera contracts and metadata chain.
`npm run check-sync` verifies client/server simulation parity.
`npm run test:online` runs full multiplayer WebSocket integration and remote spectator-chain transport checks (Node 22+).

## Build validation and limitations
Automated tests cover deterministic rules and the DOM contract; final real-device WebGL rendering, device-specific touch behavior, and multiplayer load at scale require physical-device testing.

## Ability Identity build
This build includes Quick Dart predator overshoot, Shimmer dazzle swerve without self-shield, Torpedo stun/slow immunity, and Seahorse camouflage ambush growth. Earlier Pufferfish and Piranha balancing changes remain. See `ABILITY_BALANCE_REPORT.md` and `tests/test_ability_identity.js`.

### v1.5.14: True Observer Mode

Entering the offline observer removes the player's fish from competition: no AI movement, predation, fisherman catches or auto-respawns occur. Free Roam can return by spawning a fresh shielded fish; Last Fish Standing requires a new match. See `README_OBSERVER_FIX_v1.5.14.md` and `tests/test_true_observer.js`.

### v1.5.15: AI netting and lifelike 100-mass fish lures
- AI fisherman follows close enough to land a physically hooked fish, then reacts to an eligible near-surface NET opportunity in about 0.22 seconds. No catch occurs outside distance, depth, or tension rules.
- Net animation remains visible for 1.65 seconds after any successful human/AI net.
- Every fisher lure looks like a species-specific, tail-animated fish with EXACTLY 100 mass, matching the normal starter fish mesh/scale.
- The fishing line, hook, and private targeting apparatus remain hidden from fish players; fishermen keep their line visibility.
- The lure participates in the ordinary fish view's target ring. Biting it hooks or starts the escape minigame rather than granting biomass. The model disappears when the fish bites.
- The authoritative simulation, embedded client, and multiplayer server are exactly synchronized.
- Run `node tests/test_ai_net_lure.js`, `npm test`, `npm run check-sync`, and `npm run test:online` for verification.
