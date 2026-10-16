# Aqua.io v1.5.23 — gameplay, graphics and animation audit

Audited input: AquaIO_v1.5.22_Continuous_Leap_Camera_Source.zip
Audit date: 2026-10-15

## Outcome and scope

Implemented targeted gameplay reliability, presentation correctness, animation continuity and rendering-efficiency fixes. Reviewed the client, authoritative simulation, multiplayer input/transport, procedural fish geometry, camera, controls, predation, growth, fishing, observer mode, respawn nets and match lifecycle. Preserved all 61 original archive entries, existing species, UI layout, simulation parameters and historical reports. Added tests, evidence and this report.

This is a source/CPU-tested optimization release. Actual WebGL frames, shader compilation, phone performance, audio/haptic output and subjective play feel were not verified. No browser executable was installed; the attempted Chromium download failed with invalid/truncated archives. No visual screenshots or measured FPS claims are supplied. The underlying simulation file is unchanged and remains exactly synchronized with its inline client copy.

## Applied fixes

| Area | Finding | Implemented change | Verification |
|---|---|---|---|
| Rival puffer visibility | Dense instanced fish ignored inflation while combat used the inflated state. | Rival model scale and culling bounds now use the simulation's inflation factor. | Source-path regression; real Three.js geometry validation. |
| Protection readability | Dense rival fish lacked the detailed model's shield indicator. | One instanced translucent shield batch shows rivals with authoritative `prot > 0`. | Source-path regression. Actual appearance needs WebGL review. |
| Match rebuild cleanup | Removed InstancedMesh objects retained their GPU instance resources. | Dispose retired instance buffers, retain shared cached geometry/material, dispose the shield batch's owned material. | Real Three.js disposal-event test confirms shared geometry survives. |
| Swallow lifecycle | Swallows could remain when the player model was absent. | Release swallow objects when the player/model is gone; skip mouth transform work if no swallows exist. | Executed function with missing player mesh. |
| Animation continuity | Tail phase used elapsed match time multiplied by current speed, causing phase jumps when speed changed. | Integrate a per-model phase using frame delta and current speed. | Executed speed-transition test. |
| Turn/pitch easing | Linear `dt * 10` smoothing varied with frame rate. | Exponential damping for detailed fish; smooth instanced heading changes. | Parsing and existing camera continuity regressions. |
| LOD stability | One distance threshold caused near/far flicker; vertical separation was ignored. | Three-dimensional distance with 540-unit entry / 650-unit exit hysteresis. | Source-path regression. |
| Instance upload cost | Dirty instance buffers uploaded their entire 400-slot allocation. | DynamicDrawUsage and active-prefix update ranges for rival fish and shields. | Source audit; GPU timing unmeasured. |
| Instance capacity | Counters incremented before capacity rejection. | Check capacity before incrementing or setting a matrix. | Source-path regression. |
| Focus and interrupted touch | Observer stick/buttons survived reset; keyboard-only movement did not send immediate stop. | Clear observer controls, keyboard state and queued ability taps; immediately stop keyboard-driven fish too. | Executed reset function regression. |
| Online tackle panel | Client loop stopped while the authoritative match kept running. | Offline tackle still pauses; online interpolation/rendering continue. | Executed loop test for both modes. |
| Stale server input | Lost release packets could leave movement commands latched. | Neutralize movement, boat stick, targeting, queued actions and reeling after 750 ms without accepted input. | Executed server-frame test plus multiplayer integration. |
| Background work | A hidden page could still perform expensive render/simulation work when callbacks fired. | Early return while hidden, after refreshing the frame timestamp. | Source audit; existing visibility handler resets input. Online server continues. |
| Fish finder restart | A new match's reset clock could suppress finder updates until it caught up with the previous clock. | Reset finder draw timestamp and accept backward clock changes. | Source review. |
| Extreme growth text | Large mass rewards could produce oversized floating labels. | Clamp floating label font to 16–34 px. | Source review. |
| Resize robustness | Zero-size canvas rectangles could produce an invalid camera aspect. | Clamp canvas dimensions to at least 1 px. | Source review. |

## Gameplay assessment

- Predation is effective-combat-mass based, with protection and ship occlusion checks. Equal effective masses do not consume one another. The current baseline uses symmetric body contact, not species-specific mouth-only eating. This release preserves that rule; it does not silently add directional biting.
- Growth, puffer combat-mass changes and the existing 13 ability identities retain their established parameters. Previous balance reports are preserved as historical evidence, not presented as new balance validation.
- All initial competitors retain six-second protection. Shared-net release and splash protection, observer exclusion and no-respawn Last Fish Standing contracts pass.
- Fishing retains physical distance/depth/tension eligibility, one scored catch per successful net, and the red-tension break rule. Fish-view lures remain 100 mass and hidden fishing lines remain hidden.
- Held-input water re-entry and continuous leap camera behavior retain the existing 20–120 Hz camera regression coverage. These are numerical tests, not phone footage.
- Authoritative multiplayer retains reconnect behavior, compact motion, distant predator-chain metadata and private fisher controls. The new input timeout intentionally stops movement during a sustained input outage; fresh input restores control.
- Last Fish Standing completed in both sampled seeds, with visible growth represented by mass values well above 100. Two seeds do not establish overall balance, match-duration distribution or human enjoyment.

