# Aqua.io v1.5.7 — Ability Pass 2 deployment integration

This is an additive, versioned integration on top of commit `f02f5394` of `staging/binary-delta-v2`, not a replacement for canonical v1.5.7.

## Routes
- Canonical previous release: `/fisherman-mobile-v157.html` (unchanged)
- Ability Pass 2: `/fisherman-mobile-ability-pass2.html` (new)
- Multiplayer variant: `fisher-mobile-ability-pass2` with dedicated authoritative simulation `aqua_sim_mobile_ability_pass2.js`.
- Health: `/health` retains canonical `build` identifier and adds `availableVariants`.

## Mechanics
All 13 abilities from v1.5.6 Ability Pass 2 are represented by a separate simulation and HTML client, including threat-based guppy dodge, sardine school scaling, puffer toxin, barracuda target lock/reward/penalty, tuna ramp, piranha chain, goldfish dazzle, koi leap, clownfish sting, eel disruption, angel vortex, seahorse kelp camouflage, and sunfish plankton pull.

The existing fixed-width binary fish records are retained. Extra ability state is appended to metadata; the decoder tolerates shorter arrays from the archived versions. No existing versioned route is deleted or modified.

## Release procedure
1. Push the feature branch and open a PR against `staging/binary-delta-v2`.
2. Verify `npm run test:ability-pass2` and `npm test` on a Node 20+ runner, then test multiplayer on two phones.
3. Merge the PR into `staging/binary-delta-v2` only after checks pass.
4. The connected Render `aqua-io-binary-staging` service has automatic Git deploys: do not trigger an extra manual deploy after merge.
5. Verify `/health` reports the new `availableVariants`, then open `/fisherman-mobile-ability-pass2.html`.
6. Keep v1.5.7 available for rollback by navigating to `/fisherman-mobile-v157.html`.

## Status
The Ability Pass 2 mechanics were previously tested on the v1.5.6 archive. This additive v1.5.7 server integration has not been run end-to-end in Render or on Android. A PR is therefore the staging gate, not production authorization.
