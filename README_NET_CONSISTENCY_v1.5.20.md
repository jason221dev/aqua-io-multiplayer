# Aqua.io v1.5.20 — One-net respawn animation consistency

## Behavior guaranteed

- There is **exactly one physical fish-holding aquarium net** for the entire match. All competitive fish eligible for respawn join the same queue and appear as 100-mass species-appropriate fish inside it.
- The game evaluates expired respawn timers **before** each authoritative batch boundary, so a fish whose timer expires on the ten-second boundary is not delayed until the following batch.
- The net starts travelling toward the next deterministic random aquarium drop position 1.55 seconds before the release. The client **does not decide** the release moment.
- Every eligible fish is dropped together on the server's **10.0-second cadence**, starts above water, follows ordinary gravity into the water, and gets a fresh **6.0-second protection timer at the precise water entry**. Normal airborne jumps do not reset spawn protection.
- The multiplayer server sends the same queue, release history, next drop time, and drop destination to each client. The camera following a waiting player's net and the net mesh use the **same pose calculation**.
- If new fish enter the queue while the empty net is returning to the rack, they become visible **inside that same returning net**, not in another or in a hidden queue.
- Net enlargement does not enlarge the bodies inside it: instance scaling compensates for the enclosing net size. Even at full queue capacity, every released fish remains within the vicinity of the single net's mouth, rather than spawning hundreds of units away.
- A player returning from voluntary Observer Mode in Free Roam joins the upcoming net batch rather than bypassing the net with an underwater spawn. Last Fish Standing has no respawn net and spectator re-entry continues to require a new match.

## Validation

Run from this directory:

```bash
npm test
npm run check-sync
npm run test:online
```

The timed Apex phase also cancels pending net queues rather than breaking its no-respawn rule.

The new `tests/test_respawn_consistency_v1520.js` checks exact-boundary queuing, full six-second water-entry protection, ordinary leap behavior, Observer Mode re-entry, queued fish during return, the shared camera/net pose, a 200-fish dump, Last Fish Standing and timed Apex exclusion, and snapshot restoration. The complete older gameplay, fisherman, fish ability, observer-camera and multiplayer tests also passed.

**Graphics limitation:** The browser smoke test passed without JavaScript errors, but the container's Chromium could not create a WebGL renderer; visual polish and mobile frame rates need device testing.
