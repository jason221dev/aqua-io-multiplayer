# Aqua.io v1.5.14 — True Spectator Mode

## Fix

Prior Observer Mode was camera-only; the local fish continued to exist in the authoritative match, could be eaten, and respawned while its controller was observing. This version makes the single-player observer a genuine non-participating state.

- **OBSERVE / Follow Largest / Free Camera:** calls `sim.setObserver(pid, true)` and removes the local fish from the active roster (`alive=false`, `observing=true`, `respawn=Infinity`). Its stable index is preserved for deterministic simulation state, but it cannot move, be caught or eaten, earn scores, or respawn. The player camera remains in the tank and can follow the largest living fish or fly freely.
- **Free Roam — SPAWN AS FISH:** calls `sim.setObserver(pid, false)` and spawns a new mass-100 fish with 6 seconds of invulnerability. The previous fish's mass cannot be banked by switching to spectator.
- **Last Fish Standing — NEW MATCH:** choosing observer forfeits the one life. This button starts a new one-life match; it never re-enters the ongoing match.
- Prevents observer-score inflation and detaches the local fish from active fishing lines on withdrawal.
- Multiplayer remains unaffected because observer controls are deliberately single-player only. Elimination predator-follow and 6-second spawn shields are preserved.

## Checks

From the `aqua.io` directory run:

```
npm run check-sync
npm test
npm run test:online
```

`tests/test_true_observer.js` includes nine additional tests for player removal, no respawns after extended runtime, Free Roam return, Last Fish Standing fairness, no observer points, hook cleanup, and client wiring. A headless Chromium UI smoke test additionally tested mode switching with zero page errors; it does not replace physical-device WebGL QA.

## Architecture

`aqua_sim.js` is authoritative and automatically mirrored into the `/*SIM:BEGIN*/` block in `index.html`. The observer mutator is used in offline matches only; the existing multiplayer protocol is unchanged.
