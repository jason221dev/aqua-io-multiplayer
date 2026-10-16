# Aqua.io v1.5.31 — Protected Ability Immunity

Base: v1.5.30 Smooth Net Release. User-requested gameplay change: fish retain their ability controls and may activate abilities during spawn protection; enemy ability effects **do not affect protected fish**. No ability durations or cooldowns changed.

## Exact rules

- The usual six-second spawn shield remains in place; Clownfish ally/self shields and Guppy dodge defenses also qualify as protection. Protection is checked per **target**, not per caster.
- Electric Eel pulses still occur for the owner, unprotected opponents, schooling minnows, and fisherman. Protected contestants do not receive shock hold, 50% aftershock slow, velocity knockback, camouflage cancellation, targeting interruption, or ability interruption.
- Goldfish pulses and direct forced movement ignore protected contestants. Guppy steering-overrun effects skip protected threats. Clownfish contact retaliation and Pufferfish toxin slow skip protected predators.
- Existing checks still prevent Piranha/Barracuda prey locks, Angelfish whirl, and predation against protected competitors.
- When a shield is gained after a hostile debuff, stun, aftershock, dazzled, turn-lock, and hostile slow timers are cleared. Ordinary self buffs, camo, and ability cooldowns remain intact.
- Ability activation is never blocked merely because the casting fish is protected. Eel and Goldfish AI do not waste offensive abilities when only shielded enemies are nearby, but can still target other vulnerable fish and school minnows.
- Minnows remain vulnerable to Eel pulses (their separate schooling grace is not the competitor spawn shield).

## Performance

- Immunity is handled via inexpensive early per-target checks in the authoritative simulation. The v1.5.30 LOD ramp, particles, adaptive resolution, 200 competitors, 60 minnows, 10-second single shared net dump, and six-second spawn protection are unchanged.
- Suppressing Eel shocks on newly released protected fish should prevent the mass stun/slow transition. A physical phone GPU profile is still needed to verify whether the remaining frame stutter improves.

## Verification

- `npm test` — passes; original ability tests updated where the contract intentionally changed.
- `npm run check-sync` — passes; client inline simulation matches the server engine.
- `npm run test:online` — passes (26 online integration checks + spectator transport).
- New `tests/test_protected_ability_immunity_v1531.js` checks protected vs unprotected Eel/Goldfish targets, caster freedom, minnow shock, Guppy steering, shield cleanse, Piranha/Angelfish, AI target selection and inline/server parity.
- Historical 1.5.27/1.5.28 performance and net-release bitwise replay expectations against *older combat rules* were changed to same-version deterministic replay checks. Static ship collision/kelp equivalence tests still compare against historical baselines.
