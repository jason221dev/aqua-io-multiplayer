# Aqua.io v1.5.22 — Continuous leap-to-water chase camera

The previous version kept the camera on the old swim pitch during airborne flight, then began a separate camera recovery on splash. The camera now blends toward the physical fish velocity before water entry and continuously follows the same trajectory through touchdown and into swimming, with angular damping and a 1.75 rad/s slew limit. The fish model no longer switches to a restrictive pitch clamp after the reentry timer expires. Joystick steering and forward thrust remain independent. Spectator and freecam paths are preserved.

The downloadable full source includes expanded camera regression coverage. Real-device WebGL visual inspection is still outstanding.
