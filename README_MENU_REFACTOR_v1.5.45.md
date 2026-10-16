# Aqua.io v1.5.45 — Canonical Menu Refactor

## Based on v1.5.44
Retains the stage-first main screen, embedded Fredoka, aquarium backdrop,
13 species portraits, controls, strength/caution tiles, and fisherman card.

## Source refactor
- One shared, immutable ordered species key list powers the carousel, counter,
  keyboard navigation, and stage-swipe cycling.
- Cache species card nodes instead of repeatedly querying all cards for each selection.
- Centralize species changes in `chooseMenuSpecies` to keep preview, selection
  highlight, accessible `aria-pressed`/roving keyboard focus, and UI accent aligned.
- Use picker click delegation and pointer capture/cancel handling for touch swipes.
- Honor reduced-motion preferences when centering selected cards and haptics.
- Add `tests/test_menu_refactor_v1545.js` to the standard regression suite.

The authoritative simulation, shared multiplayer transport, and respawn
systems are byte-identical to the v1.5.44 source. Run `npm run build`,
`npm run check-sync`, `npm test` and `npm run test:online` before publishing.
