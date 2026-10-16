# Aqua.io v1.5.32 — Hold-to-Pursue and Non-Coercive Abilities

**Baseline:** v1.5.31 Protected Ability Immunity, preserving v1.5.30 shared-net rendering optimizations.

## Piranha — Frenzy Lock (unchanged 3.9s duration, 11.0s cooldown)

- On ability press, lock the nearest eligible, unobstructed fish, excluding protected or camouflaged targets.
- **While the ability button remains held**, automatically steer and swim toward the locked target (including when the normal swim control is released).
- **Immediately when the button is released**, return to ordinary manual movement. Release of all movement controls stops the fish. The target lock remains until the ability expires or the target becomes ineligible.
- When prey dies, is consumed, is newly protected, or changes life version, automatically choose the next eligible target during the active window.
- No invisible captures: fish still require physical body contact to eat. Predation and spawn protection rules are unchanged.
- AI Piranhas commit to pursuing for their active window; real users must hold the button.
- Multiplayer sends `abHold` on fish input frames, resets it on stale/disconnected input, and sends a separate immediate release edge even while the player has a second finger on the steering control.
- Desktop: hold **Space**; mobile: hold the circular ability button. Press once to start Frenzy (only on a ready activation).
- No new floating opponent target indicators.

## Guppy — Mirror Dart (formerly Quick Dart)

- Guppy rapidly sidesteps and gains a 0.65s dodge and protection window.
- No longer inflicts turn-lock, forced overshoot, or steering restrictions on predators. The attacker can still choose its direction.

## Goldfish — Glitter Screen (formerly Shimmer)

- Maintains three pulses over the 2.8s ability window within 350 game units.
- Unprotected fish in range receive 1.1s of a **35% swimming-speed reduction** per pulse; their own steering direction is unchanged.
- Guided target pursuit is briefly disabled; existing target lock and movement input are not overridden. Existing lunge guidance is interrupted by a pulse.
- Protected fish remain immune; Goldfish does not gain a shield from this power.
- School minnows are also slowed; they continue following their school heading.

## Angelfish — Halo Snare (formerly Whirl)

- Smaller, unprotected fish within 170 units swim at **45% of normal speed** while within range during the 2.5s window.
- No physics impulse, pull, orbit, forced direction, or steering interference. Larger fish and protected fish are not affected.
- Uses a per-tick active-Angelfish list, range gate, and existing wreck-occlusion check. School minnows are affected without changing their collective path.

## Preserved

- All 13 species have authoritative deterministic AI triggers.
- Spawn protection allows ability activation, blocks hostile effects, and lasts 6 seconds on net splashdown.
- The net is singular, releases every 10 seconds, and the v1.5.29–1.5.30 mobile LOD and WebGL performance controls are retained.
- Other species' abilities, 200 fish, 60 minnows, growth, feeding, and continuous chase camera remain available.
- No floating rival ability indicators.

## Validation

Commands executed:

```bash
npm test
npm run check-sync
npm run test:online
```

Results: complete regression suite passed; seven dedicated v1.5.32 tests passed; multiplayer integration passed (26 checks and spectator test); in-browser and server simulation code matched.

Limitation: WebGL rendering and physical Android frame times were not tested in this environment. Use the menu's optional FPS diagnostics when testing on an actual device.
