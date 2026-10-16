# Aqua.io v1.5.24 — closer chase camera, 60 minnows, rival feedback parity

## Player camera

The live player's open-water chase now uses a closer framing curve. At starter mass 100:

| Orientation | Previous distance | New distance | Reduction |
|---|---:|---:|---:|
| Landscape | 312.50 units | 189.60 units | 39.3% |
| Portrait | 468.75 units | 227.52 units | 51.5% |

Base distance is `clamp(120 + radius(displayMass) × 4.8, 185, 500)`, with a 1.2 portrait multiplier instead of 1.5. Smoothed visual mass avoids a sudden size-related zoom when food is eaten. A body-size framing floor uses species dimensions, camera aspect ratio and puffer inflation to pull back only when a very large fish would otherwise fill the screen. Consequently giant or inflated fish can exceed the base distance cap; starter fish retain the distances above.

The existing bounded spring arm, ship collision handling, wreck-interior target distance and continuous leap/apex/splash camera remain. Observer/predator-follow and fisherman cameras keep their previous distance behavior. The change targets the live player swimming in open water.

This is a mathematically selected closer default, not a claimed universally optimal distance. Actual phone framing and comfort still require visual playtesting; the environment's browser download failed during the prior audit. No new FPS or rendered-screen claims are made.

## Minnow school

- School capacity and starting population: **30 → 60 minnows**, in solo and multiplayer.
- Competitive roster remains **200 fish**. Minnows remain non-competitive food and do not change the Last Fish Standing winner condition.
- Existing school roaming, collective escape and one-at-a-time reproduction remain. The larger school retains the original spacing curve, expanding its footprint instead of placing twice as many fish in the same volume.
- Sardine-body, tail, fin, eyes, pupils, highlights, mouth and lip instance capacities derive from the same 60-minnow constant. Both eyes are allocated for all 60 fish.
- The simulation already supported 60 slots; no combat, growth or ability parameters were rebalanced. Simulation-source edits only clarify obsolete population comments.

## Rival camouflage and ability feedback

A shared `fishAbilityFeedback` function now drives both detailed player rigs and instanced rivals. This prevents their activation rules and visual values from drifting apart.

| Feedback | Shared behavior |
|---|---|
| Seahorse camouflage | 0.28 opacity during its active ability; normal opacity returns when the ability ends or ambush breaks cover. |
| Kelp concealment | Existing 0.40 opacity and its existing precedence over camouflage. |
| Species ability aura | All 13 species use the player's color, pulse timing, size and opacity formula; eel and puffer retain larger aura radii. |
| Guppy dart | Cyan flash, same pulse, opacity and lateral offset. |
| Sting/slow status | Orange flash while both sting and slow timers are active. The shared function also fixes the detailed guppy's sting color to orange. |
| Protection | Same translucent shield radius and opacity pulse, only when authoritative protection is active. |
| Puffer inflation | Existing v1.5.23 instanced expansion remains, using the authoritative radius factor. |
| Existing predator mark | Same gold mark and eligibility as the detailed model. |
| Private attack lock | Remains visible only to the controlling barracuda; rival targets are not exposed. |

Rival bodies use the existing opaque batches normally. Concealed fish move into lazily created transparent near/far batches with independent per-instance opacity attributes. Cached fish geometry and the respawn-net geometry are never modified. Dedicated aura, flash, shield and mark batches keep effects bounded rather than creating individual effect objects per fish. Batch counts reset every frame, so expiration, death and offscreen culling remove stale effects. Owned fade geometry/materials and effect resources are disposed on rebuild.

This delivers the ability/camouflage feedback shared with the player; distant rivals still use instanced fish geometry, not the player's full articulated mouth/eye rig. GPU shader compilation and transparent overlap appearance have not been visually verified. Shader transformations are checked against the embedded Three.js shader source, and the actual rival batching path is executed with real Three.js CPU objects.

## Verification

- Full regression suite, inline-script parsing and client/server simulation parity passed.
- Camera tests cover the closer starter framing, growth, orientation, inflated-puffer clearance, and preserved spectator/interior routing.
- 60-minnow tests cover both Free Roam and Last Fish Standing, snapshot restoration, 200-competitor preservation, finite school state and rendering capacities.
- Rival tests cover all 13 species, activation/expiration, camouflage/reveal, kelp precedence, dart/sting cues, shader-hook composition, geometry ownership, bounded matrix/color/opacity uploads, and actual active → normal → dead render-batch transitions.
- Multiplayer integration and remote predator-chain transport passed with the 60-minnow server configuration.
- Logs: `audit/regression_v1524.log`, `audit/multiplayer_v1524.log`. Historical v1.5.23 reports and results remain separately labeled and retained.

## Run

```bash
npm test
npm run check-sync
npm run test:online
npm start
```

The PLAY HTML is byte-identical to the packaged `index.html`. Open it for offline play, or run the server for multiplayer. No production deployment was performed.

## Suggested next refinement

After trying this closer default on the phone, add a small optional camera-distance preference (Close / Standard / Wide) while keeping collision clearance and growth framing automatic. This would let players choose visibility versus immersion without changing the gameplay camera rules.
