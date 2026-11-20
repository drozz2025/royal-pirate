# WORK 2 — Procedural 3D deck capstans (20 November 2026)

## Scope, original models and progression

This draft feature extends the isolated Shipyard preview from WORK 2; it does not edit the battle rig, physics, Porto, save data, balances or Unity.

- **Scout:** compact six-sided wood-and-bronze capstan, four handles, a navigation finial.
- **Fighter:** eight-sided broadside capstan, six handles, crossed forged bars.
- **Warship:** two ten-sided admiral capstans, eight handles each, three-point crowns.
- **Ornaments slot progression:** ornaments-simple (from level 1) has two original retaining rings; ornaments-lanterns (from level 8) adds a forged reinforcement band and side plaques; ornaments-legendary (from level 19) adds raised ceremonial bosses and gilded trim. The level thresholds are read from the existing SHIP_MODULES table; they do not create new player entitlements.
- Every complete loadout generates **two batched PBR meshes**, one timber and one metal, even for the two-warship configuration, and both are disposed when refitting.

Files: WebPreview/src/ship-deck-capstans.ts adds original 3D geometry; WebPreview/src/ship-modules.ts mounts it only inside modular-ship-accessories; WebPreview/tests/ship-deck-capstans.test.ts covers all 9 class/ornament combinations, bounded geometry, true three-dimensional vertices, resource disposal, 60 level/class previews and no invented ownership.

## Cross-worker interface contract

**WORK 4 — inventory and purchases:** the capstans are ornamental geometry belonging to existing ornaments module IDs. highestUnlockedPreviewModules(level) and the demo level slider are visual-only. Do not derive player ownership, purchase history, currencies or actual level from them. Keep backend-authoritative inventory, real level, class ownership and validateOwnedFleetForPlayer enforcement for saved/equipped loadouts.

**WORK 6 — integration:** appendages are limited to modular-ship-accessories and do not touch the combat rig, projectiles, collision hull, controls or Porto. Check the visible deck objects with the five 3D editor cameras and the approved assets/design-approved/03-frota.webp UI. Do not auto-merge, publish, or wire persistent ownership from preview controls.

**WORK 5 — QA:** npm ci && npm test && npm run build is a browser-free verification gate only. Re-check editor orbit/touch, capstan clipping against masts and cannon rigs, color contrast, FPS/VRAM and cleanup on *physical* iPhone/Android. A capped geometry budget or successful CI is not a measured device FPS.

## Release gate

Stacked feature based on work2/original-mast-lookouts-20261120 (draft PR #635). Historic PR #29 remains in conflict with WORK 6's preview integration. Keep all WORK 2 PRs in draft pending integration conflict resolution, visual sign-off and mobile performance evidence. Do not touch main; no deployment and no Unity test claims. **Budget: 0 €.**
