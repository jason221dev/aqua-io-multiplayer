# Aqua.io v1.5.35 — Eight Species Ability Balancing Changes

Baseline: v1.5.34. No aquarium, single-net, 200-rival, 60-minnow, 10-second net cycle, six-second spawn protection or camera adjustments.

## Ability changes

1. **Piranha (Frenzy Lock):** Tap ability once to activate; while Frenzy is running, holding forward propulsion/swim control automatically pursues the currently locked closest eligible fish. Releasing propulsion stops swimming (it does not clear the target lock). When a target is eaten, dead, protected, hidden, or otherwise no longer eligible, the next closest eligible target is acquired. Does not target protected/hidden fish. Normal 3.9s base duration; existing catch extensions capped at 5.3s remain.
2. **Sardine (School Surge):** Range is **795 units (3 × 265)** for allied sardines and school minnows. Normal 265-unit schooling/cohesion distances are unchanged. Active duration 2.9s and existing 18–55% surge remain.
3. **Pufferfish (Inflate):** No poison/slow retaliation when eaten. The existing 3× temporary combat mass, duration, growth and predator protections remain.
4. **Barracuda (Strike Lunge):** One specific eligible target lock per ability activation. If target disappears, lunge retains original forward heading rather than acquiring a second target. A successful hit retains its existing cooldown refund.
5. **Goldfish (Glitter Screen):** Gains **2× swimming speed for the active 2.8s duration**. Existing three glitter pulses still reduce unprotected opponent speed by 35% and interfere with targeting, without modifying opponent steering.
6. **Clownfish (Anemone Shield):** Gains **2× swimming speed while active**. Clownfish personal and allied shields **stun hostile fish on actual physical contact for 0.65s**, then apply an independent **50% speed reduction for 1.4s**. Spawn-only protection does not retaliate. Protected attackers remain immune. Stun retaliation is throttled by its previous 3s grace to avoid repeated rapid stun loops.
7. **Electric Eel (Shock Pulse):** After stun, affected unprotected fish and school minnows swim at **25% normal speed (75% slower)**, while the existing 170-unit shock radius, two pulses, 0.65s stun and 3.2s slow timer remain.
8. **Tuna (Torpedo):** Heading no longer locks during the boost: steering and depth input work throughout the active 3-second 1.4×–3× acceleration. The existing 16.2s cooldown remains.

## Implementation

- Shared authoritative `aqua_sim.js` / `index.html` SIM block (synchronized exactly by `tools/sync_sim.js`).
- Player input: Piranha's auto pursuit uses nonzero `mv` (held propulsion), rather than `abHold`. Ability button remains the initial trigger; multiplayer transmits movement as before.
- Clownfish retaliation has distinct `clownGuardT` / `clownSlowT` timers so its 50% slow is independent from Electric Eel's 75% slow. Newly added metadata is included in both legacy JSON and dense binary multiplayer motion snapshots.
- UI hints and species-select lobby demonstrations are revised to match the rules.
- Targeted tests in `tests/test_balance_v1535.js`; historical assertions updated only where previous rules were explicitly superseded.

## Validation

Run `npm test`, `npm run check-sync`, `npm run test:online` at project root. Mobile GPU/WebGL visual effects and on-device performance require physical-device testing.
