# aqua.io — Fish touch navigation (binary-v2 staging)

## Mobile controls

- Hold anywhere on the active game surface (including the ability button) to swim forward at full speed.
- The floating steering joystick appears when the player touches the configurable steering side of the screen. Move it **left/right to rotate yaw**, **up/down to change dive angle**; centered thumbstick means no steering, not no movement.
- A swipe on the opposite side also changes yaw and dive angle.
- Releasing the **last** pressed finger stops propulsion immediately on the authoritative simulation, while keeping the heading and dive angle unchanged. Releasing one finger of a two-finger gesture does **not** stop the fish.
- A `pointercancel`, focus loss, app background, or resize clears held touch inputs. Tackle/menu overlays do not trigger motion.
- Double-tap opposite steering side to level. Keyboard WASD/R/F and fisher controls are retained.

## Network and physics

- Retains binary motion v2, delta networking, AOI behavior and server-authoritative interactions unchanged.
- Sends zero fish input immediately on last pointer release, rather than waiting for the scheduled 50 ms movement frame.
- Newly started forward thrust also sends an immediate input frame.
- Fish human velocity is hard-zeroed on zero movement input on the server, except while airborne or hooked. This also suppresses ability-induced glide while idle. Environmental collisions, combat, fishing and AI continue to use the same server simulation.
- Orientation (`hx`/`hz`) is retained while stationary.

## Tests

```bash
npm test
node tests/test_touch_swim.js
node extract_sim.js --check
```

Staging is automatically deployed from GitHub branch `staging/binary-delta-v2`. Render Free service URL: https://aqua-io-binary-staging.onrender.com/ (the exact deployment status must be checked separately).