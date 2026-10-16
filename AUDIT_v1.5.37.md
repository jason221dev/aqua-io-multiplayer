# Aqua.io v1.5.37 — Full Source Audit & Optimization

**Baseline:** v1.5.36 Eel Shock Icon source, 2026-10-15.  
**Scope:** Browser `index.html` (3D renderer, controls, lobby, offline engine, multiplayer client), authoritative `aqua_sim.js`, multiplayer `server.js`, binary `motion_v2.js`, minimal WebSocket `ws_lite.js`, 32 historical regression suites, tooling and release configuration.

## Findings and applied fixes

| Severity | Area | Finding / change | Result |
|---|---|---|---|
| High | Multiplayer metadata | Packed server metadata acquired `eelSlowT` without keeping the Node and inline browser field-order maps aligned. The browser map also had `clownSlowT` / `clownGuardT` ahead of `lockF` and omitted the `holding` field. | Node/browser decoders now use the exact server field order. `holding` and `air` decode as booleans. Confirmed with a complete 30-field round-trip and a real socket spectator succession. |
| Medium | Eel visual effect | v1.5.36 showed the bolt whenever `shockT>0`, including Clownfish retaliation. | Bolt displays only for live, unprotected opponents with Eel-specific `eelSlowT>0`, for the stun and aftershock phases. It never shows for the owning player. |
| Medium | Regression drift | Two tests prohibited all rival overlays, contradicting the explicit Eel bolt status exception. | Updated tests to continue forbidding rival *ability activation* markers while permitting the Eel debuff indicator. Added seven v1.5.37 checks. |
| Low | Per-frame visual state | All rival fish computed multiple trigonometric animation values even without active visual feedback. | Dormant aura/flash/shield and Eel indicator values now use constant defaults, retaining active animation behavior. |
| Low | Respawn-net presentation | The same recent-batch filter allocated arrays twice in a frame, and fish grouping rebuilt arrays and a Map on every 20 Hz pose refresh. | Added last-valid-batch traversal and reusable per-species grouping buffers; one shared net and exact batch timing retained. |
| Low | Operations | `/health` build identifier still said `v1.5.24` despite later releases. | Changed to `aqua-io-v1.5.37-source-audit`. |

## Behavior retained

- `aqua_sim.js` is **byte-identical to v1.5.36**. No gameplay or balance rules changed.
- All 13 species retain their abilities and protections (Eel 170-unit radius, aftershock 75% reduction, Clownfish independent retaliation, Piranha hold-propulsion pursuit, etc.).
- The only opponent status marker is a small lightning bolt for victims of Eel shock. No rival ability activation rings or targeting reticles.
- Exactly one physical respawn net, 10-second releases, 6-second shield after splashdown, and existing mobile LOD ramp remain unchanged.
- No user-facing save data schema, room admissions, or controls were changed.

## Verification

- `npm test`: **PASS**, 224 `PASS` entries in the full historical/updated test run, including the seven dedicated v1.5.37 checks.
- `npm run check-sync`: **PASS**, browser simulation matches authoritative server simulation.
- `npm run test:online`: **PASS**, including 26 reported multiplayer integration checks plus spectator follow over actual WebSocket binary transport.
- Independently exercised two seeded runs of 200 competitors + 60 minnows over 1,200 fixed ticks each, including 4 release batches per seed; fish values finite and protected Eel shock violations = 0.
- Node syntax checks passed for server/transport, and every inline script passed JavaScript parsing.
- Headless WebGL GPU playback and real Android FPS have **not** been validated here.

## Performance measurements

A four-run interleaved test of **130,000 per-fish visual-feedback evaluations per run** compared v1.5.36 and v1.5.37:

| Metric | v1.5.36 | v1.5.37 |
|---|---:|---:|
| Average isolated feedback CPU time (revised benchmark) | 195.55 ms | 81.71 ms |
| Reduction | — | **58.2%** |

The earlier sampled run found a 60.6% reduction. Both runs show lower CPU time in this isolated path. This is **not** an Android frame-rate measurement, and does not represent total simulation or rendering time. Authoritative simulation CPU cost is unchanged because simulation code was deliberately left intact.

Rerun: `node tools/bench_visual_feedback_v1537.js PATH_TO_V1.5.36/index.html`.

## Residual issues and recommendations (not claimed fixed)

1. **Mobile GPU load:** Profile Chrome Android frame times (`Performance`, WebGL draw calls and GPU frame composition) during a multi-fish release. Adaptive resolution and LOD already exist; no device-backed validation has yet been done.
2. **Payload/latency at full multiplayer scale:** The server supports compact delta updates, but a realistic 50–400-human-player packet/fanout load test is still needed. The 26 integration checks do not simulate that workload.
3. **Source architecture:** `index.html` includes the renderer and a duplicate copy of simulation and transport code. A generated bundle from shared modules would eliminate accidental drift; preserve a standalone offline export as a build artifact. Converting this safely needs an independent regression build pipeline.
4. **Rendering correctness:** Visually inspect the new lightning bolt at multiple depths, lighting levels and camera distances on an Android GPU; headless tests only verify state and geometry submission wiring.
5. **Server WebSocket transport:** `ws_lite.js` intentionally rejects fragmented frames and extensions. Browser support is tested for the current protocol; a production-scale socket library would improve edge-case coverage and observability.

## Deployment

This output is a new, local **v1.5.37** release. No GitHub push or Render deployment has been performed as part of this audit. The deployed v1.5.35 service is not modified by creating this source archive.
