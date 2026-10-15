# Aqua.io v1.5.15 — AI Netting & 100-mass Fish Lures

## Issue and root cause
An AI fisherman needed more than 0.65 continuous seconds of exact distance, depth, slack, and tension to trigger a catch. Its boat also stopped advancing well outside the player's physical scoop range. As a result hooked fish could hover close to the boat, remain out of landing reach, and appear never to be netted. The lure had mass 101 instead of the requested 100.

## Fix
- AI boats chase hooked fish to a realistic close range while the tension is below the red zone, with bounded chase speed and smoothed velocity.
- AI scoop reaction requires around 0.22 seconds in an eligible net window; partial wind-up dissipates rather than resetting instantaneously. Final `canLandFish` remains authoritative and checks fish identity, boat distance, depth, and non-dangerous line load.
- The visual net scoop persists 1.65s for AI and human fishers, and catches are scored exactly once with a net event.
- Lure uses the same species-specific fish model and scaling as a natural mass-100 fish and appears as a fish prey target to fish players. The lure is a bait decoy for fishing mechanics, NOT an extra independently competing fish and grants no mass upon biting.
- Once a fish takes the bait, remove the overlapping fish lure model. Fishing lines/hooks/telegraphs are invisible in the fish view.

## Regression verification
The original suite, 8 new tests, multiplayer WebSocket tests, exact client/server simulation matching, and a headless browser fish-view smoke test passed. Hardware WebGL visuals still need a device check.
