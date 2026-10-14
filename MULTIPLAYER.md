# aqua.io multiplayer foundation

`aqua_sim.js` is the whole game simulation: deterministic, instance-scoped, no DOM / WebGL / device / `Math.random`.
It runs unchanged in Node (server) and in `index.html` (client / offline AI mode).
`index.html` contains the same code between `/*SIM:BEGIN*/` and `/*SIM:END*/`; run `node extract_sim.js` after editing it.

## API
```js
const Aqua = require('./aqua_sim.js');
const sim  = Aqua.create();                       // one instance per match / room
sim.newMatch({ sp:'guppy', quick:true, seed:123456, npcCount:480, nurseryProtect:true,
  slots:{ fish:[{pid:'p1',sp:'guppy',name:'Ann'}, null, null, {pid:'p2',sp:'koi'}],   // up to 8 fish slots
          fishers:[{pid:'f1'}, {pid:'f2'}] } });                                      // up to 2 fisher slots
sim.step(inputs, dt);          // inputs = { [pid]: frame }; slots without a pid are AI (offline / backfill)
sim.drainEvents();             // [{k:'vib',to,p} | {k:'mode',to,mode} | {k:'eat',pid,...} | {k:'end'}]
sim.snapshot();  sim.restore(snap);   // JSON-safe (Infinity encoded); includes RNG state
// read-only state: sim.t sim.L sim.state sim.fishes sim.npcs sim.fishers sim.plank sim.kelp sim.pings sim.feed ...
```
Everything random comes from the seeded generator in the instance, so the same seed + same input stream reproduces the match exactly.

## Input frames (one per player per tick; all fields optional, all values clamped by the sim)
Fish: `{ mv:{x,y,z}, tap:int, bt:{g:'f'|'n', i:int}|null }`
- `mv` world-space direction (client applies camera/stick/pitch), `tap` = taps since last frame (max 4 honoured),
  `bt` = the prey the client's bite-assist ring is on (the sim re-validates eligibility).
- A tap means: break-free meter if bitten, escape meter if hooked, otherwise the species ability.

Fisher: `{ stick:{x,y}, mode:'aim'|'boat', rod:0..1, roll:deg, drag:0..1,
           reel:{down,up,strokes:[dy..]}, ev:[{t:'cast'|'troll',lure}|{t:'land'}], hook:biteId }`
- `hook` is how a fisher sets the hook: sensor pull-back or armed reel stroke is detected on the client,
  which sends the current `biteId`. Stale or foreign ids are ignored.

## Bite race rules (all in the sim)
1. A fish with `mass > 101` touching a lure starts a bite (nearest fish wins). Fry (100) cannot.
2. The fish fills a tap meter (+0.05/tap, max 8 taps/s, slow decay). At 1.0 it spits the lure and gets 1.1 s protection.
3. The fisher must send `hook:biteId` first. No timeout: only the meter ends an unhooked bite.
4. Same-tick tie: fisher inputs are applied before fish taps, so the fisher wins.
5. Hooked fish keep the existing fight engine; the fish tap adds +0.05 escape progress.

## Feed / events are addressed
`feed` entries carry `to` (only that pid sees it) and `except` (that pid does not). Clients show
`feed.filter(m => (!m.to || m.to===me) && m.except!==me)`. Vibration and mode changes are events with `to`.

## Server loop (sketch)
```js
const sim = Aqua.create(); sim.newMatch({...});
setInterval(() => {
  sim.step(latestFramePerPid(), 1/60);
  const ev = sim.drainEvents();
  broadcast({ tick, snapshot: sim.snapshot() /* or deltas */, events: ev });   // filter per player: do not leak fisher line data to fish
}, 1000/60);
```

## Tests (plain Node, no dependencies)
- `node test_sim.js`    determinism, instance isolation, JSON snapshot round-trip, 2 human fish + 2 human fishers, bite race, hostile inputs
- `node test_client.js` client adapter under a stubbed DOM (input frames, events, feed, bite arming, sensor pull, end screen)
- `node test_oracle.js` seeded equivalence: refactored sim vs `pre_refactor_index.html`, 64 s of play in both roles

## Not done yet
Transport, latency compensation / rewind for the bite race, per-client state filtering, server-side validation of
sensor-pull timing (the sim trusts `hook:biteId`), spawn/nursery layout for more than one human fish.

## Optimization audit (v0.3.1)

See [`AUDIT.md`](AUDIT.md) for the performance and security review. Gameplay and graphics have been held constant for normal inputs; snapshot parity is checked against the pre-optimization `tests/aqua_sim_baseline.js`.

Run `npm test` for the simulation, state parity, static source, and input-hardening checks. The original `test_client.js` and `test_oracle.js` are preserved but require missing external harness files that were not supplied. **Network transport, per-client state redaction, authoritative hook verification, and latency compensation remain unimplemented.**
