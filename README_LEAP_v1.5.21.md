# Aqua.io v1.5.21 — Smooth Leap and Water Re-entry

## Gameplay correction

- Use **one analytic ballistic flight solver** for both normal leaps and spawn-net drops.
- Rise from the water at the exact surface intercept rather than entering air from the previous frame’s partially advanced depth. Launch-height calculation and horizontal movement remain continuous through the crossing.
- Gravity reverses vertical travel through an inverted arc; forward and lateral momentum are preserved while airborne.
- Resolve the sub-frame surface impact and integrate the remaining fraction below the surface. The splash effect is generated at the true impact point.
- Preserve and blend downward landing momentum while the swim controller remains pressed; change the retained steering pitch to match the descent **without an extra input**. The camera eases toward that new pitch rather than snapping on the same frame. Explicit steering cancels camera auto-alignment.
- Gradually blend background fog between sky and underwater colors to avoid the abrupt air/water flash.
- No automatic underwater thrust or fixed dive distance; releasing the controller still stops underwater motion normally.

## Preserved

- One shared net; every 10s batch release; exact six seconds of shield on splash.
- Observer / predator tail-on chase camera; no-respawn Last Fish Standing.
- Species-specific abilities (including Koi leap), fishing AI netting, 100-mass fish lures, invisible line in fish POV, and online network state.

## Tests

`npm test`, `npm run check-sync`, `npm run test:online`, including new `tests/test_smooth_leap_v1521.js`. Headless browser startup smoke test is available; final smoothness requires on-device WebGL visual inspection.