## Graphics and animation assessment

All 13 species at both geometry detail levels were constructed using the embedded Three.js r128 CPU implementation. Position, normal, color and flex arrays contain finite values; indices are in range; bounds are finite and nonzero. Individual player mouth/jaw, eye, fin, swallow, shield and ability presentation remains in place. Rival fish retain instanced silhouettes and shader-driven swimming.

The added rival shield is a gameplay protection cue and is not a mass/sonar glow. Its transparent ordering, silhouette fit and overdraw still need actual WebGL inspection. Rival inflation now reflects its authoritative radius factor, but detailed player-only deformation/effects are not fully reproduced by the instanced renderer.

### Rendering-cost reasoning

One transform is 16 float32 values = 64 bytes. Each 400-slot instance matrix contains 25,600 bytes. Previously every dirty rival batch uploaded that full matrix; now it uploads `visible count × 64` bytes after initial allocation. For an illustrative 200 visible rivals spread across 13 dirty species/LOD batches, the matrix payload changes from 332,800 bytes to 12,800 bytes (96.2% less for this component). Actual savings depend on the number of dirty batches, culling and driver behavior. Shield matrices add at most 12,800 bytes for 200 protected visible rivals. These are byte calculations, not measured FPS or total GPU bandwidth.

The new shield batch adds at most one draw call when populated. Geometry and materials stay shared. No post-processing or new texture downloads were introduced.

## Validation

- Existing regression suite and exact client/server simulation parity passed.
- Nine new audit checks cover script parsing, all 26 species/LOD combinations, instance disposal ownership, input reset, swallow cleanup, phase continuity, renderer wiring, offline/online tackle behavior and stale server input.
- Multiplayer tests passed: 26 integration checks plus 2 distant spectator-chain transport checks.
- Four short stress scenarios: 200 competitors, Free Roam/Last Fish Standing, seeds 1 and 5, 40 simulated seconds each; zero non-finite fish states.
- Six longer scenarios below: 200 competitors, 30 Hz stepping, no human input, normal AI/fisher behavior. Every tick checks finite position, velocity and positive finite mass. Last Fish Standing additionally checks that its respawn queue stays empty. Wall times include invariant checks and are environment-specific CPU results, not frame-rate measurements.

| Mode | Seed | Simulated seconds | Ticks | Wall ms | Final state | Alive competitors | Peak queue | Peak mass |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| free | 1523 | 600 | 18000 | 29901 | play | 126 | 133 | 10000 |
| free | 90210 | 600 | 18000 | 27836 | play | 133 | 125 | 7378 |
| last | 1523 | 64.067 | 1922 | 1660 | end | 1 | 0 | 2157 |
| last | 90210 | 96.567 | 2897 | 1833 | end | 1 | 0 | 1556 |
| timed | 1523 | 300 | 9000 | 10576 | end | 2 | 135 | 8056 |
| timed | 90210 | 300 | 9000 | 11944 | end | 1 | 108 | 7395 |

## Remaining priorities and suggested optimizations

1. **Real-phone release gate:** On the intended Android phone, check portrait and landscape play, two simultaneous fingers, lost touch/focus, all 13 abilities, prey rings, shield visibility, maximum puffer inflation, ship interior, breach/apex/splash, spectator succession and shared-net release. Measure frame-time percentiles, thermal behavior and restart memory across repeated matches.
2. **Rival ability feedback parity:** Instanced rivals still lack several detailed-player effects (camouflage opacity, expressive mouths and some status flashes). Add per-instance ability attributes with separate state-safe geometry ownership; validate that stealth and protection cues communicate the actual rules.
3. **Measured quality control:** After collecting phone GPU/CPU timings, add a user-selectable quality cap and conservative adaptive resolution. Avoid automatic LOD or resolution tuning based only on this headless environment.
4. **Fairness diagnostics:** Add an optional development overlay for collision volumes, combat mass and protection. Compare the detailed and instanced silhouettes against collision dimensions before changing bite rules. Keep this out of normal player UI.
5. **Fixed-step offline evaluation:** Offline simulation still follows the clamped rendering delta, while multiplayer uses fixed server ticks. Evaluate a bounded fixed-step accumulator with interpolation using matched control traces before changing simulation timing.
6. **Balance and pacing evidence:** Measure all species across more seeds and human sessions, including time to first meal, deaths without a successful bite, LFS duration, fishing pressure and comeback rates. The historical balance evidence is not strong enough to justify an untested numeric rebalance here.
7. **Context-loss recovery:** Test WebGL context loss/restoration, shader compile errors and prolonged background/resume on physical devices. Existing error panels do not constitute full recovery coverage.

## Reproduce

```bash
npm test
npm run check-sync
npm run test:online
npm run audit:soak
node tools/audit_stress_v1519.js
npm start
```

Open `index.html` directly for the self-contained offline client, or use the local server for multiplayer. The separate PLAY HTML is byte-identical to the packaged index.html. Source includes the original reports/tools/tests, new audit tests, raw logs, soak JSON and an exact patch of changed runtime files. No production deployment was performed.
