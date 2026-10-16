# Aqua.io v1.5.44 — Main Screen Refresh

Presentation-only pass on the main menu. No simulation, transport, collision, balance or respawn changes.

## UX
- Stage-first layout: the live ability demo is now the hero (taller, directly under the role switch); name and role sit beneath it; the species picker sits in the thumb zone below that.
- Fixed overlapping stage labels. Scenario text, phase chip and a round replay button share one bar.
- Picker: larger cards, gradient portraits with highlights, species-colored selection glow, subtle bob on the selected fish, and an "n of 13" counter.
- Swipe left/right on the ability stage (or use arrow keys in the picker) to step through species; tiny haptic tick on supporting devices.
- The whole menu picks up the selected species color (header glow, stage rim, pill, picker, tips).
- Strength / Watch out are color-coded tiles; Game mode uses icon cards; "How to play" moved above the dock so the sticky Dive in / Multiplayer bar is always last.
- Fisherman role now has a header card (illustration plus Cast / Hook / Reel steps) instead of an empty screen.

## Graphics
- Fredoka is now embedded (variable woff2, latin subset). It was referenced throughout but never loaded, so every device fell back to a system font.
- Underwater diorama behind the 3D demo: depth gradient, seabed dunes, rocks and kelp (static SVG, no new WebGL objects).
- Lighter menu veil so the live aquarium shows through at the top; blur reduced from 6px to 3px.
- New brand mark, `theme-color` meta tag, and a shine sweep on Dive in (transform-only, respects reduced motion).

## Performance notes
Only two things animate beyond the existing bubbles: the Dive in shine and the selected portrait bob. Both are compositor-friendly and disabled by `prefers-reduced-motion`.

Tests: `npm run check-sync`, `npm test` (adds `tests/test_menu_refresh_v1544.js`). Visual GPU checks on physical devices are still recommended.
