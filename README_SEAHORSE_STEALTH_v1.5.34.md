# Aqua.io v1.5.34 — Seahorse Camouflage: Invisible, Not Invulnerable

Baseline: v1.5.33 (170-unit Eel shock / Clownfish protection radius).

## Requested rule

- **Seahorse**, referred to as “horseshoe” in the request, becomes visually **invisible to opposing fish** during active camouflage (`camoT > 0`).
- The owning player keeps a translucent, controllable reference to their own Seahorse.
- **Camouflage does not grant invulnerability.** An opponent with greater effective combat mass still eats a camouflaged Seahorse if a genuine physical collision occurs. The contact test, mass rules, and swallowing/growth mechanics are not bypassed.
- The existing **six-second spawn shield** and other explicit protection abilities still block predation. Concealment and protection remain separate mechanics.
- Camouflage duration is unchanged at **7.4 seconds**, subject to its existing sprint, shock and ambush-bite break conditions.

## Implementation

1. `visuallyHiddenFromOpponent` is the authoritative detection predicate. AI predators do not use concealed Seahorses to trigger tactical abilities, flee, acquire Piranha or Barracuda target locks, or set ordinary chase vectors. NPC prey/predator AI likewise cannot visually acquire them. There is no old 38-unit detection loophole.
2. The universal post-movement contact/predation solver **does not consult** the visibility predicate. An accidental or intentional physical overlap still results in capture under the usual mass/protection conditions. Area-of-effect attacks retain their existing effects on unprotected targets whether or not a target is camouflaged.
3. Both the full-rig and instanced rival rendering paths skip concealed opponents entirely. The locally owned fish retains its existing semitransparent appearance (28% alpha outside kelp) so it can be steered. The owner's ghost clears immediately when `camoT` expires, rather than following a short remaining `abilT`.
4. No special-ability HUD indicators appear for rival fish. Other species, Eel range, single-net release cadence, AI gameplay, and net-release performance patches remain unchanged.
5. Server `aqua_sim.js` and standalone `index.html` simulation match byte-for-byte, validated by `npm run check-sync`.

## Verification

- `npm test`: passed, including five additional Seahorse-specific tests for physical predation, spawn protection, Piranha/Barracuda lock rejection, AI vision, and owner/rival render rules.
- `npm run check-sync`: passed.
- `npm run test:online`: passed (26 multiplayer integration checks and spectator-chain transport checks).
- Browser rendering was **not measured on a physical Android/WebGL device**. The rendering contract and simulation were statically/automatically tested.

## Manual acceptance checklist

1. Choose Seahorse, activate Camouflage. Your own fish remains ghosted, not fully invisible to yourself.
2. Watch a rival Seahorse activate Camouflage: the model disappears; AI predators do not steer toward it or lock onto it.
3. Guide a larger fish into contact with the unseen Seahorse: the larger fish can still swallow it, showing normal eat/growth feedback.
4. Verify smaller fish cannot consume larger camouflaged Seahorses, and a Seahorse with a live spawn shield cannot be consumed.
5. Verify the rival model returns immediately upon camouflage expiration, sprint, electrical shock, or ambush bite.
