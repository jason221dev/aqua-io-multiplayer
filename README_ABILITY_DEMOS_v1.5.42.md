# Aqua.io v1.5.42 — Species Ability Demo Animation Pass

This pass reworks the **menu-only 3D animation timeline** for 13 species. It does not change authoritative simulation or multiplayer protocol.

- Choreographed threat → activation → result loops with species-specific motion.
- Guppy: lateral dodge and fading afterimage, without altering predator steering.
- Sardine: moving school, synchronized accelerated travel inside the much wider surge.
- Puffer: inflates with no offensive toxic slowdown; combat-mass effect described as ×3, not 3× radius.
- Barracuda: single target-lock marker, one guided strike, untouched second fish.
- Piranha: single normal-speed guided chase and retarget after contact; no speed streaks.
- Goldfish: three distinct Glitter pulses while Goldfish moves twice as fast.
- Koi: directed food/minnow suction rather than distant magic catches.
- Clownfish: clear shield contact, attacker recoil and boosted repositioning.
- Electric Eel: two distinct outgoing pulses and bolt-marked slowed rivals.
- Tuna: accelerating, visibly steerable torpedo with flowing speed lines.
- Angelfish: smaller fish keep directional control, but travel slower within halo.
- Seahorse: ghosted stealth model and predator passing nearby, no contact immunity suggested.
- Sunfish: plankton follows a smooth path to the mouth while gliding.

The animated loop is an illustrative storyboard and does not show real-time gameplay duration; active/cooldown times are given in Ability details. Reuses Four FishForge low-poly rival meshes, 3 rings, 18 particles, 6 streak meshes, 4 bolt sprites, and 2 lock rings, with frame throttling for mobile and reduced-motion-safe camera response.

Tests: `npm run check-sync`, `npm test`, `npm run test:online`, `node tests/test_menu_animations_v1542.js`. Visual GPU testing on physical Android devices is still required.
