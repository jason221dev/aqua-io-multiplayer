# aqua.io v1.5.8 — Octopus Apex Adversary

## Intent and rules

The octopus is a **non-player, non-scoring environmental adversary** rather than a 201st competing fish. It exists to counter the positive-feedback loop in which a large fish can eat successive smaller competitors, snowball into an insurmountable lead, and dominate Last Fish Standing. There is exactly **one octopus per aquarium**, sharing the same authoritative state on all clients. It does not become a playable species and does not consume fishing bait.

**Objective:** Track up to 20 surviving competing fish with the highest **actual biomass**, not temporary effective combat mass. A successful tentacle strike reduces the victim's permanent biomass by exactly 50%; the victim survives and retains its abilities, history, and control. This is a resource tax, not an elimination or a size-based fish-eating exception.

**Scope:** Top 20 competitive fish only, human or AI. Minions, schooling minnows, fish-shaped lures, and fishermen are never targets. Protected and currently hooked fish are excluded. A player is never guaranteed to be selected solely because they are human. Ranking is recomputed every 0.75 seconds. A chosen target is normally held for up to 9 seconds to avoid indecisive target swapping; ties rotate over time.

## Concrete tuning parameters

| Parameter | Value | Design justification |
|---|---:|---|
| Octopus population | 1 | A single, readable threat instead of a swarm that overwhelms mobile players |
| Eligible prey | Top 20 alive, non-hooked competitors | Strong negative feedback on the leaders |
| Initial grace period | 12 s | Every fish begins at equal mass; introductory learning should not be punished |
| Rank refresh | 0.75 s | Responsive to changes without sorting 200 fish on every frame |
| Retarget timer | 9 s | Creates a persistent, escapable pursuit |
| Ground crawling speed | 248 world units/s | Converges on the large arena while remaining confined to surfaces |
| Wall climbing speed | 188 world units/s | Gives vertical movement a cost |
| Tentacle wind-up | 1.25 s | Visible counterplay opportunity |
| Dash speed | 780 world units/s | A burst that is dangerous in confined spaces |
| Dash length | 0.82 s | Short commitment; not unlimited pursuit |
| Dart acquisition range | 410 units | Staying high in open water avoids launch range |
| Physical hit center radius | 73 + capped fish body radius | Close contact required; no screen-wide damage |
| Successful-strike cooldown | 9 s | Prevents chain taxation of one target |
| Miss cooldown | 4 s | Active evasion should meaningfully outperform waiting |
| Eel disruption | 2.3 s | Gives a nearby eel an explicit octopus counter |
| Mass penalty | ×0.5 | As requested; the fish is not eliminated |

## AI state machine

`PATROL` (initial 12s) → `HUNT` → `WINDUP` (1.25s) → `DASH` (0.78s maximum) → `RECOVER` → `HUNT`.

At any instant, an electric eel shock or nearby goldfish flash may interrupt with `STUNNED`, after which ordinary hunting resumes. The octopus cruises on the floor and climbs the x/z tank walls from continuous floor-wall corners. It does not teleport between walls. During a dash it leaves its anchor surface briefly, then crawls back to the nearest wall or floor. It must not strike through the sunken ship's physical hull, and its contacts are authoritative.

The attack is a **committed intercept**: it snapshots the fish's position at the end of the windup. The fish can change depth or swim sideways, so directional evasion is more valuable than simply outrunning the octopus. Movement during windup does not magically retarget the dash.

## Game-theoretic structure

The baseline fish game is an accelerating growth game: more mass → more edible opponents → even more mass. The octopus imposes **non-lethal negative feedback specifically on wealth concentration**. It reduces runaway leads while creating a risky frontier between safely holding a lead and continuing to feed in profitable terrain.

Let `m` be actual fish mass before contact. The octopus payoff to the targeted fish is

`m_after = m` if the attack misses, is blocked, or the fish was ineligible.

`m_after = 0.5 m` on one successful hit.

The *absolute cost* of getting hit grows with size, `loss = 0.5 m`, while the *relative loss* stays 50%. Therefore leaders have an incentive to avoid wall/floor exposure, creating an endogenous counter to dominant strategies.

The relevant strategic decision for a top-ranked fish is whether the expected mass gained by entering a profitable region exceeds the expected octopus tax and predation risk:

`Expected_gain = food_gain + prey_gain − P(octopus_hit) × 0.5 × current_mass − P(other_predator) × expected_loss`.

Because `P(octopus_hit)` depends on position, cover, exposure time, facing, telegraph response, speed burst, and species ability, risk is **skill-sensitive** rather than an unavoidable random handicap.

### Information and counterplay

