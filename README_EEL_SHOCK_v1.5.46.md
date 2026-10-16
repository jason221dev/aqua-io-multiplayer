# Aqua.io v1.5.46 — Electric Eel shock range and player feedback

- **85 game-unit effective shock radius**, down from 170. Eel AI and both timed pulses use the authoritative shared `ABILITY.shockRadius`; clownfish protection stays at 170.
- Only the controlling Electric Eel sees a 3D 85-unit spherical range boundary while the ability is active. The wireframe spherical extent and three intersecting rings mark the actual three-dimensional reach. Two expanding shells mark the first activation and the second pulse at 0.98 seconds.
- A small HUD label confirms **SHOCK REACH · 85 UNIT RADIUS**. It hides when the ability ends, the fish dies, the player changes role, or observer mode starts.
- No extra status above opponents (existing shocked-opponent lightning bolt stays as-is); no simulation or network packet changes outside the Eel radius and description.
- Existing Eel range tests updated to the requested new radius; new range-visual contract test added.
