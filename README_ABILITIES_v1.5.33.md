# aqua.io v1.5.33 — Electric Eel Protection-Radius Match

Baseline: **v1.5.32** (Piranha hold-to-pursue and non-coercive abilities).

## Change

- Electric Eel's **Shock Pulse** reaches **170 game units in 3D**, matching the **Clownfish Anemone Shield allied-protection aura** radius (`ABILITY.clownRadius`). Both share `PROTECTION_AURA_RADIUS`, avoiding configuration drift.
- Replaces the former 350-unit Eel shock radius. Shock animation description and lobby demonstration now show 170. Goldfish Glitter Screen and Koi Lotus Suction remain at 350.
- Both shock pulses, AI activation, competing-fish checks, school-minnow checks and fisherman interruption use the same `ABILITY.shockRadius` value.
- The original stun (0.65 s), 50% aftershock slowdown (3.2 s), two-pulse timing (0.98 s), ability duration (2.65 s), and cooldown (9.3 s) are unchanged.
- A fish with spawn or ability protection is completely unaffected by opponents' shocks, even within 170 units; shielded Eels can still activate their own shock.

## Validation

`npm test`, `npm run check-sync` and `npm run test:online`. New test covers the exact 170-unit in/out boundary for fish, minnows, AI, fisher interrupt, and protection immunity. Historical README documents describe their original builds and are left unchanged.
