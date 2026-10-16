# Aqua.io v1.5.47 — Chinese Restaurant Lobby Scene

The user-supplied visual overhaul of the restaurant surrounding the aquarium is integrated in the canonical `index.template.html` and compiled to `index.html` with `npm run build`.

## Visual improvements
- Four restaurant walls now use artwork drawn at wall-specific canvas aspect ratios (front/back 2048×640; side walls 1280×720), preserving circular shapes.
- New Chinese restaurant decor including lattice, red-and-gold pillars, illuminated signage, scrolls, shelves, porcelain, rugs, lanterns, and a display fish tank.
- Additional texture-backed sprites for gently swaying hanging lanterns, glowing neon signage, a beckoning cat, drifting steam and swimming display fish.
- The room backdrop is baked with an 8px blur to keep it subordinate to aquarium gameplay.
- Visual animations honor `prefers-reduced-motion`. Texture creation occurs only when the room is built, not each frame.

## Scope and testing
- No changes to gameplay rules, Eel shock radius (85 units), balance, sim transport, or room networking.
- `tests/test_lobby_scene_v1547.js` checks wall dimensions, visual effects, reduced-motion gating and update-loop integration.
- `npm run build`, `npm run check-sync`, `npm test` and `npm run test:online` are release gates.
- Real Android WebGL profiling remains needed to evaluate the added translucent-sprite draw calls.
