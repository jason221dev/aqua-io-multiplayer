# Aqua.io v1.5.14 — True Observer Mode

The former camera-only Observer Mode left the player's fish in the game where predators could eat it. The simulation now supports `setObserver(pid, enabled)`: observer fish remain stable roster placeholders, but are no longer living contestants and cannot be targeted, scored, hooked, or automatically respawned.

Entering Free Camera / Follow Largest withdraws the player's fish from the match. In Free Roam, SPAWN AS FISH returns as a new mass-100 fish with 6 seconds of spawn protection. In Last Fish Standing, withdrawing forfeits the single life and NEW MATCH starts a fresh match rather than reviving into the current round. Multiplayer predation-follow logic and ability identity changes are preserved.

Verify with `npm run check-sync && npm test && npm run test:online`. Device WebGL/camera visual QA remains necessary.
