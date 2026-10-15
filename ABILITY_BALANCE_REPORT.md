# Aqua.io v1.5.13 - ability audit and game-theory balance pass

## Shipped changes (aqua_sim.js, mirrored byte-for-byte into the index.html SIM block)
| Ability | Field | Before | After |
|---|---|---|---|
| Puffer - Inflate | cooldown | 13.0 s | 16.8 s |
| Puffer - Inflate | duration | 2.2 s | 1.95 s (SP hint and tutorial text updated) |
| Piranha - Frenzy | cooldown | 11.1 s | 14.5 s |
| Piranha - Frenzy | growth conversion during Frenzy (BALANCE.piranhaConversion) | 1.30 | 1.23 |

Revert either change by restoring the "Before" values (three numbers in SP + one in BALANCE; for puffer also the 2.2s in the hint and in FISH_ABILITY_STORIES).

## Behaviour-neutral refactor
Hard-coded literals moved into ABILITY with identical values so they can be tuned and audited: guppyDodge .28, guppyProt .26, goldProt .32, dazzleTime .68, clownAllyProt .5, kelpProt .55, camoSpeed 122. All 46 gameplay checks, check-sync and test:online pass.

## Not changed (11 abilities unchanged)
Guppy, sardine, barracuda, goldfish, koi, clownfish, eel, tuna, angelfish, seahorse, sunfish keep v1.5.13 values.

## Audit findings (not changed)
- Controlled scenarios confirm each ability does what it says (whirl eats a fleeing smaller fish; inflated puffer beats a 2x predator; camouflage makes AI hunters drop the target). tools/ability_audit.js
- Camouflage is effective only against AI hunters and fishers; human players still see the seahorse at 28% opacity.
- Koi pressed below the surface window and outside kelp burns the full 9.4 s cooldown for only the x1.2 speed window.
- Piranha's +30% growth conversion during Frenzy is not mentioned in its hint or tutorial.
- Sardine surge also boosts rival and ambient sardines within 225 units.
- Ability numbers are duplicated as hard-coded text in index.html (FISH_ABILITY_STORIES, labels); tuning needs edits in both places.
- Bot AI auto-triggers abilities, so ability tests must lock cooldowns.

## Method (tools/)
balance_lab.js: headless 4v4 duels on the real simulation, one species-specific ability-use policy for every species, payoff = biomass share, Nash mix by multiplicative weights. optimize.js: 6 replicator-style iterations on a per-species strength knob (bounded 0.70-1.40). pooled_fit.js: pooled regression of payoff vs knob with slope shrinkage. validate.js: paired held-out validation. apply_params.js: rounds knobs, patches source and client text.

## Results
Baseline average payoff vs a uniform field, three independent runs (seed sets differ):
- Consistently strong: piranha +0.125/+0.211/+0.150, goldfish +0.148/+0.222/+0.100.
- Consistently weak: seahorse -0.209/-0.161/-0.216; barracuda, angelfish, clownfish negative in all three.
- Sardine, tuna, guppy, sunfish, eel change sign between runs (noise). Spread 0.36-0.44; Nash support 4-7 of 13 species; no strict dominance in the held-out run.
Pooled ability leverage (slope of payoff per ln knob): tuna .64, guppy .46, eel .38, sardine .33, puffer .23, koi .19, piranha .16, clown .12, goldfish .04, angel .04, sunfish .03, seahorse .00. Goldfish, angel, sunfish, seahorse barely respond to ability strength even at +/-40%; their imbalance is likely in passive stats (not tested, not changed).
Paired held-out validation, 16 seeds, changed species vs the 9 unchanged species: puffer -0.081 +/- 0.052, piranha -0.030 +/- 0.051. Candidate sardine (+0.018 +/- 0.064) and koi (-0.052 +/- 0.074) changes showed no effect in the expected direction and were dropped.
Full 13x13 on the original held-out seeds (4 seeds): spread 0.440 -> 0.487, Nash support 4 -> 3 of 13, puffer +0.051 -> +0.003, piranha +0.150 -> +0.146. No aggregate improvement is measurable at this sample size; per-species standard error is roughly 0.05-0.09.

