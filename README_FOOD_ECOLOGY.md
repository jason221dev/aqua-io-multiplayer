# aqua.io — Finite Surface Food and Minnow School Reproduction

The aquarium starts with 200 equal-mass competitors, a separate 30-fish edible minnow school, and two fisherman slots.

## Floating food
Six surface patches of 40 pellets spawn initially (240 active). Eaten pellets disappear permanently from their parent patch; no instant refill is allowed. New 40-pellet patches appear every 10–13 seconds when abundant, 7–9 seconds when moderately scarce, or 4–6 seconds when nearly depleted. Patches vanish when depleted, aged out after around 95 seconds, or retired to make capacity for new patches. The 320 stable food slots preserve binary-delta packet indexing.

## Minnow school
Eaten minnows leave a vacancy. The school produces a single newborn at a time; with N survivors the interval is 0.65 + 0.13*N seconds. At zero survivors reproduction is fastest; at 29 survivors it takes about 4.42 seconds. A full school does not reproduce. Newborns receive 1.25 seconds of bite protection and join the roaming school. Minnows never count for Last Fish Standing.

## Networking and validation
Consumed food is represented by zero-position tombstones sent as binary deltas to all room members, avoiding ghost pellets on clients. Client rendering hides inactive positions. Run node tests/test_food_ecology.js plus npm test. Single-player and multiplayer share the deterministic simulation.
