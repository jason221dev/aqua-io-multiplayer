# aqua.io — 200-fish arena cap (v1)

## Implemented

- Single-player fish mode and single-player fisherman mode each start with **200 fish**: **8 competing fish** (including the human fish when playing as fish) plus **192 ambient NPC fish**.
- Mobile and desktop use the same count. Two fishermen remain in the simulation (AI or player-controlled).
- Single-player sets `maxTotalFish: 200`; the deterministic sim clamps NPC allocation to the room population budget, preventing the competing and ambient counts from exceeding 200.
- Multiplayer rooms configured with `ROOM_CAP <= 200` reserve future human fish slots when allocating ambient NPCs. This avoids overflowing the fish cap on late joins. Their initial total can be below 200 because the server reserves slots for later human players.
- Explicit 400-player stress-test rooms (`ROOM_CAP > 200`) remain experimental and are exempt from the casual 200-fish cap, preserving the existing capacity research branch. A single 400-human-fish match and a 200-total-fish limit cannot both be required at the same time.
- Fisherman roster remains hard-limited to 2.
- The cap survives snapshot/restore, and `npcCount: 0` now means zero ambient fish rather than falling back to 480.

## Testing

`node tests/test_population_200.js` checks both local roles, excess allocations, late joins, fisherman limit, snapshot restores, and JS parsing.
`node tests/test_online.js` validates an authoritative hosted-style match including the fish/fisherman total.
`npm test` runs the full historical regression suite (parity can be slow on tiny/shared CPUs).

## Playable

`https://aqua-io-binary-staging.onrender.com/?v=fish200`

GitHub branch: `staging/binary-delta-v2`