## Limits
Evidence for the shipped changes is weak-to-moderate (puffer ~1.6 SE, piranha ~0.6 SE) and the species were selected after seeing validation data. The lab policy is not human play. Headless sim only; no device, WebGL or load testing.

## Decision pending
Passive-stat changes (goldfish and sunfish `gain`, seahorse speed) are outside the ability code and were not tested or changed.

---
# Identity pass: make each ability special and distinct

Goal: every fish owns one exclusive verb. Before this pass guppy, goldfish and tuna shared their effects with other abilities (short invulnerability windows, speed bursts, crowd control).

| Fish | Exclusive verb | What changed |
|---|---|---|
| Guppy | Evade | A larger fish within 180 units overshoots: its steering response is x0.2 for 0.35 s while it keeps its momentum. |
| Goldfish | Disrupt | Self-shield removed (goldProt 0.32 -> 0). Dazzled fish now also swerve (+/-0.6 rad sinusoid) on top of the slow and lost bite lock. |
| Tuna | Charge | A torpedoing tuna cannot be stunned, slowed, dazzled or turn-locked; eel shock skips it and cannot cancel the torpedo. |
| Seahorse | Ambush | A bite while camouflaged grows +60% extra (ambushBonus 0.6) and blows the camouflage. |
| Sardine / Puffer / Barracuda / Piranha / Koi / Clownfish / Eel / Angelfish / Sunfish | Swarm / Mass flip / Hunt / Chain / Breach / Thorns / Shock / Vortex / Forage | Unchanged verbs. Puffer and piranha keep the earlier cooldown changes. |

New ABILITY constants: overshootTime .35, overshootTurn .2, overshootRange 180, dazzleSwerve .6, ambushBonus .6, goldProt 0.
Code: new `unstoppable()` helper, `turnLockT` fish state, `abilityOnEat(f, prey, preyType)` now receives the victim. Hints and the index.html tutorial text were updated for guppy, goldfish, tuna and seahorse. New tests: tests/test_ability_identity.js (4 checks, wired into `npm test`; 50 checks total). No new visuals or UI were added.

## Evidence
Identity probe (tools/identity_probe.js): identical scenarios for all 13 abilities, 18 measured effect dimensions, distance to nearest neighbour after per-dimension normalisation.
- Closest pair: guppy~tuna 0.76 -> angel~sardine 1.41. Mean nearest-neighbour distance 1.07 -> 1.50.
- Abilities with no exclusive effect: guppy, goldfish, tuna -> tuna only (its stun immunity is shared with koi's airborne state; delivery differs).
- Caveat: the probe dimensions (swerve, group buff, thorns, lock) were added while building this pass, and an earlier probe version had flaws I fixed before the final before/after run. It measures that each effect exists and is exclusive, not that players will perceive it.

Balance regression (tools/balance_lab.js, 3 seeds, same seeds and policy for both versions; per-species standard error roughly 0.06-0.09):
- Spread 0.354 -> 0.354. Nash support 4 -> 6 of 13 species. Strict dominance (piranha > seahorse) -> none.
- Goldfish +0.207 -> -0.004 (consistent with removing its shield). Seahorse -0.147 -> -0.069. Sardine +0.167 -> +0.126.
- Piranha +0.159 -> +0.204 and is now the strongest outlier (34% Nash weight). Barracuda -0.150, angelfish -0.093 and sunfish -0.130 remain the weakest.
- Conclusion: no new runaway ability, no aggregate balance gain beyond noise.

## Limits
Lab bots already wander randomly when dazzled, so goldfish swerve and seahorse ambush against humans are checked by unit tests and the probe, not by lab win rates. No rendering, device or load testing. Passive stats (gain, speed) are untouched.

## Decisions pending
Piranha remains the strongest; weak abilities (barracuda, angelfish, sunfish) respond little to ability numbers. New effects have text only; whether to add client visual cues (overshoot, swerve, ambush reveal) is open.