The octopus's 3D body and arm movement advertise its position. During windup it flashes an orange ring; the currently targeted human gets a simple warning without obscuring controls. Fishermen can see a distinct **OCTO** contact on their fish finder. The octopus cannot detect hidden or protected fish with special perfect knowledge that bypasses ability defenses; it chooses from the currently eligible top 20.

| Fish strategy | Octopus response | Counter-response |
|---|---|---|
| Remain deep in open midwater | Stalk from the closest surface, without an arbitrary global strike | Move into food-rich boundary areas only after cooldown |
| Feed near the floor or glass | Pursue and prepare an intercept | Leave before windup ends, or dodge perpendicular to the committed line |
| Stay extremely large and farm small fish | Continue to rank in the top 20 | Accept a possible 50% tax to access growth-rich routes |
| Hide behind pirate ship planks | Cannot hit through solids | Navigate out when octopus switches targets |
| Group with other top-ranked fish | Only one committed target per dash | Bait a missed lunge; the group benefits from the 4s recovery |
| Spawn and immediately enter combat | Three-second spawn shield remains intact; octopus also waits 12s at match start | New player can orient before participating |
| Activate eel electric shock | Octopus is disrupted within 160 units | Eel spends its ability cooldown and must position accurately |
| Inflate puffer | Temporary deterrence for the active inflation interval | Strong defensive tradeoff: slow movement makes other pursuits risky |
| Clownfish shield, guppy dodge, goldfish flash | Defensive windows prevent strikes; goldfish can disrupt at close range | Octopus can wait out finite ability timers |
| Camouflaged seahorse | Not eligible while camouflage is active | Low mobility during stealth can limit feeding |

### Externality on fishermen

The octopus never attacks fishermen directly and cannot act as a fishing lure. It can **indirectly favor fishermen** by reducing the largest fishes' biomass, making some fish easier to bring to the boat. It can also hurt fishermen by making valuable hooked fish rarer; hooked fish are excluded so completed catches are not arbitrarily stolen. The overall effect on catch rate is not assumed and requires telemetry.

### Collusion and exploit resistance

- Mass ranking uses server state only; the client cannot send a target identity, octopus hit, cooldown, position, or size penalty.
- The opponent must be physically within the dart collision range when the server resolves the attack.
- World solids block the attack, including pirate-ship occluders.
- Fish-player species shields, invulnerability, and tackle state remain authoritative.
- Rank-tie rotation prevents a permanent index bias while the initial roster has identical mass.
- There is one cooldown shared across all targets; no per-player hit spam.
- The octopus is an ecological mass sink. It does not drop a free 50% mass cache that teammates could farm.

## Fairness goals and empirical tuning

No 55/45 win rate is asserted without live match samples. Instrument at minimum: `octopus_target_selected`, `octopus_windup_started`, `octopus_lunge_started`, `octopus_hit`, `octopus_missed`, `octopus_blocked`, and sampled rank, current mass, exposure depth, actual opponent role, ability, network RTT, and timestamp. Distinguish fish killed by another fish *after* a mass-halving hit from direct octopus eliminations (there are none).

Suggested production guardrails to validate experimentally (not guarantees): hit opportunities roughly **1–4 per minute**, a successful hit in **25–45% of committed lunges**, less than **10% of a match spent in unavoidable red-threat situations**, and substantial survival variance by smart dodging. Segment by species, mass decile, map region, match mode, human versus AI, and phone FPS. Tune against median and 95th percentile, not merely average win rates.

Recommended experiments: half-mass vs one-third penalty; dash 650/780/900; 1.0/1.25/1.5s warning; one vs two simultaneous octopuses; floor-only vs wall-enabled. Assess score concentration (Gini), comeback rate, top-five rank stability, fish retention, and fisherman catch share. Do not introduce more octopuses unless data supports it; a second predator can lead to cascading losses and the elimination of comeback paths.

## UX, performance, and deployment

The octopus model uses procedural Three.js primitives, a mantle, eyes, eight articulated arms, suckers, and a small warning ring. One creature is negligible compared with rendering 200 competing fish; it is not part of the fish instancing pipeline. Mobile controls are unchanged and no new input button is necessary: evasive swimming already uses the normal fish joystick and species ability control.

Single-player uses the same decorated simulation as the authoritative multiplayer server. Multiplayer keeps the optimized binary fish-state feed and delivers a compact octopus position/state update about every 150 milliseconds, plus a complete octopus snapshot on room start/rejoin. The v1.5.8 protocol is isolated from earlier match versions. Earlier version routes remain intact.

### Known validation limits

Software checks prove deterministic choices, spawn/ability immunity, rank scope, cooldown, mass adjustment, and snapshot shape. They do **not** prove 200-fish visual performance on Android or that players find the windup fair; GPU benchmarks and device walkthroughs are required. The listed empirical balance targets have not been measured.