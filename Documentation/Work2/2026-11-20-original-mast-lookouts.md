# WORK 2 — Original low-poly mast fighting-tops (20 November 2026)

## Implementation
Stacked on the draft flag-heraldry PR #628. Original 3D carved hardwood
crow's nests and gilded lookout guardrails are now generated on both shipyard
mast stations by `WebPreview/src/ship-mast-lookouts.ts`.

- Scout: six-sided compact nest with lookout needle
- Fighter: eight-sided fighting top and visible crossbar
- Warship: ten-sided admiral platform and four gilded finials
- Standard and Raider: two distinct profiles; Royal: four platforms in two tiers

The structure uses just **two batched PBR meshes** per entire preview fleet
hull (wood and metal), irrespective of class and mast-tier. These are geometric
budgets only, not device-measured frame times. Both geometries and their
materials are disposed when the ship is refitted.

## Integration contract
- **WORK 4:** `highestUnlockedPreviewModules` displays unlocked visual
  possibilities only. No purchase, currency, real level, asset entitlement or
  class possession is granted; keep `validateOwnedFleetForPlayer` and trusted
  server-side checks before real equip/save.
- **WORK 6:** mounted solely inside `modular-ship-accessories`; no changes to
  the battle rig, collisions, damage, Porto, mobile touch controls or publishing.
  Validate clipping and sightlines in five editor camera views and the approved
  portrait layout from `assets/design-approved/03-frota.webp`.
- **WORK 5:** automated coverage checks nine geometry combinations,
  finite positions, mobile-sized budgets, disposal and all 60 level/class
  preview permutations. Browser-free CI does not substitute for real Android/iPhone
  visual QA, measured FPS or memory profiling.

Run `cd WebPreview && npm ci && npm test && npm run build` in CI.
**No main merge, no deployment, no Unity claim. Budget: €0.**
